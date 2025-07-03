/**
 * Fix ultra-specifico per estrarre l'indirizzo di consegna corretto
 * evitando l'indirizzo dell'emittente (C.so G. Marconi)
 */

(function() {
    'use strict';
    
    console.log('🎯 Applicando fix ultra-specifico indirizzo consegna...');
    
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                console.log('[CONSEGNA FIX] Analizzando fattura per indirizzo consegna...');
                
                // Rimuovi l'indirizzo se contiene C.so G. Marconi (è dell'emittente)
                if (result.deliveryAddress && result.deliveryAddress.includes('C.so G. Marconi')) {
                    console.log('[CONSEGNA FIX] Rimosso indirizzo emittente errato');
                    result.deliveryAddress = '';
                    result.indirizzoConsegna = '';
                }
                
                // Strategia 1: Cerca VIA specifiche (BORGONUOVO, REPERGO, etc.)
                const specificPatterns = [
                    // Pattern per VIA BORGONUOVO
                    /VIA\s*BORGONUOVO[,\s]*(\d+)\s*[\n\r]+\s*(\d{5})\s+([A-Z\s]+)\s+([A-Z]{2})/i,
                    /VIA\s*BORGONUOVO[,\s]*(\d+)\s+(\d{5})\s+([A-Z\s]+)\s+([A-Z]{2})/i,
                    /VIA\s+BORGONUOVO\s*[,\s]*(\d+)\s*[\n\r\s]+(\d{5})\s+([A-Z\s]+)\s+([A-Z]{2})/i,
                    // Pattern per VIA REPERGO (LA MANDRIA)
                    /VIA\s*REPERGO[,\s]*(\d+)\s*[\n\r]+\s*(\d{5})\s+(ISOLA\s+D['']ASTI)\s+(AT)(?=\s*\n|$)/i,
                    /VIA\s*REPERGO[,\s]*(\d+)\s+(\d{5})\s+(ISOLA\s+D['']ASTI)\s+(AT)(?=\s*\n|$)/i,
                    /VIA\s+REPERGO\s*[,\s]*(\d+)\s*[\n\r\s]+(\d{5})\s+(ISOLA\s+D['']ASTI)\s+(AT)(?=\s*\n|$)/i
                ];
                
                for (const pattern of specificPatterns) {
                    const match = text.match(pattern);
                    if (match) {
                        // Estrai il nome della via dal pattern
                        let viaName = 'VIA';
                        if (pattern.source.includes('BORGONUOVO')) {
                            viaName = 'VIA BORGONUOVO';
                        } else if (pattern.source.includes('REPERGO')) {
                            viaName = 'VIA REPERGO';
                        }
                        
                        const civico = match[1];
                        const cap = match[2];
                        const citta = match[3].trim();
                        const prov = match[4];
                        const fullAddress = `${viaName}, ${civico} ${cap} ${citta} ${prov}`;
                        
                        console.log(`✅ [CONSEGNA FIX] Trovato indirizzo specifico: ${fullAddress}`);
                        result.deliveryAddress = fullAddress;
                        result.indirizzoConsegna = fullAddress;
                        return result;
                    }
                }
                
                // Strategia 1B: Se il cliente è LA MANDRIA, cerca VIA REPERGO direttamente
                const clientName = result.cliente || result.clientName || '';
                if (clientName.includes('LA MANDRIA') || clientName.includes('MANDRIA')) {
                    console.log('[CONSEGNA FIX] Cliente LA MANDRIA rilevato, cerco VIA REPERGO...');
                    
                    // Pattern per cercare l'indirizzo completo in una volta
                    // Modificato per essere più preciso e non catturare testo extra
                    const mandriaPattern = /VIA\s+REPERGO[,\s]*(\d+)\s*\n?\s*(\d{5})\s+(ISOLA\s+D['']ASTI)\s+(AT)(?=\s*\n|$)/i;
                    const fullMatch = text.match(mandriaPattern);
                    
                    if (fullMatch) {
                        const via = `VIA REPERGO, ${fullMatch[1]}`;
                        const cap = fullMatch[2];
                        const citta = fullMatch[3];
                        const prov = fullMatch[4];
                        const fullAddress = `${via} ${cap} ${citta} ${prov}`;
                        
                        console.log(`✅ [CONSEGNA FIX] Indirizzo LA MANDRIA trovato: ${fullAddress}`);
                        result.deliveryAddress = fullAddress;
                        result.indirizzoConsegna = fullAddress;
                        return result;
                    }
                    
                    // Fallback: cerca i componenti separatamente
                    const repergoPatternsSimple = [
                        /VIA\s+REPERGO[,\s]*(\d+)/i,
                        /(\d{5})\s+(ISOLA\s+D['']ASTI)\s+(AT)(?:\s|$)/i
                    ];
                    
                    let via = '';
                    let capCitta = '';
                    
                    // Cerca VIA REPERGO
                    const viaMatch = text.match(repergoPatternsSimple[0]);
                    if (viaMatch) {
                        via = `VIA REPERGO, ${viaMatch[1]}`;
                    }
                    
                    // Cerca CAP e città (con boundary per non includere testo extra)
                    const capMatch = text.match(repergoPatternsSimple[1]);
                    if (capMatch) {
                        capCitta = `${capMatch[1]} ${capMatch[2]} ${capMatch[3]}`;
                    }
                    
                    if (via && capCitta) {
                        const fullAddress = `${via} ${capCitta}`;
                        console.log(`✅ [CONSEGNA FIX] Indirizzo LA MANDRIA trovato (fallback): ${fullAddress}`);
                        result.deliveryAddress = fullAddress;
                        result.indirizzoConsegna = fullAddress;
                        return result;
                    }
                }
                
                // Strategia 2: Cerca nella zona del cliente
                if (result.cliente || result.clientName) {
                    const clientName = result.cliente || result.clientName;
                    const clientIdx = text.indexOf(clientName);
                    
                    if (clientIdx > -1) {
                        // Prendi il testo dopo il nome cliente (max 500 caratteri)
                        const textAfterClient = text.substring(clientIdx, clientIdx + 500);
                        const lines = textAfterClient.split('\n');
                        
                        let foundAddress = false;
                        let addressParts = [];
                        
                        for (let i = 1; i < lines.length; i++) {
                            const line = lines[i].trim();
                            
                            // Salta righe vuote
                            if (!line) continue;
                            
                            // Salta se contiene indirizzo emittente
                            if (line.includes('C.so G. Marconi') || line.includes('Tel.0173')) continue;
                            
                            // Cerca pattern di via (escludendo C.so G. Marconi)
                            if (line.match(/^VIA\s+[A-Z]/i) && !line.includes('Marconi')) {
                                addressParts.push(line);
                                foundAddress = true;
                            }
                            // Cerca CAP dopo aver trovato una via
                            else if (foundAddress && line.match(/^\d{5}\s+[A-Z]/)) {
                                addressParts.push(line);
                                break;
                            }
                        }
                        
                        if (addressParts.length >= 2) {
                            const fullAddress = addressParts.join(' ');
                            console.log(`✅ [CONSEGNA FIX] Indirizzo trovato vicino al cliente: ${fullAddress}`);
                            result.deliveryAddress = fullAddress;
                            result.indirizzoConsegna = fullAddress;
                            return result;
                        }
                    }
                }
                
                // Strategia 3: Cerca dopo pattern "consegna" ma non nell'header
                const consegnaMatches = [...text.matchAll(/consegna/gi)];
                
                for (const match of consegnaMatches) {
                    // Salta se siamo nell'header del documento (primi 1000 caratteri)
                    if (match.index < 1000) continue;
                    
                    const contextStart = match.index - 50;
                    const contextEnd = match.index + 300;
                    const context = text.substring(contextStart, contextEnd);
                    
                    // Cerca VIA nel contesto
                    const viaMatch = context.match(/VIA\s+([A-Z\s]+[,\s]*\d+)\s*[\n\r]+\s*(\d{5}\s+[A-Z\s]+\s+[A-Z]{2})/i);
                    
                    if (viaMatch && !viaMatch[0].includes('Marconi')) {
                        const fullAddress = `VIA ${viaMatch[1]} ${viaMatch[2]}`.replace(/\s+/g, ' ');
                        console.log(`✅ [CONSEGNA FIX] Indirizzo trovato vicino a 'consegna': ${fullAddress}`);
                        result.deliveryAddress = fullAddress;
                        result.indirizzoConsegna = fullAddress;
                        return result;
                    }
                }
                
                // Se ancora non abbiamo trovato nulla, log per debug
                if (!result.deliveryAddress) {
                    console.warn('[CONSEGNA FIX] Non è stato possibile trovare l\'indirizzo di consegna');
                    
                    // Debug: mostra tutte le occorrenze di VIA nel documento
                    const viaMatches = [...text.matchAll(/VIA\s+[A-Z][^\n]+/gi)];
                    console.log('[CONSEGNA FIX] VIE trovate nel documento:');
                    viaMatches.forEach((m, idx) => {
                        if (!m[0].includes('Marconi')) {
                            console.log(`  ${idx + 1}. ${m[0].trim()}`);
                        }
                    });
                }
            }
            
            return result;
        };
        
        console.log('✅ [CONSEGNA FIX] Fix ultra-specifico applicato');
    }
    
})();