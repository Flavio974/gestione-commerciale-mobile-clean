/**
 * API Configuration
 * Configurazione centralizzata per tutte le chiamate API
 */

const API_CONFIG = {
  // Base URL per le API - modificare in produzione
  BASE_URL: 'https://api.gestionecommerciale.com/v1',
  
  // Endpoints
  ENDPOINTS: {
    // Timeline
    TIMELINE: {
      EVENTS: '/timeline/events',
      EVENT: '/timeline/events/:id',
      REAL_EVENTS: '/timeline/real-events',
      RECALCULATED: '/timeline/recalculated'
    },
    
    // Clienti
    CLIENTS: {
      LIST: '/clients',
      DETAIL: '/clients/:id',
      CREATE: '/clients',
      UPDATE: '/clients/:id',
      DELETE: '/clients/:id',
      IMPORT: '/clients/import',
      EXPORT: '/clients/export',
      SEARCH: '/clients/search'
    },
    
    // Ordini
    ORDERS: {
      LIST: '/orders',
      DETAIL: '/orders/:id',
      CREATE: '/orders',
      UPDATE: '/orders/:id',
      DELETE: '/orders/:id',
      IMPORT_PDF: '/orders/import-pdf',
      EXPORT: '/orders/export',
      PRODUCTS: '/orders/:id/products'
    },
    
    // Prodotti
    PRODUCTS: {
      LIST: '/products',
      DETAIL: '/products/:id',
      CATEGORIES: '/products/categories',
      SEARCH: '/products/search'
    },
    
    // Percorsi
    ROUTES: {
      LIST: '/routes',
      DETAIL: '/routes/:id',
      CREATE: '/routes',
      UPDATE: '/routes/:id',
      DELETE: '/routes/:id',
      IMPORT: '/routes/import',
      OPTIMIZE: '/routes/optimize'
    },
    
    // DDT e Fatture
    DOCUMENTS: {
      DDT_LIST: '/documents/ddt',
      DDT_DETAIL: '/documents/ddt/:id',
      DDT_CREATE: '/documents/ddt',
      FT_LIST: '/documents/invoices',
      FT_DETAIL: '/documents/invoices/:id',
      FT_CREATE: '/documents/invoices',
      EXPORT_PDF: '/documents/export-pdf/:type/:id'
    },
    
    // Pianificazione
    PLANNING: {
      GENERATE: '/planning/generate',
      WORKSHEET: '/planning/worksheet',
      ITINERARY: '/planning/itinerary',
      OPTIMIZE: '/planning/optimize'
    },
    
    // Auth (per futura implementazione)
    AUTH: {
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      USER: '/auth/user'
    }
  },
  
  // Headers di default
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Timeout in millisecondi
  TIMEOUT: 30000,
  
  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000,
    BACKOFF_MULTIPLIER: 2
  },
  
  // Mapping entità-tabella per database Supabase
  ENTITY_TABLE_MAP: {
    orders: 'archivio_ordini_venduto',
    clients: 'clients',
    products: 'products', 
    routes: 'percorsi',
    documents: 'documents',
    timeline_events: 'timeline_events'
  },
  
  // Gestione errori
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Errore di rete. Verifica la connessione.',
    TIMEOUT_ERROR: 'Richiesta scaduta. Riprova più tardi.',
    SERVER_ERROR: 'Errore del server. Contatta l\'assistenza.',
    UNAUTHORIZED: 'Non autorizzato. Effettua il login.',
    NOT_FOUND: 'Risorsa non trovata.',
    VALIDATION_ERROR: 'Dati non validi. Controlla i campi.',
    GENERIC_ERROR: 'Si è verificato un errore. Riprova.'
  }
};

// Funzione helper per costruire URL con parametri
API_CONFIG.buildUrl = function(endpoint, params = {}) {
  let url = endpoint;
  
  // Sostituisci i parametri nell'URL (es. :id)
  Object.keys(params).forEach(key => {
    if (url.includes(`:${key}`)) {
      url = url.replace(`:${key}`, params[key]);
      delete params[key];
    }
  });
  
  // Aggiungi query string se ci sono parametri rimanenti
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return `${this.BASE_URL}${url}`;
};

// Funzione per ottenere headers con autenticazione
API_CONFIG.getHeaders = function(customHeaders = {}) {
  const authToken = localStorage.getItem('authToken');
  const headers = { ...this.DEFAULT_HEADERS, ...customHeaders };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return headers;
};

// Configurazione per ambiente di sviluppo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  API_CONFIG.BASE_URL = 'http://localhost:3000/api/v1';
  API_CONFIG.USE_MOCK_DATA = true;
} else {
  API_CONFIG.USE_MOCK_DATA = false;
}

// Freeze dell'oggetto per evitare modifiche accidentali
Object.freeze(API_CONFIG);

// Esporta API_CONFIG globalmente per uso in browser
window.API_CONFIG = API_CONFIG;