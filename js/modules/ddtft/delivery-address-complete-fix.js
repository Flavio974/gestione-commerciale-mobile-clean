/**
 * Fix completo per l'estrazione dell'indirizzo di consegna da DDT e Fatture
 * Gestisce correttamente la struttura a due colonne dove la seconda colonna è l'indirizzo di consegna
 */

(function() {
    'use strict';
    
    console.log('📍 Applicando fix completo indirizzo di consegna (DDT + FT)...');
    
    // Override del parseDocumentFromText
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[DELIVERY COMPLETE FIX] Intercettato parseDocumentFromText');
            
            // Chiama il metodo originale
            const result = originalParse.call(this, text, fileName);
            
            if (!result) return result;
            
            // Se non c'è già un indirizzo di consegna valido, cerca di estrarlo
            if (!result.deliveryAddress || result.deliveryAddress.length < 10) {
                console.log('[DELIVERY COMPLETE FIX] Indirizzo di consegna mancante o incompleto, ricerca...');
                
                const lines = text.split('\n');
                let deliveryAddress = '';
                
                // Strategia 1: Cerca "Luogo di consegna" e poi cerca indirizzi a due colonne
                const luogoConsegnaIdx = lines.findIndex(line => line.includes('Luogo di consegna'));
                if (luogoConsegnaIdx >= 0) {
                    console.log('[DELIVERY COMPLETE FIX] Trovato "Luogo di consegna" alla riga', luogoConsegnaIdx);
                    
                    // Cerca nelle righe successive per pattern di indirizzi a due colonne
                    for (let i = luogoConsegnaIdx + 1; i < Math.min(luogoConsegnaIdx + 20, lines.length); i++) {
                        const line = lines[i].trim();
                        
                        // Cerca righe con due indirizzi (pattern VIA...spazi...VIA)
                        if (line.match(/VIA.*\s{2,}VIA/i) || 
                            line.match(/VIA.*VIA/i) && line.split('VIA').length === 3) {
                            
                            console.log(`[DELIVERY COMPLETE FIX] Trovata riga con due indirizzi: "${line}"`);
                            
                            // Estrai la seconda colonna (dopo gli spazi o la seconda VIA)
                            let secondColumn = '';
                            
                            // Metodo 1: Split su VIA e prendi l'ultima parte
                            const viaParts = line.split(/VIA/i);
                            if (viaParts.length >= 3) {
                                secondColumn = 'VIA' + viaParts[viaParts.length - 1];
                            }
                            
                            // Metodo 2: Split su spazi multipli
                            if (!secondColumn) {
                                const spaceParts = line.split(/\s{2,}/);
                                if (spaceParts.length >= 2) {
                                    secondColumn = spaceParts[spaceParts.length - 1];
                                }
                            }
                            
                            if (secondColumn) {
                                console.log(`[DELIVERY COMPLETE FIX] Seconda colonna estratta: "${secondColumn}"`);
                                
                                // Cerca il CAP nella riga successiva
                                if (i + 1 < lines.length) {
                                    const nextLine = lines[i + 1].trim();
                                    console.log(`[DELIVERY COMPLETE FIX] Riga successiva: "${nextLine}"`);
                                    
                                    // Cerca il secondo CAP nella riga
                                    const capMatches = nextLine.match(/\d{5}/g);
                                    if (capMatches && capMatches.length >= 2) {
                                        // Trova la posizione del secondo CAP
                                        const lastCapIndex = nextLine.lastIndexOf(capMatches[capMatches.length - 1]);
                                        const secondCityPart = nextLine.substring(lastCapIndex).trim();
                                        deliveryAddress = secondColumn.trim() + ' ' + secondCityPart;
                                        console.log(`[DELIVERY COMPLETE FIX] Indirizzo completo con CAP: "${deliveryAddress}"`);
                                    } else if (capMatches && capMatches.length === 1) {
                                        // Se c'è solo un CAP, potrebbe essere nella seconda parte
                                        const cityParts = nextLine.split(/\s{2,}/);
                                        if (cityParts.length >= 2) {
                                            const lastPart = cityParts[cityParts.length - 1].trim();
                                            if (lastPart.match(/^\d{5}/)) {
                                                deliveryAddress = secondColumn.trim() + ' ' + lastPart;
                                                console.log(`[DELIVERY COMPLETE FIX] Indirizzo completo (split): "${deliveryAddress}"`);
                                            }
                                        }
                                    }
                                }
                                
                                if (deliveryAddress) {
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Strategia 2: Cerca pattern specifici nel documento
                if (!deliveryAddress) {
                    console.log('[DELIVERY COMPLETE FIX] Strategia 2: ricerca pattern specifici');
                    
                    // Cerca righe che contengono due indirizzi
                    for (let i = 0; i < lines.length - 1; i++) {
                        const line = lines[i].trim();
                        const nextLine = lines[i + 1].trim();
                        
                        // Pattern: VIA BERTOLE', 13/15 VIA MEANA, SNC
                        const doubleViaMatch = line.match(/^(.+?VIA[^,]+,\s*\d+[^V]*)\s+(VIA.+)$/i);
                        if (doubleViaMatch) {
                            const secondAddress = doubleViaMatch[2];
                            
                            // Cerca il CAP corrispondente nella riga successiva
                            if (nextLine.match(/\d{5}.*\d{5}/)) {
                                // Due CAP nella stessa riga
                                const capParts = nextLine.split(/\s{2,}/);
                                if (capParts.length >= 2) {
                                    deliveryAddress = secondAddress + ' ' + capParts[capParts.length - 1];
                                    console.log(`[DELIVERY COMPLETE FIX] Indirizzo trovato (pattern 2): "${deliveryAddress}"`);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Strategia 3: Cerca dopo il riferimento ordine
                if (!deliveryAddress && result.orderReference) {
                    console.log('[DELIVERY COMPLETE FIX] Strategia 3: ricerca dopo riferimento ordine');
                    
                    const orderRefIdx = lines.findIndex(line => 
                        line.includes('Rif. Vs. Ordine') || 
                        line.includes(result.orderReference)
                    );
                    
                    if (orderRefIdx >= 0) {
                        // Cerca indietro dalla posizione del riferimento ordine
                        for (let i = orderRefIdx - 1; i >= Math.max(0, orderRefIdx - 10); i--) {
                            const line = lines[i].trim();
                            
                            if (line.includes('VIA') && !line.includes('Marconi')) {
                                console.log(`[DELIVERY COMPLETE FIX] Possibile indirizzo: "${line}"`);
                                
                                // Se c'è un pattern a due colonne
                                const parts = line.split(/\s{2,}/);
                                if (parts.length >= 2) {
                                    const lastPart = parts[parts.length - 1];
                                    if (lastPart.includes('VIA')) {
                                        // Cerca il CAP
                                        if (i + 1 < lines.length) {
                                            const capLine = lines[i + 1].trim();
                                            const capParts = capLine.split(/\s{2,}/);
                                            if (capParts.length >= 2) {
                                                deliveryAddress = lastPart + ' ' + capParts[capParts.length - 1];
                                                console.log(`[DELIVERY COMPLETE FIX] Indirizzo completo (strategia 3): "${deliveryAddress}"`);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Se abbiamo trovato un indirizzo, aggiornalo
                if (deliveryAddress && deliveryAddress.length > 10) {
                    result.deliveryAddress = deliveryAddress.trim();
                    result.indirizzoConsegna = deliveryAddress.trim();
                    console.log(`✅ [DELIVERY COMPLETE FIX] Indirizzo di consegna estratto: ${deliveryAddress}`);
                } else {
                    console.log('❌ [DELIVERY COMPLETE FIX] Indirizzo di consegna non trovato');
                }
            }
            
            return result;
        };
        
        console.log('✅ [DELIVERY COMPLETE FIX] Override parseDocumentFromText applicato');
    }
    
})();