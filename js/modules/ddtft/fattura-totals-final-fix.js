/**
 * Fix FINALE per correggere i totali delle fatture
 * Assicura che subtotale + IVA = totale documento
 */

(function() {
    'use strict';
    
    console.log('💰 [FATTURA TOTALS FINAL] Applicando fix finale totali fatture...');
    
    // Override del parser
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            // Solo per fatture
            if (result && (result.type === 'ft' || result.type === 'fattura' || result.documentType === 'FT')) {
                console.log('💰 [FATTURA TOTALS FINAL] Correzione totali fattura...');
                
                // Log dei totali attuali
                console.log(`💰 [FATTURA TOTALS FINAL] Totali attuali:`);
                console.log(`  - Subtotale: €${result.subtotal || 0}`);
                console.log(`  - IVA: €${result.vat || result.iva || 0}`);
                console.log(`  - Totale: €${result.total || 0}`);
                
                // Calcola il totale corretto
                const subtotal = parseFloat(result.subtotal) || 0;
                const iva = parseFloat(result.vat || result.iva) || 0;
                const totalCalcolato = subtotal + iva;
                
                // Se il totale attuale è diverso da subtotale + IVA, correggilo
                if (Math.abs(parseFloat(result.total || 0) - totalCalcolato) > 0.01) {
                    console.log(`💰 [FATTURA TOTALS FINAL] Correzione totale: €${result.total} -> €${totalCalcolato.toFixed(2)}`);
                    result.total = totalCalcolato;
                    result.totale = totalCalcolato;
                }
                
                // SEMPRE cerca nel testo i totali reali per sovrascrivere quelli calcolati
                const lines = text.split('\n');
                let foundTotals = false;
                
                // Cerca pattern tipici dei totali fattura - dal fondo del documento
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i];
                    
                    // Pattern per totale documento (es: "201,62 201,62")
                    const totalMatch = line.match(/(\d{1,3}(?:\.\d{3})*,\d{2})\s+\1/);
                    if (totalMatch) {
                        const totalValue = parseFloat(totalMatch[1].replace(/\./g, '').replace(',', '.'));
                        
                        // Verifica che sia un totale plausibile (maggiore del subtotale)
                        if (totalValue >= subtotal && totalValue < subtotal * 2) {
                            console.log(`💰 [FATTURA TOTALS FINAL] Trovato totale documento REALE: €${totalValue}`);
                            
                            // Imposta il totale REALE trovato nel documento
                            result.total = totalValue;
                            result.totale = totalValue;
                            
                            // L'IVA è la differenza tra totale e subtotale
                            const realIva = totalValue - subtotal;
                            if (realIva > 0 && Math.abs(realIva - iva) > 0.01) {
                                console.log(`💰 [FATTURA TOTALS FINAL] IVA ricalcolata da totale reale: €${iva} -> €${realIva.toFixed(2)}`);
                                result.vat = realIva;
                                result.iva = realIva;
                            }
                            
                            foundTotals = true;
                            break;
                        }
                    }
                }
                
                // Cerca anche pattern per subtotale e IVA separati
                if (!foundTotals) {
                    let foundSubtotal = 0;
                    let foundIva = 0;
                    
                    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 30); i--) {
                        const line = lines[i];
                        
                        // Pattern per riga con aliquota IVA (es: "04 4% - GENERICO 57,30 2,29")
                        const ivaMatch = line.match(/^\d{2}\s+\d+%.*?\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/);
                        if (ivaMatch) {
                            const imponibile = parseFloat(ivaMatch[1].replace(/\./g, '').replace(',', '.'));
                            const imposta = parseFloat(ivaMatch[2].replace(/\./g, '').replace(',', '.'));
                            foundSubtotal += imponibile;
                            foundIva += imposta;
                            console.log(`💰 [FATTURA TOTALS FINAL] Trovata aliquota IVA: imponibile €${imponibile}, imposta €${imposta}`);
                        }
                        
                        // Pattern per totali riepilogativi (es: "186,42 186,42")
                        if (line.match(/^\d{1,3}(?:\.\d{3})*,\d{2}\s+\d{1,3}(?:\.\d{3})*,\d{2}$/)) {
                            const numbers = line.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g);
                            if (numbers && numbers.length >= 2) {
                                const value = parseFloat(numbers[0].replace(/\./g, '').replace(',', '.'));
                                
                                // Se è vicino al subtotale calcolato dagli articoli
                                if (Math.abs(value - subtotal) < 10) {
                                    foundSubtotal = value;
                                    console.log(`💰 [FATTURA TOTALS FINAL] Possibile subtotale trovato: €${value}`);
                                }
                            }
                        }
                    }
                    
                    if (foundSubtotal > 0 && foundIva > 0) {
                        console.log(`💰 [FATTURA TOTALS FINAL] Totali estratti dal testo:`);
                        console.log(`  - Subtotale: €${foundSubtotal}`);
                        console.log(`  - IVA: €${foundIva}`);
                        console.log(`  - Totale: €${(foundSubtotal + foundIva).toFixed(2)}`);
                        
                        result.subtotal = foundSubtotal;
                        result.vat = foundIva;
                        result.iva = foundIva;
                        result.total = foundSubtotal + foundIva;
                        result.totale = foundSubtotal + foundIva;
                    }
                }
                
                // Log finale
                console.log(`💰 [FATTURA TOTALS FINAL] Totali finali:`);
                console.log(`  - Subtotale: €${result.subtotal || 0}`);
                console.log(`  - IVA: €${result.vat || result.iva || 0}`);
                console.log(`  - Totale: €${result.total || 0}`);
            }
            
            return result;
        };
        
        console.log('✅ [FATTURA TOTALS FINAL] Override applicato');
    }
    
})();