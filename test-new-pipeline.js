/**
 * Test per nuova pipeline priorità utente → sistema → AI
 */

async function testNewPipeline() {
    console.log('🧪 TEST NUOVA PIPELINE VOCABOLARIO');
    
    // Test 1: Verifica caricamento VocabularyManager
    if (!window.VocabularyManager) {
        console.log('❌ VocabularyManager non disponibile');
        return;
    }
    
    const vocabManager = new VocabularyManager();
    console.log('✅ VocabularyManager istanziato');
    
    // Test 2: Verifica processQuery disponibile
    if (!vocabManager.processQuery) {
        console.log('❌ processQuery non disponibile');
        return;
    }
    console.log('✅ processQuery disponibile');
    
    // Test 3: Simula aggiunta comando utente
    const testUserCommand = {
        title: 'Test comando utente',
        pattern: 'test comando personale',
        action: 'getCurrentTime',
        source: 'user'
    };
    
    vocabManager.userVocabulary = [testUserCommand];
    console.log('✅ Comando utente test aggiunto');
    
    // Test 4: Test pipeline con comando utente
    console.log('\n🎯 TEST PRIORITÀ UTENTE:');
    const userResult = await vocabManager.processQuery('test comando personale');
    console.log('Risultato:', userResult);
    
    if (userResult.type === 'local_execution' && userResult.source === 'user_vocab') {
        console.log('✅ Pipeline utente funziona');
    } else {
        console.log('❌ Pipeline utente non funziona');
    }
    
    // Test 5: Test comando inesistente che sembra interno
    console.log('\n🤔 TEST RICHIESTA INTERNA:');
    const internalResult = await vocabManager.processQuery('quanti prodotti abbiamo nel magazzino');
    console.log('Risultato:', internalResult);
    
    if (internalResult.type === 'vocab_added' || internalResult.type === 'cancelled' || internalResult.type === 'fallback_ai') {
        console.log('✅ Rilevamento richiesta interna funziona');
    } else {
        console.log('❌ Rilevamento richiesta interna non funziona');
    }
    
    // Test 6: Test query conversazionale
    console.log('\n💬 TEST QUERY CONVERSAZIONALE:');
    const conversationalResult = await vocabManager.processQuery('ciao come stai');
    console.log('Risultato:', conversationalResult);
    
    if (conversationalResult.type === 'fallback_ai') {
        console.log('✅ Fallback AI per query conversazionali funziona');
    } else {
        console.log('❌ Fallback AI non funziona');
    }
    
    // Test 7: Test statistiche
    console.log('\n📊 STATISTICHE:');
    const stats = vocabManager.getStats();
    console.log('Stats:', stats);
    
    if (stats.pipeline === 'user → system → ai') {
        console.log('✅ Statistiche pipeline aggiornate');
    } else {
        console.log('❌ Statistiche non aggiornate');
    }
    
    console.log('\n🏁 TEST COMPLETATI');
    return {
        vocabManager,
        tests: {
            userPipeline: userResult,
            internalDetection: internalResult,
            conversational: conversationalResult,
            stats: stats
        }
    };
}

// Test integrazione con robust-connection-manager
async function testRobustIntegration() {
    console.log('\n🔌 TEST INTEGRAZIONE ROBUST CONNECTION MANAGER');
    
    if (!window.robustConnectionManager) {
        console.log('❌ RobustConnectionManager non disponibile');
        return;
    }
    
    const rcm = window.robustConnectionManager;
    
    // Verifica se VocabularyManager è connesso
    if (rcm.instances?.vocabularyManager) {
        console.log('✅ VocabularyManager connesso a RobustConnectionManager');
        
        // Test se ha processQuery
        if (rcm.instances.vocabularyManager.processQuery) {
            console.log('✅ processQuery disponibile in RobustConnectionManager');
            
            // Test query via RobustConnectionManager
            if (window.FlavioAIAssistant?.sendMessage) {
                console.log('🧪 Test query via sendMessage...');
                // Note: Non eseguiamo per evitare side effects
                console.log('ℹ️ Per testare: FlavioAIAssistant.sendMessage("test comando personale")');
            }
        } else {
            console.log('❌ processQuery non disponibile in RobustConnectionManager');
        }
    } else {
        console.log('❌ VocabularyManager non connesso');
    }
}

// Auto-esecuzione se caricato in browser
if (typeof window !== 'undefined') {
    window.testNewPipeline = testNewPipeline;
    window.testRobustIntegration = testRobustIntegration;
    
    // Auto-test dopo 2 secondi
    setTimeout(async () => {
        console.log('🚀 Avvio auto-test...');
        const result = await testNewPipeline();
        await testRobustIntegration();
        window.testResult = result;
    }, 2000);
}

console.log('🧪 Test pipeline caricato - usa testNewPipeline() per eseguire');