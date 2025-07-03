/**
 * Fix completo per l'estrazione corretta delle fatture
 * Risolve problemi di cliente, data, indirizzo e totali
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix completo fatture...');
    
    // Override del metodo extract di FatturaExtractor
    function overrideFatturaExtract() {
        const extractors = [
            window.FatturaExtractor,
            window.FatturaExtractorModular
        ];
        
        extractors.forEach(Extractor => {
            if (!Extractor || !Extractor.prototype) return;
            
            const originalExtract = Extractor.prototype.extract;
            
            Extractor.prototype.extract = function() {
                console.log('🎯 [FATTURA FIX] Intercettato extract');
                
                // Chiama il metodo originale
                const result = originalExtract.call(this);
                
                // Log del testo per debug
                console.log('[FATTURA FIX] Prime 500 caratteri del testo:', this.text.substring(0, 500));
                
                // Log della sezione VETTORI per debug
                const vettoriIdx = this.text.indexOf('VETTORI');
                if (vettoriIdx > -1) {
                    console.log('[FATTURA FIX] Testo dopo VETTORI:', this.text.substring(vettoriIdx, vettoriIdx + 300));
                }
                
                // Fix del cliente
                if (result.cliente === 'Luogo di consegna' || !result.cliente || result.cliente.includes('Attenzione')) {
                    console.log('[FATTURA FIX] Cercando cliente reale...');
                    
                    // Prima cerca nei metadati se presenti
                    const metadataMatch = this.text.match(/NOME_CLIENTE:([^\n]+)/);
                    if (metadataMatch && metadataMatch[1]) {
                        result.cliente = metadataMatch[1].trim();
                        console.log(`✅ [FATTURA FIX] Cliente trovato nei metadati: ${result.cliente}`);
                    }
                    
                    // Altrimenti cerca dopo VETTORI (spesso il cliente è dopo questa sezione)
                    if (!result.cliente || result.cliente === 'Luogo di consegna') {
                        const vettoriIndex = this.text.indexOf('VETTORI');
                        if (vettoriIndex > -1) {
                            const textAfterVettori = this.text.substring(vettoriIndex + 7, vettoriIndex + 500);
                            // Salta spazi e cerca la prima riga non vuota che non sia "Firma"
                            const lines = textAfterVettori.split('\n').filter(l => l.trim() && !l.includes('Firma'));
                            if (lines.length > 0) {
                                const potentialClient = lines[0].trim();
                                if (potentialClient && potentialClient.length > 3 && !potentialClient.includes('Attenzione')) {
                                    result.cliente = potentialClient;
                                    console.log(`✅ [FATTURA FIX] Cliente trovato dopo VETTORI: ${result.cliente}`);
                                }
                            }
                        }
                    }
                    
                    // Se ancora non trovato, cerca pattern alternativi
                    if (!result.cliente || result.cliente === 'Luogo di consegna') {
                        // Cerca dopo "Destinatario:" o simili
                        const patterns = [
                            /DESTINATARIO[:\s]*\n([^\n]+)/i,
                            /CLIENTE[:\s]*\n([^\n]+)/i,
                            /INTESTATARIO[:\s]*\n([^\n]+)/i
                        ];
                        
                        for (const pattern of patterns) {
                            const match = this.text.match(pattern);
                            if (match && match[1]) {
                                const client = match[1].trim();
                                if (client && !client.includes('consegna')) {
                                    result.cliente = client;
                                    console.log(`✅ [FATTURA FIX] Cliente trovato con pattern: ${result.cliente}`);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Fix della data
                if (result.data === '24/01/2012' || result.data === '24/03/2012' || !result.data) {
                    console.log('[FATTURA FIX] Cercando data reale...');
                    
                    // Prima prova a estrarre dal nome file (es. FTV_705048_2025_20001_4915_9062025.PDF)
                    if (this.fileName) {
                        const fileMatch = this.fileName.match(/_(\d{1,2})(\d{2})(\d{4})\.PDF$/i);
                        if (fileMatch) {
                            result.data = `${fileMatch[1]}/${fileMatch[2]}/${fileMatch[3]}`;
                            console.log(`✅ [FATTURA FIX] Data estratta dal nome file: ${result.data}`);
                        }
                    }
                    
                    // Se non trovata nel nome file, cerca pattern di data nel formato italiano
                    if (!result.data || result.data === '24/01/2012' || result.data === '24/03/2012') {
                        const datePatterns = [
                            /(?:DATA|Del|del)\s*[:]*\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
                            /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
                        ];
                    
                        for (const pattern of datePatterns) {
                            const matches = this.text.match(new RegExp(pattern, 'g'));
                            if (matches) {
                                // Prendi la prima data che non sia quella sbagliata
                                for (const match of matches) {
                                    const dateMatch = match.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
                                    if (dateMatch && dateMatch[1] !== '24/01/2012' && dateMatch[1] !== '24/03/2012') {
                                        result.data = dateMatch[1];
                                        console.log(`✅ [FATTURA FIX] Data trovata: ${result.data}`);
                                        break;
                                    }
                                }
                                if (result.data !== '24/01/2012' && result.data !== '24/03/2012') break;
                            }
                        }
                    }
                }
                
                // Fix dell'indirizzo di consegna
                if (result.indirizzoConsegna && result.indirizzoConsegna.includes('alfierialimentari.com')) {
                    console.log('[FATTURA FIX] Indirizzo contiene dati emittente, cerco indirizzo cliente...');
                    
                    // Cerca indirizzo dopo il nome del cliente
                    if (result.cliente && result.cliente !== 'Luogo di consegna') {
                        const clientIndex = this.text.indexOf(result.cliente);
                        if (clientIndex > -1) {
                            const textAfterClient = this.text.substring(clientIndex + result.cliente.length, clientIndex + 500);
                            
                            // Estrai indirizzo (via/corso/piazza + CAP + città)
                            const addressMatch = textAfterClient.match(/([Vv]ia|[Cc]orso|[Pp]iazza|[Vv]\.le|C\.so)[^0-9]*(\d{5})\s+([A-Z\s]+)\s*\(([A-Z]{2})\)/);
                            if (addressMatch) {
                                result.indirizzoConsegna = `${addressMatch[0]}`;
                                console.log(`✅ [FATTURA FIX] Indirizzo cliente trovato: ${result.indirizzoConsegna}`);
                            }
                        }
                    }
                }
                
                // Fix P.IVA
                if (!result.partitaIva) {
                    const pivaPattern = /P\.?\s*IVA[:\s]*([0-9]{11})/i;
                    const pivaMatch = this.text.match(pivaPattern);
                    if (pivaMatch) {
                        result.partitaIva = pivaMatch[1];
                        console.log(`✅ [FATTURA FIX] P.IVA trovata: ${result.partitaIva}`);
                    }
                }
                
                // Fix totali (cerca in fondo al documento)
                if (!result.totale || result.totale === 0) {
                    console.log('[FATTURA FIX] Cercando totali...');
                    
                    const lastPart = this.text.substring(this.text.length - 1000);
                    
                    // Pattern per totali
                    const totalPatterns = [
                        /TOTALE\s+FATTURA[:\s]*([\d.,]+)/i,
                        /TOTALE\s+DOCUMENTO[:\s]*([\d.,]+)/i,
                        /TOTALE[:\s]*([\d.,]+)(?:\s|$)/i,
                        /IMPORTO\s+TOTALE[:\s]*([\d.,]+)/i
                    ];
                    
                    for (const pattern of totalPatterns) {
                        const match = lastPart.match(pattern);
                        if (match) {
                            const total = this.cleanNumber(match[1]);
                            if (total > 0) {
                                result.totale = total;
                                console.log(`✅ [FATTURA FIX] Totale trovato: €${result.totale}`);
                                break;
                            }
                        }
                    }
                }
                
                console.log('[FATTURA FIX] Risultato finale:', result);
                return result;
            };
        });
    }
    
    // Applica il fix
    setTimeout(overrideFatturaExtract, 100);
    
    console.log('✅ Fix completo fatture applicato');
    
})();