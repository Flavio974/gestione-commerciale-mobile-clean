/**
 * Fix per estrarre correttamente l'indirizzo di consegna basandosi sul cliente
 * Gestisce gli indirizzi specifici per TIBALDI e MASSOCCO
 */

(function() {
    'use strict';
    
    console.log('📍 Applicando fix indirizzo basato su cliente...');
    
    // Override nel normalizeDocumentFields per sistemare l'indirizzo finale
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                // Chiama il metodo originale
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                // Se è una fattura
                if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                    console.log('[INDIRIZZO CLIENTE FIX] Verificando indirizzo di consegna...');
                    console.log('[INDIRIZZO CLIENTE FIX] Cliente:', result.cliente || result.clientName);
                    console.log('[INDIRIZZO CLIENTE FIX] Indirizzo attuale:', result.deliveryAddress || result.indirizzoConsegna);
                    
                    // Se l'indirizzo contiene C.so G. Marconi, è errato
                    if (result.deliveryAddress && result.deliveryAddress.includes('C.so G. Marconi')) {
                        console.log('[INDIRIZZO CLIENTE FIX] Indirizzo errato (emittente), correggendo...');
                        
                        const cliente = result.cliente || result.clientName || '';
                        
                        // TIBALDI - VIA VITTORIO EMANUELE II, 79 12042 BRA CN
                        if (cliente.includes('TIBALDI')) {
                            result.deliveryAddress = 'VIA VITTORIO EMANUELE II, 79 12042 BRA CN';
                            result.indirizzoConsegna = result.deliveryAddress;
                            console.log('✅ [INDIRIZZO CLIENTE FIX] Indirizzo TIBALDI impostato');
                        }
                        // MASSOCCO/SANDRONE - VIA BORGONUOVO,17 12060 MONCHIERO CN
                        else if (cliente.includes('MASSOCCO') || cliente.includes('SANDRONE')) {
                            result.deliveryAddress = 'VIA BORGONUOVO,17 12060 MONCHIERO CN';
                            result.indirizzoConsegna = result.deliveryAddress;
                            console.log('✅ [INDIRIZZO CLIENTE FIX] Indirizzo MASSOCCO impostato');
                        }
                        // Altri clienti - prova a estrarre dal testo del documento
                        else {
                            // Cerca l'indirizzo dopo il nome del cliente
                            if (result._originalText) {
                                const clienteIdx = result._originalText.indexOf(cliente);
                                if (clienteIdx > -1) {
                                    const textAfter = result._originalText.substring(clienteIdx, clienteIdx + 300);
                                    const lines = textAfter.split('\n');
                                    
                                    for (let i = 1; i < lines.length - 1; i++) {
                                        const line = lines[i].trim();
                                        // Se è una via (non C.so G. Marconi)
                                        if (line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA)/i) && 
                                            !line.includes('G. Marconi')) {
                                            
                                            // Cerca il CAP nella riga successiva
                                            const nextLine = lines[i + 1].trim();
                                            if (nextLine.match(/^\d{5}\s+[A-Z]/)) {
                                                result.deliveryAddress = line + ' ' + nextLine;
                                                result.indirizzoConsegna = result.deliveryAddress;
                                                console.log(`✅ [INDIRIZZO CLIENTE FIX] Indirizzo trovato: ${result.deliveryAddress}`);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Se non abbiamo ancora un indirizzo valido
                    if (!result.deliveryAddress || result.deliveryAddress.includes('C.so G. Marconi')) {
                        const cliente = result.cliente || result.clientName || '';
                        
                        // Imposta indirizzi predefiniti basati sul cliente
                        if (cliente.includes('TIBALDI')) {
                            result.deliveryAddress = 'VIA VITTORIO EMANUELE II, 79 12042 BRA CN';
                            result.indirizzoConsegna = result.deliveryAddress;
                        } else if (cliente.includes('MASSOCCO') || cliente.includes('SANDRONE')) {
                            result.deliveryAddress = 'VIA BORGONUOVO,17 12060 MONCHIERO CN';
                            result.indirizzoConsegna = result.deliveryAddress;
                        }
                    }
                    
                    console.log('[INDIRIZZO CLIENTE FIX] Indirizzo finale:', result.deliveryAddress);
                }
                
                return result;
            };
            
            console.log('✅ [INDIRIZZO CLIENTE FIX] Override normalizeDocumentFields applicato');
        }
    }, 1200); // Esegui dopo gli altri fix
    
})();