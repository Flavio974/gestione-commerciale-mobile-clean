/**
 * Parser completo per DDT Alfieri che sostituisce la logica errata
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando parser DDT completo...');
    
    // Override nella catena di parsing
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            // Se non è un DDT, usa il parser originale
            if (!fileName || (!fileName.toUpperCase().includes('DDV') && !fileName.toUpperCase().includes('DDT'))) {
                return originalParse.call(this, text, fileName);
            }
            
            console.log('[DDT PARSER COMPLETO] Parsing DDT con logica custom');
            
            const lines = text.split('\n');
            const result = {
                type: 'ddt',
                documentType: 'DDT',
                fileName: fileName,
                items: []
            };
            
            // 1. Trova la riga con i dati del documento (numero, data, pagina, codice)
            let headerData = null;
            let headerIndex = -1;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                // Pattern: 4681 21/05/25 1 5712
                const match = line.match(/^(\d{4,5})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(\d{4,5})$/);
                if (match) {
                    headerData = {
                        numero: match[1],
                        data: match[2],
                        pagina: match[3],
                        codiceCliente: match[4]
                    };
                    headerIndex = i;
                    console.log(`[DDT PARSER COMPLETO] Header trovato alla riga ${i}:`, headerData);
                    break;
                }
            }
            
            if (!headerData) {
                console.log('[DDT PARSER COMPLETO] Header non trovato, uso parser originale');
                return originalParse.call(this, text, fileName);
            }
            
            // Imposta i dati base
            result.documentNumber = headerData.numero;
            result.orderNumber = headerData.numero;
            result.number = headerData.numero;
            result.clientCode = headerData.codiceCliente;
            result.codiceCliente = headerData.codiceCliente;
            
            // Converti data da gg/mm/aa a gg/mm/20aa
            const dateParts = headerData.data.split('/');
            if (dateParts.length === 3) {
                result.date = `${dateParts[0]}/${dateParts[1]}/20${dateParts[2]}`;
            } else {
                result.date = headerData.data;
            }
            
            // 2. Estrai nome cliente (può essere su più righe)
            let clientNameParts = [];
            let clientLineCount = 0;
            
            for (let offset = 1; offset <= 3; offset++) {
                if (headerIndex + offset < lines.length) {
                    const line = lines[headerIndex + offset].trim();
                    console.log(`[DDT PARSER COMPLETO] Controllo riga ${headerIndex + offset}: "${line}"`);
                    
                    // Se la riga contiene un indirizzo o P.IVA, fermati
                    if (line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|P\.ZA|PIAZZA|STRADA)|\d{5}|\d{11}/i)) {
                        break;
                    }
                    
                    // Se la riga è vuota o contiene solo info di pagamento, salta
                    if (!line || line.includes('Pagamento:') || line.includes('COD. FORN.')) {
                        continue;
                    }
                    
                    // Gestisci nome duplicato nella stessa riga
                    let clientName = line;
                    const parts = line.split(/\s{2,}/);
                    if (parts.length > 1 && parts[0] === parts[1]) {
                        clientName = parts[0];
                    } else {
                        // Controlla duplicazione senza spazi multipli
                        const words = line.split(' ');
                        if (words.length >= 2) {
                            const halfLength = Math.floor(words.length / 2);
                            const firstHalf = words.slice(0, halfLength).join(' ');
                            const secondHalf = words.slice(halfLength).join(' ');
                            if (firstHalf === secondHalf) {
                                clientName = firstHalf;
                            }
                        }
                    }
                    
                    // Prendi solo la parte sinistra se ci sono due colonne
                    if (parts.length >= 2) {
                        clientName = parts[0];
                    }
                    
                    clientNameParts.push(clientName);
                    clientLineCount++;
                    
                    // Se abbiamo già trovato il nome principale, verifica se c'è una seconda parte
                    if (clientLineCount === 1 && offset < 3) {
                        continue;
                    } else {
                        break;
                    }
                }
            }
            
            if (clientNameParts.length > 0) {
                const fullClientName = clientNameParts.join(' ').trim();
                result.clientName = fullClientName;
                result.cliente = fullClientName;
                console.log(`[DDT PARSER COMPLETO] Cliente completo: ${fullClientName}`);
            }
            
            // 3. Estrai SOLO indirizzo di consegna (seconda colonna)
            // L'indirizzo può iniziare dopo il nome cliente, quindi cerca dinamicamente
            let addressStartIndex = headerIndex + 1 + clientNameParts.length;
            
            if (addressStartIndex < lines.length) {
                const addressLine = lines[addressStartIndex].trim();
                console.log(`[DDT PARSER COMPLETO] Riga indirizzi: "${addressLine}"`);
                
                // La riga degli indirizzi contiene sede e consegna separati
                let deliveryAddress = '';
                
                // Prima controlla se ci sono spazi multipli per la separazione
                if (addressLine.match(/\s{5,}/)) {
                    // Split su spazi multipli mantenendo almeno 5 spazi
                    const parts = addressLine.split(/\s{5,}/);
                    if (parts.length >= 2) {
                        // Prendi l'ultima parte che dovrebbe essere l'indirizzo di consegna
                        deliveryAddress = parts[parts.length - 1].trim();
                        
                        // Verifica che non sia solo un numero civico
                        if (deliveryAddress && /^\d+\s/.test(deliveryAddress)) {
                            // Se inizia con solo un numero, probabilmente manca la via
                            // Cerca di estrarre meglio guardando il pattern completo
                            const betterMatch = addressLine.match(/\s{5,}((?:CORSO|VIA|V\.LE|VIALE|PIAZZA|P\.ZA|LOC\.|STRADA)[^,]+,\s*\d+)$/i);
                            if (betterMatch) {
                                deliveryAddress = betterMatch[1].trim();
                                console.log(`[DDT PARSER COMPLETO] Indirizzo corretto con pattern via: "${deliveryAddress}"`);
                            } else {
                                console.log(`[DDT PARSER COMPLETO] Indirizzo da spazi multipli (possibile errore): "${deliveryAddress}"`);
                            }
                        } else {
                            console.log(`[DDT PARSER COMPLETO] Indirizzo da spazi multipli: "${deliveryAddress}"`);
                        }
                    }
                }
                // Altrimenti cerca pattern "LOC. TETTO GARETTO VIA SALUZZO"
                else if (addressLine.match(/\b(LOC\.|LOCALITÀ|FRAZ\.|FRAZIONE)\s+.+\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA)/i)) {
                    // Estrai solo dalla seconda VIA in poi
                    const lastViaMatch = addressLine.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+[^,]+(?:,\s*\d+)?.*$/i);
                    if (lastViaMatch) {
                        // Trova l'ultima occorrenza di VIA/CORSO/etc
                        const lastIndex = addressLine.lastIndexOf(lastViaMatch[1]);
                        deliveryAddress = addressLine.substring(lastIndex).trim();
                        console.log(`[DDT PARSER COMPLETO] Indirizzo da pattern LOC+VIA: "${deliveryAddress}"`);
                    }
                }
                // Altrimenti cerca due indirizzi sulla stessa riga
                else {
                    // Pattern per riconoscere indirizzi (VIA, CORSO, PIAZZA, ecc.)
                    const viaPattern = /\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\b/gi;
                    const viaMatches = [...addressLine.matchAll(viaPattern)];
                    
                    if (viaMatches.length >= 2) {
                        // Trova l'ultima occorrenza e prendi da lì in poi
                        const lastMatch = viaMatches[viaMatches.length - 1];
                        deliveryAddress = addressLine.substring(lastMatch.index).trim();
                        console.log(`[DDT PARSER COMPLETO] Trovati ${viaMatches.length} indirizzi, consegna: "${deliveryAddress}"`);
                    } else {
                        // Fallback: split su spazi multipli
                        const parts = addressLine.split(/\s{2,}/);
                        
                        if (parts.length >= 2) {
                            deliveryAddress = parts[parts.length - 1].trim();
                            console.log(`[DDT PARSER COMPLETO] Indirizzo consegna da split: "${deliveryAddress}"`);
                        } else if (parts.length === 1 && addressLine.includes('   ')) {
                            // Prova con 3 spazi
                            const parts3 = addressLine.split(/\s{3,}/);
                            if (parts3.length >= 2) {
                                deliveryAddress = parts3[parts3.length - 1].trim();
                                console.log(`[DDT PARSER COMPLETO] Indirizzo consegna da split 3 spazi: "${deliveryAddress}"`);
                            }
                        }
                        
                        // Se ancora non trovato ma c'è un indirizzo nella riga
                        if (!deliveryAddress && addressLine.match(viaPattern)) {
                            deliveryAddress = addressLine;
                            console.log(`[DDT PARSER COMPLETO] Indirizzo consegna (intera riga): "${deliveryAddress}"`);
                        }
                    }
                }
                
                // Aggiungi CAP e città - cerca nella riga corretta
                // Potrebbe essere 3 o 4 righe dopo l'header, dipende dalla struttura
                let cityLineFound = false;
                for (let offset = 3; offset <= 5; offset++) {
                    if (headerIndex + offset < lines.length) {
                        const cityLine = lines[headerIndex + offset].trim();
                        console.log(`[DDT PARSER COMPLETO] Controllo riga ${headerIndex + offset} per città: "${cityLine}"`);
                        
                        // Salta righe che non contengono CAP
                        if (!cityLine.match(/\d{5}/)) {
                            continue;
                        }
                        
                        // La riga città contiene due parti separate
                        // Es: "10153 - TORINO TO     12030 MONASTEROLO DI SAVIGLIANO CN"
                        
                        // Prima cerca parti con CAP (5 cifre)
                        const capPattern = /\d{5}/g;
                        const capMatches = cityLine.match(capPattern);
                        
                        if (capMatches && capMatches.length >= 2) {
                            // Trova la posizione del secondo CAP e prendi tutto da lì
                            const secondCapIndex = cityLine.lastIndexOf(capMatches[capMatches.length - 1]);
                        if (secondCapIndex >= 0) {
                            const deliveryCity = cityLine.substring(secondCapIndex).trim();
                            if (deliveryAddress) {
                                deliveryAddress += ' ' + deliveryCity;
                            } else {
                                deliveryAddress = deliveryCity;
                            }
                                console.log(`[DDT PARSER COMPLETO] Città consegna trovata: "${deliveryCity}"`);
                                cityLineFound = true;
                                break;
                            }
                        } else {
                            // Fallback: split su spazi multipli
                            const cityParts = cityLine.split(/\s{2,}/);
                            if (cityParts.length > 1) {
                                // Prendi l'ultima parte (dovrebbe essere la città di consegna)
                                const lastPart = cityParts[cityParts.length - 1].trim();
                                if (lastPart && /^\d{5}/.test(lastPart)) {
                                    if (deliveryAddress) {
                                        deliveryAddress += ' ' + lastPart;
                                    } else {
                                        deliveryAddress = lastPart;
                                    }
                                    console.log(`[DDT PARSER COMPLETO] Città consegna da split: "${lastPart}"`);
                                    cityLineFound = true;
                                    break;
                                }
                            } else if (cityParts.length === 1) {
                                // Se c'è una sola parte, potrebbe essere tutto l'indirizzo di consegna
                                const match = cityLine.match(/\d{5}\s*-?\s*[A-Z\s]+\s*[A-Z]{2}$/);
                                if (match) {
                                    if (deliveryAddress) {
                                        deliveryAddress += ' ' + match[0].trim();
                                    } else {
                                        deliveryAddress = match[0].trim();
                                    }
                                    console.log(`[DDT PARSER COMPLETO] Città consegna (pattern): "${match[0].trim()}"`);
                                    cityLineFound = true;
                                    break;
                                }
                            }
                        }
                        
                        if (cityLineFound) break;
                    }
                }
                
                if (deliveryAddress) {
                    result.deliveryAddress = deliveryAddress.trim();
                    result.indirizzoConsegna = deliveryAddress.trim();
                    console.log(`[DDT PARSER COMPLETO] Indirizzo consegna estratto: ${deliveryAddress.trim()}`);
                } else {
                    console.log(`[DDT PARSER COMPLETO] Indirizzo consegna non trovato`);
                }
            }
            
            // 4. Estrai P.IVA (cerca dopo l'header)
            for (let i = headerIndex + 4; i < Math.min(headerIndex + 10, lines.length); i++) {
                const line = lines[i].trim();
                const pivaMatch = line.match(/\b(\d{11})\b/);
                if (pivaMatch) {
                    const piva = pivaMatch[1];
                    // Escludi P.IVA dell'emittente
                    if (piva !== '03247720042') {
                        result.vatNumber = piva;
                        result.partitaIVA = piva;
                        result.piva = piva;
                        console.log(`[DDT PARSER COMPLETO] P.IVA: ${piva}`);
                        break;
                    }
                }
            }
            
            // 5. Cerca riferimento ordine
            let orderFound = false;
            console.log(`[DDT PARSER COMPLETO] Inizio ricerca riferimento ordine...`);
            
            // Prima cerca il pattern standard "Rif. Vs. Ordine n." o "Rif. Ns. Ordine N."
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Salta righe vuote
                if (!line.trim()) continue;
                
                // Pattern per "Rif. Vs. Ordine n. 507A865AS02756"
                let orderMatch = line.match(/Rif\.?\s*V[s.]?\s*\.?\s*Ordine\s*n\.?\s*([A-Z0-9]+)/i);
                
                // Pattern alternativo per "Rif. Ns. Ordine N."
                if (!orderMatch) {
                    orderMatch = line.match(/Rif\.?\s*N[s.]?\s*\.?\s*Ordine\s*N\.?\s*(\d+)/i);
                }
                
                // Pattern generico per "Ordine" seguito da numero
                if (!orderMatch && line.toLowerCase().includes('ordine')) {
                    orderMatch = line.match(/Ordine\s*n?\.?\s*([A-Z0-9]+)(?:\s+del|\s*$)/i);
                }
                
                if (orderMatch && orderMatch[1]) {
                    result.orderReference = orderMatch[1];
                    result.riferimentoOrdine = orderMatch[1];
                    result.orderNumber = orderMatch[1];
                    console.log(`[DDT PARSER COMPLETO] Riferimento ordine standard trovato: ${orderMatch[1]}`);
                    
                    // Cerca la data dell'ordine sulla stessa riga
                    const dateMatch = line.match(/del\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)/i);
                    if (dateMatch && dateMatch[1]) {
                        let orderDate = dateMatch[1];
                        console.log(`[DDT PARSER COMPLETO] Data ordine grezza trovata: ${orderDate}`);
                        
                        // Normalizza la data
                        const dateParts = orderDate.split(/[\/\-]/);
                        
                        if (dateParts.length === 2) {
                            // Manca l'anno (es: "15/05")
                            const day = dateParts[0];
                            const month = dateParts[1];
                            const year = new Date().getFullYear().toString();
                            orderDate = `${day}/${month}/${year}`;
                            console.log(`[DDT PARSER COMPLETO] Anno mancante, aggiunto anno corrente: ${orderDate}`);
                        }
                        else if (dateParts.length === 3) {
                            const day = dateParts[0];
                            const month = dateParts[1];
                            let year = dateParts[2];
                            
                            if (year.length === 1) {
                                year = new Date().getFullYear().toString();
                                console.log(`[DDT PARSER COMPLETO] Anno troncato, uso anno corrente: ${year}`);
                            } else if (year.length === 2) {
                                year = '20' + year;
                            }
                            
                            orderDate = `${day}/${month}/${year}`;
                        }
                        
                        result.orderDate = orderDate;
                        console.log(`[DDT PARSER COMPLETO] Data ordine normalizzata: ${orderDate}`);
                    }
                    
                    orderFound = true;
                    break;
                }
            }
            
            console.log(`[DDT PARSER COMPLETO] Ricerca standard completata. Trovato: ${orderFound}`);
            
            // Se ha trovato un numero che è uguale al numero documento, non è valido
            if (orderFound && result.orderNumber === result.documentNumber) {
                console.log(`[DDT PARSER COMPLETO] Numero ordine uguale a numero documento, continuo la ricerca...`);
                orderFound = false;
                result.orderReference = null;
                result.orderNumber = null;
                result.riferimentoOrdine = null;
            }
            
            // Se non trovato, cerca pattern "507"
            if (!orderFound) {
                console.log(`[DDT PARSER COMPLETO] Ricerca pattern 507...`);
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Cerca 507 in qualsiasi posizione
                    if (line.includes('507')) {
                        console.log(`[DDT PARSER COMPLETO] Trovata riga con 507 alla posizione ${i}: "${line}"`);
                        
                        // Verifica il contesto
                        const prevLine = i > 0 ? lines[i-1].trim() : '';
                        const nextLine = i < lines.length - 1 ? lines[i+1].trim() : '';
                        
                        console.log(`[DDT PARSER COMPLETO] Contesto - Prev: "${prevLine}", Next: "${nextLine}"`);
                        
                        // Pattern: 507 seguito da nome (es: "507 SAFFIRIO FLAVIO")
                        if (line.match(/^507\s+[A-Z]/i)) {
                            // Se la riga precedente contiene "Operatore", NON è un ordine!
                            if (prevLine.toLowerCase().includes('operatore')) {
                                console.log(`❌ [DDT PARSER COMPLETO] 507 trovato dopo 'Operatore' - è il codice operatore, NON un ordine`);
                                continue;
                            }
                            
                            // Verifica se c'è un vero riferimento ordine nel documento
                            let hasRealOrderRef = false;
                            for (let j = 0; j < lines.length; j++) {
                                if (lines[j].match(/Rif\.?\s*[VN]s?\.?\s*Ordine\s*n?\.?\s*\d+/i)) {
                                    hasRealOrderRef = true;
                                    break;
                                }
                            }
                            
                            if (hasRealOrderRef) {
                                console.log(`[DDT PARSER COMPLETO] Trovato vero riferimento ordine altrove, 507 non è l'ordine`);
                                continue;
                            }
                        }
                    }
                }
                
                if (!orderFound) {
                    console.log(`[DDT PARSER COMPLETO] Nessun pattern 507 valido trovato`);
                }
            }
            
            // 6. Estrai articoli
            const items = [];
            for (let i = headerIndex + 10; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Pattern articolo: codice descrizione UM quantità prezzo importo IVA
                // Esempio: 090009 GRISSINI ST/MANO ALFIERI (G) GR.500 PZ 280 3,9500 1.106,00 04 00
                const match = line.match(/^(\w{6,})\s+(.+?)\s+(PZ|KG|LT|CF|CT|BT|SC)\s+(\d+(?:,\d+)?)\s+([\d,]+)\s+([\d\.,]+)\s+(\d{2})/);
                if (match) {
                    const item = {
                        code: match[1],
                        description: match[2].trim(),
                        unit: match[3],
                        quantity: match[4].replace(',', '.'),
                        price: match[5].replace(',', '.'),
                        total: match[6].replace(/\./g, '').replace(',', '.'),
                        vat: match[7],
                        iva: match[7],
                        vatRate: parseInt(match[7]),
                        sm: 0
                    };
                    
                    items.push(item);
                    console.log(`[DDT PARSER COMPLETO] Articolo: ${item.code} - ${item.description}`);
                }
            }
            
            result.items = items;
            
            // 7. Calcola totali
            let subtotal = 0;
            let totalIVA = 0;
            
            items.forEach(item => {
                const itemTotal = parseFloat(item.total) || 0;
                subtotal += itemTotal;
                const ivaRate = parseFloat(item.vat || '10') / 100;
                totalIVA += itemTotal * ivaRate;
            });
            
            result.subtotal = subtotal;
            result.vat = totalIVA;
            result.iva = totalIVA;
            result.totalIVA = totalIVA;
            
            // 8. Cerca totale documento nell'ultima parte
            for (let i = lines.length - 1; i >= lines.length - 10 && i >= 0; i--) {
                const line = lines[i];
                // Cerca pattern tipo: 1.150,24
                const totalMatch = line.match(/(\d{1,3}(?:\.\d{3})*,\d{2})(?:\s|$)/);
                if (totalMatch) {
                    const totalValue = parseFloat(totalMatch[1].replace(/\./g, '').replace(',', '.'));
                    if (totalValue > subtotal) {
                        result.total = totalValue;
                        result.totale = totalValue;
                        console.log(`[DDT PARSER COMPLETO] Totale documento: €${totalValue}`);
                        break;
                    }
                }
            }
            
            // Se non trovato, usa subtotale + IVA
            if (!result.total) {
                result.total = subtotal + totalIVA;
                result.totale = subtotal + totalIVA;
            }
            
            // 9. Aggiungi campi mancanti per compatibilità
            result.id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            result.importDate = new Date().toISOString();
            
            console.log('[DDT PARSER COMPLETO] Parsing completato:', {
                numero: result.documentNumber,
                cliente: result.clientName,
                ordine: result.orderNumber,
                dataOrdine: result.orderDate || 'N/A',
                articoli: result.items.length,
                totale: result.total
            });
            
            return result;
        };
        
        console.log('✅ [DDT PARSER COMPLETO] Override applicato');
    }
    
})();