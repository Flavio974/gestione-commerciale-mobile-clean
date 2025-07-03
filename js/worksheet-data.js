/**
 * Worksheet Data Management
 * Gestione dati e clienti per il foglio di lavoro
 */

const WorksheetData = {
  /**
   * Ottieni dati clienti dal modulo Clienti
   */
  getAllClientsFromModule: function() {
    let allClients = [];
    
    // Prima prova a caricare dal modulo Clienti se disponibile
    if (window.Clienti && window.Clienti.state && window.Clienti.state.clients) {
      allClients = window.Clienti.state.clients;
    } else {
      // Altrimenti prova dal localStorage
      const storedClients = localStorage.getItem('clients_data');
      if (storedClients) {
        try {
          const clients = JSON.parse(storedClients);
          if (clients && clients.length > 0) {
            allClients = clients;
          }
        } catch (e) {
          console.error('Errore nel caricamento clienti dal localStorage:', e);
        }
      }
    }
    
    // Ottieni i clienti già presenti nel foglio di lavoro
    const worksheetClients = this.getClientsData();
    const importedCodes = new Set(worksheetClients.map(c => String(c.code || c.id)));
    
    console.log('Clienti già importati nel foglio di lavoro:', worksheetClients.map(c => ({
      code: c.code || c.id,
      name: c.name
    })));
    
    // Filtra solo i clienti NON ancora importati
    const availableClients = allClients.filter(client => {
      const clientCode = String(client.code || client.id);
      return !importedCodes.has(clientCode);
    });
    
    console.log(`Clienti totali: ${allClients.length}, Già importati: ${importedCodes.size}, Disponibili: ${availableClients.length}`);
    
    // Debug: mostra i clienti con frequenza 7
    const clientsWithFreq7 = allClients.filter(c => c.visitFrequency === 7 || c.visitFrequency === '7');
    console.log('Clienti con frequenza 7 giorni:', clientsWithFreq7.map(c => ({
      code: c.code,
      name: c.name,
      visitFrequency: c.visitFrequency,
      isImported: importedCodes.has(String(c.code || c.id))
    })));
    
    return availableClients;
  },

  /**
   * Ottieni dati clienti per il foglio di lavoro
   */
  getClientsData: function() {
    // Prima prova a caricare dal localStorage del worksheet
    const storedData = localStorage.getItem('worksheet_clients');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        if (data && data.length > 0) {
          return data;
        }
      } catch (e) {
        console.error('Errore nel caricamento dei clienti:', e);
      }
    }

    // Se non ci sono dati salvati, restituisci array vuoto
    return [];
    
    // Dati di esempio (commentati - non più usati)
    /*return [
      {
        code: 'CL001',
        name: 'Rossi Mario S.r.l.',
        address: 'Via Roma, 123',
        cap: '20100',
        city: 'Milano',
        lat: 45.4642,
        lng: 9.1900,
        zone: 'Nord',
        discount: 'A',
        delay: 5,
        priority: 1,
        lastVisit: '2024-01-15',
        toVisit: true
      },
      {
        code: 'CL002',
        name: 'Bianchi Giuseppe & C.',
        address: 'Corso Italia, 45',
        cap: '20122',
        city: 'Milano',
        lat: 45.4600,
        lng: 9.1950,
        zone: 'Centro',
        discount: 'B',
        delay: 0,
        priority: 2,
        lastVisit: '2024-01-20',
        toVisit: false
      },
      {
        code: 'CL003',
        name: 'Verdi Luigi SPA',
        address: 'Viale Monza, 100',
        cap: '20127',
        city: 'Milano',
        lat: 45.4950,
        lng: 9.2100,
        zone: 'Est',
        discount: 'A',
        delay: 10,
        priority: 1,
        lastVisit: '2024-01-10',
        toVisit: true
      },
      {
        code: 'CL004',
        name: 'Gialli Srl',
        address: 'Via Torino, 50',
        cap: '20123',
        city: 'Milano',
        lat: 45.4550,
        lng: 9.1800,
        zone: 'Ovest',
        discount: 'C',
        delay: 0,
        priority: 3,
        lastVisit: '2024-01-22',
        toVisit: false
      },
      {
        code: 'CL005',
        name: 'Blu & Co.',
        address: 'Piazza Duomo, 1',
        cap: '20121',
        city: 'Milano',
        lat: 45.4641,
        lng: 9.1919,
        zone: 'Centro',
        discount: 'B',
        delay: 3,
        priority: 2,
        lastVisit: '2024-01-18',
        toVisit: true
      }
    ];*/
  },

  /**
   * Filtra clienti
   */
  filterClients: function(clients, filters) {
    console.log('filterClients input:', clients.length, 'clienti, filtri:', filters);
    let filtered = [...clients];

    // Filtro priorità
    if (filters.priorita && filters.priorita !== 'all') {
      filtered = filtered.filter(c => c.priority == filters.priorita);
    }

    // Filtro zona
    if (filters.zona && filters.zona !== 'all') {
      filtered = filtered.filter(c => c.zone === filters.zona);
    }

    // Filtro tipo cliente
    if (filters.tipoCliente && filters.tipoCliente !== 'all') {
      filtered = filtered.filter(c => c.clientType === filters.tipoCliente);
    }

    // Filtro ritardo
    if (filters.ritardo === 'yes') {
      filtered = filtered.filter(c => c.delay > 0);
    } else if (filters.ritardo === 'no') {
      filtered = filtered.filter(c => c.delay === 0);
    } else if (filters.ritardo && filters.ritardo !== 'all') {
      // Se c'è un valore numerico specifico
      const days = parseInt(filters.ritardo);
      if (!isNaN(days)) {
        filtered = filtered.filter(c => c.delay >= days);
      }
    }

    // Filtro ricerca
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(search) ||
        c.code.toLowerCase().includes(search) ||
        (c.city && c.city.toLowerCase().includes(search))
      );
    }

    console.log('filterClients output:', filtered.length, 'clienti filtrati');
    return filtered;
  },

  /**
   * Filtra clienti per importazione
   */
  filterClientsForImport: function(clients, filters) {
    console.log('filterClientsForImport - Input:', clients.length, 'clienti');
    console.log('Filtri ricevuti:', filters);
    
    let filtered = [...clients];

    // Filtro zona
    if (filters.zone) {
      filtered = filtered.filter(c => c.zone === filters.zone);
    }

    // Filtro priorità
    if (filters.priority) {
      filtered = filtered.filter(c => {
        // Converti priorità stringa in numero se necessario
        let clientPriority = c.priority;
        if (typeof clientPriority === 'string') {
          switch(clientPriority.toLowerCase()) {
            case 'alta': clientPriority = 1; break;
            case 'media': clientPriority = 2; break;
            case 'bassa': clientPriority = 3; break;
            default: clientPriority = 2;
          }
        }
        return clientPriority == filters.priority;
      });
    }

    // Filtro ultima visita (giorni)
    if (filters.lastVisit) {
      if (filters.lastVisit === 'never') {
        filtered = filtered.filter(c => !c.lastVisit);
      } else {
        const days = parseInt(filters.lastVisit);
        filtered = filtered.filter(c => {
          if (!c.lastVisit) return false;
          const lastVisitDate = new Date(c.lastVisit);
          const today = new Date();
          const diffTime = Math.abs(today - lastVisitDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays > days;
        });
      }
    }

    // Filtro data specifica ultima visita
    if (filters.lastVisitDate) {
      filtered = filtered.filter(c => {
        if (!c.lastVisit) return false;
        // Confronta solo la data, non l'ora
        const clientDate = new Date(c.lastVisit).toISOString().split('T')[0];
        return clientDate === filters.lastVisitDate;
      });
    }

    // Filtro frequenza visita
    if (filters.frequency) {
      const frequencyDays = parseInt(filters.frequency);
      console.log('Filtro frequenza attivo:', frequencyDays);
      
      // Log delle prime 5 frequenze per debug
      const frequencies = filtered.slice(0, 5).map(c => ({
        code: c.code,
        visitFrequency: c.visitFrequency
      }));
      console.log('Esempio frequenze clienti:', frequencies);
      
      const beforeFilter = filtered.length;
      filtered = filtered.filter(c => {
        // Se il cliente ha una frequenza di visita impostata
        if (c.visitFrequency) {
          const clientFreq = parseInt(c.visitFrequency);
          const match = clientFreq === frequencyDays;
          if (!match && filtered.length < 5) {
            console.log(`Cliente ${c.code}: freq ${clientFreq} vs filtro ${frequencyDays}`);
          }
          return match;
        }
        
        // Se il cliente ha una data di ultima visita, calcola se è da visitare
        if (c.lastVisit) {
          const lastVisitDate = new Date(c.lastVisit);
          const today = new Date();
          const diffTime = Math.abs(today - lastVisitDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Il cliente è da visitare se sono passati almeno i giorni della frequenza
          return diffDays >= frequencyDays;
        }
        
        // Se non ha mai avuto visite, include solo se è la prima volta
        return true;
      });
      console.log(`Filtro frequenza: ${beforeFilter} -> ${filtered.length} clienti`);
    }

    // Filtro categoria sconto
    if (filters.discount) {
      filtered = filtered.filter(c => c.discount === filters.discount);
    }

    // Filtro ricerca
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        (c.name && c.name.toLowerCase().includes(search)) ||
        (c.code && c.code.toLowerCase().includes(search))
      );
    }

    console.log('filterClientsForImport - Output:', filtered.length, 'clienti filtrati');
    return filtered;
  },

  /**
   * Ottieni zone uniche dai clienti
   */
  getUniqueZones: function(clients) {
    const zones = new Set();
    clients.forEach(client => {
      if (client.zone) zones.add(client.zone);
    });
    return Array.from(zones).sort();
  },

  /**
   * Ordina clienti
   */
  sortClients: function(clients) {
    const sorted = [...clients];

    // Per ora ordina per priorità
    const priorityOrder = { 1: 0, 2: 1, 3: 2 };
    sorted.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 999;
      const bPriority = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 999;
      return aPriority - bPriority;
    });

    return sorted;
  },

  /**
   * Ottieni etichetta priorità
   */
  getPriorityLabel: function(priority) {
    switch(priority) {
      case 1: return 'Alta';
      case 2: return 'Media';
      case 3: return 'Bassa';
      default: return '';
    }
  },

  /**
   * Esporta in Excel
   */
  exportToExcel: function(clients, getPriorityLabel) {
    // Crea array per export
    const exportData = clients.map((client, index) => ({
      'Ordine': index + 1,
      'Codice': client.code,
      'Ragione Sociale': client.name,
      'Indirizzo': client.address,
      'CAP': client.cap,
      'Città': client.city,
      'Latitudine': client.lat,
      'Longitudine': client.lng,
      'Zona': client.zone,
      'Cat. Sconto': client.discount,
      'Ritardo (gg)': client.delay || 0,
      'Priorità': getPriorityLabel(client.priority),
      'Ultima Visita': client.lastVisit || '',
      'Da Visitare': client.toVisit ? 'SI' : 'NO'
    }));

    // Se XLSX è disponibile, usa quello
    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Foglio di Lavoro");
      
      const fileName = `Foglio_Lavoro_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      return { success: true, message: 'Foglio di lavoro esportato' };
    } else {
      // Fallback: crea CSV
      const csv = this.convertToCSV(exportData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Foglio_Lavoro_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true, message: 'Foglio di lavoro esportato in CSV' };
    }
  },

  /**
   * Converti in CSV
   */
  convertToCSV: function(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');
    
    return csv;
  }
};

// Export globale
window.WorksheetData = WorksheetData;