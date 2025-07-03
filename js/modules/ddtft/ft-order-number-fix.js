/**
 * Fix definitivo per estrazione numero ordine da fatture
 * Previene che il numero fattura venga usato come numero ordine
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix numero ordine fatture...');
    
    // Override del parser principale
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            // Solo per fatture
            if (result && (result.type === 'ft' || result.documentType === 'FT' || result.type === 'fattura')) {
                console.log(`[FT NUMBER FIX] Verifico numero ordine per fattura`);
                console.log(`[FT NUMBER FIX] documentNumber: ${result.documentNumber}`);
                console.log(`[FT NUMBER FIX] orderNumber: ${result.orderNumber}`);
                
                // Se orderNumber è uguale a documentNumber, è un errore!
                if (result.orderNumber && result.documentNumber && 
                    result.orderNumber === result.documentNumber) {
                    console.log(`⚠️ [FT NUMBER FIX] orderNumber uguale a documentNumber, resetto`);
                    result.orderNumber = '';
                    result.orderReference = '';
                    result.riferimentoOrdine = '';
                }
                
                // Ora cerca il vero numero ordine
                if (!result.orderNumber) {
                    console.log(`🔍 [FT NUMBER FIX] Ricerca numero ordine nel testo`);
                    
                    const lines = text.split('\n');
                    
                    // Pattern per ordini Alfieri (507...)
                    const orderPatterns = [
                        // "Rif. Vs. Ordine n. 507A865AS02756"
                        /Rif\.?\s*V[s.]?\s*\.?\s*Ordine\s*n\.?\s*(507[A-Z0-9]+)/i,
                        // "ODV Nr. 507A085AS00704"
                        /ODV\s+Nr\.?\s*(507[A-Z0-9]+)/i,
                        // Pattern generico per 507 seguito da codice
                        /\b(507[A-Z0-9]{8,})\b/
                    ];
                    
                    for (const line of lines) {
                        // Salta righe che contengono il numero fattura
                        if (line.match(/FT\s+\d+/i)) {
                            continue;
                        }
                        
                        for (const pattern of orderPatterns) {
                            const match = line.match(pattern);
                            if (match) {
                                const orderNum = match[1];
                                
                                // Verifica che non sia il numero del documento
                                if (orderNum !== result.documentNumber) {
                                    console.log(`✅ [FT NUMBER FIX] Numero ordine trovato: ${orderNum}`);
                                    result.orderNumber = orderNum;
                                    result.orderReference = orderNum;
                                    result.riferimentoOrdine = orderNum;
                                    return result;
                                }
                            }
                        }
                    }
                    
                    // Se non troviamo un numero ordine che inizia con 507,
                    // cerca altri pattern di ordine
                    const genericPatterns = [
                        /Rif\.?\s*N[s.]?\s*\.?\s*Ordine\s*N\.?\s*(\d+)/i,
                        /ORDINE\s+N[°.]?\s*(\d+)/i,
                        /VS\s*\.\s*ORDINE[:\s]+(\S+)/i
                    ];
                    
                    for (const line of lines) {
                        // Salta righe fattura
                        if (line.match(/FT\s+\d+/i)) {
                            continue;
                        }
                        
                        for (const pattern of genericPatterns) {
                            const match = line.match(pattern);
                            if (match) {
                                const orderNum = match[1];
                                
                                // Verifica che non sia il numero del documento
                                if (orderNum !== result.documentNumber) {
                                    console.log(`✅ [FT NUMBER FIX] Numero ordine generico trovato: ${orderNum}`);
                                    result.orderNumber = orderNum;
                                    result.orderReference = orderNum;
                                    result.riferimentoOrdine = orderNum;
                                    return result;
                                }
                            }
                        }
                    }
                    
                    console.log(`⚠️ [FT NUMBER FIX] Nessun numero ordine valido trovato`);
                }
            }
            
            return result;
        };
        
        console.log('✅ [FT NUMBER FIX] Override parseDocumentFromText applicato');
    }
    
    // Fix anche per DDTFTImport se presente
    if (window.DDTFTImport && window.DDTFTImport.parseDocumentFromText) {
        const originalImportParse = window.DDTFTImport.parseDocumentFromText;
        
        window.DDTFTImport.parseDocumentFromText = function(text, fileName) {
            const result = originalImportParse.call(this, text, fileName);
            
            // Applica lo stesso fix
            if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                if (result.orderNumber === result.documentNumber) {
                    console.log(`⚠️ [FT NUMBER FIX Import] Resetto orderNumber errato`);
                    result.orderNumber = '';
                    result.orderReference = '';
                }
            }
            
            return result;
        };
        
        console.log('✅ [FT NUMBER FIX] Override DDTFTImport.parseDocumentFromText applicato');
    }
    
})();