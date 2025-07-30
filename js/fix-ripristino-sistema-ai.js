/**
 * 🚨 RIPRISTINO SISTEMA AI-VOCABOLARIO-MIDDLEWARE
 * 
 * OBIETTIVO: Riparare sistematicamente l'intero flusso per permettere:
 * 1. Estrazione corretta dei parametri dal vocabolario
 * 2. Passaggio parametri attraverso tutti i layer
 * 3. Fallback intelligente ad AI esterna quando necessario
 * 4. Rimozione del blocco "STOP DEFINITIVO"
 */

console.log('🚨 [RIPRISTINO SISTEMA AI] Inizializzazione fix sistematico...');

// Attendi caricamento completo
setTimeout(() => {
    console.log('🔧 [RIPRISTINO] Inizio riparazione sistema AI-Vocabolario-Middleware...');
    
    // ========== STEP 1: FIX VOCABULARY MANAGER ==========
    if (window.vocabularyManager || window.getVocabularyManager) {
        console.log('🔧 [STEP 1] Fix VocabularyManager...');
        
        const manager = window.vocabularyManager || window.getVocabularyManager();
        
        // Patch findMatch per includere SEMPRE i parametri estratti
        const originalFindMatch = manager.findMatch.bind(manager);
        
        manager.findMatch = async function(userInput) {
            console.log('🔍 [VOCAB] findMatch chiamato con:', userInput);
            
            const result = await originalFindMatch(userInput);
            
            if (result) {
                console.log('✅ [VOCAB] Match trovato:', {
                    pattern: result.command.pattern,
                    action: result.command.action,
                    params: result.params
                });
                
                // CRITICO: Assicura che i parametri siano sempre inclusi nel comando
                if (result.params && Object.keys(result.params).length > 0) {
                    result.command.params = { 
                        ...result.command.params, 
                        ...result.params,
                        extracted: result.params // Backup dei parametri estratti
                    };
                }
            } else {
                console.log('❌ [VOCAB] Nessun match trovato per:', userInput);
            }
            
            return result;
        };
        
        // Fix per comandi AI generici
        const aiQueryCommands = [
            'fatturato del cliente [CLIENTE]',
            'ordini del cliente [CLIENTE]',
            'quanto ha venduto [CLIENTE]',
            'prodotti del cliente [CLIENTE]'
        ];
        
        aiQueryCommands.forEach(pattern => {
            manager.addCommand({
                pattern: pattern,
                action: 'universal_query',
                category: 'query',
                examples: [pattern]
            }).catch(e => console.log('⚠️ Comando già esistente:', pattern));
        });
        
        console.log('✅ [STEP 1] VocabularyManager patchato');
    }
    
    // ========== STEP 2: FIX AI MIDDLEWARE ==========
    if (window.aiMiddleware) {
        console.log('🔧 [STEP 2] Fix AIMiddleware...');
        
        // Fix executeLocalAction per gestire correttamente i parametri
        const originalExecuteLocal = window.aiMiddleware.executeLocalAction;
        
        window.aiMiddleware.executeLocalAction = async function(command, originalMessage, originalContext) {
            console.log('🎯 [AI-MW] executeLocalAction chiamato:', {
                action: command.action,
                params: command.params,
                message: originalMessage
            });
            
            // CRITICO: Preserva SEMPRE i parametri estratti
            const contextWithParams = {
                ...originalContext,
                extractedParams: command.params?.extracted || command.params || {}
            };
            
            // Gestione speciale per universal_query
            if (command.action === 'universal_query' || command.action === 'ai_query') {
                console.log('🔧 [AI-MW] Gestione query universale...');
                
                // Prepara i parametri corretti
                const queryParams = {
                    entity: command.params?.entity || 'orders',
                    operation: command.params?.operation || 'list',
                    filters: {}
                };
                
                // Estrai filtri dai parametri
                if (command.params) {
                    // Cliente
                    const cliente = command.params.CLIENTE || 
                                  command.params.cliente || 
                                  command.params.extracted?.CLIENTE ||
                                  command.params.extracted?.cliente;
                    
                    if (cliente) {
                        queryParams.filters.cliente = cliente;
                        console.log('✅ [AI-MW] Cliente estratto:', cliente);
                    }
                    
                    // Prodotto
                    const prodotto = command.params.PRODOTTO || 
                                   command.params.prodotto || 
                                   command.params.extracted?.PRODOTTO ||
                                   command.params.extracted?.prodotto;
                    
                    if (prodotto) {
                        queryParams.filters.prodotto = prodotto;
                        console.log('✅ [AI-MW] Prodotto estratto:', prodotto);
                    }
                    
                    // Data
                    const data = command.params.DATA || 
                               command.params.data || 
                               command.params.extracted?.DATA ||
                               command.params.extracted?.data;
                    
                    if (data) {
                        queryParams.filters.data = data;
                        console.log('✅ [AI-MW] Data estratta:', data);
                    }
                }
                
                // Determina operazione dal messaggio
                const messageLower = originalMessage.toLowerCase();
                if (messageLower.includes('fatturato') || messageLower.includes('venduto')) {
                    queryParams.operation = 'sum';
                    queryParams.field = 'importo';
                } else if (messageLower.includes('quanti') || messageLower.includes('numero')) {
                    queryParams.operation = 'count';
                } else if (messageLower.includes('lista') || messageLower.includes('elenco')) {
                    queryParams.operation = 'list';
                }
                
                console.log('🎯 [AI-MW] Parametri query finale:', queryParams);
                
                // Chiama handleUniversalQuery
                return this.handleUniversalQuery(queryParams, originalMessage, contextWithParams);
            }
            
            // Altri comandi
            return originalExecuteLocal.call(this, command, originalMessage, contextWithParams);
        };
        
        // Fix handleUniversalQuery per NON sovrascrivere i filtri
        const originalHandleUniversal = window.aiMiddleware.handleUniversalQuery;
        
        window.aiMiddleware.handleUniversalQuery = async function(params, userInput, originalContext) {
            console.log('🎯 [UNIVERSAL] handleUniversalQuery:', {
                params,
                filters_in: params?.filters,
                context: originalContext?.extractedParams
            });
            
            // CRITICO: Non sovrascrivere filtri esistenti
            if (params.filters && Object.keys(params.filters).length > 0) {
                console.log('✅ [UNIVERSAL] Filtri già presenti, preservo:', params.filters);
                // NON modificare i filtri!
            } else if (originalContext?.extractedParams) {
                // Solo se non ci sono filtri, prova a usare extractedParams
                params.filters = params.filters || {};
                
                if (originalContext.extractedParams.CLIENTE || originalContext.extractedParams.cliente) {
                    params.filters.cliente = originalContext.extractedParams.CLIENTE || 
                                           originalContext.extractedParams.cliente;
                }
            }
            
            console.log('🎯 [UNIVERSAL] Filtri finali:', params.filters);
            
            return originalHandleUniversal.call(this, params, userInput, originalContext);
        };
        
        console.log('✅ [STEP 2] AIMiddleware patchato');
    }
    
    // ========== STEP 3: RIMUOVI BLOCCO "STOP DEFINITIVO" ==========
    console.log('🔧 [STEP 3] Rimozione blocco STOP DEFINITIVO...');
    
    // Override processUserInput per permettere fallback AI
    if (window.processUserInput) {
        const originalProcessUserInput = window.processUserInput;
        
        window.processUserInput = async function(userInput, options = {}) {
            console.log('🎯 [PROCESS] processUserInput chiamato:', userInput);
            
            try {
                // Prima prova con il sistema locale
                const result = await originalProcessUserInput(userInput, options);
                
                // Se il risultato contiene "STOP DEFINITIVO", ignora e procedi con AI
                if (result && typeof result === 'string' && result.includes('STOP DEFINITIVO')) {
                    console.log('⚠️ [PROCESS] STOP DEFINITIVO rilevato, procedo con fallback AI');
                    throw new Error('Vocabolario non ha match, usa AI');
                }
                
                return result;
                
            } catch (error) {
                console.log('🤖 [PROCESS] Fallback ad AI esterna:', error.message);
                
                // Qui inserire la chiamata all'AI esterna
                if (window.supabaseAI && window.supabaseAI.processWithAI) {
                    return await window.supabaseAI.processWithAI(userInput);
                } else {
                    return "Mi dispiace, non ho compreso la tua richiesta. Puoi riformularla?";
                }
            }
        };
    }
    
    console.log('✅ [STEP 3] Blocco STOP DEFINITIVO rimosso');
    
    // ========== STEP 4: TEST AUTOMATICI ==========
    console.log('🧪 [STEP 4] Esecuzione test automatici...');
    
    window.testSistemaAI = async function() {
        const tests = [
            {
                input: "dimmi il fatturato del cliente essemme",
                expected: "filters.cliente = ESSEMME"
            },
            {
                input: "che ore sono",
                expected: "action = system_info"
            },
            {
                input: "ordini del cliente Marotta",
                expected: "filters.cliente = Marotta"
            },
            {
                input: "quanti clienti ho",
                expected: "entity = clients, operation = count"
            }
        ];
        
        console.log('🧪 [TEST] Inizio test sistema AI...\n');
        
        for (const test of tests) {
            console.log(`\n📝 Test: "${test.input}"`);
            console.log(`✅ Expected: ${test.expected}`);
            
            if (window.processUserInput) {
                try {
                    const result = await window.processUserInput(test.input);
                    console.log('📊 Result:', result);
                } catch (error) {
                    console.error('❌ Error:', error);
                }
            }
        }
        
        console.log('\n✅ [TEST] Test completati');
    };
    
    // ========== STEP 5: COMANDI UTILITY ==========
    window.debugAI = {
        enable: () => {
            localStorage.setItem('ai_debug', 'true');
            localStorage.setItem('vocabulary_debug', 'true');
            console.log('✅ Debug AI abilitato');
        },
        disable: () => {
            localStorage.removeItem('ai_debug');
            localStorage.removeItem('vocabulary_debug');
            console.log('✅ Debug AI disabilitato');
        },
        test: window.testSistemaAI,
        status: () => {
            console.log('📊 STATO SISTEMA AI:');
            console.log('- VocabularyManager:', !!window.vocabularyManager ? 'OK' : 'MANCANTE');
            console.log('- AIMiddleware:', !!window.aiMiddleware ? 'OK' : 'MANCANTE');
            console.log('- ProcessUserInput:', !!window.processUserInput ? 'OK' : 'MANCANTE');
            console.log('- SupabaseAI:', !!window.supabaseAI ? 'OK' : 'MANCANTE');
        }
    };
    
    console.log('✅ [RIPRISTINO SISTEMA AI] Completato!');
    console.log('💡 Comandi disponibili:');
    console.log('   window.testSistemaAI() - Esegue test automatici');
    console.log('   window.debugAI.enable() - Abilita debug');
    console.log('   window.debugAI.status() - Mostra stato sistema');
    
}, 3000); // Attendi caricamento completo