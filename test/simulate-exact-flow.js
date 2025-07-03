// Simulate the exact flow from the code
function simulateExactFlow() {
  const line = 'VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65';
  console.log(`Processing line: "${line}"`);
  
  // Identifica se la riga contiene un indirizzo
  const isAddress = line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|STRADA|LOC\.|LOCALITA|VICOLO|LARGO)/i);
  const isCap = line.match(/^\d{5}\s*-?\s*[A-Z]/i);
  
  console.log(`isAddress: ${!!isAddress}`);
  console.log(`isCap: ${!!isCap}`);
  
  let leftPart = '';
  let rightPart = '';
  
  // First check: duplicate pattern
  const duplicatePattern = /^(.+?)\s+\1$/;
  const dupMatch = line.match(duplicatePattern);
  
  if (dupMatch) {
    console.log('→ Duplicate detected');
    leftPart = dupMatch[1].trim();
    rightPart = dupMatch[1].trim();
  } else {
    console.log('→ Not a duplicate');
    
    // Second check: CAP
    if (isCap) {
      console.log('→ Is CAP');
      // CAP logic...
    } else {
      console.log('→ Not CAP, checking double address...');
      
      // NUOVO: Gestisci il caso specifico di due indirizzi sulla stessa riga
      const doubleAddressMatch = line.match(/^(.*?)\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+(.+)$/i);
      
      console.log(`doubleAddressMatch exists: ${!!doubleAddressMatch}`);
      
      if (doubleAddressMatch) {
        console.log(`doubleAddressMatch[1]: "${doubleAddressMatch[1]}"`);
        const firstPartHasAddress = doubleAddressMatch[1].match(/(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)/i);
        console.log(`firstPartHasAddress: ${!!firstPartHasAddress}`);
        console.log(`isAddress && doubleAddressMatch && firstPartHasAddress: ${!!(isAddress && doubleAddressMatch && firstPartHasAddress)}`);
      }
      
      if (isAddress && doubleAddressMatch && doubleAddressMatch[1].match(/(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)/i)) {
        console.log('→ Double address detected!');
        const secondAddressStart = doubleAddressMatch.index + doubleAddressMatch[1].length + 1;
        leftPart = doubleAddressMatch[1].trim();
        rightPart = line.substring(secondAddressStart).trim();
      } else {
        console.log('→ Not double address, checking for multiple spaces...');
        // Per altre righe, cerca due colonne separate da spazi multipli
        const twoColMatch = line.match(/^(.+?)\s{2,}(.+)$/);
        if (twoColMatch && twoColMatch[2].length > 10) {
          console.log('→ Two columns detected');
          leftPart = twoColMatch[1].trim();
          rightPart = twoColMatch[2].trim();
        } else {
          console.log('→ Single line');
          leftPart = line;
          rightPart = line;
        }
      }
    }
  }
  
  console.log(`\nFinal result:`);
  console.log(`leftPart: "${leftPart}"`);
  console.log(`rightPart: "${rightPart}"`);
}

simulateExactFlow();

// Now test with LOC. removed from the initial pattern
console.log('\n\n=== TEST WITHOUT LOC. IN INITIAL PATTERN ===');
function testWithoutLoc() {
  const line = 'VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65';
  
  // Pattern without LOC.
  const isAddress = line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)/i);
  console.log(`isAddress (without LOC.): ${!!isAddress}`);
  
  // This should still work
  const doubleAddressMatch = line.match(/^(.*?)\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+(.+)$/i);
  if (doubleAddressMatch) {
    console.log('Double address match found');
    console.log(`First part: "${doubleAddressMatch[1]}"`);
    console.log(`Second part: VIA ${doubleAddressMatch[3]}`);
  }
}

testWithoutLoc();