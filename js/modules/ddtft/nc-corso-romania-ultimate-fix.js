/**
 * Fix DEFINITIVO per CORSO ROMANIA nelle NC
 * Applica CORSO ROMANIA come indirizzo di consegna SOLO per MOLE MARKET
 */

(function() {
    'use strict';
    
    console.log('🔥 Applicando fix DEFINITIVO CORSO ROMANIA per NC...');
    
    // Intercetta TUTTI i possibili punti di parsing
    const interceptPoints = [
        'DDTFTImport',
        'DDTFTDocumentParser',
        'DDTFTParser',
        'DocumentParser'
    ];
    
    // Funzione per applicare override a tutti i metodi di parsing
    function applyCorsoRomaniaFix(obj, objName) {
        if (!obj) return;
        
        // Lista di metodi da intercettare
        const methodsToIntercept = [
            'parseDocumentFromText',
            'parse',
            'parseDocument',
            'extractDocument',
            'processDocument',
            'normalizeDocumentFields',
            'normalizeDocument'
        ];
        
        methodsToIntercept.forEach(methodName => {
            if (obj[methodName]) {
                const original = obj[methodName];
                
                obj[methodName] = function() {
                    const args = Array.from(arguments);
                    const text = args[0];
                    
                    // Esegui il metodo originale
                    let result = original.apply(this, args);
                    
                    // Se abbiamo un risultato e del testo
                    if (result && text && typeof text === 'string') {
                        // Verifica se è una NC
                        const isNC = (result.type === 'nc' || result.documentType === 'NC' ||
                                     text.toUpperCase().includes('NOTA') && text.toUpperCase().includes('CREDITO'));
                        
                        if (isNC) {
                            // Verifica se è un documento MOLE MARKET
                            const isMoleMarket = (result.cliente && result.cliente.includes('MOLE MARKET')) ||
                                               (result.clientName && result.clientName.includes('MOLE MARKET')) ||
                                               (result._clienteReale && result._clienteReale.includes('MOLE MARKET'));
                            
                            if (isMoleMarket) {
                                console.log(`[CORSO ROMANIA ULTIMATE] NC di MOLE MARKET - applicando CORSO ROMANIA`);
                                
                                const correctAddress = 'CORSO ROMANIA,460 - 10156 TORINO TO';
                                
                                // Applica l'indirizzo di consegna corretto
                                result.deliveryAddress = correctAddress;
                                result.indirizzoConsegna = correctAddress;
                                result.shippingAddress = correctAddress;
                                result.indirizzoSpedizione = correctAddress;
                                result.luogoConsegna = correctAddress;
                                result.destinazione = correctAddress;
                                
                                // Campi di backup
                                result._realDeliveryAddress = correctAddress;
                                result._corsoRomaniaAddress = correctAddress;
                                result._fixedDeliveryAddress = correctAddress;
                                
                                console.log(`✅ [CORSO ROMANIA ULTIMATE] Indirizzo consegna impostato: ${correctAddress}`);
                            }
                        }
                    }
                    
                    return result;
                };
                
                console.log(`✅ [CORSO ROMANIA ULTIMATE] Override applicato a ${objName}.${methodName}`);
            }
        });
        
        // Override anche sul prototype se esiste
        if (obj.prototype) {
            methodsToIntercept.forEach(methodName => {
                if (obj.prototype[methodName]) {
                    const original = obj.prototype[methodName];
                    
                    obj.prototype[methodName] = function() {
                        let result = original.apply(this, arguments);
                        
                        if (result && result.type === 'nc') {
                            const isMoleMarket = (result.cliente && result.cliente.includes('MOLE MARKET')) ||
                                               (result._clienteReale && result._clienteReale.includes('MOLE MARKET'));
                            
                            if (isMoleMarket) {
                                const correctAddress = 'CORSO ROMANIA,460 - 10156 TORINO TO';
                                result.deliveryAddress = correctAddress;
                                result.indirizzoConsegna = correctAddress;
                                console.log(`✅ [CORSO ROMANIA ULTIMATE] Corretto in prototype.${methodName}`);
                            }
                        }
                        
                        return result;
                    };
                }
            });
        }
    }
    
    // Applica fix a tutti i punti di intercettazione
    interceptPoints.forEach(name => {
        if (window[name]) {
            applyCorsoRomaniaFix(window[name], name);
        }
    });
    
    // Override globale di ultima istanza
    const globalCheck = setInterval(() => {
        interceptPoints.forEach(name => {
            if (window[name] && !window[name]._corsoRomaniaFixed) {
                applyCorsoRomaniaFix(window[name], name);
                window[name]._corsoRomaniaFixed = true;
            }
        });
    }, 1000);
    
    // Ferma il check dopo 10 secondi
    setTimeout(() => clearInterval(globalCheck), 10000);
    
    // Fix su metodi di visualizzazione
    setTimeout(() => {
        // Override displayDocumentDetails
        if (window.displayDocumentDetails) {
            const originalDisplay = window.displayDocumentDetails;
            
            window.displayDocumentDetails = function(doc) {
                if (doc && doc.type === 'nc') {
                    const isMoleMarket = (doc.cliente && doc.cliente.includes('MOLE MARKET')) ||
                                       (doc._clienteReale && doc._clienteReale.includes('MOLE MARKET'));
                    
                    if (isMoleMarket) {
                        doc.deliveryAddress = 'CORSO ROMANIA,460 - 10156 TORINO TO';
                        doc.indirizzoConsegna = 'CORSO ROMANIA,460 - 10156 TORINO TO';
                    }
                }
                
                return originalDisplay.apply(this, arguments);
            };
        }
        
        // Override updateDocumentTable
        if (window.updateDocumentTable) {
            const originalUpdate = window.updateDocumentTable;
            
            window.updateDocumentTable = function() {
                // Correggi tutti i documenti NC di MOLE MARKET
                const documents = window.importedDocuments || [];
                documents.forEach(doc => {
                    if (doc && doc.type === 'nc') {
                        const isMoleMarket = (doc.cliente && doc.cliente.includes('MOLE MARKET')) ||
                                           (doc._clienteReale && doc._clienteReale.includes('MOLE MARKET'));
                        
                        if (isMoleMarket) {
                            doc.deliveryAddress = 'CORSO ROMANIA,460 - 10156 TORINO TO';
                            doc.indirizzoConsegna = 'CORSO ROMANIA,460 - 10156 TORINO TO';
                        }
                    }
                });
                
                return originalUpdate.apply(this, arguments);
            };
        }
    }, 6000);
    
    console.log('🎯 [CORSO ROMANIA ULTIMATE] Fix definitivo applicato con successo!');
    
})();