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
    
    // Prende solo la parte prima della virgola se presente
    cleaned = cleaned.split(',')[0].trim();
    console.log('[cleanClientName] Output finale:', cleaned);
    
    return cleaned;
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
      
      // Nome cliente
      console.log('=== DEBUG ESTRAZIONE NOME CLIENTE ===');
      
      const spettIndex = text.indexOf('Spett.le');
      if (spettIndex !== -1) {
        const context = text.substring(spettIndex, spettIndex + 200);
        console.log('Contesto Spett.le:', context);
      }
      
      let clientNameMatch = text.match(/Spett\.le\s+([\s\S]*?)(?=\n\s*VIA|Luogo\s*di\s*consegna|P\.IVA|$)/i);
      if (clientNameMatch) {
        console.log('Match grezzo del cliente:', clientNameMatch[1]);
        
        let clientNameLines = clientNameMatch[1].split('\n');
        let clientName = clientNameLines[0]
          .replace(/\s+/g, ' ')
          .trim();
          
        console.log('Nome cliente dopo pulizia:', clientName);
        
        if (clientName.endsWith('&') || clientName.match(/\w+\s+&\s*$/)) {
          console.log('Nome cliente sembra incompleto, cerco il resto...');
          
          const fullNameMatch = text.match(/Spett\.le\s+([\s\S]*?)(?=\s+VIA\s|Luogo\s*di\s*consegna)/i);
          if (fullNameMatch) {
            const fullName = fullNameMatch[1]
              .replace(/\n/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            console.log('Nome completo trovato:', fullName);
            clientName = fullName;
          }
        }
        
        order.clientName = this.cleanClientName(clientName);
        console.log('Cliente finale (pulito):', order.clientName);
      }
      
      // P.IVA
      const vatMatch = text.match(/P\.\s*IVA[:s]*([w\s]+?)(?:\n|$)/i);
      if (vatMatch) {
        order.vatNumber = vatMatch[1].trim();
        console.log('P.IVA trovata:', order.vatNumber);
      }
      
      // Data consegna
      const deliveryDateMatch = text.match(/Consegna\s+S\.M\.*?\n.*?(\d{2}\/\d{2}\/\d{4})/s);
      if (deliveryDateMatch) {
        order.deliveryDate = deliveryDateMatch[1];
        console.log('Data consegna trovata:', order.deliveryDate);
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
          order.grandTotal = order.totalAmount;
        }
      }
      
      console.log(`\n=== RIEPILOGO ORDINE ===`);
      console.log(`Numero: ${order.orderNumber}`);
      console.log(`Cliente: ${order.clientName}`);
      console.log(`Prodotti trovati: ${order.products.length}`);
      console.log(`Quantità totale: ${order.totalQuantity}`);
      console.log(`Totale merce: ${order.totalAmount} €`);
      console.log(`Totale S.M.: ${order.totalSM || '0'} €`);
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
      
      // Dopo il filtro base, cerchiamo di costruire l'indirizzo completo
      let fullAddress = '';
      let foundStreet = false;
      
      for (let i = 0; i < validLines.length; i++) {
        const line = validLines[i];
        
        // Se la riga contiene via/corso/piazza, è l'inizio dell'indirizzo
        if (line.match(/\b(VIA|CORSO|PIAZZA|STRADA|VIALE|V\.LE|LOC\.|LOCALITA')\b/i)) {
          fullAddress = line;
          foundStreet = true;
        } 
        // Se abbiamo già trovato la via e questa riga sembra una città
        else if (foundStreet && (line.match(/\d{5}/) || line.match(/\([A-Z]{2}\)/) || line.match(/\b[A-Z]{2}\b$/))) {
          fullAddress += ' - ' + line;
          break;
        }
        // Se abbiamo già trovato la via e questa potrebbe essere la città
        else if (foundStreet && i === validLines.indexOf(line) && line.match(/^[A-Z]/) && !line.match(/\b(VIA|CORSO|PIAZZA|STRADA|VIALE|V\.LE|LOC\.|LOCALITA')\b/i)) {
          const nextIndex = validLines.indexOf(line) + 1;
          if (nextIndex < validLines.length && validLines[nextIndex].match(/\d{5}/)) {
            fullAddress += ' - ' + line + ' ' + validLines[nextIndex];
            break;
          } else {
            fullAddress += ' - ' + line;
          }
        }
      }
      
      if (fullAddress) {
        console.log('Indirizzo costruito (Metodo 1):', fullAddress);
        return fullAddress;
      }
      
      if (validLines.length > 0) {
        const maxLines = Math.min(3, validLines.length);
        return validLines.slice(0, maxLines).join(' ');
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
      /^[A-Z0-9]{6,10}$/          // Pattern generico
    ];
    
    // Pattern per riga singola completa (tipo 1)
    const singleLinePattern = /^([A-Z0-9]+)\s+(.+?)\s+(PZ|KG|CT|L|GR)\s+(\d+[,\.]\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(\d+)\s+([\d,\.]+)\s*\*?\s*€.*?([\d,\.]+)\s*\*?\s*€/i;
    
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
      
      // Stop se raggiungiamo i totali
      if (line.match(/Totale\s+(q\.tà|merce|quantità)/i) || 
          line.includes('TOTALE DOCUMENTO') || 
          line.includes('IBAN') ||
          line.includes('Totale IVA')) {
        console.log(`Fine prodotti alla riga ${i}`);
        break;
      }
      
      // Salta righe vuote
      if (!line || line.length < 3) continue;
      
      // Prova prima con pattern riga singola (tipo 1)
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