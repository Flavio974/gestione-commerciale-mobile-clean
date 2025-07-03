/**
 * Fix corretto per l'estrazione dei prodotti
 * Gestisce il formato SENZA colonna sconto
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix estrazione prodotti (formato senza sconto)...');
    
    // Funzione per trovare la posizione corretta del totale
    function findTotalPosition(words, qtyIndex, priceIndex) {
        const qty = parseFloat(words[qtyIndex].replace(',', '.'));
        const price = parseFloat(words[priceIndex].replace(',', '.'));
        const expectedTotal = qty * price;
        
        console.log(`🔍 Cerco totale ${expectedTotal.toFixed(2)} per ${qty} × ${price}`);
        
        // Cerca il totale nelle posizioni successive
        for (let i = priceIndex + 1; i < words.length && i < priceIndex + 6; i++) {
            const value = parseFloat(words[i].replace(',', '.'));
            if (!isNaN(value) && Math.abs(value - expectedTotal) < 0.01) {
                console.log(`✅ Trovato totale alla posizione ${i}: ${words[i]}`);
                return i;
            }
        }
        
        console.log(`❌ Totale non trovato, uso posizione default`);
        return -1;
    }
    
    // Funzione per estrarre prodotti con ricerca intelligente
    function extractProductsSmart(text, logger) {
        const log = logger || console.log;
        log('🧠 [SMART FIX] Estrazione prodotti con metodo intelligente');
        
        const articles = [];
        const lines = text.split('\n');
        
        // Contatori per statistiche
        let totalFound = 0;
        let totalNotFound = 0;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            const words = trimmedLine.split(/\s+/);
            
            // È un codice prodotto?
            if (words.length > 0 && /^(\d{6}|[A-Z]{2}\d{6}|[A-Z]{2}\d{6}[A-Z]+|\d{6}[A-Z]+)$/.test(words[0])) {
                const code = words[0];
                
                // Trova indici dei numeri che potrebbero essere quantità e prezzo
                const numbers = [];
                for (let i = 1; i < words.length; i++) {
                    if (/^\d+([.,]\d+)?$/.test(words[i])) {
                        numbers.push({
                            index: i,
                            value: parseFloat(words[i].replace(',', '.')),
                            text: words[i]
                        });
                    }
                }
                
                log(`📦 Prodotto ${code}: trovati ${numbers.length} numeri`);
                
                if (numbers.length >= 3) {
                    // Assumiamo che il primo numero sia la quantità
                    const qtyIndex = numbers[0].index;
                    const quantity = numbers[0].text;
                    
                    // Cerca quale dei numeri successivi è il prezzo
                    let bestMatch = null;
                    let bestTotalIndex = -1;
                    
                    for (let p = 1; p < numbers.length - 1; p++) {
                        const priceIndex = numbers[p].index;
                        const priceValue = numbers[p].value;
                        const qtyValue = numbers[0].value;
                        const expectedTotal = qtyValue * priceValue;
                        
                        // Cerca se esiste un numero che corrisponde al totale
                        for (let t = p + 1; t < numbers.length; t++) {
                            const totalValue = numbers[t].value;
                            if (Math.abs(totalValue - expectedTotal) < 0.01) {
                                log(`✅ Match trovato: ${qtyValue} × ${priceValue} = ${totalValue}`);
                                bestMatch = {
                                    qtyIndex: qtyIndex,
                                    priceIndex: priceIndex,
                                    totalIndex: numbers[t].index,
                                    quantity: quantity,
                                    price: numbers[p].text,
                                    total: numbers[t].text
                                };
                                bestTotalIndex = numbers[t].index;
                                break;
                            }
                        }
                        
                        if (bestMatch) break;
                    }
                    
                    if (bestMatch) {
                        totalFound++;
                        
                        // Estrai descrizione
                        const description = words.slice(1, bestMatch.qtyIndex).join(' ');
                        
                        // Cerca IVA (di solito è l'ultimo numero o poco dopo il totale)
                        let iva = '10%';
                        for (let i = bestMatch.totalIndex + 1; i < words.length && i < bestMatch.totalIndex + 3; i++) {
                            if (/^\d{1,2}$/.test(words[i])) {
                                iva = words[i] + '%';
                                break;
                            }
                        }
                        
                        const article = {
                            code: code,
                            description: description.trim(),
                            quantity: bestMatch.quantity,
                            unit: 'PZ', // Default, potrebbe non essere presente
                            price: bestMatch.price,
                            discount: '0,00', // Default se non presente
                            total: bestMatch.total,
                            iva: iva
                        };
                        
                        articles.push(article);
                        log(`✅ [SMART] Prodotto estratto: ${code} - Q:${bestMatch.quantity} P:€${bestMatch.price} T:€${bestMatch.total}`);
                    } else {
                        totalNotFound++;
                        log(`⚠️ [SMART] Non riesco a trovare match per ${code}`);
                        
                        // Fallback: usa posizioni fisse se non trova match
                        if (numbers.length >= 2) {
                            const article = {
                                code: code,
                                description: words.slice(1, numbers[0].index).join(' ').trim(),
                                quantity: numbers[0].text,
                                unit: 'PZ',
                                price: numbers[1].text,
                                discount: '0,00',
                                total: numbers.length > 2 ? numbers[2].text : '0,00',
                                iva: '10%'
                            };
                            articles.push(article);
                            log(`🔄 [SMART FALLBACK] Uso posizioni default per ${code}`);
                        }
                    }
                }
            }
        }
        
        log(`📊 [SMART] Risultati: ${totalFound} match trovati, ${totalNotFound} fallback`);
        log(`📊 [SMART] Totale prodotti estratti: ${articles.length}`);
        return articles;
    }
    
    // Applica il fix
    let attempts = 0;
    const maxAttempts = 20;
    
    function tryApplyFix() {
        attempts++;
        
        const hasDDT = window.DDTExtractor && window.DDTExtractor.prototype;
        const hasModular = window.DDTExtractorModular && window.DDTExtractorModular.prototype;
        
        if (hasDDT || hasModular) {
            console.log('✅ Extractors trovati, applico SMART fix...');
            
            // Fix per DDTExtractor base
            if (hasDDT) {
                window.DDTExtractor.prototype.extractArticles = function() {
                    return extractProductsSmart(this.text, this.log.bind(this));
                };
                console.log('✅ SMART fix applicato a DDTExtractor');
            }
            
            // Fix per DDTExtractorModular
            if (hasModular) {
                window.DDTExtractorModular.prototype.extractArticles = function() {
                    return extractProductsSmart(this.text, this.log.bind(this));
                };
                console.log('✅ SMART fix applicato a DDTExtractorModular');
            }
            
            console.log('✅ SMART fix estrazione prodotti completato!');
            
        } else if (attempts < maxAttempts) {
            setTimeout(tryApplyFix, 100);
        } else {
            console.error('❌ Timeout: Extractors non trovati dopo ' + maxAttempts + ' tentativi');
        }
    }
    
    // Inizia subito
    tryApplyFix();
    
})();