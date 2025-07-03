/**
 * Fix prioritario per estrarre il cliente TIBALDI correttamente
 * Deve essere eseguito PRIMA di tutti gli altri fix
 */

(function() {
    'use strict';
    
    console.log('🚨 Applicando fix PRIORITARIO cliente TIBALDI...');
    
    // Override del parseDocumentFromText per intercettare PRIMA di tutto
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[PRIORITY FIX] Intercettato parseDocumentFromText PRIMA di tutto');
            
            // Chiama il metodo originale
            const result = originalParse.call(this, text, fileName);
            
            // Se è una fattura e il cliente non è corretto
            if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                console.log('[PRIORITY FIX] Fattura rilevata, verifico cliente...');
                console.log('[PRIORITY FIX] Cliente attuale:', result.clientName || result.cliente);
                
                // Cerca il cliente dopo "Attenzione!!" (pattern generale per tutte le fatture)
                const attenzioneIdx = text.indexOf('Attenzione!!');
                if (attenzioneIdx > -1) {
                    // Estrai il testo dopo "Attenzione!!"
                    const testoDopoAttenzione = text.substring(attenzioneIdx);
                    const lines = testoDopoAttenzione.split('\n');
                    
                    let clienteLines = [];
                    let skipLines = 2; // Salta "Attenzione!!" e "contrario non risarciremo..."
                    let foundClient = false;
                    
                    for (let i = skipLines; i < lines.length && i < skipLines + 10; i++) {
                        const line = lines[i].trim();
                        
                        // Salta righe vuote
                        if (!line) continue;
                        
                        // Se troviamo ALFIERI, abbiamo finito
                        if (line.includes('ALFIERI') || line.includes('alfieri')) break;
                        
                        // Pattern più completi per indirizzi - se li troviamo E abbiamo già trovato almeno una riga cliente, fermiamoci
                        if (foundClient) {
                            // Pattern indirizzi italiani comuni
                            if (line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA|STR\.|VICOLO|V\.LO|LOCALITA|LOC\.|FRAZIONE|FRAZ\.|BORGATA|B\.TA)/i)) break;
                            // CAP (5 cifre all'inizio della riga)
                            if (line.match(/^\d{5}\s+/)) break;
                            // Numeri civici isolati
                            if (line.match(/^(N\.|N|NUM\.|NUMERO)\s*\d+/i)) break;
                            // Pattern che indicano un indirizzo (es. "VALDIBERTI N. 11")
                            if (line.match(/\b(N\.|N|NUM\.)\s*\d+\s*$/i)) break;
                        }
                        
                        // Aggiungi la riga al cliente
                        clienteLines.push(line);
                        foundClient = true;
                        
                        // Se la riga termina con forme societarie, probabilmente abbiamo finito
                        if (line.match(/(S\.R\.L\.|SRL|S\.P\.A\.|SPA|S\.N\.C\.|SNC|S\.A\.S\.|SAS|S\.S\.|SOC\.?\s*SEMPLICE)\s*$/i)) {
                            break;
                        }
                    }
                    
                    if (clienteLines.length > 0) {
                        const cliente = clienteLines.join(' ').replace(/\s+/g, ' ').trim();
                        console.log(`✅ [PRIORITY FIX] Cliente trovato dopo Attenzione: ${cliente}`);
                        
                        // Sovrascrivi TUTTI i campi cliente
                        result.cliente = cliente;
                        result.clientName = cliente;
                        result.clienteOriginale = cliente; // Campo custom per preservare il valore
                        
                        // NON estrarre l'indirizzo del cliente qui - sarà gestito dal delivery-address-fix.js
                        // che cerca specificamente nella sezione "Luogo di consegna"
                        console.log('[PRIORITY FIX] Indirizzo di consegna sarà estratto da delivery-address-fix.js');
                    }
                }
                
                // Se non abbiamo trovato il cliente con il metodo sopra, proviamo altri pattern
                if (!result.clienteOriginale || result.clienteOriginale === 'NOME CLIENTE DA INSERIRE') {
                    // Pattern alternativo: cerca dopo "destinatario"
                    const destMatch = text.match(/destinatario\s*\n([^\n]+(?:\n[^\n]+)*?)(?=\n(?:ALFIERI|$))/i);
                    if (destMatch) {
                        const lines = destMatch[1].split('\n').filter(l => l.trim());
                        const cliente = lines[0]; // Prima riga dopo "destinatario"
                        if (cliente && !cliente.includes('Attenzione')) {
                            console.log(`✅ [PRIORITY FIX] Cliente trovato dopo destinatario: ${cliente}`);
                            result.cliente = cliente;
                            result.clientName = cliente;
                            result.clienteOriginale = cliente;
                        }
                    }
                }
                
                // Estrai sempre il codice cliente dal testo
                const codiceMatch = text.match(/Cod\.\s*Cli\.\s*(\d+)/i);
                if (codiceMatch) {
                    result.clientCode = codiceMatch[1];
                    console.log(`✅ [PRIORITY FIX] Codice cliente: ${result.clientCode}`);
                }
                
                // Salva il testo originale per uso futuro nei fix successivi
                result._originalText = text;
            }
            
            return result;
        };
        
        console.log('✅ [PRIORITY FIX] Override parseDocumentFromText applicato');
    }
    
    // Override anche del normalizeDocumentFields per preservare il cliente
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                console.log('[PRIORITY FIX] Intercettato normalizeDocumentFields');
                
                // Salva il cliente originale se presente
                let clienteOriginale = null;
                if (doc && doc.clienteOriginale) {
                    clienteOriginale = doc.clienteOriginale;
                }
                
                // Chiama il metodo originale
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                // Ripristina il cliente originale se era stato salvato
                if (clienteOriginale && result) {
                    result.cliente = clienteOriginale;
                    result.clientName = clienteOriginale;
                    console.log(`✅ [PRIORITY FIX] Cliente preservato: ${clienteOriginale}`);
                }
                
                return result;
            };
            
            console.log('✅ [PRIORITY FIX] Override normalizeDocumentFields applicato');
        }
    }, 50);
    
})();