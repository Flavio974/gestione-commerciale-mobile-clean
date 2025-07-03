/**
 * Fix semplice e diretto per l'estrazione dei prodotti
 * Sostituisce completamente il metodo extractArticles
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix SEMPLICE estrazione prodotti...');
    
    // Funzione per estrarre prodotti con pattern semplice
    function extractProductsSimple(text, logger) {
        const log = logger || console.log;
        log('🔍 [SIMPLE FIX] Estrazione prodotti con metodo semplificato');
        
        const articles = [];
        const lines = text.split('\n');
        
        // Pattern per una riga prodotto completa
        // Formato: CODICE DESCRIZIONE UM QUANTITA PREZZO SCONTO IMPORTO IVA
        // Pattern più flessibile che gestisce meglio gli spazi e i numeri
        const productPattern = /^(\w{6,9})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML)\s+(\d+(?:[.,]\d+)?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{1,2})$/;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            // Normalizza spazi multipli
            const normalizedLine = trimmedLine.replace(/\s+/g, ' ');
            
            // Prima prova con il pattern regex
            const match = normalizedLine.match(productPattern);
            if (match) {
                const [fullMatch, code, description, unit, quantityStr, priceStr, discountStr, totalStr, vatStr] = match;
                
                log(`[DEBUG] Match trovato per riga: "${normalizedLine}"`);
                log(`[DEBUG] Valori estratti: Q="${quantityStr}" P="${priceStr}" S="${discountStr}" T="${totalStr}" IVA="${vatStr}"`);
                
                // Debug calcolo per verificare correttezza
                const qtyCheck = parseFloat(quantityStr.replace(',', '.'));
                const priceCheck = parseFloat(priceStr.replace(',', '.'));
                const totalCheck = parseFloat(totalStr.replace(',', '.'));
                const expectedCheck = qtyCheck * priceCheck;
                
                log(`[DEBUG CALC] Quantità: ${qtyCheck}, Prezzo: ${priceCheck}, Totale PDF: ${totalCheck}, Calcolato: ${expectedCheck}`);
                if (Math.abs(totalCheck - expectedCheck) > 0.01) {
                    log(`⚠️ [WARNING] Totale non corrisponde! PDF: ${totalCheck}, Atteso: ${expectedCheck}`);
                }
                
                // Pulisci i numeri (gestisci formato italiano)
                const cleanNumber = (str) => {
                    if (!str) return 0;
                    // Sostituisci virgola con punto e rimuovi spazi
                    const cleaned = str.toString().replace(/\s/g, '').replace(',', '.');
                    return parseFloat(cleaned) || 0;
                };
                
                const quantity = cleanNumber(quantityStr);
                const price = cleanNumber(priceStr);
                const discount = cleanNumber(discountStr);
                const total = cleanNumber(totalStr);
                
                const article = {
                    code: code,
                    description: description.trim(),
                    quantity: quantityStr,  // Mantieni formato originale
                    unit: unit,
                    price: priceStr,  // Mantieni formato originale  
                    discount: discountStr,  // Mantieni formato originale
                    total: totalStr,  // Mantieni formato originale
                    iva: vatStr + '%'
                };
                
                articles.push(article);
                log(`✅ [SIMPLE] Prodotto: ${code} - Q:${quantity} P:€${price.toFixed(2)} T:€${total.toFixed(2)}`);
            } else {
                // Se non matcha con regex, prova metodo alternativo per questa riga specifica
                const words = normalizedLine.split(/\s+/);
                
                // Cerca il codice prodotto
                if (words.length > 0 && /^(\d{6}|[A-Z]{2}\d{6}|[A-Z]{2}\d{6}[A-Z]+|\d{6}[A-Z]+)$/.test(words[0])) {
                    // Trova l'unità di misura
                    let unitIndex = -1;
                    for (let i = 1; i < words.length; i++) {
                        if (['PZ', 'KG', 'CF', 'LT', 'MT', 'CT', 'GR', 'ML'].includes(words[i])) {
                            unitIndex = i;
                            break;
                        }
                    }
                    
                    if (unitIndex > 0 && unitIndex + 5 < words.length) {
                        const code = words[0];
                        const description = words.slice(1, unitIndex).join(' ');
                        const unit = words[unitIndex];
                        const quantity = words[unitIndex + 1];
                        const priceStr = words[unitIndex + 2];
                        const discountStr = words[unitIndex + 3];
                        const totalStr = words[unitIndex + 4];
                        const vatStr = words[unitIndex + 5];
                        
                        log(`[DEBUG INLINE] Tentativo estrazione inline per: "${normalizedLine}"`);
                        log(`[DEBUG INLINE] Valori: Q="${quantity}" P="${priceStr}" S="${discountStr}" T="${totalStr}" IVA="${vatStr}"`);
                        
                        // Debug aggiuntivo per verificare i calcoli
                        const qtyNum = parseFloat(quantity.replace(',', '.'));
                        const priceNum = parseFloat(priceStr.replace(',', '.'));
                        const totalNum = parseFloat(totalStr.replace(',', '.'));
                        const expectedTotal = qtyNum * priceNum;
                        
                        log(`[DEBUG CALC] Quantità: ${qtyNum}, Prezzo: ${priceNum}, Totale PDF: ${totalNum}, Calcolato: ${expectedTotal}`);
                        if (Math.abs(totalNum - expectedTotal) > 0.01) {
                            log(`⚠️ [WARNING] Totale non corrisponde! PDF: ${totalNum}, Atteso: ${expectedTotal}`);
                        }
                        
                        const cleanNumber = (str) => {
                            if (!str) return 0;
                            const cleaned = str.toString().replace(/\s/g, '').replace(',', '.');
                            return parseFloat(cleaned) || 0;
                        };
                        
                        const article = {
                            code: code,
                            description: description.trim(),
                            quantity: quantity,  // Mantieni formato originale
                            unit: unit,
                            price: priceStr,  // Mantieni formato originale
                            discount: discountStr,  // Mantieni formato originale
                            total: totalStr,  // Mantieni formato originale
                            iva: vatStr + '%'
                        };
                        
                        articles.push(article);
                        log(`✅ [SIMPLE INLINE] Prodotto: ${code} - Q:${quantity} P:€${article.price} T:€${article.total}`);
                    } else {
                        log(`[DEBUG] Riga con prodotto ma struttura non valida: "${normalizedLine}"`);
                    }
                } else if (normalizedLine.includes('PZ') || normalizedLine.includes('KG')) {
                    log(`[DEBUG] Riga non matchata: "${normalizedLine}"`);
                }
            }
        }
        
        if (articles.length === 0) {
            log('⚠️ [SIMPLE] Nessun prodotto trovato con pattern regex, provo metodo word-split...');
            
            // Metodo alternativo: split per parole
            const words = text.split(/\s+/);
            
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                
                // È un codice prodotto?
                if (/^(\d{6}|[A-Z]{2}\d{6}|[A-Z]{2}\d{6}[A-Z]+|\d{6}[A-Z]+)$/.test(word)) {
                    // Cerca unità di misura
                    let unitIndex = -1;
                    let unit = '';
                    
                    for (let j = i + 1; j < Math.min(i + 20, words.length); j++) {
                        if (['PZ', 'KG', 'CF', 'LT', 'MT', 'CT', 'GR', 'ML'].includes(words[j])) {
                            unitIndex = j;
                            unit = words[j];
                            break;
                        }
                    }
                    
                    if (unitIndex > -1 && unitIndex + 4 < words.length) {
                        const description = words.slice(i + 1, unitIndex).join(' ');
                        const quantity = words[unitIndex + 1];
                        const priceStr = words[unitIndex + 2];  
                        const discountStr = words[unitIndex + 3];
                        const totalStr = words[unitIndex + 4];
                        
                        log(`[DEBUG WORD] Trovato prodotto ${word}:`);
                        log(`[DEBUG WORD] unitIndex=${unitIndex}, words dopo UM: ${words.slice(unitIndex + 1, unitIndex + 6).join(' | ')}`);
                        
                        // Pulisci numeri
                        const cleanNumber = (str) => {
                            if (!str) return 0;
                            const cleaned = str.toString().replace(/\s/g, '').replace(',', '.');
                            return parseFloat(cleaned) || 0;
                        };
                        
                        const article = {
                            code: word,
                            description: description.trim(),
                            quantity: quantity,  // Mantieni formato originale
                            unit: unit,
                            price: priceStr,  // Mantieni formato originale
                            discount: discountStr,  // Mantieni formato originale
                            total: totalStr,  // Mantieni formato originale
                            iva: '10%'
                        };
                        
                        // Verifica IVA
                        if (unitIndex + 5 < words.length) {
                            const ivaCode = words[unitIndex + 5];
                            if (['4', '10', '22'].includes(ivaCode)) {
                                article.iva = ivaCode + '%';
                            }
                        }
                        
                        articles.push(article);
                        log(`✅ [SIMPLE WORD] Prodotto: ${word} - Q:${quantity} P:€${article.price} S:${article.discount}% T:€${article.total} IVA:${article.iva}`);
                    }
                }
            }
        }
        
        log(`📊 [SIMPLE] Totale prodotti estratti: ${articles.length}`);
        return articles;
    }
    
    // Applica il fix con retry
    let attempts = 0;
    const maxAttempts = 20;
    
    function tryApplyFix() {
        attempts++;
        
        // Controlla sia DDTExtractor che DDTExtractorModular
        const hasDDT = window.DDTExtractor && window.DDTExtractor.prototype;
        const hasModular = window.DDTExtractorModular && window.DDTExtractorModular.prototype;
        
        if (hasDDT || hasModular) {
            console.log('✅ Extractors trovati, applico fix semplice...');
            
            // Fix per DDTExtractor base
            if (hasDDT) {
                window.DDTExtractor.prototype.extractArticles = function() {
                    return extractProductsSimple(this.text, this.log.bind(this));
                };
                console.log('✅ Fix applicato a DDTExtractor');
            }
            
            // Fix per DDTExtractorModular
            if (hasModular) {
                window.DDTExtractorModular.prototype.extractArticles = function() {
                    // Se ha mappings custom, gestiscili
                    if (this.mappings && this.mappings.ARTICLE_CODES) {
                        const originalCodes = this.articleCodes;
                        this.articleCodes = this.mappings.ARTICLE_CODES;
                        const result = extractProductsSimple(this.text, this.log.bind(this));
                        this.articleCodes = originalCodes;
                        return result;
                    }
                    return extractProductsSimple(this.text, this.log.bind(this));
                };
                console.log('✅ Fix applicato a DDTExtractorModular');
            }
            
            console.log('✅ Fix semplice estrazione prodotti completato!');
            
        } else if (attempts < maxAttempts) {
            setTimeout(tryApplyFix, 100);
        } else {
            console.error('❌ Timeout: Extractors non trovati dopo ' + maxAttempts + ' tentativi');
        }
    }
    
    // Inizia subito
    tryApplyFix();
    
})();