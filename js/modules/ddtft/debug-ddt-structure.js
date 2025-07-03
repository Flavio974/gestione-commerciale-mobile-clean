/**
 * Debug per analizzare la struttura dei DDT e capire dove si trovano i dati corretti
 */

(function() {
    'use strict';
    
    console.log('🔍 Debug struttura DDT abilitato...');
    
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                console.log('🔍 [DEBUG DDT STRUCTURE] Analizzando struttura DDT...');
                console.log('[DEBUG DDT STRUCTURE] Nome file:', fileName);
                
                const lines = text.split('\n');
                console.log('[DEBUG DDT STRUCTURE] Totale righe:', lines.length);
                
                // Mostra le prime 40 righe per capire la struttura
                console.log('[DEBUG DDT STRUCTURE] Prime 40 righe del documento:');
                for (let i = 0; i < Math.min(40, lines.length); i++) {
                    if (lines[i].trim()) {
                        console.log(`  Riga ${i}: "${lines[i].trim()}"`);
                    }
                }
                
                // Cerca pattern specifici
                console.log('\n[DEBUG DDT STRUCTURE] Ricerca pattern importanti:');
                
                // Cerca "Destinatario" o "Spett.le"
                lines.forEach((line, idx) => {
                    if (line.includes('Destinatario') || line.includes('Spett.le') || line.includes('DEST.')) {
                        console.log(`  - Trovato "Destinatario/Spett.le" alla riga ${idx}: "${line}"`);
                        // Mostra le prossime 5 righe
                        for (let j = 1; j <= 5 && idx + j < lines.length; j++) {
                            console.log(`    Riga ${idx + j}: "${lines[idx + j]}"`);
                        }
                    }
                });
                
                // Cerca codici cliente (5 cifre)
                console.log('\n[DEBUG DDT STRUCTURE] Codici cliente trovati (5 cifre):');
                lines.forEach((line, idx) => {
                    const match = line.match(/\b\d{5}\b/g);
                    if (match) {
                        match.forEach(code => {
                            // Escludi CAP comuni
                            if (!['12050', '12011', '12042', '12060', '12063'].includes(code)) {
                                console.log(`  - Possibile codice alla riga ${idx}: ${code} in "${line}"`);
                            }
                        });
                    }
                });
                
                // Cerca articoli
                console.log('\n[DEBUG DDT STRUCTURE] Righe che sembrano articoli:');
                lines.forEach((line, idx) => {
                    // Pattern per articoli: codice (6 caratteri) seguito da descrizione, quantità, prezzo
                    if (line.match(/^[A-Z0-9]{6}\s+.+\s+\d+\s+\d+[,\.]\d+/)) {
                        console.log(`  - Articolo alla riga ${idx}: "${line}"`);
                    }
                });
                
                // Cerca totali
                console.log('\n[DEBUG DDT STRUCTURE] Righe con totali:');
                lines.forEach((line, idx) => {
                    if (line.match(/totale|imponibile|iva|netto/i)) {
                        console.log(`  - Totale alla riga ${idx}: "${line}"`);
                    }
                });
                
                // Mostra i dati estratti attuali
                console.log('\n[DEBUG DDT STRUCTURE] Dati estratti:');
                console.log('  - Cliente:', result.clientName || result.cliente);
                console.log('  - Codice cliente:', result.clientCode);
                console.log('  - Indirizzo:', result.deliveryAddress);
                console.log('  - Numero documento:', result.documentNumber);
                console.log('  - Numero articoli:', result.items ? result.items.length : 0);
                
                if (result.items && result.items.length > 0) {
                    console.log('  - Primo articolo:', {
                        codice: result.items[0].code,
                        descrizione: result.items[0].description,
                        quantità: result.items[0].quantity,
                        prezzo: result.items[0].price,
                        totale: result.items[0].total
                    });
                }
            }
            
            return result;
        };
        
        console.log('✅ [DEBUG DDT STRUCTURE] Override parseDocumentFromText applicato');
    }
    
})();