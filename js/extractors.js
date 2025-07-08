/**
 * Extractors per DDT e Fatture
 * Classi specializzate per l'estrazione dati da diversi tipi di documenti PDF
 */

// Funzione helper per convertire date
function convertDateFormat(dateStr) {
  if (!dateStr) return '';
  
  // Se la data è già nel formato corretto (gg/mm/aaaa), ritornala
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return dateStr;
  }
  
  // Converti da gg/mm/aa a gg/mm/aaaa
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (match) {
    const year = parseInt(match[3]);
    const fullYear = year > 50 ? '19' + match[3] : '20' + match[3];
    return `${match[1]}/${match[2]}/${fullYear}`;
  }
  
  return dateStr;
}

/**
 * DDTExtractor - Estrattore specializzato per DDT
 */
class DDTExtractor {
  constructor(text, debugElement, fileName) {
    this.text = text;
    this.debugElement = debugElement;
    this.fileName = fileName;
    this._cache = {};
    this.log('🚀 DDTExtractor inizializzato - VERSIONE 2.0 AGGIORNATA');
    this.log(`📁 Nome file ricevuto: "${fileName}"`);
    this.log(`📝 Lunghezza testo: ${text.length} caratteri`);
  }

  log(message) {
    console.log(`[DDTExtractor] ${message}`);
    if (this.debugElement) {
      this.debugElement.textContent += `[DDT] ${message}\n`;
    }
  }

  extract() {
    this.log('📄 Inizio estrazione DDT');
    
    const result = {
      id: this.generateId(),
      fileName: this.fileName,
      importDate: new Date().toISOString(),
      documentNumber: this.extractDocumentNumber(),
      date: this.extractDate(),
      deliveryDate: this.extractDeliveryDate(),
      clientName: this.extractClientName(),
      clientCode: this.extractClientCode(),
      vatNumber: this.extractVatNumber(),
      deliveryAddress: this.extractDeliveryAddress(),
      orderReference: this.extractOrderReference(),
      items: this.extractItems(),
      subtotal: 0,
      vat: 0,
      total: 0
    };

    // Calcola totali
    if (result.items.length > 0) {
      result.subtotal = result.items.reduce((sum, item) => {
        return sum + (parseFloat(item.total) || 0);
      }, 0);
      
      // Assumiamo IVA al 22% se non specificata
      result.vat = result.subtotal * 0.22;
      result.total = result.subtotal + result.vat;
    }

    this.log(`✅ Estrazione DDT completata: ${result.items.length} articoli`);
    return result;
  }

  generateId() {
    return 'DDT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  extractDocumentNumber() {
    // Prima prova a estrarre dal nome file che è più affidabile
    this.log(`🔍 Tentativo estrazione numero DDT. Nome file: "${this.fileName}"`);
    if (this.fileName) {
      // Prova diversi pattern per il nome file
      const filePatterns = [
        /DDV[_\s]+(\d{6})/i,           // DDV_703723 o DDV 703723
        /DDT[_\s]+(\d{6})/i,           // DDT_703723 o DDT 703723
        /[_\s](\d{6})(?:\.pdf)?$/i,   // _703723.pdf o 703723.pdf alla fine
        /(\d{6})[_\s]+DDV/i,           // 703723_DDV
        /(\d{6})[_\s]+DDT/i            // 703723_DDT
      ];
      
      for (const pattern of filePatterns) {
        const fileMatch = this.fileName.match(pattern);
        if (fileMatch) {
          this.log(`📄 Numero DDT estratto dal nome file: ${fileMatch[1]} (pattern: ${pattern})`);
          return fileMatch[1];
        }
      }
      this.log(`⚠️ Nome file non corrisponde a nessun pattern conosciuto`);
    } else {
      this.log(`⚠️ Nome file non disponibile`);
    }
    
    const patterns = [
      /DDT\s+(\d+)\s+\d{2}\/\d{2}\/\d{2}/i,
      /D\.D\.T\.\s+(\d+)/i,
      /DOCUMENTO\s+DI\s+TRASPORTO\s*N[°.]?\s*(\d+)/i,
      /(\d{4,6})\s+\d{2}\/\d{2}\/\d{2,4}/,
      // Nuovo pattern per formato "Numero 703723 Del 06/12/2025"
      /Numero\s+(\d{6})\s+Del\s+\d{2}\/\d{2}\/\d{4}/i,
      // Pattern per DDV_numero
      /DDV[_\s]+(\d{6})/i,
      // Pattern generico per numero a 6 cifre dopo "Numero"
      /Numero\s+(\d{6})/i,
      // Pattern per numero su riga con tabs
      /Numero\t+(\d{6})/i,
      // Pattern per trovare numero a 6 cifre isolato
      /(?:^|\s)(\d{6})(?:\s+\d{1,2}\/\d{1,2}\/\d{2,4})/m
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = this.text.match(pattern);
      if (match) {
        this.log(`📄 Numero DDT trovato: ${match[1]} (pattern ${i + 1}: ${pattern})`);
        return match[1];
      }
    }
    
    this.log('❌ Numero DDT non trovato con pattern specifici');
    
    // Debug: mostra i primi numeri a 6 cifre nel testo
    const allSixDigits = this.text.match(/\b\d{6}\b/g);
    if (allSixDigits && allSixDigits.length > 0) {
      this.log(`🔢 Numeri a 6 cifre trovati nel testo: ${allSixDigits.slice(0, 5).join(', ')}${allSixDigits.length > 5 ? '...' : ''}`);
    }
    
    return '';
  }

  extractDate() {
    const patterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /DATA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /DEL[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    ];

    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        const date = convertDateFormat(match[1]);
        this.log(`📅 Data trovata: ${date}`);
        return date;
      }
    }
    
    return '';
  }

  extractDeliveryDate() {
    this.log('📅 Estrazione data di consegna DDT');
    
    const patterns = [
      /DATA\s+(?:DI\s+)?CONSEGNA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /CONSEGNA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /DELIVERY\s+DATE[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /DATA\s+CONSEGNA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /CONSEGNA\s+(?:IL\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    ];

    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        const date = convertDateFormat(match[1]);
        this.log(`📅 Data consegna trovata: ${date}`);
        return date;
      }
    }
    
    this.log('⚠️ Data di consegna non trovata nel documento');
    return '';
  }

  extractClientName() {
    this.log('👤 Estrazione nome cliente DDT con logica multi-riga');
    
    // Usa la stessa logica avanzata che abbiamo implementato
    const spettMatch = this.text.match(/Spett(?:\.le|abile)\s*/i);
    if (spettMatch) {
      const startIndex = spettMatch.index + spettMatch[0].length;
      const contextText = this.text.substring(startIndex);
      const lines = contextText.split('\n');
      const clientLines = [];
      
      const isStopLine = (line) => {
        const patterns = [
          /^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZZA)/i,
          /^P\.?\s*IVA/i,
          /^\d{5}\s+/i
        ];
        return patterns.some(p => p.test(line));
      };
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (clientLines.length === 0 && !line) continue;
        if (isStopLine(line)) break;
        
        let processedLine = line;
        
        // Gestisci "Luogo di consegna"
        if (line.match(/^Luogo\s*di\s*consegna:/i)) {
          processedLine = line.replace(/^Luogo\s*di\s*consegna:\s*/i, '').trim();
        } else if (line.match(/^Luogo\s*:/i)) {
          processedLine = line.replace(/^Luogo\s*:\s*/i, '').trim();
        } else if (line.match(/^Luogo\s+/i) && !line.match(/^Luogo\s+[a-z]/i)) {
          processedLine = line.replace(/^Luogo\s+/i, '').trim();
        }
        
        if (processedLine && !processedLine.match(/^Luogo$/i)) {
          clientLines.push(processedLine);
          
          const shouldContinue = processedLine.endsWith('&') || 
                                processedLine.endsWith('FRUTTA') ||
                                processedLine.endsWith('E') ||
                                (i + 1 < lines.length && 
                                 lines[i + 1].trim() && 
                                 !isStopLine(lines[i + 1].trim()) &&
                                 !processedLine.match(/(S\.R\.L\.|SRL|S\.P\.A\.|SPA|SNC|SAS)\s*$/i));
          
          if (!shouldContinue) break;
        }
      }
      
      const fullName = clientLines.join(' ').replace(/\s+/g, ' ').trim();
      if (fullName && !fullName.match(/^Luogo$/i)) {
        this.log(`✅ Cliente trovato: ${fullName}`);
        return fullName;
      }
    }
    
    // Fallback patterns
    const patterns = [
      /DESTINATARIO[:\s]+([^\n]+)/i,
      /CLIENTE[:\s]+([^\n]+)/i,
      /RAGIONE\s+SOCIALE[:\s]+([^\n]+)/i,
      // Nuovo pattern per "Cliente" seguito da contenuto sulla riga successiva
      /Cliente\s*\n\s*([^\n]+)/i,
      // Pattern per catturare il cliente dopo righe con coordinate
      /Cliente.*?\n([A-Z][^\n]+)/,
      // Pattern per cliente dopo "Luogo di consegna" sulla stessa riga
      /Cliente\s+Luogo di consegna\s*\n([^\n]+)/i,
      // Pattern per estrarre solo il nome della società
      /\d{5}\s+([A-Z\s\.\&]+(?:S\.R\.L\.|SRL|S\.P\.A\.|SPA|SNC|SAS))/
    ];
    
    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match && match[1] && !match[1].match(/^Luogo$/i)) {
        // Pulisci il nome del cliente
        let clientName = match[1].trim();
        // Rimuovi codici numerici all'inizio
        clientName = clientName.replace(/^\d+\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d+\s+\d+\s+/, '');
        // Rimuovi codici cliente dal nome
        clientName = clientName.replace(/^\d{5}\s+/, '');
        
        this.log(`✅ Cliente trovato con pattern fallback: ${clientName}`);
        return clientName;
      }
    }
    
    this.log('❌ Nome cliente non trovato con nessun pattern');
    return '';
  }

  extractClientCode() {
    const patterns = [
      /COD(?:ICE)?\s*CLIENTE[:\s]*(\d+)/i,
      /CLIENTE\s*N[°.]?\s*(\d+)/i,
      /(\d{4,5})\s+\d{2}\/\d{2}\/\d{2}\s+\d+\s+(\d{4,5})/
    ];
    
    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        const code = match[2] || match[1];
        this.log(`🔢 Codice cliente: ${code}`);
        return code;
      }
    }
    
    return '';
  }

  extractVatNumber() {
    // Prima escludi la P.IVA del fornitore (03247720042)
    const supplierVat = '03247720042';
    
    const patterns = [
      /P(?:ARTITA)?\.?\s*IVA[:\s]*(\d{11})/gi,
      /P\.IVA[:\s]*(\d{11})/gi,
      /PIVA[:\s]*(\d{11})/gi,
      // Pattern per P.IVA dopo C.F.
      /C\.F\.\s*(\d{11})/gi,
      // Pattern per P.IVA E C.F. insieme
      /P\.IVA\s+E\s+C\.F\.\s*(\d{11})/gi
    ];
    
    for (const pattern of patterns) {
      const matches = this.text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1] !== supplierVat) {
          this.log(`🧾 P.IVA cliente trovata: ${match[1]}`);
          return match[1];
        }
      }
    }
    
    this.log('❌ P.IVA cliente non trovata');
    return '';
  }

  extractDeliveryAddress() {
    const patterns = [
      /DESTINAZIONE[:\s]+([^\n]+)/i,
      /CONSEGNA[:\s]+([^\n]+)/i,
      /LUOGO\s+DI\s+CONSEGNA[:\s]+([^\n]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return '';
  }

  extractOrderReference() {
    const patterns = [
      /RIF(?:ERIMENTO)?\s*\.\s*ORDINE[:\s]+(\S+)/i,
      /ORDINE\s+N[°.]?\s*(\S+)/i,
      /VS\s*\.\s*ORDINE[:\s]+(\S+)/i
    ];
    
    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return '';
  }

  extractItems() {
    const items = [];
    const lines = this.text.split('\n');
    
    // Pattern per identificare righe di prodotto
    const productPattern = /^(\d{6}|[A-Z]{2}\d{6})\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)/;
    
    for (const line of lines) {
      const match = line.match(productPattern);
      if (match) {
        items.push({
          code: match[1],
          description: match[2].trim(),
          quantity: match[3].replace(',', '.'),
          price: match[4].replace(',', '.'),
          total: match[5].replace(',', '.')
        });
      }
    }
    
    this.log(`📦 Trovati ${items.length} articoli`);
    return items;
  }
}

/**
 * FatturaExtractor - Estrattore specializzato per Fatture
 */
class FatturaExtractor {
  constructor(text, debugElement, fileName) {
    this.text = text;
    this.debugElement = debugElement;
    this.fileName = fileName;
    this.log('🚀 FatturaExtractor inizializzato');
  }

  log(message) {
    console.log(`[FatturaExtractor] ${message}`);
    if (this.debugElement) {
      this.debugElement.textContent += `[FT] ${message}\n`;
    }
  }

  extract() {
    this.log('📄 Inizio estrazione Fattura');
    
    const result = {
      id: this.generateId(),
      fileName: this.fileName,
      importDate: new Date().toISOString(),
      documentNumber: this.extractDocumentNumber(),
      date: this.extractDate(),
      deliveryDate: this.extractDeliveryDate(),
      clientName: this.extractClientName(),
      clientCode: this.extractClientCode(),
      vatNumber: this.extractVatNumber(),
      deliveryAddress: this.extractDeliveryAddress(),
      orderReference: this.extractOrderReference(),
      items: this.extractItems(),
      subtotal: 0,
      vat: 0,
      total: 0
    };

    // Estrai totali dal documento
    const totals = this.extractTotals();
    result.subtotal = totals.subtotal;
    result.vat = totals.vat;
    result.total = totals.total;

    this.log(`✅ Estrazione Fattura completata: ${result.items.length} articoli`);
    return result;
  }

  generateId() {
    return 'FT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  extractDocumentNumber() {
    const patterns = [
      /FATTURA\s*N[°.]?\s*(\d+)/i,
      /FT\s+(\d+)/i,
      /INVOICE\s*N[°.]?\s*(\d+)/i,
      /N[°.]\s*(\d+)\s*del/i
    ];
    
    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        this.log(`📄 Numero Fattura trovato: ${match[1]}`);
        return match[1];
      }
    }
    
    return '';
  }

  extractDate() {
    const patterns = [
      /del\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /DATA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
    ];

    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        const date = convertDateFormat(match[1]);
        this.log(`📅 Data trovata: ${date}`);
        return date;
      }
    }
    
    return '';
  }

  extractDeliveryDate() {
    this.log('📅 Estrazione data di consegna Fattura');
    
    const patterns = [
      /DATA\s+(?:DI\s+)?CONSEGNA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /CONSEGNA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /DELIVERY\s+DATE[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /DATA\s+CONSEGNA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /CONSEGNA\s+(?:IL\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    ];

    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        const date = convertDateFormat(match[1]);
        this.log(`📅 Data consegna trovata: ${date}`);
        return date;
      }
    }
    
    this.log('⚠️ Data di consegna non trovata nel documento');
    return '';
  }

  extractClientName() {
    this.log('👤 Estrazione nome cliente Fattura con logica multi-riga');
    
    // Usa la stessa logica implementata per DDT
    const spettMatch = this.text.match(/Spett(?:\.le|abile)\s*/i);
    if (spettMatch) {
      const startIndex = spettMatch.index + spettMatch[0].length;
      const contextText = this.text.substring(startIndex);
      const lines = contextText.split('\n');
      const clientLines = [];
      
      const isStopLine = (line) => {
        const patterns = [
          /^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZZA)/i,
          /^P\.?\s*IVA/i,
          /^\d{5}\s+/i
        ];
        return patterns.some(p => p.test(line));
      };
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (clientLines.length === 0 && !line) continue;
        if (isStopLine(line)) break;
        
        let processedLine = line;
        
        // Gestisci "Luogo di consegna"
        if (line.match(/^Luogo\s*di\s*consegna:/i)) {
          processedLine = line.replace(/^Luogo\s*di\s*consegna:\s*/i, '').trim();
        } else if (line.match(/^Luogo\s*:/i)) {
          processedLine = line.replace(/^Luogo\s*:\s*/i, '').trim();
        } else if (line.match(/^Luogo\s+/i) && !line.match(/^Luogo\s+[a-z]/i)) {
          processedLine = line.replace(/^Luogo\s+/i, '').trim();
        }
        
        if (processedLine && !processedLine.match(/^Luogo$/i)) {
          clientLines.push(processedLine);
          
          const shouldContinue = processedLine.endsWith('&') || 
                                processedLine.endsWith('FRUTTA') ||
                                processedLine.endsWith('E') ||
                                (i + 1 < lines.length && 
                                 lines[i + 1].trim() && 
                                 !isStopLine(lines[i + 1].trim()) &&
                                 !processedLine.match(/(S\.R\.L\.|SRL|S\.P\.A\.|SPA|SNC|SAS)\s*$/i));
          
          if (!shouldContinue) break;
        }
      }
      
      const fullName = clientLines.join(' ').replace(/\s+/g, ' ').trim();
      if (fullName && !fullName.match(/^Luogo$/i)) {
        this.log(`✅ Cliente trovato: ${fullName}`);
        return fullName;
      }
    }
    
    // Altri pattern
    const patterns = [
      /INTESTATARIO[:\s]+([^\n]+)/i,
      /CLIENTE[:\s]+([^\n]+)/i,
      /RAGIONE\s+SOCIALE[:\s]+([^\n]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match && !match[1].match(/^Luogo$/i)) {
        return match[1].trim();
      }
    }
    
    return '';
  }

  extractClientCode() {
    const patterns = [
      /COD(?:ICE)?\s*CLIENTE[:\s]*(\d+)/i,
      /CLIENTE\s*N[°.]?\s*(\d+)/i,
      /Cod\.\s*Cli\.\s*(\d{4,5})/i
    ];
    
    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        this.log(`🔢 Codice cliente: ${match[1]}`);
        return match[1];
      }
    }
    
    return '';
  }

  extractVatNumber() {
    const match = this.text.match(/P(?:ARTITA)?\.?\s*IVA[:\s]*(\d{11})/i);
    return match ? match[1] : '';
  }

  extractDeliveryAddress() {
    const patterns = [
      /DESTINAZIONE[:\s]+([^\n]+)/i,
      /CONSEGNA[:\s]+([^\n]+)/i,
      /INDIRIZZO\s+SPEDIZIONE[:\s]+([^\n]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return '';
  }

  extractOrderReference() {
    const patterns = [
      /RIF(?:ERIMENTO)?\s*ORDINE[:\s]+(\S+)/i,
      /NS\s*ORDINE[:\s]+(\S+)/i,
      /VS\s*ORDINE[:\s]+(\S+)/i
    ];
    
    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return '';
  }

  extractItems() {
    const items = [];
    const lines = this.text.split('\n');
    
    // Pattern per righe prodotto in fattura
    const patterns = [
      /^(\d{6}|[A-Z]{2}\d{6})\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)/,
      /^([A-Z0-9]+)\s+(.+?)\s+(\d+)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)/
    ];
    
    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          items.push({
            code: match[1],
            description: match[2].trim(),
            quantity: match[3].replace(',', '.'),
            price: match[4].replace(',', '.'),
            total: match[5].replace(',', '.')
          });
          break;
        }
      }
    }
    
    this.log(`📦 Trovati ${items.length} articoli`);
    return items;
  }

  extractTotals() {
    let subtotal = 0;
    let vat = 0;
    let total = 0;

    // Estrai imponibile
    const subtotalMatch = this.text.match(/IMPONIBILE[:\s]*(?:€\s*)?(\d+(?:[.,]\d+)?)/i) ||
                         this.text.match(/TOTALE\s+MERCE[:\s]*(?:€\s*)?(\d+(?:[.,]\d+)?)/i);
    if (subtotalMatch) {
      subtotal = parseFloat(subtotalMatch[1].replace(',', '.'));
    }

    // Estrai IVA
    const vatMatch = this.text.match(/IVA\s+\d+%[:\s]*(?:€\s*)?(\d+(?:[.,]\d+)?)/i) ||
                    this.text.match(/TOTALE\s+IVA[:\s]*(?:€\s*)?(\d+(?:[.,]\d+)?)/i);
    if (vatMatch) {
      vat = parseFloat(vatMatch[1].replace(',', '.'));
    }

    // Estrai totale
    const totalMatch = this.text.match(/TOTALE\s+DOCUMENTO[:\s]*(?:€\s*)?(\d+(?:[.,]\d+)?)/i) ||
                      this.text.match(/TOTALE\s+FATTURA[:\s]*(?:€\s*)?(\d+(?:[.,]\d+)?)/i) ||
                      this.text.match(/TOTALE[:\s]*(?:€\s*)?(\d+(?:[.,]\d+)?)/i);
    if (totalMatch) {
      total = parseFloat(totalMatch[1].replace(',', '.'));
    }

    // Se manca qualcosa, calcola
    if (!total && subtotal) {
      if (!vat) {
        vat = subtotal * 0.22; // IVA 22% default
      }
      total = subtotal + vat;
    }

    this.log(`💰 Totali: Imponibile €${subtotal}, IVA €${vat}, Totale €${total}`);
    
    return { subtotal, vat, total };
  }
}

// Esporta le classi per l'uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DDTExtractor, FatturaExtractor };
}

// Esporta anche nel browser
if (typeof window !== 'undefined') {
  window.DDTExtractor = DDTExtractor;
  window.FatturaExtractor = FatturaExtractor;
}