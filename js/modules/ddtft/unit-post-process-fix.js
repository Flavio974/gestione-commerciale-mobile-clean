/**
 * Fix post-processing per sistemare l'unità di misura
 * Intercetta il risultato finale e sistema i campi
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix post-processing unità di misura...');
    
    // Pattern per riconoscere le unità di misura
    const UNIT_PATTERN = /\b(PZ|KG|CF|CT|LT|MT|GR|ML|NR|BT|SC|PF)\b$/i;
    
    // Intercetta il document parser
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('🎯 [UNIT POST-PROCESS] Intercettato parseDocumentFromText');
            
            // Chiama il metodo originale
            const result = originalParse.call(this, text, fileName);
            
            console.log('[UNIT POST-PROCESS] Risultato parse:', result);
            console.log('[UNIT POST-PROCESS] Tipo result:', typeof result);
            console.log('[UNIT POST-PROCESS] Keys:', result ? Object.keys(result) : 'null');
            
            // Controlla sia articoli che items
            const itemsArray = result?.articoli || result?.items;
            const itemsKey = result?.articoli ? 'articoli' : 'items';
            
            if (result && itemsArray && Array.isArray(itemsArray)) {
                console.log(`[UNIT POST-PROCESS] Processo ${itemsArray.length} ${itemsKey}`);
                
                result[itemsKey] = itemsArray.map((item, index) => {
                    // Se l'unità è già presente e valida, skip
                    if (item.unit && item.unit.trim()) {
                        console.log(`[UNIT POST-PROCESS] Articolo ${index}: unit già presente = "${item.unit}"`);
                        return item;
                    }
                    
                    // Cerca l'unità nella descrizione (può essere descrizione o description)
                    const desc = item.descrizione || item.description;
                    if (desc) {
                        const match = desc.match(UNIT_PATTERN);
                        if (match) {
                            const unit = match[1].toUpperCase();
                            const newDesc = desc.replace(UNIT_PATTERN, '').trim();
                            
                            console.log(`[UNIT POST-PROCESS] Articolo ${index}: trovata unit "${unit}" in descrizione`);
                            
                            const updatedItem = { ...item, unit: unit };
                            // Aggiorna il campo descrizione corretto
                            if (item.descrizione) updatedItem.descrizione = newDesc;
                            if (item.description) updatedItem.description = newDesc;
                            
                            return updatedItem;
                        }
                    }
                    
                    // Default a PZ se non trova nulla
                    console.log(`[UNIT POST-PROCESS] Articolo ${index}: nessuna unit trovata, uso default "PZ"`);
                    return {
                        ...item,
                        unit: 'PZ'
                    };
                });
            }
            
            return result;
        };
        
        console.log('✅ [UNIT POST-PROCESS] Fix applicato a DDTFTDocumentParser');
    }
    
    // Intercetta anche il normalizeDocumentFields se esiste
    if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
        const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
        
        window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
            const result = originalNormalize.call(this, doc);
            
            if (result && result.items && Array.isArray(result.items)) {
                result.items = result.items.map(item => {
                    // Cerca unit nel campo description
                    if (!item.unit && item.description) {
                        const match = item.description.match(UNIT_PATTERN);
                        if (match) {
                            return {
                                ...item,
                                description: item.description.replace(UNIT_PATTERN, '').trim(),
                                unit: match[1].toUpperCase()
                            };
                        }
                    }
                    
                    return {
                        ...item,
                        unit: item.unit || 'PZ'
                    };
                });
            }
            
            return result;
        };
        
        console.log('✅ [UNIT POST-PROCESS] Fix applicato a normalizeDocumentFields');
    }
    
})();