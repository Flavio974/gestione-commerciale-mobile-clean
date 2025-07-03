/**
 * Modulo Gestione Percorsi - Utility Functions
 * Funzioni di utilità e storage
 */

// Estende l'oggetto Percorsi con le funzioni di utilità
Object.assign(Percorsi, {
  /**
   * Carica percorsi da localStorage
   */
  loadPercorsiFromStorage: function() {
    try {
      const savedPercorsi = localStorage.getItem('percorsi');
      if (savedPercorsi) {
        const parsed = JSON.parse(savedPercorsi);
        // Assicurati che sia un array
        if (Array.isArray(parsed)) {
          this.state.percorsi = parsed;
          this.state.filteredPercorsi = [...parsed];
          console.log('Percorsi caricati da localStorage:', this.state.percorsi.length);
        } else {
          console.warn('I dati salvati non sono un array valido');
          this.state.percorsi = [];
          this.state.filteredPercorsi = [];
        }
      } else {
        console.log('Nessun percorso salvato trovato');
        this.state.percorsi = [];
        this.state.filteredPercorsi = [];
      }
    } catch (error) {
      console.error('Errore nel caricamento dei percorsi:', error);
      this.state.percorsi = [];
      this.state.filteredPercorsi = [];
    }
  },

  /**
   * Salva percorsi in localStorage e sincronizza con Supabase
   */
  savePercorsiToStorage: function() {
    try {
      localStorage.setItem('percorsi', JSON.stringify(this.state.percorsi));
      console.log('Percorsi salvati:', this.state.percorsi.length);
      
      // Sincronizza con Supabase se disponibile
      this.syncWithSupabase();
    } catch (error) {
      console.error('Errore nel salvataggio dei percorsi:', error);
      Utils.notify('Errore nel salvataggio dei dati', 'error');
    }
  },

  /**
   * Sincronizza percorsi con Supabase
   */
  syncWithSupabase: async function() {
    try {
      if (window.SupabaseAIIntegration) {
        const aiIntegration = new SupabaseAIIntegration();
        const success = await aiIntegration.syncPercorsiToSupabase();
        if (success) {
          console.log('✅ Percorsi sincronizzati con Supabase');
        }
      }
    } catch (error) {
      console.error('❌ Errore sincronizzazione Supabase:', error);
      // Non mostrare errore all'utente per non interferire con l'UX
    }
  },

  /**
   * Cancella percorsi
   */
  clearPercorsi: function() {
    if (confirm('Sei sicuro di voler cancellare tutti i percorsi?')) {
      this.state.percorsi = [];
      this.state.filteredPercorsi = [];
      this.savePercorsiToStorage();
      this.updateTable();
      this.updateStats();
      Utils.notify('Tutti i percorsi sono stati cancellati', 'success');
    }
  }
});