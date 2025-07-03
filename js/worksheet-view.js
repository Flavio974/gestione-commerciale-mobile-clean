/**
 * Worksheet Module - View and Itinerary Functions
 * Gestione visualizzazione itinerari e ottimizzazione
 */

// Estende l'oggetto Worksheet con le funzioni di visualizzazione
Object.assign(Worksheet, {
  /**
   * Crea itinerario
   */
  createItinerary: function() {
    const itineraryData = WorksheetItinerary.createItineraryData();
    
    if (itineraryData.selectedClients.length === 0) {
      WorksheetUI.showAlert('Seleziona almeno un cliente per creare l\'itinerario', 'warning');
      return;
    }

    // Create itinerary
    const newItinerary = {
      id: Date.now(), // ID univoco basato sul timestamp
      date: itineraryData.date,
      startTime: itineraryData.startTime,
      endTime: itineraryData.endTime,
      totalDuration: itineraryData.totalDuration,
      startingPoint: itineraryData.startingPoint,
      endingPoint: itineraryData.endingPoint,
      clients: itineraryData.selectedClients,
      createdAt: new Date().toISOString(),
      optimizationType: 'manuale' // Tipo di ottimizzazione
    };
    
    // Salva come itinerario corrente
    this.state.itinerario = newItinerary;
    
    // Aggiungi all'array degli itinerari generati
    this.state.itinerariGenerati.push(newItinerary);

    WorksheetItinerary.hideItineraryModal();
    
    // Mostra riepilogo dettagliato con orari calcolati
    let summary = `ITINERARIO CREATO CON SUCCESSO!\n\n`;
    summary += `📅 Data: ${new Date(itineraryData.date).toLocaleDateString('it-IT')}\n`;
    summary += `⏰ Partenza: ${itineraryData.startTime} da ${itineraryData.startingPoint}\n`;
    summary += `🏁 Arrivo previsto: ${itineraryData.endTime} a ${itineraryData.endingPoint}\n`;
    summary += `⏱️ Durata totale: ${itineraryData.totalDuration} minuti\n\n`;
    summary += `📋 PROGRAMMA VISITE (${itineraryData.selectedClients.length} clienti):\n`;
    summary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    let currentTime = itineraryData.startTime;
    let previousLocation = itineraryData.startingPoint;
    
    itineraryData.selectedClients.forEach((client, index) => {
      // Calcola orario arrivo per questo cliente includendo il tempo di viaggio
      const [hours, mins] = currentTime.split(':').map(Number);
      const currentMinutes = hours * 60 + mins;
      
      // Aggiungi tempo di viaggio
      const travelTime = client.travelTime || 15;
      const arrivalMinutes = currentMinutes + travelTime;
      const arrivalHours = Math.floor(arrivalMinutes / 60);
      const arrivalMins = Math.round(arrivalMinutes % 60);
      const arrivalTime = `${arrivalHours.toString().padStart(2, '0')}:${arrivalMins.toString().padStart(2, '0')}`;
      
      if (travelTime > 0) {
        summary += `   🚗 Viaggio da ${previousLocation} a ${client.name}: ${travelTime} min${client.travelKm > 0 ? ` (${client.travelKm} km)` : ''}\n`;
      }
      
      summary += `${index + 1}. ${arrivalTime} - Visita a ${client.name} (durata: ${client.visitDuration} min)\n`;
      summary += `   📍 ${client.street || client.address || ''} - ${client.city || ''}\n`;
      if (client.phone) summary += `   📞 ${client.phone}\n`;
      
      // Calcola orario per il prossimo cliente (fine visita)
      const nextMinutes = arrivalMinutes + client.visitDuration;
      const nextHours = Math.floor(nextMinutes / 60);
      const nextMins = Math.round(nextMinutes % 60);
      currentTime = `${nextHours.toString().padStart(2, '0')}:${nextMins.toString().padStart(2, '0')}`;
      previousLocation = client.name;
      
      summary += `\n`;
    });
    
    summary += `\n💡 Suggerimento: Usa "Esporta Excel" per salvare l'itinerario completo.`;
    
    WorksheetUI.showAlert(summary, 'success');
    
    // Save to storage
    this.saveWorksheetToStorage();
    
    // Mostra la sezione itinerario
    this.showItineraryView();
  },
  
  /**
   * Mostra la vista dell'itinerario
   */
  showItineraryView: function() {
    // Mostra tutti gli itinerari generati
    if (this.state.itinerariGenerati.length === 0) {
      WorksheetUI.showAlert('Nessun itinerario generato', 'info');
      return;
    }
    
    const section = document.getElementById('itinerarySection');
    if (!section) return;
    
    // Mostra la sezione
    section.style.display = 'block';
    
    // Aggiorna il titolo per indicare che ci sono più itinerari
    const dateDisplay = document.getElementById('itineraryDateDisplay');
    if (dateDisplay) {
      dateDisplay.textContent = `${this.state.itinerariGenerati.length} itinerari generati`;
    }
    
    // Genera la timeline
    const timeline = document.getElementById('itineraryTimeline');
    if (timeline) {
      let html = '';
      
      // Prima mostra una tabella riassuntiva di tutti gli itinerari
      html += `
        <div style="margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="color: #333; margin: 0;">Riepilogo Itinerari Generati</h3>
            ${this.state.itinerariGenerati.length > 1 ? `
              <button onclick="Worksheet.clearAllItinerariesExceptSelected();" 
                      style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-trash-alt"></i> Cancella tutti tranne il selezionato
              </button>
            ` : ''}
          </div>
          <table style="width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">#</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Tipo</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Clienti</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Km Totali</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Tempo Viaggio</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Tempo Visite</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Tempo Totale</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Orario Fine</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;" colspan="2">Azioni</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      // Aggiungi una riga per ogni itinerario
      this.state.itinerariGenerati.forEach((itinerario, index) => {
        const stats = this.calculateItineraryStatsForItinerary(itinerario);
        const typeLabel = itinerario.optimizationType === 'manuale' ? '📝 Manuale' : 
                         itinerario.optimizationType === 'time' ? '⏱️ Tempo' :
                         itinerario.optimizationType === 'distance' ? '📏 Distanza' :
                         itinerario.optimizationType === 'priority' ? '⭐ Priorità' :
                         itinerario.optimizationType === 'zone' ? '🗺️ Zone' : itinerario.optimizationType;
        
        const isSelected = this.state.itinerario && this.state.itinerario.id === itinerario.id;
        const rowStyle = isSelected ? 'background: #e7f3ff;' : '';
        
        html += `
          <tr style="${rowStyle} border-bottom: 1px solid #dee2e6;">
            <td style="padding: 12px; font-weight: bold;">${index + 1}</td>
            <td style="padding: 12px;">${typeLabel}</td>
            <td style="padding: 12px; text-align: center;">${stats.clientCount}</td>
            <td style="padding: 12px; text-align: center; font-weight: bold; color: #1976d2;">${stats.totalKm.toFixed(1)} km</td>
            <td style="padding: 12px; text-align: center; color: #388e3c;">${this.formatMinutes(stats.totalTravelTime)}</td>
            <td style="padding: 12px; text-align: center; color: #f57c00;">${this.formatMinutes(stats.totalVisitTime)}</td>
            <td style="padding: 12px; text-align: center; font-weight: bold; color: #7b1fa2;">${this.formatMinutes(stats.totalTime)}</td>
            <td style="padding: 12px; text-align: center;">${itinerario.endTime}</td>
            <td style="padding: 12px; text-align: center;">
              <button onclick="Worksheet.selectItinerary(${index});" 
                      style="padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                Seleziona
              </button>
              <button onclick="Worksheet.deleteItinerary(${index});" 
                      style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;"
                      ${this.state.itinerariGenerati.length === 1 ? 'disabled title="Non puoi cancellare l\'unico itinerario"' : ''}>
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
        </div>
      `;
      
      // Mostra solo l'itinerario corrente selezionato
      if (this.state.itinerario) {
        const currentIndex = this.state.itinerariGenerati.findIndex(it => it.id === this.state.itinerario.id);
        const itinerario = this.state.itinerario;
        // Calcola statistiche per questo itinerario
        const stats = this.calculateItineraryStatsForItinerary(itinerario);
        
        // Intestazione itinerario
        html += `
          <div style="margin-bottom: 30px; border: 2px solid #007bff; border-radius: 8px; padding: 15px; background: #f0f8ff;">
            <h3 style="margin: 0 0 10px 0; color: #007bff;">
              Itinerario Selezionato: ${currentIndex + 1} - ${itinerario.optimizationType === 'manuale' ? 'Manuale' : 'Ottimizzato per ' + itinerario.optimizationType}
            </h3>
            <div style="font-size: 12px; color: #666; margin-bottom: 15px;">
              Creato: ${new Date(itinerario.createdAt).toLocaleString('it-IT')}
            </div>
        `;
        
        // Statistiche per questo itinerario
        html += `
          <div class="itinerary-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 15px;">
            <div style="background: #e3f2fd; padding: 10px; border-radius: 6px; text-align: center;">
              <div style="font-size: 18px; font-weight: bold; color: #1976d2;">${stats.totalKm.toFixed(1)} km</div>
              <div style="font-size: 12px; color: #666;">Distanza</div>
            </div>
            <div style="background: #e8f5e9; padding: 10px; border-radius: 6px; text-align: center;">
              <div style="font-size: 18px; font-weight: bold; color: #388e3c;">${this.formatMinutes(stats.totalTravelTime)}</div>
              <div style="font-size: 12px; color: #666;">Viaggio</div>
            </div>
            <div style="background: #fff3e0; padding: 10px; border-radius: 6px; text-align: center;">
              <div style="font-size: 18px; font-weight: bold; color: #f57c00;">${this.formatMinutes(stats.totalVisitTime)}</div>
              <div style="font-size: 12px; color: #666;">Visite</div>
            </div>
            <div style="background: #f3e5f5; padding: 10px; border-radius: 6px; text-align: center;">
              <div style="font-size: 18px; font-weight: bold; color: #7b1fa2;">${this.formatMinutes(stats.totalTime)}</div>
              <div style="font-size: 12px; color: #666;">Totale</div>
            </div>
          </div>
        `;
      
        html += '<div class="itinerary-timeline" style="background: #f8f9fa; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 14px; line-height: 1.8;">';
        
        // Punto di partenza
        html += `
          <div style="margin-bottom: 20px;">
            <div style="font-weight: bold; color: #333; margin-bottom: 5px;">${this.formatTime(itinerario.startTime)}</div>
            <div style="margin-left: 20px;">🚗 PARTENZA da ${itinerario.startingPoint}</div>
          </div>
        `;
        
        // Clienti con orari calcolati includendo i tempi di viaggio
        let currentTime = itinerario.startTime;
        let previousLocation = itinerario.startingPoint;
        
        itinerario.clients.forEach((client, index) => {
        const [hours, mins] = currentTime.split(':').map(Number);
        const currentMinutes = hours * 60 + mins;
        
        // Calcola tempo di viaggio dal punto precedente
        const travelTime = client.travelTime || 15;
        const travelKm = client.travelKm || 0;
        
        // Orario di arrivo al cliente (dopo il viaggio)
        const arrivalMinutes = currentMinutes + travelTime;
        const arrivalHours = Math.floor(arrivalMinutes / 60);
        const arrivalMins = Math.round(arrivalMinutes % 60);
        
        // Formatta sempre con due cifre
        const hoursStr = arrivalHours.toString().padStart(2, '0');
        const minsStr = arrivalMins.toString().padStart(2, '0');
        const arrivalTime = `${hoursStr}:${minsStr}`;
        
        // Mostra tempo di viaggio
        if (travelTime > 0) {
          html += `<div style="margin-left: 20px; color: #666; margin-bottom: 15px;">🚗 Viaggio da ${previousLocation} a ${client.name}: ${travelTime} min${travelKm > 0 ? ` (${travelKm} km)` : ''}</div>`;
        }
        
        // Visita cliente
        html += `
          <div style="margin-bottom: 20px;">
            <div style="font-weight: bold; color: #333; margin-bottom: 5px;">${this.formatTime(arrivalTime)}</div>
            <div style="margin-left: 20px;">
              <div>${index + 1}. Visita a ${client.name} (durata: ${client.visitDuration} min)</div>
              <div style="margin-left: 20px; color: #666;">📍 ${client.street || client.address || '-'}</div>
            </div>
          </div>
        `;
        
        // Calcola orario per il prossimo cliente (fine visita)
        const nextMinutes = arrivalMinutes + client.visitDuration;
        const nextHours = Math.floor(nextMinutes / 60);
        const nextMins = Math.round(nextMinutes % 60);
        currentTime = `${nextHours.toString().padStart(2, '0')}:${nextMins.toString().padStart(2, '0')}`;
        previousLocation = client.name;
      });
      
        // Tempo di viaggio finale verso il punto di arrivo
        if (itinerario.clients.length > 0) {
          const lastClient = itinerario.clients[itinerario.clients.length - 1];
          const finalTravelData = window.Percorsi ? window.Percorsi.getTravelTime(lastClient.name, itinerario.endingPoint) : null;
          const finalTravelTime = finalTravelData ? finalTravelData.minuti : 15;
          const finalTravelKm = finalTravelData ? finalTravelData.km : 0;
          
          if (finalTravelTime > 0) {
            html += `<div style="margin-left: 20px; color: #666; margin-bottom: 15px;">🚗 Viaggio da ${lastClient.name} a ${itinerario.endingPoint}: ${finalTravelTime} min${finalTravelKm > 0 ? ` (${finalTravelKm} km)` : ''}</div>`;
          }
        }
        
        // Punto di arrivo
        html += `
          <div>
            <div style="font-weight: bold; color: #333;">${this.formatTime(currentTime)}</div>
            <div style="margin-left: 20px;">🏁 ARRIVO a ${itinerario.endingPoint}</div>
          </div>
        `;
        
        html += '</div>'; // Chiude itinerary-timeline
        html += '</div>'; // Chiude il contenitore dell'itinerario
      } // Fine if itinerario corrente
      
      timeline.innerHTML = html;
    }
    
    // Setup pulsanti
    const editBtn = document.getElementById('editItinerary');
    if (editBtn) {
      editBtn.onclick = () => this.enableItineraryEdit();
    }
    
    const printBtn = document.getElementById('printItinerary');
    if (printBtn) {
      printBtn.onclick = () => this.printItinerary();
    }
    
    const closeBtn = document.getElementById('closeItinerary');
    if (closeBtn) {
      closeBtn.onclick = () => this.hideItineraryView();
    }
  },
  
  
  /**
   * Aggiorna orari itinerario
   */
  updateItineraryTimes: function(startIndex, newTime) {
    // Aggiorna l'orario di partenza per il cliente specificato
    this.state.itinerario.startTime = newTime; // Temporaneo, da sistemare
    
    // Ricalcola e aggiorna la vista
    this.showItineraryView();
    this.saveWorksheetToStorage();
  },
  
  /**
   * Nascondi vista itinerario
   */
  hideItineraryView: function() {
    const section = document.getElementById('itinerarySection');
    if (section) {
      section.style.display = 'none';
    }
  },
  
  /**
   * Stampa itinerario
   */
  printItinerary: function() {
    window.print();
  },

  /**
   * Ottimizza itinerario
   */
  optimizeItinerary: function() {
    // Verifica che esista un itinerario
    if (!this.state.itinerario) {
      WorksheetUI.showAlert('Prima crea un itinerario da ottimizzare', 'warning');
      return;
    }
    
    // Mostra dialog per scegliere il tipo di ottimizzazione
    const optimizationType = this.showOptimizationDialog();
    if (!optimizationType) return;
    
    // Ottimizza l'ordine dei clienti
    const optimizedClients = WorksheetItinerary.optimizeClientOrder(
      [...this.state.itinerario.clients], 
      optimizationType,
      this.state.itinerario.startingPoint,
      this.state.itinerario.endingPoint
    );
    
    // Ricalcola i tempi di viaggio per il nuovo ordine
    let previousLocation = this.state.itinerario.startingPoint;
    optimizedClients.forEach(client => {
      const travelData = window.Percorsi ? window.Percorsi.getTravelTime(previousLocation, client.name) : null;
      client.travelTime = travelData ? travelData.minuti : 15;
      client.travelKm = travelData ? travelData.km : 0;
      previousLocation = client.name;
    });
    
    // Crea un nuovo itinerario ottimizzato
    const optimizedItinerary = {
      id: Date.now(),
      date: this.state.itinerario.date,
      startTime: this.state.itinerario.startTime,
      startingPoint: this.state.itinerario.startingPoint,
      endingPoint: this.state.itinerario.endingPoint,
      clients: optimizedClients,
      createdAt: new Date().toISOString(),
      optimizationType: optimizationType
    };
    
    // Calcola il tempo totale per il nuovo itinerario
    const stats = this.calculateItineraryStatsForItinerary(optimizedItinerary);
    optimizedItinerary.totalDuration = stats.totalTime;
    
    // Calcola nuovo orario di fine
    const [hours, minutes] = optimizedItinerary.startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + stats.totalTime;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    optimizedItinerary.endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    
    // Aggiungi all'array degli itinerari generati
    this.state.itinerariGenerati.push(optimizedItinerary);
    
    // Aggiorna l'itinerario corrente
    this.state.itinerario = optimizedItinerary;
    
    // Salva le modifiche
    this.saveWorksheetToStorage();
    
    // Aggiorna la visualizzazione
    this.showItineraryView();
    
    let message = '';
    switch(optimizationType) {
      case 'time':
        message = `✅ Nuovo itinerario ottimizzato per tempo: ${this.formatMinutes(stats.totalTravelTime)} di viaggio, ${stats.totalKm.toFixed(1)} km totali`;
        break;
      case 'distance':
        message = `✅ Nuovo itinerario ottimizzato per distanza: ${stats.totalKm.toFixed(1)} km totali, ${this.formatMinutes(stats.totalTravelTime)} di viaggio`;
        break;
      case 'priority':
        message = '✅ Nuovo itinerario ottimizzato per priorità clienti';
        break;
      case 'zone':
        message = '✅ Nuovo itinerario ottimizzato per zone geografiche';
        break;
    }
    
    WorksheetUI.showAlert(message, 'success');
  },
  
  /**
   * Mostra dialog per selezione tipo ottimizzazione
   */
  showOptimizationDialog: function() {
    const types = [
      { value: 'time', label: '⏱️ Tempo minimo di percorrenza' },
      { value: 'distance', label: '📏 Distanza minima' },
      { value: 'priority', label: '⭐ Priorità clienti' },
      { value: 'zone', label: '🗺️ Zone geografiche' }
    ];
    
    let html = 'Seleziona il tipo di ottimizzazione:\n\n';
    types.forEach((type, index) => {
      html += `${index + 1}. ${type.label}\n`;
    });
    
    const choice = prompt(html + '\nInserisci il numero (1-4):');
    if (!choice || choice < 1 || choice > 4) return null;
    
    return types[parseInt(choice) - 1].value;
  },
  
  /**
   * Ottimizza itinerario direttamente
   */
  optimizeItineraryDirect: function(type) {
    // Verifica che esista un itinerario
    if (!this.state.itinerario) {
      WorksheetUI.showAlert('Prima crea un itinerario da ottimizzare', 'warning');
      return;
    }
    
    // Salva l'ordine originale per eventuale ripristino
    const originalClients = [...this.state.itinerario.clients];
    
    // Ottimizza l'ordine dei clienti
    const optimizedClients = WorksheetItinerary.optimizeClientOrder(
      [...this.state.itinerario.clients], 
      type
    );
    
    // Ricalcola i tempi di viaggio per il nuovo ordine
    let previousLocation = this.state.itinerario.startingPoint;
    optimizedClients.forEach(client => {
      const travelData = window.Percorsi ? window.Percorsi.getTravelTime(previousLocation, client.name) : null;
      client.travelTime = travelData ? travelData.minuti : 15;
      client.travelKm = travelData ? travelData.km : 0;
      previousLocation = client.name;
    });
    
    // Crea un nuovo itinerario ottimizzato
    const optimizedItinerary = {
      id: Date.now(),
      date: this.state.itinerario.date,
      startTime: this.state.itinerario.startTime,
      startingPoint: this.state.itinerario.startingPoint,
      endingPoint: this.state.itinerario.endingPoint,
      clients: optimizedClients,
      createdAt: new Date().toISOString(),
      optimizationType: type
    };
    
    // Calcola il tempo totale per il nuovo itinerario
    const stats = this.calculateItineraryStatsForItinerary(optimizedItinerary);
    optimizedItinerary.totalDuration = stats.totalTime;
    
    // Calcola nuovo orario di fine
    const [hours, minutes] = optimizedItinerary.startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + stats.totalTime;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    optimizedItinerary.endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    
    // Aggiungi all'array degli itinerari generati
    this.state.itinerariGenerati.push(optimizedItinerary);
    
    // Aggiorna l'itinerario corrente
    this.state.itinerario = optimizedItinerary;
    
    // Salva le modifiche
    this.saveWorksheetToStorage();
    
    // Aggiorna la visualizzazione
    this.showItineraryView();
    
    let message = '';
    switch(type) {
      case 'time':
        message = `✅ Nuovo itinerario ottimizzato per tempo: ${this.formatMinutes(stats.totalTravelTime)} di viaggio, ${stats.totalKm.toFixed(1)} km totali`;
        break;
      case 'distance':
        message = `✅ Nuovo itinerario ottimizzato per distanza: ${stats.totalKm.toFixed(1)} km totali, ${this.formatMinutes(stats.totalTravelTime)} di viaggio`;
        break;
      case 'priority':
        message = '✅ Nuovo itinerario ottimizzato per priorità clienti';
        break;
      case 'zone':
        message = '✅ Nuovo itinerario ottimizzato per zone geografiche';
        break;
    }
    
    WorksheetUI.showAlert(message, 'success');
  },

  /**
   * Seleziona un itinerario da visualizzare
   */
  selectItinerary: function(index) {
    if (index >= 0 && index < this.state.itinerariGenerati.length) {
      this.state.itinerario = this.state.itinerariGenerati[index];
      this.saveWorksheetToStorage();
      this.showItineraryView();
      
      WorksheetUI.showAlert(`Itinerario ${index + 1} selezionato`, 'success');
    }
  },

  /**
   * Cancella un itinerario
   */
  deleteItinerary: function(index) {
    if (index < 0 || index >= this.state.itinerariGenerati.length) return;
    
    // Non permettere di cancellare l'ultimo itinerario
    if (this.state.itinerariGenerati.length === 1) {
      WorksheetUI.showAlert('Non puoi cancellare l\'unico itinerario rimasto', 'warning');
      return;
    }
    
    const itinerarioToDelete = this.state.itinerariGenerati[index];
    const isCurrentlySelected = this.state.itinerario && this.state.itinerario.id === itinerarioToDelete.id;
    
    if (confirm(`Sei sicuro di voler cancellare l'Itinerario ${index + 1}?`)) {
      // Rimuovi l'itinerario dall'array
      this.state.itinerariGenerati.splice(index, 1);
      
      // Se era quello selezionato, seleziona il primo disponibile
      if (isCurrentlySelected && this.state.itinerariGenerati.length > 0) {
        this.state.itinerario = this.state.itinerariGenerati[0];
      }
      
      // Salva e aggiorna la vista
      this.saveWorksheetToStorage();
      this.showItineraryView();
      
      WorksheetUI.showAlert(`Itinerario ${index + 1} cancellato`, 'success');
    }
  },

  /**
   * Cancella tutti gli itinerari tranne quello selezionato
   */
  clearAllItinerariesExceptSelected: function() {
    if (!this.state.itinerario) {
      WorksheetUI.showAlert('Nessun itinerario selezionato', 'warning');
      return;
    }
    
    const selectedId = this.state.itinerario.id;
    const toDelete = this.state.itinerariGenerati.filter(it => it.id !== selectedId).length;
    
    if (toDelete === 0) {
      WorksheetUI.showAlert('Non ci sono altri itinerari da cancellare', 'info');
      return;
    }
    
    if (confirm(`Sei sicuro di voler cancellare ${toDelete} itinerari? Verrà mantenuto solo quello selezionato.`)) {
      // Filtra solo l'itinerario selezionato
      this.state.itinerariGenerati = this.state.itinerariGenerati.filter(it => it.id === selectedId);
      
      // Salva e aggiorna
      this.saveWorksheetToStorage();
      this.showItineraryView();
      
      WorksheetUI.showAlert(`Cancellati ${toDelete} itinerari. Mantenuto solo quello selezionato.`, 'success');
    }
  },

  /**
   * Calcola statistiche itinerario
   */
  calculateItineraryStats: function() {
    if (!this.state.itinerario) return null;
    return this.calculateItineraryStatsForItinerary(this.state.itinerario);
  },
  
  /**
   * Calcola statistiche per un itinerario specifico
   */
  calculateItineraryStatsForItinerary: function(itinerario) {
    if (!itinerario) return null;
    
    let totalKm = 0;
    let totalTravelTime = 0;
    let totalVisitTime = 0;
    
    // Calcola statistiche per ogni cliente
    itinerario.clients.forEach(client => {
      totalKm += client.travelKm || 0;
      totalTravelTime += client.travelTime || 0;
      totalVisitTime += client.visitDuration || 0;
    });
    
    // Aggiungi il viaggio finale se presente
    if (itinerario.clients.length > 0) {
      const lastClient = itinerario.clients[itinerario.clients.length - 1];
      const finalTravelData = window.Percorsi ? window.Percorsi.getTravelTime(lastClient.name, itinerario.endingPoint) : null;
      if (finalTravelData) {
        totalKm += finalTravelData.km || 0;
        totalTravelTime += finalTravelData.minuti || 0;
      }
    }
    
    return {
      totalKm,
      totalTravelTime,
      totalVisitTime,
      totalTime: totalTravelTime + totalVisitTime,
      clientCount: itinerario.clients.length
    };
  }
});