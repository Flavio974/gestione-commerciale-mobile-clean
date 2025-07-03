/**
 * Modulo Gestione Percorsi
 * Gestisce l'importazione e visualizzazione dei percorsi da file Excel
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

    // Ricerca
    const searchInput = document.getElementById('percorsiSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.searchPercorsi(e.target.value));
    }

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
              <input type="file" id="excelPercorsiInput" accept=".xlsx,.xls,.txt,.tsv" style="display: none;" onchange="Percorsi.handleFileUpload(event)">
            </div>
            <button class="btn btn-secondary" onclick="Percorsi.exportPercorsi()">
              <span class="icon">💾</span> Esporta
            </button>
            <button class="btn btn-danger" onclick="Percorsi.clearAllPercorsi()">
              <span class="icon">🗑️</span> Cancella Tutto
            </button>
          </div>
        </div>

        <div class="percorsi-filters">
          <div class="filter-group">
            <button class="percorsi-filter-btn active" data-filter="all">Tutti</button>
            <button class="percorsi-filter-btn" data-filter="today">Oggi</button>
            <button class="percorsi-filter-btn" data-filter="week">Settimana</button>
            <button class="percorsi-filter-btn" data-filter="month">Mese</button>
          </div>
          <div class="search-box">
            <input type="text" id="percorsiSearch" placeholder="Cerca luogo, cliente, descrizione...">
          </div>
        </div>

        <div class="percorsi-stats">
          <div class="stat-card">
            <h3>Totale Percorsi</h3>
            <p class="stat-value">${this.state.percorsi.length}</p>
          </div>
          <div class="stat-card">
            <h3>Km Totali</h3>
            <p class="stat-value">${this.calculateTotalKm()}</p>
          </div>
          <div class="stat-card">
            <h3>Tempo Totale</h3>
            <p class="stat-value">${this.calculateTotalTime()}</p>
          </div>
          <div class="stat-card">
            <h3>Media Km/Giorno</h3>
            <p class="stat-value">${this.calculateAverageKmPerDay()}</p>
          </div>
        </div>

        <div class="table-container">
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
              <!-- Le righe verranno popolate da updateTable() -->
            </tbody>
          </table>
        </div>
        
        <!-- Sezione per aggiungere/modificare percorsi -->
        <div class="percorsi-add-section" style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <h4 style="margin-top: 0; color: #333;">
            <i class="fas fa-plus-circle"></i> Aggiungi/Modifica Percorso
          </h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div>
              <label style="display: block; margin-bottom: 5px; font-weight: bold;">Partenza:</label>
              <input type="text" id="addPartenza" placeholder="Es. ALFIERI MATTINO" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
              <label style="display: block; margin-bottom: 5px; font-weight: bold;">Arrivo:</label>
              <input type="text" id="addArrivo" placeholder="Es. SUSY MACELLERIA ASTI" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
              <label style="display: block; margin-bottom: 5px; font-weight: bold;">Minuti:</label>
              <input type="number" id="addMinuti" placeholder="15" min="1" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
              <label style="display: block; margin-bottom: 5px; font-weight: bold;">Chilometri:</label>
              <input type="number" id="addKm" placeholder="10.5" min="0" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="display: flex; align-items: end; gap: 10px;">
              <button id="addPercorsoBtn" class="btn btn-success" style="flex: 1; padding: 8px 16px;">
                <i class="fas fa-save"></i> Salva Percorso
              </button>
              <button id="cancelEditBtn" class="btn btn-secondary" style="display: none; padding: 8px 16px;" onclick="Percorsi.cancelEdit()">
                <i class="fas fa-times"></i> Annulla
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Gestione upload file Excel
   */
  handleFileUpload: function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Reset del file input per permettere di ricaricare lo stesso file
    event.target.value = '';

    // Controlla l'estensione del file
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.txt') || fileName.endsWith('.tsv')) {
      // File di testo con tab
      this.handleTextFileUpload(file);
    } else {
      // File Excel normale
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Prendi il primo foglio
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          // Processa i dati
          this.processExcelData(jsonData);
          
          // Non serve notifica qui perché viene già mostrata in processExcelData
        } catch (error) {
          console.error('Errore durante l\'importazione:', error);
          Utils.notify('Errore durante l\'importazione del file', 'error');
        }
      };
      
      reader.readAsArrayBuffer(file);
    }
  },

  /**
   * Gestione file di testo con TAB
   */
  handleTextFileUpload: function(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Header corretti per il formato di import
        const headers = ['idOrigine', 'idDestinazione', 'tempoMinuti', 'distanzaKm', 'ChiaveUnivoca', 'Longitudine-Latitudine-Partenza', 'Longitudine-Latitudine-Arrivo'];
        
        const jsonData = [];
        // Salta la prima riga se è un'intestazione
        const startIndex = (lines[0].includes('idOrigine') || lines[0].includes('PARTENZA')) ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const values = lines[i].split('\t');
          if (values.length >= 5) { // Almeno 5 colonne
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            jsonData.push(row);
          }
        }
        
        console.log('Dati parsati dal file di testo:', jsonData);
        this.processExcelData(jsonData);
      } catch (error) {
        console.error('Errore durante l\'importazione:', error);
        Utils.notify('Errore durante l\'importazione del file', 'error');
      }
    };
    
    reader.readAsText(file);
  },

  /**
   * Processa dati Excel
   */
  processExcelData: function(data) {
    // Assicurati che lo stato sia caricato dal localStorage
    this.loadPercorsiFromStorage();
    
    // Ottieni la data selezionata dall'input
    const importDateInput = document.getElementById('importDate');
    const selectedDate = importDateInput ? importDateInput.value : new Date().toISOString().split('T')[0];
    
    console.log('=== INIZIO PROCESSAMENTO DATI ===');
    console.log('Numero di righe ricevute:', data.length);
    console.log('Percorsi esistenti prima dell\'import:', this.state.percorsi.length);
    if (data.length > 0) {
      console.log('Prima riga:', data[0]);
      console.log('Chiavi disponibili:', Object.keys(data[0]));
    }
    
    const processedData = data.map((row, index) => {
      // Mapping ESATTO per i nomi delle colonne Excel (senza fallback)
      const partenza = row['idOrigine'] || '';
      const arrivo = row['idDestinazione'] || '';
      const minuti = parseInt(row['tempoMinuti'] || 0);
      const chilometri = parseFloat(row['distanzaKm'] || 0);
      const chiaveUnivoca = row['ChiaveUnivoca'] || '';
      const coordPartenza = row['Longitudine-Latitudine-Partenza'] || '';
      const coordArrivo = row['Longitudine-Latitudine-Arrivo'] || '';
      
      console.log(`Riga ${index}: partenza="${partenza}", arrivo="${arrivo}"`);
      
      // Calcola durata in formato HH:MM
      const ore = Math.floor(minuti / 60);
      const minutiRest = minuti % 60;
      const durata = `${ore}:${minutiRest.toString().padStart(2, '0')}`;
      
      // La chiave univoca è la fusione di partenza+arrivo (es: CONTEAALFIERIMATTINO)
      // Verifica se la chiave corrisponde alla concatenazione di partenza+arrivo
      const generatedKey = (partenza + arrivo).replace(/[\s\-\.\,]/g, '').toUpperCase();
      
      // Log per debug (opzionale)
      if (chiaveUnivoca && chiaveUnivoca !== generatedKey) {
        console.log(`Chiave diversa: file="${chiaveUnivoca}" vs generata="${generatedKey}"`);
      }
      
      return {
        id: Utils.generateId('PRC'),
        data: selectedDate,
        partenza: partenza,
        arrivo: arrivo,
        km: chilometri,
        minuti: minuti,
        durata: durata,
        chiaveUnivoca: chiaveUnivoca,
        coordPartenza: coordPartenza,
        coordArrivo: coordArrivo,
        importedAt: new Date().toISOString()
      };
    });

    console.log('=== DATI PROCESSATI ===');
    console.log('Numero di percorsi processati:', processedData.length);
    console.log('Percorsi processati:', processedData);
    
    // Chiedi all'utente se vuole sostituire o aggiungere
    if (this.state.percorsi.length > 0) {
      if (confirm('Vuoi sostituire i percorsi esistenti? (OK = Sostituisci, Annulla = Aggiungi)')) {
        this.state.percorsi = processedData;
      } else {
        // Evita duplicati controllando la chiave univoca
        processedData.forEach(newPercorso => {
          const exists = this.state.percorsi.some(p => 
            p.chiaveUnivoca === newPercorso.chiaveUnivoca ||
            (p.partenza === newPercorso.partenza && p.arrivo === newPercorso.arrivo)
          );
          if (!exists) {
            this.state.percorsi.push(newPercorso);
          }
        });
      }
    } else {
      this.state.percorsi = processedData;
    }
    
    this.state.filteredPercorsi = [...this.state.percorsi];
    
    console.log('Stato finale percorsi:', this.state.percorsi);
    console.log('Numero totale percorsi:', this.state.percorsi.length);
    
    // Salva e aggiorna
    this.savePercorsiToStorage();
    
    // Aggiorna immediatamente la visualizzazione
    this.updateTable();
    this.updateStats();
    
    // Notifica successo
    const message = this.state.percorsi.length === processedData.length 
      ? `${processedData.length} percorsi importati con successo`
      : `${processedData.length} percorsi elaborati, ${this.state.percorsi.length} totali nel database`;
    Utils.notify(message, 'success');
  },

  /**
   * Parse data Excel
   */
  parseExcelDate: function(excelDate) {
    if (!excelDate) return new Date().toISOString().split('T')[0];
    
    // Se è già una stringa di data
    if (typeof excelDate === 'string') {
      return excelDate;
    }
    
    // Se è un numero Excel (giorni dal 1900)
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Render righe tabella
   */
  renderPercorsiRows: function() {
    if (this.state.filteredPercorsi.length === 0) {
      return '<tr><td colspan="9" class="empty-state">Nessun percorso trovato</td></tr>';
    }

    return this.state.filteredPercorsi.map(percorso => {
      // Formatta coordinate GPS per visualizzazione compatta
      const formatGPS = (coord) => {
        if (!coord) return '-';
        // Se le coordinate sono troppo lunghe, mostra solo parte iniziale
        return coord.length > 20 ? coord.substring(0, 20) + '...' : coord;
      };
      
      return `
        <tr>
          <td>${Utils.formatDate(new Date(percorso.data), 'DD/MM/YYYY')}</td>
          <td>${percorso.partenza}</td>
          <td>${percorso.arrivo}</td>
          <td class="text-right">${percorso.minuti}</td>
          <td class="text-right">${percorso.km.toFixed(1)}</td>
          <td class="chiave-univoca" title="${percorso.chiaveUnivoca}">${percorso.chiaveUnivoca || '-'}</td>
          <td class="gps-cell" title="${percorso.coordPartenza}">${formatGPS(percorso.coordPartenza)}</td>
          <td class="gps-cell" title="${percorso.coordArrivo}">${formatGPS(percorso.coordArrivo)}</td>
          <td>
            <button onclick="Percorsi.editPercorso('${percorso.id}')" class="btn-icon" title="Modifica">
              ✏️
            </button>
            <button onclick="Percorsi.viewOnMap('${percorso.id}')" class="btn-icon" title="Vedi su mappa">
              📍
            </button>
            <button onclick="Percorsi.deletePercorso('${percorso.id}')" class="btn-icon danger" title="Elimina">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Filtra percorsi
   */
  applyFilter: function(filter) {
    console.log('Applicando filtro:', filter);
    this.state.currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.percorsi-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log('Percorsi totali prima del filtro:', this.state.percorsi.length);
    
    switch(filter) {
      case 'today':
        this.state.filteredPercorsi = this.state.percorsi.filter(p => {
          const percorsoDate = new Date(p.data);
          return percorsoDate >= today;
        });
        break;
        
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        this.state.filteredPercorsi = this.state.percorsi.filter(p => {
          const percorsoDate = new Date(p.data);
          return percorsoDate >= weekAgo;
        });
        break;
        
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        this.state.filteredPercorsi = this.state.percorsi.filter(p => {
          const percorsoDate = new Date(p.data);
          return percorsoDate >= monthAgo;
        });
        break;
        
      default:
        this.state.filteredPercorsi = this.state.percorsi;
    }
    
    this.updateTable();
  },

  /**
   * Cerca percorsi
   */
  searchPercorsi: function(query) {
    if (!query.trim()) {
      this.state.filteredPercorsi = this.state.percorsi;
    } else {
      const searchTerm = query.toLowerCase();
      this.state.filteredPercorsi = this.state.percorsi.filter(p => {
        return (
          (p.partenza && p.partenza.toLowerCase().includes(searchTerm)) ||
          (p.arrivo && p.arrivo.toLowerCase().includes(searchTerm)) ||
          (p.chiaveUnivoca && p.chiaveUnivoca.toLowerCase().includes(searchTerm)) ||
          (p.km && p.km.toString().includes(searchTerm)) ||
          (p.minuti && p.minuti.toString().includes(searchTerm))
        );
      });
    }
    
    this.updateTable();
  },

  /**
   * Ordina percorsi
   */
  sortBy: function(field) {
    if (this.state.sortBy === field) {
      this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.sortBy = field;
      this.state.sortDirection = 'asc';
    }

    this.state.filteredPercorsi.sort((a, b) => {
      let valueA = a[field];
      let valueB = b[field];
      
      // Gestione numeri
      if (field === 'km') {
        valueA = parseFloat(valueA) || 0;
        valueB = parseFloat(valueB) || 0;
      }
      
      // Gestione date
      if (field === 'data') {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      }
      
      if (valueA < valueB) return this.state.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.state.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.updateTable();
  },

  /**
   * Aggiorna tabella
   */
  updateTable: function() {
    const tbody = document.getElementById('percorsiTableBody');
    if (tbody) {
      tbody.innerHTML = this.renderPercorsiRows();
    }
    
    // Aggiorna statistiche
    this.updateStats();
  },

  /**
   * Aggiorna statistiche
   */
  updateStats: function() {
    const stats = document.querySelectorAll('.stat-value');
    if (stats[0]) stats[0].textContent = this.state.filteredPercorsi.length;
    if (stats[1]) stats[1].textContent = this.calculateTotalKm();
    if (stats[2]) stats[2].textContent = this.calculateTotalTime();
    if (stats[3]) stats[3].textContent = this.calculateAverageKmPerDay();
  },

  /**
   * Calcola km totali
   */
  calculateTotalKm: function() {
    const total = this.state.percorsi.reduce((sum, p) => sum + (p.km || 0), 0);
    return total.toFixed(1) + ' km';
  },

  /**
   * Calcola tempo totale
   */
  calculateTotalTime: function() {
    const totalMinutes = this.state.percorsi.reduce((sum, p) => sum + (p.minuti || 0), 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  },

  /**
   * Calcola media km/giorno
   */
  calculateAverageKmPerDay: function() {
    if (this.state.percorsi.length === 0) return '0 km';
    
    const uniqueDates = [...new Set(this.state.percorsi.map(p => p.data))];
    const totalKm = this.state.percorsi.reduce((sum, p) => sum + (p.km || 0), 0);
    const average = totalKm / uniqueDates.length;
    
    return average.toFixed(1) + ' km';
  },

  /**
   * Visualizza percorso su mappa
   */
  viewOnMap: function(id) {
    const percorso = this.state.percorsi.find(p => p.id === id);
    if (!percorso) return;
    
    // Se ci sono coordinate GPS, apri Google Maps
    if (percorso.coordPartenza && percorso.coordArrivo) {
      // Estrai latitudine e longitudine dalle coordinate
      // Assumendo formato: "lat,lng" o simile
      const origin = encodeURIComponent(percorso.coordPartenza);
      const destination = encodeURIComponent(percorso.coordArrivo);
      const url = `https://www.google.com/maps/dir/${origin}/${destination}`;
      window.open(url, '_blank');
    } else {
      // Usa i nomi dei luoghi
      const origin = encodeURIComponent(percorso.partenza);
      const destination = encodeURIComponent(percorso.arrivo);
      const url = `https://www.google.com/maps/dir/${origin}/${destination}`;
      window.open(url, '_blank');
    }
  },

  /**
   * Elimina percorso
   */
  deletePercorso: function(id) {
    if (!confirm('Eliminare questo percorso?')) return;
    
    this.state.percorsi = this.state.percorsi.filter(p => p.id !== id);
    this.state.filteredPercorsi = this.state.filteredPercorsi.filter(p => p.id !== id);
    
    this.savePercorsiToStorage();
    this.updateTable();
    Utils.notify('Percorso eliminato', 'info');
  },

  /**
   * Cancella tutti i percorsi
   */
  clearPercorsi: function() {
    if (!confirm('Cancellare TUTTI i percorsi? Questa azione non può essere annullata.')) return;
    
    this.state.percorsi = [];
    this.state.filteredPercorsi = [];
    
    this.savePercorsiToStorage();
    this.render();
    Utils.notify('Tutti i percorsi sono stati cancellati', 'warning');
  },

  /**
   * Esporta percorsi
   */
  exportPercorsi: function() {
    if (this.state.percorsi.length === 0) {
      Utils.notify('Nessun percorso da esportare', 'warning');
      return;
    }

    // Prepara dati per export nel formato originale
    const exportData = this.state.percorsi.map(p => ({
      'Data': Utils.formatDate(new Date(p.data), 'DD/MM/YYYY'),
      'PARTENZA': p.partenza,
      'ARRIVO': p.arrivo,
      'MINUTI': p.minuti,
      'CHILOMETRI': p.km,
      'ChiaveUnivoca': p.chiaveUnivoca,
      'Cordinate_Gps_Partenza': p.coordPartenza,
      'Cordinate_Gps_Arrivo': p.coordArrivo
    }));

    // Crea workbook
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Percorsi");
    
    // Salva file
    const fileName = `Percorsi_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    Utils.notify('Percorsi esportati con successo', 'success');
  },

  /**
   * Carica percorsi da localStorage
   */
  loadPercorsiFromStorage: function() {
    const stored = localStorage.getItem('percorsi');
    if (stored) {
      try {
        this.state.percorsi = JSON.parse(stored);
        this.state.filteredPercorsi = [...this.state.percorsi];
      } catch (e) {
        console.error('Errore nel caricamento percorsi:', e);
        this.state.percorsi = [];
        this.state.filteredPercorsi = [];
      }
    } else {
      this.state.percorsi = [];
      this.state.filteredPercorsi = [];
    }
  },

  /**
   * Salva percorsi in localStorage
   */
  savePercorsiToStorage: function() {
    localStorage.setItem('percorsi', JSON.stringify(this.state.percorsi));
  },

  /**
   * Ottieni tempo di viaggio tra due punti
   * @param {string} partenza - Nome del punto di partenza
   * @param {string} arrivo - Nome del punto di arrivo
   * @returns {object} - {minuti: number, km: number} o null se non trovato
   */
  getTravelTime: function(partenza, arrivo) {
    if (!partenza || !arrivo) return null;
    
    // Prima prova con i nomi esatti
    let percorso = this.state.percorsi.find(p => 
      p.partenza === partenza && p.arrivo === arrivo
    );
    
    if (percorso) {
      return {
        minuti: percorso.minuti || 0,
        km: percorso.km || 0,
        durata: percorso.durata || '00:00'
      };
    }
    
    // Prova percorso inverso con nomi esatti
    percorso = this.state.percorsi.find(p => 
      p.partenza === arrivo && p.arrivo === partenza
    );
    
    if (percorso) {
      return {
        minuti: percorso.minuti || 0,
        km: percorso.km || 0,
        durata: percorso.durata || '00:00'
      };
    }
    
    // Se non trovato, prova con la chiave univoca normalizzata
    const normalizeString = (str) => str.toUpperCase().replace(/\s+/g, '');
    const partenzaNorm = normalizeString(partenza);
    const arrivoNorm = normalizeString(arrivo);
    const chiaveUnivoca = partenzaNorm + arrivoNorm;
    
    percorso = this.state.percorsi.find(p => 
      p.chiaveUnivoca === chiaveUnivoca ||
      (normalizeString(p.partenza) === partenzaNorm && normalizeString(p.arrivo) === arrivoNorm)
    );
    
    if (percorso) {
      return {
        minuti: percorso.minuti || 0,
        km: percorso.km || 0,
        durata: percorso.durata || '00:00'
      };
    }
    
    // Prova chiave inversa
    const chiaveInversa = arrivoNorm + partenzaNorm;
    percorso = this.state.percorsi.find(p => 
      p.chiaveUnivoca === chiaveInversa ||
      (normalizeString(p.partenza) === arrivoNorm && normalizeString(p.arrivo) === partenzaNorm)
    );
    
    if (percorso) {
      return {
        minuti: percorso.minuti || 0,
        km: percorso.km || 0,
        durata: percorso.durata || '00:00'
      };
    }
    
    return null;
  },

  /**
   * Ottieni tutti i percorsi disponibili
   * @returns {array} - Array di percorsi
   */
  getAllPercorsi: function() {
    return this.state.percorsi || [];
  },
  
  /**
   * Aggiungi o modifica percorso
   */
  addOrUpdatePercorso: function() {
    const partenza = document.getElementById('addPartenza').value.trim();
    const arrivo = document.getElementById('addArrivo').value.trim();
    const minuti = parseInt(document.getElementById('addMinuti').value) || 0;
    const km = parseFloat(document.getElementById('addKm').value) || 0;
    
    
    if (!partenza || !arrivo) {
      Utils.notify('Inserisci partenza e arrivo', 'warning');
      return;
    }
    
    if (minuti <= 0) {
      Utils.notify('I minuti devono essere maggiori di 0', 'warning');
      return;
    }
    
    // Genera chiave univoca
    const chiaveUnivoca = partenza.toUpperCase().replace(/\s+/g, '') + arrivo.toUpperCase().replace(/\s+/g, '');
    
    // Calcola durata in formato HH:MM
    const ore = Math.floor(minuti / 60);
    const min = minuti % 60;
    const durata = `${ore.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    
    // Se stiamo modificando, usa l'ID salvato
    let existingIndex = -1;
    if (this.editingPercorsoId) {
      existingIndex = this.state.percorsi.findIndex(p => p.id === this.editingPercorsoId);
    } else {
      // Altrimenti cerca se esiste già questo percorso
      existingIndex = this.state.percorsi.findIndex(p => {
        // Confronto esatto per partenza e arrivo
        const matchByNames = p.partenza === partenza && p.arrivo === arrivo;
        // Confronto per chiave univoca
        const matchByKey = p.chiaveUnivoca === chiaveUnivoca;
        
        return matchByNames || matchByKey;
      });
    }
    
    const percorso = {
      id: existingIndex >= 0 ? this.state.percorsi[existingIndex].id : 'PRC-' + Date.now(),
      data: existingIndex >= 0 ? this.state.percorsi[existingIndex].data : new Date().toISOString().split('T')[0],
      partenza: partenza,
      arrivo: arrivo,
      km: km,
      minuti: minuti,
      durata: durata,
      chiaveUnivoca: chiaveUnivoca,
      coordPartenza: existingIndex >= 0 ? this.state.percorsi[existingIndex].coordPartenza : '',
      coordArrivo: existingIndex >= 0 ? this.state.percorsi[existingIndex].coordArrivo : '',
      importedAt: existingIndex >= 0 ? this.state.percorsi[existingIndex].importedAt : new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      // Modifica percorso esistente
      this.state.percorsi[existingIndex] = percorso;
      Utils.notify('Percorso aggiornato con successo', 'success');
    } else {
      // Aggiungi nuovo percorso
      this.state.percorsi.push(percorso);
      Utils.notify('Percorso aggiunto con successo', 'success');
    }
    
    // Salva e ricarica
    this.savePercorsiToStorage();
    
    // Aggiorna la lista filtrata
    this.state.filteredPercorsi = [...this.state.percorsi];
    
    // Riapplica filtro corrente se presente
    const searchInput = document.getElementById('percorsiSearch');
    if (searchInput && searchInput.value) {
      this.searchPercorsi(searchInput.value);
    } else {
      this.applyFilter(this.state.currentFilter);
    }
    
    // Pulisci form
    document.getElementById('addPartenza').value = '';
    document.getElementById('addArrivo').value = '';
    document.getElementById('addMinuti').value = '';
    document.getElementById('addKm').value = '';
    
    // Reset editing state
    this.editingPercorsoId = null;
    
    // Ripristina il testo del pulsante
    const saveBtn = document.getElementById('addPercorsoBtn');
    if (saveBtn) {
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva Percorso';
    }
    
    // Nascondi il pulsante annulla
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
      cancelBtn.style.display = 'none';
    }
  },
  
  /**
   * Modifica percorso esistente
   */
  editPercorso: function(id) {
    const percorso = this.state.percorsi.find(p => p.id === id);
    if (!percorso) return;
    
    // Salva l'ID del percorso che stiamo modificando
    this.editingPercorsoId = id;
    
    // Popola il form con i dati del percorso
    document.getElementById('addPartenza').value = percorso.partenza;
    document.getElementById('addArrivo').value = percorso.arrivo;
    document.getElementById('addMinuti').value = percorso.minuti;
    document.getElementById('addKm').value = percorso.km;
    
    // Cambia il testo del pulsante
    const saveBtn = document.getElementById('addPercorsoBtn');
    if (saveBtn) {
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Aggiorna Percorso';
    }
    
    // Mostra il pulsante annulla
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
      cancelBtn.style.display = 'block';
    }
    
    // Scrolla fino al form
    document.querySelector('.percorsi-add-section').scrollIntoView({ behavior: 'smooth' });
  },
  
  /**
   * Elimina percorso
   */
  deletePercorso: function(id) {
    if (!confirm('Sei sicuro di voler eliminare questo percorso?')) return;
    
    const index = this.state.percorsi.findIndex(p => p.id === id);
    if (index >= 0) {
      this.state.percorsi.splice(index, 1);
      this.savePercorsiToStorage();
      
      // Aggiorna la lista filtrata
      this.state.filteredPercorsi = [...this.state.percorsi];
      
      // Riapplica filtro corrente se presente
      const searchInput = document.getElementById('percorsiSearch');
      if (searchInput && searchInput.value) {
        this.searchPercorsi(searchInput.value);
      } else {
        this.applyFilter(this.state.currentFilter);
      }
      
      Utils.notify('Percorso eliminato con successo', 'success');
    }
  },
  
  /**
   * Visualizza percorso sulla mappa
   */
  viewOnMap: function(id) {
    const percorso = this.state.percorsi.find(p => p.id === id);
    if (!percorso) return;
    
    // Se abbiamo le coordinate, apri Google Maps con il percorso
    if (percorso.coordPartenza && percorso.coordArrivo) {
      const url = `https://www.google.com/maps/dir/${percorso.coordPartenza}/${percorso.coordArrivo}`;
      window.open(url, '_blank');
    } else {
      // Altrimenti cerca per nome
      const origin = encodeURIComponent(percorso.partenza);
      const destination = encodeURIComponent(percorso.arrivo);
      const url = `https://www.google.com/maps/dir/${origin}/${destination}`;
      window.open(url, '_blank');
    }
  },
  
  /**
   * Cancella tutti i percorsi
   */
  clearAllPercorsi: function() {
    if (!confirm('Sei sicuro di voler cancellare TUTTI i percorsi? Questa azione non può essere annullata.')) {
      return;
    }
    
    // Cancella tutto
    this.state.percorsi = [];
    this.state.filteredPercorsi = [];
    this.state.currentFilter = 'all';
    
    // Salva lo stato vuoto
    this.savePercorsiToStorage();
    
    // Aggiorna la visualizzazione
    this.updateTable();
    this.updateStats();
    
    Utils.notify('Tutti i percorsi sono stati cancellati', 'success');
  },
  
  /**
   * Annulla modifica
   */
  cancelEdit: function() {
    // Reset editing state
    this.editingPercorsoId = null;
    
    // Pulisci form
    document.getElementById('addPartenza').value = '';
    document.getElementById('addArrivo').value = '';
    document.getElementById('addMinuti').value = '';
    document.getElementById('addKm').value = '';
    
    // Ripristina il testo del pulsante
    const saveBtn = document.getElementById('addPercorsoBtn');
    if (saveBtn) {
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Salva Percorso';
    }
    
    // Nascondi il pulsante annulla
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
      cancelBtn.style.display = 'none';
    }
  }
};

// Rendi disponibile globalmente
window.Percorsi = Percorsi;