// Debug why the pattern isn't matching

const line = 'VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65';

console.log('Line:', line);

// Check isAddress
const isAddress = line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|STRADA|LOC\.|LOCALITA|VICOLO|LARGO)/i);
console.log('\nisAddress:', !!isAddress);
if (isAddress) {
  console.log('  Matched:', isAddress[0]);
}

// Check the double address pattern
const doubleAddressMatch = line.match(/^(.*?)\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+(.+)$/i);
console.log('\ndoubleAddressMatch:', !!doubleAddressMatch);
if (doubleAddressMatch) {
  console.log('  Full match:', doubleAddressMatch[0]);
  console.log('  Part 1:', doubleAddressMatch[1]);
  console.log('  Part 2:', doubleAddressMatch[2]);
  console.log('  Part 3:', doubleAddressMatch[3]);
}

// Check if part 1 has an address
if (doubleAddressMatch) {
  const firstPartHasAddress = doubleAddressMatch[1].match(/(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)/i);
  console.log('\nfirstPartHasAddress:', !!firstPartHasAddress);
  if (firstPartHasAddress) {
    console.log('  Matched in first part:', firstPartHasAddress[0]);
  }
}

// The full condition
const fullCondition = isAddress && doubleAddressMatch && doubleAddressMatch[1].match(/(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)/i);
console.log('\nFull condition met:', !!fullCondition);

// Wait, P.ZA is in the double address pattern but not in the firstPartHasAddress check!
console.log('\n=== ISSUE FOUND ===');
console.log('P.ZA is in the second match but NOT in the first part check!');

const firstPartHasAddressWithPZA = doubleAddressMatch && doubleAddressMatch[1].match(/(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)/i);
console.log('\nWith P.ZA in both patterns:', !!firstPartHasAddressWithPZA);