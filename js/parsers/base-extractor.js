/**
 * Classe base per estrattori di documenti DDT/Fatture
 * Contiene metodi comuni e logica condivisa
 */

class BaseExtractor {
  /**
   * Costruttore base per estrattori
   * @param {string} text - Testo del documento
   * @param {HTMLElement} debugElement - Elemento DOM per debug
   * @param {string} fileName - Nome del file
   */
  constructor(text, debugElement, fileName) {
    this.text = text;
    this.debug = debugElement;
    this.fileName = fileName;
    this.lines = text.split('\n');
    
    // Carica codici articolo dalla configurazione
    this.articleCodes = window.DDTFT_MAPPINGS ? 
      window.DDTFT_MAPPINGS.ARTICLE_CODES : [];
    
    // Cache per evitare elaborazioni ripetute
    this._cache = {};
    
    // Configurazioni da utilities e mappings
    this.utils = window.DDTFT_UTILS || {};
    this.patterns = window.DDTFT_PATTERNS || {};
    this.mappings = window.DDTFT_MAPPINGS || {};
  }

  /**
   * Log con prefisso tipo documento
   * @param {string} message - Messaggio da loggare
   */
  log(message) {
    const prefix = this.getLogPrefix();
    if (this.debug) {
      this.debug.textContent += `[${prefix}] ${message}\n`;
    }
    console.log(`[${prefix}] ${message}`);
  }
  
  /**
   * Ottieni prefisso per log (da sovrascrivere nelle sottoclassi)
   * @returns {string} - Prefisso per i log
   */
  getLogPrefix() {
    return 'Base Extractor';
  }

  /**
   * Pulisce un numero da formattazione
   * @param {any} value - Valore da pulire
   * @returns {number} - Numero pulito
   */
  cleanNumber(value) {
    // Usa utility se disponibile
    if (this.utils.cleanNumber) {
      return this.utils.cleanNumber(value);
    }
    
    // Fallback
    if (!value || value === '' || value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    const cleanValue = value.toString().replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Converte stringa in Title Case
   * @param {string} str - Stringa da convertire
   * @returns {string} - Stringa in Title Case
   */
  toTitleCase(str) {
    // Usa utility se disponibile
    if (this.utils.toTitleCase) {
      return this.utils.toTitleCase(str);
    }
    
    // Fallback
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // ========== METODI CACHE ==========

  /**
   * Ottieni valore dalla cache
   * @param {string} key - Chiave cache
   * @returns {any} - Valore cached o undefined
   */
  getCached(key) {
    return this._cache[key];
  }

  /**
   * Salva valore in cache
   * @param {string} key - Chiave cache
   * @param {any} value - Valore da salvare
   * @returns {any} - Il valore salvato
   */
  setCached(key, value) {
    this._cache[key] = value;
    return value;
  }

  /**
   * Pulisci tutta la cache
   */
  clearCache() {
    this._cache = {};
  }

  // ========== METODI ESTRAZIONE GENERICI ==========

  /**
   * Estrae da testo usando array di pattern
   * @param {string} text - Testo da cui estrarre
   * @param {RegExp[]} patterns - Array di pattern regex
   * @returns {string|null} - Prima corrispondenza trovata o null
   */
  extractFromPattern(text, patterns) {
    if (!text || !patterns || !Array.isArray(patterns)) return null;
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  /**
   * Estrae data con pattern personalizzabili
   * @param {RegExp[]} customPatterns - Pattern aggiuntivi (opzionale)
   * @returns {string} - Data estratta o stringa vuota
   */
  extractDate(customPatterns = []) {
    // Controlla cache
    const cached = this.getCached('date');
    if (cached !== undefined) return cached;
    
    // Usa utility se disponibile
    if (this.utils.extractDate) {
      const date = this.utils.extractDate(this.text);
      return this.setCached('date', date);
    }
    
    // Pattern di default
    const defaultPatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /DATA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /DEL[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    ];
    
    const patterns = [...defaultPatterns, ...customPatterns];
    const date = this.extractFromPattern(this.text, patterns) || '';
    
    return this.setCached('date', date);
  }

  /**
   * Estrae partita IVA
   * @param {RegExp[]} customPatterns - Pattern aggiuntivi (opzionale)
   * @returns {string} - P.IVA estratta o stringa vuota
   */
  extractVatNumber(customPatterns = []) {
    const defaultPattern = this.patterns.FISCAL?.partitaIva || 
      /P(?:ARTITA)?\.?\s*IVA[:\s]*(\d{11})/i;
    
    const patterns = [defaultPattern, ...customPatterns];
    return this.extractFromPattern(this.text, patterns) || '';
  }

  /**
   * Estrae codice fiscale (di default ritorna P.IVA)
   * @returns {string} - Codice fiscale o P.IVA
   */
  extractFiscalCode() {
    return this.extractVatNumber();
  }

  /**
   * Estrae riferimento ordine
   * @param {RegExp[]} customPatterns - Pattern aggiuntivi (opzionale)
   * @returns {string} - Riferimento ordine o stringa vuota
   */
  extractOrderReference(customPatterns = []) {
    const defaultPatterns = [
      /RIF(?:ERIMENTO)?\s*\.?\s*ORDINE[:\s]+(\S+)/i,
      /ORDINE\s*N[°.]?\s*(\S+)/i,
      /ODV[:\s]*(\S+)/i
    ];
    
    const patterns = [...defaultPatterns, ...customPatterns];
    return this.extractFromPattern(this.text, patterns) || '';
  }

  // ========== METODI VALIDAZIONE ==========

  /**
   * Verifica se è indirizzo di vettore/trasportatore
   * @param {string} address - Indirizzo da verificare
   * @returns {boolean} - true se è indirizzo vettore
   */
  isVettoreAddress(address) {
    if (!address) return false;
    
    // Usa utility se disponibile
    if (this.utils.isCarrierAddress) {
      return this.utils.isCarrierAddress(address);
    }
    
    // Keywords vettore
    const vettoreKeywords = [
      'AUTOTRASPORTI', 'TRASPORTI', 'SPEDIZIONI', 'CORRIERE',
      'EXPRESS', 'LOGISTICS', 'CARGO', 'DELIVERY',
      'BARTOLINI', 'BRT', 'GLS', 'SDA', 'TNT', 'DHL', 'UPS', 'FEDEX'
    ];
    
    const upperAddress = address.toUpperCase();
    
    // Controlla keywords
    for (const keyword of vettoreKeywords) {
      if (upperAddress.includes(keyword)) {
        this.log(`  ⚠️ Rilevato possibile vettore: contiene "${keyword}"`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Valida indirizzo
   * @param {string} address - Indirizzo da validare
   * @returns {boolean} - true se valido
   */
  isValidAddress(address) {
    // Usa utility se disponibile
    if (this.utils.isValidAddress) {
      return this.utils.isValidAddress(address);
    }
    
    // Validazione base
    if (!address || address.length < 10) return false;
    
    // Deve avere CAP
    if (!/\b\d{5}\b/.test(address)) return false;
    
    // Deve avere prefisso stradale
    if (!/(VIA|V\.LE|VIALE|CORSO|C\.SO|P\.ZA|PIAZZA)/i.test(address)) return false;
    
    return true;
  }

  /**
   * Gestione speciale per cliente BOREALE
   * @param {string} address - Indirizzo da verificare
   * @param {string} clientName - Nome cliente
   * @returns {string} - Indirizzo corretto
   */
  checkAndReplaceBorealeAddress(address, clientName) {
    if (clientName && clientName.toUpperCase().includes('BOREALE')) {
      if (address && address.includes('SAN SALVATORE MONFERRATO')) {
        this.log('⚠️ Cliente BOREALE con indirizzo San Salvatore - correggo in Lu Monferrato');
        return address.replace('SAN SALVATORE MONFERRATO', 'LU MONFERRATO')
                      .replace('15040', '15030');
      }
    }
    return address;
  }

  // ========== METODI ASTRATTI ==========
  // Da implementare nelle sottoclassi

  /**
   * Metodo principale di estrazione (ASTRATTO)
   * @returns {Object} - Dati estratti
   */
  extract() {
    throw new Error('Il metodo extract() deve essere implementato nella sottoclasse');
  }

  /**
   * Estrae numero documento (ASTRATTO)
   * @returns {string} - Numero documento
   */
  extractDocumentNumber() {
    throw new Error('Il metodo extractDocumentNumber() deve essere implementato nella sottoclasse');
  }

  /**
   * Estrae cliente (ASTRATTO)
   * @returns {string} - Nome cliente
   */
  extractClient() {
    throw new Error('Il metodo extractClient() deve essere implementato nella sottoclasse');
  }

  /**
   * Estrae prodotti (ASTRATTO)
   * @returns {Array} - Array di prodotti
   */
  extractProducts() {
    throw new Error('Il metodo extractProducts() deve essere implementato nella sottoclasse');
  }

  /**
   * Estrae/calcola totali (ASTRATTO)
   * @returns {Object} - Oggetto con totali
   */
  extractTotals() {
    throw new Error('Il metodo extractTotals() deve essere implementato nella sottoclasse');
  }
}

// Export globale per compatibilità
if (typeof window !== 'undefined') {
  window.BaseExtractor = BaseExtractor;
}

// Export per ES6 modules (se supportati)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BaseExtractor;
}