/**
 * Test rapido per il fix DONAC
 * Da eseguire nella console del browser
 */

console.log('🧪 TEST FIX DONAC\n');

// Test 1: Correzione diretta
console.log('Test 1: Correzione diretta');
const wrong1 = 'VIA MARGARITA, 8 12038 SAVIGLIANO CN';
const correct1 = window.testDonacFix ? window.testDonacFix(wrong1) : 'testDonacFix non disponibile';
console.log(`Input: ${wrong1}`);
console.log(`Output: ${correct1}`);
console.log(`Risultato: ${correct1 === 'VIA SALUZZO, 65 12038 SAVIGLIANO CN' ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 2: Correzione con contesto
console.log('Test 2: Correzione con contesto');
const wrong2 = 'VIA MARGARITA, 8 LOC. TETTO GARETTO 12038 SAVIGLIANO CN';
const fullText = `
DONAC S.R.L. DONAC S.R.L.
VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65
12100 - CUNEO CN 12038 SAVIGLIANO CN
`;
const correct2 = window.testDonacFix ? window.testDonacFix(wrong2, fullText, 'DONAC S.R.L.') : 'testDonacFix non disponibile';
console.log(`Input: ${wrong2}`);
console.log(`Output: ${correct2}`);
console.log(`Risultato: ${correct2 === 'VIA SALUZZO, 65 12038 SAVIGLIANO CN' ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 3: Cliente DONAC senza VIA SALUZZO
console.log('Test 3: Cliente DONAC forzato');
const wrong3 = 'VIA QUALSIASI, 123 12345 CITTÀ XX';
const correct3 = window.testDonacFix ? window.testDonacFix(wrong3, '', 'DONAC S.R.L.') : 'testDonacFix non disponibile';
console.log(`Input: ${wrong3}`);
console.log(`Client: DONAC S.R.L.`);
console.log(`Output: ${correct3}`);
console.log(`Risultato: ${correct3 === 'VIA SALUZZO, 65 12038 SAVIGLIANO CN' ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 4: BOREALE
console.log('Test 4: Cliente BOREALE');
const wrong4 = 'VIA BERTOLE\', 13/15 10088 VOLPIANO TO';
const correct4 = window.testDonacFix ? window.testDonacFix(wrong4, '', 'BOREALE SRL') : 'testDonacFix non disponibile';
console.log(`Input: ${wrong4}`);
console.log(`Client: BOREALE SRL`);
console.log(`Output: ${correct4}`);
console.log(`Risultato: ${correct4 === 'VIA MEANA, SNC 10088 VOLPIANO TO' ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('✨ Test completato!');

// Suggerimento per debug
console.log('\n💡 Per debug completo, ricarica la pagina e importa di nuovo il DDV.');
console.log('   Il fix dovrebbe correggere automaticamente l\'indirizzo errato.');