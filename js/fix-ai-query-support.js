// Fix immediato per supportare action 'ai_query'
console.log('🔧 FIX AI_QUERY SUPPORT - Aggiunta supporto per ai_query...');

// Attendi che tutti i componenti siano pronti
setTimeout(() => {
    console.log('🔧 Controllo componenti per fix ai_query...');
    
    if (window.aiMiddleware) {
        console.log('🔧 AIMiddleware trovato, applico patch...');
        
        // Salva il metodo originale
        const originalExecuteLocalAction = window.aiMiddleware.executeLocalAction;
        
        // Override con supporto per ai_query
        window.aiMiddleware.executeLocalAction = async function(command, originalMessage, originalContext) {
            console.log('🔧 FIX AI_QUERY - Intercettazione comando:', {
                action: command.action,
                message: originalMessage,
                extractedParams: originalContext?.extractedParams
            });
            
            // Se è ai_query, trasformalo
            if (command.action === 'ai_query') {
                console.log('🔧 Trasformazione ai_query in corso...');
                
                const message = originalMessage.toLowerCase();
                const transformedCommand = { ...command };
                
                // Analizza il messaggio e determina l'azione corretta
                if (message.includes('che giorno') || message.includes('che ora') || message.includes('oggi')) {
                    transformedCommand.action = 'system_info';
                    transformedCommand.params = {
                        type: message.includes('ora') ? 'time' : 'date'
                    };
                } else if (message.includes('fatturato') || message.includes('venduto')) {
    // Prepara i filtri dai parametri estratti
    const filters = {};
    
    // Se ci sono parametri estratti dal vocabolario, usali per i filtri
    if (command.params && command.params.extracted) {
        if (command.params.extracted.CLIENTE) {
            filters.cliente = command.params.extracted.CLIENTE.toUpperCase();
        }
        if (command.params.extracted.PRODOTTO) {
            filters.prodotto = command.params.extracted.PRODOTTO.toUpperCase();
        }
        if (command.params.extracted.DATA) {
            filters.data = command.params.extracted.DATA;
        }
    }
    
    transformedCommand.action = 'universal_query';
    transformedCommand.params = {
        entity: 'orders',
        operation: 'sum',
        field: 'importo',
        filters: filters  // Ora passa i filtri estratti!
    };
                    if (originalContext?.extractedParams?.cliente) {
                        transformedCommand.params.filters.cliente = originalContext.extractedParams.cliente;
                    }
                } else if (message.includes('ordini') && (message.includes('quanti') || message.includes('numero'))) {
                    transformedCommand.action = 'universal_query';
                    transformedCommand.params = {
                        entity: 'orders',
                        operation: 'count',
                        filters: {}
                    };
                    if (originalContext?.extractedParams?.cliente) {
                        transformedCommand.params.filters.cliente = originalContext.extractedParams.cliente;
                    }
                } else if (message.includes('clienti') && (message.includes('quanti') || message.includes('numero'))) {
                    transformedCommand.action = 'universal_query';
                    transformedCommand.params = {
                        entity: 'clients',
                        operation: 'count',
                        filters: {}
                    };
                } else {
                    // Default: lista ordini
                    transformedCommand.action = 'universal_query';
                    transformedCommand.params = {
                        entity: 'orders',
                        operation: 'list',
                        filters: {}
                    };
                    if (originalContext?.extractedParams?.cliente) {
                        transformedCommand.params.filters.cliente = originalContext.extractedParams.cliente;
                    }
                }
                
                console.log('🔧 Comando trasformato:', transformedCommand);
                console.log('🔧 FILTRI NEL COMANDO TRASFORMATO:', transformedCommand.params.filters);
                
                // Usa il comando trasformato
                return originalExecuteLocalAction.call(this, transformedCommand, originalMessage, originalContext);
            }
            
            // Altrimenti procedi normalmente
            return originalExecuteLocalAction.call(this, command, originalMessage, originalContext);
        };
        
        console.log('✅ FIX AI_QUERY applicato con successo!');
        
        // Aggiungi anche un handler diretto nel middleware
        if (window.aiMiddleware.handleAiQuery === undefined) {
            window.aiMiddleware.handleAiQuery = async function(params, userInput, originalContext) {
                console.log('🔧 handleAiQuery chiamato, redirigo a universal_query');
                
                // Trasforma in universal_query
                const newParams = {
                    entity: 'orders',
                    operation: 'list',
                    filters: {}
                };
                
                // Analizza il messaggio
                const message = userInput.toLowerCase();
                if (message.includes('fatturato')) {
                    newParams.operation = 'sum';
                    newParams.field = 'importo';
                } else if (message.includes('quanti')) {
                    newParams.operation = 'count';
                } else if (message.includes('clienti')) {
                    newParams.entity = 'clients';
                }
                
                // Aggiungi filtri se presenti
                if (originalContext?.extractedParams?.cliente) {
                    newParams.filters.cliente = originalContext.extractedParams.cliente;
                }
                
                return this.handleUniversalQuery(newParams, userInput, originalContext);
            };
            
            console.log('✅ handleAiQuery aggiunto al middleware');
        }
        
    } else {
        console.error('❌ AIMiddleware non trovato!');
    }
    
}, 3000); // Aspetta 3 secondi per essere sicuri che tutto sia caricato

console.log('🔧 Fix ai_query support schedulato');