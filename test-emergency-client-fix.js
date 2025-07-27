/**
 * Test di verifica per il fix di emergenza clienti/ordini
 * Verifica che "quanti clienti" venga intercettato correttamente
 */

async function testEmergencyClientFix() {
    console.log('🧪 Test Fix di Emergenza Clienti/Ordini');
    
    // Test 1: Verifica che EnhancedAIAssistant sia disponibile
    if (window.EnhancedAIAssistant) {
        console.log('✅ EnhancedAIAssistant disponibile');
        
        // Test 2: Simula le query che dovrebbero essere intercettate
        const testQueries = [
            "Quanti clienti ci sono nel database?",
            "numero clienti nel database",
            "clienti ci sono",
            "totale clienti database",
            "count clienti"
        ];
        
        console.log('\n--- Test Pattern Matching ---');
        testQueries.forEach(query => {
            const lowerQuery = query.toLowerCase();
            const isClientCountQuery = lowerQuery.includes('quanti client') || 
                                     lowerQuery.includes('numero client') ||
                                     lowerQuery.includes('clienti ci sono') ||
                                     lowerQuery.includes('totale client') ||
                                     lowerQuery.includes('count client');
            
            console.log(`"${query}" → ${isClientCountQuery ? '✅ INTERCETTATO' : '❌ NON INTERCETTATO'}`);
        });
        
        // Test 3: Verifica disponibilità metodi SupabaseAI
        console.log('\n--- Test SupabaseAI ---');
        if (window.supabaseAI) {
            console.log('✅ window.supabaseAI disponibile');
            
            if (typeof window.supabaseAI.getClientsCount === 'function') {
                console.log('✅ getClientsCount() disponibile');
                try {
                    const count = await window.supabaseAI.getClientsCount();
                    console.log(`✅ Conteggio clienti: ${count}`);
                } catch (error) {
                    console.log(`❌ Errore getClientsCount: ${error.message}`);
                }
            } else {
                console.log('❌ getClientsCount() NON disponibile');
            }
            
            if (window.supabaseAI.data && window.supabaseAI.data.clients) {
                console.log(`✅ data.clients disponibile (${window.supabaseAI.data.clients.length} clienti)`);
            } else {
                console.log('❌ data.clients NON disponibile');
            }
        } else {
            console.log('❌ window.supabaseAI NON disponibile');
        }
        
        // Test 4: Simula invio messaggio (solo se sicuro)
        console.log('\n--- Simulazione Invio Messaggio ---');
        console.log('💡 Per testare realmente, usa:');
        console.log('   window.EnhancedAIAssistant.sendMessage("Quanti clienti ci sono nel database?")');
        
    } else {
        console.log('❌ EnhancedAIAssistant NON disponibile');
        console.log('💡 Assicurati che enhanced-ai-assistant.js sia caricato');
    }
    
    console.log('\n✅ Test completato');
}

// Test rapido pattern
function testClientPatterns() {
    const testQueries = [
        "Quanti clienti ci sono nel database?",
        "quanti clienti abbiamo?",
        "numero clienti nel database",
        "clienti ci sono",
        "totale clienti database",
        "count clienti",
        "Quanti ordini ci sono?", // Questo NON dovrebbe essere intercettato
        "numero ordini"           // Questo NON dovrebbe essere intercettato
    ];
    
    console.log('🔍 Test Pattern Clienti vs Ordini:');
    testQueries.forEach(query => {
        const lowerQuery = query.toLowerCase();
        const isClientCountQuery = lowerQuery.includes('quanti client') || 
                                 lowerQuery.includes('numero client') ||
                                 lowerQuery.includes('clienti ci sono') ||
                                 lowerQuery.includes('totale client') ||
                                 lowerQuery.includes('count client');
        
        const status = isClientCountQuery ? '👥 CLIENTI' : '📦 ALTRO';
        console.log(`${status}: "${query}"`);
    });
}

// Funzioni di utilità globali
window.testEmergencyClientFix = testEmergencyClientFix;
window.testClientPatterns = testClientPatterns;

console.log('✅ Test script caricato');
console.log('💡 Usa testEmergencyClientFix() per test completo');
console.log('💡 Usa testClientPatterns() per test pattern rapido');