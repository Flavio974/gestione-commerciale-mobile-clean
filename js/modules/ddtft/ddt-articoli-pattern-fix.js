/**
 * Fix specifico per il pattern di estrazione articoli DDT
 * Corregge l'ordine delle colonne nel parsing
 */

(function() {
    'use strict';
    
    console.log('📦 Applicando fix pattern articoli DDT...');
    
    // Override del parser completo DDT
    if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.parseDocumentFromText) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            // Se non è un DDT, usa il parser originale
            if (!fileName || (!fileName.toUpperCase().includes('DDV') && !fileName.toUpperCase().includes('DDT'))) {
                return originalParse.call(this, text, fileName);
            }
            
            const result = originalParse.call(this, text, fileName);
            
            // Se abbiamo già gli articoli, riparsiamoli con il pattern corretto
            if (result && result.items && result.items.length > 0) {
                console.log('[DDT PATTERN FIX] Riparsing articoli con pattern corretto...');
                
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
                    console.log(`[DDT PATTERN FIX] Articoli iniziano alla riga ${startIndex}`);
                    
                    // Pattern corretto per DDT Alfieri
                    // Formato: CODICE DESCRIZIONE UM QTÀ PREZZO IMPORTO IVA SM
                    // Esempio reale: "060041 AGNOLOTTI BRASATO CARNE LC 250 G PZ 162 14,2600 2.310,12 26 00"
                    const itemPattern = /^(\w{6,})\s+(.+?)\s+(PZ|KG|LT|CF|CT|BT|SC|GR)\s+(\d+(?:,\d+)?)\s+([\d,]+(?:\.\d+)?)\s+([\d\.,]+)\s+(\d{2})\s+(\d{2})?$/;
                    
                    for (let i = startIndex; i < lines.length; i++) {
                        const line = lines[i].trim();
                        
                        // Salta righe vuote o di intestazione
                        if (!line || line.includes('Totale') || line.includes('TOTALE')) {
                            continue;
                        }
                        
                        // Prima prova il pattern completo
                        let match = line.match(itemPattern);
                        
                        // Se non funziona, prova un pattern più flessibile
                        if (!match) {
                            // Pattern che gestisce meglio la descrizione con spazi
                            const flexPattern = /^(\w{6,})\s+(.+?)\s+(PZ|KG|LT|CF|CT|BT|SC|GR)\s+(\d+(?:,\d+)?)\s+([\d,]+(?:\.\d+)?)\s+([\d\.,]+)\s+(\d{2})/;
                            match = line.match(flexPattern);
                        }
                        
                        if (match) {
                            const code = match[1];
                            const description = match[2].trim();
                            const unit = match[3];
                            const quantity = parseFloat(match[4].replace(',', '.'));
                            const price = parseFloat(match[5].replace(',', '.'));
                            const totalStr = match[6].replace(/\./g, '').replace(',', '.');
                            const total = parseFloat(totalStr);
                            const vat = match[7];
                            
                            // Verifica che il totale sia corretto
                            const calculatedTotal = Math.round(quantity * price * 100) / 100;
                            const difference = Math.abs(calculatedTotal - total);
                            
                            if (difference > 0.05) {
                                console.log(`[DDT PATTERN FIX] Attenzione: totale calcolato (${calculatedTotal}) diverso da totale estratto (${total})`);
                            }
                            
                            const item = {
                                code: code,
                                description: description,
                                unit: unit,
                                quantity: quantity,
                                price: price,
                                total: total,
                                vat: vat,
                                iva: vat,
                                vatRate: parseInt(vat),
                                sm: match[8] || '00'
                            };
                            
                            newItems.push(item);
                            console.log(`[DDT PATTERN FIX] Articolo estratto: ${code} - ${description} (${quantity} x ${price} = ${total})`);
                        } else {
                            // Se la riga sembra un articolo ma non matcha, loggala
                            if (line.match(/^[A-Z0-9]{6,}/)) {
                                console.log(`[DDT PATTERN FIX] Riga non parsata: "${line}"`);
                            }
                        }
                    }
                    
                    if (newItems.length > 0) {
                        console.log(`[DDT PATTERN FIX] Estratti ${newItems.length} articoli con il nuovo pattern`);
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
                        
                        console.log(`[DDT PATTERN FIX] Totali ricalcolati - Subtotale: €${subtotal.toFixed(2)}, IVA: €${totalIVA.toFixed(2)}`);
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [DDT PATTERN FIX] Override applicato');
    }
    
})();