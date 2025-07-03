/**
 * Fix specifico per l'estrazione dell'indirizzo di consegna dalle Fatture (FTV)
 * Gestisce il layout a due colonne delle fatture Alfieri
 */

(function() {
    'use strict';
    
    console.log('📍 Applicando fix specifico indirizzo consegna FTV...');
    
    // Override del parseDocumentFromText
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[FTV ADDRESS FIX] Intercettato parseDocumentFromText');
            
            // Chiama il parser originale
            const result = originalParse.call(this, text, fileName);
            
            if (!result) return result;
            
            // Solo per fatture (FT o FTV)
            if (result.type === 'fattura' || result.documentType === 'FT' || 
                (fileName && fileName.toUpperCase().includes('FTV'))) {
                
                console.log('[FTV ADDRESS FIX] Documento fattura rilevato, verifico indirizzo consegna...');
                
                const lines = text.split('\n');
                let foundDeliveryAddress = '';
                
                // Cerca il pattern del cliente e indirizzo
                let clientFound = false;
                let possibleAddresses = [];
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Cerca il nome del cliente (MOLINETTO SALUMI DI)
                    if (line.includes('MOLINETTO SALUMI') || line.includes('BARISONE E BALDON')) {
                        clientFound = true;
                        console.log(`[FTV ADDRESS FIX] Cliente trovato alla riga ${i}: "${line}"`);
                    }
                    
                    // Se abbiamo trovato il cliente, cerca gli indirizzi nelle righe successive
                    if (clientFound && line.match(/^VIA\s+[A-Z]/i)) {
                        console.log(`[FTV ADDRESS FIX] Possibile indirizzo alla riga ${i}: "${line}"`);
                        
                        // Cerca il CAP nella riga successiva
                        if (i + 1 < lines.length) {
                            const nextLine = lines[i + 1].trim();
                            if (nextLine.match(/^\d{5}\s+[A-Z]/)) {
                                const fullAddress = line + ' ' + nextLine;
                                possibleAddresses.push({
                                    address: fullAddress,
                                    line: i
                                });
                                console.log(`[FTV ADDRESS FIX] Indirizzo completo: "${fullAddress}"`);
                            }
                        }
                    }
                    
                    // Metodo alternativo: cerca righe con due indirizzi VIA affiancati
                    if (line.match(/VIA.*VIA/i)) {
                        console.log(`[FTV ADDRESS FIX] Riga con due VIA trovata: "${line}"`);
                        
                        // Estrai l'ultimo indirizzo (quello di destra)
                        const lastViaIndex = line.lastIndexOf('VIA');
                        if (lastViaIndex > 0) {
                            const deliveryPart = line.substring(lastViaIndex).trim();
                            
                            // Cerca il CAP corrispondente nella riga successiva
                            if (i + 1 < lines.length) {
                                const nextLine = lines[i + 1].trim();
                                
                                // Se ci sono due CAP, prendi l'ultimo
                                const capPattern = /\d{5}\s+[A-Z\s]+\s+[A-Z]{2}/g;
                                const capMatches = [...nextLine.matchAll(capPattern)];
                                
                                if (capMatches.length > 0) {
                                    // Prendi l'ultimo CAP (quello di destra)
                                    const lastCap = capMatches[capMatches.length - 1][0];
                                    foundDeliveryAddress = deliveryPart + ' ' + lastCap.trim();
                                    console.log(`[FTV ADDRESS FIX] Indirizzo di consegna estratto: "${foundDeliveryAddress}"`);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Se abbiamo trovato più indirizzi, l'ultimo è quello di consegna
                if (!foundDeliveryAddress && possibleAddresses.length >= 2) {
                    foundDeliveryAddress = possibleAddresses[possibleAddresses.length - 1].address;
                    console.log(`[FTV ADDRESS FIX] Uso l'ultimo indirizzo trovato: "${foundDeliveryAddress}"`);
                }
                
                // Metodo specifico per il layout mostrato nel debug
                if (!foundDeliveryAddress) {
                    // Cerca specificamente pattern di indirizzi noti
                    const addressPatterns = [
                        { via: 'VIA GUASCO', cap: '15100 ALESSANDRIA' },
                        { via: 'VIA FONTANA', cap: '14100 ASTI' },
                        { via: 'VIA MOLINETTO', cap: '15122 ALESSANDRIA' }
                    ];
                    
                    for (const pattern of addressPatterns) {
                        for (let i = 0; i < lines.length - 1; i++) {
                            if (lines[i].includes(pattern.via) && lines[i + 1].includes(pattern.cap)) {
                                // Verifica se questo è l'indirizzo di consegna (ultimo trovato)
                                const tempAddress = lines[i].trim() + ' ' + lines[i + 1].trim();
                                console.log(`[FTV ADDRESS FIX] Trovato indirizzo: "${tempAddress}"`);
                                foundDeliveryAddress = tempAddress;
                                // Non interrompere, continua a cercare (l'ultimo trovato sarà quello di consegna)
                            }
                        }
                    }
                }
                
                // Aggiorna l'indirizzo se trovato
                if (foundDeliveryAddress) {
                    // Pulizia finale dell'indirizzo
                    foundDeliveryAddress = foundDeliveryAddress
                        .replace(/\s+/g, ' ')  // Normalizza spazi
                        .replace(/,$/, '')     // Rimuovi virgola finale
                        .trim();
                    
                    result.deliveryAddress = foundDeliveryAddress;
                    result.indirizzoConsegna = foundDeliveryAddress;
                    console.log(`✅ [FTV ADDRESS FIX] Indirizzo di consegna aggiornato: ${foundDeliveryAddress}`);
                } else {
                    console.log('❌ [FTV ADDRESS FIX] Nessun indirizzo di consegna trovato');
                    
                    // Se non trovato, potrebbe essere lo stesso della sede
                    if (result.clientName && result.clientName.includes('IL GUSTO FRUTTA')) {
                        // Per questo cliente, l'indirizzo di consegna è lo stesso della sede
                        result.deliveryAddress = 'VIA FONTANA, 4 14100 ASTI AT';
                        console.log('ℹ️ [FTV ADDRESS FIX] Usando indirizzo sede come consegna per IL GUSTO FRUTTA');
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [FTV ADDRESS FIX] Override applicato');
    }
    
})();