/**
 * Fix finale per correggere l'IVA degli articoli
 * Cerca l'IVA corretta nelle righe finali del documento dove sono presenti i dettagli
 */

(function() {
    'use strict';
    
    console.log('🎯 Applicando fix finale IVA articoli...');
    
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ft' || result.documentType === 'FT') && result.items) {
                console.log('[IVA FINALE FIX] Cercando IVA corretta nelle righe articolo...');
                
                // Prendi gli ultimi 2000 caratteri del documento dove ci sono i dettagli articoli
                const endText = text.substring(Math.max(0, text.length - 2000));
                const lines = endText.split('\n');
                
                // Mappa per memorizzare l'IVA corretta per ogni articolo
                const ivaMap = new Map();
                
                // Pattern per righe articolo con IVA
                // Es: "SG000419 PANE GRATTUGIATO BAR. 400 G PZ 12,000 1,2700 15,24 04 000"
                //     codice   descrizione                    um qtà    prezzo totale IVA extra
                
                for (const line of lines) {
                    // Pattern specifico per catturare codice e IVA
                    // Cerca righe che contengono codice articolo seguito da descrizione e numeri
                    const match = line.match(/^([A-Z]{0,2}\d{6})\s+(.+?)\s+([A-Z]{2})\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(\d{2})\s+\d{3}/);
                    
                    if (match) {
                        const codice = match[1];
                        const descrizione = match[2];
                        const iva = match[7];
                        
                        console.log(`[IVA FINALE FIX] Trovata riga articolo: ${codice} - ${descrizione} - IVA ${iva}%`);
                        ivaMap.set(codice, iva);
                    }
                    
                    // Pattern alternativo per righe senza spazi extra alla fine
                    const altMatch = line.match(/^([A-Z]{0,2}\d{6})\s+.+\s+([\d,]+)\s+(\d{2})\s*$/);
                    if (altMatch && !ivaMap.has(altMatch[1])) {
                        const codice = altMatch[1];
                        const possibleIva = altMatch[3];
                        
                        // Verifica che sia un'aliquota IVA valida
                        if (['04', '10', '22'].includes(possibleIva)) {
                            console.log(`[IVA FINALE FIX] Trovata IVA ${possibleIva}% per articolo ${codice} (pattern alternativo)`);
                            ivaMap.set(codice, possibleIva);
                        }
                    }
                }
                
                // Cerca anche pattern specifici nel testo
                // Es: "15,24 04 000" dove 04 è l'IVA
                const specificPatterns = [
                    /SG000419.+?(\d+[,]\d+)\s+(\d{2})\s+\d{3}/, // PANE GRATTUGIATO
                    /RF000106.+?(\d+[,]\d+)\s+(\d{2})\s+\d{3}/, // FARINA
                    /GF000011.+?(\d+[,]\d+)\s+(\d{2})\s+\d{3}/, // GRISSINI CON FARINA DI RISO
                    /GF000138.+?(\d+[,]\d+)\s+(\d{2})\s+\d{3}/, // SCHIACCIATINE
                ];
                
                for (const pattern of specificPatterns) {
                    const match = text.match(pattern);
                    if (match) {
                        const codice = pattern.source.substring(0, 8); // Estrai il codice dal pattern
                        const iva = match[2];
                        
                        if (['04', '10', '22'].includes(iva)) {
                            console.log(`[IVA FINALE FIX] Pattern specifico: ${codice} ha IVA ${iva}%`);
                            ivaMap.set(codice, iva);
                        }
                    }
                }
                
                // Analisi diretta del testo per prodotti specifici
                // Cerca righe che contengono i codici e l'IVA 04
                const prodottiIva4 = ['SG000419', 'RF000106', 'GF000011', 'GF000138'];
                
                for (const codice of prodottiIva4) {
                    const regex = new RegExp(`${codice}[^\\n]+?(\\d+[,]\\d+)\\s+(\\d{2})\\s+\\d{3}`, 'i');
                    const match = text.match(regex);
                    
                    if (match && match[2] === '04') {
                        console.log(`[IVA FINALE FIX] Confermato: ${codice} ha IVA 04%`);
                        ivaMap.set(codice, '04');
                    }
                }
                
                // Applica le correzioni
                let corretti = 0;
                result.items.forEach(item => {
                    const ivaCorretta = ivaMap.get(item.code);
                    
                    if (ivaCorretta && item.vatCode !== ivaCorretta) {
                        console.log(`✅ [IVA FINALE FIX] Corretto ${item.code} (${item.description}): IVA ${item.vatCode}% -> ${ivaCorretta}%`);
                        item.vatCode = ivaCorretta;
                        item.iva = ivaCorretta;
                        item.aliquotaIVA = ivaCorretta;
                        corretti++;
                    }
                });
                
                console.log(`[IVA FINALE FIX] Corretti ${corretti} articoli su ${result.items.length} totali`);
                
                // Riepilogo finale
                const riepilogo = {};
                result.items.forEach(item => {
                    const iva = item.vatCode || '??';
                    riepilogo[iva] = (riepilogo[iva] || 0) + 1;
                });
                
                console.log('[IVA FINALE FIX] Riepilogo IVA finale:');
                Object.entries(riepilogo).forEach(([iva, count]) => {
                    console.log(`  IVA ${iva}%: ${count} articoli`);
                });
            }
            
            return result;
        };
        
        console.log('✅ [IVA FINALE FIX] Override applicato');
    }
    
})();