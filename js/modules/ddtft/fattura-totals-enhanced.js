/**
 * Fix avanzato per l'estrazione dei totali dalle fatture
 * Cerca pattern specifici per fatture italiane
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix avanzato totali fatture...');
    
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
    
    // Funzione per estrarre i totali dalla sezione finale
    function extractTotalsFromEnd(text) {
        console.log('[TOTALS ENHANCED] Analizzando sezione finale del documento...');
        
        // Prendi gli ultimi 1000 caratteri
        const endSection = text.substring(Math.max(0, text.length - 1000));
        
        // Log per debug
        console.log('[TOTALS ENHANCED] Sezione finale:', endSection.substring(endSection.length - 300));
        
        // Cerca pattern di totali alla fine del documento
        // Pattern: numero numero\n (dove il secondo è il totale)
        const totalLinePattern = /(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/m;
        const match = endSection.match(totalLinePattern);
        
        if (match) {
            const total = cleanNumber(match[2]);
            console.log(`[TOTALS ENHANCED] Trovato totale finale: €${total} (pattern: doppio numero)`);
            return total;
        }
        
        // Cerca pattern con "ALLA CONSEGNA" seguito dai totali
        const consegnaPattern = /ALLA\s+CONSEGNA\s*[\r\n]+\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i;
        const consegnaMatch = endSection.match(consegnaPattern);
        
        if (consegnaMatch) {
            const total = cleanNumber(consegnaMatch[2]);
            console.log(`[TOTALS ENHANCED] Trovato totale dopo ALLA CONSEGNA: €${total}`);
            return total;
        }
        
        // Cerca l'ultimo numero che sembra un totale (formato xx,xx o xxx,xx)
        const numbers = endSection.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g);
        if (numbers && numbers.length > 0) {
            // Prendi l'ultimo numero trovato
            const lastNumber = numbers[numbers.length - 1];
            const total = cleanNumber(lastNumber);
            if (total > 10) { // Assumiamo che un totale sia almeno €10
                console.log(`[TOTALS ENHANCED] Ultimo numero trovato come totale: €${total}`);
                return total;
            }
        }
        
        return 0;
    }
    
    // Funzione per estrarre imponibile e IVA
    function extractImponibileIva(text) {
        const result = { imponibile: 0, iva: 0 };
        
        // Cerca sezione con aliquote IVA (es. "04 4% - GENERICO 40,26 1,61")
        const ivaPattern = /(\d{2})\s+(\d+)%[^0-9]+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/g;
        let match;
        let totalImponibile = 0;
        let totalIva = 0;
        
        while ((match = text.match(ivaPattern)) !== null) {
            const imponibile = cleanNumber(match[3]);
            const iva = cleanNumber(match[4]);
            totalImponibile += imponibile;
            totalIva += iva;
            console.log(`[TOTALS ENHANCED] Trovata aliquota ${match[2]}%: imponibile €${imponibile}, IVA €${iva}`);
            text = text.substring(match.index + match[0].length);
        }
        
        if (totalImponibile > 0) {
            result.imponibile = totalImponibile;
            result.iva = totalIva;
            console.log(`[TOTALS ENHANCED] Totale imponibile: €${totalImponibile}, Totale IVA: €${totalIva}`);
        }
        
        return result;
    }
    
    // Override per FatturaExtractor
    function applyEnhancedTotalsFix(ExtractorClass, className) {
        if (!ExtractorClass || !ExtractorClass.prototype) return;
        
        const originalExtract = ExtractorClass.prototype.extract;
        
        ExtractorClass.prototype.extract = function() {
            console.log(`🎯 [TOTALS ENHANCED] Intercettato extract su ${className}`);
            
            // Chiama il metodo originale
            const result = originalExtract.call(this);
            
            // Se i totali sono 0 o mancanti, cerca di estrarli
            if (!result.totale || result.totale === 0) {
                console.log('[TOTALS ENHANCED] Totali mancanti, applico estrazione avanzata...');
                
                // Cerca totale nella sezione finale
                const totalFromEnd = extractTotalsFromEnd(this.text);
                if (totalFromEnd > 0) {
                    result.totale = totalFromEnd;
                    result.total = totalFromEnd;
                }
                
                // Estrai imponibile e IVA
                const { imponibile, iva } = extractImponibileIva(this.text);
                if (imponibile > 0) {
                    result.imponibile = imponibile;
                    result.subtotal = imponibile;
                    result.iva = iva;
                    result.vat = iva;
                    
                    // Se non abbiamo trovato il totale ma abbiamo imponibile e IVA
                    if (!result.totale || result.totale === 0) {
                        result.totale = imponibile + iva;
                        result.total = result.totale;
                        console.log(`[TOTALS ENHANCED] Totale calcolato: €${result.totale}`);
                    }
                }
                
                console.log(`[TOTALS ENHANCED] Risultati finali - Totale: €${result.totale}, Imponibile: €${result.imponibile || 0}, IVA: €${result.iva || 0}`);
            }
            
            // Fix anche per gli articoli
            if (result.items && result.items.length > 0) {
                result.items.forEach((item, index) => {
                    // Assicurati che quantity e price siano numeri
                    if (typeof item.quantity === 'string') {
                        item.quantity = cleanNumber(item.quantity);
                    }
                    if (typeof item.price === 'string') {
                        item.price = cleanNumber(item.price);
                    }
                    
                    // Calcola il totale dell'articolo
                    if (!item.total && item.quantity && item.price) {
                        item.total = item.quantity * item.price;
                        console.log(`[TOTALS ENHANCED] Calcolato totale articolo ${index + 1}: €${item.total.toFixed(2)}`);
                    }
                });
            }
            
            return result;
        };
        
        console.log(`✅ [TOTALS ENHANCED] Override applicato a ${className}`);
    }
    
    // Applica il fix
    setTimeout(() => {
        applyEnhancedTotalsFix(window.FatturaExtractor, 'FatturaExtractor');
        applyEnhancedTotalsFix(window.FatturaExtractorModular, 'FatturaExtractorModular');
        
        console.log('✅ Fix avanzato totali fatture completato');
    }, 200); // Aspetta un po' di più per essere sicuri che gli altri fix siano stati applicati
    
})();