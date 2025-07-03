/**
 * File di configurazione unificato per ddtft-import.js
 * Importa e espone tutte le configurazioni necessarie
 */

// Importa le configurazioni (per ambiente moderno con ES6 modules)
// import { PATTERNS } from './ddtft-patterns.js';
// import { MAPPINGS } from './ddtft-mappings.js';

// Per compatibilità con l'ambiente attuale, usa script tag in HTML invece
// Questo file serve come documentazione della struttura

// Le configurazioni saranno disponibili globalmente come:
// - window.DDTFT_PATTERNS
// - window.DDTFT_MAPPINGS

// Funzione helper per inizializzare le configurazioni
function initDDTFTConfig() {
  // Verifica che i file di configurazione siano caricati
  if (typeof DDTFT_PATTERNS === 'undefined' || typeof DDTFT_MAPPINGS === 'undefined') {
    console.error('DDTFT Config: File di configurazione non caricati');
    return false;
  }
  
  // Esponi le configurazioni nell'oggetto DDTFTImport per retrocompatibilità
  if (window.DDTFTImport) {
    window.DDTFTImport._config = {
      patterns: DDTFT_PATTERNS,
      mappings: DDTFT_MAPPINGS
    };
  }
  
  return true;
}

// Esegui inizializzazione quando DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDDTFTConfig);
} else {
  initDDTFTConfig();
}