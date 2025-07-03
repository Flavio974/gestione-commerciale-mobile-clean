/**
 * Test specifico per il pattern LOC. TETTO GARETTO | VIA SALUZZO, 65
 * Verifica che l'estrazione escluda correttamente la parte LOC della prima colonna
 */

console.log('===============================================');
console.log('TEST FIX PATTERN LOC/LOCALITÀ');
console.log('===============================================\n');

// Test cases specifici per il problema segnalato
const testCases = [
    {
        name: 'Pattern LOC. TETTO GARETTO + VIA SALUZZO',
        input: 'LOC. TETTO GARETTO VIA SALUZZO, 65',
        expected: 'VIA SALUZZO, 65',
        description: 'Deve estrarre solo VIA SALUZZO, 65 escludendo LOC. TETTO GARETTO'
    },
    {
        name: 'Pattern con spazi multipli',
        input: 'LOC. TETTO GARETTO     VIA SALUZZO, 65',
        expected: 'VIA SALUZZO, 65',
        description: 'Gestisce spazi multipli tra le colonne'
    },
    {
        name: 'Pattern LOCALITÀ completa',
        input: 'LOCALITÀ TETTO GARETTO VIA SALUZZO, 65',
        expected: 'VIA SALUZZO, 65',
        description: 'Funziona anche con LOCALITÀ invece di LOC.'
    },
    {
        name: 'Pattern FRAZ.',
        input: 'FRAZ. ESEMPIO VIA ROMA, 123',
        expected: 'VIA ROMA, 123',
        description: 'Gestisce anche FRAZIONE'
    },
    {
        name: 'Pattern con due VIA',
        input: 'VIA MARGARITA, 8 VIA SALUZZO, 65',
        expected: 'VIA SALUZZO, 65',
        description: 'Estrae la seconda VIA quando ci sono due indirizzi'
    },
    {
        name: 'Pattern misto LOC + doppia VIA',
        input: 'VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65',
        expected: 'VIA SALUZZO, 65',
        description: 'Gestisce combinazioni complesse'
    }
];

// Test della funzione extractSecondColumn
console.log('📋 TEST extractSecondColumn:\n');

if (window.extractSecondColumn) {
    testCases.forEach((test, index) => {
        console.log(`Test ${index + 1}: ${test.name}`);
        console.log(`Input:    "${test.input}"`);
        console.log(`Atteso:   "${test.expected}"`);
        
        const result = window.extractSecondColumn(test.input);
        console.log(`Estratto: "${result}"`);
        
        const passed = result === test.expected;
        console.log(`Risultato: ${passed ? '✅ PASS' : '❌ FAIL'}`);
        
        if (!passed) {
            console.log(`⚠️  ${test.description}`);
        }
        
        console.log('—'.repeat(50) + '\n');
    });
} else {
    console.error('❌ extractSecondColumn non disponibile!');
}

// Test con documento completo
console.log('\n📋 TEST DOCUMENTO COMPLETO:\n');

const fullDocument = `4521 19/05/25 1 20322
DONAC S.R.L. DONAC S.R.L.
VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65
12100 - CUNEO CN 12038 SAVIGLIANO CN`;

if (window.extractRealDeliveryAddress) {
    console.log('Documento di test:');
    console.log(fullDocument);
    console.log('\n');
    
    const result = window.extractRealDeliveryAddress(fullDocument);
    console.log(`Indirizzo estratto: "${result}"`);
    console.log(`Atteso: "VIA SALUZZO, 65 12038 SAVIGLIANO CN"`);
    
    const isCorrect = result === 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
    console.log(`\n${isCorrect ? '✅ ESTRAZIONE CORRETTA!' : '❌ ESTRAZIONE NON CORRETTA'}`);
} else {
    console.error('❌ extractRealDeliveryAddress non disponibile!');
}

// Test integrazione con RobustAddressExtractor
console.log('\n\n📋 TEST INTEGRAZIONE ROBUST EXTRACTOR:\n');

if (window.RobustDeliveryAddressExtractor) {
    const extractor = new window.RobustDeliveryAddressExtractor({ debug: false });
    
    // Prepara i dati nel formato rows
    const testRows = [
        [{ x: 0, text: '4521 19/05/25 1 20322' }],
        [
            { x: 39, text: 'DONAC S.R.L.' },
            { x: 309, text: 'DONAC S.R.L.' }
        ],
        [
            { x: 39, text: 'VIA MARGARITA, 8 LOC. TETTO GARETTO' },
            { x: 309, text: 'VIA SALUZZO, 65' }
        ],
        [
            { x: 39, text: '12100 - CUNEO CN' },
            { x: 309, text: '12038 SAVIGLIANO CN' }
        ]
    ];
    
    // Test con coordinate esplicite
    console.log('Test con coordinate X esplicite:');
    const result1 = extractor.extractDeliveryAddress(testRows, { clientName: 'DONAC S.R.L.' });
    
    if (result1) {
        console.log(`Estratto: "${result1.formatted}"`);
        console.log(`Metodo: ${result1.method || 'N/A'}`);
        
        const hasLoc = result1.formatted.includes('LOC') || result1.formatted.includes('TETTO GARETTO');
        console.log(`\n${!hasLoc ? '✅ Corretto: non contiene LOC/TETTO GARETTO' : '❌ Errore: contiene ancora LOC/TETTO GARETTO'}`);
    } else {
        console.log('❌ Nessun risultato estratto');
    }
    
    // Test senza coordinate (testo semplice)
    console.log('\n\nTest senza coordinate X (parsing automatico):');
    
    // Simula il parsing automatico
    function textToAutoRows(text) {
        const lines = text.split('\n');
        const rows = [];
        
        lines.forEach(line => {
            if (!line.trim()) return;
            
            const elements = [];
            
            // Usa la stessa logica del modulo di integrazione
            if (line.match(/\b(LOC\.|LOCALITÀ|FRAZ\.|FRAZIONE)\s+.+\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA)/i)) {
                const addressMatch = line.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+.+$/i);
                if (addressMatch) {
                    const firstPart = line.substring(0, line.indexOf(addressMatch[0])).trim();
                    if (firstPart) {
                        elements.push({ x: 39, text: firstPart });
                    }
                    elements.push({ x: 309, text: addressMatch[0].trim() });
                }
            } else {
                elements.push({ x: 0, text: line.trim() });
            }
            
            if (elements.length > 0) {
                rows.push(elements);
            }
        });
        
        return rows;
    }
    
    const autoRows = textToAutoRows(fullDocument);
    console.log('Rows generate automaticamente:', JSON.stringify(autoRows, null, 2));
    
    const result2 = extractor.extractDeliveryAddress(autoRows, { clientName: 'DONAC S.R.L.' });
    
    if (result2) {
        console.log(`\nEstratto: "${result2.formatted}"`);
        
        const hasLoc = result2.formatted.includes('LOC') || result2.formatted.includes('TETTO GARETTO');
        console.log(`${!hasLoc ? '✅ Corretto: non contiene LOC/TETTO GARETTO' : '❌ Errore: contiene ancora LOC/TETTO GARETTO'}`);
    } else {
        console.log('❌ Nessun risultato estratto');
    }
    
} else {
    console.error('❌ RobustDeliveryAddressExtractor non disponibile!');
}

console.log('\n\n===============================================');
console.log('✨ TEST COMPLETATI');
console.log('===============================================\n');