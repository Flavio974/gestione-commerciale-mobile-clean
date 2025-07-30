/**
 * FIX CRITICO: Filtri Cliente Non Funzionanti
 * 
 * PROBLEMA IDENTIFICATO:
 * In ai-middleware.js linea 717, il codice tenta di ri-estrarre il cliente
 * anche quando i filtri contengono già il valore corretto da fix-ai-query-support.js
 * 
 * FLUSSO BUG:
 * 1. fix-ai-query-support.js: Crea correttamente filters: {cliente: "Marotta"}
 * 2. ai-middleware.js: Riceve i filtri ma li sovrascrive tentando di ri-estrarre
 * 3. ClientExtractor: Non trova nulla perché cerca nel formato sbagliato
 * 4. RISULTATO: filters vengono azzerati = {cliente: undefined} = {}
 */

console.log('🚨 [FIX FILTRI CLIENTE] Applicazione fix critico...');

setTimeout(() => {
    if (!window.aiMiddleware) {
        console.error('❌ AIMiddleware non trovato, riprovo tra 2 secondi...');
        setTimeout(arguments.callee, 2000);
        return;
    }
    
    console.log('🔧 [FIX FILTRI] Patching handleUniversalQuery...');
    
    // Salva metodo originale
    const originalHandleUniversalQuery = window.aiMiddleware.handleUniversalQuery;
    
    // Override con fix
    window.aiMiddleware.handleUniversalQuery = async function(params, userInput, originalContext) {
        console.log('🎯 [FIX FILTRI] handleUniversalQuery chiamato con:', {
            params,
            filters_ricevuti: params?.filters,
            userInput
        });
        
        // Clona params per evitare modifiche accidentali
        const fixedParams = JSON.parse(JSON.stringify(params));
        
        // FIX CRITICO: Preserva i filtri esistenti
        if (fixedParams.filters && Object.keys(fixedParams.filters).length > 0) {
            console.log('✅ [FIX FILTRI] Filtri già presenti, preservo:', fixedParams.filters);
            
            // Non tentare di ri-estrarre se abbiamo già un valore valido
            if (fixedParams.filters.cliente && fixedParams.filters.cliente !== '{cliente}') {
                console.log('✅ [FIX FILTRI] Cliente già specificato:', fixedParams.filters.cliente);
                // NON FARE NULLA - mantieni il filtro esistente
            }
        } else {
            console.log('⚠️ [FIX FILTRI] Nessun filtro presente, tentativo estrazione...');
            
            // Solo se non ci sono filtri, prova a estrarre
            const filters = fixedParams.filters || {};
            
            // Estrai cliente solo se mancante
            if (!filters.cliente) {
                const clientName = window.ClientExtractor?.extract(params, userInput, originalContext);
                if (clientName) {
                    filters.cliente = clientName;
                    console.log('🔍 [FIX FILTRI] Cliente estratto:', clientName);
                }
            }
            
            fixedParams.filters = filters;
        }
        
        console.log('🎯 [FIX FILTRI] Parametri finali per query:', {
            entity: fixedParams.entity,
            operation: fixedParams.operation,
            filters: fixedParams.filters
        });
        
        // Chiama il metodo originale con i parametri corretti
        return originalHandleUniversalQuery.call(this, fixedParams, userInput, originalContext);
    };
    
    console.log('✅ [FIX FILTRI] handleUniversalQuery patchato con successo');
    
    // PATCH AGGIUNTIVO: Fix anche per OrdersQueryHandler.handle
    if (window.OrdersQueryHandler && window.OrdersQueryHandler.prototype) {
        console.log('🔧 [FIX FILTRI] Patching OrdersQueryHandler.handle...');
        
        const originalHandle = window.OrdersQueryHandler.prototype.handle;
        
        window.OrdersQueryHandler.prototype.handle = async function(operation, filters, options = {}) {
            console.log('🎯 [ORDERS HANDLER] Parametri ricevuti:', {
                operation,
                filters,
                filters_keys: Object.keys(filters || {}),
                options
            });
            
            // IMPORTANTE: Assicurati che this.params sia impostato PRIMA di tutto
            this.params = { operation, filters, options };
            
            // Log dettagliato dei filtri
            if (filters && Object.keys(filters).length > 0) {
                console.log('✅ [ORDERS HANDLER] Filtri attivi:', filters);
                
                if (filters.cliente) {
                    console.log('🎯 [ORDERS HANDLER] Filtro cliente attivo:', filters.cliente);
                }
            } else {
                console.log('⚠️ [ORDERS HANDLER] Nessun filtro ricevuto');
            }
            
            // Chiama il metodo originale
            return originalHandle.call(this, operation, filters, options);
        };
        
        console.log('✅ [FIX FILTRI] OrdersQueryHandler.handle patchato');
    }
    
    // TEST FUNCTION per debug rapido
    window.testFiltriCliente = function(nomeCliente = 'Marotta') {
        console.log(`\n🧪 [TEST FILTRI] Simulazione query per cliente: ${nomeCliente}`);
        
        const testParams = {
            entity: 'orders',
            operation: 'sum',
            field: 'importo',
            filters: { cliente: nomeCliente }
        };
        
        console.log('🧪 [TEST] Parametri inviati:', testParams);
        
        if (window.aiMiddleware && window.aiMiddleware.handleUniversalQuery) {
            window.aiMiddleware.handleUniversalQuery(
                testParams,
                `dimmi il fatturato del cliente ${nomeCliente}`,
                { extractedParams: { cliente: nomeCliente } }
            ).then(result => {
                console.log('✅ [TEST] Risultato:', result);
            }).catch(error => {
                console.error('❌ [TEST] Errore:', error);
            });
        } else {
            console.error('❌ [TEST] AIMiddleware non disponibile');
        }
    };
    
    console.log('✅ [FIX FILTRI CLIENTE] Fix applicato con successo!');
    console.log('💡 Comandi di test disponibili:');
    console.log('   window.testFiltriCliente("Marotta")');
    console.log('   window.testFiltriCliente("ESSEMME")');
    
}, 3000); // Aspetta 3 secondi per caricamento completo