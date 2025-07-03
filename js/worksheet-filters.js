/**
 * Worksheet Module - Filter and Utility Functions
 * Gestione filtri e funzioni di utilità
 */

// Estende l'oggetto Worksheet con le funzioni di filtro e utilità
Object.assign(Worksheet, {
  /**
   * Applica filtri
   */
  applyFilters: function() {
    // Aggiorna stato filtri
    const priority = document.getElementById('priorityFilter').value;
    const delay = document.getElementById('delayFilter').value;
    const search = document.getElementById('searchFilter').value;

    this.state.filtriAttivi.priorita = priority;
    this.state.filtriAttivi.ritardo = delay;
    this.state.filtriAttivi.search = search;

    // Ricarica tabella
    this.loadClients();
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
  },

  /**
   * Formatta minuti in ore:minuti
   */
  formatMinutes: function(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins.toString().padStart(2, '0')}m`;
    }
    return `${mins}m`;
  },
  
  /**
   * Formatta orario in formato HH:MM
   */
  formatTime: function(timeString) {
    if (!timeString || !timeString.includes(':')) return timeString;
    
    const parts = timeString.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  },

  /**
   * Carica da localStorage
   */
  loadWorksheetFromStorage: function() {
    try {
      const saved = localStorage.getItem('worksheet_state');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.clientiDaVisitare) this.state.clientiDaVisitare = data.clientiDaVisitare;
        if (data.clientiSelezionati) this.state.clientiSelezionati = data.clientiSelezionati;
        if (data.filtriAttivi) this.state.filtriAttivi = data.filtriAttivi;
        if (data.itinerario) this.state.itinerario = data.itinerario;
        if (data.itinerariGenerati) this.state.itinerariGenerati = data.itinerariGenerati;
      }
    } catch (e) {
      console.error('Errore caricamento stato worksheet:', e);
    }
  },

  /**
   * Salva in localStorage
   */
  saveWorksheetToStorage: function() {
    try {
      const data = {
        clientiDaVisitare: this.state.clientiDaVisitare,
        clientiSelezionati: this.state.clientiSelezionati,
        filtriAttivi: this.state.filtriAttivi,
        itinerario: this.state.itinerario,
        itinerariGenerati: this.state.itinerariGenerati
      };
      localStorage.setItem('worksheet_state', JSON.stringify(data));
    } catch (e) {
      console.error('Errore salvataggio stato worksheet:', e);
    }
  }
});