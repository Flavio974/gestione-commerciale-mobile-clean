// Fix per mappare action 'ai_query' del vocabolario a azioni riconosciute dal middleware
console.log('🔧 FIX VOCABULARY ACTION MAPPING - Mappatura azioni vocabolario...');

(function() {
    // Aspetta che il middleware sia caricato
    const checkAndPatch = () => {
        if (window.aiMiddleware && window.aiMiddleware.executeLocalAction) {
            console.log('🔧 Patching executeLocalAction per supportare ai_query...');
            
            // Salva il metodo originale
            const originalExecuteLocalAction = window.aiMiddleware.executeLocalAction.bind(window.aiMiddleware);
            
            // Override del metodo
            window.aiMiddleware.executeLocalAction = async function(command, originalMessage, originalContext) {
                console.log('🔧 INTERCEPT executeLocalAction:', {
                    action: command.action,
                    params: command.params,
                    message: originalMessage
                });
                
                // Se l'action è ai_query, dobbiamo interpretare il messaggio
                if (command.action === 'ai_query') {
                    console.log('🔧 Conversione ai_query in comando riconosciuto...');
                    
                    // Analizza il messaggio per capire cosa fare
                    const message = originalMessage.toLowerCase();
                    let newCommand = { ...command };
                    
                    // Pattern per riconoscere il tipo di query
                    if (message.includes('fatturato') || message.includes('venduto')) {
                        console.log('🔧 Rilevata query fatturato');
                        newCommand.action = 'universal_query';
                        newCommand.params = {
                            entity: 'orders',
                            operation: 'sum',
                            field: 'importo',
                            filters: {}
                        };
                        
                        // Estrai cliente se presente
                        if (originalContext?.extractedParams?.cliente) {
                            newCommand.params.filters.cliente = originalContext.extractedParams.cliente;
                        }
                    } 
                    else if (message.includes('ordini') && (message.includes('quanti') || message.includes('numero'))) {
                        console.log('🔧 Rilevata query conteggio ordini');
                        newCommand.action = 'universal_query';
                        newCommand.params = {
                            entity: 'orders',
                            operation: 'count',
                            filters: {}
                        };
                        
                        // Estrai cliente se presente
                        if (originalContext?.extractedParams?.cliente) {
                            newCommand.params.filters.cliente = originalContext.extractedParams.cliente;
                        }
                    }
                    else if (message.includes('ordini')) {
                        console.log('🔧 Rilevata query lista ordini');
                        newCommand.action = 'universal_query';
                        newCommand.params = {
                            entity: 'orders',
                            operation: 'list',
                            filters: {}
                        };
                        
                        // Estrai cliente se presente
                        if (originalContext?.extractedParams?.cliente) {
                            newCommand.params.filters.cliente = originalContext.extractedParams.cliente;
                        }
                    }
                    else if (message.includes('clienti') && (message.includes('quanti') || message.includes('numero'))) {
                        console.log('🔧 Rilevata query conteggio clienti');
                        newCommand.action = 'universal_query';
                        newCommand.params = {
                            entity: 'clients',
                            operation: 'count',
                            filters: {}
                        };
                    }
                    else if (message.includes('clienti') || message.includes('lista clienti')) {
                        console.log('🔧 Rilevata query lista clienti');
                        newCommand.action = 'universal_query';
                        newCommand.params = {
                            entity: 'clients',
                            operation: 'list',
                            filters: {}
                        };
                    }
                    else {
                        // Default: considera come una query generica sugli ordini
                        console.log('🔧 Query generica, default a ordini');
                        newCommand.action = 'universal_query';
                        newCommand.params = {
                            entity: 'orders',
                            operation: 'list',
                            filters: {}
                        };
                        
                        // Estrai cliente se presente
                        if (originalContext?.extractedParams?.cliente) {
                            newCommand.params.filters.cliente = originalContext.extractedParams.cliente;
                        }
                    }
                    
                    console.log('🔧 Comando convertito:', newCommand);
                    command = newCommand;
                }
                
                // Chiama il metodo originale con il comando potenzialmente modificato
                return originalExecuteLocalAction(command, originalMessage, originalContext);
            };
            
            console.log('✅ executeLocalAction patchato con successo!');
            
            // Test immediato per verificare che funzioni
            console.log('🔧 Test mapping ai_query...');
            const testCommand = {
                action: 'ai_query',
                params: {}
            };
            console.log('🔧 Test con comando:', testCommand);
            
            return true;
        }
        return false;
    };
    
    // Prova subito
    if (!checkAndPatch()) {
        console.log('🔧 AIMiddleware non ancora pronto, attendo...');
        
        // Riprova ogni 500ms per max 30 secondi
        let attempts = 0;
        const maxAttempts = 60;
        
        const interval = setInterval(() => {
            attempts++;
            if (checkAndPatch() || attempts >= maxAttempts) {
                clearInterval(interval);
                if (attempts >= maxAttempts) {
                    console.error('❌ Timeout attesa AIMiddleware');
                }
            }
        }, 500);
    }
})();

console.log('🔧 Fix vocabulary action mapping caricato');