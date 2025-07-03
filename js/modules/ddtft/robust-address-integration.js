/**
 * Integrazione del RobustAddressExtractor nel sistema DDT/FT
 * Sostituisce tutti i fix precedenti per l'estrazione indirizzi
 */

(function() {
    'use strict';
    
    console.log('🚀 Integrando RobustAddressExtractor nel sistema...');
    
    // Attendi che tutto sia caricato
    function integrateRobustExtractor() {
        if (!window.RobustDeliveryAddressExtractor) {
            console.error('❌ RobustDeliveryAddressExtractor non trovato! Riprovo...');
            setTimeout(integrateRobustExtractor, 100);
            return;
        }
        
        if (!window.DDTFTDocumentParser) {
            console.error('❌ DDTFTDocumentParser non trovato! Riprovo...');
            setTimeout(integrateRobustExtractor, 100);
            return;
        }
        
        // Crea istanza dell'estrattore con debug abilitato
        const addressExtractor = new window.RobustDeliveryAddressExtractor({
            debug: true,
            logStrategies: true,
            saveIntermediateResults: true
        });
        
        // Override del parser principale
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = async function(text, fileName) {
            console.log('\n📄 [ROBUST INTEGRATION] Processing document:', fileName);
            
            // Chiama il parser originale
            const result = originalParse.call(this, text, fileName);
            
            if (!result) {
                console.error('❌ [ROBUST INTEGRATION] No result from original parser');
                return result;
            }
            
            // Prepara i dati per l'estrattore robusto
            const rows = prepareRowsFromText(text);
            const metadata = {
                clientName: result.clientName || result.cliente,
                clientCode: result.clientCode || result.codiceCliente,
                documentNumber: result.documentNumber,
                documentType: result.type || result.documentType
            };
            
            console.log('📊 [ROBUST INTEGRATION] Prepared data:', {
                rowCount: rows.length,
                metadata: metadata
            });
            
            // Usa l'estrattore robusto
            try {
                const extractedAddress = await addressExtractor.extractDeliveryAddress(rows, metadata);
                
                if (extractedAddress) {
                    console.log('✅ [ROBUST INTEGRATION] Address extracted successfully:', extractedAddress);
                    
                    // Aggiorna il risultato con l'indirizzo estratto
                    result.deliveryAddress = extractedAddress.formatted;
                    result.indirizzoConsegna = extractedAddress.formatted;
                    
                    // Aggiungi anche i componenti strutturati
                    result.deliveryAddressComponents = extractedAddress.components;
                    
                    // Aggiungi metadati sull'estrazione
                    result._addressExtractionMethod = 'robust';
                    result._addressExtractionResults = addressExtractor.intermediateResults;
                } else {
                    console.warn('⚠️ [ROBUST INTEGRATION] No address found by robust extractor');
                }
            } catch (error) {
                console.error('❌ [ROBUST INTEGRATION] Error during extraction:', error);
            }
            
            return result;
        };
        
        console.log('✅ [ROBUST INTEGRATION] Integration complete!');
    }
    
    /**
     * Prepara le righe dal testo per l'estrattore
     * Converte il testo in un formato che l'estrattore può processare
     */
    function prepareRowsFromText(text) {
        const lines = text.split('\n');
        const rows = [];
        
        // Pattern per estrarre elementi con coordinate X
        // Formato: [X:123, "testo"]
        const coordPattern = /\[X:(\d+),\s*"([^"]+)"\]/g;
        
        lines.forEach((line, lineIndex) => {
            const elements = [];
            let match;
            
            // Reset lastIndex per ogni linea
            coordPattern.lastIndex = 0;
            
            // Estrai tutti gli elementi con coordinate
            while ((match = coordPattern.exec(line)) !== null) {
                elements.push({
                    x: parseInt(match[1]),
                    text: match[2],
                    originalIndex: match.index
                });
            }
            
            // Se non ci sono elementi con coordinate, prova a parsare come testo semplice
            if (elements.length === 0 && line.trim()) {
                // Prova a identificare se la riga ha due colonne
                
                // Pattern 1: LOC/LOCALITÀ + VIA
                if (line.match(/\b(LOC\.|LOCALITÀ|FRAZ\.|FRAZIONE)\s+.+\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA)/i)) {
                    const addressMatch = line.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+.+$/i);
                    if (addressMatch) {
                        // Prima colonna: tutto prima dell'indirizzo
                        const firstPart = line.substring(0, line.indexOf(addressMatch[0])).trim();
                        if (firstPart) {
                            elements.push({
                                x: 39, // Colonna sinistra
                                text: firstPart,
                                originalIndex: 0
                            });
                        }
                        // Seconda colonna: l'indirizzo
                        elements.push({
                            x: 309, // Colonna destra
                            text: addressMatch[0].trim(),
                            originalIndex: line.indexOf(addressMatch[0])
                        });
                    }
                }
                // Pattern 2: Due VIA sulla stessa riga
                else if ((line.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\b/gi) || []).length >= 2) {
                    // Trova la prima e l'ultima occorrenza
                    const firstMatch = line.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+[^,]+(?:,\s*\d+)?/i);
                    const lastMatch = line.match(/.*\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+.+$/i);
                    
                    if (firstMatch && lastMatch) {
                        const lastIndex = line.lastIndexOf(lastMatch[1]);
                        elements.push({
                            x: 39,
                            text: line.substring(0, lastIndex).trim(),
                            originalIndex: 0
                        });
                        elements.push({
                            x: 309,
                            text: line.substring(lastIndex).trim(),
                            originalIndex: lastIndex
                        });
                    }
                }
                // Pattern 3: Due CAP sulla stessa riga
                else if ((line.match(/\d{5}/g) || []).length >= 2) {
                    const capMatches = line.match(/\d{5}/g);
                    const lastCap = capMatches[capMatches.length - 1];
                    const lastCapIndex = line.lastIndexOf(lastCap);
                    
                    elements.push({
                        x: 39,
                        text: line.substring(0, lastCapIndex).trim(),
                        originalIndex: 0
                    });
                    elements.push({
                        x: 309,
                        text: line.substring(lastCapIndex).trim(),
                        originalIndex: lastCapIndex
                    });
                }
                // Pattern 4: Separatore |
                else if (line.includes('|')) {
                    const parts = line.split('|');
                    if (parts.length >= 2) {
                        elements.push({
                            x: 39,
                            text: parts[0].trim(),
                            originalIndex: 0
                        });
                        elements.push({
                            x: 309,
                            text: parts[parts.length - 1].trim(),
                            originalIndex: line.lastIndexOf(parts[parts.length - 1])
                        });
                    }
                }
                // Pattern 5: Spazi multipli
                else if (line.match(/\s{3,}/)) {
                    const spaceParts = line.split(/\s{3,}/);
                    if (spaceParts.length >= 2) {
                        elements.push({
                            x: 39,
                            text: spaceParts[0].trim(),
                            originalIndex: 0
                        });
                        elements.push({
                            x: 309,
                            text: spaceParts[spaceParts.length - 1].trim(),
                            originalIndex: line.indexOf(spaceParts[spaceParts.length - 1])
                        });
                    }
                }
                // Default: riga singola
                else {
                    elements.push({
                        x: 0,
                        text: line.trim(),
                        originalIndex: 0
                    });
                }
            }
            
            if (elements.length > 0) {
                rows.push(elements);
            }
        });
        
        return rows;
    }
    
    // Avvia l'integrazione dopo un breve delay
    setTimeout(integrateRobustExtractor, 100);
    
})();