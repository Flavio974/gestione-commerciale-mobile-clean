/**
 * Modulo Gestione Percorsi - Table Functions
 * Gestione tabella, filtri e visualizzazione
 */

// Estende l'oggetto Percorsi con le funzioni della tabella
Object.assign(Percorsi, {
  /**
   * Render righe tabella
   */
  renderPercorsiRows: function(percorsiDaMostrare) {
    if (!percorsiDaMostrare || percorsiDaMostrare.length === 0) {
      return '<tr><td colspan="9" class="empty-state">Nessun percorso trovato</td></tr>';
    }

    return percorsiDaMostrare.map(percorso => {
      // Formatta coordinate GPS per visualizzazione compatta
      const formatGPS = (coord) => {
        if (!coord) return '-';
        // Se le coordinate sono troppo lunghe, mostra solo parte iniziale
        return coord.length > 20 ? coord.substring(0, 20) + '...' : coord;
      };
      
      // Gestione sicura dei valori null/undefined
      const km = percorso.km != null ? parseFloat(percorso.km).toFixed(1) : '0.0';
      const minuti = percorso.minuti != null ? percorso.minuti : 0;
      
      return `
        <tr>
          <td>${Utils.formatDate(new Date(percorso.data), 'DD/MM/YYYY')}</td>
          <td>${percorso.partenza || '-'}</td>
          <td>${percorso.arrivo || '-'}</td>
          <td class="text-right">${minuti}</td>
          <td class="text-right">${km}</td>
          <td class="chiave-univoca" title="${percorso.chiaveUnivoca || ''}">${percorso.chiaveUnivoca || '-'}</td>
          <td class="gps-cell" title="${percorso.coordPartenza || ''}">${formatGPS(percorso.coordPartenza)}</td>
          <td class="gps-cell" title="${percorso.coordArrivo || ''}">${formatGPS(percorso.coordArrivo)}</td>
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
      case 'oggi':
      case 'today':
        this.state.filteredPercorsi = this.state.percorsi.filter(p => {
          const percorsoDate = new Date(p.data);
          percorsoDate.setHours(0, 0, 0, 0);
          return percorsoDate.getTime() === today.getTime();
        });
        break;
        
      case 'settimana':
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        this.state.filteredPercorsi = this.state.percorsi.filter(p => {
          const percorsoDate = new Date(p.data);
          return percorsoDate >= weekAgo;
        });
        break;
        
      case 'mese':
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        this.state.filteredPercorsi = this.state.percorsi.filter(p => {
          const percorsoDate = new Date(p.data);
          return percorsoDate >= monthAgo;
        });
        break;
        
      case 'all':
      default:
        this.state.filteredPercorsi = [...this.state.percorsi];
    }
    
    console.log('Percorsi filtrati:', this.state.filteredPercorsi.length);
    this.updateTable();
  },

  /**
   * Cerca percorsi
   */
  searchPercorsi: function(query) {
    console.log('🔍 RICERCA PERCORSI chiamata con query:', query);
    console.log('🔍 Percorsi totali disponibili:', this.state.percorsi.length);
    
    if (!query.trim()) {
      this.state.filteredPercorsi = [...this.state.percorsi];
      console.log('🔍 Query vuota, mostrando tutti i percorsi:', this.state.filteredPercorsi.length);
    } else {
      const searchTerm = query.toLowerCase();
      this.state.filteredPercorsi = this.state.percorsi.filter(p => {
        const matches = (
          (p.partenza && p.partenza.toLowerCase().includes(searchTerm)) ||
          (p.arrivo && p.arrivo.toLowerCase().includes(searchTerm)) ||
          (p.chiaveUnivoca && p.chiaveUnivoca.toLowerCase().includes(searchTerm)) ||
          (p.km && p.km.toString().includes(searchTerm)) ||
          (p.minuti && p.minuti.toString().includes(searchTerm))
        );
        
        if (matches) {
          console.log('🎯 Match trovato:', p.partenza, '->', p.arrivo);
        }
        
        return matches;
      });
      console.log('🔍 Risultati ricerca per "' + searchTerm + '":', this.state.filteredPercorsi.length);
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

    // Determina quale array ordinare
    const arrayToSort = this.state.currentFilter === 'all' ? 
                       this.state.percorsi : 
                       this.state.filteredPercorsi;

    arrayToSort.sort((a, b) => {
      let valueA = a[field];
      let valueB = b[field];
      
      // Gestione numeri
      if (field === 'km' || field === 'minuti') {
        valueA = parseFloat(valueA) || 0;
        valueB = parseFloat(valueB) || 0;
      }
      
      // Gestione date
      if (field === 'data') {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      }
      
      // Gestione stringhe
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      if (valueA < valueB) return this.state.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.state.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.updateTable();
  },

  /**
   * Visualizza su mappa
   */
  viewOnMap: function(id) {
    const percorso = this.state.percorsi.find(p => p.id === id);
    if (!percorso) return;
    
    // Se abbiamo le coordinate GPS
    if (percorso.coordPartenza && percorso.coordArrivo) {
      // Apri Google Maps con le coordinate
      const url = `https://www.google.com/maps/dir/${percorso.coordPartenza}/${percorso.coordArrivo}`;
      window.open(url, '_blank');
    } else {
      // Usa i nomi delle località
      const url = `https://www.google.com/maps/dir/${encodeURIComponent(percorso.partenza)}/${encodeURIComponent(percorso.arrivo)}`;
      window.open(url, '_blank');
    }
  }
});