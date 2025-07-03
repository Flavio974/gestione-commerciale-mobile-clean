/**
 * Test per verificare i fix di estrazione nomi nei file FTV
 */

// Importa il modulo fattura
import('../js/modules/ddtft/fattura-extractor.js').then(module => {
  const { FatturaExtractor } = module;
  
  // Casi di test per i problemi riportati
  const testCases = [
    {
      name: 'S.S. che si ferma alla sigla',
      textContent: `
ALFIERI SPECIALITA' ALIMENTARI S.P.A.
AZ. AGR. LA MANDRIA S.S. DI GOIA E. E CAPRA S. S.S.
VIA ROMA, 10
10100 TORINO TO`,
      expected: 'AZ. AGR. LA MANDRIA S.S.',
      description: 'Deve fermarsi a S.S. e non continuare con "DI GOIA..."'
    },
    {
      name: 'Nome con indirizzo P.ZA',
      textContent: `
ALFIERI SPECIALITA' ALIMENTARI S.P.A.
ARUDI MIRELLA P.ZA DEL POPOLO, 3
10100 TORINO TO`,
      expected: 'ARUDI MIRELLA',
      description: 'Deve fermarsi prima di P.ZA che è l\'inizio dell\'indirizzo'
    },
    {
      name: 'S.A.S. che si ferma alla sigla',
      textContent: `
ALFIERI SPECIALITA' ALIMENTARI S.P.A.
BOTTEGA DELLA CARNE SAS DI BONANATE DANILO & C.
VIA GARIBALDI, 25
12100 CUNEO CN`,
      expected: 'BOTTEGA DELLA CARNE SAS',
      description: 'Deve fermarsi a SAS'
    },
    {
      name: 'S.R.L. standard',
      textContent: `
ALFIERI SPECIALITA' ALIMENTARI S.P.A.
MAROTTA S.R.L.
CORSO SUSA, 305/307
10098 RIVOLI TO`,
      expected: 'MAROTTA S.R.L.',
      description: 'Deve mantenere S.R.L. completo'
    },
    {
      name: 'Nome con indirizzo VIA',
      textContent: `
ALFIERI SPECIALITA' ALIMENTARI S.P.A.
ROSSI MARIO VIA ROMA, 15
10100 TORINO TO`,
      expected: 'ROSSI MARIO',
      description: 'Deve fermarsi prima di VIA'
    },
    {
      name: 'Nome senza sigla o indirizzo',
      textContent: `
ALFIERI SPECIALITA' ALIMENTARI S.P.A.
CAFFÈ COMMERCIO
VIA MAZZINI, 50
10100 TORINO TO`,
      expected: 'CAFFÈ COMMERCIO',
      description: 'Deve rimanere invariato'
    }
  ];
  
  console.log('====================================');
  console.log('TEST FIX ESTRAZIONE NOMI FTV');
  console.log('====================================\n');
  
  let passedTests = 0;
  let failedTests = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`Expected: "${testCase.expected}"`);
    
    // Crea un'istanza del FatturaExtractor con il testo di test
    const extractor = new FatturaExtractor(testCase.textContent, 'FTV_test.pdf', null);
    
    // Estrai il cliente
    const result = extractor.extractClientForInvoice();
    const passed = result === testCase.expected;
    
    console.log(`Result:   "${result}"`);
    console.log(`Status:   ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Note:     ${testCase.description}`);
    console.log('');
    
    if (passed) {
      passedTests++;
    } else {
      failedTests++;
    }
  });
  
  console.log('====================================');
  console.log('RISULTATI FINALI:');
  console.log('====================================');
  console.log(`Test passati: ${passedTests}/${testCases.length}`);
  console.log(`Test falliti: ${failedTests}/${testCases.length}`);
  
  if (failedTests === 0) {
    console.log('\n✅ TUTTI I TEST SONO PASSATI!');
    console.log('I fix per l\'estrazione nomi FTV funzionano correttamente.');
  } else {
    console.log('\n❌ ALCUNI TEST SONO FALLITI!');
    console.log('Verificare l\'implementazione dei fix.');
  }
  
  // Test con contenuto FTV reale simulato
  console.log('\n====================================');
  console.log('TEST CON CONTENUTO FTV SIMULATO');
  console.log('====================================\n');
  
  const ftvContent = `
D.D.T. DOCUMENTI DI TRASPORTO
ALFIERI SPECIALITA' ALIMENTARI S.P.A.
Via Marconi Magliano Alfieri (CN)
0173.66457

FTV 4673 21/05/25 1 20200
200261 GRISSINI MAIS GR. 250 *ALFIERI*
GF000113 BASTONCINI LANGA NOCCIOLA *ALFIERI*
GF000176 PANE GUTTIAU ML *ALFIERI*

AZ. AGR. LA MANDRIA S.S. DI GOIA E. E CAPRA S. S.S.
VIA MADONNA DEI CAMPI, 19
10060 VIRLE PIEMONTE TO

ODV Nr. 507A865AS02756 del 15/05/

Totale documento € 104,40`;
  
  console.log('Contenuto FTV di esempio:');
  console.log(ftvContent);
  
  const ftvExtractor = new FatturaExtractor(ftvContent, 'FTV_701029_2025_20200_4673_21052025.PDF', null);
  const extractedClient = ftvExtractor.extractClientForInvoice();
  
  console.log('\nCliente estratto:', extractedClient);
  console.log('Cliente atteso:', 'AZ. AGR. LA MANDRIA S.S.');
  console.log('Status:', extractedClient === 'AZ. AGR. LA MANDRIA S.S.' ? '✅ CORRETTO' : '❌ ERRATO');
  
}).catch(error => {
  console.error('Errore nel caricamento del modulo:', error);
});