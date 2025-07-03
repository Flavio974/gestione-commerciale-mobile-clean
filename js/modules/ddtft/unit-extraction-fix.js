/**
 * Fix per estrarre correttamente l'unità di misura dai documenti
 * Aggiunge il supporto per il campo 'unit' negli articoli
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix estrazione unità di misura...');
    
    // Pattern per riconoscere le unità di misura
    const UNIT_PATTERN = /^(PZ|KG|CF|CT|LT|MT|GR|ML|NR|BT|SC|PF)$/i;
    const UNITS = ['PZ', 'KG', 'CF', 'CT', 'LT', 'MT', 'GR', 'ML', 'NR', 'BT', 'SC', 'PF'];
    
    // Funzione per estrarre unità dalla descrizione
    function extractUnitFromDescription(description) {
        if (!description) return { description: description, unit: '' };
        
        const words = description.split(/\s+/);
        let unitIndex = -1;
        let unit = '';
        
        // Cerca l'unità dall'ultima parola andando indietro
        for (let i = words.length - 1; i >= 0; i--) {
            if (UNIT_PATTERN.test(words[i])) {
                unitIndex = i;
                unit = words[i].toUpperCase();
                break;
            }
        }
        
        if (unitIndex >= 0) {
            // Rimuovi l'unità dalla descrizione
            words.splice(unitIndex, 1);
            return {
                description: words.join(' ').trim(),
                unit: unit
            };
        }
        
        return { description: description, unit: '' };
    }
    
    // Override del metodo extractItems/extractArticles
    function overrideExtractMethod(ExtractorClass, className) {
        if (!ExtractorClass || !ExtractorClass.prototype) return;
        
        // Cerca il metodo giusto (potrebbe essere extractItems o extractArticles)
        const methodName = ExtractorClass.prototype.extractArticles ? 'extractArticles' : 'extractItems';
        
        if (!ExtractorClass.prototype[methodName]) {
            console.warn(`[UNIT FIX] Metodo ${methodName} non trovato in ${className}`);
            return;
        }
        
        const originalMethod = ExtractorClass.prototype[methodName];
        
        ExtractorClass.prototype[methodName] = function() {
            console.log(`🎯 [UNIT FIX] ${methodName} intercettato su ${className}`);
            
            // Chiama il metodo originale
            const items = originalMethod.call(this);
            
            if (!items || !Array.isArray(items)) {
                return items;
            }
            
            // Processa ogni articolo per estrarre l'unità
            const processedItems = items.map(item => {
                // Se l'unità è già presente e valida, mantienila
                if (item.unit && UNIT_PATTERN.test(item.unit)) {
                    console.log(`[UNIT FIX] Articolo ${item.code}: unità già presente = ${item.unit}`);
                    return item;
                }
                
                // Altrimenti cerca l'unità nella descrizione
                const { description, unit } = extractUnitFromDescription(item.description);
                
                if (unit) {
                    console.log(`[UNIT FIX] Articolo ${item.code}: estratta unità "${unit}" dalla descrizione`);
                    return {
                        ...item,
                        description: description,
                        unit: unit
                    };
                }
                
                // Se non trova l'unità, default a 'PZ'
                console.log(`[UNIT FIX] Articolo ${item.code}: nessuna unità trovata, uso default "PZ"`);
                return {
                    ...item,
                    unit: 'PZ'
                };
            });
            
            console.log(`[UNIT FIX] Processati ${processedItems.length} articoli`);
            return processedItems;
        };
        
        console.log(`✅ [UNIT FIX] Override applicato a ${className}.${methodName}`);
    }
    
    // Applica il fix dopo che tutti gli altri sono stati caricati
    setTimeout(() => {
        console.log('[UNIT FIX] Verifico extractors disponibili...');
        console.log('[UNIT FIX] DDTExtractor:', typeof window.DDTExtractor);
        console.log('[UNIT FIX] DDTExtractor.extractArticles:', typeof window.DDTExtractor?.prototype?.extractArticles);
        console.log('[UNIT FIX] DDTExtractor.extractItems:', typeof window.DDTExtractor?.prototype?.extractItems);
        // Applica a DDTExtractor
        if (window.DDTExtractor) {
            overrideExtractMethod(window.DDTExtractor, 'DDTExtractor');
        }
        
        // Applica a DDTExtractorModular
        if (window.DDTExtractorModular) {
            overrideExtractMethod(window.DDTExtractorModular, 'DDTExtractorModular');
        }
        
        // Applica a FatturaExtractor
        if (window.FatturaExtractor) {
            overrideExtractMethod(window.FatturaExtractor, 'FatturaExtractor');
        }
        
        // Applica a FatturaExtractorModular
        if (window.FatturaExtractorModular) {
            overrideExtractMethod(window.FatturaExtractorModular, 'FatturaExtractorModular');
        }
        
        console.log('✅ Fix estrazione unità di misura completato');
    }, 1000); // Aumentiamo il delay
    
    // Applica anche immediatamente per sicurezza
    if (window.DDTExtractor) {
        overrideExtractMethod(window.DDTExtractor, 'DDTExtractor-immediate');
    }
    
})();