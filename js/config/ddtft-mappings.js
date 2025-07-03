/**
 * Mappature e configurazioni per il modulo DDT-FT
 * Estratte da ddtft-import.js per centralizzare la configurazione
 */

// Mappatura nomi clienti (da nome completo a nome standardizzato)
if (typeof CLIENT_NAME_MAPPING === 'undefined') {
var CLIENT_NAME_MAPPING = {
  // IL GUSTO
  'IL GUSTO FRUTTA E VERDURA DI SQUILLACIOTI FRANCESCA': 'Il Gusto',
  'IL GUSTO FRUTTA E VERDURA': 'Il Gusto',
  'IL GUSTO FRUTTA & VERDURA': 'Il Gusto',
  'IL GUSTO': 'Il Gusto',
  
  // PIEMONTE CARNI
  'PIEMONTE CARNI': 'Piemonte Carni',
  'PIEMONTE CARNI DI CALDERA MASSIMO & C. S.A.S.': 'Piemonte Carni',
  'PIEMONTE CARNI S.A.S.': 'Piemonte Carni',
  
  // AZIENDE AGRICOLE
  'AZ. AGR. LA MANDRIA S.S.': 'La Mandria',
  'AZ. AGR. LA MANDRIA S.S. DI GOIA E BRUNO': 'La Mandria',
  'AZIENDA AGRICOLA LA MANDRIA': 'La Mandria',
  'LA MANDRIA S.S.': 'La Mandria',
  
  // BARISONE E BALDON
  'BARISONE E BALDON SRL': 'Barisone E Baldon',
  'BARISONE E BALDON S.R.L.': 'Barisone E Baldon',
  'BARISONE & BALDON S.R.L.': 'Barisone E Baldon',
  'BARISONE & BALDON': 'Barisone E Baldon',
  
  // ALTRI CLIENTI
  'MAROTTA S.R.L.': 'Marotta',
  'MAROTTA SRL': 'Marotta',
  'BOREALE S.R.L.': 'Boreale',
  'BOREALE SRL': 'Boreale',
  'DONAC S.R.L.': 'Donac',
  'DONAC SRL': 'Donac',
  'ARDITI F.LLI S.R.L.': 'Arditi F.lli',
  'ARUDI MIRELLA': 'Arudi Mirella',
  'MOLINETTO SALUMI E FORMAGGI S.R.L.': 'Molinetto Salumi',
  'PANETTERIA PISTONE RENZO': 'Panetteria Pistone',
  'AZ.AGR.ISABELLA DI CONTI STEFANO': 'Azienda Isabella',
  'BOTTEGA DELLA CARNE DI AVIDANO SILVANA': 'Bottega Della Carne'
};

// Mappatura indirizzi per codice interno
const INTERNAL_CODE_DELIVERY_MAPPING = {
  '701029': 'VIA CAVOUR, 61 14100 ASTI AT',                    // Piemonte Carni
  '701134': 'VIA FONTANA, 4 14100 ASTI AT',                    // Il Gusto  
  '701168': 'VIA REPERGO, 40 14057 ISOLA D\'ASTI AT',          // La Mandria
  '701179': 'P.ZA DEL POPOLO, 3 14046 MOMBARUZZO AT',         // Arudi Mirella
  '701184': 'VIA MOLINETTO, 24 15122 ALESSANDRIA AL',         // Molinetto Salumi
  '701205': 'VIA GIANOLI, 64 15020 MURISENGO AL',             // Azienda Isabella
  '701207': 'VIA REGIONE ISOLA, 2/A C/O ARDITI FRATELLI 15030 ROSIGNANO MONFERRATO AL',
  '701209': 'VIALE RISORGIMENTO, 162 14053 CANELLI AT',       // Panetteria Pistone
  '701213': 'VIA CHIVASSO, 7 15020 MURISENGO AL'              // Bottega Della Carne
};

// Mappatura indirizzi per codice ODV
const ODV_DELIVERY_MAPPING = {
  '507A085AS00704': 'VIA CAVOUR, 61 14100 ASTI AT',           // Piemonte Carni
  '507A865AS02780': 'VIA FONTANA, 4 14100 ASTI AT',           // Il Gusto
  '507A865AS02772': 'VIA MOLINETTO, 24 15122 ALESSANDRIA AL', // Molinetto Salumi
  '507A865AS02790': 'VIA REGIONE ISOLA, 2/A C/O ARDITI FRATELLI 15030 ROSIGNANO MONFERRATO AL',
  '507A865AS02789': 'VIALE RISORGIMENTO, 162 14053 CANELLI AT',
  '507A865AS02786': 'VIA CHIVASSO, 7 15020 MURISENGO AL'
};

// Codici articolo validi
const VALID_ARTICLE_CODES = [
  '070017', '070056', '070057', '200000', '200016', '200523', 
  '200527', '200553', '200575', '200576', 'DL000301', 'PS000034', 
  'PS000077', 'PS000386', 'VS000012', 'VS000169', 'VS000198', 
  'VS000425', 'VS000881', 'VS000891', 'PIRR002', 'PIRR003', 'PIRR004'
];

// Parole chiave per identificare indirizzo Alfieri (da escludere)
const ALFIERI_KEYWORDS = [
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

// Unità di misura valide
const VALID_UNITS = ['PZ', 'KG', 'LT', 'MT', 'CF', 'CT', 'GR', 'ML'];

// Forme societarie
const COMPANY_FORMS = [
  'S\\.?R\\.?L\\.?', 'S\\.?P\\.?A\\.?', 'S\\.?N\\.?C\\.?', 'S\\.?A\\.?S\\.?',
  'S\\.?S\\.?(?:\\.|\\b)', 'S\\.?C\\.?', 'COOP', '& C\\.', '& FIGLI', '& F\\.LLI',
  'SARL', 'SA', 'LTD', 'GMBH', 'AG', 'BV', 'NV'
];

// Marcatori per sezioni del documento
const SECTION_MARKERS = {
  delivery: [
    'LUOGO DI CONSEGNA',
    'Luogo di consegna',
    'INDIRIZZO DI CONSEGNA', 
    'DESTINAZIONE MERCE',
    'CONSEGNARE A',
    'DELIVERY ADDRESS',
    'SHIP TO',
    'DESTINATARIO MERCE',
    'CONSEGNA PRESSO',
    'RECAPITO CONSEGNA',
    'PUNTO DI CONSEGNA'
  ],
  customer: [
    'CLIENTE',
    'INTESTATARIO',
    'RAGIONE SOCIALE',
    'DENOMINAZIONE',
    'CUSTOMER',
    'SOLD TO'
  ],
  items: [
    'DESCRIZIONE',
    'ARTICOLI',
    'MERCE',
    'PRODOTTI',
    'ITEMS',
    'DESCRIPTION'
  ]
};

// Tipi di strada riconosciuti
const STREET_TYPES = [
  'VIA', 'V.LE', 'VIALE', 'CORSO', 'C.SO', 'P.ZA', 'PIAZZA', 
  'STRADA', 'STR.', 'LOC.', 'LOCALITA\'', 'FRAZ.', 'FRAZIONE', 
  'BORGO', 'VICOLO', 'V.LO', 'LARGO', 'L.GO', 'CONTRADA', 'C.DA'
];

// Aliquote IVA standard
const VAT_RATES = {
  REDUCED: 4,     // Aliquota ridotta
  STANDARD: 10,   // Aliquota standard
  FULL: 22        // Aliquota piena
};

// Configurazioni varie
const CONFIG = {
  // Limiti e timeout
  maxDebugLength: 1000,
  pdfExtractionTimeout: 30000,
  maxLinesPerSection: 50,
  
  // Soglie per matching
  addressMatchThreshold: 0.8,
  nameMatchThreshold: 0.85,
  
  // Formattazione
  dateFormat: 'DD/MM/YYYY',
  numberDecimalSeparator: ',',
  
  // Debug
  enableDebugLogging: true,
  debugElementId: 'documentDebugContent'
};

// Esporta tutto come oggetto unico per retrocompatibilità
const MAPPINGS = {
  CLIENT_NAME: CLIENT_NAME_MAPPING,
  INTERNAL_CODE_DELIVERY: INTERNAL_CODE_DELIVERY_MAPPING,
  ODV_DELIVERY: ODV_DELIVERY_MAPPING,
  ARTICLE_CODES: VALID_ARTICLE_CODES,
  ALFIERI_KEYWORDS: ALFIERI_KEYWORDS,
  UNITS: VALID_UNITS,
  COMPANY_FORMS: COMPANY_FORMS,
  SECTION_MARKERS: SECTION_MARKERS,
  STREET_TYPES: STREET_TYPES,
  VAT_RATES: VAT_RATES,
  CONFIG: CONFIG
};

// Per compatibilità con caricamento tramite script tag
if (typeof window !== 'undefined') {
  window.DDTFT_MAPPINGS = MAPPINGS;
}
}