/**
 * Fix FINALE per l'estrazione dell'indirizzo di consegna
 * Questo fix DEVE essere caricato per ULTIMO dopo tutti gli altri parser
 * Gestisce specificamente la struttura DDT/FT Alfieri con indirizzi a due colonne
 */

(function() {
    'use strict';
    
    console.log('🚨 Applicando fix FINALE indirizzo di consegna...');
    
    // Aspetta un momento per assicurarsi che tutti gli altri script siano caricati
    setTimeout(() => {
        // Override FINALE del parseDocumentFromText
        if (window.DDTFTDocumentParser) {
            const currentParse = window.DDTFTDocumentParser.parseDocumentFromText;
            
            window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
                console.log('[DELIVERY FINAL FIX] Intercettato parseDocumentFromText FINALE');
                
                // Chiama il metodo corrente (che include tutti i fix precedenti)
                const result = currentParse.call(this, text, fileName);
                
                if (!result) return result;
                
                // FORZA l'estrazione dell'indirizzo di consegna
                console.log('[DELIVERY FINAL FIX] Controllo indirizzo di consegna esistente:', result.deliveryAddress);
                
                // Se non c'è un indirizzo di consegna valido o è troppo corto, lo estrae
                if (!result.deliveryAddress || result.deliveryAddress.length < 15) {
                    console.log('[DELIVERY FINAL FIX] Estrazione FORZATA indirizzo di consegna...');
                    
                    const lines = text.split('\n');
                    let deliveryAddress = '';
                    
                    // Metodo 1: Cerca pattern specifico VIA...VIA sulla stessa riga
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        
                        // Cerca righe che contengono due VIA
                        if (line.includes('VIA') && line.split('VIA').length > 2) {
                            console.log(`[DELIVERY FINAL FIX] Trovata riga con multiple VIA: "${line}"`);
                            
                            // Estrai tutti i segmenti VIA
                            const segments = line.split('VIA').filter(s => s.trim());
                            if (segments.length >= 2) {
                                // L'ultimo segmento è l'indirizzo di consegna
                                const lastSegment = 'VIA' + segments[segments.length - 1];
                                console.log(`[DELIVERY FINAL FIX] Ultimo segmento: "${lastSegment}"`);
                                
                                // Cerca il CAP nella riga successiva
                                if (i + 1 < lines.length) {
                                    const nextLine = lines[i + 1];
                                    console.log(`[DELIVERY FINAL FIX] Riga successiva: "${nextLine}"`);
                                    
                                    // Se ci sono due CAP, prendi l'ultimo
                                    const capMatches = nextLine.match(/\d{5}[^0-9]+[A-Z]+\s+[A-Z]{2}/g);
                                    if (capMatches && capMatches.length > 0) {
                                        const lastCap = capMatches[capMatches.length - 1];
                                        deliveryAddress = lastSegment.trim() + ' ' + lastCap.trim();
                                        console.log(`[DELIVERY FINAL FIX] Indirizzo completo: "${deliveryAddress}"`);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    
                    // Metodo 2: Cerca specificamente dopo "Luogo di consegna"
                    if (!deliveryAddress) {
                        const luogoIdx = text.indexOf('Luogo di consegna');
                        if (luogoIdx >= 0) {
                            console.log('[DELIVERY FINAL FIX] Trovato "Luogo di consegna", analisi righe successive...');
                            
                            const afterLuogo = text.substring(luogoIdx);
                            const luogoLines = afterLuogo.split('\n');
                            
                            // Cerca pattern specifici
                            for (let i = 1; i < Math.min(15, luogoLines.length); i++) {
                                const line = luogoLines[i];
                                
                                // Cerca pattern tipo "VIA BERTOLE', 13/15 VIA MEANA, SNC"
                                const match = line.match(/VIA[^,]+,[^V]+VIA[^$]+$/);
                                if (match) {
                                    // Estrai la parte dopo l'ultima VIA
                                    const lastViaIdx = line.lastIndexOf('VIA');
                                    if (lastViaIdx > 0) {
                                        const addressPart = line.substring(lastViaIdx);
                                        
                                        // Cerca il CAP corrispondente
                                        if (i + 1 < luogoLines.length) {
                                            const capLine = luogoLines[i + 1];
                                            // Prendi l'ultimo CAP della riga
                                            const lastCapMatch = capLine.match(/(\d{5}[^0-9]+[A-Z\s]+[A-Z]{2})(?!.*\d{5})/);
                                            if (lastCapMatch) {
                                                deliveryAddress = addressPart.trim() + ' ' + lastCapMatch[1].trim();
                                                console.log(`[DELIVERY FINAL FIX] Indirizzo estratto (metodo 2): "${deliveryAddress}"`);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Metodo 3: Ricerca pattern specifico per documenti Alfieri
                    if (!deliveryAddress) {
                        console.log('[DELIVERY FINAL FIX] Metodo 3: ricerca pattern Alfieri...');
                        
                        // Cerca la riga con il codice cliente (pattern DDV)
                        const ddvMatch = text.match(/(\d{4})\s+\d{1,2}\/\d{2}\/\d{2}\s+\d+\s+(\d{5})/);
                        if (ddvMatch) {
                            const codiceCliente = ddvMatch[2];
                            console.log(`[DELIVERY FINAL FIX] Codice cliente trovato: ${codiceCliente}`);
                            
                            // Trova la posizione nel testo
                            const ddvIndex = text.indexOf(ddvMatch[0]);
                            const afterDdv = text.substring(ddvIndex);
                            const ddvLines = afterDdv.split('\n');
                            
                            // L'indirizzo dovrebbe essere 3-4 righe dopo
                            for (let i = 2; i < Math.min(6, ddvLines.length); i++) {
                                const line = ddvLines[i];
                                
                                if (line.includes('VIA') && !line.includes('Marconi')) {
                                    console.log(`[DELIVERY FINAL FIX] Possibile riga indirizzo: "${line}"`);
                                    
                                    // Se ci sono spazi multipli, è probabile che sia a due colonne
                                    if (line.includes('  ')) {
                                        // Prendi tutto dopo gli ultimi spazi multipli
                                        const parts = line.split(/\s{2,}/);
                                        const lastPart = parts[parts.length - 1];
                                        
                                        if (lastPart.includes('VIA')) {
                                            // Cerca il CAP
                                            if (i + 1 < ddvLines.length) {
                                                const capLine = ddvLines[i + 1];
                                                const capParts = capLine.split(/\s{2,}/);
                                                const lastCapPart = capParts[capParts.length - 1];
                                                
                                                if (lastCapPart.match(/\d{5}/)) {
                                                    deliveryAddress = lastPart.trim() + ' ' + lastCapPart.trim();
                                                    console.log(`[DELIVERY FINAL FIX] Indirizzo estratto (metodo 3): "${deliveryAddress}"`);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Se abbiamo trovato un indirizzo valido, lo impostiamo
                    if (deliveryAddress && deliveryAddress.length > 15 && deliveryAddress.includes('VIA')) {
                        result.deliveryAddress = deliveryAddress.trim();
                        result.indirizzoConsegna = deliveryAddress.trim();
                        console.log(`✅ [DELIVERY FINAL FIX] INDIRIZZO DI CONSEGNA ESTRATTO: ${deliveryAddress}`);
                    } else {
                        console.log('❌ [DELIVERY FINAL FIX] Non è stato possibile estrarre l\'indirizzo di consegna');
                        
                        // Debug: mostra le righe che contengono VIA
                        console.log('[DELIVERY FINAL FIX] Righe contenenti VIA:');
                        lines.forEach((line, idx) => {
                            if (line.includes('VIA') && !line.includes('Marconi')) {
                                console.log(`   Riga ${idx}: "${line}"`);
                            }
                        });
                    }
                }
                
                return result;
            };
            
            console.log('✅ [DELIVERY FINAL FIX] Override FINALE applicato con successo');
        } else {
            console.error('❌ [DELIVERY FINAL FIX] DDTFTDocumentParser non trovato!');
        }
    }, 200); // Delay maggiore per assicurarsi che tutti gli script siano caricati
    
})();