/**
 * TEST E FIX PER IL CONTEGGIO CLIENTI
 * Problema: Il sistema confonde "clienti" con "ordini"
 */

console.log('🧪 TEST CLIENT COUNT FIX - Inizializzato');

// Monitora le chiamate al RequestMiddleware
if (window.RequestMiddleware) {
    const originalProcessRequest = window.RequestMiddleware.prototype.processRequest;
    
    window.RequestMiddleware.prototype.processRequest = function(request) {
        console.log('🔍 INTERCETTATO RequestMiddleware.processRequest:', request);
        
        // Se la richiesta contiene "clienti", forza il tipo corretto
        if (request && typeof request === 'string' && request.toLowerCase().includes('clienti')) {
            console.log('✅ OVERRIDE: Richiesta contiene "clienti" - forzando tipo corretto');
            
            // Chiama direttamente getClientsCount
            if (window.supabaseAI && window.supabaseAI.getClientsCount) {
                console.log('🔢 Chiamando getClientsCount direttamente...');
                return window.supabaseAI.getClientsCount().then(count => {
                    const response = `Ci sono ${count} clienti nel database.`;
                    console.log('✅ RISPOSTA CORRETTA:', response);
                    return {
                        success: true,
                        response: response,
                        data: { clienti: count }
                    };
                });
            }
        }
        
        // Altrimenti usa il comportamento originale
        return originalProcessRequest.call(this, request);
    };
}

// Monitora anche il middleware integration
if (window.middlewareIntegration) {
    console.log('🔍 Monitoraggio middleware integration attivo');
}

// Funzione di test diretta
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

// Test automatico dopo 3 secondi
setTimeout(() => {
    console.log('🧪 Esecuzione test automatico...');
    window.testClientCount();
}, 3000);

console.log('✅ Fix caricato. Usa testClientCount() per testare manualmente.');