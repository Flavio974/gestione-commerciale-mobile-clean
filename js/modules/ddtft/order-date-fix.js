/**
 * Fix per l'estrazione corretta della data ordine dai PDF DDT/FT
 * La data ordine si trova tipicamente sulla stessa riga del numero ordine
 * 
 * IMPORTANTE: La data dell'ordine è diversa dalla data del documento!
 * - Data ordine: quando il cliente ha fatto l'ordine (es: "RIF. ORDINE 507XYZ del 15/11/24")
 * - Data documento: quando è stato emesso il DDT o la Fattura
 */

(function() {
    'use strict';
    
    console.log('📅 Applicando fix estrazione data ordine...');
    
    // Override del parser base per migliorare l'estrazione della data ordine
    if (window.BaseExtractor) {
        const originalExtractOrderReference = window.BaseExtractor.prototype.extractOrderReference;
        
        window.BaseExtractor.prototype.extractOrderReference = function() {
            // Prima chiama il metodo originale per ottenere il numero ordine
            const orderRef = originalExtractOrderReference.call(this);
            
            // Ora cerca la data sulla stessa riga del numero ordine
            if (orderRef && this.text) {
                console.log(`🔍 Ricerca data ordine per riferimento: ${orderRef}`);
                
                const lines = this.text.split('\n');
                for (const line of lines) {
                    // Se la riga contiene il numero ordine
                    if (line.includes(orderRef)) {
                        console.log(`📝 Riga con ordine trovata: ${line}`);
                        
                        // Pattern per estrarre la data (formati comuni: dd/mm/yy, dd/mm/yyyy, dd-mm-yy)
                        // IMPORTANTE: Include anche pattern per date senza anno come "15/05"
                        const datePatterns = [
                            /del\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)/i,  // Anno opzionale
                            /DEL\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)/i,
                            /\s(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)(?:\s|$)/,
                            /(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)$/,
                            /data[:\s]+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)/i
                        ];
                        
                        for (const pattern of datePatterns) {
                            const dateMatch = line.match(pattern);
                            if (dateMatch) {
                                let orderDate = dateMatch[1];
                                console.log(`📅 Data ordine trovata (grezza): ${orderDate}`);
                                
                                // Gestisci date con anno troncato o mancante
                                const dateParts = orderDate.split(/[\/\-]/);
                                
                                if (dateParts.length === 2) {
                                    // Caso "15/05" - manca completamente l'anno
                                    const day = dateParts[0];
                                    const month = dateParts[1];
                                    const year = new Date().getFullYear().toString();
                                    console.log(`⚠️ Anno mancante in "${orderDate}" → uso anno corrente: ${year}`);
                                    orderDate = `${day}/${month}/${year}`;
                                }
                                else if (dateParts.length === 3) {
                                    const day = dateParts[0];
                                    const month = dateParts[1];
                                    let year = dateParts[2];
                                    
                                    // Se l'anno ha solo 1 cifra (es: "2"), aggiungi l'anno corrente
                                    if (year.length === 1) {
                                        const currentYear = new Date().getFullYear().toString();
                                        year = currentYear;
                                        console.log(`⚠️ Anno troncato "${dateParts[2]}" → uso anno corrente: ${year}`);
                                    }
                                    // Se l'anno ha 2 cifre, aggiungi 20 davanti (es: 25 -> 2025)
                                    else if (year.length === 2) {
                                        year = '20' + year;
                                    }
                                    
                                    // Ricostruisci la data nel formato corretto
                                    orderDate = `${day}/${month}/${year}`;
                                }
                                
                                console.log(`✅ Data ordine normalizzata: ${orderDate}`);
                                
                                // Salva la data ordine nel contesto per uso successivo
                                if (!this._extractedOrderDate) {
                                    this._extractedOrderDate = orderDate;
                                }
                                break;
                            }
                        }
                    }
                }
            }
            
            return orderRef;
        };
    }
    
    // Override anche per DDTExtractor
    if (window.DDTExtractor) {
        const originalExtract = window.DDTExtractor.prototype.extract;
        
        window.DDTExtractor.prototype.extract = function() {
            const result = originalExtract.call(this);
            
            if (result) {
                // Se abbiamo estratto una data ordine, aggiungila al risultato
                if (this._extractedOrderDate && !result.orderDate) {
                    result.orderDate = this._extractedOrderDate;
                    console.log(`📅 [DDT] Data ordine aggiunta: ${result.orderDate}`);
                }
                
                // Se abbiamo un numero ordine ma non la data, cerca ancora
                if (result.orderNumber && !result.orderDate) {
                    console.log(`🔍 [DDT] Ricerca data per ordine ${result.orderNumber}`);
                    
                    const lines = this.text.split('\n');
                    for (const line of lines) {
                        if (line.includes(result.orderNumber)) {
                            // Pattern specifici per DDT (include date senza anno)
                            const dateMatch = line.match(/(?:del|DEL)\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)/i) ||
                                            line.match(/\s(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)(?:\s|$)/);
                            
                            if (dateMatch) {
                                let orderDate = dateMatch[1];
                                
                                // Normalizza la data
                                const dateParts = orderDate.split(/[\/\-]/);
                                
                                if (dateParts.length === 2) {
                                    // Manca l'anno
                                    const day = dateParts[0];
                                    const month = dateParts[1];
                                    const year = new Date().getFullYear().toString();
                                    orderDate = `${day}/${month}/${year}`;
                                }
                                else if (dateParts.length === 3) {
                                    const day = dateParts[0];
                                    const month = dateParts[1];
                                    let year = dateParts[2];
                                    
                                    if (year.length === 1) {
                                        year = new Date().getFullYear().toString();
                                    } else if (year.length === 2) {
                                        year = '20' + year;
                                    }
                                    
                                    orderDate = `${day}/${month}/${year}`;
                                }
                                
                                result.orderDate = orderDate;
                                console.log(`✅ [DDT] Data ordine trovata: ${result.orderDate}`);
                                break;
                            }
                        }
                    }
                }
            }
            
            return result;
        };
    }
    
    // Override anche per FatturaExtractor
    if (window.FatturaExtractor) {
        const originalExtract = window.FatturaExtractor.prototype.extract;
        
        window.FatturaExtractor.prototype.extract = function() {
            const result = originalExtract.call(this);
            
            if (result) {
                // Se abbiamo estratto una data ordine, aggiungila al risultato
                if (this._extractedOrderDate && !result.orderDate) {
                    result.orderDate = this._extractedOrderDate;
                    console.log(`📅 [FT] Data ordine aggiunta: ${result.orderDate}`);
                }
                
                // Se abbiamo un numero ordine ma non la data, cerca ancora
                if (result.orderNumber && !result.orderDate) {
                    console.log(`🔍 [FT] Ricerca data per ordine ${result.orderNumber}`);
                    
                    const lines = this.text.split('\n');
                    for (const line of lines) {
                        // Salta righe che contengono "FT" seguito da numero (data documento)
                        if (line.match(/FT\s+\d+/i)) {
                            console.log(`🚫 [FT] Skipping FT document line: ${line}`);
                            continue;
                        }
                        
                        if (line.includes(result.orderNumber)) {
                            console.log(`📝 [FT] Riga con ordine trovata: ${line}`);
                            
                            // Pattern specifici per fatture (include date senza anno)
                            const dateMatch = line.match(/(?:del|DEL)\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)/i) ||
                                            line.match(/\s(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)(?:\s|$)/);
                            
                            if (dateMatch) {
                                let orderDate = dateMatch[1];
                                console.log(`📅 [FT] Data ordine grezza: ${orderDate}`);
                                
                                // Normalizza la data
                                const dateParts = orderDate.split(/[\/\-]/);
                                
                                if (dateParts.length === 2) {
                                    // Manca l'anno
                                    const day = dateParts[0];
                                    const month = dateParts[1];
                                    const year = new Date().getFullYear().toString();
                                    orderDate = `${day}/${month}/${year}`;
                                }
                                else if (dateParts.length === 3) {
                                    const day = dateParts[0];
                                    const month = dateParts[1];
                                    let year = dateParts[2];
                                    
                                    if (year.length === 1) {
                                        year = new Date().getFullYear().toString();
                                    } else if (year.length === 2) {
                                        year = '20' + year;
                                    }
                                    
                                    orderDate = `${day}/${month}/${year}`;
                                }
                                
                                result.orderDate = orderDate;
                                console.log(`✅ [FT] Data ordine trovata: ${result.orderDate}`);
                                break;
                            }
                        }
                    }
                }
            }
            
            return result;
        };
    }
    
    // Fix anche per il parser modulare se presente
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && result.orderNumber && !result.orderDate) {
                console.log(`🔍 [Parser] Ricerca data per ordine ${result.orderNumber}`);
                
                // IMPORTANTE: Per le fatture, non cercare sulla riga FT che contiene la data documento
                // Cerca solo sulle righe che contengono effettivamente il numero ordine (es: 507...)
                const lines = text.split('\n');
                for (const line of lines) {
                    // Per le fatture, verifica che la riga contenga effettivamente il numero ordine
                    // e non sia una riga con numero fattura
                    if ((result.type === 'ft' || result.documentType === 'FT') && line.match(/FT\s+\d+/i)) {
                        console.log(`🚫 [Parser] Skipping FT document line: ${line}`);
                        continue;
                    }
                    
                    if (line.includes(result.orderNumber)) {
                        console.log(`📝 [Parser] Riga con riferimento ordine: ${line}`);
                        
                        // Estrai la data dalla stessa riga (include date senza anno)
                        const dateMatch = line.match(/(?:del|DEL)\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)/i) ||
                                        line.match(/\s(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)(?:\s|$)/) ||
                                        line.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)$/);
                        
                        if (dateMatch) {
                            let orderDate = dateMatch[1];
                            
                            // Normalizza la data
                            const dateParts = orderDate.split(/[\/\-]/);
                            
                            if (dateParts.length === 2) {
                                // Manca l'anno
                                const day = dateParts[0];
                                const month = dateParts[1];
                                const year = new Date().getFullYear().toString();
                                console.log(`⚠️ [Parser] Anno mancante in "${orderDate}" → uso anno corrente: ${year}`);
                                orderDate = `${day}/${month}/${year}`;
                            }
                            else if (dateParts.length === 3) {
                                const day = dateParts[0];
                                const month = dateParts[1];
                                let year = dateParts[2];
                                
                                if (year.length === 1) {
                                    year = new Date().getFullYear().toString();
                                    console.log(`⚠️ [Parser] Anno troncato "${dateParts[2]}" → uso anno corrente: ${year}`);
                                } else if (year.length === 2) {
                                    year = '20' + year;
                                }
                                
                                orderDate = `${day}/${month}/${year}`;
                            }
                            
                            result.orderDate = orderDate;
                            console.log(`✅ [Parser] Data ordine estratta: ${result.orderDate}`);
                            break;
                        }
                    }
                }
                
                // Se non trovata sulla stessa riga, cerca nelle righe vicine
                if (!result.orderDate) {
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes(result.orderNumber)) {
                            // Controlla la riga precedente e successiva
                            const nearbyLines = [
                                i > 0 ? lines[i - 1] : '',
                                lines[i],
                                i < lines.length - 1 ? lines[i + 1] : ''
                            ].join(' ');
                            
                            const dateMatch = nearbyLines.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
                            if (dateMatch) {
                                result.orderDate = dateMatch[1];
                                console.log(`✅ [Parser] Data ordine trovata nelle vicinanze: ${result.orderDate}`);
                                break;
                            }
                        }
                    }
                }
            }
            
            return result;
        };
    }
    
    console.log('✅ Fix estrazione data ordine applicato');
    
})();