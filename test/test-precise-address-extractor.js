/**
 * Test per il PreciseDeliveryAddressExtractor
 * Verifica l'estrazione precisa degli indirizzi di consegna
 */

console.log('====================================');
console.log('TEST PRECISE DELIVERY ADDRESS EXTRACTOR');
console.log('====================================\n');

// Verifica che l'extractor sia caricato
if (!window.PreciseDeliveryAddressExtractor) {
    console.error('❌ PreciseDeliveryAddressExtractor non trovato!');
    console.error('Assicurati di caricare precise-delivery-address-extractor.js prima di questo test.');
} else {
    console.log('✅ PreciseDeliveryAddressExtractor caricato correttamente\n');
    
    // Crea istanza per test
    const extractor = new PreciseDeliveryAddressExtractor({ debug: true });
    
    // Test cases basati sui documenti reali
    const testCases = [
        {
            name: 'DDV_701814_2025 - BOREALE',
            metadata: {
                documentType: 'DDT',
                clientName: 'BOREALE SRL',
                documentNumber: '701814'
            },
            text: `CONSORZIO MELINDA Soc. Cons. a r.l.
ALFIERI SPECIALITÀ ALIMENTARI S.a.s.
ALFIERI SPEC. S.a.s. di Alfieri Giuseppe & C.
VIA G. Marconi, 10 - 12044 Centallo (CN) Tel 0171 214142 - Fax 0171 214540
Partita IVA / C.F. 03948460047

701814 25 00224
BOREALE SRL BOREALE SRL
VIA BERTOLE', 13/15 VIA MEANA, SNC
10088 - VOLPIANO TO 10088 VOLPIANO TO

Luogo di consegna                           Luogo di destinazione

DOCUMENTO DI TRASPORTO    N. 701814/2025      del 29/03/2025    Pag. 1
Trasporto a mezzo VETTORE                          TO 74321
Aspetto esteriore dei beni: CT
`,
            expectedAddress: 'VIA MEANA, SNC 10088 VOLPIANO TO'
        },
        {
            name: 'DDV_700633_2025 - BOREALE (con ingresso scarico)',
            metadata: {
                documentType: 'DDT',
                clientName: 'BOREALE SRL',
                documentNumber: '700633'
            },
            text: `DDV 700633 25 00224
BOREALE SRL BOREALE SRL
VIA BERTOLE', 13/15 VIA CESANA, 78
                    INGR. SCARICO: VIA PEROSA, 75
10088 - VOLPIANO TO 10139 TORINO TO

DOCUMENTO DI TRASPORTO N. 700633/2025`,
            expectedAddress: 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO'
        },
        {
            name: 'DDV con pattern doppia colonna - DONAC',
            metadata: {
                documentType: 'DDT',
                clientName: 'DONAC S.R.L.',
                documentNumber: '4521'
            },
            text: `4521 19/05/25 1 20322
DONAC S.R.L. DONAC S.R.L.
VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65
12100 - CUNEO CN 12038 SAVIGLIANO CN`,
            expectedAddress: 'VIA SALUZZO, 65 12038 SAVIGLIANO CN'
        },
        {
            name: 'Fattura con indirizzo consegna',
            metadata: {
                documentType: 'FATTURA',
                clientName: 'TEST CLIENTE',
                documentNumber: 'FT123'
            },
            text: `FATTURA N. 123

Cliente: TEST CLIENTE
P.IVA: 12345678901

Luogo di consegna: VIA ROMA, 10
20100 MILANO MI

Vettore: S.A.F.I.M.
VIA SUPEJA GALLINO 20/28
10060 NONE TO`,
            expectedAddress: 'VIA ROMA, 10 20100 MILANO MI'
        }
    ];
    
    console.log('Esecuzione test cases:\n');
    let passedTests = 0;
    let failedTests = 0;
    
    testCases.forEach((testCase, index) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Test ${index + 1}: ${testCase.name}`);
        console.log(`${'='.repeat(60)}`);
        
        // Converti il testo in rows
        const lines = testCase.text.split('\n');
        const rows = lines.map(line => {
            // Simula struttura rows con elementi
            const parts = line.split(/\s{2,}/);
            if (parts.length > 1) {
                return parts.map((part, idx) => ({
                    text: part.trim(),
                    x: idx * 300
                }));
            }
            return [{text: line.trim(), x: 0}];
        });
        
        // Esegui estrazione
        const result = extractor.extract(rows, testCase.text, testCase.metadata);
        
        console.log(`\nRisultato atteso: "${testCase.expectedAddress}"`);
        
        if (result) {
            console.log(`Risultato ottenuto: "${result.address}"`);
            console.log(`Metodo utilizzato: ${result.method}`);
            console.log(`Confidence: ${result.confidence}`);
            
            if (result.address === testCase.expectedAddress) {
                console.log('✅ TEST PASSATO');
                passedTests++;
            } else {
                console.log('❌ TEST FALLITO - Indirizzo non corrisponde');
                failedTests++;
            }
        } else {
            console.log('Risultato ottenuto: null');
            console.log('❌ TEST FALLITO - Nessun indirizzo estratto');
            failedTests++;
        }
    });
    
    // Test con indirizzo vettore che non deve essere estratto
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('Test speciale: Esclusione indirizzo vettore');
    console.log(`${'='.repeat(60)}`);
    
    const vettoreTest = {
        text: `Cliente: TEST
VIA ROMA, 10
20100 MILANO MI

Vettore: S.A.F.I.M.
VIA SUPEJA GALLINO 20/28
10060 NONE TO`,
        expectedNull: true
    };
    
    const vettoreRows = vettoreTest.text.split('\n').map(line => [{text: line, x: 0}]);
    const vettoreResult = extractor.extract(vettoreRows, vettoreTest.text, {});
    
    if (!vettoreResult || !vettoreResult.address.includes('SUPEJA GALLINO')) {
        console.log('✅ TEST PASSATO - Indirizzo vettore correttamente escluso');
        passedTests++;
    } else {
        console.log('❌ TEST FALLITO - Indirizzo vettore estratto erroneamente');
        console.log(`Risultato: ${vettoreResult.address}`);
        failedTests++;
    }
    
    // Risultati finali
    console.log('\n\n====================================');
    console.log('RISULTATI FINALI:');
    console.log('====================================');
    console.log(`Test passati: ${passedTests}/${testCases.length + 1}`);
    console.log(`Test falliti: ${failedTests}/${testCases.length + 1}`);
    
    if (failedTests === 0) {
        console.log('\n✅ TUTTI I TEST SONO PASSATI!');
        console.log('Il PreciseDeliveryAddressExtractor funziona correttamente.');
    } else {
        console.log('\n❌ ALCUNI TEST SONO FALLITI!');
        console.log('Verifica l\'implementazione dell\'extractor.');
    }
}

// Test modalità non-strict
console.log('\n\n====================================');
console.log('TEST MODALITÀ NON-STRICT');
console.log('====================================\n');

const nonStrictExtractor = new PreciseDeliveryAddressExtractor({ 
    debug: false, 
    strict: false 
});

const nonStrictTest = {
    text: `Cliente: ABC
Consegnare presso: MAGAZZINO CENTRALE
20100 MILANO`,
    expectedPartial: 'MAGAZZINO CENTRALE 20100 MILANO'
};

const nonStrictRows = nonStrictTest.text.split('\n').map(line => [{text: line, x: 0}]);
const nonStrictResult = nonStrictExtractor.extract(
    nonStrictRows, 
    nonStrictTest.text, 
    { clientName: 'ABC' }
);

console.log('Test indirizzo parziale (senza via):');
console.log(`Input: "${nonStrictTest.text}"`);
if (nonStrictResult) {
    console.log(`Risultato: "${nonStrictResult.address}"`);
    console.log(`Metodo: ${nonStrictResult.method}`);
    console.log('✅ Modalità non-strict funziona correttamente');
} else {
    console.log('❌ Nessun risultato in modalità non-strict');
}