/**
 * Fix per correggere l'estrazione delle aliquote IVA
 * Corregge il problema dove IVA viene estratta come "000" invece del valore corretto
 */

(function() {
    'use strict';
    
    console.log('💰 Applicando fix aliquote IVA...');
    
    // Funzione helper per pulire e validare aliquote IVA
    function cleanIVA(ivaStr) {
        if (!ivaStr) return '';
        
        // Rimuovi caratteri non numerici
        let cleaned = ivaStr.toString().replace(/[^\d]/g, '');
        
        // Se è "000" o "00", potrebbe essere un errore
        if (cleaned === '000' || cleaned === '00') {
            return '';
        }
        
        // Se è un numero singolo, aggiungi lo zero davanti (es: 4 -> 04)
        if (cleaned.length === 1) {
            cleaned = '0' + cleaned;
        }
        
        return cleaned;
    }
    
    // Override del parsing per correggere le aliquote IVA
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[IVA FIX] Intercettato parseDocumentFromText');
            
            // Chiama il metodo originale
            const result = originalParse.call(this, text, fileName);
            
            // Se è una fattura e ci sono articoli
            if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                console.log('[IVA FIX] Analizzando aliquote IVA nella fattura...');
                
                // Correggi IVA negli articoli
                if (result.items && result.items.length > 0) {
                    // Prima cerca le aliquote IVA nel testo originale
                    const ivaMap = new Map();
                    
                    // Pattern per trovare aliquote IVA nel testo
                    // Es: "Aliquota 4%" o "IVA 4" o "10 000" (dove 10 è l'IVA)
                    const ivaPatterns = [
                        /Aliquota\s+(\d+)%/gi,
                        /IVA\s+(\d+)%/gi,
                        /\b(\d{1,2})\s+\d{3}\b/g, // Pattern per "10 000" dove 10 è l'IVA
                        /\s+(\d{2})\s*$/gm // Due cifre alla fine della riga
                    ];
                    
                    // Cerca le aliquote nel testo
                    for (const pattern of ivaPatterns) {
                        const matches = [...text.matchAll(pattern)];
                        for (const match of matches) {
                            const iva = match[1];
                            if (iva && iva !== '000' && parseInt(iva) <= 22) { // IVA max 22% in Italia
                                ivaMap.set(iva.padStart(2, '0'), true);
                                console.log(`[IVA FIX] Trovata aliquota IVA nel testo: ${iva}%`);
                            }
                        }
                    }
                    
                    // Cerca specificamente nel contesto degli articoli
                    result.items = result.items.map((item, index) => {
                        const currentIVA = item.vatCode || item.iva || item.aliquotaIVA;
                        
                        console.log(`[IVA FIX] Articolo ${index + 1} - IVA attuale: ${currentIVA}`);
                        
                        // Se l'IVA è "000" o invalida, cerca di correggerla
                        if (!currentIVA || currentIVA === '000' || currentIVA === '00') {
                            // Cerca l'articolo nel testo originale
                            if (item.code) {
                                // Cerca la riga dell'articolo
                                const codePattern = new RegExp(`${item.code}[^\\n]+`, 'i');
                                const lineMatch = text.match(codePattern);
                                
                                if (lineMatch) {
                                    const line = lineMatch[0];
                                    console.log(`[IVA FIX] Riga articolo trovata: ${line}`);
                                    
                                    // Cerca l'IVA alla fine della riga (es: "21,01 10" dove 10 è l'IVA)
                                    const ivaEndMatch = line.match(/\s+(\d{1,2})\s*$/);
                                    if (ivaEndMatch) {
                                        const newIVA = ivaEndMatch[1].padStart(2, '0');
                                        if (parseInt(newIVA) <= 22) {
                                            item.vatCode = newIVA;
                                            item.iva = newIVA;
                                            item.aliquotaIVA = newIVA;
                                            console.log(`✅ [IVA FIX] IVA corretta per ${item.code}: ${newIVA}%`);
                                        }
                                    }
                                    
                                    // Pattern alternativo: cerca dopo il totale
                                    const totalAndIvaMatch = line.match(/(\d+[,.]?\d*)\s+(\d{1,2})\s*$/);
                                    if (totalAndIvaMatch && !item.vatCode) {
                                        const newIVA = totalAndIvaMatch[2].padStart(2, '0');
                                        if (parseInt(newIVA) <= 22) {
                                            item.vatCode = newIVA;
                                            item.iva = newIVA;
                                            item.aliquotaIVA = newIVA;
                                            console.log(`✅ [IVA FIX] IVA corretta (pattern 2) per ${item.code}: ${newIVA}%`);
                                        }
                                    }
                                }
                            }
                            
                            // Se ancora non abbiamo trovato l'IVA, usa l'aliquota più comune
                            if (!item.vatCode || item.vatCode === '000') {
                                // Se abbiamo trovato aliquote nel documento, usa la prima
                                if (ivaMap.size > 0) {
                                    const defaultIVA = [...ivaMap.keys()][0];
                                    item.vatCode = defaultIVA;
                                    item.iva = defaultIVA;
                                    item.aliquotaIVA = defaultIVA;
                                    console.log(`⚠️ [IVA FIX] IVA impostata a default ${defaultIVA}% per ${item.code}`);
                                }
                            }
                        } else {
                            // Pulisci l'IVA esistente
                            const cleanedIVA = cleanIVA(currentIVA);
                            if (cleanedIVA && cleanedIVA !== currentIVA) {
                                item.vatCode = cleanedIVA;
                                item.iva = cleanedIVA;
                                item.aliquotaIVA = cleanedIVA;
                                console.log(`[IVA FIX] IVA pulita per ${item.code}: ${currentIVA} -> ${cleanedIVA}`);
                            }
                        }
                        
                        return item;
                    });
                }
                
                // Correggi anche le aliquote IVA nel riepilogo
                if (result.vatRates) {
                    console.log('[IVA FIX] Correggendo riepilogo aliquote IVA...');
                    
                    result.vatRates = result.vatRates.map(rate => {
                        if (rate.rate === '000' || rate.rate === '00') {
                            // Cerca l'aliquota corretta nel testo
                            const rateMatch = text.match(new RegExp(`Totale\\s+Iva\\s+(\\d+)%`, 'i'));
                            if (rateMatch) {
                                rate.rate = rateMatch[1].padStart(2, '0');
                                console.log(`✅ [IVA FIX] Aliquota IVA corretta nel riepilogo: ${rate.rate}%`);
                            }
                        }
                        return rate;
                    });
                }
            }
            
            return result;
        };
        
        console.log('✅ [IVA FIX] Override parseDocumentFromText applicato');
    }
    
})();