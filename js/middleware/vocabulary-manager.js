/**
 * Vocabulary Manager - Gestisce il vocabolario dinamico con architettura Master-Slave
 * SISTEMA OTTIMIZZATO: Event-driven sync + Test automatici + Configurazione modulare
 */

// 🔧 CONFIGURAZIONE MODULARE
const VOCABULARY_CONFIG = {
    DEBOUNCE_DELAY: 500,           // ms per debounce eventi editor
    FALLBACK_POLLING_INTERVAL: 2000, // ms per fallback polling
    MAX_SYNC_RETRIES: 3,           // tentativi in caso di errore
    TEST_ON_STARTUP: true,         // esegui test all'avvio
    ENABLE_DEBUG: true,            // log dettagliati
    EDITOR_SELECTORS: [            // selettori per trovare l'editor comandi
        '[id*="commands"]',
        '[class*="editor"]', 
        'textarea[class*="command"]',
        '#vocabulary-editor',
        '.commands-textarea'
    ]
};

console.log('[LOAD] ✅ vocabulary-manager.js caricato correttamente (OTTIMIZZATO)');
console.log('[DEBUG] vocabulary-manager execution context:', typeof self, typeof window);
console.log('[CONFIG] 🔧 Configurazione modulare attivata:', VOCABULARY_CONFIG);

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
        this.userVocabulary = []; // 🎯 PRIORITÀ: Array separato per vocabolario utente
        this.systemVocabulary = []; // 📚 Array separato per vocabolario sistema
        this.masterVocabulary = []; // 🔥 MASTER: Vocabolario unificato master
        this.syncedSystemVocabulary = []; // 🔄 SYNC: Fotocopia del master per il sistema
        this.lastModified = null;
        this.cache = new Map();
        this.isLoading = false;
        this.watchInterval = null;
        this.settings = {
            enableDebug: true,
            cacheTimeout: 300000, // 5 minuti
            similarityThreshold: 0.30, // 🔧 Abbassata a 0.30 come richiesto
            autoReload: true,
            fallbackToAI: true
        };
        
        console.log('📚 VocabularyManager: Inizializzato con architettura MASTER-SLAVE');
        // DEBUG: Track user vocabulary changes
        this._lastUserVocContent = localStorage.getItem('vocabulary_user');
        this.startWatcher();
        
        // 🔧 AUTO-FIX: Verifica stato middleware all'avvio
        this.checkMiddlewareHealth();
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
            
            // 📚 CARICA VOCABOLARIO SISTEMA - SUPPORTA ENTRAMBI I FORMATI
            try {
                const txtVocabulary = await this.loadTxtVocabulary();
                
                // 🔄 NUOVO: Supporta formato categorizzato (v2.0)
                let systemCommands = [];
                if (newVocabulary.categories) {
                    console.log('📚 🆕 Formato categorizzato v2.0 rilevato');
                    // Estrai tutti i pattern dalle categorie
                    Object.values(newVocabulary.categories).forEach(category => {
                        if (category.patterns) {
                            systemCommands.push(...category.patterns);
                        }
                    });
                    console.log('📚 ✅ Comandi estratti da categorie:', systemCommands.length);
                } else if (newVocabulary.commands) {
                    // 🔄 LEGACY: Supporta formato vecchio (v1.x)
                    console.log('📚 🔄 Formato legacy v1.x rilevato');
                    systemCommands = newVocabulary.commands;
                }
                
                if (txtVocabulary && txtVocabulary.commands) {
                    console.log('📚 ✅ Sistema vocabolary txt:', txtVocabulary.commands.length, 'comandi');
                    this.systemVocabulary = [...systemCommands, ...txtVocabulary.commands];
                } else {
                    this.systemVocabulary = systemCommands;
                }
                
                console.log('📚 📊 TOTALE sistema vocabulary:', this.systemVocabulary.length, 'comandi');
            } catch (error) {
                console.warn('📚 ⚠️ Errore caricamento sistema, uso solo .json:', error.message);
                
                // Fallback per formato categorizzato
                let fallbackCommands = [];
                if (newVocabulary.categories) {
                    Object.values(newVocabulary.categories).forEach(category => {
                        if (category.patterns) {
                            fallbackCommands.push(...category.patterns);
                        }
                    });
                }
                this.systemVocabulary = fallbackCommands;
            }
            
            // 🎯 CARICA VOCABOLARIO UTENTE (PRIORITÀ ASSOLUTA)
            await this.loadUserVocabulary();
            if (this.userVocabulary && this.userVocabulary.length > 0) {
                console.log('🎯 ✅ User vocabulary caricato:', this.userVocabulary.length, 'comandi');
            } else {
                console.log('🎯 📋 User vocabulary vuoto - sarà creato al bisogno');
                this.userVocabulary = [];
            }
            
            // 🔥 CREA MASTER VOCABULARY - Combina Editor + Sistema
            this.masterVocabulary = this.createMasterVocabulary();
            
            // 🔄 SINCRONIZZAZIONE: Sistema diventa fotocopia del Master
            this.syncedSystemVocabulary = this.syncSystemVocabulary();
            
            // ✅ VALIDAZIONE: Verifica sincronizzazione perfetta
            const syncStatus = this.validateSync();
            
            // 📚 Mantieni compatibilità con codice esistente
            newVocabulary.commands = this.masterVocabulary;
            
            console.log('📚 🔗 ARCHITETTURA MASTER-SLAVE:');
            console.log('   - User commands (Editor scheda Comandi):', this.userVocabulary.length);
            console.log('   - System commands (Predefiniti):', this.systemVocabulary.length);  
            console.log('   ═══════════════════════════════════════');
            console.log('   - 🔥 MASTER vocabulary:', this.masterVocabulary.length, 'comandi creato');
            console.log('   - 🔄 SYSTEM vocabulary:', this.syncedSystemVocabulary.length, 'comandi sincronizzato');
            console.log('   - ✅ SYNC verification:', syncStatus);
            console.log('   ═══════════════════════════════════════');
            console.log('🚀 Vocabulary system ready with unified commands');
            
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
        
        // Setup sync automatico iniziale (OTTIMIZZATO)
        this.setupEventDrivenSync();
        
        // Controlla modifiche ogni 2 secondi
        this.watchInterval = setInterval(async () => {
            try {
                // Check per modifiche all'editor utente
                const currentUserVoc = this.getUserVocabularySignature();
                const userVocChanged = currentUserVoc !== this._lastUserVocSignature;
                
                const response = await fetch(this.vocabularyPath, {
                    method: 'HEAD',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });
                
                const lastModified = response.headers.get('Last-Modified');
                if (lastModified && lastModified !== this.lastModified || userVocChanged) {
                    if (this.settings.enableDebug) {
                        console.log('📚 🔄 RILEVATA MODIFICA AL VOCABOLARIO - Sincronizzazione automatica...');
                        if (userVocChanged) {
                            console.log('🔄 Editor Comandi modificato, sincronizzazione in corso...');
                            this._lastUserVocSignature = currentUserVoc;
                        }
                    }
                    // Esegui sync completo
                    await this.performFullSync();
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
     * 🎯 PIPELINE MASTER: Usa solo il Master Vocabulary unificato
     * ARCHITETTURA SEMPLIFICATA: Un solo vocabolario da consultare
     */
    async findMatch(userInput) {
        // Carica entrambi i vocabolari
        await this.loadVocabulary();
        
        const normalizedInput = this.normalizeText(userInput);
        const cacheKey = normalizedInput;
        
        // Controlla cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.settings.cacheTimeout) {
                if (this.settings.enableDebug) {
                    console.log('📚 💾 CACHE HIT:', cached.result?.command?.id || 'no-match');
                }
                return cached.result;
            }
        }

        // 🔥 UNICO STEP: Cerca nel MASTER VOCABULARY unificato
        const masterMatch = this.findInVocabulary(normalizedInput, userInput, this.masterVocabulary, 'MASTER');
        if (masterMatch) {
            this.cache.set(cacheKey, { result: masterMatch, timestamp: Date.now() });
            if (this.settings.enableDebug) {
                const source = masterMatch.command.source || 'unknown';
                console.log(`🔥 MASTER MATCH [${source}]:`, masterMatch.command.id || masterMatch.pattern);
            }
            return masterMatch;
        }

        // 🥉 Nessun match
        this.cache.set(cacheKey, { result: null, timestamp: Date.now() });
        
        if (this.settings.enableDebug) {
            console.log('📚 ❌ NESSUN MATCH TROVATO nel MASTER per:', userInput);
            
            // 🤔 Check se sembra richiesta interna
            if (this.looksLikeInternalRequest(userInput)) {
                console.log('🔍 Query sembra interna - suggerisco aggiunta al vocabolario');
            }
        }

        return null;
    }

    /**
     * Cerca match in un vocabolario specifico
     */
    findInVocabulary(normalizedInput, originalInput, vocabulary, source) {
        let bestMatch = null;
        let bestScore = 0;

        // 🔍 PRIMA: Cerca match ESATTI per evitare confusione
        for (const command of vocabulary) {
            if (!command.patterns) continue;
            
            for (const pattern of command.patterns) {
                const normalizedPattern = this.normalizeText(pattern);
                
                // MATCH ESATTO ha priorità assoluta
                if (normalizedPattern === normalizedInput) {
                    if (this.settings.enableDebug) {
                        console.log(`🎯 [${source}] ✅ EXACT MATCH:`, pattern);
                    }
                    return {
                        command: command,
                        pattern: pattern,
                        score: 1.0,
                        exactMatch: true,
                        extractedParams: this.extractParameters(originalInput, pattern)
                    };
                }
            }
        }

        // 🧠 POI: Matching intelligente con keyword validation
        for (const command of vocabulary) {
            if (!command.patterns) continue;
            
            for (const pattern of command.patterns) {
                const score = this.calculateSmartScore(normalizedInput, pattern);
                
                if (this.settings.enableDebug && source === 'SYSTEM') {
                    console.log(`🎯 [${source}] "${pattern}" vs "${normalizedInput}" → ${score}`);
                }
                
                if (score >= this.settings.similarityThreshold && score > bestScore) {
                    // 🎯 Enhanced parameter extraction for both formats
                    let extractedParams = {};
                    
                    // Try bracket format [PARAM] first (user vocabulary)
                    const bracketParams = this.extractBracketParameters(originalInput, pattern);
                    if (Object.keys(bracketParams).length > 0) {
                        extractedParams = bracketParams;
                    } else {
                        // Fallback to brace format {param} (system vocabulary)
                        extractedParams = this.extractParameters(originalInput, pattern);
                    }
                    
                    bestMatch = {
                        command: command,
                        pattern: pattern,
                        score: score,
                        extractedParams: extractedParams,
                        isParameterized: Object.keys(extractedParams).length > 0
                    };
                    bestScore = score;
                    
                    // 🚀 PRIORITY: If this is a successful parameterized match, it should win
                    if (score >= 0.9 && Object.keys(extractedParams).length > 0) {
                        if (this.settings.enableDebug) {
                            console.log(`🎯 [${source}] 🏆 PARAMETERIZED WINNER:`, pattern, 'params:', extractedParams);
                        }
                        return bestMatch; // Immediate return for high-scoring parameterized matches
                    }
                }
            }
        }

        return bestMatch;
    }

    /**
     * 🧠 Calcolo score intelligente con validazione keywords
     */
    calculateSmartScore(query, pattern) {
        const normalizedQuery = this.normalizeText(query);
        const normalizedPattern = this.normalizeText(pattern);
        
        const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2);
        const patternWords = normalizedPattern.split(' ').filter(w => w.length > 2);
        
        // 🔑 PAROLE CHIAVE CRITICHE - devono matchare
        const keyWords = ['ordini', 'clienti', 'prodotti', 'fatturato', 'appuntamenti'];
        
        // ❌ PENALIZZAZIONE: Se query contiene keyword diversa dal pattern
        for (const keyword of keyWords) {
            const queryHasKeyword = normalizedQuery.includes(keyword);
            const patternHasKeyword = normalizedPattern.includes(keyword);
            
            // Se la query ha una keyword specifica ma il pattern ne ha una diversa, score = 0
            if (queryHasKeyword && patternWords.some(w => keyWords.includes(w) && w !== keyword)) {
                if (this.settings.enableDebug) {
                    console.log(`🚫 KEYWORD MISMATCH: query="${keyword}" vs pattern keywords in ${normalizedPattern}`);
                }
                return 0;
            }
        }
        
        // ✅ BONUS: Se keywords matchano perfettamente
        let keywordBonus = 0;
        for (const keyword of keyWords) {
            if (normalizedQuery.includes(keyword) && normalizedPattern.includes(keyword)) {
                keywordBonus = 0.3; // 30% bonus per keyword match
                break;
            }
        }
        
        // 🔢 Calcola matching delle parole rimanenti
        let matchingWords = 0;
        for (const qWord of queryWords) {
            if (patternWords.some(pWord => pWord.includes(qWord) || qWord.includes(pWord))) {
                matchingWords++;
            }
        }
        
        const baseScore = matchingWords / Math.max(queryWords.length, patternWords.length);
        const finalScore = Math.min(1.0, baseScore + keywordBonus);
        
        if (this.settings.enableDebug && finalScore > 0.3) {
            console.log(`🧠 SMART SCORE: "${normalizedQuery}" vs "${normalizedPattern}" = ${finalScore} (base: ${baseScore}, bonus: ${keywordBonus})`);
        }
        
        return finalScore;
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
        
        // 🎯 PRIORITY 1: Check for parameterized pattern matching
        const parameterizedScore = this.calculateParameterizedScore(normalized1, normalized2);
        if (parameterizedScore > 0) {
            if (this.settings.enableDebug) {
                console.log(`🎯 PARAMETERIZED MATCH: "${normalized1}" vs "${normalized2}" → ${parameterizedScore}`);
            }
            return parameterizedScore;
        }
        
        // 🎯 PRIORITY 2: Exact match
        if (normalized1 === normalized2) return 1.0;
        
        // 🎯 PRIORITY 3: Contains match with length validation
        const lenDiff = Math.abs(normalized1.length - normalized2.length);
        const maxLen = Math.max(normalized1.length, normalized2.length);
        
        if (lenDiff / maxLen < 0.3) {
            if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
                return 0.95;
            }
        }
        
        // 🎯 PRIORITY 4: Jaccard similarity for general patterns
        const words1 = new Set(normalized1.split(' '));
        const words2 = new Set(normalized2.split(' '));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    /**
     * 🎯 NUOVO: Calcola score per pattern parametrizzati con priorità MASSIMA
     */
    calculateParameterizedScore(query, pattern) {
        // Detect parameters in pattern: both [PARAM] and {param} formats
        const bracketParams = pattern.match(/\[([^\]]+)\]/g) || [];
        const braceParams = pattern.match(/\{([^}]+)\}/g) || [];
        
        if (bracketParams.length === 0 && braceParams.length === 0) {
            return 0; // No parameters, use standard scoring
        }
        
        if (this.settings.enableDebug) {
            console.log(`🔍 ANALYZING PARAMETERIZED: "${pattern}" with query "${query}"`);
            console.log(`   Found bracket params: ${bracketParams.join(', ')}`);
            console.log(`   Found brace params: ${braceParams.join(', ')}`);
        }
        
        // Try to extract parameters and see if pattern matches
        let extractedParams = {};
        let patternScore = 0;
        
        // Handle [PARAM] format (user vocabulary)
        if (bracketParams.length > 0) {
            patternScore = this.scorePatternWithBrackets(query, pattern, bracketParams);
            if (patternScore > 0) {
                extractedParams = this.extractBracketParameters(query, pattern);
            }
        }
        
        // Handle {param} format (system vocabulary) 
        if (braceParams.length > 0 && patternScore === 0) {
            patternScore = this.scorePatternWithBraces(query, pattern, braceParams);
            if (patternScore > 0) {
                extractedParams = this.extractParameters(query, pattern);
            }
        }
        
        if (patternScore > 0 && Object.keys(extractedParams).length > 0) {
            // MASSIVE BONUS: Successfully extracted parameters = priority match
            const bonus = 0.9; // Base score of 0.9 for successful parameter extraction
            const finalScore = Math.min(1.0, patternScore + bonus);
            
            if (this.settings.enableDebug) {
                console.log(`🎯 ✅ PARAMETERIZED SUCCESS: extracted ${JSON.stringify(extractedParams)}, score: ${finalScore}`);
            }
            
            return finalScore;
        }
        
        return 0;
    }
    
    /**
     * Score pattern with [PARAM] format
     */
    scorePatternWithBrackets(query, pattern, bracketParams) {
        // Create regex by replacing [PARAM] with capture groups
        let regexPattern = pattern;
        
        // Escape special regex characters first
        regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Replace escaped brackets with capture groups
        for (const param of bracketParams) {
            const escapedParam = param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            regexPattern = regexPattern.replace(escapedParam, '(.+?)');
        }
        
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        const match = query.match(regex);
        
        if (match && match.length > 1) {
            // Check if extracted values look reasonable (not empty, not too long)
            const extractedValues = match.slice(1);
            const validExtractions = extractedValues.filter(val => 
                val && val.trim().length > 0 && val.trim().length < 50
            );
            
            if (validExtractions.length === bracketParams.length) {
                return 0.95; // High score for successful bracket parameter extraction
            }
        }
        
        return 0;
    }
    
    /**
     * Score pattern with {param} format
     */
    scorePatternWithBraces(query, pattern, braceParams) {
        // Use existing extractParameters logic but just test if it works
        const extracted = this.extractParameters(query, pattern);
        
        if (Object.keys(extracted).length === braceParams.length) {
            // Verify extracted values are reasonable
            const values = Object.values(extracted);
            const validValues = values.filter(val => 
                val && val.toString().trim().length > 0 && val.toString().trim().length < 50
            );
            
            if (validValues.length === braceParams.length) {
                return 0.95; // High score for successful brace parameter extraction
            }
        }
        
        return 0;
    }
    
    /**
     * Extract parameters from [PARAM] format patterns
     */
    extractBracketParameters(query, pattern) {
        const params = {};
        const bracketParams = pattern.match(/\[([^\]]+)\]/g) || [];
        
        if (bracketParams.length === 0) return params;
        
        let regexPattern = pattern;
        const paramNames = [];
        
        // Escape special regex characters
        regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Replace [PARAM] with capture groups and collect param names
        for (const bracketParam of bracketParams) {
            const paramName = bracketParam.slice(1, -1).toLowerCase(); // Remove [ and ]
            paramNames.push(paramName);
            
            const escapedParam = bracketParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            regexPattern = regexPattern.replace(escapedParam, '(.+?)');
        }
        
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        const match = query.match(regex);
        
        if (match && match.length > 1) {
            for (let i = 0; i < paramNames.length; i++) {
                if (match[i + 1]) {
                    params[paramNames[i]] = match[i + 1].trim();
                }
            }
        }
        
        return params;
    }

    /**
     * Estrae parametri dinamici dal pattern con logica flessibile
     * 🚀 FIX: Ora funziona anche con variazioni semantiche
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
        
        if (this.settings.enableDebug) {
            console.log('🔍 EXTRACT PARAMS: input="' + input + '", pattern="' + pattern + '"');
            console.log('🔍 PLACEHOLDERS:', placeholders);
        }
        
        // 🚀 STRATEGIA 1: Prova match esatto prima
        const exactParams = this.extractParametersExact(input, pattern, placeholders);
        if (Object.keys(exactParams).length > 0) {
            if (this.settings.enableDebug) {
                console.log('✅ EXACT MATCH SUCCESS:', exactParams);
            }
            return exactParams;
        }
        
        // 🚀 STRATEGIA 2: Match flessibile per variazioni semantiche
        const flexibleParams = this.extractParametersFlexible(input, pattern, placeholders);
        if (Object.keys(flexibleParams).length > 0) {
            if (this.settings.enableDebug) {
                console.log('✅ FLEXIBLE MATCH SUCCESS:', flexibleParams);
            }
            return flexibleParams;
        }
        
        // 🚀 STRATEGIA 3: Keyword-based extraction
        const keywordParams = this.extractParametersKeywordBased(input, pattern, placeholders);
        if (Object.keys(keywordParams).length > 0) {
            if (this.settings.enableDebug) {
                console.log('✅ KEYWORD-BASED SUCCESS:', keywordParams);
            }
            return keywordParams;
        }
        
        if (this.settings.enableDebug) {
            console.log('❌ ALL EXTRACTION STRATEGIES FAILED');
        }
        
        return params;
    }
    
    /**
     * 🎯 STRATEGIA 1: Estrazione esatta (metodo originale)
     */
    extractParametersExact(input, pattern, placeholders) {
        const params = {};
        
        // Crea pattern regex sostituendo ogni placeholder con un gruppo di cattura
        let regexPattern = pattern;
        
        // Escape caratteri speciali regex prima di sostituire i placeholder
        regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Sostituisci i placeholder escaped con gruppi di cattura
        for (let i = 0; i < placeholders.length; i++) {
            const isLastPlaceholder = (i === placeholders.length - 1);
            const afterPlaceholder = pattern.substring(pattern.indexOf(`{${placeholders[i]}}`) + `{${placeholders[i]}}`.length);
            const isAtEnd = afterPlaceholder.trim().length === 0;
            
            let capturePattern;
            if (isAtEnd || isLastPlaceholder) {
                // For parameters at the end, capture everything remaining
                capturePattern = '(.+)';
            } else {
                // For parameters in the middle, use non-greedy match until next word
                const nextWords = afterPlaceholder.trim().split(' ').filter(w => w.length > 0);
                if (nextWords.length > 0) {
                    // Look ahead to next significant word (already escaped pattern)
                    const nextWord = nextWords[0];
                    const escapedNextWord = nextWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    capturePattern = `(.+?)(?=\\s+${escapedNextWord})`;
                } else {
                    capturePattern = '(.+?)';
                }
            }
            
            regexPattern = regexPattern.replace(`\\{${placeholders[i]}\\}`, capturePattern);
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
     * 🚀 STRATEGIA 2: Estrazione flessibile per variazioni semantiche
     */
    extractParametersFlexible(input, pattern, placeholders) {
        const params = {};
        
        // Verifica se c'è abbastanza similarità semantica
        const inputWords = this.normalizeText(input).split(' ');
        const patternWords = this.normalizeText(pattern).split(' ').filter(w => !w.includes('{'));
        
        const commonWords = inputWords.filter(word => 
            patternWords.some(pWord => pWord.includes(word) || word.includes(pWord))
        );
        
        // Se ci sono abbastanza parole comuni (almeno 60% del pattern)
        if (commonWords.length >= Math.ceil(patternWords.length * 0.6)) {
            // Crea pattern flessibile sostituendo parole variabili con wildcards
            let flexiblePattern = pattern;
            
            // Identifica parole che potrebbero variare (verbi, sostantivi specifici)
            const variableWords = ['fatturato', 'venduto', 'guadagno', 'ricavo', 'incasso'];
            
            for (const varWord of variableWords) {
                flexiblePattern = flexiblePattern.replace(new RegExp(`\\b${varWord}\\b`, 'gi'), '\\w+');
            }
            
            // Sostituisci placeholder con gruppi cattura
            let regexPattern = flexiblePattern;
            regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            for (const placeholder of placeholders) {
                regexPattern = regexPattern.replace(`\\{${placeholder}\\}`, '([\\w\\s]+?)');
            }
            
            // Rendi l'ultimo gruppo non-greedy se alla fine
            regexPattern = regexPattern.replace(/\(\[\\w\\s\]\+\?\)$/, '([\\w\\s]+)');
            
            const regex = new RegExp(regexPattern, 'i');
            const result = regex.exec(input);
            
            if (result) {
                for (let i = 0; i < placeholders.length; i++) {
                    if (result[i + 1]) {
                        params[placeholders[i]] = result[i + 1].trim();
                    }
                }
            }
        }
        
        return params;
    }
    
    /**
     * 🚀 STRATEGIA 3: Estrazione basata su parole chiave
     */
    extractParametersKeywordBased(input, pattern, placeholders) {
        const params = {};
        
        // Per ogni placeholder, cerca pattern specifici nell'input
        for (const placeholder of placeholders) {
            if (placeholder === 'cliente') {
                // Cerca "cliente" + valore dopo
                const clienteMatch = input.match(/\bcliente\s+([a-zA-ZàèìòùÀÈÌÒÙ\s]+?)(?:\s*$|\s+(?:di|del|per|con|[.?!]))/i);
                if (clienteMatch && clienteMatch[1]) {
                    params.cliente = clienteMatch[1].trim();
                    continue;
                }
                
                // Cerca pattern alternativi "di {cliente}"
                const diClienteMatch = input.match(/\bdi\s+([a-zA-ZàèìòùÀÈÌÒÙ\s]+?)(?:\s*$|\s*[.?!])/i);
                if (diClienteMatch && diClienteMatch[1]) {
                    params.cliente = diClienteMatch[1].trim();
                    continue;
                }
            }
            
            if (placeholder === 'prodotto') {
                // Cerca "prodotto" + valore dopo
                const prodottoMatch = input.match(/\bprodotto\s+([a-zA-ZàèìòùÀÈÌÒÙ\s]+?)(?:\s*$|\s+(?:di|del|per|con|[.?!]))/i);
                if (prodottoMatch && prodottoMatch[1]) {
                    params.prodotto = prodottoMatch[1].trim();
                }
            }
            
            if (placeholder === 'data') {
                // Cerca pattern data
                const dataMatch = input.match(/\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{1,2}\s+\w+\s+\d{2,4})/i);
                if (dataMatch && dataMatch[1]) {
                    params.data = dataMatch[1].trim();
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
     * Statistiche del vocabolario (aggiornate per pipeline)
     */
    getStats() {
        return {
            userCommands: this.userVocabulary.length,
            systemCommands: this.systemVocabulary.length,
            totalCommands: this.userVocabulary.length + this.systemVocabulary.length,
            cacheSize: this.cache.size,
            lastModified: this.lastModified,
            settings: this.settings,
            pipeline: 'user → system → ai',
            version: this.vocabulary?.version || 'pipeline-enhanced'
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
     * 🚀 NUOVO APPROCCIO: Crea un comando individuale per ogni pattern
     */
    parseTxtVocabulary(txtContent) {
        const commands = [];
        const lines = txtContent.split('\n');
        let currentCategory = null;
        let patternIndex = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Ignora linee vuote e commenti
            if (!trimmed || trimmed.startsWith('#')) {
                if (trimmed.includes('CATEGORIA:')) {
                    currentCategory = trimmed.replace(/# CATEGORIA:\s*/, '');
                }
                continue;
            }

            // 🚀 CREA UN COMANDO INDIVIDUALE PER OGNI PATTERN
            patternIndex++;
            const commandId = `txt_${currentCategory?.toLowerCase().replace(/\s+/g, '_')}_${patternIndex}`;
            
            // Determina l'azione basata sulla categoria e contenuto
            let action = 'genericAction';
            let executeLocal = false;
            
            if (currentCategory === 'Gestione Clienti') {
                if (trimmed.toLowerCase().includes('quanti') || trimmed.toLowerCase().includes('numero')) {
                    action = 'countClients';
                    executeLocal = true;
                } else {
                    action = 'getClientInfo';
                }
            } else if (currentCategory === 'Fatturato e Ordini') {
                // Controlla query specifiche per prodotti
                const isProductQuery = trimmed.toLowerCase().includes('prodotti') || 
                                     trimmed.toLowerCase().includes('composto') ||
                                     trimmed.toLowerCase().includes('cosa ha ordinato') ||
                                     trimmed.toLowerCase().includes('composizione') ||
                                     trimmed.toLowerCase().includes('dettaglio prodotti');
                
                // Controlla query per date di consegna
                const isDeliveryQuery = trimmed.toLowerCase().includes('consegna') ||
                                      trimmed.toLowerCase().includes('consegnato') ||
                                      trimmed.toLowerCase().includes('pdf');
                
                if (trimmed.toLowerCase().includes('quanti') || trimmed.toLowerCase().includes('numero')) {
                    action = 'countOrders';
                    executeLocal = true;
                } else if (trimmed.toLowerCase().includes('fatturato')) {
                    action = 'calculateRevenue';
                } else if (isProductQuery) {
                    action = 'getOrderProducts';
                } else if (isDeliveryQuery) {
                    action = 'getDeliveryDate';
                } else {
                    action = 'listOrders';
                }
            } else if (currentCategory === 'Data e Ora') {
                // Controlla se è una query per date storiche o future
                const isHistoricalQuery = trimmed.toLowerCase().includes('giorni fa') || 
                                        trimmed.toLowerCase().includes('era') ||
                                        trimmed.toLowerCase().includes('c\'era');
                const isFutureQuery = trimmed.toLowerCase().includes('tra') ||
                                     trimmed.toLowerCase().includes('sarà') ||
                                     trimmed.toLowerCase().includes('over');
                
                if (isHistoricalQuery) {
                    action = 'getHistoricalDate';
                } else if (isFutureQuery) {
                    action = 'getFutureDate';
                } else {
                    // Controlla se richiede sia data che ora
                    const hasTimeWords = trimmed.toLowerCase().includes('ore') || 
                                       trimmed.toLowerCase().includes('ora') ||
                                       trimmed.toLowerCase().includes('orario');
                    const hasDateWords = trimmed.toLowerCase().includes('data') ||
                                       trimmed.toLowerCase().includes('siamo');
                    const hasDayWords = trimmed.toLowerCase().includes('giorno') ||
                                      trimmed.toLowerCase().includes('oggi è');
                    
                    if (hasTimeWords && (hasDateWords || hasDayWords)) {
                        action = 'getDateTimeInfo'; // Comando combinato
                    } else if (hasTimeWords) {
                        action = 'getTimeInfo';
                    } else if (hasDateWords) {
                        action = 'getDateInfo'; // Data completa (28 luglio 2025)
                    } else if (hasDayWords) {
                        action = 'getDayOfWeek'; // Solo giorno settimana (lunedì)
                    } else {
                        action = 'getDateInfo'; // Default per altri casi
                    }
                }
            } else if (currentCategory === 'Percorsi e Spostamenti') {
                action = 'getRouteInfo';
            }

            console.log(`📚 ✅ Creato comando individuale: ${commandId} per pattern: "${trimmed}"`);
            
            commands.push({
                id: commandId,
                patterns: [trimmed], // UN SOLO PATTERN per comando
                action: action,
                params: this.extractParametersFromPattern(trimmed),
                description: `Comando da categoria ${currentCategory}`,
                source: "txt",
                category: currentCategory,
                executeLocal: executeLocal
            });
        }

        console.log(`📚 🎯 TOTALE COMANDI CREATI DAL .TXT: ${commands.length}`);
        return commands;
    }

    /**
     * Estrae parametri da un pattern .txt (formato [PARAMETRO])
     */
    extractParametersFromPattern(pattern) {
        const params = {};
        const matches = pattern.match(/\[([^\]]+)\]/g);
        
        if (matches) {
            matches.forEach(match => {
                const paramName = match.replace(/[\[\]]/g, '').toLowerCase();
                params[paramName] = `{${paramName}}`;
            });
        }
        
        return params;
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
                
                case 'listClients':
                    return await this.executeLocalListClients(supabaseAI);
                
                case 'countOrders':
                    return await this.executeLocalCountOrders(supabaseAI);
                
                case 'countTotalOrders':
                    // DEBUG: New action for total orders counting
                    return await this.executeLocalCountTotalOrders(supabaseAI);
                
                case 'calculateRevenue':
                    return await this.executeLocalCalculateRevenue(supabaseAI, userInput);
                
                case 'calculateMonthlyRevenue':
                    return await this.executeLocalCalculateMonthlyRevenue(supabaseAI);
                
                case 'calculateAnnualRevenue':
                    return await this.executeLocalCalculateAnnualRevenue(supabaseAI);
                
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
     * Esegue il comando per listare i clienti localmente
     */
    async executeLocalListClients(supabaseAI) {
        try {
            const allData = await supabaseAI.getAllData();
            const clientsArray = allData.clients || [];
            
            if (clientsArray.length === 0) {
                return {
                    success: true,
                    response: "Non ci sono clienti nel database.",
                    data: { count: 0, type: 'lista_clienti', source: 'local-execution' }
                };
            }
            
            // Crea la lista formattata
            const clientsList = clientsArray
                .sort((a, b) => a.name.localeCompare(b.name))
                .slice(0, 50) // Limita a 50 per non sovraccaricare
                .map(client => `• ${client.name}${client.city ? ` (${client.city})` : ''}`)
                .join('\n');
            
            const totalCount = clientsArray.length;
            const response = totalCount > 50 
                ? `Ecco i primi 50 clienti su ${totalCount} totali:\n\n${clientsList}\n\n(Mostrando solo i primi 50)`
                : `Ecco tutti i ${totalCount} clienti:\n\n${clientsList}`;
            
            console.log('🏠 ✅ Lista locale clienti:', totalCount, 'clienti');
            
            return {
                success: true,
                response: response,
                data: { 
                    count: totalCount, 
                    type: 'lista_clienti', 
                    source: 'local-execution',
                    clients: clientsArray.slice(0, 50)
                }
            };
            
        } catch (error) {
            throw new Error(`Errore lista locale clienti: ${error.message}`);
        }
    }

    /**
     * 🚀 OTTIMIZZATO: Conta ordini con connessione database robusta
     */
    async executeLocalCountOrders(supabaseAI) {
        try {
            console.log('📊 Avvio conteggio ordini UNICI ottimizzato...');
            
            // Usa la funzione di conteggio ordini UNICI (11 invece di 102)
            const count = await supabaseAI.countOrdersFromDb();
            
            if (count > 0) {
                console.log(`✅ CONTEGGIO ORDINI UNICI RIUSCITO: ${count} ordini`);
                return {
                    success: true,
                    response: `Nel database ci sono **${count} ordini** (fonte: database)`,
                    data: { count: count, type: 'ordini', source: 'database-unique-count' }
                };
            } else {
                throw new Error('Conteggio ordini unici fallito - risultato 0');
            }
            
        } catch (error) {
            console.error('❌ Errore conteggio ordini ottimizzato:', error);
            
            // Fallback di emergenza ai dati getAllData
            console.log('🔄 Tentativo fallback di emergenza...');
            try {
                const allData = await supabaseAI.getAllData();
                let count = allData.orders ? allData.orders.length : 0;
                
                // Fallback ai dati historical se orders è vuoto
                if (count === 0 && allData.historical) {
                    count = allData.historical.length;
                    console.log('🏠 📊 Usando dati historical per conteggio:', count);
                }
                
                console.log('🏠 ⚠️ Conteggio di emergenza:', count);
                
                return {
                    success: true,
                    response: `Nel database ci sono circa ${count} ordini (conteggio di emergenza)`,
                    data: { count, type: 'ordini', source: 'emergency-fallback' }
                };
            } catch (fallbackError) {
                throw new Error(`Errore conteggio ordini: ${error.message} | Fallback: ${fallbackError.message}`);
            }
        }
    }

    /**
     * 🚀 OTTIMIZZATO: Conta TUTTI gli ordini nel database con connessione robusta
     */
    async executeLocalCountTotalOrders(supabaseAI) {
        try {
            console.log('📊 Avvio conteggio ordini totali ottimizzato...');
            
            // Usa la nuova funzione di conteggio ottimizzata
            const result = await supabaseAI.countOrdersFromDatabase();
            
            if (result.success) {
                console.log(`✅ CONTEGGIO TOTALE DATABASE RIUSCITO: ${result.count} ordini`);
                return {
                    success: true,
                    response: `📦 Nel database ci sono **${result.count} ordini totali** (fonte: database).`,
                    data: { count: result.count, type: 'ordini_totali', source: 'database-optimized' }
                };
            } else if (result.warning) {
                console.warn(`⚠️ FALLBACK TOTALI ATTIVATO: ${result.warning}`);
                return {
                    success: true,
                    response: `📦 Nel database ci sono **${result.count} ordini totali** (fonte: dati locali).`,
                    data: { count: result.count, type: 'ordini_totali', source: 'fallback-local', warning: result.warning }
                };
            } else {
                throw new Error(result.error || 'Conteggio totale fallito');
            }
            
        } catch (error) {
            console.error('❌ Errore conteggio ordini totali ottimizzato:', error);
            
            // Fallback di emergenza ai dati getAllData
            console.log('🔄 Tentativo fallback di emergenza per totali...');
            try {
                const allData = await supabaseAI.getAllData();
                let count = allData.orders ? allData.orders.length : 0;
                
                // Fallback ai dati historical se orders è vuoto
                if (count === 0 && allData.historical) {
                    count = allData.historical.length;
                    console.log('🏠 📊 Usando dati historical per conteggio totale:', count);
                }
                
                console.log('🏠 ⚠️ Conteggio totale di emergenza:', count);
                
                return {
                    success: true,
                    response: `📦 Nel database ci sono circa **${count} ordini totali** (conteggio di emergenza).`,
                    data: { count, type: 'ordini_totali', source: 'emergency-fallback' }
                };
            } catch (fallbackError) {
                throw new Error(`Errore conteggio ordini totali: ${error.message} | Fallback: ${fallbackError.message}`);
            }
        }
    }

    /**
     * 🚀 NUOVO: Rilevamento query simili per suggerimenti vocabolario
     * Rileva se la query dell'utente è simile ai comandi esistenti
     */
    detectSimilarQueries(userQuery) {
        try {
            const query = userQuery.toLowerCase().trim();
            const suggestions = [];

            // Parole chiave che indicano query sui dati locali
            const localDataKeywords = [
                'clienti', 'ordini', 'database', 'supabase', 'tabella', 
                'quanti', 'numero', 'totale', 'count', 'lista', 'elenco'
            ];

            // Controlla se la query contiene parole chiave locali
            const hasLocalKeywords = localDataKeywords.some(keyword => 
                query.includes(keyword)
            );

            if (!hasLocalKeywords) {
                return null; // Non è una query sui dati locali
            }

            // Pattern comuni che suggeriscono query sui dati dell'app
            const commonPatterns = [
                {
                    keywords: ['client', 'database'],
                    suggestion: 'quanti clienti ci sono nel database',
                    category: 'Gestione Clienti'
                },
                {
                    keywords: ['ordin', 'database'],
                    suggestion: 'quanti ordini ci sono nel database', 
                    category: 'Fatturato e Ordini'
                },
                {
                    keywords: ['client', 'totale'],
                    suggestion: 'totale clienti database',
                    category: 'Gestione Clienti'
                },
                {
                    keywords: ['client', 'numero'],
                    suggestion: 'numero clienti nel database',
                    category: 'Gestione Clienti'
                },
                {
                    keywords: ['client', 'supabase'],
                    suggestion: 'quanti clienti abbiamo nella tabella clienti su supabase',
                    category: 'Gestione Clienti'
                }
            ];

            // Trova pattern che corrispondono alla query
            for (const pattern of commonPatterns) {
                const matches = pattern.keywords.every(keyword => 
                    query.includes(keyword)
                );
                
                if (matches) {
                    suggestions.push({
                        suggestion: pattern.suggestion,
                        category: pattern.category,
                        confidence: 'high'
                    });
                }
            }

            return suggestions.length > 0 ? {
                hasLocalKeywords: true,
                suggestions: suggestions,
                userQuery: userQuery
            } : null;

        } catch (error) {
            console.error('❌ Errore rilevamento query simili:', error);
            return null;
        }
    }

    /**
     * Genera messaggio educativo per l'utente
     */
    generateEducationalMessage(userQuery, similarQueries) {
        if (!similarQueries || !similarQueries.suggestions.length) {
            return null;
        }

        const suggestions = similarQueries.suggestions;
        let message = `🎯 **Query sui dati locali rilevata!**\n\n`;
        message += `La tua query "${userQuery}" sembra riguardare i dati dell'app, ma non è presente nel vocabolario dei comandi.\n\n`;
        
        message += `💡 **Suggerimenti per ottenere una risposta precisa:**\n`;
        suggestions.forEach((suggestion, index) => {
            message += `${index + 1}. Aggiungi alla categoria "${suggestion.category}":\n`;
            message += `   📝 "${suggestion.suggestion}"\n\n`;
        });

        message += `🔧 **Come procedere:**\n`;
        message += `1. Vai alla scheda **Comandi**\n`;
        message += `2. Aggiungi uno dei pattern suggeriti\n`;
        message += `3. Rilancia la stessa query per ottenere dati precisi da Supabase\n\n`;
        message += `⚡ **Vantaggio:** I comandi nel vocabolario vengono eseguiti localmente (velocissimi e gratuiti!)`;

        return message;
    }
    
    /**
     * 🎯 CARICA VOCABOLARIO UTENTE (formato nuovo: array di oggetti)
     */
    async loadUserVocabulary() {
        try {
            // Prima prova formato nuovo (array di comandi)
            const newFormat = localStorage.getItem('user_vocabulary_v2');
            if (newFormat) {
                this.userVocabulary = JSON.parse(newFormat);
                
                // 🔧 AUTO-FIX: Controlla se alcuni comandi necessitano riparazione
                const needsFix = this.userVocabulary.some(cmd => 
                    !cmd.action || (typeof cmd.action === 'string' && !cmd.params)
                );
                
                if (needsFix) {
                    console.debug('[VOCAB-USER] Auto-fix necessario per formato v2');
                    this.userVocabulary = this.autoFixUserCommands(this.userVocabulary);
                    localStorage.setItem('user_vocabulary_v2', JSON.stringify(this.userVocabulary));
                }
                
                console.debug('[VOCAB-USER] Formato v2 caricato:', this.userVocabulary.length);
                return;
            }
            
            // Fallback 1: formato categorizzato (user-vocabulary)
            const categorizedFormat = localStorage.getItem('user-vocabulary');
            if (categorizedFormat) {
                console.debug('[VOCAB-USER] Formato categorizzato rilevato');
                const categories = JSON.parse(categorizedFormat);
                let allCommands = [];
                
                // Estrai comandi da tutte le categorie
                Object.entries(categories).forEach(([categoryName, commands]) => {
                    if (Array.isArray(commands)) {
                        commands.forEach(cmd => {
                            allCommands.push({
                                pattern: typeof cmd === 'string' ? cmd : cmd.pattern || cmd,
                                action: (typeof cmd === 'object' && cmd.action) ? cmd.action : null,
                                params: (typeof cmd === 'object' && cmd.params) ? cmd.params : {},
                                source: 'user_category',
                                category: categoryName
                            });
                        });
                    }
                });
                
                // 🔧 AUTO-FIX: Ripara comandi senza action
                this.userVocabulary = this.autoFixUserCommands(allCommands);
                
                // Salva in formato nuovo
                localStorage.setItem('user_vocabulary_v2', JSON.stringify(this.userVocabulary));
                console.debug('[VOCAB-USER] Convertito da formato categorizzato:', this.userVocabulary.length);
                return;
            }
            
            // Fallback 2: converti formato vecchio (vocabulary_user)
            const userVocText = localStorage.getItem('vocabulary_user');
            if (!userVocText) {
                console.debug('[VOCAB-USER] Nessun vocabolario utente');
                this.userVocabulary = [];
                return;
            }
            
            console.debug('[VOCAB-USER] Conversione da formato vecchio...');
            const parsedCommands = this.parseUserVocabulary(userVocText);
            
            // 🔧 AUTO-FIX: Ripara comandi senza action
            const fixedCommands = this.autoFixUserCommands(parsedCommands);
            
            // Converti in formato nuovo
            this.userVocabulary = fixedCommands.map(cmd => ({
                title: cmd.description || cmd.id,
                pattern: cmd.patterns[0], // Prendi primo pattern
                action: cmd.action,
                params: cmd.params,
                source: 'user',
                autoFixed: cmd.autoFixed || false
            }));
            
            // Salva in formato nuovo
            localStorage.setItem('user_vocabulary_v2', JSON.stringify(this.userVocabulary));
            console.debug('[VOCAB-USER] Convertito e salvato:', this.userVocabulary.length);
            
        } catch (error) {
            console.error('[VOCAB-USER] Errore caricamento:', error);
            this.userVocabulary = [];
        }
    }
    
    /**
     * 🔧 AUTO-FIX: Aggiunge azioni mancanti ai comandi utente
     */
    autoFixUserCommands(commands) {
        console.log('🔧 AUTO-FIX: Riparazione comandi utente...');
        
        // Mappa pattern → azione per comandi comuni
        const actionMapping = {
            // CLIENTI
            'quali clienti abbiamo': { action: 'universal_query', params: { entity: 'clients', operation: 'list' }},
            'numero clienti nel database': { action: 'universal_query', params: { entity: 'clients', operation: 'count' }},
            'quanti clienti ci sono nel database': { action: 'universal_query', params: { entity: 'clients', operation: 'count' }},
            'quanti clienti ho': { action: 'universal_query', params: { entity: 'clients', operation: 'count' }},
            'lista clienti': { action: 'universal_query', params: { entity: 'clients', operation: 'list' }},
            'elenco clienti': { action: 'universal_query', params: { entity: 'clients', operation: 'list' }},
            
            // ORDINI
            'quanti ordini ci sono nel database': { action: 'universal_query', params: { entity: 'orders', operation: 'count' }},
            'numero ordini': { action: 'universal_query', params: { entity: 'orders', operation: 'count' }},
            'lista ordini': { action: 'universal_query', params: { entity: 'orders', operation: 'list' }},
            'elenco ordini': { action: 'universal_query', params: { entity: 'orders', operation: 'list' }},
            
            // FATTURATO
            'fatturato totale': { action: 'universal_query', params: { entity: 'orders', operation: 'sum', field: 'importo' }},
            'fatturato del mese': { action: 'calculateMonthlyRevenue', params: {} },
            'fatturato totale del mese': { action: 'calculateMonthlyRevenue', params: {} },
            'fatturato dell\'anno': { action: 'calculateAnnualRevenue', params: {} },
            'fatturato totale dell\'anno': { action: 'calculateAnnualRevenue', params: {} },
            'dimmi il fatturato del cliente': { action: 'calculateRevenue', params: {} },
            'fatturato del cliente': { action: 'calculateRevenue', params: {} },
        };
        
        let fixedCount = 0;
        commands.forEach(cmd => {
            const pattern = typeof cmd === 'string' ? cmd : cmd.pattern;
            const normalizedPattern = pattern?.toLowerCase().trim();
            
            // Se il comando non ha action, cerca match diretto o pattern parametrizzato
            if (normalizedPattern && (!cmd.action || typeof cmd === 'string')) {
                let mapping = null;
                
                // 1. Cerca match esatto
                if (actionMapping[normalizedPattern]) {
                    mapping = actionMapping[normalizedPattern];
                }
                
                // 2. Cerca pattern parametrizzati
                if (!mapping) {
                    // Pattern fatturato cliente con parametri
                    if (normalizedPattern.includes('fatturato') && normalizedPattern.includes('cliente')) {
                        mapping = { action: 'calculateRevenue', params: {} };
                    }
                    // Pattern fatturato annuale
                    else if (normalizedPattern.includes('fatturato') && normalizedPattern.includes('anno')) {
                        mapping = { action: 'calculateAnnualRevenue', params: {} };
                    }
                    // Pattern fatturato mensile
                    else if (normalizedPattern.includes('fatturato') && normalizedPattern.includes('mese')) {
                        mapping = { action: 'calculateMonthlyRevenue', params: {} };
                    }
                    // Pattern conteggio ordini
                    else if ((normalizedPattern.includes('quanti') || normalizedPattern.includes('numero')) && normalizedPattern.includes('ordini')) {
                        mapping = { action: 'countTotalOrders', params: {} };
                    }
                }
                
                // 3. Applica mapping se trovato
                if (mapping) {
                    if (typeof cmd === 'string') {
                        // Converti da stringa a oggetto
                        const index = commands.indexOf(cmd);
                        commands[index] = {
                            pattern: cmd,
                            action: mapping.action,
                            params: mapping.params,
                            source: 'user_fixed',
                            autoFixed: true,
                            executeLocal: true  // Marca per esecuzione locale
                        };
                    } else {
                        // Aggiungi action a oggetto esistente
                        cmd.action = mapping.action;
                        cmd.params = mapping.params;
                        cmd.autoFixed = true;
                        cmd.executeLocal = true;
                    }
                    
                    fixedCount++;
                    console.log(`🔧 ✅ Action aggiunta per: "${pattern}" → ${mapping.action}`);
                }
            }
        });
        
        console.log(`🔧 📊 AUTO-FIX completato: ${fixedCount} comandi riparati`);
        return commands;
    }

    /**
     * 🔧 MIDDLEWARE HEALTH CHECK: Verifica e ripara stato middleware
     */
    checkMiddlewareHealth() {
        console.log('🔧 🏥 MIDDLEWARE HEALTH CHECK...');
        
        const components = {
            supabase: !!window.supabaseAI,
            vocabularyManager: !!window.vocabularyManager,
            aiMiddleware: !!window.aiMiddleware,
            aiMiddlewareClass: !!window.AIMiddleware,
            robustConnection: !!window.robustConnectionManager
        };
        
        console.log('🔧 📊 Componenti disponibili:', components);
        
        // Fix middleware se disponibile ma non istanziato
        if (components.aiMiddlewareClass && !components.aiMiddleware) {
            console.log('🔧 🔄 Ricreazione istanza aiMiddleware...');
            try {
                window.aiMiddleware = new window.AIMiddleware();
                console.log('🔧 ✅ aiMiddleware ricreato');
            } catch (error) {
                console.error('🔧 ❌ Errore ricreazione aiMiddleware:', error);
            }
        }
        
        // Verifica metodi critici
        if (window.aiMiddleware) {
            const criticalMethods = ['executeLocalAction', 'handleUniversalQuery', 'getAllDataSafely'];
            const missingMethods = criticalMethods.filter(method => 
                typeof window.aiMiddleware[method] !== 'function'
            );
            
            if (missingMethods.length > 0) {
                console.warn('🔧 ⚠️ Metodi mancanti in aiMiddleware:', missingMethods);
            } else {
                console.log('🔧 ✅ Tutti i metodi critici disponibili');
            }
        }
        
        return components;
    }

    /**
     * DEBUG: Parse user vocabulary text into commands
     */
    parseUserVocabulary(txtContent) {
        const commands = [];
        const lines = txtContent.split('\n');
        let currentCategory = null;
        let commandIndex = 0;
        
        // PATCH: Auto-inject total orders command if missing
        const hasTotalOrdersCommand = txtContent.toLowerCase().includes('quanti ordini ci sono nel database');
        if (!hasTotalOrdersCommand) {
            console.debug('[VOCAB-PATCH] Auto-injecting user_total_orders command');
            commands.push({
                id: 'user_total_orders',
                patterns: ['quanti ordini ci sono nel database'],
                action: 'countTotalOrders',
                params: {},
                description: 'Conteggio totale ordini nel database',
                source: "user",
                category: "Sistema e Database",
                executeLocal: true
            });
        }
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (!trimmed || trimmed.startsWith('#')) {
                if (trimmed.includes('CATEGORIA:')) {
                    currentCategory = trimmed.replace(/# CATEGORIA:\s*/, '');
                }
                continue;
            }
            
            commandIndex++;
            const commandId = `user_${currentCategory?.toLowerCase().replace(/\s+/g, '_')}_${commandIndex}`;
            
            let action = 'genericAction';
            let executeLocal = false;
            
            // Determine action based on category and content
            if (currentCategory === 'Gestione Clienti') {
                if (trimmed.toLowerCase().includes('quanti') || trimmed.toLowerCase().includes('numero')) {
                    action = 'countClients';
                    executeLocal = true;
                }
            } else if (currentCategory === 'Fatturato e Ordini') {
                if (trimmed.toLowerCase().includes('quanti') || trimmed.toLowerCase().includes('numero')) {
                    action = 'countOrders';
                    executeLocal = true;
                }
            } else if (currentCategory === 'Sistema e Database') {
                // DEBUG: New action for total orders counting
                if (trimmed.toLowerCase().includes('ordini') && 
                   (trimmed.toLowerCase().includes('quanti') || 
                    trimmed.toLowerCase().includes('totale') || 
                    trimmed.toLowerCase().includes('count'))) {
                    action = 'countTotalOrders';
                    executeLocal = true;
                }
            }
            
            commands.push({
                id: commandId,
                patterns: [trimmed],
                action: action,
                params: {},
                description: `Comando utente da categoria ${currentCategory}`,
                source: "user",
                category: currentCategory,
                executeLocal: executeLocal
            });
        }
        
        console.debug('[VOCAB-USER] Parsed', commands.length, 'commands from user vocabulary');
        return commands;
    }

    /**
     * 🤔 RILEVA RICHIESTE INTERNE che potrebbero essere aggiunte al vocabolario
     */
    looksLikeInternalRequest(query) {
        const internalKeywords = [
            // Dati e database
            'clienti', 'ordini', 'prodotti', 'fatturato', 'vendite',
            'database', 'tabella', 'supabase', 'dati', 'storico',
            
            // Operazioni conteggio/query
            'quanti', 'quanto', 'conta', 'numero', 'totale', 'count',
            'lista', 'elenco', 'mostra', 'visualizza', 'elenca',
            'cerca', 'trova', 'filtra', 'controlla',
            
            // Gestione aziendale
            'appuntamento', 'appuntamenti', 'agenda', 'calendario',
            'percorso', 'percorsi', 'viaggio', 'spostamento', 'distanza',
            'backup', 'esporta', 'importa', 'sincronizza',
            
            // Analisi business
            'report', 'analisi', 'confronta', 'statistica', 'performance'
        ];

        const queryLower = query.toLowerCase();
        const hasKeywords = internalKeywords.some(keyword => queryLower.includes(keyword));
        
        // Pattern aggiuntivi per richieste strutturate
        const structuredPatterns = [
            /quanti .+ (ci sono|abbiamo|nel)/i,
            /(mostra|visualizza|elenca) .+ (di|del|per)/i,
            /(qual è|dimmi) .+ (di|del|per)/i
        ];
        
        const hasStructure = structuredPatterns.some(pattern => pattern.test(query));
        
        if (this.settings.enableDebug && (hasKeywords || hasStructure)) {
            console.log('🤔 Query interna rilevata:', { hasKeywords, hasStructure, query });
        }
        
        return hasKeywords || hasStructure;
    }

    /**
     * 📝 PROMPT per aggiungere pattern al vocabolario utente
     */
    async promptAddToUserVocab(userInput) {
        return new Promise((resolve) => {
            // Crea dialog modale
            const dialog = document.createElement('div');
            dialog.className = 'vocab-dialog-overlay';
            dialog.innerHTML = `
                <div class="vocab-dialog">
                    <h3>🎯 Aggiungi al vocabolario personale</h3>
                    <p>Questa query sembra richiedere dati interni. Vuoi aggiungerla al tuo vocabolario per risposte più veloci?</p>
                    
                    <label>Pattern (puoi modificarlo):</label>
                    <input type="text" id="vocab-pattern" value="${userInput}" />
                    
                    <label>Titolo comando:</label>
                    <input type="text" id="vocab-title" placeholder="es. Conteggio clienti totali" />
                    
                    <label>Azione:</label>
                    <select id="vocab-action">
                        <option value="countClients">Conta clienti</option>
                        <option value="countOrders">Conta ordini</option>
                        <option value="countTotalOrders">Conta ordini totali</option>
                        <option value="listClients">Lista clienti</option>
                        <option value="listOrders">Lista ordini</option>
                        <option value="getCurrentDate">Data attuale</option>
                        <option value="getCurrentTime">Ora attuale</option>
                        <option value="customAction">Azione personalizzata</option>
                    </select>
                    
                    <div class="vocab-buttons">
                        <button id="vocab-save" class="btn-primary">💾 Salva</button>
                        <button id="vocab-cancel" class="btn-secondary">❌ Annulla</button>
                        <button id="vocab-ai" class="btn-info">🤖 Usa AI</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            // Event handlers
            document.getElementById('vocab-save').onclick = async () => {
                const pattern = document.getElementById('vocab-pattern').value.trim();
                const title = document.getElementById('vocab-title').value.trim() || pattern;
                const action = document.getElementById('vocab-action').value;

                if (pattern) {
                    await this.addToUserVocabulary({ title, pattern, action });
                    document.body.removeChild(dialog);
                    resolve({ 
                        type: 'vocab_added', 
                        message: `✅ Pattern "${title}" aggiunto al vocabolario personale`,
                        source: 'vocabulary_manager'
                    });
                }
            };

            document.getElementById('vocab-cancel').onclick = () => {
                document.body.removeChild(dialog);
                resolve({ 
                    type: 'cancelled', 
                    message: '❌ Operazione annullata',
                    source: 'vocabulary_manager'
                });
            };

            document.getElementById('vocab-ai').onclick = () => {
                document.body.removeChild(dialog);
                resolve({
                    type: 'fallback_ai',
                    message: '🤖 Inoltro ad AI...',
                    originalQuery: userInput,
                    source: 'vocabulary_manager'
                });
            };
        });
    }

    /**
     * 💾 SALVA nel vocabolario utente
     */
    async addToUserVocabulary(command) {
        // Aggiungi in testa per priorità massima
        this.userVocabulary.unshift({
            title: command.title,
            pattern: command.pattern,
            action: command.action,
            source: 'user',
            dateAdded: new Date().toISOString()
        });

        try {
            // Salva formato nuovo
            localStorage.setItem('user_vocabulary_v2', JSON.stringify(this.userVocabulary));
            console.log('✅ Salvato in localStorage:', command.title);
            
            // TODO: Implementare salvataggio Supabase se disponibile
            if (window.supabaseClient) {
                console.log('💾 TODO: Implementare sync Supabase');
            }
            
        } catch (error) {
            console.error('❌ Errore salvataggio:', error);
        }
    }

    /**
     * 🎯 PIPELINE PRINCIPALE: Entry point per nuova pipeline
     */
    async processQuery(userInput) {
        try {
            console.log('🎯 Pipeline avviata per:', userInput);
            
            // Carica entrambi i vocabolari
            await this.loadVocabulary();
            
            // 🥇 STEP 1: PRIORITÀ ASSOLUTA - Vocabolario UTENTE
            if (this.userVocabulary.length > 0) {
                const userMatch = this.findCommandInArray(userInput, this.userVocabulary);
                if (userMatch) {
                    console.log('🎯 USER MATCH:', userMatch.title);
                    return await this.executeCommand(userMatch, userInput, 'USER');
                }
            }
            
            // 🥈 STEP 2: Vocabolario SISTEMA
            const systemMatch = await this.findMatch(userInput);
            if (systemMatch) {
                console.log('⚙️ SYSTEM MATCH:', systemMatch.command.id);
                return await this.executeSystemCommand(systemMatch, userInput);
            }
            
            // 🥉 STEP 3: Nessun match - Controlla se è richiesta interna
            if (this.looksLikeInternalRequest(userInput)) {
                console.log('🤔 Richiesta interna rilevata');
                return await this.promptAddToUserVocab(userInput);
            }
            
            // 🤖 STEP 4: Fallback AI
            console.log('🤖 Nessun match - fallback AI');
            return {
                type: 'fallback_ai',
                message: '🤖 Elaborazione con AI...',
                originalQuery: userInput,
                source: 'vocabulary_pipeline'
            };
            
        } catch (error) {
            console.error('❌ Errore pipeline:', error);
            return {
                type: 'error',
                message: `❌ Errore pipeline: ${error.message}`,
                source: 'vocabulary_pipeline'
            };
        }
    }
    
    /**
     * Cerca comando nel formato nuovo
     */
    findCommandInArray(query, commandArray) {
        const normalizedQuery = this.normalizeText(query);
        let bestMatch = null;
        let bestScore = 0;
        
        for (const cmd of commandArray) {
            const score = this.calculateSimilarity(normalizedQuery, cmd.pattern);
            if (score >= this.settings.similarityThreshold && score > bestScore) {
                bestMatch = cmd;
                bestScore = score;
                if (score === 1.0) break;
            }
        }
        
        return bestMatch;
    }
    
    /**
     * Esegui comando utente
     */
    async executeCommand(command, userInput, source) {
        try {
            console.log(`🚀 [${source}] Executing:`, command.action);
            
            switch (command.action) {
                case 'countClients':
                    const data = await this.getDataSafely();
                    const count = data.clients?.length || 0;
                    return {
                        type: 'local_execution',
                        message: `👥 Ci sono ${count} clienti nel database`,
                        source: `${source.toLowerCase()}_vocab`
                    };
                    
                case 'listClients':
                    const clientData = await this.getDataSafely();
                    const clientsArray = clientData.clients || [];
                    
                    if (clientsArray.length === 0) {
                        return {
                            type: 'local_execution',
                            message: "Non ci sono clienti nel database.",
                            source: `${source.toLowerCase()}_vocab`
                        };
                    }
                    
                    const clientsList = clientsArray
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .slice(0, 50)
                        .map(client => `• ${client.name}${client.city ? ` (${client.city})` : ''}`)
                        .join('\n');
                    
                    const totalCount = clientsArray.length;
                    const listMessage = totalCount > 50 
                        ? `Ecco i primi 50 clienti su ${totalCount} totali:\n\n${clientsList}\n\n(Mostrando solo i primi 50)`
                        : `Ecco tutti i ${totalCount} clienti:\n\n${clientsList}`;
                    
                    return {
                        type: 'local_execution',
                        message: listMessage,
                        source: `${source.toLowerCase()}_vocab`
                    };
                    
                case 'countOrders':
                case 'countTotalOrders':
                    const orderData = await this.getDataSafely();
                    const orderCount = orderData.orders?.length || orderData.historicalOrders?.sampleData?.length || 0;
                    return {
                        type: 'local_execution',
                        message: `📦 Ci sono ${orderCount} ordini nel database`,
                        source: `${source.toLowerCase()}_vocab`
                    };
                    
                case 'getCurrentDate':
                    return {
                        type: 'local_execution',
                        message: `📅 Oggi è ${new Date().toLocaleDateString('it-IT')}`,
                        source: `${source.toLowerCase()}_vocab`
                    };
                    
                case 'getCurrentTime':
                    return {
                        type: 'local_execution',
                        message: `🕐 Sono le ${new Date().toLocaleTimeString('it-IT')}`,
                        source: `${source.toLowerCase()}_vocab`
                    };
                    
                default:
                    return {
                        type: 'error',
                        message: `❌ Azione '${command.action}' non implementata`,
                        source: `${source.toLowerCase()}_vocab`
                    };
            }
            
        } catch (error) {
            console.error('❌ Errore esecuzione:', error);
            return {
                type: 'error',
                message: `❌ Errore: ${error.message}`,
                source: `${source.toLowerCase()}_vocab`
            };
        }
    }
    
    /**
     * Esegui comando sistema
     */
    async executeSystemCommand(vocabularyMatch, userInput) {
        try {
            if (window.aiMiddleware?.executeLocalAction) {
                const result = await window.aiMiddleware.executeLocalAction(vocabularyMatch, userInput);
                return {
                    type: 'local_execution',
                    message: result.response || result,
                    source: 'system_vocab_ai'
                };
            }
            
            return {
                type: 'error',
                message: '❌ AI Middleware non disponibile',
                source: 'system_vocab'
            };
            
        } catch (error) {
            console.error('❌ Errore sistema:', error);
            return {
                type: 'error',
                message: `❌ Errore sistema: ${error.message}`,
                source: 'system_vocab'
            };
        }
    }
    
    /**
     * 🏠 LOCALE: Calcola fatturato per cliente specifico
     */
    async executeLocalCalculateRevenue(supabaseAI, userInput) {
        const data = await supabaseAI.getAllData();
        
        // Estrai nome cliente dal comando
        const clienteName = this.extractClientNameFromQuery(userInput);
        if (!clienteName) {
            return {
                success: false,
                response: "Non riesco a identificare il cliente per il calcolo del fatturato.",
                source: 'local-revenue-error'
            };
        }
        
        // Calcola fatturato per il cliente
        const orders = data.historicalOrders?.sampleData || [];
        const clientOrders = orders.filter(order => 
            this.clientNamesMatch(order.cliente, clienteName)
        );
        
        if (clientOrders.length === 0) {
            return {
                success: true,
                response: `Il cliente "${clienteName}" non ha ordini nel database.`,
                source: 'local-revenue'
            };
        }
        
        const totalRevenue = clientOrders.reduce((sum, order) => {
            const importo = parseFloat(order.importo?.toString().replace(/[€.,]/g, '') || 0);
            return sum + importo;
        }, 0);
        
        return {
            success: true,
            response: `Il fatturato del cliente "${clienteName}" è di €${totalRevenue.toLocaleString('it-IT', {minimumFractionDigits: 2})} su ${clientOrders.length} ordini.`,
            source: 'local-revenue'
        };
    }

    /**
     * 🏠 LOCALE: Calcola fatturato mensile
     */
    async executeLocalCalculateMonthlyRevenue(supabaseAI) {
        const data = await supabaseAI.getAllData();
        const orders = data.historicalOrders?.sampleData || [];
        
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        const monthlyOrders = orders.filter(order => {
            const orderDate = new Date(order.data_consegna || order.data);
            return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        });
        
        const totalRevenue = monthlyOrders.reduce((sum, order) => {
            const importo = parseFloat(order.importo?.toString().replace(/[€.,]/g, '') || 0);
            return sum + importo;
        }, 0);
        
        const monthName = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
        
        return {
            success: true,
            response: `Il fatturato di ${monthName} è di €${totalRevenue.toLocaleString('it-IT', {minimumFractionDigits: 2})} su ${monthlyOrders.length} ordini.`,
            source: 'local-revenue'
        };
    }

    /**
     * 🏠 LOCALE: Calcola fatturato annuale
     */
    async executeLocalCalculateAnnualRevenue(supabaseAI) {
        const data = await supabaseAI.getAllData();
        const orders = data.historicalOrders?.sampleData || [];
        
        const currentYear = new Date().getFullYear();
        
        const yearlyOrders = orders.filter(order => {
            const orderDate = new Date(order.data_consegna || order.data);
            return orderDate.getFullYear() === currentYear;
        });
        
        const totalRevenue = yearlyOrders.reduce((sum, order) => {
            const importo = parseFloat(order.importo?.toString().replace(/[€.,]/g, '') || 0);
            return sum + importo;
        }, 0);
        
        return {
            success: true,
            response: `Il fatturato dell'anno ${currentYear} è di €${totalRevenue.toLocaleString('it-IT', {minimumFractionDigits: 2})} su ${yearlyOrders.length} ordini.`,
            source: 'local-revenue'
        };
    }

    /**
     * 🔍 HELPER: Estrai nome cliente dalla query
     */
    extractClientNameFromQuery(query) {
        // Pattern per estrarre il nome del cliente
        const patterns = [
            /fatturato.*?cliente\s+(.+?)$/i,
            /fatturato.*?di\s+(.+?)$/i,
            /cliente\s+(.+?)$/i
        ];
        
        for (const pattern of patterns) {
            const match = query.match(pattern);
            if (match && match[1]) {
                return match[1].trim().toLowerCase();
            }
        }
        
        return null;
    }

    /**
     * 🔍 HELPER: Verifica corrispondenza nomi clienti
     */
    clientNamesMatch(name1, name2) {
        if (!name1 || !name2) return false;
        
        const normalize = (name) => name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        const n1 = normalize(name1);
        const n2 = normalize(name2);
        
        return n1.includes(n2) || n2.includes(n1);
    }

    /**
     * Ottieni dati in modo sicuro
     */
    async getDataSafely() {
        try {
            if (window.supabaseAI?.getAllData) {
                return await window.supabaseAI.getAllData();
            }
        } catch (error) {
            console.warn('⚠️ Data access error:', error);
        }
        return { clients: [], orders: [], historicalOrders: { sampleData: [] } };
    }

    /**
     * 📝 Legge comandi dall'editor scheda Comandi
     * FONTE: localStorage dove l'editor salva i comandi
     */
    getUserCommandsFromEditor() {
        try {
            // L'editor salva i comandi in localStorage
            // Supporta vari formati per compatibilità
            
            // Formato 1: user_vocabulary_v2 (array diretto)
            const v2Data = localStorage.getItem('user_vocabulary_v2');
            if (v2Data) {
                const commands = JSON.parse(v2Data);
                console.log('📝 Editor: Formato v2 trovato con', commands.length, 'comandi');
                return commands;
            }
            
            // Formato 2: user-vocabulary (categorizzato)
            const categorizedData = localStorage.getItem('user-vocabulary');
            if (categorizedData) {
                const categories = JSON.parse(categorizedData);
                const commands = [];
                Object.values(categories).forEach(categoryCommands => {
                    if (Array.isArray(categoryCommands)) {
                        commands.push(...categoryCommands);
                    }
                });
                console.log('📝 Editor: Formato categorizzato trovato con', commands.length, 'comandi');
                return commands;
            }
            
            // Formato 3: vocabulary_user (testo)
            const textData = localStorage.getItem('vocabulary_user');
            if (textData) {
                const commands = this.parseTextVocabulary(textData);
                console.log('📝 Editor: Formato testo trovato con', commands.length, 'comandi');
                return commands;
            }
            
            console.log('📝 Editor: Nessun comando utente trovato');
            return [];
            
        } catch (error) {
            console.error('❌ Errore lettura editor comandi:', error);
            return [];
        }
    }

    /**
     * 📚 Ottiene i comandi di sistema predefiniti
     */
    getSystemPredefinedCommands() {
        try {
            // Ritorna i comandi di sistema già caricati
            if (this.systemVocabulary && this.systemVocabulary.length > 0) {
                return this.systemVocabulary;
            }
            
            // Fallback: vocabolario base
            console.warn('⚠️ Sistema: Usando vocabolario base di fallback');
            return this.getBasicVocabulary().commands || [];
            
        } catch (error) {
            console.error('❌ Errore caricamento comandi sistema:', error);
            return [];
        }
    }

    /**
     * 🔧 Utility per deep clone
     */
    deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.error('❌ Errore deep clone:', error);
            return obj;
        }
    }

    /**
     * 📄 Parse vocabolario da formato testo
     */
    parseTextVocabulary(text) {
        const commands = [];
        const lines = text.split('\n');
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                commands.push({
                    id: `user_text_${index}`,
                    pattern: trimmed,
                    patterns: [trimmed],
                    source: 'user_editor',
                    action: 'genericAction'
                });
            }
        });
        
        return commands;
    }

    /**
     * 🔑 Ottiene signature del vocabolario utente per rilevare modifiche
     */
    getUserVocabularySignature() {
        try {
            // Crea una signature combinata di tutti i possibili storage
            const v2 = localStorage.getItem('user_vocabulary_v2') || '';
            const categorized = localStorage.getItem('user-vocabulary') || '';
            const text = localStorage.getItem('vocabulary_user') || '';
            
            // Combina e crea hash semplice
            const combined = v2 + categorized + text;
            return combined.length + '_' + this.simpleHash(combined);
        } catch (error) {
            return 'error_signature';
        }
    }

    /**
     * #️⃣ Hash semplice per rilevare cambiamenti
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * 🚀 Setup sistema event-driven (OTTIMIZZATO)
     * Sostituisce il polling con eventi diretti dall'editor
     */
    setupEventDrivenSync() {
        console.log('🔧 Setup event-driven sync per vocabolario master-slave...');
        
        // Trova l'editor della scheda Comandi
        const commandsEditor = this.findCommandsEditor();
        
        if (commandsEditor) {
            console.log('✅ Editor comandi trovato:', commandsEditor.tagName, commandsEditor.className);
            
            // Event listener con debounce per input
            commandsEditor.addEventListener('input', this.debounce(() => {
                console.log('🔄 Editor Comandi modificato (EVENT), sincronizzazione in corso...');
                this.performFullSync();
            }, VOCABULARY_CONFIG.DEBOUNCE_DELAY));
            
            // Listener per perdita focus (salvataggio)
            commandsEditor.addEventListener('blur', () => {
                console.log('💾 Editor salvato, sincronizzazione finale...');
                this.performFullSync();
            });
            
            // Listener per Ctrl+S
            commandsEditor.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 's') {
                    console.log('💾 Ctrl+S rilevato, sincronizzazione...');
                    this.performFullSync();
                }
            });
            
            console.log('✅ Event-driven sync attivato sull\'editor comandi');
            this.editorSyncActive = true;
            
        } else {
            console.warn('⚠️ Editor comandi non trovato, fallback al polling');
            this.setupFallbackPolling();
        }
        
        // Listener per storage events (modifiche da altre tab)
        window.addEventListener('storage', (e) => {
            if (e.key && (e.key.includes('vocabulary') || e.key.includes('comandi'))) {
                console.log('📡 Storage event rilevato:', e.key);
                this.debounceSync();
            }
        });
        
        // Sync iniziale al caricamento con test opzionali
        setTimeout(() => {
            console.log('🚀 Esecuzione sync iniziale...');
            this.performFullSyncWithTests();
        }, 500);
    }

    /**
     * 🔍 Trova l'editor della scheda Comandi
     */
    findCommandsEditor() {
        for (const selector of VOCABULARY_CONFIG.EDITOR_SELECTORS) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }
        
        // Fallback: cerca tutti i textarea e controlla contenuto
        const textareas = document.querySelectorAll('textarea');
        for (const textarea of textareas) {
            const content = textarea.value.toLowerCase();
            if (content.includes('comandi') || content.includes('vocabulary') || 
                textarea.placeholder?.toLowerCase().includes('comand')) {
                return textarea;
            }
        }
        
        return null;
    }

    /**
     * 🔄 Fallback polling se event-driven non funziona
     */
    setupFallbackPolling() {
        console.log('🔄 Attivazione fallback polling ogni', VOCABULARY_CONFIG.FALLBACK_POLLING_INTERVAL, 'ms');
        
        this.fallbackInterval = setInterval(async () => {
            try {
                const currentUserVoc = this.getUserVocabularySignature();
                const userVocChanged = currentUserVoc !== this._lastUserVocSignature;
                
                if (userVocChanged) {
                    console.log('🔄 Modifica rilevata via polling, sincronizzazione...');
                    this._lastUserVocSignature = currentUserVoc;
                    await this.performFullSync();
                }
            } catch (error) {
                console.warn('⚠️ Errore fallback polling:', error.message);
            }
        }, VOCABULARY_CONFIG.FALLBACK_POLLING_INTERVAL);
    }

    /**
     * ⏱️ Debounce per evitare troppi sync (OTTIMIZZATO)
     */
    debounceSync() {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }
        
        this.syncTimeout = setTimeout(() => {
            console.log('🔄 Debounced sync triggered...');
            this.performFullSync();
        }, VOCABULARY_CONFIG.DEBOUNCE_DELAY);
    }

    /**
     * ⚡ Debounce generico con delay configurabile
     */
    debounce(func, delay = VOCABULARY_CONFIG.DEBOUNCE_DELAY) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * 🚀 Esegue sincronizzazione completa Master-Slave
     */
    async performFullSync() {
        try {
            console.log('🔄 === INIZIO SINCRONIZZAZIONE MASTER-SLAVE ===');
            
            // Ricarica vocabolario con nuova logica
            await this.loadVocabulary(true);
            
            // Log risultato finale
            if (this.masterVocabularyData) {
                console.log('✅ Sincronizzazione completata con successo');
                console.log(`📊 Statistiche finali:
                    - Master: ${this.masterVocabularyData.total} comandi totali
                    - User (Editor): ${this.masterVocabularyData.userCommands.length} comandi
                    - System (Predefiniti): ${this.masterVocabularyData.systemCommands.length} comandi
                    - Sync Status: ${this.validateSync()}`);
            }
            
            console.log('🔄 === FINE SINCRONIZZAZIONE ===');
            
        } catch (error) {
            console.error('🚨 CRITICAL: Sincronizzazione vocabolario fallita:', error);
            this.handleVocabularySyncError(error, 'performFullSync');
        }
    }

    /**
     * 🧪 Esegue sincronizzazione con test automatici (OTTIMIZZATO)
     */
    async performFullSyncWithTests() {
        try {
            // Prima esegui la sincronizzazione normale
            await this.performFullSync();
            
            // Poi esegui i test se configurato
            if (VOCABULARY_CONFIG.TEST_ON_STARTUP) {
                console.log('🧪 Esecuzione test automatici...');
                const testsPass = this.runVocabularySystemTests();
                
                if (!testsPass) {
                    console.warn('⚠️ Test falliti, ma continuo con l\'inizializzazione...');
                } else {
                    console.log('🚀 Sistema vocabolario ottimizzato e pronto!');
                }
            }
            
        } catch (error) {
            console.error('🚨 CRITICAL: Sync con test fallita:', error);
            this.handleVocabularySyncError(error, 'performFullSyncWithTests');
        }
    }

    /**
     * 🚨 Gestione errori di sincronizzazione
     */
    handleVocabularySyncError(error, context) {
        const errorMsg = `Errore sincronizzazione vocabolario in ${context}: ${error.message}`;
        
        // Log dettagliato per debug
        console.error(`🚨 ${errorMsg}`, {
            error: error,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString()
        });
        
        // Salva ultimo vocabolario valido come fallback
        if (this.masterVocabulary && this.masterVocabulary.length > 0) {
            try {
                localStorage.setItem('lastValidVocabulary', JSON.stringify({
                    vocabulary: this.masterVocabulary,
                    timestamp: new Date().toISOString()
                }));
                console.log('💾 Vocabolario di fallback salvato');
            } catch (e) {
                console.error('❌ Impossibile salvare fallback:', e);
            }
        }
        
        // Usa fallback se disponibile
        const fallbackVocab = localStorage.getItem('lastValidVocabulary');
        if (fallbackVocab) {
            try {
                const parsed = JSON.parse(fallbackVocab);
                this.masterVocabulary = parsed.vocabulary;
                this.syncedSystemVocabulary = this.deepClone(parsed.vocabulary);
                console.log('🔄 Usando vocabolario di fallback del', parsed.timestamp);
                return parsed.vocabulary;
            } catch (e) {
                console.error('❌ Fallback non valido:', e);
            }
        }
        
        throw error; // Re-throw se non c'è fallback
    }

    /**
     * 🧪 Test automatici essenziali del sistema Master-Slave
     */
    runVocabularySystemTests() {
        console.log('🧪 === AVVIO TEST SISTEMA VOCABOLARIO ===');
        
        try {
            let testsPassados = 0;
            let totalTests = 5;
            
            // TEST 1: Master vocabulary si crea correttamente
            console.log('🔍 TEST 1: Creazione Master Vocabulary...');
            const testUserCommands = this.getUserCommandsFromEditor();
            const testSystemCommands = this.getSystemPredefinedCommands();
            const expectedTotal = testUserCommands.length + testSystemCommands.length;
            
            if (this.masterVocabularyData && this.masterVocabularyData.total === expectedTotal) {
                console.log(`✅ TEST 1 PASSED: Master vocabulary creato (${expectedTotal} comandi)`);
                testsPassados++;
            } else {
                console.error(`❌ TEST 1 FAILED: Master total expected ${expectedTotal}, got ${this.masterVocabularyData?.total}`);
            }
            
            // TEST 2: System vocabulary si sincronizza
            console.log('🔍 TEST 2: Sincronizzazione System Vocabulary...');
            if (this.syncedSystemVocabulary && this.syncedSystemVocabulary.length === expectedTotal) {
                console.log(`✅ TEST 2 PASSED: System vocabulary sincronizzato (${expectedTotal} comandi)`);
                testsPassados++;
            } else {
                console.error(`❌ TEST 2 FAILED: System total expected ${expectedTotal}, got ${this.syncedSystemVocabulary?.length}`);
            }
            
            // TEST 3: Validazione rileva identità corretta
            console.log('🔍 TEST 3: Validazione identità...');
            const syncStatus = this.validateSync();
            if (syncStatus === '100% identical') {
                console.log('✅ TEST 3 PASSED: Validazione identità funziona');
                testsPassados++;
            } else {
                console.error(`❌ TEST 3 FAILED: Validation should be '100% identical', got '${syncStatus}'`);
            }
            
            // TEST 4: Validazione rileva errori (test negativo)
            console.log('🔍 TEST 4: Rilevamento errori...');
            const originalSystem = this.syncedSystemVocabulary;
            this.syncedSystemVocabulary = [...originalSystem.slice(0, -1)]; // Rimuovi ultimo elemento
            const shouldDetectError = this.validateSync();
            this.syncedSystemVocabulary = originalSystem; // Ripristina
            
            if (shouldDetectError.includes('FAILED')) {
                console.log('✅ TEST 4 PASSED: Validazione rileva errori correttamente');
                testsPassados++;
            } else {
                console.error(`❌ TEST 4 FAILED: Validation should detect error, got '${shouldDetectError}'`);
            }
            
            // TEST 5: Conteggi componenti corretti
            console.log('🔍 TEST 5: Verifica conteggi componenti...');
            const userCount = testUserCommands.length;
            const systemCount = testSystemCommands.length;
            const totalCount = userCount + systemCount;
            
            if (this.masterVocabularyData && 
                this.masterVocabularyData.userCommands.length === userCount &&
                this.masterVocabularyData.systemCommands.length === systemCount &&
                this.masterVocabularyData.total === totalCount) {
                console.log(`✅ TEST 5 PASSED: Conteggi componenti corretti (${userCount}+${systemCount}=${totalCount})`);
                testsPassados++;
            } else {
                console.error(`❌ TEST 5 FAILED: Conteggi errati. Expected User:${userCount}, System:${systemCount}, Total:${totalCount}`);
                console.error(`   Got User:${this.masterVocabularyData?.userCommands.length}, System:${this.masterVocabularyData?.systemCommands.length}, Total:${this.masterVocabularyData?.total}`);
            }
            
            // Risultato finale
            if (testsPassados === totalTests) {
                console.log(`🎉 === TUTTI I TEST SUPERATI (${testsPassados}/${totalTests}) ===`);
                return true;
            } else {
                console.error(`🚨 === TEST FALLITI (${testsPassados}/${totalTests}) ===`);
                return false;
            }
            
        } catch (error) {
            console.error('🚨 === ERRORE DURANTE I TEST ===', error);
            return false;
        }
    }

    /**
     * 🔥 CREA MASTER VOCABULARY
     * Combina correttamente Editor (user) + Sistema predefinito
     */
    createMasterVocabulary() {
        try {
            console.log('🔥 CREAZIONE MASTER VOCABULARY...');
            
            // STEP 1: Leggi comandi dall'editor scheda Comandi (da localStorage)
            const userCommands = this.getUserCommandsFromEditor();
            console.log('   📝 Letti', userCommands.length, 'comandi dall\'Editor scheda Comandi');
            
            // STEP 2: Carica comandi sistema predefiniti
            const systemCommands = this.getSystemPredefinedCommands();
            console.log('   📚 Letti', systemCommands.length, 'comandi sistema predefiniti');
            
            // STEP 3: Combina in master unico
            const masterVocabulary = {
                userCommands: userCommands,
                systemCommands: systemCommands,
                combinedCommands: [...systemCommands, ...userCommands], // Sistema prima, user dopo per priorità
                total: systemCommands.length + userCommands.length,
                lastUpdated: new Date().toISOString(),
                version: 'master-v2.0'
            };
            
            // Salva riferimento interno per compatibilità
            this.masterVocabularyData = masterVocabulary;
            
            console.log(`✅ MASTER vocabulary: ${masterVocabulary.total} comandi creato`);
            console.log(`   └─ User: ${userCommands.length} + System: ${systemCommands.length} = Total: ${masterVocabulary.total}`);
            
            return masterVocabulary.combinedCommands;
            
        } catch (error) {
            console.error(`❌ Errore creazione master vocabulary:`, error);
            throw error;
        }
    }

    /**
     * 🔄 SINCRONIZZA SISTEMA CON MASTER
     * Crea fotocopia identica del master per il sistema
     */
    syncSystemVocabulary() {
        try {
            console.log('🔄 SINCRONIZZAZIONE SISTEMA...');
            
            // STEP 1: Crea fotocopia identica usando deep clone
            const systemVocabulary = this.deepClone(this.masterVocabulary);
            
            // STEP 2: Marca come copia di sistema per tracking
            if (this.masterVocabularyData) {
                this.systemVocabularyData = {
                    ...this.deepClone(this.masterVocabularyData),
                    type: 'SYSTEM_COPY',
                    syncedAt: new Date().toISOString()
                };
            }
            
            console.log(`✅ SYSTEM vocabulary: ${systemVocabulary.length} comandi sincronizzato`);
            return systemVocabulary;
            
        } catch (error) {
            console.error(`❌ Errore sincronizzazione sistema:`, error);
            throw error;
        }
    }

    /**
     * ✅ VALIDA SINCRONIZZAZIONE
     * Verifica che master e sistema siano identici al 100%
     */
    validateSync() {
        try {
            const masterCount = this.masterVocabulary.length;
            const systemCount = this.syncedSystemVocabulary.length;
            
            // STEP 1: Confronto conteggi
            if (masterCount !== systemCount) {
                console.error(`❌ SYNC FAILED: Master e Sistema NON identici!`);
                console.error(`Master count: ${masterCount}, System count: ${systemCount}`);
                return 'FAILED - Count mismatch';
            }
            
            // STEP 2: Confronto deep equality usando JSON.stringify
            const masterStr = JSON.stringify(this.masterVocabulary);
            const systemStr = JSON.stringify(this.syncedSystemVocabulary);
            
            if (masterStr !== systemStr) {
                console.error('❌ SYNC FAILED: Contenuto diverso tra Master e Sistema');
                
                // Debug: trova prima differenza
                for (let i = 0; i < masterCount; i++) {
                    const masterCmd = this.masterVocabulary[i];
                    const systemCmd = this.syncedSystemVocabulary[i];
                    
                    if (JSON.stringify(masterCmd) !== JSON.stringify(systemCmd)) {
                        console.error(`   └─ Prima differenza all'indice ${i}:`, {
                            master: masterCmd,
                            system: systemCmd
                        });
                        break;
                    }
                }
                
                return 'FAILED - Content mismatch';
            }
            
            console.log(`✅ SYNC verification: 100% identical (${masterCount} comandi)`);
            return '100% identical';
            
        } catch (error) {
            console.error(`❌ Errore validazione sync:`, error);
            return 'FAILED - Validation error';
        }
    }
}

// Esporta classe per uso globale
window.VocabularyManager = VocabularyManager;