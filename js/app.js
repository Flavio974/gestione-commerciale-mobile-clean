/**
 * Main Application File
 * Inizializzazione e gestione principale dell'applicazione
 */

const App = {
  // Stato dell'applicazione
  state: {
    currentTab: 'timeline',
    isLoading: false,
    user: null,
    settings: {},
    data: {
      events: [],
      clients: [],
      orders: [],
      routes: [],
      documents: []
    }
  },
  
  // Configurazione
  config: {
    DEBUG: true,
    VERSION: '2.0.0',
    STORAGE_PREFIX: 'gc_mobile_',
    AUTO_SAVE_INTERVAL: 30000 // 30 secondi
  },
  
  /**
   * Inizializzazione applicazione
   */
  init: async function() {
    
    try {
      // Carica dati salvati
      this.loadSavedData();
      
      // Inizializza componenti
      this.initializeComponents();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Carica dati iniziali
      await this.loadInitialData();
      
      // Avvia auto-save
      this.startAutoSave();
      
      // Mostra interfaccia
      this.showInterface();
      
      // Avvia orologio
      this.updateClock();
      this.clockInterval = setInterval(() => this.updateClock(), 1000);
      
      
    } catch (error) {
      console.error('❌ Errore durante inizializzazione:', error);
      Utils.notify('Errore durante il caricamento dell\'applicazione', 'error');
    }
  },
  
  /**
   * Carica dati salvati dal localStorage
   */
  loadSavedData: function() {
    
    // Carica impostazioni
    this.state.settings = Utils.storage.get(this.config.STORAGE_PREFIX + 'settings') || {};
    
    // Carica dati
    const savedData = Utils.storage.get(this.config.STORAGE_PREFIX + 'data');
    if (savedData) {
      this.state.data = { ...this.state.data, ...savedData };
    }
    
    // Carica ultimo tab attivo
    const lastTab = Utils.storage.get(this.config.STORAGE_PREFIX + 'lastTab');
    if (lastTab) {
      this.state.currentTab = lastTab;
    }
  },
  
  /**
   * Inizializza componenti
   */
  initializeComponents: function() {
    
    // Inizializza navigazione
    if (window.Navigation) {
      Navigation.init();
    }
    
    // Orologio gestito nel DOM ready
    
    // Inizializza moduli se disponibili
    const modules = ['Timeline', 'Clienti', 'Ordini', 'Prodotti', 'Percorsi', 'Worksheet', 'DDTFTModule', 'ComandiModule'];
    modules.forEach(module => {
      if (window[module] && typeof window[module].init === 'function') {
        try {
          window[module].init();
        } catch (error) {
          console.error(`❌ Errore inizializzazione modulo ${module}:`, error);
        }
      }
    });
  },
  
  /**
   * Setup event listeners globali
   */
  setupEventListeners: function() {
    // Gestione resize
    window.addEventListener('resize', Utils.debounce(() => {
      this.handleResize();
    }, 250));
    
    // Gestione online/offline
    window.addEventListener('online', () => {
      Utils.notify('Connessione ripristinata', 'success');
      this.syncData();
    });
    
    window.addEventListener('offline', () => {
      Utils.notify('Connessione persa. Modalità offline attiva.', 'warning');
    });
    
    // Gestione visibility change (per auto-save)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveData();
      }
    });
    
    // Gestione beforeunload
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'Ci sono modifiche non salvate. Vuoi davvero uscire?';
      }
    });
  },
  
  /**
   * Carica dati iniziali
   */
  loadInitialData: async function() {
    
    // In modalità sviluppo, usa dati mock
    if (API_CONFIG.USE_MOCK_DATA) {
      await this.loadMockData();
      return;
    }
    
    // Altrimenti carica da API
    try {
      this.setLoading(true);
      
      // TODO: Implementare caricamento dati da API
      // const promises = [
      //   this.loadClients(),
      //   this.loadOrders(),
      //   this.loadRoutes()
      // ];
      // 
      // await Promise.all(promises);
      
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      Utils.notify('Errore nel caricamento dei dati', 'error');
    } finally {
      this.setLoading(false);
    }
  },
  
  /**
   * Carica dati mock per sviluppo
   */
  loadMockData: async function() {
    
    // Simula delay network
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Dati mock
    this.state.data.clients = [
      {
        id: '1',
        code: 'CL001',
        name: 'Pizzeria da Mario',
        contact: 'Mario Rossi',
        address: 'Via Roma 123',
        city: 'Milano',
        province: 'MI',
        phone: '02 1234567',
        priority: 'alta',
        lastVisit: '2024-01-15',
        visitFrequency: 30
      },
      {
        id: '2',
        code: 'CL002',
        name: 'Ristorante il Gusto',
        contact: 'Luigi Verdi',
        address: 'Corso Italia 45',
        city: 'Torino',
        province: 'TO',
        phone: '011 7654321',
        priority: 'media',
        lastVisit: '2024-01-20',
        visitFrequency: 45
      }
    ];
    
    this.state.data.orders = [
      {
        id: '1',
        orderNumber: 'ORD001',
        client: 'Pizzeria da Mario',
        orderDate: '2024-01-25',
        status: 'pending',
        total: 1250.50
      }
    ];
  },
  
  /**
   * Gestisce il resize della finestra
   */
  handleResize: function() {
    const viewport = Utils.getViewport();
    
    // Notifica ai moduli del resize
    window.dispatchEvent(new CustomEvent('app:resize', { detail: viewport }));
  },
  
  /**
   * Avvia auto-save
   */
  startAutoSave: function() {
    setInterval(() => {
      this.saveData();
    }, this.config.AUTO_SAVE_INTERVAL);
  },
  
  /**
   * Salva dati
   */
  saveData: function() {
    
    Utils.storage.set(this.config.STORAGE_PREFIX + 'data', this.state.data);
    Utils.storage.set(this.config.STORAGE_PREFIX + 'settings', this.state.settings);
    Utils.storage.set(this.config.STORAGE_PREFIX + 'lastTab', this.state.currentTab);
  },
  
  /**
   * Sincronizza dati con server
   */
  syncData: async function() {
    if (!navigator.onLine) return;
    
    
    try {
      // TODO: Implementare sync con API
      Utils.notify('Dati sincronizzati', 'success');
    } catch (error) {
      console.error('Errore sincronizzazione:', error);
      Utils.notify('Errore durante la sincronizzazione', 'error');
    }
  },
  
  /**
   * Verifica modifiche non salvate
   */
  hasUnsavedChanges: function() {
    // TODO: Implementare logica per verificare modifiche
    return false;
  },
  
  /**
   * Imposta stato loading
   */
  setLoading: function(loading) {
    this.state.isLoading = loading;
    document.body.classList.toggle('loading', loading);
  },
  
  /**
   * Mostra interfaccia
   */
  showInterface: function() {
    // Rimuovi splash screen se presente
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 300);
    }
    
    // Mostra tab corrente
    const activeTab = document.querySelector(`[data-target="${this.state.currentTab}-content"]`);
    if (activeTab) {
      activeTab.click();
    }
  },
  
  /**
   * Aggiorna orologio
   */
  updateClock: function() {
    const now = new Date();
    const dateEl = document.getElementById('dateDisplay');
    const clockEl = document.getElementById('staticClock');
    
    if (dateEl) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      dateEl.textContent = now.toLocaleDateString('it-IT', options);
    }
    
    if (clockEl) {
      clockEl.textContent = Utils.formatDate(now, 'HH:mm:ss');
    }
  },
  

  /**
   * API Methods
   */
  loadClients: async function() {
    // TODO: Implementare chiamata API
  },
  
  loadOrders: async function() {
    // TODO: Implementare chiamata API
  },
  
  loadRoutes: async function() {
    // TODO: Implementare chiamata API
  },
  
  /**
   * Metodi pubblici
   */
  getState: function() {
    return this.state;
  },
  
  setState: function(newState) {
    this.state = { ...this.state, ...newState };
    this.saveData();
  },
  
  getData: function(key) {
    return key ? this.state.data[key] : this.state.data;
  },
  
  setData: function(key, value) {
    this.state.data[key] = value;
    this.saveData();
  },
  
};

// Inizializza app quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Rendi App disponibile globalmente
window.App = App;