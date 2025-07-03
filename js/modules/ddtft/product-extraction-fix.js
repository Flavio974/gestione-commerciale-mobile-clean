/**
 * Fix per l'estrazione dei prodotti dai documenti DDT/FT
 * Migliora l'estrazione dei prezzi e importi
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix per estrazione prodotti DDT/FT...');
    
    // Funzione per applicare il fix
    function applyProductExtractionFix() {
        // Fix per DDTExtractor
        if (window.DDTExtractor && window.DDTExtractor.prototype) {
            const originalExtractArticles = window.DDTExtractor.prototype.extractArticles;
            
            window.DDTExtractor.prototype.extractArticles = function() {
                this.log('🔍 [FIX] Estrazione articoli migliorata...');
                
                const articles = [];
                const lines = this.text.split('\n');
                
                // STRATEGIA 1: Cerca pattern tabellare più flessibile
                this.log('📊 [FIX] Cerco tabella articoli con pattern migliorato...');
                
                // Pattern per righe prodotto nel formato:
                // CODICE DESCRIZIONE UM QTA PREZZO SCONTO IMPORTO IVA
                const productLinePattern = /^(\w{6,9})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML)\s+(\d+(?:[.,]\d+)?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{1,2})$/;
                
                // Pattern più specifico per DDV/DDT Alfieri
                // Cattura: CODICE, DESCRIZIONE, UM, QTA, PREZZO, SCONTO, IMPORTO, IVA
                const alfieriPattern = /^(\w{6,9})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML)\s+(\d+(?:[.,]\d+)?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{1,2})$/;
                
                // Pattern più flessibile per catturare anche formati con spazi irregolari
                const flexiblePattern = /^(\w{6,9})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML)\s+(\d+(?:[.,]\d+)?)\s+.*?([\d.,]+)\s+(\d{1,2})$/;
                
                let inProductSection = false;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Inizia sezione prodotti
                    if (line.includes('Codice') && line.includes('Descrizione') && 
                        (line.includes('Importo') || line.includes('Q.tà'))) {
                        inProductSection = true;
                        this.log('✅ [FIX] Trovata intestazione tabella prodotti');
                        continue;
                    }
                    
                    // Fine sezione prodotti
                    if (inProductSection && 
                        (line.includes('IMPONIBILE') || line.includes('TOTALE') || 
                         line.includes('Totale documento') || line.includes('Aspetto esteriore'))) {
                        this.log('📊 [FIX] Fine tabella prodotti');
                        break;
                    }
                    
                    if (inProductSection || !line.includes('Codice')) { // Prova anche senza sezione
                        // Normalizza la riga (sostituisci spazi multipli con singolo spazio)
                        const normalizedLine = line.replace(/\s+/g, ' ');
                        
                        // Prova prima il pattern completo
                        let match = normalizedLine.match(productLinePattern);
                        
                        if (match) {
                            const [_, code, description, unit, quantity, price, discount, amount, vat] = match;
                            
                            const article = {
                                code: code,
                                description: description.trim(),
                                quantity: this.cleanNumber(quantity).toString(),
                                unit: unit,
                                price: this.cleanNumber(price).toFixed(2),
                                discount: this.cleanNumber(discount).toFixed(2),
                                total: this.cleanNumber(amount).toFixed(2),
                                iva: vat + '%'
                            };
                            
                            articles.push(article);
                            this.log(`✅ [FIX] Prodotto estratto: ${code} - ${description} - €${article.total}`);
                        } else {
                            // Prova pattern Alfieri
                            match = normalizedLine.match(alfieriPattern);
                            
                            if (match) {
                                const [_, code, description, unit, quantity, price, discount, amount, vat] = match;
                                
                                const article = {
                                    code: code,
                                    description: description.trim(),
                                    quantity: this.cleanNumber(quantity).toString(),
                                    unit: unit,
                                    price: this.cleanNumber(price).toFixed(2),
                                    discount: this.cleanNumber(discount).toFixed(2),
                                    total: this.cleanNumber(amount).toFixed(2),
                                    iva: vat + '%'
                                };
                                
                                articles.push(article);
                                this.log(`✅ [FIX] Prodotto estratto (Alfieri): ${code} - ${description} - Q:${article.quantity} P:€${article.price} T:€${article.total}`);
                            }
                        } else {
                            // Prova pattern flessibile se non trova match completo
                            match = normalizedLine.match(flexiblePattern);
                            
                            if (match) {
                                const [_, code, description, unit, quantity, amount, vat] = match;
                                
                                // Estrai importo più accuratamente
                                // Cerca tutti i numeri dopo la quantità
                                const afterQuantity = normalizedLine.substring(normalizedLine.indexOf(quantity) + quantity.length);
                                const numbers = afterQuantity.match(/[\d.,]+/g) || [];
                                
                                // L'importo è tipicamente il penultimo numero (prima dell'IVA)
                                let importo = '0.00';
                                if (numbers.length >= 2) {
                                    // Prendi il numero prima dell'IVA
                                    importo = this.cleanNumber(numbers[numbers.length - 2]).toFixed(2);
                                } else if (numbers.length === 1) {
                                    importo = this.cleanNumber(numbers[0]).toFixed(2);
                                }
                                
                                const article = {
                                    code: code,
                                    description: description.trim(),
                                    quantity: this.cleanNumber(quantity).toString(),
                                    unit: unit,
                                    price: '0.00',
                                    discount: '0.00',
                                    total: importo,
                                    iva: vat + '%'
                                };
                                
                                articles.push(article);
                                this.log(`✅ [FIX] Prodotto estratto (flex): ${code} - ${description} - €${article.total}`);
                            }
                        }
                    }
                }
                
                // Se non trova nulla con il nuovo metodo, usa l'originale come fallback
                if (articles.length === 0) {
                    this.log('⚠️ [FIX] Nessun prodotto trovato con pattern migliorato, uso metodo originale...');
                    
                    // Prima di usare il metodo originale, verifica se è un DDV
                    if (this.fileName && this.fileName.includes('DDV')) {
                        this.log('📋 [FIX] Documento DDV rilevato, skip metodo word-based difettoso');
                        // Per DDV vuoti, ritorna array vuoto piuttosto che usare il metodo difettoso
                        return [];
                    }
                    
                    return originalExtractArticles.call(this);
                }
                
                this.log(`📊 [FIX] Totale articoli estratti: ${articles.length}`);
                
                // Calcola e mostra riepilogo
                let totaleImponibile = 0;
                articles.forEach((art, idx) => {
                    const importo = parseFloat(art.total) || 0;
                    totaleImponibile += importo;
                    this.log(`   [${idx+1}] ${art.code}: ${art.quantity} ${art.unit} = €${art.total} (IVA ${art.iva})`);
                });
                this.log(`   TOTALE IMPONIBILE: €${totaleImponibile.toFixed(2)}`);
                
                return articles;
            };
        }
        
        // Applica lo stesso fix alle versioni modulari se presenti
        if (window.DDTExtractorModular) {
            console.log('🔧 Applicando fix anche a DDTExtractorModular...');
            
            // Salva il metodo originale modulare
            const originalModularExtractArticles = window.DDTExtractorModular.prototype.extractArticles;
            
            // Sovrascrivi con una versione che usa il fix
            window.DDTExtractorModular.prototype.extractArticles = function() {
                this.log('🔍 [FIX MODULAR] Estrazione articoli migliorata...');
                
                // Se ha mappings.ARTICLE_CODES, aggiorna temporaneamente
                if (this.mappings && this.mappings.ARTICLE_CODES) {
                    const originalCodes = this.articleCodes;
                    this.articleCodes = this.mappings.ARTICLE_CODES;
                    
                    // Chiama il metodo fixato della classe base
                    const result = window.DDTExtractor.prototype.extractArticles.call(this);
                    
                    this.articleCodes = originalCodes;
                    return result;
                }
                
                // Altrimenti usa direttamente il metodo fixato
                return window.DDTExtractor.prototype.extractArticles.call(this);
            };
            
            window.DDTExtractorModular.prototype._productExtractionFixApplied = true;
        }
        
        console.log('✅ Fix estrazione prodotti DDT/FT applicato con successo');
    }
    
    // Applica il fix con retry
    let attempts = 0;
    const maxAttempts = 10;
    
    function tryApplyFix() {
        attempts++;
        
        if (window.DDTExtractor && window.DDTExtractor.prototype && 
            window.DDTExtractorModular && window.DDTExtractorModular.prototype) {
            applyProductExtractionFix();
        } else if (attempts < maxAttempts) {
            const status = [];
            if (!window.DDTExtractor) status.push('DDTExtractor mancante');
            if (!window.DDTExtractorModular) status.push('DDTExtractorModular mancante');
            console.log(`⏳ Tentativo ${attempts}/${maxAttempts} - ${status.join(', ')}`);
            setTimeout(tryApplyFix, 200);
        } else {
            console.error('❌ Impossibile applicare fix estrazione prodotti - Extractors non trovati');
        }
    }
    
    // Inizia il tentativo
    tryApplyFix();
})();