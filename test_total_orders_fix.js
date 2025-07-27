/**
 * Test Diagnostico per Fix Conteggio Ordini Totali
 * Esegui in console per verificare il funzionamento
 */

async function testTotalOrdersFix() {
    console.log('🧪 AVVIO TEST FIX CONTEGGIO ORDINI TOTALI');
    
    // Test 1: Verifica che vocabulary manager carichi il comando
    if (window.VocabularyManager) {
        const vocabManager = new VocabularyManager();
        await vocabManager.loadVocabulary();
        
        const match = await vocabManager.findMatch('quanti ordini ci sono nel database');
        console.log('✅ Test 1 - Vocabulary Match:', match ? match.command.action : 'NO MATCH');
        
        if (match && match.command.action === 'countTotalOrders') {
            console.log('✅ Test 1 PASSED: Comando riconosciuto correttamente');
        } else {
            console.log('❌ Test 1 FAILED: Comando non riconosciuto');
        }
    }
    
    // Test 2: Verifica che AI middleware abbia l'handler
    if (window.AIMiddleware) {
        const aiMiddleware = new AIMiddleware();
        const hasHandler = typeof aiMiddleware.handleCountTotalOrders === 'function';
        console.log('✅ Test 2 - Handler Exists:', hasHandler ? 'YES' : 'NO');
        
        if (hasHandler) {
            console.log('✅ Test 2 PASSED: Handler countTotalOrders implementato');
        } else {
            console.log('❌ Test 2 FAILED: Handler mancante');
        }
    }
    
    // Test 3: Verifica client extraction patch
    if (window.AIMiddleware) {
        const aiMiddleware = new AIMiddleware();
        const clientName = aiMiddleware.extractClientNameFromQuery('quanti ordini ci sono nel database');
        console.log('✅ Test 3 - Client Extraction:', clientName || 'NULL (corretto)');
        
        if (clientName === null) {
            console.log('✅ Test 3 PASSED: Client extraction correttamente skippata');
        } else {
            console.log('❌ Test 3 FAILED: Client extraction non funzionante');
        }
    }
    
    // Test 4: Test integrazione completa
    console.log('🔄 Test 4: Esecuzione query completa...');
    
    if (window.robustConnectionManager && window.robustConnectionManager.sendMessage) {
        try {
            const result = await window.robustConnectionManager.sendMessage('quanti ordini ci sono nel database');
            console.log('✅ Test 4 - Risultato completo:', result);
            
            if (result && !result.includes('ci sono nel database')) {
                console.log('✅ Test 4 PASSED: Query eseguita senza errori client');
            } else {
                console.log('❌ Test 4 FAILED: Ancora problemi con estrazione client');
            }
        } catch (error) {
            console.log('❌ Test 4 ERROR:', error.message);
        }
    }
    
    console.log('🏁 TEST COMPLETATI');
}

// Esegui test automaticamente
testTotalOrdersFix();