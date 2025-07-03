/**
 * Modulo Gestione Percorsi - CRUD Functions
 * Gestione Create, Read, Update, Delete operations
 */

// Estende l'oggetto Percorsi con le funzioni CRUD
Object.assign(Percorsi, {
  // Variabile per tracciare l'ID del percorso in modifica
  editingPercorsoId: null,

  /**
   * Aggiungi o modifica percorso
   */
  addOrUpdatePercorso: function() {
    const partenza = document.getElementById('newPartenza').value.trim();
    const arrivo = document.getElementById('newArrivo').value.trim();
    const minuti = parseInt(document.getElementById('newMinuti').value) || 0;
    const km = parseFloat(document.getElementById('newKm').value) || 0;
    
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
      id: existingIndex >= 0 ? this.state.percorsi[existingIndex].id : Utils.generateId('PRC'),
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
    document.getElementById('newPartenza').value = '';
    document.getElementById('newArrivo').value = '';
    document.getElementById('newMinuti').value = '';
    document.getElementById('newKm').value = '';
    
    // Reset editing state
    this.editingPercorsoId = null;
    
    // Ripristina il testo del pulsante e titolo
    const saveBtn = document.getElementById('addPercorsoBtn');
    if (saveBtn) {
      saveBtn.innerHTML = '<span class="icon">➕</span> Aggiungi';
    }
    
    const formTitle = document.getElementById('formTitle');
    if (formTitle) {
      formTitle.textContent = 'Aggiungi Nuovo Percorso';
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
    document.getElementById('newPartenza').value = percorso.partenza;
    document.getElementById('newArrivo').value = percorso.arrivo;
    document.getElementById('newMinuti').value = percorso.minuti;
    document.getElementById('newKm').value = percorso.km;
    
    // Cambia il testo del pulsante e titolo
    const saveBtn = document.getElementById('addPercorsoBtn');
    if (saveBtn) {
      saveBtn.innerHTML = '<span class="icon">💾</span> Aggiorna';
    }
    
    const formTitle = document.getElementById('formTitle');
    if (formTitle) {
      formTitle.textContent = 'Modifica Percorso';
    }
    
    // Mostra il pulsante annulla
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
      cancelBtn.style.display = 'block';
    }
    
    // Scrolla fino al form
    document.querySelector('.percorso-form').scrollIntoView({ behavior: 'smooth' });
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
    document.getElementById('newPartenza').value = '';
    document.getElementById('newArrivo').value = '';
    document.getElementById('newMinuti').value = '';
    document.getElementById('newKm').value = '';
    
    // Ripristina il testo del pulsante e titolo
    const saveBtn = document.getElementById('addPercorsoBtn');
    if (saveBtn) {
      saveBtn.innerHTML = '<span class="icon">➕</span> Aggiungi';
    }
    
    const formTitle = document.getElementById('formTitle');
    if (formTitle) {
      formTitle.textContent = 'Aggiungi Nuovo Percorso';
    }
    
    // Nascondi il pulsante annulla
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
      cancelBtn.style.display = 'none';
    }
  }
});