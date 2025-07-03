/**
 * Fix avanzato per il parsing degli articoli dalle fatture
 * Corregge l'estrazione dei totali di riga
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix parsing articoli...');
    
    // Funzione helper per pulire i numeri
    function cleanNumber(str) {
        if (!str) return 0;
        let cleaned = str.toString().replace(/[^\d.,]/g, '');
        if (cleaned.includes(',')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        }
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }
    
    // Override del parsing per intercettare gli articoli nel testo originale
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[ARTICOLI PARSING FIX] Intercettato parseDocumentFromText');
            
            // Chiama il metodo originale
            const result = originalParse.call(this, text, fileName);
            
            // Se è una fattura e ci sono articoli, correggiamo i totali
            if (result && (result.type === 'ft' || result.documentType === 'FT') && result.items) {
                console.log('[ARTICOLI PARSING FIX] Analizzando articoli nella fattura...');
                
                // Cerca le righe degli articoli nel testo originale
                const lines = text.split('\n');
                const articlesData = new Map();
                
                // Pattern migliorato per catturare TUTTI i campi della riga articolo
                // Es: "070017 TAJARIN UOVO SACCHETTO ALFIERI 250G PZ 10,000 2,1900 4,00 21,01 10 000"
                //     codice  descrizione                         um  qtà    prezzo  sc%  totale iva
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Pattern per articoli con tutti i campi
                    // Cattura: codice, tutto fino a PZ/KG/etc, unità, quantità, prezzo, sconto%, totale, iva
                    const match = line.match(/^(\d{6}|[A-Z]{2}\d{6})\s+(.+?)\s+(PZ|KG|CF|CT|LT|MT|GR|ML|NR|BT|SC|PF)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{1,2})\b/);
                    
                    if (match) {
                        const code = match[1];
                        const description = match[2].trim();
                        const unit = match[3];
                        const quantity = cleanNumber(match[4]);
                        const price = cleanNumber(match[5]);
                        const discount = cleanNumber(match[6]);
                        const total = cleanNumber(match[7]);
                        const vatCode = match[8].padStart(2, '0'); // Assicura che sia sempre 2 cifre (04 invece di 4)
                        
                        console.log(`[ARTICOLI PARSING FIX] Trovata riga articolo nel testo originale:`);
                        console.log(`  Codice: ${code}`);
                        console.log(`  Descrizione: ${description}`);
                        console.log(`  UM: ${unit}`);
                        console.log(`  Quantità: ${quantity}`);
                        console.log(`  Prezzo: €${price}`);
                        console.log(`  Sconto: ${discount}%`);
                        console.log(`  TOTALE: €${total}`);
                        console.log(`  IVA: ${vatCode}%`);
                        
                        articlesData.set(code, {
                            description,
                            unit,
                            quantity,
                            price,
                            discount,
                            total,
                            vatCode
                        });
                    }
                }
                
                // Aggiorna i totali degli articoli con i dati corretti
                if (articlesData.size > 0) {
                    console.log(`[ARTICOLI PARSING FIX] Aggiorno ${result.items.length} articoli con i dati corretti...`);
                    
                    result.items = result.items.map((item) => {
                        const correctData = articlesData.get(item.code);
                        if (correctData) {
                            console.log(`[ARTICOLI PARSING FIX] Correggo articolo ${item.code}:`);
                            console.log(`  Totale: ${item.total} -> ${correctData.total}`);
                            
                            // Aggiorna con i dati corretti
                            item.quantity = correctData.quantity;
                            item.price = correctData.price;
                            item.total = correctData.total;
                            item.discount = correctData.discount;
                            item.unit = correctData.unit;
                            item.vatCode = correctData.vatCode;
                            item.iva = correctData.vatCode;
                            item.aliquotaIVA = correctData.vatCode;
                        }
                        return item;
                    });
                    
                    // Ricalcola il subtotal basandosi sui totali corretti
                    let newSubtotal = 0;
                    result.items.forEach(item => {
                        newSubtotal += item.total || 0;
                    });
                    
                    if (newSubtotal > 0 && newSubtotal !== result.subtotal) {
                        console.log(`[ARTICOLI PARSING FIX] Aggiorno subtotal: ${result.subtotal} -> ${newSubtotal}`);
                        result.subtotal = newSubtotal;
                    }
                }
                
                // Log finale per debug
                console.log('[ARTICOLI PARSING FIX] Articoli corretti:');
                result.items.forEach((item, idx) => {
                    console.log(`  ${idx + 1}. ${item.code}: ${item.quantity} x €${item.price} = €${item.total}`);
                });
            }
            
            return result;
        };
        
        console.log('✅ [ARTICOLI PARSING FIX] Override applicato a parseDocumentFromText');
    }
    
})();