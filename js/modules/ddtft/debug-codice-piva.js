/**
 * Debug per trovare dove si trovano codice cliente e P.IVA nel documento
 */

(function() {
    'use strict';
    
    console.log('🔍 Debug codice cliente e P.IVA abilitato...');
    
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                console.log('🔍 [DEBUG CODICE PIVA] Cercando codice cliente e P.IVA nel documento...');
                
                // Cerca tutte le righe che contengono numeri che potrebbero essere codici o P.IVA
                const lines = text.split('\n');
                
                console.log('🔍 [DEBUG CODICE PIVA] Righe che contengono "Cod"/"cod":');
                lines.forEach((line, idx) => {
                    if (line.match(/\bcod/i)) {
                        console.log(`  Riga ${idx}: "${line.trim()}"`);
                    }
                });
                
                console.log('🔍 [DEBUG CODICE PIVA] Righe che contengono "IVA"/"iva":');
                lines.forEach((line, idx) => {
                    if (line.match(/\biva\b/i) || line.match(/\bp\.iva\b/i)) {
                        console.log(`  Riga ${idx}: "${line.trim()}"`);
                    }
                });
                
                // Cerca pattern di P.IVA (11 cifre)
                console.log('🔍 [DEBUG CODICE PIVA] Sequenze di 11 cifre nel documento:');
                const pivaMatches = text.match(/\b\d{11}\b/g);
                if (pivaMatches) {
                    pivaMatches.forEach(piva => {
                        console.log(`  Possibile P.IVA: ${piva}`);
                    });
                }
                
                // Cerca pattern di codici cliente (4-5 cifre)
                console.log('🔍 [DEBUG CODICE PIVA] Numeri 4-5 cifre che potrebbero essere codici cliente:');
                const codiciMatches = text.match(/\b\d{4,5}\b/g);
                if (codiciMatches) {
                    const uniqueCodici = [...new Set(codiciMatches)];
                    uniqueCodici.forEach(codice => {
                        if (codice !== '20001' && codice !== '12042' && codice !== '12050') { // Escludi CAP
                            console.log(`  Possibile codice: ${codice}`);
                        }
                    });
                }
                
                // Cerca nella zona specifica dove dovrebbero essere
                const headerIdx = text.indexOf('Tipo documento');
                if (headerIdx > -1) {
                    const headerSection = text.substring(headerIdx, headerIdx + 500);
                    console.log('🔍 [DEBUG CODICE PIVA] Sezione header documento:');
                    console.log(headerSection);
                }
            }
            
            return result;
        };
    }
    
})();