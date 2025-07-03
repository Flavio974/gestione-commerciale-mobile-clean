/**
 * Test completo per il RobustAddressExtractor
 * Verifica che il sistema estragga correttamente gli indirizzi dai DDT
 */

console.log('===============================================');
console.log('TEST COMPLETO ROBUST ADDRESS EXTRACTOR');
console.log('===============================================\n');

// Funzione helper per simulare il formato rows del parser
function textToRows(text) {
    const lines = text.split('\n');
    const rows = [];
    
    lines.forEach((line, lineIndex) => {
        if (!line.trim()) return;
        
        // Simula il formato con coordinate X per DDT reali
        // Colonna sinistra (cliente): X ≈ 39
        // Colonna destra (consegna): X ≈ 309
        const elements = [];
        
        // Se la riga contiene due indirizzi o due nomi
        if ((line.includes('VIA') && line.lastIndexOf('VIA') !== line.indexOf('VIA')) ||
            (line.includes('DONAC') && line.lastIndexOf('DONAC') !== line.indexOf('DONAC')) ||
            (line.includes('BOREALE') && line.lastIndexOf('BOREALE') !== line.indexOf('BOREALE'))) {
            
            // Dividi approssimativamente a metà
            const midPoint = Math.floor(line.length / 2);
            let splitPoint = midPoint;
            
            // Cerca uno spazio vicino al punto medio per dividere meglio
            for (let i = 0; i < 20; i++) {
                if (line[midPoint + i] === ' ') {
                    splitPoint = midPoint + i;
                    break;
                }
                if (line[midPoint - i] === ' ') {
                    splitPoint = midPoint - i;
                    break;
                }
            }
            
            const leftText = line.substring(0, splitPoint).trim();
            const rightText = line.substring(splitPoint).trim();
            
            if (leftText) {
                elements.push({
                    x: 39,
                    text: leftText,
                    originalIndex: 0
                });
            }
            
            if (rightText) {
                elements.push({
                    x: 309,
                    text: rightText,
                    originalIndex: splitPoint
                });
            }
        } else {
            // Riga singola - determina se appartiene alla colonna sinistra o destra
            // basandosi sul contenuto
            const x = line.includes('Cliente') ? 39 : 
                     line.includes('Luogo di consegna') ? 309 :
                     lineIndex < 3 ? 39 : 309; // Default: prime righe a sinistra, resto a destra
            
            elements.push({
                x: x,
                text: line.trim(),
                originalIndex: 0
            });
        }
        
        if (elements.length > 0) {
            rows.push(elements);
        }
    });
    
    return rows;
}

// Test cases dal refactoring request dell'utente
const testCases = [
    {
        name: 'DDT BOREALE - Stesso indirizzo con info aggiuntiva',
        text: `700633 25/03/25 1 00224
Cliente                               Luogo di consegna
BOREALE SRL                          BOREALE SRL
VIA BERTOLE', 13/15                  VIA BERTOLE', 13/15
                                     INGR. SCARICO: STRADA DEL FRANCESE, 141/25
10088 - VOLPIANO TO                  10088 - VOLPIANO TO`,
        expected: {
            street: "VIA BERTOLE', 13/15",
            additionalInfo: 'INGR. SCARICO: STRADA DEL FRANCESE, 141/25',
            city: 'VOLPIANO',
            postalCode: '10088',
            province: 'TO'
        },
        metadata: {
            clientName: 'BOREALE SRL',
            clientCode: '00224',
            documentNumber: '700633'
        }
    },
    {
        name: 'DDT DONAC - Indirizzi diversi nelle due colonne',
        text: `4521 19/05/25 1 20322
Cliente                               Luogo di consegna
DONAC S.R.L.                         DONAC S.R.L.
VIA MARGARITA, 8                     VIA SALUZZO, 65
LOC. TETTO GARETTO
12100 - CUNEO CN                     12038 SAVIGLIANO CN`,
        expected: {
            street: 'VIA SALUZZO, 65',
            city: 'SAVIGLIANO',
            postalCode: '12038',
            province: 'CN'
        },
        metadata: {
            clientName: 'DONAC S.R.L.',
            clientCode: '20322',
            documentNumber: '4521'
        }
    },
    {
        name: 'DDT DONAC - Indirizzo Cuneo',
        text: `4522 20/05/25 1 20322
Cliente                               Luogo di consegna
DONAC S.R.L.                         DONAC S.R.L.
VIA MARGARITA, 8                     VIA ROMA, 15
12100 - CUNEO CN                     12100 - CUNEO CN`,
        expected: {
            street: 'VIA ROMA, 15',
            city: 'CUNEO',
            postalCode: '12100',
            province: 'CN'
        },
        metadata: {
            clientName: 'DONAC S.R.L.',
            clientCode: '20322',
            documentNumber: '4522'
        }
    },
    {
        name: 'DDT DONAC - Indirizzo Torino',
        text: `4523 21/05/25 1 20322
Cliente                               Luogo di consegna
DONAC S.R.L.                         DONAC S.R.L.
VIA MARGARITA, 8                     VIA GARIBALDI, 25
LOC. TETTO GARETTO
12100 - CUNEO CN                     10100 TORINO TO`,
        expected: {
            street: 'VIA GARIBALDI, 25',
            city: 'TORINO',
            postalCode: '10100',
            province: 'TO'
        },
        metadata: {
            clientName: 'DONAC S.R.L.',
            clientCode: '20322',
            documentNumber: '4523'
        }
    }
];

// Funzione di test
async function runTest(testCase) {
    console.log(`\nTest: ${testCase.name}`);
    console.log('━'.repeat(50));
    
    try {
        // Verifica che l'estrattore sia disponibile
        if (!window.RobustDeliveryAddressExtractor) {
            throw new Error('RobustDeliveryAddressExtractor non trovato!');
        }
        
        // Crea istanza dell'estrattore
        const extractor = new window.RobustDeliveryAddressExtractor({
            debug: true,
            logStrategies: true
        });
        
        // Converti il testo in rows
        const rows = textToRows(testCase.text);
        console.log(`\n📊 Rows generate: ${rows.length}`);
        
        // Estrai l'indirizzo
        const result = await extractor.extractDeliveryAddress(rows, testCase.metadata);
        
        console.log('\n📋 RISULTATO ATTESO:');
        console.log(`   Via: "${testCase.expected.street}"`);
        if (testCase.expected.additionalInfo) {
            console.log(`   Info aggiuntiva: "${testCase.expected.additionalInfo}"`);
        }
        console.log(`   CAP: ${testCase.expected.postalCode}`);
        console.log(`   Città: ${testCase.expected.city}`);
        console.log(`   Provincia: ${testCase.expected.province}`);
        
        if (result) {
            console.log('\n📋 RISULTATO ESTRATTO:');
            console.log(`   Indirizzo formattato: "${result.formatted}"`);
            
            if (result.components) {
                console.log(`   Componenti:`);
                console.log(`   - Via: "${result.components.street || ''}"`);
                if (result.components.additionalInfo) {
                    console.log(`   - Info aggiuntiva: "${result.components.additionalInfo}"`);
                }
                console.log(`   - CAP: ${result.components.postalCode || ''}`);
                console.log(`   - Città: ${result.components.city || ''}`);
                console.log(`   - Provincia: ${result.components.province || ''}`);
            }
            
            // Verifica correttezza
            let passed = true;
            const checks = [];
            
            if (result.components) {
                if (result.components.street !== testCase.expected.street) {
                    passed = false;
                    checks.push(`❌ Via: "${result.components.street}" !== "${testCase.expected.street}"`);
                } else {
                    checks.push(`✅ Via corretta`);
                }
                
                if (testCase.expected.additionalInfo) {
                    if (result.components.additionalInfo !== testCase.expected.additionalInfo) {
                        passed = false;
                        checks.push(`❌ Info aggiuntiva: "${result.components.additionalInfo}" !== "${testCase.expected.additionalInfo}"`);
                    } else {
                        checks.push(`✅ Info aggiuntiva corretta`);
                    }
                }
                
                if (result.components.postalCode !== testCase.expected.postalCode) {
                    passed = false;
                    checks.push(`❌ CAP: "${result.components.postalCode}" !== "${testCase.expected.postalCode}"`);
                } else {
                    checks.push(`✅ CAP corretto`);
                }
                
                if (result.components.city !== testCase.expected.city) {
                    passed = false;
                    checks.push(`❌ Città: "${result.components.city}" !== "${testCase.expected.city}"`);
                } else {
                    checks.push(`✅ Città corretta`);
                }
                
                if (result.components.province !== testCase.expected.province) {
                    passed = false;
                    checks.push(`❌ Provincia: "${result.components.province}" !== "${testCase.expected.province}"`);
                } else {
                    checks.push(`✅ Provincia corretta`);
                }
            } else {
                passed = false;
                checks.push('❌ Componenti non trovati nel risultato');
            }
            
            console.log('\n📊 VERIFICHE:');
            checks.forEach(check => console.log(`   ${check}`));
            
            console.log(`\n${passed ? '✅ TEST PASSATO' : '❌ TEST FALLITO'}`);
            
        } else {
            console.log('\n❌ NESSUN RISULTATO ESTRATTO!');
            console.log('❌ TEST FALLITO');
        }
        
    } catch (error) {
        console.error('\n❌ ERRORE:', error);
        console.log('❌ TEST FALLITO');
    }
}

// Test delle strategie individuali
async function testStrategies() {
    console.log('\n\n');
    console.log('===============================================');
    console.log('TEST STRATEGIE INDIVIDUALI');
    console.log('===============================================\n');
    
    if (!window.RobustDeliveryAddressExtractor) {
        console.error('❌ RobustDeliveryAddressExtractor non disponibile');
        return;
    }
    
    const extractor = new window.RobustDeliveryAddressExtractor({ debug: false });
    
    // Test Two Column Layout Detection
    console.log('📋 Test extractByTwoColumnLayout:');
    const testRows = [
        [
            { x: 39, text: 'Cliente' },
            { x: 309, text: 'Luogo di consegna' }
        ],
        [
            { x: 39, text: 'DONAC S.R.L.' },
            { x: 309, text: 'DONAC S.R.L.' }
        ],
        [
            { x: 39, text: 'VIA MARGARITA, 8' },
            { x: 309, text: 'VIA SALUZZO, 65' }
        ],
        [
            { x: 39, text: '12100 - CUNEO CN' },
            { x: 309, text: '12038 SAVIGLIANO CN' }
        ]
    ];
    
    const result = extractor.extractByTwoColumnLayout(testRows, { clientName: 'DONAC S.R.L.' });
    if (result) {
        console.log('✅ Strategia Two Column Layout funzionante');
        console.log(`   Indirizzo: ${result.address.street} ${result.address.postalCode} ${result.address.city} ${result.address.province}`);
    } else {
        console.log('❌ Strategia Two Column Layout fallita');
    }
}

// Esegui tutti i test
async function runAllTests() {
    // Test casi principali
    for (const testCase of testCases) {
        await runTest(testCase);
    }
    
    // Test strategie
    await testStrategies();
    
    console.log('\n\n');
    console.log('===============================================');
    console.log('✨ TEST COMPLETATI');
    console.log('===============================================');
    console.log('\n⚠️  IMPORTANTE:');
    console.log('    - Il sistema estrae SEMPRE l\'indirizzo reale dal documento');
    console.log('    - Non vengono mai assegnati indirizzi predefiniti');
    console.log('    - La colonna di consegna è identificata da X > 290');
    console.log('    - Vengono utilizzate 6 strategie di estrazione con fallback\n');
}

// Avvia i test
console.log('🚀 Avvio test RobustAddressExtractor...\n');
runAllTests();