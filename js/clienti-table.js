/**
 * Clienti Module - Table Management
 * Table rendering, sorting, and display functions
 */

// Estendi l'oggetto Clienti esistente
Object.assign(window.Clienti, {
  /**
   * Render tabella
   */
  render: function() {
    const tbody = document.getElementById('clientsTableBody');
    if (!tbody) return;
    
    if (this.state.filteredClients.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="18" class="empty-state">
            <div class="empty-state-icon">📋</div>
            <p>Nessun cliente trovato</p>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = this.state.filteredClients.map(client => {
      const delay = this.calculateDelay(client);
      const delayClass = delay !== null ? (delay > 30 ? 'priority-high' : delay > 15 ? 'priority-medium' : '') : '';
      
      return `
        <tr>
          <td>${client.code}</td>
          <td>${client.name}</td>
          <td>${client.contact || '-'}</td>
          <td>${client.street || '-'}</td>
          <td>${client.city}</td>
          <td>${client.zip || '-'}</td>
          <td>${client.province || '-'}</td>
          <td>${client.zone || '-'}</td>
          <td>${client.phone || '-'}</td>
          <td><span class="priority-badge priority-${client.priority}">${this.getPriorityLabel(client.priority)}</span></td>
          <td>${client.closeDay ? `<span class="day-badge close-day">${this.formatDayName(client.closeDay)}</span>` : '-'}</td>
          <td>${client.avoidDay ? `<span class="day-badge avoid-day">${this.formatDayName(client.avoidDay)}</span>` : '-'}</td>
          <td>${client.preferredTime ? `<span class="time-badge ${client.preferredTime}">${this.formatPreferredTime(client.preferredTime)}</span>` : '-'}</td>
          <td>${client.lastVisit ? Utils.formatDate(client.lastVisit, 'DD/MM/YYYY') : '-'}</td>
          <td>${client.visitTime || 30} min</td>
          <td><span class="frequency-badge">${client.visitFrequency || 30} gg</span></td>
          <td class="${delayClass}">${delay !== null ? `${delay} gg` : '-'}</td>
          <td class="actions" style="position: sticky; right: 0; background-color: white; box-shadow: -2px 0 4px rgba(0,0,0,0.1);">
            <button class="btn-sm btn-primary" onclick="Clienti.editClient('${client.id}')" title="Modifica">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-sm btn-danger" onclick="Clienti.deleteClient('${client.id}')" title="Elimina">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },
  
  /**
   * Calcola ritardo visita (giorni trascorsi dall'ultima visita)
   */
  calculateDelay: function(client) {
    if (!client.lastVisit) return null; // Ritorna null se non c'è data ultima visita
    
    const lastVisit = new Date(client.lastVisit);
    const today = new Date();
    const daysSinceVisit = Math.floor((today - lastVisit) / (1000 * 60 * 60 * 24));
    
    return daysSinceVisit; // Ritorna semplicemente i giorni trascorsi
  },
  
  /**
   * Ordina per colonna
   */
  sortBy: function(field) {
    const currentOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
    this.state.sortOrder = currentOrder;
    
    this.state.filteredClients.sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      
      // Gestione speciale per alcuni campi
      if (field === 'delay') {
        aVal = this.calculateDelay(a);
        bVal = this.calculateDelay(b);
      } else if (field === 'lastVisit') {
        aVal = aVal ? new Date(aVal) : new Date(0);
        bVal = bVal ? new Date(bVal) : new Date(0);
      }
      
      if (currentOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    this.render();
  },
  
  /**
   * Ottieni etichetta priorità
   */
  getPriorityLabel: function(priority) {
    switch(priority) {
      case 'alta':
      case 1:
        return 'Alta';
      case 'media':
      case 2:
        return 'Media';
      case 'bassa':
      case 3:
        return 'Bassa';
      default:
        return 'Media';
    }
  }
});