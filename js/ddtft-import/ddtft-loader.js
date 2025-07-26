/**
 * DDTFT Modular Loader
 * Carica il sistema modulare DDTFT mantenendo la compatibilità
 */

// Funzione per caricare il sistema modulare
async function loadDDTFTModules() {
  console.log('🔄 Caricamento sistema modulare DDTFT...');
  
  try {
    // Carica il modulo core che include tutti gli altri
    const { DDTFTImport, DDTExtractor, FatturaExtractor } = await import('./ddtft-import-core.js');
    
    // Esporta globalmente per compatibilità
    window.DDTFTImport = DDTFTImport;
    window.DDTExtractor = DDTExtractor;
    window.FatturaExtractor = FatturaExtractor;
    
    console.log('✅ Sistema modulare DDTFT caricato con successo');
    console.log('📦 Moduli disponibili:', Object.keys(DDTFTImport));
    
    return true;
  } catch (error) {
    console.error('❌ Errore caricamento moduli DDTFT:', error);
    
    // Fallback al file originale
    console.log('🔄 Fallback al sistema originale...');
    try {
      // Il file originale dovrebbe ancora essere disponibile
      if (window.DDTFTImport) {
        console.log('✅ Sistema originale già disponibile');
        return true;
      } else {
        console.error('❌ Nessun sistema DDTFT disponibile');
        return false;
      }
    } catch (fallbackError) {
      console.error('❌ Errore anche nel fallback:', fallbackError);
      return false;
    }
  }
}

// Auto-caricamento quando il DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadDDTFTModules);
} else {
  loadDDTFTModules();
}

// Esporta la funzione di caricamento
window.loadDDTFTModules = loadDDTFTModules;