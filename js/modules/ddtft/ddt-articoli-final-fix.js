/**
 * Fix FINALE per correggere l'estrazione articoli DDT
 * Basato sull'analisi del formato reale dal debug
 */

(function() {
    'use strict';
    
    console.log('✅ Applicando fix FINALE articoli DDT...');
    
    // Override del parser DDT
    if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.parseDocumentFromText) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            // Solo per DDT
            if (result && (result.type === 'ddt' || result.documentType === 'DDT') && result.items) {
                console.log('[DDT FINAL FIX] Correzione articoli DDT con formato corretto...');
                
                const lines = text.split('\n');
                const newItems = [];
                
                // Trova dove iniziano gli articoli
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Pattern per articoli DDT Alfieri
                    // Formato: CODICE DESCRIZIONE UM QTÀ PREZZO SCONTO% IMPORTO IVA SM
                    if (line.match(/^[A-Z0-9]{6,}/)) {
                        // Analisi della riga articolo
                        const tokens = line.split(/\s+/);
                        
                        // Trova l'unità di misura
                        const units = ['PZ', 'KG', 'LT', 'CF', 'CT', 'BT', 'SC', 'GR'];
                        let umIndex = -1;
                        
                        for (let j = 2; j < tokens.length; j++) {
                            if (units.includes(tokens[j])) {
                                umIndex = j;
                                break;
                            }
                        }
                        
                        if (umIndex > 0 && tokens.length >= umIndex + 5) {
                            const code = tokens[0];
                            const description = tokens.slice(1, umIndex).join(' ');
                            const unit = tokens[umIndex];
                            const quantity = parseFloat((tokens[umIndex + 1] || '0').replace(',', '.'));
                            const price = parseFloat((tokens[umIndex + 2] || '0').replace(',', '.'));
                            const discount = parseFloat((tokens[umIndex + 3] || '0').replace(',', '.'));
                            
                            // L'importo totale è dopo lo sconto
                            let total = 0;
                            let vat = '10';
                            
                            // Cerca l'importo nel formato XXX,XX
                            for (let k = umIndex + 4; k < tokens.length; k++) {
                                if (tokens[k].match(/^\d+,\d{2}$/)) {
                                    total = parseFloat(tokens[k].replace(',', '.'));
                                    // IVA dovrebbe essere il prossimo token numerico
                                    if (k + 1 < tokens.length && tokens[k + 1].match(/^\d{2}$/)) {
                                        vat = tokens[k + 1];
                                    }
                                    break;
                                }
                            }
                            
                            // Se non troviamo il totale nel formato semplice, cerca con punti
                            if (total === 0) {
                                for (let k = umIndex + 4; k < tokens.length; k++) {
                                    if (tokens[k].match(/^\d{1,3}(?:\.\d{3})*,\d{2}$/)) {
                                        total = parseFloat(tokens[k].replace(/\./g, '').replace(',', '.'));
                                        if (k + 1 < tokens.length && tokens[k + 1].match(/^\d{2}$/)) {
                                            vat = tokens[k + 1];
                                        }
                                        break;
                                    }
                                }
                            }
                            
                            if (total > 0) {
                                const item = {
                                    code: code,
                                    description: description,
                                    unit: unit,
                                    quantity: quantity,
                                    price: price,
                                    discount: discount,
                                    discountPercentage: discount,
                                    sconto: discount,
                                    total: total,
                                    vat: vat,
                                    iva: vat,
                                    vatRate: parseInt(vat),
                                    sm: '00'
                                };
                                
                                // Calcola anche il prezzo netto (prezzo dopo lo sconto)
                                const netPrice = price * (1 - discount / 100);
                                item.netPrice = netPrice;
                                
                                newItems.push(item);
                                console.log(`[DDT FINAL FIX] ${code}: Q=${quantity} x P=${price} - Sconto=${discount}% = T=${total} (IVA ${vat}%)`);
                            }
                        }
                    }
                }
                
                if (newItems.length > 0) {
                    console.log(`[DDT FINAL FIX] Estratti ${newItems.length} articoli con il formato corretto`);
                    result.items = newItems;
                    
                    // Ricalcola i totali
                    let subtotal = 0;
                    let totalIVA = 0;
                    
                    newItems.forEach(item => {
                        subtotal += item.total;
                        const ivaRate = item.vatRate / 100;
                        totalIVA += item.total * ivaRate;
                    });
                    
                    result.subtotal = subtotal;
                    result.vat = totalIVA;
                    result.iva = totalIVA;
                    
                    console.log(`[DDT FINAL FIX] Subtotale: €${subtotal.toFixed(2)}`);
                    console.log(`[DDT FINAL FIX] IVA: €${totalIVA.toFixed(2)}`);
                    console.log(`[DDT FINAL FIX] Totale atteso: €${(subtotal + totalIVA).toFixed(2)}`);
                    console.log(`[DDT FINAL FIX] Totale documento: €${result.total || 0}`);
                }
            }
            
            return result;
        };
        
        console.log('✅ [DDT FINAL FIX] Override applicato con successo');
    }
    
})();