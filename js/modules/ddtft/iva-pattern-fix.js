/**
 * Fix avanzato per identificare pattern IVA nelle righe articolo
 * Usa analisi della struttura delle colonne per identificare correttamente l'IVA
 */

(function() {
    'use strict';
    
    console.log('🔍 Applicando fix pattern IVA...');
    
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ft' || result.documentType === 'FT') && result.items) {
                console.log('[IVA PATTERN FIX] Analizzando struttura colonne per IVA...');
                
                const lines = text.split('\n');
                let headerLine = null;
                let headerIndex = -1;
                
                // Trova l'header degli articoli
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('CODICE') && lines[i].includes('DESCRIZIONE') && 
                        (lines[i].includes('PREZZO') || lines[i].includes('IVA'))) {
                        headerLine = lines[i];
                        headerIndex = i;
                        console.log(`[IVA PATTERN FIX] Header trovato alla riga ${i}: ${headerLine}`);
                        break;
                    }
                }
                
                if (headerLine && headerIndex > -1) {
                    // Analizza la posizione delle colonne nell'header
                    const ivaPosition = headerLine.indexOf('IVA');
                    const aliquotaPosition = headerLine.indexOf('ALIQUOTA');
                    const colonnaIVA = ivaPosition > -1 ? ivaPosition : aliquotaPosition;
                    
                    console.log(`[IVA PATTERN FIX] Posizione colonna IVA: ${colonnaIVA}`);
                    
                    // Analizza le righe degli articoli
                    for (let i = headerIndex + 1; i < lines.length && i < headerIndex + 50; i++) {
                        const line = lines[i];
                        
                        // Se la riga inizia con un codice articolo
                        if (line.match(/^\d{6}|^[A-Z]{2}\d{6}/)) {
                            // Estrai il valore alla posizione della colonna IVA
                            if (colonnaIVA > -1 && line.length > colonnaIVA) {
                                // Prendi una finestra di caratteri intorno alla posizione IVA
                                const start = Math.max(0, colonnaIVA - 5);
                                const end = Math.min(line.length, colonnaIVA + 5);
                                const ivaSection = line.substring(start, end).trim();
                                
                                // Cerca un numero che potrebbe essere l'IVA
                                const ivaMatch = ivaSection.match(/\b(\d{1,2})\b/);
                                if (ivaMatch) {
                                    const iva = ivaMatch[1].padStart(2, '0');
                                    const codiceMatch = line.match(/^(\d{6}|[A-Z]{2}\d{6})/);
                                    
                                    if (codiceMatch && ['04', '10', '22'].includes(iva)) {
                                        const codice = codiceMatch[1];
                                        console.log(`[IVA PATTERN FIX] Articolo ${codice}: IVA ${iva}% (posizione colonna)`);
                                        
                                        // Trova e aggiorna l'articolo corrispondente
                                        const item = result.items.find(it => it.code === codice);
                                        if (item && item.vatCode !== iva) {
                                            console.log(`✅ [IVA PATTERN FIX] Corretto ${codice}: ${item.vatCode}% -> ${iva}%`);
                                            item.vatCode = iva;
                                            item.iva = iva;
                                            item.aliquotaIVA = iva;
                                        }
                                    }
                                }
                            }
                            
                            // Metodo alternativo: analizza l'ultima parte della riga
                            // Spesso l'IVA è uno degli ultimi valori
                            const tokens = line.trim().split(/\s+/);
                            if (tokens.length >= 5) {
                                // Controlla gli ultimi 3 token
                                for (let j = tokens.length - 1; j >= Math.max(0, tokens.length - 3); j--) {
                                    const token = tokens[j];
                                    // Se è un numero a 1-2 cifre che potrebbe essere IVA
                                    if (token.match(/^\d{1,2}$/) && ['4', '10', '22'].includes(token)) {
                                        const iva = token.padStart(2, '0');
                                        const codiceMatch = line.match(/^(\d{6}|[A-Z]{2}\d{6})/);
                                        
                                        if (codiceMatch) {
                                            const codice = codiceMatch[1];
                                            const item = result.items.find(it => it.code === codice);
                                            
                                            if (item && item.vatCode !== iva) {
                                                console.log(`✅ [IVA PATTERN FIX] Corretto ${codice}: ${item.vatCode}% -> ${iva}% (token analysis)`);
                                                item.vatCode = iva;
                                                item.iva = iva;
                                                item.aliquotaIVA = iva;
                                            }
                                        }
                                        break; // Trovata IVA, non cercare oltre
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Pattern specifico per righe con formato noto
                // Es: "codice descrizione UM qtà prezzo sconto totale IVA"
                result.items.forEach(item => {
                    // Cerca la riga specifica di questo articolo
                    const itemRegex = new RegExp(`^${item.code}\\s+.+`, 'im');
                    const itemLineMatch = text.match(itemRegex);
                    
                    if (itemLineMatch) {
                        const itemLine = itemLineMatch[0];
                        
                        // Pattern per estrarre l'IVA considerando che potrebbe essere seguita da "000" o altri numeri
                        // Es: "21,01 4 000" dove 4 è l'IVA
                        const ivaPatterns = [
                            /\s+(\d{1,2})\s+\d{3}\s*$/,  // IVA seguita da 000
                            /\s+(\d{1,2})\s*$/,           // IVA alla fine
                            /\d+[,.]?\d*\s+(\d{1,2})\s+/, // IVA dopo un importo
                        ];
                        
                        for (const pattern of ivaPatterns) {
                            const match = itemLine.match(pattern);
                            if (match) {
                                const possibleIVA = match[1];
                                if (['4', '10', '22'].includes(possibleIVA)) {
                                    const iva = possibleIVA.padStart(2, '0');
                                    if (item.vatCode !== iva) {
                                        console.log(`✅ [IVA PATTERN FIX] Pattern match per ${item.code}: ${item.vatCode}% -> ${iva}%`);
                                        item.vatCode = iva;
                                        item.iva = iva;
                                        item.aliquotaIVA = iva;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                });
                
                // Log finale
                const riepilogoIVA = {};
                result.items.forEach(item => {
                    const iva = item.vatCode || item.iva || '??';
                    riepilogoIVA[iva] = (riepilogoIVA[iva] || 0) + 1;
                });
                
                console.log('[IVA PATTERN FIX] Riepilogo finale IVA:');
                Object.entries(riepilogoIVA).forEach(([iva, count]) => {
                    console.log(`  IVA ${iva}%: ${count} articoli`);
                });
            }
            
            return result;
        };
        
        console.log('✅ [IVA PATTERN FIX] Override applicato');
    }
    
})();