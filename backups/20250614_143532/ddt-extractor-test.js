/**
 * Test: Sistema di switch graduale per DDTExtractor
 * Permette di passare gradualmente alla versione modulare
 */

// Flag per attivare/disattivare la versione modulare
window.USE_MODULAR_DDT = false;  // Per ora DISATTIVATO

// Funzione per switchare tra le versioni
window.switchDDTExtractor = function(useModular) {
    if (useModular && window.DDTExtractorModular) {
        window.DDTExtractor = window.DDTExtractorModular;
        console.log('✅ Switched to MODULAR DDTExtractor');
    } else if (window.DDTExtractorOriginal) {
        window.DDTExtractor = window.DDTExtractorOriginal;
        console.log('✅ Switched to ORIGINAL DDTExtractor');
    }
    window.USE_MODULAR_DDT = useModular;
};

console.log('DDTExtractor switch system ready (using ORIGINAL by default)');