/**
 * Test specifico per esclusione indirizzi vettore
 * Verifica che il sistema NON estragga l'indirizzo del vettore
 */

// DDT con indirizzo vettore che NON deve essere estratto
const testDDTVettore = {
    rows: [
        [{ x: 27, text: "Cliente" }, { x: 294, text: "Luogo di consegna" }],
        [{ x: 39, text: "DONAC S.R.L." }, { x: 309, text: "DONAC S.R.L." }],
        [{ x: 39, text: "VIA MARGARITA, 8 LOC. TETTO GARETTO" }, { x: 309, text: "VIA SALUZZO, 65" }],
        [{ x: 39, text: "12100 - CUNEO CN" }, { x: 309, text: "12038 SAVIGLIANO CN" }],
        [{ x: 295, text: "Pagamento: BB 30 GG D.F.F.M." }],
        [{ x: 28, text: "04064060041" }, { x: 161, text: "04064060041" }],
        [{ x: 206, text: "7959 del 19/05/25" }, { x: 413, text: "Operatore: VALENTINA" }],
        [{ x: 413, text: "507 SAFFIRIO FLAVIO" }],
        [{ x: 28, text: "VETTORE" }, { x: 178, text: "VENDITA" }, { x: 324, text: "19/05/25" }],
        [{ x: 28, text: "S.A.F.I.M. S.P.A" }, { x: 192, text: "09843020018" }],
        [{ x: 28, text: "VIA SUPEJA GALLINO 20/28" }],
        [{ x: 28, text: "10060 NONE TO" }, { x: 192, text: "TO 74321" }]
    ],
    metadata: {
        clientName: "DONAC S.R.L.",
        clientCode: "20322"
    },
    expected: {
        street: "VIA SALUZZO, 65",
        additionalInfo: "",
        postalCode: "12038",
        city: "SAVIGLIANO",
        province: "CN"
    },
    notExpected: {
        // Questi NON devono essere estratti
        street: "VIA SUPEJA GALLINO 20/28",
        postalCode: "10060",
        city: "NONE",
        province: "TO"
    }
};

async function testVettoreExclusion() {
    console.log('🧪 Testing Vettore Address Exclusion...\n');
    
    if (!window.RobustAddressExtractor) {
        console.error('❌ RobustAddressExtractor not loaded!');
        return;
    }
    
    const extractor = new window.RobustAddressExtractor({
        debug: true,
        logStrategies: true,
        saveIntermediateResults: true
    });
    
    console.log('📋 Test Case: DDT with vettore address that should NOT be extracted');
    console.log('Expected: VIA SALUZZO, 65 12038 SAVIGLIANO CN');
    console.log('NOT Expected: VIA SUPEJA GALLINO 20/28 10060 NONE TO (vettore)');
    console.log('='.repeat(60));
    
    try {
        const result = await extractor.extractDeliveryAddress(
            testDDTVettore.rows,
            testDDTVettore.metadata
        );
        
        if (!result) {
            console.error('❌ No address extracted!');
            return;
        }
        
        console.log('\n📍 Extracted address:', result);
        
        const components = result.components || result.structured;
        let testPassed = true;
        
        // Verifica che abbiamo estratto l'indirizzo corretto
        console.log('\n✅ Checking correct extraction:');
        Object.keys(testDDTVettore.expected).forEach(field => {
            const expected = testDDTVettore.expected[field];
            const actual = components[field] || '';
            
            if (expected !== actual) {
                console.error(`❌ ${field}: expected "${expected}", got "${actual}"`);
                testPassed = false;
            } else {
                console.log(`✅ ${field}: "${actual}"`);
            }
        });
        
        // Verifica che NON abbiamo estratto l'indirizzo del vettore
        console.log('\n🚫 Checking vettore exclusion:');
        const formatted = result.formatted || '';
        const formattedLower = formatted.toLowerCase();
        
        // Controlla che non contenga parti dell'indirizzo del vettore
        const vettoreStrings = ['supeja', 'gallino', '10060', 'none'];
        vettoreStrings.forEach(str => {
            if (formattedLower.includes(str)) {
                console.error(`❌ Found vettore string "${str}" in extracted address!`);
                testPassed = false;
            } else {
                console.log(`✅ Vettore string "${str}" NOT found (good!)`);
            }
        });
        
        if (testPassed) {
            console.log('\n✅ TEST PASSED! Vettore address correctly excluded.');
        } else {
            console.log('\n❌ TEST FAILED! Issues with address extraction.');
        }
        
        // Mostra strategie utilizzate
        if (extractor.intermediateResults.length > 0) {
            console.log('\n📊 Strategy results:');
            extractor.intermediateResults.forEach(ir => {
                console.log(`   - ${ir.strategy}: confidence ${ir.result.confidence}`);
                if (ir.result.address) {
                    console.log(`     Address: ${ir.result.address.street || 'N/A'}`);
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Esegui il test
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testVettoreExclusion);
} else {
    testVettoreExclusion();
}