/**
 * Fix per estrarre correttamente il nome del cliente dai DDT
 * Il cliente si trova dopo la riga con numero/data/pagina/codice
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix estrazione cliente DDT...');
    
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                console.log('[DDT CLIENTE FIX] Verificando estrazione cliente DDT...');
                
                const lines = text.split('\n');
                
                // Cerca la riga con numero documento, data, pagina e codice cliente
                // Pattern: 4681 21/05/25 1 5712
                let datiTrovati = false;
                let nomeCliente = '';
                let indirizzoSede = '';
                let indirizzoConsegna = '';
                
                for (let i = 0; i < lines.length - 3; i++) {
                    const line = lines[i].trim();
                    
                    // Pattern per trovare la riga con i dati del documento
                    // numero(4 cifre) data(gg/mm/aa) pagina(1 cifra) codice(4-5 cifre)
                    const datiMatch = line.match(/^(\d{4,5})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(\d{4,5})$/);
                    
                    if (datiMatch) {
                        console.log(`[DDT CLIENTE FIX] Trovata riga dati documento alla riga ${i}: "${line}"`);
                        const numeroDoc = datiMatch[1];
                        const data = datiMatch[2];
                        const pagina = datiMatch[3];
                        const codiceCliente = datiMatch[4];
                        
                        // Il nome del cliente dovrebbe essere nella riga successiva
                        if (i + 1 < lines.length) {
                            const clientLine = lines[i + 1].trim();
                            console.log(`[DDT CLIENTE FIX] Riga cliente: "${clientLine}"`);
                            
                            // Il nome potrebbe essere ripetuto due volte (sede e consegna)
                            const parts = clientLine.split(/\s{2,}/); // Split su spazi multipli
                            if (parts.length > 0) {
                                nomeCliente = parts[0].trim();
                                
                                // Se il nome è duplicato (es. "STIG SRL STIG SRL"), prendi solo la prima parte
                                if (parts.length > 1 && parts[0] === parts[1]) {
                                    console.log(`[DDT CLIENTE FIX] Nome cliente duplicato, uso solo la prima parte`);
                                    nomeCliente = parts[0].trim();
                                } else if (clientLine.includes(nomeCliente + ' ' + nomeCliente)) {
                                    // Gestisci anche il caso dove non ci sono spazi multipli
                                    console.log(`[DDT CLIENTE FIX] Nome cliente duplicato (senza spazi multipli)`);
                                    // Già corretto, nomeCliente contiene solo una parte
                                }
                                
                                console.log(`[DDT CLIENTE FIX] Nome cliente estratto: "${nomeCliente}"`);
                            }
                        }
                        
                        // Gli indirizzi dovrebbero essere nelle righe successive
                        if (i + 2 < lines.length) {
                            const addressLine = lines[i + 2].trim();
                            console.log(`[DDT CLIENTE FIX] Riga indirizzi: "${addressLine}"`);
                            
                            const addressParts = addressLine.split(/\s{2,}/);
                            if (addressParts.length > 0) {
                                indirizzoSede = addressParts[0].trim();
                                if (addressParts.length > 1) {
                                    indirizzoConsegna = addressParts[1].trim();
                                }
                            }
                        }
                        
                        // CAP e città nella riga successiva
                        if (i + 3 < lines.length) {
                            const cityLine = lines[i + 3].trim();
                            console.log(`[DDT CLIENTE FIX] Riga città: "${cityLine}"`);
                            
                            const cityParts = cityLine.split(/\s{2,}/);
                            if (cityParts.length > 1 && indirizzoConsegna) {
                                // Prendi la parte dopo gli spazi multipli per l'indirizzo di consegna
                                indirizzoConsegna += ' ' + cityParts[1].trim();
                            }
                        }
                        
                        datiTrovati = true;
                        break;
                    }
                }
                
                if (datiTrovati && nomeCliente) {
                    console.log(`✅ [DDT CLIENTE FIX] Cliente corretto trovato: ${nomeCliente}`);
                    result.cliente = nomeCliente;
                    result.clientName = nomeCliente;
                    result.clienteNome = nomeCliente;
                    
                    if (indirizzoConsegna) {
                        console.log(`✅ [DDT CLIENTE FIX] Indirizzo consegna: ${indirizzoConsegna}`);
                        result.deliveryAddress = indirizzoConsegna;
                        result.indirizzoConsegna = indirizzoConsegna;
                    }
                } else {
                    console.log('[DDT CLIENTE FIX] Pattern dati documento non trovato');
                }
                
                // Se il cliente contiene ancora "Il numero di lotto", rimuovilo
                if (result.cliente && result.cliente.includes('Il numero di lotto')) {
                    console.log('[DDT CLIENTE FIX] Rimuovo testo errato dal cliente');
                    if (nomeCliente) {
                        result.cliente = nomeCliente;
                        result.clientName = nomeCliente;
                    } else {
                        result.cliente = 'CLIENTE NON TROVATO';
                        result.clientName = 'CLIENTE NON TROVATO';
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [DDT CLIENTE FIX] Override parseDocumentFromText applicato');
    }
    
    // Override anche nel normalizeDocumentFields
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                    // Assicurati che il cliente non contenga "Il numero di lotto"
                    if (result.cliente && result.cliente.includes('Il numero di lotto')) {
                        console.log('[DDT CLIENTE FIX] Correzione finale cliente in normalize');
                        result.cliente = 'CLIENTE NON TROVATO';
                        result.clientName = 'CLIENTE NON TROVATO';
                    }
                    
                    // Correggi anche nomi duplicati
                    if (result.cliente) {
                        // Pattern per rilevare duplicazioni tipo "STIG SRL STIG SRL"
                        const parts = result.cliente.split(' ');
                        if (parts.length >= 2) {
                            // Controlla se la seconda metà è identica alla prima
                            const halfLength = Math.floor(parts.length / 2);
                            const firstHalf = parts.slice(0, halfLength).join(' ');
                            const secondHalf = parts.slice(halfLength).join(' ');
                            
                            if (firstHalf === secondHalf && firstHalf.length > 0) {
                                console.log(`[DDT CLIENTE FIX] Nome duplicato rilevato in normalize: "${result.cliente}" -> "${firstHalf}"`);
                                result.cliente = firstHalf;
                                result.clientName = firstHalf;
                            }
                        }
                    }
                }
                
                return result;
            };
            
            console.log('✅ [DDT CLIENTE FIX] Override normalizeDocumentFields applicato');
        }
    }, 2000);
    
})();