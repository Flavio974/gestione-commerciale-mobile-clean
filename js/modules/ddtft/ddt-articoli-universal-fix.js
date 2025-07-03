/**
 * Fix UNIVERSALE per il parsing degli articoli DDT
 * Gestisce correttamente entrambi i formati DDT rilevando dinamicamente la struttura
 */

(function() {
    'use strict';
    
    console.log('🌐 [DDT UNIVERSAL FIX] Caricamento fix universale articoli DDT...');
    
    // Funzione per fare override DEFINITIVO
    function applyUniversalOverride() {
        if (window.DDTFTDocumentParser) {
            const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
            
            window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
                console.log('🌐 [DDT UNIVERSAL FIX] INTERCETTATO parseDocumentFromText');
                
                // Prima chiamiamo l'originale per avere la struttura base
                const result = originalParse.call(this, text, fileName);
                
                // Solo per DDT
                if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                    console.log('🌐 [DDT UNIVERSAL FIX] Override articoli DDT...');
                    
                    const lines = text.split('\n');
                    const newItems = [];
                    
                    // Trova dove iniziano gli articoli
                    let articleZone = false;
                    let headerLineIndex = -1;
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        
                        // Cerca l'header degli articoli
                        if (line.includes('CODICE') && line.includes('DESCRIZIONE') && line.includes('IMPORTO')) {
                            headerLineIndex = i;
                            // Determina il formato dal header
                            const hasSconto = line.includes('SCONTO%');
                            console.log(`🌐 [DDT UNIVERSAL FIX] Header trovato alla riga ${i}: formato ${hasSconto ? 'CON' : 'SENZA'} sconto`);
                            console.log(`🌐 [DDT UNIVERSAL FIX] Header: ${line}`);
                            articleZone = true;
                            continue;
                        }
                        
                        // Se siamo nella zona articoli
                        if (articleZone && line.match(/^\d{6}\s/)) {
                            console.log(`🌐 [DDT UNIVERSAL FIX] Analizzando: ${line}`);
                            
                            // Estrai i campi usando un approccio più robusto
                            // Prima estrai codice e descrizione
                            const codeMatch = line.match(/^(\d{6})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML|BT|SC)\s+(.+)$/);
                            
                            if (codeMatch) {
                                const code = codeMatch[1];
                                const description = codeMatch[2].trim();
                                const unit = codeMatch[3];
                                const restOfLine = codeMatch[4];
                                
                                // Ora analizza i numeri nella parte restante
                                const numbers = restOfLine.match(/[\d,\.]+/g);
                                console.log(`🌐 [DDT UNIVERSAL FIX] Numeri trovati: ${numbers ? numbers.join(' | ') : 'nessuno'}`);
                                
                                if (numbers && numbers.length >= 4) {
                                    let quantity, price, discount, total, vat;
                                    
                                    // Identifica il pattern basandosi sul numero di campi numerici
                                    // Se ci sono 6 o più numeri, probabilmente c'è lo sconto
                                    if (numbers.length >= 6) {
                                        // Formato CON sconto: quantità, prezzo, sconto, totale, iva, sm
                                        quantity = parseFloat(numbers[0].replace(',', '.'));
                                        price = parseFloat(numbers[1].replace(',', '.'));
                                        discount = parseFloat(numbers[2].replace(',', '.'));
                                        // Il totale è il numero con formato xxx,xx o x.xxx,xx
                                        let totalIndex = 3;
                                        for (let j = 3; j < numbers.length; j++) {
                                            if (numbers[j].match(/^\d{1,3}(?:\.\d{3})*,\d{2}$/)) {
                                                totalIndex = j;
                                                break;
                                            }
                                        }
                                        total = parseFloat(numbers[totalIndex].replace(/\./g, '').replace(',', '.'));
                                        vat = numbers[totalIndex + 1] || '10';
                                    } else {
                                        // Formato SENZA sconto: quantità, prezzo, totale, iva
                                        quantity = parseFloat(numbers[0].replace(',', '.'));
                                        price = parseFloat(numbers[1].replace(',', '.'));
                                        // Il totale è il numero con formato xxx,xx o x.xxx,xx
                                        let totalIndex = 2;
                                        for (let j = 2; j < numbers.length; j++) {
                                            if (numbers[j].match(/^\d{1,3}(?:\.\d{3})*,\d{2}$/)) {
                                                totalIndex = j;
                                                break;
                                            }
                                        }
                                        total = parseFloat(numbers[totalIndex].replace(/\./g, '').replace(',', '.'));
                                        vat = numbers[totalIndex + 1] || '10';
                                        discount = 0;
                                    }
                                    
                                    console.log(`🌐 [DDT UNIVERSAL FIX] Articolo ${code}:`);
                                    console.log(`  - Quantità: ${quantity} ${unit}`);
                                    console.log(`  - Prezzo: €${price}`);
                                    console.log(`  - Sconto: ${discount}%`);
                                    console.log(`  - Totale: €${total}`);
                                    console.log(`  - IVA: ${vat}%`);
                                    
                                    if (quantity > 0 && price > 0 && total > 0) {
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
                            }
                        }
                        
                        // Fine zona articoli
                        if (articleZone && (line.includes('TOTALE') || line.includes('SCATOLONI') || line === '')) {
                            articleZone = false;
                        }
                    }
                    
                    // Se abbiamo trovato articoli validi, sostituisci
                    if (newItems.length > 0) {
                        console.log(`🌐 [DDT UNIVERSAL FIX] Sostituendo ${result.items?.length || 0} articoli con ${newItems.length} articoli corretti`);
                        
                        result.items = newItems;
                        
                        // Ricalcola totali
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
                        
                        console.log(`🌐 [DDT UNIVERSAL FIX] Totali finali - Subtotale: €${subtotal.toFixed(2)}, IVA: €${totalIVA.toFixed(2)}`);
                    }
                }
                
                return result;
            };
            
            console.log('✅ [DDT UNIVERSAL FIX] Override applicato con successo');
        }
    }
    
    // Applica subito
    applyUniversalOverride();
    
    // Riapplica dopo un delay per sicurezza
    setTimeout(applyUniversalOverride, 500);
    setTimeout(applyUniversalOverride, 1000);
    
})();