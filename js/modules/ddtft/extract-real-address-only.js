/**
 * Estrae l'indirizzo REALE di consegna dalla seconda colonna del DDV
 * NON assume MAI quale sia l'indirizzo corretto basandosi sul nome del cliente
 */

(function() {
    'use strict';
    
    console.log('📍 Estrattore indirizzo REALE attivato...');
    
    // Override del parseDocumentFromText per estrarre correttamente dalla seconda colonna
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[REAL ADDRESS] Estrazione indirizzo reale...');
            
            // Chiama il parser originale
            const result = originalParse.call(this, text, fileName);
            
            if (!result) return result;
            
            // Se è un DDV, estrai l'indirizzo dalla seconda colonna
            if ((fileName && fileName.includes('DDV')) || result.documentType === 'DDT') {
                const realAddress = extractRealDeliveryAddress(text);
                
                if (realAddress) {
                    console.log(`[REAL ADDRESS] Indirizzo estratto dalla seconda colonna: "${realAddress}"`);
                    result.deliveryAddress = realAddress;
                    result.indirizzoConsegna = realAddress;
                } else {
                    console.log('[REAL ADDRESS] Nessun indirizzo trovato nella seconda colonna');
                }
            }
            
            return result;
        };
    }
    
    /**
     * Estrae l'indirizzo REALE dalla seconda colonna del documento
     */
    function extractRealDeliveryAddress(text) {
        const lines = text.split('\n');
        
        // Trova il pattern DDV (4 cifre + data + pag + codice cliente)
        const ddvPattern = /(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(2\d{4})/;
        let ddvLineIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            if (ddvPattern.test(lines[i])) {
                ddvLineIndex = i;
                console.log(`[REAL ADDRESS] Pattern DDV trovato alla riga ${i}: "${lines[i]}"`);
                break;
            }
        }
        
        if (ddvLineIndex === -1) {
            console.log('[REAL ADDRESS] Pattern DDV non trovato');
            return null;
        }
        
        // Analizza le righe successive per estrarre dalla SECONDA colonna
        const addressParts = [];
        
        // Riga +2: indirizzo (VIA)
        if (ddvLineIndex + 2 < lines.length) {
            const addressLine = lines[ddvLineIndex + 2];
            const secondColumnAddress = extractSecondColumn(addressLine);
            
            if (secondColumnAddress) {
                console.log(`[REAL ADDRESS] Via dalla seconda colonna: "${secondColumnAddress}"`);
                addressParts.push(secondColumnAddress);
            }
        }
        
        // Riga +3: CAP e città
        if (ddvLineIndex + 3 < lines.length) {
            const cityLine = lines[ddvLineIndex + 3];
            const secondColumnCity = extractSecondColumn(cityLine);
            
            if (secondColumnCity) {
                console.log(`[REAL ADDRESS] Città dalla seconda colonna: "${secondColumnCity}"`);
                addressParts.push(secondColumnCity);
            }
        }
        
        // Combina le parti
        return addressParts.join(' ').trim();
    }
    
    /**
     * Estrae il contenuto della seconda colonna da una riga
     * Usa vari metodi per identificare la separazione tra colonne
     */
    function extractSecondColumn(line) {
        if (!line) return '';
        
        console.log(`[REAL ADDRESS] Analisi riga: "${line}"`);
        
        // Metodo 1: Se la riga contiene coordinate X
        // Formato: [X:39, "testo col1"] [X:309, "testo col2"]
        const coordMatches = [...line.matchAll(/\[X:(\d+),\s*"([^"]+)"\]/g)];
        if (coordMatches.length >= 2) {
            // Ordina per coordinata X e prendi quelli con X > 250
            const rightElements = coordMatches
                .filter(match => parseInt(match[1]) > 250)
                .map(match => match[2]);
            
            if (rightElements.length > 0) {
                const result = rightElements.join(' ').trim();
                console.log(`[REAL ADDRESS] Estratto da coordinate X>250: "${result}"`);
                return result;
            }
        }
        
        // Metodo 2: LOC./LOCALITÀ nella prima colonna e VIA nella seconda
        // Caso specifico: "LOC. TETTO GARETTO VIA SALUZZO, 65"
        if (line.match(/\b(LOC\.|LOCALITÀ|FRAZ\.|FRAZIONE)\s+[^,]+\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA)/i)) {
            // Trova dove inizia l'indirizzo della seconda colonna
            const addressMatch = line.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+[^,]+(?:,\s*\d+)?.*$/i);
            if (addressMatch) {
                const result = addressMatch[0].trim();
                console.log(`[REAL ADDRESS] Estratto da LOC+VIA pattern: "${result}"`);
                return result;
            }
        }
        
        // Metodo 3: Due VIA sulla stessa riga
        const viaCount = (line.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\b/gi) || []).length;
        if (viaCount >= 2) {
            // Trova l'ultima occorrenza di un indirizzo stradale
            const lastAddressMatch = line.match(/.*\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+.+$/i);
            if (lastAddressMatch) {
                // Trova dove inizia l'ultimo indirizzo
                const lastAddressIndex = line.lastIndexOf(lastAddressMatch[1]);
                const result = line.substring(lastAddressIndex).trim();
                console.log(`[REAL ADDRESS] Estratto da doppio indirizzo: "${result}"`);
                return result;
            }
        }
        
        // Metodo 4: Due CAP sulla stessa riga
        const capMatches = line.match(/\d{5}/g);
        if (capMatches && capMatches.length >= 2) {
            // Trova l'ultimo CAP e prendi tutto da lì
            const lastCap = capMatches[capMatches.length - 1];
            const lastCapIndex = line.lastIndexOf(lastCap);
            const result = line.substring(lastCapIndex).trim();
            console.log(`[REAL ADDRESS] Estratto da doppio CAP: "${result}"`);
            return result;
        }
        
        // Metodo 5: Separatore | se presente
        if (line.includes('|')) {
            const parts = line.split('|');
            const result = parts[parts.length - 1].trim();
            console.log(`[REAL ADDRESS] Estratto da separatore |: "${result}"`);
            return result;
        }
        
        // Metodo 6: Spazi multipli (almeno 3 spazi)
        const spaceParts = line.split(/\s{3,}/);
        if (spaceParts.length >= 2) {
            const result = spaceParts[spaceParts.length - 1].trim();
            console.log(`[REAL ADDRESS] Estratto da spazi multipli: "${result}"`);
            return result;
        }
        
        // Metodo 7: Se il testo è duplicato (es. "DONAC S.R.L. DONAC S.R.L.")
        const halfLength = Math.floor(line.length / 2);
        const firstHalf = line.substring(0, halfLength).trim();
        const secondHalf = line.substring(halfLength).trim();
        
        if (firstHalf === secondHalf) {
            console.log(`[REAL ADDRESS] Testo duplicato rilevato: "${secondHalf}"`);
            return secondHalf;
        }
        
        // Metodo 8: Se c'è solo una VIA ma preceduta da LOC/LOCALITÀ
        // In questo caso prendiamo tutto dalla VIA in poi
        if (line.match(/\b(LOC\.|LOCALITÀ|FRAZ\.|FRAZIONE)\s+/i) && line.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\b/i)) {
            const viaMatch = line.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+.+$/i);
            if (viaMatch) {
                const result = viaMatch[0].trim();
                console.log(`[REAL ADDRESS] Estratto da LOC+singola VIA: "${result}"`);
                return result;
            }
        }
        
        console.log('[REAL ADDRESS] Nessun metodo ha funzionato per questa riga');
        return '';
    }
    
    // Esporta le funzioni per test
    window.extractRealDeliveryAddress = extractRealDeliveryAddress;
    window.extractSecondColumn = extractSecondColumn;
    
    console.log('✅ [REAL ADDRESS] Estrattore indirizzo reale configurato');
    console.log('   - Estrae SOLO dalla seconda colonna del DDV');
    console.log('   - NON assume MAI indirizzi predefiniti');
    console.log('   - Supporta multiple modalità di estrazione colonne');
    
})();