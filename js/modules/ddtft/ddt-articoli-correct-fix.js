/**
 * Fix PRIORITARIO e DEFINITIVO per il parsing degli articoli DDT
 * Gestisce due formati:
 * 1. CODICE DESCRIZIONE UM QTÀ PREZZO SCONTO% IMPORTO IVA% SM
 * 2. CODICE DESCRIZIONE UM QTÀ PREZZO IMPORTO IVA% SM
 */

(function() {
    'use strict';
    
    console.log('🚨 [DDT CORRECT FIX] Fix PRIORITARIO articoli DDT in caricamento...');
    
    // Funzione per fare override DEFINITIVO dopo tutti gli altri fix
    function applyFinalOverride() {
        if (window.DDTFTDocumentParser) {
            const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
            
            window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
                console.log('🚨 [DDT CORRECT FIX] INTERCETTATO parseDocumentFromText');
                
                // Prima chiamiamo l'originale per avere la struttura base
                const result = originalParse.call(this, text, fileName);
                
                // Solo per DDT
                if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                    console.log('🚨 [DDT CORRECT FIX] Override DEFINITIVO articoli DDT...');
                    console.log('[DDT CORRECT FIX] Articoli attuali:', result.items?.length || 0);
                    
                    const lines = text.split('\n');
                    const newItems = [];
                    
                    // NUOVA STRATEGIA: cerca direttamente gli articoli senza basarsi sull'header
                    console.log('[DDT CORRECT FIX] Ricerca diretta articoli nel documento...');
                    
                    let foundArticles = false;
                    let articleStartLine = -1;
                    let articleEndLine = -1;
                    
                    // Cerca il blocco di articoli
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        
                        // Cerca linee che iniziano con codici prodotto validi (060xxx, 090xxx, etc)
                        if (line.match(/^0[6789]\d{4}\s+\w+/)) {
                            if (!foundArticles) {
                                foundArticles = true;
                                articleStartLine = i;
                                console.log('[DDT CORRECT FIX] Primo articolo trovato alla riga', i, ':', line.substring(0, 50) + '...');
                            }
                            
                            // Analizza questa riga come articolo
                            console.log('[DDT CORRECT FIX] Analizzando riga articolo:', line);
                            
                            // Analizza meglio il formato cercando pattern specifici
                            // Pattern con sconto: ha un numero prima dell'importo totale che rappresenta lo sconto
                            // Es: 120 1,9000 15,00 193,80 10 00
                            //     ^qty ^price ^disc ^total ^vat ^sm
                            const hasDiscount = line.match(/\s+\d+(?:,\d+)?\s+\d+,\d{4}\s+\d+,\d{2}\s+\d+(?:\.\d{3})*,\d{2}\s+\d{2}\s+\d{2}$/);
                            
                            console.log(`[DDT CORRECT FIX] Formato rilevato per ${line.substring(0, 50)}... : ${hasDiscount ? 'CON sconto' : 'SENZA sconto'}`);
                            
                            let match = null;
                            
                            if (hasDiscount) {
                                // FORMATO 1: Con sconto
                                // Es: 060041 AGNOLOTTI BRASATO CARNE LC 250 G PZ 120 1,9000 15,00 193,80 10 00
                                // Pattern più specifico per evitare confusione
                                const pattern = /^(\d{6})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML|BT|SC)\s+(\d+(?:,\d+)?)\s+(\d+,\d{4})\s+(\d+,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{2})(?:\s+(\d{2}))?/;
                                
                                match = line.match(pattern);
                                
                                if (match) {
                                    const code = match[1];
                                    const description = match[2].trim();
                                    const unit = match[3];
                                    const quantity = parseFloat(match[4].replace(',', '.'));
                                    const price = parseFloat(match[5].replace(',', '.'));
                                    const discount = parseFloat(match[6].replace(',', '.'));
                                    const totalStr = match[7].replace(/\./g, '').replace(',', '.');
                                    const total = parseFloat(totalStr);
                                    const vat = match[8];
                                    
                                    console.log(`[DDT CORRECT FIX] ✅ Articolo ${code} parsato (CON sconto):`);
                                    console.log(`  - Descrizione: ${description}`);
                                    console.log(`  - Quantità: ${quantity} ${unit}`);
                                    console.log(`  - Prezzo unitario: €${price}`);
                                    console.log(`  - Sconto: ${discount}%`);
                                    console.log(`  - Totale riga: €${total}`);
                                    console.log(`  - IVA: ${vat}%`);
                                    
                                    if (price > 0 && total > 0) {
                                        newItems.push({
                                            code: code,
                                            description: description,
                                            unit: unit,
                                            quantity: quantity,
                                            price: price,
                                            discount: discount,
                                            total: total,
                                            vat: vat + '%',
                                            iva: vat,
                                            vatRate: parseInt(vat)
                                        });
                                    }
                                }
                            } else {
                                // FORMATO 2: Senza sconto
                                // Es: 060027 TAJARIN FRESCHI UOVO VASCHETTA 250 PZ 24 1,9300 46,32 04 00
                                // Pattern più specifico per formato senza sconto
                                const pattern = /^(\d{6})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML|BT|SC)\s+(\d+(?:,\d+)?)\s+(\d+,\d{4})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{2})(?:\s+(\d{2}))?/;
                                
                                match = line.match(pattern);
                                
                                if (match) {
                                    const code = match[1];
                                    const description = match[2].trim();
                                    const unit = match[3];
                                    const quantity = parseFloat(match[4].replace(',', '.'));
                                    const price = parseFloat(match[5].replace(',', '.'));
                                    const totalStr = match[6].replace(/\./g, '').replace(',', '.');
                                    const total = parseFloat(totalStr);
                                    const vat = match[7];
                                    
                                    console.log(`[DDT CORRECT FIX] ✅ Articolo ${code} parsato (SENZA sconto):`);
                                    console.log(`  - Descrizione: ${description}`);
                                    console.log(`  - Quantità: ${quantity} ${unit}`);
                                    console.log(`  - Prezzo unitario: €${price}`);
                                    console.log(`  - Totale riga: €${total}`);
                                    console.log(`  - IVA: ${vat}%`);
                                    
                                    // Calcola lo sconto implicito
                                    const expectedTotal = quantity * price;
                                    const implicitDiscount = expectedTotal > 0 ? ((expectedTotal - total) / expectedTotal * 100) : 0;
                                    
                                    if (implicitDiscount > 0.1) {
                                        console.log(`  - Sconto implicito: ${implicitDiscount.toFixed(2)}%`);
                                    }
                                    
                                    if (price > 0 && total > 0) {
                                        newItems.push({
                                            code: code,
                                            description: description,
                                            unit: unit,
                                            quantity: quantity,
                                            price: price,
                                            discount: implicitDiscount,
                                            total: total,
                                            vat: vat + '%',
                                            iva: vat,
                                            vatRate: parseInt(vat)
                                        });
                                    }
                                }
                            }
                            
                            if (!match) {
                                console.log('[DDT CORRECT FIX] ❌ Pattern non riconosciuto per:', line);
                            }
                            
                        } else if (foundArticles && (
                            line.includes('TOTALE') || 
                            line.includes('SCATOLONI') || 
                            line.includes('IMPONIBILE') ||
                            line.includes('Totale documento') ||
                            line.length === 0
                        )) {
                            // Fine del blocco articoli
                            articleEndLine = i;
                            console.log('[DDT CORRECT FIX] Fine articoli alla riga', i);
                            break;
                        }
                    }
                    
                    // Se abbiamo trovato articoli validi, sostituisci quelli esistenti
                    if (newItems.length > 0) {
                        console.log(`[DDT CORRECT FIX] 🎯 SOSTITUENDO ${result.items?.length || 0} articoli con ${newItems.length} articoli CORRETTI`);
                        
                        // Mostra gli articoli vecchi per confronto
                        if (result.items && result.items.length > 0) {
                            console.log('[DDT CORRECT FIX] === CONFRONTO ARTICOLI ===');
                            console.log('[DDT CORRECT FIX] VECCHI (errati):');
                            result.items.forEach((item, idx) => {
                                console.log(`  ${idx+1}. ${item.code}: Q=${item.quantity} P=€${item.price} T=€${item.total}`);
                            });
                        }
                        
                        // Sovrascrivi completamente gli items
                        result.items = newItems;
                        
                        // Ricalcola totali CORRETTI
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
                        
                        console.log('[DDT CORRECT FIX] NUOVI (corretti):');
                        newItems.forEach((item, idx) => {
                            console.log(`  ${idx+1}. ${item.code}: Q=${item.quantity} P=€${item.price} ${item.discount > 0 ? '-'+item.discount.toFixed(2)+'%' : ''} = €${item.total}`);
                        });
                        
                        console.log('[DDT CORRECT FIX] === TOTALI FINALI ===');
                        console.log(`  - Subtotale: €${subtotal.toFixed(2)}`);
                        console.log(`  - IVA: €${totalIVA.toFixed(2)}`);
                        console.log(`  - Totale calcolato: €${(subtotal + totalIVA).toFixed(2)}`);
                        console.log(`  - Totale documento originale: €${result.total}`);
                    } else {
                        console.log('[DDT CORRECT FIX] ⚠️ Nessun articolo trovato con il pattern corretto');
                        console.log('[DDT CORRECT FIX] Range analizzato: righe', articleStartLine, '-', articleEndLine);
                    }
                }
                
                return result;
            };
            
            console.log('✅ [DDT CORRECT FIX] Override DEFINITIVO applicato con successo');
        }
    }
    
    // Applica subito
    applyFinalOverride();
    
    // Riapplica dopo un breve delay per essere sicuri di sovrascrivere altri fix
    setTimeout(applyFinalOverride, 500);
    
    // E ancora dopo per sicurezza massima
    setTimeout(applyFinalOverride, 1000);
    
})();