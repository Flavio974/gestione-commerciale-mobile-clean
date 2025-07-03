/**
 * Fix avanzato per estrarre codice cliente e P.IVA dalla zona header del documento
 * Cerca nella posizione corretta dopo la riga "Tipo documento..."
 */

(function() {
    'use strict';
    
    console.log('🎯 Applicando fix estrazione header codice/P.IVA...');
    
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ft' || result.documentType === 'FT' || result.type === 'nc' || result.documentType === 'NC')) {
                console.log('[HEADER CODICE PIVA] Analizzando header documento...');
                
                const lines = text.split('\n');
                let headerIndex = -1;
                
                // Trova la riga header
                for (let i = 0; i < lines.length && i < 20; i++) {
                    if (lines[i].includes('Tipo documento') && lines[i].includes('Cod. Cli.') && lines[i].includes('Partita IVA')) {
                        headerIndex = i;
                        console.log(`[HEADER CODICE PIVA] Header trovato alla riga ${i}: "${lines[i]}"`);
                        break;
                    }
                }
                
                // Se abbiamo trovato l'header, cerca i dati prima e dopo l'header
                if (headerIndex >= 0) {
                    // Prima cerca nelle righe PRIMA dell'header (per NC potrebbe essere lì)
                    for (let offset = -5; offset <= 10; offset++) {
                        if (offset === 0) continue; // Salta l'header stesso
                        const dataLineIndex = headerIndex + offset;
                        if (dataLineIndex >= 0 && dataLineIndex < lines.length) {
                            const dataLine = lines[dataLineIndex];
                            console.log(`[HEADER CODICE PIVA] Analizzando riga ${dataLineIndex}: "${dataLine}"`);
                            
                            // Salta righe che contengono IBAN o riferimenti bancari
                            if (dataLine.includes('IBAN') || dataLine.includes('Banca') || dataLine.includes('Banco') || 
                                dataLine.includes('UNICREDIT') || dataLine.includes('BIC')) {
                                console.log('[HEADER CODICE PIVA] Saltando riga bancaria');
                                continue;
                            }
                            
                            // Pattern per trovare i dati nel formato: FT/NC 4904 data ora CODICE PIVA PIVA
                            const dataPattern = /(FT|NC)\s+(\d+)\s+[\d\/]+\s+[\d\.]+\s+(\d{4,5})\s+(\d{11})\s+(\d{11})/;
                            const match = dataLine.match(dataPattern);
                            
                            if (match) {
                                const tipoDoc = match[1];
                                const numeroDoc = match[2];
                                const codiceCliente = match[3];
                                const piva1 = match[4];
                                const piva2 = match[5];
                                
                                console.log(`[HEADER CODICE PIVA] Dati trovati nel pattern:`);
                                console.log(`  - Numero documento: ${numeroDoc}`);
                                console.log(`  - Codice cliente: ${codiceCliente}`);
                                console.log(`  - P.IVA 1: ${piva1}`);
                                console.log(`  - P.IVA 2: ${piva2}`);
                                
                                // Usa il codice cliente se diverso da 20001
                                if (codiceCliente && codiceCliente !== '20001') {
                                    console.log(`✅ [HEADER CODICE PIVA] Codice cliente estratto: ${codiceCliente}`);
                                    result.clientCode = codiceCliente;
                                    result.codiceCliente = codiceCliente;
                                    result.customerCode = codiceCliente;
                                    result._codiceClienteReale = codiceCliente;
                                }
                                
                                // Usa la P.IVA se valida (non quella dell'emittente)
                                const pivaValida = piva1 !== '03247720042' ? piva1 : piva2;
                                if (pivaValida && pivaValida !== '03247720042') {
                                    console.log(`✅ [HEADER CODICE PIVA] P.IVA estratta: ${pivaValida}`);
                                    result.vatNumber = pivaValida;
                                    result.partitaIVA = pivaValida;
                                    result.piva = pivaValida;
                                    result._pivaReale = pivaValida;
                                }
                                
                                break;
                            }
                            
                            // Pattern alternativo solo se non è una riga bancaria
                            if (!dataLine.includes('IBAN') && !dataLine.includes('Filiale')) {
                                const altPattern = /(\d{4,5})\s+(\d{11})/g;
                                const altMatches = [...dataLine.matchAll(altPattern)];
                                
                                if (altMatches.length > 0) {
                                    console.log(`[HEADER CODICE PIVA] Pattern alternativo trovato ${altMatches.length} match`);
                                    
                                    for (const altMatch of altMatches) {
                                        const codice = altMatch[1];
                                        const piva = altMatch[2];
                                        
                                        // Se il codice è diverso da 20001 e la P.IVA non è dell'emittente
                                        // E il codice non è un codice bancario comune (22500, 22502, etc)
                                        if (codice !== '20001' && piva !== '03247720042' && 
                                            !codice.startsWith('225') && !codice.startsWith('034')) {
                                            console.log(`✅ [HEADER CODICE PIVA] Trovato con pattern alternativo:`);
                                            console.log(`  - Codice: ${codice}`);
                                            console.log(`  - P.IVA: ${piva}`);
                                            
                                            result.clientCode = codice;
                                            result.codiceCliente = codice;
                                            result.customerCode = codice;
                                            result._codiceClienteReale = codice;
                                            
                                            result.vatNumber = piva;
                                            result.partitaIVA = piva;
                                            result.piva = piva;
                                            result._pivaReale = piva;
                                            
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    console.log('[HEADER CODICE PIVA] Header non trovato nelle prime 20 righe');
                }
                
                // Se ancora non abbiamo trovato i dati e è una NC, cerca in tutto il documento
                if ((!result.clientCode || result.clientCode === '20001') && result.type === 'nc') {
                    console.log('[HEADER CODICE PIVA] Ricerca estesa per NC...');
                    
                    // Cerca una riga che inizia con NC seguito dal numero
                    for (let i = 0; i < lines.length && i < 100; i++) {
                        const line = lines[i];
                        // Pattern per NC: "NC 4769 04/06/2025 09.38 20001 02807090028 02807090028"
                        const ncPattern = /^NC\s+(\d+)\s+[\d\/]+\s+[\d\.]+\s+(\d{4,5})\s+(\d{11})\s+(\d{11})/;
                        const ncMatch = line.match(ncPattern);
                        
                        if (ncMatch) {
                            console.log(`[HEADER CODICE PIVA] Trovata riga NC alla posizione ${i}: "${line}"`);
                            const numeroDoc = ncMatch[1];
                            const codiceCliente = ncMatch[2];
                            const piva1 = ncMatch[3];
                            const piva2 = ncMatch[4];
                            
                            console.log(`[HEADER CODICE PIVA] Dati NC trovati:`);
                            console.log(`  - Numero NC: ${numeroDoc}`);
                            console.log(`  - Codice cliente: ${codiceCliente}`);
                            console.log(`  - P.IVA 1: ${piva1}`);
                            console.log(`  - P.IVA 2: ${piva2}`);
                            
                            if (codiceCliente && codiceCliente !== '20001') {
                                result.clientCode = codiceCliente;
                                result.codiceCliente = codiceCliente;
                                result.customerCode = codiceCliente;
                                result._codiceClienteReale = codiceCliente;
                            }
                            
                            const pivaValida = piva1 !== '03247720042' ? piva1 : piva2;
                            if (pivaValida && pivaValida !== '03247720042') {
                                result.vatNumber = pivaValida;
                                result.partitaIVA = pivaValida;
                                result.piva = pivaValida;
                                result._pivaReale = pivaValida;
                            }
                            
                            break;
                        }
                    }
                }
                
                // Log dei valori finali
                console.log('[HEADER CODICE PIVA] Valori estratti:');
                console.log(`  - Codice cliente: ${result.clientCode || 'non trovato'}`);
                console.log(`  - P.IVA: ${result.vatNumber || 'non trovata'}`);
            }
            
            return result;
        };
        
        console.log('✅ [HEADER CODICE PIVA] Override parseDocumentFromText applicato');
    }
    
    // Fix nel normalizeDocumentFields per preservare i valori
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                if (result && (result.type === 'ft' || result.documentType === 'FT' || result.type === 'nc' || result.documentType === 'NC')) {
                    // Ripristina i valori salvati se esistono
                    if (result._codiceClienteReale) {
                        result.clientCode = result._codiceClienteReale;
                        result.codiceCliente = result._codiceClienteReale;
                        console.log(`[HEADER CODICE PIVA] Preservato codice cliente: ${result._codiceClienteReale}`);
                    }
                    
                    if (result._pivaReale) {
                        result.vatNumber = result._pivaReale;
                        result.piva = result._pivaReale;
                        result.partitaIVA = result._pivaReale;
                        console.log(`[HEADER CODICE PIVA] Preservata P.IVA: ${result._pivaReale}`);
                    }
                }
                
                return result;
            };
            
            console.log('✅ [HEADER CODICE PIVA] Override normalizeDocumentFields applicato');
        }
    }, 3000); // Esegui dopo tutti gli altri fix
    
})();