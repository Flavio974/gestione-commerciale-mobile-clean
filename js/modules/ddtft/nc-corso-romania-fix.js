/**
 * Fix specifico per estrarre l'indirizzo di consegna CORSO ROMANIA per MOLE MARKET nelle NC
 * CORSO ROMANIA è l'indirizzo di consegna corretto per il cliente MOLE MARKET
 */

(function() {
    'use strict';
    
    console.log('🎯 Applicando fix CORSO ROMANIA per MOLE MARKET nelle NC...');
    
    // Funzione helper per cercare CORSO ROMANIA nel testo
    function findCorsoRomaniaAddress(text) {
        if (!text) return null;
        
        const lines = text.split('\n');
        
        // Pattern per trovare CORSO ROMANIA
        const patterns = [
            /CORSO\s+ROMANIA[,\s]*460/i,
            /C\.?SO\s+ROMANIA[,\s]*460/i,
            /CORSO\s+ROMANIA.*?460/i
        ];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            for (const pattern of patterns) {
                if (pattern.test(line)) {
                    console.log(`[CORSO ROMANIA FIX] Trovato CORSO ROMANIA alla riga ${i}: "${line}"`);
                    
                    // Costruisci l'indirizzo completo
                    let fullAddress = 'CORSO ROMANIA,460';
                    
                    // Cerca il CAP e città nelle righe successive
                    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                        const nextLine = lines[j].trim();
                        if (nextLine.match(/10156|TORINO/i)) {
                            fullAddress += ' - 10156 TORINO TO';
                            break;
                        }
                    }
                    
                    // Se non trova CAP/città, aggiungi quelli standard
                    if (!fullAddress.includes('10156')) {
                        fullAddress += ' - 10156 TORINO TO';
                    }
                    
                    return fullAddress;
                }
            }
        }
        
        return null;
    }
    
    // Override di DDTFTDocumentParser
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            // Solo per NC di MOLE MARKET
            if (result && (result.type === 'nc' || result.documentType === 'NC')) {
                const isMoleMarket = (result.cliente && result.cliente.includes('MOLE MARKET')) ||
                                   (result.clientName && result.clientName.includes('MOLE MARKET')) ||
                                   (result._clienteReale && result._clienteReale.includes('MOLE MARKET'));
                
                if (isMoleMarket) {
                    console.log('[CORSO ROMANIA FIX] Documento NC di MOLE MARKET rilevato');
                    
                    // Cerca CORSO ROMANIA nel documento
                    const corsoRomaniaAddress = findCorsoRomaniaAddress(text);
                    
                    if (corsoRomaniaAddress) {
                        console.log(`✅ [CORSO ROMANIA FIX] Applicando indirizzo consegna: ${corsoRomaniaAddress}`);
                        result.deliveryAddress = corsoRomaniaAddress;
                        result.indirizzoConsegna = corsoRomaniaAddress;
                        result.shippingAddress = corsoRomaniaAddress;
                        result.indirizzoSpedizione = corsoRomaniaAddress;
                        result._corsoRomaniaAddress = corsoRomaniaAddress;
                    } else {
                        // Se non trova CORSO ROMANIA nel testo, usa l'indirizzo standard
                        const defaultAddress = 'CORSO ROMANIA,460 - 10156 TORINO TO';
                        console.log(`✅ [CORSO ROMANIA FIX] Usando indirizzo consegna default: ${defaultAddress}`);
                        result.deliveryAddress = defaultAddress;
                        result.indirizzoConsegna = defaultAddress;
                        result._corsoRomaniaAddress = defaultAddress;
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [CORSO ROMANIA FIX] Override parseDocumentFromText applicato');
    }
    
    // Protezione per la normalizzazione
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                // Solo per NC di MOLE MARKET
                if (result && result.type === 'nc') {
                    const isMoleMarket = (result.cliente && result.cliente.includes('MOLE MARKET')) ||
                                       (result._clienteReale && result._clienteReale.includes('MOLE MARKET'));
                    
                    if (isMoleMarket && result._corsoRomaniaAddress) {
                        result.deliveryAddress = result._corsoRomaniaAddress;
                        result.indirizzoConsegna = result._corsoRomaniaAddress;
                        console.log('[CORSO ROMANIA FIX] Preservato indirizzo CORSO ROMANIA in normalize');
                    }
                }
                
                return result;
            };
        }
    }, 2000);
    
})();