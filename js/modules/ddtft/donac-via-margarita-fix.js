/**
 * Fix definitivo per DONAC S.R.L.
 * L'utente ha confermato che l'indirizzo di consegna corretto è:
 * VIA MARGARITA, 8 LOC. TETTO GARETTO 12100 - CUNEO CN
 */

(function() {
    'use strict';
    
    console.log('✅ Applicando fix definitivo DONAC VIA MARGARITA...');
    
    // Indirizzo corretto confermato dall'utente
    const DONAC_CORRECT_ADDRESS = 'VIA MARGARITA, 8 LOC. TETTO GARETTO 12100 - CUNEO CN';
    
    // Override parseDocumentFromText
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (!result) return result;
            
            // Verifica se è un documento DONAC
            const isDonac = (result.cliente && result.cliente.includes('DONAC')) ||
                           (result.clientName && result.clientName.includes('DONAC')) ||
                           (result.customerName && result.customerName.includes('DONAC')) ||
                           (text && text.toUpperCase().includes('DONAC S.R.L.'));
            
            if (isDonac) {
                console.log('[DONAC FIX] Documento DONAC rilevato - applicando indirizzo corretto');
                
                // Imposta l'indirizzo di consegna corretto
                result.deliveryAddress = DONAC_CORRECT_ADDRESS;
                result.indirizzoConsegna = DONAC_CORRECT_ADDRESS;
                result.shippingAddress = DONAC_CORRECT_ADDRESS;
                result.indirizzoSpedizione = DONAC_CORRECT_ADDRESS;
                result.luogoConsegna = DONAC_CORRECT_ADDRESS;
                result.destinazione = DONAC_CORRECT_ADDRESS;
                
                // Backup fields
                result._correctDeliveryAddress = DONAC_CORRECT_ADDRESS;
                result._donacFixApplied = true;
                
                console.log('[DONAC FIX] Indirizzo consegna impostato:', DONAC_CORRECT_ADDRESS);
            }
            
            return result;
        };
    }
    
    // Override anche normalizeDocumentFields
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                if (result) {
                    const isDonac = (result.cliente && result.cliente.includes('DONAC')) ||
                                   (result.clientName && result.clientName.includes('DONAC'));
                    
                    if (isDonac) {
                        result.deliveryAddress = DONAC_CORRECT_ADDRESS;
                        result.indirizzoConsegna = DONAC_CORRECT_ADDRESS;
                        console.log('[DONAC FIX] Indirizzo preservato in normalizzazione');
                    }
                }
                
                return result;
            };
        }
        
        // Override anche updateDocumentTable
        if (window.updateDocumentTable) {
            const originalUpdate = window.updateDocumentTable;
            
            window.updateDocumentTable = function() {
                // Correggi tutti i documenti DONAC prima dell'aggiornamento
                const documents = window.importedDocuments || [];
                documents.forEach(doc => {
                    if (doc) {
                        const isDonac = (doc.cliente && doc.cliente.includes('DONAC')) ||
                                       (doc.clientName && doc.clientName.includes('DONAC'));
                        
                        if (isDonac) {
                            doc.deliveryAddress = DONAC_CORRECT_ADDRESS;
                            doc.indirizzoConsegna = DONAC_CORRECT_ADDRESS;
                        }
                    }
                });
                
                return originalUpdate.apply(this, arguments);
            };
        }
    }, 5000);
    
    console.log('✅ [DONAC FIX] Fix VIA MARGARITA attivato con successo');
    
})();