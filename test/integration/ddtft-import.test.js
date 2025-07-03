/**
 * Test di integrazione per ddtft-import.js
 * OBIETTIVO: Catturare il comportamento ESATTO del parser attuale
 * prima di qualsiasi refactoring
 */

// Mock delle dipendenze esterne
const mockPDFText = {
  ddt: `Spett.le
IL GUSTO FRUTTA E VERDURA
DI SQUILLACIOTI FRANCESCA
VIA AVIGLIANA, 21
10090 ROSTA TO

Luogo di consegna
IL GUSTO FRUTTA E VERDURA
DI SQUILLACIOTI FRANCESCA
VIA AVIGLIANA, 21
10090 ROSTA TO

D.D.T. N. 4521/2024 del 19/05/2024
Codice Cliente: 20322

Codice    Descrizione                           Q.tà    Prezzo
200261    SPINACINO BUSTA 500 G                12      2.50
060148    LASAGNE FRESCHE PIASTRA              10      3.20`,

  fattura: `ALFIERI SPECIALITA' ALIMENTARI S.P.A.
C.so G. Marconi, 10/E
12050 MAGLIANO ALFIERI (CN)

Spett.le
BOTTEGA DELLA CARNE SAS
DI BONANATE DANILO & C.
VIA ROMA, 15
10010 TORINO TO

FATTURA N. 4255 del 21/05/2025

Codice    Descrizione                           Q.tà    Prezzo    Importo
060111    TORTELLINI PR.CRUDO                  12      1.90      22.80
060247    GNOCCHI COME UNA VOLTA              18      2.24      40.32

Totale Imponibile: € 116.52
IVA 4%: € 4.66
TOTALE FATTURA: € 121.18`,

  ftv: `ALFIERI SPECIALITA' ALIMENTARI S.P.A.

FTV 4255 21/05/25

060111    TORTELLINI PR.CRUDO                  12      1.90
060247    GNOCCHI COME UNA VOLTA              18      2.24

BOTTEGA DELLA CARNE SAS
VIA ROMA, 15
10010 TORINO TO`
};

// Test fixtures per verificare comportamento attuale
const expectedResults = {
  ddt: {
    type: 'DDT',
    documentNumber: '4521/2024',
    date: '19/05/2024',
    clientName: 'IL GUSTO FRUTTA E VERDURA DI SQUILLACIOTI FRANCESCA',
    clientCode: '20322',
    deliveryAddress: 'VIA AVIGLIANA, 21 10090 ROSTA TO',
    products: [
      { code: '200261', description: 'SPINACINO BUSTA 500 G', quantity: 12, price: 2.50 },
      { code: '060148', description: 'LASAGNE FRESCHE PIASTRA', quantity: 10, price: 3.20 }
    ]
  },
  
  fattura: {
    type: 'Fattura',
    documentNumber: '4255',
    date: '21/05/2025',
    clientName: 'BOTTEGA DELLA CARNE SAS', // DEVE fermarsi a SAS!
    vatNumber: '', // Da verificare
    deliveryAddress: 'VIA ROMA, 15 10010 TORINO TO',
    products: [
      { code: '060111', description: 'TORTELLINI PR.CRUDO', quantity: 12, price: 1.90, total: 22.80 },
      { code: '060247', description: 'GNOCCHI COME UNA VOLTA', quantity: 18, price: 2.24, total: 40.32 }
    ],
    totals: {
      imponibile: 116.52,
      iva: 4.66,
      totale: 121.18
    }
  },
  
  ftv: {
    type: 'Fattura',
    documentNumber: '4255',
    date: '21/05/2025',
    clientName: 'BOTTEGA DELLA CARNE SAS', // NON deve includere "DI BONANATE DANILO & C."
    products: [
      { code: '060111', description: 'TORTELLINI PR.CRUDO', quantity: 12, price: 1.90 },
      { code: '060247', description: 'GNOCCHI COME UNA VOLTA', quantity: 18, price: 2.24 }
    ]
  }
};

// Funzione per confrontare risultati
function compareResults(actual, expected, testName) {
  console.log(`\n=== TEST: ${testName} ===`);
  
  const differences = [];
  
  // Confronta ogni campo
  for (const key in expected) {
    if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
      differences.push({
        field: key,
        expected: expected[key],
        actual: actual[key]
      });
    }
  }
  
  if (differences.length === 0) {
    console.log('✅ TEST PASSED');
  } else {
    console.log('❌ TEST FAILED');
    console.log('Differenze trovate:');
    differences.forEach(diff => {
      console.log(`  Campo: ${diff.field}`);
      console.log(`    Expected: ${JSON.stringify(diff.expected)}`);
      console.log(`    Actual:   ${JSON.stringify(diff.actual)}`);
    });
  }
  
  return differences.length === 0;
}

// Test per DDT
function testDDTExtraction() {
  console.log('\n🧪 Testing DDT Extraction...');
  
  // Simula il comportamento del parser
  const extractor = new DDTExtractor(mockPDFText.ddt, 'DDT_4521_2024.pdf');
  
  const result = {
    type: extractor.detectDocumentType(),
    documentNumber: extractor.extractDocumentNumber(),
    date: extractor.extractDate(),
    clientName: extractor.extractClient(),
    clientCode: extractor.extractClientCode(),
    deliveryAddress: extractor.extractDeliveryAddress(),
    products: extractor.extractProducts()
  };
  
  return compareResults(result, expectedResults.ddt, 'DDT Extraction');
}

// Test per Fattura normale
function testFatturaExtraction() {
  console.log('\n🧪 Testing Fattura Extraction...');
  
  const extractor = new FatturaExtractor(mockPDFText.fattura, 'FT_4255_2025.pdf');
  
  const result = extractor.extract();
  
  const testResult = {
    type: result.type,
    documentNumber: result.documentNumber,
    date: result.date,
    clientName: result.clientName,
    vatNumber: result.vatNumber,
    deliveryAddress: result.deliveryAddress,
    products: result.products,
    totals: result.totals
  };
  
  return compareResults(testResult, expectedResults.fattura, 'Fattura Extraction');
}

// Test per FTV (Template Vuoto)
function testFTVExtraction() {
  console.log('\n🧪 Testing FTV Extraction...');
  
  const extractor = new FatturaExtractor(mockPDFText.ftv, 'FTV_4255_2025.pdf');
  
  const result = extractor.extract();
  
  const testResult = {
    type: result.type,
    documentNumber: result.documentNumber,
    date: result.date,
    clientName: result.clientName,
    products: result.products
  };
  
  return compareResults(testResult, expectedResults.ftv, 'FTV Extraction');
}

// Test casi edge
function testEdgeCases() {
  console.log('\n🧪 Testing Edge Cases...');
  
  const edgeCases = [
    {
      name: 'Cliente con S.S.',
      text: 'AZ. AGR. LA MANDRIA S.S. DI GOIA E BRUNO',
      expected: 'AZ. AGR. LA MANDRIA S.S.'
    },
    {
      name: 'Cliente persona fisica',
      text: 'ARUDI MIRELLA P\nVIA ROMA 15',
      expected: 'ARUDI MIRELLA P'
    },
    {
      name: 'Nome multi-riga',
      text: 'IL GUSTO FRUTTA E VERDURA\nDI SQUILLACIOTI FRANCESCA',
      expected: 'IL GUSTO FRUTTA E VERDURA DI SQUILLACIOTI FRANCESCA'
    }
  ];
  
  let allPassed = true;
  
  edgeCases.forEach(testCase => {
    // Usa DDTFTImport.extractClientName per testare l'estrazione nomi
    const result = DDTFTImport.extractClientName(testCase.text);
    
    if (result === testCase.expected) {
      console.log(`  ✅ ${testCase.name}: OK`);
    } else {
      console.log(`  ❌ ${testCase.name}: FAILED`);
      console.log(`     Expected: "${testCase.expected}"`);
      console.log(`     Actual:   "${result}"`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Esegui tutti i test
function runAllTests() {
  console.log('====================================');
  console.log('INTEGRATION TESTS - ddtft-import.js');
  console.log('====================================');
  console.log('Catturando comportamento attuale prima del refactoring...\n');
  
  const results = {
    ddt: testDDTExtraction(),
    fattura: testFatturaExtraction(),
    ftv: testFTVExtraction(),
    edgeCases: testEdgeCases()
  };
  
  console.log('\n====================================');
  console.log('RISULTATI FINALI:');
  console.log('====================================');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  
  console.log(`Tests passati: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n✅ TUTTI I TEST SONO PASSATI!');
    console.log('Il comportamento attuale è stato catturato correttamente.');
    console.log('Ora è sicuro procedere con il refactoring.');
  } else {
    console.log('\n❌ ALCUNI TEST SONO FALLITI!');
    console.log('Correggere i test prima di procedere con il refactoring.');
  }
}

// Nota: Per eseguire questi test in un ambiente reale, 
// sarebbe necessario importare le classi corrette e mockare pdf.js
console.log('⚠️  NOTA: Questo è un template di test.');
console.log('Per eseguirlo realmente, importare ddtft-import.js e le sue dipendenze.');
console.log('\nEsempio di come eseguire:');
console.log('1. Importa DDTExtractor, FatturaExtractor, DDTFTImport');
console.log('2. Mock delle dipendenze pdf.js');
console.log('3. Chiama runAllTests()');

// Export per uso futuro
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testDDTExtraction,
    testFatturaExtraction,
    testFTVExtraction,
    testEdgeCases,
    mockPDFText,
    expectedResults
  };
}