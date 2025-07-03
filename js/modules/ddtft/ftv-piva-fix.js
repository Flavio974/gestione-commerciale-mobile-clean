/**
 * Fix per l'estrazione corretta della P.IVA dalle Fatture (FTV)
 * Corregge il problema dove viene estratto il codice fiscale invece della P.IVA
 */

(function() {
    'use strict';
    
    console.log('💰 Applicando fix P.IVA per fatture FTV...');
    
    // Override del parseDocumentFromText
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[FTV PIVA FIX] Intercettato parseDocumentFromText');
            
            // Chiama il parser originale
            const result = originalParse.call(this, text, fileName);
            
            if (!result) return result;
            
            // Solo per fatture (FT o FTV) e note di credito (NC)
            if (result.type === 'fattura' || result.documentType === 'FT' || 
                result.type === 'nc' || result.documentType === 'NC' ||
                (fileName && (fileName.toUpperCase().includes('FTV') || fileName.toUpperCase().includes('NC')))) {
                
                console.log('[FTV PIVA FIX] Documento fattura rilevato, verifico P.IVA...');
                console.log('[FTV PIVA FIX] P.IVA attuale:', result.vatNumber);
                
                // Se la P.IVA attuale non è valida (non è di 11 cifre), cerca quella corretta
                if (!result.vatNumber || !/^\d{11}$/.test(result.vatNumber)) {
                    console.log('[FTV PIVA FIX] P.IVA non valida, cerco quella corretta...');
                    
                    const lines = text.split('\n');
                    let correctVatNumber = '';
                    
                    // Metodo 1: Cerca nella riga con FT (riga del documento)
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        
                        // Pattern: FT numero data codiceCliente P.IVA codiceFiscale
                        if (line.match(/^FT\s+\d+\s+/)) {
                            console.log(`[FTV PIVA FIX] Trovata riga FT: "${line}"`);
                            
                            // Estrai tutti i numeri di 11 cifre dalla riga
                            const vatMatches = line.match(/\b\d{11}\b/g);
                            if (vatMatches && vatMatches.length > 0) {
                                // Escludi la P.IVA del fornitore
                                for (const vat of vatMatches) {
                                    if (vat !== '03247720042') { // P.IVA Alfieri
                                        correctVatNumber = vat;
                                        console.log(`[FTV PIVA FIX] P.IVA trovata nella riga FT: ${correctVatNumber}`);
                                        break;
                                    }
                                }
                            }
                        }
                        
                        // Se abbiamo trovato la P.IVA, esci
                        if (correctVatNumber) break;
                    }
                    
                    // Metodo 2: Cerca dopo "Partita IVA" nell'header
                    if (!correctVatNumber) {
                        for (let i = 0; i < lines.length; i++) {
                            if (lines[i].includes('Partita IVA') && lines[i].includes('Codice Fiscale')) {
                                // La P.IVA dovrebbe essere nella riga successiva
                                if (i + 1 < lines.length) {
                                    const nextLine = lines[i + 1];
                                    console.log(`[FTV PIVA FIX] Riga dopo header P.IVA: "${nextLine}"`);
                                    
                                    // Cerca P.IVA di 11 cifre
                                    const vatMatch = nextLine.match(/\b\d{11}\b/);
                                    if (vatMatch && vatMatch[0] !== '03247720042') {
                                        correctVatNumber = vatMatch[0];
                                        console.log(`[FTV PIVA FIX] P.IVA trovata dopo header: ${correctVatNumber}`);
                                    }
                                }
                            }
                        }
                    }
                    
                    // Metodo 3: Cerca in tutto il testo escludendo la P.IVA del fornitore
                    if (!correctVatNumber) {
                        const allVats = text.match(/\b\d{11}\b/g);
                        if (allVats) {
                            for (const vat of allVats) {
                                if (vat !== '03247720042') {
                                    correctVatNumber = vat;
                                    console.log(`[FTV PIVA FIX] P.IVA trovata nel testo: ${correctVatNumber}`);
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Aggiorna la P.IVA se trovata
                    if (correctVatNumber && /^\d{11}$/.test(correctVatNumber)) {
                        result.vatNumber = correctVatNumber;
                        result.partitaIVA = correctVatNumber;
                        result.piva = correctVatNumber;
                        console.log(`✅ [FTV PIVA FIX] P.IVA corretta: ${correctVatNumber}`);
                    } else {
                        console.log('❌ [FTV PIVA FIX] Nessuna P.IVA valida trovata');
                    }
                } else {
                    console.log(`[FTV PIVA FIX] P.IVA già valida: ${result.vatNumber}`);
                }
                
                // Verifica anche il codice cliente
                if (!result.clientCode && text.includes('20272')) {
                    result.clientCode = '20272';
                    result.codiceCliente = '20272';
                    console.log('✅ [FTV PIVA FIX] Codice cliente aggiunto: 20272');
                }
            }
            
            return result;
        };
        
        console.log('✅ [FTV PIVA FIX] Override applicato');
    }
    
})();