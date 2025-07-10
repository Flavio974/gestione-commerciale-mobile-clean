/**
 * INTENT RECOGNITION SYSTEM
 * Sistema flessibile per riconoscere l'intento dell'utente
 * indipendentemente dalla formulazione esatta
 */

class IntentRecognitionSystem {
    constructor() {
        // Definizione degli intent con sinonimi e varianti
        this.intents = {
            'FATTURATO_CLIENTE': {
                patterns: [
                    /(?:dimmi|qual è|mostrami|forniscimi|vorrei sapere|quanto è|dammi)?\s*(?:il\s+)?fatturato\s+(?:del\s+)?(?:cliente\s+)?(.+)/i,
                    /(?:quanto|cosa)\s+(?:ha\s+)?(?:fatturato|venduto|incassato)\s+(.+)/i,
                    /(?:fatturato|vendite|incasso)\s+(?:di\s+)?(.+)/i
                ],
                keywords: ['fatturato', 'venduto', 'incasso', 'vendite', 'guadagno'],
                paramExtractor: (match) => ({ cliente: this.normalizeClientName(match[1]) })
            },
            
            'ORDINI_CLIENTE': {
                patterns: [
                    /(?:ordini|ordine)\s+(?:del\s+)?(?:cliente\s+)?(.+)/i,
                    /(?:mostrami|dammi|quali sono)\s+(?:gli\s+)?ordini\s+(?:di\s+)?(.+)/i,
                    /(?:cosa|quanto)\s+(?:ha\s+)?(?:ordinato|comprato)\s+(.+)/i,
                    /(?:quanti|numero)\s+ordini\s+(?:ha\s+fatto\s+)?(.+)/i
                ],
                keywords: ['ordini', 'ordine', 'ordinato', 'comprato', 'acquisti'],
                paramExtractor: (match) => ({ cliente: this.normalizeClientName(match[1]) })
            },
            
            'PRODOTTI_ORDINE': {
                patterns: [
                    /(?:prodotti|articoli|cosa)\s+(?:nell'|del|nel)\s*ordine\s+(?:del\s+)?(?:cliente\s+)?(.+)/i,
                    /(?:composizione|dettaglio|contenuto)\s+ordine\s+(?:del\s+)?(?:cliente\s+)?(.+)/i,
                    /(?:cosa\s+ha\s+ordinato|cosa\s+contiene\s+l'ordine\s+di)\s+(.+)/i,
                    /(?:elenca|mostra|dammi)\s+(?:i\s+)?prodotti\s+(?:del\s+)?(?:cliente\s+)?(.+)/i
                ],
                keywords: ['prodotti', 'articoli', 'composizione', 'contenuto', 'dettaglio'],
                paramExtractor: (match) => ({ cliente: this.normalizeClientName(match[1]) })
            },
            
            'TEMPO_PERCORSO': {
                patterns: [
                    /(?:quanto\s+)?(?:tempo|minuti|ore)\s+(?:ci\s+vuole\s+)?(?:da|dalla)\s+(.+?)\s+(?:a|alla|verso)\s+(.+)/i,
                    /(?:durata|percorrenza)\s+(?:del\s+)?(?:viaggio|percorso)\s+(?:da|dalla)\s+(.+?)\s+(?:a|alla)\s+(.+)/i,
                    /(?:quanto\s+ci\s+metto|quanto\s+impiego)\s+(?:da|dalla)\s+(.+?)\s+(?:a|alla)\s+(.+)/i
                ],
                keywords: ['tempo', 'minuti', 'ore', 'durata', 'percorrenza', 'viaggio'],
                paramExtractor: (match) => ({ 
                    partenza: this.normalizeClientName(match[1]), 
                    arrivo: this.normalizeClientName(match[2]) 
                })
            },
            
            'DATA_CONSEGNA': {
                patterns: [
                    /(?:quando|data)\s+(?:di\s+)?consegna\s+(?:ordine\s+)?(.+)/i,
                    /(?:quando\s+viene|quando\s+sarà)\s+consegnato\s+(?:l'ordine\s+)?(.+)/i,
                    /(?:data|giorno)\s+(?:di\s+)?consegna\s+(?:per\s+)?(.+)/i
                ],
                keywords: ['quando', 'data', 'consegna', 'consegnato'],
                paramExtractor: (match) => ({ 
                    riferimento: match[1].trim() 
                })
            },
            
            'APPUNTAMENTO_CLIENTE': {
                patterns: [
                    /(?:quando\s+)?(?:ho\s+)?(?:l')?appuntamento\s+(?:con\s+)?(.+)/i,
                    /(?:mostrami|dammi)\s+(?:l')?appuntamento\s+(?:con\s+)?(.+)/i,
                    /appuntamento\s+(.+)\s+quando\s+è/i
                ],
                keywords: ['appuntamento', 'incontro', 'visita'],
                paramExtractor: (match) => ({ cliente: this.normalizeClientName(match[1]) })
            }
        };
        
        // Dizionario sinonimi per normalizzazione
        this.synonyms = {
            'fatturato': ['venduto', 'incasso', 'vendite', 'guadagno', 'ricavo'],
            'cliente': ['azienda', 'ditta', 'società'],
            'ordini': ['ordine', 'ordinato', 'comprato', 'acquisti', 'acquistato'],
            'prodotti': ['articoli', 'merce', 'items', 'riferimenti'],
            'tempo': ['durata', 'minuti', 'ore', 'quanto ci vuole'],
            'mostrami': ['dammi', 'dimmi', 'visualizza', 'fammi vedere'],
            'quando': ['data', 'giorno', 'in che data']
        };
        
        // Cache per performance
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
    }
    
    /**
     * Riconosce l'intent della richiesta
     */
    async recognizeIntent(message) {
        // Controlla cache
        const cached = this.getFromCache(message);
        if (cached) {
            console.log('📋 Intent trovato in cache');
            return cached;
        }
        
        // Normalizza messaggio
        const normalizedMessage = this.normalizeMessage(message);
        
        // Cerca corrispondenza esatta
        let result = this.findExactMatch(normalizedMessage);
        
        // Se non trova corrispondenza esatta, prova fuzzy matching
        if (!result) {
            result = this.findFuzzyMatch(normalizedMessage);
        }
        
        // Se ancora non trova, prova analisi semantica
        if (!result) {
            result = this.analyzeSemantics(normalizedMessage);
        }
        
        // Salva in cache
        if (result) {
            this.saveToCache(message, result);
        }
        
        return result;
    }
    
    /**
     * Cerca corrispondenza esatta con i pattern
     */
    findExactMatch(message) {
        for (const [intentName, intentConfig] of Object.entries(this.intents)) {
            for (const pattern of intentConfig.patterns) {
                const match = message.match(pattern);
                if (match) {
                    console.log(`✅ Intent riconosciuto: ${intentName}`);
                    return {
                        intent: intentName,
                        confidence: 1.0,
                        params: intentConfig.paramExtractor(match),
                        method: 'exact'
                    };
                }
            }
        }
        return null;
    }
    
    /**
     * Fuzzy matching basato su keywords e similarità
     */
    findFuzzyMatch(message) {
        const messageWords = message.toLowerCase().split(/\s+/);
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [intentName, intentConfig] of Object.entries(this.intents)) {
            // Calcola score basato su keywords
            let score = 0;
            let matchedKeywords = [];
            
            for (const keyword of intentConfig.keywords) {
                // Controlla keyword diretta
                if (messageWords.includes(keyword)) {
                    score += 2;
                    matchedKeywords.push(keyword);
                }
                
                // Controlla sinonimi
                const synonymList = this.synonyms[keyword] || [];
                for (const synonym of synonymList) {
                    if (messageWords.includes(synonym)) {
                        score += 1.5;
                        matchedKeywords.push(synonym);
                    }
                }
            }
            
            // Normalizza score
            const normalizedScore = score / intentConfig.keywords.length;
            
            if (normalizedScore > bestScore && normalizedScore >= 0.5) {
                // Prova ad estrarre parametri anche senza pattern match esatto
                const params = this.extractParamsHeuristic(message, intentName);
                
                bestMatch = {
                    intent: intentName,
                    confidence: Math.min(normalizedScore, 0.9),
                    params: params,
                    method: 'fuzzy',
                    matchedKeywords: matchedKeywords
                };
                bestScore = normalizedScore;
            }
        }
        
        if (bestMatch) {
            console.log(`🔍 Intent riconosciuto (fuzzy): ${bestMatch.intent} (confidence: ${bestMatch.confidence})`);
        }
        
        return bestMatch;
    }
    
    /**
     * Analisi semantica per intent complessi
     */
    analyzeSemantics(message) {
        // Analisi basata su struttura della frase
        const hasInterrogative = /^(qual|quanto|quando|dove|come|chi|cosa)/i.test(message);
        const hasImperative = /^(mostra|dimmi|dammi|trova|cerca|elenca)/i.test(message);
        
        // Estrai entità nominate (clienti, date, numeri)
        const entities = this.extractEntities(message);
        
        // Determina intent basato su contesto
        if (entities.clients.length > 0) {
            if (message.includes('fatturato') || message.includes('venduto')) {
                return {
                    intent: 'FATTURATO_CLIENTE',
                    confidence: 0.7,
                    params: { cliente: entities.clients[0] },
                    method: 'semantic'
                };
            }
            if (message.includes('ordini') || message.includes('ordine')) {
                return {
                    intent: 'ORDINI_CLIENTE',
                    confidence: 0.7,
                    params: { cliente: entities.clients[0] },
                    method: 'semantic'
                };
            }
        }
        
        return null;
    }
    
    /**
     * Estrae entità dal messaggio
     */
    extractEntities(message) {
        const entities = {
            clients: [],
            dates: [],
            numbers: [],
            locations: []
        };
        
        // Pattern per identificare possibili nomi clienti
        // (parole maiuscole, sigle, nomi propri)
        const clientPattern = /\b([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*)\b/g;
        let match;
        while ((match = clientPattern.exec(message)) !== null) {
            // Filtra parole comuni che non sono clienti
            const commonWords = ['Il', 'La', 'Lo', 'Gli', 'Le', 'Un', 'Una', 'Qual', 'Quanto', 'Quando'];
            if (!commonWords.includes(match[1])) {
                entities.clients.push(match[1]);
            }
        }
        
        // Pattern per date
        const datePattern = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g;
        while ((match = datePattern.exec(message)) !== null) {
            entities.dates.push(match[1]);
        }
        
        // Pattern per numeri
        const numberPattern = /\b(\d+)\b/g;
        while ((match = numberPattern.exec(message)) !== null) {
            entities.numbers.push(match[1]);
        }
        
        return entities;
    }
    
    /**
     * Estrae parametri euristicamente quando non c'è match esatto
     */
    extractParamsHeuristic(message, intentName) {
        const entities = this.extractEntities(message);
        const params = {};
        
        switch (intentName) {
            case 'FATTURATO_CLIENTE':
            case 'ORDINI_CLIENTE':
            case 'PRODOTTI_ORDINE':
            case 'APPUNTAMENTO_CLIENTE':
                if (entities.clients.length > 0) {
                    params.cliente = this.normalizeClientName(entities.clients[0]);
                }
                break;
                
            case 'TEMPO_PERCORSO':
                if (entities.clients.length >= 2) {
                    params.partenza = this.normalizeClientName(entities.clients[0]);
                    params.arrivo = this.normalizeClientName(entities.clients[1]);
                } else if (entities.locations.length >= 2) {
                    params.partenza = entities.locations[0];
                    params.arrivo = entities.locations[1];
                }
                break;
                
            case 'DATA_CONSEGNA':
                if (entities.numbers.length > 0) {
                    params.riferimento = entities.numbers[0];
                } else if (entities.clients.length > 0) {
                    params.riferimento = entities.clients[0];
                }
                break;
        }
        
        return params;
    }
    
    /**
     * Normalizza il messaggio per il matching
     */
    normalizeMessage(message) {
        return message
            .toLowerCase()
            .trim()
            // Rimuovi punteggiatura eccetto apostrofi
            .replace(/[.,!?;:]+/g, ' ')
            // Normalizza spazi
            .replace(/\s+/g, ' ')
            // Espandi contrazioni comuni
            .replace(/qual'è/g, 'qual è')
            .replace(/cos'è/g, 'cosa è')
            .replace(/dov'è/g, 'dove è');
    }
    
    /**
     * Normalizza nome cliente
     */
    normalizeClientName(name) {
        if (!name || typeof name !== 'string') return '';
        
        return name
            .trim()
            // Rimuovi punteggiatura finale
            .replace(/[?!.,;:]+$/, '')
            // Gestisci abbreviazioni comuni
            .replace(/\bS\.?M\.?\b/gi, 'ESSE EMME')
            .replace(/\bS\.S\.S\./gi, 'SSS')
            .replace(/\bS\.S\./gi, 'SS') 
            .replace(/\bS\.R\.L\./gi, 'SRL')
            .replace(/\bS\.P\.A\./gi, 'SPA')
            // Normalizza spazi
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    /**
     * Cache management
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }
    
    saveToCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Pulizia cache vecchia
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }
    
    /**
     * Metodo di utilità per testare il sistema
     */
    testIntent(message) {
        console.log(`\n🧪 Test intent recognition per: "${message}"`);
        const result = this.recognizeIntent(message);
        console.log('Risultato:', result);
        return result;
    }
}

// Esporta la classe
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntentRecognitionSystem;
}