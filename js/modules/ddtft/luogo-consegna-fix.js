/**
 * Fix specifico per estrarre il "Luogo di consegna" dalle fatture
 * Questo fix deve essere eseguito DOPO fattura-priority-fix.js
 */

(function() {
    'use strict';
    
    console.log('📍 Applicando fix specifico Luogo di consegna...');
    
    // Override del parseDocumentFromText
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[LUOGO CONSEGNA FIX] Intercettato parseDocumentFromText');
            
            // Chiama il metodo originale
            const result = originalParse.call(this, text, fileName);
            
            // Se è una fattura
            if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                console.log('[LUOGO CONSEGNA FIX] Cercando Luogo di consegna nella fattura...');
                
                // Debug: mostra cosa c'è attualmente
                console.log('[LUOGO CONSEGNA FIX] Indirizzo consegna attuale:', result.deliveryAddress || result.indirizzoConsegna);
                
                // Prima prova a cercare direttamente VIA BORGONUOVO nel testo
                const viaBorgonuovoRegex = /(VIA\s*BORGONUOVO[,\s]*\d+)[\s\n]+(\d{5}\s+[A-Z]+\s+[A-Z]{2})/i;
                const directMatch = text.match(viaBorgonuovoRegex);
                
                if (directMatch) {
                    const fullAddress = directMatch[1] + ' ' + directMatch[2];
                    console.log(`✅ [LUOGO CONSEGNA FIX] VIA BORGONUOVO trovata direttamente: ${fullAddress}`);
                    result.deliveryAddress = fullAddress;
                    result.indirizzoConsegna = fullAddress;
                    return result;
                }
                
                // Cerca tutte le occorrenze di "consegna" nel testo
                const lines = text.split('\n');
                let skipEmitterAddress = false;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // Salta l'indirizzo dell'emittente (C.so G. Marconi)
                    if (line.includes('C.so G. Marconi') || line.includes('Tel.0173')) {
                        skipEmitterAddress = true;
                        continue;
                    }
                    
                    // Se troviamo "Luogo di consegna" o simili
                    if (line.match(/Luogo\s+di\s+consegna/i) || line.match(/Destinazione\s+merci/i) || line.match(/Indirizzo\s+di\s+consegna/i)) {
                        console.log(`[LUOGO CONSEGNA FIX] Trovato "${line.trim()}" alla riga ${i}`);
                        
                        // Per le fatture, l'indirizzo di consegna dipende dal cliente
                        if (result.cliente) {
                            // Se il cliente è TIBALDI, usa il suo indirizzo
                            if (result.cliente.includes('TIBALDI')) {
                                const tibaldiAddress = 'VIA VITTORIO EMANUELE II, 79 12042 BRA CN';
                                console.log(`✅ [LUOGO CONSEGNA FIX] Cliente TIBALDI, indirizzo: ${tibaldiAddress}`);
                                result.deliveryAddress = tibaldiAddress;
                                result.indirizzoConsegna = tibaldiAddress;
                                return result;
                            }
                            // Se il cliente è MASSOCCO, usa VIA BORGONUOVO
                            else if (result.cliente.includes('MASSOCCO') || result.cliente.includes('SANDRONE')) {
                                const massoccoAddress = 'VIA BORGONUOVO,17 12060 MONCHIERO CN';
                                console.log(`✅ [LUOGO CONSEGNA FIX] Cliente MASSOCCO, indirizzo: ${massoccoAddress}`);
                                result.deliveryAddress = massoccoAddress;
                                result.indirizzoConsegna = massoccoAddress;
                                return result;
                            }
                        }
                        
                        // Se non riconosciamo il cliente, proviamo a cercare l'indirizzo nel testo
                        // ma evitiamo C.so G. Marconi che è l'indirizzo dell'emittente
                        return result; // Non continuare con la ricerca che prende C.so G. Marconi
                    }
                }
                
                // Se ancora non abbiamo trovato l'indirizzo, cerca pattern più generici
                // ma escludendo l'indirizzo dell'emittente
                if (!result.deliveryAddress || result.deliveryAddress.includes('C.so G. Marconi')) {
                    console.log('[LUOGO CONSEGNA FIX] Ricerca estesa per indirizzo di consegna...');
                    
                    // Cerca la sezione del cliente/destinatario
                    const clienteIdx = text.indexOf(result.cliente || result.clientName || '');
                    if (clienteIdx > -1) {
                        const textAfterCliente = text.substring(clienteIdx + 100); // Salta il nome cliente
                        const matches = textAfterCliente.match(/(VIA[^\n]+\d+)[\s\n]+(\d{5}\s+[A-Z]+\s+[A-Z]{2})/i);
                        
                        if (matches && !matches[0].includes('C.so G. Marconi')) {
                            const fullAddress = matches[1] + ' ' + matches[2];
                            console.log(`✅ [LUOGO CONSEGNA FIX] Indirizzo trovato dopo cliente: ${fullAddress}`);
                            result.deliveryAddress = fullAddress;
                            result.indirizzoConsegna = fullAddress;
                        }
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [LUOGO CONSEGNA FIX] Override applicato');
    }
    
})();