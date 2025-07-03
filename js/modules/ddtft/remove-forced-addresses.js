/**
 * RIMUOVE tutte le correzioni forzate di indirizzi
 * Il sistema deve estrarre l'indirizzo REALE dal documento, non assegnarne uno fisso
 */

(function() {
    'use strict';
    
    console.log('🚫 Rimozione indirizzi forzati...');
    
    // Disabilita tutti i fix che forzano indirizzi specifici
    
    // 1. Disabilita il fix DONAC specifico
    if (window.testDonacFix) {
        window.testDonacFix = function(address) {
            console.warn('[REMOVE FORCED] testDonacFix disabilitato - nessuna modifica all\'indirizzo');
            return address; // Ritorna l'indirizzo originale senza modifiche
        };
    }
    
    // 2. Disabilita forceCorrectAddress
    if (window.forceCorrectAddress) {
        window.forceCorrectAddress = function(doc) {
            console.warn('[REMOVE FORCED] forceCorrectAddress disabilitato - nessuna modifica');
            return; // Non fare nulla
        };
    }
    
    // 3. Disabilita correctDocumentBeforeDisplay
    if (window.correctDocumentBeforeDisplay) {
        window.correctDocumentBeforeDisplay = function(doc) {
            console.warn('[REMOVE FORCED] correctDocumentBeforeDisplay disabilitato - nessuna modifica');
            return; // Non fare nulla
        };
    }
    
    // 4. Rimuovi l'override che forza indirizzi fissi
    if (window.PreciseDeliveryAddressExtractor && window.PreciseDeliveryAddressExtractor.prototype.getFixedAddress) {
        window.PreciseDeliveryAddressExtractor.prototype.getFixedAddress = function(clientName) {
            console.log('[REMOVE FORCED] getFixedAddress disabilitato - nessun indirizzo fisso');
            return null; // Mai ritornare indirizzi fissi
        };
    }
    
    // 5. Modifica il DDV Address Correction per NON correggere basandosi sul nome cliente
    const originalCheckCorrection = window.checkIfAddressNeedsCorrection;
    if (typeof originalCheckCorrection === 'function') {
        window.checkIfAddressNeedsCorrection = function(address, fullText) {
            // Non correggere MAI basandosi sul nome del cliente
            return false;
        };
    }
    
    console.log('✅ [REMOVE FORCED] Tutti gli indirizzi forzati sono stati disabilitati');
    console.log('   Il sistema ora estrae solo l\'indirizzo REALE dal documento');
    
})();