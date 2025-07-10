/**
 * IMPROVED VOCABOLARIO MIDDLEWARE
 * Versione migliorata con Intent Recognition, Data Normalization e Error Handling
 */

class ImprovedVocabolarioMiddleware extends VocabolarioMiddleware {
    constructor(requestMiddleware) {
        super(requestMiddleware);
        
        // Inizializza i nuovi sistemi
        this.intentRecognition = new IntentRecognitionSystem();
        this.dataNormalizer = new DataNormalizationSystem();
        this.errorHandler = getErrorHandler();
        
        // Cache per performance
        this.responseCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
        
        // Statistiche per monitoring
        this.stats = {
            totalRequests: 0,
            handledByVocabulary: 0,
            handledByIntent: 0,
            handledByMiddleware: 0,
            errors: 0,
            cacheHits: 0
        };
        
        console.log('🚀 ImprovedVocabolarioMiddleware inizializzato con sistemi avanzati');
    }
    
    /**
     * Override del metodo principale per integrare i nuovi sistemi
     */
    async processWithVocabulario(userInput) {
        this.stats.totalRequests++;
        
        try {
            // Log richiesta
            this.errorHandler.log('INFO', 'Nuova richiesta ricevuta', { 
                input: userInput,
                timestamp: new Date().toISOString()
            });
            
            // Controlla cache
            const cached = this.checkCache(userInput);
            if (cached) {
                this.stats.cacheHits++;
                return cached;
            }
            
            // Normalizza input
            const normalizedInput = this.dataNormalizer.normalize(userInput, 'generic');
            console.log(`📝 Input normalizzato: "${userInput}" → "${normalizedInput}"`);
            
            // 1. Prova prima il vocabolario esistente (per retrocompatibilità)
            const vocabResult = await this.tryVocabularyMatch(normalizedInput);
            if (vocabResult.handled) {
                this.stats.handledByVocabulary++;
                this.saveToCache(userInput, vocabResult);
                return vocabResult;
            }
            
            // 2. Usa Intent Recognition per matching più flessibile
            const intentResult = await this.tryIntentRecognition(normalizedInput, userInput);
            if (intentResult.handled) {
                this.stats.handledByIntent++;
                this.saveToCache(userInput, intentResult);
                return intentResult;
            }
            
            // 3. Fallback al middleware originale
            const middlewareResult = await this.tryMiddlewareProcessing(normalizedInput);
            if (middlewareResult.handled) {
                this.stats.handledByMiddleware++;
                this.saveToCache(userInput, middlewareResult);
                return middlewareResult;
            }
            
            // 4. Se nulla funziona, ritorna non gestito
            return {
                handled: false,
                reason: 'Richiesta non riconosciuta da nessun sistema',
                suggestions: await this.generateSuggestions(normalizedInput)
            };
            
        } catch (error) {
            this.stats.errors++;
            
            // Gestione errore robusta
            const errorResult = this.errorHandler.handleError(error, {
                module: 'ImprovedVocabolarioMiddleware',
                method: 'processWithVocabulario',
                input: userInput
            });
            
            return {
                handled: false,
                error: true,
                message: errorResult.userMessage,
                recovery: errorResult.recovery
            };
        }
    }
    
    /**
     * Prova matching con vocabolario esistente
     */
    async tryVocabularyMatch(input) {
        try {
            // Usa il metodo padre findExactMatch
            const exactMatch = this.findExactMatch(input);
            if (exactMatch) {
                // Normalizza i parametri estratti
                const normalizedParams = await this.normalizeExtractedParams(exactMatch.params);
                exactMatch.params = normalizedParams;
                
                // Procedi con l'esecuzione come nel metodo padre
                const requestType = this.mapCategoryToRequestType(exactMatch.category, exactMatch.pattern);
                
                if (['fatturato', 'ordini', 'data', 'percorsi', 'clienti', 'prodotti_ordine', 'clienti_database'].includes(requestType)) {
                    const adaptedParams = await this.adaptParamsForMiddleware(requestType, exactMatch.params);
                    
                    const result = await this.errorHandler.tryOperation(
                        () => this.requestMiddleware.executeDirectOperation(requestType, adaptedParams, input),
                        { module: 'VocabularyMatch', requestType }
                    );
                    
                    if (result.success && result.data.success) {
                        return {
                            handled: true,
                            response: result.data.response,
                            data: result.data.data,
                            type: requestType,
                            matchType: 'vocabulary_exact',
                            pattern: exactMatch.pattern,
                            source: 'APP'
                        };
                    }
                }
                
                if (requestType === 'timeline') {
                    const result = await this.handleTimelineCommand(exactMatch.params, input);
                    result.source = 'APP';
                    return result;
                }
            }
            
            return { handled: false };
            
        } catch (error) {
            this.errorHandler.log('WARN', 'Errore in tryVocabularyMatch', { error: error.message });
            return { handled: false };
        }
    }
    
    /**
     * Prova Intent Recognition
     */
    async tryIntentRecognition(normalizedInput, originalInput) {
        try {
            const intent = await this.intentRecognition.recognizeIntent(normalizedInput);
            
            if (!intent || intent.confidence < 0.7) {
                return { handled: false };
            }
            
            console.log(`🎯 Intent riconosciuto: ${intent.intent} (confidence: ${intent.confidence})`);
            
            // Normalizza parametri estratti
            const normalizedParams = await this.normalizeExtractedParams(intent.params);
            
            // Mappa intent a operazione
            const operation = this.mapIntentToOperation(intent.intent);
            
            if (operation.type === 'direct') {
                // Esecuzione diretta tramite middleware
                const result = await this.errorHandler.tryOperation(
                    () => this.requestMiddleware.executeDirectOperation(
                        operation.requestType, 
                        normalizedParams, 
                        originalInput
                    ),
                    { module: 'IntentRecognition', intent: intent.intent }
                );
                
                if (result.success && result.data.success) {
                    return {
                        handled: true,
                        response: this.enhanceResponse(result.data.response, intent, normalizedParams),
                        data: result.data.data,
                        type: operation.requestType,
                        matchType: `intent_${intent.method}`,
                        confidence: intent.confidence,
                        source: 'APP'
                    };
                }
            }
            
            if (operation.type === 'timeline') {
                const result = await this.handleTimelineCommand(normalizedParams, originalInput);
                result.source = 'APP';
                result.matchType = `intent_${intent.method}`;
                result.confidence = intent.confidence;
                return result;
            }
            
            return { handled: false };
            
        } catch (error) {
            this.errorHandler.log('WARN', 'Errore in tryIntentRecognition', { error: error.message });
            return { handled: false };
        }
    }
    
    /**
     * Prova processing con middleware originale
     */
    async tryMiddlewareProcessing(input) {
        try {
            const result = await this.errorHandler.tryOperation(
                () => this.requestMiddleware.processRequest(input),
                { module: 'MiddlewareProcessing' }
            );
            
            if (result.success && result.data.handled) {
                result.data.source = result.data.source || 'APP';
                result.data.matchType = 'middleware_pattern';
                return result.data;
            }
            
            return { handled: false };
            
        } catch (error) {
            this.errorHandler.log('WARN', 'Errore in tryMiddlewareProcessing', { error: error.message });
            return { handled: false };
        }
    }
    
    /**
     * Normalizza parametri estratti
     */
    async normalizeExtractedParams(params) {
        const normalized = {};
        
        for (const [key, value] of Object.entries(params)) {
            if (key === 'cliente' || key === 'cliente_a' || key === 'cliente_b') {
                // Normalizza nome cliente
                normalized[key] = this.dataNormalizer.normalize(value, 'client');
                
                // Risolvi alias
                const resolution = await this.aliasResolver.resolveClientName(normalized[key]);
                if (resolution.found) {
                    normalized[key] = resolution.resolved;
                    normalized[`_original_${key}`] = value;
                    normalized[`_${key}_resolution`] = resolution;
                }
            } else if (key === 'data') {
                normalized[key] = this.dataNormalizer.normalize(value, 'date');
            } else if (key === 'prodotto') {
                normalized[key] = this.dataNormalizer.normalize(value, 'product');
            } else {
                normalized[key] = value;
            }
        }
        
        return normalized;
    }
    
    /**
     * Mappa intent a tipo di operazione
     */
    mapIntentToOperation(intent) {
        const mapping = {
            'FATTURATO_CLIENTE': { type: 'direct', requestType: 'fatturato' },
            'ORDINI_CLIENTE': { type: 'direct', requestType: 'ordini' },
            'PRODOTTI_ORDINE': { type: 'direct', requestType: 'prodotti_ordine' },
            'TEMPO_PERCORSO': { type: 'direct', requestType: 'percorsi' },
            'DATA_CONSEGNA': { type: 'direct', requestType: 'data' },
            'APPUNTAMENTO_CLIENTE': { type: 'timeline', requestType: 'timeline' }
        };
        
        return mapping[intent] || { type: 'unknown' };
    }
    
    /**
     * Migliora la risposta con informazioni dal sistema intent
     */
    enhanceResponse(response, intent, params) {
        // Se c'è stata una risoluzione di alias, menzionalo
        if (params._cliente_resolution && params._cliente_resolution.method === 'alias') {
            const original = params._original_cliente;
            const resolved = params.cliente;
            
            // Aggiungi nota sulla risoluzione solo se significativa
            if (original.toLowerCase() !== resolved.toLowerCase()) {
                response = `${response}\n\n📝 Nota: "${original}" è stato riconosciuto come "${resolved}"`;
            }
        }
        
        // Se confidence bassa, aggiungi disclaimer
        if (intent.confidence < 0.85) {
            response = `${response}\n\n⚠️ Interpretazione con confidenza ${Math.round(intent.confidence * 100)}%`;
        }
        
        return response;
    }
    
    /**
     * Genera suggerimenti per richieste non riconosciute
     */
    async generateSuggestions(input) {
        const suggestions = [];
        
        // Estrai possibili nomi clienti
        const entities = this.intentRecognition.extractEntities(input);
        
        if (entities.clients.length > 0) {
            // Cerca clienti simili nel database
            const allClients = await this.getAllClientNames();
            
            for (const clientName of entities.clients) {
                const similar = this.dataNormalizer.suggestCorrections(clientName, allClients);
                if (similar.length > 0) {
                    suggestions.push({
                        type: 'client_correction',
                        original: clientName,
                        suggestions: similar.map(s => s.value)
                    });
                }
            }
        }
        
        // Suggerisci comandi simili dal vocabolario
        if (this.vocabolario) {
            const allPatterns = [];
            for (const commands of Object.values(this.vocabolario)) {
                allPatterns.push(...commands.map(c => c.pattern));
            }
            
            const similarCommands = this.findSimilarCommands(input, allPatterns, 3);
            if (similarCommands.length > 0) {
                suggestions.push({
                    type: 'similar_commands',
                    commands: similarCommands
                });
            }
        }
        
        return suggestions;
    }
    
    /**
     * Trova comandi simili
     */
    findSimilarCommands(input, commands, limit = 3) {
        const scores = commands.map(cmd => ({
            command: cmd,
            score: this.calculateStringSimilarity(input.toLowerCase(), cmd.toLowerCase())
        }));
        
        return scores
            .filter(s => s.score > 0.4)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(s => s.command);
    }
    
    /**
     * Calcola similarità tra stringhe (Jaccard)
     */
    calculateStringSimilarity(str1, str2) {
        const words1 = new Set(str1.split(/\s+/));
        const words2 = new Set(str2.split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }
    
    /**
     * Ottiene tutti i nomi clienti dal database
     */
    async getAllClientNames() {
        try {
            // Usa supabaseAI se disponibile
            if (this.requestMiddleware.supabaseAI) {
                await this.requestMiddleware.supabaseAI.loadData();
                const clients = this.requestMiddleware.supabaseAI.clienti || [];
                return clients.map(c => c.nome).filter(Boolean);
            }
            
            return [];
        } catch (error) {
            this.errorHandler.log('ERROR', 'Errore caricamento nomi clienti', { error: error.message });
            return [];
        }
    }
    
    /**
     * Cache management
     */
    checkCache(key) {
        const cached = this.responseCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log('💾 Risposta trovata in cache');
            return cached.data;
        }
        this.responseCache.delete(key);
        return null;
    }
    
    saveToCache(key, data) {
        this.responseCache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Pulizia cache se troppo grande
        if (this.responseCache.size > 100) {
            const oldestKey = this.responseCache.keys().next().value;
            this.responseCache.delete(oldestKey);
        }
    }
    
    /**
     * Esporta statistiche per monitoring
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.responseCache.size,
            errorRate: this.stats.errors / this.stats.totalRequests || 0,
            vocabHitRate: this.stats.handledByVocabulary / this.stats.totalRequests || 0,
            intentHitRate: this.stats.handledByIntent / this.stats.totalRequests || 0,
            cacheHitRate: this.stats.cacheHits / this.stats.totalRequests || 0
        };
    }
    
    /**
     * Reset statistiche
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            handledByVocabulary: 0,
            handledByIntent: 0,
            handledByMiddleware: 0,
            errors: 0,
            cacheHits: 0
        };
        console.log('📊 Statistiche resettate');
    }
}

// Export globale
window.ImprovedVocabolarioMiddleware = ImprovedVocabolarioMiddleware;

console.log('🚀 ImprovedVocabolarioMiddleware module loaded');