/**
 * Debug per analizzare l'estrazione degli articoli
 */

(function() {
    'use strict';
    
    console.log('🔍 Debug articoli abilitato...');
    
    // Intercetta il parsing per vedere gli articoli
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && result.items && result.items.length > 0) {
                console.log('📦 [DEBUG ARTICOLI] Articoli nel documento:');
                console.log('----------------------------------------');
                
                result.items.forEach((item, index) => {
                    console.log(`Articolo ${index + 1}:`);
                    console.log(`  Codice: ${item.code}`);
                    console.log(`  Descrizione: ${item.description}`);
                    console.log(`  Unità: ${item.unit || 'N/D'}`);
                    console.log(`  Quantità: ${item.quantity}`);
                    console.log(`  Prezzo: €${item.price}`);
                    console.log(`  Sconto: ${item.discount || 0}%`);
                    console.log(`  Totale: €${item.total || 0}`);
                    console.log(`  IVA: ${item.vatCode || item.iva || 'N/D'}%`);
                    console.log('  ---');
                });
                
                // Calcola e mostra i totali
                let totaleArticoli = 0;
                result.items.forEach(item => {
                    const total = parseFloat(item.total) || 0;
                    totaleArticoli += total;
                });
                
                console.log(`📊 TOTALE ARTICOLI: €${totaleArticoli.toFixed(2)}`);
                console.log(`📊 TOTALE DOCUMENTO: €${result.total || result.totale || 0}`);
                console.log('----------------------------------------');
                
                // Cerca nel testo le righe degli articoli per debug
                const lines = text.split('\n');
                let inArticleSection = false;
                console.log('🔍 [DEBUG ARTICOLI] Righe che potrebbero essere articoli:');
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // Cerca l'inizio della sezione articoli
                    if (line.includes('CODICE') && line.includes('DESCRIZIONE') && line.includes('PREZZO')) {
                        inArticleSection = true;
                        console.log(`[Riga ${i}] HEADER ARTICOLI: ${line}`);
                        continue;
                    }
                    
                    // Se siamo nella sezione articoli
                    if (inArticleSection) {
                        // Fermati se troviamo totali o fine sezione
                        if (line.includes('Totale merce') || line.includes('Totale IVA') || 
                            line.includes('Scadenze') || line.trim() === '') {
                            if (line.trim() !== '') {
                                console.log(`[Riga ${i}] FINE ARTICOLI: ${line}`);
                                inArticleSection = false;
                            }
                            continue;
                        }
                        
                        // Mostra righe che potrebbero essere articoli
                        if (line.match(/^\d{6}/) || line.match(/^[A-Z]{2}\d{6}/)) {
                            console.log(`[Riga ${i}] POSSIBILE ARTICOLO: ${line}`);
                        }
                    }
                }
            }
            
            return result;
        };
    }
    
})();