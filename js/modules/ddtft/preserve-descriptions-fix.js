/**
 * Fix per preservare le descrizioni degli articoli durante il parsing
 * 
 * PROBLEMA: Le descrizioni degli articoli vengono perse o sostituite con "0"
 * durante le varie fasi di parsing e correzione
 * 
 * SOLUZIONE: Salva le descrizioni originali e le ripristina dopo ogni modifica
 */

(function() {
    'use strict';
    
    console.log('📝 [PRESERVE DESCRIPTIONS] Applicando fix preservazione descrizioni...');
    
    // Mappa per salvare le descrizioni originali per documento
    const descriptionsMap = new Map();
    
    // Override del master fix per preservare le descrizioni
    if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.parseDocumentFromText) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            // Prima del parsing, esegui il parser originale
            const result = originalParse.call(this, text, fileName);
            
            if (result && result.items && Array.isArray(result.items)) {
                // Salva le descrizioni originali PRIMA che il master fix le modifichi
                const docKey = `${result.documentNumber}_${Date.now()}`;
                const originalDescriptions = {};
                
                result.items.forEach((item, index) => {
                    if (item.description && item.description !== "0" && item.description !== "") {
                        originalDescriptions[item.code || index] = item.description;
                        console.log(`📝 [PRESERVE DESCRIPTIONS] Salvata descrizione per ${item.code}: ${item.description}`);
                    }
                });
                
                descriptionsMap.set(docKey, originalDescriptions);
                
                // Aggiungi la chiave al risultato per recuperarla dopo
                result._descKey = docKey;
            }
            
            return result;
        };
    }
    
    // Override anche della normalizzazione per ripristinare le descrizioni
    if (window.normalizeDocumentFields) {
        const originalNormalize = window.normalizeDocumentFields;
        
        window.normalizeDocumentFields = function(doc, text) {
            const result = originalNormalize.call(this, doc, text);
            
            // Se abbiamo salvato le descrizioni, ripristinale
            if (result && result._descKey && descriptionsMap.has(result._descKey)) {
                const savedDescriptions = descriptionsMap.get(result._descKey);
                
                if (result.items && Array.isArray(result.items)) {
                    result.items.forEach((item, index) => {
                        const key = item.code || index;
                        if (savedDescriptions[key] && (!item.description || item.description === "0")) {
                            console.log(`📝 [PRESERVE DESCRIPTIONS] Ripristino descrizione per ${key}: ${savedDescriptions[key]}`);
                            item.description = savedDescriptions[key];
                        }
                    });
                }
                
                // Pulisci la mappa per evitare memory leak
                descriptionsMap.delete(result._descKey);
                delete result._descKey;
            }
            
            return result;
        };
    }
    
    // Fix specifico per il master fix DDT
    const checkAndFixMasterFix = () => {
        if (window.processDDTArticles) {
            const originalProcess = window.processDDTArticles;
            
            window.processDDTArticles = function(items, lines) {
                // Salva le descrizioni prima del processing
                const savedDescs = {};
                items.forEach((item, index) => {
                    if (item.description && item.description !== "0") {
                        savedDescs[item.code || index] = item.description;
                    }
                });
                
                // Esegui il processing originale
                const result = originalProcess.call(this, items, lines);
                
                // Ripristina le descrizioni se perse
                if (result && Array.isArray(result)) {
                    result.forEach((item, index) => {
                        const key = item.code || index;
                        if (savedDescs[key] && (!item.description || item.description === "0")) {
                            console.log(`📝 [PRESERVE DESCRIPTIONS] Ripristino in processDDTArticles per ${key}`);
                            item.description = savedDescs[key];
                        }
                    });
                }
                
                return result;
            };
            
            console.log('✅ [PRESERVE DESCRIPTIONS] Override processDDTArticles applicato');
        }
    };
    
    // Applica il fix dopo un delay per essere sicuri che il master fix sia caricato
    setTimeout(checkAndFixMasterFix, 100);
    setTimeout(checkAndFixMasterFix, 500);
    setTimeout(checkAndFixMasterFix, 1000);
    
    console.log('✅ [PRESERVE DESCRIPTIONS] Fix preservazione descrizioni installato');
    
})();