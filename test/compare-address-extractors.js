/**
 * Confronto tra Robust e Precise Address Extractor
 * Aiuta a scegliere quale estrattore usare
 */

console.log('🔍 CONFRONTO ESTRATTORI INDIRIZZI\n');

// Prepara test case
const testDocument = `ALFIERI SPECIALITÀ ALIMENTARI S.a.s.
VIA G. Marconi, 10 - 12044 Centallo (CN)

701814 25 00224
BOREALE SRL BOREALE SRL
VIA BERTOLE', 13/15 VIA MEANA, SNC
10088 - VOLPIANO TO 10088 VOLPIANO TO

Luogo di consegna                           Luogo di destinazione

DOCUMENTO DI TRASPORTO    N. 701814/2025      del 29/03/2025    Pag. 1

Rif. Vs. Ordine: 507A865AS02756

Vettore: S.A.F.I.M.
VIA SUPEJA GALLINO 20/28
10060 NONE TO`;

// Metadata
const metadata = {
    documentType: 'DDT',
    clientName: 'BOREALE SRL',
    documentNumber: '701814'
};

console.log('📄 Documento di test:');
console.log('Cliente:', metadata.clientName);
console.log('Tipo:', metadata.documentType);
console.log('Numero:', metadata.documentNumber);
console.log('\n');

// Test con Robust Extractor (se disponibile)
if (window.RobustDeliveryAddressExtractor) {
    console.log('🟦 ROBUST EXTRACTOR:');
    const robustExtractor = new RobustDeliveryAddressExtractor({ debug: false });
    
    const startRobust = performance.now();
    const robustResult = robustExtractor.extract(testDocument, metadata);
    const timeRobust = performance.now() - startRobust;
    
    if (robustResult) {
        console.log('✅ Indirizzo:', robustResult.address);
        console.log('   Metodo:', robustResult.method);
        console.log('   Confidence:', robustResult.confidence);
        console.log('   Tempo:', timeRobust.toFixed(2) + 'ms');
    } else {
        console.log('❌ Nessun indirizzo estratto');
    }
} else {
    console.log('⚠️ Robust Extractor non disponibile');
}

console.log('\n');

// Test con Precise Extractor
if (window.PreciseDeliveryAddressExtractor) {
    console.log('🟩 PRECISE EXTRACTOR:');
    const preciseExtractor = new PreciseDeliveryAddressExtractor({ debug: false });
    
    // Converti in formato rows
    const lines = testDocument.split('\n');
    const rows = lines.map(line => {
        const parts = line.split(/\s{2,}/);
        if (parts.length > 1) {
            return parts.map((part, idx) => ({
                text: part.trim(),
                x: idx * 300
            }));
        }
        return [{text: line.trim(), x: 0}];
    });
    
    const startPrecise = performance.now();
    const preciseResult = preciseExtractor.extract(rows, testDocument, metadata);
    const timePrecise = performance.now() - startPrecise;
    
    if (preciseResult) {
        console.log('✅ Indirizzo:', preciseResult.address);
        console.log('   Metodo:', preciseResult.method);
        console.log('   Confidence:', preciseResult.confidence);
        console.log('   Tempo:', timePrecise.toFixed(2) + 'ms');
    } else {
        console.log('❌ Nessun indirizzo estratto');
    }
} else {
    console.log('⚠️ Precise Extractor non disponibile');
}

// Test esclusione vettore
console.log('\n\n🚚 TEST ESCLUSIONE VETTORE:');

const vettoreTest = `Vettore: S.A.F.I.M.
VIA SUPEJA GALLINO 20/28
10060 NONE TO`;

console.log('Testo vettore:', vettoreTest.replace(/\n/g, ' '));

if (window.RobustDeliveryAddressExtractor) {
    const robustExtractor = new RobustDeliveryAddressExtractor({ debug: false });
    const robustVettore = robustExtractor.extract(vettoreTest, {});
    console.log('Robust:', robustVettore ? '❌ Estratto erroneamente' : '✅ Correttamente escluso');
}

if (window.PreciseDeliveryAddressExtractor) {
    const preciseExtractor = new PreciseDeliveryAddressExtractor({ debug: false });
    const rows = vettoreTest.split('\n').map(line => [{text: line, x: 0}]);
    const preciseVettore = preciseExtractor.extract(rows, vettoreTest, {});
    console.log('Precise:', preciseVettore ? '❌ Estratto erroneamente' : '✅ Correttamente escluso');
}

// Raccomandazioni
console.log('\n\n📊 RACCOMANDAZIONI:');
console.log('• Usa PRECISE EXTRACTOR per:');
console.log('  - Documenti Alfieri standard');
console.log('  - Massima precisione richiesta');
console.log('  - Pattern DDV specifici');
console.log('\n• Usa ROBUST EXTRACTOR per:');
console.log('  - Documenti con formati variabili');
console.log('  - Fallback quando Precise fallisce');
console.log('  - Maggiore tolleranza agli errori');

console.log('\n✨ Test completato!');