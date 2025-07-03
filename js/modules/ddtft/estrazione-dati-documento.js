/**
 * Fix per estrarre codice cliente e P.IVA dalla riga dati del documento
 * Cerca nella riga che contiene "FT numero data ora codice piva"
 */

(function() {
    'use strict';
    
    console.log('🎯 Applicando fix estrazione dati documento...');
    
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                console.log('[DATI DOCUMENTO] Cercando riga con dati documento...');
                
                const lines = text.split('\n');
                
                // Pattern per trovare la riga con i dati: FT numero data ora codice piva piva
                // Esempio: "FT 4904 9/06/25 13.31 5951 03647400047 03647400047 Pagina 1 di 1"
                const datiPattern = /FT\s+(\d+)\s+[\d\/]+\s+[\d\.]+\s+(\d{4,5})\s+(\d{11})\s+(\d{11})/;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const match = line.match(datiPattern);
                    
                    if (match) {
                        console.log(`[DATI DOCUMENTO] Trovata riga dati alla riga ${i}: "${line}"`);
                        
                        const numeroFattura = match[1];
                        const codiceCliente = match[2];
                        const piva1 = match[3];
                        const piva2 = match[4];
                        
                        console.log(`[DATI DOCUMENTO] Dati estratti:`);
                        console.log(`  - Numero fattura: ${numeroFattura}`);
                        console.log(`  - Codice cliente: ${codiceCliente}`);
                        console.log(`  - P.IVA 1: ${piva1}`);
                        console.log(`  - P.IVA 2: ${piva2}`);
                        
                        // Verifica che il numero fattura corrisponda
                        if (numeroFattura === result.orderNumber || numeroFattura === result.documentNumber) {
                            // Usa il codice cliente trovato
                            if (codiceCliente && codiceCliente !== '20001') {
                                console.log(`✅ [DATI DOCUMENTO] Codice cliente corretto: ${codiceCliente}`);
                                result.clientCode = codiceCliente;
                                result.codiceCliente = codiceCliente;
                                result.customerCode = codiceCliente;
                                result._codiceClienteReale = codiceCliente;
                            }
                            
                            // Usa la P.IVA (preferisci quella diversa da quella dell'emittente)
                            const pivaCliente = (piva1 !== '03247720042' && piva1.length === 11) ? piva1 : piva2;
                            if (pivaCliente && pivaCliente !== '03247720042' && pivaCliente.length === 11) {
                                console.log(`✅ [DATI DOCUMENTO] P.IVA cliente corretta: ${pivaCliente}`);
                                result.vatNumber = pivaCliente;
                                result.partitaIVA = pivaCliente;
                                result.piva = pivaCliente;
                                result._pivaReale = pivaCliente;
                            }
                        }
                        
                        break;
                    }
                }
                
                // Se non trovato con il pattern completo, prova pattern più semplici
                if (!result._codiceClienteReale) {
                    console.log('[DATI DOCUMENTO] Tentativo con pattern semplificati...');
                    
                    // Cerca pattern tipo "FT 4904" seguito da codice e P.IVA
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        
                        // Se la riga contiene FT e il numero documento
                        if (line.includes('FT') && line.includes(result.orderNumber || result.documentNumber)) {
                            console.log(`[DATI DOCUMENTO] Analizzando riga ${i}: "${line}"`);
                            
                            // Estrai tutti i numeri dalla riga
                            const numeri = line.match(/\d+/g);
                            if (numeri && numeri.length >= 3) {
                                // Cerca un numero di 4-5 cifre (codice cliente)
                                for (const num of numeri) {
                                    if (num.length >= 4 && num.length <= 5 && num !== '20001' && num !== result.orderNumber) {
                                        console.log(`[DATI DOCUMENTO] Possibile codice cliente: ${num}`);
                                        
                                        // Verifica che non sia un CAP o altro numero comune
                                        if (!['12042', '12050', '12060', '12063'].includes(num)) {
                                            result.clientCode = num;
                                            result.codiceCliente = num;
                                            result._codiceClienteReale = num;
                                            console.log(`✅ [DATI DOCUMENTO] Codice cliente identificato: ${num}`);
                                            break;
                                        }
                                    }
                                }
                                
                                // Cerca P.IVA (11 cifre)
                                for (const num of numeri) {
                                    if (num.length === 11 && num !== '03247720042') {
                                        result.vatNumber = num;
                                        result.piva = num;
                                        result._pivaReale = num;
                                        console.log(`✅ [DATI DOCUMENTO] P.IVA identificata: ${num}`);
                                        break;
                                    }
                                }
                            }
                            
                            if (result._codiceClienteReale && result._pivaReale) {
                                break;
                            }
                        }
                    }
                }
                
                // Log finale
                console.log('[DATI DOCUMENTO] Risultato finale:');
                console.log(`  - Codice cliente: ${result.clientCode || 'non trovato'}`);
                console.log(`  - P.IVA: ${result.vatNumber || 'non trovata'}`);
            }
            
            return result;
        };
        
        console.log('✅ [DATI DOCUMENTO] Override parseDocumentFromText applicato');
    }
    
    // Override normalizeDocumentFields per preservare i valori
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                    // Preserva i valori salvati
                    if (result._codiceClienteReale) {
                        result.clientCode = result._codiceClienteReale;
                        result.codiceCliente = result._codiceClienteReale;
                    }
                    
                    if (result._pivaReale) {
                        result.vatNumber = result._pivaReale;
                        result.piva = result._pivaReale;
                        result.partitaIVA = result._pivaReale;
                    }
                }
                
                return result;
            };
            
            console.log('✅ [DATI DOCUMENTO] Override normalizeDocumentFields applicato');
        }
    }, 3500); // Esegui dopo tutti gli altri fix
    
})();