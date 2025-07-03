/**
 * Fix per correggere l'aliquota IVA di prodotti specifici nei DDT
 * Basato su codici prodotto specifici che richiedono IVA al 4%
 */

(function() {
    'use strict';
    
    console.log('🎯 Applicando fix IVA specifica prodotti DDT...');
    
    // Mappa dei prodotti con la loro aliquota IVA corretta
    // Aggiungi qui i codici prodotto che devono avere IVA al 4%
    const PRODOTTI_IVA_4 = {
        '060039': 'GNOCCHETTI PATATE FRESCHE',
        'PF000090': 'TROFIE FRESCHE',
        // Aggiungi altri codici prodotto che devono avere IVA 4%
    };
    
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                console.log('[DDT IVA SPECIFICA] Verificando IVA prodotti nel DDT...');
                
                // Cerca nel testo originale per vedere le aliquote IVA reali
                const lines = text.split('\n');
                const ivaPerCodice = {};
                
                // Pattern per trovare righe articolo con IVA
                // Formato tipico: CODICE DESCRIZIONE ... QUANTITA PREZZO TOTALE IVA
                lines.forEach(line => {
                    // Pattern per articoli DDT con IVA
                    const match = line.match(/^([A-Z0-9]+)\s+(.+?)\s+PZ\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(\d{2})/);
                    if (match) {
                        const codice = match[1];
                        const iva = match[6];
                        console.log(`[DDT IVA SPECIFICA] Trovata riga: ${codice} con IVA ${iva}%`);
                        ivaPerCodice[codice] = iva;
                    }
                });
                
                if (result.items && Array.isArray(result.items)) {
                    let modificati = 0;
                    
                    result.items.forEach((item, index) => {
                        // Se abbiamo trovato l'IVA nel testo originale, usala
                        if (ivaPerCodice[item.code]) {
                            const ivaCorretta = ivaPerCodice[item.code];
                            if (item.vat !== ivaCorretta) {
                                console.log(`[DDT IVA SPECIFICA] Correzione IVA per ${item.code}: ${item.vat}% -> ${ivaCorretta}%`);
                                item.vat = ivaCorretta;
                                item.iva = ivaCorretta;
                                item.vatRate = parseInt(ivaCorretta);
                                modificati++;
                            }
                        }
                        // Altrimenti usa la mappa predefinita
                        else if (PRODOTTI_IVA_4[item.code]) {
                            if (item.vat !== '04' && item.vat !== '4') {
                                console.log(`[DDT IVA SPECIFICA] Prodotto ${item.code} (${PRODOTTI_IVA_4[item.code]}) deve avere IVA 4%`);
                                console.log(`[DDT IVA SPECIFICA] IVA attuale: ${item.vat}%, correzione a 4%`);
                                
                                item.vat = '04';
                                item.iva = '04';
                                item.vatRate = 4;
                                modificati++;
                            }
                        }
                    });
                    
                    if (modificati > 0) {
                        console.log(`✅ [DDT IVA SPECIFICA] Corretta IVA per ${modificati} prodotti`);
                        
                        // Ricalcola i totali IVA
                        const totaliPerAliquota = {};
                        let totaleImponibile = 0;
                        
                        result.items.forEach(item => {
                            const qty = parseFloat(item.quantity) || 0;
                            const price = parseFloat(item.price) || 0;
                            const imponibile = qty * price;
                            const aliquota = item.vat || '10';
                            
                            totaleImponibile += imponibile;
                            
                            if (!totaliPerAliquota[aliquota]) {
                                totaliPerAliquota[aliquota] = {
                                    imponibile: 0,
                                    iva: 0
                                };
                            }
                            
                            totaliPerAliquota[aliquota].imponibile += imponibile;
                            totaliPerAliquota[aliquota].iva += imponibile * (parseFloat(aliquota) / 100);
                        });
                        
                        // Calcola totale IVA
                        let totaleIVA = 0;
                        console.log(`[DDT IVA SPECIFICA] Riepilogo IVA:`);
                        Object.entries(totaliPerAliquota).forEach(([aliquota, dati]) => {
                            console.log(`  - IVA ${aliquota}%: imponibile €${dati.imponibile.toFixed(2)}, IVA €${dati.iva.toFixed(2)}`);
                            totaleIVA += dati.iva;
                        });
                        console.log(`  - Totale IVA: €${totaleIVA.toFixed(2)}`);
                        
                        // Aggiorna i totali nel documento
                        if (result.vat !== undefined || result.iva !== undefined) {
                            result.vat = totaleIVA;
                            result.iva = totaleIVA;
                            result.totalIVA = totaleIVA;
                        }
                        
                        // Aggiorna il totale documento
                        if (result.total && totaleImponibile > 0) {
                            result.total = totaleImponibile + totaleIVA;
                            console.log(`[DDT IVA SPECIFICA] Totale documento: €${result.total.toFixed(2)}`);
                        }
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [DDT IVA SPECIFICA] Override parseDocumentFromText applicato');
    }
    
    // Override anche nel normalizeDocumentFields
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                    if (result.items && Array.isArray(result.items)) {
                        result.items.forEach(item => {
                            // Riapplica la correzione per i prodotti nella mappa
                            if (PRODOTTI_IVA_4[item.code] && item.vat !== '04' && item.vat !== '4') {
                                console.log(`[DDT IVA SPECIFICA] Correzione IVA in normalize per ${item.code}`);
                                item.vat = '04';
                                item.iva = '04';
                                item.vatRate = 4;
                            }
                        });
                    }
                }
                
                return result;
            };
            
            console.log('✅ [DDT IVA SPECIFICA] Override normalizeDocumentFields applicato');
        }
    }, 2000);
    
})();