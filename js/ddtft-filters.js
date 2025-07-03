/**
 * Modulo Gestione DDT e Fatture - Filters and Export Functions
 * Gestione filtri, ordinamento ed esportazione
 */

// Estende l'oggetto DDTFTModule con le funzioni di filtro ed esportazione
Object.assign(DDTFTModule, {
  /**
   * Setup filtri
   */
  setupFilters: function() {
    const typeFilter = document.getElementById('documentTypeFilter');
    const periodFilter = document.getElementById('periodFilter');
    const clientFilter = document.getElementById('clientFilter');

    if (typeFilter) {
      typeFilter.addEventListener('change', () => this.applyFilters());
    }

    if (periodFilter) {
      periodFilter.addEventListener('change', () => this.applyFilters());
    }

    if (clientFilter) {
      clientFilter.addEventListener('input', () => this.applyFilters());
    }
  },

  /**
   * Applica filtri
   */
  applyFilters: function() {
    const type = document.getElementById('documentTypeFilter')?.value || 'all';
    const period = document.getElementById('periodFilter')?.value || 'all';
    const client = document.getElementById('clientFilter')?.value.toLowerCase() || '';

    let filtered = [...this.state.documents];

    // Filter by type
    if (type !== 'all') {
      filtered = filtered.filter(d => d.type === type);
    }

    // Filter by period
    if (period !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (period) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(d => {
        const docDate = new Date(d.date);
        return docDate >= filterDate;
      });
    }

    // Filter by client
    if (client) {
      filtered = filtered.filter(d => 
        d.client.toLowerCase().includes(client)
      );
    }

    this.state.filteredDocuments = filtered;
    this.updateTable();
  },

  /**
   * Setup ordinamento header
   */
  setupSortHeaders: function() {
    const headers = document.querySelectorAll('.sortable');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const field = header.dataset.sort;
        this.sortDocuments(field);
      });
    });
  },

  /**
   * Ordina documenti
   */
  sortDocuments: function(field) {
    const documents = this.state.filteredDocuments.length > 0 ? 
                     this.state.filteredDocuments : 
                     this.state.documents;

    const isAsc = this.state.sortBy === field && this.state.sortDirection === 'asc';
    this.state.sortDirection = isAsc ? 'desc' : 'asc';
    this.state.sortBy = field;

    documents.sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];

      // Handle dates
      if (field === 'date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      // Handle numbers
      if (field === 'amount' || field === 'number') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (aVal < bVal) return isAsc ? -1 : 1;
      if (aVal > bVal) return isAsc ? 1 : -1;
      return 0;
    });

    this.updateTable();
  },

  /**
   * Esporta documenti
   */
  exportDocuments: function() {
    const documents = this.state.filteredDocuments.length > 0 ? 
                     this.state.filteredDocuments : 
                     this.state.documents;

    if (documents.length === 0) {
      alert('Nessun documento da esportare');
      return;
    }

    // Prepare data for export
    const exportData = documents.map(doc => ({
      'Tipo': doc.type.toUpperCase(),
      'Numero': doc.number,
      'Data': this.formatDate(doc.date),
      'Cliente': doc.client,
      'P.IVA': doc.vatNumber || '',
      'Importo': doc.amount || doc.total || 0,
      'Stato': doc.status === 'paid' ? 'Pagato' : 'Da pagare'
    }));

    // Convert to CSV
    const csv = this.convertToCSV(exportData);
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `documenti_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    Utils.notify('Documenti esportati con successo', 'success');
  },

  /**
   * Converti in CSV
   */
  convertToCSV: function(data) {
    if (data.length === 0) return '';

    // Get headers
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(';'),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains separator
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(';') ? `"${escaped}"` : escaped;
        }).join(';')
      )
    ].join('\n');

    return csv;
  }
});