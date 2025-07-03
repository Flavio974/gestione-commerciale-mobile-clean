/**
 * Estrattore PRECISO per indirizzi di consegna DDT/FT Alfieri
 * Gestisce specificamente il formato dei documenti Alfieri con alta precisione
 */

class PreciseDeliveryAddressExtractor {
  constructor(options = {}) {
    this.debug = options.debug || false;
    this.strict = options.strict !== false; // Default: modalità strict attiva
  }

  /**
   * Estrae l'indirizzo di consegna con massima precisione
   */
  extract(rows, text, metadata = {}) {
    if (this.debug) {
      console.log('\n🎯 [PreciseExtractor] Starting extraction');
      console.log('Document type:', metadata.documentType || 'Unknown');
      console.log('Client:', metadata.clientName || 'Unknown');
    }

    // 1. Prima prova: Estrazione da formato DDV specifico
    const ddvResult = this.extractFromDDVFormat(rows, metadata);
    if (ddvResult && this.validateAddress(ddvResult)) {
      return this.formatResult(ddvResult, 'DDV_FORMAT');
    }

    // 2. Seconda prova: Estrazione da header "Luogo di consegna"
    const headerResult = this.extractFromHeaderColumns(rows);
    if (headerResult && this.validateAddress(headerResult)) {
      return this.formatResult(headerResult, 'HEADER_COLUMNS');
    }

    // 3. Terza prova: Estrazione da pattern doppia colonna
    const doubleColumnResult = this.extractFromDoubleColumn(rows, text);
    if (doubleColumnResult && this.validateAddress(doubleColumnResult)) {
      return this.formatResult(doubleColumnResult, 'DOUBLE_COLUMN');
    }

    // 4. Quarta prova: Estrazione da marker espliciti
    const markerResult = this.extractFromMarkers(text);
    if (markerResult && this.validateAddress(markerResult)) {
      return this.formatResult(markerResult, 'MARKERS');
    }

    // 5. Fallback: RIMOSSO - Non usiamo più indirizzi fissi
    // Gli indirizzi devono essere SEMPRE estratti dal documento reale
    /*
    const fixedResult = this.getFixedAddress(metadata.clientName);
    if (fixedResult) {
      return this.formatResult(fixedResult, 'FIXED_ADDRESS');
    }
    */

    if (this.debug) {
      console.log('❌ [PreciseExtractor] No valid address found');
    }

    return null;
  }

  /**
   * 1. Estrazione da formato DDV Alfieri specifico
   */
  extractFromDDVFormat(rows, metadata) {
    if (this.debug) console.log('\n📋 [DDV Format] Checking DDV format...');

    // Cerca il pattern DDV (numero + data + pag + codice cliente)
    let ddvRowIndex = -1;
    const ddvPattern = /^(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(\d{5})$/;

    for (let i = 0; i < rows.length; i++) {
      const rowText = this.getRowText(rows[i]);
      if (ddvPattern.test(rowText)) {
        ddvRowIndex = i;
        if (this.debug) console.log(`✓ [DDV Format] Found DDV row at index ${i}: "${rowText}"`);
        break;
      }
    }

    if (ddvRowIndex === -1) {
      if (this.debug) console.log('✗ [DDV Format] No DDV pattern found');
      return null;
    }

    // Estrai indirizzo dalle righe successive
    // Formato tipico:
    // Riga +1: Nome cliente (possibilmente duplicato)
    // Riga +2: Indirizzo (sede | consegna)
    // Riga +3: CAP + città (sede | consegna)

    const addressParts = {
      street: '',
      city: '',
      cap: '',
      province: ''
    };

    // Riga indirizzo (tipicamente +2 dal DDV)
    if (ddvRowIndex + 2 < rows.length) {
      const addressRow = rows[ddvRowIndex + 2];
      const addressText = this.getRowText(addressRow);
      
      if (this.debug) console.log(`[DDV Format] Address row: "${addressText}"`);

      // Estrai la seconda colonna (indirizzo di consegna)
      const addressColumns = this.splitIntoColumns(addressRow, addressText);
      if (addressColumns && addressColumns.right) {
        addressParts.street = addressColumns.right;
        if (this.debug) console.log(`✓ [DDV Format] Delivery address: "${addressParts.street}"`);
      }
    }

    // Riga CAP + città (tipicamente +3 dal DDV)
    if (ddvRowIndex + 3 < rows.length) {
      const cityRow = rows[ddvRowIndex + 3];
      const cityText = this.getRowText(cityRow);
      
      if (this.debug) console.log(`[DDV Format] City row: "${cityText}"`);

      // Estrai la seconda colonna
      const cityColumns = this.splitIntoColumns(cityRow, cityText);
      if (cityColumns && cityColumns.right) {
        const cityParts = this.parseCity(cityColumns.right);
        Object.assign(addressParts, cityParts);
        if (this.debug) console.log(`✓ [DDV Format] City parts:`, cityParts);
      }
    }

    return this.combineAddressParts(addressParts);
  }

  /**
   * 2. Estrazione da colonne con header "Luogo di consegna"
   */
  extractFromHeaderColumns(rows) {
    if (this.debug) console.log('\n📋 [Header Columns] Looking for header...');

    // Cerca l'header "Luogo di consegna"
    let headerRowIndex = -1;
    let consegnaColumnX = -1;

    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      const elements = this.getRowElements(row);
      
      for (const elem of elements) {
        if (elem.text && elem.text.toLowerCase().includes('luogo di consegna')) {
          headerRowIndex = i;
          consegnaColumnX = elem.x;
          if (this.debug) {
            console.log(`✓ [Header Columns] Found header at row ${i}, X=${consegnaColumnX}`);
          }
          break;
        }
      }
      
      if (headerRowIndex !== -1) break;
    }

    if (headerRowIndex === -1 || consegnaColumnX === -1) {
      if (this.debug) console.log('✗ [Header Columns] Header not found');
      return null;
    }

    // Estrai dati dalla colonna di consegna
    const addressParts = {
      street: '',
      city: '',
      cap: '',
      province: ''
    };

    const tolerance = 50; // Tolleranza per allineamento colonna
    let vettoreFound = false;

    // Analizza le righe successive
    for (let i = headerRowIndex + 1; i < rows.length && i < headerRowIndex + 10; i++) {
      const row = rows[i];
      const rowText = this.getRowText(row);
      
      // Stop se troviamo sezione vettore
      if (rowText.toLowerCase().includes('vettore') || 
          rowText.toLowerCase().includes('trasporto a mezzo')) {
        vettoreFound = true;
        break;
      }

      // Cerca elementi nella colonna di consegna
      const elements = this.getRowElements(row);
      for (const elem of elements) {
        if (Math.abs(elem.x - consegnaColumnX) <= tolerance) {
          const text = elem.text.trim();
          
          // Identifica tipo di dato
          if (this.isStreetAddress(text) && !addressParts.street) {
            addressParts.street = text;
            if (this.debug) console.log(`[Header Columns] Street: "${text}"`);
          } else if (this.isCityLine(text) && !addressParts.city) {
            const cityParts = this.parseCity(text);
            Object.assign(addressParts, cityParts);
            if (this.debug) console.log(`[Header Columns] City:`, cityParts);
          } else if (text.includes('INGR.') || text.includes('SCARICO')) {
            // Info aggiuntiva
            addressParts.additionalInfo = text;
            if (this.debug) console.log(`[Header Columns] Additional: "${text}"`);
          }
        }
      }
    }

    return this.combineAddressParts(addressParts);
  }

  /**
   * 3. Estrazione da pattern doppia colonna
   */
  extractFromDoubleColumn(rows, text) {
    if (this.debug) console.log('\n📋 [Double Column] Analyzing double column pattern...');

    const addressParts = {
      street: '',
      city: '',
      cap: '',
      province: ''
    };

    // Cerca righe con due indirizzi
    for (let i = 0; i < rows.length; i++) {
      const rowText = this.getRowText(rows[i]);
      
      // Pattern: due VIA sulla stessa riga
      if (this.hasTwoAddresses(rowText)) {
        const columns = this.splitAddressByPattern(rowText);
        if (columns && columns.right) {
          addressParts.street = columns.right;
          if (this.debug) console.log(`✓ [Double Column] Found double address: "${columns.right}"`);
          
          // Cerca CAP nella riga successiva
          if (i + 1 < rows.length) {
            const nextRowText = this.getRowText(rows[i + 1]);
            if (this.hasTwoCities(nextRowText)) {
              const cityColumns = this.splitCityByPattern(nextRowText);
              if (cityColumns && cityColumns.right) {
                const cityParts = this.parseCity(cityColumns.right);
                Object.assign(addressParts, cityParts);
                if (this.debug) console.log(`✓ [Double Column] Found city: "${cityColumns.right}"`);
              }
            }
          }
          break;
        }
      }
    }

    return this.combineAddressParts(addressParts);
  }

  /**
   * 4. Estrazione da marker espliciti nel testo
   */
  extractFromMarkers(text) {
    if (this.debug) console.log('\n📋 [Markers] Looking for explicit markers...');

    // Pattern per trovare indirizzi marcati esplicitamente
    const patterns = [
      /Luogo di consegna[:\s]+([^\n]+(?:\n[^\n]+)*?)(?=\n(?:Partita IVA|P\.IVA|$))/i,
      /Consegna presso[:\s]+([^\n]+(?:\n[^\n]+)*?)(?=\n(?:Partita IVA|P\.IVA|$))/i,
      /Indirizzo consegna[:\s]+([^\n]+(?:\n[^\n]+)*?)(?=\n(?:Partita IVA|P\.IVA|$))/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const addressText = match[1].trim();
        if (this.debug) console.log(`✓ [Markers] Found marked address: "${addressText}"`);
        
        // Parse l'indirizzo trovato
        const lines = addressText.split('\n');
        const addressParts = {
          street: '',
          city: '',
          cap: '',
          province: ''
        };

        for (const line of lines) {
          const trimmed = line.trim();
          if (this.isStreetAddress(trimmed) && !addressParts.street) {
            addressParts.street = trimmed;
          } else if (this.isCityLine(trimmed)) {
            const cityParts = this.parseCity(trimmed);
            Object.assign(addressParts, cityParts);
          }
        }

        return this.combineAddressParts(addressParts);
      }
    }

    if (this.debug) console.log('✗ [Markers] No explicit markers found');
    return null;
  }

  /**
   * 5. Indirizzi fissi per clienti noti
   */
  getFixedAddress(clientName) {
    if (!clientName) return null;

    const FIXED_ADDRESSES = {
      'BOREALE': {
        street: 'VIA CESANA, 78',
        additionalInfo: 'INGR. SCARICO: VIA PEROSA, 75',
        cap: '10139',
        city: 'TORINO',
        province: 'TO'
      },
      'DONAC': {
        street: 'VIA SALUZZO, 65',
        cap: '12038',
        city: 'SAVIGLIANO',
        province: 'CN'
      }
      // Aggiungi altri clienti secondo necessità
    };

    // Cerca corrispondenza parziale
    const clientUpper = clientName.toUpperCase();
    for (const [key, address] of Object.entries(FIXED_ADDRESSES)) {
      if (clientUpper.includes(key)) {
        if (this.debug) {
          console.log(`✓ [Fixed Address] Found fixed address for client: ${key}`);
        }
        return this.combineAddressParts(address);
      }
    }

    return null;
  }

  // ========== UTILITY METHODS ==========

  /**
   * Ottiene il testo completo di una riga
   */
  getRowText(row) {
    if (typeof row === 'string') return row;
    if (Array.isArray(row)) {
      return row.map(elem => 
        typeof elem === 'object' ? elem.text || '' : elem
      ).join(' ').trim();
    }
    return '';
  }

  /**
   * Ottiene gli elementi con coordinate di una riga
   */
  getRowElements(row) {
    if (!Array.isArray(row)) return [];
    return row.filter(elem => 
      typeof elem === 'object' && elem.text && elem.x !== undefined
    );
  }

  /**
   * Divide una riga in colonne basandosi sugli elementi
   */
  splitIntoColumns(row, rowText) {
    const elements = this.getRowElements(row);
    if (elements.length < 2) {
      // Prova con split su spazi
      return this.splitBySpaces(rowText);
    }

    // Ordina per posizione X
    elements.sort((a, b) => a.x - b.x);

    // Trova il gap più grande tra elementi
    let maxGap = 0;
    let gapIndex = -1;

    for (let i = 0; i < elements.length - 1; i++) {
      const gap = elements[i + 1].x - elements[i].x;
      if (gap > maxGap) {
        maxGap = gap;
        gapIndex = i;
      }
    }

    if (gapIndex >= 0 && maxGap > 100) {
      // Ricostruisci le due colonne
      const leftElements = elements.slice(0, gapIndex + 1);
      const rightElements = elements.slice(gapIndex + 1);

      return {
        left: leftElements.map(e => e.text).join(' ').trim(),
        right: rightElements.map(e => e.text).join(' ').trim()
      };
    }

    // Fallback
    return this.splitBySpaces(rowText);
  }

  /**
   * Divide per spazi multipli
   */
  splitBySpaces(text) {
    const parts = text.split(/\s{2,}/);
    if (parts.length >= 2) {
      return {
        left: parts[0].trim(),
        right: parts[parts.length - 1].trim()
      };
    }
    return null;
  }

  /**
   * Divide una riga con due indirizzi
   */
  splitAddressByPattern(text) {
    // Pattern: cerca la seconda occorrenza di VIA/CORSO/etc
    const addressKeywords = '(?:VIA|V\\.LE|VIALE|CORSO|C\\.SO|PIAZZA|P\\.ZA|STRADA|LOC\\.|LOCALITA)';
    const pattern = new RegExp(`^(.*?${addressKeywords}[^,]+(?:,\\s*\\d+)?.*?)\\s+(${addressKeywords}.+)$`, 'i');
    
    const match = text.match(pattern);
    if (match) {
      return {
        left: match[1].trim(),
        right: match[2].trim()
      };
    }

    // Fallback su spazi
    return this.splitBySpaces(text);
  }

  /**
   * Divide una riga con due città
   */
  splitCityByPattern(text) {
    // Cerca due CAP
    const capMatches = text.match(/\d{5}/g);
    if (capMatches && capMatches.length >= 2) {
      // Trova l'indice del secondo CAP
      const lastCapIndex = text.lastIndexOf(capMatches[capMatches.length - 1]);
      const startOfSecondCity = text.lastIndexOf(capMatches[capMatches.length - 1], lastCapIndex - 1);
      
      if (startOfSecondCity > 0) {
        return {
          left: text.substring(0, startOfSecondCity).trim(),
          right: text.substring(startOfSecondCity).trim()
        };
      }
    }

    return this.splitBySpaces(text);
  }

  /**
   * Verifica se il testo contiene due indirizzi
   */
  hasTwoAddresses(text) {
    const addressKeywords = ['VIA', 'V.LE', 'VIALE', 'CORSO', 'C.SO', 'PIAZZA', 'P.ZA', 'STRADA'];
    let count = 0;
    
    for (const keyword of addressKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) count += matches.length;
    }
    
    return count >= 2;
  }

  /**
   * Verifica se il testo contiene due città
   */
  hasTwoCities(text) {
    const capMatches = text.match(/\d{5}/g);
    return capMatches && capMatches.length >= 2;
  }

  /**
   * Verifica se è un indirizzo stradale
   */
  isStreetAddress(text) {
    if (!text) return false;
    const pattern = /^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA|LOC\.|LOCALITA'?|FRAZ\.|FRAZIONE)\s+/i;
    return pattern.test(text);
  }

  /**
   * Verifica se è una riga con città
   */
  isCityLine(text) {
    if (!text) return false;
    // Deve contenere un CAP (5 cifre)
    return /\d{5}/.test(text);
  }

  /**
   * Parse città, CAP e provincia
   */
  parseCity(text) {
    const result = {
      cap: '',
      city: '',
      province: ''
    };

    // Pattern: 12345 CITTÀ PROV o 12345 - CITTÀ PROV
    const match = text.match(/^(\d{5})\s*[-]?\s*([A-Z\s]+?)(?:\s+([A-Z]{2}))?$/);
    if (match) {
      result.cap = match[1];
      result.city = match[2].trim();
      result.province = match[3] || '';
    }

    return result;
  }

  /**
   * Combina le parti dell'indirizzo
   */
  combineAddressParts(parts) {
    if (!parts.street && !parts.cap) return null;

    const combined = [];
    
    if (parts.street) combined.push(parts.street);
    if (parts.additionalInfo) combined.push(parts.additionalInfo);
    
    const cityParts = [];
    if (parts.cap) cityParts.push(parts.cap);
    if (parts.city) cityParts.push(parts.city);
    if (parts.province) cityParts.push(parts.province);
    
    if (cityParts.length > 0) {
      combined.push(cityParts.join(' '));
    }

    return combined.join(' ');
  }

  /**
   * Valida l'indirizzo estratto
   */
  validateAddress(address) {
    if (!address || address.length < 10) return false;

    // Escludi indirizzi di vettori
    const vettoreKeywords = ['safim', 's.a.f.i.m', 'supeja', 'gallino', 'none to'];
    const addressLower = address.toLowerCase();
    
    for (const keyword of vettoreKeywords) {
      if (addressLower.includes(keyword)) {
        if (this.debug) {
          console.log(`✗ [Validate] Address contains vettore keyword: ${keyword}`);
        }
        return false;
      }
    }

    // Escludi indirizzi dell'emittente
    if (address.includes('MAGLIANO ALFIERI') || address.includes('G. Marconi')) {
      if (this.debug) {
        console.log('✗ [Validate] Address is emittente address');
      }
      return false;
    }

    // In modalità strict, richiedi via e CAP
    if (this.strict) {
      const hasStreet = /^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA)/i.test(address);
      const hasCap = /\d{5}/.test(address);
      
      if (!hasStreet || !hasCap) {
        if (this.debug) {
          console.log(`✗ [Validate] Strict mode: hasStreet=${hasStreet}, hasCap=${hasCap}`);
        }
        return false;
      }
    }

    return true;
  }

  /**
   * Formatta il risultato finale
   */
  formatResult(address, method) {
    if (this.debug) {
      console.log(`\n✅ [PreciseExtractor] Address extracted successfully!`);
      console.log(`Method: ${method}`);
      console.log(`Address: ${address}`);
    }

    return {
      address: address,
      method: method,
      confidence: this.getConfidenceForMethod(method)
    };
  }

  /**
   * Confidence score per metodo
   */
  getConfidenceForMethod(method) {
    const scores = {
      'DDV_FORMAT': 0.95,
      'HEADER_COLUMNS': 0.90,
      'DOUBLE_COLUMN': 0.85,
      'MARKERS': 0.80,
      'FIXED_ADDRESS': 0.99
    };
    return scores[method] || 0.5;
  }
}

// Esporta per l'uso
window.PreciseDeliveryAddressExtractor = PreciseDeliveryAddressExtractor;

console.log('✅ PreciseDeliveryAddressExtractor loaded');