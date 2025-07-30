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
                
                // --- Sanitizzazione del messaggio ---
                let message = originalMessage
                  .replace(/[\"“”]/g, '')   // rimuove qualsiasi tipo di virgolette
                  .replace(/\s+/g, ' ')     // riduce qualsiasi sequenza di spazi a uno solo
                  .trim()                   // elimina spazi all’inizio e alla fine
                  .toLowerCase();           // tutto in minuscolo
                console.log('[DEBUG] message pulito:', message);
                // ------------------------------------
                
                const transformedCommand = { ...command };
                
                // Analizza il messaggio e determina l'azione corretta
                if (message.includes('che giorno') || message.includes('che ora') || message.includes('oggi')) {
                    transformedCommand.action = 'system_info';
                    transformedCommand.params = {
                        type: message.includes('ora') ? 'time' : 'date'
                    };
                } else if (message.includes('fatturato') || message.includes('venduto')) {
                    console.log('🔧 DEBUG ESTRAZIONE PARAMETRI:');
                    console.log('  - command:', command);
                    console.log('  - command.params:', command.params);
                    console.log('  - command.params.extracted:', command.params?.extracted);
                    
                    // Prepara i filtri dai parametri estratti
                    const filters = {};
                    console.log('🔧 PARAMS COMPLETI:', command.params);
                    
                    if (command.params) {
                        const cliente = command.params.CLIENTE || command.params.cliente || command.params.extracted?.CLIENTE || command.params.extracted?.cliente;
                        if (cliente) {
                            filters.cliente = cliente.toUpperCase();
                            console.log('🔧 CLIENTE TROVATO:', cliente);
                        }
                        const prodotto = command.params.PRODOTTO || command.params.prodotto || command.params.extracted?.PRODOTTO || command.params.extracted?.prodotto;
                        if (prodotto) {
                            filters.prodotto = prodotto.toUpperCase();
                            console.log('🔧 PRODOTTO TROVATO:', prodotto);
                        }
                        const data = command.params.DATA || command.params.data || command.params.extracted?.DATA || command.params.extracted?.data;
                        if (data) {
                            filters.data = data;
                            console.log('🔧 DATA TROVATA:', data);
                        }
                    }
                    console.log('🔧 FILTRI CREATI:', filters);
                    
                    transformedCommand.action = 'universal_query';
                    transformedCommand.params = {
                        entity: 'orders',
                        operation: 'sum',
                        field: 'importo',
                        filters: filters
                    };
                } else if (message.includes('ordini') && (message.includes('quanti') || message.includes('numero'))) {
                    transformedCommand.action = 'universal_query';
                    transformedCommand.params = { entity: 'orders', operation: 'count', filters: {} };
                    if (originalContext?.extractedParams?.cliente) {
                        transformedCommand.params.filters.cliente = originalContext.extractedParams.cliente;
                    }
                } else if (message.includes('clienti') && (message.includes('quanti') || message.includes('numero'))) {
                    transformedCommand.action = 'universal_query';
                    transformedCommand.params = { entity: 'clients', operation: 'count', filters: {} };
                } else {
                    transformedCommand.action = 'universal_query';
                    transformedCommand.params = { entity: 'orders', operation: 'list', filters: {} };
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
        
        // Aggiungi handler handleAiQuery se mancante
        if (window.aiMiddleware.handleAiQuery === undefined) {
            window.aiMiddleware.handleAiQuery = async function(params, userInput, originalContext) {
                console.log('🔧 handleAiQuery chiamato, redirigo a universal_query');
                
                const msg = userInput
                  .replace(/[\"“”]/g, '')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .toLowerCase();
                
                const newParams = { entity: 'orders', operation: 'list', filters: {} };
                if (msg.includes('fatturato') || msg.includes('venduto')) {
                    newParams.operation = 'sum';
                    newParams.field = 'importo';
                } else if (msg.includes('quanti') || msg.includes('numero')) {
                    newParams.operation = 'count';
                } else if (msg.includes('clienti')) {
                    newParams.entity = 'clients';
                }
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
}, 3000);

console.log('🔧 Fix ai_query support schedulato');
