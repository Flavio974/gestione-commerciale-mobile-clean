/**
 * Fix pattern specifici per l'estrazione IVA dalle Note di Credito
 * Gestisce formati non standard di aliquote IVA
 */

(function() {
    'use strict';
    
    console.log('🔍 Applicando fix pattern IVA specifici per NC...');
    
    // Funzione helper per parsare numeri italiani
    function parseItalianNumber(str) {
        if (!str) return 0;
        // Rimuovi spazi e punti (separatori migliaia), converti virgola in punto
        return parseFloat(str.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
    }
    
    // Funzione per estrarre IVA da vari formati
    function extractIVAFromText(text) {
        const ivaData = {};
        const lines = text.split('\n');
        
        // Pattern 1: Cerca blocco "Riepilogo aliquote IVA"
        let riepilogoStart = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/Riepilogo\s+aliquote\s+IVA/i) || 
                lines[i].match(/Aliquota\s+Imponibile\s+Imposta/i)) {
                riepilogoStart = i;
                console.log('[NC IVA PATTERN] Trovato riepilogo IVA alla riga', i);
                break;
            }
        }
        
        if (riepilogoStart >= 0) {
            // Analizza le righe successive
            for (let i = riepilogoStart + 1; i < Math.min(riepilogoStart + 15, lines.length); i++) {
                const line = lines[i].trim();
                
                // Salta righe vuote
                if (!line) continue;
                
                // Se troviamo "Totale", siamo alla fine
                if (line.match(/^Totale\s/i)) break;
                
                // Pattern per riga IVA con vari formati
                const patterns = [
                    // Formato: "4,00  1.234,56  49,38"
                    /^(\d{1,2}[,.]?\d{0,2})\s+([\d.,\s]+)\s+([\d.,\s]+)$/,
                    // Formato: "IVA 4%  1.234,56  49,38"
                    /^IVA\s+(\d{1,2})[%]?\s+([\d.,\s]+)\s+([\d.,\s]+)$/i,
                    // Formato: "4  1234,56  49,38"
                    /^(\d{1,2})\s+([\d.,\s]+)\s+([\d.,\s]+)$/,
                    // Formato con percentuale: "4,00%  1.234,56  49,38"
                    /^(\d{1,2}[,.]?\d{0,2})%\s+([\d.,\s]+)\s+([\d.,\s]+)$/
                ];
                
                for (const pattern of patterns) {
                    const match = line.match(pattern);
                    if (match) {
                        let aliquota = match[1].replace(',', '.');
                        if (!aliquota.includes('.')) {
                            aliquota = parseFloat(aliquota);
                        } else {
                            aliquota = parseFloat(aliquota);
                        }
                        
                        const imponibile = parseItalianNumber(match[2]);
                        const imposta = parseItalianNumber(match[3]);
                        
                        if (aliquota > 0 && imponibile > 0) {
                            console.log(`[NC IVA PATTERN] Estratta aliquota: ${aliquota}% - Imp: ${imponibile} - IVA: ${imposta}`);
                            ivaData[aliquota] = {
                                aliquota: aliquota,
                                imponibile: imponibile,
                                imposta: imposta
                            };
                            break;
                        }
                    }
                }
            }
        }
        
        // Pattern 2: Cerca direttamente nel testo per pattern IVA comuni
        if (Object.keys(ivaData).length === 0) {
            console.log('[NC IVA PATTERN] Tentativo estrazione IVA con pattern globali');
            
            // Pattern per trovare aliquote nel testo
            const globalPatterns = [
                /IVA\s+(\d{1,2})[%]?\s*[:=]\s*([\d.,]+)/gi,
                /Aliquota\s+(\d{1,2})[,.]?(\d{0,2})?%?\s+.*?([\d.,]+)\s+([\d.,]+)/gi
            ];
            
            for (const pattern of globalPatterns) {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    let aliquota = match[1];
                    if (match[2]) {
                        aliquota += '.' + match[2];
                    }
                    aliquota = parseFloat(aliquota);
                    
                    if (match[3] && match[4]) {
                        const imponibile = parseItalianNumber(match[3]);
                        const imposta = parseItalianNumber(match[4]);
                        
                        if (aliquota > 0 && imponibile > 0) {
                            ivaData[aliquota] = {
                                aliquota: aliquota,
                                imponibile: imponibile,
                                imposta: imposta
                            };
                        }
                    }
                }
            }
        }
        
        return ivaData;
    }
    
    // Funzione per estrarre totali
    function extractTotalsFromText(text) {
        const totals = {
            imponibile: 0,
            iva: 0,
            totale: 0
        };
        
        // Pattern per totali
        const patterns = {
            imponibile: [
                /Totale\s+imponibile.*?([\d.,]+)/i,
                /Imponibile\s+€?\s*([\d.,]+)/i,
                /Base\s+imponibile.*?([\d.,]+)/i
            ],
            iva: [
                /Totale\s+IVA.*?([\d.,]+)/i,
                /IVA\s+€?\s*([\d.,]+)(?!\s*%)/i,
                /Imposta.*?totale.*?([\d.,]+)/i
            ],
            totale: [
                /Totale\s+documento.*?([\d.,]+)/i,
                /Totale\s+nota.*?([\d.,]+)/i,
                /TOTALE\s+€?\s*([\d.,]+)/i,
                /Netto\s+a\s+pagare.*?([\d.,]+)/i,
                /Importo\s+totale.*?([\d.,]+)/i
            ]
        };
        
        for (const [key, patternList] of Object.entries(patterns)) {
            for (const pattern of patternList) {
                const match = text.match(pattern);
                if (match) {
                    totals[key] = parseItalianNumber(match[1]);
                    console.log(`[NC IVA PATTERN] Trovato totale ${key}: ${totals[key]}`);
                    break;
                }
            }
        }
        
        // Se manca il totale documento, calcolalo
        if (totals.totale === 0 && totals.imponibile > 0 && totals.iva > 0) {
            totals.totale = totals.imponibile + totals.iva;
            console.log(`[NC IVA PATTERN] Totale calcolato: ${totals.totale}`);
        }
        
        return totals;
    }
    
    // Override del parser
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'nc' || result.documentType === 'NC')) {
                console.log('[NC IVA PATTERN] Applicando pattern specifici NC...');
                
                // Estrai IVA con pattern specifici
                const ivaData = extractIVAFromText(text);
                
                if (Object.keys(ivaData).length > 0) {
                    result.ivaBreakdown = ivaData;
                    result.aliquoteIva = ivaData;
                    
                    // Calcola totali IVA
                    let totImponibile = 0;
                    let totImposta = 0;
                    
                    Object.values(ivaData).forEach(iva => {
                        totImponibile += iva.imponibile;
                        totImposta += iva.imposta;
                    });
                    
                    result.totaleImponibile = totImponibile;
                    result.totaleIva = totImposta;
                    
                    console.log('✅ [NC IVA PATTERN] IVA estratta con pattern specifici:', {
                        aliquote: Object.keys(ivaData),
                        totaleImponibile: totImponibile,
                        totaleIva: totImposta
                    });
                }
                
                // Estrai totali
                const totals = extractTotalsFromText(text);
                if (totals.totale > 0) {
                    result.totaleDocumento = totals.totale;
                    result.totalAmount = totals.totale;
                    
                    // Se abbiamo estratto totali migliori, usali
                    if (totals.imponibile > 0) {
                        result.totaleImponibile = totals.imponibile;
                        result.netAmount = totals.imponibile;
                    }
                    if (totals.iva > 0) {
                        result.totaleIva = totals.iva;
                        result.vatAmount = totals.iva;
                    }
                }
                
                // Applica IVA agli articoli se mancante
                if (result.items && Object.keys(ivaData).length > 0) {
                    const defaultIva = Object.keys(ivaData)[0];
                    
                    result.items.forEach(item => {
                        if (!item.iva || item.iva === 0) {
                            item.iva = parseFloat(defaultIva);
                            item.aliquotaIva = parseFloat(defaultIva);
                        }
                    });
                }
            }
            
            return result;
        };
    }
    
    console.log('✅ [NC IVA PATTERN] Fix pattern IVA specifici applicato');
    
})();