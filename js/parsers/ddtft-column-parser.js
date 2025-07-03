/**
 * Parser avanzato per gestire layout a colonne nei PDF DDT/FT
 * Specificamente ottimizzato per il formato Alfieri
 */

window.DDTFTColumnParser = (function() {
    'use strict';
    
    /**
     * Analizza il layout a colonne e estrae i dati strutturati
     * @param {Array} lines - Array di righe con coordinate X,Y
     * @param {Object} debugElement - Elemento DOM per debug
     * @returns {Object} Dati strutturati estratti
     */
    function parseColumnLayout(lines, debugElement) {
        const log = (msg) => {
            if (debugElement) {
                debugElement.textContent += `[Column Parser] ${msg}\n`;
            }
            console.log(`[Column Parser] ${msg}`);
        };
        
        log('=== INIZIO PARSING LAYOUT A COLONNE ===');
        
        // Struttura per memorizzare i dati trovati
        const extractedData = {
            documentNumber: null,
            date: null,
            clientCode: null,
            clientName: null,
            deliveryAddress: null,
            vatNumber: null
        };
        
        // PRIMA: Cerca il pattern specifico DDV Alfieri
        // Nel formato DDV, tutti i dati sono su una riga: "5023 3/06/25 1 20322 DONAC S.R.L"
        log('🔍 [FIX CRITICO] Ricerca pattern DDV: "numero(4) data(gg/mm/aa) pag codcliente(5) nome"');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Prova prima con join semplice
            let combinedText = line.map(item => item.str).join(' ').trim();
            
            // Se non trova spazi tra elementi, prova con join senza spazi
            if (!combinedText.includes(' ') && line.length > 3) {
                // Potrebbe essere che gli elementi siano separati senza spazi
                combinedText = line.map(item => item.str).join('');
            }
            
            log(`Riga ${i}: "${combinedText}"`);
            
            // Pattern più flessibile per catturare varianti
            const patterns = [
                // Pattern standard con spazi
                /^(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(\d{5})\s+(.+)$/,
                // Pattern senza spazi tra numero e data
                /^(\d{4})(\d{1,2}\/\d{2}\/\d{2})\s*(\d+)\s+(\d{5})\s+(.+)$/,
                // Pattern con separatori variabili
                /^(\d{4})\s*(\d{1,2}\/\d{2}\/\d{2})\s*(\d+)\s*(\d{5})\s*(.+)$/,
                // Pattern per elementi separati (ricostruisci manualmente)
                /^(\d{4}).*?(\d{1,2}\/\d{2}\/\d{2}).*?(\d+).*?(\d{5}).*?(.+)$/
            ];
            
            let match = null;
            for (const pattern of patterns) {
                match = combinedText.match(pattern);
                if (match) break;
            }
            
            // Se non trova con join, prova a ricostruire dai singoli elementi
            if (!match && line.length >= 4) {
                // Controlla se gli elementi corrispondono al pattern DDV (anche senza nome cliente)
                const elem0 = line[0]?.str || '';
                const elem1 = line[1]?.str || '';
                const elem2 = line[2]?.str || '';
                const elem3 = line[3]?.str || '';
                const restElems = line.slice(4).map(item => item.str).join(' ');
                
                if (/^\d{4}$/.test(elem0) && /^\d{1,2}\/\d{2}\/\d{2}$/.test(elem1) && 
                    /^\d+$/.test(elem2) && /^\d{5}$/.test(elem3)) {
                    log(`🎯 PATTERN DDV TROVATO (elementi separati)!`);
                    extractedData.documentNumber = elem0;
                    extractedData.date = elem1;
                    extractedData.clientCode = elem3;
                    
                    // Se non c'è nome cliente nella riga, cercalo nelle righe successive
                    if (!restElems.trim()) {
                        log(`   ⚠️ Nome cliente non trovato nella riga DDV, cerco nelle righe successive...`);
                        let clientNameParts = [];
                        
                        // Cerca il nome cliente nelle prossime 3 righe
                        for (let offset = 1; offset <= 3; offset++) {
                            if (i + offset < lines.length) {
                                const nextLine = lines[i + offset];
                                if (nextLine.length > 0) {
                                    // Trova elementi nella colonna Cliente (X < 250)
                                    const clienteElements = nextLine.filter(item => item.x < 250 && item.str.trim());
                                    if (clienteElements.length > 0) {
                                        const lineText = clienteElements.map(item => item.str).join(' ').trim();
                                        
                                        // Salta righe che contengono solo indirizzi o P.IVA
                                        if (!lineText.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|P\.ZA|PIAZZA|\d{5}|\d{11})/i)) {
                                            clientNameParts.push(lineText);
                                            log(`   📝 Parte nome cliente trovata: ${lineText}`);
                                        } else {
                                            break; // Abbiamo raggiunto l'indirizzo, stop
                                        }
                                    }
                                }
                            }
                        }
                        
                        if (clientNameParts.length > 0) {
                            extractedData.clientName = clientNameParts.join(' ').trim();
                            log(`   ✅ Nome cliente completo: ${extractedData.clientName}`);
                        }
                    } else {
                        // Gestione nome cliente duplicato
                        let clientName = restElems.trim();
                        
                        // Se il nome appare duplicato (es. "MAROTTA SRL MAROTTA SRL"), prendi solo la prima occorrenza
                        const words = clientName.split(/\s+/);
                        if (words.length >= 2) {
                            // Verifica se c'è una duplicazione esatta
                            const halfLength = Math.floor(words.length / 2);
                            const firstHalf = words.slice(0, halfLength).join(' ');
                            const secondHalf = words.slice(halfLength).join(' ');
                            
                            if (firstHalf === secondHalf && firstHalf.length > 0) {
                                log(`   ⚠️ Nome cliente duplicato rilevato: "${clientName}" -> "${firstHalf}"`);
                                clientName = firstHalf;
                            }
                        }
                        
                        extractedData.clientName = clientName;
                    }
                    
                    log(`   Numero: ${elem0}`);
                    log(`   Data: ${elem1}`);
                    log(`   Pagina: ${elem2}`);
                    log(`   Cod.Cliente: ${elem3}`);
                    log(`   Cliente: ${extractedData.clientName}`);
                    
                    match = true; // Flag per indicare che abbiamo trovato i dati
                }
            }
            
            if (match && match.length) {
                extractedData.documentNumber = match[1];
                extractedData.date = match[2];
                extractedData.clientCode = match[4];
                
                // Gestione nome cliente duplicato
                let clientName = match[5].trim();
                
                // Se il nome appare duplicato (es. "MAROTTA SRL MAROTTA SRL"), prendi solo la prima occorrenza
                const words = clientName.split(/\s+/);
                if (words.length >= 2) {
                    // Verifica se c'è una duplicazione esatta
                    const halfLength = Math.floor(words.length / 2);
                    const firstHalf = words.slice(0, halfLength).join(' ');
                    const secondHalf = words.slice(halfLength).join(' ');
                    
                    if (firstHalf === secondHalf && firstHalf.length > 0) {
                        log(`   ⚠️ Nome cliente duplicato rilevato: "${clientName}" -> "${firstHalf}"`);
                        clientName = firstHalf;
                    }
                }
                
                extractedData.clientName = clientName;
                log(`🎯 PATTERN DDV ALFIERI TROVATO!`);
                log(`   Numero: ${match[1]}`);
                log(`   Data: ${match[2]}`);
                log(`   Pagina: ${match[3]}`);
                log(`   Cod.Cliente: ${match[4]}`);
                log(`   Cliente: ${extractedData.clientName}`);
            }
            
            if (extractedData.documentNumber) {
                // Per DDV, cerca l'indirizzo di consegna nelle righe successive
                let addressLines = [];
                
                for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                    const nextLine = lines[j];
                    
                    // Filtra gli elementi nella colonna "Luogo di consegna" (X > 280)
                    const luogoElements = nextLine.filter(item => item.x > 280);
                    if (luogoElements.length > 0) {
                        const luogoText = luogoElements.map(item => item.str).join(' ').trim();
                        
                        // Salta righe non rilevanti
                        if (luogoText && !luogoText.match(/^(COD\.|Pagamento|Operatore)/i)) {
                            // Se è un pattern indirizzo o contiene numeri (CAP), aggiungilo
                            if (luogoText.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|P\.ZA|PIAZZA|STRADA)/i) ||
                                luogoText.match(/^\d{5}/) ||
                                (addressLines.length > 0 && luogoText.match(/^[A-Z]/))) {
                                addressLines.push(luogoText);
                                log(`   Riga indirizzo consegna trovata: ${luogoText}`);
                                
                                // Se abbiamo trovato il CAP + città, probabilmente abbiamo l'indirizzo completo
                                if (luogoText.match(/^\d{5}/)) {
                                    break;
                                }
                            }
                        }
                    }
                }
                
                if (addressLines.length > 0) {
                    extractedData.deliveryAddress = addressLines.join(' ').trim();
                    log(`   Indirizzo consegna completo: ${extractedData.deliveryAddress}`);
                }
                
                // Cerca P.IVA cliente nelle righe vicine
                for (let k = Math.max(0, i - 5); k < Math.min(i + 15, lines.length); k++) {
                    const checkLine = lines[k];
                    const checkText = checkLine.map(item => item.str).join(' ');
                    const pivaMatch = checkText.match(/\b(\d{11})\b/);
                    if (pivaMatch && pivaMatch[1] !== '03247720042') {
                        extractedData.vatNumber = pivaMatch[1];
                        log(`   P.IVA cliente: ${pivaMatch[1]}`);
                        break;
                    }
                }
                
                // Dati trovati, esci dal loop
                return extractedData;
            }
        }
        
        log('⚠️ Pattern DDV non trovato con ricerca diretta, continuo con parsing standard...');
        
        // Se non trova il pattern DDV, continua con la logica standard
        // Trova le righe chiave per orientarsi nel documento
        let numeroRowIndex = -1;
        let clienteRowIndex = -1;
        let ddtRowIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const combinedText = line.map(item => item.str).join(' ');
            
            if (combinedText.includes('Numero') && combinedText.includes('Del')) {
                numeroRowIndex = i;
                log(`📍 Trovata riga intestazione numero/data all'indice ${i}: "${combinedText}"`);
            }
            if (combinedText.includes('Cliente') && combinedText.includes('Luogo di consegna')) {
                clienteRowIndex = i;
                log(`📍 Trovata riga intestazione cliente all'indice ${i}: "${combinedText}"`);
            }
            if (combinedText.includes('D.D.T.')) {
                ddtRowIndex = i;
                log(`📍 Trovata riga D.D.T. all'indice ${i}: "${combinedText}"`);
            }
        }
        
        // Estrai numero documento e data
        if (numeroRowIndex >= 0) {
            // La riga successiva dovrebbe contenere i valori
            for (let i = numeroRowIndex + 1; i < Math.min(numeroRowIndex + 5, lines.length); i++) {
                const line = lines[i];
                if (line && line.length > 0) {
                    // Cerca elementi che potrebbero essere numero/data in base alla posizione X
                    let numeroX = -1;
                    let dateX = -1;
                    let codClienteX = -1;
                    
                    // Trova le coordinate X dalle intestazioni
                    const headerLine = lines[numeroRowIndex];
                    headerLine.forEach(item => {
                        if (item.str.includes('Numero')) numeroX = item.x;
                        if (item.str.includes('Del')) dateX = item.x;
                        if (item.str.includes('Cod. Cliente')) codClienteX = item.x;
                    });
                    
                    log(`📐 Coordinate X - Numero: ${numeroX}, Del: ${dateX}, Cod.Cliente: ${codClienteX}`);
                    
                    // Analizza gli elementi della riga corrente
                    line.forEach(item => {
                        const text = item.str.trim();
                        const x = item.x;
                        
                        // Se è vicino alla colonna "Numero" e sembra un numero
                        if (numeroX > 0 && Math.abs(x - numeroX) < 50 && /^\d{4,6}$/.test(text)) {
                            // Escludi numeri noti che NON sono numeri documento
                            const excludedNumbers = ['275071', '100000']; // REA e capitale sociale
                            if (!excludedNumbers.includes(text)) {
                                extractedData.documentNumber = text;
                                log(`✅ Numero documento trovato: ${text}`);
                            } else {
                                log(`⚠️ Numero ${text} escluso (non è un numero documento)`);
                            }
                        }
                        
                        // Se è vicino alla colonna "Del" e sembra una data
                        if (dateX > 0 && Math.abs(x - dateX) < 50 && /\d{2}\/\d{2}\/\d{2}/.test(text)) {
                            extractedData.date = text;
                            log(`✅ Data trovata: ${text}`);
                        }
                        
                        // Se è vicino alla colonna "Cod. Cliente"
                        if (codClienteX > 0 && Math.abs(x - codClienteX) < 50 && /^\d{4,5}$/.test(text)) {
                            extractedData.clientCode = text;
                            log(`✅ Codice cliente trovato: ${text}`);
                        }
                    });
                    
                    // Se abbiamo trovato almeno numero o data, interrompi
                    if (extractedData.documentNumber || extractedData.date) {
                        break;
                    }
                }
            }
        }
        
        // Estrai nome cliente e indirizzo di consegna
        if (clienteRowIndex >= 0) {
            // Determina le coordinate X per le due colonne
            let clienteX = -1;
            let luogoX = -1;
            
            const headerLine = lines[clienteRowIndex];
            headerLine.forEach(item => {
                if (item.str.includes('Cliente')) clienteX = item.x;
                if (item.str.includes('Luogo')) luogoX = item.x;
            });
            
            log(`📐 Coordinate colonne - Cliente X: ${clienteX}, Luogo X: ${luogoX}`);
            
            // Buffer per raccogliere righe multi-linea
            const clienteLines = [];
            const luogoLines = [];
            
            // Analizza le righe successive
            for (let i = clienteRowIndex + 1; i < Math.min(clienteRowIndex + 10, lines.length); i++) {
                const line = lines[i];
                if (!line || line.length === 0) continue;
                
                // Ordina gli elementi per X
                const sortedItems = [...line].sort((a, b) => a.x - b.x);
                
                // Dividi in colonne basandosi sulla posizione X
                const leftColumn = [];
                const rightColumn = [];
                
                sortedItems.forEach(item => {
                    const text = item.str.trim();
                    if (!text) return;
                    
                    // Se luogoX è definito, usa quello come punto di divisione
                    if (luogoX > 0) {
                        if (item.x < luogoX - 20) {
                            leftColumn.push(text);
                        } else {
                            rightColumn.push(text);
                        }
                    } else {
                        // Fallback: dividi a metà pagina o usa grande gap
                        if (item.x < 250) {
                            leftColumn.push(text);
                        } else {
                            rightColumn.push(text);
                        }
                    }
                });
                
                // Aggiungi alle rispettive colonne
                if (leftColumn.length > 0) {
                    const leftText = leftColumn.join(' ');
                    if (leftText && !leftText.match(/^(Partita IVA|Codice Fiscale|Operatore)/i)) {
                        clienteLines.push(leftText);
                        log(`📝 Cliente riga ${i}: "${leftText}"`);
                    }
                }
                
                if (rightColumn.length > 0) {
                    const rightText = rightColumn.join(' ');
                    if (rightText && !rightText.match(/^(Partita IVA|Codice Fiscale|Via di consegna)/i)) {
                        luogoLines.push(rightText);
                        log(`📝 Luogo riga ${i}: "${rightText}"`);
                    }
                }
                
                // Interrompi se troviamo P.IVA o altri indicatori di fine sezione
                const combinedText = line.map(item => item.str).join(' ');
                if (combinedText.match(/Partita IVA|Codice Fiscale|Documento interno/i)) {
                    break;
                }
            }
            
            // Combina le righe del cliente
            if (clienteLines.length > 0) {
                extractedData.clientName = clienteLines.join(' ').replace(/\s+/g, ' ').trim();
                log(`✅ Nome cliente estratto: "${extractedData.clientName}"`);
            }
            
            // Combina le righe del luogo di consegna
            if (luogoLines.length > 0) {
                extractedData.deliveryAddress = luogoLines.join(' ').replace(/\s+/g, ' ').trim();
                log(`✅ Indirizzo consegna estratto: "${extractedData.deliveryAddress}"`);
            }
        }
        
        // Cerca P.IVA nel documento
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const combinedText = line.map(item => item.str).join(' ');
            
            // Cerca pattern P.IVA
            const pivaMatch = combinedText.match(/\b(\d{11})\b/);
            if (pivaMatch && pivaMatch[1] !== '03247720042') { // Escludi P.IVA Alfieri
                extractedData.vatNumber = pivaMatch[1];
                log(`✅ P.IVA trovata: ${pivaMatch[1]}`);
                break;
            }
        }
        
        log('=== FINE PARSING LAYOUT A COLONNE ===');
        return extractedData;
    }
    
    /**
     * Converte l'output del PDF parser in formato con coordinate
     * @param {Object} textContent - Output di PDF.js getTextContent
     * @returns {Array} Array di righe con coordinate
     */
    function convertToLineFormat(textContent) {
        const lines = [];
        let currentLine = [];
        let currentY = null;
        
        textContent.items.forEach(item => {
            const itemY = item.transform[5];
            const itemX = item.transform[4];
            
            if (currentY === null || Math.abs(itemY - currentY) <= 5) {
                // Stessa riga
                currentLine.push({
                    x: itemX,
                    y: itemY,
                    str: item.str,
                    width: item.width || 0
                });
                currentY = itemY;
            } else {
                // Nuova riga
                if (currentLine.length > 0) {
                    lines.push(currentLine);
                }
                currentLine = [{
                    x: itemX,
                    y: itemY,
                    str: item.str,
                    width: item.width || 0
                }];
                currentY = itemY;
            }
        });
        
        // Aggiungi l'ultima riga
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    // API pubblica
    return {
        parseColumnLayout,
        convertToLineFormat
    };
})();

console.log('✅ DDTFTColumnParser caricato con successo');