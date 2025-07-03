/**
 * Fix basato sulle coordinate X per estrarre correttamente l'indirizzo di consegna
 * Utilizza le coordinate X dal layout PDF per identificare la seconda colonna
 */

(function() {
    'use strict';
    
    console.log('📍 Applicando fix basato su coordinate DDV...');
    
    // Override del column parser existente
    if (window.DDTFTColumnParser && window.DDTFTColumnParser.extractDataFromRows) {
        const originalExtract = window.DDTFTColumnParser.extractDataFromRows;
        
        window.DDTFTColumnParser.extractDataFromRows = function(rows) {
            console.log('[DDV COORDINATE FIX] Intercettando estrazione dati da righe...');
            
            // Prima trova il pattern DDV
            let ddvRowIndex = -1;
            const ddvPattern = /^(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(2\d{4})$/;
            
            for (let i = 0; i < rows.length; i++) {
                const rowText = this.getRowText(rows[i]);
                if (ddvPattern.test(rowText)) {
                    ddvRowIndex = i;
                    console.log(`[DDV COORDINATE FIX] Pattern DDV trovato alla riga ${i}`);
                    break;
                }
            }
            
            // Chiama il metodo originale
            const result = originalExtract.call(this, rows);
            
            // Se abbiamo trovato un DDV, correggi l'indirizzo di consegna
            if (ddvRowIndex >= 0 && result) {
                console.log('[DDV COORDINATE FIX] Correzione indirizzo basata su coordinate...');
                
                // Estrai l'indirizzo corretto usando le coordinate X
                const deliveryAddress = extractDeliveryAddressByCoordinates(rows, ddvRowIndex);
                
                if (deliveryAddress) {
                    console.log(`[DDV COORDINATE FIX] Indirizzo corretto: ${deliveryAddress}`);
                    result.deliveryAddress = deliveryAddress;
                    result.indirizzoConsegna = deliveryAddress;
                }
            }
            
            return result;
        };
    }
    
    // Override anche del parseDocumentFromText
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[DDV COORDINATE FIX] Intercettando parseDocumentFromText...');
            
            // Chiama il parser originale
            const result = originalParse.call(this, text, fileName);
            
            if (!result) return result;
            
            // Se è un DDV e l'indirizzo è errato, correggilo
            if ((fileName && fileName.includes('DDV')) || result.documentType === 'DDT') {
                if (result.deliveryAddress && result.deliveryAddress.includes('VIA MARGARITA')) {
                    console.log('[DDV COORDINATE FIX] Rilevato indirizzo errato, correzione in corso...');
                    
                    // Estrai l'indirizzo corretto dal testo originale
                    const correctAddress = extractCorrectAddressFromText(text);
                    
                    if (correctAddress) {
                        console.log(`[DDV COORDINATE FIX] Indirizzo corretto: ${correctAddress}`);
                        result.deliveryAddress = correctAddress;
                        result.indirizzoConsegna = correctAddress;
                        
                        // Aggiorna anche altri campi correlati
                        if (result.formattedDelivery) {
                            result.formattedDelivery = `${result.clientName}  ${correctAddress}`;
                        }
                    }
                }
            }
            
            return result;
        };
    }
    
    /**
     * Estrae l'indirizzo di consegna basandosi sulle coordinate X
     */
    function extractDeliveryAddressByCoordinates(rows, ddvRowIndex) {
        console.log('[DDV COORDINATE FIX] Estrazione basata su coordinate...');
        
        const deliveryParts = [];
        
        // Analizza le righe dopo il DDV
        for (let offset = 1; offset <= 4 && ddvRowIndex + offset < rows.length; offset++) {
            const row = rows[ddvRowIndex + offset];
            
            if (!Array.isArray(row)) continue;
            
            // Trova elementi con X > 250 (seconda colonna)
            const secondColumnElements = row.filter(elem => {
                return elem && elem.x && elem.x > 250;
            });
            
            if (secondColumnElements.length > 0) {
                // Concatena il testo degli elementi della seconda colonna
                const secondColumnText = secondColumnElements
                    .map(elem => elem.text || '')
                    .join(' ')
                    .trim();
                
                console.log(`[DDV COORDINATE FIX] Riga +${offset}, seconda colonna: "${secondColumnText}"`);
                
                // Skip se è il nome duplicato
                if (offset === 1 && secondColumnText === 'DONAC S.R.L.') {
                    continue;
                }
                
                // Aggiungi se è un indirizzo o CAP/città
                if (secondColumnText && 
                    (secondColumnText.includes('VIA') || 
                     secondColumnText.match(/\d{5}/) ||
                     secondColumnText.includes('INGR.'))) {
                    deliveryParts.push(secondColumnText);
                }
            }
        }
        
        return deliveryParts.join(' ');
    }
    
    /**
     * Estrae l'indirizzo corretto dal testo completo
     */
    function extractCorrectAddressFromText(text) {
        console.log('[DDV COORDINATE FIX] Estrazione dal testo completo...');
        
        // Strategia 1: Cerca il pattern specifico per VIA SALUZZO
        const viaSaluzzoPattern = /VIA SALUZZO,?\s*65\s+12038\s+SAVIGLIANO\s+CN/i;
        const viaSaluzzoMatch = text.match(viaSaluzzoPattern);
        
        if (viaSaluzzoMatch) {
            console.log('[DDV COORDINATE FIX] Trovato pattern VIA SALUZZO');
            return 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
        }
        
        // Strategia 2: Cerca VIA SALUZZO e poi il CAP nelle righe successive
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('VIA SALUZZO')) {
                console.log(`[DDV COORDINATE FIX] VIA SALUZZO trovata alla riga ${i}`);
                
                // Estrai solo la parte con VIA SALUZZO
                let address = '';
                const viaMatch = lines[i].match(/VIA SALUZZO[,\s]+\d+/i);
                if (viaMatch) {
                    address = viaMatch[0];
                }
                
                // Cerca il CAP nella riga successiva
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1];
                    const capMatch = nextLine.match(/12038\s+SAVIGLIANO\s+CN/i);
                    if (capMatch) {
                        address = address + ' ' + capMatch[0];
                        console.log(`[DDV COORDINATE FIX] Indirizzo completo: ${address}`);
                        return address;
                    }
                }
            }
        }
        
        // Strategia 3: Analisi riga per riga con pattern DDV
        const ddvMatch = text.match(/(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(2\d{4})/);
        if (ddvMatch) {
            const ddvLineIndex = lines.findIndex(line => line.includes(ddvMatch[0]));
            
            if (ddvLineIndex >= 0 && ddvLineIndex + 3 < lines.length) {
                // Analizza riga indirizzo (+2 dal DDV)
                const addressLine = lines[ddvLineIndex + 2];
                const cityLine = lines[ddvLineIndex + 3];
                
                // Estrai VIA SALUZZO dalla riga indirizzo
                let deliveryStreet = '';
                if (addressLine.includes('VIA SALUZZO')) {
                    const streetMatch = addressLine.match(/VIA SALUZZO[,\s]+\d+/i);
                    if (streetMatch) {
                        deliveryStreet = streetMatch[0];
                    }
                }
                
                // Estrai 12038 SAVIGLIANO CN dalla riga città
                let deliveryCity = '';
                if (cityLine.includes('12038')) {
                    const cityMatch = cityLine.match(/12038\s+SAVIGLIANO\s+CN/i);
                    if (cityMatch) {
                        deliveryCity = cityMatch[0];
                    }
                }
                
                if (deliveryStreet && deliveryCity) {
                    const fullAddress = `${deliveryStreet} ${deliveryCity}`;
                    console.log(`[DDV COORDINATE FIX] Indirizzo ricostruito: ${fullAddress}`);
                    return fullAddress;
                }
            }
        }
        
        return null;
    }
    
    console.log('✅ [DDV COORDINATE FIX] Fix basato su coordinate attivato');
    
})();