/**
 * Fix specifico per estrarre numeri ordine che iniziano con 507 (Alfieri)
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix ordine 507...');
    
    // Override parseDocumentFromText per aggiungere estrazione ordine 507
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result) {
                // Se non c'è già un riferimento ordine, cerca pattern 507
                if (!result.orderReference || !result.orderNumber || result.orderNumber === result.documentNumber) {
                    console.log(`[507 FIX] Cerco numero ordine 507 per documento tipo: ${result.type || result.documentType}`);
                    
                    const lines = text.split('\n');
                    
                    // Prima cerca il pattern completo "Rif. Vs. Ordine n. 507XXXXX" o "ODV Nr. 507XXXXX"
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        
                        // Pattern per "Rif. Vs. Ordine n. 507A865AS02756"
                        let fullOrderMatch = line.match(/Rif\.?\s*V[s.]?\s*\.?\s*Ordine\s*n\.?\s*(507[A-Z0-9]+)/i);
                        
                        // Pattern per "ODV Nr. 507A085AS00704"
                        if (!fullOrderMatch) {
                            fullOrderMatch = line.match(/ODV\s+Nr\.?\s*(507[A-Z0-9]+)/i);
                        }
                        
                        // Pattern generico per qualsiasi numero che inizia con 507 seguito da lettere/numeri
                        if (!fullOrderMatch && line.includes('507')) {
                            fullOrderMatch = line.match(/\b(507[A-Z0-9]+)\b/i);
                        }
                        
                        if (fullOrderMatch) {
                            const orderNum = fullOrderMatch[1];
                            console.log(`✅ [507 FIX] Numero ordine completo trovato: ${orderNum}`);
                            result.orderReference = orderNum;
                            result.orderNumber = orderNum;
                            result.riferimentoOrdine = orderNum;
                            return result;
                        }
                    }
                    
                    // Se non trova il pattern completo, cerca "507" in vari contesti
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        
                        // Pattern A: 507 all'inizio della riga seguito da nome
                        if (/^507\s+[A-Z]/i.test(line)) {
                            console.log(`[507 FIX] Trovata riga che inizia con 507: "${line}"`);
                            
                            // Verifica il contesto
                            const prevLine = i > 0 ? lines[i-1].trim() : '';
                            
                            // Se la riga precedente contiene "Operatore", NON è un ordine ma il codice operatore!
                            if (prevLine.toLowerCase().includes('operatore')) {
                                console.log(`❌ [507 FIX] 507 trovato dopo 'Operatore' - è il codice operatore, NON un ordine`);
                                continue; // Salta questa riga
                            }
                        }
                        
                        // Pattern B: 507 alla fine della riga (es: "TASS.VA IL 20/05 ENTRO ORE 12 507 SAFFIRIO FLAVIO")
                        if (line.includes('507') && line.match(/507\s+[A-Z]/i)) {
                            console.log(`[507 FIX] Trovata riga contenente 507: "${line}"`);
                            
                            // Verifica il contesto
                            const prevLine = i > 0 ? lines[i-1].trim() : '';
                            
                            // Se contiene nomi tipici di operatori E non è preceduto da "Operatore"
                            if (line.match(/507\s+(SAFFIRIO|FLAVIO|[A-Z]+\s+[A-Z]+)/i) && 
                                !prevLine.toLowerCase().includes('operatore')) {
                                console.log(`[507 FIX] Possibile ordine 507, ma verifichiamo meglio il contesto...`);
                                
                                // Verifica se c'è davvero un riferimento ordine nelle righe precedenti
                                let hasOrderReference = false;
                                for (let j = Math.max(0, i - 5); j < i; j++) {
                                    if (lines[j].includes('RIFERIMENTO VOSTRO ORDINE') || 
                                        lines[j].includes('Rif. Vs. Ordine') ||
                                        lines[j].includes('Rif. Ns. Ordine')) {
                                        hasOrderReference = true;
                                        break;
                                    }
                                }
                                
                                if (!hasOrderReference) {
                                    console.log(`❌ [507 FIX] Nessun riferimento ordine nel documento, 507 è probabilmente il codice operatore`);
                                    continue;
                                }
                            }
                        }
                        
                        // Pattern 2: Cerca pattern più specifici come "N. 507" o "Ordine 507"
                        const orderMatch = line.match(/(?:N\.|Ordine|Ord\.)\s*(507\d*)/i);
                        if (orderMatch) {
                            const orderNum = orderMatch[1];
                            console.log(`✅ [507 FIX] Numero ordine trovato con pattern: ${orderNum}`);
                            result.orderReference = orderNum;
                            result.orderNumber = orderNum;
                            result.riferimentoOrdine = orderNum;
                            break;
                        }
                    }
                    
                    // NON cercare "507" in modo aggressivo
                    // Come richiesto: "Se nei documenti originali non è presente il numero 
                    // dell'ordine non deve essere aggiunto il numero '507' di default."
                }
            }
            
            return result;
        };
        
        console.log('✅ [507 FIX] Override parseDocumentFromText applicato');
    }
    
})();