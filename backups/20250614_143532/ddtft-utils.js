/**
 * Utilities condivise per il modulo DDT-FT
 * Funzioni pure senza side effects, riutilizzabili
 */

/**
 * Pulisce e converte un valore numerico da stringa
 * Gestisce virgole come separatori decimali
 * @param {string|number} value - Valore da pulire
 * @returns {number} - Numero pulito o 0 se non valido
 */
export function cleanNumber(value) {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'string') return 0;
  
  // Rimuovi spazi e simboli valuta
  let cleaned = value.replace(/[€$\s]/g, '').trim();
  
  // Gestisci virgola come separatore decimale
  // Se c'è un punto prima della virgola, il punto è separatore migliaia
  if (cleaned.includes('.') && cleaned.includes(',')) {
    if (cleaned.lastIndexOf('.') < cleaned.lastIndexOf(',')) {
      // Formato: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Solo virgola: presumibilmente decimale
    cleaned = cleaned.replace(',', '.');
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Formatta il nome di una strada rimuovendo spazi multipli e punti finali
 * @param {string} street - Nome della strada
 * @returns {string} - Nome formattato
 */
export function formatStreetName(street) {
  if (!street) return '';
  return street
    .replace(/\s+/g, ' ')      // Rimuovi spazi multipli
    .replace(/\.$/, '')        // Rimuovi punto finale
    .trim();
}

/**
 * Separa prefissi attaccati (es: PIAZZADANTE → PIAZZA DANTE)
 * @param {string} streetWithPrefix - Stringa con prefisso attaccato
 * @returns {string} - Stringa con prefisso separato
 */
export function separateStreetPrefix(streetWithPrefix) {
  if (!streetWithPrefix) return '';
  
  const prefixes = ['VIA', 'V.LE', 'VIALE', 'CORSO', 'C.SO', 'PIAZZA', 'P.ZA', 
                    'STRADA', 'STR.', 'LOC.', 'LOCALITA', 'FRAZ.', 'FRAZIONE', 
                    'BORGO', 'VICOLO', 'V.LO', 'LARGO', 'L.GO'];
  
  for (const prefix of prefixes) {
    const regex = new RegExp(`^(${prefix})([A-Z])`, 'i');
    if (regex.test(streetWithPrefix)) {
      return streetWithPrefix.replace(regex, '$1 $2');
    }
  }
  
  return streetWithPrefix;
}

/**
 * Converte una stringa in Title Case
 * @param {string} str - Stringa da convertire
 * @returns {string} - Stringa in Title Case
 */
export function toTitleCase(str) {
  if (!str) return '';
  
  // Parole che rimangono minuscole
  const minorWords = ['di', 'del', 'della', 'dei', 'delle', 'e', 'ed', 'da', 'per', 'con'];
  
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Prima parola sempre maiuscola, altre controllare se sono minor words
      if (index === 0 || !minorWords.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}

/**
 * Genera un ID univoco per documenti
 * @returns {string} - ID nel formato DDTFT_timestamp_random
 */
export function generateId() {
  return `DDTFT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Valida un indirizzo italiano
 * @param {string} address - Indirizzo da validare
 * @param {Object} options - Opzioni di validazione
 * @returns {boolean} - true se valido
 */
export function isValidAddress(address, options = {}) {
  if (!address || address.length < 10) return false;
  
  const {
    requireCap = true,
    requireStreetPrefix = true,
    requireProvince = true
  } = options;
  
  // Verifica CAP (5 cifre)
  if (requireCap) {
    const capPattern = /\b\d{5}\b/;
    if (!capPattern.test(address)) return false;
  }
  
  // Verifica prefisso stradale
  if (requireStreetPrefix) {
    const streetPrefixPattern = /(VIA|V\.LE|VIALE|CORSO|C\.SO|P\.ZA|PIAZZA|STRADA|LOC\.|LOCALITA)/i;
    if (!streetPrefixPattern.test(address)) return false;
  }
  
  // Verifica sigla provincia (2 lettere maiuscole alla fine)
  if (requireProvince) {
    const provincePattern = /\b[A-Z]{2}\s*$/;
    if (!provincePattern.test(address)) return false;
  }
  
  // Verifica che non sia solo numeri o troppo corto
  const hasLetters = /[a-zA-Z]{3,}/.test(address);
  if (!hasLetters) return false;
  
  return true;
}

/**
 * Estrae una data da un testo con vari formati
 * @param {string} text - Testo da cui estrarre la data
 * @returns {string} - Data in formato DD/MM/YYYY o stringa vuota
 */
export function extractDate(text) {
  if (!text) return '';
  
  // Pattern in ordine di priorità
  const patterns = [
    // Data esplicita con label
    /DATA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    // Data standard DD/MM/YYYY o DD-MM-YYYY
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
    // Data con mese testuale
    /(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Se è il pattern con mese testuale, converti
      if (pattern.source.includes('gennaio')) {
        const monthNames = {
          'gennaio': '01', 'febbraio': '02', 'marzo': '03', 'aprile': '04',
          'maggio': '05', 'giugno': '06', 'luglio': '07', 'agosto': '08',
          'settembre': '09', 'ottobre': '10', 'novembre': '11', 'dicembre': '12'
        };
        const day = match[1].padStart(2, '0');
        const month = monthNames[match[2].toLowerCase()];
        const year = match[3];
        return `${day}/${month}/${year}`;
      }
      
      // Normalizza il formato
      let date = match[1];
      date = date.replace(/-/g, '/');
      
      // Gestisci anno a 2 cifre
      const parts = date.split('/');
      if (parts[2] && parts[2].length === 2) {
        parts[2] = '20' + parts[2];
      }
      
      // Assicura formato DD/MM/YYYY
      if (parts[0]) parts[0] = parts[0].padStart(2, '0');
      if (parts[1]) parts[1] = parts[1].padStart(2, '0');
      
      return parts.join('/');
    }
  }
  
  return '';
}

/**
 * Calcola totali da un array di items
 * @param {Array} items - Array di prodotti con quantità e prezzi
 * @param {Object} options - Opzioni per il calcolo
 * @returns {Object} - Oggetto con subtotale, iva, total
 */
export function calculateTotals(items, options = {}) {
  const {
    defaultVatRate = 22,
    roundTo = 2
  } = options;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return {
      subtotal: 0,
      vatAmount: 0,
      total: 0,
      vatRate: defaultVatRate
    };
  }
  
  let subtotal = 0;
  
  items.forEach(item => {
    const qty = cleanNumber(item.quantity || item.quantita || 0);
    const price = cleanNumber(item.price || item.prezzo || 0);
    const lineTotal = qty * price;
    subtotal += lineTotal;
  });
  
  // Arrotonda il subtotale
  subtotal = Math.round(subtotal * Math.pow(10, roundTo)) / Math.pow(10, roundTo);
  
  // Calcola IVA
  const vatAmount = subtotal * (defaultVatRate / 100);
  const vatRounded = Math.round(vatAmount * Math.pow(10, roundTo)) / Math.pow(10, roundTo);
  
  // Calcola totale
  const total = subtotal + vatRounded;
  
  return {
    subtotal: subtotal,
    vatAmount: vatRounded,
    total: total,
    vatRate: defaultVatRate
  };
}

/**
 * Verifica se un indirizzo appartiene a un vettore/trasportatore
 * @param {string} address - Indirizzo da verificare
 * @param {Array} carrierKeywords - Keywords per identificare vettori
 * @returns {boolean} - true se è indirizzo vettore
 */
export function isCarrierAddress(address, carrierKeywords = []) {
  if (!address) return false;
  
  const defaultKeywords = [
    'AUTOTRASPORTI', 'TRASPORTI', 'SPEDIZIONI', 'CORRIERE',
    'EXPRESS', 'LOGISTICS', 'CARGO', 'DELIVERY'
  ];
  
  const keywords = [...defaultKeywords, ...carrierKeywords];
  const upperAddress = address.toUpperCase();
  
  return keywords.some(keyword => upperAddress.includes(keyword.toUpperCase()));
}

/**
 * Formatta un CAP italiano (5 cifre)
 * @param {string} cap - CAP da formattare
 * @returns {string} - CAP formattato o stringa vuota
 */
export function formatCAP(cap) {
  if (!cap) return '';
  
  // Estrai solo cifre
  const digits = cap.replace(/\D/g, '');
  
  // Verifica lunghezza
  if (digits.length !== 5) return '';
  
  return digits;
}

/**
 * Estrae il numero di un documento (DDT o Fattura)
 * @param {string} text - Testo del documento
 * @param {string} type - Tipo documento ('DDT' o 'FATTURA')
 * @param {Object} patterns - Pattern regex da usare
 * @returns {string} - Numero documento o stringa vuota
 */
export function extractDocumentNumber(text, type, patterns = {}) {
  if (!text || !type) return '';
  
  const upperType = type.toUpperCase();
  const typePatterns = patterns[upperType] || [];
  
  for (const pattern of typePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return '';
}

/**
 * Verifica se una stringa contiene una forma societaria
 * @param {string} text - Testo da verificare
 * @param {Array} companyForms - Forme societarie da cercare
 * @returns {boolean} - true se contiene forma societaria
 */
export function hasCompanyForm(text, companyForms = []) {
  if (!text) return false;
  
  const defaultForms = [
    'S.R.L.', 'SRL', 'S.P.A.', 'SPA', 'S.A.S.', 'SAS',
    'S.N.C.', 'SNC', 'S.S.', 'SS', 'S.C.', 'SC',
    '& C.', '& FIGLI', 'F.LLI'
  ];
  
  const forms = [...defaultForms, ...companyForms];
  const upperText = text.toUpperCase();
  
  return forms.some(form => {
    const regex = new RegExp(`\\b${form.replace(/\./g, '\\.?')}\\b`, 'i');
    return regex.test(upperText);
  });
}

// Esporta tutte le funzioni come oggetto per compatibilità
export const DDTFTUtils = {
  cleanNumber,
  formatStreetName,
  separateStreetPrefix,
  toTitleCase,
  generateId,
  isValidAddress,
  extractDate,
  calculateTotals,
  isCarrierAddress,
  formatCAP,
  extractDocumentNumber,
  hasCompanyForm
};

// Per compatibilità con caricamento tramite script tag
if (typeof window !== 'undefined') {
  window.DDTFT_UTILS = DDTFTUtils;
}