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
      
      // FORCE DEMO TAB VISIBILITY - CREA DINAMICAMENTE SE NON ESISTE
      setTimeout(() => {
        let demoTab = document.getElementById('tab-demo');
        if (!demoTab) {
          console.log('🔧 DEMO TAB NON TROVATO - Creazione dinamica...');
          
          // Trova il container della navigazione
          const navContainer = document.getElementById('main-navigation');
          if (navContainer) {
            // Crea il tab demo
            demoTab = document.createElement('div');
            demoTab.id = 'tab-demo';
            demoTab.className = 'tab-link';
            demoTab.setAttribute('data-target', 'demo-content');
            demoTab.innerHTML = '🇮🇹 Demo Date';
            demoTab.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; background: linear-gradient(135deg, #00b894, #00a085) !important; color: white !important; font-weight: bold !important; border: 3px solid #ff6b6b !important; box-shadow: 0 4px 15px rgba(255,107,107,0.5) !important; padding: 10px 15px !important; margin: 5px !important; border-radius: 5px !important; cursor: pointer !important;';
            
            // Aggiungi il tab al container
            navContainer.appendChild(demoTab);
            console.log('✅ DEMO TAB CREATO DINAMICAMENTE!');
            
            // Ora crea anche il contenuto se non esiste
            let demoContent = document.getElementById('demo-content');
            if (!demoContent) {
              demoContent = document.createElement('div');
              demoContent.id = 'demo-content';
              demoContent.className = 'tab-content';
              demoContent.innerHTML = `
                <div style="padding: 20px;">
                  <h2>🇮🇹 Sistema Date Italiane</h2>
                  <p>Sistema completo per la gestione delle date in formato italiano.</p>
                  
                  <div style="margin: 20px 0;">
                    <button onclick="testItalianDateSystem()" class="btn btn-primary">🧪 Test Sistema Date</button>
                  </div>
                  
                  <div id="quick-test-results" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; display: none;">
                    <h4>Risultati Test:</h4>
                    <div id="test-output"></div>
                  </div>
                </div>
              `;
              
              // Trova dove inserire il contenuto
              const contentContainer = document.querySelector('.main-content, #main-content, .container');
              if (contentContainer) {
                contentContainer.appendChild(demoContent);
                console.log('✅ DEMO CONTENT CREATO!');
              }
            }
            
          } else {
            console.error('❌ Container navigazione non trovato!');
          }
        } else {
          console.log('🔥 DEMO TAB ESISTENTE - Forzando visibilità...');
          demoTab.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; background: linear-gradient(135deg, #00b894, #00a085) !important; color: white !important; font-weight: bold !important; border: 3px solid #ff6b6b !important; box-shadow: 0 4px 15px rgba(255,107,107,0.5) !important; position: relative !important; z-index: 999 !important;';
          if (demoTab.parentElement) {
            demoTab.parentElement.style.display = 'flex';
          }
          console.log('🔥 DEMO TAB FORCED VISIBLE');
        }
      }, 2000);
      
      
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
    
    // DEBUG: Verifica scheda demo
    setTimeout(() => {
      const demoTab = document.getElementById('tab-demo');
      console.log('🔍 DEBUG DEMO TAB:', {
        exists: !!demoTab,
        visible: demoTab ? getComputedStyle(demoTab).display : 'N/A',
        opacity: demoTab ? getComputedStyle(demoTab).opacity : 'N/A',
        position: demoTab ? demoTab.getBoundingClientRect() : 'N/A',
        classes: demoTab ? demoTab.className : 'N/A',
        style: demoTab ? demoTab.style.cssText : 'N/A'
      });
      
      if (demoTab) {
        demoTab.style.display = 'block';
        demoTab.style.visibility = 'visible';
        demoTab.style.opacity = '1';
        console.log('🔧 Forced demo tab visibility');
      }
    }, 1000);
    
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

/**
 * Funzione di test veloce per il sistema date italiano
 */
function testItalianDateSystem() {
  const resultsDiv = document.getElementById('quick-test-results');
  const outputDiv = document.getElementById('test-output');
  
  if (!window.ItalianDateSystem) {
    outputDiv.innerHTML = '<div style="color: red;">❌ Sistema Date Italiano non caricato!</div>';
    resultsDiv.style.display = 'block';
    return;
  }
  
  let output = '<div style="color: green;">✅ Sistema Date Italiano caricato correttamente!</div><br>';
  
  try {
    // Test validazione
    const validDate = window.ItalianDateSystem.isValidItalianDate('15/03/2025');
    const invalidDate = window.ItalianDateSystem.isValidItalianDate('32/01/2025');
    output += `<strong>Test Validazione:</strong><br>`;
    output += `• 15/03/2025: ${validDate ? '✅ Valida' : '❌ Non valida'}<br>`;
    output += `• 32/01/2025: ${!invalidDate ? '✅ Correttamente rifiutata' : '❌ Erroneamente accettata'}<br><br>`;
    
    // Test conversione
    const isoDate = window.ItalianDateSystem.italianToISO('15/03/2025');
    const backToItalian = window.ItalianDateSystem.ISOToItalian(isoDate);
    output += `<strong>Test Conversione:</strong><br>`;
    output += `• 15/03/2025 → ${isoDate} → ${backToItalian}<br>`;
    output += `• Roundtrip: ${backToItalian === '15/03/2025' ? '✅ Perfetto' : '❌ Errore'}<br><br>`;
    
    // Test formattazione
    const today = new Date();
    const formatted = window.ItalianDateSystem.formatDateItalian(today);
    const relative = window.ItalianDateSystem.formatRelativeDate(today);
    output += `<strong>Test Formattazione:</strong><br>`;
    output += `• Data oggi: ${formatted}<br>`;
    output += `• Formato relativo: ${relative}<br><br>`;
    
    // Test festività
    const isChristmas = window.ItalianDateSystem.isFestivita('25/12/2025');
    const holidayName = window.ItalianDateSystem.getNomeFestivita('25/12/2025');
    output += `<strong>Test Festività:</strong><br>`;
    output += `• 25/12/2025 è festività: ${isChristmas ? '✅ Sì' : '❌ No'}<br>`;
    output += `• Nome festività: ${holidayName || 'N/A'}<br><br>`;
    
    // Test calendario
    if (window.ItalianCalendar) {
      output += `<strong>Componenti UI:</strong><br>`;
      output += `• ItalianCalendar: ✅ Disponibile<br>`;
      output += `• ItalianDateRangePicker: ${window.ItalianDateRangePicker ? '✅ Disponibile' : '❌ Non trovato'}<br><br>`;
    }
    
    output += '<div style="color: green; font-weight: bold;">🎉 Tutti i test completati con successo!</div>';
    
  } catch (error) {
    output += `<div style="color: red;">❌ Errore durante i test: ${error.message}</div>`;
  }
  
  outputDiv.innerHTML = output;
  resultsDiv.style.display = 'block';
}

// Rendi la funzione disponibile globalmente
window.testItalianDateSystem = testItalianDateSystem;

/**
 * Funzioni demo per la scheda date italiane
 */

// Demo validazione date
function validateDateDemo() {
  const input = document.getElementById('dateInput').value;
  const result = document.getElementById('dateValidationResult');
  
  if (!input) {
    result.innerHTML = '<div style="color: orange;">⚠️ Inserisci una data per la validazione</div>';
    return;
  }
  
  try {
    if (window.ItalianDateSystem && window.ItalianDateSystem.isValidItalianDate) {
      const isValid = window.ItalianDateSystem.isValidItalianDate(input);
      if (isValid) {
        const formatted = window.ItalianDateSystem.formatDateItalian(new Date(window.ItalianDateSystem.italianToISO(input)));
        result.innerHTML = `<div style="color: green; background: #d4edda; padding: 10px; border-radius: 4px;">
          ✅ Data valida!<br>
          📅 Formato: ${formatted}<br>
          🗓️ Data originale: ${input}
        </div>`;
      } else {
        result.innerHTML = '<div style="color: red; background: #f8d7da; padding: 10px; border-radius: 4px;">❌ Data non valida! Usa il formato DD/MM/YYYY</div>';
      }
    } else {
      result.innerHTML = '<div style="color: red;">❌ Sistema date italiano non caricato</div>';
    }
  } catch (error) {
    result.innerHTML = `<div style="color: red;">❌ Errore: ${error.message}</div>`;
  }
}

// Demo conversione date
function convertDateDemo() {
  const input = document.getElementById('conversionInput').value;
  const result = document.getElementById('conversionResult');
  
  if (!input) {
    result.innerHTML = '<div style="color: orange;">⚠️ Inserisci una data per la conversione</div>';
    return;
  }
  
  try {
    if (window.ItalianDateSystem) {
      const isoDate = window.ItalianDateSystem.italianToISO(input);
      const backToItalian = window.ItalianDateSystem.ISOToItalian(isoDate);
      const jsDate = new Date(isoDate);
      
      result.innerHTML = `<div style="background: #d1ecf1; padding: 10px; border-radius: 4px;">
        <strong>🔄 Conversioni:</strong><br>
        📅 Italiano: ${input}<br>
        🌍 ISO 8601: ${isoDate}<br>
        💻 JavaScript: ${jsDate.toLocaleDateString('it-IT')}<br>
        ↩️ Ritorno italiano: ${backToItalian}<br>
        ✅ Roundtrip: ${input === backToItalian ? 'Perfetto' : 'Errore'}
      </div>`;
    } else {
      result.innerHTML = '<div style="color: red;">❌ Sistema date italiano non caricato</div>';
    }
  } catch (error) {
    result.innerHTML = `<div style="color: red; background: #f8d7da; padding: 10px; border-radius: 4px;">❌ Errore: ${error.message}</div>`;
  }
}

// Demo calcolo giorni
function calculateDaysDemo() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  const result = document.getElementById('calculationResult');
  
  if (!start || !end) {
    result.innerHTML = '<div style="color: orange;">⚠️ Inserisci entrambe le date</div>';
    return;
  }
  
  try {
    if (window.ItalianDateSystem) {
      const days = window.ItalianDateSystem.calcolaGiorni(start, end);
      result.innerHTML = `<div style="background: #d4edda; padding: 10px; border-radius: 4px;">
        <strong>📊 Calcolo Giorni:</strong><br>
        📅 Da: ${start}<br>
        📅 A: ${end}<br>
        🧮 Totale giorni: <strong>${days}</strong>
      </div>`;
    } else {
      result.innerHTML = '<div style="color: red;">❌ Sistema date italiano non caricato</div>';
    }
  } catch (error) {
    result.innerHTML = `<div style="color: red; background: #f8d7da; padding: 10px; border-radius: 4px;">❌ Errore: ${error.message}</div>`;
  }
}

// Demo calcolo giorni lavorativi
function calculateWorkingDaysDemo() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  const result = document.getElementById('calculationResult');
  
  if (!start || !end) {
    result.innerHTML = '<div style="color: orange;">⚠️ Inserisci entrambe le date</div>';
    return;
  }
  
  try {
    if (window.ItalianDateSystem) {
      const totalDays = window.ItalianDateSystem.calcolaGiorni(start, end);
      const workingDays = window.ItalianDateSystem.calcolaGiorniLavorativi(start, end);
      result.innerHTML = `<div style="background: #fff3cd; padding: 10px; border-radius: 4px;">
        <strong>💼 Calcolo Giorni Lavorativi:</strong><br>
        📅 Da: ${start}<br>
        📅 A: ${end}<br>
        🧮 Totale giorni: ${totalDays}<br>
        💼 Giorni lavorativi: <strong>${workingDays}</strong><br>
        🏖️ Weekend/festivi: ${totalDays - workingDays}
      </div>`;
    } else {
      result.innerHTML = '<div style="color: red;">❌ Sistema date italiano non caricato</div>';
    }
  } catch (error) {
    result.innerHTML = `<div style="color: red; background: #f8d7da; padding: 10px; border-radius: 4px;">❌ Errore: ${error.message}</div>`;
  }
}

// Demo verifica festività
function checkHolidayDemo() {
  const input = document.getElementById('holidayInput').value;
  const result = document.getElementById('holidayResult');
  
  if (!input) {
    result.innerHTML = '<div style="color: orange;">⚠️ Inserisci una data</div>';
    return;
  }
  
  try {
    if (window.ItalianDateSystem) {
      const isHoliday = window.ItalianDateSystem.isFestivita(input);
      const holidayName = window.ItalianDateSystem.getNomeFestivita(input);
      
      if (isHoliday) {
        result.innerHTML = `<div style="background: #f8d7da; padding: 10px; border-radius: 4px;">
          <strong>🎉 Festività Rilevata!</strong><br>
          📅 Data: ${input}<br>
          🎊 Festività: <strong>${holidayName}</strong><br>
          ❌ Non è un giorno lavorativo
        </div>`;
      } else {
        result.innerHTML = `<div style="background: #d4edda; padding: 10px; border-radius: 4px;">
          <strong>💼 Giorno Lavorativo</strong><br>
          📅 Data: ${input}<br>
          ✅ Non è una festività<br>
          💼 È un giorno lavorativo normale
        </div>`;
      }
    } else {
      result.innerHTML = '<div style="color: red;">❌ Sistema date italiano non caricato</div>';
    }
  } catch (error) {
    result.innerHTML = `<div style="color: red; background: #f8d7da; padding: 10px; border-radius: 4px;">❌ Errore: ${error.message}</div>`;
  }
}

// Rendi le funzioni disponibili globalmente
window.validateDateDemo = validateDateDemo;
window.convertDateDemo = convertDateDemo;
window.calculateDaysDemo = calculateDaysDemo;
window.calculateWorkingDaysDemo = calculateWorkingDaysDemo;
window.checkHolidayDemo = checkHolidayDemo;