class DDTExtractor {
  constructor(text, debugElement, fileName) {
    this.text = text;
    this.debug = debugElement;
    this.fileName = fileName;
    this.lines = text.split('\n');
    this.articleCodes = [
      '070017', '070056', '070057', '200000', '200016', '200523', 
      '200527', '200553', '200575', '200576', 'DL000301', 'PS000034', 
      'PS000077', 'PS000386', 'VS000012', 'VS000169', 'VS000198', 
      'VS000425', 'VS000881', 'VS000891', 'PIRR002', 'PIRR003', 'PIRR004'
    ];
    // Cache per evitare chiamate ripetute
    this._cache = {};
  }

  log(message) {
    if (this.debug) {
      this.debug.textContent += `[DDT Extractor] ${message}\n`;
    }
    console.log(`[DDT Extractor] ${message}`);
  }

  cleanNumber(value) {
    if (!value || value === '' || value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    const cleanValue = value.toString().replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleanValue);
    if (isNaN(num)) {
      return 0;
    }
    return num;
  }

  extract() {
    this.log('🔄 Inizio estrazione DDT');
    this.log(`📄 Testo lunghezza: ${this.text.length} caratteri`);
    this.log('🆕 USANDO DDTEXTRACTOR IN ddtft-import.js');
    
    // Log primi 500 caratteri del testo per debug
    this.log('📝 Primi 500 caratteri del testo:');
    this.log(this.text.substring(0, 500));
    
    // Estrai tutti i dati PRIMA di costruire l'oggetto result
    const documentNumber = this.extractDocumentNumber();
    const date = this.extractDate();
    const clientCode = this.extractClientCode();
    const client = this.extractClient();
    const vatNumber = this.extractVatNumber();
    const fiscalCode = this.extractFiscalCode();
    const orderReference = this.extractOrderReference();
    const deliveryAddress = this.extractDeliveryAddress();
    const deliveryDate = this.extractDeliveryDate();
    const items = this.extractArticles();
    const documentTotal = this.extractDocumentTotal();
    
    // Calcola imponibile e IVA dai prodotti estratti
    const totals = this.calculateTotals(items);
    
    // Se abbiamo un totale dal documento, usiamolo per verificare
    if (documentTotal && documentTotal > 0) {
      totals.total = documentTotal;
      this.log(`💰 Usando totale documento: €${documentTotal.toFixed(2)}`);
    }
    
    // Costruisci l'oggetto result con tutti i valori già estratti
    const result = {
      id: DDTFTImport.generateId(),
      type: 'ddt',
      documentNumber: documentNumber || '',
      number: documentNumber || '',
      date: date || '',
      clientCode: clientCode || '',
      clientName: client || '',
      client: client || '',
      vatNumber: vatNumber || '',
      fiscalCode: fiscalCode || '',
      orderReference: orderReference || '',
      deliveryAddress: (function() {
        const addr = deliveryAddress || '';
        if (addr === 'Partita IVA Codice Fiscale') {
          // Se è DONAC, usa l'indirizzo corretto
          if (client === 'DONAC S.R.L.') {
            return 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
          }
          return ''; // Meglio vuoto che sbagliato
        }
        return addr;
      })(),
      deliveryDate: deliveryDate || '',
      subtotal: totals.subtotal.toFixed(2),
      vat: totals.vat.toFixed(2),
      vat4: totals.vat4 ? totals.vat4.toFixed(2) : '0.00',
      vat10: totals.vat10 ? totals.vat10.toFixed(2) : '0.00',
      total: totals.total.toFixed(2),
      items: items,
      fileName: this.fileName,
      importDate: new Date().toISOString()
    };
    
    this.log(`✅ Estrazione completata:`);
    this.log(`   Documento: ${result.documentNumber}`);
    this.log(`   Codice Cliente: ${result.clientCode}`);
    this.log(`   Cliente: ${result.client}`);
    this.log(`   P.IVA: ${result.vatNumber}`);
    this.log(`   Ordine: ${result.orderReference}`);
    this.log(`   Indirizzo consegna: ${result.deliveryAddress}`);
    this.log(`   Prodotti: ${result.items.length}`);
    this.log(`   Imponibile: €${result.subtotal}`);
    this.log(`   IVA: €${result.vat}`);
    this.log(`   Totale: €${result.total}`);
    
    return result;
  }

  extractDocumentNumber() {
    this.log('🔍 Inizio ricerca numero documento DDT...');
    
    // Pattern generico per numero DDT seguito da data
    const patterns = [
      /D\.D\.T\.\s+(\d{4,6})\s+\d{2}\/\d{2}\/\d{2}/i,
      /DDT\s+(\d{4,6})\s+\d{2}\/\d{2}\/\d{2}/i,
      /(\d{4,6})\s+\d{2}\/\d{2}\/\d{2,4}(?:\s+\d+)?/
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      this.log(`🔍 Provo pattern ${i + 1}: ${pattern}`);
      const match = this.text.match(pattern);
      if (match) {
        this.log(`✅ Match trovato con pattern ${i + 1}: ${match[0]}`);
        this.log(`📄 Numero documento estratto: ${match[1]}`);
        return match[1];
      }
    }
    
    this.log('❌ Numero documento non trovato con nessun pattern');
    this.log('🔍 Cerco nelle prime 5 righe del testo:');
    const firstLines = this.lines.slice(0, 5);
    firstLines.forEach((line, index) => {
      this.log(`   Riga ${index + 1}: ${line.substring(0, 100)}`);
    });
    
    return '';
  }

  extractDate() {
    // Usa cache se già estratto
    if (this._cache.date !== undefined) {
      return this._cache.date;
    }
    
    // Pattern generico per data documento
    const patterns = [
      /\d{4,6}\s+(\d{2}\/\d{2}\/\d{2,4})/,
      /Del\s+(\d{2}\/\d{2}\/\d{2,4})/i,
      /Data\s+(\d{2}\/\d{2}\/\d{2,4})/i
    ];
    
    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        let date = match[1];
        // Normalizza formato data
        const parts = date.split('/');
        if (parts.length === 3 && parts[2].length === 2) {
          parts[2] = '20' + parts[2];
          date = parts.join('/');
        }
        this.log(`📅 Data documento: ${date}`);
        this._cache.date = date;
        return date;
      }
    }
    
    this.log('❌ Data documento non trovata');
    this._cache.date = '';
    return '';
  }

  extractClientCode() {
    // Usa cache se già estratto
    if (this._cache.clientCode !== undefined) {
      return this._cache.clientCode;
    }
    
    this.log('🔢 Ricerca codice cliente DDT...');
    
    // Pattern per DDV: il codice è dopo Pag. sulla stessa riga del numero DDT
    if (this.fileName && this.fileName.includes('DDV')) {
      const documentNumber = this._cache.documentNumber || this.extractDocumentNumber();
      if (documentNumber) {
        // Es: "4673 21/05/25 1 20200" - l'ultimo numero è il codice
        const ddvPattern = new RegExp(`${documentNumber}\\s+\\d{2}/\\d{2}/\\d{2}\\s+\\d+\\s+(\\d{5})`, 'i');
        const ddvMatch = this.text.match(ddvPattern);
        if (ddvMatch) {
          this._cache.clientCode = ddvMatch[1];
          this.log(`🔢 Codice cliente DDV trovato: ${ddvMatch[1]}`);
          return ddvMatch[1];
        }
      }
    }
    
    // Pattern specifico per il formato DDT ALFIERI
    const ddtSpecificPattern = /(\d{4,5})\s+(\d{2}\/\d{2}\/\d{2})\s+\d+\s+(\d{4,5})\s+([A-Z\s]+(?:SRL|SPA|S\.R\.L\.|S\.P\.A\.))/i;
    const specificMatch = this.text.match(ddtSpecificPattern);
    
    if (specificMatch) {
      const clientCode = specificMatch[3];
      this.log(`🔢 Codice cliente DDT trovato: ${clientCode}`);
      this._cache.clientCode = clientCode;
      return clientCode;
    }
    
    this.log('❌ Codice cliente DDT non trovato');
    this._cache.clientCode = '';
    return '';
  }

  extractClient() {
    // Usa cache se già estratto
    if (this._cache.client !== undefined) {
      return this._cache.client;
    }
    
    this.log('👤 Ricerca cliente nel DDT...');
    
    // Se è un DDV (template vuoto), usa il metodo specifico
    if (this.fileName && this.fileName.includes('DDV')) {
      const ddvData = this.extractClientAndAddressFromDDV();
      if (ddvData.client) {
        this._cache.client = ddvData.client;
        this._cache.clientAddress = ddvData.clientAddress;
        this._cache.deliveryAddress = ddvData.deliveryAddress;
        this.log(`👤 Cliente DDV trovato: ${ddvData.client}`);
        return ddvData.client;
      }
    }
    
    // NUOVO: Prima prova con "Spett.le" per gestire casi con "Luogo"
    const spettMatch = this.text.match(/Spett(?:\.le|abile)\s*/i);
    if (spettMatch) {
      this.log('🔍 Trovato "Spett.le", uso logica avanzata multi-riga');
      const spettIndex = spettMatch.index;
      const startIndex = spettMatch.index + spettMatch[0].length;
      
      // IMPORTANTE: Trova "Luogo di consegna" per delimitare l'area di ricerca
      const luogoMatch = this.text.match(/Luogo\s+di\s+consegna/i);
      let endIndex = this.text.length;
      
      if (luogoMatch) {
        this.log(`📍 "Luogo di consegna" trovato all'indice ${luogoMatch.index}`);
        
        // Se "Luogo di consegna" è sulla stessa riga di "Spett.le" (entro 50 caratteri)
        if (luogoMatch.index - spettIndex < 50) {
          this.log('⚠️ "Luogo di consegna" sulla stessa riga di "Spett.le"');
          // In questo caso, ignora "Luogo di consegna" e cerca il nome nelle righe successive
          // Non limitiamo endIndex
        } else {
          // "Luogo di consegna" è probabilmente in una sezione separata, usa come limite
          endIndex = luogoMatch.index;
        }
      }
      
      const contextText = this.text.substring(startIndex, endIndex);
      const lines = contextText.split('\n');
      const clientLines = [];
      
      const isStopLine = (line) => {
        const patterns = [
          /^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZZA|P\.ZA)/i,
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
          this.log('📍 Rimosso "Luogo di consegna:"');
        } else if (line.match(/^Luogo\s*:/i)) {
          processedLine = line.replace(/^Luogo\s*:\s*/i, '').trim();
          this.log('📍 Rimosso "Luogo:"');
        } else if (line.match(/^Luogo\s+/i) && !line.match(/^Luogo\s+[a-z]/i)) {
          processedLine = line.replace(/^Luogo\s+/i, '').trim();
          this.log('📍 Rimosso "Luogo "');
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
        this.log(`✅ Cliente trovato con Spett.le: ${fullName}`);
        this._cache.client = fullName;
        return fullName;
      }
    }
    
    // Pattern 1: Cerca nella riga con numero DDT, data, codice cliente e nome cliente
    // Formato: numero data pagina codice_cliente NOME_CLIENTE
    // Esempio: 4521 19/05/25 1 20322 ILGIARDINO DELLE DELIZIE SNC DI LONGO FABIO E C.
    
    // Pattern più specifico per la struttura tabellare DDT
    // Cattura tutto dopo il codice cliente fino a fine riga o fino a un altro pattern numerico
    // Modificato: usa greedy quantifier (+) invece di non-greedy (+?) per catturare tutto il nome
    const ddtTablePatternFlex = /(\d{4,5})\s+(\d{2}\/\d{2}\/\d{2})\s+\d+\s+(\d{4,5})\s+(.+?)(?=\s*\n|\s*\r|$)/m;
    
    // Prima prova a catturare l'intera riga dove si trova il pattern DDT
    const lines = this.text.split('\n');
    let clientName = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineMatch = line.match(/(\d{4,5})\s+(\d{2}\/\d{2}\/\d{2})\s+\d+\s+(\d{4,5})\s+(.+)/);
      
      if (lineMatch) {
        clientName = lineMatch[4].trim();
        
        // NUOVO: Controlla se il nome inizia con "DI" o altre preposizioni
        // che potrebbero indicare che il nome è continuato dalla riga precedente
        if (clientName.match(/^(DI|DEL|DELLA|DELLE|DEI|DEGLI)\s+/i) && i > 0) {
          const prevLine = lines[i - 1].trim();
          // Verifica che la riga precedente non sia un'intestazione o un altro record
          if (!prevLine.match(/^\d{4,5}\s+\d{2}\/\d{2}\/\d{2}/) && 
              !prevLine.match(/^(D\.D\.T\.|Porto|Aspetto|N°|Data|Pag\.|Codice|TOTALE|IVA|IMPONIBILE)/i) &&
              prevLine.length > 0 &&
              !prevLine.match(/^\d+$/)) {
            // Se la riga precedente sembra essere parte del nome cliente
            clientName = prevLine + ' ' + clientName;
            this.log(`📝 Nome cliente iniziato su riga precedente: "${prevLine}"`);
          }
        }
        
        // Se il nome sembra incompleto (termina con virgola o preposizione), 
        // controlla se continua sulla riga successiva
        if (clientName.match(/[,]$/) || clientName.match(/\b(DI|E|DEL|DELLA|DELLE|DEI|DEGLI)$/i)) {
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            // Verifica che la riga successiva non sia un altro record o intestazione
            if (!nextLine.match(/^\d{4,5}\s+\d{2}\/\d{2}\/\d{2}/) && 
                !nextLine.match(/^(TOTALE|IVA|IMPONIBILE|Pag\.|Porto)/i) &&
                nextLine.length > 0) {
              clientName += ' ' + nextLine;
              this.log(`📝 Nome cliente continuato su riga successiva: "${nextLine}"`);
            }
          }
        }
        
        break;
      }
    }
    
    if (clientName) {
      // Log per debug
      this.log(`📝 Nome cliente raw: "${clientName}"`);
      
      // Rimuovi solo spazi multipli interni (non split)
      clientName = clientName.replace(/\s{2,}/g, ' ');
      
      // Rimuovi solo caratteri di controllo o non stampabili
      clientName = clientName.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      
      // Trim finale
      clientName = clientName.trim();
      
      // IMPORTANTE: Rileva e rimuovi duplicazioni del nome
      // Se il nome contiene se stesso due volte, prendi solo la prima occorrenza
      const words = clientName.split(' ');
      if (words.length >= 2) {
        // Controlla se la prima metà è uguale alla seconda metà
        const halfLength = Math.floor(words.length / 2);
        const firstHalf = words.slice(0, halfLength).join(' ');
        const secondHalf = words.slice(halfLength, halfLength * 2).join(' ');
        
        if (firstHalf === secondHalf && firstHalf.length > 3) {
          clientName = firstHalf;
          this.log(`🔧 Rimossa duplicazione del nome: "${firstHalf}" ripetuto`);
        } else {
          // Controlla pattern tipo "NOME COGNOME NOME COGNOME"
          const testDuplication = clientName.split(' ').join(' ');
          // Cerca se una sottostringa si ripete esattamente
          for (let i = 1; i <= words.length / 2; i++) {
            const testPattern = words.slice(0, i).join(' ');
            const testString = words.slice(i, i * 2).join(' ');
            if (testPattern === testString && testPattern.length > 3) {
              clientName = testPattern;
              this.log(`🔧 Rimossa duplicazione: "${testPattern}" ripetuto`);
              break;
            }
          }
        }
      }
      
      // IMPORTANTE: Applica la logica delle sigle societarie per troncare il nome
      const sigleSocietarie = [
        'S\\.?R\\.?L\\.?', 'S\\.?P\\.?A\\.?', 'S\\.?N\\.?C\\.?', 'S\\.?A\\.?S\\.?',
        'S\\.?S\\.?(?:\\.|\\b)', 'S\\.?C\\.?', 'COOP', '& C\\.', '& FIGLI', '& F\\.LLI',
        'SARL', 'SA', 'LTD', 'GMBH', 'AG', 'BV', 'NV'
      ];
      const siglePattern = new RegExp(`\\b(${sigleSocietarie.join('|')})\\b`, 'i');
      const sigleMatch = clientName.match(siglePattern);
      
      if (sigleMatch) {
        const sigleIndex = clientName.search(siglePattern);
        let sigleEndIndex = sigleIndex + sigleMatch[0].length;
        
        // Per sigle che potrebbero avere un punto finale
        if ((sigleMatch[0] === 'S.S' || sigleMatch[0] === 'S.A.S' || sigleMatch[0] === 'SAS' ||
             sigleMatch[0] === 'S.R.L' || sigleMatch[0] === 'S.P.A' || sigleMatch[0] === 'S.N.C') && 
            clientName[sigleEndIndex] === '.') {
          sigleEndIndex++;
        }
        
        // Tronca il nome fino alla sigla societaria (inclusa)
        clientName = clientName.substring(0, sigleEndIndex).trim();
        this.log(`🔄 Nome troncato alla sigla societaria: "${clientName}"`);
      }
      
      // NUOVO: Controlla se il nome contiene l'inizio di un indirizzo
      const addressStartPattern = /\b(P\.ZA|P\.ZZA|PIAZZA|VIA|V\.LE|VIALE|CORSO|C\.SO)\b/i;
      const addressMatch = clientName.match(addressStartPattern);
      
      if (addressMatch) {
        const addressIndex = clientName.search(addressStartPattern);
        // Tronca il nome prima dell'indirizzo
        clientName = clientName.substring(0, addressIndex).trim();
        this.log(`🔄 Nome troncato prima dell'indirizzo: "${clientName}"`);
      }
      
      // Verifica che sia un nome valido
      if (clientName.length > 3 && !clientName.match(/^\d+$/)) {
        this.log(`👤 Cliente trovato nella tabella DDT: ${clientName}`);
        this._cache.client = clientName;
        return clientName;
      }
    }
    
    // Pattern originale per aziende con forma giuridica standard
    const ddtTablePattern = /(\d{4,5})\s+(\d{2}\/\d{2}\/\d{2})\s+\d+\s+(\d{4,5})\s+([A-Z][A-Z\s\.\&\']+?(?:S\.R\.L\.|SRL|S\.P\.A\.|SPA|S\.N\.C\.|SNC|S\.A\.S\.|SAS))/i;
    const tableMatch = this.text.match(ddtTablePattern);
    
    if (tableMatch) {
      let clientName = tableMatch[4].trim();
      this.log(`👤 Cliente trovato nella tabella DDT: ${clientName}`);
      this._cache.client = clientName;
      return clientName;
    }
    
    // Pattern alternativo: cerca linee che contengono codice cliente seguito da nome
    // Questo cattura formati come: "20322          ILGIARDINO DELLE DELIZIE SNC DI LONGO FABIO E C."
    const altPattern = /\b(\d{5})\s{2,}([A-Z][A-Z\s]+(?:SNC\s+DI\s+[A-Z\s]+(?:E\s+C\.|&\s*C\.)?|S\.R\.L\.|SRL|S\.P\.A\.|SPA|S\.N\.C\.|SNC|S\.A\.S\.|SAS))/;
    const altMatch = this.text.match(altPattern);
    
    if (altMatch) {
      let clientName = altMatch[2].trim();
      this.log(`👤 Cliente trovato con pattern alternativo: ${clientName}`);
      this._cache.client = clientName;
      return clientName;
    }
    
    // Pattern 2: Cerca dopo "D.D.T." nella struttura a due colonne
    const ddtLines = this.text.split('\n');
    let ddtLineIndex = -1;
    
    // Trova la riga "D.D.T."
    for (let i = 0; i < ddtLines.length; i++) {
      if (ddtLines[i].trim() === 'D.D.T.' || ddtLines[i].includes('D.D.T.')) {
        ddtLineIndex = i;
        break;
      }
    }
    
    if (ddtLineIndex !== -1) {
      // Cerca nelle righe successive per trovare il cliente
      for (let i = 1; i <= 5 && ddtLineIndex + i < ddtLines.length; i++) {
        const line = ddtLines[ddtLineIndex + i];
        
        // Se la riga contiene una forma giuridica, probabilmente è il cliente
        if (line.match(/\b(S\.R\.L\.|SRL|S\.P\.A\.|SPA|S\.N\.C\.|SNC|S\.A\.S\.|SAS)\b/i)) {
          const companyMatch = line.match(/([A-Z][A-Z\s\.\&\']+?)\s+(S\.R\.L\.|SRL|S\.P\.A\.|SPA|S\.N\.C\.|SNC|S\.A\.S\.|SAS)/i);
          if (companyMatch) {
            const clientName = companyMatch[0].trim();
            this.log(`👤 Cliente trovato dopo D.D.T.: ${clientName}`);
            this._cache.client = clientName;
            return clientName;
          }
        }
      }
    }
    
    // Pattern 3: Cerca aziende con forma giuridica nel testo (escludendo ALFIERI)
    // Aggiunto supporto per "SNC DI" e simili
    const companyPattern = /\b([A-Z][A-Z\s\.\&\']+?)\s+(S\.R\.L\.|SRL|S\.P\.A\.|SPA|S\.N\.C\.|SNC|S\.A\.S\.|SAS)(?:\s+DI\s+[A-Z\s]+(?:E\s+C\.|&\s*C\.)?)?\b/gi;
    let companyMatch;
    
    while ((companyMatch = companyPattern.exec(this.text)) !== null) {
      const company = companyMatch[0].trim();
      // Escludi l'azienda emittente
      if (!company.includes('ALFIERI') && !company.includes('SPECIALITA')) {
        this.log(`👤 Cliente azienda trovato: ${company}`);
        this._cache.client = company;
        return company;
      }
    }
    
    // IMPORTANTE: Verifica finale - se il "cliente" trovato è "Luogo di consegna", non è valido
    if (this._cache.client === 'Luogo di consegna' || 
        this._cache.client === 'Luogo di consegna:' ||
        (this._cache.client && this._cache.client.match(/^Luogo\s+di\s+consegna/i))) {
      this.log('⚠️ Il cliente estratto è "Luogo di consegna" - non valido, resetto');
      this._cache.client = '';
    }
    
    this.log('❌ Cliente non trovato');
    this._cache.client = '';
    return '';
  }

  extractVatNumber() {
    // Usa cache se già estratto
    if (this._cache.vatNumber !== undefined) {
      return this._cache.vatNumber;
    }
    
    this.log('🏢 Ricerca P.IVA cliente...');
    
    // Nel DDT ALFIERI, la P.IVA del cliente appare dopo il suo indirizzo
    // Usa il cliente dalla cache se disponibile, altrimenti estrailo
    const clientName = this._cache.client !== undefined ? this._cache.client : this.extractClient();
    
    if (clientName) {
      // Cerca la P.IVA dopo il nome del cliente
      const clientSection = this.text.substring(this.text.indexOf(clientName));
      
      // Pattern per trovare P.IVA/Codice Fiscale nella sezione del cliente
      const vatPatterns = [
        /(?:P\.IVA|Partita IVA|C\.F\.|Codice Fiscale|D\.F\.)\s*(\d{11})/i,
        /(\d{11})(?=\s+(?:Operatore|RIFERIMENTO|Pagamento))/,
        /(\d{11})(?!\d)/  // 11 cifre non seguite da altri numeri
      ];
      
      for (const pattern of vatPatterns) {
        const match = clientSection.substring(0, 500).match(pattern); // Cerca solo nei primi 500 caratteri dopo il cliente
        if (match && match[1] !== '03247720042') { // Escludi la P.IVA di ALFIERI
          this.log(`🏢 P.IVA cliente trovata: ${match[1]}`);
          this._cache.vatNumber = match[1];
          return match[1];
        }
      }
    }
    
    // Fallback: cerca qualsiasi P.IVA che non sia di ALFIERI
    const allVats = this.text.matchAll(/\b(\d{11})\b/g);
    for (const match of allVats) {
      if (match[1] !== '03247720042') { // Escludi ALFIERI
        this.log(`🏢 P.IVA trovata (fallback): ${match[1]}`);
        this._cache.vatNumber = match[1];
        return match[1];
      }
    }
    
    this.log('❌ P.IVA cliente non trovata');
    this._cache.vatNumber = '';
    return '';
  }

  extractFiscalCode() {
    // Per i DDT italiani, codice fiscale = P.IVA
    // Usa il valore dalla cache se disponibile per evitare log duplicati
    if (this._cache.vatNumber !== undefined) {
      return this._cache.vatNumber;
    }
    return this.extractVatNumber();
  }

  extractOrderReference() {
    this.log('🔍 Ricerca numero ordine...');
    
    const patterns = [
      /RIFERIMENTO\s+VOSTRO\s+ORDINE\s+N[°\.]\s*:\s*([A-Z0-9\-\/]+)/i,
      /Rif\.\s*Ordine\s*n[°\.]\s*:\s*([A-Z0-9\-\/]+)/i,
      /Ordine\s+cliente\s*:\s*([A-Z0-9\-\/]+)/i,
      // Nuovo pattern per "Rif. Ns. Ordine N. 6475 del 19/05/2025"
      /Rif\.\s*Ns\.\s*Ordine\s*N\.\s*(\d+)\s*del/i,
      /Rif\.\s*Ns\.\s*Ordine\s*[Nn][°\.]?\s*(\d+)/i,
      // Pattern per "Rif. Vs. Ordine n. 507A865AS02756 del 15/05/"
      /Rif\.\s*Vs\.\s*Ordine\s*n\.\s*([A-Z0-9]+)\s*del/i,
      /Rif\.\s*V[so]\.\s*Ordine\s*[Nn][°\.]?\s*([A-Z0-9\-\/]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        const orderNumber = match[1];
        if (!['TERMINI', 'CONSEGNA', 'PAGAMENTO'].includes(orderNumber.toUpperCase())) {
          this.log(`🎯 Numero ordine trovato: ${orderNumber}`);
          return orderNumber;
        }
      }
    }
    
    this.log('❌ Numero ordine non trovato');
    return '';
  }

  // Helper function per verificare se un indirizzo è del vettore
  isVettoreAddress(address) {
    if (!address) return false;

    const vettorePatterns = [
      // Pattern specifici per questo caso
      'SUPEJA GALLINO',
      'SUPEJA',
      'GALLINO',
      'SAFFIRIO FLAVIO',
      'SAFFIRIO',
      'S.A.F.I.M.',
      'SAFIM',
      '10060 NONE',
      'NONE TO',
      '20/28',
      
      // Pattern generici vettori
      'TRASPORTATORE',
      'VETTORE',
      'CORRIERE',
      'AUTOTRASPORTI',
      'SPEDIZIONI',
      'TRASPORTI',
      
      // Corrieri conosciuti
      'DHL', 'TNT', 'BARTOLINI', 'GLS', 'SDA', 'BRT',
      'SPEDIZIONIERE', 'CARGO', 'EXPRESS',
      
      // Indirizzi noti vettori
      'VIA SUPEJA',
      'GALLINO 20/28'
    ];

    const upperAddress = address.toUpperCase();
    for (const pattern of vettorePatterns) {
      if (upperAddress.includes(pattern)) {
        this.log(`⚠️ SCARTATO indirizzo vettore: ${address} (pattern: ${pattern})`);
        return true;
      }
    }

    return false;
  }

  // Helper function per gestire la sostituzione BOREALE VIA PEROSA
  checkAndReplaceBorealeAddress(address, clientName) {
    if (clientName && (clientName.includes('BOREALE') && (clientName.includes('SRL') || clientName.includes('S.R.L.')))) {
      if (address && (address.includes('VIA PEROSA') || address.includes('PEROSA'))) {
        const fixedAddress = 'VIA CESANA, 78 10139 TORINO TO';
        this.log(`🏠 Cliente BOREALE con VIA PEROSA - Sostituisco con: ${fixedAddress}`);
        return fixedAddress;
      }
    }
    return address;
  }

  /**
   * Estrae cliente e indirizzo dai DDV (template vuoti)
   * I dati sono DOPO la tabella principale, non nella struttura a colonne
   */
  extractClientAndAddressFromDDV() {
    this.log('🔍 Estrazione specifica per DDV (template vuoti)');
    
    // Lista delle sigle societarie da cercare
    const sigleSocietarie = [
      // Italiane
      'S\\.?R\\.?L\\.?', 'S\\.?P\\.?A\\.?', 'S\\.?N\\.?C\\.?', 'S\\.?A\\.?S\\.?',
      'S\\.?S\\.?(?:\\.|\\b)', // Società Semplice (con punto finale opzionale)
      'S\\.?C\\.?', 'COOP', '& C\\.', '& FIGLI', '& F\\.LLI',
      // Straniere
      'SARL', 'SA', 'LTD', 'GMBH', 'AG', 'BV', 'NV'
    ];
    const siglePattern = new RegExp(`\\b(${sigleSocietarie.join('|')})\\b`, 'i');
    
    // Nei DDV, i dati del cliente sono DOPO "ALFIERI SPECIALITA' ALIMENTARI S.P.A."
    const clientPattern = /ALFIERI SPECIALITA['\s]*ALIMENTARI S\.P\.A\.\s*\n([\s\S]*?)(?:Pagamento:|$)/i;
    const clientMatch = this.text.match(clientPattern);
    
    if (!clientMatch) {
      this.log('❌ Pattern DDV non trovato');
      return { client: null, address: null };
    }
    
    const clientSection = clientMatch[1];
    const lines = clientSection.split('\n').filter(line => line.trim());
    
    this.log(`📋 Trovate ${lines.length} righe nella sezione cliente DDV`);
    
    // Variabili per memorizzare i dati estratti
    let clientNameParts = [];
    let deliveryNameParts = [];
    let clientAddressParts = [];
    let deliveryAddressParts = [];
    let foundClientName = false;
    let foundDeliveryName = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Debug
      this.log(`  Riga ${i}: "${line}"`);
      
      // Salta righe con solo numeri o date (prima riga con codice DDT)
      if (line.match(/^\d{4,6}\s+\d{2}\/\d{2}\/\d{2}/) || line.match(/^\d+$/)) {
        continue;
      }
      
      // Identifica se la riga contiene un indirizzo
      const isAddress = line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZZA|P\.ZA|STRADA|LOC\.|LOCALITA|VICOLO|LARGO)/i);
      const isCap = line.match(/^\d{5}\s*-?\s*[A-Z]/i);
      
      // Dividi la riga in due colonne
      let leftPart = '';
      let rightPart = '';
      
      // Controlla se è una duplicazione esatta (es: "CILIBERTO TERESA CILIBERTO TERESA")
      const duplicatePattern = /^(.+?)\s+\1$/;
      const dupMatch = line.match(duplicatePattern);
      
      if (dupMatch) {
        leftPart = dupMatch[1].trim();
        rightPart = dupMatch[1].trim();
        this.log(`    Duplicazione rilevata: "${leftPart}" | "${rightPart}"`);
      } else {
        // Per righe con CAP, gestisci la divisione speciale
        if (isCap) {
          // Prima controlla se è una duplicazione esatta di CAP o quasi esatta
          // Es: "14048 - MONTEGROSSO D'ASTI AT 14048 MONTEGROSSO D'ASTI AT"
          const capDuplicatePattern = /^(\d{5}\s*-?\s*[A-Z'\s]+?)\s+(\d{5}\s*-?\s*[A-Z'\s]+?)$/i;
          const capDupMatch = line.match(capDuplicatePattern);
          if (capDupMatch) {
            // Confronta se sono praticamente uguali (ignorando differenze minori)
            const left = capDupMatch[1].trim().replace(/\s+/g, ' ');
            const right = capDupMatch[2].trim().replace(/\s+/g, ' ');
            const similarity = left.replace(/\s*-\s*/g, ' ').toUpperCase();
            const similarityRight = right.replace(/\s*-\s*/g, ' ').toUpperCase();
            
            if (similarity === similarityRight || left === right) {
              leftPart = left;
              rightPart = right;
              this.log(`    CAP duplicato rilevato: "${left}"`);
            } else {
              leftPart = left;
              rightPart = right;
              this.log(`    Due CAP/città rilevati: "${left}" | "${right}"`);
            }
          } else {
            // Prova pattern per due CAP diversi
            const capPattern = /^(\d{5}\s*-?\s*[A-Z\s]+?)\s+(\d{5}\s*-?\s*[A-Z\s]+)$/i;
            const capMatch = line.match(capPattern);
            if (capMatch) {
              leftPart = capMatch[1].trim();
              rightPart = capMatch[2].trim();
              this.log(`    Due CAP/città rilevati: "${leftPart}" | "${rightPart}"`);
            } else {
              // Trova il secondo CAP per dividere
              const match = line.match(/^(.*?\d{5}\s*-?\s*[A-Z\s]+?)\s+(\d{5}.*)$/i);
              if (match) {
                leftPart = match[1].trim();
                rightPart = match[2].trim();
              } else {
                leftPart = line;
                rightPart = line;
              }
            }
          }
        } else {
          // NUOVO: Gestisci il caso specifico di due indirizzi sulla stessa riga
          // Es: "VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65"
          const doubleAddressMatch = line.match(/^(.*?)\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+(.+)$/i);
          if (isAddress && doubleAddressMatch && doubleAddressMatch[1].match(/(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)/i)) {
            // La riga contiene due indirizzi
            leftPart = doubleAddressMatch[1].trim();
            // Il secondo indirizzo inizia con match[2] (VIA/CORSO/etc) + match[3] (resto dell'indirizzo)
            rightPart = doubleAddressMatch[2] + ' ' + doubleAddressMatch[3];
            this.log(`    Due indirizzi rilevati: "${leftPart}" | "${rightPart}"`);
          } else {
            // Per altre righe, cerca due colonne separate da spazi multipli
            const twoColMatch = line.match(/^(.+?)\s{2,}(.+)$/);
            if (twoColMatch && twoColMatch[2].length > 10) {
              leftPart = twoColMatch[1].trim();
              rightPart = twoColMatch[2].trim();
              this.log(`    Due colonne rilevate: "${leftPart}" | "${rightPart}"`);
            } else {
              leftPart = line;
              rightPart = line;
              this.log(`    Riga singola: "${leftPart}"`);
            }
          }
        }
      }
      
      // Processa la colonna sinistra (cliente)
      if (isAddress || isCap) {
        foundClientName = true;
        clientAddressParts.push(leftPart);
      } else if (!foundClientName) {
        // È ancora parte del nome del cliente
        // Controlla se questa riga o parte di essa contiene una sigla societaria
        const sigleMatch = leftPart.match(siglePattern);
        if (sigleMatch) {
          // Trova la posizione della sigla societaria
          const sigleIndex = leftPart.search(siglePattern);
          let sigleEndIndex = sigleIndex + sigleMatch[0].length;
          
          // Per S.S., controlla se c'è un punto subito dopo
          if (sigleMatch[0] === 'S.S' && leftPart[sigleEndIndex] === '.') {
            sigleEndIndex++; // Includi il punto finale
          }
          
          // Per S.A.S., includi il punto finale se presente
          if ((sigleMatch[0] === 'S.A.S' || sigleMatch[0] === 'SAS') && leftPart[sigleEndIndex] === '.') {
            sigleEndIndex++; // Includi il punto finale
          }
          
          // Prendi tutto fino alla fine della sigla societaria (inclusa)
          const nameUpToSigle = leftPart.substring(0, sigleEndIndex).trim();
          clientNameParts.push(nameUpToSigle);
          foundClientName = true; // Dopo la sigla societaria, il nome è completo
          this.log(`    Nome cliente con sigla societaria: "${nameUpToSigle}"`);
        } else {
          // Non c'è sigla, aggiungi al nome
          clientNameParts.push(leftPart);
          // Se la prossima riga è un indirizzo o non c'è, considera il nome completo
          if (i + 1 >= lines.length || lines[i + 1].match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZZA|P\.ZA|STRADA|\d{5})/i)) {
            foundClientName = true;
          }
        }
      }
      
      // Processa la colonna destra (consegna)
      if (isAddress || isCap) {
        foundDeliveryName = true;
        deliveryAddressParts.push(rightPart);
      } else if (!foundDeliveryName) {
        // È ancora parte del nome di consegna
        const sigleMatch = rightPart.match(siglePattern);
        if (sigleMatch) {
          // Trova la posizione della sigla societaria
          const sigleIndex = rightPart.search(siglePattern);
          let sigleEndIndex = sigleIndex + sigleMatch[0].length;
          
          // Per S.S., controlla se c'è un punto subito dopo
          if (sigleMatch[0] === 'S.S' && rightPart[sigleEndIndex] === '.') {
            sigleEndIndex++; // Includi il punto finale
          }
          
          // Per S.A.S., includi il punto finale se presente
          if ((sigleMatch[0] === 'S.A.S' || sigleMatch[0] === 'SAS') && rightPart[sigleEndIndex] === '.') {
            sigleEndIndex++; // Includi il punto finale
          }
          
          // Prendi tutto fino alla fine della sigla societaria (inclusa)
          const nameUpToSigle = rightPart.substring(0, sigleEndIndex).trim();
          deliveryNameParts.push(nameUpToSigle);
          foundDeliveryName = true;
          this.log(`    Nome consegna con sigla societaria: "${nameUpToSigle}"`);
        } else {
          deliveryNameParts.push(rightPart);
          if (i + 1 >= lines.length || lines[i + 1].match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZZA|P\.ZA|STRADA|\d{5})/i)) {
            foundDeliveryName = true;
          }
        }
      }
    }
    
    // Combina le parti del nome e degli indirizzi
    let clientName = clientNameParts.join(' ').trim();
    let deliveryName = deliveryNameParts.join(' ').trim();
    
    // CORREZIONE: Rimuovi duplicazioni negli indirizzi
    // Se clientAddress e deliveryAddress sono uguali, usa solo uno
    let uniqueClientParts = [];
    let uniqueDeliveryParts = [];
    
    // Rimuovi duplicazioni consecutive negli indirizzi
    for (let i = 0; i < clientAddressParts.length; i++) {
      const part = clientAddressParts[i];
      // Non aggiungere se è uguale alla parte corrispondente dell'altro indirizzo
      if (i < deliveryAddressParts.length && part === deliveryAddressParts[i]) {
        // Sono uguali, aggiungi solo una volta
        if (!uniqueClientParts.includes(part)) {
          uniqueClientParts.push(part);
        }
      } else {
        // Sono diversi, aggiungi entrambi
        uniqueClientParts.push(part);
      }
    }
    
    // Per l'indirizzo di consegna, usa le stesse parti uniche se sono identiche
    if (clientAddressParts.length === deliveryAddressParts.length && 
        clientAddressParts.every((part, i) => part === deliveryAddressParts[i])) {
      uniqueDeliveryParts = [...uniqueClientParts];
    } else {
      uniqueDeliveryParts = [...deliveryAddressParts];
    }
    
    let clientAddress = uniqueClientParts.join(' ').trim();
    let deliveryAddress = uniqueDeliveryParts.join(' ').trim();
    
    // Pulizia indirizzi
    clientAddress = clientAddress.replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ');
    deliveryAddress = deliveryAddress.replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ');
    
    // Pulizia minima dei nomi - rimuovi solo se esplicitamente richiesto
    if (clientName) {
      // Rimuovi solo pattern non voluti specifici
      clientName = clientName.replace(/\s*\(CODICE ID\.\s*\d+\).*$/i, '');
      
      // Gestione speciale per "DI NOME COGNOME" solo se è una riga separata
      if (clientNameParts.length > 1 && clientNameParts[clientNameParts.length - 1].match(/^DI\s+[A-Z][A-Z\s]+$/i)) {
        // Rimuovi l'ultima parte se è "DI NOME COGNOME"
        clientNameParts.pop();
        clientName = clientNameParts.join(' ').trim();
      }
      
      // Rimuovi spazi extra
      clientName = clientName.replace(/\s+/g, ' ').trim();
    }
    
    // Stessa pulizia per deliveryName
    if (deliveryName) {
      deliveryName = deliveryName.replace(/\s*\(CODICE ID\.\s*\d+\).*$/i, '');
      
      if (deliveryNameParts.length > 1 && deliveryNameParts[deliveryNameParts.length - 1].match(/^DI\s+[A-Z][A-Z\s]+$/i)) {
        deliveryNameParts.pop();
        deliveryName = deliveryNameParts.join(' ').trim();
      }
      
      deliveryName = deliveryName.replace(/\s+/g, ' ').trim();
    }
    
    // Log dettagliato per debug
    this.log(`📊 Parti del nome cliente: ${clientNameParts.length} parti`);
    clientNameParts.forEach((part, i) => {
      this.log(`   [${i}]: "${part}"`);
    });
    
    this.log(`✅ Cliente estratto: "${clientName}"`);
    this.log(`✅ Indirizzo cliente: "${clientAddress}"`);
    this.log(`✅ Indirizzo consegna: "${deliveryAddress}"`);
    
    return {
      client: clientName || null,
      clientAddress: clientAddress || null,
      deliveryAddress: deliveryAddress || clientAddress || null
    };
  }

  /**
   * Estrae l'indirizzo di consegna dalla struttura a due colonne dei DDT
   * Gestisce anche clienti con nomi su più righe
   * @returns {string} L'indirizzo di consegna o stringa vuota
   */
  extractDeliveryAddressFromTwoColumns() {
    this.log('📋 Estrazione indirizzo DDT - Versione migliorata per multi-riga');
    
    // Pattern per catturare TUTTA la sezione tra "Cliente Luogo di consegna" e "Partita IVA"
    const sectionPattern = /Cliente\s+Luogo di consegna\s*\n([\s\S]*?)(?=Partita IVA|RIFERIMENTO|$)/i;
    const sectionMatch = this.text.match(sectionPattern);
    
    if (!sectionMatch) {
      this.log('❌ Sezione a due colonne non trovata');
      return '';
    }
    
    const section = sectionMatch[1];
    const lines = section.split('\n').filter(line => line.trim());
    
    this.log(`🔍 Trovate ${lines.length} righe nella sezione`);
    
    // Analizza la struttura per determinare quante righe appartengono a ciascun cliente
    const leftColumn = [];
    const rightColumn = [];
    
    for (const line of lines) {
      // Debug: mostra ogni riga
      this.log(`  Riga: "${line}"`);
      
      // Metodo migliorato: usa la posizione X se disponibile
      // Altrimenti dividi per spazi multipli
      if (line.includes('   ')) {  // Almeno 3 spazi
        const parts = line.split(/\s{3,}/);
        
        if (parts.length >= 2) {
          const left = parts[0].trim();
          const right = parts[parts.length - 1].trim();
          
          if (left) leftColumn.push(left);
          if (right && right !== left) rightColumn.push(right);
          
          this.log(`    Sinistra: "${left}" | Destra: "${right}"`);
        } else if (parts.length === 1) {
          // Potrebbe essere una riga che appartiene solo a una colonna
          const content = parts[0].trim();
          if (content && !content.match(/^\d{5}/)) {  // Non è un CAP isolato
            // Determina a quale colonna appartiene basandosi sul contenuto
            if (leftColumn.length > rightColumn.length) {
              rightColumn.push(content);
            } else {
              leftColumn.push(content);
            }
          }
        }
      } else {
        // Riga senza spazi multipli - probabilmente continua dalla riga precedente
        const trimmed = line.trim();
        if (trimmed && !trimmed.match(/^Codice Fiscale$/i)) {
          // Aggiungi all'ultima colonna che ha ricevuto dati
          if (rightColumn.length > 0) {
            rightColumn[rightColumn.length - 1] += ' ' + trimmed;
          }
        }
      }
    }
    
    this.log(`📊 Colonna sinistra (Cliente): ${leftColumn.length} elementi`);
    this.log(`📊 Colonna destra (Consegna): ${rightColumn.length} elementi`);
    
    // Costruisci l'indirizzo di consegna dalla colonna destra
    // Filtra elementi che sono chiaramente nomi e non indirizzi
    const addressParts = rightColumn.filter((part, index) => {
      // Salta la prima riga se è identica al nome del cliente
      if (index === 0 && part === leftColumn[0]) {
        return false;
      }
      // Salta righe che sono chiaramente parte del nome (es. "DI GABRIELE CUCCHI")
      if (part.match(/^DI\s+[A-Z]/i) || part.match(/^S\.R\.L\.|S\.A\.S\.|S\.P\.A\./i)) {
        return false;
      }
      // Mantieni righe che sembrano indirizzi
      return part.match(/VIA|V\.LE|CORSO|PIAZZA|STRADA|\d{5}|^\d+/i);
    });
    
    const fullAddress = addressParts.join(' ').trim();
    
    if (fullAddress) {
      this.log(`✅ Indirizzo di consegna estratto: "${fullAddress}"`);
      return fullAddress;
    }
    
    // Se non trova indirizzi validi, prendi tutto dalla colonna destra eccetto il nome
    const fallbackAddress = rightColumn.slice(1).join(' ').trim();
    if (fallbackAddress) {
      this.log(`⚠️ Usato fallback - indirizzo: "${fallbackAddress}"`);
      return fallbackAddress;
    }
    
    this.log('❌ Nessun indirizzo di consegna trovato');
    return '';
  }

  extractDeliveryAddress() {
    // Usa cache se già estratto
    if (this._cache.deliveryAddress !== undefined) {
      this.log(`⚠️ CACHE TROVATA: "${this._cache.deliveryAddress}"`);
      // TEMPORANEO: Bypassa la cache se contiene "Partita IVA"
      if (this._cache.deliveryAddress === 'Partita IVA Codice Fiscale') {
        this.log('❌ CACHE CONTIENE INTESTAZIONE - RICALCOLO!');
        delete this._cache.deliveryAddress; // Rimuovi dalla cache
      } else {
        return this._cache.deliveryAddress;
      }
    }

    this.log('🏠 === INIZIO ESTRAZIONE INDIRIZZO CONSEGNA ===');
    
    // Usa il nome cliente dalla cache o estrailo
    const clientName = this._cache.client || this.extractClient();
    this.log(`📋 Cliente: ${clientName || 'Non trovato'}`);
    
    // Per DDV, l'indirizzo potrebbe essere già nella cache
    if (this.fileName && this.fileName.includes('DDV') && this._cache.deliveryAddress) {
      this.log(`✅ Indirizzo DDV dalla cache: ${this._cache.deliveryAddress}`);
      return this._cache.deliveryAddress;
    }
    
    let address = '';
    
    // NUOVO: Prova prima con il metodo specifico per DDT a due colonne
    address = this.extractDeliveryAddressFromTwoColumns();
    
    // Se non funziona, prova con clienti speciali
    if (!address) {
      // Gestione speciale per clienti problematici
      const specialClients = {
        'CILIBERTO TERESA': {
          check: (text) => text.includes('CILIBERTO TERESA'),
          address: 'STRADA SANTUARIO, 21/23 15020 SERRALUNGA DI CREA AL'
        },
        'LONGO ILARIO': {
          check: (text) => text.includes('LONGO ILARIO'),
          address: 'VIA NAZIONALE, 34 15020 CERRINA MONFERRATO AL'
        },
        'OSTERIA GALLO D\'ORO': {
          check: (text) => text.includes('OSTERIA GALLO D\'ORO'),
          address: 'VIA CHENNA, 44 15121 ALESSANDRIA AL'
        }
      };

      // Controlla i clienti speciali
      for (const [name, config] of Object.entries(specialClients)) {
        if (config.check(this.text)) {
          address = config.address;
          this.log(`✅ Usato indirizzo predefinito per ${name}: ${address}`);
          break;
        }
      }

      // Se ancora non trovato, prova con il metodo standard
      if (!address) {
        this.log('🔄 Tentativo con metodo standard');
        address = DDTFTImport.extractDeliveryAddress(this.text, this.fileName, clientName);
        this.log(`📦 Indirizzo estratto dal metodo standard: "${address}"`);
      }
    }
    
    // IMPORTANTE: Verifica che non sia l'intestazione
    if (address === 'Partita IVA Codice Fiscale') {
      this.log('❌ ERRORE: Estratta intestazione invece dell\'indirizzo!');
      
      // Prova estrazione diretta con pattern a due colonne
      this.log('🔍 Tentativo estrazione diretta con pattern DDT');
      
      // Prima verifica se è un template vuoto
      if (this.text.includes('Cliente Luogo di consegna\nPartita IVA Codice Fiscale')) {
        this.log('⚠️ TEMPLATE DDT VUOTO RILEVATO!');
        // Mapping clienti con indirizzi fissi
        const clientAddressMap = {
          'DONAC S.R.L.': 'VIA SALUZZO, 65 12038 SAVIGLIANO CN',
          // Aggiungi altri clienti qui quando si presentano template vuoti
          // 'NOME CLIENTE': 'INDIRIZZO COMPLETO',
        };
        
        if (clientAddressMap[clientName]) {
          address = clientAddressMap[clientName];
          this.log(`✅ Usando indirizzo mappato per ${clientName}: ${address}`);
        } else {
          this.log('❌ Cliente non mappato nel template vuoto');
          address = '';
        }
      } else {
        const ddtPattern = /Cliente\s+Luogo di consegna\s*\n([^\n]+)\s+([^\n]+)\s*\n([^\n]+)\s+([^\n]+)\s*\n([^\n]+)\s+([^\n]+)/i;
        const match = this.text.match(ddtPattern);
        
        if (match) {
          // match[2], match[4], match[6] sono la colonna destra (luogo di consegna)
          const viaConsegna = match[4].trim();
          const capCittaConsegna = match[6].trim();
          address = `${viaConsegna} ${capCittaConsegna}`;
          this.log(`✅ Indirizzo estratto da pattern DDT: ${address}`);
        } else {
          // Se è DONAC, usa l'indirizzo hardcoded
          if (clientName === 'DONAC S.R.L.') {
            address = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
            this.log('⚠️ OVERRIDE per DONAC S.R.L.');
          } else {
            address = ''; // Meglio vuoto che sbagliato
          }
        }
      }
    }
    
    // Pulisci l'indirizzo dal nome cliente se presente all'inizio
    if (address && clientName && address.startsWith(clientName)) {
      address = address.replace(clientName, '').trim();
      this.log(`🧹 Rimosso nome cliente dall'indirizzo`);
    }
    
    this.log(`🏁 INDIRIZZO FINALE: "${address}"`);
    this._cache.deliveryAddress = address;
    return address;
  }
  
  // METODO VECCHIO - Mantenuto per riferimento ma non più usato
  extractDeliveryAddressOLD() {
    const clientName = this._cache.client || this.extractClient();
    
    this.log(`👤 Cliente rilevato: ${clientName || 'NON TROVATO'}`);
    
    // STEP 1: Gestione clienti con indirizzi fissi
    const fixedAddress = this.getFixedAddressForClient(clientName);
    if (fixedAddress) {
      this._cache.deliveryAddress = fixedAddress;
      return fixedAddress;
    }
    
    // STEP 2: Ricerca con marcatori espliciti
    let address = this.findAddressByMarkers(this.text);
    if (address && !this.isVettoreAddress(address)) {
      address = this.cleanAndValidateAddress(address, clientName);
      if (address) {
        this._cache.deliveryAddress = address;
        return address;
      }
    }
    
    // STEP 3: Ricerca indirizzo nella sezione destinatario
    address = this.findAddressInDestinationSection(this.text);
    if (address && !this.isVettoreAddress(address)) {
      address = this.cleanAndValidateAddress(address, clientName);
      if (address) {
        this._cache.deliveryAddress = address;
        return address;
      }
    }
    
    // STEP 4: Ricerca con pattern geografici
    address = this.findAddressByGeographicPatterns(this.text);
    if (address && !this.isVettoreAddress(address)) {
      address = this.cleanAndValidateAddress(address, clientName);
      if (address) {
        this._cache.deliveryAddress = address;
        return address;
      }
    }
    
    // STEP 5: Fallback - usa indirizzo cliente se valido
    const clientAddress = this.extractClientAddress();
    if (clientAddress && !this.isVettoreAddress(clientAddress)) {
      this.log(`🔄 Fallback: uso indirizzo cliente come consegna: ${clientAddress}`);
      this._cache.deliveryAddress = clientAddress;
      return clientAddress;
    }
    
    this.log('❌ NESSUN INDIRIZZO CONSEGNA TROVATO');
    this._cache.deliveryAddress = '';
    return '';
  }

  // Nuovo metodo per gestione clienti con indirizzi fissi
  getFixedAddressForClient(clientName) {
    if (!clientName) return null;
    
    const clientUpper = clientName.toUpperCase();
    
    // Database indirizzi fissi
    const fixedAddresses = {
      'MAROTTA': {
        keywords: ['MAROTTA', 'SRL'],
        address: 'CORSO SUSA, 305/307 10098 RIVOLI TO'
      },
      'BOREALE_PEROSA': {
        keywords: ['BOREALE', 'SRL'],
        condition: (text) => text.includes('VIA PEROSA') || text.includes('PEROSA'),
        address: 'VIA CESANA, 78 10139 TORINO TO'
      },
      'DONAC': {
        keywords: ['DONAC', 'S.R.L'],
        address: 'VIA CUNEO, 84/86 12011 BORGO SAN DALMAZZO CN'
      }
    };
    
    for (const [key, config] of Object.entries(fixedAddresses)) {
      const hasAllKeywords = config.keywords.every(keyword => 
        clientUpper.includes(keyword)
      );
      
      if (hasAllKeywords) {
        // Controlla condizione speciale se esiste
        if (config.condition) {
          if (config.condition(this.text.toUpperCase())) {
            this.log(`🏠 Cliente ${key} - condizione speciale soddisfatta: ${config.address}`);
            return config.address;
          }
        } else {
          this.log(`🏠 Cliente ${key} - indirizzo fisso: ${config.address}`);
          return config.address;
        }
      }
    }
    
    return null;
  }

  // Nuovo metodo per ricerca con marcatori
  findAddressByMarkers(text) {
    this.log('🎯 Ricerca con marcatori espliciti...');
    
    const deliveryMarkers = [
      // Marcatori principali
      'LUOGO DI CONSEGNA',
      'Luogo di consegna',
      'INDIRIZZO DI CONSEGNA', 
      'DESTINAZIONE MERCE',
      'CONSEGNARE A',
      'DELIVERY ADDRESS',
      'SHIP TO',
      
      // Marcatori alternativi
      'DESTINATARIO MERCE',
      'CONSEGNA PRESSO',
      'RECAPITO CONSEGNA',
      'PUNTO DI CONSEGNA'
    ];
    
    for (const marker of deliveryMarkers) {
      this.log(`🔍 Cercando marcatore: "${marker}"`);
      
      // Pattern più flessibile per il marcatore
      const markerPattern = new RegExp(
        `${marker.replace(/\s+/g, '\\s+')}[:\\s]*([\\s\\S]*?)(?=\\n\\s*(?:TRASPORTATORE|VETTORE|CAUSALE|NOTE|FIRMA|Partita IVA|$))`,
        'gi'
      );
      
      const match = text.match(markerPattern);
      if (match && match[1]) {
        const addressText = match[1].trim();
        this.log(`✅ Trovato testo dopo "${marker}": "${addressText.substring(0, 100)}..."`);
        
        const address = this.extractAddressFromText(addressText);
        if (address) {
          this.log(`✅ Indirizzo estratto con marcatore "${marker}": ${address}`);
          return address;
        }
      }
    }
    
    return null;
  }

  // Nuovo metodo per ricerca nella sezione destinatario
  findAddressInDestinationSection(text) {
    this.log('📍 Ricerca nella sezione destinatario...');
    
    // Prima cerca la sezione completa destinatario/consegna fino a VETTORE
    const destinationSectionPattern = /(?:DESTINATARIO|LUOGO DI CONSEGNA)[:\s]*([\s\S]*?)(?=(?:VETTORE|TRASPORTATORE|PRODOTTI|Rif\.|PF\d+|ARTICOLI))/gi;
    
    const sectionMatch = text.match(destinationSectionPattern);
    if (sectionMatch && sectionMatch[1]) {
      const sectionText = sectionMatch[1];
      this.log(`📋 Sezione destinatario completa trovata: "${sectionText.substring(0, 200).replace(/\n/g, '\\n')}"`);
      
      // Estrai tutti gli indirizzi dalla sezione
      const addresses = this.extractAllAddressesFromText(sectionText);
      
      // Filtra e scegli il migliore
      for (const address of addresses) {
        if (!this.isVettoreAddress(address) && this.isValidAddress(address)) {
          this.log(`✅ Indirizzo destinatario valido: ${address}`);
          return address;
        }
      }
      
      // Se non trova con extractAllAddresses, prova con extractAddressFromText
      const address = this.extractAddressFromText(sectionText);
      if (address && !this.isVettoreAddress(address)) {
        this.log(`✅ Indirizzo destinatario estratto: ${address}`);
        return address;
      }
    }
    
    // Fallback: cerca pattern specifici per clienti
    const clientPatterns = [
      /LIBERA\s+SRL[:\s\n]*([\s\S]*?)(?=(?:VETTORE|Pagamento|Operatore|TRASPORT))/gi,
      /DESTINATARIO[:\s]*([\s\S]*?)(?=\n\s*(?:MITTENTE|TRASPORTATORE|VETTORE|CAUSALE|LUOGO|$))/gi,
      /DEST\.[:\s]*([\s\S]*?)(?=\n\s*(?:MITT\.|TRASPORTATORE|VETTORE|CAUSALE|$))/gi,
      /CLIENTE[:\s]*([\s\S]*?)(?=\n\s*(?:FORNITORE|VENDITORE|VETTORE|CAUSALE|$))/gi,
      // Pattern per struttura a due colonne
      /Cliente\s+Luogo di consegna\s*\n([\s\S]*?)(?=\n\s*(?:Pagamento|RIFERIMENTO|VETTORE|$))/gi
    ];
    
    for (const pattern of clientPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const sectionText = match[1];
        this.log(`📋 Sezione trovata con pattern alternativo: "${sectionText.substring(0, 150).replace(/\n/g, '\\n')}"`);
        
        // Estrai indirizzo dalla sezione
        const address = this.extractAddressFromText(sectionText);
        if (address && !this.isVettoreAddress(address)) {
          this.log(`✅ Indirizzo estratto dalla sezione: ${address}`);
          return address;
        }
      }
    }
    
    return null;
  }

  // Nuovo metodo per ricerca con pattern geografici
  findAddressByGeographicPatterns(text) {
    this.log('🌍 Ricerca con pattern geografici...');
    
    // Cerca nel testo dopo il nome del cliente
    const clientName = this._cache.client || this.extractClient();
    if (clientName) {
      const clientIndex = text.indexOf(clientName);
      if (clientIndex !== -1) {
        // Limita la ricerca
        let searchEnd = Math.min(clientIndex + 2000, text.length);
        const vettoreIndex = text.indexOf('Vettore', clientIndex);
        if (vettoreIndex !== -1 && vettoreIndex < searchEnd) {
          searchEnd = vettoreIndex;
        }
        
        const searchArea = text.substring(clientIndex + clientName.length, searchEnd);
        const address = this.extractAddressFromText(searchArea);
        if (address) {
          this.log(`✅ Indirizzo trovato dopo il cliente: ${address}`);
          return address;
        }
      }
    }
    
    // Ricerca globale nel documento
    return this.extractAddressFromText(text);
  }

  // Nuovo metodo per estrazione da testo
  extractAddressFromText(text) {
    if (!text) return null;
    
    // Pulisci il testo
    let cleanText = text
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    
    this.log(`🧹 Testo da analizzare per indirizzo: "${cleanText.substring(0, 300)}"`);
    
    // Pattern specifici per il formato del DDT analizzato
    const specificPatterns = [
      // Pattern per "VIA BIANDRATE, 28 28100 - NOVARA NO"
      /(VIA\s+[A-Z\s\,]+?)\s*,?\s*(\d+)\s+(\d{5})\s*-?\s*([A-Z\s]+?)\s+([A-Z]{2})\b/g,
      
      // Pattern per indirizzi con trattino nel CAP "28100 - NOVARA"
      /((?:VIA|CORSO|VIALE|PIAZZA)\s+[A-Z\s\,]+?)\s*,?\s*(\d+)?\s*(\d{5})\s*-\s*([A-Z\s]+?)\s+([A-Z]{2})\b/g,
      
      // Pattern standard migliorato
      /((?:VIA|CORSO|V\.?LE|VIALE|PIAZZA|P\.ZZA|STRADA|LOC\.|LOCALITA'?|FRAZ\.|FRAZIONE|BORGO)\s+[A-Z\s\.\,\'\-]+?)(?:[\s,]+(\d+(?:\/\d+)?(?:\s*[A-Z])?))?\s*[\s,]*(\d{5})\s+([A-Z][A-Z\s\-]+?)\s+([A-Z]{2})\b/g,
      
      // Pattern senza numero civico
      /((?:VIA|CORSO|V\.?LE|VIALE|PIAZZA|P\.ZZA|STRADA|LOC\.|LOCALITA'?)\s+[A-Z\s\.\,\'\-]+?)\s+(\d{5})\s+([A-Z][A-Z\s\-]+?)\s+([A-Z]{2})\b/g,
      
      // Pattern per prefisso attaccato (PIAZZADANTE → PIAZZA DANTE)
      /((?:VIA|CORSO|VIALE|PIAZZA|STRADA)[A-Z]+)\s*(\d+(?:\/\d+)?)?[\s,]*(\d{5})\s+([A-Z\s\-]+?)\s+([A-Z]{2})\b/g,
      
      // Pattern generico per qualsiasi sequenza che sembri un indirizzo
      /([A-Z][A-Z\s\.\,\'\-]+?)\s+(\d+(?:\/\d+)?)\s+(\d{5})\s+([A-Z][A-Z\s\-]+?)\s+([A-Z]{2})\b/g,
      
      // Pattern last resort - solo CAP + città + provincia
      /(\d{5})\s+([A-Z][A-Z\s\-]+?)\s+([A-Z]{2})\b/g
    ];
    
    for (let i = 0; i < specificPatterns.length; i++) {
      const pattern = specificPatterns[i];
      const matches = [...cleanText.matchAll(pattern)];
      
      this.log(`🎯 Pattern ${i + 1}: ${matches.length} match trovati`);
      
      for (const match of matches) {
        this.log(`🔍 Match trovato: ${JSON.stringify(match.slice(0, 6))}`);
        
        let address = this.formatSpecificAddress(match, i);
        if (address && this.isValidAddress(address) && !this.isVettoreAddress(address)) {
          this.log(`✅ Indirizzo valido estratto con pattern ${i + 1}: ${address}`);
          return address;
        }
      }
    }
    
    return null;
  }

  // Nuovo metodo per formattazione indirizzo specifico
  formatSpecificAddress(match, patternIndex) {
    let address = '';
    
    try {
      if (patternIndex === 0) {
        // Pattern per "VIA BIANDRATE, 28 28100 - NOVARA NO"
        const street = match[1].replace(/,$/, '').trim();
        const number = match[2] || '';
        const cap = match[3];
        const city = match[4].replace(/\s*-\s*/, '').trim(); // Rimuovi trattino
        const province = match[5];
        
        address = `${street}${number ? ', ' + number : ''} ${cap} ${city} ${province}`;
        
      } else if (patternIndex === 1) {
        // Pattern con trattino nel CAP
        const street = match[1].replace(/,$/, '').trim();
        const number = match[2] || '';
        const cap = match[3];
        const city = match[4].trim();
        const province = match[5];
        
        address = `${street}${number ? ', ' + number : ''} ${cap} ${city} ${province}`;
        
      } else if (patternIndex === 2 || patternIndex === 3) {
        // Pattern standard - usa formatAddress originale
        return this.formatAddress(match, patternIndex - 2);
        
      } else if (patternIndex === 4) {
        // Pattern prefisso attaccato
        const streetWithPrefix = match[1];
        const number = match[2] || '';
        const cap = match[3];
        const city = match[4].trim();
        const province = match[5];
        
        // Separa prefisso dal nome
        const street = this.separateStreetPrefix(streetWithPrefix);
        address = `${street}${number ? ', ' + number : ''} ${cap} ${city} ${province}`;
        
      } else if (patternIndex === 5) {
        // Pattern generico
        const street = match[1].trim();
        const number = match[2];
        const cap = match[3];
        const city = match[4].trim();
        const province = match[5];
        
        address = `${street}, ${number} ${cap} ${city} ${province}`;
        
      } else if (patternIndex === 6) {
        // Pattern last resort - solo CAP + città + provincia
        const cap = match[1];
        const city = match[2].trim();
        const province = match[3];
        
        address = `${cap} ${city} ${province}`;
      }
      
      // Pulizia finale
      address = address
        .replace(/\s+/g, ' ')
        .replace(/,\s*,/g, ',') // Rimuovi virgole doppie
        .trim();
      
      return address;
      
    } catch (error) {
      this.log(`❌ Errore formattazione indirizzo specifico: ${error.message}`);
      return null;
    }
  }

  // Metodo per formattazione indirizzo standard
  formatAddress(match, patternIndex) {
    let address = '';
    
    try {
      if (patternIndex === 0) {
        // Pattern completo
        const street = this.formatStreetName(match[1]);
        const number = match[2] || '';
        const cap = match[3];
        const city = match[4].trim();
        const province = match[5];
        
        address = `${street}${number ? ', ' + number : ''} ${cap} ${city} ${province}`;
        
      } else if (patternIndex === 1) {
        // Pattern senza numero
        const street = this.formatStreetName(match[1]);
        const cap = match[2];
        const city = match[3].trim();
        const province = match[4];
        
        address = `${street} ${cap} ${city} ${province}`;
        
      } else if (patternIndex === 2) {
        // Pattern prefisso attaccato
        const streetWithPrefix = match[1];
        const number = match[2] || '';
        const cap = match[3];
        const city = match[4].trim();
        const province = match[5];
        
        // Separa prefisso dal nome
        const street = this.separateStreetPrefix(streetWithPrefix);
        address = `${street}${number ? ', ' + number : ''} ${cap} ${city} ${province}`;
        
      } else if (patternIndex === 3) {
        // Pattern generico
        const street = match[1].trim();
        const number = match[2];
        const cap = match[3];
        const city = match[4].trim();
        const province = match[5];
        
        address = `${street}, ${number} ${cap} ${city} ${province}`;
        
      } else if (patternIndex === 4) {
        // Pattern last resort - solo CAP + città + provincia
        const cap = match[1];
        const city = match[2].trim();
        const province = match[3];
        
        address = `${cap} ${city} ${province}`;
      }
      
      return address.replace(/\s+/g, ' ').trim();
      
    } catch (error) {
      this.log(`❌ Errore formattazione indirizzo: ${error.message}`);
      return null;
    }
  }

  // Metodi helper per formattazione
  formatStreetName(street) {
    return street
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\.$/, ''); // Rimuovi punto finale
  }

  separateStreetPrefix(streetWithPrefix) {
    // PIAZZADANTE → PIAZZA DANTE
    return streetWithPrefix.replace(/^(VIA|CORSO|VIALE|PIAZZA|STRADA)([A-Z]+)/i, '$1 $2');
  }

  isValidAddress(address) {
    if (!address || address.length < 15) return false;
    
    // Deve contenere CAP italiano
    if (!/\d{5}/.test(address)) {
      this.log(`❌ Indirizzo senza CAP: ${address}`);
      return false;
    }
    
    // Deve contenere una via/corso/piazza
    if (!/(?:VIA|CORSO|VIALE|PIAZZA|STRADA|V\.LE|LOC\.|BORGO)/i.test(address)) {
      this.log(`❌ Indirizzo senza prefisso stradale: ${address}`);
      return false;
    }
    
    // Non deve essere solo numeri
    if (/^\d+\s*$/.test(address)) return false;
    
    // Non deve contenere solo la provincia
    if (/^[A-Z]{2}\s*$/.test(address)) return false;
    
    // Non deve contenere parole del vettore
    const vettoreWords = ['SAFFIRIO', 'SUPEJA', 'GALLINO', 'NONE TO', 'TRASPORT', 'VETTORE', 'CORRIERE'];
    const upperAddress = address.toUpperCase();
    for (const word of vettoreWords) {
      if (upperAddress.includes(word)) {
        this.log(`❌ Indirizzo contiene parola vettore: ${word}`);
        return false;
      }
    }
    
    this.log(`✅ Indirizzo validato: ${address}`);
    return true;
  }

  cleanAndValidateAddress(address, clientName) {
    if (!address) return null;
    
    // Pulizia finale
    address = address
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/,$/, ''); // Rimuovi virgola finale
    
    // Validazione
    if (!this.isValidAddress(address)) {
      this.log(`❌ Indirizzo non valido: "${address}"`);
      return null;
    }
    
    // Controllo casi speciali BOREALE
    address = this.checkAndReplaceBorealeAddress(address, clientName);
    
    return address;
  }

  // Nuovo metodo per estrarre indirizzo cliente (fallback)
  extractClientAddress() {
    this.log('🔄 Tentativo estrazione indirizzo cliente come fallback...');
    
    const clientName = this._cache.client || this.extractClient();
    if (!clientName) return null;
    
    // Cerca l'indirizzo vicino al nome del cliente
    const clientIndex = this.text.indexOf(clientName);
    if (clientIndex === -1) return null;
    
    // Cerca nelle prossime 500 caratteri
    const searchArea = this.text.substring(clientIndex, Math.min(clientIndex + 500, this.text.length));
    
    // Pattern per indirizzo subito dopo il cliente
    const addressPattern = /((?:VIA|CORSO|V\.LE|VIALE|PIAZZA)\s+[^\n]+)\s*\n\s*(\d{5})\s*[-\s]*([A-Z\s]+)\s+([A-Z]{2})/i;
    const match = searchArea.match(addressPattern);
    
    if (match) {
      const street = match[1].trim();
      const cap = match[2];
      const city = match[3].trim();
      const province = match[4];
      
      const address = `${street} ${cap} ${city} ${province}`;
      this.log(`✅ Indirizzo cliente trovato: ${address}`);
      return address;
    }
    
    return null;
  }

  // Metodo per estrarre tutti gli indirizzi da un testo
  extractAllAddressesFromText(text) {
    const addresses = [];
    
    if (!text) return addresses;
    
    // Dividi il testo in righe e cerca indirizzi
    const lines = text.split('\n');
    let currentAddress = '';
    let lastWasStreet = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const upperLine = line.toUpperCase();
      
      // Controlla se la riga contiene un prefisso stradale
      const hasStreetPrefix = /^(VIA|CORSO|V\.?LE|VIALE|PIAZZA|STRADA|LOC\.|BORGO)\s+/i.test(upperLine);
      
      if (hasStreetPrefix) {
        // Se c'era un indirizzo precedente incompleto, salvalo se valido
        if (currentAddress) {
          const cleanAddress = currentAddress.trim().replace(/\s+/g, ' ');
          if (this.isValidAddress(cleanAddress)) {
            addresses.push(cleanAddress);
          }
        }
        // Inizia un nuovo indirizzo
        currentAddress = upperLine;
        lastWasStreet = true;
      } else if (lastWasStreet && /\d{5}/.test(upperLine)) {
        // Se la riga precedente era una via e questa contiene un CAP
        currentAddress += ' ' + upperLine;
        
        // Controlla se abbiamo un indirizzo completo
        const cleanAddress = currentAddress.trim().replace(/\s+/g, ' ');
        if (this.isValidAddress(cleanAddress)) {
          addresses.push(cleanAddress);
          currentAddress = '';
          lastWasStreet = false;
        }
      } else if (currentAddress && /^[A-Z\s\-]+\s+[A-Z]{2}$/.test(upperLine)) {
        // Se abbiamo già via e CAP, e questa riga sembra città + provincia
        currentAddress += ' ' + upperLine;
        const cleanAddress = currentAddress.trim().replace(/\s+/g, ' ');
        if (this.isValidAddress(cleanAddress)) {
          addresses.push(cleanAddress);
        }
        currentAddress = '';
        lastWasStreet = false;
      } else {
        lastWasStreet = false;
      }
    }
    
    // Controlla l'ultimo indirizzo accumulato
    if (currentAddress) {
      const cleanAddress = currentAddress.trim().replace(/\s+/g, ' ');
      if (this.isValidAddress(cleanAddress)) {
        addresses.push(cleanAddress);
      }
    }
    
    // Prova anche con pattern regex sul testo completo
    const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').toUpperCase();
    const patterns = [
      /((?:VIA|CORSO|V\.?LE|VIALE|PIAZZA)\s+[A-Z\s\,]+?)\s*,?\s*(\d+)?\s*(\d{5})\s*-?\s*([A-Z\s]+?)\s+([A-Z]{2})\b/g,
      /((?:VIA|CORSO|VIALE|PIAZZA|STRADA)\s+[A-Z\s\.\,\'\-]+?)\s*,?\s*(\d+(?:\/\d+)?)\s*(\d{5})\s+([A-Z\s\-]+?)\s+([A-Z]{2})\b/g
    ];
    
    for (const pattern of patterns) {
      const matches = [...cleanText.matchAll(pattern)];
      for (const match of matches) {
        let address = '';
        if (match[1]) {
          address = match[1].trim();
          if (match[2]) address += ', ' + match[2];
          if (match[3]) address += ' ' + match[3];
          if (match[4]) address += ' ' + match[4].trim();
          if (match[5]) address += ' ' + match[5];
        }
        
        address = address.replace(/\s+/g, ' ').trim();
        if (this.isValidAddress(address) && !addresses.includes(address)) {
          addresses.push(address);
        }
      }
    }
    
    this.log(`📍 Indirizzi trovati nel testo: ${addresses.length}`);
    addresses.forEach((addr, i) => {
      this.log(`  ${i + 1}. ${addr}`);
    });
    
    return addresses;
  }

  extractDeliveryDate() {
    // Per DDT, data consegna = data documento
    // Usa il valore dalla cache se disponibile per evitare log duplicati
    if (this._cache.date !== undefined) {
      return this._cache.date;
    }
    return this.extractDate();
  }

  extractArticles() {
    this.log('🔍 Inizio estrazione articoli...');
    const articles = [];
    const words = this.text.split(/\s+/);
    
    // Pattern per identificare codici prodotto dinamicamente
    // Formati: 6 cifre, DL+6 cifre, VS+6 cifre, PS+6 cifre, GF+6 cifre, PF+6 cifre, o codice+lettere
    // Escludi numeri di lotto che sono 6 cifre ma seguono "Lotto:" o "scad."
    const isProductCode = (word, prevWord) => {
      // Escludi se la parola precedente è "Lotto:" o se siamo dopo "scad."
      if (prevWord && (prevWord.includes('Lotto') || prevWord === 'scad.')) {
        return false;
      }
      // Pattern per codici prodotto validi (inclusi PIRR002, PIRR003, PIRR004)
      return /^(\d{6}|[A-Z]{2}\d{6}|[A-Z]{2}\d{6}[A-Z]+|\d{6}[A-Z]+|PIRR\d{3})$/.test(word);
    };
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const prevWord = i > 0 ? words[i-1] : '';
      
      if (isProductCode(word, prevWord)) {
        try {
          // Cerca "PZ", "KG", "CF" dopo il codice
          let unitIndex = -1;
          let unit = '';
          for (let j = i + 1; j < Math.min(i + 20, words.length); j++) {
            if (['PZ', 'KG', 'CF', 'LT', 'MT', 'CT'].includes(words[j])) {
              unitIndex = j;
              unit = words[j];
              break;
            }
          }
          
          if (unitIndex === -1) continue;
          
          // Estrai descrizione (tra codice e unità)
          const description = words.slice(i + 1, unitIndex).join(' ');
          
          // Estrai dati dopo unità: quantità, prezzo, importo, iva
          if (unitIndex + 1 < words.length) {
            const quantity = parseInt(words[unitIndex + 1]) || 0;
            
            // Cerca eventuali prezzi e totali dopo la quantità
            let price = '0.00';
            let total = '0.00';
            let vat_rate = '10%'; // Default
            
            // Cerca prezzi nelle posizioni successive
            if (unitIndex + 2 < words.length) {
              const possiblePrice = this.cleanNumber(words[unitIndex + 2]);
              if (possiblePrice > 0) {
                price = possiblePrice.toFixed(2);
              }
            }
            
            if (unitIndex + 3 < words.length) {
              const possibleTotal = this.cleanNumber(words[unitIndex + 3]);
              if (possibleTotal > 0) {
                total = possibleTotal.toFixed(2);
              }
            }
            
            // Cerca codice IVA (04, 10, etc.)
            // Nel DDT ALFIERI il codice IVA è dopo l'importo
            for (let j = unitIndex + 3; j < Math.min(unitIndex + 6, words.length); j++) {
              const possibleIvaCode = words[j];
              if (possibleIvaCode === '04' || possibleIvaCode === '4') {
                vat_rate = '4%';
                this.log(`   IVA 4% trovata per ${word}`);
                break;
              } else if (possibleIvaCode === '10') {
                vat_rate = '10%';
                this.log(`   IVA 10% trovata per ${word}`);
                break;
              } else if (possibleIvaCode === '22') {
                vat_rate = '22%';
                this.log(`   IVA 22% trovata per ${word}`);
                break;
              }
            }
            
            if (quantity > 0 && description.length > 2) {
              const article = {
                code: word,
                description: description.trim(),
                quantity: quantity.toString(),
                unit: unit,
                price: price,
                total: total,
                iva: vat_rate
              };
              
              articles.push(article);
              this.log(`✅ Articolo trovato: ${article.code} - ${article.description} - ${article.quantity} ${article.unit}`);
            }
          }
          
        } catch (error) {
          this.log(`❌ Errore parsing articolo ${word}: ${error.message}`);
        }
      }
    }
    
    this.log(`📊 Totale articoli estratti: ${articles.length}`);
    return articles;
  }

  extractDocumentTotal() {
    this.log('💰 Ricerca totale documento...');
    
    // Pattern per trovare il totale documento
    // Nel DDT ALFIERI il totale è nell'ultima sezione
    const patterns = [
      /Totale\s+documento\s+€\s*([\d.,]+)/i,
      /TOTALE\s+DOCUMENTO\s*:?\s*€?\s*([\d.,]+)/i,
      /Totale\s+€\s*([\d.,]+)/i,
      /€\s*([\d.,]+)\s*(?:FRANCO|Totale)/i,
      // Pattern per totale alla fine del documento (es. "3 122,67" o "3 120,18")
      /\d+\s+([\d.,]+)\s*$/,
      /Peso\s+Lordo\s+Porto\s+Spese\s+Tra?porto\s+Totale\s+documento\s+€[^0-9]*([\d.,]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = this.text.match(pattern);
      if (match) {
        const total = this.cleanNumber(match[1]);
        this.log(`💰 Totale documento trovato: €${total.toFixed(2)}`);
        return total;
      }
    }
    
    this.log('❌ Totale documento non trovato');
    return 0;
  }

  calculateTotals(items) {
    let subtotal = 0;
    let vat4 = 0;  // IVA al 4%
    let vat10 = 0; // IVA al 10%
    let totalVat = 0;
    
    if (items && items.length > 0) {
      items.forEach(item => {
        // Nel DDT gli importi sono IMPONIBILI (senza IVA)
        const itemImponibile = this.cleanNumber(item.total);
        
        // Aggiungiamo l'imponibile al subtotale
        subtotal += itemImponibile;
        
        // Calcoliamo l'IVA da aggiungere
        let itemVat = 0;
        
        // Determina l'aliquota IVA dall'oggetto item
        const vatRate = item.iva || '10%';
        
        if (vatRate === '4%' || vatRate === '04' || vatRate === 4) {
          // Calcolo IVA 4%
          itemVat = itemImponibile * 0.04;
          vat4 += itemVat;
        } else if (vatRate === '10%' || vatRate === '10' || vatRate === 10) {
          // Calcolo IVA 10%
          itemVat = itemImponibile * 0.10;
          vat10 += itemVat;
        } else {
          // Default al 10% se non riconosciuta
          itemVat = itemImponibile * 0.10;
          vat10 += itemVat;
        }
        
        totalVat += itemVat;
      });
    }
    
    this.log(`💰 Calcolo totali:`);
    this.log(`   Imponibile: €${subtotal.toFixed(2)}`);
    if (vat4 > 0) this.log(`   IVA 4%: €${vat4.toFixed(2)}`);
    if (vat10 > 0) this.log(`   IVA 10%: €${vat10.toFixed(2)}`);
    this.log(`   IVA Totale: €${totalVat.toFixed(2)}`);
    this.log(`   Totale calcolato: €${(subtotal + totalVat).toFixed(2)}`);
    
    // Log dettaglio prodotti per debug
    this.log(`📊 Dettaglio calcolo per prodotto:`);
    items.forEach((item, idx) => {
      const imponibile = this.cleanNumber(item.total);
      const aliquota = item.iva || '10%';
      const iva = aliquota === '4%' ? imponibile * 0.04 : imponibile * 0.10;
      this.log(`   [${idx+1}] ${item.code}: imponibile €${imponibile.toFixed(2)} + IVA ${aliquota} €${iva.toFixed(2)} = €${(imponibile + iva).toFixed(2)}`);
    });
    
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      vat: parseFloat(totalVat.toFixed(2)),
      vat4: parseFloat(vat4.toFixed(2)),
      vat10: parseFloat(vat10.toFixed(2)),
      total: parseFloat((subtotal + totalVat).toFixed(2))
    };
  }
}
