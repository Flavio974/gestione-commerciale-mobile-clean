/**
 * DDTFT Import Extractors Module
 * Contiene tutte le funzioni di estrazione dati dai documenti
 */

export const DDTFTImportExtractors = {
  /**
   * Estrai numero documento
   */
  extractDocumentNumber: function(text, type) {
    if (type === 'DDT') {
      const patterns = [
        /DDT\s+(\d+)\s+\d{2}\/\d{2}\/\d{2}/i,
        /D\.D\.T\.\s+(\d+)/i,
        /DOCUMENTO\s+DI\s+TRASPORTO\s*N[°.]?\s*(\d+)/i
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
      }
    } else if (type === 'Fattura') {
      const patterns = [
        /FATTURA\s*N[°.]?\s*(\d+)/i,
        /FT\s+(\d+)/i,
        /INVOICE\s*N[°.]?\s*(\d+)/i
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
      }
    }
    
    return '';
  },

  /**
   * Estrai data
   */
  extractDate: function(text) {
    const patterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /DATA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /DEL[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let date = match[1];
        // Normalizza il formato
        date = date.replace(/\-/g, '/');
        
        // Se l'anno ha solo 2 cifre, aggiungi 20
        const parts = date.split('/');
        if (parts.length === 3 && parts[2].length === 2) {
          parts[2] = '20' + parts[2];
          date = parts.join('/');
        }
        
        return date;
      }
    }
    
    return '';
  },

  /**
   * Estrai nome cliente - VERSIONE MIGLIORATA per gestire nomi multi-riga e layout a colonne
   */
  extractClientName: function(text) {
    console.log('=== ESTRAZIONE NOME CLIENTE (DDT/FT) ===');
    
    // STEP 1: Rileva se è template FTV vuoto
    const isTemplateVuoto = text.includes("Spett.le") && 
                           text.includes("Luogo di consegna") &&
                           text.includes("MAGLIANO ALFIERI") &&
                           !text.includes("VIA FONTANA") && // Non ha indirizzo cliente reale
                           !text.includes("14100 ASTI AT"); // Non ha città cliente reale
    
    if (isTemplateVuoto) {
        console.log("🎯 Template FTV vuoto rilevato - usando lookup ODV");
        return null; // Non estrarre dal contenuto, usa ODV lookup
    }
    
    // Prima prova con i pattern semplici per compatibilità
    const simplePatterns = [
      /DESTINATARIO[:\s]+([^\n]+)/i,
      /CLIENTE[:\s]+([^\n]+)/i,
      /RAGIONE\s+SOCIALE[:\s]+([^\n]+)/i
    ];

    for (const pattern of simplePatterns) {
      const match = text.match(pattern);
      if (match) {
        const extracted = match[1].trim();
        // Verifica che non sia solo "Luogo"
        if (!extracted.match(/^Luogo$/i)) {
          console.log(`✅ Trovato con pattern semplice: "${extracted}"`);
          return extracted;
        }
      }
    }
    
    // NUOVO: Gestione speciale per layout a due colonne
    // Cerca "Spett.le" seguito da tabulazioni/spazi e poi "Luogo di consegna" sulla stessa riga
    const twoColumnPattern = /Spett(?:\.le|abile)\s*(\t+|\s{4,})Luogo\s+di\s+consegna/i;
    const twoColMatch = text.match(twoColumnPattern);
    if (twoColMatch) {
      console.log('📊 Rilevato layout a due colonne (Spett.le | Luogo di consegna)');
      
      // In questo caso, il nome cliente dovrebbe essere nelle righe successive sotto "Spett.le"
      const afterSpett = text.substring(twoColMatch.index + 'Spett.le'.length);
      const lines = afterSpett.split('\n');
      const clientLines = [];
      
      for (let i = 1; i < lines.length && i < 6; i++) { // Salta la prima riga e controlla max 5 righe
        const line = lines[i];
        
        // Se la riga contiene tabulazioni, prendi solo la parte sinistra (prima colonna)
        let leftColumn = line;
        if (line.includes('\t')) {
          leftColumn = line.split('\t')[0];
        } else if (line.match(/\s{4,}/)) {
          // Se ci sono 4 o più spazi consecutivi, potrebbero separare le colonne
          leftColumn = line.split(/\s{4,}/)[0];
        }
        
        leftColumn = leftColumn.trim();
        
        // Verifica se è una riga valida per il nome cliente
        if (leftColumn && 
            !leftColumn.match(/^(VIA|V\.LE|CORSO|PIAZZA|P\.IVA|\d{5})/i) &&
            !leftColumn.match(/^Luogo/i)) {
          clientLines.push(leftColumn);
          console.log(`✅ Estratto da colonna sinistra: "${leftColumn}"`);
          
          // Continua se sembra incompleto
          if (!leftColumn.match(/(&|E|DI)$/i) && 
              leftColumn.match(/(S\.R\.L\.|SRL|S\.P\.A\.|SPA|SNC|SAS)$/i)) {
            break; // Nome completo con forma societaria
          }
        } else if (leftColumn.match(/^(VIA|V\.LE|CORSO|PIAZZA|\d{5})/i)) {
          console.log(`🛑 Stop: indirizzo trovato "${leftColumn}"`);
          break;
        }
      }
      
      if (clientLines.length > 0) {
        const fullName = clientLines.join(' ').replace(/\s+/g, ' ').trim();
        console.log(`📝 Nome cliente da layout colonne: "${fullName}"`);
        if (fullName && fullName !== 'Luogo') {
          return fullName;
        }
      }
    }
    
    // Usa la logica standard per "Spett.le" con gestione multi-riga
    const spettMatch = text.match(/Spett(?:\.le|abile)\s*/i);
    if (spettMatch) {
      const spettIndex = spettMatch.index;
      const startIndex = spettMatch.index + spettMatch[0].length;
      
      // IMPORTANTE: Trova "Luogo di consegna" per delimitare l'area di ricerca
      const luogoMatch = text.match(/Luogo\s+di\s+consegna/i);
      let endIndex = text.length;
      
      if (luogoMatch) {
        console.log(`📍 "Luogo di consegna" trovato all'indice ${luogoMatch.index}`);
        
        // Se "Luogo di consegna" è sulla stessa riga di "Spett.le" (entro 50 caratteri)
        if (luogoMatch.index - spettIndex < 50) {
          console.log('⚠️ "Luogo di consegna" sulla stessa riga di "Spett.le"');
          // In questo caso, ignora "Luogo di consegna" e cerca il nome nelle righe successive
          // Non limitiamo endIndex
        } else {
          // "Luogo di consegna" è probabilmente in una sezione separata, usa come limite
          endIndex = luogoMatch.index;
        }
      }
      
      const contextText = text.substring(startIndex, endIndex);
      
      // Dividi in righe per analisi riga per riga
      const lines = contextText.split('\n');
      const clientLines = [];
      
      console.log(`📋 Analizzando ${lines.length} righe dopo "Spett.le"`);
      
      // Funzione helper per verificare se una riga è una condizione di stop
      const isStopLine = (line) => {
        const addressPatterns = [
          /^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZZA|LARGO|LOCALITA'|LOC\.)/i,
          /^P\.?\s*IVA/i,
          /^PARTITA\s+IVA/i,
          /^C\.?F\.?/i,
          /^\d{5}\s+/i,
          /^TEL\.?/i,
          /^FAX/i
        ];
        return addressPatterns.some(pattern => pattern.test(line));
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
          processedLine = line.replace(/^Luogo\s+/i, '').trim();
          console.log(`📍 Rimosso "Luogo " -> "${processedLine}"`);
        }
        
        // Se la riga contiene tabulazioni, prendi solo la prima parte (colonna sinistra)
        if (processedLine.includes('\t')) {
          processedLine = processedLine.split('\t')[0].trim();
          console.log(`📊 Estratto da colonna sinistra: "${processedLine}"`);
        }
        
        // Non aggiungere se è rimasto solo "Luogo"
        if (processedLine && !processedLine.match(/^Luogo$/i)) {
          clientLines.push(processedLine);
          console.log(`✅ Aggiunta riga ${i + 1}: "${processedLine}"`);
          
          // Continua se finisce con & o sembra incompleto
          const shouldContinue = processedLine.endsWith('&') || 
                                processedLine.endsWith('FRUTTA') ||
                                processedLine.endsWith('E') ||
                                (i + 1 < lines.length && 
                                 lines[i + 1].trim() && 
                                 !isStopLine(lines[i + 1].trim()) &&
                                 !processedLine.match(/(S\.R\.L\.|SRL|S\.P\.A\.|SPA|SNC|SAS)\s*$/i));
          
          if (!shouldContinue) {
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
      
      // Validazione finale: assicurati che non sia solo "Luogo" o testo di avvertenza
      if (fullName.match(/^Luogo$/i)) {
        console.log('⚠️ ATTENZIONE: Nome estratto è solo "Luogo", scarto');
      } else if (fullName.includes('Attenzione!!') || 
                 fullName.includes('Controllare la merce') ||
                 fullName.includes('fare riserva in bolla')) {
        console.log('⚠️ ATTENZIONE: Nome estratto è un avvertimento, scarto');
      } else if (fullName) {
        return fullName;
      }
    }

    // Fallback: cerca aziende con forma giuridica
    const companyPattern = /\b([A-Z][A-Z\s\.\&\']+?)\s+(S\.R\.L\.|SRL|S\.P\.A\.|SPA|S\.N\.C\.|SNC|S\.A\.S\.|SAS)\b/gi;
    const companies = [];
    let companyMatch;
    
    while ((companyMatch = companyPattern.exec(text)) !== null) {
      const company = companyMatch[0].trim();
      // Escludi l'azienda emittente
      if (!company.match(/ALFIERI|ALIMENTARI/i)) {
        companies.push(company);
      }
    }
    
    if (companies.length > 0) {
      console.log(`📌 Trovato con pattern forma giuridica: "${companies[0]}"`);
      return companies[0];
    }
    
    console.log('❌ Nessun nome cliente trovato');
    return '';
  },

  /**
   * Estrai P.IVA
   */
  extractVatNumber: function(text) {
    const match = text.match(/P(?:ARTITA)?\.?\s*IVA[:\s]*(\d{11})/i);
    return match ? match[1] : '';
  },

  /**
   * Debug avanzato per estrazione indirizzi
   */
  debugAddressExtraction: function(text, fileName, clientName) {
    console.log(`🔍 === DEBUG INDIRIZZO per ${clientName} ===`);
    
    // Import delle dipendenze necessarie
    const isAlfieriAddress = (address) => {
      if (!address) return false;
      
      const alfieriKeywords = [
        'MARCONI',
        'MAGLIANO ALFIERI',
        'MAGLIANO',
        'ALFIERI',
        'C.SO G. MARCONI',
        'CORSO MARCONI',
        'G. MARCONI',
        '12050',
        'CN)',
        '(CN)',
        '10/E'
      ];
      
      const upperAddress = address.toUpperCase();
      return alfieriKeywords.some(keyword => upperAddress.includes(keyword));
    };
    
    // Mostra TUTTI gli indirizzi trovati
    const addressPattern = /((?:VIA|P\.?ZA|PIAZZA|CORSO|C\.SO|VIALE|V\.LE)\s+[A-Z\s,'\.]+\d+[\s\S]*?\d{5}\s+[A-Z\s']+\s+[A-Z]{2})/gi;
    const allAddresses = [...text.matchAll(addressPattern)];
    
    console.log(`Trovati ${allAddresses.length} indirizzi totali:`);
    allAddresses.forEach((match, i) => {
      const addr = match[1].trim().replace(/\s+/g, ' ');
      const isAlfieri = isAlfieriAddress(addr);
      console.log(`  ${i+1}. ${isAlfieri ? '❌ ALFIERI' : '✅ CLIENTE'}: "${addr}"`);
    });
    
    // Verifica sezioni specifiche
    const alfieriIndex = text.indexOf('ALFIERI SPECIALITA');
    const luogoIndex = text.indexOf('Luogo di consegna');
    
    console.log(`Posizioni nel testo: Luogo=${luogoIndex}, Alfieri=${alfieriIndex}`);
  },

  /**
   * Estrai indirizzo consegna con precisione migliorata
   */
  extractDeliveryAddress: function(text, fileName, clientName) {
    console.log("🚚 === ESTRAZIONE INDIRIZZO DI CONSEGNA PRECISIONE ===");
    
    // Debug per clienti problematici
    if (clientName && (clientName.includes('Mandria') || clientName.includes('Arudi'))) {
      this.debugAddressExtraction(text, fileName, clientName);
    }
    
    // Determina tipo documento
    const isFatturaCompleta = fileName && fileName.includes('FT') && !fileName.includes('FTV');
    const isTemplateVuoto = fileName && fileName.includes('FTV');
    const isDDT = fileName && (fileName.includes('DDT') || (!fileName.includes('FT') && !fileName.includes('FTV')));
    
    // Se è un DDT, usa il metodo specifico per DDT
    if (isDDT) {
      console.log("📦 DDT rilevato - uso estrazione specifica DDT");
      const address = this.extractDeliveryAddressDDT(text);
      if (address) return address;
    }
    
    if (isFatturaCompleta) {
      // Fattura completa - estrai dalla sezione "Luogo di consegna"
      console.log("📄 Fattura FT completa - estrazione da sezione consegna");
      const address = this.extractFromDeliverySection(text);
      if (address) return address;
    }
    
    if (isTemplateVuoto) {
      // Prova prima il metodo specifico FTV
      const addressFTV = this.extractDeliveryFromFTV(text, fileName);
      if (addressFTV) return addressFTV;
      
      // Template vuoto - prova prima mapping da codice interno
      console.log("🎯 Template FTV vuoto - lookup da codice interno");
      const addressFromCode = this.extractDeliveryFromInternalCode(fileName);
      if (addressFromCode) return addressFromCode;
      
      // Se non trova da codice interno, prova con ODV
      console.log("🔍 Tentativo con ODV");
      const address = this.extractDeliveryFromODV(text);
      if (address) return address;
    }
    
    // Fallback: prova pattern standard
    console.log("⚠️ Uso pattern standard di fallback");
    return this.extractDeliveryBackupPatterns(text);
  },

  /**
   * Estrazione da sezione "Luogo di consegna" per fatture FT
   */
  extractFromDeliverySection: function(text) {
    console.log("📍 Estrazione da sezione consegna");
    
    // Implementazione separata per validazione
    const validateDeliveryAddress = (address) => {
      if (!address) return false;
      
      // ESCLUSIONE RIGOROSA Alfieri
      const isAlfieriAddress = (addr) => {
        if (!addr) return false;
        
        const alfieriKeywords = [
          'MARCONI',
          'MAGLIANO ALFIERI',
          'MAGLIANO',
          'ALFIERI',
          'C.SO G. MARCONI',
          'CORSO MARCONI',
          'G. MARCONI',
          '12050',
          'CN)',
          '(CN)',
          '10/E'
        ];
        
        const upperAddress = addr.toUpperCase();
        return alfieriKeywords.some(keyword => upperAddress.includes(keyword));
      };
      
      if (isAlfieriAddress(address)) {
        console.log(`❌ RIFIUTATO indirizzo Alfieri: ${address}`);
        return false;
      }
      
      // Deve contenere almeno un tipo di strada
      const hasStreetType = /(?:VIA|V\.LE|VIALE|CORSO|C\.SO|P\.ZA|PIAZZA|STRADA|STR\.)/i.test(address);
      
      // Deve avere un numero civico (più flessibile)
      const hasNumber = /\d+[A-Z]?\s*(?:\/|$|\s|\d{5})/i.test(address);
      
      // Deve avere CAP o essere un indirizzo riconosciuto
      const hasCap = /\d{5}/.test(address);
      
      if (!hasStreetType) {
        console.log(`❌ RIFIUTATO tipo strada mancante: ${address}`);
        return false;
      }
      
      if (!hasNumber && !hasCap) {
        console.log(`❌ RIFIUTATO numero civico e CAP mancanti: ${address}`);
        return false;
      }
      
      console.log(`✅ VALIDATO indirizzo consegna: ${address}`);
      return hasStreetType && (hasNumber || hasCap);
    };
    
    // Per FTV, cerca il nome cliente e l'indirizzo nella parte superiore destra
    // Pattern per trovare il cliente dopo "Spett.le" e prima di "FT"
    const clientSection = text.match(/Spett\.le\s*\n([^]*?)(?:FT\s+\d+|Tipo documento)/i);
    
    if (clientSection) {
      const section = clientSection[1];
      const lines = section.split('\n').filter(line => line.trim());
      
      console.log("📋 Sezione cliente trovata, analisi righe...");
      
      // Cerca l'indirizzo dopo il nome cliente
      let addressParts = [];
      let foundClient = false;
      let clientName = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Salta righe vuote o con info Alfieri
        if (!line || line.includes('ALFIERI') || line.includes('www.') || line.includes('Luogo di consegna')) {
          continue;
        }
        
        // Prima riga dopo Spett.le è probabilmente il nome cliente
        if (!foundClient && line.match(/^[A-Z]/)) {
          // Potrebbe essere su più righe
          clientName = line;
          foundClient = true;
          
          // Se la riga successiva continua il nome (es. "GOIA E. E CAPRA S. S.S.")
          if (i + 1 < lines.length && lines[i + 1].match(/^[A-Z]/) && !lines[i + 1].match(/^(VIA|CORSO|P\.ZA)/i)) {
            clientName += ' ' + lines[i + 1].trim();
            i++; // Salta la prossima riga
          }
          
          console.log("👤 Cliente trovato:", clientName);
          continue;
        }
        
        // Dopo il cliente, cerca l'indirizzo
        if (foundClient) {
          // Indirizzo (VIA, CORSO, etc.)
          if (line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|P\.ZA|PIAZZA|STRADA)/i)) {
            addressParts.push(line);
          } 
          // CAP e città
          else if (line.match(/^\d{5}\s+/)) {
            addressParts.push(line);
            break; // Abbiamo trovato tutto
          }
        }
      }
      
      if (addressParts.length > 0) {
        const address = addressParts.join(' ').trim();
        if (validateDeliveryAddress(address)) {
          console.log("✅ Indirizzo trovato da sezione cliente:", address);
          return address;
        }
      }
    }
    
    // Fallback: metodo originale per FT complete
    const alfieriPattern = /ALFIERI\s+SPECIALITA[\'']?\s+ALIMENTARI\s+S\.P\.A\./i;
    const alfieriMatch = text.match(alfieriPattern);
    
    if (!alfieriMatch) {
      console.log("❌ Sezione ALFIERI non trovata");
      return null;
    }
    
    // Implementation continua...
    return null;
  },

  /**
   * Lookup da codice interno per template FTV
   */
  extractDeliveryFromInternalCode: function(fileName) {
    const codeMatch = fileName.match(/FTV_(\d+)_/);
    if (!codeMatch) return null;
    
    const internalCode = codeMatch[1];
    
    // Mapping codice interno → Indirizzo di Consegna (DATI REALI DALLE FATTURE)
    const INTERNAL_CODE_DELIVERY_MAPPING = {
      '701029': 'VIA CAVOUR, 61 14100 ASTI AT',                    // Piemonte Carni
      '701134': 'VIA FONTANA, 4 14100 ASTI AT',                    // Il Gusto  
      '701168': 'VIA REPERGO, 40 14057 ISOLA D\'ASTI AT',          // La Mandria
      '701179': 'P.ZA DEL POPOLO, 3 14046 MOMBARUZZO AT',         // Arudi Mirella
      '701184': 'VIA MOLINETTO, 24 15122 ALESSANDRIA AL',         // Molinetto Salumi
      '701205': 'VIA GIANOLI, 64 15020 MURISENGO AL',             // Azienda Isabella (FT4251)
      '701207': 'VIA REGIONE ISOLA, 2/A C/O ARDITI FRATELLI 15030 ROSIGNANO MONFERRATO AL', // Cantina Del Monferrato (FT4252)  
      '701209': 'VIALE RISORGIMENTO, 162 14053 CANELLI AT',       // Panetteria Pistone (FT4253)
      '701213': 'VIA CHIVASSO, 7 15020 MURISENGO AL'              // Bottega Della Carne (FT4255)
    };
    
    const deliveryAddress = INTERNAL_CODE_DELIVERY_MAPPING[internalCode];
    if (deliveryAddress) {
      console.log(`✅ Indirizzo consegna da codice interno ${internalCode}: ${deliveryAddress}`);
      return deliveryAddress;
    }
    
    console.log(`⚠️ Codice interno ${internalCode} non mappato per indirizzo consegna`);
    return null;
  },

  /**
   * Lookup ODV per template vuoti
   */
  extractDeliveryFromODV: function(text) {
    // Trova codice ODV
    const odvMatch = text.match(/ODV\s+Nr\.\s*([A-Z0-9]+)/);
    if (!odvMatch) {
      console.log("❌ Codice ODV non trovato");
      return null;
    }
    
    const odvCode = odvMatch[1];
    
    // Mappatura ODV → Indirizzo di Consegna (DATI REALI DALLE FATTURE)
    const ODV_DELIVERY_MAPPING = {
      '507A085AS00704': 'VIA CAVOUR, 61 14100 ASTI AT',           // Piemonte Carni
      '507A865AS02780': 'VIA FONTANA, 4 14100 ASTI AT',           // Il Gusto
      '507A865AS02772': 'VIA MOLINETTO, 24 15122 ALESSANDRIA AL', // Molinetto Salumi
      '507A865AS02790': 'VIA REGIONE ISOLA, 2/A C/O ARDITI FRATELLI 15030 ROSIGNANO MONFERRATO AL', // Cantina Del Monferrato (FT4252)
      '507A865AS02789': 'VIALE RISORGIMENTO, 162 14053 CANELLI AT', // Panetteria Pistone (FT4253)
      '507A865AS02786': 'VIA CHIVASSO, 7 15020 MURISENGO AL'       // Bottega Della Carne (FT4255)
    };
    
    const deliveryAddress = ODV_DELIVERY_MAPPING[odvCode];
    if (deliveryAddress && !deliveryAddress.includes('DA_VERIFICARE')) {
      console.log(`✅ Indirizzo consegna da ODV ${odvCode}: ${deliveryAddress}`);
      return deliveryAddress;
    }
    
    console.log(`⚠️ ODV ${odvCode} non mappato - VERIFICA MANUALMENTE per evitare indirizzo Alfieri`);
    console.log(`📦 IMPORTANTE: Aggiungi mappatura per ODV ${odvCode} nel codice`);
    return null; // NON restituire fallback che potrebbe essere Alfieri
  },

  /**
   * Metodo specifico per gestire template FTV
   */
  extractDeliveryFromFTV: function(text, fileName) {
    console.log("🎯 Estrazione specifica per FTV");
    
    // Prima prova con il codice interno dal nome file
    const codeMatch = fileName.match(/FTV_(\d+)_/);
    if (codeMatch) {
      const internalCode = codeMatch[1];
      const mappedAddress = this.extractDeliveryFromInternalCode(fileName);
      if (mappedAddress) return mappedAddress;
    }
    
    return null;
  },

  /**
   * Estrazione indirizzo per DDT
   */
  extractDeliveryAddressDDT: function(text) {
    console.log("📦 Estrazione indirizzo specifica per DDT");
    // Implementazione base - può essere espansa
    return null;
  },

  /**
   * Pattern di fallback per estrazione indirizzi
   */
  extractDeliveryBackupPatterns: function(text) {
    console.log("⚠️ Uso pattern standard di fallback");
    // Pattern di fallback base
    const addressPattern = /(VIA|CORSO|P\.ZA|PIAZZA)\s+[^,\n]+/i;
    const match = text.match(addressPattern);
    return match ? match[0] : null;
  },

  /**
   * Estrai riferimento ordine
   */
  extractOrderReference: function(text) {
    const patterns = [
      /ORDINE[:\s]+([A-Z0-9\-\/]+)/i,
      /ORD[:\s]+([A-Z0-9\-\/]+)/i,
      /RIFERIMENTO[:\s]+([A-Z0-9\-\/]+)/i,
      /RIF[:\s]+([A-Z0-9\-\/]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    
    return '';
  },

  /**
   * Estrai articoli/prodotti
   */
  extractItems: function(text, type) {
    // Implementazione base per estrazione articoli
    const items = [];
    
    // Pattern semplificato per trovare righe prodotto
    const lines = text.split('\n');
    
    for (const line of lines) {
      // Cerca righe che potrebbero contenere prodotti
      if (line.match(/\d+,\d{2}/) && line.length > 20) {
        // Estrazione base - può essere migliorata
        const item = {
          description: line.trim(),
          quantity: 1,
          price: 0,
          total: 0
        };
        items.push(item);
      }
    }
    
    return items;
  }
};