/**
 * Fix specifico per estrazione data ordine da fatture (FT)
 * Evita di estrarre la data del documento invece della data dell'ordine
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix specifico data ordine fatture...');
    
    // Override del parser per fatture
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            // Solo per fatture
            if (result && (result.type === 'ft' || result.documentType === 'FT' || result.type === 'fattura')) {
                console.log(`[FT DATE FIX] Verifico data ordine per fattura con ordine ${result.orderNumber}`);
                
                // Se abbiamo un numero ordine ma la data ordine è uguale alla data documento,
                // probabilmente abbiamo estratto la data sbagliata
                if (result.orderNumber && result.orderDate === result.date) {
                    console.log(`⚠️ [FT DATE FIX] Data ordine uguale a data documento, ricerco...`);
                    result.orderDate = null; // Reset per ricercare
                }
                
                // Se non abbiamo la data ordine ma abbiamo il numero ordine
                if (result.orderNumber && !result.orderDate) {
                    console.log(`🔍 [FT DATE FIX] Ricerca specifica data per ordine ${result.orderNumber}`);
                    
                    const lines = text.split('\n');
                    let orderLineFound = false;
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        
                        // Salta righe che contengono FT + numero (sono righe del documento, non dell'ordine)
                        if (line.match(/FT\s+\d{4}/i)) {
                            console.log(`🚫 [FT DATE FIX] Skip riga documento: ${line}`);
                            continue;
                        }
                        
                        // Cerca solo righe che contengono il numero ordine
                        if (line.includes(result.orderNumber)) {
                            console.log(`📝 [FT DATE FIX] Trovata riga ordine: ${line}`);
                            orderLineFound = true;
                            
                            // Estrai data dalla riga corrente
                            let dateMatch = line.match(/del\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)/i);
                            
                            // Se non trovata, cerca nella riga successiva
                            if (!dateMatch && i < lines.length - 1) {
                                const nextLine = lines[i + 1];
                                dateMatch = nextLine.match(/del\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)/i) ||
                                           nextLine.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)/);
                            }
                            
                            if (dateMatch) {
                                let orderDate = dateMatch[1];
                                console.log(`📅 [FT DATE FIX] Data ordine grezza: ${orderDate}`);
                                
                                // Normalizza la data
                                const dateParts = orderDate.split(/[\/\-]/);
                                
                                if (dateParts.length === 2) {
                                    // Manca l'anno (es: "15/05")
                                    const day = dateParts[0].padStart(2, '0');
                                    const month = dateParts[1].padStart(2, '0');
                                    const year = new Date().getFullYear().toString();
                                    orderDate = `${day}/${month}/${year}`;
                                    console.log(`⚠️ [FT DATE FIX] Anno mancante, aggiunto: ${orderDate}`);
                                }
                                else if (dateParts.length === 3) {
                                    const day = dateParts[0].padStart(2, '0');
                                    const month = dateParts[1].padStart(2, '0');
                                    let year = dateParts[2];
                                    
                                    if (year.length === 2) {
                                        year = '20' + year;
                                    }
                                    
                                    orderDate = `${day}/${month}/${year}`;
                                }
                                
                                // Verifica che la data trovata sia diversa dalla data documento
                                if (orderDate !== result.date) {
                                    result.orderDate = orderDate;
                                    console.log(`✅ [FT DATE FIX] Data ordine estratta: ${result.orderDate}`);
                                } else {
                                    console.log(`⚠️ [FT DATE FIX] Data trovata uguale a data documento, ignoro`);
                                }
                                
                                break;
                            }
                        }
                    }
                    
                    if (!result.orderDate && orderLineFound) {
                        console.log(`⚠️ [FT DATE FIX] Riga ordine trovata ma nessuna data estratta`);
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [FT DATE FIX] Override applicato');
    }
    
})();