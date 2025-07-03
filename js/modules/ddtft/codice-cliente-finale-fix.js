/**
 * Fix FINALE per il codice cliente - deve essere eseguito per ultimo
 * Corregge definitivamente il codice cliente da 20001 a quello corretto nel documento
 */

(function() {
    'use strict';
    
    console.log('🎯 Applicando fix FINALE codice cliente...');
    
    // Esegui dopo un delay maggiore per essere l'ultimo
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                    console.log('[CODICE CLIENTE FINALE] Verificando codice cliente...');
                    console.log('[CODICE CLIENTE FINALE] Codice attuale:', result.clientCode);
                    
                    // Se abbiamo il testo originale, cerca il codice corretto
                    if (result._originalText) {
                        // Pattern molto specifico per trovare il codice cliente
                        const patterns = [
                            // Cerca "Cod. Cli." seguito da spazi e un numero che NON sia 20001
                            /Cod\.?\s*Cli\.?\s+(\d{4,5})(?!\d)/gi,
                            // Cerca nella zona dove c'è anche la P.IVA
                            /Cod\.?\s*Cli\.?\s+(\d+)\s+[Pp]\.?[Ii]va/gi,
                            // Pattern con due punti
                            /Codice\s+Cliente\s*:\s*(\d{4,5})/gi
                        ];
                        
                        let codiceReale = null;
                        
                        for (const pattern of patterns) {
                            const matches = [...result._originalText.matchAll(pattern)];
                            for (const match of matches) {
                                const codice = match[1];
                                // Se è diverso da 20001, lo prendiamo
                                if (codice && codice !== '20001') {
                                    codiceReale = codice;
                                    console.log(`[CODICE CLIENTE FINALE] Trovato codice nel testo: ${codice}`);
                                    break;
                                }
                            }
                            if (codiceReale) break;
                        }
                        
                        // Se abbiamo trovato il codice reale e quello attuale è 20001, correggiamo
                        if (codiceReale && (result.clientCode === '20001' || !result.clientCode)) {
                            console.log(`✅ [CODICE CLIENTE FINALE] Correzione finale: ${result.clientCode} -> ${codiceReale}`);
                            result.clientCode = codiceReale;
                            result.codiceCliente = codiceReale;
                            result.customerCode = codiceReale;
                        }
                    }
                    
                    // Se ancora abbiamo 20001, proviamo a cercarlo nei campi esistenti
                    if (result.clientCode === '20001') {
                        // Controlla se abbiamo salvato il codice corretto in altri campi
                        const altCode = result.codiceCliente || result.customerCode || result.codiceClienteReale;
                        if (altCode && altCode !== '20001') {
                            console.log(`✅ [CODICE CLIENTE FINALE] Usato codice alternativo: ${altCode}`);
                            result.clientCode = altCode;
                        }
                    }
                    
                    console.log('[CODICE CLIENTE FINALE] Codice finale:', result.clientCode);
                }
                
                return result;
            };
            
            console.log('✅ [CODICE CLIENTE FINALE] Override finale applicato');
        }
    }, 1500); // Delay maggiore per essere sicuri che sia l'ultimo
    
})();