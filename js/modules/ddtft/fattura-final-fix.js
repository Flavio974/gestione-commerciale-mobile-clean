/**
 * Fix finale per fatture - corregge nome cliente e totali
 * Deve essere caricato per ultimo
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix finale fatture...');
    
    // Funzione helper per pulire i numeri
    function cleanNumber(str) {
        if (!str) return 0;
        // Rimuove tutto tranne numeri, virgole e punti
        let cleaned = str.toString().replace(/[^\d.,]/g, '');
        // Gestisce formato italiano (1.234,56)
        if (cleaned.includes(',')) {
            // Se c'è una virgola, assumiamo formato italiano
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        }
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }
    
    // Override finale del document parser
    function applyFinalFix() {
        if (!window.DDTFTDocumentParser) {
            console.error('[FINAL FIX] DDTFTDocumentParser non trovato!');
            return;
        }
        
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[FINAL FIX] Intercettato parseDocumentFromText');
            
            // Chiama il metodo originale (con tutti i fix precedenti)
            const result = originalParse.call(this, text, fileName);
            
            // Se è una fattura, applica correzioni finali
            if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                console.log('[FINAL FIX] Applicando correzioni finali alla fattura...');
                console.log('[FINAL FIX] Totale attuale:', result.total || result.totale || 0);
                
                // FIX 1: Estrai i totali dalla fine del documento
                if (!result.total || result.total === 0 || result.total < 20) {
                    console.log('[FINAL FIX] Cerco totali nella sezione finale...');
                    
                    // Cerca pattern "ALLA CONSEGNA" seguito da numeri
                    const consegnaMatch = text.match(/ALLA\s+CONSEGNA\s*[\r\n]+\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
                    if (consegnaMatch) {
                        const total = cleanNumber(consegnaMatch[2]);
                        console.log(`[FINAL FIX] Totale trovato dopo ALLA CONSEGNA: €${total}`);
                        result.total = total;
                        result.totale = total;
                    } else {
                        // Cerca gli ultimi due numeri nel formato xx,xx
                        const endSection = text.substring(text.length - 200);
                        const numbers = endSection.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g);
                        if (numbers && numbers.length >= 2) {
                            // L'ultimo numero è spesso il totale
                            const lastNumber = numbers[numbers.length - 1];
                            const total = cleanNumber(lastNumber);
                            if (total > 10) {
                                console.log(`[FINAL FIX] Totale trovato come ultimo numero: €${total}`);
                                result.total = total;
                                result.totale = total;
                            }
                        }
                    }
                }
                
                // FIX 2: Estrai imponibile e IVA dalle aliquote
                if (!result.subtotal || result.subtotal === 0) {
                    console.log('[FINAL FIX] Cerco imponibile e IVA...');
                    
                    // Pattern: "04 4% - GENERICO 40,26 1,61"
                    const ivaMatches = text.matchAll(/(\d{2})\s+(\d+)%[^0-9]+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/g);
                    let totalImponibile = 0;
                    let totalIva = 0;
                    
                    for (const match of ivaMatches) {
                        const imponibile = cleanNumber(match[3]);
                        const iva = cleanNumber(match[4]);
                        totalImponibile += imponibile;
                        totalIva += iva;
                        console.log(`[FINAL FIX] Aliquota ${match[2]}%: imponibile €${imponibile}, IVA €${iva}`);
                    }
                    
                    if (totalImponibile > 0) {
                        result.subtotal = totalImponibile;
                        result.imponibile = totalImponibile;
                        result.vat = totalIva;
                        result.iva = totalIva;
                        
                        // Se non abbiamo il totale, calcoliamolo
                        if (!result.total || result.total === 0) {
                            result.total = totalImponibile + totalIva;
                            result.totale = result.total;
                            console.log(`[FINAL FIX] Totale calcolato: €${result.total}`);
                        }
                    }
                }
                
                // FIX 3: Assicurati che il nome cliente sia corretto
                if (result.clientName === 'Luogo di consegna' || !result.clientName || result.clientName.length < 3) {
                    // Usa il cliente mappato se disponibile
                    if (result.cliente && result.cliente !== 'Luogo di consegna') {
                        result.clientName = result.cliente;
                        console.log(`[FINAL FIX] Nome cliente sincronizzato: ${result.clientName}`);
                    } else if (result.clientCode) {
                        // Se abbiamo solo il codice, usa quello
                        result.clientName = `Cliente ${result.clientCode}`;
                        result.cliente = result.clientName;
                        console.log(`[FINAL FIX] Nome cliente dal codice: ${result.clientName}`);
                    }
                }
                
                // FIX 4: Calcola totali articoli se mancanti
                if (result.items && result.items.length > 0) {
                    let itemsTotal = 0;
                    result.items.forEach((item, index) => {
                        // Converti stringhe in numeri
                        if (typeof item.quantity === 'string') {
                            item.quantity = cleanNumber(item.quantity);
                        }
                        if (typeof item.price === 'string') {
                            item.price = cleanNumber(item.price);
                        }
                        
                        // Calcola totale articolo
                        if (!item.total && item.quantity && item.price) {
                            item.total = item.quantity * item.price;
                            console.log(`[FINAL FIX] Totale articolo ${index + 1}: €${item.total.toFixed(2)}`);
                        }
                        
                        if (item.total) {
                            itemsTotal += item.total;
                        }
                    });
                    
                    // Se non abbiamo trovato totali nel documento, usa la somma degli articoli
                    if ((!result.total || result.total === 0) && itemsTotal > 0) {
                        const estimatedVat = itemsTotal * 0.22;
                        result.subtotal = itemsTotal;
                        result.imponibile = itemsTotal;
                        result.vat = estimatedVat;
                        result.iva = estimatedVat;
                        result.total = itemsTotal + estimatedVat;
                        result.totale = result.total;
                        console.log(`[FINAL FIX] Totali stimati da articoli: Imponibile €${itemsTotal.toFixed(2)}, IVA €${estimatedVat.toFixed(2)}, Totale €${result.total.toFixed(2)}`);
                    }
                }
                
                console.log('[FINAL FIX] Risultato finale:', {
                    cliente: result.clientName,
                    numero: result.documentNumber,
                    data: result.date,
                    totale: result.total || result.totale,
                    imponibile: result.subtotal || result.imponibile,
                    iva: result.vat || result.iva,
                    items: result.items ? result.items.length : 0
                });
            }
            
            return result;
        };
        
        console.log('✅ [FINAL FIX] Override finale applicato');
    }
    
    // Aspetta che tutti gli altri fix siano stati applicati
    setTimeout(applyFinalFix, 500);
    
})();