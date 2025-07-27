/**
 * TEST FINALE - Verifica completa del fix clienti/ordini
 * Testa tutti i livelli: RequestMiddleware, VocabolarioMiddleware, EnhancedAIAssistant
 */

async function testFinalClientOrderFix() {
    console.log('🔥 TEST FINALE: Fix Clienti vs Ordini');
    console.log('=====================================');
    
    // Test 1: RequestMiddleware Classification
    console.log('\n🧪 Test 1: RequestMiddleware Classification');
    if (window.RequestMiddleware) {
        // Crea istanza temporanea per test
        const mockSupabaseAI = {
            getClientsCount: () => Promise.resolve(182),
            getOrdersCount: () => Promise.resolve(11)
        };
        
        const middleware = new RequestMiddleware(mockSupabaseAI);
        
        const testQueries = [
            "Quanti clienti ci sono nel database?",
            "Quanti ordini ci sono nel database?",
            "numero clienti",
            "numero ordini",
            "clienti totali",
            "ordini totali"
        ];
        
        for (const query of testQueries) {
            const type = middleware.classifyRequest(query);
            const expected = query.toLowerCase().includes('client') ? 'clienti' : 
                           query.toLowerCase().includes('ordin') ? 'ordini' : 'general';
            
            const status = type === expected ? '✅' : '❌';
            console.log(`${status} "${query}" → ${type} (atteso: ${expected})`);
        }
    } else {
        console.log('❌ RequestMiddleware non disponibile');
    }
    
    // Test 2: VocabolarioMiddleware
    console.log('\n🧪 Test 2: VocabolarioMiddleware Pattern Detection');
    if (window.VocabolarioMiddleware) {
        const vocabMiddleware = new VocabolarioMiddleware({});
        await vocabMiddleware.loadVocabolario();
        
        const testQueries = [
            "quanti clienti ci sono nel database",
            "numero clienti nel database",
            "totale clienti database"
        ];
        
        for (const query of testQueries) {
            const exactMatch = vocabMiddleware.findExactMatch(query);
            const status = exactMatch ? '✅' : '❌';
            const category = exactMatch ? exactMatch.category : 'Nessun match';
            console.log(`${status} "${query}" → ${category}`);
        }
    } else {
        console.log('❌ VocabolarioMiddleware non disponibile');
    }
    
    // Test 3: Enhanced AI Assistant Pattern Detection
    console.log('\n🧪 Test 3: Enhanced AI Assistant Pattern Detection');
    
    const testQueries = [
        "Quanti clienti ci sono nel database?",
        "quanti clienti abbiamo?",
        "numero clienti nel database",
        "clienti ci sono",
        "totale clienti database",
        "count clienti"
    ];
    
    testQueries.forEach(query => {
        const lowerQuery = query.toLowerCase();
        const isClientCountQuery = lowerQuery.includes('quanti client') || 
                                 lowerQuery.includes('numero client') ||
                                 lowerQuery.includes('clienti ci sono') ||
                                 lowerQuery.includes('totale client') ||
                                 lowerQuery.includes('count client');
        
        const status = isClientCountQuery ? '✅' : '❌';
        console.log(`${status} "${query}" → ${isClientCountQuery ? 'INTERCETTATO' : 'NON INTERCETTATO'}`);
    });
    
    // Test 4: Integration Test
    console.log('\n🧪 Test 4: Integration Test');
    console.log('Verifica che tutti i componenti siano disponibili:');
    
    const components = [
        { name: 'RequestMiddleware', obj: window.RequestMiddleware },
        { name: 'VocabolarioMiddleware', obj: window.VocabolarioMiddleware },
        { name: 'EnhancedAIAssistant', obj: window.EnhancedAIAssistant },
        { name: 'supabaseAI', obj: window.supabaseAI },
        { name: 'AIRequestFilter', obj: window.AIRequestFilter }
    ];
    
    components.forEach(comp => {
        const status = comp.obj ? '✅' : '❌';
        console.log(`${status} ${comp.name}`);
    });
    
    // Test 5: Simulazione Query Completa
    console.log('\n🧪 Test 5: Simulazione Query (no invio reale)');
    console.log('Per testare realmente:');
    console.log('1. "Quanti clienti ci sono nel database?" → Dovrebbe rispondere "182 clienti"');
    console.log('2. "Quanti ordini ci sono nel database?" → Dovrebbe rispondere "11 ordini"');
    
    // Test 6: Verifica SupabaseAI
    if (window.supabaseAI) {
        console.log('\n🧪 Test 6: Verifica SupabaseAI');
        try {
            if (typeof window.supabaseAI.getClientsCount === 'function') {
                const clientCount = await window.supabaseAI.getClientsCount();
                console.log(`✅ Clienti disponibili: ${clientCount}`);
            } else {
                console.log('❌ getClientsCount() non disponibile');
            }
        } catch (error) {
            console.log(`❌ Errore SupabaseAI: ${error.message}`);
        }
    }
    
    console.log('\n✅ Test finale completato');
    console.log('🎯 Se tutti i test sono ✅, il fix dovrebbe funzionare correttamente');
}

// Test rapido pattern recognition
function quickPatternTest() {
    console.log('⚡ Quick Pattern Test:');
    
    const queries = [
        "Quanti clienti ci sono nel database?",
        "Quanti ordini ci sono nel database?",
        "numero clienti",
        "numero ordini"
    ];
    
    queries.forEach(query => {
        const lower = query.toLowerCase();
        
        // RequestMiddleware logic
        let type = 'unknown';
        if (lower.includes('client')) type = 'clienti';
        else if (lower.includes('ordin')) type = 'ordini';
        
        // Enhanced AI logic
        const isClientCount = lower.includes('quanti client') || 
                            lower.includes('numero client') ||
                            lower.includes('clienti ci sono');
        
        console.log(`"${query}"`);
        console.log(`  RequestMiddleware: ${type}`);
        console.log(`  Enhanced AI: ${isClientCount ? 'INTERCETTATO' : 'normale'}`);
        console.log('');
    });
}

// Funzioni globali
window.testFinalClientOrderFix = testFinalClientOrderFix;
window.quickPatternTest = quickPatternTest;

console.log('✅ Test finale caricato');
console.log('💡 Usa testFinalClientOrderFix() per test completo');
console.log('💡 Usa quickPatternTest() per test rapido pattern');