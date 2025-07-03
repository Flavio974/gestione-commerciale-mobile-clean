/**
 * Fix per estrarre correttamente il totale dai documenti DDT
 * Il totale deve essere estratto dal documento originale, non calcolato
 */

(function() {
    'use strict';
    
    console.log('💰 Applicando fix totale DDT...');
    
    // Override del parser DDT
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            // Solo per DDT
            if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                console.log('[DDT TOTALE FIX] Ricerca totale documento DDT...');
                console.log('[DDT TOTALE FIX] Totale attuale:', result.total || result.totale);
                
                const lines = text.split('\n');
                let totaleFound = false;
                
                // Strategia 1: Cerca "Totale Documento" o "Totale DDT"
                const totalePatterns = [
                    /Totale\s+Documento\s*:?\s*€?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                    /Totale\s+DDT\s*:?\s*€?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                    /TOTALE\s*:?\s*€?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                    /Tot\.\s+Documento\s*:?\s*€?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i
                ];
                
                for (const pattern of totalePatterns) {
                    const match = text.match(pattern);
                    if (match) {
                        const totale = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
                        console.log(`✅ [DDT TOTALE FIX] Totale trovato con pattern: €${totale}`);
                        result.total = totale;
                        result.totale = totale;
                        result.totalDocument = totale;
                        totaleFound = true;
                        break;
                    }
                }
                
                // Strategia 2: Cerca nelle ultime righe del documento
                if (!totaleFound) {
                    console.log('[DDT TOTALE FIX] Ricerca nelle ultime 30 righe...');
                    
                    // Cerca dall'ultima riga andando indietro
                    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 30); i--) {
                        const line = lines[i].trim();
                        
                        // Salta righe vuote o molto corte
                        if (!line || line.length < 5) continue;
                        
                        // Pattern per importi in formato italiano
                        const amountPattern = /(\d{1,3}(?:\.\d{3})*,\d{2})(?:\s|$)/g;
                        const matches = [...line.matchAll(amountPattern)];
                        
                        if (matches.length > 0) {
                            // Prendi l'ultimo importo sulla riga (spesso è il totale)
                            const lastMatch = matches[matches.length - 1];
                            const possibleTotal = parseFloat(lastMatch[1].replace(/\./g, '').replace(',', '.'));
                            
                            // Verifica che sia un importo ragionevole per un totale
                            if (possibleTotal > 50 && possibleTotal < 50000) {
                                console.log(`[DDT TOTALE FIX] Possibile totale trovato alla riga ${i}: €${possibleTotal}`);
                                
                                // Se la riga contiene parole chiave relative al totale
                                if (line.match(/tot|finale|documento|importo/i)) {
                                    console.log(`✅ [DDT TOTALE FIX] Confermato totale con parola chiave: €${possibleTotal}`);
                                    result.total = possibleTotal;
                                    result.totale = possibleTotal;
                                    result.totalDocument = possibleTotal;
                                    totaleFound = true;
                                    break;
                                }
                                
                                // Se è l'ultima riga con un importo e non abbiamo trovato altro
                                if (i === lines.length - 1 || 
                                    (i < lines.length - 5 && !totaleFound)) {
                                    console.log(`[DDT TOTALE FIX] Usando ultimo importo come totale: €${possibleTotal}`);
                                    result.total = possibleTotal;
                                    result.totale = possibleTotal;
                                    result.totalDocument = possibleTotal;
                                    totaleFound = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Strategia 3: Cerca importi duplicati (spesso il totale appare due volte)
                if (!totaleFound) {
                    console.log('[DDT TOTALE FIX] Ricerca importi duplicati...');
                    
                    const amounts = [];
                    const amountPattern = /(\d{1,3}(?:\.\d{3})*,\d{2})/g;
                    
                    // Raccogli tutti gli importi nelle ultime 20 righe
                    for (let i = Math.max(0, lines.length - 20); i < lines.length; i++) {
                        const matches = [...lines[i].matchAll(amountPattern)];
                        matches.forEach(match => {
                            const amount = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
                            if (amount > 50 && amount < 50000) {
                                amounts.push({
                                    value: amount,
                                    formatted: match[1],
                                    line: i
                                });
                            }
                        });
                    }
                    
                    // Trova importi che appaiono almeno due volte
                    const duplicates = amounts.filter((item, index) => 
                        amounts.findIndex(a => Math.abs(a.value - item.value) < 0.01) !== index
                    );
                    
                    if (duplicates.length > 0) {
                        // Prendi l'importo duplicato più grande
                        const maxDuplicate = duplicates.reduce((max, curr) => 
                            curr.value > max.value ? curr : max
                        );
                        
                        console.log(`✅ [DDT TOTALE FIX] Totale trovato (importo duplicato): €${maxDuplicate.value}`);
                        result.total = maxDuplicate.value;
                        result.totale = maxDuplicate.value;
                        result.totalDocument = maxDuplicate.value;
                        totaleFound = true;
                    }
                }
                
                // Log finale
                console.log('[DDT TOTALE FIX] Risultato finale:');
                console.log(`  Subtotale: €${result.subtotal || 0}`);
                console.log(`  IVA: €${result.vat || result.iva || 0}`);
                console.log(`  Totale: €${result.total || 0}`);
                
                // Verifica coerenza solo come warning
                if (result.subtotal && result.vat && result.total) {
                    const calcolato = result.subtotal + result.vat;
                    const differenza = Math.abs(calcolato - result.total);
                    if (differenza > 1) {
                        console.warn(`⚠️ [DDT TOTALE FIX] Differenza tra totale estratto e calcolato: €${differenza.toFixed(2)}`);
                        console.warn(`   Estratto: €${result.total}, Calcolato: €${calcolato.toFixed(2)}`);
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [DDT TOTALE FIX] Override parseDocumentFromText applicato');
    }
    
    // Override anche per il parser completo DDT
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.parseDocumentFromText) {
            console.log('✅ [DDT TOTALE FIX] Parser DDT già aggiornato');
        }
    }, 100);
    
})();