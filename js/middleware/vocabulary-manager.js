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
        
        // Controllo se uno contiene l'altro
        if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
            return 0.95;
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
        
        // Cerca pattern con placeholder {nome}
        const placeholderRegex = /\{([^}]+)\}/g;
        let match;
        
        while ((match = placeholderRegex.exec(pattern)) !== null) {
            const paramName = match[1];
            
            // Crea pattern regex sostituendo il placeholder
            let regexPattern = pattern.replace(/\{[^}]+\}/g, '(.+?)');
            regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex chars
            regexPattern = regexPattern.replace(/\\\(\\\.\\\+\\\?\\\)/g, '(.+?)'); // Restore capture groups
            
            const regex = new RegExp(regexPattern, 'i');
            const result = regex.exec(input);
            
            if (result && result[1]) {
                let value = result[1].trim();
                
                // Converti numeri scritti in parole in cifre
                value = this.convertWordsToNumbers(value);
                
                params[paramName] = value;
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
}

// Esporta classe per uso globale
window.VocabularyManager = VocabularyManager;