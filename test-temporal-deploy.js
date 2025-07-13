// 🧪 ONE-LINER TEST POST-DEPLOY
// Copia e incolla nella console del browser dopo il deploy

(async () => {
  console.log('🧪 [DEPLOY TEST] Verifica moduli temporal...');
  
  const urls = [
    '/js/middleware/temporal-parser.js',
    '/js/middleware/vocabulary-manager.js', 
    '/js/middleware/ai-middleware.js',
    '/config/temporal-settings.js'
  ];
  
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        const text = await response.text();
        const isHTML = text.includes('<!DOCTYPE') || text.includes('<html');
        
        return [
          url.split('/').pop(),
          response.status, 
          response.headers.get('content-type') || 'unknown',
          isHTML ? '❌ HTML' : '✅ JS',
          `${Math.round(text.length/1024)}KB`
        ];
      } catch (error) {
        return [url.split('/').pop(), 'ERROR', error.message, '❌', '0KB'];
      }
    })
  );
  
  console.table(results, ['File', 'Status', 'Content-Type', 'Valid', 'Size']);
  
  const allValid = results.every(r => r[3] === '✅ JS' && r[1] === 200);
  console.log(allValid ? '🎉 TUTTI I MODULI TEMPORALI FUNZIONANO!' : '❌ ALCUNI MODULI HANNO PROBLEMI');
})();

// 🔧 TEST RAPIDO ERRORI CONSOLE:
// Guarda se ci sono ancora "Uncaught SyntaxError: Unexpected token '<'"
// Se sì, il problema persiste. Se no, tutto risolto!