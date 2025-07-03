/**
 * Clienti Module - Form Management
 * Form handling and client CRUD operations
 */

// Estendi l'oggetto Clienti esistente
Object.assign(window.Clienti, {
  /**
   * Mostra form aggiunta
   */
  showAddForm: function() {
    const form = document.getElementById('clientForm');
    if (form) {
      form.style.display = 'block';
      document.getElementById('formTitle').textContent = 'Aggiungi Nuovo Cliente';
      document.getElementById('newClientForm').reset();
      this.state.currentClient = null;
      // Scrolla al form
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Focus sul primo campo
      setTimeout(() => {
        document.getElementById('clientCode').focus();
      }, 300);
    }
  },
  
  /**
   * Nascondi form
   */
  hideForm: function() {
    const form = document.getElementById('clientForm');
    if (form) {
      form.style.display = 'none';
    }
  },
  
  /**
   * Salva cliente
   */
  saveClient: function() {
    const client = {
      id: this.state.currentClient?.id || Utils.generateId(),
      code: document.getElementById('clientCode').value,
      name: document.getElementById('clientName').value,
      contact: document.getElementById('contactName').value,
      street: document.getElementById('clientStreet').value,
      number: document.getElementById('clientNumber').value,
      zip: document.getElementById('clientZip').value,
      city: document.getElementById('clientCity').value,
      province: document.getElementById('clientProvince').value.toUpperCase(),
      zone: document.getElementById('clientZone').value,
      phone: document.getElementById('clientPhone').value,
      priority: document.getElementById('clientPriority').value,
      closeDay: document.getElementById('clientCloseDay').value,
      avoidDay: document.getElementById('clientAvoidDay').value,
      lastVisit: document.getElementById('clientLastVisit').value,
      preferredTime: document.getElementById('clientPreferredTime').value,
      visitTime: parseInt(document.getElementById('clientVisitTime').value) || 30,
      visitFrequency: parseInt(document.getElementById('clientVisitFrequency').value) || 30
    };
    
    if (this.state.currentClient) {
      // Modifica
      const index = this.state.clients.findIndex(c => c.id === client.id);
      if (index !== -1) {
        this.state.clients[index] = client;
      }
    } else {
      // Nuovo
      this.state.clients.push(client);
    }
    
    this.state.currentClient = null;
    this.hideForm();
    this.saveClients();
    this.applyFilters();
    
    Utils.notify('Cliente salvato con successo', 'success');
  },
  
  /**
   * Modifica cliente
   */
  editClient: function(id) {
    const client = this.state.clients.find(c => c.id === id);
    if (!client) return;
    
    this.state.currentClient = client;
    this.showAddForm();
    
    // Popola form
    document.getElementById('clientCode').value = client.code;
    document.getElementById('clientName').value = client.name;
    document.getElementById('contactName').value = client.contact || '';
    document.getElementById('clientStreet').value = client.street || '';
    document.getElementById('clientNumber').value = client.number || '';
    document.getElementById('clientZip').value = client.zip || '';
    document.getElementById('clientCity').value = client.city;
    document.getElementById('clientProvince').value = client.province || '';
    document.getElementById('clientZone').value = client.zone || '';
    document.getElementById('clientPhone').value = client.phone || '';
    document.getElementById('clientPriority').value = client.priority;
    document.getElementById('clientCloseDay').value = client.closeDay || '';
    document.getElementById('clientAvoidDay').value = client.avoidDay || '';
    document.getElementById('clientLastVisit').value = client.lastVisit || '';
    document.getElementById('clientPreferredTime').value = client.preferredTime || '';
    document.getElementById('clientVisitTime').value = client.visitTime || 30;
    document.getElementById('clientVisitFrequency').value = client.visitFrequency || 30;
    
    // Titolo form
    document.getElementById('formTitle').textContent = 'Modifica Cliente';
  },
  
  /**
   * Elimina cliente
   */
  deleteClient: function(id) {
    if (!confirm('Eliminare questo cliente?')) return;
    
    this.state.clients = this.state.clients.filter(c => c.id !== id);
    this.saveClients();
    this.applyFilters();
    
    Utils.notify('Cliente eliminato', 'success');
  },
  
  /**
   * Applica filtri
   */
  applyFilters: function() {
    const search = document.getElementById('clientSearchFilter')?.value.toLowerCase() || '';
    const priority = document.getElementById('priorityFilter')?.value || 'all';
    const zone = document.getElementById('zoneFilter')?.value || 'all';
    
    this.state.filters = { search, priority, zone };
    
    this.state.filteredClients = this.state.clients.filter(client => {
      // Filtro ricerca
      if (search && !this.matchesSearch(client, search)) {
        return false;
      }
      
      // Filtro priorità
      if (priority !== 'all' && client.priority !== priority) {
        return false;
      }
      
      // Filtro zona
      if (zone !== 'all' && client.zone !== zone) {
        return false;
      }
      
      return true;
    });
    
    this.render();
  },
  
  /**
   * Verifica corrispondenza ricerca
   */
  matchesSearch: function(client, search) {
    const fields = ['code', 'name', 'contact', 'city', 'street', 'number', 'zip', 'phone', 'zone'];
    return fields.some(field => 
      client[field]?.toLowerCase().includes(search)
    );
  },
  
  /**
   * Aggiorna filtro zone
   */
  updateZoneFilter: function() {
    const zones = [...new Set(this.state.clients.map(c => c.zone).filter(Boolean))];
    const select = document.getElementById('zoneFilter');
    
    if (select && zones.length > 0) {
      select.innerHTML = '<option value="all">Tutte le zone</option>' +
        zones.sort().map(zone => `<option value="${zone}">${zone}</option>`).join('');
    }
  }
});