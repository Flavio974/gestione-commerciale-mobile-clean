/**
 * Clienti Module - Import/Export
 * Import and export functionality for clients
 */

// Estendi l'oggetto Clienti esistente
Object.assign(window.Clienti, {
  /**
   * Esporta clienti
   */
  exportClients: function() {
    if (this.state.clients.length === 0) {
      Utils.notify('Nessun cliente da esportare', 'warning');
      return;
    }
    
    // Prepara dati per export
    const exportData = this.state.clients.map(client => ({
      'CODICE CLIENTE': client.code,
      'NOME': client.name,
      'CONTATTO': client.contact || '',
      'VIA': client.street || '',
      'NUMERO': client.number || '',
      'CAP': client.zip || '',
      'CITTA\'': client.city,
      'PROVINCIA': client.province || '',
      'ZONA': client.zone || '',
      'TELEFONO': client.phone || '',
      'PRIORITA\'': client.priority.toUpperCase(),
      'GIORNO DI CHIUSURA': this.formatDayName(client.closeDay),
      'GIORNO DA EVITARE': this.formatDayName(client.avoidDay),
      'ULTIMA VISITA': client.lastVisit ? Utils.formatDate(client.lastVisit, 'DD/MM/YYYY') : '',
      'MOMENTO PREFERITO': this.formatPreferredTime(client.preferredTime),
      'tempo di visita minuti': client.visitTime || 30,
      'frequenza visite in giorni': client.visitFrequency || 30
    }));
    
    // Crea workbook
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clienti');
    
    // Scarica file
    const fileName = `clienti_${Utils.formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    Utils.notify('Export completato', 'success');
  },
  
  /**
   * Mostra dialog import
   */
  showImportDialog: function() {
    const dialog = document.getElementById('importDialog');
    if (dialog) {
      dialog.style.display = 'block';
      
      // Aggiungi listener per chiudere cliccando fuori
      dialog.onclick = (e) => {
        if (e.target === dialog) {
          this.hideImportDialog();
        }
      };
      
      // Assicura che i pulsanti siano visibili
      const confirmBtn = document.getElementById('confirmImport');
      const cancelBtn = document.getElementById('cancelImport');
      if (confirmBtn) {
        confirmBtn.style.display = 'inline-block';
        confirmBtn.style.visibility = 'visible';
        console.log('Pulsante Importa presente e visibile');
      }
      if (cancelBtn) {
        cancelBtn.style.display = 'inline-block';
        cancelBtn.style.visibility = 'visible';
      }
      
      // Focus sul campo file per accessibilità
      setTimeout(() => {
        const fileInput = document.getElementById('importFile');
        if (fileInput) fileInput.focus();
      }, 100);
    }
  },
  
  /**
   * Nascondi dialog import
   */
  hideImportDialog: function() {
    const dialog = document.getElementById('importDialog');
    if (dialog) {
      dialog.style.display = 'none';
      document.getElementById('importFile').value = '';
    }
  },
  
  /**
   * Importa clienti da Excel
   */
  importClients: async function() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput?.files[0];
    
    if (!file) {
      Utils.notify('Seleziona un file Excel', 'warning');
      return;
    }
    
    try {
      const data = await this.readExcelFile(file);
      
      if (!data || data.length === 0) {
        Utils.notify('File vuoto o formato non valido', 'error');
        return;
      }
      
      // Mappa campi Excel a campi interni
      const imported = data.map(row => ({
        id: Utils.generateId(),
        code: row['CODICE CLIENTE'] || '',
        name: row['NOME'] || '',
        contact: row['CONTATTO'] || '',
        street: row['VIA'] || '',
        number: row['NUMERO'] || '',
        zip: row['CAP'] || '',
        city: row['CITTA\''] || row['CITTA'] || '',
        province: (row['PROVINCIA'] || '').toUpperCase(),
        zone: row['ZONA'] || '',
        phone: row['TELEFONO'] || '',
        priority: (row['PRIORITA\''] || row['PRIORITA'] || 'media').toLowerCase(),
        closeDay: this.parseDayName(row['GIORNO DI CHIUSURA']),
        avoidDay: this.parseDayName(row['GIORNO DA EVITARE']),
        lastVisit: this.parseExcelDate(row['ULTIMA VISITA']),
        preferredTime: this.parsePreferredTime(row['MOMENTO PREFERITO']),
        visitTime: parseInt(row['tempo di visita minuti']) || 30,
        visitFrequency: parseInt(row['frequenza visite in giorni']) || 30
      })).filter(client => client.code && client.name);
      
      if (imported.length === 0) {
        Utils.notify('Nessun cliente valido trovato nel file', 'error');
        return;
      }
      
      // Aggiungi o sostituisci clienti
      if (confirm(`Importare ${imported.length} clienti? I clienti esistenti saranno sovrascritti.`)) {
        this.state.clients = imported;
        this.saveClients();
        this.updateZoneFilter();
        this.applyFilters();
        this.hideImportDialog();
        
        Utils.notify(`Importati ${imported.length} clienti`, 'success');
      }
      
    } catch (error) {
      console.error('Errore import:', error);
      Utils.notify('Errore durante l\'importazione', 'error');
    }
  },
  
  /**
   * Leggi file Excel
   */
  readExcelFile: function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },
  
  /**
   * Parse data Excel
   */
  parseExcelDate: function(excelDate) {
    if (!excelDate) return '';
    
    // Se è già una stringa in formato DD/MM/YYYY
    if (typeof excelDate === 'string' && excelDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = excelDate.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Se è un numero Excel
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return Utils.formatDate(date, 'YYYY-MM-DD');
    }
    
    return '';
  },
  
  /**
   * Parse nome giorno
   */
  parseDayName: function(dayName) {
    if (!dayName) return '';
    
    const normalizedDay = dayName.toLowerCase().trim();
    const dayMap = {
      'lunedi': 'lunedi',
      'lunedì': 'lunedi',
      'martedi': 'martedi',
      'martedì': 'martedi',
      'mercoledi': 'mercoledi',
      'mercoledì': 'mercoledi',
      'giovedi': 'giovedi',
      'giovedì': 'giovedi',
      'venerdi': 'venerdi',
      'venerdì': 'venerdi',
      'sabato': 'sabato',
      'domenica': 'domenica'
    };
    
    return dayMap[normalizedDay] || '';
  },
  
  /**
   * Parse momento preferito
   */
  parsePreferredTime: function(time) {
    if (!time) return '';
    
    const normalizedTime = time.toLowerCase().trim();
    if (normalizedTime.includes('matt')) return 'mattina';
    if (normalizedTime.includes('pomer')) return 'pomeriggio';
    if (normalizedTime.includes('sera')) return 'sera';
    
    return '';
  }
});