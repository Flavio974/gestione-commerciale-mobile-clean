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
        this.userVocabulary = []; // 🎯 PRIORITÀ: Array separato per vocabolario utente
        this.systemVocabulary = []; // 📚 Array separato per vocabolario sistema
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
        
        console.log('📚 VocabularyManager: Inizializzato con pipeline priorità');
        // DEBUG: Track user vocabulary changes
        this._lastUserVocContent = localStorage.getItem('vocabulary_user');
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
            
            // 📚 Mantieni compatibilità con codice esistente - COMBINA TUTTI I COMANDI
            const allCommands = [...this.userVocabulary, ...this.systemVocabulary];
            newVocabulary.commands = allCommands;
            
            console.log('📚 🔗 COMBINAZIONE FINALE:');
            console.log('   - User commands:', this.userVocabulary.length);
            console.log('   - System commands:', this.systemVocabulary.length);  
            console.log('   - TOTAL commands:', allCommands.length);
            
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
                // DEBUG: Check for user vocabulary changes too
                const currentUserVoc = localStorage.getItem('vocabulary_user');
                const userVocChanged = currentUserVoc !== this._lastUserVocContent;
                
                const response = await fetch(this.vocabularyPath, {
                    method: 'HEAD',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });
                
                const lastModified = response.headers.get('Last-Modified');
                if (lastModified && lastModified !== this.lastModified || userVocChanged) {
                    if (this.settings.enableDebug) {
                        console.log('📚 🔄 RILEVATA MODIFICA AL VOCABOLARIO - Ricaricamento automatico');
                        if (userVocChanged) {
                            console.debug('[VOCAB-USER] User vocabulary changed, reloading...');
                            this._lastUserVocContent = currentUserVoc;
                        }
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
     * 🎯 PIPELINE PRIORITÀ: utente → sistema → fallback
     * ORDINE RIGIDO NON NEGOZIABILE
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

        // 🥇 STEP 1: PRIORITÀ ASSOLUTA - Vocabolario UTENTE
        const userMatch = this.findInVocabulary(normalizedInput, userInput, this.userVocabulary, 'USER');
        if (userMatch) {
            this.cache.set(cacheKey, { result: userMatch, timestamp: Date.now() });
            if (this.settings.enableDebug) {
                console.log('🎯 USER VOCAB MATCH:', userMatch.command.id);
            }
            return userMatch;
        }

        // 🥈 STEP 2: Vocabolario SISTEMA
        const systemMatch = this.findInVocabulary(normalizedInput, userInput, this.systemVocabulary, 'SYSTEM');
        if (systemMatch) {
            this.cache.set(cacheKey, { result: systemMatch, timestamp: Date.now() });
            if (this.settings.enableDebug) {
                console.log('⚙️ SYSTEM VOCAB MATCH:', systemMatch.command.id);
            }
            return systemMatch;
        }

        // 🥉 STEP 3: Nessun match
        this.cache.set(cacheKey, { result: null, timestamp: Date.now() });
        
        if (this.settings.enableDebug) {
            console.log('📚 ❌ NESSUN MATCH TROVATO per:', userInput);
            
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
                if (trimmed.toLowerCase().includes('quanti') || trimmed.toLowerCase().includes('numero')) {
                    action = 'countOrders';
                    executeLocal = true;
                } else if (trimmed.toLowerCase().includes('fatturato')) {
                    action = 'calculateRevenue';
                } else {
                    action = 'listOrders';
                }
            } else if (currentCategory === 'Data e Ora') {
                action = 'getDateInfo';
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

    /**
     * DEBUG: Conta TUTTI gli ordini nel database (globale)
     */
    async executeLocalCountTotalOrders(supabaseAI) {
        try {
            const allData = await supabaseAI.getAllData();
            let count = allData.orders ? allData.orders.length : 0;
            
            // Fallback ai dati historical se orders è vuoto
            if (count === 0 && allData.historical) {
                count = allData.historical.length;
                console.log('🏠 📊 Usando dati historical per conteggio totale:', count);
            }
            
            console.log('🏠 ✅ Conteggio locale ordini totali:', count);
            
            return {
                success: true,
                response: `📦 Nel database ci sono **${count} ordini**.`,
                data: { count, type: 'ordini_totali', source: 'local-execution' }
            };
        } catch (error) {
            throw new Error(`Errore conteggio locale ordini totali: ${error.message}`);
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
                console.debug('[VOCAB-USER] Formato v2 caricato:', this.userVocabulary.length);
                return;
            }
            
            // Fallback: converti formato vecchio
            const userVocText = localStorage.getItem('vocabulary_user');
            if (!userVocText) {
                console.debug('[VOCAB-USER] Nessun vocabolario utente');
                this.userVocabulary = [];
                return;
            }
            
            console.debug('[VOCAB-USER] Conversione da formato vecchio...');
            const parsedCommands = this.parseUserVocabulary(userVocText);
            
            // Converti in formato nuovo
            this.userVocabulary = parsedCommands.map(cmd => ({
                title: cmd.description || cmd.id,
                pattern: cmd.patterns[0], // Prendi primo pattern
                action: cmd.action,
                source: 'user'
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
}

// Esporta classe per uso globale
window.VocabularyManager = VocabularyManager;