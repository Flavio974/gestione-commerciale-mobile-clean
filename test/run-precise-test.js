/**
 * Script per eseguire rapidamente test del Precise Address Extractor
 * Copia e incolla nel console del browser dopo aver caricato la pagina
 */

// Test veloce con esempi reali
console.clear();
console.log('🧪 TEST RAPIDO PRECISE ADDRESS EXTRACTOR\n');

// Abilita debug per vedere i dettagli
setPreciseAddressDebug(true);

// Test 1: DDV con indirizzo consegna
console.log('📋 Test 1: DDV BOREALE con doppia colonna');
const test1 = testPreciseAddressExtraction(
    `701814 25 00224
BOREALE SRL BOREALE SRL
VIA BERTOLE', 13/15 VIA MEANA, SNC
10088 - VOLPIANO TO 10088 VOLPIANO TO`,
    { documentType: 'DDT', clientName: 'BOREALE SRL' }
);

// Test 2: DDV con ingresso scarico
console.log('\n📋 Test 2: DDV BOREALE con ingresso scarico');
const test2 = testPreciseAddressExtraction(
    `DDV 700633 25 00224
BOREALE SRL BOREALE SRL
VIA BERTOLE', 13/15 VIA CESANA, 78
                    INGR. SCARICO: VIA PEROSA, 75
10088 - VOLPIANO TO 10139 TORINO TO`,
    { documentType: 'DDT', clientName: 'BOREALE SRL' }
);

// Test 3: Esclusione vettore
console.log('\n📋 Test 3: Verifica esclusione vettore');
const test3 = testPreciseAddressExtraction(
    `Cliente: TEST
VIA ROMA, 10
20100 MILANO MI

Vettore: S.A.F.I.M.
VIA SUPEJA GALLINO 20/28
10060 NONE TO`,
    { documentType: 'DDT', clientName: 'TEST' }
);

// Disabilita debug
setPreciseAddressDebug(false);

// Riepilogo
console.log('\n📊 RIEPILOGO TEST:');
console.log('Test 1:', test1 ? `✅ ${test1.address}` : '❌ Fallito');
console.log('Test 2:', test2 ? `✅ ${test2.address}` : '❌ Fallito');
console.log('Test 3:', test3 ? `✅ ${test3.address}` : '❌ Fallito');

console.log('\n✨ Test completato!');