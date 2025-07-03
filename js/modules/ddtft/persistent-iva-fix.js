/**
 * Fix PERSISTENTE per l'estrazione corretta dell'IVA
 * Monitora e riapplica il fix se viene sovrascritto
 */

(function() {
    'use strict';
    
    console.log('🛡️ Inizializzazione FIX PERSISTENTE IVA...');
    
    // Funzione di estrazione corretta (formato SENZA sconto)
    function extractProductsWithCorrectIVA(text, logger) {
        const log = logger || console.log;
        log('🎯 [PERSISTENT FIX] Estrazione con IVA corretta (formato senza sconto)');
        
        const articles = [];
        const lines = text.split('\n');
        
        // Pattern CORRETTO: CODICE DESC UM QTÀ PREZZO TOTALE IVA (7 gruppi)
        const productPattern = /^(\w{6,9})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML)\s+(\d+(?:[.,]\d+)?)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{1,2})$/;
        
        let productsFound = 0;
        let iva4Count = 0;
        let iva10Count = 0;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            const normalizedLine = trimmedLine.replace(/\s+/g, ' ');
            const match = normalizedLine.match(productPattern);
            
            if (match) {
                const [_, code, description, unit, quantityStr, priceStr, totalStr, vatStr] = match;
                
                productsFound++;
                
                // Log dettagliato per debug
                log(`[PERSISTENT] Prodotto ${productsFound}: ${code}`);
                log(`[PERSISTENT]   - Q: ${quantityStr}, P: ${priceStr}, T: ${totalStr}, IVA: ${vatStr}`);
                
                // Gestione IVA
                let ivaFormatted = vatStr;
                if (vatStr === '04' || vatStr === '4') {
                    ivaFormatted = '4%';
                    iva4Count++;
                } else if (vatStr === '10') {
                    ivaFormatted = '10%';
                    iva10Count++;
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
                    discount: '0,00',
                    total: totalStr,
                    iva: ivaFormatted,
                    vat_rate: ivaFormatted  // Aggiungi anche vat_rate per compatibilità
                };
                
                articles.push(article);
                log(`✅ [PERSISTENT] ${code}: IVA ${ivaFormatted}`);
            }
        }
        
        log(`📊 [PERSISTENT] Riepilogo estrazione:`);
        log(`   - Totale prodotti: ${productsFound}`);
        log(`   - Prodotti con IVA 4%: ${iva4Count}`);
        log(`   - Prodotti con IVA 10%: ${iva10Count}`);
        
        return articles;
    }
    
    // Funzione che applica il fix
    function applyPersistentFix() {
        const extractors = [
            { name: 'DDTExtractor', obj: window.DDTExtractor },
            { name: 'DDTExtractorModular', obj: window.DDTExtractorModular }
        ];
        
        let fixApplied = false;
        
        extractors.forEach(({ name, obj }) => {
            if (obj && obj.prototype) {
                // Controlla se il metodo è già stato patchato
                if (!obj.prototype.extractArticles._isPersistentFixed) {
                    console.log(`🔧 [PERSISTENT] Applicando fix a ${name}...`);
                    
                    const originalMethod = obj.prototype.extractArticles;
                    
                    obj.prototype.extractArticles = function() {
                        console.log(`🎯 [PERSISTENT] extractArticles intercettato su ${name}!`);
                        return extractProductsWithCorrectIVA(this.text, this.log ? this.log.bind(this) : undefined);
                    };
                    
                    // Marca il metodo come patchato
                    obj.prototype.extractArticles._isPersistentFixed = true;
                    fixApplied = true;
                    
                    console.log(`✅ [PERSISTENT] Fix applicato a ${name}`);
                }
            }
        });
        
        return fixApplied;
    }
    
    // Applica il fix immediatamente
    applyPersistentFix();
    
    // Riapplica il fix ogni 500ms per i primi 10 secondi
    let checkCount = 0;
    const maxChecks = 20;
    
    const checkInterval = setInterval(() => {
        checkCount++;
        
        const applied = applyPersistentFix();
        
        if (applied) {
            console.log(`🔄 [PERSISTENT] Fix riapplicato (check ${checkCount}/${maxChecks})`);
        }
        
        if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            console.log('✅ [PERSISTENT] Monitoraggio completato');
            
            // Continua con check meno frequenti
            setInterval(() => {
                applyPersistentFix();
            }, 5000); // Ogni 5 secondi
        }
    }, 500);
    
    // Aggiungi anche una funzione globale per debug
    window.debugIVAExtraction = function(line) {
        console.log('=== DEBUG IVA EXTRACTION ===');
        console.log('Input:', line);
        
        const pattern = /^(\w{6,9})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML)\s+(\d+(?:[.,]\d+)?)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{1,2})$/;
        const normalized = line.trim().replace(/\s+/g, ' ');
        const match = normalized.match(pattern);
        
        if (match) {
            console.log('✅ Match trovato!');
            match.forEach((group, idx) => {
                if (idx === 0) return;
                console.log(`  [${idx}] = "${group}"`);
            });
            console.log(`IVA estratta: ${match[7]} → ${match[7]}%`);
        } else {
            console.log('❌ Nessun match');
            
            // Debug con split
            const words = normalized.split(/\s+/);
            console.log('Parole:', words);
        }
    };
    
    console.log('✅ [PERSISTENT] Fix IVA persistente installato');
    console.log('💡 Usa window.debugIVAExtraction(line) per debug');
    
})();