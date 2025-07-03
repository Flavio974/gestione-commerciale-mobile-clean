/**
 * Fix forzato per preservare il campo IVA durante l'estrazione
 * Questo fix intercetta OGNI chiamata a extractArticles e assicura che il campo IVA sia presente
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando FIX FORZATO per preservare IVA...');
    
    // Intercetta Object.defineProperty per catturare quando vengono definiti metodi
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj, prop, descriptor) {
        // Se stanno definendo extractArticles su un prototype
        if (prop === 'extractArticles' && descriptor && descriptor.value) {
            console.log('🎯 Intercettato tentativo di definire extractArticles su', obj);
            
            const originalMethod = descriptor.value;
            descriptor.value = function() {
                console.log('📦 extractArticles chiamato, applico wrapper IVA...');
                
                // Chiama il metodo originale
                const articles = originalMethod.apply(this, arguments);
                
                // Assicura che ogni articolo abbia il campo IVA preservato
                if (Array.isArray(articles)) {
                    console.log(`🔍 [WRAPPER] Verifico ${articles.length} articoli estratti...`);
                    articles.forEach((article, idx) => {
                        console.log(`📊 [WRAPPER] Articolo ${idx} (${article.code}): iva="${article.iva}", vat_rate="${article.vat_rate}"`);
                        // Se non ha IVA ma ha vat_rate, copia
                        if (!article.iva && article.vat_rate) {
                            article.iva = article.vat_rate;
                            console.log(`✅ [WRAPPER] Copiato vat_rate → iva per articolo ${idx}: ${article.iva}`);
                        }
                    });
                }
                
                return articles;
            };
        }
        
        return originalDefineProperty.call(this, obj, prop, descriptor);
    };
    
    // Funzione helper per verificare e fixare gli items in qualsiasi momento
    window.ensureIVAField = function(items) {
        if (!Array.isArray(items)) return items;
        
        items.forEach((item, idx) => {
            // Se non ha iva ma ha vat_rate, copia
            if (!item.iva && item.vat_rate) {
                item.iva = item.vat_rate;
                console.log(`✅ [ensureIVAField] Copiato vat_rate → iva per item ${idx}: ${item.iva}`);
            }
            // Se non ha nessuno dei due, usa default 10%
            if (!item.iva && !item.vat_rate) {
                // NON dedurre dal codice prodotto - usa sempre default 10%
                item.iva = '10%';
                console.log(`⚠️ [ensureIVAField] IVA mancante per ${item.code}, uso default 10%`);
            }
        });
        
        return items;
    };
    
    // Intercetta anche il metodo extract se esiste
    setTimeout(() => {
        ['DDTExtractor', 'DDTExtractorModular'].forEach(className => {
            if (window[className] && window[className].prototype) {
                const proto = window[className].prototype;
                
                // Wrap il metodo extract se esiste
                if (proto.extract) {
                    const originalExtract = proto.extract;
                    proto.extract = function() {
                        console.log(`🔄 ${className}.extract chiamato, applico wrapper IVA...`);
                        const result = originalExtract.apply(this, arguments);
                        
                        // Assicura che gli items abbiano il campo IVA
                        if (result && result.items) {
                            result.items = window.ensureIVAField(result.items);
                        }
                        
                        return result;
                    };
                }
            }
        });
    }, 1000);
    
    console.log('✅ FIX FORZATO IVA installato');
    
})();