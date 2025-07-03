/**
 * API Service
 * Gestione centralizzata delle chiamate API
 */

const ApiService = {
  // Cache delle richieste
  cache: new Map(),
  cacheTimeout: 5 * 60 * 1000, // 5 minuti
  
  // Richieste in corso
  pendingRequests: new Map(),
  
  /**
   * Metodo generico per richieste HTTP
   */
  request: async function(method, endpoint, data = null, options = {}) {
    const url = API_CONFIG.buildUrl(endpoint, options.params);
    const cacheKey = `${method}:${url}`;
    
    // Controlla cache per GET
    if (method === 'GET' && !options.noCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    // Evita richieste duplicate
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }
    
    // Prepara opzioni richiesta
    const requestOptions = {
      method,
      headers: API_CONFIG.getHeaders(options.headers),
      signal: options.signal
    };
    
    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data);
    }
    
    // Crea promise per la richiesta
    const requestPromise = this.executeRequest(url, requestOptions, options);
    
    // Salva come pending
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const response = await requestPromise;
      
      // Salva in cache se GET
      if (method === 'GET' && !options.noCache) {
        this.saveToCache(cacheKey, response);
      }
      
      return response;
      
    } finally {
      // Rimuovi da pending
      this.pendingRequests.delete(cacheKey);
    }
  },
  
  /**
   * Esegue la richiesta HTTP
   */
  executeRequest: async function(url, options, extraOptions = {}) {
    const timeout = extraOptions.timeout || API_CONFIG.TIMEOUT;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(API_CONFIG.ERROR_MESSAGES.TIMEOUT_ERROR);
      }
      
      if (!navigator.onLine) {
        throw new Error(API_CONFIG.ERROR_MESSAGES.NETWORK_ERROR);
      }
      
      throw error;
    }
  },
  
  /**
   * Gestisce errori della risposta
   */
  handleErrorResponse: async function(response) {
    let errorMessage = API_CONFIG.ERROR_MESSAGES.GENERIC_ERROR;
    let errorData = null;
    
    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Response non è JSON
    }
    
    switch (response.status) {
      case 401:
        errorMessage = API_CONFIG.ERROR_MESSAGES.UNAUTHORIZED;
        // Trigger logout
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        break;
      case 404:
        errorMessage = API_CONFIG.ERROR_MESSAGES.NOT_FOUND;
        break;
      case 422:
      case 400:
        errorMessage = API_CONFIG.ERROR_MESSAGES.VALIDATION_ERROR;
        break;
      case 500:
      case 502:
      case 503:
        errorMessage = API_CONFIG.ERROR_MESSAGES.SERVER_ERROR;
        break;
    }
    
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = errorData;
    return error;
  },
  
  /**
   * Metodi HTTP shortcuts
   */
  get: function(endpoint, options = {}) {
    return this.request('GET', endpoint, null, options);
  },
  
  post: function(endpoint, data, options = {}) {
    return this.request('POST', endpoint, data, options);
  },
  
  put: function(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, data, options);
  },
  
  delete: function(endpoint, options = {}) {
    return this.request('DELETE', endpoint, null, options);
  },
  
  /**
   * Upload file
   */
  upload: async function(endpoint, file, additionalData = {}, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Aggiungi dati addizionali
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });
    
    const response = await fetch(API_CONFIG.buildUrl(endpoint), {
      method: 'POST',
      headers: {
        ...API_CONFIG.getHeaders(),
        // Rimuovi Content-Type per FormData
        'Content-Type': undefined
      },
      body: formData
    });
    
    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }
    
    return response.json();
  },
  
  /**
   * Download file
   */
  download: async function(endpoint, filename, options = {}) {
    const response = await fetch(API_CONFIG.buildUrl(endpoint, options.params), {
      method: 'GET',
      headers: API_CONFIG.getHeaders()
    });
    
    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  
  /**
   * Gestione cache
   */
  getFromCache: function(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  },
  
  saveToCache: function(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },
  
  clearCache: function() {
    this.cache.clear();
  },
  
  /**
   * Retry logic
   */
  retry: async function(fn, options = {}) {
    const maxAttempts = options.maxAttempts || API_CONFIG.RETRY.MAX_ATTEMPTS;
    const delay = options.delay || API_CONFIG.RETRY.DELAY;
    const backoff = options.backoff || API_CONFIG.RETRY.BACKOFF_MULTIPLIER;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          throw error;
        }
        
        const waitTime = delay * Math.pow(backoff, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError;
  },
  
  /**
   * Batch requests
   */
  batch: async function(requests) {
    const results = await Promise.allSettled(requests);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { success: true, data: result.value };
      } else {
        return { success: false, error: result.reason };
      }
    });
  }
};

/**
 * API Methods specifici per entità
 */
const API = {
  // Clienti
  clients: {
    getAll: (params) => ApiService.get(API_CONFIG.ENDPOINTS.CLIENTS.LIST, { params }),
    getById: (id) => ApiService.get(API_CONFIG.ENDPOINTS.CLIENTS.DETAIL, { params: { id } }),
    create: (data) => ApiService.post(API_CONFIG.ENDPOINTS.CLIENTS.CREATE, data),
    update: (id, data) => ApiService.put(API_CONFIG.ENDPOINTS.CLIENTS.UPDATE, data, { params: { id } }),
    delete: (id) => ApiService.delete(API_CONFIG.ENDPOINTS.CLIENTS.DELETE, { params: { id } }),
    import: (file) => ApiService.upload(API_CONFIG.ENDPOINTS.CLIENTS.IMPORT, file),
    export: (format = 'xlsx') => ApiService.download(API_CONFIG.ENDPOINTS.CLIENTS.EXPORT, `clienti.${format}`, { params: { format } }),
    search: (query) => ApiService.get(API_CONFIG.ENDPOINTS.CLIENTS.SEARCH, { params: { q: query } })
  },
  
  // Ordini
  orders: {
    getAll: (params) => ApiService.get(API_CONFIG.ENDPOINTS.ORDERS.LIST, { params }),
    getById: (id) => ApiService.get(API_CONFIG.ENDPOINTS.ORDERS.DETAIL, { params: { id } }),
    create: (data) => ApiService.post(API_CONFIG.ENDPOINTS.ORDERS.CREATE, data),
    update: (id, data) => ApiService.put(API_CONFIG.ENDPOINTS.ORDERS.UPDATE, data, { params: { id } }),
    delete: (id) => ApiService.delete(API_CONFIG.ENDPOINTS.ORDERS.DELETE, { params: { id } }),
    importPDF: (files) => {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });
      return ApiService.upload(API_CONFIG.ENDPOINTS.ORDERS.IMPORT_PDF, formData);
    },
    export: (format = 'xlsx') => ApiService.download(API_CONFIG.ENDPOINTS.ORDERS.EXPORT, `ordini.${format}`, { params: { format } }),
    getProducts: (orderId) => ApiService.get(API_CONFIG.ENDPOINTS.ORDERS.PRODUCTS, { params: { id: orderId } })
  },
  
  // Prodotti
  products: {
    getAll: (params) => ApiService.get(API_CONFIG.ENDPOINTS.PRODUCTS.LIST, { params }),
    getById: (id) => ApiService.get(API_CONFIG.ENDPOINTS.PRODUCTS.DETAIL, { params: { id } }),
    getCategories: () => ApiService.get(API_CONFIG.ENDPOINTS.PRODUCTS.CATEGORIES),
    search: (query) => ApiService.get(API_CONFIG.ENDPOINTS.PRODUCTS.SEARCH, { params: { q: query } })
  },
  
  // Percorsi
  routes: {
    getAll: (params) => ApiService.get(API_CONFIG.ENDPOINTS.ROUTES.LIST, { params }),
    getById: (id) => ApiService.get(API_CONFIG.ENDPOINTS.ROUTES.DETAIL, { params: { id } }),
    create: (data) => ApiService.post(API_CONFIG.ENDPOINTS.ROUTES.CREATE, data),
    update: (id, data) => ApiService.put(API_CONFIG.ENDPOINTS.ROUTES.UPDATE, data, { params: { id } }),
    delete: (id) => ApiService.delete(API_CONFIG.ENDPOINTS.ROUTES.DELETE, { params: { id } }),
    import: (file) => ApiService.upload(API_CONFIG.ENDPOINTS.ROUTES.IMPORT, file),
    optimize: (data) => ApiService.post(API_CONFIG.ENDPOINTS.ROUTES.OPTIMIZE, data)
  },
  
  // Timeline
  timeline: {
    getEvents: (date) => ApiService.get(API_CONFIG.ENDPOINTS.TIMELINE.EVENTS, { params: { date } }),
    createEvent: (data) => ApiService.post(API_CONFIG.ENDPOINTS.TIMELINE.EVENTS, data),
    updateEvent: (id, data) => ApiService.put(API_CONFIG.ENDPOINTS.TIMELINE.EVENT, data, { params: { id } }),
    deleteEvent: (id) => ApiService.delete(API_CONFIG.ENDPOINTS.TIMELINE.EVENT, { params: { id } }),
    getRealEvents: (date) => ApiService.get(API_CONFIG.ENDPOINTS.TIMELINE.REAL_EVENTS, { params: { date } }),
    getRecalculated: (date) => ApiService.get(API_CONFIG.ENDPOINTS.TIMELINE.RECALCULATED, { params: { date } })
  },
  
  // Pianificazione
  planning: {
    generatePlan: (data) => ApiService.post(API_CONFIG.ENDPOINTS.PLANNING.GENERATE, data),
    getWorksheet: (date) => ApiService.get(API_CONFIG.ENDPOINTS.PLANNING.WORKSHEET, { params: { date } }),
    createItinerary: (data) => ApiService.post(API_CONFIG.ENDPOINTS.PLANNING.ITINERARY, data),
    optimizeItinerary: (data) => ApiService.post(API_CONFIG.ENDPOINTS.PLANNING.OPTIMIZE, data)
  },
  
  // Documenti
  documents: {
    getDDTList: (params) => ApiService.get(API_CONFIG.ENDPOINTS.DOCUMENTS.DDT_LIST, { params }),
    getDDTById: (id) => ApiService.get(API_CONFIG.ENDPOINTS.DOCUMENTS.DDT_DETAIL, { params: { id } }),
    createDDT: (data) => ApiService.post(API_CONFIG.ENDPOINTS.DOCUMENTS.DDT_CREATE, data),
    getInvoiceList: (params) => ApiService.get(API_CONFIG.ENDPOINTS.DOCUMENTS.FT_LIST, { params }),
    getInvoiceById: (id) => ApiService.get(API_CONFIG.ENDPOINTS.DOCUMENTS.FT_DETAIL, { params: { id } }),
    createInvoice: (data) => ApiService.post(API_CONFIG.ENDPOINTS.DOCUMENTS.FT_CREATE, data),
    exportPDF: (type, id) => ApiService.download(API_CONFIG.ENDPOINTS.DOCUMENTS.EXPORT_PDF, `${type}_${id}.pdf`, { params: { type, id } })
  }
};

// Rendi disponibili globalmente
window.ApiService = ApiService;
window.API = API;