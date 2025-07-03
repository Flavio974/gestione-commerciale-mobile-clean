/**
 * Fix debug per analizzare il formato reale delle righe articolo DDT
 * e correggere l'estrazione dei valori
 */

(function() {
    'use strict';
    
    console.log('🔍 Applicando fix debug articoli DDT...');
    
    // Override del parser completo DDT
    if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.parseDocumentFromText) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            // Se non è un DDT, usa il parser originale
            if (!fileName || (!fileName.toUpperCase().includes('DDV') && !fileName.toUpperCase().includes('DDT'))) {
                return originalParse.call(this, text, fileName);
            }
            
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                console.log('[DDT DEBUG FIX] Analisi formato righe articolo...');
                
                const lines = text.split('\n');
                const newItems = [];
                
                // Trova dove iniziano gli articoli
                let startIndex = -1;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].match(/^(060041|070017|090009|200016|DL000|PS000|RF000|VS000|GF000|PIRR|PF000|SG000)/)) {
                        startIndex = i;
                        break;
                    }
                }
                
                if (startIndex >= 0) {
                    console.log(`[DDT DEBUG FIX] Articoli iniziano alla riga ${startIndex}`);
                    
                    // Analizza le prime 10 righe articolo per capire il formato
                    for (let i = startIndex; i < Math.min(startIndex + 10, lines.length); i++) {
                        const line = lines[i];
                        if (line.match(/^[A-Z0-9]{6,}/)) {
                            console.log(`[DDT DEBUG FIX] Riga ${i}: "${line}"`);
                            
                            // Prova diversi pattern per capire il formato
                            // Pattern 1: CODICE DESCRIZIONE UM QUANTITÀ PREZZO_UNIT SCONTO PREZZO_NETTO IMPORTO IVA SM
                            const pattern1 = /^(\w{6,})\s+(.+?)\s+(PZ|KG|LT|CF|CT|BT|SC|GR)\s+(\d+(?:,\d+)?)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d\.,]+)\s+(\d{2})\s+(\d{2})$/;
                            const match1 = line.match(pattern1);
                            if (match1) {
                                console.log('[DDT DEBUG FIX] Match Pattern 1 (con sconto):', match1);
                            }
                            
                            // Pattern 2: Senza sconto
                            const pattern2 = /^(\w{6,})\s+(.+?)\s+(PZ|KG|LT|CF|CT|BT|SC|GR)\s+(\d+(?:,\d+)?)\s+([\d,]+)\s+([\d\.,]+)\s+(\d{2})\s+(\d{2})$/;
                            const match2 = line.match(pattern2);
                            if (match2) {
                                console.log('[DDT DEBUG FIX] Match Pattern 2 (senza sconto):', match2);
                            }
                            
                            // Pattern 3: Analisi token per token
                            const tokens = line.split(/\s+/);
                            console.log('[DDT DEBUG FIX] Tokens:', tokens);
                            
                            // Trova l'unità di misura
                            let umIndex = -1;
                            const units = ['PZ', 'KG', 'LT', 'CF', 'CT', 'BT', 'SC', 'GR'];
                            for (let j = 0; j < tokens.length; j++) {
                                if (units.includes(tokens[j])) {
                                    umIndex = j;
                                    break;
                                }
                            }
                            
                            if (umIndex > 0) {
                                console.log(`[DDT DEBUG FIX] UM "${tokens[umIndex]}" trovata all'indice ${umIndex}`);
                                
                                // Ricostruisci i campi
                                const code = tokens[0];
                                const description = tokens.slice(1, umIndex).join(' ');
                                const unit = tokens[umIndex];
                                
                                // I campi dopo l'UM dovrebbero essere numerici
                                const numericFields = tokens.slice(umIndex + 1);
                                console.log('[DDT DEBUG FIX] Campi numerici dopo UM:', numericFields);
                                
                                // Cerca l'importo totale (dovrebbe essere il numero più grande con punto e virgola)
                                let totalIndex = -1;
                                let maxValue = 0;
                                for (let j = 0; j < numericFields.length; j++) {
                                    if (numericFields[j].includes('.') && numericFields[j].includes(',')) {
                                        const value = parseFloat(numericFields[j].replace(/\./g, '').replace(',', '.'));
                                        if (value > maxValue) {
                                            maxValue = value;
                                            totalIndex = j;
                                        }
                                    }
                                }
                                
                                if (totalIndex >= 0) {
                                    console.log(`[DDT DEBUG FIX] Importo totale trovato: ${numericFields[totalIndex]} all'indice ${totalIndex}`);
                                    
                                    // Ora possiamo ricostruire i campi
                                    const quantity = parseFloat((numericFields[0] || '0').replace(',', '.'));
                                    const total = parseFloat(numericFields[totalIndex].replace(/\./g, '').replace(',', '.'));
                                    const price = quantity > 0 ? total / quantity : 0;
                                    const vat = numericFields[totalIndex + 1] || '10';
                                    
                                    console.log(`[DDT DEBUG FIX] Estratto: Q=${quantity}, P=${price.toFixed(4)}, T=${total}, IVA=${vat}`);
                                }
                            }
                        }
                    }
                    
                    // Ora parsiamo con il pattern corretto identificato
                    console.log('\n[DDT DEBUG FIX] Parsing completo con pattern identificato...');
                    
                    for (let i = startIndex; i < lines.length; i++) {
                        const line = lines[i].trim();
                        
                        if (!line || line.includes('Totale') || line.includes('TOTALE')) {
                            continue;
                        }
                        
                        // Usa il pattern che funziona meglio per DDT Alfieri
                        // Analisi token-based più robusta
                        const tokens = line.split(/\s+/);
                        if (tokens.length < 6) continue;
                        
                        // Trova l'unità di misura
                        const units = ['PZ', 'KG', 'LT', 'CF', 'CT', 'BT', 'SC', 'GR'];
                        let umIndex = -1;
                        for (let j = 2; j < tokens.length - 3; j++) {
                            if (units.includes(tokens[j])) {
                                umIndex = j;
                                break;
                            }
                        }
                        
                        if (umIndex > 0) {
                            const code = tokens[0];
                            const description = tokens.slice(1, umIndex).join(' ');
                            const unit = tokens[umIndex];
                            
                            // Campi numerici dopo l'UM
                            const numFields = tokens.slice(umIndex + 1);
                            
                            // Identifica i campi basandosi sulla loro posizione e formato
                            let quantity = 0;
                            let total = 0;
                            let vat = '10';
                            
                            // Il primo numero dopo UM è la quantità
                            if (numFields[0]) {
                                quantity = parseFloat(numFields[0].replace(',', '.'));
                            }
                            
                            // Cerca l'importo totale (formato con punto e virgola)
                            for (let j = 1; j < numFields.length; j++) {
                                if (numFields[j].match(/^\d{1,3}(?:\.\d{3})*,\d{2}$/)) {
                                    total = parseFloat(numFields[j].replace(/\./g, '').replace(',', '.'));
                                    // L'IVA dovrebbe essere subito dopo il totale
                                    if (j + 1 < numFields.length && numFields[j + 1].match(/^\d{2}$/)) {
                                        vat = numFields[j + 1];
                                    }
                                    break;
                                }
                            }
                            
                            // Calcola il prezzo unitario
                            const price = quantity > 0 ? total / quantity : 0;
                            
                            const item = {
                                code: code,
                                description: description,
                                unit: unit,
                                quantity: quantity,
                                price: price,
                                total: total,
                                vat: vat,
                                iva: vat,
                                vatRate: parseInt(vat),
                                sm: '00'
                            };
                            
                            if (total > 0) {
                                newItems.push(item);
                                console.log(`[DDT DEBUG FIX] Articolo: ${code} - Q:${quantity} x P:${price.toFixed(2)} = T:${total}`);
                            }
                        }
                    }
                    
                    if (newItems.length > 0) {
                        console.log(`[DDT DEBUG FIX] Estratti ${newItems.length} articoli`);
                        result.items = newItems;
                        
                        // Ricalcola i totali
                        let subtotal = 0;
                        let totalIVA = 0;
                        
                        newItems.forEach(item => {
                            subtotal += item.total;
                            const ivaRate = item.vatRate / 100;
                            totalIVA += item.total * ivaRate;
                        });
                        
                        result.subtotal = subtotal;
                        result.vat = totalIVA;
                        result.iva = totalIVA;
                        
                        console.log(`[DDT DEBUG FIX] Subtotale corretto: €${subtotal.toFixed(2)}`);
                        console.log(`[DDT DEBUG FIX] IVA: €${totalIVA.toFixed(2)}`);
                        console.log(`[DDT DEBUG FIX] Totale documento: €${result.total}`);
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [DDT DEBUG FIX] Override applicato');
    }
    
})();