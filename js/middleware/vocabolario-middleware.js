/**
 * VOCABOLARIO MIDDLEWARE - Estensione del Request Middleware
 * Integra il vocabolario comandi per un matching più preciso
 */

class VocabolarioMiddleware {
    constructor(requestMiddleware) {
        this.requestMiddleware = requestMiddleware;
        this.vocabolario = null;
        this.isLoading = false;
        
        // Inizializza ClientAliasResolver
        this.aliasResolver = new ClientAliasResolver();
        this.aliasResolver.init().catch(err => {
            console.warn('⚠️ Errore inizializzazione ClientAliasResolver:', err);
        });
        
        // Inizializza TimelineIntelligentManager
        this.timelineManager = new TimelineIntelligentManager();
        
        // Carica vocabolario all'inizializzazione
        this.loadVocabolario();
        
        // Ascolta aggiornamenti del vocabolario
        window.addEventListener('vocabolario:updated', (e) => {
            console.log('📋 Vocabolario aggiornato, ricarico...');
            this.vocabolario = e.detail.vocabolario;
        });
        
        console.log('📋 VocabolarioMiddleware inizializzato');
    }
    
    /**
     * Carica il vocabolario dei comandi
     */
    async loadVocabolario() {
        try {
            // Prima prova localStorage (se modificato dall'utente)
            const savedVocabolario = localStorage.getItem('vocabolario_comandi');
            if (savedVocabolario) {
                this.vocabolario = this.parseVocabolario(savedVocabolario);
                console.log('✅ Vocabolario caricato da localStorage');
                return;
            }
            
            // Altrimenti carica dal file
            const response = await fetch('/comandi/vocabolario_comandi.txt');
            if (response.ok) {
                const text = await response.text();
                this.vocabolario = this.parseVocabolario(text);
                console.log('✅ Vocabolario caricato da file');
            }
        } catch (error) {
            console.error('❌ Errore caricamento vocabolario:', error);
            this.vocabolario = {};
        }
    }
    
    /**
     * Parse del vocabolario (stesso formato del ComandiModule)
     */
    parseVocabolario(text) {
        const commands = {};
        let currentCategory = null;
        
        text.split('\n').forEach(line => {
            line = line.trim();
            
            if (line.startsWith('# CATEGORIA:')) {
                currentCategory = line.replace('# CATEGORIA:', '').trim();
                commands[currentCategory] = [];
            } else if (line && currentCategory && !line.startsWith('#')) {
                commands[currentCategory].push({
                    pattern: line,
                    regex: this.createRegexFromPattern(line),
                    category: currentCategory
                });
            }
        });
        
        return commands;
    }
    
    /**
     * Converte pattern con placeholder in regex
     */
    createRegexFromPattern(pattern) {
        return new RegExp(
            '^' + pattern
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape caratteri speciali
                .replace(/\\\[CLIENTE\\\]/g, '(.+?)')
                .replace(/\\\[CLIENTE_A\\\]/g, '(.+?)')
                .replace(/\\\[CLIENTE_B\\\]/g, '(.+?)')
                .replace(/\\\[DATA\\\]/g, '(.+?)')
                .replace(/\\\[ORA\\\]/g, '(.+?)')
                .replace(/\\\[PERIODO\\\]/g, '(settimana|mese|anno)')
                .replace(/\\\[PERIODO_A\\\]/g, '(.+?)')
                .replace(/\\\[PERIODO_B\\\]/g, '(.+?)')
                .replace(/\\\[GIORNI\\\]/g, '(\\d+)')
                .replace(/\\\[GIORNO\\\]/g, '(.+?)')
                .replace(/\\\[ZONA\\\]/g, '(.+?)')
                .replace(/\\\[PRODOTTO\\\]/g, '(.+?)')
                .replace(/\\\[NOTA\\\]/g, '(.+)') + '$',
            'i'
        );
    }
    
    /**
     * Trova corrispondenza esatta nel vocabolario
     */
    findExactMatch(userInput) {
        if (!this.vocabolario) return null;
        
        const inputNormalized = userInput.trim().toLowerCase();
        
        // Cerca in tutte le categorie
        for (const [category, commands] of Object.entries(this.vocabolario)) {
            for (const command of commands) {
                const match = inputNormalized.match(command.regex);
                if (match) {
                    console.log(`✅ Match esatto trovato: categoria="${category}", pattern="${command.pattern}"`);
                    
                    // Estrai i parametri dal match
                    const params = this.extractParamsFromMatch(match, command.pattern);
                    
                    return {
                        category,
                        pattern: command.pattern,
                        params,
                        confidence: 1.0
                    };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Estrae parametri dal match regex
     */
    extractParamsFromMatch(match, pattern) {
        const params = {};
        const placeholders = pattern.match(/\[([A-Z_]+)\]/g) || [];
        
        placeholders.forEach((placeholder, index) => {
            const key = placeholder.slice(1, -1).toLowerCase(); // Rimuove [ ] e lowercase
            if (match[index + 1]) {
                params[key] = match[index + 1].trim();
            }
        });
        
        return params;
    }
    
    /**
     * Trova corrispondenza simile (fuzzy matching)
     */
    findSimilarMatch(userInput) {
        if (!this.vocabolario) return null;
        
        const inputWords = userInput.toLowerCase().split(/\s+/);
        let bestMatch = null;
        let bestScore = 0;
        const threshold = 0.6; // Soglia minima di similarità
        
        for (const [category, commands] of Object.entries(this.vocabolario)) {
            for (const command of commands) {
                // Estrai parole chiave dal pattern (escludendo placeholder)
                const patternWords = command.pattern
                    .replace(/\[[A-Z_]+\]/g, '')
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(word => word.length > 2); // Solo parole significative
                
                // Calcola score di similarità
                const score = this.calculateSimilarity(inputWords, patternWords);
                
                if (score > bestScore && score >= threshold) {
                    bestScore = score;
                    bestMatch = {
                        category,
                        pattern: command.pattern,
                        confidence: score,
                        params: {} // I parametri verranno estratti dall'AI
                    };
                }
            }
        }
        
        if (bestMatch) {
            console.log(`🔍 Match simile trovato: categoria="${bestMatch.category}", confidence=${bestMatch.confidence.toFixed(2)}`);
        }
        
        return bestMatch;
    }
    
    /**
     * Calcola similarità tra due insiemi di parole
     */
    calculateSimilarity(words1, words2) {
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        
        // Intersezione
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        
        // Jaccard similarity
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }
    
    /**
     * Mappa categoria a tipo richiesta per il middleware esistente
     */
    mapCategoryToRequestType(category, pattern) {
        const mapping = {
            'Fatturato e Ordini': this.determineFatturatoType(pattern),
            'Percorsi e Spostamenti': 'percorsi',
            'Timeline e Appuntamenti': 'timeline',
            'Analisi e Report': 'analisi',
            'Gestione Clienti': this.determineClientiType(pattern),
            'Sistema e Database': this.determineSistemaType(pattern)
        };
        
        return mapping[category] || 'unknown';
    }
    
    /**
     * Determina se è fatturato, ordini, data o prodotti ordine basandosi sul pattern
     */
    determineFatturatoType(pattern) {
        const patternLower = pattern.toLowerCase();
        
        // Riconoscimento prodotti negli ordini
        if (patternLower.includes('prodotti') || 
            patternLower.includes('composto') || 
            patternLower.includes('composizione') ||
            patternLower.includes('cosa ha ordinato') ||
            patternLower.includes('dettaglio prodotti') ||
            patternLower.includes('storico ordini') ||
            patternLower.includes('storico degli ordini')) {
            return 'prodotti_ordine';
        }
        
        if (patternLower.includes('quando') || 
            patternLower.includes('data') || 
            patternLower.includes('ultimo')) {
            return 'data';
        }
        
        if (patternLower.includes('ordini') || 
            patternLower.includes('quanti') || 
            patternLower.includes('numero')) {
            return 'ordini';
        }
        
        return 'fatturato';
    }
    
    /**
     * Determina il tipo di richiesta per gestione clienti
     */
    determineClientiType(pattern) {
        const patternLower = pattern.toLowerCase();
        
        // Riconoscimento query database clienti
        if (patternLower.includes('elenco clienti database') ||
            patternLower.includes('clienti nel database') ||
            patternLower.includes('mostrami tutti i clienti') ||
            patternLower.includes('lista clienti completa') ||
            patternLower.includes('quali clienti abbiamo') ||
            patternLower.includes('chi sono i nostri clienti') ||
            patternLower.includes('clienti presenti nel sistema') ||
            patternLower.includes('database clienti') ||
            patternLower.includes('interroga clienti database') ||
            patternLower.includes('visualizza clienti') ||
            // NUOVI PATTERN per domande sugli ordini
            patternLower.includes('ordini') && patternLower.includes('clienti') && patternLower.includes('appartengono') ||
            patternLower.includes('ordini') && patternLower.includes('database') && patternLower.includes('clienti') ||
            patternLower.includes('ordini') && patternLower.includes('tabella') && patternLower.includes('clienti') ||
            patternLower.includes('che clienti') && (patternLower.includes('database') || patternLower.includes('ordini')) ||
            patternLower.includes('a che clienti') && patternLower.includes('appartengono')) {
            return 'clienti_database';
        }
        
        return 'clienti';
    }
    
    /**
     * Determina il tipo di richiesta per sistema e database
     */
    determineSistemaType(pattern) {
        const patternLower = pattern.toLowerCase();
        
        if (patternLower.includes('sincronizza') || patternLower.includes('esporta')) {
            return 'sincronizzazione';
        }
        
        if (patternLower.includes('controlla connessione') || patternLower.includes('stato')) {
            return 'stato_sistema';
        }
        
        if (patternLower.includes('pulisci') || patternLower.includes('elimina')) {
            return 'pulizia_dati';
        }
        
        if (patternLower.includes('test') || patternLower.includes('valida')) {
            return 'test_sistema';
        }
        
        return 'sistema';
    }
    
    /**
     * Processa richiesta con vocabolario
     */
    async processWithVocabulario(userInput) {
        console.log('📋 VOCABOLARIO: Processando richiesta:', userInput);
        
        // 1. Cerca match esatto
        const exactMatch = this.findExactMatch(userInput);
        if (exactMatch) {
            console.log('📋 VOCABOLARIO: Match esatto trovato:', exactMatch);
            // Mappa al tipo di richiesta del middleware esistente
            const requestType = this.mapCategoryToRequestType(exactMatch.category, exactMatch.pattern);
            console.log('📋 VOCABOLARIO: Request type mappato:', requestType);
            
            // Se è un tipo gestito dal middleware esistente
            if (['fatturato', 'ordini', 'data', 'percorsi', 'clienti', 'prodotti_ordine', 'clienti_database'].includes(requestType)) {
                // Adatta i parametri al formato atteso (con risoluzione alias)
                const adaptedParams = await this.adaptParamsForMiddleware(requestType, exactMatch.params);
                
                // Usa il middleware esistente per l'esecuzione
                const result = await this.requestMiddleware.executeDirectOperation(
                    requestType, 
                    adaptedParams, 
                    userInput
                );
                
                if (result.success) {
                    return {
                        handled: true,
                        response: result.response,
                        data: result.data,
                        type: requestType,
                        matchType: 'exact',
                        pattern: exactMatch.pattern
                    };
                }
            }
            
            // Se è un comando timeline, usa TimelineIntelligentManager
            if (requestType === 'timeline') {
                const result = await this.handleTimelineCommand(exactMatch.params, userInput);
                return result;
            }
            
            // Per timeline e altri tipi non ancora implementati
            return {
                handled: false,
                matchFound: true,
                match: exactMatch,
                reason: 'Tipo comando non ancora implementato nel middleware'
            };
        }
        
        // 2. Cerca match simile
        const similarMatch = this.findSimilarMatch(userInput);
        if (similarMatch) {
            return {
                handled: false,
                matchFound: true,
                match: similarMatch,
                reason: 'Match simile trovato - richiede interpretazione AI',
                suggestion: `Forse intendevi: "${similarMatch.pattern}"?`
            };
        }
        
        // 3. Nessun match - fallback al middleware originale con contesto migliorato
        return await this.processUnmatchedRequest(userInput);
    }
    
    /**
     * Risolve i nomi clienti attraverso gli alias
     */
    async resolveClientNames(params) {
        const resolved = { ...params };
        
        // Risolvi nome cliente se presente
        if (params.cliente) {
            const resolution = await this.aliasResolver.resolveClientName(params.cliente);
            if (resolution.found) {
                console.log(`🔗 Cliente risolto: "${params.cliente}" → "${resolution.resolved}"`);
                resolved.cliente = resolution.resolved;
                resolved._originalCliente = params.cliente;
                resolved._clientResolution = resolution;
            } else {
                console.log(`❌ Cliente non risolto: "${params.cliente}"`);
                resolved._clientResolution = resolution;
            }
        }
        
        // Risolvi cliente_a per percorsi
        if (params.cliente_a) {
            const resolution = await this.aliasResolver.resolveClientName(params.cliente_a);
            if (resolution.found) {
                resolved.cliente_a = resolution.resolved;
                resolved._originalClienteA = params.cliente_a;
            }
        }
        
        // Risolvi cliente_b per percorsi
        if (params.cliente_b) {
            const resolution = await this.aliasResolver.resolveClientName(params.cliente_b);
            if (resolution.found) {
                resolved.cliente_b = resolution.resolved;
                resolved._originalClienteB = params.cliente_b;
            }
        }
        
        return resolved;
    }
    
    /**
     * Adatta i parametri estratti al formato del middleware esistente
     */
    async adaptParamsForMiddleware(requestType, params) {
        // Prima risolvi i nomi clienti
        const resolvedParams = await this.resolveClientNames(params);
        
        const adapted = {};
        
        switch (requestType) {
            case 'fatturato':
            case 'ordini':
            case 'data':
            case 'prodotti_ordine':
                adapted.cliente = resolvedParams.cliente;
                // Mantieni informazioni sulla risoluzione per il messaggio di risposta
                if (resolvedParams._clientResolution) {
                    adapted._clientResolution = resolvedParams._clientResolution;
                }
                break;
                
            case 'percorsi':
                adapted.da = resolvedParams.cliente_a;
                adapted.a = resolvedParams.cliente_b;
                if (resolvedParams._originalClienteA) {
                    adapted._originalDa = resolvedParams._originalClienteA;
                }
                if (resolvedParams._originalClienteB) {
                    adapted._originalA = resolvedParams._originalClienteB;
                }
                break;
                
            case 'clienti':
                adapted.zona = resolvedParams.zona;
                break;
        }
        
        return adapted;
    }
    
    /**
     * Gestisce comandi timeline attraverso TimelineIntelligentManager
     */
    async handleTimelineCommand(params, originalInput) {
        try {
            console.log('📅 Gestione comando timeline:', params);
            
            // Risolvi nome cliente se presente
            if (params.cliente) {
                const resolution = await this.aliasResolver.resolveClientName(params.cliente);
                if (resolution.found) {
                    params.cliente = resolution.resolved;
                    console.log(`🔗 Cliente risolto per timeline: "${params.cliente}" → "${resolution.resolved}"`);
                }
            }
            
            // Delega al TimelineIntelligentManager
            const result = await this.timelineManager.insertAppointmentFromCommand(params);
            
            if (result.success) {
                return {
                    handled: true,
                    response: result.message,
                    data: result.appointment,
                    type: 'timeline',
                    matchType: 'exact'
                };
            } else {
                // Se richiede input aggiuntivo, gestisci di conseguenza
                if (result.needsInput) {
                    return {
                        handled: false,
                        needsInput: result.needsInput,
                        partialSuccess: true,
                        message: result.message
                    };
                }
                
                // Se ha alternative per conflitti
                if (result.conflict && result.alternatives) {
                    return {
                        handled: false,
                        conflict: true,
                        alternatives: result.alternatives,
                        message: result.message
                    };
                }
                
                // Altri errori
                return {
                    handled: false,
                    reason: result.message
                };
            }
            
        } catch (error) {
            console.error('❌ Errore gestione comando timeline:', error);
            return {
                handled: false,
                reason: 'Errore gestione comando timeline'
            };
        }
    }
    
    /**
     * Processa richieste senza match nel vocabolario
     * Fornisce contesto migliore per l'AI
     */
    async processUnmatchedRequest(userInput) {
        try {
            console.log('🔄 VOCABOLARIO: Processando richiesta senza match specifico');
            
            // Analizza la richiesta per determinare il tipo di dati necessari
            const inputLower = userInput.toLowerCase();
            let needsOrders = false;
            let needsProducts = false;
            let clientName = null;
            
            // Rileva se è una richiesta sugli ordini
            if (inputLower.includes('ordini') || inputLower.includes('ordine') || 
                inputLower.includes('prodotti') || inputLower.includes('composto') ||
                inputLower.includes('storico') || inputLower.includes('acquisti')) {
                needsOrders = true;
            }
            
            // Rileva se è una richiesta sui prodotti
            if (inputLower.includes('prodotti') || inputLower.includes('prodotto') ||
                inputLower.includes('composto') || inputLower.includes('contiene')) {
                needsProducts = true;
            }
            
            // Estrae nome cliente dalla richiesta
            const clientMatch = userInput.match(/(?:cliente|ordine.*cliente|del.*cliente|da.*cliente|di.*cliente)[\s:]*([^?]+?)(?:\?|$)/i);
            if (clientMatch) {
                clientName = clientMatch[1].trim();
                console.log('🔍 VOCABOLARIO: Cliente rilevato dalla richiesta:', clientName);
                
                // Risolvi nome cliente attraverso alias
                const resolution = await this.aliasResolver.resolveClientName(clientName);
                if (resolution.found) {
                    clientName = resolution.resolved;
                    console.log('🔗 VOCABOLARIO: Cliente risolto:', clientName);
                }
            }
            
            // Se è una richiesta sugli ordini con cliente specifico,
            // usa il RequestMiddleware direttamente con parametri
            if (needsOrders && clientName) {
                console.log('📋 VOCABOLARIO: Delegando al RequestMiddleware con cliente specifico:', clientName);
                
                // Simula una richiesta di ordini per il cliente specifico
                const simulatedRequest = `ordini cliente ${clientName}`;
                return await this.requestMiddleware.processRequest(simulatedRequest);
            }
            
            // Fallback al middleware originale
            console.log('🔄 VOCABOLARIO: Fallback al RequestMiddleware standard');
            return await this.requestMiddleware.processRequest(userInput);
            
        } catch (error) {
            console.error('❌ VOCABOLARIO: Errore processamento richiesta senza match:', error);
            // Fallback sicuro
            return await this.requestMiddleware.processRequest(userInput);
        }
    }
}

// Export globale
window.VocabolarioMiddleware = VocabolarioMiddleware;

console.log('📋 VocabolarioMiddleware module loaded');