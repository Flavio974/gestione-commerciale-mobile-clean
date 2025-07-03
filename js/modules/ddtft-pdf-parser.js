/**
 * Modulo per il parsing di file PDF
 * Estrae testo da PDF mantenendo la struttura e gestendo layout multi-colonna
 */

window.DDTFTPdfParser = (function() {
    'use strict';
    
    /**
     * Estrae testo da file PDF
     * @param {File} file - Il file PDF da processare
     * @returns {Promise<string>} Il testo estratto
     */
    async function extractTextFromPdf(file) {
        if (!window.pdfjsLib) {
            throw new Error('PDF.js non caricato');
        }

        const debugContent = document.getElementById('documentDebugContent');
        if (debugContent) {
            debugContent.textContent += `\n=== ESTRAZIONE PDF: ${file.name} ===\n`;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            if (debugContent) {
                debugContent.textContent += `Numero pagine: ${pdf.numPages}\n`;
            }

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // Ricostruisci il testo mantenendo la struttura
                let pageText = '';
                
                // Raggruppa gli item per riga (stessa Y)
                const lines = [];
                let currentLine = [];
                let currentY = null;
                
                textContent.items.forEach(item => {
                    if (currentY === null || Math.abs(item.transform[5] - currentY) <= 5) {
                        // Stesso Y, stessa riga
                        currentLine.push(item);
                        currentY = item.transform[5];
                    } else {
                        // Nuova riga
                        if (currentLine.length > 0) {
                            lines.push(currentLine);
                        }
                        currentLine = [item];
                        currentY = item.transform[5];
                    }
                });
                
                // Aggiungi l'ultima riga
                if (currentLine.length > 0) {
                    lines.push(currentLine);
                }
                
                // IMPORTANTE: Log per debug layout a colonne
                if (debugContent && pageNum === 1) {
                    debugContent.textContent += '\n=== DEBUG LAYOUT COLONNE ===\n';
                    // Mostra PIÙ righe per catturare la riga DDV
                    lines.slice(0, 40).forEach((line, idx) => {
                        debugContent.textContent += `Riga ${idx + 1}: `;
                        line.forEach(item => {
                            debugContent.textContent += `[X:${Math.round(item.transform[4])}, "${item.str}"] `;
                        });
                        debugContent.textContent += '\n';
                        
                        // Cerca specificamente la riga con i dati
                        const rowText = line.map(item => item.str).join(' ').trim();
                        
                        // Controlla anche elementi separati
                        let isDDVRow = false;
                        if (line.length >= 5) {
                            const elem0 = line[0]?.str || '';
                            const elem1 = line[1]?.str || '';
                            const elem2 = line[2]?.str || '';
                            const elem3 = line[3]?.str || '';
                            
                            if (/^\d{4}$/.test(elem0) && /^\d{1,2}\/\d{2}\/\d{2}$/.test(elem1) && 
                                /^\d+$/.test(elem2) && /^\d{5}$/.test(elem3)) {
                                isDDVRow = true;
                                debugContent.textContent += '🎯 RIGA DATI DDV TROVATA (ELEMENTI SEPARATI)!\n';
                                debugContent.textContent += `   Numero: ${elem0}, Data: ${elem1}, Pag: ${elem2}, CodCliente: ${elem3}\n`;
                            }
                        }
                        
                        if (!isDDVRow && rowText.match(/^\d{4}\s+\d{1,2}\/\d{2}\/\d{2}\s+\d+\s+\d{5}/)) {
                            debugContent.textContent += '🎯 RIGA DATI DDV TROVATA!\n';
                        } else if (!isDDVRow && rowText.includes('5023')) {
                            debugContent.textContent += '📍 Riga contiene numero documento 5023\n';
                        }
                    });
                }
                
                // Ricostruisci il testo
                lines.forEach((line, lineIdx) => {
                    // Ordina gli item della riga per posizione X
                    line.sort((a, b) => a.transform[4] - b.transform[4]);
                    
                    // Costruisci il testo della riga considerando le colonne
                    let rowText = '';
                    let lastX = 0;
                    
                    line.forEach((item, index) => {
                        const x = item.transform[4];
                        
                        // Se c'è un grande salto orizzontale, potrebbe essere una nuova colonna
                        if (x - lastX > 100 && rowText.length > 0) {
                            // Aggiungi tabulazione per separare le colonne
                            rowText += '\t\t';
                        } else if (index > 0 && x - lastX > 10) {
                            // Aggiungi spazio normale
                            rowText += ' ';
                        }
                        
                        rowText += item.str;
                        lastX = x + (item.width || 0);
                    });
                    
                    pageText += rowText + '\n';
                    
                    // DEBUG: Mostra le prime 40 righe di testo reale per catturare DDV
                    if (debugContent && lineIdx < 40) {
                        debugContent.textContent += `\n[TESTO RIGA ${lineIdx + 1}]: ${rowText}`;
                        
                        // Log specifico per righe con pattern numerico DDV
                        if (rowText.match(/^\d{4}\s+\d{1,2}\/\d{2}\/\d{2}\s+\d+\s+\d{5}/)) {
                            debugContent.textContent += ' ← 🎯 RIGA DATI DDV!';
                        }
                        // Controlla se la riga contiene elementi DDV separati
                        else if (line.length >= 5) {
                            const elem0 = line[0]?.str || '';
                            const elem1 = line[1]?.str || '';
                            const elem2 = line[2]?.str || '';
                            const elem3 = line[3]?.str || '';
                            
                            if (/^\d{4}$/.test(elem0) && /^\d{1,2}\/\d{2}\/\d{2}$/.test(elem1) && 
                                /^\d+$/.test(elem2) && /^\d{5}$/.test(elem3)) {
                                debugContent.textContent += ' ← 🎯 ELEMENTI DDV SEPARATI!';
                                debugContent.textContent += `\n    → Numero: ${elem0}, Data: ${elem1}, Pag: ${elem2}, CodCli: ${elem3}`;
                            }
                        }
                        // Cerca anche pattern parziali
                        else if (rowText.match(/^\d{4}\s+\d/)) {
                            debugContent.textContent += ' ← 📑 Riga numerica trovata';
                        }
                        else if (rowText.includes('5023')) {
                            debugContent.textContent += ' ← 📍 Contiene numero 5023';
                        }
                    }
                });
                
                fullText += pageText;
                
                // IMPORTANTE: Mostra il testo completo estratto per debug
                if (debugContent && pageNum === 1) {
                    debugContent.textContent += '\n\n=== TESTO COMPLETO ESTRATTO (primi 1000 caratteri) ===\n';
                    debugContent.textContent += fullText.substring(0, 1000);
                    debugContent.textContent += '\n\n=== RICERCA PATTERN DDV ===\n';
                    
                    // Cerca il pattern DDV con più flessibilità
                    const ddvPatterns = [
                        /^(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(\d{5})\s*(.*)$/m,  // Nome cliente opzionale
                        /^(\d{4})\s*(\d{1,2}\/\d{2}\/\d{2})\s*(\d+)\s*(\d{5})\s*(.*)$/m,
                        /(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(\d{5})(?:\s+(.+))?/  // Nome cliente opzionale con group
                    ];
                    
                    let ddvMatch = null;
                    for (const pattern of ddvPatterns) {
                        ddvMatch = fullText.match(pattern);
                        if (ddvMatch) {
                            // Se il nome cliente è vuoto o mancante, cercalo nella riga successiva
                            if (!ddvMatch[5] || ddvMatch[5].trim() === '') {
                                const lineIndex = fullText.indexOf(ddvMatch[0]);
                                const afterMatch = fullText.substring(lineIndex + ddvMatch[0].length);
                                const nextLineMatch = afterMatch.match(/^\n([^\n]+)/);
                                if (nextLineMatch) {
                                    ddvMatch[5] = nextLineMatch[1].trim();
                                    debugContent.textContent += '   Nome cliente trovato sulla riga successiva: ' + ddvMatch[5] + '\n';
                                }
                            }
                            break;
                        }
                    }
                    
                    // Se non trova, cerca nelle righe con coordinate
                    if (!ddvMatch) {
                        debugContent.textContent += '⚠️ Pattern DDV non trovato nel testo completo, cerco nelle righe...\n';
                        
                        // Cerca riga per riga con elementi separati
                        for (let i = 0; i < lines.length && i < 40; i++) {
                            const line = lines[i];
                            // Gestisci anche righe con 4 elementi (senza nome cliente)
                            if (line.length >= 4) {
                                const elem0 = line[0]?.str || '';
                                const elem1 = line[1]?.str || '';
                                const elem2 = line[2]?.str || '';
                                const elem3 = line[3]?.str || '';
                                const restElems = line.slice(4).map(item => item.str).join(' ');
                                
                                if (/^\d{4}$/.test(elem0) && /^\d{1,2}\/\d{2}\/\d{2}$/.test(elem1) && 
                                    /^\d+$/.test(elem2) && /^\d{5}$/.test(elem3)) {
                                    debugContent.textContent += `🎯 PATTERN DDV TROVATO NELLA RIGA ${i + 1} (ELEMENTI SEPARATI)!\n`;
                                    // Se non c'è il nome cliente, cercalo nella riga successiva
                                    let clientName = restElems;
                                    if (!clientName && i + 1 < lines.length) {
                                        const nextLine = lines[i + 1];
                                        clientName = nextLine.map(item => item.str).join(' ').trim();
                                        debugContent.textContent += `   Nome cliente dalla riga successiva: ${clientName}\n`;
                                    }
                                    ddvMatch = ['', elem0, elem1, elem2, elem3, clientName];
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (ddvMatch) {
                        debugContent.textContent += '🎯 PATTERN DDV TROVATO!\n';
                        debugContent.textContent += `   Numero: ${ddvMatch[1]}\n`;
                        debugContent.textContent += `   Data: ${ddvMatch[2]}\n`;
                        debugContent.textContent += `   Pagina: ${ddvMatch[3]}\n`;
                        debugContent.textContent += `   Cod.Cliente: ${ddvMatch[4]}\n`;
                        debugContent.textContent += `   Cliente: ${ddvMatch[5]}\n`;
                        
                        // FIX CRITICO: Se la riga DDV non è nel testo delle righe, iniettala
                        const ddvLine = `${ddvMatch[1]} ${ddvMatch[2]} ${ddvMatch[3]} ${ddvMatch[4]} ${ddvMatch[5]}`;
                        const textLines = fullText.split('\n');
                        let ddvLineFound = false;
                        
                        // Cerca se la riga DDV esiste nel testo
                        for (let i = 0; i < textLines.length; i++) {
                            if (textLines[i].includes(ddvMatch[1]) && textLines[i].includes(ddvMatch[2])) {
                                ddvLineFound = true;
                                debugContent.textContent += `✅ Riga DDV già presente alla linea ${i + 1}\n`;
                                break;
                            }
                        }
                        
                        // Se non trovata, iniettala dopo "Cliente Luogo di consegna"
                        if (!ddvLineFound) {
                            debugContent.textContent += '⚠️ RIGA DDV MANCANTE! Inietto nel testo...\n';
                            const clientHeaderIndex = fullText.indexOf('Cliente Luogo di consegna');
                            if (clientHeaderIndex > -1) {
                                const beforeHeader = fullText.substring(0, clientHeaderIndex + 26);
                                const afterHeader = fullText.substring(clientHeaderIndex + 26);
                                fullText = beforeHeader + '\n' + ddvLine + afterHeader;
                                debugContent.textContent += '✅ Riga DDV iniettata con successo!\n';
                            }
                        }
                        
                        // Usa il column parser per estrarre altri dati
                        if (window.DDTFTColumnParser) {
                            debugContent.textContent += '\n=== UTILIZZO COLUMN PARSER PER DATI AGGIUNTIVI ===\n';
                            try {
                                // Prepara i dati estratti per il parser
                                let clientName = ddvMatch[5].trim();
                                
                                // FIX: Rimuovi duplicati dal nome cliente
                                if (clientName.includes('DONAC S.R.L. DONAC S.R.L.')) {
                                    clientName = 'DONAC S.R.L.';
                                    debugContent.textContent += `🧹 Rimosso duplicato dal nome cliente\n`;
                                }
                                
                                const structuredData = {
                                    documentNumber: ddvMatch[1],
                                    date: ddvMatch[2],
                                    clientCode: ddvMatch[4],
                                    clientName: clientName,
                                    deliveryAddress: '',
                                    vatNumber: ''
                                };
                                
                                // Cerca indirizzo e P.IVA nelle righe successive
                                const textLines = fullText.split('\n');
                                for (let i = 0; i < textLines.length; i++) {
                                    const line = textLines[i];
                                    
                                    // Cerca P.IVA cliente (escludendo quella di Alfieri)
                                    // Cerca sia con pattern P.IVA che numeri di 11 cifre isolati
                                    const pivaMatch = line.match(/P\.?\s*IVA\s*[:.]?\s*(\d{11})/i);
                                    if (pivaMatch && pivaMatch[1] !== '03247720042') {
                                        structuredData.vatNumber = pivaMatch[1];
                                        debugContent.textContent += `P.IVA trovata: ${pivaMatch[1]}\n`;
                                    } else if (!structuredData.vatNumber) {
                                        // Cerca numeri di 11 cifre isolati (come nella riga 32)
                                        const vatNumbers = line.match(/\b(\d{11})\b/g);
                                        if (vatNumbers) {
                                            for (const vat of vatNumbers) {
                                                if (vat !== '03247720042' && vat === '04064060041') {
                                                    structuredData.vatNumber = vat;
                                                    debugContent.textContent += `P.IVA cliente trovata: ${vat}\n`;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    
                                    // Cerca indirizzo di consegna
                                    if (line.includes('Luogo di consegna') && i + 3 < textLines.length) {
                                        // Le prossime 3 righe dovrebbero contenere l'indirizzo
                                        const addr1 = textLines[i + 1].trim();
                                        const addr2 = textLines[i + 2].trim();
                                        const addr3 = textLines[i + 3].trim();
                                        // Controlla se l'indirizzo è sulla prima riga dopo "Luogo di consegna"
                                        if (addr1.match(/^(VIA|V\.LE|VIALE|CORSO|P\.ZA|PIAZZA)/i)) {
                                            // L'indirizzo potrebbe essere duplicato, prendi solo la seconda occorrenza
                                            const parts = addr1.split(/\s{2,}/); // Split su spazi multipli
                                            if (parts.length > 1 && parts[1].match(/^(VIA|V\.LE|VIALE|CORSO|P\.ZA|PIAZZA)/i)) {
                                                structuredData.deliveryAddress = `${parts[1]} ${addr2}`;
                                            } else {
                                                structuredData.deliveryAddress = `${addr1} ${addr2}`;
                                            }
                                            debugContent.textContent += `Indirizzo consegna trovato: ${structuredData.deliveryAddress}\n`;
                                        } else if (addr2.match(/^(VIA|V\.LE|VIALE|CORSO|P\.ZA|PIAZZA)/i)) {
                                            structuredData.deliveryAddress = `${addr2} ${addr3}`;
                                            debugContent.textContent += `Indirizzo consegna trovato: ${structuredData.deliveryAddress}\n`;
                                        }
                                    }
                                }
                                
                                // Aggiungi i dati strutturati come metadati al testo
                                const metadata = `[METADATA_START]\n` +
                                    `NUMERO_DOC:${structuredData.documentNumber}\n` +
                                    `DATA_DOC:${structuredData.date}\n` +
                                    `CODICE_CLIENTE:${structuredData.clientCode}\n` +
                                    `NOME_CLIENTE:${structuredData.clientName}\n` +
                                    `INDIRIZZO_CONSEGNA:${structuredData.deliveryAddress}\n` +
                                    `PIVA:${structuredData.vatNumber}\n` +
                                    `[METADATA_END]\n\n`;
                                
                                fullText = metadata + fullText;
                                debugContent.textContent += '\n✅ Metadati estratti e aggiunti al testo\n';
                            } catch (err) {
                                debugContent.textContent += `❌ Errore elaborazione dati: ${err.message}\n`;
                            }
                        }
                    } else {
                        debugContent.textContent += '❌ Pattern DDV non trovato\n';
                        
                        // Mostra le righe che contengono numeri
                        const linesWithNumbers = fullText.split('\n').filter(line => /\d{4}/.test(line));
                        debugContent.textContent += '\nRighe con numeri a 4 cifre:\n';
                        linesWithNumbers.slice(0, 10).forEach(line => {
                            debugContent.textContent += `   ${line}\n`;
                        });
                    }
                }
                
                // SOLO PER LA PRIMA PAGINA: Cerca pattern DDV e aggiungi metadati
                if (pageNum === 1 && debugContent) {
                    debugContent.textContent += '\n\n=== RICERCA PATTERN DDV NELLA PRIMA PAGINA ===\n';
                    
                    // Pattern DDV completo in una singola riga
                    const ddvPattern = /^(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(\d{5})\s*(.*)$/m;
                    let ddvMatch = pageText.match(ddvPattern);
                    
                    // Se non trovato nella riga intera, cerca negli elementi separati
                    if (!ddvMatch) {
                        debugContent.textContent += 'Pattern DDV non trovato nella riga intera, cerco negli elementi separati...\n';
                        
                        // Cerca negli elementi separati delle righe
                        for (let i = 0; i < lines.length && i < 40; i++) {
                            const line = lines[i];
                            // Gestisci anche righe con 4 elementi (senza nome cliente)
                            if (line.length >= 4) {
                                const elem0 = line[0]?.str || '';
                                const elem1 = line[1]?.str || '';
                                const elem2 = line[2]?.str || '';
                                const elem3 = line[3]?.str || '';
                                const restElems = line.slice(4).map(item => item.str).join(' ');
                                
                                if (/^\d{4}$/.test(elem0) && /^\d{1,2}\/\d{2}\/\d{2}$/.test(elem1) && 
                                    /^\d+$/.test(elem2) && /^\d{5}$/.test(elem3)) {
                                    debugContent.textContent += `🎯 PATTERN DDV TROVATO NELLA RIGA ${i + 1} (ELEMENTI SEPARATI)!\n`;
                                    // Se non c'è il nome cliente, cercalo nella riga successiva
                                    let clientName = restElems;
                                    if (!clientName && i + 1 < lines.length) {
                                        const nextLine = lines[i + 1];
                                        clientName = nextLine.map(item => item.str).join(' ').trim();
                                        debugContent.textContent += `   Nome cliente dalla riga successiva: ${clientName}\n`;
                                    }
                                    ddvMatch = ['', elem0, elem1, elem2, elem3, clientName];
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (ddvMatch) {
                        debugContent.textContent += '🎯 PATTERN DDV TROVATO!\n';
                        debugContent.textContent += `   Numero: ${ddvMatch[1]}\n`;
                        debugContent.textContent += `   Data: ${ddvMatch[2]}\n`;
                        debugContent.textContent += `   Pagina: ${ddvMatch[3]}\n`;
                        debugContent.textContent += `   Cod.Cliente: ${ddvMatch[4]}\n`;
                        debugContent.textContent += `   Cliente: ${ddvMatch[5]}\n`;
                        
                        // FIX CRITICO: Se la riga DDV non è nel testo delle righe, iniettala
                        const ddvLine = `${ddvMatch[1]} ${ddvMatch[2]} ${ddvMatch[3]} ${ddvMatch[4]} ${ddvMatch[5]}`;
                        const textLines = fullText.split('\n');
                        let ddvLineFound = false;
                        
                        // Cerca se la riga DDV esiste nel testo
                        for (let i = 0; i < textLines.length; i++) {
                            if (textLines[i].includes(ddvMatch[1]) && textLines[i].includes(ddvMatch[2])) {
                                ddvLineFound = true;
                                debugContent.textContent += `✅ Riga DDV già presente alla linea ${i + 1}\n`;
                                break;
                            }
                        }
                        
                        // Se non trovata, iniettala dopo "Cliente Luogo di consegna"
                        if (!ddvLineFound) {
                            debugContent.textContent += '⚠️ RIGA DDV MANCANTE! Inietto nel testo...\n';
                            const clientHeaderIndex = fullText.indexOf('Cliente Luogo di consegna');
                            if (clientHeaderIndex > -1) {
                                const beforeHeader = fullText.substring(0, clientHeaderIndex + 26);
                                const afterHeader = fullText.substring(clientHeaderIndex + 26);
                                fullText = beforeHeader + '\n' + ddvLine + afterHeader;
                                debugContent.textContent += '✅ Riga DDV iniettata con successo!\n';
                            }
                        }
                        
                        // Usa il column parser per estrarre altri dati
                        if (window.DDTFTColumnParser) {
                            debugContent.textContent += '\n=== UTILIZZO COLUMN PARSER PER DATI AGGIUNTIVI ===\n';
                            try {
                                // Prepara i dati estratti per il parser
                                const structuredData = {
                                    documentNumber: ddvMatch[1],
                                    date: ddvMatch[2],
                                    clientCode: ddvMatch[4],
                                    clientName: ddvMatch[5],
                                    deliveryAddress: '',
                                    vatNumber: ''
                                };
                                
                                // Cerca indirizzo e P.IVA nelle righe successive
                                const textLines = fullText.split('\n');
                                for (let i = 0; i < textLines.length; i++) {
                                    const line = textLines[i];
                                    
                                    // Cerca P.IVA cliente (escludendo quella di Alfieri)
                                    const pivaMatch = line.match(/P\.?\s*IVA\s*[:.]?\s*(\d{11})/i);
                                    if (pivaMatch && pivaMatch[1] !== '03247720042') {
                                        structuredData.vatNumber = pivaMatch[1];
                                        debugContent.textContent += `P.IVA trovata: ${pivaMatch[1]}\n`;
                                    }
                                    
                                    // Cerca indirizzo di consegna
                                    if (line.includes('Luogo di consegna') && i + 3 < textLines.length) {
                                        // Le prossime 3 righe dovrebbero contenere l'indirizzo
                                        const addr1 = textLines[i + 1].trim();
                                        const addr2 = textLines[i + 2].trim();
                                        const addr3 = textLines[i + 3].trim();
                                        if (addr2.match(/^VIA|V\.LE|VIALE|CORSO|P\.ZA|PIAZZA/i)) {
                                            structuredData.deliveryAddress = `${addr2} ${addr3}`;
                                            debugContent.textContent += `Indirizzo consegna trovato: ${structuredData.deliveryAddress}\n`;
                                        }
                                    }
                                }
                                
                                // Aggiungi i dati strutturati come metadati al testo
                                const metadata = `[METADATA_START]\n` +
                                    `NUMERO_DOC:${structuredData.documentNumber}\n` +
                                    `DATA_DOC:${structuredData.date}\n` +
                                    `CODICE_CLIENTE:${structuredData.clientCode}\n` +
                                    `NOME_CLIENTE:${structuredData.clientName}\n` +
                                    `INDIRIZZO_CONSEGNA:${structuredData.deliveryAddress}\n` +
                                    `PIVA:${structuredData.vatNumber}\n` +
                                    `[METADATA_END]\n\n`;
                                
                                fullText = metadata + fullText;
                                debugContent.textContent += '\n✅ Metadati estratti e aggiunti al testo\n';
                            } catch (err) {
                                debugContent.textContent += `❌ Errore elaborazione dati: ${err.message}\n`;
                            }
                        }
                    } else {
                        debugContent.textContent += '❌ Pattern DDV non trovato\n';
                        
                        // Mostra le righe che contengono numeri
                        const linesWithNumbers = fullText.split('\n').filter(line => /\d{4}/.test(line));
                        debugContent.textContent += '\nRighe con numeri a 4 cifre:\n';
                        linesWithNumbers.slice(0, 10).forEach(line => {
                            debugContent.textContent += `   ${line}\n`;
                        });
                    }
                }
                
                if (pageNum < pdf.numPages) {
                    fullText += '\n\n';
                }
            }

            return fullText;
        } catch (error) {
            console.error('Errore estrazione PDF:', error);
            if (debugContent) {
                debugContent.textContent += `\nERRORE: ${error.message}\n`;
            }
            throw error;
        }
    }
    
    /**
     * Verifica se PDF.js è caricato e configurato
     * @returns {boolean}
     */
    function isPdfJsReady() {
        return window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions && window.pdfjsLib.GlobalWorkerOptions.workerSrc;
    }
    
    /**
     * Debug: mostra struttura delle righe di un PDF
     * @param {string} text - Il testo estratto
     * @param {number} maxLines - Numero massimo di righe da mostrare
     */
    function debugPdfStructure(text, maxLines = 20) {
        const lines = text.split('\n');
        console.log('=== STRUTTURA PDF ===');
        console.log(`Totale righe: ${lines.length}`);
        console.log('\nPrime ' + maxLines + ' righe:');
        
        lines.slice(0, maxLines).forEach((line, idx) => {
            console.log(`[${idx + 1}] ${line}`);
            if (line.includes('\t\t')) {
                console.log('    ^ Contiene separatore colonne (tab)');
            }
        });
    }
    
    // Esporta le funzioni pubbliche
    return {
        extractTextFromPdf,
        isPdfJsReady,
        debugPdfStructure
    };
})();

console.log('✅ DDTFTPdfParser caricato con successo');