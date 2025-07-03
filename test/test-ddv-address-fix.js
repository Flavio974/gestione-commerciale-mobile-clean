/**
 * Test per verificare il fix degli indirizzi DDV duplicati
 */

// Simula la logica di estrazione DDV con fix
function extractAddressesFromDDV(line) {
  console.log(`📋 Analizzo riga: "${line}"`);
  
  let leftPart = '';
  let rightPart = '';
  
  const isAddress = line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA|LOC\.|LOCALITA|VICOLO|LARGO)/i);
  const isCap = line.match(/^\d{5}\s*-?\s*[A-Z]/i);
  
  // NUOVO: Gestisci il caso specifico di due indirizzi sulla stessa riga
  // Es: "VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65"
  const doubleAddressMatch = line.match(/^(.*?)\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+(.+)$/i);
  if (isAddress && doubleAddressMatch && doubleAddressMatch[1].match(/(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)/i)) {
    // La riga contiene due indirizzi
    const secondAddressStart = doubleAddressMatch.index + doubleAddressMatch[1].length + 1;
    leftPart = doubleAddressMatch[1].trim();
    rightPart = line.substring(secondAddressStart).trim();
    console.log(`    ✅ Due indirizzi rilevati: "${leftPart}" | "${rightPart}"`);
  } else {
    // Per altre righe, cerca due colonne separate da spazi multipli
    const twoColMatch = line.match(/^(.+?)\s{2,}(.+)$/);
    if (twoColMatch && twoColMatch[2].length > 10) {
      leftPart = twoColMatch[1].trim();
      rightPart = twoColMatch[2].trim();
      console.log(`    Due colonne rilevate: "${leftPart}" | "${rightPart}"`);
    } else {
      leftPart = line;
      rightPart = line;
      console.log(`    Riga singola: "${leftPart}"`);
    }
  }
  
  return { leftPart, rightPart };
}

// Test cases
const testCases = [
  {
    name: 'Due indirizzi sulla stessa riga (caso DONAC)',
    input: 'VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65',
    expectedLeft: 'VIA MARGARITA, 8 LOC. TETTO GARETTO',
    expectedRight: 'VIA SALUZZO, 65',
    description: 'Deve separare correttamente i due indirizzi'
  },
  {
    name: 'Due CAP sulla stessa riga',
    input: '12100 - CUNEO CN 12038 SAVIGLIANO CN',
    expectedLeft: '12100 - CUNEO CN',
    expectedRight: '12038 SAVIGLIANO CN',
    description: 'Deve separare correttamente i due CAP/città'
  },
  {
    name: 'Nome duplicato (caso DONAC)',
    input: 'DONAC S.R.L. DONAC S.R.L.',
    expectedLeft: 'DONAC S.R.L.',
    expectedRight: 'DONAC S.R.L.',
    description: 'Deve rilevare la duplicazione del nome'
  },
  {
    name: 'Indirizzo singolo',
    input: 'VIA ROMA, 10',
    expectedLeft: 'VIA ROMA, 10',
    expectedRight: 'VIA ROMA, 10',
    description: 'Un indirizzo singolo deve rimanere invariato'
  },
  {
    name: 'Due indirizzi con VIA e CORSO',
    input: 'VIA GARIBALDI, 25 CORSO ITALIA, 100',
    expectedLeft: 'VIA GARIBALDI, 25',
    expectedRight: 'CORSO ITALIA, 100',
    description: 'Deve separare VIA e CORSO'
  }
];

console.log('====================================');
console.log('TEST FIX INDIRIZZI DDV');
console.log('====================================\n');

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n=== Test ${index + 1}: ${testCase.name} ===`);
  console.log(`Input: "${testCase.input}"`);
  
  const result = extractAddressesFromDDV(testCase.input);
  const leftPassed = result.leftPart === testCase.expectedLeft;
  const rightPassed = result.rightPart === testCase.expectedRight;
  const passed = leftPassed && rightPassed;
  
  console.log(`\nExpected Left:  "${testCase.expectedLeft}"`);
  console.log(`Result Left:    "${result.leftPart}" ${leftPassed ? '✅' : '❌'}`);
  console.log(`Expected Right: "${testCase.expectedRight}"`);
  console.log(`Result Right:   "${result.rightPart}" ${rightPassed ? '✅' : '❌'}`);
  console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Note: ${testCase.description}`);
  
  if (passed) {
    passedTests++;
  } else {
    failedTests++;
  }
});

console.log('\n====================================');
console.log('RISULTATI FINALI:');
console.log('====================================');
console.log(`Test passati: ${passedTests}/${testCases.length}`);
console.log(`Test falliti: ${failedTests}/${testCases.length}`);

if (failedTests === 0) {
  console.log('\n✅ TUTTI I TEST SONO PASSATI!');
  console.log('Il fix per gli indirizzi DDV funziona correttamente.');
} else {
  console.log('\n❌ ALCUNI TEST SONO FALLITI!');
}

// Test con contenuto DDV completo
console.log('\n====================================');
console.log('SIMULAZIONE DDV COMPLETA');
console.log('====================================\n');

const ddvLines = [
  '4521 19/05/25 1 20322',
  'DONAC S.R.L. DONAC S.R.L.',
  'VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65',
  '12100 - CUNEO CN 12038 SAVIGLIANO CN'
];

console.log('Contenuto DDV:');
ddvLines.forEach(line => console.log(`  ${line}`));

console.log('\nProcessamento:');
ddvLines.forEach((line, i) => {
  if (i === 0) {
    console.log(`Riga ${i}: Skip (dati DDT)`);
  } else {
    const result = extractAddressesFromDDV(line);
    console.log(`Riga ${i}: Left="${result.leftPart}" | Right="${result.rightPart}"`);
  }
});

console.log('\nRisultato atteso:');
console.log('Cliente: DONAC S.R.L.');
console.log('Indirizzo cliente: VIA MARGARITA, 8 LOC. TETTO GARETTO 12100 - CUNEO CN');
console.log('Indirizzo consegna: VIA SALUZZO, 65 12038 SAVIGLIANO CN');