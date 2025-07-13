/**
 * TEST BOOTSTRAP SYSTEM
 * Snippet per verificare il sistema SafeLoad 2.0
 * 
 * Usage: fetch('/tests/test-bootstrap.js').then(r=>r.text()).then(eval)
 */

// Test 1: Verifica duplicati
console.log('🧪 TEST 1: Verifica script duplicati');
const scriptCounts = [...document.querySelectorAll('script[src]')]
  .reduce((m,s)=>{const p=new URL(s.src).pathname.replace(/\?.*$/,'');m[p]=(m[p]||0)+1;return m;},{});

const duplicates = Object.entries(scriptCounts).filter(([, n]) => n > 1);
console.log('Duplicati trovati:', duplicates.length);
console.table(duplicates);

// Test 2: Verifica SafeLoad registry
console.log('🧪 TEST 2: SafeLoad registry');
console.log('Script tracciati da SafeLoad:', window.__allScriptsLoaded?.size || 0);
console.log('Registry:', Array.from(window.__allScriptsLoaded || []));

// Test 3: Verifica Temporal
console.log('🧪 TEST 3: Polyfill Temporal');
console.log('Temporal disponibile:', typeof Temporal !== 'undefined');
if (typeof Temporal !== 'undefined') {
  console.log('Temporal.now():', Temporal.Now.instant().toString());
}

// Test 4: Verifica inizializzazione
console.log('🧪 TEST 4: Componenti principali');
console.log('TemporalParser:', typeof TemporalParser !== 'undefined');
console.log('ItalianDateManager:', typeof ItalianDateManager !== 'undefined');
console.log('AIDateCorrector:', typeof AIDateCorrector !== 'undefined');

// Test finale
console.log('🎯 RISULTATO FINALE:');
console.log('✅ Duplicati:', duplicates.length === 0 ? 'ZERO ✓' : `❌ ${duplicates.length} trovati`);
console.log('✅ Temporal:', typeof Temporal !== 'undefined' ? 'DISPONIBILE ✓' : '❌ MANCANTE');
console.log('✅ SafeLoad:', window.__allScriptsLoaded ? 'ATTIVO ✓' : '❌ NON ATTIVO');