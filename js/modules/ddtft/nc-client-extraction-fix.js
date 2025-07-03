/**
 * Fix specifico per l'estrazione del cliente dalle Note di Credito (NC)
 * Risolve il problema dove tutti i clienti NC vengono mappati erroneamente a MOLE MARKET
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix estrazione cliente NC...');
    
    // Override del parser principale
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            // Solo per NC
            if (result && (result.type === 'nc' || result.documentType === 'NC')) {
                console.log('[NC CLIENT FIX] Analizzando NC per estrazione cliente...');
                
                const lines = text.split('\n');
                let clienteCorretto = null;
                
                // Strategia 1: Cerca dopo "Attenzione!!"
                const attenzioneIndex = lines.findIndex(line => line.includes('Attenzione!!'));
                if (attenzioneIndex >= 0) {
                    console.log('[NC CLIENT FIX] Trovato "Attenzione!!" alla riga', attenzioneIndex);
                    
                    // Cerca il nome del cliente nelle righe successive
                    for (let i = attenzioneIndex + 1; i < Math.min(attenzioneIndex + 10, lines.length); i++) {
                        const line = lines[i].trim();
                        
                        // Salta righe vuote o con testo standard
                        if (!line || line.includes('contrario') || line.includes('risarciremo')) {
                            continue;
                        }
                        
                        // Se troviamo un nome valido (non indirizzo)
                        if (line.length > 3 && 
                            !line.match(/^(VIA|V\.LE|CORSO|STRADA|PIAZZA)/i) &&
                            !line.match(/^\d{5}\s/) &&
                            !line.includes('ALFIERI')) {
                            
                            // Potrebbe essere il nome del cliente
                            clienteCorretto = line;
                            
                            // Se la riga successiva sembra continuare il nome
                            if (i + 1 < lines.length) {
                                const nextLine = lines[i + 1].trim();
                                if (nextLine && !nextLine.match(/^(VIA|V\.LE|CORSO|STRADA|PIAZZA)/i) &&
                                    !nextLine.match(/^\d{5}\s/) && nextLine.includes('S.R.L.')) {
                                    clienteCorretto += ' ' + nextLine;
                                }
                            }
                            
                            console.log('[NC CLIENT FIX] Cliente trovato dopo Attenzione!!:', clienteCorretto);
                            break;
                        }
                    }
                }
                
                // Strategia 2: Cerca pattern specifici per clienti noti
                if (!clienteCorretto) {
                    // Pattern per DONAC
                    const donacPattern = /DONAC\s+S\.?R\.?L\.?/i;
                    const donacMatch = text.match(donacPattern);
                    if (donacMatch) {
                        clienteCorretto = 'DONAC S.R.L.';
                        console.log('[NC CLIENT FIX] Trovato DONAC con pattern:', clienteCorretto);
                    }
                    
                    // Pattern per MOLE MARKET
                    if (!clienteCorretto) {
                        const molePattern = /MOLE\s+MARKET\s+S\.?R\.?L\.?/i;
                        const moleMatch = text.match(molePattern);
                        if (moleMatch) {
                            clienteCorretto = 'MOLE MARKET SRL';
                            console.log('[NC CLIENT FIX] Trovato MOLE MARKET con pattern:', clienteCorretto);
                        }
                    }
                }
                
                // Strategia 3: Cerca nella sezione "Spett.le"
                if (!clienteCorretto) {
                    const spettMatch = text.match(/Spett\.le\s*\n([^\n]+(?:\n[^\n]+)?)/i);
                    if (spettMatch) {
                        const clienteLines = spettMatch[1].trim().split('\n').map(l => l.trim());
                        clienteCorretto = clienteLines.filter(l => l.length > 0).join(' ');
                        console.log('[NC CLIENT FIX] Cliente trovato dopo Spett.le:', clienteCorretto);
                    }
                }
                
                // Strategia 4: Estrai dal codice cliente nel documento
                if (!clienteCorretto) {
                    // Cerca il codice cliente reale nel documento
                    const codicePattern = /Cod\.\s*Cli\.\s*(\d{4,6})/i;
                    const codiceMatch = text.match(codicePattern);
                    if (codiceMatch && codiceMatch[1] !== '20001') {
                        const codiceCliente = codiceMatch[1];
                        console.log('[NC CLIENT FIX] Codice cliente trovato:', codiceCliente);
                        
                        // Mappa il codice al nome
                        const clientMapping = {
                            '20322': 'DONAC S.R.L.',
                            '20283': 'AZ. AGR. LA MANDRIA S.S. DI GOIA E. E CAPRA S. S.S.',
                            '4226': 'ALTRO CLIENTE'
                        };
                        
                        if (clientMapping[codiceCliente]) {
                            clienteCorretto = clientMapping[codiceCliente];
                            console.log('[NC CLIENT FIX] Cliente mappato da codice:', clienteCorretto);
                        }
                    }
                }
                
                // Applica il cliente corretto se trovato
                if (clienteCorretto) {
                    result.cliente = clienteCorretto;
                    result.clientName = clienteCorretto;
                    result.nomeCliente = clienteCorretto;
                    result.customerName = clienteCorretto;
                    result.ragioneSociale = clienteCorretto;  // Aggiungi questo campo
                    
                    // Salva anche in campi di backup
                    result._clienteReale = clienteCorretto;
                    result._clienteOriginale = clienteCorretto;
                    result._ragioneSocialeReale = clienteCorretto;
                    
                    console.log('✅ [NC CLIENT FIX] Cliente corretto impostato:', clienteCorretto);
                    
                    // Mappa il cliente al codice corretto
                    const clientToCodeMap = {
                        'DONAC S.R.L.': '20322',
                        'MOLE MARKET SRL': '20351',
                        'AZ. AGR. LA MANDRIA S.S. DI GOIA E. E CAPRA S. S.S.': '20283'
                    };
                    
                    if (clientToCodeMap[clienteCorretto]) {
                        result.clientCode = clientToCodeMap[clienteCorretto];
                        result.codiceCliente = clientToCodeMap[clienteCorretto];
                        result.customerCode = clientToCodeMap[clienteCorretto];
                        console.log('✅ [NC CLIENT FIX] Codice cliente mappato:', clientToCodeMap[clienteCorretto]);
                    }
                } else {
                    console.log('❌ [NC CLIENT FIX] Nessun cliente trovato, mantengo il valore esistente');
                }
                
                // Debug: mostra tutti i valori cliente
                console.log('[NC CLIENT FIX] Valori finali cliente:', {
                    cliente: result.cliente,
                    clientName: result.clientName,
                    nomeCliente: result.nomeCliente,
                    codiceCliente: result.clientCode || result.codiceCliente
                });
            }
            
            return result;
        };
        
        console.log('✅ [NC CLIENT FIX] Override parseDocumentFromText applicato');
    }
    
    // Protezione aggiuntiva: override del normalizeDocumentFields
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                // Per NC, preserva il cliente corretto
                if (result && (result.type === 'nc' || result.documentType === 'NC')) {
                    if (result._clienteReale) {
                        result.cliente = result._clienteReale;
                        result.clientName = result._clienteReale;
                        result.nomeCliente = result._clienteReale;
                        result.ragioneSociale = result._clienteReale;
                        console.log('[NC CLIENT FIX] Preservato cliente in normalize:', result._clienteReale);
                    }
                    
                    // NON modificare l'indirizzo di consegna qui - viene gestito dal fix CORSO ROMANIA
                }
                
                return result;
            };
            
            console.log('✅ [NC CLIENT FIX] Override normalizeDocumentFields applicato');
        }
    }, 2000);
    
    // Fix sulla visualizzazione
    setTimeout(() => {
        if (window.displayDocumentDetails) {
            const originalDisplay = window.displayDocumentDetails;
            
            window.displayDocumentDetails = function(doc) {
                if (doc && doc.type === 'nc' && doc._clienteReale) {
                    doc.cliente = doc._clienteReale;
                    doc.clientName = doc._clienteReale;
                    doc.ragioneSociale = doc._clienteReale;
                    
                    // L'indirizzo di consegna viene gestito separatamente:
                    // - MOLE MARKET: CORSO ROMANIA (gestito dal fix CORSO ROMANIA)
                    // - DONAC: indirizzo del cliente stesso
                }
                return originalDisplay.apply(this, arguments);
            };
        }
    }, 4000);
    
})();