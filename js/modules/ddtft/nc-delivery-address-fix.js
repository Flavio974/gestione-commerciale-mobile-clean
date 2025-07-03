/**
 * Fix specifico per l'estrazione dell'indirizzo di consegna nelle Note di Credito (NC)
 * L'indirizzo di consegna nelle NC si trova in una posizione diversa rispetto alle fatture
 */

(function() {
    'use strict';
    
    console.log('📍 Applicando fix indirizzo di consegna NC...');
    
    // Override del parseDocumentFromText per correggere l'indirizzo dopo il parsing
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[NC DELIVERY FIX] Intercettato parseDocumentFromText');
            const result = originalParse.call(this, text, fileName);
            
            if (result && result.type === 'nc') {
                console.log('[NC DELIVERY FIX] Documento NC rilevato, cerco indirizzo di consegna corretto...');
                
                const lines = text.split('\n');
                
                // Cerca "Luogo di consegna" e poi cerca nelle righe successive
                let luogoConsegnaIndex = -1;
                for (let i = 0; i < lines.length && i < 10; i++) {
                    if (lines[i].includes('Luogo di consegna')) {
                        luogoConsegnaIndex = i;
                        console.log(`[NC DELIVERY FIX] Trovato "Luogo di consegna" alla riga ${i}`);
                        break;
                    }
                }
                
                if (luogoConsegnaIndex >= 0) {
                    // Analizza le righe dopo "Luogo di consegna"
                    // Salta le righe che contengono l'indirizzo dell'emittente (ALFIERI)
                    let foundDeliveryAddress = false;
                    const possibleAddresses = [];
                    
                    // Cerca pattern di indirizzi nel documento
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        
                        // Salta righe vuote e intestazioni
                        if (!line || line.length < 5) continue;
                        
                        // Salta righe che contengono dati dell'emittente
                        if (line.includes('ALFIERI') || line.includes('MAGLIANO') || 
                            line.includes('www.alfierialimentari.com') || 
                            line.includes('03247720042')) {
                            continue;
                        }
                        
                        // Cerca pattern di indirizzo con CORSO
                        if (line.match(/^(CORSO|C\.SO)\s+[A-Z\s]+,?\s*\d+/i)) {
                            console.log(`[NC DELIVERY FIX] Trovato possibile indirizzo: ${line}`);
                            const addressLines = [line];
                            
                            // Raccogli le righe successive che potrebbero essere parte dell'indirizzo
                            for (let j = i + 1; j < lines.length && j < i + 3; j++) {
                                const nextLine = lines[j].trim();
                                // Se è un CAP seguito da città
                                if (nextLine.match(/^\d{5}\s+[A-Z]/i)) {
                                    addressLines.push(nextLine);
                                    break;
                                }
                                // Se sembra una continuazione dell'indirizzo
                                else if (nextLine.match(/^[A-Z\s]+$/i) && nextLine.length > 2) {
                                    addressLines.push(nextLine);
                                }
                            }
                            
                            if (addressLines.length > 0) {
                                const fullAddress = addressLines.join(', ');
                                console.log(`[NC DELIVERY FIX] Indirizzo completo trovato: ${fullAddress}`);
                                result.deliveryAddress = fullAddress;
                                result.indirizzoConsegna = fullAddress;
                                foundDeliveryAddress = true;
                                break;
                            }
                        }
                        
                        // Pattern alternativo: cerca indirizzi che NON sono del cliente o dell'emittente
                        if (!foundDeliveryAddress && i > 30) { // Cerca dopo le prime righe
                            // Se troviamo CORSO ROMANIA specificamente
                            if (line.includes('CORSO ROMANIA')) {
                                console.log(`[NC DELIVERY FIX] Trovato CORSO ROMANIA: ${line}`);
                                const addressLines = [line];
                                
                                // Cerca CAP e città nelle righe successive
                                for (let j = i + 1; j < lines.length && j < i + 5; j++) {
                                    const nextLine = lines[j].trim();
                                    if (nextLine.match(/^\d{5}\s+[A-Z]/i)) {
                                        addressLines.push(nextLine);
                                        break;
                                    }
                                }
                                
                                result.deliveryAddress = addressLines.join(', ');
                                result.indirizzoConsegna = addressLines.join(', ');
                                console.log(`✅ [NC DELIVERY FIX] Indirizzo di consegna corretto: ${result.deliveryAddress}`);
                                foundDeliveryAddress = true;
                                break;
                            }
                        }
                    }
                    
                    // Se non abbiamo trovato un indirizzo valido, proviamo con il parser a colonne
                    if (!foundDeliveryAddress && window.DDTFTColumnParser) {
                        console.log('[NC DELIVERY FIX] Tentativo con parser a colonne...');
                        const columns = window.DDTFTColumnParser.parseColumns(text);
                        
                        if (columns && columns.length >= 2) {
                            // Cerca nella seconda colonna
                            const secondColumn = columns[1];
                            if (secondColumn && secondColumn.lines) {
                                for (const line of secondColumn.lines) {
                                    if (line.text && line.text.includes('CORSO ROMANIA')) {
                                        result.deliveryAddress = line.text;
                                        // Cerca anche il CAP nelle righe successive
                                        const lineIndex = secondColumn.lines.indexOf(line);
                                        if (lineIndex < secondColumn.lines.length - 1) {
                                            const nextLine = secondColumn.lines[lineIndex + 1];
                                            if (nextLine.text && nextLine.text.match(/^\d{5}/)) {
                                                result.deliveryAddress += ', ' + nextLine.text;
                                            }
                                        }
                                        console.log(`✅ [NC DELIVERY FIX] Indirizzo trovato con column parser: ${result.deliveryAddress}`);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                
                console.log(`[NC DELIVERY FIX] Indirizzo finale: ${result.deliveryAddress || 'non trovato'}`);
            }
            
            return result;
        };
        
        console.log('✅ [NC DELIVERY FIX] Override parseDocumentFromText applicato');
    }
    
    // Override anche di normalizeDocumentFields per assicurarsi che l'indirizzo sia corretto
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                if (result && result.type === 'nc') {
                    console.log('[NC DELIVERY FIX] Normalizzazione documento NC, verifico indirizzo...');
                    console.log('[NC DELIVERY FIX] Indirizzo attuale:', result.deliveryAddress);
                    
                    // Se l'indirizzo contiene "STRADA VECCHIA" è l'indirizzo del cliente, non di consegna
                    if (result.deliveryAddress && result.deliveryAddress.includes('STRADA VECCHIA')) {
                        console.log('[NC DELIVERY FIX] Indirizzo errato rilevato, cerco quello corretto...');
                        
                        // Prova a trovare CORSO ROMANIA nel testo originale
                        if (result._originalText || this.text) {
                            const text = result._originalText || this.text || '';
                            const lines = text.split('\n');
                            
                            for (let i = 0; i < lines.length; i++) {
                                const line = lines[i].trim();
                                if (line.includes('CORSO ROMANIA')) {
                                    console.log(`[NC DELIVERY FIX] Trovato CORSO ROMANIA alla riga ${i}: ${line}`);
                                    const addressLines = [line];
                                    
                                    // Cerca il CAP nelle righe successive
                                    for (let j = i + 1; j < lines.length && j < i + 5; j++) {
                                        const nextLine = lines[j].trim();
                                        if (nextLine.match(/^\d{5}\s+[A-Z]/i)) {
                                            addressLines.push(nextLine);
                                            break;
                                        }
                                    }
                                    
                                    result.deliveryAddress = addressLines.join(', ');
                                    result.indirizzoConsegna = addressLines.join(', ');
                                    console.log(`✅ [NC DELIVERY FIX] Indirizzo corretto applicato: ${result.deliveryAddress}`);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                return result;
            };
            
            console.log('✅ [NC DELIVERY FIX] Override normalizeDocumentFields applicato');
        }
        
        console.log('✅ [NC DELIVERY FIX] Fix indirizzo consegna NC completato');
    }, 3000); // Ritardo maggiore per assicurarsi che sia l'ultimo
    
})();