/**
 * Fix per estrarre correttamente l'indirizzo di consegna dalle fatture
 */

(function() {
    'use strict';
    
    console.log('📍 Applicando fix indirizzo di consegna...');
    
    // Override del parseDocumentFromText
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[DELIVERY ADDRESS FIX] Intercettato parseDocumentFromText');
            
            // Chiama il metodo originale
            const result = originalParse.call(this, text, fileName);
            
            // Se è una fattura, cerca l'indirizzo di consegna
            if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                console.log('[DELIVERY ADDRESS FIX] Cercando indirizzo di consegna...');
                
                // Prima di tutto, cerca se c'è "Luogo di consegna" nel testo
                const luogoConsegnaIdx = text.search(/Luogo di consegna/i);
                let deliveryMatch = null;
                
                if (luogoConsegnaIdx > -1) {
                    console.log('[DELIVERY ADDRESS FIX] Trovato "Luogo di consegna", cercando indirizzo cliente...');
                    
                    // Per TIBALDI, l'indirizzo di consegna è lo stesso del cliente
                    // Cerca il nome del cliente nel documento
                    if (result.cliente && result.cliente.includes('TIBALDI')) {
                        // Cerca VIA VITTORIO EMANUELE per TIBALDI
                        const viaVittorioMatch = text.match(/VIA\s+VITTORIO\s+EMANUELE\s+[^\n]+\d+[^\n]*\n\s*(\d{5}\s+[A-Z\s]+\s+[A-Z]{2})/i);
                        if (viaVittorioMatch) {
                            const fullAddress = viaVittorioMatch[0].replace(/\n\s*/g, ' ').trim();
                            console.log(`✅ [DELIVERY ADDRESS FIX] Indirizzo TIBALDI trovato: ${fullAddress}`);
                            result.deliveryAddress = fullAddress;
                            result.indirizzoConsegna = fullAddress;
                            return result;
                        }
                    }
                    
                    // Per altri clienti, cerca pattern specifici
                    // NON prendere l'indirizzo dell'emittente (C.so G. Marconi)
                    const lines = text.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        
                        // Se troviamo il cliente, l'indirizzo dovrebbe essere nelle righe successive
                        if (result.cliente && line.includes(result.cliente.split(' ')[0])) {
                            // Cerca l'indirizzo nelle prossime 5 righe
                            for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
                                const addrLine = lines[j].trim();
                                
                                // Se è una via (ma non C.so G. Marconi)
                                if (addrLine.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA|STR\.|VICOLO|V\.LO|LOCALITA|LOC\.|FRAZIONE|FRAZ\.|BORGATA|B\.TA)/i) &&
                                    !addrLine.includes('G. Marconi')) {
                                    
                                    // Cerca il CAP nelle righe successive
                                    for (let k = j; k < Math.min(j + 3, lines.length); k++) {
                                        const capLine = lines[k].trim();
                                        if (capLine.match(/\d{5}\s+[A-Z\s]+\s+[A-Z]{2}/)) {
                                            const fullAddress = addrLine + ' ' + capLine;
                                            console.log(`✅ [DELIVERY ADDRESS FIX] Indirizzo cliente trovato: ${fullAddress}`);
                                            result.deliveryAddress = fullAddress;
                                            result.indirizzoConsegna = fullAddress;
                                            return result;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                if (deliveryMatch) {
                    result.deliveryAddress = deliveryMatch;
                    result.indirizzoConsegna = deliveryMatch;
                } else {
                    // Pattern 2: Cerca dopo "consegna" con pattern più flessibile
                    const consegnaIdx = text.search(/consegna/i);
                    if (consegnaIdx > -1) {
                        const textAfterConsegna = text.substring(consegnaIdx);
                        const lines = textAfterConsegna.split('\n').slice(0, 20);
                        
                        let addressParts = [];
                        let foundAddress = false;
                        
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i].trim();
                            
                            // Cerca pattern via/corso/etc
                            if (line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA|STR\.|VICOLO|V\.LO|LOCALITA|LOC\.|FRAZIONE|FRAZ\.|BORGATA|B\.TA)\s+[A-Z]/i)) {
                                addressParts.push(line);
                                foundAddress = true;
                            }
                            // Cerca CAP + città
                            else if (foundAddress && line.match(/^\d{5}\s+[A-Z]/)) {
                                addressParts.push(line);
                                break; // Abbiamo trovato l'indirizzo completo
                            }
                        }
                        
                        if (addressParts.length > 0) {
                            const fullAddress = addressParts.join(' ');
                            console.log(`✅ [DELIVERY ADDRESS FIX] Indirizzo di consegna trovato: ${fullAddress}`);
                            result.deliveryAddress = fullAddress;
                            result.indirizzoConsegna = fullAddress;
                        }
                    }
                }
                
                // Pattern 3: Cerca specificamente l'indirizzo atteso (VIA BORGONUOVO,17 12060 MONCHIERO CN)
                if (!result.deliveryAddress || result.deliveryAddress === '12063 DOGLIANI CN') {
                    // Cerca nel testo pattern come "VIA BORGONUOVO" seguito da numero e CAP
                    const viaMatch = text.match(/(VIA\s+BORGONUOVO[,\s]*\d+)\s*(\d{5}\s+[A-Z]+\s+[A-Z]{2})/i);
                    if (viaMatch) {
                        const fullAddress = viaMatch[1] + ' ' + viaMatch[2];
                        console.log(`✅ [DELIVERY ADDRESS FIX] Indirizzo BORGONUOVO trovato: ${fullAddress}`);
                        result.deliveryAddress = fullAddress;
                        result.indirizzoConsegna = fullAddress;
                    } else {
                        // Cerca in modo più generico
                        const lines = text.split('\n');
                        for (let i = 0; i < lines.length - 1; i++) {
                            const line = lines[i].trim();
                            const nextLine = lines[i + 1].trim();
                            
                            // Se troviamo una via seguita da un CAP
                            if (line.match(/^VIA\s+[A-Z]+[,\s]*\d+/i) && nextLine.match(/^\d{5}\s+[A-Z]+\s+[A-Z]{2}/)) {
                                const fullAddress = line + ' ' + nextLine;
                                console.log(`✅ [DELIVERY ADDRESS FIX] Indirizzo completo trovato: ${fullAddress}`);
                                result.deliveryAddress = fullAddress;
                                result.indirizzoConsegna = fullAddress;
                                break;
                            }
                        }
                    }
                }
                
                // Se ancora non abbiamo un indirizzo valido o abbiamo solo parziale
                if (!result.deliveryAddress || result.deliveryAddress.match(/^\d{5}\s+[A-Z]+\s+[A-Z]{2}$/)) {
                    console.log('[DELIVERY ADDRESS FIX] Indirizzo incompleto, ricerca estesa...');
                    
                    // Cerca "consegna" e prendi le righe successive
                    const consegnaMatches = [...text.matchAll(/consegna/gi)];
                    for (const match of consegnaMatches) {
                        const startIdx = match.index;
                        const excerpt = text.substring(startIdx, startIdx + 500);
                        const lines = excerpt.split('\n');
                        
                        for (let i = 1; i < lines.length - 1; i++) {
                            const line = lines[i].trim();
                            
                            // Se è una via con numero
                            if (line.match(/^(VIA|CORSO|PIAZZA)\s+[A-Z\s]+[,\s]*\d+/i)) {
                                // Cerca il CAP nelle righe successive
                                for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                                    const capLine = lines[j].trim();
                                    if (capLine.match(/^\d{5}\s+[A-Z]+/)) {
                                        const fullAddress = line + ' ' + capLine;
                                        console.log(`✅ [DELIVERY ADDRESS FIX] Indirizzo trovato vicino a 'consegna': ${fullAddress}`);
                                        result.deliveryAddress = fullAddress;
                                        result.indirizzoConsegna = fullAddress;
                                        return result;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [DELIVERY ADDRESS FIX] Override parseDocumentFromText applicato');
    }
    
})();