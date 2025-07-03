/**
 * Fix specifico per aliquote IVA e totali nelle Note di Credito (NC)
 * Gestisce l'estrazione corretta di IVA e calcolo dei totali
 */

(function() {
    'use strict';
    
    console.log('💰 Applicando fix IVA e totali per NC...');
    
    // Override del parser principale
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            // Solo per NC
            if (result && (result.type === 'nc' || result.documentType === 'NC')) {
                console.log('[NC IVA TOTALS] Analizzando NC per IVA e totali...');
                
                const lines = text.split('\n');
                
                // 1. ESTRAZIONE ALIQUOTE IVA
                // Cerca la sezione IVA nel documento
                let ivaData = {};
                let totaleImponibile = 0;
                let totaleIva = 0;
                let totaleDocumento = 0;
                
                // Pattern per trovare le aliquote IVA
                const ivaPatterns = [
                    // Pattern standard: "Aliquota  Imponibile  Imposta"
                    /Aliquota\s+Imponibile\s+Imposta/i,
                    // Pattern alternativo: righe con percentuali IVA
                    /(\d{1,2})[,.]?(\d{0,2})?\s*%.*?([\d.,]+)\s+([\d.,]+)/,
                    // Pattern per totali IVA
                    /Totale\s+IVA.*?([\d.,]+)/i,
                    /Totale\s+Imponibile.*?([\d.,]+)/i
                ];
                
                // Cerca le aliquote IVA nel formato delle NC
                // Dai log vedo che il formato è: "04 4% - GENERICO 4,13 0,17"
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // Pattern per aliquote IVA nel formato NC
                    // Es: "04 4% - GENERICO 4,13 0,17" o "10 10% - GENERICO 329,11 32,91"
                    const ivaPattern = /(\d{2})\s+(\d{1,2})%\s*-\s*\w+\s+([\d.,]+)\s+([\d.,]+)/;
                    const match = line.match(ivaPattern);
                    
                    if (match) {
                        const codiceIva = match[1];
                        const aliquota = parseFloat(match[2]);
                        const imponibile = parseFloat(match[3].replace(/\./g, '').replace(',', '.'));
                        const imposta = parseFloat(match[4].replace(/\./g, '').replace(',', '.'));
                        
                        console.log(`[NC IVA TOTALS] Trovata aliquota IVA: ${aliquota}% - Imponibile: ${imponibile} - Imposta: ${imposta}`);
                        
                        ivaData[aliquota] = {
                            aliquota: aliquota,
                            imponibile: imponibile,
                            imposta: imposta,
                            codice: codiceIva
                        };
                        
                        totaleImponibile += imponibile;
                        totaleIva += imposta;
                    }
                    
                    // Cerca anche il formato alternativo con "Cod. Iva"
                    if (line.includes('Cod. Iva') && line.includes('Imponibile IVA')) {
                        console.log('[NC IVA TOTALS] Trovato header sezione IVA alla riga', i);
                        // Le aliquote dovrebbero essere nelle righe successive
                    }
                }
                
                // 2. ESTRAZIONE TOTALE DOCUMENTO
                // Cerca il totale del documento - nelle NC spesso è l'ultimo numero nella sezione finale
                // Cerchiamo pattern come "366,32 366,32" dove il numero è ripetuto
                const totalePatterns = [
                    /(\d{1,3}(?:\.\d{3})*,\d{2})\s+\1\s*$/m,  // Numero ripetuto alla fine
                    /Totale\s+documento.*?([\d.,]+)/i,
                    /Totale\s+fattura.*?([\d.,]+)/i,
                    /Totale\s+nota.*?([\d.,]+)/i,
                    /TOTALE\s+EURO.*?([\d.,]+)/i,
                    /Netto\s+a\s+pagare.*?([\d.,]+)/i
                ];
                
                // Prima cerca negli ultimi 200 caratteri per il totale ripetuto
                const lastChars = text.slice(-200);
                const repeatedMatch = lastChars.match(/(\d{1,3}(?:\.\d{3})*,\d{2})\s+\1/);
                if (repeatedMatch) {
                    totaleDocumento = parseFloat(repeatedMatch[1].replace(/\./g, '').replace(',', '.'));
                    console.log(`[NC IVA TOTALS] Totale documento trovato (numero ripetuto): ${totaleDocumento}`);
                } else {
                    // Altrimenti usa i pattern standard
                    for (const pattern of totalePatterns) {
                        const match = text.match(pattern);
                        if (match) {
                            const totaleStr = match[1];
                            totaleDocumento = parseFloat(totaleStr.replace(/\./g, '').replace(',', '.'));
                            console.log(`[NC IVA TOTALS] Totale documento trovato: ${totaleDocumento}`);
                            break;
                        }
                    }
                }
                
                // Se non trovato, calcola dai componenti
                if (!totaleDocumento && totaleImponibile > 0) {
                    totaleDocumento = totaleImponibile + totaleIva;
                    console.log(`[NC IVA TOTALS] Totale documento calcolato: ${totaleDocumento}`);
                }
                
                // 3. APPLICA I VALORI AL RISULTATO
                if (Object.keys(ivaData).length > 0) {
                    // Imposta i dati IVA
                    result.ivaBreakdown = ivaData;
                    result.aliquoteIva = ivaData;
                    
                    // Imposta i totali
                    result.totaleImponibile = totaleImponibile;
                    result.totaleIva = totaleIva;
                    result.totaleDocumento = totaleDocumento;
                    
                    // Campi aggiuntivi per compatibilità
                    result.totalAmount = totaleDocumento;
                    result.netAmount = totaleImponibile;
                    result.vatAmount = totaleIva;
                    
                    console.log('✅ [NC IVA TOTALS] IVA e totali impostati:', {
                        aliquote: Object.keys(ivaData).length,
                        totaleImponibile: totaleImponibile,
                        totaleIva: totaleIva,
                        totaleDocumento: totaleDocumento
                    });
                }
                
                // 4. CALCOLA TOTALI ARTICOLI SE NECESSARIO
                if (result.items && result.items.length > 0) {
                    let totaleProdotti = 0;
                    
                    result.items.forEach((item, index) => {
                        // Assicura che ogni articolo abbia l'IVA corretta
                        if (!item.iva && Object.keys(ivaData).length > 0) {
                            // Usa la prima aliquota disponibile come default
                            const defaultIva = Object.keys(ivaData)[0];
                            item.iva = parseFloat(defaultIva);
                            console.log(`[NC IVA TOTALS] Impostata IVA ${defaultIva}% per articolo ${index + 1}`);
                        }
                        
                        // Calcola il totale riga se mancante
                        if (!item.totale && item.quantita && item.prezzo) {
                            item.totale = item.quantita * item.prezzo;
                            if (item.sconto) {
                                item.totale = item.totale * (1 - item.sconto / 100);
                            }
                        }
                        
                        if (item.totale) {
                            totaleProdotti += item.totale;
                        }
                    });
                    
                    // Se il totale prodotti non corrisponde al totale imponibile, aggiusta
                    if (Math.abs(totaleProdotti - totaleImponibile) > 0.1 && totaleImponibile > 0) {
                        console.log(`[NC IVA TOTALS] Aggiustamento totali: prodotti=${totaleProdotti}, imponibile=${totaleImponibile}`);
                        // Potresti voler aggiustare proporzionalmente i totali degli articoli
                    }
                }
                
                // Debug finale
                console.log('[NC IVA TOTALS] Risultato finale:', {
                    tipo: result.type,
                    cliente: result.cliente,
                    aliquoteIva: result.ivaBreakdown,
                    totaleImponibile: result.totaleImponibile,
                    totaleIva: result.totaleIva,
                    totaleDocumento: result.totaleDocumento,
                    numeroArticoli: result.items ? result.items.length : 0
                });
            }
            
            return result;
        };
        
        console.log('✅ [NC IVA TOTALS] Override parseDocumentFromText applicato');
    }
    
    // Protezione per la normalizzazione
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                // Preserva i dati IVA e totali per NC
                if (result && (result.type === 'nc' || result.documentType === 'NC')) {
                    if (result.ivaBreakdown) {
                        console.log('[NC IVA TOTALS] Preservando dati IVA in normalize');
                    }
                }
                
                return result;
            };
        }
    }, 2000);
    
    // Fix sulla visualizzazione
    setTimeout(() => {
        if (window.displayDocumentDetails) {
            const originalDisplay = window.displayDocumentDetails;
            
            window.displayDocumentDetails = function(doc) {
                if (doc && doc.type === 'nc') {
                    console.log('[NC IVA TOTALS] Visualizzazione NC con IVA:', doc.ivaBreakdown);
                }
                return originalDisplay.apply(this, arguments);
            };
        }
    }, 4000);
    
})();