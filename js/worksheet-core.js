/**
 * Worksheet Module - Core Functions
 * Funzioni principali e gestione stato
 */

const Worksheet = {
  state: {
    clientiDaVisitare: [],
    clientiSelezionati: [],
    filtriAttivi: {
      priorita: 'all',
      zona: 'all',
      tipoCliente: 'all',
      ritardo: 'all',
      search: ''
    },
    ordinamento: 'priorita',
    clientiDisponibili: [],
    itinerario: null,
    itinerariGenerati: [] // Array per salvare tutti gli itinerari generati
  },

  /**
   * Inizializzazione modulo
   */
  init: function() {
    console.log('📊 Worksheet inizializzato');
    // this.loadWorksheetFromStorage(); // RIMOSSO - funzione non esistente
  },

  /**
   * Chiamato quando si entra nel tab
   */
  onEnter: function() {
    this.render();
    this.setupEventListeners();
  },

  /**
   * Chiamato quando si lascia il tab
   */
  onLeave: function() {
    console.log('📊 Leaving worksheet tab');
    // this.saveWorksheetToStorage(); // RIMOSSO - funzione non esistente
  },

  /**
   * Setup event listeners
   */
  setupEventListeners: function() {
    // Bottoni principali
    const importFromClientsBtn = document.getElementById('importFromClients');
    console.log('Pulsante importFromClients trovato:', !!importFromClientsBtn);
    if (importFromClientsBtn) {
      importFromClientsBtn.addEventListener('click', () => {
        console.log('Click su importFromClients');
        this.showImportModal();
      });
    }

    const generateVisitBtn = document.getElementById('generateVisitList');
    if (generateVisitBtn) {
      generateVisitBtn.addEventListener('click', () => this.generateVisitList());
    }

    const createItineraryBtn = document.getElementById('createItinerary');
    if (createItineraryBtn) {
      createItineraryBtn.addEventListener('click', () => this.showItineraryModal());
    }

    const viewItineraryBtn = document.getElementById('viewItinerary');
    if (viewItineraryBtn) {
      viewItineraryBtn.addEventListener('click', () => this.showItineraryView());
    }

    const optimizeItineraryBtn = document.getElementById('optimizeItinerary');
    if (optimizeItineraryBtn) {
      optimizeItineraryBtn.addEventListener('click', () => this.optimizeItinerary());
    }

    const exportExcelBtn = document.getElementById('exportExcel');
    if (exportExcelBtn) {
      exportExcelBtn.addEventListener('click', () => this.exportToExcel());
    }

    const clearWorksheetBtn = document.getElementById('clearWorksheetClients');
    console.log('Pulsante clearWorksheetClients trovato:', !!clearWorksheetBtn);
    if (clearWorksheetBtn) {
      clearWorksheetBtn.addEventListener('click', () => {
        console.log('Click su clearWorksheetClients');
        this.clearImportedClients();
      });
    }

    // Filtri
    const priorityFilter = document.getElementById('priorityFilter');
    if (priorityFilter) {
      priorityFilter.addEventListener('change', () => this.applyFilters());
    }

    const delayFilter = document.getElementById('delayFilter');
    if (delayFilter) {
      delayFilter.addEventListener('change', () => this.applyFilters());
    }

    const searchFilter = document.getElementById('searchFilter');
    if (searchFilter) {
      searchFilter.addEventListener('input', () => this.applyFilters());
    }

    // Inizializza drag and drop
    this.initializeDragAndDrop();
  },

  /**
   * Render principale
   */
  render: function() {
    const container = document.getElementById('worksheet-content');
    if (!container) return;

    container.innerHTML = WorksheetUI.renderContent();
    
    // Carica dati
    this.loadClients();
    
    // UI is already setup by renderContent()
    
    // Mostra/nascondi pulsanti in base allo stato
    const hasClients = this.state.clientiDaVisitare.length > 0;
    const hasItineraries = this.state.itinerariGenerati && this.state.itinerariGenerati.length > 0;
    
    const viewItineraryBtn = document.getElementById('viewItinerary');
    const createItineraryBtn = document.getElementById('createItinerary');
    
    if (viewItineraryBtn) {
      // Mostra sempre il pulsante se ci sono itinerari generati
      viewItineraryBtn.style.display = hasItineraries ? 'inline-flex' : 'none';
    }
    
    if (createItineraryBtn) {
      createItineraryBtn.style.display = hasClients ? 'inline-flex' : 'none';
    }
  },

  /**
   * Carica clienti nella tabella
   */
  loadClients: function() {
    // Prima carica dal localStorage
    const savedClients = localStorage.getItem('worksheet_clients');
    if (savedClients) {
      try {
        this.state.clientiDaVisitare = JSON.parse(savedClients);
        console.log('Clienti caricati dal localStorage:', this.state.clientiDaVisitare.length);
      } catch (e) {
        console.error('Errore nel caricamento clienti:', e);
      }
    }
    
    const clients = this.state.clientiDaVisitare;
    this.renderTable(clients);
  },

  /**
   * Render tabella clienti
   */
  renderTable: function(clients) {
    // Usa la funzione di WorksheetUI per il rendering
    WorksheetUI.renderTable(clients, WorksheetData.getPriorityLabel);
    
    // Setup checkbox listeners
    this.setupCheckboxListeners();
    
    // Aggiorna conteggio
    const countSpan = document.getElementById('selected-count');
    if (countSpan) {
      const selectedCount = clients.filter(c => c.selected).length;
      countSpan.textContent = selectedCount;
    }
  },

  /**
   * Setup checkbox listeners
   */
  setupCheckboxListeners: function() {
    const checkboxes = document.querySelectorAll('.client-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const code = e.target.dataset.code;
        const client = this.state.clientiDaVisitare.find(c => 
          String(c.code) === String(code) || String(c.id) === String(code)
        );
        if (client) {
          client.selected = e.target.checked;
          this.saveWorksheetToStorage();
          
          // Aggiorna conteggio
          const selectedCount = this.state.clientiDaVisitare.filter(c => c.selected).length;
          const countSpan = document.getElementById('selected-count');
          if (countSpan) {
            countSpan.textContent = selectedCount;
          }
        }
      });
    });
  },

  /**
   * Genera lista visite
   */
  generateVisitList: function() {
    const today = new Date();
    const clients = WorksheetData.getClientsData();
    const visitList = [];

    clients.forEach(client => {
      // Calcola se il cliente deve essere visitato
      if (!client.frequency || client.frequency === 0) return;

      // Calcola giorni dall'ultima visita
      let daysSinceLastVisit = 999;
      if (client.lastVisit) {
        const lastVisitDate = new Date(client.lastVisit);
        daysSinceLastVisit = Math.floor((today - lastVisitDate) / (1000 * 60 * 60 * 24));
      }

      // Calcola ritardo
      const delay = daysSinceLastVisit - client.frequency;

      // Aggiungi alla lista se deve essere visitato
      if (delay >= 0) {
        visitList.push({
          ...client,
          delay: delay,
          toVisit: true
        });
      }
    });

    // Ordina per ritardo decrescente
    visitList.sort((a, b) => b.delay - a.delay);

    // Aggiorna stato
    this.state.clientiDaVisitare = visitList;
    this.saveWorksheetToStorage();

    // Mostra risultato
    if (visitList.length > 0) {
      WorksheetUI.showAlert(`Generati ${visitList.length} clienti da visitare`, 'success');
      this.loadClients();
    } else {
      WorksheetUI.showAlert('Nessun cliente da visitare trovato', 'info');
    }
  },

  /**
   * Get frequency label
   */
  getFrequencyLabel: function(frequency) {
    if (!frequency || frequency === 0) return 'Mai';
    if (frequency === 1) return 'Giornaliero';
    if (frequency === 7) return 'Settimanale';
    if (frequency === 14) return 'Bisettimanale';
    if (frequency === 30) return 'Mensile';
    if (frequency === 60) return 'Bimestrale';
    if (frequency === 90) return 'Trimestrale';
    if (frequency === 180) return 'Semestrale';
    if (frequency === 365) return 'Annuale';
    return `${frequency} giorni`;
  },

  /**
   * Mostra modal itinerario
   */
  showItineraryModal: function() {
    WorksheetItinerary.showItineraryModal();
  },

  /**
   * Hide itinerary modal
   */
  hideItineraryModal: function() {
    WorksheetItinerary.hideItineraryModal();
  },

  /**
   * Svuota clienti importati
   */
  clearImportedClients: function() {
    console.log('clearImportedClients chiamato');
    
    // Controlla sia lo state che il localStorage
    const clientsInState = this.state.clientiDaVisitare.length;
    const clientsInStorage = localStorage.getItem('worksheet_clients');
    const hasClientsInStorage = clientsInStorage && JSON.parse(clientsInStorage).length > 0;
    
    console.log('Clienti in state:', clientsInState);
    console.log('Clienti in localStorage:', hasClientsInStorage);
    
    if (clientsInState === 0 && !hasClientsInStorage) {
      WorksheetUI.showAlert('Nessun cliente da rimuovere', 'info');
      return;
    }
    
    const totalClients = Math.max(clientsInState, hasClientsInStorage ? JSON.parse(clientsInStorage).length : 0);
    
    if (confirm(`Sei sicuro di voler rimuovere tutti i ${totalClients} clienti dal foglio di lavoro?`)) {
      // Pulisci lo state
      this.state.clientiDaVisitare = [];
      this.state.clientiSelezionati = [];
      this.state.itinerario = null;
      
      // Pulisci il localStorage
      localStorage.removeItem('worksheet_clients');
      localStorage.removeItem('worksheet_itinerary');
      
      // Salva lo stato vuoto
      this.saveWorksheetToStorage();
      
      // Re-render
      this.render();
      
      // Re-setup event listeners dopo il render
      this.setupEventListeners();
      
      WorksheetUI.showAlert('Foglio di lavoro completamente svuotato', 'success');
      console.log('Foglio di lavoro svuotato - state e localStorage puliti');
    }
  },

  /**
   * Esporta in Excel
   */
  exportToExcel: function() {
    const clients = WorksheetData.getClientsData();
    const result = WorksheetData.exportToExcel(clients, WorksheetData.getPriorityLabel);
    WorksheetUI.showAlert(result.message, result.success ? 'success' : 'error');
  },

  /**
   * Visualizza cliente
   */
  viewClient: function(code) {
    const client = WorksheetData.getClientsData().find(c => 
      String(c.code) === String(code) || String(c.id) === String(code)
    );
    if (client) {
      WorksheetUI.showClientDetails(client);
    }
  },

  /**
   * Visualizza cliente su mappa
   */
  viewClientOnMap: function(code) {
    const client = this.state.itinerario.clients.find(c => 
      String(c.code) === String(code) || String(c.id) === String(code)
    );
    if (client) {
      this.showOnMap(code);
    }
  },

  /**
   * Mostra su mappa
   */
  showOnMap: function(code) {
    const client = WorksheetData.getClientsData().find(c => 
      String(c.code) === String(code) || String(c.id) === String(code)
    );
    if (client && client.address) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(client.address + ', ' + client.city)}`, '_blank');
    }
  }
};

// Export globale
window.Worksheet = Worksheet;