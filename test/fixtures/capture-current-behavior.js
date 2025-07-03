/**
 * Script per catturare il comportamento attuale del parser
 * OBIETTIVO: Salvare input/output reali come "golden tests"
 * Da eseguire PRIMA di qualsiasi modifica al codice
 */

// Esempi di testi PDF reali da testare
const realPDFTexts = {
  // DDT con cliente multi-riga
  ddt1: `D.D.T. - DOCUMENTO DI TRASPORTO

Cliente                                      Luogo di consegna

IL GUSTO FRUTTA E VERDURA                    IL GUSTO FRUTTA E VERDURA
DI SQUILLACIOTI FRANCESCA                    DI SQUILLACIOTI FRANCESCA
VIA AVIGLIANA, 21                            VIA AVIGLIANA, 21
10090 ROSTA TO                               10090 ROSTA TO

Partita IVA              Codice Fiscale
01234567890              SQLFNC80A01L219X

D.D.T.    4521    19/05/25    1    20322    IL GUSTO FRUTTA E VERDURA DI SQUILLACIOTI FRANCESCA`,

  // DDT con cliente società
  ddt2: `Cliente                                      Luogo di consegna

BOTTEGA DELLA CARNE SAS                      BOTTEGA DELLA CARNE SAS
DI BONANATE DANILO & C.                      DI BONANATE DANILO & C.
VIA ROMA, 15                                 VIA ROMA, 15
10010 TORINO TO                              10010 TORINO TO`,

  // DDT con persona fisica
  ddt3: `Cliente                                      Luogo di consegna

ARUDI MIRELLA P                              ARUDI MIRELLA P
VIA VITTORIO EMANUELE, 42                    VIA VITTORIO EMANUELE, 42
12100 CUNEO CN                               12100 CUNEO CN`,

  // Fattura normale
  fattura1: `FATTURA

Spett.le
PIEMONTE CARNI
di CALDERA MASSIMO & C. S.A.S.
Via Industriale, 125
10040 RIVALTA TO

FATTURA N. 4226 del 21/05/2025

Codice    Descrizione                    Q.tà    Prezzo    Importo
060111    TORTELLINI PR.CRUDO           12      1,90      22,80
060247    GNOCCHI COME UNA VOLTA        18      2,24      40,32

Imponibile: € 116,52
IVA 4%: € 4,66
TOTALE: € 121,18`,

  // FTV (Template Vuoto) - CASO CRITICO
  ftv1: `ALFIERI SPECIALITA' ALIMENTARI S.P.A.
C.so G. Marconi, 10/E
12050 MAGLIANO ALFIERI (CN)

FTV    701213    2025    20001    4255    21/05/25

060111 TORTELLINI PR.CRUDO SFOGLIA SOTTILE LC    PZ    12,000    1,9000
060247 GNOCCHI COME UNA VOLTA 500 G ALFIERI      PZ    18,000    2,2400
090052 GRISSINI CON FARINA DI RISO ALF. 200 G    PZ    30,000    1,7800

BOTTEGA DELLA CARNE SAS
DI BONANATE DANILO & C.
VIA ROMA, 15
10010 TORINO TO`,

  // FTV con prodotto che NON deve essere estratto come cliente
  ftv2: `FTV    4255    21/05/25

200261 TORTA DI MELIGA ARANCIA GR. 500
VS000425 PANE INTEGRALE KG 1

CAFFÈ COMMERCIO SNC
DI RIZZOGLIO C. E FIGLIE
CORSO FRANCIA, 200
10100 TORINO TO`
};

// Funzione per catturare l'output attuale
function captureCurrentBehavior() {
  console.log('📸 CATTURANDO COMPORTAMENTO ATTUALE...\n');
  
  const results = {};
  
  // Test DDT
  console.log('=== TESTING DDT ===');
  Object.entries(realPDFTexts).forEach(([key, text]) => {
    if (key.startsWith('ddt')) {
      console.log(`\nTesting ${key}...`);
      
      try {
        const extractor = new DDTExtractor(text, `${key}.pdf`);
        results[key] = {
          input: text,
          output: {
            documentType: extractor.detectDocumentType(),
            documentNumber: extractor.extractDocumentNumber(),
            date: extractor.extractDate(),
            client: extractor.extractClient(),
            clientCode: extractor.extractClientCode(),
            deliveryAddress: extractor.extractDeliveryAddress(),
            vatNumber: extractor.extractVatNumber(),
            products: extractor.extractProducts()
          }
        };
        
        console.log(`✅ Cliente estratto: "${results[key].output.client}"`);
        console.log(`   Indirizzo consegna: "${results[key].output.deliveryAddress}"`);
        
      } catch (error) {
        console.log(`❌ Errore: ${error.message}`);
        results[key] = { input: text, error: error.message };
      }
    }
  });
  
  // Test Fatture
  console.log('\n=== TESTING FATTURE ===');
  Object.entries(realPDFTexts).forEach(([key, text]) => {
    if (key.startsWith('fattura') || key.startsWith('ftv')) {
      console.log(`\nTesting ${key}...`);
      
      try {
        const extractor = new FatturaExtractor(text, `${key}.pdf`);
        const extracted = extractor.extract();
        
        results[key] = {
          input: text,
          output: extracted
        };
        
        console.log(`✅ Cliente estratto: "${extracted.clientName}"`);
        if (key.startsWith('ftv')) {
          console.log(`   ⚠️  VERIFICA: Non deve essere un prodotto!`);
        }
        
      } catch (error) {
        console.log(`❌ Errore: ${error.message}`);
        results[key] = { input: text, error: error.message };
      }
    }
  });
  
  return results;
}

// Salva i risultati per confronti futuri
function saveGoldenTests(results) {
  const fs = require('fs');
  const path = require('path');
  
  const goldenTestsPath = path.join(__dirname, 'golden-tests.json');
  
  fs.writeFileSync(
    goldenTestsPath,
    JSON.stringify(results, null, 2),
    'utf8'
  );
  
  console.log(`\n✅ Golden tests salvati in: ${goldenTestsPath}`);
}

// Funzione per confrontare con golden tests dopo refactoring
function compareWithGoldenTests(newResults) {
  const fs = require('fs');
  const path = require('path');
  
  const goldenTestsPath = path.join(__dirname, 'golden-tests.json');
  const goldenTests = JSON.parse(fs.readFileSync(goldenTestsPath, 'utf8'));
  
  let allPassed = true;
  
  Object.keys(goldenTests).forEach(key => {
    const golden = goldenTests[key];
    const current = newResults[key];
    
    if (!current) {
      console.log(`❌ Test ${key} mancante nei nuovi risultati`);
      allPassed = false;
      return;
    }
    
    const goldOutput = JSON.stringify(golden.output);
    const currOutput = JSON.stringify(current.output);
    
    if (goldOutput !== currOutput) {
      console.log(`❌ Test ${key} differisce dal golden test`);
      console.log('   Golden:', goldOutput);
      console.log('   Current:', currOutput);
      allPassed = false;
    } else {
      console.log(`✅ Test ${key} OK`);
    }
  });
  
  return allPassed;
}

// Script principale
if (require.main === module) {
  console.log('================================');
  console.log('CATTURA COMPORTAMENTO ATTUALE');
  console.log('================================\n');
  
  console.log('⚠️  ATTENZIONE: Eseguire PRIMA di qualsiasi modifica!\n');
  
  // Qui andrebbe importato il vero ddtft-import.js
  // const { DDTExtractor, FatturaExtractor } = require('../js/ddtft-import.js');
  
  console.log('📝 TODO: Importare DDTExtractor e FatturaExtractor');
  console.log('📝 TODO: Eseguire captureCurrentBehavior()');
  console.log('📝 TODO: Salvare con saveGoldenTests(results)');
  
  // const results = captureCurrentBehavior();
  // saveGoldenTests(results);
}

module.exports = {
  realPDFTexts,
  captureCurrentBehavior,
  saveGoldenTests,
  compareWithGoldenTests
};