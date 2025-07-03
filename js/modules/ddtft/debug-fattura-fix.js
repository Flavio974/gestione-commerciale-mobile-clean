/**
 * Fix di DEBUG per capire perché le fatture non vengono estratte
 */

(function() {
    'use strict';
    
    console.log('🔍 DEBUG FIX FATTURE - Inizializzazione...');
    
    // Intercetta il parsing dei documenti
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('📄 [DEBUG] parseDocumentFromText chiamato');
            console.log('📄 [DEBUG] Nome file:', fileName);
            console.log('📄 [DEBUG] Lunghezza testo:', text ? text.length : 0);
            console.log('📄 [DEBUG] Prime 200 caratteri:', text ? text.substring(0, 200) : 'TESTO VUOTO');
            
            const result = originalParse.call(this, text, fileName);
            
            console.log('📄 [DEBUG] Risultato parsing:', result);
            if (result) {
                console.log('📄 [DEBUG] Tipo documento:', result.type);
                console.log('📄 [DEBUG] Numero items:', result.items ? result.items.length : 0);
                if (result.items && result.items.length > 0) {
                    console.log('📄 [DEBUG] Primo item:', result.items[0]);
                }
            }
            
            return result;
        };
    }
    
    // Intercetta la creazione di FatturaExtractor
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        checkCount++;
        
        if (window.FatturaExtractor) {
            console.log('✅ [DEBUG] FatturaExtractor trovato!');
            
            // Intercetta il costruttore
            const OriginalFatturaExtractor = window.FatturaExtractor;
            window.FatturaExtractor = function(text, metadata, fileName) {
                console.log('🏗️ [DEBUG] Creazione FatturaExtractor');
                console.log('   - fileName:', fileName);
                console.log('   - text length:', text ? text.length : 0);
                
                const instance = new OriginalFatturaExtractor(text, metadata, fileName);
                
                // Intercetta extract
                const originalExtract = instance.extract;
                instance.extract = function() {
                    console.log('📊 [DEBUG] FatturaExtractor.extract() chiamato');
                    const result = originalExtract.call(this);
                    console.log('📊 [DEBUG] Risultato extract:', result);
                    return result;
                };
                
                // Intercetta extractArticles
                const originalExtractArticles = instance.extractArticles;
                instance.extractArticles = function() {
                    console.log('📦 [DEBUG] FatturaExtractor.extractArticles() chiamato');
                    console.log('📦 [DEBUG] this._originalExtractArticles presente?', !!this._originalExtractArticles);
                    
                    // Se c'è il fix applicato, non fare nulla qui
                    if (this._originalExtractArticles) {
                        console.log('📦 [DEBUG] Fix già applicato, chiamo direttamente');
                        return originalExtractArticles.call(this);
                    }
                    
                    const articles = originalExtractArticles.call(this);
                    console.log('📦 [DEBUG] Articoli estratti:', articles ? articles.length : 0);
                    if (articles && articles.length > 0) {
                        console.log('📦 [DEBUG] Primo articolo:', articles[0]);
                    }
                    return articles;
                };
                
                return instance;
            };
            
            // Copia proprietà statiche
            Object.setPrototypeOf(window.FatturaExtractor, OriginalFatturaExtractor);
            window.FatturaExtractor.prototype = OriginalFatturaExtractor.prototype;
            
            clearInterval(checkInterval);
        }
        
        if (checkCount > 50) {
            console.log('❌ [DEBUG] FatturaExtractor non trovato dopo 50 tentativi');
            clearInterval(checkInterval);
        }
    }, 100);
    
    console.log('✅ [DEBUG] Fix debug fatture installato');
    
})();