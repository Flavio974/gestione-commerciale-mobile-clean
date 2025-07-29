/**
 * Main Application File - Optimized Version
 * Core dell'applicazione senza moduli secondari
 * Ridotto da 1161 → ~160 righe (86% riduzione)
 */

const AppConfig = {
  DEBUG: true,
  VERSION: '2.0.0',
  STORAGE_PREFIX: 'gc_mobile_',
  TIMERS: {
    AUTO_SAVE: 30000,
    DEMO_PROTECTION: 2000,
    CLOCK_UPDATE: 1000
  },
  SELECTORS: {
    DEMO_TAB: '#tab-demo',
    MAIN_NAV: '#main-navigation',
    LOADING: '.loading-overlay'
  }
};

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

  /**
   * Inizializzazione applicazione
   */
  async init() {
    try {
      console.log('🚀 App.init() - Avvio applicazione v' + AppConfig.VERSION);
      
      this.loadSavedData();
      this.initializeComponents();
      this.setupEventListeners();
      await this.loadInitialData();
      this.startAutoSave();
      this.showInterface();
      
      console.log('✅ Applicazione inizializzata con successo');
    } catch (error) {
      console.error('❌ Errore inizializzazione:', error);
      this.showError('Errore durante l\'inizializzazione dell\'applicazione');
    }
  },

  /**
   * Carica dati salvati
   */
  loadSavedData() {
    try {
      const saved = localStorage.getItem(AppConfig.STORAGE_PREFIX + 'app_state');
      if (saved) {
        const data = JSON.parse(saved);
        this.state = { ...this.state, ...data };
        console.log('📂 Dati locali caricati');
      }
    } catch (error) {
      console.error('❌ Errore caricamento dati locali:', error);
    }
  },

  /**
   * Inizializza componenti
   */
  initializeComponents() {
    console.log('🔧 Inizializzazione componenti...');
    
    // Inizializza moduli se disponibili
    const modules = [
      'Timeline', 'Clienti', 'Ordini', 'Prodotti', 'Percorsi', 
      'DDTFTImport', 'Navigation', 'Utils'
    ];
    
    modules.forEach(moduleName => {
      if (window[moduleName] && typeof window[moduleName].init === 'function') {
        try {
          window[moduleName].init();
          console.log(`✅ ${moduleName} inizializzato`);
        } catch (error) {
          console.error(`❌ Errore inizializzazione ${moduleName}:`, error);
        }
      }
    });
  },

  /**
   * Setup event listeners globali
   */
  setupEventListeners() {
    // Resize eventi
    window.addEventListener('resize', () => {
      if (typeof Utils !== 'undefined' && Utils.updateViewportInfo) {
        Utils.updateViewportInfo();
      }
    });

    // Stato online/offline
    window.addEventListener('online', () => {
      console.log('🌐 Connessione online ripristinata');
      this.loadInitialData();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Applicazione offline');
    });

    // Gestione errori globali
    window.addEventListener('error', (event) => {
      console.error('💥 Errore globale:', event.error);
    });

    console.log('🎯 Event listeners configurati');
  },

  /**
   * Carica dati iniziali
   */
  async loadInitialData() {
    this.setLoading(true);
    
    try {
      // Carica dati di base se i moduli sono disponibili
      if (window.Timeline && typeof window.Timeline.loadEvents === 'function') {
        await window.Timeline.loadEvents();
      }
      
      console.log('📊 Dati iniziali caricati');
    } catch (error) {
      console.error('❌ Errore caricamento dati:', error);
    } finally {
      this.setLoading(false);
    }
  },

  /**
   * Avvia auto-save
   */
  startAutoSave() {
    setInterval(() => {
      this.saveData();
    }, AppConfig.TIMERS.AUTO_SAVE);
    
    console.log(`💾 Auto-save attivo ogni ${AppConfig.TIMERS.AUTO_SAVE/1000}s`);
  },

  /**
   * Salva dati
   */
  saveData() {
    try {
      const dataToSave = {
        currentTab: this.state.currentTab,
        settings: this.state.settings,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(AppConfig.STORAGE_PREFIX + 'app_state', JSON.stringify(dataToSave));
      
      if (AppConfig.DEBUG) {
        console.log('💾 Dati salvati:', dataToSave);
      }
    } catch (error) {
      console.error('❌ Errore salvataggio:', error);
    }
  },

  /**
   * Mostra interfaccia
   */
  showInterface() {
    const loadingEl = document.querySelector(AppConfig.SELECTORS.LOADING);
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
    
    // Avvia orologio se l'elemento esiste
    this.startClock();
    
    console.log('🎨 Interfaccia mostrata');
  },

  /**
   * Gestione stato loading
   */
  setLoading(isLoading) {
    this.state.isLoading = isLoading;
    const loadingEl = document.querySelector(AppConfig.SELECTORS.LOADING);
    
    if (loadingEl) {
      loadingEl.style.display = isLoading ? 'flex' : 'none';
    }
  },

  /**
   * Avvia orologio
   */
  startClock() {
    const clockElement = document.getElementById('current-time');
    if (!clockElement) return;
    
    const updateClock = () => {
      const now = new Date();
      clockElement.textContent = now.toLocaleTimeString('it-IT');
    };
    
    updateClock();
    setInterval(updateClock, AppConfig.TIMERS.CLOCK_UPDATE);
  },

  /**
   * Mostra errore
   */
  showError(message) {
    console.error('❌ App Error:', message);
    
    if (typeof Utils !== 'undefined' && Utils.showNotification) {
      Utils.showNotification(message, 'error');
    } else {
      alert(message);
    }
  }
};

// Auto-inizializzazione quando DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}

// Export per uso in altri moduli
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { App, AppConfig };
}

// Esponi globalmente per test
if (typeof global !== 'undefined') {
  global.App = App;
  global.AppConfig = AppConfig;
}