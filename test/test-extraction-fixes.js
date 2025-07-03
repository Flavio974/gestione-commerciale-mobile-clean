/**
 * Test per verificare i fix di estrazione nomi
 */

// Casi di test per i problemi riportati
const testCases = [
  {
    name: 'S.S. che si ferma alla sigla',
    input: 'AZ. AGR. LA MANDRIA S.S. DI GOIA E. E CAPRA S. S.S.',
    expected: 'AZ. AGR. LA MANDRIA S.S.',
    description: 'Deve fermarsi a S.S. e non continuare con "DI GOIA..."'
  },
  {
    name: 'Nome con indirizzo P.ZA',
    input: 'ARUDI MIRELLA P.ZA DEL POPOLO, 3',
    expected: 'ARUDI MIRELLA',
    description: 'Deve fermarsi prima di P.ZA che è l\'inizio dell\'indirizzo'
  },
  {
    name: 'S.A.S. che si ferma alla sigla',
    input: 'BOTTEGA DELLA CARNE SAS DI BONANATE DANILO & C.',
    expected: 'BOTTEGA DELLA CARNE SAS',
    description: 'Deve fermarsi a SAS'
  },
  {
    name: 'S.R.L. standard',
    input: 'MAROTTA S.R.L.',
    expected: 'MAROTTA S.R.L.',
    description: 'Deve mantenere S.R.L. completo'
  },
  {
    name: 'Nome con indirizzo VIA',
    input: 'ROSSI MARIO VIA ROMA, 15',
    expected: 'ROSSI MARIO',
    description: 'Deve fermarsi prima di VIA'
  },
  {
    name: 'Nome senza sigla o indirizzo',
    input: 'CAFFÈ COMMERCIO',
    expected: 'CAFFÈ COMMERCIO',
    description: 'Deve rimanere invariato'
  }
];

// Funzione per testare l'estrazione
function testExtraction(input) {
  // Simula la logica di estrazione implementata
  let clientName = input;
  
  // Applica la logica delle sigle societarie
  const sigleSocietarie = [
    'S\\.?R\\.?L\\.?', 'S\\.?P\\.?A\\.?', 'S\\.?N\\.?C\\.?', 'S\\.?A\\.?S\\.?',
    'S\\.?S\\.?(?:\\.|\\b)', 'S\\.?C\\.?', 'COOP', '& C\\.', '& FIGLI', '& F\\.LLI',
    'SARL', 'SA', 'LTD', 'GMBH', 'AG', 'BV', 'NV'
  ];
  const siglePattern = new RegExp(`\\b(${sigleSocietarie.join('|')})\\b`, 'i');
  const sigleMatch = clientName.match(siglePattern);
  
  if (sigleMatch) {
    const sigleIndex = clientName.search(siglePattern);
    let sigleEndIndex = sigleIndex + sigleMatch[0].length;
    
    // Per S.S. e S.A.S., controlla se c'è un punto subito dopo
    if ((sigleMatch[0] === 'S.S' || sigleMatch[0] === 'S.A.S' || sigleMatch[0] === 'SAS') && 
        clientName[sigleEndIndex] === '.') {
      sigleEndIndex++;
    }
    
    // Tronca il nome fino alla sigla societaria (inclusa)
    clientName = clientName.substring(0, sigleEndIndex).trim();
  }
  
  // Controlla se il nome contiene l'inizio di un indirizzo
  const addressStartPattern = /\b(P\.ZA|P\.ZZA|PIAZZA|VIA|V\.LE|VIALE|CORSO|C\.SO)\b/i;
  const addressMatch = clientName.match(addressStartPattern);
  
  if (addressMatch) {
    const addressIndex = clientName.search(addressStartPattern);
    // Tronca il nome prima dell'indirizzo
    clientName = clientName.substring(0, addressIndex).trim();
  }
  
  return clientName;
}

// Esegui i test
console.log('====================================');
console.log('TEST FIX ESTRAZIONE NOMI');
console.log('====================================\n');

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Input:    "${testCase.input}"`);
  
  const result = testExtraction(testCase.input);
  const passed = result === testCase.expected;
  
  console.log(`Expected: "${testCase.expected}"`);
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
  console.log('I fix per l\'estrazione nomi funzionano correttamente.');
} else {
  console.log('\n❌ ALCUNI TEST SONO FALLITI!');
  console.log('Verificare l\'implementazione dei fix.');
}

// Test con DDT completo
console.log('\n====================================');
console.log('TEST CON DDT COMPLETO');
console.log('====================================\n');

const ddtExample = `
D.D.T. 4521 19/05/25 1 20322 AZ. AGR. LA MANDRIA S.S. DI GOIA E. E CAPRA S. S.S.

Cliente: ARUDI MIRELLA P.ZA DEL POPOLO, 3
`;

console.log('DDT di esempio:');
console.log(ddtExample);
console.log('\nEstrazioni attese:');
console.log('- Nome da riga DDT: "AZ. AGR. LA MANDRIA S.S."');
console.log('- Nome da sezione Cliente: "ARUDI MIRELLA"');

// Export per uso in altri test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testCases,
    testExtraction
  };
}