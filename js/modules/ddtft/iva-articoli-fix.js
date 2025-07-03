/**
 * Fix specifico per correggere l'estrazione dell'IVA per singolo articolo
 * Risolve il problema dove articoli con IVA 4% vengono marcati come 10%
 */

(function() {
    'use strict';
    
    console.log('🎯 Applicando fix specifico IVA articoli...');
    
    // Override del parsing
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[IVA ARTICOLI FIX] Intercettato parseDocumentFromText');
            
            // Chiama il metodo originale
            const result = originalParse.call(this, text, fileName);
            
            // Se è una fattura con articoli
            if (result && (result.type === 'ft' || result.documentType === 'FT') && result.items) {
                console.log('[IVA ARTICOLI FIX] Analizzando IVA per ogni articolo...');
                
                // Dividi il testo in righe per analisi più precisa
                const lines = text.split('\n');
                
                // Mappa per memorizzare l'IVA corretta per ogni codice articolo
                const ivaPerArticolo = new Map();
                
                // Pattern più specifici per catturare l'IVA alla fine della riga articolo
                // Cerca righe che iniziano con codice articolo
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // Pattern per identificare righe articolo
                    // Codice (6 cifre) seguito da descrizione, quantità, prezzi e IVA alla fine
                    const articleMatch = line.match(/^(\d{6}|[A-Z]{2}\d{6})\s+.+\s+(\d{1,2})\s*$/);
                    
                    if (articleMatch) {
                        const codice = articleMatch[1];
                        const possibleIVA = articleMatch[2];
                        
                        // Verifica che sia un'aliquota IVA valida (tipicamente 4, 10, 22)
                        if (['4', '04', '10', '22'].includes(possibleIVA)) {
                            ivaPerArticolo.set(codice, possibleIVA.padStart(2, '0'));
                            console.log(`[IVA ARTICOLI FIX] Trovata IVA ${possibleIVA}% per articolo ${codice}`);
                        }
                    }
                    
                    // Pattern alternativo più complesso per righe articolo complete
                    // Cattura l'ultimo numero che potrebbe essere l'IVA
                    const complexMatch = line.match(/^(\d{6}|[A-Z]{2}\d{6})\s+.*\s+\d+[,.]?\d*\s+\d+[,.]?\d*\s+\d+[,.]?\d*\s+\d+[,.]?\d*\s+(\d{1,2})\s*$/);
                    
                    if (complexMatch && !ivaPerArticolo.has(complexMatch[1])) {
                        const codice = complexMatch[1];
                        const possibleIVA = complexMatch[2];
                        
                        if (['4', '04', '10', '22'].includes(possibleIVA)) {
                            ivaPerArticolo.set(codice, possibleIVA.padStart(2, '0'));
                            console.log(`[IVA ARTICOLI FIX] Trovata IVA ${possibleIVA}% per articolo ${codice} (pattern 2)`);
                        }
                    }
                    
                    // Pattern specifico per catturare righe con spazi multipli
                    // Es: "070017 TAJARIN UOVO SACCHETTO ALFIERI 250G PZ 10,000 2,1900 4,00 21,01 4"
                    const spacedMatch = line.match(/^(\d{6}|[A-Z]{2}\d{6})\s+.+?\s+\d+[,.]?\d*\s+\d+[,.]?\d*\s+\d+[,.]?\d*\s+\d+[,.]?\d*\s+(\d{1,2})(?:\s+\d{3})?\s*$/);
                    
                    if (spacedMatch && !ivaPerArticolo.has(spacedMatch[1])) {
                        const codice = spacedMatch[1];
                        const possibleIVA = spacedMatch[2];
                        
                        if (['4', '04', '10', '22'].includes(possibleIVA)) {
                            ivaPerArticolo.set(codice, possibleIVA.padStart(2, '0'));
                            console.log(`[IVA ARTICOLI FIX] Trovata IVA ${possibleIVA}% per articolo ${codice} (pattern 3)`);
                        }
                    }
                }
                
                // Debug: cerca pattern "IVA 4%" o "aliquota 4%" nel documento
                const iva4Match = text.match(/(?:IVA|aliquota)\s*4%/gi);
                if (iva4Match) {
                    console.log('[IVA ARTICOLI FIX] Documento contiene riferimenti a IVA 4%');
                }
                
                // Applica le correzioni agli articoli
                result.items = result.items.map((item, index) => {
                    const ivaCorretta = ivaPerArticolo.get(item.code);
                    
                    if (ivaCorretta) {
                        // Se abbiamo trovato l'IVA corretta per questo articolo
                        if (item.vatCode !== ivaCorretta || item.iva !== ivaCorretta) {
                            console.log(`✅ [IVA ARTICOLI FIX] Corretto articolo ${item.code}: IVA ${item.vatCode || item.iva}% -> ${ivaCorretta}%`);
                            item.vatCode = ivaCorretta;
                            item.iva = ivaCorretta;
                            item.aliquotaIVA = ivaCorretta;
                        }
                    } else if (item.vatCode === '10' || item.iva === '10') {
                        // Se l'articolo ha IVA 10% ma non l'abbiamo trovata nel testo,
                        // potrebbe essere un errore. Cerca indizi nel nome prodotto
                        
                        // Prodotti alimentari spesso hanno IVA 4%
                        const descrizione = (item.description || '').toLowerCase();
                        const prodottiIVA4 = [
                            'pane', 'pasta', 'riso', 'farina', 'latte', 'uova', 'formaggio',
                            'verdura', 'frutta', 'carne', 'pesce', 'olio', 'burro',
                            'tajarin', 'agnolotti', 'ravioli', 'gnocchi', 'pizza'
                        ];
                        
                        const isAlimentare = prodottiIVA4.some(prod => descrizione.includes(prod));
                        
                        if (isAlimentare) {
                            console.log(`⚠️ [IVA ARTICOLI FIX] Articolo ${item.code} (${item.description}) sembra alimentare, possibile IVA 4% invece di 10%`);
                            
                            // Cerca conferma nel testo
                            const articleLineRegex = new RegExp(`${item.code}\\s+.*\\s+(\\d{1,2})\\s*$`, 'i');
                            const lineMatch = text.match(articleLineRegex);
                            
                            if (lineMatch && lineMatch[1] === '4') {
                                item.vatCode = '04';
                                item.iva = '04';
                                item.aliquotaIVA = '04';
                                console.log(`✅ [IVA ARTICOLI FIX] Confermato: ${item.code} ha IVA 4%`);
                            }
                        }
                    }
                    
                    return item;
                });
                
                // Verifica finale: controlla se ci sono ancora articoli con IVA errata
                const articoliIVA10 = result.items.filter(item => item.vatCode === '10' || item.iva === '10').length;
                const articoliIVA4 = result.items.filter(item => item.vatCode === '04' || item.iva === '04').length;
                
                console.log(`[IVA ARTICOLI FIX] Riepilogo IVA: ${articoliIVA4} articoli al 4%, ${articoliIVA10} articoli al 10%`);
                
                // Se TUTTI gli articoli hanno IVA 10% ma nel documento c'è riferimento a IVA 4%
                if (articoliIVA10 === result.items.length && articoliIVA4 === 0 && iva4Match) {
                    console.warn('[IVA ARTICOLI FIX] Attenzione: tutti gli articoli hanno IVA 10% ma il documento menziona IVA 4%');
                }
            }
            
            return result;
        };
        
        console.log('✅ [IVA ARTICOLI FIX] Override applicato');
    }
    
})();