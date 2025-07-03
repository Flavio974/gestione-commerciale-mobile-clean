/**
 * Fix per l'estrazione dei numeri di documento DDT/FT
 * Migliora l'estrazione dei numeri e mappa correttamente i campi
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix per numeri documenti DDT/FT...');
    
    // Attendi che gli estrattori siano caricati
    setTimeout(() => {
        // Fix per DDTExtractor
        if (window.DDTExtractor && window.DDTExtractor.prototype) {
            const originalExtractDocumentNumber = window.DDTExtractor.prototype.extractDocumentNumber;
            
            window.DDTExtractor.prototype.extractDocumentNumber = function() {
                this.log('🔍 [OVERRIDE FIX 5023] Ricerca numero documento DDT...');
                
                // STEP 1: Controlla SEMPRE prima i metadati
                if (this.getMetadataValue) {
                    const metadataValue = this.getMetadataValue('NUMERO_DOC');
                    if (metadataValue) {
                        console.log('[FIX] ✅ Numero dai METADATI:', metadataValue);
                        this._cache.documentNumber = metadataValue;
                        return metadataValue;
                    }
                }
                
                // STEP 2: Lista di numeri da ESCLUDERE
                const excludedNumbers = [
                    '275071',   // REA
                    '100000',   // Capitale sociale
                    '03247720042', // P.IVA Alfieri
                    '10018',    // CAP
                    '15124',    // CAP
                    '12050'     // CAP
                ];
                
                // STEP 3: Pattern per la riga DDT completa (formato Alfieri)
                const ddtLinePatterns = [
                    /^(\d{4})\s+\d{1,2}\/\d{2}\/\d{2}\s+\d+\s+\d{5}/m,
                    /(\d{4})\s+\d{1,2}\/\d{2}\/\d{2}\s+\d+\s+\d{5}/,
                    /(\d{4})\s*\d{1,2}\/\d{2}\/\d{2}\s*\d+\s*\d{5}/
                ];
                
                for (const pattern of ddtLinePatterns) {
                    const match = this.text.match(pattern);
                    if (match && match[1] && !excludedNumbers.includes(match[1])) {
                        this.log(`✅ [FIX] Numero trovato con pattern DDV: ${match[1]}`);
                        this._cache.documentNumber = match[1];
                        return match[1];
                    }
                }
                
                // STEP 4: Cerca dopo "Cliente Luogo di consegna"
                const clientHeaderIndex = this.text.indexOf('Cliente Luogo di consegna');
                if (clientHeaderIndex > -1) {
                    const textAfterHeader = this.text.substring(clientHeaderIndex, clientHeaderIndex + 500);
                    const lines = textAfterHeader.split('\n');
                    
                    for (let i = 1; i < lines.length && i < 10; i++) {
                        const line = lines[i].trim();
                        const match = line.match(/^(\d{4})\s+/);
                        if (match && match[1] && !excludedNumbers.includes(match[1])) {
                            this.log(`✅ [FIX] Numero trovato dopo 'Cliente': ${match[1]}`);
                            this._cache.documentNumber = match[1];
                            return match[1];
                        }
                    }
                }
                
                // STEP 5: Pattern standard ma con esclusioni
                const improvedPatterns = [
                    /D\.D\.T\.?\s*[N°n.]?\s*(\d{4,6})/i,
                    /DDT\s*[N°n.]?\s*(\d{4,6})/i,
                    /DOCUMENTO\s+DI\s+TRASPORTO\s*[N°n.]?\s*(\d{4,6})/i,
                    /^(\d{4,6})\s+\d{2}\/\d{2}\/\d{2}/m,
                    /N[°.\s]+(\d{4,6})(?:\s|\/|$)/i,
                    /NUMERO\s*:?\s*(\d{4,6})/i
                ];
                
                for (const pattern of improvedPatterns) {
                    const match = this.text.match(pattern);
                    if (match && match[1] && !excludedNumbers.includes(match[1])) {
                        this.log(`✅ [FIX] Numero documento trovato: ${match[1]}`);
                        this._cache.documentNumber = match[1];
                        return match[1];
                    }
                }
                
                // Se non trova nulla, prova il metodo originale
                const originalResult = originalExtractDocumentNumber.call(this);
                if (originalResult) {
                    return originalResult;
                }
                
                // Ultimo tentativo: cerca nelle prime righe
                this.log('🔍 [FIX] Ricerca nelle prime righe...');
                const lines = this.text.split('\n');
                for (let i = 0; i < Math.min(10, lines.length); i++) {
                    const line = lines[i].trim();
                    // Cerca un numero di 4-6 cifre all'inizio della riga
                    const match = line.match(/^(\d{4,6})(?:\s|$)/);
                    if (match) {
                        this.log(`✅ [FIX] Numero trovato nella riga ${i + 1}: ${match[1]}`);
                        this._cache.documentNumber = match[1];
                        return match[1];
                    }
                }
                
                this.log('❌ [FIX] Numero documento non trovato');
                return '';
            };
            
            // Fix per il metodo extract per mappare correttamente orderNumber
            const originalExtract = window.DDTExtractor.prototype.extract;
            window.DDTExtractor.prototype.extract = function() {
                const result = originalExtract.call(this);
                
                if (result) {
                    // FIX: Rimuovi duplicati dal nome cliente
                    if (result.clientName && result.clientName.includes('DONAC S.R.L. DONAC S.R.L.')) {
                        result.clientName = 'DONAC S.R.L.';
                        this.log(`🧹 [FIX] Rimosso duplicato dal nome cliente`);
                    }
                    
                    // Metodo generico per rimuovere duplicati
                    if (result.clientName) {
                        const parts = result.clientName.split(' ');
                        const cleanParts = [];
                        let lastPart = '';
                        
                        for (const part of parts) {
                            // Se la parte corrente è uguale alla precedente e termina con S.R.L. o simili
                            if (part === lastPart && part.match(/S\.R\.L\.|S\.P\.A\.|SRL|SPA/i)) {
                                // Salta il duplicato
                                continue;
                            }
                            cleanParts.push(part);
                            lastPart = part;
                        }
                        
                        const cleanedName = cleanParts.join(' ');
                        if (cleanedName !== result.clientName) {
                            result.clientName = cleanedName;
                            this.log(`🧹 [FIX] Nome cliente pulito: ${cleanedName}`);
                        }
                    }
                    
                    // Stesso fix per il campo 'client' se presente
                    if (result.client && result.client.includes('DONAC S.R.L. DONAC S.R.L.')) {
                        result.client = 'DONAC S.R.L.';
                    }
                    
                    // NON mappare documentNumber su orderNumber
                    // Come richiesto: il numero ordine deve essere presente nel documento originale
                    // this.log(`📝 [FIX] orderNumber non mappato automaticamente da documentNumber`);
                    
                    // NON cercare di estrarre orderNumber dal documentNumber
                    // Il numero ordine deve essere esplicitamente presente nel documento
                }
                
                return result;
            };
            
            // Override extractDeliveryAddress per correggere estrazione indirizzo
            const originalExtractDeliveryAddress = window.DDTExtractor.prototype.extractDeliveryAddress;
            window.DDTExtractor.prototype.extractDeliveryAddress = function() {
                this.log('🔍 [OVERRIDE FIX] Ricerca indirizzo di consegna...');
                
                // STEP 1: Controlla prima i metadati
                if (this.getMetadataValue) {
                    const metadataAddress = this.getMetadataValue('INDIRIZZO_CONSEGNA');
                    if (metadataAddress && metadataAddress.trim() !== '') {
                        console.log('[FIX] ✅ Indirizzo dai METADATI:', metadataAddress);
                        return metadataAddress;
                    }
                }
                
                // STEP 1.5: Per DDV vuoti, usa indirizzi fissi per clienti noti
                if (this.fileName && this.fileName.includes('DDV')) {
                    const clientName = this._cache.client || (this.extractClientName ? this.extractClientName() : '');
                    this.log(`[FIX] DDV rilevato, cliente: ${clientName}`);
                    
                    // Indirizzi fissi per DDV
                    if (clientName) {
                        const upperClient = clientName.toUpperCase();
                        
                        if (upperClient.includes('BOREALE')) {
                            const borealeAddress = 'VIA CESANA, 78 10139 TORINO TO';
                            this.log(`[FIX] ✅ Cliente BOREALE in DDV - uso indirizzo standard: ${borealeAddress}`);
                            return borealeAddress;
                        }
                        
                        if (upperClient.includes('DONAC')) {
                            const donacAddress = 'VIA CUNEO, 84/86 12011 BORGO SAN DALMAZZO CN';
                            this.log(`[FIX] ✅ Cliente DONAC in DDV - uso indirizzo standard: ${donacAddress}`);
                            return donacAddress;
                        }
                        
                        if (upperClient.includes('MAROTTA')) {
                            const marottaAddress = 'CORSO SUSA, 305/307 10098 RIVOLI TO';
                            this.log(`[FIX] ✅ Cliente MAROTTA in DDV - uso indirizzo standard: ${marottaAddress}`);
                            return marottaAddress;
                        }
                    }
                }
                
                // STEP 2: Cerca pattern specifico per DDT Alfieri
                // Cerca dopo il codice cliente (20322 nel tuo esempio)
                const clientCodePattern = /\d{5}\s*\n([\s\S]*?)(?=Partita IVA|P\.IVA|PIVA|RIFERIMENTO|Rif\.|$)/i;
                const match = this.text.match(clientCodePattern);
                
                if (match) {
                    const sectionText = match[1];
                    const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l);
                    
                    this.log(`📍 [FIX] Trovate ${lines.length} righe dopo il codice cliente`);
                    
                    // Cerca l'indirizzo nelle righe
                    let addressParts = [];
                    let foundAddress = false;
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        const upperLine = line.toUpperCase();
                        
                        // Salta righe che sono chiaramente parte del nome cliente
                        if (upperLine.includes('DONAC') || upperLine.includes('S.R.L.') || 
                            upperLine.includes('SRL') || upperLine.includes('SPA') || 
                            upperLine.includes('S.P.A.')) {
                            continue;
                        }
                        
                        // Rileva l'inizio di un indirizzo
                        if (upperLine.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|STRADA|PIAZZA|P\.ZZA|LOC\.|LOCALITA)/)) {
                            foundAddress = true;
                            addressParts.push(line);
                        } else if (foundAddress) {
                            // Se abbiamo trovato un indirizzo, aggiungi le righe successive
                            // fino a trovare un CAP o fino alla fine
                            if (line.match(/^\d{5}/) || upperLine.includes('PIVA') || upperLine.includes('P.IVA')) {
                                if (line.match(/^\d{5}/)) {
                                    addressParts.push(line);
                                }
                                break;
                            }
                            addressParts.push(line);
                        }
                    }
                    
                    if (addressParts.length > 0) {
                        const address = addressParts.join(' ').trim();
                        this.log(`✅ [FIX] Indirizzo di consegna trovato: ${address}`);
                        return address;
                    }
                }
                
                // STEP 3: Prova il metodo originale
                const originalResult = originalExtractDeliveryAddress.call(this);
                
                // STEP 4: Se il risultato contiene PIVA, scartalo
                if (originalResult && originalResult.includes('PIVA')) {
                    this.log('❌ [FIX] Risultato originale contiene PIVA, scartato');
                    
                    // Cerca un indirizzo valido nel testo
                    const addressPattern = /(VIA\s+[A-Z\s,]+\d*)\s+(\d{5})\s+([A-Z\s]+)\s+([A-Z]{2})/i;
                    const addressMatch = this.text.match(addressPattern);
                    
                    if (addressMatch) {
                        const address = `${addressMatch[1]} ${addressMatch[2]} ${addressMatch[3]} ${addressMatch[4]}`;
                        this.log(`✅ [FIX] Indirizzo trovato con pattern alternativo: ${address}`);
                        return address;
                    }
                    
                    return ''; // Meglio vuoto che PIVA
                }
                
                return originalResult || '';
            };
        }
        
        // Fix per FatturaExtractor
        if (window.FatturaExtractor && window.FatturaExtractor.prototype) {
            const originalExtractDocumentNumber = window.FatturaExtractor.prototype.extractDocumentNumber;
            
            window.FatturaExtractor.prototype.extractDocumentNumber = function() {
                this.log('🔍 [FIX] Ricerca numero fattura migliorata...');
                
                // Pattern migliorati per fatture
                const improvedPatterns = [
                    // Pattern specifico per formato Alfieri "FT 4251 21/05/25"
                    /^FT\s+(\d+)\s+\d{1,2}\/\d{2}\/\d{2}/m,
                    // Pattern specifici fattura
                    /FATTURA\s*[N°n.]?\s*(\d+(?:\/\d+)?)/i,
                    /FT\s+(\d+)/i,  // Semplificato per catturare "FT 4251"
                    /F\.T\.\s*[N°n.]?\s*(\d+(?:\/\d+)?)/i,
                    /FATTURA\s+ACCOMPAGNATORIA\s*[N°n.]?\s*(\d+(?:\/\d+)?)/i,
                    
                    // Pattern per FTV (Fattura Vendita)
                    /FTV\s*[N°n.]?\s*(\d+(?:\/\d+)?)/i,
                    /F\.T\.V\.\s*[N°n.]?\s*(\d+(?:\/\d+)?)/i,
                    
                    // Pattern generici
                    /N[°.\s]+(\d+(?:\/\d+)?)(?:\s|del|DEL|$)/i,
                    /NUMERO\s*:?\s*(\d+(?:\/\d+)?)/i,
                    
                    // Pattern per documenti commerciali
                    /DOCUMENTO\s+COMMERCIALE\s*[N°n.]?\s*(\d+(?:\/\d+)?)/i
                ];
                
                // Prova prima i pattern migliorati
                for (const pattern of improvedPatterns) {
                    const match = this.text.match(pattern);
                    if (match && match[1]) {
                        this.log(`✅ [FIX] Numero fattura trovato: ${match[1]}`);
                        return match[1];
                    }
                }
                
                // Se non trova nulla, prova il metodo originale
                const originalResult = originalExtractDocumentNumber.call(this);
                if (originalResult) {
                    return originalResult;
                }
                
                this.log('❌ [FIX] Numero fattura non trovato');
                return '';
            };
            
            // Fix per il metodo extract per NON confondere orderNumber e documentNumber
            const originalExtract = window.FatturaExtractor.prototype.extract;
            window.FatturaExtractor.prototype.extract = function() {
                const result = originalExtract.call(this);
                
                if (result) {
                    // IMPORTANTE: NON mappare documentNumber su orderNumber
                    // Sono due campi distinti:
                    // - documentNumber: numero della fattura (es: FT 4251)
                    // - orderNumber: numero ordine cliente (es: 507A865AS02756)
                    
                    // Se manca il documentNumber, prova a estrarlo
                    if (!result.documentNumber) {
                        const docNum = this.extractDocumentNumber();
                        if (docNum) {
                            result.documentNumber = docNum;
                            this.log(`📝 [FIX] Numero documento fattura estratto: ${docNum}`);
                        }
                    }
                    
                    // NON copiare mai documentNumber in orderNumber o viceversa
                    // Il numero ordine deve essere estratto separatamente
                }
                
                return result;
            };
        }
        
        // Fix anche per le versioni modulari se presenti
        if (window.DDTExtractorModular) {
            // Applica gli stessi fix alla versione modulare
            const proto = window.DDTExtractorModular.prototype;
            if (proto && !proto._documentNumberFixApplied) {
                proto._documentNumberFixApplied = true;
                
                // Copia i metodi fixati
                proto.extractDocumentNumber = window.DDTExtractor.prototype.extractDocumentNumber;
                
                const originalModularExtract = proto.extract;
                proto.extract = function() {
                    const result = originalModularExtract.call(this);
                    // NON mappare documentNumber su orderNumber nelle versioni modulari
                    // Il numero ordine deve essere presente nel documento originale
                    return result;
                };
            }
        }
        
        if (window.FatturaExtractorModular) {
            // Applica gli stessi fix alla versione modulare
            const proto = window.FatturaExtractorModular.prototype;
            if (proto && !proto._documentNumberFixApplied) {
                proto._documentNumberFixApplied = true;
                
                // Copia i metodi fixati
                proto.extractDocumentNumber = window.FatturaExtractor.prototype.extractDocumentNumber;
                
                const originalModularExtract = proto.extract;
                proto.extract = function() {
                    const result = originalModularExtract.call(this);
                    // NON mappare documentNumber su orderNumber per le fatture
                    // Sono due campi distinti:
                    // - documentNumber: numero della fattura (es: 4232)
                    // - orderNumber: numero ordine cliente (es: 507A865AS02756)
                    return result;
                };
            }
        }
        
        console.log('✅ Fix numeri documenti DDT/FT applicato con successo');
        
    }, 100); // Piccolo delay per assicurarsi che gli estrattori siano caricati
})();