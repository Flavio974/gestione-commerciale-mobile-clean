// Test pattern recognition per date ordini
const testCases = [
    'Data ordini',
    'Data ordini?',
    'Date ordini',
    'Quando ordini',
    'Quando ordini?',
    'quando sono stati fatti gli ordini?',
    'In che data sono stati fatti?',
    'Quando sono stati fatti gli ordini?',
    'Data degli ordini',
    'Date degli ordini',
    'Data di ogni ordine?',
    'Date di ogni ordine?',
    'Data ordine',
    'Tutte le date',
    'Date tutti'
];

const patterns = [
    /quale.*data.*ordini|in.*quale.*data.*ordini|quando.*ordini|date.*ordini|settimana.*ordini|generati.*ordini/i,
    /ordini.*generati|ordini.*fatti|ordini.*creati|ordini.*data|ordini.*quando|ordini.*settimana/i,
    /quando.*sono.*stati.*fatti|quando.*stati.*fatti|fatti.*ordini|creati.*ordini|data.*fatti|settimana.*fatti/i,
    /^data\s+ordini?\??$/i,
    /^date\s+ordini?\??$/i,
    /^quando\s+ordini?\??$/i,
    /^data\s+degli\s+ordini?\??$/i,
    /^date\s+degli\s+ordini?\??$/i,
    /data\s+di\s+ogni\s+ordine/i,
    /date\s+di\s+ogni\s+ordine/i,
    /data\s+ordine/i,
    /tutte\s+le\s+date/i,
    /date\s+tutti/i
];

console.log('🧪 TEST PATTERN RECOGNITION DATE ORDINI:');
console.log('=====================================');

testCases.forEach(test => {
    let matched = false;
    let matchedPattern = null;
    
    for (let i = 0; i < patterns.length; i++) {
        if (patterns[i].test(test)) {
            matched = true;
            matchedPattern = i + 1;
            break;
        }
    }
    
    const result = matched ? `✅ MATCH (Pattern ${matchedPattern})` : '❌ NO MATCH';
    console.log(`${result} - "${test}"`);
});

console.log('\n🔍 PATTERN DETAILS:');
console.log('1. /quale.*data.*ordini|in.*quale.*data.*ordini|quando.*ordini|date.*ordini|settimana.*ordini|generati.*ordini/i');
console.log('2. /ordini.*generati|ordini.*fatti|ordini.*creati|ordini.*data|ordini.*quando|ordini.*settimana/i');
console.log('3. /quando.*sono.*stati.*fatti|quando.*stati.*fatti|fatti.*ordini|creati.*ordini|data.*fatti|settimana.*fatti/i');
console.log('4. /^data\\s+ordini?$/i');
console.log('5. /^date\\s+ordini?$/i');
console.log('6. /^quando\\s+ordini?$/i');