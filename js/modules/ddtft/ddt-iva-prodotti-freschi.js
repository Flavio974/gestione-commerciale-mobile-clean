/**
 * Fix per correggere l'aliquota IVA dei prodotti freschi nei DDT
 * I prodotti con codice che inizia con PF (Prodotti Freschi) dovrebbero avere IVA al 4%
 */

(function() {
    'use strict';
    
    console.log('🎯 Applicando fix IVA prodotti freschi DDT...');
    
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                console.log('[DDT IVA FRESCHI] Verificando IVA prodotti freschi nel DDT...');
                
                if (result.items && Array.isArray(result.items)) {
                    let modificati = 0;
                    
                    result.items.forEach((item, index) => {
                        // Lista prodotti che dovrebbero avere IVA 4%
                        const prodottiFreschi = [
                            '060039', // GNOCCHETTI PATATE FRESCHE
                            'PF000090', // TROFIE FRESCHE
                            // Aggiungi altri codici se necessario
                        ];
                        
                        // Controlla se il codice inizia con PF (Prodotti Freschi)
                        const isProdottoFresco = item.code && (
                            item.code.startsWith('PF') || 
                            prodottiFreschi.includes(item.code)
                        );
                        
                        // Controlla anche la descrizione per parole chiave
                        const hasParoleFreschi = item.description && (
                            item.description.includes('FRESCHE') ||
                            item.description.includes('FRESCO') ||
                            item.description.includes('GNOCCHETTI') ||
                            item.description.includes('TROFIE')
                        );
                        
                        if ((isProdottoFresco || hasParoleFreschi) && item.vat !== '04' && item.vat !== '4') {
                            console.log(`[DDT IVA FRESCHI] Prodotto fresco trovato: ${item.code} - ${item.description}`);
                            console.log(`[DDT IVA FRESCHI] IVA attuale: ${item.vat}%, correzione a 4%`);
                            
                            // Correggi l'IVA
                            item.vat = '04';
                            item.iva = '04';
                            item.vatRate = 4;
                            modificati++;
                        }
                    });
                    
                    if (modificati > 0) {
                        console.log(`✅ [DDT IVA FRESCHI] Corretta IVA per ${modificati} prodotti freschi`);
                        
                        // Ricalcola i totali IVA se necessario
                        if (result.vat || result.iva || result.totalIVA) {
                            const totaleImponibile = result.items.reduce((sum, item) => {
                                const qty = parseFloat(item.quantity) || 0;
                                const price = parseFloat(item.price) || 0;
                                return sum + (qty * price);
                            }, 0);
                            
                            // Raggruppa per aliquota IVA
                            const ivaPerAliquota = {};
                            result.items.forEach(item => {
                                const aliquota = item.vat || '10';
                                if (!ivaPerAliquota[aliquota]) {
                                    ivaPerAliquota[aliquota] = 0;
                                }
                                const qty = parseFloat(item.quantity) || 0;
                                const price = parseFloat(item.price) || 0;
                                const imponibile = qty * price;
                                const iva = imponibile * (parseFloat(aliquota) / 100);
                                ivaPerAliquota[aliquota] += iva;
                            });
                            
                            // Calcola totale IVA
                            const totaleIVA = Object.values(ivaPerAliquota).reduce((sum, iva) => sum + iva, 0);
                            
                            console.log(`[DDT IVA FRESCHI] Ricalcolo IVA:`);
                            Object.entries(ivaPerAliquota).forEach(([aliquota, importo]) => {
                                console.log(`  - IVA ${aliquota}%: €${importo.toFixed(2)}`);
                            });
                            console.log(`  - Totale IVA: €${totaleIVA.toFixed(2)}`);
                            
                            // Aggiorna i totali
                            result.vat = totaleIVA;
                            result.iva = totaleIVA;
                            result.totalIVA = totaleIVA;
                            
                            // Aggiorna il totale documento se necessario
                            if (result.total && totaleImponibile > 0) {
                                result.total = totaleImponibile + totaleIVA;
                                console.log(`[DDT IVA FRESCHI] Totale documento aggiornato: €${result.total.toFixed(2)}`);
                            }
                        }
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [DDT IVA FRESCHI] Override parseDocumentFromText applicato');
    }
    
    // Override anche nel normalizeDocumentFields per essere sicuri
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                    if (result.items && Array.isArray(result.items)) {
                        result.items.forEach(item => {
                            // Riapplica la correzione se necessario
                            if (item.code && (item.code.startsWith('PF') || item.code === '060039')) {
                                if (item.vat !== '04' && item.vat !== '4') {
                                    console.log(`[DDT IVA FRESCHI] Correzione IVA in normalizeDocumentFields per ${item.code}`);
                                    item.vat = '04';
                                    item.iva = '04';
                                    item.vatRate = 4;
                                }
                            }
                        });
                    }
                }
                
                return result;
            };
            
            console.log('✅ [DDT IVA FRESCHI] Override normalizeDocumentFields applicato');
        }
    }, 2000);
    
})();