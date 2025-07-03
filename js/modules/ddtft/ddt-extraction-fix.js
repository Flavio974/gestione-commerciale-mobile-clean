/**
 * Fix per migliorare l'estrazione dei dati dai DDT
 * Corregge problemi di estrazione cliente, quantità e totali
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix estrazione DDT avanzato...');
    
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                console.log('[DDT EXTRACTION FIX] Analizzando DDT per correzioni...');
                
                const lines = text.split('\n');
                
                // Se il cliente contiene "Il numero di lotto", è stato estratto male
                if (result.cliente && result.cliente.includes('Il numero di lotto')) {
                    console.log('[DDT EXTRACTION FIX] Cliente estratto erroneamente, cercando cliente reale...');
                    
                    // Cerca il cliente reale nel documento
                    let clienteTrovato = false;
                    let nomeCliente = '';
                    let indirizzoCliente = '';
                    
                    // Pattern per trovare la sezione cliente
                    // Cerca dopo "Destinatario" o "Spett.le"
                    let startIndex = -1;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes('Destinatario') || lines[i].includes('Spett.le')) {
                            startIndex = i;
                            break;
                        }
                    }
                    
                    if (startIndex >= 0) {
                        // Le prossime righe dovrebbero contenere il cliente
                        for (let i = startIndex + 1; i < Math.min(startIndex + 10, lines.length); i++) {
                            const line = lines[i].trim();
                            
                            // Salta righe vuote o intestazioni
                            if (!line || line.includes('Luogo di consegna') || line.includes('documento')) {
                                continue;
                            }
                            
                            // Se troviamo un indirizzo (VIA, CORSO, etc.), salviamolo
                            if (line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA)/i)) {
                                indirizzoCliente = line;
                                if (!clienteTrovato && nomeCliente) {
                                    break;
                                }
                            }
                            // Se troviamo un CAP, abbiamo finito
                            else if (line.match(/^\d{5}\s+/)) {
                                if (!indirizzoCliente && line.includes(' ')) {
                                    indirizzoCliente = line;
                                }
                                break;
                            }
                            // Altrimenti è probabilmente il nome del cliente
                            else if (!clienteTrovato && line.length > 3 && !line.match(/^\d+$/)) {
                                nomeCliente = line;
                                clienteTrovato = true;
                                console.log(`[DDT EXTRACTION FIX] Possibile cliente trovato: ${nomeCliente}`);
                            }
                        }
                    }
                    
                    // Se non trovato con il primo metodo, cerca altri pattern
                    if (!clienteTrovato) {
                        // Cerca pattern tipo "MACELLERIA NOME" o simili
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            if (line.match(/^(MACELLERIA|ALIMENTARI|SUPERMERCATO|PANETTERIA|BAR|RISTORANTE|PIZZERIA|GASTRONOMIA)/i)) {
                                nomeCliente = line.trim();
                                clienteTrovato = true;
                                console.log(`[DDT EXTRACTION FIX] Cliente trovato con pattern commerciale: ${nomeCliente}`);
                                
                                // Cerca indirizzo nelle righe successive
                                for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                                    const nextLine = lines[j].trim();
                                    if (nextLine.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA)/i) || 
                                        nextLine.match(/^\d{5}\s+/)) {
                                        indirizzoCliente = nextLine;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                    }
                    
                    if (clienteTrovato && nomeCliente) {
                        console.log(`✅ [DDT EXTRACTION FIX] Cliente corretto: ${nomeCliente}`);
                        result.cliente = nomeCliente;
                        result.clientName = nomeCliente;
                        
                        if (indirizzoCliente) {
                            result.deliveryAddress = indirizzoCliente;
                            result.indirizzoConsegna = indirizzoCliente;
                            console.log(`✅ [DDT EXTRACTION FIX] Indirizzo cliente: ${indirizzoCliente}`);
                        }
                    }
                }
                
                // Verifica e correggi gli articoli
                if (result.items && Array.isArray(result.items)) {
                    console.log('[DDT EXTRACTION FIX] Verificando articoli...');
                    
                    result.items.forEach((item, index) => {
                        // Se il totale è troppo basso rispetto a quantità * prezzo, ricalcola
                        const qty = parseFloat(item.quantity) || 0;
                        const price = parseFloat(item.price) || 0;
                        const expectedTotal = qty * price;
                        const currentTotal = parseFloat(item.total) || 0;
                        
                        if (expectedTotal > 0 && Math.abs(currentTotal - expectedTotal) > 0.5) {
                            console.log(`[DDT EXTRACTION FIX] Articolo ${item.code}: totale errato ${currentTotal}, atteso ${expectedTotal}`);
                            item.total = expectedTotal.toFixed(2);
                        }
                        
                        // Se la quantità sembra troppo alta (>200), potrebbe essere un errore
                        if (qty > 200) {
                            console.log(`⚠️ [DDT EXTRACTION FIX] Quantità sospetta per ${item.code}: ${qty} pezzi`);
                            // Cerca nel testo originale la quantità corretta
                            const codePattern = new RegExp(`${item.code}\\s+.+?\\s+(\\d+)\\s+${price.toFixed(2).replace('.', ',')}`);
                            const match = text.match(codePattern);
                            if (match && match[1]) {
                                const correctQty = parseInt(match[1]);
                                if (correctQty < qty && correctQty > 0) {
                                    console.log(`✅ [DDT EXTRACTION FIX] Quantità corretta trovata: ${correctQty}`);
                                    item.quantity = correctQty;
                                    item.total = (correctQty * price).toFixed(2);
                                }
                            }
                        }
                    });
                    
                    // Ricalcola il totale documento
                    const nuovoTotale = result.items.reduce((sum, item) => {
                        return sum + parseFloat(item.total || 0);
                    }, 0);
                    
                    if (nuovoTotale > 0) {
                        // Calcola IVA (assumendo 10% se non specificato diversamente)
                        const totaleIVA = result.items.reduce((sum, item) => {
                            const total = parseFloat(item.total || 0);
                            const vatRate = parseFloat(item.vat || '10') / 100;
                            return sum + (total * vatRate);
                        }, 0);
                        
                        result.subtotal = nuovoTotale;
                        result.vat = totaleIVA;
                        result.total = nuovoTotale + totaleIVA;
                        
                        console.log(`[DDT EXTRACTION FIX] Totali ricalcolati:`);
                        console.log(`  - Subtotale: €${nuovoTotale.toFixed(2)}`);
                        console.log(`  - IVA: €${totaleIVA.toFixed(2)}`);
                        console.log(`  - Totale: €${result.total.toFixed(2)}`);
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [DDT EXTRACTION FIX] Override parseDocumentFromText applicato');
    }
    
})();