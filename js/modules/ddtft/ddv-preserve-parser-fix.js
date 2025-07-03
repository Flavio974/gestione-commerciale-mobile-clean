/**
 * Fix per preservare i dati corretti estratti dal DDT parser completo
 * 
 * PROBLEMA: Il master fix sovrascrive i dati già estratti correttamente
 * dal DDT parser completo, perdendo le descrizioni degli articoli
 * 
 * SOLUZIONE: Quando il parser completo ha già estratto correttamente
 * gli articoli (con descrizioni valide), NON permettere al master fix
 * di sovrascriverli
 */

(function() {
    'use strict';
    
    console.log('🛡️ [DDV PRESERVE PARSER] Applicando fix preservazione parser DDV...');
    
    // Flag per identificare quando il parser completo ha già estratto i dati
    let parserCompletoUsed = false;
    let lastGoodItems = null;
    
    // Intercetta il parser completo per salvare i dati buoni
    const interceptParserCompleto = () => {
        // Cerca la funzione nel window o nei moduli
        const checkAndIntercept = () => {
            // Se esiste una funzione che logga "[DDT PARSER COMPLETO]"
            const originalLog = console.log;
            console.log = function(...args) {
                // Cattura quando il parser completo ha estratto articoli
                if (args[0] && typeof args[0] === 'string') {
                    if (args[0].includes('[DDT PARSER COMPLETO] Articolo:') && args[1]) {
                        parserCompletoUsed = true;
                        console.log('🛡️ [DDV PRESERVE PARSER] Parser completo ha estratto articoli con successo');
                    }
                }
                originalLog.apply(console, args);
            };
        };
        
        checkAndIntercept();
    };
    
    // Intercetta il master fix per prevenire la sovrascrittura
    const protectFromMasterFix = () => {
        if (window.processDDTArticles) {
            const originalProcess = window.processDDTArticles;
            
            window.processDDTArticles = function(items, lines) {
                // Se gli articoli hanno già descrizioni valide, non processarli
                if (items && items.length > 0) {
                    const hasValidDescriptions = items.every(item => 
                        item.description && 
                        item.description !== "0" && 
                        item.description !== "" &&
                        item.description.length > 3
                    );
                    
                    if (hasValidDescriptions) {
                        console.log('🛡️ [DDV PRESERVE PARSER] Articoli già hanno descrizioni valide, skip master fix');
                        return items; // Ritorna gli articoli originali senza modifiche
                    }
                }
                
                // Altrimenti procedi normalmente
                return originalProcess.call(this, items, lines);
            };
        }
    };
    
    // Override più aggressivo del parseDocumentFromText
    if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.parseDocumentFromText) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            // Se è un DDV e ha articoli validi
            if (result && fileName && fileName.includes('DDV') && result.items && result.items.length > 0) {
                console.log('🛡️ [DDV PRESERVE PARSER] Verifico integrità articoli DDV...');
                
                // Salva una copia degli articoli originali
                const originalItems = JSON.parse(JSON.stringify(result.items));
                
                // Aggiungi un flag per indicare che questi articoli sono protetti
                result._itemsProtected = true;
                result._originalItems = originalItems;
                
                // Log degli articoli per debug
                console.log('🛡️ [DDV PRESERVE PARSER] Articoli originali salvati:', 
                    originalItems.map(item => ({
                        code: item.code,
                        description: item.description,
                        hasValidDesc: item.description && item.description !== "0" && item.description.length > 3
                    }))
                );
            }
            
            return result;
        };
    }
    
    // Override della normalizzazione per ripristinare gli articoli se necessario
    if (window.normalizeDocumentFields) {
        const originalNormalize = window.normalizeDocumentFields;
        
        window.normalizeDocumentFields = function(doc, text) {
            const result = originalNormalize.call(this, doc, text);
            
            // Se gli articoli erano protetti e sono stati danneggiati, ripristinali
            if (result && result._itemsProtected && result._originalItems) {
                const currentItems = result.items || [];
                
                // Controlla se gli articoli sono stati danneggiati
                const damaged = currentItems.some(item => 
                    !item.description || item.description === "0" || item.description === ""
                );
                
                if (damaged) {
                    console.log('🛡️ [DDV PRESERVE PARSER] Articoli danneggiati rilevati, ripristino originali...');
                    result.items = result._originalItems;
                    
                    // Rimuovi i flag temporanei
                    delete result._itemsProtected;
                    delete result._originalItems;
                }
            }
            
            return result;
        };
    }
    
    // Inizializza le interceptazioni
    interceptParserCompleto();
    setTimeout(protectFromMasterFix, 100);
    setTimeout(protectFromMasterFix, 500);
    setTimeout(protectFromMasterFix, 1000);
    
    console.log('✅ [DDV PRESERVE PARSER] Fix preservazione parser DDV installato');
    
})();