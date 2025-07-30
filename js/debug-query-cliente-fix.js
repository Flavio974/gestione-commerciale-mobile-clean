/**
 * DEBUG E FIX DEFINITIVO - Query Fatturato Cliente 
 * 
 * PROBLEMI IDENTIFICATI E SOLUZIONI:
 * 
 * 1. DISCREPANZA CONTEGGIO ORDINI (100-102 vs 11 reali):
 *    - CAUSA: Sistema usa dati di test quando Supabase fallisce
 *    - DATI TEST: generateTestOrderData() crea solo 5 ordini (linee 610-678)
 *    - DATI REALI: 11 ordini nel database, 182 clienti
 *    - SOLUZIONE: Implementata distinzione tra dati reali e test
 * 
 * 2. QUERY CLIENTE "ESSEMME" NON TROVA RISULTATI:
 *    - CAUSA: Logica di matching clientNamesMatch troppo restrittiva
 *    - PROBLEMA: richiede match di parole > 2 caratteri
 *    - "ESSEMME" vs "ESSEMME SRL" non matcha per filtro lunghezza
 *    - SOLUZIONE: Fix logica di matching per nomi corti
 * 
 * 3. STRUTTURA DATI INCONSISTENTE:
 *    - Campo cliente: item.cliente (corretto)
 *    - Test data contiene: 'ESSEMME SRL' alla linea 655
 *    - Query cerca: 'ESSEMME' (senza SRL)
 *    - SOLUZIONE: Miglioramento matching parziale
 */

console.log('🔧 [DEBUG QUERY CLIENTE] Caricamento fix...');

// Attendi caricamento sistema
setTimeout(() => {
    console.log('🔧 [DEBUG QUERY CLIENTE] Applicazione fix...');
    
    // 1. FIX LOGICA MATCHING CLIENTI
    if (window.BaseQueryHandler && window.BaseQueryHandler.prototype) {
        console.log('🔧 Patching clientNamesMatch...');
        
        // Salva metodo originale
        const originalClientNamesMatch = window.BaseQueryHandler.prototype.clientNamesMatch;
        
        // Override con logica migliorata
        window.BaseQueryHandler.prototype.clientNamesMatch = function(name1, name2) {
            if (!name1 || !name2) return false;
            
            console.log(`🔍 [MATCHING] Confronto: "${name1}" vs "${name2}"`);
            
            const normalize = str => str.toLowerCase().trim()
                .replace(/srl|spa|snc|sas|s\.r\.l\.|s\.p\.a\./gi, '') // Rimuove forme societarie
                .replace(/[^\w\s]/g, '') // Rimuove punteggiatura
                .replace(/\s+/g, ' ')    // Normalizza spazi
                .trim();
            
            const normalized1 = normalize(name1);
            const normalized2 = normalize(name2);
            
            console.log(`🔍 [MATCHING] Normalizzati: "${normalized1}" vs "${normalized2}"`);
            
            // 1. Match esatto
            if (normalized1 === normalized2) {
                console.log('✅ [MATCHING] Match esatto');
                return true;
            }
            
            // 2. Match parziale (uno contiene l'altro)
            if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
                console.log('✅ [MATCHING] Match parziale (contiene)');
                return true;
            }
            
            // 3. Match per parole significative (MIGLIORATO: accetta parole >= 2 caratteri)
            const words1 = normalized1.split(' ').filter(w => w.length >= 2); // RIDOTTO da 3 a 2
            const words2 = normalized2.split(' ').filter(w => w.length >= 2); // RIDOTTO da 3 a 2
            
            console.log(`🔍 [MATCHING] Parole: [${words1.join(', ')}] vs [${words2.join(', ')}]`);
            
            let matches = 0;
            for (const word1 of words1) {
                for (const word2 of words2) {
                    if (word1.includes(word2) || word2.includes(word1)) {
                        matches++;
                        console.log(`✅ [MATCHING] Parola match: "${word1}" ~ "${word2}"`);
                        break;
                    }
                }
            }
            
            // MIGLIORATO: Match se almeno 1 parola significativa corrisponde
            const threshold = Math.max(1, Math.min(words1.length, words2.length) / 2);
            const result = matches >= threshold;
            
            console.log(`🔍 [MATCHING] Risultato: ${matches}/${threshold} = ${result ? 'MATCH' : 'NO MATCH'}`);
            
            return result;
        };
        
        console.log('✅ clientNamesMatch patched');
    }
    
    // 2. FIX IDENTIFICAZIONE DATI REALI VS TEST
    if (window.SupabaseAIIntegration && window.SupabaseAIIntegration.prototype) {
        console.log('🔧 Patching getHistoricalOrders per identificare dati test...');
        
        const originalGetHistoricalOrders = window.SupabaseAIIntegration.prototype.getHistoricalOrders;
        
        window.SupabaseAIIntegration.prototype.getHistoricalOrders = async function() {
            try {
                const result = await originalGetHistoricalOrders.call(this);
                
                // Marca i dati come test se necessario
                if (result.isTestData || result.sampleData?.length === 5) {
                    console.log('⚠️ [DEBUG] Usando dati di test - 5 ordini fake');
                    result.isTestData = true;
                    result.realDataCount = 0;
                } else {
                    console.log(`✅ [DEBUG] Usando dati reali - ${result.sampleData?.length || 0} ordini`);
                    result.realDataCount = result.sampleData?.length || 0;
                }
                
                return result;
            } catch (error) {
                console.error('❌ [DEBUG] Errore getHistoricalOrders:', error);
                return originalGetHistoricalOrders.call(this);
            }
        };
        
        console.log('✅ getHistoricalOrders patched');
    }
    
    // 3. FIX DEBUG AVANZATO PER QUERY CLIENTE
    if (window.aiMiddleware && window.aiMiddleware.executeLocalAction) {
        console.log('🔧 Patching executeLocalAction per debug cliente...');
        
        const originalExecuteLocalAction = window.aiMiddleware.executeLocalAction;
        
        window.aiMiddleware.executeLocalAction = async function(...args) {
            const [command, originalMessage, originalContext] = args;
            
            // Debug speciale per query fatturato cliente
            if (command?.params?.filters?.cliente) {
                console.log('🎯 [DEBUG CLIENTE] Query rilevata:', {
                    cliente_richiesto: command.params.filters.cliente,
                    messaggio_originale: originalMessage,
                    filtri_completi: command.params.filters
                });
                
                // Verifica dati disponibili
                if (window.supabaseAI?.cache?.historicalOrders?.sampleData) {
                    const ordini = window.supabaseAI.cache.historicalOrders.sampleData;
                    const clientiUnici = [...new Set(ordini.map(o => o.cliente))].filter(Boolean);
                    
                    console.log('🎯 [DEBUG CLIENTE] Dati disponibili:', {
                        totale_ordini: ordini.length,
                        clienti_unici: clientiUnici,
                        ordini_con_cliente: ordini.filter(o => o.cliente).length
                    });
                    
                    // Test matching con cliente richiesto
                    const clienteRichiesto = command.params.filters.cliente;
                    const ordiniCliente = ordini.filter(o => {
                        if (!o.cliente) return false;
                        const match = this.clientNamesMatch ? 
                            this.clientNamesMatch(o.cliente, clienteRichiesto) :
                            o.cliente.toLowerCase().includes(clienteRichiesto.toLowerCase());
                        console.log(`🎯 [TEST MATCH] "${o.cliente}" vs "${clienteRichiesto}" = ${match}`);
                        return match;
                    });
                    
                    console.log('🎯 [DEBUG CLIENTE] Risultato filtro:', {
                        ordini_cliente: ordiniCliente.length,
                        dettagli: ordiniCliente.map(o => ({
                            numero: o.numero_ordine,
                            cliente: o.cliente,
                            importo: o.importo
                        }))
                    });
                }
            }
            
            return originalExecuteLocalAction.apply(this, args);
        };
        
        console.log('✅ executeLocalAction patched per debug');
    }
    
    // 4. COMANDO TEST RAPIDO
    window.testQueryCliente = function(nomeCliente = 'ESSEMME') {
        console.log(`🧪 [TEST] Testando query per cliente: ${nomeCliente}`);
        
        if (!window.supabaseAI?.cache?.historicalOrders?.sampleData) {
            console.error('❌ [TEST] Dati non disponibili');
            return;
        }
        
        const ordini = window.supabaseAI.cache.historicalOrders.sampleData;
        const handler = new window.OrdersQueryHandler(window.supabaseAI);
        
        console.log(`🧪 [TEST] Totale ordini: ${ordini.length}`);
        
        const ordiniCliente = ordini.filter(o => 
            o.cliente && handler.clientNamesMatch(o.cliente, nomeCliente)
        );
        
        console.log(`🧪 [TEST] Ordini per ${nomeCliente}:`, ordiniCliente.length);
        console.log(`🧪 [TEST] Dettagli:`, ordiniCliente.map(o => ({
            numero: o.numero_ordine,
            cliente: o.cliente,
            importo: o.importo
        })));
        
        const totale = ordiniCliente.reduce((sum, o) => sum + (o.importo || 0), 0);
        console.log(`🧪 [TEST] Totale fatturato: €${totale.toFixed(2)}`);
        
        return { ordini: ordiniCliente, totale };
    };
    
    console.log('✅ [DEBUG QUERY CLIENTE] Fix applicato con successo!');
    console.log('💡 [DEBUG] Comandi disponibili:');
    console.log('   - window.testQueryCliente("ESSEMME") - Test rapido');
    console.log('   - Prova: "dimmi il fatturato del cliente essemme"');
    
}, 5000); // Aspetta 5 secondi per caricamento completo

console.log('🔧 [DEBUG QUERY CLIENTE] Fix schedulato');