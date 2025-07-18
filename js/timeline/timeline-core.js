/**
 * Timeline Core Module
 * Modulo principale che coordina tutti i componenti della timeline
 */

const Timeline = {
  // Riferimento alla configurazione
  config: TimelineConfig,
  
  // Stato del modulo
  state: {
    currentDate: new Date(),
    zoomFactor: 1,
    events: [],
    eventsByDate: {},
    realEventsByDate: {},
    recalculatedEventsByDate: {},
    selectedEvent: null,
    eventsTimeRange: { minHour: 0, maxHour: 24, centerHour: 12 },
    isDragging: false,
    dragStart: null,
    zoomCenterHour: null,
    isPerformingZoom: false,
    blockCentering: false,
    lastZoomTime: 0,
    timelineInterval: null
  },
  
  // Elementi DOM
  elements: {
    container: null,
    canvas: null,
    ctx: null,
    eventsTable: null
  },
  
  /**
   * Inizializzazione
   */
  init: function() {
    
    // Imposta data corrente alle 12:00 per evitare problemi di timezone
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    this.state.currentDate = today;
    
    // Carica eventi salvati
    if (typeof TimelineEvents !== 'undefined' && TimelineEvents.loadEvents) {
      TimelineEvents.loadEvents(this.state);
    } else {
      console.warn('TimelineEvents not loaded yet - skipping event load');
    }
    
    // Setup event listeners globali per gli input time
    this.setupGlobalTimeInputListeners();
  },
  
  /**
   * Setup listeners globali per input time
   */
  setupGlobalTimeInputListeners: function() {
    // Rimuovi listener esistenti per evitare duplicati
    document.removeEventListener('focusout', this.handleTimeInputFocusOut);
    document.removeEventListener('keydown', this.handleTimeInputKeydown);
    
    // Aggiungi nuovi listener
    document.addEventListener('focusout', this.handleTimeInputFocusOut.bind(this));
    document.addEventListener('keydown', this.handleTimeInputKeydown.bind(this));
    
  },
  
  /**
   * Gestisce focusout su input time
   */
  handleTimeInputFocusOut: function(e) {
    if (e.target.matches('input[type="time"].real-start, input[type="time"].real-end')) {
      const row = e.target.closest('tr');
      if (row) {
        const startInput = row.querySelector('.real-start');
        const endInput = row.querySelector('.real-end');
        
        // Se è stato modificato l'orario di fine e non c'è orario di inizio,
        // usa l'orario pianificato come inizio
        if (e.target.classList.contains('real-end') && endInput.value && !startInput.value) {
          const plannedStart = row.querySelector('td:nth-child(2)').textContent;
          if (plannedStart) {
            startInput.value = plannedStart;
          }
        }
        
        // Se è stato modificato l'orario di inizio,
        // calcola SEMPRE automaticamente la fine mantenendo la durata pianificata
        if (e.target.classList.contains('real-start') && startInput.value) {
          const plannedStart = row.querySelector('td:nth-child(2)').textContent;
          const plannedEnd = row.querySelector('td:nth-child(3)').textContent;
          
          if (plannedStart && plannedEnd) {
            // Calcola la durata pianificata
            const plannedStartMin = TimelineUtils.timeToMinutes(plannedStart);
            const plannedEndMin = TimelineUtils.timeToMinutes(plannedEnd);
            const plannedDuration = plannedEndMin - plannedStartMin;
            
            // Applica la stessa durata all'orario reale
            const realStartMin = TimelineUtils.timeToMinutes(startInput.value);
            const realEndMin = realStartMin + plannedDuration;
            
            // Converti in formato HH:MM
            endInput.value = TimelineUtils.minutesToTime(realEndMin);
          }
        }
        
        // Procedi sempre per gestire anche la cancellazione
        if (typeof TimelineEvents !== 'undefined' && TimelineEvents.updateRealTime) {
          TimelineEvents.updateRealTime(e, this.state);
        }
      }
    }
  },
  
  /**
   * Gestisce keydown su input time
   */
  handleTimeInputKeydown: function(e) {
    if (e.target.matches('input[type="time"]') && e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  },
  
  /**
   * Gestisce cambio diretto su input time
   */
  handleRealTimeChange: function(input) {
    const row = input.closest('tr');
    if (!row) return;
    
    const startInput = row.querySelector('.real-start');
    const endInput = row.querySelector('.real-end');
    
    // Se è stato modificato l'orario di fine e non c'è orario di inizio,
    // usa l'orario pianificato come inizio
    if (input.classList.contains('real-end') && endInput.value && !startInput.value) {
      const plannedStart = row.querySelector('td:nth-child(2)').textContent;
      if (plannedStart) {
        startInput.value = plannedStart;
        console.log('Usando orario inizio pianificato:', plannedStart);
      }
    }
    
    // Se è stato modificato l'orario di inizio, 
    // calcola SEMPRE automaticamente la fine mantenendo la durata pianificata
    if (input.classList.contains('real-start') && startInput.value) {
      const plannedStart = row.querySelector('td:nth-child(2)').textContent;
      const plannedEnd = row.querySelector('td:nth-child(3)').textContent;
      
      if (plannedStart && plannedEnd) {
        // Calcola la durata pianificata
        const plannedStartMin = TimelineUtils.timeToMinutes(plannedStart);
        const plannedEndMin = TimelineUtils.timeToMinutes(plannedEnd);
        const plannedDuration = plannedEndMin - plannedStartMin;
        
        console.log('Debug calcolo:', {
          plannedStart, plannedEnd,
          plannedStartMin, plannedEndMin, plannedDuration,
          realStart: startInput.value,
          realStartMin: TimelineUtils.timeToMinutes(startInput.value)
        });
        
        // Applica la stessa durata all'orario reale
        const realStartMin = TimelineUtils.timeToMinutes(startInput.value);
        const realEndMin = realStartMin + plannedDuration;
        
        // Converti in formato HH:MM
        endInput.value = TimelineUtils.minutesToTime(realEndMin);
        console.log('Calcolato orario fine automatico:', endInput.value, 'realEndMin:', realEndMin);
      }
    }
    
    // Procedi sempre per gestire anche la cancellazione
    const fakeEvent = { target: input };
    if (typeof TimelineEvents !== 'undefined' && TimelineEvents.updateRealTime) {
      TimelineEvents.updateRealTime(fakeEvent, this.state);
    }
  },
  
  /**
   * Setup quando si entra nel tab
   */
  onEnter: function() {
    this.setupElements();
    TimelineControls.setupEventListeners();
    TimelineControls.setupCanvasEvents();
    this.refreshUI();
    TimelineControls.restoreControlsPanelState();
    this.startTimelineUpdater();
  },
  
  /**
   * Cleanup quando si lascia il tab
   */
  onLeave: function() {
    if (typeof TimelineEvents !== 'undefined' && TimelineEvents.saveEvents) {
      TimelineEvents.saveEvents(this.state);
    }
    this.stopTimelineUpdater();
    
    // Rimuovi pulsanti flottanti
    const floatingButtons = document.querySelector('.timeline-floating-controls');
    if (floatingButtons) {
      floatingButtons.remove();
    }
  },
  
  /**
   * Setup elementi DOM
   */
  setupElements: function() {
    const content = document.getElementById('timeline-content');
    if (!content) return;
    
    // Se il contenuto già esiste, non rigenerarlo
    if (!content.querySelector('#timelineContainer')) {
      // Crea struttura HTML solo se non esiste
      content.innerHTML = TimelineControls.getTemplate();
    }
    
    // Aggiungi pulsanti flottanti se non esistono già
    this.setupFloatingButtons();
    
    // Cache elementi
    this.elements.container = document.getElementById('timelineContainer');
    this.elements.canvas = document.getElementById('timeline');
    this.elements.eventsTable = document.getElementById('eventsTable');
    
    if (this.elements.canvas) {
      this.elements.ctx = this.elements.canvas.getContext('2d');
      this.elements.canvas.style.cursor = 'grab';
    }
    
    // Imposta altezza container
    if (this.elements.container) {
      const totalHeight = this.config.CATEGORIES.length * (this.config.LANE_H + this.config.LANE_GAP) * 2 + // x2 per eventi reali
                          this.config.CATEGORIES.length * (this.config.RECALC_LANE_H + this.config.RECALC_LANE_GAP) +
                          this.config.MARGIN * 2 + 350; // Aumentato per compensare l'offset e gli eventi reali
      this.elements.container.style.height = Math.max(850, totalHeight) + 'px';
    }
  },
  
  /**
   * Setup pulsanti flottanti
   */
  setupFloatingButtons: function() {
    // Rimuovi pulsanti esistenti se ci sono
    const existing = document.querySelector('.timeline-floating-controls');
    if (existing) {
      existing.remove();
    }
    
    // Crea nuovi pulsanti solo quando timeline è attivo
    if (Navigation.currentTab === 'timeline') {
      const floatingHTML = `
        <div class="floating-controls timeline-floating-controls">
          <button id="floatAddTask" class="float-btn success" title="Aggiungi evento" onclick="TimelineControls.openAddTaskPanel()">+</button>
          <div class="float-separator"></div>
          <button id="floatPrevDay" class="float-btn" title="Giorno precedente">◀</button>
          <button id="floatNextDay" class="float-btn" title="Giorno successivo">▶</button>
          <button id="floatZoomOut" class="float-btn" title="Zoom -">−</button>
          <button id="floatZoomIn" class="float-btn" title="Zoom +">+</button>
          <button id="floatNow" class="float-btn primary" title="Vai a ora corrente">⏰</button>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', floatingHTML);
    }
  },
  
  /**
   * Aggiorna interfaccia
   */
  refreshUI: function(maintainCenter = false, saveState = true) {
    if (!this.elements.canvas) return;
    
    let centerHour = null;
    if (maintainCenter) {
      centerHour = this.getVisibleCenterHour();
    }
    
    // Aggiorna dimensioni canvas
    TimelineRendering.updateCanvasSize(this.elements.canvas, this.elements.container);
    
    // Ridisegna timeline
    this.drawTimeline();
    
    // Aggiorna tabella
    TimelineControls.refreshTable(this.state);
    
    // Centra vista se richiesto
    if (maintainCenter && centerHour !== null) {
      this.centerAfterZoom(centerHour);
    } else if (!this.state.blockCentering && this.config.ALWAYS_CENTER_EVENTS) {
      this.centerView();
    }
    
    // Aggiorna display data
    this.updateDateDisplay();
    
    // Salva stato
    if (saveState) {
      if (typeof TimelineEvents !== 'undefined' && TimelineEvents.saveEvents) {
      TimelineEvents.saveEvents(this.state);
    }
    }
  },
  
  /**
   * Disegna timeline
   */
  drawTimeline: function() {
    TimelineRendering.drawTimeline(
      this.elements.ctx, 
      this.elements.canvas,
      this.state,
      this.config
    );
  },
  
  /**
   * Avvia aggiornamento timeline
   */
  startTimelineUpdater: function() {
    this.timelineInterval = setInterval(() => {
      if (TimelineUtils.isDateToday(this.state.currentDate)) {
        this.drawTimeline();
      }
    }, 1000);
  },
  
  /**
   * Ferma aggiornamento timeline
   */
  stopTimelineUpdater: function() {
    if (this.timelineInterval) {
      clearInterval(this.timelineInterval);
      this.timelineInterval = null;
    }
  },
  
  /**
   * Cambia giorno
   */
  changeDay: function(days) {
    console.log('📅 changeDay chiamato con:', days);
    console.log('📅 Data precedente:', this.state.currentDate.toDateString());
    
    const newDate = new Date(this.state.currentDate.getTime());
    newDate.setDate(newDate.getDate() + days);
    // Mantieni ore a 12:00 per evitare problemi con DST
    newDate.setHours(12, 0, 0, 0);
    this.state.currentDate = newDate;
    
    console.log('📅 Nuova data:', this.state.currentDate.toDateString());
    this.refreshUI();
    
    // Feedback visivo con animazione
    const dateDisplay = document.getElementById('timelineDateDisplay');
    if (dateDisplay) {
      dateDisplay.style.transform = 'scale(1.1)';
      setTimeout(() => {
        dateDisplay.style.transform = 'scale(1)';
      }, 200);
    }
  },
  
  /**
   * Zoom
   */
  zoom: function(zoomIn) {
    const oldZoom = this.state.zoomFactor;
    
    if (zoomIn) {
      this.state.zoomFactor = Math.min(this.state.zoomFactor + this.config.ZOOM_STEP, this.config.MAX_ZOOM);
    } else {
      this.state.zoomFactor = Math.max(this.state.zoomFactor - this.config.ZOOM_STEP, this.config.MIN_ZOOM);
    }
    
    if (oldZoom !== this.state.zoomFactor) {
      const zoomInfo = document.getElementById('zoomInfo');
      if (zoomInfo) {
        zoomInfo.textContent = `Zoom: ${this.state.zoomFactor.toFixed(1)}x`;
      }
      this.refreshUI(true);
      Utils.notify(`Zoom: ${this.state.zoomFactor.toFixed(1)}x`, 'info');
    }
  },
  
  /**
   * Vai a ora corrente
   */
  goToNow: function() {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    this.state.currentDate = today;
    this.refreshUI();
    
    if (this.elements.container) {
      const now = new Date();
      const x = TimelineUtils.timeToX(now.getHours() + now.getMinutes() / 60, 
                                     this.elements.canvas.width, this.config.MARGIN);
      this.elements.container.scrollLeft = x - this.elements.container.clientWidth / 2;
    }
  },
  
  /**
   * Centra vista
   */
  centerView: function() {
    if (!this.elements.container) return;
    
    const key = this.state.currentDate.toISOString().slice(0, 10);
    const events = [
      ...(this.state.eventsByDate[key] || []),
      ...(this.state.realEventsByDate[key] || []),
      ...(this.state.recalculatedEventsByDate[key] || [])
    ];
    
    if (events.length === 0) return;
    
    let minTime = 24;
    let maxTime = 0;
    
    events.forEach(ev => {
      const startH = TimelineUtils.timeToMinutes(ev.start) / 60;
      const endH = TimelineUtils.timeToMinutes(ev.end) / 60;
      minTime = Math.min(minTime, startH);
      maxTime = Math.max(maxTime, endH);
    });
    
    const centerTime = (minTime + maxTime) / 2;
    const x = TimelineUtils.timeToX(centerTime, this.elements.canvas.width, this.config.MARGIN);
    this.elements.container.scrollLeft = x - this.elements.container.clientWidth / 2;
  },
  
  /**
   * Gestione mouse/touch events
   */
  handleMouseDown: function(e) {
    this.state.isDragging = true;
    this.state.dragStart = { x: e.clientX, y: e.clientY };
    this.elements.canvas.style.cursor = 'grabbing';
  },
  
  handleMouseMove: function(e) {
    if (!this.state.isDragging) return;
    const dx = e.clientX - this.state.dragStart.x;
    this.elements.container.scrollLeft -= dx;
    this.state.dragStart.x = e.clientX;
  },
  
  handleMouseUp: function(e) {
    this.state.isDragging = false;
    this.elements.canvas.style.cursor = 'grab';
  },
  
  handleTouchStart: function(e) {
    const touch = e.touches[0];
    this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
  },
  
  handleTouchMove: function(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  },
  
  handleTouchEnd: function(e) {
    this.handleMouseUp({});
  },
  
  handleWheel: function(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    this.zoom(delta > 0);
  },
  
  /**
   * Altri metodi
   */
  saveState: function() {
    Utils.notify('Stato salvato con successo', 'success');
  },
  
  resetAll: function() {
    if (!confirm('Resettare TUTTO? Questa azione cancellerà tutti i dati!')) return;
    
    localStorage.removeItem('timeline_events');
    localStorage.removeItem('timeline_controls_collapsed');
    
    this.state.events = [];
    this.state.eventsByDate = {};
    this.state.realEventsByDate = {};
    this.state.recalculatedEventsByDate = {};
    this.state.zoomFactor = 1;
    
    this.refreshUI();
    Utils.notify('Reset completo eseguito', 'warning');
  },
  
  updateDateDisplay: function() {
    const dateStr = Utils.formatDate(this.state.currentDate, 'DD/MM/YYYY');
    const dayName = this.state.currentDate.toLocaleDateString('it-IT', { weekday: 'long' });
    
    // Aggiorna titolo pagina
    document.title = `Timeline - ${dateStr} (${dayName})`;
    
    // Aggiorna display data nella timeline
    const dateDisplay = document.getElementById('timelineDateDisplay');
    const dayDisplay = document.getElementById('timelineDayName');
    
    if (dateDisplay) {
      dateDisplay.textContent = dateStr;
    }
    
    if (dayDisplay) {
      // Capitalizza prima lettera del giorno
      const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      dayDisplay.textContent = dayCapitalized;
      
      // Aggiungi indicatore se è oggi
      const isToday = TimelineUtils.isDateToday(this.state.currentDate);
      if (isToday) {
        dayDisplay.textContent += ' (Oggi)';
        dateDisplay.style.color = '#e63946';
      } else {
        dateDisplay.style.color = 'var(--accent)';
      }
    }
  },
  
  updateTimeRange: function(hours) {
    this.config.VISIBLE_HOURS = parseInt(hours);
    const valueSpan = document.getElementById('timeRangeValue');
    if (valueSpan) {
      valueSpan.textContent = `${hours} ore`;
    }
    this.refreshUI();
  },
  
  fixCategories: function() {
    const standardCategories = ['Lavoro', 'Viaggio', 'Formazione', 'Personale', 'Sport', 'Altro'];
    
    standardCategories.forEach(cat => {
      if (!this.config.CATEGORIES.includes(cat)) {
        this.config.CATEGORIES.push(cat);
      }
      
      if (!this.config.COLORS[cat]) {
        const defaultColors = {
          'Lavoro': '#e63946',
          'Viaggio': '#00b4d8',
          'Formazione': '#e9c46a',
          'Personale': '#4361ee',
          'Sport': '#2ecc71',
          'Altro': '#9d4edd'
        };
        this.config.COLORS[cat] = defaultColors[cat];
      }
    });
    
    this.refreshUI();
    Utils.notify('Categorie corrette!', 'success');
  },
  
  handleResize: function() {
    this.refreshUI();
  },
  
  // Metodi delegati per compatibilità
  deleteEvent: function(id) {
    if (typeof TimelineEvents !== 'undefined' && TimelineEvents.deleteEvent) {
      TimelineEvents.deleteEvent(id, this.state);
    }
  },
  
  updateRealTime: function(e) {
    if (typeof TimelineEvents !== 'undefined' && TimelineEvents.updateRealTime) {
      TimelineEvents.updateRealTime(e, this.state);
    }
  },
  
  getVisibleCenterHour: function() {
    if (!this.elements.container) return null;
    
    const scrollLeft = this.elements.container.scrollLeft;
    const containerWidth = this.elements.container.clientWidth;
    const centerX = scrollLeft + containerWidth / 2;
    const canvasWidth = this.elements.canvas.width;
    
    return (centerX / canvasWidth) * 24;
  },
  
  centerAfterZoom: function(centerHour) {
    if (!this.elements.container || centerHour === null) return;
    
    setTimeout(() => {
      const x = TimelineUtils.timeToX(centerHour, this.elements.canvas.width, this.config.MARGIN);
      this.elements.container.scrollLeft = x - this.elements.container.clientWidth / 2;
    }, this.config.ZOOM_CENTER_DELAY);
  }
};

// Rendi disponibile globalmente
window.Timeline = Timeline;