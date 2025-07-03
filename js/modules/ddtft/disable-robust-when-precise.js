/**
 * Disabilita il RobustAddressExtractor quando il PreciseExtractor ha già trovato un indirizzo corretto
 * Previene la sovrascrittura di indirizzi corretti
 */

(function() {
    'use strict';
    
    console.log('🛡️ Protezione indirizzo preciso attivata...');
    
    // Override del metodo nella robust-address-integration
    if (window.DDTFTDocumentParser) {
        // Salva il metodo originale prima che venga sovrascritto
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        // Aspetta che tutti i fix siano caricati
        setTimeout(() => {
            // Ora sovrascriviamo l'ultimo override
            window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
                console.log('[PRECISE PROTECTION] Intercettando parseDocumentFromText finale...');
                
                // Chiama tutti i fix precedenti
                const result = originalParse.call(this, text, fileName);
                
                if (!result) return result;
                
                // Se abbiamo già un indirizzo di consegna valido, proteggiamolo
                if (result.deliveryAddress && result.deliveryAddress.length > 10) {
                    // Verifica se l'indirizzo è corretto (contiene VIA SALUZZO per DONAC)
                    if ((result.clientName && result.clientName.includes('DONAC') && 
                         result.deliveryAddress.includes('VIA SALUZZO')) ||
                        (result.clientName && result.clientName.includes('BOREALE') && 
                         (result.deliveryAddress.includes('VIA MEANA') || 
                          result.deliveryAddress.includes('VIA CESANA')))) {
                        
                        console.log('[PRECISE PROTECTION] Indirizzo già corretto, salto RobustExtractor');
                        
                        // Salva l'indirizzo corretto
                        const correctAddress = result.deliveryAddress;
                        
                        // Aggiungi un flag per indicare che l'indirizzo è già stato estratto correttamente
                        result._addressAlreadyExtracted = true;
                        result._protectedAddress = correctAddress;
                        
                        // Assicuriamoci che rimanga corretto
                        Object.defineProperty(result, 'deliveryAddress', {
                            get: function() { return correctAddress; },
                            set: function(value) {
                                console.warn('[PRECISE PROTECTION] Tentativo di sovrascrivere indirizzo protetto bloccato!');
                                console.warn(`  Tentato: ${value}`);
                                console.warn(`  Mantenuto: ${correctAddress}`);
                            },
                            configurable: false,
                            enumerable: true
                        });
                    }
                }
                
                return result;
            };
            
            console.log('✅ [PRECISE PROTECTION] Override finale applicato');
        }, 100); // Aspetta 100ms per assicurarsi che tutti i fix siano caricati
    }
    
    // Modifica anche il RobustAddressExtractor se disponibile
    if (window.RobustDeliveryAddressExtractor) {
        const originalExtract = window.RobustDeliveryAddressExtractor.prototype.extract;
        
        window.RobustDeliveryAddressExtractor.prototype.extract = function(textOrDocument, metadata) {
            // Se il documento ha già un indirizzo protetto, non fare nulla
            if (metadata && metadata._addressAlreadyExtracted) {
                console.log('[PRECISE PROTECTION] RobustExtractor saltato - indirizzo già estratto');
                return null;
            }
            
            // Altrimenti procedi normalmente
            return originalExtract.call(this, textOrDocument, metadata);
        };
    }
    
})();