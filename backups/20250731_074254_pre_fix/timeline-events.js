/**
 * Timeline Events Management
 * Gestione eventi della timeline
 */

const TimelineEvents = {
  /**
   * Carica eventi salvati
   */
  loadEvents: function(state) {
    try {
      const saved = localStorage.getItem('timeline_events');
      if (saved) {
        const data = JSON.parse(saved);
        state.events = data.events || [];
        state.eventsByDate = data.eventsByDate || {};
        state.realEventsByDate = data.realEventsByDate || {};
        state.recalculatedEventsByDate = data.recalculatedEventsByDate || {};
      }
    } catch (e) {
      console.error('Errore caricamento eventi:', e);
    }
  },

  /**
   * Salva eventi
   */
  saveEvents: function(state) {
    try {
      const data = {
        events: state.events,
        eventsByDate: state.eventsByDate,
        realEventsByDate: state.realEventsByDate,
        recalculatedEventsByDate: state.recalculatedEventsByDate
      };
      localStorage.setItem('timeline_events', JSON.stringify(data));
    } catch (e) {
      console.error('Errore salvataggio eventi:', e);
    }
  },

  /**
   * Aggiunge nuovo evento
   */
  addEvent: function(state, config) {
    const dateInput = document.getElementById('eventDate');
    const startInput = document.getElementById('startTime');
    const endInput = document.getElementById('endTime');
    const descrInput = document.getElementById('descr');
    const categoryInput = document.getElementById('category');
    
    // Se la data è vuota, usa la data corrente della timeline
    if (!dateInput.value) {
      // Usa formato locale per evitare problemi di timezone
      const year = state.currentDate.getFullYear();
      const month = (state.currentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = state.currentDate.getDate().toString().padStart(2, '0');
      dateInput.value = `${year}-${month}-${day}`;
    }
    
    // Se l'ora di inizio è vuota, usa l'ora corrente arrotondata
    if (!startInput.value) {
      const now = new Date();
      const hours = now.getHours();
      const minutes = Math.ceil(now.getMinutes() / 15) * 15; // Arrotonda ai 15 minuti
      if (minutes === 60) {
        startInput.value = `${(hours + 1).toString().padStart(2, '0')}:00`;
      } else {
        startInput.value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    
    // Se l'ora di fine è vuota, usa inizio + 1 ora
    if (!endInput.value && startInput.value) {
      const [h, m] = startInput.value.split(':').map(Number);
      const endHour = h + 1;
      endInput.value = `${endHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    
    if (!descrInput.value) {
      Utils.notify('Inserisci una descrizione per l\'evento', 'error');
      descrInput.focus();
      return;
    }
    
    const event = {
      id: Utils.generateId(),
      date: dateInput.value,
      start: startInput.value,
      end: endInput.value,
      desc: descrInput.value,
      category: categoryInput.value,
      type: 'planned'
    };
    
    // Aggiungi a array generale
    state.events.push(event);
    
    // Aggiungi a eventsByDate
    if (!state.eventsByDate[event.date]) {
      state.eventsByDate[event.date] = [];
    }
    state.eventsByDate[event.date].push(event);
    
    // Reset form
    descrInput.value = '';
    
    // Nascondi il form dopo l'inserimento
    const formContainer = document.getElementById('taskFormContainer');
    if (formContainer) {
      formContainer.style.display = 'none';
    }
    
    // Salva e aggiorna
    this.saveEvents(state);
    
    // Aggiorna vista sempre dopo l'aggiunta
    Timeline.refreshUI();
    
    Utils.notify('Evento aggiunto con successo', 'success');
  },

  /**
   * Elimina evento
   */
  deleteEvent: function(id, state) {
    if (!confirm('Eliminare questo evento?')) return;
    
    // Rimuovi da array generale
    state.events = state.events.filter(e => e.id !== id);
    
    // Rimuovi da eventsByDate
    Object.keys(state.eventsByDate).forEach(date => {
      state.eventsByDate[date] = state.eventsByDate[date].filter(e => e.id !== id);
    });
    
    // Rimuovi da realEventsByDate (cerca per plannedEventId)
    Object.keys(state.realEventsByDate).forEach(date => {
      state.realEventsByDate[date] = state.realEventsByDate[date].filter(e => e.plannedEventId !== id);
    });
    
    // Rimuovi da recalculatedEventsByDate (cerca eventi che iniziano con l'id)
    Object.keys(state.recalculatedEventsByDate).forEach(date => {
      state.recalculatedEventsByDate[date] = state.recalculatedEventsByDate[date].filter(e => 
        !e.id.startsWith(id) // Rimuovi eventi con id che inizia con l'id dell'evento cancellato
      );
    });
    
    this.saveEvents(state);
    Timeline.refreshUI();
    Utils.notify('Evento eliminato', 'info');
  },

  /**
   * Cancella tutti gli eventi
   */
  clearEvents: function(state) {
    if (!confirm('Cancellare TUTTI gli eventi?')) return;
    
    state.events = [];
    state.eventsByDate = {};
    state.realEventsByDate = {};
    state.recalculatedEventsByDate = {};
    
    this.saveEvents(state);
    Timeline.refreshUI();
    Utils.notify('Tutti gli eventi sono stati cancellati', 'warning');
  },

  /**
   * Aggiorna tempo reale evento
   */
  updateRealTime: function(e, state) {
    const row = e.target.closest('tr');
    if (!row) {
      return;
    }
    
    const eventId = row.getAttribute('data-event-id');
    const eventDate = row.getAttribute('data-event-date');
    const eventDesc = row.getAttribute('data-event-desc');
    const eventCategory = row.getAttribute('data-event-category');
    
    let realStart = row.querySelector('.real-start').value;
    const realEnd = row.querySelector('.real-end').value;
    
    // Se manca l'orario di inizio ma c'è quello di fine, usa l'orario pianificato
    if (!realStart && realEnd) {
      const plannedStart = row.querySelector('td:nth-child(2)').textContent;
      if (plannedStart) {
        realStart = plannedStart;
        row.querySelector('.real-start').value = plannedStart;
      }
    }
    
    // Salva i valori correnti prima del refresh
    const currentValues = {};
    document.querySelectorAll('input[type="time"]').forEach(input => {
      if (input.value) {
        currentValues[input.id] = input.value;
      }
    });
    
    if (!realStart && !realEnd) {
      // Rimuovi evento reale se ENTRAMBI i campi sono vuoti
      if (state.realEventsByDate[eventDate]) {
        state.realEventsByDate[eventDate] = state.realEventsByDate[eventDate]
          .filter(e => e.plannedEventId !== eventId);
        
        // Se non ci sono più eventi reali per questa data, rimuovi la data
        if (state.realEventsByDate[eventDate].length === 0) {
          delete state.realEventsByDate[eventDate];
        }
      }
      
      // Ricalcola eventi (rimuoverà anche i ricalcolati se non ci sono più eventi reali)
      this.calculateRecalculatedEvents(state);
      this.saveEvents(state);
      Timeline.drawTimeline();
      
      // Pulisci le celle durata reale e differenza
      const durationCell = row.querySelector('td:nth-child(8)');
      const diffCell = row.querySelector('td:nth-child(9)');
      if (durationCell) durationCell.textContent = '';
      if (diffCell) {
        diffCell.textContent = '';
        diffCell.className = '';
      }
      
      Utils.notify('Orari reali cancellati', 'info');
      return;
    } else if (realEnd) {
      // Crea o aggiorna evento reale
      const realEvent = {
        id: `${eventId}_real`,
        date: eventDate,
        start: realStart,
        end: realEnd,
        desc: eventDesc,
        category: eventCategory,
        type: 'real',
        plannedEventId: eventId
      };
      
      if (!state.realEventsByDate[eventDate]) {
        state.realEventsByDate[eventDate] = [];
      }
      
      // Rimuovi evento reale esistente
      state.realEventsByDate[eventDate] = state.realEventsByDate[eventDate]
        .filter(e => e.plannedEventId !== eventId);
      
      // Aggiungi nuovo evento reale
      state.realEventsByDate[eventDate].push(realEvent);
    }
    
    // Ricalcola eventi successivi
    this.calculateRecalculatedEvents(state);
    
    // Salva e aggiorna
    this.saveEvents(state);
    
    // Aggiorna solo il canvas, non la tabella
    Timeline.drawTimeline();
    
    // Aggiorna solo la riga corrente invece di tutta la tabella
    if (realEnd) {
      
      const plannedStartCell = row.querySelector('td:nth-child(2)');
      const plannedEndCell = row.querySelector('td:nth-child(3)');
      
      
      const plannedStart = TimelineUtils.timeToMinutes(plannedStartCell.textContent);
      const plannedEnd = TimelineUtils.timeToMinutes(plannedEndCell.textContent);
      const plannedDuration = plannedEnd - plannedStart;
      
      
      const realStartMin = TimelineUtils.timeToMinutes(realStart);
      const realEndMin = TimelineUtils.timeToMinutes(realEnd);
      const realDuration = realEndMin - realStartMin;
      
      // Calcola la differenza considerando sia l'anticipo/ritardo di inizio che di fine
      const startDifference = realStartMin - plannedStart;
      const endDifference = realEndMin - plannedEnd;
      
      // La differenza totale è quella che ha maggiore impatto
      let difference;
      if (startDifference >= 0 && endDifference >= 0) {
        difference = Math.max(startDifference, endDifference);
      } else if (startDifference <= 0 && endDifference <= 0) {
        difference = Math.min(startDifference, endDifference);
      } else {
        // Se uno è anticipo e l'altro ritardo, mostra la differenza di durata
        difference = realDuration - plannedDuration;
      }
      
      // Aggiorna solo le celle necessarie
      
      const durationCell = row.querySelector('td:nth-child(8)');
      const diffCell = row.querySelector('td:nth-child(9)');
      
      
      if (durationCell) {
        durationCell.textContent = `${Math.floor(realDuration/60)}h ${(realDuration%60).toString().padStart(2, '0')}m`;
      }
      
      if (diffCell) {
        diffCell.textContent = difference > 0 ? `+${difference}m` : `${difference}m`;
        diffCell.className = difference > 0 ? 'text-danger' : 'text-success';
      }
      
      // Notifica successo
      Utils.notify('Orari reali aggiornati', 'success');
    }
  },

  /**
   * Calcola eventi ricalcolati
   */
  calculateRecalculatedEvents: function(state) {
    state.recalculatedEventsByDate = {};
    
    Object.keys(state.realEventsByDate).forEach(date => {
      const plannedEvents = state.eventsByDate[date] || [];
      const realEvents = state.realEventsByDate[date] || [];
      
      realEvents.forEach((realEvent, idx) => {
        const plannedEvent = this.findPlannedEvent(realEvent.desc, date, state);
        if (!plannedEvent) return;
        
        const plannedStart = TimelineUtils.timeToMinutes(plannedEvent.start);
        const plannedEnd = TimelineUtils.timeToMinutes(plannedEvent.end);
        const realStart = TimelineUtils.timeToMinutes(realEvent.start);
        const realEnd = TimelineUtils.timeToMinutes(realEvent.end);
        
        // Calcola il ritardo considerando sia inizio che fine
        // Se l'evento inizia in ritardo, quello è il ritardo principale
        const startDelay = realStart - plannedStart;
        // Ma se finisce ancora più tardi del previsto, usa quella differenza
        const endDelay = realEnd - plannedEnd;
        
        // Per gestire sia ritardi che anticipi, usa il valore che ha maggiore impatto
        // Se entrambi sono positivi (ritardo) o negativi (anticipo), prendi il maggiore in valore assoluto
        let delay;
        if (startDelay >= 0 && endDelay >= 0) {
          // Entrambi ritardi: usa il maggiore
          delay = Math.max(startDelay, endDelay);
        } else if (startDelay <= 0 && endDelay <= 0) {
          // Entrambi anticipi: usa il maggiore in valore assoluto (più negativo)
          delay = Math.min(startDelay, endDelay);
        } else {
          // Uno anticipo e uno ritardo: usa quello di fine per coerenza
          delay = endDelay;
        }
        
        if (delay !== 0) {
          const subsequentEvents = plannedEvents.filter(e => {
            const eStart = TimelineUtils.timeToMinutes(e.start);
            return eStart >= plannedEnd && e.id !== plannedEvent.id;
          });
          
          subsequentEvents.sort((a, b) => 
            TimelineUtils.timeToMinutes(a.start) - TimelineUtils.timeToMinutes(b.start)
          );
          
          subsequentEvents.forEach(subEvent => {
            const newStart = TimelineUtils.addMinutesToTime(subEvent.start, delay);
            const newEnd = TimelineUtils.addMinutesToTime(subEvent.end, delay);
            
            const recalcEvent = {
              ...subEvent,
              id: `${subEvent.id}_recalc`,
              start: newStart,
              end: newEnd,
              desc: subEvent.desc + " (ricalcolato)",
              type: 'recalculated',
              originalStart: subEvent.start,
              delay: delay
            };
            
            if (!state.recalculatedEventsByDate[date]) {
              state.recalculatedEventsByDate[date] = [];
            }
            state.recalculatedEventsByDate[date].push(recalcEvent);
          });
        }
      });
    });
  },

  /**
   * Trova evento pianificato
   */
  findPlannedEvent: function(desc, date, state) {
    if (!state.eventsByDate[date]) return null;
    return state.eventsByDate[date].find(e => e.desc === desc.replace(" (ricalcolato)", ""));
  },

  /**
   * Aggiunge eventi predefiniti demo
   */
  addPredefinedEvents: function(state) {
    const dataEventi = "2025-05-07";
    
    // Reset eventi
    state.events = [];
    state.eventsByDate = {};
    state.realEventsByDate = {};
    state.recalculatedEventsByDate = {};
    
    // Imposta data
    state.currentDate = new Date(dataEventi);
    state.currentDate.setHours(12, 0, 0, 0);
    
    // Eventi demo
    const eventiPredefiniti = [
      {
        id: Utils.generateId(),
        date: dataEventi,
        start: "07:00",
        end: "08:00",
        desc: "VIAGGIO DA CONTEA A ALFIERI",
        category: "Viaggio",
        type: "planned"
      },
      {
        id: Utils.generateId(),
        date: dataEventi,
        start: "08:00",
        end: "08:20",
        desc: "ALFIERI",
        category: "Lavoro",
        type: "planned"
      },
      {
        id: Utils.generateId(),
        date: dataEventi,
        start: "08:20",
        end: "09:00",
        desc: "VIAGGIO DA ALFIERI A LA NATURA",
        category: "Viaggio",
        type: "planned"
      },
      {
        id: Utils.generateId(),
        date: dataEventi,
        start: "09:00",
        end: "11:00",
        desc: "APPUNTAMENTO CON FRANCESCO FERRARINI",
        category: "Lavoro",
        type: "planned"
      },
      {
        id: Utils.generateId(),
        date: dataEventi,
        start: "14:00",
        end: "15:00",
        desc: "EVENTO DI TEST ALTRO",
        category: "Altro",
        type: "planned"
      }
    ];
    
    // Aggiungi eventi
    eventiPredefiniti.forEach(ev => {
      state.events.push(ev);
      if (!state.eventsByDate[ev.date]) {
        state.eventsByDate[ev.date] = [];
      }
      state.eventsByDate[ev.date].push(ev);
    });
    
    // Eventi reali corrispondenti
    const eventiReali = [
      {
        id: Utils.generateId(),
        date: dataEventi,
        start: "07:15",
        end: "08:10",
        desc: "VIAGGIO DA CONTEA A ALFIERI",
        category: "Viaggio",
        type: "real",
        plannedEventId: eventiPredefiniti[0].id
      },
      {
        id: Utils.generateId(),
        date: dataEventi,
        start: "09:10",
        end: "11:15",
        desc: "APPUNTAMENTO CON FRANCESCO FERRARINI",
        category: "Lavoro",
        type: "real",
        plannedEventId: eventiPredefiniti[3].id
      }
    ];
    
    eventiReali.forEach(ev => {
      state.events.push(ev);
      if (!state.realEventsByDate[ev.date]) {
        state.realEventsByDate[ev.date] = [];
      }
      state.realEventsByDate[ev.date].push(ev);
    });
    
    // Calcola ricalcolati
    this.calculateRecalculatedEvents(state);
    
    // Salva
    this.saveEvents(state);
    
    Utils.notify('Eventi demo aggiunti (7 maggio 2025)', 'success');
  }
};

// Export per uso globale
window.TimelineEvents = TimelineEvents;