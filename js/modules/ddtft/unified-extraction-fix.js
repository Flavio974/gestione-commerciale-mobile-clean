/**
 * FIX UNIFICATO per l'estrazione prodotti
 * Supporta entrambi i formati DDT (con e senza sconto)
 * Gestisce correttamente l'IVA per tutti i prodotti
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando FIX UNIFICATO estrazione prodotti...');
    
    // Funzione unificata per estrarre prodotti
    function extractProductsUnified(text, logger) {
        const log = logger || console.log;
        log('🎯 [UNIFIED FIX] Estrazione prodotti con supporto multi-formato');
        
        const articles = [];
        const lines = text.split('\n');
        
        // Pattern flessibile che supporta:
        // - Codici alfanumerici (es: 070017, PIRR003, VS000012)
        // - Formato CON sconto: CODICE DESC UM QTÀ PREZZO SCONTO TOTALE IVA (8 gruppi)
        // - Formato SENZA sconto: CODICE DESC UM QTÀ PREZZO TOTALE IVA (7 gruppi)
        const productPatternWithDiscount = /^([A-Z0-9]{6,9})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML)\s+(\d+(?:[.,]\d+)?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{1,2})$/;
        const productPatternNoDiscount = /^([A-Z0-9]{6,9})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML)\s+(\d+(?:[.,]\d+)?)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{1,2})$/;
        
        let productsFound = 0;
        let formatDetected = null;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            const normalizedLine = trimmedLine.replace(/\s+/g, ' ');
            
            // Prima prova formato CON sconto (8 campi)
            let match = normalizedLine.match(productPatternWithDiscount);
            let hasDiscount = true;
            
            if (match) {
                // Verifica se il penultimo campo potrebbe essere un totale valido
                const qty = parseFloat(match[4].replace(',', '.'));
                const price = parseFloat(match[5].replace(',', '.'));
                const possibleDiscount = parseFloat(match[6].replace(',', '.'));
                const possibleTotal = parseFloat(match[7].replace(',', '.'));
                
                // Se il "totale" è troppo piccolo rispetto a qty*price, probabilmente è lo sconto
                const expectedTotal = qty * price;
                if (Math.abs(possibleTotal - expectedTotal) < expectedTotal * 0.5) {
                    formatDetected = 'WITH_DISCOUNT';
                } else {
                    // Potrebbe essere formato senza sconto, riprova
                    match = null;
                }
            }
            
            // Se non ha matchato o sembra formato errato, prova SENZA sconto (7 campi)
            if (!match) {
                match = normalizedLine.match(productPatternNoDiscount);
                hasDiscount = false;
                if (match) {
                    formatDetected = 'NO_DISCOUNT';
                }
            }
            
            if (match) {
                productsFound++;
                
                let code, description, unit, quantityStr, priceStr, discountStr, totalStr, vatStr;
                
                if (hasDiscount && match.length === 9) {
                    // Formato CON sconto
                    [_, code, description, unit, quantityStr, priceStr, discountStr, totalStr, vatStr] = match;
                    log(`[UNIFIED] Prodotto ${productsFound} (CON sconto): ${code}`);
                } else if (!hasDiscount && match.length === 8) {
                    // Formato SENZA sconto
                    [_, code, description, unit, quantityStr, priceStr, totalStr, vatStr] = match;
                    discountStr = '0,00';
                    log(`[UNIFIED] Prodotto ${productsFound} (SENZA sconto): ${code}`);
                } else {
                    log(`[UNIFIED] ⚠️ Match anomalo, gruppi: ${match.length}`);
                    continue;
                }
                
                // Gestione IVA
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
                    discount: discountStr,
                    total: totalStr,
                    iva: ivaFormatted,
                    vat_rate: ivaFormatted  // Per compatibilità
                };
                
                articles.push(article);
                log(`✅ [UNIFIED] ${code}: Q=${quantityStr} P=${priceStr} D=${discountStr} T=${totalStr} IVA=${ivaFormatted}`);
            }
        }
        
        log(`📊 [UNIFIED] Riepilogo estrazione:`);
        log(`   - Formato rilevato: ${formatDetected || 'MISTO'}`);
        log(`   - Totale prodotti: ${productsFound}`);
        log(`   - Prodotti IVA 4%: ${articles.filter(a => a.iva === '4%').length}`);
        log(`   - Prodotti IVA 10%: ${articles.filter(a => a.iva === '10%').length}`);
        log(`   - Prodotti IVA 22%: ${articles.filter(a => a.iva === '22%').length}`);
        
        return articles;
    }
    
    // Funzione per applicare il fix
    function applyUnifiedFix() {
        const extractors = [
            { name: 'DDTExtractor', obj: window.DDTExtractor },
            { name: 'DDTExtractorModular', obj: window.DDTExtractorModular }
        ];
        
        let fixApplied = false;
        
        extractors.forEach(({ name, obj }) => {
            if (obj && obj.prototype && obj.prototype.extractArticles) {
                console.log(`🔧 [UNIFIED] Applicando fix a ${name}...`);
                
                // Salva il metodo originale
                if (!obj.prototype._originalExtractArticles) {
                    obj.prototype._originalExtractArticles = obj.prototype.extractArticles;
                }
                
                // Override con il metodo unificato
                obj.prototype.extractArticles = function() {
                    console.log(`🎯 [UNIFIED] extractArticles intercettato su ${name}!`);
                    return extractProductsUnified(this.text, this.log ? this.log.bind(this) : undefined);
                };
                
                fixApplied = true;
                console.log(`✅ [UNIFIED] Fix applicato a ${name}`);
            }
        });
        
        return fixApplied;
    }
    
    // Applica il fix con retry intelligente
    let attempts = 0;
    const maxAttempts = 30;
    
    function tryApplyFix() {
        attempts++;
        
        if (applyUnifiedFix()) {
            console.log(`✅ [UNIFIED] Fix applicato con successo al tentativo ${attempts}`);
            
            // Continua a monitorare per eventuali ridefinizioni
            setInterval(() => {
                applyUnifiedFix();
            }, 10000); // Ogni 10 secondi
        } else if (attempts < maxAttempts) {
            setTimeout(tryApplyFix, 200); // Riprova dopo 200ms
        } else {
            console.error('❌ [UNIFIED] Timeout: Extractors non trovati dopo ' + maxAttempts + ' tentativi');
        }
    }
    
    // Inizia l'applicazione del fix
    tryApplyFix();
    
    // Funzione helper per debug
    window.debugUnifiedExtraction = function(line) {
        console.log('=== DEBUG UNIFIED EXTRACTION ===');
        console.log('Input:', line);
        
        const normalized = line.trim().replace(/\s+/g, ' ');
        console.log('Normalized:', normalized);
        
        // Test entrambi i pattern
        const patterns = [
            { name: 'WITH_DISCOUNT', regex: /^([A-Z0-9]{6,9})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML)\s+(\d+(?:[.,]\d+)?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{1,2})$/ },
            { name: 'NO_DISCOUNT', regex: /^([A-Z0-9]{6,9})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML)\s+(\d+(?:[.,]\d+)?)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{1,2})$/ }
        ];
        
        patterns.forEach(({ name, regex }) => {
            const match = normalized.match(regex);
            if (match) {
                console.log(`✅ Match con pattern ${name}:`);
                match.forEach((group, idx) => {
                    if (idx === 0) return;
                    console.log(`  [${idx}] = "${group}"`);
                });
            } else {
                console.log(`❌ No match con pattern ${name}`);
            }
        });
        
        // Debug con split
        const words = normalized.split(/\s+/);
        console.log('Parole:', words);
        console.log('Numero parole:', words.length);
    };
    
    console.log('✅ [UNIFIED] Fix unificato estrazione prodotti installato');
    console.log('💡 Usa window.debugUnifiedExtraction(line) per debug');
    
})();