/**
 * Pattern regex per il modulo DDT-FT
 * Estratti da ddtft-import.js per centralizzare la configurazione
 */

// Pattern per identificazione tipo documento
if (typeof DOCUMENT_TYPE_PATTERNS === 'undefined') {
var DOCUMENT_TYPE_PATTERNS = {
  DDT: {
    primary: /DDT\s+(\d+)\s+\d{2}\/\d{2}\/\d{2}/i,
    secondary: /D\.D\.T\.\s+(\d+)/i,
    alternative: /DOCUMENTO\s+DI\s+TRASPORTO\s+N[°.]?\s*(\d+)/i,
    // NUOVO: Pattern per formato Alfieri (numero di 4 cifre + data concatenata)
    // Es: 467321/05/25 dove 4673 è il numero e 21/05/25 è la data
    alfieriFormat: /^(\d{4})(\d{2})\/(\d{2})\/(\d{2})$/m
  },
  FATTURA: {
    primary: /FATTURA\s*N[°.]?\s*(\d+)/i,
    secondary: /FT\s+(\d+)/i,
    alternative: /FATT\.\s*N[°.]?\s*(\d+)/i,
    // NUOVO: Pattern per estrarre da nome file FTV
    fromFileName: /FTV_\d+_\d+_(\d+)_/
  }
};

// Pattern per estrazione date
const DATE_PATTERNS = {
  standard: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
  withLabel: /DATA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  fullDate: /(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i
};

// Pattern per dati fiscali
const FISCAL_PATTERNS = {
  partitaIva: /P(?:ARTITA)?\.?\s*IVA[:\s]*(\d{11})/i,
  codiceFiscale: /C(?:ODICE)?\.?\s*F(?:ISCALE)?[:\s]*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i,
  codiceCliente: /COD(?:ICE)?\.?\s*CLIENTE[:\s]*(\d+)/i
};

// Pattern per riferimenti ordine
const ORDER_PATTERNS = {
  standard: /RIF(?:ERIMENTO)?\s*\.\s*ORDINE[:\s]+(\S+)/i,
  ordineNum: /ORDINE\s*N[°.]?\s*(\S+)/i,
  odv: /ODV[:\s]*(\S+)/i,
  riferimento: /RIF(?:ERIMENTO)?[:\s]+(\S+)/i
};

// Pattern per prodotti
const PRODUCT_PATTERNS = {
  // Pattern principale per righe prodotto con codice, descrizione, quantità e unità
  standard: /\b(\d{6}|[A-Z]{2}\d{6}|PIRR\d{3})\s+(.*?)\s+(\d+(?:[,\.]\d+)?)\s+(PZ|KG|LT|MT|CF|CT|GR|ML)/gi,
  // Pattern per righe con quantità e prezzo
  withPrice: /(\d+(?:[,\.]\d+)?)\s+(PZ|KG|LT|MT|CF|CT|GR|ML)\s+(\d+[,\.]\d{2})\s+(\d+[,\.]\d{2})/g
};

// Pattern per indirizzi
const ADDRESS_PATTERNS = {
  // Pattern generale per vie e corsi
  general: /(VIA|V\.LE|VIALE|CORSO|C\.SO|P\.ZA|PIAZZA|STRADA|STR\.|LOC\.|LOCALITA'|FRAZ\.|FRAZIONE|BORGO)\s+[A-Z\s,'\.]+\d+/gi,
  
  // Pattern per indirizzi con CAP
  withCap: /(\d{5})\s+([A-Z][A-Z\s\-]+?)\s+([A-Z]{2})\b/g,
  
  // Pattern per indirizzi complessi
  complex: /((VIA|V\.LE|VIALE|CORSO|C\.SO|P\.ZA|PIAZZA)\s+[^,]+(?:,\s*\d+[A-Z]?)?(?:\s+(?:LOC\.|LOCALITA')\s+[^,]+)?)\s+(\d{5})\s+([A-Z][A-Z\s\-]+?)\s+([A-Z]{2})/i,
  
  // Pattern per C/O
  careOf: /C\/O\s+([A-Z\s\.]+)/i,
  
  // Pattern per doppio indirizzo sulla stessa riga
  doubleAddress: /^(.*?)\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+(.+)$/i
};

// Pattern per totali e importi
const AMOUNT_PATTERNS = {
  total: /TOTALE\s+(?:DOCUMENTO|FATTURA)?\s*[:\s]*€?\s*(\d+[,\.]\d{2})/i,
  imponibile: /IMPONIBILE\s*[:\s]*€?\s*(\d+[,\.]\d{2})/i,
  iva: /IVA\s+(\d{1,2})%?\s*[:\s]*€?\s*(\d+[,\.]\d{2})/i,
  currency: /€\s*(\d+[,\.]\d{2})/
};

// Pattern per identificatori speciali
const SPECIAL_PATTERNS = {
  // Per identificare template vuoti
  emptyTemplate: {
    DDV: /DDV\s*\(Vuoto\)/i,
    FTV: /FTV\s*\(Vuoto\)/i
  },
  
  // Per identificare sezioni
  deliverySection: /LUOGO\s+DI\s+CONSEGNA|INDIRIZZO\s+DI\s+CONSEGNA|DESTINAZIONE\s+MERCE|CONSEGNARE\s+A/i,
  
  // Per vettore/trasportatore
  carrier: /VETTORE|TRASPORTATORE|CARRIER/i
};

// Esporta tutti i pattern come oggetto unico per retrocompatibilità
const PATTERNS = {
  DOCUMENT_TYPE: DOCUMENT_TYPE_PATTERNS,
  DATE: DATE_PATTERNS,
  FISCAL: FISCAL_PATTERNS,
  ORDER: ORDER_PATTERNS,
  PRODUCT: PRODUCT_PATTERNS,
  ADDRESS: ADDRESS_PATTERNS,
  AMOUNT: AMOUNT_PATTERNS,
  SPECIAL: SPECIAL_PATTERNS
};

// Per compatibilità con caricamento tramite script tag
if (typeof window !== 'undefined') {
  window.DDTFT_PATTERNS = PATTERNS;
}
}