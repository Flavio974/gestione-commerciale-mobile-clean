/**
 * Fix FINALE ASSOLUTO che forza l'indirizzo corretto
 * Viene eseguito come ultimo step e sovrascrive qualsiasi errore
 */

(function() {
    'use strict';
    
    console.log('⚡ FORCE CORRECT ADDRESS - Fix finale assoluto attivato...');
    
    // Intercetta il metodo che salva i documenti (con retry)
    function setupImportInterceptor() {
        if (window.DDTFTImport && window.DDTFTImport.prototype && window.DDTFTImport.prototype.importDocuments) {
            const originalImport = window.DDTFTImport.prototype.importDocuments;
            
            window.DDTFTImport.prototype.importDocuments = function(documents, options) {
                console.log('[FORCE ADDRESS] Intercettando importDocuments...');
                
                // Correggi ogni documento prima dell'import
                if (Array.isArray(documents)) {
                    documents.forEach(doc => {
                        forceCorrectAddress(doc);
                    });
                }
                
                // Chiama il metodo originale
                return originalImport.call(this, documents, options);
            };
            return true;
        } else {
            return false;
        }
    }
    
    // Tenta setup immediato, poi retry
    if (!setupImportInterceptor()) {
        setTimeout(() => {
            if (!setupImportInterceptor()) {
                console.log('[FORCE ADDRESS] DDTFTImport non ancora disponibile, attendendo...');
                // Setup su DOMContentLoaded se necessario
                document.addEventListener('DOMContentLoaded', setupImportInterceptor);
            }
        }, 1000);
    }
    
    // Intercetta anche la conferma del caricamento
    const originalConfirmUpload = window.confirmDocumentUpload;
    if (typeof originalConfirmUpload === 'function') {
        window.confirmDocumentUpload = function() {
            console.log('[FORCE ADDRESS] Intercettando confirmDocumentUpload...');
            
            // Correggi i documenti temporanei prima della conferma
            if (window.tempDocuments && Array.isArray(window.tempDocuments)) {
                window.tempDocuments.forEach(doc => {
                    forceCorrectAddress(doc);
                });
            }
            
            // Chiama la funzione originale
            return originalConfirmUpload.apply(this, arguments);
        };
    }
    
    // Intercetta anche updateDocumentView
    const originalUpdateView = window.updateDocumentView;
    if (typeof originalUpdateView === 'function') {
        window.updateDocumentView = function(doc) {
            // Correggi il documento prima di mostrarlo
            forceCorrectAddress(doc);
            
            // Chiama la funzione originale
            return originalUpdateView.apply(this, arguments);
        };
    }
    
    /**
     * Forza l'indirizzo corretto sul documento
     */
    function forceCorrectAddress(doc) {
        if (!doc) return;
        
        console.log(`[FORCE ADDRESS] Controllo documento ${doc.numeroDocumento || 'N/A'}`);
        
        // Caso 1: DONAC con indirizzo errato
        if (doc.cliente && doc.cliente.includes('DONAC')) {
            if (!doc.indirizzoConsegna || 
                doc.indirizzoConsegna.includes('VIA MARGARITA') ||
                !doc.indirizzoConsegna.includes('VIA SALUZZO')) {
                
                console.log('[FORCE ADDRESS] Correzione DONAC applicata');
                doc.indirizzoConsegna = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
                doc.deliveryAddress = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
                
                // Aggiorna anche la vista se presente
                if (doc.formattedDelivery) {
                    doc.formattedDelivery = 'DONAC S.R.L.  VIA SALUZZO, 65  12038  SAVIGLIANO  CN';
                }
            }
        }
        
        // Caso 2: BOREALE con VIA BERTOLE' invece di VIA MEANA/CESANA
        if (doc.cliente && doc.cliente.includes('BOREALE')) {
            if (doc.indirizzoConsegna && doc.indirizzoConsegna.includes('VIA BERTOLE')) {
                if (doc.indirizzoConsegna.includes('10088')) {
                    console.log('[FORCE ADDRESS] Correzione BOREALE -> VIA MEANA');
                    doc.indirizzoConsegna = 'VIA MEANA, SNC 10088 VOLPIANO TO';
                    doc.deliveryAddress = 'VIA MEANA, SNC 10088 VOLPIANO TO';
                } else if (doc.indirizzoConsegna.includes('10139')) {
                    console.log('[FORCE ADDRESS] Correzione BOREALE -> VIA CESANA');
                    doc.indirizzoConsegna = 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO';
                    doc.deliveryAddress = 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO';
                }
            }
        }
        
        // Caso 3: Qualsiasi indirizzo che inizia con numero invece che con VIA
        if (doc.indirizzoConsegna && /^\d/.test(doc.indirizzoConsegna)) {
            console.log('[FORCE ADDRESS] Indirizzo inizia con numero, possibile errore');
            // Qui potresti aggiungere altre correzioni specifiche
        }
    }
    
    // Esporta la funzione per test
    window.forceCorrectAddress = forceCorrectAddress;
    
    console.log('✅ [FORCE ADDRESS] Fix finale assoluto installato');
    console.log('   - Intercetta importDocuments');
    console.log('   - Intercetta confirmDocumentUpload');
    console.log('   - Intercetta updateDocumentView');
    
})();