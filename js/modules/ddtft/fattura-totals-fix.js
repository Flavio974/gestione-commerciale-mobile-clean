/**
 * Fix per l'estrazione corretta dei totali nelle fatture
 * Risolve il problema dei totali che vengono mostrati come €0.00
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix totali fatture...');
    
    // Funzione helper per pulire i numeri
    function cleanNumber(str) {
        if (!str) return 0;
        // Rimuove tutto tranne numeri, virgole e punti
        let cleaned = str.toString().replace(/[^\d.,]/g, '');
        // Gestisce formato italiano (1.234,56) e internazionale (1,234.56)
        if (cleaned.includes(',') && cleaned.includes('.')) {
            // Se c'è sia virgola che punto, determina quale è il separatore decimale
            const lastComma = cleaned.lastIndexOf(',');
            const lastDot = cleaned.lastIndexOf('.');
            if (lastComma > lastDot) {
                // Formato italiano: punto per migliaia, virgola per decimali
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else {
                // Formato internazionale: virgola per migliaia, punto per decimali
                cleaned = cleaned.replace(/,/g, '');
            }
        } else if (cleaned.includes(',')) {
            // Solo virgola: probabilmente decimale in formato italiano
            cleaned = cleaned.replace(',', '.');
        }
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }
    
    // Override per FatturaExtractor
    function applyTotalsFix(ExtractorClass, className) {
        if (!ExtractorClass || !ExtractorClass.prototype) return;
        
        const originalExtract = ExtractorClass.prototype.extract;
        
        ExtractorClass.prototype.extract = function() {
            console.log(`🎯 [TOTALS FIX] Intercettato extract su ${className}`);
            
            // Chiama il metodo originale
            const result = originalExtract.call(this);
            
            // Se i totali sono 0 o mancanti, cerca di estrarli
            if (!result.totale || result.totale === 0) {
                console.log('[TOTALS FIX] Totali mancanti o zero, cerco nel testo...');
                console.log('[TOTALS FIX] Lunghezza testo totale:', this.text.length);
                
                // Cerca nella parte finale del documento (ultimi 2000 caratteri)
                const endText = this.text.substring(Math.max(0, this.text.length - 2000));
                console.log('[TOTALS FIX] Ultimi 500 caratteri del testo:', endText.substring(endText.length - 500));
                
                // Pattern per trovare i totali
                const totalPatterns = [
                    // Pattern specifici per fatture italiane
                    /TOTALE\s+FATTURA\s*:?\s*€?\s*([\d.,]+)/i,
                    /TOTALE\s+DOCUMENTO\s*:?\s*€?\s*([\d.,]+)/i,
                    /TOTALE\s+GENERALE\s*:?\s*€?\s*([\d.,]+)/i,
                    /IMPORTO\s+TOTALE\s*:?\s*€?\s*([\d.,]+)/i,
                    /TOTALE\s+IMPONIBILE\s+IVA\s+TOTALE\s*[\d.,]+\s+[\d.,]+\s+([\d.,]+)/i,
                    // Pattern per totale con IVA
                    /TOTALE\s+(?:CON\s+)?IVA\s*:?\s*€?\s*([\d.,]+)/i,
                    // Pattern per totale finale
                    /TOTALE\s+(?:FINALE|DA\s+PAGARE)\s*:?\s*€?\s*([\d.,]+)/i,
                    // Pattern con EUR invece di €
                    /TOTALE.*?EUR\s*([\d.,]+)/i,
                    // Pattern per totali in tabelle
                    /TOTALE[\s\S]{0,50}?([\d.,]+)\s*€/i,
                    // Pattern generico (deve essere in fondo)
                    /TOTALE\s*:?\s*€?\s*([\d.,]+)(?:\s|$)/i
                ];
                
                let foundTotal = 0;
                let foundImponibile = 0;
                let foundIva = 0;
                
                // Cerca anche imponibile e IVA separatamente
                const imponibileMatch = endText.match(/(?:TOTALE\s+)?IMPONIBILE\s*:?\s*([\d.,]+)/i);
                if (imponibileMatch) {
                    foundImponibile = cleanNumber(imponibileMatch[1]);
                    console.log(`[TOTALS FIX] Imponibile trovato: €${foundImponibile}`);
                }
                
                const ivaMatch = endText.match(/(?:TOTALE\s+)?IVA\s*:?\s*([\d.,]+)/i);
                if (ivaMatch) {
                    foundIva = cleanNumber(ivaMatch[1]);
                    console.log(`[TOTALS FIX] IVA trovata: €${foundIva}`);
                }
                
                // Prova tutti i pattern per il totale
                for (const pattern of totalPatterns) {
                    const matches = endText.match(new RegExp(pattern, 'gi'));
                    if (matches) {
                        // Prendi l'ultimo match (solitamente il totale finale)
                        const lastMatch = matches[matches.length - 1];
                        const valueMatch = lastMatch.match(pattern);
                        if (valueMatch && valueMatch[1]) {
                            const total = cleanNumber(valueMatch[1]);
                            if (total > foundTotal) {
                                foundTotal = total;
                                console.log(`[TOTALS FIX] Pattern "${pattern}" ha trovato: €${total}`);
                            }
                        }
                    }
                }
                
                // Se non abbiamo trovato il totale ma abbiamo imponibile e IVA, calcoliamolo
                if (foundTotal === 0 && foundImponibile > 0) {
                    foundTotal = foundImponibile + foundIva;
                    console.log(`[TOTALS FIX] Totale calcolato da imponibile + IVA: €${foundTotal}`);
                }
                
                // Se ancora non abbiamo trovato nulla, cerca in tutto il documento
                if (foundTotal === 0) {
                    console.log('[TOTALS FIX] Cerco totali in tutto il documento...');
                    
                    for (const pattern of totalPatterns) {
                        const match = this.text.match(pattern);
                        if (match && match[1]) {
                            const total = cleanNumber(match[1]);
                            if (total > 0) {
                                foundTotal = total;
                                console.log(`[TOTALS FIX] Totale trovato nel documento completo: €${total}`);
                                break;
                            }
                        }
                    }
                }
                
                // Aggiorna i risultati
                if (foundTotal > 0) {
                    result.totale = foundTotal;
                    result.total = foundTotal;
                    console.log(`✅ [TOTALS FIX] Totale fattura: €${foundTotal}`);
                }
                
                if (foundImponibile > 0) {
                    result.imponibile = foundImponibile;
                    result.subtotal = foundImponibile;
                }
                
                if (foundIva > 0) {
                    result.iva = foundIva;
                    result.vat = foundIva;
                }
            }
            
            // Verifica anche i totali degli articoli
            if (result.articoli && result.articoli.length > 0) {
                let calcolatedTotal = 0;
                let hasValidPrices = false;
                
                result.articoli.forEach((articolo, index) => {
                    // Pulisci il prezzo se è una stringa
                    if (typeof articolo.prezzo === 'string') {
                        articolo.prezzo = cleanNumber(articolo.prezzo);
                    }
                    if (typeof articolo.quantita === 'string') {
                        articolo.quantita = cleanNumber(articolo.quantita);
                    }
                    
                    if (!articolo.importo || articolo.importo === 0) {
                        // Cerca di calcolare l'importo da quantità e prezzo
                        if (articolo.quantita && articolo.prezzo) {
                            articolo.importo = articolo.quantita * articolo.prezzo;
                            console.log(`[TOTALS FIX] Calcolato importo articolo ${index + 1}: €${articolo.importo.toFixed(2)}`);
                            hasValidPrices = true;
                        }
                    }
                    if (articolo.importo) {
                        calcolatedTotal += articolo.importo;
                        hasValidPrices = true;
                    }
                });
                
                // Se non abbiamo trovato totali nel documento ma abbiamo calcolato dai prezzi
                if ((!result.totale || result.totale === 0) && calcolatedTotal > 0 && hasValidPrices) {
                    // Stima IVA al 22% se non trovata
                    const estimatedSubtotal = calcolatedTotal;
                    const estimatedVat = estimatedSubtotal * 0.22;
                    const estimatedTotal = estimatedSubtotal + estimatedVat;
                    
                    result.imponibile = estimatedSubtotal;
                    result.subtotal = estimatedSubtotal;
                    result.iva = estimatedVat;
                    result.vat = estimatedVat;
                    result.totale = estimatedTotal;
                    result.total = estimatedTotal;
                    
                    console.log(`[TOTALS FIX] Totali stimati da articoli: Imponibile €${estimatedSubtotal.toFixed(2)}, IVA €${estimatedVat.toFixed(2)}, Totale €${estimatedTotal.toFixed(2)}`);
                } else if (calcolatedTotal > 0 && Math.abs(calcolatedTotal - result.totale) > 0.01) {
                    console.warn(`[TOTALS FIX] Differenza tra totale documento (€${result.totale}) e somma articoli (€${calcolatedTotal})`);
                }
            }
            
            // Verifica anche result.items oltre a result.articoli
            if (result.items && result.items.length > 0 && (!result.totale || result.totale === 0)) {
                let itemsTotal = 0;
                result.items.forEach((item) => {
                    if (item.total) {
                        itemsTotal += cleanNumber(item.total);
                    } else if (item.quantity && item.price) {
                        const qty = cleanNumber(item.quantity);
                        const price = cleanNumber(item.price);
                        itemsTotal += qty * price;
                    }
                });
                
                if (itemsTotal > 0) {
                    const estimatedVat = itemsTotal * 0.22;
                    result.subtotal = itemsTotal;
                    result.vat = estimatedVat;
                    result.total = itemsTotal + estimatedVat;
                    result.totale = result.total;
                    console.log(`[TOTALS FIX] Totali stimati da items: €${result.total.toFixed(2)}`);
                }
            }
            
            return result;
        };
        
        console.log(`✅ [TOTALS FIX] Override applicato a ${className}`);
    }
    
    // Applica il fix
    setTimeout(() => {
        applyTotalsFix(window.FatturaExtractor, 'FatturaExtractor');
        applyTotalsFix(window.FatturaExtractorModular, 'FatturaExtractorModular');
        
        console.log('✅ Fix totali fatture completato');
    }, 100);
    
})();