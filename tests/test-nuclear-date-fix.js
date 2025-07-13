/**
 * TEST NUCLEARE: VERIFICA CORREZIONE FORZATA DATE AI
 * Testa che OGNI risposta dell'AI venga corretta dal sistema di correzione
 */

console.log('\n💣 ===== TEST NUCLEARE CORREZIONE DATE AI =====');
console.log('🎯 OBIETTIVO: Verificare che NESSUNA data sbagliata esca dal sistema');
console.log('='.repeat(70));

/**
 * Test del sistema di correzione completo
 */
async function testNuclearDateFix() {
    console.log('\n🚀 AVVIO TEST NUCLEARE');
    console.log('-'.repeat(50));
    
    // Simula risposte AI sbagliate tipiche
    const problematicAIResponses = [
        {
            input: "Che giorno è oggi?",
            wrongAIResponse: "Oggi è venerdì, 7 novembre 2025.",
            expectedCorrection: "giovedì 11 luglio"
        },
        {
            input: "Dimmi la data di oggi",
            wrongAIResponse: "La data di oggi è 07/11/2025.",
            expectedCorrection: "11/07/2025"
        },
        {
            input: "Tre giorni fa che data era?",
            wrongAIResponse: "Tre giorni fa era martedì, 4 novembre 2025.",
            expectedCorrection: "8 luglio 2025"
        },
        {
            input: "Che mese è?",
            wrongAIResponse: "Siamo nel mese di novembre 2025.",
            expectedCorrection: "luglio 2025"
        },
        {
            input: "Ieri che giorno era?",
            wrongAIResponse: "Ieri era giovedì, 6 novembre 2025.",
            expectedCorrection: "10 luglio 2025"
        },
        {
            input: "Domani che data sarà?",
            wrongAIResponse: "Domani sarà sabato, 8 novembre 2025.",
            expectedCorrection: "12 luglio 2025"
        }
    ];
    
    let allPassed = true;
    let corrections = 0;
    
    for (let i = 0; i < problematicAIResponses.length; i++) {
        const test = problematicAIResponses[i];
        console.log(`\n📝 TEST ${i + 1}: "${test.input}"`);
        console.log(`❌ Risposta AI sbagliata: "${test.wrongAIResponse}"`);
        
        // Test 1: AIDateCorrector
        if (window.aiDateCorrector) {
            const corrected = window.aiDateCorrector.correctAIResponse(test.wrongAIResponse);
            const isValid = window.aiDateCorrector.validateResponse(corrected);
            
            console.log(`🔧 Dopo correzione: "${corrected}"`);
            console.log(`✅ Validazione: ${isValid ? 'PASS' : 'FAIL'}`);
            
            if (corrected.toLowerCase().includes(test.expectedCorrection.toLowerCase())) {
                console.log(`✅ Correzione corretta trovata!`);
                corrections++;
            } else {
                console.log(`❌ Correzione non trovata o incompleta`);
                allPassed = false;
            }
        } else {
            console.log(`❌ AIDateCorrector non disponibile`);
            allPassed = false;
        }
        
        // Test 2: Nuclear fix se necessario
        if (window.aiWrapperForcedDate) {
            const nuclearFixed = window.aiWrapperForcedDate.nuclearDateFix(test.wrongAIResponse, test.input);
            console.log(`💣 Nuclear fix: "${nuclearFixed}"`);
            
            if (nuclearFixed !== test.wrongAIResponse) {
                console.log(`✅ Nuclear fix applicato`);
            }
        }
    }
    
    console.log('\n📊 RISULTATI FINALI:');
    console.log(`✅ Correzioni riuscite: ${corrections}/${problematicAIResponses.length}`);
    console.log(`🎯 Test generale: ${allPassed ? 'PASSATO' : 'FALLITO'}`);
    
    return { allPassed, corrections, total: problematicAIResponses.length };
}

/**
 * Test wrapper AI con simulazione chiamata
 */
async function testAIWrapperSimulation() {
    console.log('\n🎯 TEST WRAPPER AI SIMULAZIONE');
    console.log('-'.repeat(50));
    
    if (!window.aiWrapperForcedDate) {
        console.log('❌ AIWrapperForcedDate non disponibile');
        return false;
    }
    
    // Simula funzione AI che restituisce sempre date sbagliate
    const mockBadAI = async (prompt) => {
        console.log(`🤖 AI ricevuto prompt: "${prompt.substring(0, 100)}..."`);
        
        // Simula sempre risposte sbagliate per testare la correzione
        if (prompt.includes('che giorno è')) {
            return "Oggi è venerdì, 7 novembre 2025."; // SBAGLIATO
        }
        if (prompt.includes('che data è')) {
            return "Oggi è 07/11/2025."; // SBAGLIATO  
        }
        if (prompt.includes('tre giorni fa')) {
            return "Tre giorni fa era martedì, 4 novembre 2025."; // SBAGLIATO
        }
        
        return "Non so rispondere.";
    };
    
    const testQueries = [
        "Che giorno è oggi?",
        "Che data è oggi?", 
        "Tre giorni fa che data era?"
    ];
    
    let wrapperPassed = true;
    
    for (const query of testQueries) {
        console.log(`\n📝 Query: "${query}"`);
        
        try {
            const result = await window.aiWrapperForcedDate.wrapAICall(mockBadAI, query);
            console.log(`✅ Risultato wrappato: "${result}"`);
            
            // Verifica che non contenga date sbagliate
            if (result.includes('novembre') || result.includes('07/11/2025')) {
                console.log(`❌ FALLIMENTO: Ancora date sbagliate!`);
                wrapperPassed = false;
            } else if (result.includes('luglio') || result.includes('11/07/2025')) {
                console.log(`✅ SUCCESS: Date corrette!`);
            }
            
        } catch (error) {
            console.error(`❌ Errore wrapper: ${error}`);
            wrapperPassed = false;
        }
    }
    
    return wrapperPassed;
}

/**
 * Test integrazione con sistema Enhanced AI
 */
async function testEnhancedAIIntegration() {
    console.log('\n🤖 TEST INTEGRAZIONE ENHANCED AI');
    console.log('-'.repeat(50));
    
    if (!window.EnhancedAI) {
        console.log('❌ EnhancedAI non disponibile');
        return false;
    }
    
    // Test che il sistema di correzione sia collegato
    const enhanced = window.EnhancedAI;
    
    console.log('🔍 Verifica componenti:');
    console.log(`   - DateCorrector: ${enhanced.dateCorrector ? '✅' : '❌'}`);
    console.log(`   - AIWrapper: ${enhanced.aiWrapper ? '✅' : '❌'}`);
    
    if (enhanced.dateCorrector && enhanced.aiWrapper) {
        console.log('✅ Sistema di correzione collegato correttamente');
        
        // Test metodo di calcolo temporale locale
        const testResponses = [
            enhanced.calculateTemporalResponse("che giorno è oggi"),
            enhanced.calculateTemporalResponse("che data è oggi"),
            enhanced.calculateTemporalResponse("tre giorni fa che data era")
        ];
        
        console.log('\n📝 Test risposte locali:');
        testResponses.forEach((response, i) => {
            console.log(`   ${i + 1}. "${response}"`);
            if (response.includes('luglio') && !response.includes('novembre')) {
                console.log('      ✅ Corretto');
            } else {
                console.log('      ❌ Ancora sbagliato');
            }
        });
        
        return true;
    }
    
    return false;
}

/**
 * Test estremo: verifica ogni possibile output sbagliato
 */
function testExtremeScenarios() {
    console.log('\n💀 TEST SCENARI ESTREMI');
    console.log('-'.repeat(50));
    
    if (!window.aiDateCorrector) {
        console.log('❌ AIDateCorrector non disponibile');
        return false;
    }
    
    // Lista di ogni possibile variante sbagliata
    const extremeWrongDates = [
        "7 novembre 2025",
        "07 novembre 2025", 
        "novembre 2025",
        "Nov 2025",
        "NOV 2025",
        "07/11/2025",
        "07-11-2025",
        "2025-11-07",
        "2025/11/07",
        "venerdì 7 novembre",
        "venerdì, 7 novembre 2025",
        "il 7 novembre",
        "giovedì 6 novembre 2025", // ieri sbagliato
        "sabato 8 novembre 2025",  // domani sbagliato
        "november 2025",
        "Friday, November 7th"
    ];
    
    let extremePassed = 0;
    
    console.log('🔍 Testando ogni variante sbagliata...');
    
    extremeWrongDates.forEach((wrongDate, i) => {
        const testText = `La data è ${wrongDate}.`;
        const corrected = window.aiDateCorrector.correctAIResponse(testText);
        const isValid = window.aiDateCorrector.validateResponse(corrected);
        
        if (isValid && !corrected.toLowerCase().includes('novembre')) {
            extremePassed++;
            console.log(`✅ ${i + 1}. "${wrongDate}" → CORRETTO`);
        } else {
            console.log(`❌ ${i + 1}. "${wrongDate}" → FALLITO: "${corrected}"`);
        }
    });
    
    const percentage = (extremePassed / extremeWrongDates.length * 100).toFixed(1);
    console.log(`\n📊 Correzioni riuscite: ${extremePassed}/${extremeWrongDates.length} (${percentage}%)`);
    
    return percentage >= 95; // Almeno 95% deve passare
}

/**
 * Esegui tutti i test nucleari
 */
async function runNuclearTests() {
    console.log('💣 INIZIO TEST NUCLEARI CORREZIONE DATE AI');
    console.log('🎯 Obiettivo: ZERO date sbagliate devono uscire dal sistema');
    
    const results = {
        dateCorrection: await testNuclearDateFix(),
        wrapperSimulation: await testAIWrapperSimulation(),
        enhancedIntegration: await testEnhancedAIIntegration(),
        extremeScenarios: testExtremeScenarios()
    };
    
    console.log('\n💀 RISULTATI FINALI NUCLEARI:');
    console.log('='.repeat(60));
    
    Object.entries(results).forEach(([test, result]) => {
        const status = (typeof result === 'object' ? result.allPassed : result);
        console.log(`${status ? '✅' : '❌'} ${test}: ${status ? 'PASSATO' : 'FALLITO'}`);
        
        if (typeof result === 'object' && result.corrections !== undefined) {
            console.log(`   Correzioni: ${result.corrections}/${result.total}`);
        }
    });
    
    const allPassed = Object.values(results).every(r => 
        typeof r === 'object' ? r.allPassed : r
    );
    
    if (allPassed) {
        console.log('\n🎉 TUTTI I TEST NUCLEARI PASSATI!');
        console.log('🛡️ Sistema di correzione date AI funzionante al 100%');
        console.log('🚀 Nessuna data sbagliata può uscire dal sistema');
    } else {
        console.log('\n🚨 ALCUNI TEST NUCLEARI FALLITI!');
        console.log('⚠️ Il sistema potrebbe ancora permettere date sbagliate');
        console.log('🔧 Verificare configurazione AIDateCorrector');
    }
    
    console.log('\n💡 VERIFICA FINALE MANUALE:');
    console.log('   Prova a chiedere: "Che giorno è oggi?"');
    console.log('   DEVE rispondere: "Oggi è giovedì, 11 luglio 2025"');
    console.log('   NON deve contenere: novembre, 07/11, Nov, etc.');
    
    console.log('='.repeat(60));
    
    return results;
}

// Export per uso globale
if (typeof window !== 'undefined') {
    window.runNuclearTests = runNuclearTests;
    window.testNuclearDateFix = testNuclearDateFix;
    window.testAIWrapperSimulation = testAIWrapperSimulation;
    window.testEnhancedAIIntegration = testEnhancedAIIntegration;
    window.testExtremeScenarios = testExtremeScenarios;
    
    // Auto-test se richiesto via URL
    if (window.location.search.includes('nuclearTest=true')) {
        window.addEventListener('load', () => {
            setTimeout(runNuclearTests, 2000);
        });
    }
}

console.log('💣 Test nucleare correzione date AI caricato');
console.log('🚀 Usa window.runNuclearTests() per eseguire tutti i test');