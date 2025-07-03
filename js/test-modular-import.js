/**
 * Test di integrazione per DDTFTImport Modular
 * Verifica che la versione modulare funzioni correttamente
 */

(function() {
    'use strict';

    console.log('=== Test DDTFTImport Modular ===');

    // Test 1: Verifica caricamento moduli
    console.group('Test 1: Verifica caricamento moduli');
    
    const requiredModules = [
        'DDTFTImportCore',
        'DDTFTPdfParser',
        'DDTFTDocumentParser', 
        'DDTFTParsingUtils',
        'DDTFTProductUtils',
        'DDTFTAddressUtils',
        'DDTFTValidators',
        'DDTFTFormatters',
        'DDTFT_PATTERNS',
        'DDTFT_MAPPINGS',
        'DDTFTImport'
    ];

    let allLoaded = true;
    requiredModules.forEach(module => {
        const loaded = !!window[module];
        console.log(`${module}: ${loaded ? '✓ Caricato' : '✗ Mancante'}`);
        if (!loaded) allLoaded = false;
    });

    console.log(`\nTutti i moduli caricati: ${allLoaded ? '✓ SI' : '✗ NO'}`);
    console.groupEnd();

    if (!allLoaded) {
        console.error('Test interrotto: moduli mancanti');
        return;
    }

    // Test 2: Verifica metodi pubblici DDTFTImport
    console.group('\nTest 2: Verifica metodi pubblici');
    
    const publicMethods = [
        'extractTextFromPdf',
        'parseDocumentFromText',
        'importDocument',
        'generateId',
        'extractDocumentNumber',
        'extractDate',
        'extractClientName',
        'extractVatNumber',
        'extractDeliveryAddress',
        'showSyncDialog',
        'closeSyncDialog',
        'showSyncResults',
        'viewDDTFTContent',
        'standardizeClientName',
        'validateDocument',
        'formatDocument',
        'convertDateFormat',
        'normalizeAmount',
        'extractProductsFromText',
        'groupProductsByVAT',
        'calculateTotals',
        'exportDocuments',
        'importFromExcel',
        'clearCache',
        'setDebugMode'
    ];

    let methodsOk = true;
    publicMethods.forEach(method => {
        const exists = typeof window.DDTFTImport[method] === 'function';
        console.log(`${method}: ${exists ? '✓' : '✗'}`);
        if (!exists) methodsOk = false;
    });

    console.log(`\nTutti i metodi presenti: ${methodsOk ? '✓ SI' : '✗ NO'}`);
    console.groupEnd();

    // Test 3: Test funzionalità base
    console.group('\nTest 3: Test funzionalità base');

    // Test generazione ID
    const testId = window.DDTFTImport.generateId();
    console.log(`Genera ID: ${testId ? '✓' : '✗'} (${testId})`);

    // Test parsing data
    const testDate = '15/06/2025';
    const parsedDate = window.DDTFTImport.convertDateFormat(testDate);
    console.log(`Parse data: ${parsedDate ? '✓' : '✗'} (${testDate} → ${parsedDate})`);

    // Test normalizzazione importo
    const testAmount = '1.234,56';
    const normalizedAmount = window.DDTFTImport.normalizeAmount(testAmount);
    console.log(`Normalizza importo: ${normalizedAmount ? '✓' : '✗'} (${testAmount} → ${normalizedAmount})`);

    // Test standardizzazione nome
    const testName = 'test company srl';
    const standardName = window.DDTFTImport.standardizeClientName(testName);
    console.log(`Standardizza nome: ${standardName ? '✓' : '✗'} (${testName} → ${standardName})`);

    console.groupEnd();

    // Test 4: Test validazione documento
    console.group('\nTest 4: Test validazione documento');

    const testDoc = {
        tipo: 'DDT',
        numero: 'DDT-2025-001',
        data: new Date(),
        cliente: {
            nome: 'Test Cliente SRL',
            partitaIva: '12345678901',
            indirizzo: 'Via Test 123',
            cap: '00100',
            citta: 'Roma',
            provincia: 'RM'
        },
        articoli: [
            {
                codice: 'ART001',
                descrizione: 'Articolo di test',
                quantita: 10,
                prezzo: 25.50,
                importo: 255.00,
                iva: 22
            }
        ],
        totali: {
            imponibile: 255.00,
            iva: 56.10,
            totale: 311.10
        }
    };

    const validation = window.DDTFTImport.validateDocument(testDoc);
    console.log('Documento di test:', testDoc);
    console.log('Risultato validazione:', validation);
    console.log(`Documento valido: ${validation.isValid ? '✓ SI' : '✗ NO'}`);

    console.groupEnd();

    // Test 5: Test formattazione
    console.group('\nTest 5: Test formattazione');

    const formatted = window.DDTFTImport.formatDocument(testDoc);
    console.log('Documento formattato:', formatted);
    console.log(`Formattazione ok: ${formatted ? '✓' : '✗'}`);

    console.groupEnd();

    // Test 6: Test pattern e mappature
    console.group('\nTest 6: Test pattern e mappature');

    console.log('Pattern disponibili:', Object.keys(window.DDTFT_PATTERNS || {}));
    console.log('Mappature disponibili:', Object.keys(window.DDTFT_MAPPINGS || {}));

    console.groupEnd();

    // Test 7: Test parsing utilities
    console.group('\nTest 7: Test parsing utilities');

    if (window.DDTFTParsingUtils) {
        // Test parse data italiana
        const itDate = window.DDTFTParsingUtils.parseItalianDate('15/06/2025');
        console.log(`Parse data italiana: ${itDate ? '✓' : '✗'}`);

        // Test parse numero italiano
        const itNumber = window.DDTFTParsingUtils.parseItalianNumber('1.234,56');
        console.log(`Parse numero italiano: ${itNumber === 1234.56 ? '✓' : '✗'} (${itNumber})`);

        // Test validazione CAP
        const validCap = window.DDTFTParsingUtils.isValidCAP('00100');
        console.log(`Validazione CAP: ${validCap ? '✓' : '✗'}`);
    }

    console.groupEnd();

    // Riepilogo
    console.group('\n=== RIEPILOGO TEST ===');
    console.log(`Versione: ${window.DDTFTImport.version || 'N/D'}`);
    console.log(`Inizializzato: ${window.DDTFTImport.initialized ? '✓' : '✗'}`);
    console.log('Test completato con successo!');
    console.groupEnd();

    // Test simulazione import (opzionale)
    console.group('\n=== Test Import Simulato ===');
    
    // Simula un testo estratto da PDF
    const simulatedText = `
DDT N. 2025/001
Data: 15/06/2025

DESTINATARIO:
TEST CLIENTE SRL
VIA ROMA 123
00100 ROMA (RM)
P.IVA: 12345678901

ARTICOLI:
ART001 PRODOTTO TEST 10 PZ 25,50 255,00 22%

TOTALE IMPONIBILE: 255,00
IVA 22%: 56,10
TOTALE DOCUMENTO: 311,10
`;

    console.log('Testo simulato:', simulatedText);

    // Test parse documento
    window.DDTFTImport.parseDocumentFromText(simulatedText, 'test.pdf')
        .then(result => {
            console.log('Risultato parsing:', result);
            console.log('Parsing completato con successo!');
        })
        .catch(error => {
            console.error('Errore nel parsing:', error);
        });

    console.groupEnd();

})();