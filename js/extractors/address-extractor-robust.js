/**
 * Estrattore robusto per indirizzi di consegna
 * Multi-strategia con fallback intelligenti
 */

class RobustDeliveryAddressExtractor {
  constructor(options = {}) {
    this.debug = options.debug || false;
    this.logStrategies = options.logStrategies || false;
    this.saveIntermediateResults = options.saveIntermediateResults || false;
    this.intermediateResults = [];
    
    // Definisci le strategie in ordine di priorità
    this.strategies = [
      this.extractByTwoColumnLayout.bind(this),
      this.extractByColumnPosition.bind(this),
      this.extractByKeywordProximity.bind(this),
      this.extractByPatternMatching.bind(this),
      this.extractByRelativePosition.bind(this),
      this.extractByFuzzySearch.bind(this)
    ];
  }

  /**
   * Metodo principale per estrarre l'indirizzo di consegna
   */
  async extractDeliveryAddress(rows, metadata = {}) {
    if (this.debug) {
      console.log('🔍 [RobustAddressExtractor] Starting extraction with metadata:', metadata);
    }
    
    const results = [];
    this.intermediateResults = [];
    
    // Prova tutte le strategie
    for (const strategy of this.strategies) {
      try {
        if (this.logStrategies) {
          console.log(`\n📋 [${strategy.name}] Attempting strategy...`);
        }
        
        const result = await strategy(rows, metadata);
        
        if (result && result.confidence > 0) {
          results.push(result);
          
          if (this.saveIntermediateResults) {
            this.intermediateResults.push({
              strategy: strategy.name,
              result: result
            });
          }
          
          if (this.logStrategies) {
            console.log(`✅ [${strategy.name}] Success! Confidence: ${result.confidence}`);
            console.log(`   Address:`, result.address);
          }
        } else {
          if (this.logStrategies) {
            console.log(`❌ [${strategy.name}] No result found`);
          }
        }
      } catch (error) {
        if (this.debug) {
          console.error(`❌ [${strategy.name}] Strategy failed:`, error);
        }
      }
    }
    
    // Combina i risultati
    const finalResult = this.combineResults(results);
    
    if (this.debug) {
      console.log('\n🎯 [Final Result] Combined address:', finalResult);
    }
    
    return finalResult;
  }

  /**
   * Strategia 1: Two Column Layout Detection
   * Specifica per DDT con layout a due colonne Cliente | Luogo di consegna
   */
  extractByTwoColumnLayout(rows, metadata) {
    if (this.debug) console.log('[Two Column Layout] Starting detection...');
    
    // Cerca l'header con "Cliente" e "consegna"
    let headerRow = null;
    let headerIndex = -1;
    
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      const rowText = this.getRowText(row);
      
      if (rowText.toLowerCase().includes('cliente') && 
          rowText.toLowerCase().includes('consegna')) {
        headerRow = row;
        headerIndex = i;
        if (this.debug) console.log(`[Two Column Layout] Found header at row ${i}`);
        break;
      }
    }
    
    if (!headerRow) return null;
    
    // Rileva le coordinate X delle colonne
    const columns = this.detectColumns(headerRow);
    if (!columns.delivery) {
      if (this.debug) console.log('[Two Column Layout] No delivery column detected');
      return null;
    }
    
    if (this.debug) {
      console.log(`[Two Column Layout] Column detection:`, columns);
    }
    
    // Estrai solo dalla colonna di consegna
    const addressData = [];
    const startRow = headerIndex + 1;
    
    for (let i = startRow; i < Math.min(startRow + 10, rows.length); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      
      // Filtra solo elementi nella colonna di consegna
      const deliveryItems = row.filter(item => {
        if (!item || typeof item.x === 'undefined') return false;
        return item.x >= columns.delivery.minX && item.x <= columns.delivery.maxX;
      });
      
      if (deliveryItems.length > 0) {
        const deliveryText = deliveryItems
          .map(item => item.text || item.str || '')
          .join(' ')
          .trim();
        
        if (deliveryText && !this.isPaymentOrOperatorInfo(deliveryText)) {
          addressData.push(deliveryText);
          if (this.debug) {
            console.log(`[Two Column Layout] Found delivery line: "${deliveryText}"`);
          }
        }
      }
    }
    
    // Rimuovi duplicati del nome cliente
    const cleanedData = this.removeClientNameDuplicate(addressData, metadata);
    
    // Parse l'indirizzo
    const parsedAddress = this.parseItalianAddress(cleanedData);
    
    if (!parsedAddress || !parsedAddress.street) return null;
    
    return {
      address: parsedAddress,
      confidence: 0.95,
      method: 'two_column_layout'
    };
  }

  /**
   * Strategia 2: Column Position
   * Usa la posizione delle colonne basandosi sugli header
   */
  extractByColumnPosition(rows, metadata) {
    if (this.debug) console.log('[Column Position] Starting detection...');
    
    // Trova header con keywords
    const headerKeywords = ['luogo di consegna', 'destinazione', 'consegna', 'destino'];
    let headerInfo = null;
    
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      const rowText = this.getRowText(row).toLowerCase();
      
      for (const keyword of headerKeywords) {
        if (rowText.includes(keyword)) {
          // Trova la coordinata X della keyword
          const keywordX = this.findKeywordX(row, keyword);
          if (keywordX) {
            headerInfo = { row, index: i, x: keywordX, keyword };
            break;
          }
        }
      }
      
      if (headerInfo) break;
    }
    
    if (!headerInfo) {
      if (this.debug) console.log('[Column Position] No header found');
      return null;
    }
    
    if (this.debug) {
      console.log(`[Column Position] Found header at row ${headerInfo.index}`);
    }
    
    // Estrai dalla colonna identificata
    const addressLines = [];
    const columnX = headerInfo.x;
    const tolerance = 100; // Tolleranza per allineamento colonna
    
    for (let i = headerInfo.index + 1; i < Math.min(headerInfo.index + 10, rows.length); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      
      const columnItems = row.filter(item => {
        if (!item || typeof item.x === 'undefined') return false;
        return Math.abs(item.x - columnX) <= tolerance;
      });
      
      if (columnItems.length > 0) {
        const text = columnItems
          .map(item => item.text || item.str || '')
          .join(' ')
          .trim();
        
        if (text && !this.isHeaderOrFooter(text)) {
          addressLines.push({
            text,
            x: columnItems[0].x,
            rowIndex: i
          });
        }
      }
    }
    
    // Filtra il nome cliente se necessario
    const filteredLines = this.filterDuplicateClientName(addressLines, metadata);
    
    // Parse l'indirizzo
    const parsedAddress = this.parseAddressLines(filteredLines);
    
    if (!parsedAddress || !parsedAddress.street) return null;
    
    return {
      address: parsedAddress,
      confidence: 0.9,
      method: 'column_position'
    };
  }

  /**
   * Strategia 3: Keyword Proximity
   * Cerca indirizzi vicino a parole chiave
   */
  extractByKeywordProximity(rows, metadata) {
    if (this.debug) console.log('[Keyword Proximity] Starting search...');
    
    const keywords = ['consegna', 'scarico', 'destinazione', 'destino', 'presso', 'recapito'];
    const addressCandidates = [];
    
    rows.forEach((row, index) => {
      const text = this.getRowText(row).toLowerCase();
      
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          // Raccogli le righe successive (probabile indirizzo)
          const context = this.getContextLines(rows, index, 5);
          
          context.forEach(line => {
            if (this.isAddressLine(line.text)) {
              addressCandidates.push({
                text: line.text,
                distance: Math.abs(line.index - index),
                keyword
              });
            }
          });
        }
      });
    });
    
    if (addressCandidates.length === 0) return null;
    
    // Ordina per vicinanza alla keyword
    addressCandidates.sort((a, b) => a.distance - b.distance);
    
    // Prendi i migliori candidati
    const bestCandidates = addressCandidates.slice(0, 5);
    const addressLines = bestCandidates.map(c => c.text);
    
    const parsedAddress = this.parseAddressFromContext(addressLines);
    
    if (!parsedAddress || !parsedAddress.street) return null;
    
    return {
      address: parsedAddress,
      confidence: 0.7,
      method: 'keyword_proximity'
    };
  }

  /**
   * Strategia 4: Pattern Matching
   * Usa regex per trovare pattern di indirizzi
   */
  extractByPatternMatching(rows, metadata) {
    if (this.debug) console.log('[Pattern Matching] Starting pattern search...');
    
    const addressPatterns = [
      /(?:via|v\.le|viale|corso|c\.so|piazza|p\.zza|strada|loc\.|località)\s+[^,\n]+(?:,\s*\d+)?/gi,
      /\d{5}\s+[A-Z][A-Za-z\s\-]+\s+[A-Z]{2}/g,
      /ingr\.?\s*(?:scarico|consegna)?\s*:?\s*(?:via|v\.le)[^\n]+/gi
    ];
    
    const matches = [];
    let inVettoreSection = false;
    
    rows.forEach((row, rowIndex) => {
      const text = this.getRowText(row);
      
      // Skip vettore section
      if (text.toLowerCase().includes('vettore') || 
          text.toLowerCase().includes('trasportatore')) {
        inVettoreSection = true;
        if (this.debug) console.log(`[Pattern Matching] Entering vettore section at row ${rowIndex}`);
        return;
      }
      
      if (inVettoreSection) return;
      
      addressPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const x = this.getRowX(row);
          
          // Preferisci match dalla colonna destra (X > 250)
          if (x > 250 || x === 0) {
            matches.push({
              text: match[0],
              x: x,
              rowIndex: rowIndex,
              confidence: x > 250 ? 0.9 : 0.7
            });
          }
        }
      });
    });
    
    if (matches.length === 0) return null;
    
    // Raggruppa per posizione X simile (stessa colonna)
    const grouped = this.groupAddressMatches(matches);
    
    if (!grouped || !grouped.address) return null;
    
    return {
      address: grouped.address,
      confidence: grouped.confidence,
      method: 'pattern_matching'
    };
  }

  /**
   * Strategia 5: Relative Position
   * Cerca l'indirizzo relativo alla posizione del cliente
   */
  extractByRelativePosition(rows, metadata) {
    if (this.debug) console.log('[Relative Position] Starting search...');
    
    if (!metadata.clientName) return null;
    
    // Trova il nome del cliente
    let clientRowIndex = -1;
    let clientX = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const text = this.getRowText(row);
      
      if (text.includes(metadata.clientName)) {
        clientRowIndex = i;
        clientX = this.getRowX(row);
        if (this.debug) console.log(`[Relative Position] Found client at row ${i}`);
        break;
      }
    }
    
    if (clientRowIndex === -1) return null;
    
    // Cerca nella colonna destra (X > clientX + 100)
    const rightColumnData = [];
    
    for (let i = clientRowIndex; i < Math.min(clientRowIndex + 10, rows.length); i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      
      const rightItems = row.filter(item => {
        if (!item || typeof item.x === 'undefined') return false;
        return item.x > clientX + 100;
      });
      
      if (rightItems.length > 0) {
        const text = rightItems
          .map(item => item.text || item.str || '')
          .join(' ')
          .trim();
        
        if (text && this.isAddressLine(text)) {
          rightColumnData.push(text);
        }
      }
    }
    
    const parsedAddress = this.parseAddressLines(rightColumnData.map(t => ({ text: t })));
    
    if (!parsedAddress || !parsedAddress.street) return null;
    
    return {
      address: parsedAddress,
      confidence: 0.6,
      method: 'relative_position'
    };
  }

  /**
   * Strategia 6: Fuzzy Search
   * Ricerca fuzzy basata sul contesto
   */
  extractByFuzzySearch(rows, metadata) {
    if (this.debug) console.log('[Fuzzy Search] Starting search...');
    
    const clientName = metadata.clientName;
    if (!clientName) return null;
    
    // Trova tutte le occorrenze del nome cliente
    const clientOccurrences = [];
    
    rows.forEach((row, index) => {
      const text = this.getRowText(row);
      if (text.includes(clientName)) {
        clientOccurrences.push({
          row,
          index,
          x: this.getRowX(row)
        });
      }
    });
    
    if (clientOccurrences.length === 0) return null;
    
    // Per ogni occorrenza, estrai possibili indirizzi
    const addresses = [];
    
    clientOccurrences.forEach(occ => {
      // Cerca nelle righe successive
      const addressLines = [];
      
      for (let i = occ.index + 1; i < Math.min(occ.index + 5, rows.length); i++) {
        const row = rows[i];
        const text = this.getRowText(row);
        
        if (this.isAddressLine(text)) {
          addressLines.push(text);
        }
      }
      
      if (addressLines.length > 0) {
        const parsed = this.parseAddressLines(addressLines.map(t => ({ text: t })));
        if (parsed && parsed.street) {
          addresses.push({
            address: parsed,
            x: occ.x
          });
        }
      }
    });
    
    // Scegli l'indirizzo dalla colonna più a destra
    if (addresses.length === 0) return null;
    
    addresses.sort((a, b) => b.x - a.x);
    
    return {
      address: addresses[0].address,
      confidence: 0.5 + (addresses[0].x > 250 ? 0.2 : 0),
      method: 'fuzzy_search'
    };
  }

  // ========== UTILITY METHODS ==========

  /**
   * Rileva le coordinate X delle colonne
   */
  detectColumns(headerRow) {
    const columns = { client: null, delivery: null };
    
    if (!Array.isArray(headerRow)) return columns;
    
    headerRow.forEach(item => {
      if (!item || !item.text) return;
      
      const text = item.text.toLowerCase();
      
      if (text.includes('cliente') && !text.includes('consegna')) {
        columns.client = {
          x: item.x,
          minX: item.x - 20,
          maxX: item.x + 150
        };
      } else if (text.includes('consegna') || text.includes('destinazione')) {
        // La colonna consegna è tipicamente dopo X:290
        columns.delivery = {
          x: item.x,
          minX: Math.max(290, item.x - 20),
          maxX: item.x + 300
        };
      }
    });
    
    return columns;
  }

  /**
   * Ottiene il testo completo di una riga
   */
  getRowText(row) {
    if (typeof row === 'string') return row;
    
    if (Array.isArray(row)) {
      return row
        .map(item => {
          if (typeof item === 'string') return item;
          if (item && item.text) return item.text;
          if (item && item.str) return item.str;
          return '';
        })
        .join(' ')
        .trim();
    }
    
    return '';
  }

  /**
   * Ottiene la coordinata X media di una riga
   */
  getRowX(row) {
    if (!Array.isArray(row)) return 0;
    
    const xValues = row
      .filter(item => item && typeof item.x !== 'undefined')
      .map(item => item.x);
    
    if (xValues.length === 0) return 0;
    
    return xValues.reduce((sum, x) => sum + x, 0) / xValues.length;
  }

  /**
   * Trova la coordinata X di una keyword
   */
  findKeywordX(row, keyword) {
    if (!Array.isArray(row)) return null;
    
    for (const item of row) {
      if (item && item.text && item.text.toLowerCase().includes(keyword)) {
        return item.x;
      }
    }
    
    return null;
  }

  /**
   * Verifica se è info di pagamento o operatore
   */
  isPaymentOrOperatorInfo(text) {
    const patterns = [
      /pagamento:/i,
      /operatore:/i,
      /bb\s+\d+\s+gg/i,
      /d\.f\./i,
      /banca/i,
      /iban/i,
      /scadenza/i
    ];
    
    return patterns.some(p => p.test(text));
  }

  /**
   * Verifica se è un header o footer
   */
  isHeaderOrFooter(text) {
    const patterns = [
      /documento di trasporto/i,
      /d\.d\.t\./i,
      /partita iva/i,
      /codice fiscale/i,
      /tel\./i,
      /fax/i,
      /e-mail/i,
      /pag\.\s*\d+/i
    ];
    
    return patterns.some(p => p.test(text));
  }

  /**
   * Verifica se una riga sembra un indirizzo
   */
  isAddressLine(text) {
    if (!text || text.length < 5) return false;
    
    // Pattern positivi
    const addressPatterns = [
      /^(via|v\.le|viale|corso|c\.so|piazza|p\.zza|strada|loc\.|località|fraz\.|frazione)/i,
      /^\d{5}\s/,  // CAP
      /\b\d{5}\s+[A-Z]/i,  // CAP + città
      /ingr\./i,
      /scarico/i
    ];
    
    // Pattern negativi
    const nonAddressPatterns = [
      /^(tel|fax|cell|email|pec|cf|p\.iva|rea)/i,
      /^(pagamento|operatore|vettore|documento)/i,
      /^\d+[,\.]\d{2}$/,  // Numeri decimali
      /^€/
    ];
    
    // Prima controlla i pattern negativi
    if (nonAddressPatterns.some(p => p.test(text))) {
      return false;
    }
    
    // Poi i pattern positivi
    return addressPatterns.some(p => p.test(text));
  }

  /**
   * Rimuove duplicati del nome cliente
   */
  removeClientNameDuplicate(addressData, metadata) {
    if (!addressData.length || !metadata.clientName) return addressData;
    
    const clientName = metadata.clientName.toUpperCase();
    
    return addressData.filter((line, index) => {
      const lineUpper = line.toUpperCase();
      
      // Se la prima riga è identica al nome cliente, rimuovila
      if (index === 0 && lineUpper === clientName) {
        return false;
      }
      
      // Se contiene il nome cliente duplicato
      if (lineUpper.includes(clientName + ' ' + clientName)) {
        // Rimuovi la duplicazione
        addressData[index] = line.replace(new RegExp(metadata.clientName + '\\s+' + metadata.clientName, 'gi'), metadata.clientName);
      }
      
      return true;
    });
  }

  /**
   * Filtra il nome cliente duplicato dalle linee
   */
  filterDuplicateClientName(lines, metadata) {
    if (!metadata.clientName) return lines;
    
    return lines.filter((line, index) => {
      // Se la prima riga è solo il nome del cliente
      if (index === 0 && line.text === metadata.clientName) {
        // Verifica se c'è un indirizzo nella riga successiva
        return lines[index + 1] && this.isAddressLine(lines[index + 1].text);
      }
      return true;
    });
  }

  /**
   * Ottiene le righe di contesto
   */
  getContextLines(rows, centerIndex, radius) {
    const contextLines = [];
    
    for (let i = Math.max(0, centerIndex - radius); 
         i <= Math.min(rows.length - 1, centerIndex + radius); 
         i++) {
      const text = this.getRowText(rows[i]);
      if (text) {
        contextLines.push({
          text,
          index: i,
          distance: Math.abs(i - centerIndex)
        });
      }
    }
    
    return contextLines;
  }

  /**
   * Raggruppa match di indirizzi
   */
  groupAddressMatches(matches) {
    if (matches.length === 0) return null;
    
    // Ordina per rowIndex
    matches.sort((a, b) => a.rowIndex - b.rowIndex);
    
    // Raggruppa match vicini
    const groups = [];
    let currentGroup = [matches[0]];
    
    for (let i = 1; i < matches.length; i++) {
      if (matches[i].rowIndex - matches[i-1].rowIndex <= 2) {
        currentGroup.push(matches[i]);
      } else {
        groups.push(currentGroup);
        currentGroup = [matches[i]];
      }
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    // Scegli il gruppo migliore (più completo e con X maggiore)
    let bestGroup = null;
    let bestScore = 0;
    
    groups.forEach(group => {
      const avgX = group.reduce((sum, m) => sum + m.x, 0) / group.length;
      const score = group.length * 10 + (avgX > 250 ? 50 : 0);
      
      if (score > bestScore) {
        bestScore = score;
        bestGroup = group;
      }
    });
    
    if (!bestGroup) return null;
    
    // Parse l'indirizzo dal gruppo
    const addressLines = bestGroup.map(m => m.text);
    const parsed = this.parseAddressLines(addressLines.map(t => ({ text: t })));
    
    return {
      address: parsed,
      confidence: Math.min(...bestGroup.map(m => m.confidence))
    };
  }

  /**
   * Parse indirizzo italiano
   */
  parseItalianAddress(lines) {
    const address = {
      street: '',
      additionalInfo: '',
      postalCode: '',
      city: '',
      province: ''
    };
    
    lines.forEach(line => {
      // Via/Corso/etc
      if (this.isStreetAddress(line)) {
        if (!address.street) {
          address.street = line;
        } else if (line.toLowerCase().includes('ingr') || line.toLowerCase().includes('scarico')) {
          address.additionalInfo = line;
        }
      }
      // CAP + Città + Provincia
      else if (this.isPostalInfo(line)) {
        const parsed = this.parsePostalInfo(line);
        Object.assign(address, parsed);
      }
    });
    
    return address;
  }

  /**
   * Parse linee di indirizzo
   */
  parseAddressLines(lines) {
    const addressParts = lines.map(l => l.text || l);
    return this.parseItalianAddress(addressParts);
  }

  /**
   * Parse indirizzo dal contesto
   */
  parseAddressFromContext(lines) {
    return this.parseItalianAddress(lines);
  }

  /**
   * Verifica se è un indirizzo stradale
   */
  isStreetAddress(line) {
    return /^(via|v\.le|viale|corso|c\.so|piazza|p\.zza|strada|loc\.|località|fraz\.|frazione|largo|vicolo)/i.test(line);
  }

  /**
   * Verifica se è info postale
   */
  isPostalInfo(line) {
    return /\d{5}/.test(line);
  }

  /**
   * Parse info postale
   */
  parsePostalInfo(line) {
    const match = line.match(/(\d{5})\s*[-]?\s*([A-Z][A-Za-z\s\-\']+?)(?:\s+([A-Z]{2}))?$/);
    
    if (match) {
      return {
        postalCode: match[1],
        city: match[2].trim(),
        province: match[3] || ''
      };
    }
    
    return {};
  }

  /**
   * Combina risultati da multiple strategie
   */
  combineResults(results) {
    if (results.length === 0) return null;
    
    // Ordina per confidence
    results.sort((a, b) => b.confidence - a.confidence);
    
    // Se il migliore ha alta confidence, usalo
    if (results[0].confidence >= 0.8) {
      return this.formatAddress(results[0].address);
    }
    
    // Altrimenti, prova a combinare i risultati
    const combined = this.mergeAddresses(results);
    return this.formatAddress(combined);
  }

  /**
   * Merge di indirizzi multipli
   */
  mergeAddresses(results) {
    const merged = {
      street: '',
      additionalInfo: '',
      postalCode: '',
      city: '',
      province: ''
    };
    
    // Prendi il campo più completo da ogni risultato
    results.forEach(result => {
      const addr = result.address;
      if (!merged.street && addr.street) merged.street = addr.street;
      if (!merged.additionalInfo && addr.additionalInfo) merged.additionalInfo = addr.additionalInfo;
      if (!merged.postalCode && addr.postalCode) merged.postalCode = addr.postalCode;
      if (!merged.city && addr.city) merged.city = addr.city;
      if (!merged.province && addr.province) merged.province = addr.province;
    });
    
    return merged;
  }

  /**
   * Formatta l'indirizzo finale
   */
  formatAddress(address) {
    if (!address) return null;
    
    const parts = [];
    
    if (address.street) parts.push(address.street);
    if (address.additionalInfo) parts.push(address.additionalInfo);
    
    const cityParts = [];
    if (address.postalCode) cityParts.push(address.postalCode);
    if (address.city) cityParts.push(address.city);
    if (address.province) cityParts.push(address.province);
    
    if (cityParts.length > 0) {
      parts.push(cityParts.join(' '));
    }
    
    return {
      formatted: parts.join(' '),
      components: address
    };
  }
}

// Esporta per l'uso
window.RobustDeliveryAddressExtractor = RobustDeliveryAddressExtractor;

console.log('✅ RobustAddressExtractor loaded');