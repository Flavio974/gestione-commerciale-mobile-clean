/**
 * Worksheet Module - Import Functions
 * Gestione importazione clienti
 */

// Estende l'oggetto Worksheet con le funzioni di importazione
Object.assign(Worksheet, {
  /**
   * Mostra modal importazione clienti
   */
  showImportModal: function() {
    console.log('showImportModal chiamata');
    const modal = document.getElementById('importClientsModal');
    console.log('Modal trovato:', modal);
    if (!modal) return;

    modal.style.display = 'block';
    
    // Aspetta che il modal sia visibile prima di procedere
    setTimeout(() => {
      // Carica tutti i clienti dal modulo Clienti
      const allClients = WorksheetData.getAllClientsFromModule();
    console.log('Clienti disponibili:', allClients.length);
    
    if (allClients.length === 0) {
      WorksheetUI.showAlert('Nessun cliente disponibile per l\'importazione. Aggiungi prima dei clienti nella scheda Clienti.', 'warning');
      modal.style.display = 'none';
      return;
    }

    // Popola il filtro zone
    const zones = WorksheetData.getUniqueZones(allClients);
    const zoneFilter = document.getElementById('importZoneFilter');
    zoneFilter.innerHTML = '<option value="">Tutte le zone</option>';
    zones.forEach(zone => {
      zoneFilter.innerHTML += `<option value="${zone}">${zone}</option>`;
    });

    // Setup event listeners per il modal
    this.setupImportModalListeners();
    
    // NON caricare clienti iniziali - mostra tabella vuota
    // this.loadImportClients();
    
    // Mostra messaggio informativo
    const tbody = document.getElementById('importClientsTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-filter" style="font-size: 48px; color: #ddd; margin-bottom: 20px; display: block;"></i>
            <h4>Seleziona dei filtri per visualizzare i clienti</h4>
            <p>Usa i filtri sopra e clicca "Applica Filtri" per vedere i clienti disponibili</p>
          </td>
        </tr>
      `;
    }
    
    // Reset contatori
    document.getElementById('availableClientsCount').textContent = '0';
    document.getElementById('selectedClientsCount').textContent = '0';
    }, 100); // Fine setTimeout
  },

  /**
   * Setup event listeners per il modal di importazione
   */
  setupImportModalListeners: function() {
    console.log('setupImportModalListeners chiamato');
    const modal = document.getElementById('importClientsModal');
    
    // Chiudi modal
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
      closeBtn.onclick = () => this.hideImportModal();
    }

    // Applica filtri
    const applyFiltersBtn = document.getElementById('applyImportFilters');
    console.log('Pulsante applyImportFilters trovato:', !!applyFiltersBtn);
    if (applyFiltersBtn) {
      // Rimuovi eventuali listener precedenti
      applyFiltersBtn.onclick = null;
      applyFiltersBtn.removeAttribute('onclick');
      
      // Test immediato
      console.log('Test click immediato sul pulsante...');
      applyFiltersBtn.style.cursor = 'pointer';
      applyFiltersBtn.style.pointerEvents = 'auto';
      
      // Aggiungi nuovo listener
      const self = this;
      applyFiltersBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Click su Applica Filtri - this:', this);
        console.log('Click su Applica Filtri - self:', self);
        self.loadImportClients();
      });
      
      // Test che il listener sia stato aggiunto
      console.log('Event listener aggiunto al pulsante Applica Filtri');
    }

    // Seleziona tutti i filtrati
    const selectAllFilteredBtn = document.getElementById('selectAllFiltered');
    if (selectAllFilteredBtn) {
      selectAllFilteredBtn.onclick = () => this.selectAllFilteredClients();
    }

    // Cancella clienti importati
    const clearImportedBtn = document.getElementById('clearImportedClients');
    console.log('Pulsante clearImportedClients trovato:', !!clearImportedBtn);
    if (clearImportedBtn) {
      clearImportedBtn.onclick = () => {
        console.log('Click su clearImportedClients');
        this.clearImportedClients();
      };
    }

    // Seleziona tutti
    const selectAllCheckbox = document.getElementById('selectAllImport');
    if (selectAllCheckbox) {
      selectAllCheckbox.onchange = (e) => this.toggleSelectAllImport(e.target.checked);
    }

    // Conferma importazione
    const confirmBtn = document.getElementById('confirmImport');
    if (confirmBtn) {
      // Rimuovi eventuali listener precedenti
      confirmBtn.onclick = null;
      confirmBtn.removeAttribute('onclick');
      // Aggiungi il nuovo listener con binding esplicito
      const self = this;
      confirmBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        self.confirmImport();
      });
    }

    // Annulla
    const cancelBtn = document.getElementById('cancelImport');
    if (cancelBtn) {
      cancelBtn.onclick = () => this.hideImportModal();
    }

    // Click fuori dal modal
    modal.onclick = (event) => {
      if (event.target === modal) {
        this.hideImportModal();
      }
    };
  },

  /**
   * Carica clienti nel modal di importazione
   */
  loadImportClients: function() {
    console.log('loadImportClients chiamata');
    const allClients = WorksheetData.getAllClientsFromModule();
    console.log('Clienti totali disponibili:', allClients.length);
    
    // Ottieni filtri
    const freqElement = document.getElementById('importFrequencyFilter');
    console.log('Elemento frequenza trovato:', !!freqElement, freqElement?.value);
    
    const filters = {
      zone: document.getElementById('importZoneFilter')?.value || '',
      priority: document.getElementById('importPriorityFilter')?.value || '',
      lastVisit: document.getElementById('importLastVisitFilter')?.value || '',
      lastVisitDate: document.getElementById('importLastVisitDate')?.value || '',
      frequency: freqElement?.value || '',
      discount: document.getElementById('importDiscountFilter')?.value || '',
      search: document.getElementById('importSearchFilter')?.value || ''
    };

    console.log('Filtri applicati:', filters);
    console.log('Filtro frequenza specifico:', filters.frequency);

    // Filtra clienti
    const filteredClients = WorksheetData.filterClientsForImport(allClients, filters);
    console.log('Clienti filtrati:', filteredClients.length);
    
    // Aggiorna contatore
    document.getElementById('availableClientsCount').textContent = filteredClients.length;
    
    // Render tabella
    const tbody = document.getElementById('importClientsTableBody');
    tbody.innerHTML = '';
    
    filteredClients.forEach(client => {
      const row = document.createElement('tr');
      // Calcola la frequenza di visita
      const frequencyLabel = this.getFrequencyLabel(client.visitFrequency);
      
      row.innerHTML = `
        <td>
          <input type="checkbox" class="import-client-checkbox" data-code="${client.code || client.id}">
        </td>
        <td>${client.code || client.id}</td>
        <td>${client.name}</td>
        <td>${client.zone || '-'}</td>
        <td>
          <span class="priority-badge priority-${client.priority || 0}">
            ${WorksheetData.getPriorityLabel(client.priority)}
          </span>
        </td>
        <td>${client.lastVisit ? Utils.formatDate(new Date(client.lastVisit), 'DD/MM/YYYY') : 'Mai visitato'}</td>
        <td>${frequencyLabel}</td>
        <td>${client.discount || '-'}</td>
      `;
      tbody.appendChild(row);
    });

    // Setup listeners per checkbox
    this.setupImportCheckboxListeners();
  },

  /**
   * Setup listeners per checkbox importazione
   */
  setupImportCheckboxListeners: function() {
    const checkboxes = document.querySelectorAll('.import-client-checkbox');
    console.warn('Setup checkbox listeners, trovate:', checkboxes.length);
    
    checkboxes.forEach((cb, index) => {
      // Rimuovi listener precedenti
      cb.onchange = null;
      // Aggiungi nuovo listener
      cb.addEventListener('change', (e) => {
        console.warn(`Checkbox ${index} cambiata:`, e.target.checked);
        this.updateSelectedCount();
      });
    });
    this.updateSelectedCount();
  },

  /**
   * Aggiorna contatore clienti selezionati
   */
  updateSelectedCount: function() {
    const selected = document.querySelectorAll('.import-client-checkbox:checked').length;
    document.getElementById('selectedClientsCount').textContent = selected;
  },

  /**
   * Toggle seleziona tutti
   */
  toggleSelectAllImport: function(checked) {
    const checkboxes = document.querySelectorAll('.import-client-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
    this.updateSelectedCount();
  },

  /**
   * Seleziona tutti i clienti filtrati
   */
  selectAllFilteredClients: function() {
    const checkboxes = document.querySelectorAll('.import-client-checkbox');
    
    if (checkboxes.length === 0) {
      WorksheetUI.showAlert('Prima applica dei filtri per visualizzare i clienti', 'warning');
      return;
    }
    
    checkboxes.forEach(cb => cb.checked = true);
    this.updateSelectedCount();
    WorksheetUI.showAlert(`Selezionati tutti i ${checkboxes.length} clienti filtrati`, 'success');
  },

  /**
   * Conferma importazione clienti
   */
  confirmImport: function() {
    try {
      const modal = document.getElementById('importClientsModal');
      if (!modal) return;
      
      const selectedCheckboxes = modal.querySelectorAll('.import-client-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
      WorksheetUI.showAlert('Seleziona almeno un cliente da importare', 'warning');
      return;
    }

    const allClients = WorksheetData.getAllClientsFromModule();
    const selectedCodes = Array.from(selectedCheckboxes).map(cb => cb.dataset.code);
    
    console.log('Debug Import:');
    console.log('Codici selezionati:', selectedCodes);
    console.log('Primo cliente disponibile:', allClients[0]);
    console.log('Controllo match:', selectedCodes[0], 'vs', allClients[0]?.code, 'o', allClients[0]?.id);
    
    const clientsToImport = allClients.filter(c => {
      // Converti in stringa per il confronto
      const clientCode = String(c.code || c.id);
      const match = selectedCodes.includes(clientCode);
      if (selectedCodes.length < 5 && match) {
        console.log('Match trovato per:', clientCode);
      }
      return match;
    });
    
    console.log('Clienti da importare trovati:', clientsToImport.length);


    // Salva i clienti importati
    console.log('Salvo clienti in localStorage:', clientsToImport);
    localStorage.setItem('worksheet_clients', JSON.stringify(clientsToImport));
    
    // Verifica salvataggio
    const saved = localStorage.getItem('worksheet_clients');
    console.log('Clienti salvati verificati:', saved ? JSON.parse(saved).length : 0);
    
    // Deseleziona tutte le checkbox nel modal
    const checkboxes = modal.querySelectorAll('.import-client-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Deseleziona anche il "seleziona tutti"
    const selectAllCheckbox = document.getElementById('selectAllImport');
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
    }
    
    // Aggiorna contatore a 0
    document.getElementById('selectedClientsCount').textContent = '0';
    
    // Nascondi modal
    this.hideImportModal();
    
    // Reset filtri per mostrare i nuovi clienti
    this.state.filtriAttivi = {
      priorita: 'all',
      zona: 'all', 
      tipoCliente: 'all',
      ritardo: 'all',
      search: ''
    };
    
    // Ricarica tabella
    console.log('Ricarico tabella...');
    this.loadClients();
    
    WorksheetUI.showAlert(`${clientsToImport.length} clienti importati con successo`, 'success');
    } catch (error) {
      alert('ERRORE: ' + error.message);
    }
  },

  /**
   * Ottieni etichetta frequenza
   */
  getFrequencyLabel: function(frequency) {
    if (!frequency) return '-';
    
    const freq = parseInt(frequency);
    if (freq <= 7) return 'Settimanale';
    if (freq <= 14) return 'Bisettimanale';
    if (freq <= 21) return 'Ogni 3 settimane';
    if (freq <= 30) return 'Mensile';
    if (freq <= 42) return 'Ogni 6 settimane';
    if (freq <= 56) return 'Ogni 8 settimane';
    
    return `Ogni ${freq} giorni`;
  },

  /**
   * Nascondi modal importazione
   */
  hideImportModal: function() {
    const modal = document.getElementById('importClientsModal');
    if (modal) {
      modal.style.display = 'none';
      
      // Reset tutti i filtri
      const filters = ['importZoneFilter', 'importPriorityFilter', 'importLastVisitFilter', 
                      'importFrequencyFilter', 'importDiscountFilter', 'importSearchFilter', 
                      'importLastVisitDate'];
      
      filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
          if (element.type === 'checkbox') {
            element.checked = false;
          } else {
            element.value = '';
          }
        }
      });
      
      // Reset checkbox "seleziona tutti"
      const selectAllCheckbox = document.getElementById('selectAllImport');
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
      }
      
      // Reset contatori
      document.getElementById('availableClientsCount').textContent = '0';
      document.getElementById('selectedClientsCount').textContent = '0';
      
      // Pulisci tabella
      const tbody = document.getElementById('importClientsTableBody');
      if (tbody) {
        tbody.innerHTML = '';
      }
    }
  }
});