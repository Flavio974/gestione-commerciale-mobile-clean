/**
 * Fix diretto per correggere l'estrazione errata degli indirizzi DDV
 * Intercetta e corregge quando l'indirizzo viene estratto dalla colonna sbagliata
 * DISABILITATO: DONAC usa VIA MARGARITA come indirizzo di consegna
 */

(function() {
    'use strict';
    
    console.log('🔨 [DISABILITATO] Fix correzione diretta indirizzi DDV disabilitato');
    return; // DISABILITATO - DONAC usa VIA MARGARITA
    
    // Override del parseDocumentFromText
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            // Chiama il parser originale
            const result = originalParse.call(this, text, fileName);
            
            if (!result) return result;
            
            // Se è un DDV e abbiamo un indirizzo di consegna
            if ((result.documentType === 'DDT' || (fileName && fileName.includes('DDV'))) && 
                result.deliveryAddress) {
                
                console.log('[DDV ADDRESS CORRECTION] Verifico correttezza indirizzo estratto...');
                console.log('[DDV ADDRESS CORRECTION] Indirizzo attuale:', result.deliveryAddress);
                
                // Verifica se l'indirizzo contiene errori comuni
                const needsCorrection = checkIfAddressNeedsCorrection(result.deliveryAddress, text);
                
                if (needsCorrection) {
                    console.log('[DDV ADDRESS CORRECTION] Indirizzo necessita correzione!');
                    
                    // Estrai l'indirizzo corretto direttamente dal testo
                    const correctAddress = extractCorrectDeliveryAddress(text, result);
                    
                    if (correctAddress && correctAddress !== result.deliveryAddress) {
                        console.log('[DDV ADDRESS CORRECTION] Indirizzo corretto:', correctAddress);
                        result.deliveryAddress = correctAddress;
                        result.indirizzoConsegna = correctAddress;
                        
                        // Aggiorna anche altri campi correlati
                        if (result.deliveryAddressComplete) {
                            result.deliveryAddressComplete = correctAddress;
                        }
                        
                        if (result.formattedDelivery) {
                            const parts = result.formattedDelivery.split('  ');
                            parts[1] = correctAddress.split(' ')[0] + ' ' + correctAddress.split(' ')[1]; // Via
                            result.formattedDelivery = parts.join('  ');
                        }
                    }
                }
            }
            
            return result;
        };
    }
    
    /**
     * Verifica se l'indirizzo necessita correzione
     */
    function checkIfAddressNeedsCorrection(address, fullText) {
        if (!address) return false;
        
        // Caso 1: L'indirizzo contiene "VIA MARGARITA" che è l'indirizzo del cliente, non di consegna
        if (address.includes('VIA MARGARITA')) {
            console.log('[DDV ADDRESS CORRECTION] Rilevato indirizzo cliente invece di consegna');
            return true;
        }
        
        // Caso 2: L'indirizzo non contiene la via corretta ma il testo contiene "VIA SALUZZO"
        if (!address.includes('VIA SALUZZO') && fullText.includes('VIA SALUZZO')) {
            console.log('[DDV ADDRESS CORRECTION] Manca VIA SALUZZO nell\'indirizzo');
            return true;
        }
        
        // Caso 3: CAP mischiati (es. inizia con 12100 ma dovrebbe essere 12038)
        if (address.match(/^VIA[^0-9]+12100/) && fullText.includes('12038 SAVIGLIANO')) {
            console.log('[DDV ADDRESS CORRECTION] CAP errato nell\'indirizzo');
            return true;
        }
        
        return false;
    }
    
    /**
     * Estrae l'indirizzo di consegna corretto
     */
    function extractCorrectDeliveryAddress(text, documentData) {
        console.log('[DDV ADDRESS CORRECTION] Estrazione indirizzo corretto...');
        
        const lines = text.split('\n');
        
        // Strategia 1: Cerca il pattern DDV e analizza le righe successive
        const ddvPattern = /(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(2\d{4})/;
        
        for (let i = 0; i < lines.length; i++) {
            if (ddvPattern.test(lines[i])) {
                console.log(`[DDV ADDRESS CORRECTION] Pattern DDV trovato alla riga ${i}`);
                
                // Analizza le 4 righe successive
                if (i + 3 < lines.length) {
                    const clientRow = lines[i + 1];
                    const addressRow = lines[i + 2];
                    const cityRow = lines[i + 3];
                    
                    console.log('[DDV ADDRESS CORRECTION] Righe da analizzare:');
                    console.log(`  Cliente: "${clientRow}"`);
                    console.log(`  Indirizzo: "${addressRow}"`);
                    console.log(`  Città: "${cityRow}"`);
                    
                    // Estrai la seconda colonna da ogni riga
                    const deliveryName = extractSecondColumn(clientRow);
                    const deliveryStreet = extractSecondColumn(addressRow);
                    const deliveryCity = extractSecondColumn(cityRow);
                    
                    console.log('[DDV ADDRESS CORRECTION] Colonne estratte:');
                    console.log(`  Nome consegna: "${deliveryName}"`);
                    console.log(`  Via consegna: "${deliveryStreet}"`);
                    console.log(`  Città consegna: "${deliveryCity}"`);
                    
                    // Combina l'indirizzo completo
                    if (deliveryStreet && deliveryCity) {
                        const fullAddress = `${deliveryStreet} ${deliveryCity}`.trim();
                        console.log(`[DDV ADDRESS CORRECTION] Indirizzo completo: "${fullAddress}"`);
                        return fullAddress;
                    }
                }
                break;
            }
        }
        
        // Strategia 2: Cerca direttamente VIA SALUZZO con context
        const viaSaluzzoMatch = text.match(/VIA SALUZZO[,\s]+\d+[^0-9]*?(\d{5}[^0-9]+[A-Z\s]+(?:CN|TO|AL|AT|BI|NO|VB|VC))/i);
        if (viaSaluzzoMatch) {
            const address = viaSaluzzoMatch[0].trim();
            console.log(`[DDV ADDRESS CORRECTION] Trovato con pattern VIA SALUZZO: "${address}"`);
            return address;
        }
        
        // Strategia 3: Cerca pattern specifici per DONAC
        if (documentData.clientName && documentData.clientName.includes('DONAC')) {
            // Cerca indirizzo specifico DONAC
            const donacPattern = /VIA SALUZZO[,\s]+65[^0-9]*?12038\s+SAVIGLIANO\s+CN/i;
            const donacMatch = text.match(donacPattern);
            if (donacMatch) {
                console.log('[DDV ADDRESS CORRECTION] Trovato indirizzo DONAC specifico');
                return 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
            }
        }
        
        return null;
    }
    
    /**
     * Estrae la seconda colonna da una riga
     */
    function extractSecondColumn(line) {
        if (!line) return '';
        
        // Metodo 1: Se c'è un separatore esplicito
        if (line.includes('|')) {
            const parts = line.split('|');
            return parts[parts.length - 1].trim();
        }
        
        // Metodo 2: Pattern con due VIA
        if (line.toUpperCase().includes('VIA')) {
            const viaCount = (line.match(/VIA/gi) || []).length;
            if (viaCount >= 2) {
                // Trova l'ultima occorrenza di VIA
                const lastViaIndex = line.toUpperCase().lastIndexOf('VIA');
                return line.substring(lastViaIndex).trim();
            }
        }
        
        // Metodo 3: Pattern con due CAP
        const capMatches = line.match(/\d{5}/g);
        if (capMatches && capMatches.length >= 2) {
            // Trova l'ultimo CAP
            const lastCap = capMatches[capMatches.length - 1];
            const lastCapIndex = line.lastIndexOf(lastCap);
            
            // Cerca indietro per trovare l'inizio della seconda colonna
            let startIndex = lastCapIndex;
            for (let i = lastCapIndex - 1; i >= 0; i--) {
                if (line[i].match(/\d/) && !line.substring(i, i + 5).match(/^\d{5}/)) {
                    break;
                }
                startIndex = i;
            }
            
            return line.substring(startIndex).trim();
        }
        
        // Metodo 4: Split su spazi multipli
        const parts = line.split(/\s{2,}/);
        if (parts.length >= 2) {
            // Se le parti sono identiche (nome duplicato), ritorna l'ultima
            // Altrimenti, ritorna la parte più a destra
            return parts[parts.length - 1].trim();
        }
        
        // Metodo 5: Se la linea è molto lunga, prova a dividere a metà
        if (line.length > 50) {
            const midPoint = Math.floor(line.length / 2);
            // Cerca uno spazio vicino al punto medio
            let splitPoint = midPoint;
            for (let offset = 0; offset < 20; offset++) {
                if (line[midPoint + offset] === ' ') {
                    splitPoint = midPoint + offset;
                    break;
                }
                if (line[midPoint - offset] === ' ') {
                    splitPoint = midPoint - offset;
                    break;
                }
            }
            
            return line.substring(splitPoint).trim();
        }
        
        // Fallback: ritorna l'intera riga
        return line.trim();
    }
    
    console.log('✅ [DDV ADDRESS CORRECTION] Fix correzione indirizzi attivato');
    
})();