/**
 * Test per verificare la correzione dell'estrazione indirizzi DDV
 */

console.log('====================================');
console.log('TEST CORREZIONE ESTRAZIONE DDV');
console.log('====================================\n');

// Funzione helper per testare l'estrazione della seconda colonna
function testExtractSecondColumn(line, expected) {
    console.log(`Input: "${line}"`);
    
    // Simula la logica di estrazione seconda colonna
    let result = '';
    
    // Metodo 1: Pattern con due VIA
    if (line.toUpperCase().includes('VIA')) {
        const viaCount = (line.match(/VIA/gi) || []).length;
        if (viaCount >= 2) {
            const lastViaIndex = line.toUpperCase().lastIndexOf('VIA');
            result = line.substring(lastViaIndex).trim();
            console.log(`  Metodo VIA: "${result}"`);
        }
    }
    
    // Metodo 2: Pattern con due CAP
    if (!result) {
        const capMatches = line.match(/\d{5}/g);
        if (capMatches && capMatches.length >= 2) {
            const lastCap = capMatches[capMatches.length - 1];
            const lastCapIndex = line.lastIndexOf(lastCap);
            let startIndex = lastCapIndex;
            
            // Cerca indietro per trovare l'inizio
            for (let i = lastCapIndex - 1; i >= 0; i--) {
                if (line[i].match(/\d/) && !line.substring(i, i + 5).match(/^\d{5}/)) {
                    break;
                }
                if (line[i] === ' ' && i < lastCapIndex - 10) {
                    startIndex = i + 1;
                    break;
                }
            }
            
            result = line.substring(startIndex).trim();
            console.log(`  Metodo CAP: "${result}"`);
        }
    }
    
    // Metodo 3: Split su spazi multipli
    if (!result) {
        const parts = line.split(/\s{2,}/);
        if (parts.length >= 2) {
            result = parts[parts.length - 1].trim();
            console.log(`  Metodo spazi: "${result}"`);
        }
    }
    
    // Fallback
    if (!result) {
        result = line.trim();
        console.log(`  Fallback: "${result}"`);
    }
    
    const passed = result === expected;
    console.log(`  Atteso: "${expected}"`);
    console.log(`  Risultato: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
    
    return passed;
}

// Test cases
console.log('=== TEST ESTRAZIONE SECONDA COLONNA ===\n');

const testCases = [
    {
        line: 'DONAC S.R.L. DONAC S.R.L.',
        expected: 'DONAC S.R.L.'
    },
    {
        line: 'VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65',
        expected: 'VIA SALUZZO, 65'
    },
    {
        line: '12100 - CUNEO CN 12038 SAVIGLIANO CN',
        expected: '12038 SAVIGLIANO CN'
    },
    {
        line: 'VIA BERTOLE\', 13/15 VIA CESANA, 78',
        expected: 'VIA CESANA, 78'
    },
    {
        line: '                    INGR. SCARICO: VIA PEROSA, 75',
        expected: 'INGR. SCARICO: VIA PEROSA, 75'
    }
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
    console.log(`Test ${index + 1}:`);
    if (testExtractSecondColumn(test.line, test.expected)) {
        passed++;
    } else {
        failed++;
    }
});

// Test completo documento
console.log('\n=== TEST DOCUMENTO COMPLETO ===\n');

const fullDocument = `4521 19/05/25 1 20322
DONAC S.R.L. DONAC S.R.L.
VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65
12100 - CUNEO CN 12038 SAVIGLIANO CN`;

console.log('Documento:');
console.log(fullDocument);
console.log('\nRisultato atteso:');
console.log('Nome: DONAC S.R.L.');
console.log('Indirizzo: VIA SALUZZO, 65 12038 SAVIGLIANO CN');

// Simula l'estrazione
const lines = fullDocument.split('\n');
const ddvLineIndex = 0;

if (lines[ddvLineIndex + 1]) {
    const clientLine = lines[ddvLineIndex + 1];
    const parts = clientLine.split(/\s{2,}/);
    const clientName = parts.length >= 2 ? parts[parts.length - 1] : clientLine.trim();
    console.log(`\nNome estratto: ${clientName}`);
}

if (lines[ddvLineIndex + 2] && lines[ddvLineIndex + 3]) {
    const addressLine = lines[ddvLineIndex + 2];
    const cityLine = lines[ddvLineIndex + 3];
    
    // Estrai seconda colonna indirizzo
    let deliveryStreet = '';
    if (addressLine.toUpperCase().includes('VIA') && (addressLine.match(/VIA/gi) || []).length >= 2) {
        const lastViaIndex = addressLine.toUpperCase().lastIndexOf('VIA');
        deliveryStreet = addressLine.substring(lastViaIndex).trim();
    }
    
    // Estrai seconda colonna città
    let deliveryCity = '';
    const capMatches = cityLine.match(/\d{5}/g);
    if (capMatches && capMatches.length >= 2) {
        const lastCap = capMatches[capMatches.length - 1];
        const lastCapIndex = cityLine.lastIndexOf(lastCap);
        deliveryCity = cityLine.substring(lastCapIndex).trim();
    }
    
    const fullAddress = `${deliveryStreet} ${deliveryCity}`;
    console.log(`Indirizzo estratto: ${fullAddress}`);
    
    if (fullAddress === 'VIA SALUZZO, 65 12038 SAVIGLIANO CN') {
        console.log('\n✅ ESTRAZIONE CORRETTA!');
        passed++;
    } else {
        console.log('\n❌ ESTRAZIONE ERRATA!');
        failed++;
    }
}

// Risultati finali
console.log('\n====================================');
console.log('RISULTATI FINALI:');
console.log('====================================');
console.log(`Test passati: ${passed}`);
console.log(`Test falliti: ${failed}`);

if (failed === 0) {
    console.log('\n✅ TUTTI I TEST SONO PASSATI!');
} else {
    console.log('\n❌ ALCUNI TEST SONO FALLITI!');
}