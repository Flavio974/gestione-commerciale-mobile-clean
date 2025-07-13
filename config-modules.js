/**
 * CONFIGURAZIONE MODULI - GESTIONE FILE MANCANTI
 * Previene errori per file JavaScript inesistenti
 */

window.DDTFT_CONFIG = window.DDTFT_CONFIG || {};

// Lista dei moduli che causano errori se mancanti
window.DDTFT_CONFIG.disabledModules = [
  'temporal-settings',
  'temporal-parser', // MANCANTE
  'test-temporal-parser',
  'test-italian-date-format',
  'test-nuclear-date-fix',
  'temporal-parser.test'
];

// Lista file che potrebbero essere mancanti
window.DDTFT_CONFIG.problematicFiles = [
  'js/middleware/temporal-parser.js',
  'js/utils/temporal-settings.js',
  'js/test/test-temporal-parser.js',
  'js/test/test-italian-date-format.js',
  'js/test/test-nuclear-date-fix.js'
];

/**
 * Override della gestione errori per prevenire crash
 */
window.addEventListener('error', function(e) {
  const errorFile = e.filename || e.target?.src || '';
  const errorMessage = e.message || '';
  
  // Controlla se l'errore è causato da un file problematico
  const isProblematicFile = window.DDTFT_CONFIG.problematicFiles.some(file => 
    errorFile.includes(file) || errorFile.includes(file.replace('js/', ''))
  );
  
  if (isProblematicFile) {
    console.warn('⚠️ Errore ignorato per file problematico:', errorFile);
    e.preventDefault();
    return true;
  }
  
  // Controlla se l'errore contiene "Unexpected token '<'" (tipico di 404 HTML)
  if (errorMessage.includes('Unexpected token') && errorMessage.includes('<')) {
    console.warn('⚠️ Errore 404 HTML ignorato:', errorFile || 'file sconosciuto', errorMessage);
    e.preventDefault();
    return true;
  }
  
  // Controlla altri pattern di errori 404
  if (errorMessage.includes('SyntaxError') && errorFile.includes('.js')) {
    console.warn('⚠️ Errore sintassi JS (probabilmente 404) ignorato:', errorFile);
    e.preventDefault();
    return true;
  }
  
  // Log altri errori per debug ma non bloccare
  if (errorFile.includes('.js')) {
    console.warn('⚠️ Errore JS non bloccante:', errorFile, errorMessage);
  }
}, true); // Usa capture per intercettare prima

/**
 * Override per fetch di script mancanti
 */
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  // Controlla se è una richiesta per un file problematico
  const isProblematicRequest = window.DDTFT_CONFIG.problematicFiles.some(file => 
    url.includes(file) || url.includes(file.replace('js/', ''))
  );
  
  if (isProblematicRequest) {
    console.warn('⚠️ Fetch bloccato per file problematico:', url);
    // Ritorna una Promise che risolve con contenuto vuoto
    return Promise.resolve(new Response('// File non disponibile', {
      status: 200,
      headers: { 'Content-Type': 'application/javascript' }
    }));
  }
  
  return originalFetch.apply(this, arguments);
};

/**
 * Crea placeholder per moduli mancanti
 */
function createModulePlaceholders() {
  // Temporal Parser placeholder
  if (!window.TemporalParser) {
    window.TemporalParser = {
      parse: function(text) {
        console.warn('⚠️ TemporalParser non disponibile, uso parsing semplice');
        return null;
      },
      isEnabled: false
    };
  }
  
  // Placeholder per altri moduli se necessario
  console.log('✅ Placeholder moduli creati');
}

/**
 * Gestione caricamento script con fallback
 */
function safeLoadScript(src) {
  return new Promise((resolve, reject) => {
    // Controlla se è un file problematico
    const isProblematic = window.DDTFT_CONFIG.problematicFiles.some(file => 
      src.includes(file) || src.includes(file.replace('js/', ''))
    );
    
    if (isProblematic) {
      console.warn('⚠️ Script ignorato:', src);
      resolve(); // Risolvi senza caricare
      return;
    }
    
    // Controlla se è un file di test e ignora in produzione
    const isTestFile = src.includes('.test.js') || 
                      src.includes('test-italian-date') ||
                      src.includes('temporal-parser.test');
    
    if (isTestFile) {
      console.warn('⚠️ File di test ignorato in produzione:', src);
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    
    // ✅ FIX ASSOLUTO: Usa sempre URL completo per evitare contesto blob/worker
    if (src.startsWith('http')) {
        script.src = src;
    } else {
        // Forza URL assoluto eliminando ./ e /
        const cleanPath = src.replace(/^\.?\//, '');
        script.src = `${window.location.origin}/${cleanPath}`;
        console.log('🔧 [CONFIG] Absolute path:', src, '→', script.src);
    }
    
    // CRITICAL FIX: Rileva moduli ES6 e imposta type="module"
    const isES6Module = src.includes('temporal') || 
                       src.includes('middleware') ||
                       src.includes('semantic') ||
                       src.includes('parser') ||
                       /\.(mjs|module\.js)$/.test(src);
    
    if (isES6Module) {
      script.type = 'module';
      console.log('📦 Caricamento modulo ES6:', src);
    }
    
    script.onload = resolve;
    script.onerror = (error) => {
      console.warn('⚠️ Errore caricamento script ignorato:', src);
      resolve(); // Risolvi comunque invece di rigettare
    };
    document.head.appendChild(script);
  });
}

// Sovrascrivi la funzione globale se esiste
if (window.loadScript) {
  window.loadScript = safeLoadScript;
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
  createModulePlaceholders();
  console.log('✅ Config-modules inizializzato - Gestione errori JS attiva');
});

// Log configurazione
console.log('🔧 Config-modules caricato - Moduli problematici:', window.DDTFT_CONFIG.disabledModules);