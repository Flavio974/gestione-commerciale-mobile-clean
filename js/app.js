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
      
      // DEBUG: Sistema Date Italiane caricato
      console.log('🇮🇹 SISTEMA DATE ITALIANE v2.1.3 CARICATO:', {
        ItalianDateSystem: !!window.ItalianDateSystem,
        ItalianCalendar: !!window.ItalianCalendar,
        demoFunctions: {
          testItalianDateSystem: !!window.testItalianDateSystem,
          validateDateDemo: !!window.validateDateDemo,
          convertDateDemo: !!window.convertDateDemo
        },
        timestamp: new Date().toISOString(),
        currentTab: this.state.currentTab
      });
      
      // 🚨 SISTEMA ANTI-INTERFERENZA AUDIO 🚨
      // Blocca l'interferenza del sistema AIVoiceManagerV2 con il tab demo
      this.setupAudioInterferenceProtection();
      
      // FORCE DEMO TAB VISIBILITY - CREA DINAMICAMENTE SE NON ESISTE
      // Esegui controllo multiplo per garantire visibilità
      const ensureDemoTab = () => {
        let demoTab = document.getElementById('tab-demo');
        if (!demoTab) {
          console.log('🔧 DEMO TAB NON TROVATO - Creazione dinamica...');
          
          // Trova il container della navigazione
          const navContainer = document.getElementById('main-navigation') || 
                              document.querySelector('.tab-navigation, .navigation, nav') ||
                              document.querySelector('[class*="nav"]');
          if (navContainer) {
            // Crea il tab demo
            demoTab = document.createElement('div');
            demoTab.id = 'tab-demo';
            demoTab.className = 'tab-link';
            demoTab.setAttribute('data-target', 'demo-content');
            demoTab.innerHTML = '🇮🇹 Demo Date';
            demoTab.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; background: linear-gradient(135deg, #00b894, #00a085) !important; color: white !important; font-weight: bold !important; border: 3px solid #ff6b6b !important; box-shadow: 0 4px 15px rgba(255,107,107,0.5) !important; padding: 10px 15px !important; margin: 5px !important; border-radius: 5px !important; cursor: pointer !important; pointer-events: auto !important; user-select: none !important; position: relative !important; z-index: 1000 !important;';
            
            // Aggiungi il tab al container SOLO se non è già presente
            if (!navContainer.contains(demoTab)) {
              navContainer.appendChild(demoTab);
            }
            console.log('✅ DEMO TAB CREATO DINAMICAMENTE!');
            
            // Aggiungi gestore click per la navigazione - FORZA CLICK HANDLER
            demoTab.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔥 DEMO TAB CLICKED!');
              
              // Nascondi tutti i contenuti
              const allContents = document.querySelectorAll('.tab-content');
              allContents.forEach(content => content.classList.remove('active'));
              
              // Rimuovi active da tutti i tab
              const allTabs = document.querySelectorAll('.tab-link');
              allTabs.forEach(tab => tab.classList.remove('active'));
              
              // Attiva questo tab
              demoTab.classList.add('active');
              
              // Mostra il contenuto demo
              const demoContent = document.getElementById('demo-content');
              if (demoContent) {
                demoContent.classList.add('active');
                demoContent.style.display = 'block';
                console.log('✅ DEMO CONTENT MOSTRATO!');
              } else {
                console.error('❌ Demo content non trovato!');
              }
            });
            
            // INTEGRAZIONE FORZATA CON NAVIGATION.JS
            // Aggiungi anche il gestore onclick diretto come fallback
            demoTab.onclick = function(e) {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔥 DEMO TAB ONCLICK FALLBACK!');
              
              // Usa il sistema di navigazione se disponibile
              if (window.Navigation && window.Navigation.switchToTab) {
                window.Navigation.switchToTab('demo');
              } else {
                // Fallback manuale
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
                
                const demoContent = document.getElementById('demo-content');
                if (demoContent) {
                  demoContent.classList.add('active');
                  demoContent.style.display = 'block';
                }
                demoTab.classList.add('active');
              }
            };
            
            // Forza anche l'attributo per il sistema di navigazione
            demoTab.setAttribute('data-target', 'demo-content');
            demoTab.setAttribute('data-tab', 'demo');
            
            // FORZA RE-SETUP DEI LISTENER DI NAVIGAZIONE
            if (window.Navigation && window.Navigation.setupTabListeners) {
              console.log('🔄 Re-setup navigation listeners...');
              window.Navigation.setupTabListeners();
            }
            
            // DEBUG: Test immediato del click
            console.log('🧪 Testing demo tab click functionality...', {
              hasClickListener: !!demoTab.onclick,
              hasEventListener: !!demoTab._eventListeners,
              isClickable: demoTab.style.pointerEvents !== 'none',
              zIndex: demoTab.style.zIndex
            });
            
            // FORZA REGISTRAZIONE NEL SISTEMA DI NAVIGAZIONE
            // Assicura che il tab sia sempre riconosciuto
            if (window.Navigation) {
              // Patch temporanea per forzare il riconoscimento del tab demo
              const originalIsValidTab = window.Navigation.isValidTab;
              window.Navigation.isValidTab = function(tabName) {
                if (tabName === 'demo') return true;
                return originalIsValidTab.call(this, tabName);
              };
              console.log('✅ Patch Navigation.isValidTab applicata per demo tab');
            }
            
            // Ora crea anche il contenuto se non esiste
            let demoContent = document.getElementById('demo-content');
            if (!demoContent) {
              demoContent = document.createElement('div');
              demoContent.id = 'demo-content';
              demoContent.className = 'tab-content';
              demoContent.style.cssText = 'display: none; padding: 20px; background: white; border-radius: 8px; margin: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
              demoContent.innerHTML = `
                <div style="max-width: 800px; margin: 0 auto;">
                  <h2 style="color: #00b894; margin-bottom: 20px;">🇮🇹 Sistema Date Italiane</h2>
                  <p style="font-size: 16px; color: #666; margin-bottom: 30px;">Sistema completo per la gestione delle date in formato italiano con validazione, conversione e calcoli avanzati.</p>
                  
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0;">
                    <button onclick="testItalianDateSystem()" class="btn btn-primary" style="padding: 15px 20px; font-size: 16px; background: linear-gradient(135deg, #00b894, #00a085); border: none; border-radius: 8px; color: white; cursor: pointer; transition: all 0.3s ease;">
                      🧪 Test Sistema Date
                    </button>
                    <button onclick="window.open('demo-italian-dates.html', '_blank')" class="btn btn-secondary" style="padding: 15px 20px; font-size: 16px; background: #6c757d; border: none; border-radius: 8px; color: white; cursor: pointer; transition: all 0.3s ease;">
                      📱 Demo Completa
                    </button>
                    <button onclick="window.open('test-italian-dates.html', '_blank')" class="btn btn-info" style="padding: 15px 20px; font-size: 16px; background: #17a2b8; border: none; border-radius: 8px; color: white; cursor: pointer; transition: all 0.3s ease;">
                      🧪 Test Suite
                    </button>
                  </div>
                  
                  <div id="quick-test-results" style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; display: none; border-left: 4px solid #00b894;">
                    <h4 style="color: #00b894; margin-bottom: 15px;">Risultati Test:</h4>
                    <div id="test-output" style="font-family: monospace; font-size: 14px;"></div>
                  </div>
                  
                  <div style="margin-top: 40px; padding: 20px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;">
                    <h4 style="color: #2e7d32; margin-bottom: 15px;">✨ Funzionalità Disponibili:</h4>
                    <ul style="color: #2e7d32; line-height: 1.8;">
                      <li><strong>Validazione Date:</strong> Formato italiano DD/MM/YYYY</li>
                      <li><strong>Conversioni:</strong> Italiano ↔ ISO 8601 ↔ JavaScript Date</li>
                      <li><strong>Calcoli:</strong> Giorni lavorativi, festività, range date</li>
                      <li><strong>Festività:</strong> Pasqua automatica + festività italiane</li>
                      <li><strong>UI Components:</strong> Calendar picker, range selector</li>
                      <li><strong>Formato Relativo:</strong> "oggi", "domani", "2 giorni fa"</li>
                    </ul>
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
      };

      // ❌ RIMOSSO: Tutto il sistema di controllo demo tab che causava spostamenti
        // ❌ RIMOSSO: MutationObserver che monitorava demo tab
        
        // PROTEZIONE CONTRO REINIZIALIZZAZIONE AUDIO
        // Intercetta eventi che potrebbero rimuovere il tab
        window.addEventListener('audio:reinit', (e) => {
          console.log('⚠️ Audio reinit detected - protecting demo tab...');
          // setTimeout(ensureDemoTab, 100); // 🔒 RIMOSSO - causava spostamento tab
        });
      }
      
      // Proteggi contro rimozione del tab
      const protectDemoTab = () => {
        const demoTab = document.getElementById('tab-demo');
        if (demoTab) {
          // Forza il tab a rimanere nel DOM
          Object.defineProperty(demoTab, 'remove', {
            value: function() {
              console.warn('🛡️ BLOCKED: Tentativo di rimuovere demo tab bloccato!');
            },
            writable: false,
            configurable: false
          });
          
          // Proteggi anche parentNode.removeChild
          const originalRemoveChild = demoTab.parentNode.removeChild;
          demoTab.parentNode.removeChild = function(child) {
            if (child === demoTab) {
              console.warn('🛡️ BLOCKED: Tentativo di rimuovere demo tab via removeChild bloccato!');
              return child;
            }
            return originalRemoveChild.call(this, child);
          };
        }
      };
      
      // Applica protezione
      setTimeout(protectDemoTab, 2000);
      
      
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
    
    // ❌ RIMOSSO: Timer problematico che causava spostamenti tab e rallentamenti
    
    // Mostra tab corrente
    const activeTab = document.querySelector(`[data-target="${this.state.currentTab}-content"]`);
    if (activeTab) {
      activeTab.click();
    }
  },
  
  /**
   * 🚨 SISTEMA ANTI-INTERFERENZA AUDIO 🚨
   * Impedisce al sistema AIVoiceManagerV2 di interferire con il tab demo
   */
  setupAudioInterferenceProtection: function() {
    console.log('🛡️ Configurazione protezione anti-interferenza audio...');
    
    // 1. Intercetta le chiamate di AIVoiceManagerV2 che modificano il DOM
    const originalAppendChild = Element.prototype.appendChild;
    const originalRemoveChild = Element.prototype.removeChild;
    const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    
    // Proteggi appendChild da interferenze
    Element.prototype.appendChild = function(child) {
      // Se il sistema audio cerca di aggiungere elementi che possono interferire
      if (child && child.id && (
        child.id.includes('ipad-audio') || 
        child.id.includes('voice-controls') ||
        child.id.includes('audio-activation')
      )) {
        console.log('🛡️ BLOCKED: Audio system appendChild intercepted:', child.id);
        
        // Verifica se sta cercando di interferire con la navigazione
        const demoTab = document.getElementById('tab-demo');
        if (demoTab) {
          // Forza protezione del tab demo
          this.protectDemoTabElement(demoTab);
        }
      }
      
      return originalAppendChild.call(this, child);
    };
    
    // Proteggi removeChild
    Element.prototype.removeChild = function(child) {
      // Blocca rimozione del tab demo
      if (child && child.id === 'tab-demo') {
        console.log('🛡️ BLOCKED: Tentativo di rimuovere tab demo bloccato!');
        return child;
      }
      
      return originalRemoveChild.call(this, child);
    };
    
    // 2. MutationObserver per monitorare cambiamenti DOM che potrebbero nascondere il demo
    const observer = new MutationObserver((mutations) => {
      let needsProtection = false;
      
      mutations.forEach((mutation) => {
        // Monitora modifiche agli attributi
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (target && target.id === 'tab-demo') {
            needsProtection = true;
          }
        }
        
        // Monitora nodi rimossi
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach((node) => {
            if (node.id === 'tab-demo') {
              console.log('🚨 DEMO TAB RIMOSSO! Ripristino immediato...');
              needsProtection = true;
            }
          });
        }
        
        // Monitora modifiche alla struttura che potrebbero nascondere il demo
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.classList && 
               (node.classList.contains('audio-overlay') || 
                node.id && node.id.includes('audio'))) {
              needsProtection = true;
            }
          });
        }
      });
      
      // FIX 2025-07-13: demo tab già fissata, niente protezione automatica
      // if (needsProtection) {
      //   setTimeout(() => this.ensureDemoTabVisibility(), 100);
      // }
    });
    
    // FIX 2025-07-13: demo tab già fissata, niente observer
    // observer.observe(document.body, {
    //   childList: true,
    //   subtree: true,
    //   attributes: true,
    //   attributeOldValue: true
    // });
    
    // 3. Override dei metodi di AIVoiceManagerV2 che potrebbero interferire
    if (window.AIVoiceManagerV2) {
      const aiManager = window.AIVoiceManagerV2;
      
      // Intercetta createIPadControls
      if (aiManager.prototype && aiManager.prototype.createIPadControls) {
        const originalCreateIPadControls = aiManager.prototype.createIPadControls;
        aiManager.prototype.createIPadControls = function() {
          console.log('🛡️ INTERCEPTED: AIVoiceManagerV2.createIPadControls');
          const result = originalCreateIPadControls.call(this);
          
          // Dopo che il sistema audio crea i controlli, ripristina demo tab
          setTimeout(() => {
            // App.ensureDemoTabVisibility(); // 🔒 RIMOSSO - causava spostamento tab
          }, 200);
          
          return result;
        };
      }
      
      // Intercetta addAudioButtonToAITab
      if (aiManager.prototype && aiManager.prototype.addAudioButtonToAITab) {
        const originalAddAudioButton = aiManager.prototype.addAudioButtonToAITab;
        aiManager.prototype.addAudioButtonToAITab = function() {
          console.log('🛡️ INTERCEPTED: AIVoiceManagerV2.addAudioButtonToAITab');
          const result = originalAddAudioButton.call(this);
          
          // Proteggi demo tab dopo modifiche audio
          setTimeout(() => {
            // App.ensureDemoTabVisibility(); // 🔒 RIMOSSO - causava spostamento tab
          }, 200);
          
          return result;
        };
      }
    }
    
    // FIX 2025-07-13: demo tab già fissata, niente timer di reinizializzazione
    // document.addEventListener('DOMContentLoaded', () => {
    //   setTimeout(() => this.ensureDemoTabVisibility(), 1000);
    // });
    // 
    // window.addEventListener('load', () => {
    //   setTimeout(() => this.ensureDemoTabVisibility(), 1500);
    // });
    
    console.log('✅ Protezione anti-interferenza audio configurata');
  },
  
  /**
   * Protegge specificamente l'elemento tab demo
   */
  protectDemoTabElement: function(demoTab) {
    if (!demoTab) return;
    
    // Proteggi dalle modifiche di stile che lo nasconderebbero
    Object.defineProperty(demoTab.style, 'display', {
      set: function(value) {
        if (value === 'none' || value === 'hidden') {
          console.log('🛡️ BLOCKED: Tentativo di nascondere demo tab con display:', value);
          return;
        }
        this._display = value;
      },
      get: function() {
        return this._display || 'block';
      }
    });
    
    Object.defineProperty(demoTab.style, 'visibility', {
      set: function(value) {
        if (value === 'hidden') {
          console.log('🛡️ BLOCKED: Tentativo di nascondere demo tab con visibility');
          return;
        }
        this._visibility = value;
      },
      get: function() {
        return this._visibility || 'visible';
      }
    });
    
    // Forza sempre visibile
    demoTab.style.display = 'block !important';
    demoTab.style.visibility = 'visible !important';
    demoTab.style.opacity = '1 !important';
  },
  
  /**
   * Forza visibilità del demo tab
   */
  ensureDemoTabVisibility: function() {
    const demoTab = document.getElementById('tab-demo');
    if (demoTab) {
      this.protectDemoTabElement(demoTab);
      
      // Assicura che sia clickable
      demoTab.style.pointerEvents = 'auto';
      demoTab.style.cursor = 'pointer';
      demoTab.style.zIndex = '1000';
      
      console.log('🔧 Demo tab visibility enforced');
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

/**
 * Funzione di test per forzare l'apertura del tab demo
 * Chiamabile dalla console per debug
 */
function forceDemoTabOpen() {
  console.log('🔧 FORZANDO APERTURA TAB DEMO...');
  
  // Nascondi tutti i contenuti
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
    content.style.display = 'none';
  });
  
  // Rimuovi active da tutti i tab
  document.querySelectorAll('.tab-link').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Attiva il tab demo
  const demoTab = document.getElementById('tab-demo');
  const demoContent = document.getElementById('demo-content');
  
  if (demoTab) {
    demoTab.classList.add('active');
    console.log('✅ Demo tab attivato');
  }
  
  if (demoContent) {
    demoContent.classList.add('active');
    demoContent.style.display = 'block';
    console.log('✅ Demo content mostrato');
  }
  
  // Usa anche il sistema di navigazione se disponibile
  if (window.Navigation && window.Navigation.switchToTab) {
    window.Navigation.switchToTab('demo');
    console.log('✅ Usato Navigation.switchToTab');
  }
}

window.forceDemoTabOpen = forceDemoTabOpen;

/**
 * Funzione di emergenza per ripristinare il tab demo
 * Utile quando il sistema audio interferisce
 */
function fixDemoTab() {
  console.log('🔧 RIPARAZIONE TAB DEMO IN CORSO...');
  
  // 1. Forza patch Navigation
  if (window.Navigation) {
    const originalIsValidTab = window.Navigation.isValidTab;
    window.Navigation.isValidTab = function(tabName) {
      if (tabName === 'demo') return true;
      return originalIsValidTab.call(this, tabName);
    };
    
    const originalGetTabOrder = window.Navigation.getTabOrder;
    window.Navigation.getTabOrder = function() {
      const tabs = originalGetTabOrder.call(this);
      if (!tabs.includes('demo')) {
        tabs.splice(2, 0, 'demo'); // Inserisce demo alla posizione 3
      }
      return tabs;
    };
    
    console.log('✅ Navigation patchato per includere demo');
  }
  
  // 2. Trova o crea il tab
  let demoTab = document.getElementById('tab-demo');
  if (!demoTab) {
    console.log('❌ Tab demo non trovato - ricreazione...');
    // 🔒 RIMOSSO - causava spostamento tab durante attivazione audio
    // if (typeof ensureDemoTab === 'function') {
    //   ensureDemoTab();
    // }
  } else {
    // 3. Ripristina click handler
    console.log('🔄 Ripristino click handler...');
    
    // Rimuovi vecchi listener
    const newTab = demoTab.cloneNode(true);
    demoTab.parentNode.replaceChild(newTab, demoTab);
    demoTab = newTab;
    
    // Aggiungi nuovo click handler
    demoTab.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎯 DEMO TAB CLICKED (fixed)!');
      
      if (window.Navigation && window.Navigation.switchToTab) {
        window.Navigation.switchToTab('demo');
      } else {
        // Fallback manuale
        document.querySelectorAll('.tab-content').forEach(c => {
          c.classList.remove('active');
          c.style.display = 'none';
        });
        document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
        
        const demoContent = document.getElementById('demo-content');
        if (demoContent) {
          demoContent.classList.add('active');
          demoContent.style.display = 'block';
        }
        demoTab.classList.add('active');
      }
    });
    
    // Assicura visibilità
    demoTab.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; background: linear-gradient(135deg, #00b894, #00a085) !important; color: white !important; font-weight: bold !important; border: 3px solid #ff6b6b !important; box-shadow: 0 4px 15px rgba(255,107,107,0.5) !important; padding: 10px 15px !important; margin: 5px !important; border-radius: 5px !important; cursor: pointer !important; pointer-events: auto !important; position: relative !important; z-index: 1000 !important;';
  }
  
  // 4. Re-setup navigation listeners
  if (window.Navigation && window.Navigation.setupTabListeners) {
    window.Navigation.setupTabListeners();
  }
  
  console.log('✅ TAB DEMO RIPARATO!');
  console.log('💡 Ora prova a cliccare il tab 🇮🇹 Demo Date');
}

window.fixDemoTab = fixDemoTab;