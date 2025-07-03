/**
 * Test debug per analizzare il parsing DDV
 */

// Simula esattamente il parsing DDV come nel codice
function debugDDVParsing() {
  const line = 'VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65';
  
  console.log(`📋 Analizzo riga: "${line}"`);
  
  // Identifica se la riga contiene un indirizzo
  const isAddress = line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZZA|P\.ZA|STRADA|LOC\.|LOCALITA|VICOLO|LARGO)/i);
  const isCap = line.match(/^\d{5}\s*-?\s*[A-Z]/i);
  
  console.log(`  isAddress: ${!!isAddress}`);
  console.log(`  isCap: ${!!isCap}`);
  
  let leftPart = '';
  let rightPart = '';
  
  // Controlla se è una duplicazione esatta
  const duplicatePattern = /^(.+?)\s+\1$/;
  const dupMatch = line.match(duplicatePattern);
  
  if (dupMatch) {
    console.log('  → Duplicazione rilevata');
    leftPart = dupMatch[1].trim();
    rightPart = dupMatch[1].trim();
  } else {
    if (isCap) {
      console.log('  → È un CAP');
    } else {
      console.log('  → Non è un CAP, controllo indirizzi doppi...');
      
      // NUOVO: Gestisci il caso specifico di due indirizzi sulla stessa riga
      const doubleAddressMatch = line.match(/^(.*?)\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+(.+)$/i);
      console.log(`  doubleAddressMatch: ${!!doubleAddressMatch}`);
      
      if (doubleAddressMatch) {
        console.log(`    Match[0]: "${doubleAddressMatch[0]}"`);
        console.log(`    Match[1]: "${doubleAddressMatch[1]}"`);
        console.log(`    Match[2]: "${doubleAddressMatch[2]}"`);
        console.log(`    Match[3]: "${doubleAddressMatch[3]}"`);
        
        // Verifica se match[1] contiene un indirizzo
        const firstPartHasAddress = doubleAddressMatch[1].match(/(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)/i);
        console.log(`    firstPartHasAddress: ${!!firstPartHasAddress}`);
      }
      
      if (isAddress && doubleAddressMatch && doubleAddressMatch[1].match(/(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)/i)) {
        // La riga contiene due indirizzi
        const secondAddressStart = doubleAddressMatch.index + doubleAddressMatch[1].length + 1;
        leftPart = doubleAddressMatch[1].trim();
        rightPart = line.substring(secondAddressStart).trim();
        console.log(`  ✅ Due indirizzi rilevati: "${leftPart}" | "${rightPart}"`);
      } else {
        // Per altre righe, cerca due colonne separate da spazi multipli
        const twoColMatch = line.match(/^(.+?)\s{2,}(.+)$/);
        if (twoColMatch && twoColMatch[2].length > 10) {
          leftPart = twoColMatch[1].trim();
          rightPart = twoColMatch[2].trim();
          console.log(`  Due colonne rilevate: "${leftPart}" | "${rightPart}"`);
        } else {
          leftPart = line;
          rightPart = line;
          console.log(`  Riga singola: "${leftPart}"`);
        }
      }
    }
  }
  
  console.log(`\nRisultato finale:`);
  console.log(`  leftPart: "${leftPart}"`);
  console.log(`  rightPart: "${rightPart}"`);
}

// Test con pattern migliorato
function testImprovedPattern() {
  console.log('\n====================================');
  console.log('TEST PATTERN MIGLIORATO');
  console.log('====================================\n');
  
  const line = 'VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65';
  console.log(`Input: "${line}"`);
  
  // Pattern migliorato che cerca l'ultima occorrenza di VIA/CORSO/etc
  const lastAddressPattern = /.*(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+(.+)$/i;
  const match = line.match(lastAddressPattern);
  
  if (match) {
    console.log('\nMatch trovato:');
    console.log(`  Match[0]: "${match[0]}"`);
    console.log(`  Match[1]: "${match[1]}"`);
    console.log(`  Match[2]: "${match[2]}"`);
    
    // Trova l'indice dell'ultima occorrenza
    const lastIndex = line.lastIndexOf(match[1]);
    const leftPart = line.substring(0, lastIndex).trim();
    const rightPart = line.substring(lastIndex).trim();
    
    console.log('\nRisultato:');
    console.log(`  leftPart: "${leftPart}"`);
    console.log(`  rightPart: "${rightPart}"`);
  }
}

// Esegui i test
debugDDVParsing();
testImprovedPattern();