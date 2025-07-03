/**
 * Test per verificare l'estrazione REALE degli indirizzi
 * Verifica che il sistema estragga l'indirizzo dal documento, non uno predefinito
 */

console.log('====================================');
console.log('TEST ESTRAZIONE INDIRIZZO REALE');
console.log('====================================\n');

// Test cases con diversi indirizzi per lo stesso cliente
const testCases = [
    {
        name: 'DONAC - Indirizzo Savigliano',
        text: `4521 19/05/25 1 20322
DONAC S.R.L. DONAC S.R.L.
VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65
12100 - CUNEO CN 12038 SAVIGLIANO CN`,
        expectedAddress: 'VIA SALUZZO, 65 12038 SAVIGLIANO CN'
    },
    {
        name: 'DONAC - Indirizzo Cuneo',
        text: `4522 20/05/25 1 20322
DONAC S.R.L. DONAC S.R.L.
VIA ROMA, 15 VIA ROMA, 15
12100 - CUNEO CN 12100 - CUNEO CN`,
        expectedAddress: 'VIA ROMA, 15 12100 - CUNEO CN'
    },
    {
        name: 'DONAC - Indirizzo Torino',
        text: `4523 21/05/25 1 20322
DONAC S.R.L. DONAC S.R.L.
VIA MARGARITA, 8 LOC. TETTO GARETTO VIA GARIBALDI, 25
12100 - CUNEO CN 10100 TORINO TO`,
        expectedAddress: 'VIA GARIBALDI, 25 10100 TORINO TO'
    },
    {
        name: 'BOREALE - Indirizzo Volpiano',
        text: `701814 25/03/25 1 00224
BOREALE SRL BOREALE SRL
VIA BERTOLE', 13/15 VIA MEANA, SNC
10088 - VOLPIANO TO 10088 VOLPIANO TO`,
        expectedAddress: 'VIA MEANA, SNC 10088 VOLPIANO TO'
    },
    {
        name: 'BOREALE - Indirizzo Torino con ingresso',
        text: `700633 25/03/25 1 00224
BOREALE SRL BOREALE SRL
VIA BERTOLE', 13/15 VIA CESANA, 78
                    INGR. SCARICO: VIA PEROSA, 75
10088 - VOLPIANO TO 10139 TORINO TO`,
        expectedAddress: 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO'
    }
];

// Funzione di test
function runTest(testCase) {
    console.log(`\nTest: ${testCase.name}`);
    console.log('------------------------');
    
    if (window.extractRealDeliveryAddress) {
        const result = window.extractRealDeliveryAddress(testCase.text);
        console.log(`Atteso: "${testCase.expectedAddress}"`);
        console.log(`Estratto: "${result}"`);
        
        if (result === testCase.expectedAddress) {
            console.log('✅ PASS');
        } else {
            console.log('❌ FAIL');
        }
    } else {
        console.log('❌ extractRealDeliveryAddress non disponibile');
    }
}

// Esegui tutti i test
console.log('Esecuzione test...\n');
testCases.forEach(runTest);

// Test della funzione extractSecondColumn
console.log('\n\n====================================');
console.log('TEST ESTRAZIONE SECONDA COLONNA');
console.log('====================================\n');

const columnTests = [
    {
        line: 'VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65',
        expected: 'VIA SALUZZO, 65'
    },
    {
        line: '12100 - CUNEO CN 12038 SAVIGLIANO CN',
        expected: '12038 SAVIGLIANO CN'
    },
    {
        line: 'DONAC S.R.L. DONAC S.R.L.',
        expected: 'DONAC S.R.L.'
    },
    {
        line: '[X:39, "VIA MARGARITA, 8"] [X:309, "VIA SALUZZO, 65"]',
        expected: 'VIA SALUZZO, 65'
    },
    {
        line: 'VIA ROMA, 15     |     VIA ROMA, 15',
        expected: 'VIA ROMA, 15'
    }
];

if (window.extractSecondColumn) {
    columnTests.forEach(test => {
        const result = window.extractSecondColumn(test.line);
        console.log(`Input: "${test.line}"`);
        console.log(`Atteso: "${test.expected}"`);
        console.log(`Estratto: "${result}"`);
        console.log(result === test.expected ? '✅ PASS\n' : '❌ FAIL\n');
    });
} else {
    console.log('❌ extractSecondColumn non disponibile');
}

console.log('\n✨ Test completato!');
console.log('\n⚠️ IMPORTANTE: Il sistema ora estrae SEMPRE l\'indirizzo reale dal documento.');
console.log('   Non vengono più assegnati indirizzi predefiniti basati sul nome cliente.');