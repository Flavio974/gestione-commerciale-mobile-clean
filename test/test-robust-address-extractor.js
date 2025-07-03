/**
 * Test per RobustAddressExtractor
 * Verifica l'estrazione con diversi formati di DDT/FT
 */

// Dati di test dal DDT di esempio
const testDDT1 = {
    rows: [
        [{ x: 27, text: "Cliente" }, { x: 294, text: "Luogo di consegna" }],
        [{ x: 39, text: "BOREALE SRL" }, { x: 309, text: "BOREALE SRL" }],
        [{ x: 39, text: "VIA CESANA, 78" }, { x: 309, text: "VIA CESANA, 78" }],
        [{ x: 309, text: "INGR. SCARICO: VIA PEROSA, 75" }],
        [{ x: 39, text: "10139 - TORINO TO" }, { x: 309, text: "10139 TORINO TO" }]
    ],
    metadata: {
        clientName: "BOREALE SRL",
        clientCode: "20323"
    },
    expected: {
        street: "VIA CESANA, 78",
        additionalInfo: "INGR. SCARICO: VIA PEROSA, 75",
        postalCode: "10139",
        city: "TORINO",
        province: "TO"
    }
};

// DDT con layout diverso
const testDDT2 = {
    rows: [
        [{ x: 27, text: "Cliente" }, { x: 294, text: "Luogo di consegna" }],
        [{ x: 39, text: "RIZZOLA SERGIO E OGLIETTI" }, { x: 309, text: "RIZZOLA SERGIO E OGLIETTI" }],
        [{ x: 39, text: "PIERA SRL (CODICE ID. 3)" }, { x: 309, text: "PIERA SRL (CODICE ID. 3)" }],
        [{ x: 39, text: "VIA BERTOLE', 13/15" }, { x: 309, text: "VIA MEANA, SNC" }],
        [{ x: 39, text: "13044 - CRESCENTINO VC" }, { x: 309, text: "10088 VOLPIANO TO" }]
    ],
    metadata: {
        clientName: "RIZZOLA SERGIO E OGLIETTI",
        clientCode: "20260"
    },
    expected: {
        street: "VIA MEANA, SNC",
        additionalInfo: "",
        postalCode: "10088",
        city: "VOLPIANO",
        province: "TO"
    }
};

// Fattura con indirizzo singolo
const testFT1 = {
    rows: [
        [{ x: 328, text: "Spett.le" }],
        [{ x: 327, text: "Luogo di consegna" }],
        [{ x: 336, text: "AZIENDA AGRICOLA ISABELLA" }],
        [{ x: 336, text: "DI ATHOS GABRIELE CALVO" }],
        [{ x: 336, text: "VIA GIANOLI, 64" }],
        [{ x: 336, text: "15020 MURISENGO AL" }]
    ],
    metadata: {
        clientName: "AZIENDA AGRICOLA ISABELLA",
        documentType: "FT"
    },
    expected: {
        street: "VIA GIANOLI, 64",
        additionalInfo: "",
        postalCode: "15020",
        city: "MURISENGO",
        province: "AL"
    }
};

// Funzione di test
async function runTests() {
    console.log('🧪 Starting RobustAddressExtractor tests...\n');
    
    // Verifica che l'estrattore sia caricato
    if (!window.RobustAddressExtractor) {
        console.error('❌ RobustAddressExtractor not loaded!');
        return;
    }
    
    // Crea istanza con debug
    const extractor = new window.RobustAddressExtractor({
        debug: true,
        logStrategies: true,
        saveIntermediateResults: true
    });
    
    const testCases = [
        { name: 'DDT with additional delivery info', data: testDDT1 },
        { name: 'DDT with two-column layout', data: testDDT2 },
        { name: 'FT with single address', data: testFT1 }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const testCase of testCases) {
        console.log(`\n📋 Testing: ${testCase.name}`);
        console.log('='.repeat(60));
        
        try {
            const result = await extractor.extractDeliveryAddress(
                testCase.data.rows,
                testCase.data.metadata
            );
            
            if (!result) {
                console.error('❌ No address extracted!');
                failed++;
                continue;
            }
            
            console.log('\n📍 Extracted address:', result);
            
            // Verifica i risultati
            const components = result.components || result.structured;
            let allCorrect = true;
            
            Object.keys(testCase.data.expected).forEach(field => {
                const expected = testCase.data.expected[field];
                const actual = components[field] || '';
                
                if (expected !== actual) {
                    console.error(`❌ ${field}: expected "${expected}", got "${actual}"`);
                    allCorrect = false;
                } else {
                    console.log(`✅ ${field}: "${actual}"`);
                }
            });
            
            if (allCorrect) {
                console.log('\n✅ Test PASSED!');
                passed++;
            } else {
                console.log('\n❌ Test FAILED!');
                failed++;
            }
            
            // Mostra risultati intermedi
            if (extractor.intermediateResults.length > 0) {
                console.log('\n📊 Strategy results:');
                extractor.intermediateResults.forEach(ir => {
                    console.log(`   - ${ir.strategy}: confidence ${ir.result.confidence}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Test error:', error);
            failed++;
        }
    }
    
    // Riepilogo
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(60));
}

// Esegui i test quando la pagina è pronta
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runTests);
} else {
    runTests();
}