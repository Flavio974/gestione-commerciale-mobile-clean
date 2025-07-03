const line = 'VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65';

// Check if LOC. is in the address pattern
const isAddress = line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|STRADA|LOC\.|LOCALITA|VICOLO|LARGO)/i);

console.log('Line:', line);
console.log('isAddress match:', isAddress);

// The actual issue might be that LOC. is matched as an address start
// Let's check what happens with the improved pattern
const improvedPattern = /^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)[\s,]+(.+?)\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+(.+)$/i;
const match = line.match(improvedPattern);

console.log('\nImproved pattern match:', match);

if (match) {
  console.log('First address:', match[1] + ' ' + match[2]);
  console.log('Second address:', match[3] + ' ' + match[4]);
}