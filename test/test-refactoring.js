/**
 * Test per verificare che il refactoring mantenga lo stesso comportamento
 * Confronta output del vecchio sistema con quello nuovo
 */

// Import del sistema nuovo
import { DDTExtractor, FatturaExtractor, DDTFTImport } from '../js/ddtft-import-new.js';

// Casi di test
const testCases = {
  ddt: {
    text: `D.D.T. - DOCUMENTO DI TRASPORTO

Cliente                                      Luogo di consegna

BOTTEGA DELLA CARNE SAS                      BOTTEGA DELLA CARNE SAS
DI BONANATE DANILO & C.                      DI BONANATE DANILO & C.
VIA ROMA, 15                                 VIA ROMA, 15
10010 TORINO TO                              10010 TORINO TO

D.D.T.    4521    19/05/25    1    20001    BOTTEGA DELLA CARNE SAS DI BONANATE DANILO & C.

Codice    Descrizione                        Q.tà    Prezzo
200261    SPINACINO BUSTA 500 G              12      2.50`,
    fileName: 'DDT_4521_2025.pdf',
    expected: {
      documentType: 'DDT',
      documentNumber: '4521',
      date: '19/05/2025',
      client: 'BOTTEGA DELLA CARNE SAS', // DEVE fermarsi a SAS
      clientCode: '20001',
      deliveryAddress: 'VIA ROMA, 15 10010 TORINO TO'
    }
  },
  
  fattura: {
    text: `FATTURA

Spett.le
PIEMONTE CARNI
di CALDERA MASSIMO & C. S.A.S.
Via Industriale, 125
10040 RIVALTA TO

FATTURA N. 4226 del 21/05/2025

Codice    Descrizione                    Q.tà    Prezzo    Importo
060111    TORTELLINI PR.CRUDO           12      1,90      22,80

Imponibile: € 116,52
IVA 4%: € 4,66
TOTALE: € 121,18`,
    fileName: 'FT_4226_2025.pdf',
    expected: {
      documentType: 'Fattura',
      documentNumber: '4226',
      date: '21/05/2025',
      clientName: 'PIEMONTE CARNI di CALDERA MASSIMO & C. S.A.S.',
      deliveryAddress: 'Via Industriale, 125 10040 RIVALTA TO'
    }
  },
  
  ftv: {
    text: `ALFIERI SPECIALITA' ALIMENTARI S.P.A.

FTV    4255    21/05/25

060111 TORTELLINI PR.CRUDO SFOGLIA SOTTILE    PZ    12
200261 TORTA DI MELIGA ARANCIA GR. 500         PZ    6

BOTTEGA DELLA CARNE SAS
VIA ROMA, 15
10010 TORINO TO`,
    fileName: 'FTV_4255_2025.pdf',
    expected: {
      documentType: 'Fattura',
      documentNumber: '4255',
      date: '21/05/2025',
      clientName: 'BOTTEGA DELLA CARNE SAS' // NON deve includere prodotti!
    }
  }
};

// Funzione per confrontare risultati
function compareResults(testName, actual, expected) {
  console.log(`\n=== TEST: ${testName} ===`);
  
  let passed = true;
  const differences = [];
  
  for (const key in expected) {
    if (actual[key] !== expected[key]) {
      passed = false;
      differences.push({
        field: key,
        expected: expected[key],
        actual: actual[key]
      });
    }
  }
  
  if (passed) {
    console.log('✅ TEST PASSED');
  } else {
    console.log('❌ TEST FAILED');
    differences.forEach(diff => {
      console.log(`  ${diff.field}:`);
      console.log(`    Expected: "${diff.expected}"`);
      console.log(`    Actual:   "${diff.actual}"`);
    });
  }
  
  return passed;
}

// Esegui test DDT
function testDDT() {
  console.log('\n🧪 Testing DDT Extraction con nuovo sistema...');
  
  const testCase = testCases.ddt;
  const extractor = new DDTExtractor(testCase.text, testCase.fileName);
  const result = extractor.extract();
  
  const actual = {
    documentType: result.type,
    documentNumber: result.documentNumber,
    date: result.date,
    client: result.client,
    clientCode: result.clientCode,
    deliveryAddress: result.deliveryAddress
  };
  
  return compareResults('DDT Extraction', actual, testCase.expected);
}

// Esegui test Fattura
function testFattura() {
  console.log('\n🧪 Testing Fattura Extraction con nuovo sistema...');
  
  const testCase = testCases.fattura;
  const extractor = new FatturaExtractor(testCase.text, testCase.fileName);
  const result = extractor.extract();
  
  const actual = {
    documentType: result.type,
    documentNumber: result.documentNumber,
    date: result.date,
    clientName: result.clientName,
    deliveryAddress: result.deliveryAddress
  };
  
  return compareResults('Fattura Extraction', actual, testCase.expected);
}

// Esegui test FTV
function testFTV() {
  console.log('\n🧪 Testing FTV Extraction con nuovo sistema...');
  
  const testCase = testCases.ftv;
  const extractor = new FatturaExtractor(testCase.text, testCase.fileName);
  const result = extractor.extract();
  
  const actual = {
    documentType: result.type,
    documentNumber: result.documentNumber,
    date: result.date,
    clientName: result.clientName
  };
  
  return compareResults('FTV Extraction', actual, testCase.expected);
}

// Test oggetto DDTFTImport
function testDDTFTImportAPI() {
  console.log('\n🧪 Testing DDTFTImport API compatibility...');
  
  const tests = [
    {
      name: 'generateId',
      test: () => typeof DDTFTImport.generateId() === 'string'
    },
    {
      name: 'extractDate',
      test: () => DDTFTImport.extractDate('del 21/05/2025') === '21/05/2025'
    },
    {
      name: 'standardizeClientName',
      test: () => DDTFTImport.standardizeClientName('IL GUSTO FRUTTA E VERDURA') === 'Il Gusto'
    },
    {
      name: 'isAlfieriAddress',
      test: () => DDTFTImport.isAlfieriAddress('C.so G. Marconi, 10/E 12050 MAGLIANO ALFIERI (CN)') === true
    },
    {
      name: 'VALID_ARTICLE_CODES exists',
      test: () => Array.isArray(DDTFTImport.VALID_ARTICLE_CODES) && DDTFTImport.VALID_ARTICLE_CODES.length > 0
    }
  ];
  
  let allPassed = true;
  
  tests.forEach(({ name, test }) => {
    try {
      if (test()) {
        console.log(`  ✅ ${name}`);
      } else {
        console.log(`  ❌ ${name}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`  ❌ ${name} - Error: ${error.message}`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Esegui tutti i test
function runAllTests() {
  console.log('=====================================');
  console.log('TEST REFACTORING ddtft-import.js');
  console.log('=====================================');
  console.log('Verificando che il nuovo sistema modulare');
  console.log('mantenga lo stesso comportamento...\n');
  
  const results = {
    ddt: testDDT(),
    fattura: testFattura(),
    ftv: testFTV(),
    api: testDDTFTImportAPI()
  };
  
  console.log('\n=====================================');
  console.log('RISULTATI FINALI:');
  console.log('=====================================');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  
  console.log(`Tests passati: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n✅ TUTTI I TEST SONO PASSATI!');
    console.log('Il refactoring mantiene lo stesso comportamento.');
    console.log('\nProssimi passi:');
    console.log('1. Rinominare ddtft-import.js → ddtft-import-legacy.js');
    console.log('2. Rinominare ddtft-import-new.js → ddtft-import.js');
    console.log('3. Testare in ambiente reale');
  } else {
    console.log('\n❌ ALCUNI TEST SONO FALLITI!');
    console.log('Correggere i problemi prima di sostituire il file originale.');
  }
  
  return passedTests === totalTests;
}

// Esporta per uso in altri test
export {
  testDDT,
  testFattura,
  testFTV,
  testDDTFTImportAPI,
  runAllTests,
  testCases
};

// Se eseguito direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}