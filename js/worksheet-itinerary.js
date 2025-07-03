/**
 * Worksheet Itinerary Management
 * Gestione itinerari e ottimizzazione percorsi
 */

const WorksheetItinerary = {
  /**
   * Mostra modal itinerario
   */
  showItineraryModal: function() {
    const modal = document.getElementById('itineraryModal');
    if (!modal) return;

    modal.style.display = 'block';
    
    // Set default date to today
    document.getElementById('itineraryDate').value = new Date().toISOString().split('T')[0];
    
    // Popola la lista dei clienti selezionati con campi durata
    const selectedClients = [];
    const allClients = window.WorksheetData.getClientsData();
    
    document.querySelectorAll('.client-checkbox:checked').forEach(checkbox => {
      const code = checkbox.dataset.code;
      const client = allClients.find(c => 
        String(c.code) === String(code) || 
        String(c.id) === String(code)
      );
      if (client) selectedClients.push(client);
    });
    
    const durationsList = document.getElementById('clientDurationsList');
    if (durationsList) {
      durationsList.innerHTML = '';
      
      if (selectedClients.length === 0) {
        durationsList.innerHTML = '<p style="color: #666;">Nessun cliente selezionato</p>';
      } else {
        selectedClients.forEach((client, index) => {
          const defaultDuration = client.visitTime || 30; // Usa il tempo di visita del cliente o 30 min di default
          durationsList.innerHTML += `
            <div class="client-duration-item" style="padding: 10px; border-bottom: 1px solid #eee;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span><strong>${index + 1}.</strong> ${client.name}</span>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <label>Durata:</label>
                  <input type="number" 
                         class="client-duration-input" 
                         data-client-code="${client.code || client.id}"
                         value="${defaultDuration}" 
                         min="1" 
                         style="width: 60px; padding: 5px;">
                  <span>min</span>
                </div>
              </div>
              <div style="font-size: 0.85em; color: #666; margin-top: 5px;">
                ${client.street || client.address || ''} - ${client.city || ''}
              </div>
            </div>
          `;
        });
      }
    }

    // Setup event listeners
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
      closeBtn.onclick = () => this.hideItineraryModal();
    }

    const confirmBtn = document.getElementById('confirmItinerary');
    if (confirmBtn) {
      confirmBtn.onclick = () => window.Worksheet.createItinerary();
      // Assicurati che il pulsante sia visibile
      confirmBtn.style.display = 'inline-block';
      console.log('Conferma button setup:', confirmBtn);
    } else {
      console.error('Pulsante Conferma non trovato!');
    }

    const cancelBtn = document.getElementById('cancelItinerary');
    if (cancelBtn) {
      cancelBtn.onclick = () => this.hideItineraryModal();
    }

    // Click outside modal to close - usa una funzione separata per evitare conflitti
    modal.onclick = (event) => {
      if (event.target === modal) {
        this.hideItineraryModal();
      }
    };
  },

  /**
   * Nascondi modal itinerario
   */
  hideItineraryModal: function() {
    const modal = document.getElementById('itineraryModal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  /**
   * Crea itinerario dai dati form
   */
  createItineraryData: function() {
    const date = document.getElementById('itineraryDate').value;
    const startTimeRaw = document.getElementById('itineraryStartTime').value;
    
    // Formatta l'orario di partenza per assicurarsi che sia HH:MM
    let startTime = startTimeRaw;
    if (startTimeRaw && startTimeRaw.includes(':')) {
      const [h, m] = startTimeRaw.split(':');
      startTime = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }
    
    const startingPoint = document.getElementById('startingPoint').value;
    const endingPoint = document.getElementById('endingPoint').value;

    // Get selected clients with individual durations
    const selectedClients = [];
    const allClients = window.WorksheetData.getClientsData();
    
    document.querySelectorAll('.client-checkbox:checked').forEach(checkbox => {
      const code = checkbox.dataset.code;
      const client = allClients.find(c => 
        String(c.code) === String(code) || 
        String(c.id) === String(code)
      );
      
      if (client) {
        // Trova il campo durata corrispondente
        const durationInput = document.querySelector(`.client-duration-input[data-client-code="${code}"]`);
        const duration = durationInput ? parseInt(durationInput.value) : 30;
        
        // Aggiungi la durata al cliente
        selectedClients.push({
          ...client,
          visitDuration: duration
        });
      }
    });
    
    // Calcola l'orario di fine includendo i tempi di viaggio
    let totalMinutes = 0;
    let previousLocation = startingPoint;
    let missingRoutes = [];
    
    // Calcola i tempi di viaggio tra i clienti
    selectedClients.forEach((client, index) => {
      // Tempo di viaggio dal punto precedente
      const travelData = window.Percorsi ? window.Percorsi.getTravelTime(previousLocation, client.name) : null;
      
      if (!travelData) {
        // Aggiungi alla lista dei percorsi mancanti
        missingRoutes.push({
          from: previousLocation,
          to: client.name
        });
      }
      
      const travelTime = travelData ? travelData.minuti : 15; // Default 15 min se non trovato
      
      // Aggiungi tempo di viaggio e tempo di visita
      totalMinutes += travelTime;
      totalMinutes += client.visitDuration;
      
      // Salva i dati di viaggio nel cliente
      client.travelTime = travelTime;
      client.travelKm = travelData ? travelData.km : 0;
      
      previousLocation = client.name;
    });
    
    // Aggiungi tempo di viaggio finale verso il punto di arrivo
    if (selectedClients.length > 0) {
      const lastClient = selectedClients[selectedClients.length - 1];
      const finalTravelData = window.Percorsi ? window.Percorsi.getTravelTime(lastClient.name, endingPoint) : null;
      
      if (!finalTravelData) {
        missingRoutes.push({
          from: lastClient.name,
          to: endingPoint
        });
      }
      
      const finalTravelTime = finalTravelData ? finalTravelData.minuti : 15;
      totalMinutes += finalTravelTime;
    }
    
    // Se ci sono percorsi mancanti, mostra avviso
    if (missingRoutes.length > 0) {
      let message = 'Impossibile completare l\'itinerario!\n\n';
      if (missingRoutes.length === 1) {
        message += `Percorso mancante:\n${missingRoutes[0].from} → ${missingRoutes[0].to}`;
      } else {
        message += 'Percorsi mancanti:\n';
        missingRoutes.forEach(route => {
          message += `${route.from} → ${route.to}\n`;
        });
      }
      message += '\n\nImporta i dati del percorso nella sezione "Importa Percorsi" e riprova.';
      
      // Mostra alert con stile appropriato
      if (window.WorksheetUI && window.WorksheetUI.showAlert) {
        window.WorksheetUI.showAlert(message, 'error');
      } else {
        alert(message);
      }
    }
    
    // Calcola l'orario di fine
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + totalMinutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    return {
      date,
      startTime,
      endTime,
      totalDuration: totalMinutes,
      startingPoint,
      endingPoint,
      selectedClients
    };
  },

  /**
   * Ottimizza ordine clienti
   */
  optimizeClientOrder: function(clients, optimizationType = 'time', startingPoint = null, endingPoint = null) {
    if (clients.length <= 2) return clients;
    
    // Copia array per non modificare l'originale
    const optimized = [...clients];
    
    // Recupera punti di partenza e arrivo se non forniti
    if (!startingPoint && window.Worksheet && window.Worksheet.state.itinerario) {
      startingPoint = window.Worksheet.state.itinerario.startingPoint;
    }
    if (!endingPoint && window.Worksheet && window.Worksheet.state.itinerario) {
      endingPoint = window.Worksheet.state.itinerario.endingPoint;
    }
    
    switch (optimizationType) {
      case 'time':
        // Ottimizza per tempo minimo di percorrenza
        return this.optimizeByTravelTime(optimized, startingPoint, endingPoint);
        
      case 'distance':
        // Ottimizza per distanza minima
        return this.optimizeByDistance(optimized, startingPoint, endingPoint);
        
      case 'priority':
        // Ottimizza per priorità clienti
        return this.optimizeByPriority(optimized);
        
      case 'zone':
        // Ottimizza per zona geografica
        return this.optimizeByZone(optimized);
        
      default:
        return optimized;
    }
  },
  
  /**
   * Ottimizza per tempo di viaggio minimo con algoritmo migliorato
   */
  optimizeByTravelTime: function(clients, startingPoint, endingPoint) {
    if (!window.Percorsi || clients.length <= 3) return clients;
    
    // Prova diverse combinazioni per trovare quella con tempo totale minimo
    let bestRoute = null;
    let bestTotalTime = Infinity;
    
    // Algoritmo 1: Nearest neighbor partendo dal punto di partenza
    const nn1 = this.nearestNeighborFromStart(clients, startingPoint, endingPoint, 'time');
    const time1 = this.calculateTotalTime(nn1.route, startingPoint, endingPoint);
    if (time1 < bestTotalTime) {
      bestTotalTime = time1;
      bestRoute = nn1.route;
    }
    
    // Algoritmo 2: Nearest neighbor partendo dal cliente più vicino al punto di partenza
    const nn2 = this.nearestNeighborOptimized(clients, startingPoint, endingPoint, 'time');
    const time2 = this.calculateTotalTime(nn2, startingPoint, endingPoint);
    if (time2 < bestTotalTime) {
      bestTotalTime = time2;
      bestRoute = nn2;
    }
    
    // Algoritmo 3: 2-opt improvement se abbiamo pochi clienti (max 10)
    if (clients.length <= 10) {
      const improved = this.twoOptImprovement(bestRoute, startingPoint, endingPoint, 'time');
      const time3 = this.calculateTotalTime(improved, startingPoint, endingPoint);
      if (time3 < bestTotalTime) {
        bestTotalTime = time3;
        bestRoute = improved;
      }
    }
    
    console.log(`Ottimizzazione tempo: ${bestTotalTime} minuti totali`);
    return bestRoute || clients;
  },
  
  /**
   * Nearest neighbor partendo dal punto di partenza
   */
  nearestNeighborFromStart: function(clients, startingPoint, endingPoint, metric = 'time') {
    const remaining = [...clients];
    const route = [];
    let current = startingPoint;
    
    while (remaining.length > 0) {
      let nearestIndex = 0;
      let minValue = Infinity;
      
      remaining.forEach((client, index) => {
        const travelData = window.Percorsi.getTravelTime(current, client.name);
        const value = metric === 'time' ? 
          (travelData ? travelData.minuti : 999) : 
          (travelData ? travelData.km : 999);
        
        if (value < minValue) {
          minValue = value;
          nearestIndex = index;
        }
      });
      
      const nearest = remaining.splice(nearestIndex, 1)[0];
      route.push(nearest);
      current = nearest.name;
    }
    
    return { route, totalValue: this.calculateTotal(route, startingPoint, endingPoint, metric) };
  },
  
  /**
   * Nearest neighbor ottimizzato - prova partendo da diversi clienti
   */
  nearestNeighborOptimized: function(clients, startingPoint, endingPoint, metric = 'time') {
    let bestRoute = null;
    let bestValue = Infinity;
    
    // Prova partendo da ogni cliente
    for (let i = 0; i < Math.min(clients.length, 5); i++) {
      const remaining = [...clients];
      const startClient = remaining.splice(i, 1)[0];
      const route = [startClient];
      let current = startClient.name;
      
      while (remaining.length > 0) {
        let nearestIndex = 0;
        let minValue = Infinity;
        
        remaining.forEach((client, index) => {
          const travelData = window.Percorsi.getTravelTime(current, client.name);
          const value = metric === 'time' ? 
            (travelData ? travelData.minuti : 999) : 
            (travelData ? travelData.km : 999);
          
          if (value < minValue) {
            minValue = value;
            nearestIndex = index;
          }
        });
        
        const nearest = remaining.splice(nearestIndex, 1)[0];
        route.push(nearest);
        current = nearest.name;
      }
      
      const totalValue = this.calculateTotal(route, startingPoint, endingPoint, metric);
      if (totalValue < bestValue) {
        bestValue = totalValue;
        bestRoute = route;
      }
    }
    
    return bestRoute || clients;
  },
  
  /**
   * 2-opt improvement algorithm
   */
  twoOptImprovement: function(route, startingPoint, endingPoint, metric = 'time') {
    const improved = [...route];
    let improvement = true;
    
    while (improvement) {
      improvement = false;
      
      for (let i = 0; i < improved.length - 1; i++) {
        for (let j = i + 1; j < improved.length; j++) {
          // Prova a invertire il segmento tra i e j
          const newRoute = [
            ...improved.slice(0, i),
            ...improved.slice(i, j + 1).reverse(),
            ...improved.slice(j + 1)
          ];
          
          const currentValue = this.calculateTotal(improved, startingPoint, endingPoint, metric);
          const newValue = this.calculateTotal(newRoute, startingPoint, endingPoint, metric);
          
          if (newValue < currentValue) {
            improved.splice(0, improved.length, ...newRoute);
            improvement = true;
            break;
          }
        }
        if (improvement) break;
      }
    }
    
    return improved;
  },
  
  /**
   * Calcola il tempo totale di un percorso
   */
  calculateTotalTime: function(route, startingPoint, endingPoint) {
    return this.calculateTotal(route, startingPoint, endingPoint, 'time');
  },
  
  /**
   * Calcola il totale (tempo o distanza) di un percorso
   */
  calculateTotal: function(route, startingPoint, endingPoint, metric = 'time') {
    if (!window.Percorsi || route.length === 0) return 0;
    
    let total = 0;
    let previous = startingPoint;
    
    // Calcola il percorso completo
    for (const client of route) {
      const travelData = window.Percorsi.getTravelTime(previous, client.name);
      const value = metric === 'time' ? 
        (travelData ? travelData.minuti : 15) : 
        (travelData ? travelData.km : 10);
      
      total += value;
      
      // Aggiungi il tempo di visita se stiamo calcolando il tempo
      if (metric === 'time') {
        total += client.visitDuration || 30;
      }
      
      previous = client.name;
    }
    
    // Aggiungi il viaggio finale al punto di arrivo
    if (endingPoint && previous !== endingPoint) {
      const finalTravelData = window.Percorsi.getTravelTime(previous, endingPoint);
      const finalValue = metric === 'time' ? 
        (finalTravelData ? finalTravelData.minuti : 15) : 
        (finalTravelData ? finalTravelData.km : 10);
      total += finalValue;
    }
    
    return total;
  },
  
  /**
   * Ottimizza per distanza minima con algoritmo migliorato
   */
  optimizeByDistance: function(clients, startingPoint, endingPoint) {
    if (!window.Percorsi || clients.length <= 3) return clients;
    
    // Prova diverse combinazioni per trovare quella con distanza totale minima
    let bestRoute = null;
    let bestTotalDistance = Infinity;
    
    // Algoritmo 1: Nearest neighbor partendo dal punto di partenza
    const nn1 = this.nearestNeighborFromStart(clients, startingPoint, endingPoint, 'distance');
    const distance1 = this.calculateTotal(nn1.route, startingPoint, endingPoint, 'distance');
    if (distance1 < bestTotalDistance) {
      bestTotalDistance = distance1;
      bestRoute = nn1.route;
    }
    
    // Algoritmo 2: Nearest neighbor partendo dal cliente più vicino al punto di partenza
    const nn2 = this.nearestNeighborOptimized(clients, startingPoint, endingPoint, 'distance');
    const distance2 = this.calculateTotal(nn2, startingPoint, endingPoint, 'distance');
    if (distance2 < bestTotalDistance) {
      bestTotalDistance = distance2;
      bestRoute = nn2;
    }
    
    // Algoritmo 3: 2-opt improvement se abbiamo pochi clienti (max 10)
    if (clients.length <= 10) {
      const improved = this.twoOptImprovement(bestRoute, startingPoint, endingPoint, 'distance');
      const distance3 = this.calculateTotal(improved, startingPoint, endingPoint, 'distance');
      if (distance3 < bestTotalDistance) {
        bestTotalDistance = distance3;
        bestRoute = improved;
      }
    }
    
    console.log(`Ottimizzazione distanza: ${bestTotalDistance} km totali`);
    return bestRoute || clients;
  },
  
  /**
   * Ottimizza per priorità clienti
   */
  optimizeByPriority: function(clients) {
    return clients.sort((a, b) => {
      // Prima ordina per priorità (più alta prima)
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }
      // Poi per zona
      if (a.zone !== b.zone) {
        return (a.zone || '').localeCompare(b.zone || '');
      }
      // Infine per città
      return (a.city || '').localeCompare(b.city || '');
    });
  },
  
  /**
   * Ottimizza per zona geografica
   */
  optimizeByZone: function(clients) {
    return clients.sort((a, b) => {
      // Prima ordina per zona
      if (a.zone !== b.zone) {
        return (a.zone || '').localeCompare(b.zone || '');
      }
      // Poi per città
      if (a.city !== b.city) {
        return (a.city || '').localeCompare(b.city || '');
      }
      // Infine per nome
      return (a.name || '').localeCompare(b.name || '');
    });
  },

  /**
   * Genera elenco visite da fare
   */
  generateVisitList: function(clients) {
    return clients.filter(c => c.toVisit || c.delay > 0);
  }
};

// Export globale
window.WorksheetItinerary = WorksheetItinerary;