/**
 * Vocabulary Manager - Gestisce il vocabolario dinamico con ricaricamento real-time
 * REQUISITO CRITICO: Il vocabolario deve essere ricaricato AD OGNI RICHIESTA
 */
console.log('[LOAD] ✅ vocabulary-manager.js caricato correttamente');
console.log('[DEBUG] vocabulary-manager execution context:', typeof self, typeof window);

// ✅ WORKER-SAFE GUARD: Evita esecuzione in contesti senza DOM
if (typeof window === 'undefined') {
    console.warn('[vocabulary-manager] Caricato in Worker/Isolated context: modulo disabilitato');
    // Export stub class vuota per evitare errori di import
    if (typeof exports !== 'undefined') {
        exports.VocabularyManager = class { constructor() {} };
    }
    // Non proseguire con l'inizializzazione DOM-dependent
} else {
    console.log('[vocabulary-manager] Contesto DOM valido, inizializzazione completa');
}

// ✅ PROTEZIONE: Attende che VocabularySync sia disponibile
if (typeof VocabularySync === 'undefined') {
    console.warn('[VOCABULARY] VocabularySync non ancora disponibile, inizializzo senza sync');
}

class VocabularyManager {
    constructor() {
        this.vocabularyPath = 'js/middleware/vocabulary.json';
        this.txtVocabularyPath = '/comandi/vocabolario_comandi.txt';
        this.vocabulary = null;
        this.lastModified = null;
        this.cache = new Map();
        this.isLoading = false;
        this.watchInterval = null;
        this.settings = {
            enableDebug: true,
            cacheTimeout: 300000, // 5 minuti
            similarityThreshold: 0.8,
            autoReload: true,
            fallbackToAI: true
        };
        
        console.log('📚 VocabularyManager: Inizializzato');
        this.startWatcher();
    }

    /**
     * FUNZIONE CRITICA: Carica SEMPRE il vocabolario più recente
     * Questa funzione viene chiamata per OGNI richiesta utente
     */
    async loadVocabulary(forceReload = false) {
        if (this.isLoading && !forceReload) {
            console.log('📚 Vocabolario già in caricamento, attendo...');
            return this.vocabulary;
        }

        try {
            this.isLoading = true;
            
            // Aggiungi timestamp per evitare cache del browser
            const timestamp = Date.now();
            const url = `${this.vocabularyPath}?t=${timestamp}`;
            
            if (this.settings.enableDebug) {
                console.log('📚 CARICAMENTO VOCABOLARIO IN TEMPO REALE:', url);
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (!response.ok) {
                throw new Error(`Errore HTTP: ${response.status}`);
            }

            const newVocabulary = await response.json();
            
            // 🚀 NUOVO: Carica e integra vocabolario .txt dell'app
            try {
                const txtVocabulary = await this.loadTxtVocabulary();
                if (txtVocabulary && txtVocabulary.commands) {
                    console.log('📚 ✅ Integrazione vocabolario .txt dell\'app:', txtVocabulary.commands.length, 'comandi');
                    // Integra i comandi dal .txt nel vocabulary JSON
                    newVocabulary.commands = [...newVocabulary.commands, ...txtVocabulary.commands];
                }
            } catch (error) {
                console.warn('📚 ⚠️ Errore caricamento .txt, uso solo .json:', error.message);
            }
            
            // Verifica se il vocabolario è cambiato
            const currentModified = response.headers.get('Last-Modified') || new Date().toISOString();
            const hasChanged = !this.lastModified || currentModified !== this.lastModified;
            
            if (hasChanged || forceReload) {
                this.vocabulary = newVocabulary;
                this.lastModified = currentModified;
                this.settings = { ...this.settings, ...newVocabulary.settings };
                
                // Pulisci cache quando il vocabolario cambia
                this.cache.clear();
                
                if (this.settings.enableDebug) {
                    console.log('📚 ✅ VOCABOLARIO AGGIORNATO:', {
                        version: newVocabulary.version,
                        commands: newVocabulary.commands.length,
                        lastModified: currentModified,
                        settings: this.settings
                    });
                }
            }

            return this.vocabulary;
        } catch (error) {
            console.error('❌ Errore caricamento vocabolario:', error);
            
            // Fallback: usa vocabolario precedente se disponibile
            if (this.vocabulary) {
                console.log('📚 Uso vocabolario precedente come fallback');
                return this.vocabulary;
            }
            
            // Fallback estremo: vocabolario di base
            return this.getBasicVocabulary();
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Avvia il watcher per rilevare modifiche al file
     */
    startWatcher() {
        if (!this.settings.autoReload) return;
        
        // Controlla modifiche ogni 2 secondi
        this.watchInterval = setInterval(async () => {
            try {
                const response = await fetch(this.vocabularyPath, {
                    method: 'HEAD',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });
                
                const lastModified = response.headers.get('Last-Modified');
                if (lastModified && lastModified !== this.lastModified) {
                    if (this.settings.enableDebug) {
                        console.log('📚 🔄 RILEVATA MODIFICA AL VOCABOLARIO - Ricaricamento automatico');
                    }
                    await this.loadVocabulary(true);
                }
            } catch (error) {
                // Errore silenzioso per il watcher
                if (this.settings.enableDebug) {
                    console.log('📚 Watcher: Errore controllo modifiche:', error.message);
                }
            }
        }, 2000);
    }

    /**
     * Ferma il watcher
     */
    stopWatcher() {
        if (this.watchInterval) {
            clearInterval(this.watchInterval);
            this.watchInterval = null;
        }
    }

    /**
     * FUNZIONE CRITICA: Trova corrispondenza nel vocabolario
     * Usa algoritmi di similarity per variazioni linguistiche
     */
    async findMatch(userInput) {
        // SEMPRE ricarica il vocabolario prima di cercare
        const vocabulary = await this.loadVocabulary();
        
        if (!vocabulary || !vocabulary.commands) {
            console.log('📚 Vocabolario non disponibile');
            return null;
        }

        const normalizedInput = this.normalizeText(userInput);
        const cacheKey = normalizedInput;
        
        // Controlla cache (ma solo se non è scaduta)
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.settings.cacheTimeout) {
                if (this.settings.enableDebug) {
                    console.log('📚 💾 CACHE HIT:', cached.result?.id || 'no-match');
                }
                return cached.result;
            }
        }

        // Cerca nel vocabolario
        let bestMatch = null;
        let bestScore = 0;

        for (const command of vocabulary.commands) {
            for (const pattern of command.patterns) {
                const score = this.calculateSimilarity(normalizedInput, pattern);
                
                if (score > bestScore && score >= this.settings.similarityThreshold) {
                    bestMatch = {
                        command: command,
                        pattern: pattern,
                        score: score,
                        extractedParams: this.extractParameters(userInput, pattern)
                    };
                    bestScore = score;
                }
            }
        }

        // Salva in cache
        this.cache.set(cacheKey, {
            result: bestMatch,
            timestamp: Date.now()
        });

        if (this.settings.enableDebug) {
            if (bestMatch) {
                console.log('📚 ✅ MATCH TROVATO:', {
                    command: bestMatch.command.id,
                    pattern: bestMatch.pattern,
                    score: bestMatch.score,
                    params: bestMatch.extractedParams
                });
            } else {
                console.log('📚 ❌ NESSUN MATCH TROVATO per:', userInput);
            }
        }

        return bestMatch;
    }

    /**
     * Normalizza il testo per il confronto
     */
    normalizeText(text) {
        return text.toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/à/g, 'a')
            .replace(/è/g, 'e')
            .replace(/ì/g, 'i')
            .replace(/ò/g, 'o')
            .replace(/ù/g, 'u');
    }

    /**
     * Calcola similarità tra due testi
     */
    calculateSimilarity(text1, text2) {
        const normalized1 = this.normalizeText(text1);
        const normalized2 = this.normalizeText(text2);
        
        // Controllo esatto
        if (normalized1 === normalized2) return 1.0;
        
        // Controllo se uno contiene l'altro - ma solo se la differenza di lunghezza è ragionevole
        const lenDiff = Math.abs(normalized1.length - normalized2.length);
        const maxLen = Math.max(normalized1.length, normalized2.length);
        
        // Solo se la differenza è meno del 30% della lunghezza totale
        if (lenDiff / maxLen < 0.3) {
            if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
                return 0.95;
            }
        }
        
        // Algoritmo di Jaccard per similarità
        const words1 = new Set(normalized1.split(' '));
        const words2 = new Set(normalized2.split(' '));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    /**
     * Estrae parametri dinamici dal pattern
     */
    extractParameters(input, pattern) {
        const params = {};
        
        // Cerca tutti i placeholder nel pattern
        const placeholderRegex = /\{([^}]+)\}/g;
        const placeholders = [];
        let match;
        
        // Raccoglie tutti i placeholder
        while ((match = placeholderRegex.exec(pattern)) !== null) {
            placeholders.push(match[1]);
        }
        
        if (placeholders.length === 0) {
            return params;
        }
        
        // Crea pattern regex sostituendo ogni placeholder con un gruppo di cattura
        let regexPattern = pattern;
        
        // Escape caratteri speciali regex prima di sostituire i placeholder
        regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Sostituisci i placeholder escaped con gruppi di cattura
        for (let i = 0; i < placeholders.length; i++) {
            regexPattern = regexPattern.replace(`\\{${placeholders[i]}\\}`, '(.+?)');
        }
        
        const regex = new RegExp(regexPattern, 'i');
        const result = regex.exec(input);
        
        if (result) {
            // Assegna i valori catturati ai parametri
            for (let i = 0; i < placeholders.length; i++) {
                if (result[i + 1]) {
                    let value = result[i + 1].trim();
                    
                    // Converti numeri scritti in parole in cifre
                    value = this.convertWordsToNumbers(value);
                    
                    params[placeholders[i]] = value;
                }
            }
        }
        
        return params;
    }

    /**
     * Converte numeri scritti in parole in cifre
     */
    convertWordsToNumbers(text) {
        const numberWords = {
            'zero': '0', 'uno': '1', 'due': '2', 'tre': '3', 'quattro': '4',
            'cinque': '5', 'sei': '6', 'sette': '7', 'otto': '8', 'nove': '9',
            'dieci': '10', 'undici': '11', 'dodici': '12', 'tredici': '13',
            'quattordici': '14', 'quindici': '15', 'sedici': '16', 'diciassette': '17',
            'diciotto': '18', 'diciannove': '19', 'venti': '20', 'trenta': '30',
            'quaranta': '40', 'cinquanta': '50', 'sessanta': '60', 'settanta': '70',
            'ottanta': '80', 'novanta': '90'
        };
        
        const lowerText = text.toLowerCase();
        
        // Controlla se è già un numero
        if (/^\d+$/.test(text)) {
            return text;
        }
        
        // Cerca corrispondenze nei numeri scritti
        for (const [word, number] of Object.entries(numberWords)) {
            if (lowerText === word) {
                return number;
            }
        }
        
        // Se non trova corrispondenze, ritorna il testo originale
        return text;
    }

    /**
     * Vocabolario di base come fallback
     */
    getBasicVocabulary() {
        return {
            version: "1.0.0-fallback",
            commands: [
                {
                    id: "date_today",
                    patterns: ["che data è oggi", "che giorno è oggi"],
                    action: "getDateInfo",
                    params: { date: "today" }
                }
            ],
            settings: this.settings
        };
    }

    /**
     * Aggiunge un nuovo comando al vocabolario
     */
    async addCommand(command) {
        const vocabulary = await this.loadVocabulary();
        vocabulary.commands.push(command);
        
        // Salva il vocabolario aggiornato
        await this.saveVocabulary(vocabulary);
        
        if (this.settings.enableDebug) {
            console.log('📚 ➕ COMANDO AGGIUNTO:', command.id);
        }
    }

    /**
     * Salva il vocabolario (solo per future estensioni)
     */
    async saveVocabulary(vocabulary) {
        // Per ora solo log, in futuro potrebbe salvare su server
        console.log('📚 💾 SALVATAGGIO VOCABOLARIO:', vocabulary.version);
    }

    /**
     * Statistiche del vocabolario
     */
    getStats() {
        if (!this.vocabulary) return null;
        
        return {
            version: this.vocabulary.version,
            totalCommands: this.vocabulary.commands.length,
            totalPatterns: this.vocabulary.commands.reduce((sum, cmd) => sum + cmd.patterns.length, 0),
            cacheSize: this.cache.size,
            lastModified: this.lastModified,
            settings: this.settings
        };
    }

    /**
     * 🚀 NUOVO: Carica vocabolario .txt dell'app e lo converte in formato JSON
     */
    async loadTxtVocabulary() {
        try {
            const response = await fetch(this.txtVocabularyPath, {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' }
            });

            if (!response.ok) {
                throw new Error(`Errore caricamento .txt: ${response.status}`);
            }

            const txtContent = await response.text();
            const commands = this.parseTxtVocabulary(txtContent);

            return {
                version: "txt-sync-1.0",
                source: "vocabolario_comandi.txt",
                commands: commands
            };

        } catch (error) {
            console.warn('📚 ⚠️ loadTxtVocabulary fallito:', error.message);
            return null;
        }
    }

    /**
     * Converte il contenuto .txt in comandi JSON
     */
    parseTxtVocabulary(txtContent) {
        const commands = [];
        const lines = txtContent.split('\n');
        let currentCategory = null;
        let clientPatterns = [];
        let orderPatterns = [];

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Ignora linee vuote e commenti
            if (!trimmed || trimmed.startsWith('#')) {
                if (trimmed.includes('CATEGORIA:')) {
                    currentCategory = trimmed.replace(/# CATEGORIA:\s*/, '');
                }
                continue;
            }

            // Raccoglie pattern per categoria
            if (currentCategory === 'Gestione Clienti') {
                clientPatterns.push(trimmed);
            } else if (currentCategory === 'Fatturato e Ordini') {
                // Filtra solo i pattern che riguardano il conteggio ordini
                if (trimmed.includes('quanti ordini') || 
                    trimmed.includes('numero ordini') ||
                    trimmed.includes('ordini ci sono') ||
                    trimmed.includes('ordini nel database') ||
                    trimmed.includes('totale ordini')) {
                    orderPatterns.push(trimmed);
                }
            }
        }

        // Crea comando per pattern clienti
        if (clientPatterns.length > 0) {
            commands.push({
                id: "count_clients_from_txt",
                patterns: clientPatterns,
                action: "countClients",
                params: {},
                description: "Comandi clienti dal vocabolario .txt dell'app",
                source: "txt",
                executeLocal: true  // 🚀 NUOVO: Esecuzione locale diretta
            });
        }

        // Crea comando per pattern ordini
        if (orderPatterns.length > 0) {
            commands.push({
                id: "count_orders_from_txt",
                patterns: orderPatterns,
                action: "countOrders",
                params: {},
                description: "Comandi ordini dal vocabolario .txt dell'app",
                source: "txt",
                executeLocal: true  // 🚀 NUOVO: Esecuzione locale diretta
            });
        }

        return commands;
    }

    /**
     * 🚀 NUOVO: Esecutore locale per comandi della scheda Comandi dell'app
     * Gestisce direttamente i comandi senza coinvolgere AI esterna
     */
    async executeLocalCommand(command, userInput) {
        try {
            console.log('🏠 ESECUZIONE LOCALE:', command.action, 'per comando dal .txt');

            // Verifica che sia un comando locale
            if (!command.executeLocal) {
                throw new Error('Comando non marcato per esecuzione locale');
            }

            // Ottieni accesso ai dati Supabase
            const supabaseAI = window.supabaseAI || window.robustConnectionManager?.instances?.supabaseAI;
            if (!supabaseAI) {
                throw new Error('SupabaseAI non disponibile per esecuzione locale');
            }

            switch (command.action) {
                case 'countClients':
                    return await this.executeLocalCountClients(supabaseAI);
                
                case 'countOrders':
                    return await this.executeLocalCountOrders(supabaseAI);
                
                default:
                    throw new Error(`Azione locale non implementata: ${command.action}`);
            }

        } catch (error) {
            console.error('❌ Errore esecuzione locale:', error);
            return {
                success: false,
                response: `Errore nell'esecuzione locale: ${error.message}`,
                source: 'local-executor-error'
            };
        }
    }

    /**
     * Conta clienti direttamente da Supabase (locale)
     */
    async executeLocalCountClients(supabaseAI) {
        try {
            const allData = await supabaseAI.getAllData();
            const count = allData.clients ? allData.clients.length : 0;
            
            console.log('🏠 ✅ Conteggio locale clienti:', count);
            
            return {
                success: true,
                response: `Ci sono ${count} clienti nel database`,
                data: { count, type: 'clienti', source: 'local-execution' }
            };
        } catch (error) {
            throw new Error(`Errore conteggio locale clienti: ${error.message}`);
        }
    }

    /**
     * Conta ordini direttamente da Supabase (locale)
     */
    async executeLocalCountOrders(supabaseAI) {
        try {
            const allData = await supabaseAI.getAllData();
            let count = allData.orders ? allData.orders.length : 0;
            
            // Fallback ai dati historical se orders è vuoto
            if (count === 0 && allData.historical) {
                count = allData.historical.length;
                console.log('🏠 📊 Usando dati historical per conteggio:', count);
            }
            
            console.log('🏠 ✅ Conteggio locale ordini:', count);
            
            return {
                success: true,
                response: `Ci sono ${count} ordini nel database`,
                data: { count, type: 'ordini', source: 'local-execution' }
            };
        } catch (error) {
            throw new Error(`Errore conteggio locale ordini: ${error.message}`);
        }
    }
}

// Esporta classe per uso globale
window.VocabularyManager = VocabularyManager;