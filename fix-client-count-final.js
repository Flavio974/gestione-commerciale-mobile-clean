/**
 * FIX FINALE PER IL CONTEGGIO CLIENTI
 * Problema: getClientsCount non disponibile sull'istanza corrente
 * Soluzione: Ricrea l'istanza corretta e forza l'override
 */

(async function() {
    console.log('🔧 FIX FINALE CONTEGGIO CLIENTI - Avvio...');
    
    // 1. DIAGNOSTICA COMPLETA
    console.log('🔍 DIAGNOSTICA STATO CORRENTE:');
    console.log('- window.supabaseAI:', !!window.supabaseAI);
    console.log('- window.SupabaseAIIntegration:', !!window.SupabaseAIIntegration);
    console.log('- getClientsCount disponibile:', !!(window.supabaseAI && window.supabaseAI.getClientsCount));
    
    if (window.supabaseAI) {
        console.log('- Metodi disponibili su supabaseAI:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.supabaseAI)));
    }
    
    // 2. RICREA ISTANZA CORRETTA SE NECESSARIO
    if (!window.supabaseAI || !window.supabaseAI.getClientsCount) {
        console.log('🔄 Ricreando istanza SupabaseAI con getClientsCount...');
        
        if (window.SupabaseAIIntegration) {
            try {
                // Crea nuova istanza
                const newInstance = new window.SupabaseAIIntegration();
                
                // Verifica che abbia il metodo
                if (newInstance.getClientsCount) {
                    console.log('✅ Nuova istanza ha getClientsCount');
                    window.supabaseAI = newInstance;
                    
                    // Aggiorna anche il RobustConnectionManager se disponibile
                    if (window.robustConnectionManager && window.robustConnectionManager.instances) {
                        window.robustConnectionManager.instances.supabaseAI = newInstance;
                        console.log('✅ RobustConnectionManager aggiornato');
                    }
                } else {
                    console.error('❌ Nuova istanza non ha getClientsCount');
                }
            } catch (error) {
                console.error('❌ Errore creazione nuova istanza:', error);
            }
        }
    }
    
    // 3. OVERRIDE DIRETTO DEL COMANDO count_clients
    if (window.vocabularyManager && window.vocabularyManager.processCommand) {
        const original = window.vocabularyManager.processCommand;
        
        window.vocabularyManager.processCommand = function(input) {
            console.log('🎯 VocabularyManager.processCommand intercettato:', input);
            
            // Se è richiesta clienti, forza risposta diretta
            if (input && input.toLowerCase().includes('clienti') && input.toLowerCase().includes('quanti')) {
                console.log('✅ OVERRIDE: Richiesta clienti identificata - esecuzione diretta');
                
                // Esegui conteggio diretto
                if (window.supabaseAI && window.supabaseAI.getClientsCount) {
                    window.supabaseAI.getClientsCount().then(count => {
                        const response = `Nel database ci sono ${count} clienti.`;
                        console.log('📊 RISPOSTA DIRETTA:', response);
                        
                        // Aggiungi direttamente alla chat
                        if (window.FlavioAIAssistant && window.FlavioAIAssistant.addMessage) {
                            window.FlavioAIAssistant.addMessage(response, 'assistant');
                        }
                    }).catch(error => {
                        console.error('❌ Errore conteggio:', error);
                    });
                    
                    // Ritorna comando fittizio per bloccare altri middleware
                    return {
                        id: 'count_clients_handled',
                        action: 'countClientsHandled',
                        params: {},
                        confidence: 1.0,
                        handled: true
                    };
                }
            }
            
            // Usa comportamento originale per altri casi
            return original.call(this, input);
        };
        
        console.log('✅ VocabularyManager override applicato');
    }
    
    // 4. BLOCCO TOTALE DEL RequestMiddleware PER RICHIESTE CLIENTI
    if (window.RequestMiddleware) {
        // Intercetta il prototipo
        const originalProcess = window.RequestMiddleware.prototype.processRequest;
        
        window.RequestMiddleware.prototype.processRequest = function(input) {
            console.log('🛑 RequestMiddleware intercettato:', input);
            
            // BLOCCO TOTALE per richieste clienti
            if (input && typeof input === 'string' && input.toLowerCase().includes('clienti')) {
                console.log('🛑 BLOCCO TOTALE: RequestMiddleware non può gestire richieste clienti');
                return Promise.resolve({
                    success: true,
                    response: 'Richiesta clienti bloccata - gestita dal VocabularyManager',
                    blocked: true
                });
            }
            
            // Comportamento normale per tutto il resto
            return originalProcess.call(this, input);
        };
        
        console.log('✅ RequestMiddleware bloccato per richieste clienti');
    }
    
    // 5. TEST FINALE
    console.log('🧪 ESECUZIONE TEST FINALE...');
    
    if (window.supabaseAI && window.supabaseAI.getClientsCount) {
        try {
            const count = await window.supabaseAI.getClientsCount();
            console.log('✅ TEST SUPERATO - Conteggio clienti:', count);
            console.log('📊 La risposta corretta dovrebbe essere:', `Nel database ci sono ${count} clienti.`);
        } catch (error) {
            console.error('❌ TEST FALLITO:', error);
        }
    } else {
        console.error('❌ getClientsCount ancora non disponibile');
    }
    
    // 6. FUNZIONE DI TEST RAPIDO
    window.testClientCountFinal = async function() {
        if (window.supabaseAI && window.supabaseAI.getClientsCount) {
            const count = await window.supabaseAI.getClientsCount();
            const response = `Nel database ci sono ${count} clienti.`;
            console.log('🧪 TEST:', response);
            return response;
        } else {
            console.error('❌ getClientsCount non disponibile');
            return null;
        }
    };
    
    console.log('✅ FIX FINALE APPLICATO');
    console.log('🧪 Usa testClientCountFinal() per testare');
    console.log('💬 Ora prova a chiedere: "Quanti clienti ci sono nel database?"');
    
})();