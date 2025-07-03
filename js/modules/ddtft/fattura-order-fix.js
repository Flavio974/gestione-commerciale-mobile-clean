/**
 * Fix specifico per estrarre numeri ordine dalle fatture
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix ordine fatture...');
    
    // Override degli extractors di fattura
    function overrideFatturaExtractor(ExtractorClass, className) {
        if (!ExtractorClass || !ExtractorClass.prototype) return;
        
        const originalExtract = ExtractorClass.prototype.extract;
        if (!originalExtract) return;
        
        ExtractorClass.prototype.extract = function() {
            console.log(`[FATTURA ORDER FIX] Intercettato extract su ${className}`);
            
            const result = originalExtract.call(this);
            
            if (result && (!result.orderReference || !result.orderNumber)) {
                console.log('[FATTURA ORDER FIX] Cerco riferimento ordine nella fattura...');
                
                const lines = this.text.split('\n');
                
                // Cerca pattern ODV
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Pattern per "ODV Nr. 507A085AS00704"
                    const odvMatch = line.match(/ODV\s+Nr\.?\s*([A-Z0-9]+)/i);
                    if (odvMatch) {
                        console.log(`✅ [FATTURA ORDER FIX] Trovato ODV: ${odvMatch[1]}`);
                        result.orderReference = odvMatch[1];
                        result.orderNumber = odvMatch[1];
                        result.riferimentoOrdine = odvMatch[1];
                        break;
                    }
                    
                    // Pattern per altri formati di ordine che iniziano con 507
                    // IMPORTANTE: Cattura solo se 507 è seguito da lettere/numeri (es: 507A865AS02756)
                    // NON cattura "507" da solo o "507 SAFFIRIO" che è il codice operatore
                    const orderMatch = line.match(/\b(507[A-Z0-9]+)\b/);
                    if (orderMatch && orderMatch[1].length > 3) { // Deve essere più lungo di "507"
                        console.log(`✅ [FATTURA ORDER FIX] Trovato ordine 507: ${orderMatch[1]}`);
                        result.orderReference = orderMatch[1];
                        result.orderNumber = orderMatch[1];
                        result.riferimentoOrdine = orderMatch[1];
                        break;
                    }
                }
                
                // NON cercare "507" come fallback se è il codice operatore
                // Come richiesto dall'utente: "Se nei documenti originali non è presente 
                // il numero dell'ordine non deve essere aggiunto il numero '507' di default."
            }
            
            return result;
        };
        
        console.log(`✅ [FATTURA ORDER FIX] Override applicato a ${className}`);
    }
    
    // Applica il fix dopo il caricamento
    setTimeout(() => {
        if (window.FatturaExtractor) {
            overrideFatturaExtractor(window.FatturaExtractor, 'FatturaExtractor');
        }
        
        if (window.FatturaExtractorModular) {
            overrideFatturaExtractor(window.FatturaExtractorModular, 'FatturaExtractorModular');
        }
        
        console.log('✅ Fix ordine fatture completato');
    }, 100);
    
})();