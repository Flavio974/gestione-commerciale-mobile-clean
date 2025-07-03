/**
 * Fix per correggere il nome del cliente nelle fatture
 * Risolve il problema del cliente che mostra "Luogo di consegna"
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix nome cliente fatture...');
    
    // Funzione per estrarre il nome del cliente dal testo
    function extractClientFromText(text, fileName) {
        console.log('[CLIENT NAME FIX] Cercando cliente nel testo...');
        
        // Prima cerca dopo "Spett.le"
        const spettMatch = text.match(/Spett\.le\s*\n([^\n]+)/i);
        if (spettMatch) {
            const clientLine = spettMatch[1].trim();
            if (clientLine && clientLine !== 'Luogo di consegna' && clientLine.length > 3) {
                console.log(`[CLIENT NAME FIX] Cliente trovato dopo Spett.le: ${clientLine}`);
                return clientLine;
            }
        }
        
        // Cerca tra "Spett.le" e l'indirizzo dell'emittente
        const spettIndex = text.search(/Spett\.le/i);
        if (spettIndex > -1) {
            const afterSpett = text.substring(spettIndex + 8, spettIndex + 300);
            const lines = afterSpett.split('\n').map(l => l.trim()).filter(l => l);
            
            // Salta "Luogo di consegna" e cerca il nome reale
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line === 'Luogo di consegna') continue;
                if (line.includes('Tel.') || line.includes('Fax') || line.includes('www.')) break;
                if (line.match(/\d{5}\s+[A-Z]/)) break; // CAP e città
                if (line.length > 3 && !line.includes('consegna')) {
                    console.log(`[CLIENT NAME FIX] Potenziale cliente trovato: ${line}`);
                    
                    // Verifica che non sia l'indirizzo dell'emittente
                    if (!line.includes('alfieri') && !line.includes('ALFIERI')) {
                        return line;
                    }
                }
            }
        }
        
        // Se non trovato, usa il codice cliente dal nome file
        if (fileName) {
            const fileMatch = fileName.match(/FTV_\d+_\d+_(\d+)_/);
            if (fileMatch) {
                const clientCode = fileMatch[1];
                console.log(`[CLIENT NAME FIX] Usando codice cliente dal nome file: ${clientCode}`);
                return `Cliente ${clientCode}`;
            }
        }
        
        return null;
    }
    
    // Override del document parser
    function overrideDocumentParser() {
        if (!window.DDTFTDocumentParser) return;
        
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[CLIENT NAME FIX] Intercettato parseDocumentFromText');
            
            // Chiama il metodo originale
            const result = originalParse.call(this, text, fileName);
            
            // Se è una fattura e il cliente è "Luogo di consegna", prova a correggerlo
            if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                if (!result.clientName || result.clientName === 'Luogo di consegna' || result.clientName.length < 3) {
                    const realClient = extractClientFromText(text, fileName);
                    if (realClient) {
                        result.clientName = realClient;
                        result.cliente = realClient;
                        console.log(`✅ [CLIENT NAME FIX] Cliente corretto: ${realClient}`);
                    }
                }
                
                // Assicurati che tutti i campi cliente siano sincronizzati
                if (result.clientName && result.clientName !== 'Luogo di consegna') {
                    result.cliente = result.clientName;
                    if (!result.clientCode && fileName) {
                        const codeMatch = fileName.match(/FTV_\d+_\d+_(\d+)_/);
                        if (codeMatch) {
                            result.clientCode = codeMatch[1];
                        }
                    }
                }
            }
            
            return result;
        };
        
        console.log('✅ [CLIENT NAME FIX] Override applicato a DDTFTDocumentParser');
    }
    
    // Applica il fix
    setTimeout(() => {
        overrideDocumentParser();
        console.log('✅ Fix nome cliente completato');
    }, 150);
    
})();