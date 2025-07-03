/**
 * Test specifico per DDV DONAC
 * Verifica l'estrazione corretta dell'indirizzo di consegna
 */

console.log('====================================');
console.log('TEST DDV DONAC - ESTRAZIONE INDIRIZZO');
console.log('====================================\n');

// Simula i dati del PDF come appaiono nel debug
const testData = {
    rows: [
        // Riga 27: DDV pattern
        [
            {text: '4521', x: 353},
            {text: '19/05/25', x: 422},
            {text: '1', x: 487},
            {text: '20322', x: 543}
        ],
        // Riga 28: Nome cliente duplicato
        [
            {text: 'DONAC S.R.L.', x: 39},
            {text: 'DONAC S.R.L.', x: 309}
        ],
        // Riga 29: Indirizzi
        [
            {text: 'VIA MARGARITA, 8 LOC. TETTO GARETTO', x: 39},
            {text: 'VIA SALUZZO, 65', x: 309}
        ],
        // Riga 30: CAP e città
        [
            {text: '12100 - CUNEO CN', x: 39},
            {text: '12038 SAVIGLIANO CN', x: 309}
        ]
    ],
    expectedResult: {
        clientName: 'DONAC S.R.L.',
        deliveryAddress: 'VIA SALUZZO, 65 12038 SAVIGLIANO CN',
        clientCode: '20322',
        documentNumber: '4521'
    }
};

// Test con il Precise Extractor
if (window.PreciseDeliveryAddressExtractor) {
    console.log('🧪 Test con PreciseDeliveryAddressExtractor\n');
    
    const extractor = new PreciseDeliveryAddressExtractor({ debug: true });
    
    // Simula il testo completo
    const fullText = `4521 19/05/25 1 20322
DONAC S.R.L. DONAC S.R.L.
VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65
12100 - CUNEO CN 12038 SAVIGLIANO CN`;
    
    const metadata = {
        documentType: 'DDT',
        clientName: 'DONAC S.R.L.',
        documentNumber: '4521'
    };
    
    console.log('Input:');
    console.log('------');
    console.log(fullText);
    console.log('\nMetadata:', metadata);
    console.log('\n');
    
    // Esegui estrazione
    const result = extractor.extract(testData.rows, fullText, metadata);
    
    console.log('\n\nRISULTATI:');
    console.log('----------');
    
    if (result) {
        console.log('✅ Indirizzo estratto:', result.address);
        console.log('   Metodo utilizzato:', result.method);
        console.log('   Confidence:', result.confidence);
        
        // Verifica correttezza
        if (result.address === testData.expectedResult.deliveryAddress) {
            console.log('\n✅ TEST PASSATO! L\'indirizzo corrisponde al risultato atteso.');
        } else {
            console.log('\n❌ TEST FALLITO!');
            console.log('   Atteso:', testData.expectedResult.deliveryAddress);
            console.log('   Ottenuto:', result.address);
        }
    } else {
        console.log('❌ Nessun indirizzo estratto!');
    }
    
} else {
    console.error('❌ PreciseDeliveryAddressExtractor non trovato!');
}

// Test simulazione estrazione colonne
console.log('\n\n====================================');
console.log('TEST ESTRAZIONE COLONNE');
console.log('====================================\n');

function testColumnExtraction(line, description) {
    console.log(`Test: ${description}`);
    console.log(`Input: "${line}"`);
    
    // Simula l'estrazione delle colonne
    const patterns = [
        // Pattern 1: Due VIA
        {
            regex: /^(.+?VIA[^,]+(?:,\s*\d+[^V]*)?)\s+(VIA.+)$/i,
            name: 'Due VIA'
        },
        // Pattern 2: Due CAP
        {
            regex: /^(.+?\d{5}[^0-9]+[A-Z]{2})\s+(\d{5}.+)$/i,
            name: 'Due CAP'
        },
        // Pattern 3: Split su spazi multipli
        {
            regex: null,
            name: 'Spazi multipli',
            extract: (line) => {
                const parts = line.split(/\s{2,}/);
                if (parts.length >= 2) {
                    return {
                        left: parts[0].trim(),
                        right: parts[parts.length - 1].trim()
                    };
                }
                return null;
            }
        }
    ];
    
    let extracted = false;
    
    for (const pattern of patterns) {
        if (pattern.regex) {
            const match = line.match(pattern.regex);
            if (match) {
                console.log(`✅ Estratto con pattern "${pattern.name}":`);
                console.log(`   Sinistra: "${match[1].trim()}"`);
                console.log(`   Destra: "${match[2].trim()}"`);
                extracted = true;
                break;
            }
        } else if (pattern.extract) {
            const result = pattern.extract(line);
            if (result) {
                console.log(`✅ Estratto con pattern "${pattern.name}":`);
                console.log(`   Sinistra: "${result.left}"`);
                console.log(`   Destra: "${result.right}"`);
                extracted = true;
                break;
            }
        }
    }
    
    if (!extracted) {
        console.log('❌ Nessun pattern ha funzionato');
    }
    
    console.log('');
}

// Test vari pattern
testColumnExtraction(
    'DONAC S.R.L. DONAC S.R.L.',
    'Nome cliente duplicato'
);

testColumnExtraction(
    'VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65',
    'Due indirizzi VIA'
);

testColumnExtraction(
    '12100 - CUNEO CN 12038 SAVIGLIANO CN',
    'Due CAP e città'
);

testColumnExtraction(
    'VIA BERTOLE\', 13/15 VIA CESANA, 78',
    'Due indirizzi con apostrofo'
);

console.log('\n✨ Test completato!');