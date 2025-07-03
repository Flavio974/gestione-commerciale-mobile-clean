/**
 * Fix per estrarre correttamente l'indirizzo di consegna dalla seconda colonna nei DDV
 * Il formato DDV ha due colonne: cliente (sinistra) e consegna (destra)
 * NOTA: Per DONAC, l'indirizzo di consegna è VIA MARGARITA (stesso della sede)
 */

(function() {
    'use strict';
    
    console.log('📍 Applicando fix estrazione corretta colonna consegna DDV...');
    
    // Override del parseDocumentFromText
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            // Chiama il parser originale
            const result = originalParse.call(this, text, fileName);
            
            if (!result) return result;
            
            // Se è un DDV, correggi l'indirizzo di consegna
            if ((result.documentType === 'DDT' || result.type === 'ddv' || 
                 (fileName && fileName.toUpperCase().includes('DDV')))) {
                
                console.log('[DDV COLUMN EXTRACT] Documento DDV rilevato, verifico estrazione indirizzo...');
                
                // Se è DONAC, l'indirizzo di consegna è VIA MARGARITA (stesso della sede)
                const isDonac = (result.cliente && result.cliente.includes('DONAC')) ||
                               (result.clientName && result.clientName.includes('DONAC'));
                
                if (isDonac) {
                    console.log('[DDV COLUMN EXTRACT] Cliente DONAC rilevato - indirizzo consegna = sede');
                    const donacAddress = 'VIA MARGARITA, 8 LOC. TETTO GARETTO 12100 - CUNEO CN';
                    
                    result.deliveryAddress = donacAddress;
                    result.indirizzoConsegna = donacAddress;
                    result.shippingAddress = donacAddress;
                    result.indirizzoSpedizione = donacAddress;
                    result._correctDeliveryAddress = donacAddress;
                    
                    console.log('[DDV COLUMN EXTRACT] Indirizzo DONAC impostato:', donacAddress);
                } else {
                    // Per altri clienti, estrai dalla seconda colonna
                    const correctDeliveryAddress = extractDeliveryFromSecondColumn(text);
                    
                    if (correctDeliveryAddress) {
                        console.log('[DDV COLUMN EXTRACT] Indirizzo consegna estratto dalla seconda colonna:', correctDeliveryAddress);
                        
                        // Aggiorna tutti i campi relativi all'indirizzo di consegna
                        result.deliveryAddress = correctDeliveryAddress;
                        result.indirizzoConsegna = correctDeliveryAddress;
                        result.shippingAddress = correctDeliveryAddress;
                        result.indirizzoSpedizione = correctDeliveryAddress;
                        
                        // Preserva per eventuali fix successivi
                        result._correctDeliveryAddress = correctDeliveryAddress;
                    } else {
                        console.log('[DDV COLUMN EXTRACT] Non riuscito a estrarre indirizzo dalla seconda colonna');
                    }
                }
            }
            
            return result;
        };
    }
    
    /**
     * Estrae l'indirizzo di consegna dalla seconda colonna del DDV
     */
    function extractDeliveryFromSecondColumn(text) {
        const lines = text.split('\n');
        
        // Cerca il pattern DDV (numero DDV, data, progressivo, codice cliente)
        const ddvPattern = /^(\d{4,5})\s+(\d{1,2}\/\d{2}\/\d{2,4})\s+(\d+)\s+(2\d{4})/;
        
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(ddvPattern);
            if (match) {
                console.log(`[DDV COLUMN EXTRACT] Header DDV trovato alla riga ${i}: "${lines[i]}"`);
                
                // Le righe successive contengono:
                // i+1: Nome cliente | Nome consegna
                // i+2: Via cliente | Via consegna  
                // i+3: CAP città cliente | CAP città consegna (o altre info)
                
                if (i + 3 < lines.length) {
                    const nameRow = lines[i + 1];
                    const addressRow = lines[i + 2];
                    let cityRow = lines[i + 3];
                    
                    // A volte la città è alla riga i+4 se c'è una riga extra
                    if (!cityRow.match(/\d{5}/) && i + 4 < lines.length) {
                        cityRow = lines[i + 4];
                    }
                    
                    console.log('[DDV COLUMN EXTRACT] Righe analizzate:');
                    console.log(`  Nome: "${nameRow}"`);
                    console.log(`  Via: "${addressRow}"`);
                    console.log(`  Città: "${cityRow}"`);
                    
                    // Estrai la seconda colonna da ogni riga
                    const deliveryName = extractRightColumn(nameRow);
                    const deliveryStreet = extractRightColumn(addressRow);
                    const deliveryCity = extractRightColumn(cityRow);
                    
                    console.log('[DDV COLUMN EXTRACT] Seconda colonna estratta:');
                    console.log(`  Nome consegna: "${deliveryName}"`);
                    console.log(`  Via consegna: "${deliveryStreet}"`);
                    console.log(`  Città consegna: "${deliveryCity}"`);
                    
                    // Costruisci l'indirizzo completo di consegna
                    let fullAddress = '';
                    
                    if (deliveryStreet) {
                        fullAddress = deliveryStreet;
                        
                        // Aggiungi città se presente e valida
                        if (deliveryCity && deliveryCity.match(/\d{5}/)) {
                            // Pulisci la città da caratteri extra
                            const cleanCity = deliveryCity.replace(/^[\s\-]+/, '').trim();
                            fullAddress += ' ' + cleanCity;
                        }
                    }
                    
                    if (fullAddress) {
                        return fullAddress.trim();
                    }
                }
                
                break;
            }
        }
        
        return null;
    }
    
    /**
     * Estrae la colonna destra (consegna) da una riga del DDV
     */
    function extractRightColumn(line) {
        if (!line) return '';
        
        // Metodo 1: Se la riga contiene lo stesso testo duplicato (es. "DONAC S.R.L. DONAC S.R.L.")
        // In questo caso prendiamo la seconda occorrenza
        const trimmed = line.trim();
        const halfLength = Math.floor(trimmed.length / 2);
        const firstHalf = trimmed.substring(0, halfLength);
        const secondHalf = trimmed.substring(halfLength);
        
        // Se le due metà sono molto simili, probabilmente è duplicato
        if (firstHalf.trim() && secondHalf.trim() && 
            (firstHalf.includes(secondHalf.substring(0, 10)) || 
             secondHalf.includes(firstHalf.substring(0, 10)))) {
            // Cerca spazi multipli che potrebbero separare le colonne
            const multiSpaceMatch = line.match(/^(.+?)\s{2,}(.+)$/);
            if (multiSpaceMatch) {
                return multiSpaceMatch[2].trim();
            }
        }
        
        // Metodo 2: Cerca pattern con doppia via (es. "VIA MARGARITA... VIA SALUZZO...")
        const viaPattern = /(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA)/gi;
        const viaMatches = [...line.matchAll(viaPattern)];
        
        if (viaMatches.length >= 2) {
            // Prendi dall'ultima occorrenza di via/corso/etc
            const lastViaIndex = viaMatches[viaMatches.length - 1].index;
            return line.substring(lastViaIndex).trim();
        }
        
        // Metodo 3: Cerca pattern con doppio CAP
        const capPattern = /\b\d{5}\b/g;
        const capMatches = [...line.matchAll(capPattern)];
        
        if (capMatches.length >= 2) {
            // Trova dove inizia la seconda parte con il CAP
            const lastCapMatch = capMatches[capMatches.length - 1];
            // Cerca indietro per trovare l'inizio della via
            let startIndex = lastCapMatch.index;
            for (let i = lastCapMatch.index - 1; i >= 0; i--) {
                if (line[i].match(/[A-Z]/) && (i === 0 || line[i-1] === ' ')) {
                    startIndex = i;
                    break;
                }
            }
            return line.substring(startIndex).trim();
        }
        
        // Metodo 4: Dividi su spazi multipli (almeno 3 spazi)
        const parts = line.split(/\s{3,}/);
        if (parts.length >= 2) {
            return parts[parts.length - 1].trim();
        }
        
        // Metodo 5: Se la riga è lunga, prova a dividere approssimativamente a metà
        if (line.length > 60) {
            // Cerca uno spazio vicino al centro
            const center = Math.floor(line.length / 2);
            let splitPoint = center;
            
            // Cerca il primo spazio dopo il centro
            for (let i = center; i < line.length; i++) {
                if (line[i] === ' ' && i > center + 5) {
                    splitPoint = i;
                    break;
                }
            }
            
            const secondPart = line.substring(splitPoint).trim();
            
            // Verifica che la seconda parte sembri un indirizzo valido
            if (secondPart.match(/(VIA|CORSO|PIAZZA|\d{5})/i)) {
                return secondPart;
            }
        }
        
        // Fallback: ritorna l'intera riga
        return line.trim();
    }
    
    // Fix anche per la normalizzazione
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                // Preserva l'indirizzo corretto se presente
                if (result && result._correctDeliveryAddress) {
                    result.deliveryAddress = result._correctDeliveryAddress;
                    result.indirizzoConsegna = result._correctDeliveryAddress;
                }
                
                return result;
            };
        }
    }, 2000);
    
    console.log('✅ [DDV COLUMN EXTRACT] Fix estrazione colonna consegna attivato');
    
})();