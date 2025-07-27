/**
 * Test per verificare il fix del bug clienti/ordini
 * Verifica che "quanti clienti" non venga più confuso con "ordini"
 */

function testClientOrderClassification() {
    console.log('🧪 Test classificazione clienti vs ordini');
    
    // Carica il vocabolario middleware se disponibile
    if (window.VocabolarioMiddleware) {
        const middleware = new VocabolarioMiddleware({});
        
        // Test cases
        const testCases = [
            {
                query: "quanti clienti ci sono nel database",
                expectedCategory: "Gestione Clienti",
                expectedType: "clienti_database",
                description: "Query conteggio clienti"
            },
            {
                query: "quanti ordini ci sono nel database", 
                expectedCategory: "Fatturato e Ordini",
                expectedType: "ordini",
                description: "Query conteggio ordini"
            },
            {
                query: "numero clienti nel database",
                expectedCategory: "Gestione Clienti", 
                expectedType: "clienti_database",
                description: "Query numero clienti"
            },
            {
                query: "quanti clienti abbiamo",
                expectedCategory: "Gestione Clienti",
                expectedType: "clienti_database", 
                description: "Query quanti clienti abbiamo"
            }
        ];
        
        testCases.forEach((testCase, index) => {
            console.log(`\n--- Test ${index + 1}: ${testCase.description} ---`);
            console.log(`Query: "${testCase.query}"`);
            
            // Test exact match
            const exactMatch = middleware.findExactMatch(testCase.query);
            if (exactMatch) {
                console.log(`✅ Match esatto trovato: categoria="${exactMatch.category}"`);
                
                const mappedType = middleware.mapCategoryToRequestType(exactMatch.category, exactMatch.pattern);
                console.log(`📋 Tipo mappato: "${mappedType}"`);
                
                if (exactMatch.category === testCase.expectedCategory && mappedType === testCase.expectedType) {
                    console.log(`✅ TEST PASSED: Classificazione corretta`);
                } else {
                    console.log(`❌ TEST FAILED:`);
                    console.log(`   Atteso: categoria="${testCase.expectedCategory}", tipo="${testCase.expectedType}"`);
                    console.log(`   Ottenuto: categoria="${exactMatch.category}", tipo="${mappedType}"`);
                }
            } else {
                console.log(`❌ Nessun match esatto trovato per: "${testCase.query}"`);
                
                // Test fallback classification
                const ffatturatoType = middleware.determineFatturatoType(testCase.query);
                const clientiType = middleware.determineClientiType(testCase.query);
                
                console.log(`🔍 Fallback classification:`);
                console.log(`   Fatturato type: "${ffatturatoType}"`);
                console.log(`   Clienti type: "${clientiType}"`);
            }
        });
        
    } else {
        console.log('❌ VocabolarioMiddleware non disponibile');
    }
}

// Test diretto delle funzioni di classificazione
function testDirectClassification() {
    console.log('\n🧪 Test diretto delle funzioni di classificazione');
    
    if (window.VocabolarioMiddleware) {
        const middleware = new VocabolarioMiddleware({});
        
        // Test determineFatturatoType
        console.log('\n--- Test determineFatturatoType ---');
        const fatturatoTests = [
            "quanti clienti ci sono nel database",
            "quanti ordini ci sono nel database",
            "numero clienti",
            "numero ordini"
        ];
        
        fatturatoTests.forEach(test => {
            const result = middleware.determineFatturatoType(test);
            console.log(`"${test}" → "${result}"`);
        });
        
        // Test determineClientiType  
        console.log('\n--- Test determineClientiType ---');
        const clientiTests = [
            "quanti clienti ci sono nel database",
            "numero clienti nel database", 
            "totale clienti database",
            "clienti nel database"
        ];
        
        clientiTests.forEach(test => {
            const result = middleware.determineClientiType(test);
            console.log(`"${test}" → "${result}"`);
        });
        
    } else {
        console.log('❌ VocabolarioMiddleware non disponibile');
    }
}

// Esegui i test
async function runAllTests() {
    console.log('🚀 Avvio test fix clienti/ordini');
    
    // Attendi che il vocabolario sia caricato
    if (window.VocabolarioMiddleware) {
        const middleware = new VocabolarioMiddleware({});
        await middleware.loadVocabolario();
        
        testClientOrderClassification();
        testDirectClassification();
        
        console.log('\n✅ Test completati');
    } else {
        console.log('❌ Impossibile eseguire test: VocabolarioMiddleware non disponibile');
        console.log('💡 Assicurati che il file js/middleware/vocabolario-middleware.js sia caricato');
    }
}

// Funzione di utilità per test rapido
window.testClientOrderFix = runAllTests;

console.log('✅ Test script caricato');
console.log('💡 Usa testClientOrderFix() per eseguire i test');