/**
 * Ordini Parser Module - VERSIONE CORRETTA
 * Gestisce il parsing avanzato dei PDF ordini
 */

const OrdiniParser = {
  // Sistema di log per conversioni numeriche
  numericLogBuffer: [],
  MAX_LOG_ENTRIES: 100,
  
  /**
   * Log delle conversioni numeriche per debug
   */
  logNumericConversion: function(context, original, converted, notes = '') {
    const timestamp = new Date().toLocaleTimeString('it-IT');
    const entry = {
      time: timestamp,
      context: context,
      original: original,
      converted: converted,
      notes: notes
    };
    
    this.numericLogBuffer.push(entry);
    if (this.numericLogBuffer.length > this.MAX_LOG_ENTRIES) {
      this.numericLogBuffer.shift();
    }
    
    this.updateNumericLogDisplay();
  },
  
  updateNumericLogDisplay: function() {
    const logContent = document.getElementById('numericLogContent');
    if (!logContent) return;
    
    let html = '';
    this.numericLogBuffer.forEach(entry => {
      html += `[${entry.time}] ${entry.context}\n`;
      html += `  Originale: "${entry.original}"\n`;
      html += `  Convertito: ${entry.converted}\n`;
      if (entry.notes) {
        html += `  Note: ${entry.notes}\n`;
      }
      html += '---\n';
    });
    
    logContent.textContent = html || 'Nessuna conversione registrata.';
    
    if (this.numericLogBuffer.length > 0) {
      const logDiv = document.getElementById('numericConversionLog');
      if (logDiv) logDiv.style.display = 'block';
    }
  },
  
  /**
   * Pulisce il nome del cliente rimuovendo date e numeri iniziali (MA NON i numeri nei nomi aziendali)
   */
  cleanClientName: function(clientName) {
    if (!clientName) return '';
    
    console.log('[cleanClientName] Input originale:', clientName);
    let cleaned = clientName;
    
    // Rimuove date nel formato gg/mm/aa o gg/mm/aaaa all'inizio
    cleaned = cleaned.replace(/^\d{1,2}\/\d{1,2}\/\d{2}\s+/, '');
    cleaned = cleaned.replace(/^\d{1,2}\/\d{1,2}\/\d{4}\s+/, '');
    
    // Rimuove solo lunghe sequenze di numeri isolati all'inizio (come codici ordine)
    // MA preserva numeri che fanno parte del nome aziendale (es: 4P SRL)
    cleaned = cleaned.replace(/^\d{6,}\s+/, ''); // Rimuove solo sequenze di 6+ cifre
    cleaned = cleaned.replace(/^\d+\s+\d+\s+/, ''); // Rimuove pattern tipo "123 456"
    
    // NON rimuovere numeri brevi seguiti da lettere (es: 4P, 3M, etc)
    // Solo se il numero è completamente isolato all'inizio
    if (/^\d{5,}\s/.test(cleaned)) {
      // Solo se sono 5 o più cifre isolate
      cleaned = cleaned.replace(/^\d+\s+/, '');
    }
    
    // NON tagliare alla virgola - il nome potrebbe contenere virgole legittime
    // L'estrazione del nome dovrebbe già fermarsi prima dell'indirizzo
    console.log('[cleanClientName] Output finale:', cleaned);
    
    return cleaned.trim();
  },
  
  /**
   * Parsing principale dell'ordine dal testo PDF
   */
  parseOrderFromText: function(text, fileName) {
    try {
      console.log('--- INIZIO PARSING PDF ---');
      console.log('Nome file:', fileName);
      console.log('Lunghezza testo totale:', text.length);
      
      // Debug UI
      const debugContent = document.getElementById('debugContent');
      if (debugContent) {
        debugContent.textContent += `\n=== PARSING DI ${fileName} ===\n`;
      }
      
      const lines = text.split('\n');
      
      // Mostra prime righe per debug
      console.log('Prime 30 righe del PDF:');
      for (let i = 0; i < Math.min(30, lines.length); i++) {
        console.log(`Riga ${i + 1}: ${lines[i]}`);
      }
      
      const order = {
        id: this.generateUniqueId(),
        orderNumber: '',
        clientName: '',
        orderDate: '',
        deliveryDate: '',
        deliveryAddress: '',
        vatNumber: '',
        products: [],
        totalAmount: '0',
        totalQuantity: '0',
        grandTotal: '0',
        fileName: fileName
      };
      
      console.log('📋 Oggetto order inizializzato con products:', order.products);
      
      // Estrai numero ordine
      const orderMatch = text.match(/Num\.\s*([\w]+)\s*del/i);
      if (orderMatch) {
        order.orderNumber = orderMatch[1];
        console.log('Numero ordine trovato:', order.orderNumber);
      }
      
      // Data ordine
      const orderDateMatch = text.match(/del\s*(\d{2}\/\d{2}\/\d{4})/i);
      if (orderDateMatch) {
        order.orderDate = orderDateMatch[1];
        console.log('Data ordine trovata:', order.orderDate);
      }
      
      // Nome cliente - VERSIONE MIGLIORATA per gestire nomi multi-riga
      console.log('=== DEBUG ESTRAZIONE NOME CLIENTE ===');
      
      // Trova l'indice di "Spett.le" o "Spettabile"
      const spettMatch = text.match(/Spett(?:\.le|abile)\s*/i);
      if (spettMatch) {
        const startIndex = spettMatch.index + spettMatch[0].length;
        const contextText = text.substring(startIndex);
        
        // Dividi in righe per analisi riga per riga
        const lines = contextText.split('\n');
        const clientLines = [];
        
        console.log(`📋 Analizzando ${lines.length} righe dopo "Spett.le"`);
        
        // Funzione helper per verificare se una riga è una condizione di stop
        const isStopLine = (line) => {
          const addressPatterns = [
            /^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|P\.ZZA|PZA|LARGO|LOCALITA'|LOC\.|STRADA|STR\.)/i,
            /^P\.?\s*IVA/i,
            /^PARTITA\s+IVA/i,
            /^C\.?F\.?/i,
            /^\d{5}\s+/i,
            /^TEL\.?/i,
            /^FAX/i,
            /^CELL\.?/i,
            /^E-?MAIL/i
          ];
          return addressPatterns.some(pattern => pattern.test(line));
        };
        
        // Funzione per determinare se continuare a leggere
        const shouldContinueReading = (currentLine, lines, currentIndex) => {
          if (currentLine.endsWith('&')) {
            console.log('➡️ Continua: riga finisce con &');
            return true;
          }
          
          const continuationWords = [
            'SOCIETA\'', 'COOPERATIVA', 'PRODUTTORI', 'ALIMENTARI',
            'SUPERMERCATO', 'FRUTTA', 'VERDURA', 'E', 'DI'
          ];
          
          const lastWord = currentLine.split(' ').pop().toUpperCase();
          if (continuationWords.includes(lastWord)) {
            console.log(`➡️ Continua: ultima parola suggerisce continuazione (${lastWord})`);
            return true;
          }
          
          if (currentIndex + 1 < lines.length) {
            const nextLine = lines[currentIndex + 1].trim();
            
            if (!nextLine || isStopLine(nextLine)) {
              return false;
            }
            
            if (nextLine[0] && nextLine[0] === nextLine[0].toUpperCase() && !/^\d/.test(nextLine)) {
              if (!currentLine.match(/(S\.R\.L\.|SRL|S\.P\.A\.|SPA|SNC|SAS)\s*$/i)) {
                console.log('➡️ Continua: prossima riga sembra parte del nome');
                return true;
              }
            }
          }
          
          return false;
        };
        
        // Estrai il nome riga per riga
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (clientLines.length === 0 && !line) {
            continue;
          }
          
          if (isStopLine(line)) {
            console.log(`🛑 Stop alla riga: "${line}"`);
            break;
          }
          
          let processedLine = line;
          
          // Gestisci varie forme di "Luogo"
          if (line.match(/^Luogo\s*di\s*consegna:/i)) {
            processedLine = line.replace(/^Luogo\s*di\s*consegna:\s*/i, '').trim();
            console.log(`📍 Rimosso "Luogo di consegna:" -> "${processedLine}"`);
          } else if (line.match(/^Luogo\s*:/i)) {
            processedLine = line.replace(/^Luogo\s*:\s*/i, '').trim();
            console.log(`📍 Rimosso "Luogo:" -> "${processedLine}"`);
          } else if (line.match(/^Luogo\s+/i) && !line.match(/^Luogo\s+[a-z]/i)) {
            // Solo "Luogo" seguito da spazio e maiuscola (probabile nome)
            processedLine = line.replace(/^Luogo\s+/i, '').trim();
            console.log(`📍 Rimosso "Luogo " -> "${processedLine}"`);
          }
          
          // Non aggiungere se è rimasto solo "Luogo"
          if (processedLine && !processedLine.match(/^Luogo$/i)) {
            clientLines.push(processedLine);
            console.log(`✅ Aggiunta riga ${i + 1}: "${processedLine}"`);
            
            if (!shouldContinueReading(processedLine, lines, i)) {
              console.log('📌 Fine nome cliente rilevata');
              break;
            }
          } else if (processedLine.match(/^Luogo$/i)) {
            console.log(`⚠️ Saltata riga con solo "Luogo", continuo con la prossima`);
          }
        }
        
        // Unisci le righe
        const fullName = clientLines.join(' ').replace(/\s+/g, ' ').trim();
        console.log(`📝 Nome cliente completo: "${fullName}"`);
        
        // Validazione finale: assicurati che non sia solo "Luogo"
        if (fullName.match(/^Luogo$/i)) {
          console.log('⚠️ ATTENZIONE: Nome cliente estratto è solo "Luogo", probabilmente errore di parsing');
          order.clientName = '';
        } else {
          order.clientName = this.cleanClientName(fullName);
        }
        
        console.log('Cliente finale (pulito):', order.clientName);
      }
      
      console.log('\n=== ESTRAZIONE P.IVA ===');
      // P.IVA - prova diversi pattern
      const vatPatterns = [
        /P\.\s*IVA:\s*(\d{11})/i,                          // P.IVA: 12345678901
        /P\.\s*IVA\s*:\s*(\d{11})/i,                       // P.IVA : 12345678901
        /PARTITA\s+IVA:\s*(\d{11})/i,                      // PARTITA IVA: 12345678901
        /P\.IVA\s+(\d{11})/i,                              // P.IVA 12345678901 (con spazio obbligatorio)
        /P\.\s*IVA\s+(\d{11})/i,                           // P. IVA 12345678901 o P.IVA 12345678901
        /PIVA\s+(\d{11})/i,                                // PIVA 12345678901 (senza punti)
        /P\.\s*IVA[::\s]+([0-9\s]+?)(?:\n|$)/i,           // P.IVA con possibili spazi
        /\bIT\s*(\d{11})\b/i                               // IT12345678901
      ];
      
      // Pattern aggiuntivi per P.IVA su riga separata
      const multiLineVatPatterns = [
        /P\.\s*IVA\s*\n\s*(\d{11})/i,                     // P.IVA su una riga, numero sulla successiva
        /PARTITA\s+IVA\s*\n\s*(\d{11})/i,                 // PARTITA IVA su una riga, numero sulla successiva
        /P\.\s*IVA\s*:\s*\n\s*(\d{11})/i,                 // P.IVA: su una riga, numero sulla successiva
        /IVA\s*\n\s*(\d{11})/i                            // IVA su una riga, numero sulla successiva
      ];
      
      let vatFound = false;
      console.log('🔍 Ricerca P.IVA nel documento...');
      
      // Prima cerca nel testo per vedere se c'è una P.IVA
      const pivaSearch = text.match(/P\.?\s*IVA\s*:?\s*\d{11}/gi);
      if (pivaSearch) {
        console.log('📋 Trovati riferimenti P.IVA nel testo:', pivaSearch);
      }
      
      // Debug: mostra le prime righe che contengono P.IVA
      const linesDebug = text.split('\n');
      console.log('📄 Cercando P.IVA nelle prime 50 righe...');
      let pivaRigaTrovata = false;
      for (let i = 0; i < Math.min(50, linesDebug.length); i++) {
        const upperLine = linesDebug[i].toUpperCase();
        if (upperLine.includes('P.IVA') || upperLine.includes('PIVA') || upperLine.includes('PARTITA IVA')) {
          pivaRigaTrovata = true;
          console.log(`  ✓ Riga ${i + 1}: "${linesDebug[i].trim()}"`);
          // Mostra anche la riga successiva che potrebbe contenere il numero
          if (i + 1 < linesDebug.length) {
            console.log(`    → Riga ${i + 2}: "${linesDebug[i + 1].trim()}"`);
          }
        }
      }
      if (!pivaRigaTrovata) {
        console.log('  ⚠️ Nessuna riga con P.IVA trovata nelle prime 50 righe');
      }
      
      for (const pattern of vatPatterns) {
        const vatMatch = text.match(pattern);
        if (vatMatch) {
          console.log('✓ Pattern match trovato:', pattern.toString());
          console.log('  Match completo:', vatMatch[0]);
          console.log('  Gruppo catturato:', vatMatch[1]);
          
          // Rimuovi eventuali spazi dal numero
          order.vatNumber = vatMatch[1].replace(/\s+/g, '').trim();
          // Verifica che sia una P.IVA valida (11 cifre)
          if (order.vatNumber.length === 11 && /^\d{11}$/.test(order.vatNumber)) {
            console.log('✅ P.IVA valida trovata:', order.vatNumber);
            vatFound = true;
            break;
          } else {
            console.log('⚠️ P.IVA non valida (lunghezza:', order.vatNumber.length, ')');
          }
        }
      }
      
      // Se non trovata con pattern single-line, prova con pattern multi-line
      if (!vatFound) {
        console.log('🔄 Tentativo con pattern multi-riga...');
        
        for (const pattern of multiLineVatPatterns) {
          const vatMatch = text.match(pattern);
          if (vatMatch) {
            console.log('✓ Pattern multi-riga match trovato:', pattern.toString());
            console.log('  Match completo:', vatMatch[0]);
            console.log('  Gruppo catturato:', vatMatch[1]);
            
            // Rimuovi eventuali spazi dal numero
            order.vatNumber = vatMatch[1].replace(/\s+/g, '').trim();
            // Verifica che sia una P.IVA valida (11 cifre)
            if (order.vatNumber.length === 11 && /^\d{11}$/.test(order.vatNumber)) {
              console.log('✅ P.IVA valida trovata (multi-riga):', order.vatNumber);
              vatFound = true;
              break;
            } else {
              console.log('⚠️ P.IVA non valida (lunghezza:', order.vatNumber.length, ')');
            }
          }
        }
      }
      
      if (!vatFound) {
        console.log('❌ P.IVA non trovata nel documento');
        console.log('  Suggerimento: verificare i pattern regex o il formato nel PDF');
      }
      
      // Data consegna - pattern specifici per evitare conflitti con data ordine
      console.log('🔍 Ricerca data consegna nel documento...');
      console.log('📅 Data ordine già estratta:', order.orderDate);
      
      const deliveryDatePatterns = [
        // Pattern più specifici che richiedono contesto "consegna"
        /(?:Data\s+(?:di\s+)?consegna|Consegna)[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
        /Consegna\s+S\.M\.*?\n.*?(\d{2}\/\d{2}\/\d{4})/s,                    // Pattern originale
        /Delivery\s+date[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
        /Consegna\s+(?:il\s+|prevista\s+)?(\d{2}\/\d{2}\/\d{4})/i,
        /(?:Spedizione|Consegna)\s*[:\-]\s*(\d{2}\/\d{2}\/\d{4})/i
      ];
      
      // Funzione per validare che la data di consegna sia logica
      const isValidDeliveryDate = (deliveryDateStr, orderDateStr) => {
        if (!orderDateStr || !deliveryDateStr) return true; // Se manca una data, accetta
        
        try {
          // Converte date in formato dd/mm/yyyy a oggetti Date per confronto
          const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/').map(Number);
            return new Date(year, month - 1, day);
          };
          
          const orderDate = parseDate(orderDateStr);
          const deliveryDate = parseDate(deliveryDateStr);
          
          // La data di consegna deve essere uguale o successiva alla data ordine
          // Ma non più di 90 giorni dopo (controllo ragionevolezza)
          const diffDays = (deliveryDate - orderDate) / (1000 * 60 * 60 * 24);
          const isValid = diffDays >= 0 && diffDays <= 90;
          
          console.log(`🧮 Validazione date:`, {
            orderDate: orderDateStr,
            deliveryDate: deliveryDateStr,
            diffDays: Math.round(diffDays),
            isValid: isValid
          });
          
          return isValid;
        } catch (error) {
          console.log('⚠️ Errore parsing date per validazione:', error);
          return true; // In caso di errore, accetta la data
        }
      };
      
      let deliveryDateFound = false;
      for (let i = 0; i < deliveryDatePatterns.length; i++) {
        const deliveryDateMatch = text.match(deliveryDatePatterns[i]);
        if (deliveryDateMatch) {
          const candidateDate = deliveryDateMatch[1];
          
          // Valida che non sia la stessa data dell'ordine e che sia logica
          if (candidateDate !== order.orderDate && isValidDeliveryDate(candidateDate, order.orderDate)) {
            order.deliveryDate = candidateDate;
            console.log(`✅ Data consegna trovata con pattern ${i + 1}:`, order.deliveryDate);
            deliveryDateFound = true;
            break;
          } else {
            console.log(`⚠️ Pattern ${i + 1} trovato data "${candidateDate}" ma scartata (uguale a data ordine o non valida)`);
          }
        }
      }
      
      if (!deliveryDateFound) {
        console.log('⚠️ Data consegna NON trovata nel documento');
        console.log('📝 Debug: ecco un campione del testo per verifica pattern:');
        // Mostra le righe che contengono "consegna" con contesto
        const lines = text.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes('consegna')) {
            console.log(`  Riga ${idx + 1}: "${line.trim()}"`);
            // Mostra anche le righe precedenti e successive per contesto
            if (idx > 0) console.log(`    Precedente: "${lines[idx-1].trim()}"`);
            if (idx < lines.length - 1) console.log(`    Successiva: "${lines[idx+1].trim()}"`);
            console.log('    ---');
          }
        });
        order.deliveryDate = '';
      }
      
      // Estrazione indirizzi
      order.deliveryAddress = this.extractDeliveryAddress(text);
      console.log('Indirizzo di consegna estratto:', order.deliveryAddress);
      
      // Parsing prodotti
      console.log('\n🔍 CHIAMATA parseProducts...');
      const productsFound = this.parseProducts(text);
      console.log(`✅ parseProducts ha restituito ${productsFound.length} prodotti`);
      order.products = productsFound;
      console.log(`✅ order.products ora contiene ${order.products.length} prodotti`);
      
      // Estrai totali dal PDF
      console.log('\n=== ESTRAZIONE TOTALI ===');
      
      // Pattern per totale quantità
      const totalQtyPatterns = [
        /Totale\s+quantit[àa]\s+(\d+(?:[,\.]\d+)?)/i,
        /Totale\s+q\.t[àa]\s+(\d+(?:[,\.]\d+)?)\s*(?:PZ|KG|CT)?/i,
        /Tot\.\s+quantit[àa]\s+(\d+(?:[,\.]\d+)?)/i,
        /Tot\.\s+q\.t[àa]\s+(\d+(?:[,\.]\d+)?)/i,
        /Quantit[àa]\s+totale[:\s]+(\d+(?:[,\.]\d+)?)/i
      ];
      
      for (const pattern of totalQtyPatterns) {
        const match = text.match(pattern);
        if (match) {
          order.totalQuantity = match[1];
          console.log('✓ Totale quantità estratto dal PDF:', order.totalQuantity);
          break;
        }
      }
      
      // Pattern per totale merce
      const totalAmountPatterns = [
        /Totale\s+merce\s+(\d+(?:,\d+)?)\s*€/i,
        /Tot\.\s+merce\s+(\d+(?:,\d+)?)\s*€/i,
        /Totale\s+imponibile\s+(\d+(?:,\d+)?)\s*€/i
      ];
      
      for (const pattern of totalAmountPatterns) {
        const match = text.match(pattern);
        if (match) {
          order.totalAmount = match[1];
          console.log('Totale merce estratto:', order.totalAmount);
          break;
        }
      }
      
      // Pattern per totale documento (con IVA)
      const grandTotalPatterns = [
        /TOTALE\s+DOCUMENTO\s+(\d+(?:,\d+)?)\s*€/i,
        /Tot\.\s+documento\s+(\d+(?:,\d+)?)\s*€/i,
        /Totale\s+fattura\s+(\d+(?:,\d+)?)\s*€/i,
        /Totale\s+(\d+(?:,\d+)?)\s*€(?!.*(?:merce|imponibile|q\.t[àa]))/i
      ];
      
      for (const pattern of grandTotalPatterns) {
        const match = text.match(pattern);
        if (match) {
          order.grandTotal = match[1];
          console.log('Totale documento estratto:', order.grandTotal);
          break;
        }
      }
      
      // Estrai IVA dal PDF
      const ivaPatterns = [
        /Totale\s+IVA\s+(\d+(?:,\d+)?)\s*€/i,
        /IVA\s+22%\s+(\d+(?:,\d+)?)\s*€/i,
        /IVA\s+\d+%\s+(\d+(?:,\d+)?)\s*€/i,
        /Imponibile\s+(\d+(?:,\d+)?)\s*€\s+IVA\s+(\d+(?:,\d+)?)\s*€/i
      ];
      
      let ivaAmount = '0';
      for (const pattern of ivaPatterns) {
        const match = text.match(pattern);
        if (match) {
          // Se il pattern ha due gruppi (imponibile e IVA), prendi il secondo
          ivaAmount = match[2] || match[1];
          console.log('IVA estratta dal PDF:', ivaAmount);
          order.ivaAmount = ivaAmount;
          break;
        }
      }
      
      // Pattern per aliquota IVA
      const aliquotaMatch = text.match(/IVA\s+(\d+)%/i);
      if (aliquotaMatch) {
        order.ivaRate = aliquotaMatch[1];
        console.log('Aliquota IVA:', order.ivaRate + '%');
      }
      
      // Se non trovati tutti i totali, calcola dai prodotti
      if (order.products.length > 0) {
        let calcTotalAmount = 0;
        let calcTotalQuantity = 0;
        let calcTotalSM = 0;
        let uniqueProductCodes = new Set();
        
        // Calcola totali per unità di misura
        let quantityByUnit = {
          'PZ': 0,
          'KG': 0,
          'CT': 0,
          'L': 0,
          'GR': 0
        };
        
        order.products.forEach(product => {
          // Calcola il totale del prodotto
          let productTotal = 0;
          if (product.total) {
            productTotal = parseFloat((product.total || '0').toString().replace(',', '.'));
          }
          
          const quantity = parseFloat((product.quantity || '0').toString().replace(',', '.'));
          const sm = parseFloat((product.sm || '0').toString().replace(',', '.'));
          
          calcTotalAmount += productTotal;
          calcTotalQuantity += quantity;
          calcTotalSM += sm;
          
          // Aggiungi alle quantità per unità
          if (product.unit) {
            const unit = product.unit.toUpperCase();
            if (quantityByUnit.hasOwnProperty(unit)) {
              quantityByUnit[unit] += quantity;
            }
          }
          
          // Conta prodotti unici
          if (product.code && 
              !product.code.startsWith('PROD') && 
              !product.code.startsWith('AUTO')) {
            uniqueProductCodes.add(product.code);
          }
        });
        
        console.log('Quantità per unità di misura:', quantityByUnit);
        
        order.uniqueProductCount = uniqueProductCodes.size || order.products.length;
        console.log('Numero referenze diverse:', order.uniqueProductCount);
        
        order.quantityByUnit = quantityByUnit;
        order.totalSM = calcTotalSM.toFixed(2).replace('.', ',');
        
        // Usa i valori calcolati solo se non abbiamo estratto i totali dal PDF
        if (!order.totalAmount || order.totalAmount === '0') {
          order.totalAmount = calcTotalAmount.toFixed(2).replace('.', ',');
          console.log('Totale merce calcolato dai prodotti:', order.totalAmount);
        }
        
        if (!order.totalQuantity || order.totalQuantity === '0') {
          console.log('📊 CALCOLO AUTOMATICO: Totale quantità non trovato nel PDF, calcolo dai prodotti');
          order.totalQuantity = calcTotalQuantity.toFixed(2).replace('.', ',');
          console.log('  Totale quantità calcolato dai prodotti:', order.totalQuantity);
        }
        
        if (!order.grandTotal || order.grandTotal === '0') {
          // Se abbiamo l'IVA estratta dal PDF, calcola il totale
          if (order.ivaAmount && order.ivaAmount !== '0') {
            const imponibile = parseFloat(order.totalAmount.replace(',', '.')) || 0;
            const iva = parseFloat(order.ivaAmount.replace(',', '.')) || 0;
            const totale = imponibile + iva;
            order.grandTotal = totale.toFixed(2).replace('.', ',');
            console.log(`Totale documento calcolato: ${order.totalAmount} + ${order.ivaAmount} = ${order.grandTotal}`);
          } 
          // Altrimenti, se abbiamo l'aliquota IVA, calcoliamo
          else if (order.ivaRate) {
            const imponibile = parseFloat(order.totalAmount.replace(',', '.')) || 0;
            const aliquota = parseFloat(order.ivaRate) || 22; // Default 22% se non specificato
            const iva = imponibile * (aliquota / 100);
            const totale = imponibile + iva;
            order.ivaAmount = iva.toFixed(2).replace('.', ',');
            order.grandTotal = totale.toFixed(2).replace('.', ',');
            console.log(`Totale documento calcolato con aliquota ${aliquota}%: ${order.totalAmount} + ${order.ivaAmount} = ${order.grandTotal}`);
          }
          // Se non abbiamo né IVA né aliquota, assumiamo 22%
          else {
            const imponibile = parseFloat(order.totalAmount.replace(',', '.')) || 0;
            const iva = imponibile * 0.22; // IVA standard 22%
            const totale = imponibile + iva;
            order.ivaAmount = iva.toFixed(2).replace('.', ',');
            order.ivaRate = '22';
            order.grandTotal = totale.toFixed(2).replace('.', ',');
            console.log(`Totale documento calcolato con IVA 22% standard: ${order.totalAmount} + ${order.ivaAmount} = ${order.grandTotal}`);
          }
        }
      }
      
      console.log(`\n=== RIEPILOGO ORDINE ===`);
      console.log(`Numero: ${order.orderNumber}`);
      console.log(`Cliente: ${order.clientName}`);
      console.log(`Prodotti trovati: ${order.products.length}`);
      console.log(`Quantità totale: ${order.totalQuantity}`);
      console.log(`Totale merce (imponibile): ${order.totalAmount} €`);
      console.log(`Totale S.M.: ${order.totalSM || '0'} €`);
      console.log(`IVA ${order.ivaRate || '22'}%: ${order.ivaAmount || '0'} €`);
      console.log(`Totale documento: ${order.grandTotal} €`);
      
      return order;
      
    } catch (e) {
      console.error('Errore nel parsing:', e);
      return null;
    }
  },
  
  /**
   * Estrae l'indirizzo di consegna con 5 metodi diversi
   */
  extractDeliveryAddress: function(text) {
    console.log('🏠 Estrazione indirizzo di consegna...');
    
    // Metodo 1: Cerca dopo "Luogo di consegna"
    const regex1 = /Luogo\s*di\s*consegna\s*([\s\S]*?)(?=Riferimento|Num\.|$)/i;
    const match1 = text.match(regex1);
    
    if (match1 && match1[1]) {
      // Pulisci e formatta l'indirizzo trovato
      const addressLines = match1[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.includes('Luogo di consegna'));
      
      // Filtra righe vuote e intestazioni
      const validLines = addressLines.filter(line => 
        line && 
        !line.includes('Spett.le') &&
        !line.match(/^P\.IVA\s*\d+$/) &&
        line.length > 1 &&
        !line.includes("ALFIERI SPECIALITA") &&
        !line.includes("CORSO G. MARCONI") &&
        !line.includes("MAGLIANO ALFIERI") &&
        !line.includes("P.IVA 03247720042") &&
        !line.match(/P\.IVA\s+\d+/i) &&
        !line.match(/^[A-Z]\.$/) &&
        !line.match(/^[A-Z]{1,3}\s*$/)
      );
      
      // IMPORTANTE: Salta la prima riga se è il nome del cliente
      // La prima riga dopo "Luogo di consegna" è spesso una ripetizione del nome cliente
      let startIndex = 0;
      if (validLines.length > 0) {
        const firstLine = validLines[0];
        // Se la prima riga non contiene via/corso/piazza/p.za ed è solo testo, probabilmente è il nome
        if (!firstLine.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|PZA|P\.ZZA|STRADA|STR\.|LOC\.|LOCALITA'|FRAZ\.|FRAZIONE)\b/i)) {
          console.log(`📋 Prima riga dopo "Luogo di consegna" sembra essere il nome cliente: "${firstLine}", la salto`);
          startIndex = 1;
        }
      }
      
      // Dopo il filtro base, cerchiamo di costruire l'indirizzo completo
      let fullAddress = '';
      let foundStreet = false;
      
      for (let i = startIndex; i < validLines.length; i++) {
        const line = validLines[i];
        
        // Se la riga contiene via/corso/piazza, è l'inizio dell'indirizzo
        if (line.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|PZA|P\.ZZA|STRADA|STR\.|LOC\.|LOCALITA'|FRAZ\.|FRAZIONE)\b/i)) {
          fullAddress = line;
          foundStreet = true;
        } 
        // Se abbiamo già trovato la via e questa riga sembra una città
        else if (foundStreet && (line.match(/\d{5}/) || line.match(/\([A-Z]{2}\)/) || line.match(/\b[A-Z]{2}\b$/))) {
          fullAddress += ' - ' + line;
          break;
        }
        // Se abbiamo già trovato la via e questa potrebbe essere la città
        else if (foundStreet && line.match(/^[A-Z]/) && !line.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|PZA|P\.ZZA|STRADA|STR\.|LOC\.|LOCALITA')\b/i)) {
          // Verifica se la prossima riga contiene CAP
          const nextIndex = i + 1;
          if (nextIndex < validLines.length && validLines[nextIndex].match(/\d{5}/)) {
            fullAddress += ' - ' + line + ' ' + validLines[nextIndex];
            break;
          } else if (line.match(/\([A-Z]{2}\)/) || line.match(/\b[A-Z]{2}\b$/)) {
            // Se la riga corrente già contiene la provincia
            fullAddress += ' - ' + line;
            break;
          }
        }
      }
      
      if (fullAddress) {
        console.log('Indirizzo costruito (Metodo 1):', fullAddress);
        return fullAddress;
      }
      
      // Se non abbiamo trovato un indirizzo strutturato, prendi le righe valide escludendo la prima se sembra il nome
      if (validLines.length > startIndex) {
        const addressParts = validLines.slice(startIndex);
        // Cerca di trovare almeno la via
        for (const part of addressParts) {
          if (part.match(/\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|PZA|P\.ZZA|STRADA|STR\.|LOC\.|LOCALITA')\b/i)) {
            return addressParts.join(' - ');
          }
        }
      }
    }
    
    console.warn('⚠️ ATTENZIONE: Impossibile estrarre l\'indirizzo di consegna!');
    return '';
  },
  
  /**
   * Parsing dei prodotti dall'ordine - VERSIONE CORRETTA
   */
  parseProducts: function(text) {
    const products = [];
    const lines = text.split('\n');
    
    console.log('=== INIZIO PARSING PRODOTTI ===');
    console.log('Numero totale di righe nel PDF:', lines.length);
    
    // Pattern per codici prodotto
    const productCodePatterns = [
      /^[A-Z]{2}\d{6}$/,          // GF000011
      /^[A-Z]{1,3}\d{3,6}$/,      // PS000007, DL000028
      /^\d{5,6}[A-Z]{0,2}$/,      // 060027, 060237BA
      /^[A-Z]{2}\d{6}[A-Z]{0,4}$/, // DL200277
      /^PIRR\d{3}$/,              // PIRR002, PIRR003, PIRR004
      /^[A-Z0-9]{6,10}$/          // Pattern generico
    ];
    
    // Pattern per riga singola completa (tipo 1)
    const singleLinePattern = /^([A-Z0-9]+)\s+(.+?)\s+(PZ|KG|CT|L|GR)\s+(\d+[,\.]\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(\d+)\s+([\d,\.]+)\s*\*?\s*€.*?([\d,\.]+)\s*\*?\s*€/i;
    
    // Pattern alternativo per righe con sconto percentuale
    const lineWithDiscountPattern = /^([A-Z0-9]+)\s+(.+?)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+%)\s+(\d+[,\.]\d+)$/;
    
    // Pattern per riga dati (tipo 2)
    const dataLinePattern = /^(PZ|KG|CT|L|GR)\s+(\d+[,\.]\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(\d+)\s+([\d,\.]+)\s*\*?\s*€.*?([\d,\.]+)\s*\*?\s*€/i;
    
    // Trova l'inizio della sezione prodotti
    let startIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Articolo') && lines[i].includes('Descrizione') && lines[i].includes('Q.tà')) {
        startIndex = i + 1;
        console.log(`Inizio prodotti trovato alla riga ${startIndex}`);
        break;
      }
    }
    
    if (startIndex === -1) {
      console.log('Non trovato header prodotti, cerco prima riga con codice prodotto...');
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (productCodePatterns.some(pattern => pattern.test(trimmed))) {
          startIndex = i;
          console.log(`Prima riga con codice prodotto: ${i}`);
          break;
        }
      }
    }
    
    if (startIndex === -1) {
      console.log('⚠️ Impossibile trovare inizio prodotti');
      return products;
    }
    
    // Processa le righe
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Log specifico per la riga DL000301
      if (line.includes('DL000301')) {
        console.log('\n🌟🌟🌟 RIGA SPECIFICA DL000301 TROVATA 🌟🌟🌟');
        console.log('Riga completa:', line);
        console.log('Lunghezza riga:', line.length);
        console.log('Caratteri della riga:', JSON.stringify(line));
      }
      
      // Stop SOLO se raggiungiamo marcatori veramente finali
      // IBAN è un buon indicatore che siamo alla fine
      if (line.includes('IBAN')) {
        console.log(`Fine prodotti alla riga ${i} - Trovato IBAN (fine documento)`);
        break;
      }
      
      // TOTALE DOCUMENTO solo se seguito da fine effettiva
      if (line.includes('TOTALE DOCUMENTO') && i > lines.length - 30) {
        console.log(`Fine prodotti alla riga ${i} - TOTALE DOCUMENTO nelle ultime righe`);
        break;
      }
      
      // Non fermarsi a "Totale IVA" o "IVA" perché può apparire a metà documento
      
      // Se troviamo un totale parziale di pagina, lo logghiamo ma continuiamo
      if (line.match(/Totale\s+(q\.tà|merce|quantità)/i)) {
        console.log(`⚠️ Trovato totale parziale alla riga ${i}, ma continuo la ricerca prodotti`);
        // Mostra le prossime 5 righe per debug
        console.log(`   Prossime 5 righe dopo il totale parziale:`);
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          console.log(`   Riga ${j}: ${lines[j].trim()}`);
        }
        // Non fare break, continua a cercare prodotti
      }
      
      // Salta righe vuote
      if (!line || line.length < 3) continue;
      
      
      // Prova con pattern riga singola (tipo 1)
      const singleMatch = line.match(singleLinePattern);
      if (singleMatch) {
        const product = {
          code: singleMatch[1],
          description: singleMatch[2].trim(),
          unit: singleMatch[3].toUpperCase(),
          quantity: singleMatch[4],
          deliveryDate: singleMatch[5],
          sm: singleMatch[6],
          discount: '0', // Verrà estratto separatamente se presente
          price: singleMatch[8],
          total: singleMatch[9]
        };
        
        // Cerca sconto percentuale nella stessa riga
        const discountMatch = line.match(/(\d+)\s*%/);
        if (discountMatch) {
          product.discount = discountMatch[1];
        }
        
        products.push(product);
        console.log(`✅ Prodotto tipo 1 aggiunto:`, product.code);
        continue;
      }
      
      // Prova con pattern senza unità di misura (tipo 1b)
      // Es: DL000301    TORC ETTI "GOLOSI" SAC C HETTO 400 G    480,00    2,30    80,00    0,00%    1024,00
      console.log('\n🔍 PARSING RIGA SENZA UDM:', line);
      
      // Pattern migliorato che gestisce meglio gli spazi e la percentuale
      const singleNoUnitPattern = /^([A-Z0-9]+)\s+(.+?)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+%)\s+(\d+[,\.]\d+)$/;
      
      // Se non matcha, prova senza il simbolo % nel pattern
      let singleNoUnitMatch = line.match(singleNoUnitPattern);
      if (!singleNoUnitMatch) {
        const alternativePattern = /^([A-Z0-9]+)\s+(.+?)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+)$/;
        singleNoUnitMatch = line.match(alternativePattern);
        if (singleNoUnitMatch) {
          console.log('✅ MATCH con pattern alternativo (senza %)!');
        }
      }
      
      if (singleNoUnitMatch) {
        console.log('✅ MATCH TROVATO!');
        console.log('  Gruppi catturati:');
        console.log('  [1] Codice:', singleNoUnitMatch[1]);
        console.log('  [2] Descrizione:', singleNoUnitMatch[2]);
        console.log('  [3] Quantità:', singleNoUnitMatch[3]);
        console.log('  [4] Prezzo:', singleNoUnitMatch[4]);
        console.log('  [5] S.M.:', singleNoUnitMatch[5]);
        console.log('  [6] Sconto%:', singleNoUnitMatch[6]);
        console.log('  [7] Totale:', singleNoUnitMatch[7]);
      } else {
        console.log('❌ Nessun match per pattern senza UdM');
      }
      if (singleNoUnitMatch) {
        const product = {
          code: singleNoUnitMatch[1],
          description: singleNoUnitMatch[2].trim(),
          unit: 'PZ', // Default quando manca l'unità
          quantity: singleNoUnitMatch[3],
          deliveryDate: '', // Non presente in questo formato
          sm: singleNoUnitMatch[5],
          discount: '0',
          price: singleNoUnitMatch[4],
          total: singleNoUnitMatch[7]
        };
        
        console.log('📦 PRODOTTO CREATO:');
        console.log('  Codice:', product.code);
        console.log('  Descrizione:', product.description);
        console.log('  Quantità:', product.quantity);
        console.log('  Prezzo:', product.price);
        console.log('  S.M.:', product.sm);
        console.log('  Totale:', product.total);
        
        // Estrai sconto percentuale se presente
        const discountValue = singleNoUnitMatch[6];
        if (discountValue && discountValue.includes('%')) {
          product.discount = discountValue.replace('%', '');
        }
        
        // Log specifico per DL000301
        if (product.code === 'DL000301') {
          console.log('\n🚨 ATTENZIONE: Prodotto DL000301 processato!');
          console.log('  Valori estratti dal regex:');
          console.log('  Match completo:', singleNoUnitMatch[0]);
          console.log('  [1] Codice:', singleNoUnitMatch[1]);
          console.log('  [2] Descrizione:', singleNoUnitMatch[2]);
          console.log('  [3] Quantità:', singleNoUnitMatch[3]);
          console.log('  [4] Prezzo:', singleNoUnitMatch[4]);
          console.log('  [5] S.M.:', singleNoUnitMatch[5]);
          console.log('  [6] Sconto:', singleNoUnitMatch[6]);
          console.log('  [7] Totale:', singleNoUnitMatch[7]);
          console.log('\n  Prodotto finale:');
          console.log('  ', JSON.stringify(product, null, 2));
        }
        
        // Verifica calcolo totale
        const qty = parseFloat(product.quantity.replace(',', '.'));
        const price = parseFloat(product.price.replace(',', '.'));
        const totalCalcolato = qty * price;
        const totalEstratto = parseFloat(product.total.replace(',', '.'));
        
        console.log('🧮 VERIFICA CALCOLO:');
        console.log(`  ${qty} * ${price} = ${totalCalcolato}`);
        console.log(`  Totale estratto: ${totalEstratto}`);
        console.log(`  Differenza: ${Math.abs(totalCalcolato - totalEstratto)}`);
        
        if (Math.abs(totalCalcolato - totalEstratto) > 0.01) {
          console.log('⚠️ ATTENZIONE: Il totale estratto non corrisponde al calcolo!');
          console.log('  Possibile errore nel parsing o nel PDF originale');
        }
        
        products.push(product);
        console.log(`✅ Prodotto tipo 1b (senza UdM) aggiunto:`, product.code);
        console.log(`  Quantità: ${product.quantity}, Prezzo: ${product.price}, S.M.: ${product.sm}, Totale: ${product.total}`);
        continue;
      }
      
      // Verifica se è un codice prodotto isolato (tipo 2)
      const isProductCode = productCodePatterns.some(pattern => pattern.test(line));
      if (isProductCode) {
        console.log(`Codice prodotto isolato trovato: ${line}`);
        
        const product = {
          code: line,
          description: '',
          unit: 'PZ',
          quantity: '0',
          deliveryDate: '',
          sm: '0',
          discount: '0',
          price: '0',
          total: '0'
        };
        
        // Cerca descrizione nelle righe successive
        let j = i + 1;
        while (j < lines.length && j < i + 4) {
          const nextLine = lines[j].trim();
          
          // Se è una riga con solo testo (descrizione)
          if (nextLine && !nextLine.match(/^\d/) && !nextLine.includes('€') && 
              !nextLine.match(/^\d+\s*(PZ|KG|CT|L|GR)/i) &&
              !nextLine.match(/^(PZ|KG|CT|L|GR)\s+\d+/i)) {
            // Ma non se è info confezionamento
            if (!nextLine.match(/^\d+\s+[A-Z]+\s+X\s+[A-Z]+$/i)) {
              product.description = nextLine;
              console.log(`  Descrizione: ${product.description}`);
              j++;
            } else {
              j++;
              continue;
            }
          } else {
            break;
          }
        }
        
        // Cerca riga dati
        for (let k = j; k < lines.length && k < i + 6; k++) {
          const dataLine = lines[k].trim();
          const dataMatch = dataLine.match(dataLinePattern);
          
          if (dataMatch) {
            product.unit = dataMatch[1].toUpperCase();
            product.quantity = dataMatch[2];
            product.deliveryDate = dataMatch[3];
            product.sm = dataMatch[4];
            product.price = dataMatch[6];
            product.total = dataMatch[7];
            
            // Cerca sconto percentuale
            const discountMatch = dataLine.match(/(\d+)\s*%/);
            if (discountMatch) {
              product.discount = discountMatch[1];
            }
            
            console.log(`  Dati trovati: Qt=${product.quantity} ${product.unit}, Prezzo=${product.price}, Tot=${product.total}`);
            
            products.push(product);
            console.log(`✅ Prodotto tipo 2 aggiunto:`, product.code);
            
            i = k; // Salta alle righe già processate
            break;
          }
        }
      }
    }
    
    console.log(`=== FINE PARSING PRODOTTI ===`);
    console.log(`Totale prodotti trovati: ${products.length}`);
    
    // Debug dettagliato
    if (products.length > 0) {
      console.log('\nPRIMI 5 PRODOTTI:');
      products.slice(0, 5).forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.code} - ${p.description || 'N/A'} - Qt: ${p.quantity} ${p.unit} - S.M.: ${p.sm} - Tot: ${p.total}`);
      });
    } else {
      console.log('⚠️ NESSUN PRODOTTO TROVATO!');
    }
    
    return products;
  },
  
  /**
   * Genera ID univoco
   */
  generateUniqueId: function() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },
  
  /**
   * Converte prezzo in numero
   */
  parsePrice: function(price) {
    if (!price) return 0;
    return parseFloat(price.toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
  }
};