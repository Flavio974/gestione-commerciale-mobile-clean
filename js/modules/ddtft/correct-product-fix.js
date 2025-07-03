/**
 * Fix CORRETTO per l'estrazione dei prodotti
 * Basato sulla struttura reale: CODICE DESCRIZIONE UM QUANTITÀ PREZZO TOTALE IVA
 * (SENZA colonna sconto)
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix CORRETTO estrazione prodotti...');
    
    // Funzione per estrarre prodotti con struttura corretta
    function extractProductsCorrect(text, logger) {
        const log = logger || console.log;
        log('✅ [CORRECT FIX] Estrazione con struttura: CODICE DESC UM QTÀ PREZZO TOTALE IVA');
        
        const articles = [];
        const lines = text.split('\n');
        
        // Pattern per formato SENZA sconto
        // Es: 070017 TAJARIN UOVO SACCHETTO ALFIERI 250G PZ 10 2,1700 21,70 04
        const productPattern = /^(\w{6,9})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML)\s+(\d+(?:[.,]\d+)?)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{1,2})$/;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            // Normalizza spazi multipli
            const normalizedLine = trimmedLine.replace(/\s+/g, ' ');
            
            // Prima prova con il pattern regex
            const match = normalizedLine.match(productPattern);
            if (match) {
                const [fullMatch, code, description, unit, quantityStr, priceStr, totalStr, vatStr] = match;
                
                log(`[CORRECT] Match trovato: "${normalizedLine}"`);
                log(`[CORRECT] Valori: Q="${quantityStr}" P="${priceStr}" T="${totalStr}" IVA="${vatStr}"`);
                
                // Verifica che il totale sia corretto
                const qty = parseFloat(quantityStr.replace(',', '.'));
                const price = parseFloat(priceStr.replace(',', '.'));
                const total = parseFloat(totalStr.replace(',', '.'));
                const expectedTotal = qty * price;
                
                if (Math.abs(total - expectedTotal) > 0.01) {
                    log(`⚠️ [WARNING] Totale non corretto: ${total} invece di ${expectedTotal}`);
                }
                
                // Gestione corretta dell'IVA
                let ivaFormatted = vatStr;
                if (vatStr === '04' || vatStr === '4') {
                    ivaFormatted = '4%';
                } else if (vatStr === '10') {
                    ivaFormatted = '10%';
                } else if (vatStr === '22') {
                    ivaFormatted = '22%';
                } else {
                    ivaFormatted = vatStr + '%';
                }
                
                const article = {
                    code: code,
                    description: description.trim(),
                    quantity: quantityStr,
                    unit: unit,
                    price: priceStr,
                    discount: '0,00',  // Non presente nel formato
                    total: totalStr,
                    iva: ivaFormatted
                };
                
                articles.push(article);
                log(`✅ [CORRECT] Prodotto: ${code} - Q:${quantityStr} P:€${priceStr} T:€${totalStr} IVA:${ivaFormatted}`);
                log(`📊 [CORRECT] Oggetto salvato:`, JSON.stringify(article));
                
            } else {
                // Metodo alternativo per righe che non matchano il pattern
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
                    
                    // IMPORTANTE: Struttura SENZA sconto!
                    // unitIndex + 1 = Quantità
                    // unitIndex + 2 = Prezzo  
                    // unitIndex + 3 = Totale (NON +4!)
                    // unitIndex + 4 = IVA (NON +5!)
                    
                    if (unitIndex > 0 && unitIndex + 4 < words.length) {
                        const code = words[0];
                        const description = words.slice(1, unitIndex).join(' ');
                        const unit = words[unitIndex];
                        const quantity = words[unitIndex + 1];
                        const priceStr = words[unitIndex + 2];
                        const totalStr = words[unitIndex + 3];  // POSIZIONE CORRETTA!
                        const vatStr = words[unitIndex + 4];
                        
                        log(`[CORRECT ALT] Estrazione per: "${normalizedLine}"`);
                        log(`[CORRECT ALT] Valori: Q="${quantity}" P="${priceStr}" T="${totalStr}" IVA="${vatStr}"`);
                        
                        // Verifica
                        const qty = parseFloat(quantity.replace(',', '.'));
                        const price = parseFloat(priceStr.replace(',', '.'));
                        const total = parseFloat(totalStr.replace(',', '.'));
                        const expectedTotal = qty * price;
                        
                        if (Math.abs(total - expectedTotal) > 0.01) {
                            log(`⚠️ [WARNING ALT] Totale non corretto: ${total} invece di ${expectedTotal}`);
                        }
                        
                        // Gestione corretta dell'IVA
                        let ivaFormatted = vatStr;
                        if (vatStr === '04' || vatStr === '4') {
                            ivaFormatted = '4%';
                        } else if (vatStr === '10') {
                            ivaFormatted = '10%';
                        } else if (vatStr === '22') {
                            ivaFormatted = '22%';
                        } else {
                            ivaFormatted = vatStr + '%';
                        }
                        
                        const article = {
                            code: code,
                            description: description.trim(),
                            quantity: quantity,
                            unit: unit,
                            price: priceStr,
                            discount: '0,00',  // Non presente
                            total: totalStr,
                            iva: ivaFormatted
                        };
                        
                        articles.push(article);
                        log(`✅ [CORRECT ALT] Prodotto: ${code} - Q:${quantity} P:€${priceStr} T:€${totalStr} IVA:${ivaFormatted}`);
                        log(`📊 [CORRECT ALT] Oggetto salvato:`, JSON.stringify(article));
                    }
                }
            }
        }
        
        log(`📊 [CORRECT] Totale prodotti estratti: ${articles.length}`);
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
            console.log('✅ Extractors trovati, applico fix CORRETTO...');
            
            // Fix per DDTExtractor base
            if (hasDDT) {
                // Salva il metodo originale per log
                const originalMethod = window.DDTExtractor.prototype.extractArticles;
                console.log('🔍 Metodo originale extractArticles:', typeof originalMethod);
                
                window.DDTExtractor.prototype.extractArticles = function() {
                    console.log('🎯 [CORRECT-FIX] extractArticles INTERCETTATO!');
                    return extractProductsCorrect(this.text, this.log.bind(this));
                };
                console.log('✅ Fix CORRETTO applicato a DDTExtractor');
            }
            
            // Fix per DDTExtractorModular
            if (hasModular) {
                window.DDTExtractorModular.prototype.extractArticles = function() {
                    console.log('🎯 [CORRECT-FIX] extractArticles INTERCETTATO su Modular!');
                    return extractProductsCorrect(this.text, this.log.bind(this));
                };
                console.log('✅ Fix CORRETTO applicato a DDTExtractorModular');
            }
            
            console.log('✅ Fix CORRETTO estrazione prodotti completato!');
            
        } else if (attempts < maxAttempts) {
            setTimeout(tryApplyFix, 100);
        } else {
            console.error('❌ Timeout: Extractors non trovati dopo ' + maxAttempts + ' tentativi');
        }
    }
    
    // Inizia subito
    tryApplyFix();
    
})();