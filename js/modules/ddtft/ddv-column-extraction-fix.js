/**
 * Fix per l'estrazione corretta dei dati dalle colonne DDV
 * Gestisce specificamente il formato a colonne dei documenti Alfieri
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix estrazione colonne DDV...');
    
    // Override del metodo che processa le righe DDV
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[DDV COLUMN FIX] Intercettato parseDocumentFromText');
            
            // Prima cerca il pattern DDV nel testo
            const ddvPattern = /(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(2\d{4})/gm;
            const ddvMatch = ddvPattern.exec(text);
            
            if (ddvMatch) {
                console.log('[DDV COLUMN FIX] Pattern DDV trovato:', {
                    numero: ddvMatch[1],
                    data: ddvMatch[2],
                    pagina: ddvMatch[3],
                    codiceCliente: ddvMatch[4]
                });
                
                // Analizza le righe per estrarre i dati corretti
                const lines = text.split('\n');
                let ddvLineIndex = -1;
                
                // Trova l'indice della riga DDV
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes(ddvMatch[1]) && lines[i].includes(ddvMatch[2])) {
                        ddvLineIndex = i;
                        break;
                    }
                }
                
                if (ddvLineIndex >= 0) {
                    console.log('[DDV COLUMN FIX] Riga DDV trovata all\'indice:', ddvLineIndex);
                    
                    // Estrai i dati dalle righe successive
                    const extractedData = {
                        documentNumber: ddvMatch[1],
                        date: ddvMatch[2],
                        clientCode: ddvMatch[4],
                        clientName: '',
                        deliveryAddress: '',
                        vatNumber: ''
                    };
                    
                    // Riga successiva: nome cliente (doppia colonna)
                    if (ddvLineIndex + 1 < lines.length) {
                        const clientLine = lines[ddvLineIndex + 1];
                        console.log('[DDV COLUMN FIX] Riga cliente:', clientLine);
                        
                        // Prima controlla se la riga contiene coordinate X
                        const coordPattern = /\[X:(\d+),\s*"([^"]+)"\]/g;
                        const coords = [];
                        let coordMatch;
                        while ((coordMatch = coordPattern.exec(clientLine)) !== null) {
                            coords.push({ 
                                x: parseInt(coordMatch[1]), 
                                text: coordMatch[2] 
                            });
                        }
                        
                        if (coords.length > 0) {
                            // Usa le coordinate X per estrarre dalla colonna destra (X > 300)
                            const rightColumnText = coords
                                .filter(c => c.x >= 300)
                                .map(c => c.text)
                                .join(' ')
                                .trim();
                            
                            if (rightColumnText) {
                                extractedData.clientName = rightColumnText;
                                console.log('[DDV COLUMN FIX] Nome cliente estratto da coordinate X:', extractedData.clientName);
                            }
                        } else {
                            // Fallback al metodo extractColumns
                            const clientParts = extractColumns(clientLine);
                            if (clientParts.right) {
                                extractedData.clientName = clientParts.right.trim();
                                console.log('[DDV COLUMN FIX] Nome cliente estratto con extractColumns:', extractedData.clientName);
                            }
                        }
                    }
                    
                    // Riga +2: indirizzo (doppia colonna)
                    if (ddvLineIndex + 2 < lines.length) {
                        const addressLine = lines[ddvLineIndex + 2];
                        console.log('[DDV COLUMN FIX] Riga indirizzo:', addressLine);
                        
                        // Prima controlla se la riga contiene coordinate X
                        const coordPattern = /\[X:(\d+),\s*"([^"]+)"\]/g;
                        const coords = [];
                        let coordMatch;
                        while ((coordMatch = coordPattern.exec(addressLine)) !== null) {
                            coords.push({ 
                                x: parseInt(coordMatch[1]), 
                                text: coordMatch[2] 
                            });
                        }
                        
                        if (coords.length > 0) {
                            // Usa le coordinate X per estrarre dalla colonna destra (X > 300)
                            const rightColumnText = coords
                                .filter(c => c.x >= 300)
                                .map(c => c.text)
                                .join(' ')
                                .trim();
                            
                            if (rightColumnText) {
                                extractedData.deliveryAddress = rightColumnText;
                                console.log('[DDV COLUMN FIX] Indirizzo estratto da coordinate X:', extractedData.deliveryAddress);
                            }
                        } else {
                            // Fallback al metodo extractColumns
                            const addressParts = extractColumns(addressLine);
                            if (addressParts.right) {
                                extractedData.deliveryAddress = addressParts.right.trim();
                                console.log('[DDV COLUMN FIX] Indirizzo estratto con extractColumns:', extractedData.deliveryAddress);
                            }
                        }
                    }
                    
                    // Riga +3: CAP e città (doppia colonna)
                    if (ddvLineIndex + 3 < lines.length) {
                        const cityLine = lines[ddvLineIndex + 3];
                        console.log('[DDV COLUMN FIX] Riga città:', cityLine);
                        
                        // Prima controlla se la riga contiene coordinate X
                        const coordPattern = /\[X:(\d+),\s*"([^"]+)"\]/g;
                        const coords = [];
                        let coordMatch;
                        while ((coordMatch = coordPattern.exec(cityLine)) !== null) {
                            coords.push({ 
                                x: parseInt(coordMatch[1]), 
                                text: coordMatch[2] 
                            });
                        }
                        
                        if (coords.length > 0) {
                            // Usa le coordinate X per estrarre dalla colonna destra (X > 300)
                            const rightColumnText = coords
                                .filter(c => c.x >= 300)
                                .map(c => c.text)
                                .join(' ')
                                .trim();
                            
                            if (rightColumnText) {
                                // Combina indirizzo e città
                                extractedData.deliveryAddress = extractedData.deliveryAddress + ' ' + rightColumnText;
                                console.log('[DDV COLUMN FIX] Città estratta da coordinate X:', rightColumnText);
                                console.log('[DDV COLUMN FIX] Indirizzo completo:', extractedData.deliveryAddress);
                            }
                        } else {
                            // Fallback al metodo extractColumns
                            const cityParts = extractColumns(cityLine);
                            if (cityParts.right) {
                                // Combina indirizzo e città
                                extractedData.deliveryAddress = extractedData.deliveryAddress + ' ' + cityParts.right.trim();
                                console.log('[DDV COLUMN FIX] Indirizzo completo:', extractedData.deliveryAddress);
                            }
                        }
                    }
                    
                    // Cerca P.IVA nelle righe successive
                    for (let i = ddvLineIndex + 4; i < Math.min(ddvLineIndex + 10, lines.length); i++) {
                        const line = lines[i];
                        const pivaMatch = line.match(/\b(\d{11})\b/);
                        if (pivaMatch) {
                            extractedData.vatNumber = pivaMatch[1];
                            console.log('[DDV COLUMN FIX] P.IVA trovata:', extractedData.vatNumber);
                            break;
                        }
                    }
                    
                    // Aggiorna il testo con i dati estratti
                    const metadataSection = `
=== DATI ESTRATTI DA DDV COLUMN FIX ===
NUMERO DOCUMENTO: ${extractedData.documentNumber}
DATA: ${extractedData.date}
CODICE CLIENTE: ${extractedData.clientCode}
NOME CLIENTE: ${extractedData.clientName}
INDIRIZZO CONSEGNA: ${extractedData.deliveryAddress}
P.IVA: ${extractedData.vatNumber}
=====================================
`;
                    
                    // Inserisci i metadati all'inizio del testo
                    text = metadataSection + text;
                    console.log('[DDV COLUMN FIX] Metadati aggiunti al testo');
                }
            }
            
            // Chiama il parser originale con il testo modificato
            const result = originalParse.call(this, text, fileName);
            
            return result;
        };
        
        console.log('✅ [DDV COLUMN FIX] Override applicato');
    }
    
    /**
     * Estrae le colonne da una riga di testo
     * Gestisce sia spazi multipli che pattern specifici
     */
    function extractColumns(line) {
        console.log('[extractColumns] Analisi riga:', line);
        
        // Metodo 1: Pattern con LOC/LOCALITÀ seguito da VIA
        // Caso: "VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65"
        if (line.match(/\b(LOC\.|LOCALITÀ|FRAZ\.|FRAZIONE)\s+[^,]+\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA)/i)) {
            // Trova l'ultima occorrenza di un indirizzo (che sarà quello di consegna)
            const lastAddressMatch = line.match(/.*\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+.+$/i);
            if (lastAddressMatch) {
                const lastAddressStart = line.lastIndexOf(lastAddressMatch[1]);
                const left = line.substring(0, lastAddressStart).trim();
                const right = line.substring(lastAddressStart).trim();
                console.log('[extractColumns] Estratto con pattern LOC+VIA:', { left, right });
                return { left, right };
            }
        }
        
        // Metodo 2: Cerca pattern con due indirizzi (VIA...VIA)
        const viaCount = (line.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\b/gi) || []).length;
        if (viaCount >= 2) {
            // Trova l'ultima occorrenza di un indirizzo
            const matches = [...line.matchAll(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\b/gi)];
            if (matches.length >= 2) {
                const lastMatch = matches[matches.length - 1];
                const lastIndex = lastMatch.index;
                const left = line.substring(0, lastIndex).trim();
                const right = line.substring(lastIndex).trim();
                console.log('[extractColumns] Estratto con doppio indirizzo:', { left, right });
                return { left, right };
            }
        }
        
        // Metodo 3: Cerca pattern con due CAP
        const capMatches = line.match(/\d{5}/g);
        if (capMatches && capMatches.length >= 2) {
            const lastCap = capMatches[capMatches.length - 1];
            const lastCapIndex = line.lastIndexOf(lastCap);
            const left = line.substring(0, lastCapIndex).trim();
            const right = line.substring(lastCapIndex).trim();
            console.log('[extractColumns] Estratto con doppio CAP:', { left, right });
            return { left, right };
        }
        
        // Metodo 4: Split su spazi multipli
        const parts = line.split(/\s{2,}/);
        if (parts.length >= 2) {
            const left = parts[0].trim();
            const right = parts[parts.length - 1].trim();
            
            // Se sono identici, usa solo uno
            if (left === right) {
                console.log('[extractColumns] Parti identiche:', left);
                return { left: left, right: left };
            }
            
            console.log('[extractColumns] Estratto con spazi multipli:', { left, right });
            return { left: left, right: right };
        }
        
        // Metodo 5: Cerca posizioni basate su coordinate X nel testo originale
        // Se la riga contiene coordinate [X:309, ...], estrai basandosi su quelle
        const coordPattern = /\[X:(\d+),\s*"([^"]+)"\]/g;
        const coords = [];
        let match;
        while ((match = coordPattern.exec(line)) !== null) {
            coords.push({ x: parseInt(match[1]), text: match[2] });
        }
        
        if (coords.length >= 2) {
            // Ordina per X e prendi il testo con X > 300 per la colonna destra
            const leftText = coords.filter(c => c.x < 300).map(c => c.text).join(' ').trim();
            const rightText = coords.filter(c => c.x >= 300).map(c => c.text).join(' ').trim();
            if (rightText) {
                console.log('[extractColumns] Estratto da coordinate X:', { left: leftText, right: rightText });
                return { left: leftText, right: rightText };
            }
        }
        
        // Fallback: ritorna la riga intera per entrambe le colonne
        console.log('[extractColumns] Fallback - ritorna riga intera');
        return {
            left: line.trim(),
            right: line.trim()
        };
    }
    
})();