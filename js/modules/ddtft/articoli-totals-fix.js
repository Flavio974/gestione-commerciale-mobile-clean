/**
 * Fix per correggere i totali di riga degli articoli nelle fatture
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix totali articoli...');
    
    // Funzione helper per pulire i numeri
    function cleanNumber(str) {
        if (!str) return 0;
        // Rimuove tutto tranne numeri, virgole e punti
        let cleaned = str.toString().replace(/[^\d.,]/g, '');
        // Gestisce formato italiano (1.234,56)
        if (cleaned.includes(',')) {
            // Se c'è una virgola, assumiamo formato italiano
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        }
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }
    
    // Override per FatturaExtractor
    function applyArticoliTotalsFix(ExtractorClass, className) {
        if (!ExtractorClass || !ExtractorClass.prototype) return;
        
        const originalExtractItems = ExtractorClass.prototype.extractItems;
        
        ExtractorClass.prototype.extractItems = function() {
            console.log(`🎯 [ARTICOLI TOTALS FIX] Intercettato extractItems su ${className}`);
            
            // Prima chiama il metodo originale
            let items = originalExtractItems ? originalExtractItems.call(this) : [];
            
            console.log(`[ARTICOLI TOTALS FIX] Articoli originali: ${items.length}`);
            
            // Se non ha trovato articoli o sono incompleti, proviamo con pattern più specifici
            if (items.length === 0 || !items[0].total) {
                console.log('[ARTICOLI TOTALS FIX] Ricerco articoli con pattern migliorato...');
                
                const lines = this.text.split('\n');
                items = [];
                
                // Pattern per righe articolo fattura
                // Es: "070017 TAJARIN UOVO SACCHETTO ALFIERI 250G PZ 10,000 2,1900 4,00 21,01 10 000"
                const articlePattern = /^(\d{6}|[A-Z]{2}\d{6})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML|NR|BT|SC|PF)\s+(\d+[,.]?\d*)\s+(\d+[,.]?\d*)\s+(\d+[,.]?\d*)\s+(\d+[,.]?\d*)\s+(\d+)\s+/;
                
                // Pattern alternativo senza unità di misura esplicita
                const altPattern = /^(\d{6}|[A-Z]{2}\d{6})\s+(.+?)\s+(\d+[,.]?\d*)\s+(\d+[,.]?\d*)\s+(\d+[,.]?\d*)\s+(\d+[,.]?\d*)\s+(\d+)\s+/;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    let match = line.match(articlePattern);
                    let hasUnit = true;
                    
                    if (!match) {
                        match = line.match(altPattern);
                        hasUnit = false;
                    }
                    
                    if (match) {
                        let item;
                        
                        if (hasUnit) {
                            // Con unità di misura
                            item = {
                                code: match[1],
                                description: match[2].trim(),
                                unit: match[3],
                                quantity: cleanNumber(match[4]),
                                price: cleanNumber(match[5]),
                                discount: cleanNumber(match[6]),
                                total: cleanNumber(match[7]),
                                vatCode: match[8]
                            };
                        } else {
                            // Senza unità di misura - dobbiamo estrarre l'unità dalla descrizione
                            const desc = match[2].trim();
                            const unitMatch = desc.match(/\b(PZ|KG|CF|CT|LT|MT|GR|ML|NR|BT|SC|PF)\b/);
                            
                            item = {
                                code: match[1],
                                description: desc,
                                unit: unitMatch ? unitMatch[1] : '',
                                quantity: cleanNumber(match[3]),
                                price: cleanNumber(match[4]),
                                discount: cleanNumber(match[5]),
                                total: cleanNumber(match[6]),
                                vatCode: match[7]
                            };
                        }
                        
                        // Calcola il totale se manca o è zero
                        if (!item.total || item.total === 0) {
                            item.total = item.quantity * item.price;
                            if (item.discount > 0) {
                                item.total = item.total * (1 - item.discount / 100);
                            }
                        }
                        
                        console.log(`[ARTICOLI TOTALS FIX] Articolo trovato: ${item.code} - ${item.description} - Q:${item.quantity} x €${item.price} = €${item.total}`);
                        items.push(item);
                    }
                }
            }
            
            // Verifica e correggi i totali di tutti gli articoli
            items = items.map((item, index) => {
                // Assicurati che quantity e price siano numeri
                if (typeof item.quantity === 'string') {
                    item.quantity = cleanNumber(item.quantity);
                }
                if (typeof item.price === 'string') {
                    item.price = cleanNumber(item.price);
                }
                if (typeof item.total === 'string') {
                    item.total = cleanNumber(item.total);
                }
                
                // Se il totale è zero o mancante, calcolalo
                if (!item.total || item.total === 0) {
                    item.total = item.quantity * item.price;
                    console.log(`[ARTICOLI TOTALS FIX] Calcolato totale per articolo ${index + 1}: €${item.total.toFixed(2)}`);
                }
                
                // Verifica che il totale sia corretto
                const expectedTotal = item.quantity * item.price;
                if (Math.abs(item.total - expectedTotal) > 0.5) {
                    console.warn(`[ARTICOLI TOTALS FIX] Totale non corretto per ${item.code}: trovato €${item.total}, atteso €${expectedTotal}`);
                }
                
                return item;
            });
            
            console.log(`[ARTICOLI TOTALS FIX] Totale articoli processati: ${items.length}`);
            return items;
        };
        
        console.log(`✅ [ARTICOLI TOTALS FIX] Override applicato a ${className}.extractItems`);
    }
    
    // Applica il fix
    setTimeout(() => {
        applyArticoliTotalsFix(window.FatturaExtractor, 'FatturaExtractor');
        applyArticoliTotalsFix(window.FatturaExtractorModular, 'FatturaExtractorModular');
        
        console.log('✅ Fix totali articoli completato');
    }, 300);
    
})();