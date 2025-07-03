/**
 * Test inline per verificare i fix di estrazione nomi nei file FTV
 * Questo test simula la logica di estrazione implementata nei fix
 */

// Funzione che simula la logica di estrazione con fix
function extractClientFromFTV(text) {
  console.log('🔍 Estrazione cliente FTV con fix truncation...');
  
  // Simula ricerca dopo ALFIERI header
  const alfieriPattern = /ALFIERI\s+SPECIALITA['\s]*ALIMENTARI\s+S\.P\.A\./i;
  const alfieriMatch = text.match(alfieriPattern);
  
  if (!alfieriMatch) {
    console.log('❌ Header ALFIERI non trovato');
    return null;
  }
  
  const alfieriIndex = alfieriMatch.index + alfieriMatch[0].length;
  const afterAlfieri = text.substring(alfieriIndex);
  const lines = afterAlfieri.split('\n').map(l => l.trim()).filter(l => l);
  
  console.log(`📋 Righe dopo ALFIERI: ${lines.length}`);
  
  let clientNameParts = [];
  let skipProductSection = false;
  
  for (let i = 0; i < lines.length && i < 50; i++) {
    const line = lines[i];
    console.log(`  Analizzo riga ${i}: "${line}"`);
    
    // Rileva sezione prodotti
    if (line.match(/^\d{6}\s/) || line.match(/^(VS|GF|PIRR)\d+/)) {
      skipProductSection = true;
      console.log(`  → Trovato codice prodotto, skip sezione prodotti`);
      continue;
    }
    
    // Se siamo nella sezione prodotti, skippa
    if (skipProductSection) {
      if (line.match(/^[A-Z\s]+(?:GR\.?\s*\d+|KG|PZ|CONF)/i) || 
          line.includes('GRISSINI') || line.includes('BASTONCINI') || 
          line.includes('PANE')) {
        console.log(`  → Skip descrizione prodotto`);
        continue;
      }
      // Se troviamo qualcosa che potrebbe essere un cliente
      if (line.match(/\b(S\.?R\.?L\.?|S\.?P\.?A\.?|S\.?N\.?C\.?|S\.?A\.?S\.?|S\.?S\.?|DI\s+[A-Z])/i)) {
        skipProductSection = false;
        console.log(`  → Fine sezione prodotti`);
      }
    }
    
    // Se è un indirizzo, stop
    if (line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA|\d{5})/i)) {
      console.log(`  → È un indirizzo, stop`);
      break;
    }
    
    // Se non stiamo skippando e la riga sembra valida
    if (!skipProductSection && line && 
        !line.match(/^\d+$/) && 
        !line.includes('CODICE') &&
        !line.includes('ODV') &&
        !line.includes('Operatore')) {
      
      clientNameParts.push(line);
      console.log(`  → Aggiunta al nome cliente`);
      
      // Se troviamo una sigla societaria, abbiamo finito
      if (line.match(/(S\.?R\.?L\.?|S\.?P\.?A\.?|S\.?N\.?C\.?|S\.?A\.?S\.?|S\.?S\.?)\s*$/i)) {
        console.log(`  → Trovata sigla societaria, fine nome`);
        break;
      }
    }
  }
  
  if (clientNameParts.length > 0) {
    let fullName = clientNameParts.join(' ').trim();
    console.log(`📝 Nome completo prima del truncation: "${fullName}"`);
    
    // APPLICA TRUNCATION FIX - Sigle societarie
    const sigleSocietarie = [
      'S\\.?R\\.?L\\.?', 'S\\.?P\\.?A\\.?', 'S\\.?N\\.?C\\.?', 'S\\.?A\\.?S\\.?',
      'S\\.?S\\.?(?:\\.|\\b)', 'S\\.?C\\.?', 'COOP', '& C\\.', '& FIGLI', '& F\\.LLI',
      'SARL', 'SA', 'LTD', 'GMBH', 'AG', 'BV', 'NV'
    ];
    const siglePattern = new RegExp(`\\b(${sigleSocietarie.join('|')})\\b`, 'i');
    const sigleMatch = fullName.match(siglePattern);
    
    if (sigleMatch) {
      const sigleIndex = fullName.search(siglePattern);
      let sigleEndIndex = sigleIndex + sigleMatch[0].length;
      
      // Per sigle che potrebbero avere un punto finale
      if ((sigleMatch[0] === 'S.S' || sigleMatch[0] === 'S.A.S' || sigleMatch[0] === 'SAS' ||
           sigleMatch[0] === 'S.R.L' || sigleMatch[0] === 'S.P.A' || sigleMatch[0] === 'S.N.C') && 
          fullName[sigleEndIndex] === '.') {
        sigleEndIndex++;
      }
      
      // Tronca il nome fino alla sigla societaria (inclusa)
      fullName = fullName.substring(0, sigleEndIndex).trim();
      console.log(`🔄 Nome troncato alla sigla societaria: "${fullName}"`);
    }
    
    // APPLICA TRUNCATION FIX - Indirizzi
    const addressStartPattern = /\b(P\.ZA|P\.ZZA|PIAZZA|VIA|V\.LE|VIALE|CORSO|C\.SO)\b/i;
    const addressMatch = fullName.match(addressStartPattern);
    
    if (addressMatch) {
      const addressIndex = fullName.search(addressStartPattern);
      // Tronca il nome prima dell'indirizzo
      fullName = fullName.substring(0, addressIndex).trim();
      console.log(`🔄 Nome troncato prima dell'indirizzo: "${fullName}"`);
    }
    
    console.log(`✅ Cliente FTV finale: "${fullName}"`);
    return fullName;
  }
  
  return null;
}

// Casi di test
const testCases = [
  {
    name: 'S.S. che si ferma alla sigla',
    content: `
ALFIERI SPECIALITA' ALIMENTARI S.P.A.
AZ. AGR. LA MANDRIA S.S. DI GOIA E. E CAPRA S. S.S.
VIA MADONNA DEI CAMPI, 19`,
    expected: 'AZ. AGR. LA MANDRIA S.S.'
  },
  {
    name: 'Nome con indirizzo P.ZA',
    content: `
ALFIERI SPECIALITA' ALIMENTARI S.P.A.
ARUDI MIRELLA P.ZA DEL POPOLO, 3
10100 TORINO TO`,
    expected: 'ARUDI MIRELLA'
  },
  {
    name: 'S.A.S. che si ferma alla sigla',
    content: `
ALFIERI SPECIALITA' ALIMENTARI S.P.A.
BOTTEGA DELLA CARNE SAS DI BONANATE DANILO & C.
VIA GARIBALDI, 25`,
    expected: 'BOTTEGA DELLA CARNE SAS'
  },
  {
    name: 'FTV con prodotti',
    content: `
ALFIERI SPECIALITA' ALIMENTARI S.P.A.
200261 GRISSINI MAIS GR. 250
GF000113 BASTONCINI LANGA
AZ. AGR. LA MANDRIA S.S. DI GOIA E. E CAPRA S. S.S.
VIA MADONNA DEI CAMPI, 19`,
    expected: 'AZ. AGR. LA MANDRIA S.S.'
  }
];

// Esegui i test
console.log('====================================');
console.log('TEST FIX ESTRAZIONE NOMI FTV');
console.log('====================================\n');

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n=== Test ${index + 1}: ${testCase.name} ===`);
  
  const result = extractClientFromFTV(testCase.content);
  const passed = result === testCase.expected;
  
  console.log(`\nExpected: "${testCase.expected}"`);
  console.log(`Result:   "${result}"`);
  console.log(`Status:   ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  
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
  console.log('La logica di truncation per FTV funziona correttamente.');
} else {
  console.log('\n❌ ALCUNI TEST SONO FALLITI!');
}