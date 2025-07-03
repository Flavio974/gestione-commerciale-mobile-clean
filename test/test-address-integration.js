/**
 * Test di integrazione per il sistema di estrazione indirizzi
 * Verifica che l'integrazione con DDTFTDocumentParser funzioni correttamente
 */

console.log('===============================================');
console.log('TEST INTEGRAZIONE ESTRAZIONE INDIRIZZI');
console.log('===============================================\n');

// Simula documenti DDT completi
const testDocuments = [
    {
        name: 'DDT DONAC Savigliano',
        fileName: 'DDT_4521_DONAC.pdf',
        text: `DOCUMENTO DI TRASPORTO
Numero: 4521 del 19/05/25 Pagina 1
Codice Cliente: 20322

Cliente                               Luogo di consegna
DONAC S.R.L.                         DONAC S.R.L.
VIA MARGARITA, 8                     VIA SALUZZO, 65
LOC. TETTO GARETTO
12100 - CUNEO CN                     12038 SAVIGLIANO CN

P.IVA: 02345678901

Vettore: SAFIM SRL
VIA ESEMPIO, 123
10100 TORINO TO

ARTICOLI:
COD.ART    DESCRIZIONE              Q.TA    UM
A001       PRODOTTO TEST 1          10      PZ
A002       PRODOTTO TEST 2          20      KG`,
        expectedDeliveryAddress: 'VIA SALUZZO, 65 12038 SAVIGLIANO CN'
    },
    {
        name: 'DDT BOREALE con ingresso scarico',
        fileName: 'DDT_700633_BOREALE.pdf',
        text: `DOCUMENTO DI TRASPORTO
Numero: 700633 del 25/03/25 Pagina 1
Codice Cliente: 00224

Cliente                               Luogo di consegna
BOREALE SRL                          BOREALE SRL
VIA BERTOLE', 13/15                  VIA CESANA, 78
                                     INGR. SCARICO: VIA PEROSA, 75
10088 - VOLPIANO TO                  10139 TORINO TO

P.IVA: 01234567890

ARTICOLI:
COD.ART    DESCRIZIONE              Q.TA    UM
B001       ALTRO PRODOTTO           5       CF`,
        expectedDeliveryAddress: 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO'
    },
    {
        name: 'DDT con formato coordinate',
        fileName: 'DDT_COORDINATE.pdf',
        text: `DDT 4522 20/05/25 1 20322
[X:39, "DONAC S.R.L."] [X:309, "DONAC S.R.L."]
[X:39, "VIA MARGARITA, 8"] [X:309, "VIA ROMA, 15"]
[X:39, "12100 - CUNEO CN"] [X:309, "12100 - CUNEO CN"]`,
        expectedDeliveryAddress: 'VIA ROMA, 15 12100 - CUNEO CN'
    }
];

// Funzione per testare il parser
async function testParser(testDoc) {
    console.log(`\nTest: ${testDoc.name}`);
    console.log('━'.repeat(50));
    
    try {
        // Verifica che il parser sia disponibile
        if (!window.DDTFTDocumentParser) {
            throw new Error('DDTFTDocumentParser non disponibile!');
        }
        
        // Simula il parsing del documento
        console.log('📄 Parsing documento...');
        const result = window.DDTFTDocumentParser.parseDocumentFromText(testDoc.text, testDoc.fileName);
        
        if (!result) {
            throw new Error('Parsing fallito - nessun risultato');
        }
        
        console.log('\n📋 RISULTATI PARSING:');
        console.log(`   Tipo documento: ${result.type || result.documentType || 'N/A'}`);
        console.log(`   Cliente: ${result.clientName || result.cliente || 'N/A'}`);
        console.log(`   Codice cliente: ${result.clientCode || result.codiceCliente || 'N/A'}`);
        console.log(`   Numero documento: ${result.documentNumber || 'N/A'}`);
        
        // Verifica indirizzo di consegna
        const deliveryAddress = result.deliveryAddress || result.indirizzoConsegna;
        
        console.log('\n📍 INDIRIZZO DI CONSEGNA:');
        console.log(`   Atteso: "${testDoc.expectedDeliveryAddress}"`);
        console.log(`   Estratto: "${deliveryAddress || 'NON TROVATO'}"`);
        
        if (result._addressExtractionMethod) {
            console.log(`   Metodo estrazione: ${result._addressExtractionMethod}`);
        }
        
        if (result.deliveryAddressComponents) {
            console.log('\n📋 COMPONENTI INDIRIZZO:');
            const comp = result.deliveryAddressComponents;
            console.log(`   Via: ${comp.street || 'N/A'}`);
            if (comp.additionalInfo) {
                console.log(`   Info aggiuntiva: ${comp.additionalInfo}`);
            }
            console.log(`   CAP: ${comp.postalCode || 'N/A'}`);
            console.log(`   Città: ${comp.city || 'N/A'}`);
            console.log(`   Provincia: ${comp.province || 'N/A'}`);
        }
        
        // Verifica correttezza
        const isCorrect = deliveryAddress === testDoc.expectedDeliveryAddress;
        console.log(`\n${isCorrect ? '✅ TEST PASSATO' : '❌ TEST FALLITO'}`);
        
        return isCorrect;
        
    } catch (error) {
        console.error('\n❌ ERRORE:', error);
        console.log('❌ TEST FALLITO');
        return false;
    }
}

// Test del sistema di override
async function testOverrides() {
    console.log('\n\n');
    console.log('===============================================');
    console.log('TEST SISTEMA DI OVERRIDE');
    console.log('===============================================\n');
    
    // Verifica che i moduli di override siano caricati
    const modules = [
        'RobustDeliveryAddressExtractor',
        'PreciseDeliveryAddressExtractor',
        'DDTFTDocumentParser',
        'extractRealDeliveryAddress',
        'extractSecondColumn'
    ];
    
    console.log('📋 Verifica moduli caricati:');
    modules.forEach(module => {
        const isLoaded = !!window[module];
        console.log(`   ${isLoaded ? '✅' : '❌'} ${module}`);
    });
    
    // Test funzioni helper
    if (window.extractSecondColumn) {
        console.log('\n📋 Test extractSecondColumn:');
        const testLines = [
            {
                input: 'VIA MARGARITA, 8                     VIA SALUZZO, 65',
                expected: 'VIA SALUZZO, 65'
            },
            {
                input: '[X:39, "DONAC S.R.L."] [X:309, "DONAC S.R.L."]',
                expected: 'DONAC S.R.L.'
            }
        ];
        
        testLines.forEach(test => {
            const result = window.extractSecondColumn(test.input);
            const passed = result === test.expected;
            console.log(`   ${passed ? '✅' : '❌'} "${test.input.substring(0, 30)}..." => "${result}"`);
        });
    }
}

// Test prestazioni
async function testPerformance() {
    console.log('\n\n');
    console.log('===============================================');
    console.log('TEST PRESTAZIONI');
    console.log('===============================================\n');
    
    if (!window.RobustDeliveryAddressExtractor) {
        console.log('❌ RobustDeliveryAddressExtractor non disponibile');
        return;
    }
    
    const extractor = new window.RobustDeliveryAddressExtractor({ debug: false });
    
    // Genera rows di test
    const testRows = [];
    for (let i = 0; i < 100; i++) {
        testRows.push([
            { x: 39, text: `Riga ${i} colonna 1` },
            { x: 309, text: `Riga ${i} colonna 2` }
        ]);
    }
    
    // Aggiungi header e indirizzo
    testRows.splice(5, 0, [
        { x: 39, text: 'Cliente' },
        { x: 309, text: 'Luogo di consegna' }
    ]);
    
    testRows.splice(7, 0, [
        { x: 39, text: 'VIA TEST, 123' },
        { x: 309, text: 'VIA CONSEGNA, 456' }
    ]);
    
    testRows.splice(8, 0, [
        { x: 39, text: '12345 CITTA TEST' },
        { x: 309, text: '67890 CITTA CONSEGNA CN' }
    ]);
    
    console.log(`📊 Test con ${testRows.length} righe`);
    
    const startTime = performance.now();
    const result = await extractor.extractDeliveryAddress(testRows, { clientName: 'TEST CLIENT' });
    const endTime = performance.now();
    
    console.log(`⏱️  Tempo di estrazione: ${(endTime - startTime).toFixed(2)}ms`);
    
    if (result) {
        console.log(`✅ Estrazione completata: "${result.formatted}"`);
    } else {
        console.log('❌ Estrazione fallita');
    }
}

// Esegui tutti i test
async function runAllTests() {
    // Test parser integrato
    let passedTests = 0;
    let totalTests = testDocuments.length;
    
    for (const testDoc of testDocuments) {
        const passed = await testParser(testDoc);
        if (passed) passedTests++;
    }
    
    console.log('\n\n📊 RIEPILOGO TEST PARSER:');
    console.log(`   Passati: ${passedTests}/${totalTests}`);
    console.log(`   Percentuale: ${((passedTests/totalTests) * 100).toFixed(0)}%`);
    
    // Test override
    await testOverrides();
    
    // Test prestazioni
    await testPerformance();
    
    console.log('\n\n');
    console.log('===============================================');
    console.log('✨ TEST DI INTEGRAZIONE COMPLETATI');
    console.log('===============================================\n');
}

// Avvia i test
console.log('🚀 Avvio test di integrazione...\n');
runAllTests();