/**
 * Fix per l'esportazione Excel dei documenti DDV
 * 
 * PROBLEMA: I documenti DDV non vengono esportati correttamente in Excel
 * Le descrizioni dei prodotti risultano vuote o "0"
 * 
 * SOLUZIONE: Intercetta il parsing DDV e assicura che i dati siano
 * nella struttura corretta per l'esportazione Excel
 */

(function() {
    'use strict';
    
    console.log('📊 [DDV EXPORT FIX] Applicando fix esportazione DDV...');
    
    // Override del parser DDT per garantire la struttura corretta degli items
    if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.parseDocumentFromText) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            // Se è un DDV, verifica la struttura degli articoli
            if (result && fileName && fileName.includes('DDV')) {
                console.log('📊 [DDV EXPORT FIX] Documento DDV rilevato, verifico struttura articoli...');
                
                if (result.items && Array.isArray(result.items)) {
                    console.log(`📊 [DDV EXPORT FIX] Trovati ${result.items.length} articoli`);
                    
                    // Verifica e correggi ogni articolo
                    result.items = result.items.map((item, index) => {
                        // Log del primo articolo per debug
                        if (index === 0) {
                            console.log('📊 [DDV EXPORT FIX] Struttura primo articolo:', item);
                        }
                        
                        // Se l'item non ha la struttura corretta, prova a estrarla
                        if (!item.description || item.description === "0" || item.description === "") {
                            console.log(`📊 [DDV EXPORT FIX] Articolo ${index + 1} senza descrizione valida`);
                            console.log(`📊 [DDV EXPORT FIX] Struttura item:`, item);
                            
                            // Cerca la descrizione nei vari campi possibili
                            const possibleDescFields = ['descrizione', 'desc', 'nome', 'denominazione', 'descrizioneProdotto'];
                            for (const field of possibleDescFields) {
                                if (item[field] && item[field] !== "0") {
                                    item.description = item[field];
                                    console.log(`📊 [DDV EXPORT FIX] Descrizione trovata in campo ${field}: ${item.description}`);
                                    break;
                                }
                            }
                            
                            // Se ancora non trovata, cerca in campi numerici (a volte la descrizione è in item[1])
                            if (!item.description || item.description === "0") {
                                for (let i = 0; i < 10; i++) {
                                    if (item[i] && typeof item[i] === 'string' && item[i].length > 5 && 
                                        item[i] !== "0" && !/^\d+$/.test(item[i]) && !item[i].includes(',')) {
                                        item.description = item[i];
                                        console.log(`📊 [DDV EXPORT FIX] Descrizione trovata in indice [${i}]: ${item.description}`);
                                        break;
                                    }
                                }
                            }
                        }
                        
                        // Assicura che tutti i campi necessari esistano
                        return {
                            code: item.code || item.codice || '',
                            description: item.description || item.descrizione || '',
                            unit: item.unit || item.um || item.unita || 'PZ',
                            quantity: item.quantity || item.quantita || item.qty || 0,
                            price: item.price || item.prezzo || 0,
                            discount: item.discount || item.sconto || 0,
                            total: item.total || item.totale || item.importo || 0,
                            vat: item.vat || item.iva || item.vatRate || '',
                            // Mantieni eventuali altri campi
                            ...item
                        };
                    });
                    
                    console.log('📊 [DDV EXPORT FIX] Articoli corretti per export');
                }
            }
            
            return result;
        };
    }
    
    // Override anche della funzione di preparazione dati per Excel
    if (window.DDTFTExportExcel && window.DDTFTExportExcel.prepareWorksheetData) {
        const originalPrepare = window.DDTFTExportExcel.prepareWorksheetData;
        
        window.DDTFTExportExcel.prepareWorksheetData = function(documents) {
            console.log('📊 [DDV EXPORT FIX] Intercettato prepareWorksheetData');
            
            // Correggi i documenti DDV prima della preparazione
            const correctedDocs = documents.map(doc => {
                if (doc.documentNumber && doc.documentNumber.toString().startsWith('5')) { // DDV spesso iniziano con 5
                    console.log(`📊 [DDV EXPORT FIX] Possibile DDV: ${doc.documentNumber}`);
                    
                    if (doc.items && Array.isArray(doc.items)) {
                        doc.items = doc.items.map(item => {
                            // Assicura che la descrizione sia presente
                            if (!item.description || item.description === "0") {
                                // Log di debug
                                console.log('📊 [DDV EXPORT FIX] Item senza descrizione:', item);
                                
                                // Prova a recuperare la descrizione
                                item.description = item.descrizione || item.desc || item.nome || 
                                                 `Prodotto ${item.code || ''}`;
                            }
                            return item;
                        });
                    }
                }
                return doc;
            });
            
            return originalPrepare.call(this, correctedDocs);
        };
    }
    
    console.log('✅ [DDV EXPORT FIX] Fix esportazione DDV installato');
    
})();