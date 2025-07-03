/**
 * Fix per rimuovere nomi cliente duplicati nella visualizzazione
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix duplicazione nomi...');
    
    // Override della funzione di rendering della tabella
    if (window.DDTFTModule && window.DDTFTModule.renderDocumentsTable) {
        const originalRender = window.DDTFTModule.renderDocumentsTable;
        
        window.DDTFTModule.renderDocumentsTable = function(documents) {
            // Correggi i nomi duplicati prima del rendering
            if (documents && Array.isArray(documents)) {
                documents.forEach(doc => {
                    if (doc.clientName && typeof doc.clientName === 'string') {
                        // Rimuovi duplicazioni tipo "STIG SRL STIG SRL"
                        const parts = doc.clientName.trim().split(/\s+/);
                        if (parts.length >= 2) {
                            const halfLength = Math.floor(parts.length / 2);
                            const firstHalf = parts.slice(0, halfLength).join(' ');
                            const secondHalf = parts.slice(halfLength).join(' ');
                            
                            if (firstHalf === secondHalf && firstHalf.length > 0) {
                                console.log(`[FIX DUPLICAZIONE] Corretto nome duplicato: "${doc.clientName}" -> "${firstHalf}"`);
                                doc.clientName = firstHalf;
                                if (doc.cliente) doc.cliente = firstHalf;
                            }
                        }
                    }
                });
            }
            
            // Chiama la funzione originale
            return originalRender.call(this, documents);
        };
    }
    
    // Fix anche per la visualizzazione dettagliata
    if (window.DDTFTModule && window.DDTFTModule.showDocumentDetails) {
        const originalShowDetails = window.DDTFTModule.showDocumentDetails;
        
        window.DDTFTModule.showDocumentDetails = function(doc) {
            // Correggi il nome prima di mostrare i dettagli
            if (doc && doc.clientName && typeof doc.clientName === 'string') {
                const parts = doc.clientName.trim().split(/\s+/);
                if (parts.length >= 2) {
                    const halfLength = Math.floor(parts.length / 2);
                    const firstHalf = parts.slice(0, halfLength).join(' ');
                    const secondHalf = parts.slice(halfLength).join(' ');
                    
                    if (firstHalf === secondHalf && firstHalf.length > 0) {
                        doc.clientName = firstHalf;
                        if (doc.cliente) doc.cliente = firstHalf;
                    }
                }
            }
            
            return originalShowDetails.call(this, doc);
        };
    }
    
    console.log('✅ Fix duplicazione nomi applicato');
    
})();