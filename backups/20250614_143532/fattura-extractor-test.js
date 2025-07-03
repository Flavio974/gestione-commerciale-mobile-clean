/**
 * Test: Sistema di switch graduale per FatturaExtractor
 * Permette di passare gradualmente alla versione modulare
 */

// Flag per attivare/disattivare la versione modulare
window.USE_MODULAR_FATTURA = false;  // Per ora DISATTIVATO

// Funzione per switchare tra le versioni
window.switchFatturaExtractor = function(useModular) {
    if (useModular && window.FatturaExtractorModular) {
        window.FatturaExtractor = window.FatturaExtractorModular;
        console.log('✅ Switched to MODULAR FatturaExtractor');
    } else if (window.FatturaExtractorOriginal) {
        window.FatturaExtractor = window.FatturaExtractorOriginal;
        console.log('✅ Switched to ORIGINAL FatturaExtractor');
    }
    window.USE_MODULAR_FATTURA = useModular;
};

// Funzione combinata per switchare ENTRAMBI gli extractor
window.switchAllExtractors = function(useModular) {
    window.switchDDTExtractor(useModular);
    window.switchFatturaExtractor(useModular);
    console.log(`✅ Tutti gli extractor sono stati impostati su: ${useModular ? 'MODULAR' : 'ORIGINAL'}`);
};

console.log('FatturaExtractor switch system ready (using ORIGINAL by default)');
console.log('Per attivare ENTRAMBI i moduli: switchAllExtractors(true)');