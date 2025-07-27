// Carica il fix per il conteggio clienti
(async function() {
    console.log('🔧 Caricamento fix conteggio clienti...');
    
    try {
        // Crea funzione di test diretta
        window.testClientCount = async function() {
            console.log('\n🧪 TEST CONTEGGIO CLIENTI');
            console.log('═'.repeat(50));
            
            if (window.supabaseAI && window.supabaseAI.getClientsCount) {
                try {
                    const count = await window.supabaseAI.getClientsCount();
                    console.log('✅ Conteggio clienti diretto:', count);
                    console.log('📊 Risposta corretta dovrebbe essere:', `Ci sono ${count} clienti nel database.`);
                    return count;
                } catch (error) {
                    console.error('❌ Errore nel conteggio:', error);
                }
            } else {
                console.error('❌ supabaseAI.getClientsCount non disponibile');
            }
        };
        
        // Test automatico
        console.log('🧪 Esecuzione test automatico...');
        const count = await window.testClientCount();
        
        // Ora proviamo a intercettare il RequestMiddleware
        if (window.RequestMiddleware && window.requestMiddleware) {
            const original = window.requestMiddleware.processRequest;
            
            window.requestMiddleware.processRequest = async function(input) {
                console.log('🎯 INTERCETTATO processRequest:', input);
                
                // Se contiene "clienti", gestisci diversamente
                if (input && input.toLowerCase && input.toLowerCase().includes('clienti')) {
                    console.log('✅ Richiesta clienti identificata!');
                    
                    if (window.supabaseAI && window.supabaseAI.getClientsCount) {
                        const clientCount = await window.supabaseAI.getClientsCount();
                        return {
                            success: true,
                            response: `Ci sono ${clientCount} clienti nel database.`,
                            data: { clienti: clientCount }
                        };
                    }
                }
                
                // Altrimenti usa il comportamento originale
                if (original) {
                    return original.call(this, input);
                }
            };
            
            console.log('✅ RequestMiddleware intercettato con successo');
        }
        
        console.log('✅ Fix caricato. Usa testClientCount() per testare.');
        
    } catch (error) {
        console.error('❌ Errore caricamento fix:', error);
    }
})();