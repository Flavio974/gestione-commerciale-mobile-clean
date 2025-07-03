/**
 * Modulo Gestione Percorsi - Core
 * Funzioni principali e gestione stato
 */

const Percorsi = {
  // Stato del modulo
  state: {
    percorsi: [],
    filteredPercorsi: [],
    currentFilter: 'all',
    sortBy: 'data',
    sortDirection: 'desc'
  },

  /**
   * Inizializzazione modulo
   */
  init: function() {
    this.loadPercorsiFromStorage();
  },

  /**
   * Chiamato quando si entra nel tab
   */
  onEnter: function() {
    // Ricarica sempre i dati dal localStorage quando si entra nel tab
    this.loadPercorsiFromStorage();
    this.render();
    this.setupEventListeners();
    // Aggiorna esplicitamente la tabella dopo il render
    this.updateTable();
    this.updateStats();
  },

  /**
   * Chiamato quando si lascia il tab
   */
  onLeave: function() {
    this.savePercorsiToStorage();
  },

  /**
   * Setup event listeners
   */
  setupEventListeners: function() {
    // L'event listener per il file input è già nel HTML con onchange

    // Filtri
    const filterButtons = document.querySelectorAll('.percorsi-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const filterType = btn.dataset.filter || btn.getAttribute('data-filter');
        console.log('Filtro cliccato:', filterType);
        this.applyFilter(filterType);
      });
    });

    // Ricerca - ora gestita in setupSearchEventListener() dopo il render

    // Sort headers
    const sortableHeaders = document.querySelectorAll('.sortable-header');
    sortableHeaders.forEach(header => {
      header.addEventListener('click', (e) => this.sortBy(e.target.dataset.sort));
    });
    
    // Aggiungi percorso
    const addPercorsoBtn = document.getElementById('addPercorsoBtn');
    if (addPercorsoBtn) {
      addPercorsoBtn.addEventListener('click', () => this.addOrUpdatePercorso());
    }
  },

  /**
   * Render del contenuto
   */
  render: function() {
    const content = document.getElementById('travels-content');
    if (!content) return;
    
    // Assicurati che filteredPercorsi sia inizializzato
    if (!this.state.filteredPercorsi) {
      this.state.filteredPercorsi = [];
    }

    content.innerHTML = `
      <div class="percorsi-container">
        <div class="percorsi-header">
          <h2>Gestione Percorsi</h2>
          <div class="percorsi-actions">
            <div class="import-group">
              <input type="date" id="importDate" class="date-input" value="${new Date().toISOString().split('T')[0]}" title="Data per i percorsi importati">
              <button class="btn btn-primary" onclick="document.getElementById('excelPercorsiInput').click()">
                <span class="icon">📁</span> Importa Excel
              </button>
              <input type="file" id="excelPercorsiInput" accept=".xlsx,.xls,.txt" style="display: none;" onchange="Percorsi.handleFileUpload(event)">
            </div>
            <button class="btn btn-secondary" onclick="Percorsi.exportPercorsi()">
              <span class="icon">💾</span> Esporta
            </button>
            <button class="btn btn-danger" onclick="Percorsi.clearAllPercorsi()">
              <span class="icon">🗑️</span> Cancella Tutto
            </button>
          </div>
        </div>

        <!-- Form aggiunta/modifica percorso -->
        <div class="percorso-form" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h4 id="formTitle">Aggiungi Nuovo Percorso</h4>
          <div class="form-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
            <input type="text" id="newPartenza" placeholder="Partenza" class="form-control">
            <input type="text" id="newArrivo" placeholder="Arrivo" class="form-control">
            <input type="number" id="newKm" placeholder="Km" step="0.1" min="0" class="form-control">
            <input type="number" id="newMinuti" placeholder="Minuti" min="0" class="form-control">
            <button id="addPercorsoBtn" class="btn btn-success">
              <span class="icon">➕</span> Aggiungi
            </button>
            <button id="cancelEditBtn" class="btn btn-secondary" style="display: none;" onclick="Percorsi.cancelEdit()">
              Annulla
            </button>
          </div>
        </div>

        <div class="percorsi-filters">
          <button class="percorsi-filter-btn active" data-filter="all">Tutti</button>
          <button class="percorsi-filter-btn" data-filter="oggi">Oggi</button>
          <button class="percorsi-filter-btn" data-filter="settimana">Settimana</button>
          <button class="percorsi-filter-btn" data-filter="mese">Mese</button>
          <div class="search-box">
            <input type="text" id="percorsiSearch" placeholder="Cerca percorso..." class="search-input">
            <span class="search-icon">🔍</span>
          </div>
        </div>

        <div class="percorsi-stats">
          <div class="stat-card">
            <h4>Totale Percorsi</h4>
            <div class="stat-value" id="totalPercorsi">0</div>
          </div>
          <div class="stat-card">
            <h4>Km Totali</h4>
            <div class="stat-value" id="totalKm">0</div>
          </div>
          <div class="stat-card">
            <h4>Tempo Totale</h4>
            <div class="stat-value" id="totalTime">0h</div>
          </div>
          <div class="stat-card">
            <h4>Media Km/Giorno</h4>
            <div class="stat-value" id="avgKmPerDay">0</div>
          </div>
        </div>

        <div class="percorsi-table-container">
          <table class="percorsi-table">
            <thead>
              <tr>
                <th class="sortable-header" data-sort="data">Data <span class="sort-icon">↕</span></th>
                <th class="sortable-header" data-sort="partenza">idOrigine <span class="sort-icon">↕</span></th>
                <th class="sortable-header" data-sort="arrivo">idDestinazione <span class="sort-icon">↕</span></th>
                <th class="sortable-header" data-sort="minuti">tempoMinuti <span class="sort-icon">↕</span></th>
                <th class="sortable-header" data-sort="km">distanzaKm <span class="sort-icon">↕</span></th>
                <th>ChiaveUnivoca</th>
                <th>Longitudine-Latitudine-Partenza</th>
                <th>Longitudine-Latitudine-Arrivo</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody id="percorsiTableBody">
              <!-- I percorsi verranno inseriti qui -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Ricarica i percorsi esistenti
    this.updateTable();
    this.updateStats();
    
    // Configura event listener per la ricerca DOPO aver creato l'HTML
    this.setupSearchEventListener();
  },

  /**
   * Configura event listener per la ricerca
   */
  setupSearchEventListener: function() {
    // Ricerca
    const searchInput = document.getElementById('percorsiSearch');
    if (searchInput) {
      // Rimuovi event listener esistenti per evitare duplicati
      searchInput.removeEventListener('input', this.searchHandler);
      
      // Crea una funzione bound per poterla rimuovere later
      this.searchHandler = (e) => this.searchPercorsi(e.target.value);
      searchInput.addEventListener('input', this.searchHandler);
      
      console.log('✅ Event listener ricerca percorsi configurato');
    } else {
      console.warn('❌ Input ricerca percorsi non trovato');
    }
  },

  /**
   * Aggiorna tabella percorsi
   */
  updateTable: function() {
    const tbody = document.getElementById('percorsiTableBody');
    if (!tbody) {
      console.log('Tbody non trovato');
      return;
    }

    console.log('Aggiornamento tabella con', this.state.percorsi.length, 'percorsi');
    console.log('Percorsi filtrati:', this.state.filteredPercorsi.length);
    
    // Usa sempre filteredPercorsi se disponibili (per ricerca), altrimenti tutti i percorsi
    const percorsiDaMostrare = this.state.filteredPercorsi && this.state.filteredPercorsi.length >= 0 ? 
                               this.state.filteredPercorsi : 
                               this.state.percorsi;
    
    tbody.innerHTML = this.renderPercorsiRows(percorsiDaMostrare);
  },

  /**
   * Aggiorna statistiche
   */
  updateStats: function() {
    const totalPercorsi = this.state.percorsi.length;
    const totalKm = this.calculateTotalKm();
    const totalTime = this.calculateTotalTime();
    const avgKmPerDay = this.calculateAverageKmPerDay();

    document.getElementById('totalPercorsi').textContent = totalPercorsi;
    document.getElementById('totalKm').textContent = totalKm.toFixed(1);
    document.getElementById('totalTime').textContent = totalTime;
    document.getElementById('avgKmPerDay').textContent = avgKmPerDay.toFixed(1);
  },

  /**
   * Calcola km totali
   */
  calculateTotalKm: function() {
    return this.state.percorsi.reduce((sum, p) => sum + parseFloat(p.km || 0), 0);
  },

  /**
   * Calcola tempo totale
   */
  calculateTotalTime: function() {
    const totalMinutes = this.state.percorsi.reduce((sum, p) => sum + parseInt(p.minuti || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  },

  /**
   * Calcola media km per giorno
   */
  calculateAverageKmPerDay: function() {
    if (this.state.percorsi.length === 0) return 0;
    
    const uniqueDates = [...new Set(this.state.percorsi.map(p => p.data))];
    const totalKm = this.calculateTotalKm();
    
    return uniqueDates.length > 0 ? totalKm / uniqueDates.length : 0;
  },

  /**
   * Ottieni tempo di viaggio tra due punti
   */
  getTravelTime: function(partenza, arrivo) {
    console.log('getTravelTime chiamato con:', partenza, arrivo);
    console.log('Percorsi disponibili:', this.state.percorsi.length);
    
    if (!partenza || !arrivo) {
      console.log('Partenza o arrivo mancante');
      return null;
    }
    
    // Normalizza i nomi per il confronto
    const normalizeString = (str) => str.toString().toLowerCase().trim();
    const partenzaNorm = normalizeString(partenza);
    const arrivoNorm = normalizeString(arrivo);
    
    // Cerca corrispondenza esatta
    let percorso = this.state.percorsi.find(p => 
      normalizeString(p.partenza) === partenzaNorm && 
      normalizeString(p.arrivo) === arrivoNorm
    );
    
    if (!percorso) {
      // Prova anche il percorso inverso
      percorso = this.state.percorsi.find(p => 
        normalizeString(p.partenza) === arrivoNorm && 
        normalizeString(p.arrivo) === partenzaNorm
      );
    }
    
    // Se ancora non trovato, cerca corrispondenze parziali
    if (!percorso) {
      percorso = this.state.percorsi.find(p => {
        const pPartenza = normalizeString(p.partenza);
        const pArrivo = normalizeString(p.arrivo);
        
        // Controlla se i nomi contengono le stringhe cercate o viceversa
        return (pPartenza.includes(partenzaNorm) || partenzaNorm.includes(pPartenza)) &&
               (pArrivo.includes(arrivoNorm) || arrivoNorm.includes(pArrivo));
      });
    }
    
    if (percorso) {
      console.log('Percorso trovato:', percorso);
      return {
        minuti: parseInt(percorso.minuti) || 0,
        km: parseFloat(percorso.km) || 0
      };
    }
    
    console.log('Nessun percorso trovato per:', partenza, '->', arrivo);
    return null;
  },

  /**
   * Ottieni tutti i percorsi
   */
  getAllPercorsi: function() {
    return this.state.percorsi;
  }
};

// Export globale
window.Percorsi = Percorsi;