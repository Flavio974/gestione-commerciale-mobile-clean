/**
 * Fix per l'allineamento corretto delle colonne DDV
 * Corregge l'estrazione mischiata di indirizzi cliente/consegna
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix allineamento colonne DDV...');
    
    // Override del metodo di parsing per DDV
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[DDV COLUMN ALIGN] Verifico allineamento colonne...');
            
            // Se è un DDV, preprocessa il testo per correggere l'allineamento
            if (fileName && fileName.includes('DDV')) {
                text = fixDDVColumnAlignment(text);
            }
            
            // Chiama il parser originale con il testo corretto
            return originalParse.call(this, text, fileName);
        };
    }
    
    /**
     * Corregge l'allineamento delle colonne nel testo DDV
     */
    function fixDDVColumnAlignment(text) {
        console.log('[DDV COLUMN ALIGN] Analisi struttura DDV...');
        
        const lines = text.split('\n');
        let ddvDataIndex = -1;
        
        // Trova la riga con i dati DDV (numero, data, pag, cod.cliente)
        const ddvPattern = /(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(2\d{4})/;
        
        for (let i = 0; i < lines.length; i++) {
            if (ddvPattern.test(lines[i])) {
                ddvDataIndex = i;
                console.log(`[DDV COLUMN ALIGN] Trovata riga DDV all'indice ${i}: "${lines[i]}"`);
                break;
            }
        }
        
        if (ddvDataIndex === -1) {
            console.log('[DDV COLUMN ALIGN] Pattern DDV non trovato, skip fix');
            return text;
        }
        
        // Analizza e correggi le righe successive
        const fixedLines = [...lines];
        
        // Processa le 4 righe dopo il DDV pattern
        for (let offset = 1; offset <= 4 && ddvDataIndex + offset < lines.length; offset++) {
            const lineIndex = ddvDataIndex + offset;
            const line = lines[lineIndex];
            
            console.log(`[DDV COLUMN ALIGN] Analisi riga ${lineIndex}: "${line}"`);
            
            // Identifica il tipo di riga e applica la correzione appropriata
            if (offset === 1) {
                // Riga cliente: spesso duplicata
                const fixed = fixClientRow(line);
                if (fixed !== line) {
                    fixedLines[lineIndex] = fixed;
                    console.log(`[DDV COLUMN ALIGN] Riga cliente corretta: "${fixed}"`);
                }
            } else if (offset === 2) {
                // Riga indirizzo: assicurati che sia ben separata
                const fixed = fixAddressRow(line);
                if (fixed !== line) {
                    fixedLines[lineIndex] = fixed;
                    console.log(`[DDV COLUMN ALIGN] Riga indirizzo corretta: "${fixed}"`);
                }
            } else if (offset === 3 || offset === 4) {
                // Riga città/CAP o info aggiuntiva
                const fixed = fixCityRow(line);
                if (fixed !== line) {
                    fixedLines[lineIndex] = fixed;
                    console.log(`[DDV COLUMN ALIGN] Riga città corretta: "${fixed}"`);
                }
            }
        }
        
        // Aggiungi marcatori per aiutare l'estrazione
        const markerIndex = ddvDataIndex + 5;
        if (markerIndex < fixedLines.length) {
            fixedLines.splice(markerIndex, 0, 
                '=== FINE SEZIONE INTESTAZIONE DDV ===',
                'COLONNA SINISTRA = DATI CLIENTE',
                'COLONNA DESTRA = DATI CONSEGNA'
            );
        }
        
        return fixedLines.join('\n');
    }
    
    /**
     * Corregge la riga del cliente (spesso duplicata)
     */
    function fixClientRow(line) {
        // Se il nome è duplicato, assicurati che sia ben separato
        const parts = line.split(/\s{2,}/);
        
        if (parts.length >= 2) {
            // Se le parti sono identiche, è una duplicazione
            if (parts[0].trim() === parts[parts.length - 1].trim()) {
                // Aggiungi più spazi per una chiara separazione (senza |)
                return parts[0].trim() + '          ' + parts[parts.length - 1].trim();
            }
        }
        
        // Se c'è un pattern nome ripetuto senza spazi sufficienti
        const match = line.match(/^([A-Z\s.]+?)(\1)$/);
        if (match) {
            return match[1] + '          ' + match[2];
        }
        
        return line;
    }
    
    /**
     * Corregge la riga dell'indirizzo
     */
    function fixAddressRow(line) {
        // Cerca pattern con due VIA
        if (line.includes('VIA') && line.split('VIA').length > 2) {
            // Trova dove inizia il secondo indirizzo
            const firstViaIndex = line.indexOf('VIA');
            const secondViaIndex = line.indexOf('VIA', firstViaIndex + 3);
            
            if (secondViaIndex > firstViaIndex) {
                const firstAddress = line.substring(0, secondViaIndex).trim();
                const secondAddress = line.substring(secondViaIndex).trim();
                
                // Aggiungi separatore con spazi (senza |)
                return firstAddress + '          ' + secondAddress;
            }
        }
        
        // Se non ci sono spazi sufficienti tra le colonne
        const parts = line.split(/\s{2,}/);
        if (parts.length === 1 && line.length > 40) {
            // Prova a dividere in base a pattern comuni
            const patterns = [
                // Pattern: indirizzo LOC. qualcosa VIA altro
                /^(.+?(?:LOC\.|LOCALITA')[^V]+)\s+(VIA.+)$/i,
                // Pattern: due indirizzi VIA
                /^(VIA[^,]+,\s*\d+[^V]*)\s+(VIA.+)$/i,
                // Pattern generico a metà
                /^(.{20,40})\s+(.{20,})$/
            ];
            
            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    return match[1].trim() + '          ' + match[2].trim();
                }
            }
        }
        
        return line;
    }
    
    /**
     * Corregge la riga città/CAP
     */
    function fixCityRow(line) {
        // Cerca pattern con due CAP
        const capMatches = line.match(/\d{5}/g);
        
        if (capMatches && capMatches.length >= 2) {
            // Trova dove inizia il secondo CAP
            const firstCapIndex = line.indexOf(capMatches[0]);
            const lastCapIndex = line.lastIndexOf(capMatches[capMatches.length - 1]);
            
            // Trova un punto di divisione ragionevole
            let splitPoint = -1;
            
            // Metodo 1: Cerca il secondo CAP
            for (let i = 1; i < capMatches.length; i++) {
                const capIndex = line.indexOf(capMatches[i], firstCapIndex + 5);
                if (capIndex > firstCapIndex + 10) {
                    splitPoint = capIndex;
                    break;
                }
            }
            
            if (splitPoint > 0) {
                const firstPart = line.substring(0, splitPoint).trim();
                const secondPart = line.substring(splitPoint).trim();
                return firstPart + '          ' + secondPart;
            }
        }
        
        // Se c'è INGR. SCARICO o simili
        if (line.includes('INGR.') || line.includes('SCARICO')) {
            // Mantieni su una riga ma con indicazione chiara
            return '                    |     ' + line.trim();
        }
        
        return line;
    }
    
    console.log('✅ [DDV COLUMN ALIGN] Fix allineamento colonne attivato');
    
})();