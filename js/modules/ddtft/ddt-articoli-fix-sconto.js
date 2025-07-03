/**
 * Fix specifico per gestire articoli DDT con sconto indicato da asterisco (*)
 * Esempio: DL000301 TORCETTI "GOLOSI" SACCHETTO 400 G PZ 80 * 2,3000 184,00 10 10
 */

(function() {
    'use strict';
    
    console.log('💰 Applicando fix articoli DDT con sconto...');
    
    // Override del parser completo DDT
    if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.parseDocumentFromText) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            // Se non è un DDT, usa il parser originale
            if (!fileName || (!fileName.toUpperCase().includes('DDV') && !fileName.toUpperCase().includes('DDT'))) {
                return originalParse.call(this, text, fileName);
            }
            
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                console.log('[DDT SCONTO FIX] Correzione articoli con sconto...');
                
                const lines = text.split('\n');
                const newItems = [];
                
                // Trova dove iniziano gli articoli
                let startIndex = -1;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].match(/^(060041|070017|090009|200016|DL000|PS000|RF000|VS000|GF000|PIRR|PF000|SG000)/)) {
                        startIndex = i;
                        break;
                    }
                }
                
                if (startIndex >= 0) {
                    console.log(`[DDT SCONTO FIX] Articoli iniziano alla riga ${startIndex}`);
                    
                    // Set per evitare duplicati
                    const processedCodes = new Set();
                    
                    for (let i = startIndex; i < lines.length; i++) {
                        const line = lines[i].trim();
                        
                        if (!line || line.includes('Totale') || line.includes('TOTALE') || 
                            line.includes('BANCALI') || line.includes('RIFERIMENTO') || 
                            line.includes('PRODOTTO NON DISPONIBILE')) {
                            continue;
                        }
                        
                        // Prima controlla se la riga contiene un asterisco (indica sconto)
                        if (line.includes(' * ')) {
                            console.log(`[DDT SCONTO FIX] Trovata riga con sconto: "${line}"`);
                            
                            // Estrai i campi manualmente per gestire le virgolette
                            const codeMatch = line.match(/^(\w{6,})\s+/);
                            if (codeMatch) {
                                const code = codeMatch[1];
                                
                                // Trova l'unità di misura
                                const units = ['PZ', 'KG', 'LT', 'CF', 'CT', 'BT', 'SC', 'GR'];
                                let umMatch = null;
                                let umPos = -1;
                                
                                for (const unit of units) {
                                    const regex = new RegExp(`\\s(${unit})\\s`);
                                    const match = line.match(regex);
                                    if (match) {
                                        umMatch = unit;
                                        umPos = match.index;
                                        break;
                                    }
                                }
                                
                                if (umMatch && umPos > 0) {
                                    // Estrai la descrizione (tutto tra codice e UM)
                                    const description = line.substring(code.length, umPos).trim();
                                    
                                    // Estrai i valori dopo l'UM
                                    const afterUM = line.substring(umPos + umMatch.length + 1).trim();
                                    const parts = afterUM.split(/\s+/);
                                    
                                    if (parts.length >= 6 && parts[1] === '*') {
                                        const quantity = parseFloat(parts[0].replace(',', '.'));
                                        const discountValue = parseFloat(parts[2].replace(',', '.'));
                                        const listTotal = parseFloat(parts[3].replace(/\./g, '').replace(',', '.'));
                                        const vat = parts[4];
                                        const sm = parts[5] || '00';
                                        
                                        // Pulisci la descrizione
                                        let cleanDesc = description.replace(/\s+\d+\s*(G|GR|KG|L|ML)$/i, '').trim();
                                        
                                        // Quando c'è l'asterisco, il prezzo unitario è il valore indicato dopo l'asterisco
                                        // e il totale finale è 0 (sconto merce 100%)
                                        const unitPrice = discountValue;
                                        const totalAmount = 0; // Sconto merce = totale 0
                                        
                                        const item = {
                                            code: code,
                                            description: cleanDesc,
                                            unit: umMatch,
                                            quantity: quantity,
                                            price: unitPrice,
                                            discount: 100, // Sconto merce 100%
                                            total: totalAmount,
                                            vat: vat,
                                            iva: vat,
                                            vatRate: parseInt(vat),
                                            sm: sm,
                                            isOmaggio: true // Flag per indicare che è omaggio
                                        };
                                        
                                        newItems.push(item);
                                        console.log(`[DDT SCONTO FIX] ${code}: Q=${quantity} x P=${unitPrice.toFixed(4)} - OMAGGIO (Sconto 100%) = T=${totalAmount} (IVA ${vat}%)`);
                                        continue;
                                    }
                                }
                            }
                        }
                        
                        
                        // Pattern standard senza sconto
                        const patternStandard = /^(\w{6,})\s+(.+?)\s+(PZ|KG|LT|CF|CT|BT|SC|GR)\s+(\d+(?:,\d+)?)\s+([\d,]+)\s+([\d\.,]+)\s+(\d{2})\s+(\d{2})$/;
                        const matchStandard = line.match(patternStandard);
                        
                        if (matchStandard) {
                            const [_, code, desc, unit, qty, price, total, vat, sm] = matchStandard;
                            
                            let description = desc.trim();
                            description = description.replace(/\s+\d+\s*(G|GR|KG|L|ML)$/i, '');
                            
                            const quantity = parseFloat(qty.replace(',', '.'));
                            const unitPrice = parseFloat(price.replace(',', '.'));
                            const totalAmount = parseFloat(total.replace(/\./g, '').replace(',', '.'));
                            
                            const item = {
                                code: code,
                                description: description,
                                unit: unit,
                                quantity: quantity,
                                price: unitPrice,
                                total: totalAmount,
                                vat: vat,
                                iva: vat,
                                vatRate: parseInt(vat),
                                sm: sm || '00'
                            };
                            
                            // Aggiungi solo se non è già stato processato
                            if (!processedCodes.has(code)) {
                                newItems.push(item);
                                processedCodes.add(code);
                                console.log(`[DDT SCONTO FIX] ${code}: Q=${quantity} x P=${unitPrice} = T=${totalAmount} (IVA ${vat}%)`);
                            }
                        }
                    }
                    
                    if (newItems.length > 0) {
                        console.log(`[DDT SCONTO FIX] Estratti ${newItems.length} articoli`);
                        result.items = newItems;
                        
                        // Ricalcola i totali
                        let subtotal = 0;
                        let totalIVA = 0;
                        const ivaGroups = {};
                        
                        newItems.forEach(item => {
                            subtotal += item.total;
                            const ivaRate = item.vatRate / 100;
                            const ivaAmount = item.total * ivaRate;
                            totalIVA += ivaAmount;
                            
                            // Raggruppa per aliquota IVA
                            if (!ivaGroups[item.vatRate]) {
                                ivaGroups[item.vatRate] = { imponibile: 0, imposta: 0 };
                            }
                            ivaGroups[item.vatRate].imponibile += item.total;
                            ivaGroups[item.vatRate].imposta += ivaAmount;
                        });
                        
                        result.subtotal = subtotal;
                        result.vat = totalIVA;
                        result.iva = totalIVA;
                        result.ivaBreakdown = ivaGroups;
                        
                        console.log(`[DDT SCONTO FIX] Subtotale: €${subtotal.toFixed(2)}`);
                        console.log(`[DDT SCONTO FIX] IVA: €${totalIVA.toFixed(2)}`);
                        console.log(`[DDT SCONTO FIX] Totale: €${(subtotal + totalIVA).toFixed(2)}`);
                        console.log(`[DDT SCONTO FIX] Totale documento originale: €${result.total}`);
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [DDT SCONTO FIX] Override applicato');
    }
    
})();