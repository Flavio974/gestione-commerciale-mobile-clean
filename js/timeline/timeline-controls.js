/**
 * Timeline Controls
 * Gestione controlli UI e interazioni
 */

const TimelineControls = {
  // Proprietà per gestione iPhone
  lastTouch: 0,
  handleiPhoneTouch: null,
  
  /**
   * Setup event listeners
   */
  setupEventListeners: function() {
    // Toggle controlli collassabili
    this.addClickListener('toggleControls', () => this.toggleControlsPanel());
    
    // Controlli navigazione
    this.addClickListener('prevDay', () => Timeline.changeDay(-1));
    this.addClickListener('nextDay', () => Timeline.changeDay(1));
    this.addClickListener('zoomIn', () => Timeline.zoom(true));
    this.addClickListener('zoomOut', () => Timeline.zoom(false));
    this.addClickListener('nowBtn', () => Timeline.goToNow());
    this.addClickListener('centerBtn', () => Timeline.centerView());
    
    // Pulsanti flottanti
    this.addClickListener('floatPrevDay', () => Timeline.changeDay(-1));
    this.addClickListener('floatNextDay', () => Timeline.changeDay(1));
    this.addClickListener('floatZoomIn', () => Timeline.zoom(true));
    this.addClickListener('floatZoomOut', () => Timeline.zoom(false));
    this.addClickListener('floatNow', () => Timeline.goToNow());
    
    // Pulsanti navigazione data in alto
    this.addClickListener('floatPrevDayTop', () => Timeline.changeDay(-1));
    this.addClickListener('floatNextDayTop', () => Timeline.changeDay(1));
    
    // Pulsante aggiungi task flottante
    this.addClickListener('floatAddTask', () => TimelineControls.openAddTaskPanel());
    this.addClickListener('clearBtn', () => TimelineEvents.clearEvents(Timeline.state));
    this.addClickListener('saveStateBtn', () => Timeline.saveState());
    this.addClickListener('resetStateBtn', () => Timeline.resetAll());
    this.addClickListener('addPredefinedBtn', () => TimelineEvents.addPredefinedEvents(Timeline.state));
    this.addClickListener('fixCategoriesBtn', () => Timeline.fixCategories());
    this.addClickListener('addBtn', () => {
      TimelineEvents.addEvent(Timeline.state, TimelineConfig);
    });
    
    // Range slider
    const slider = document.getElementById('timeRangeSlider');
    if (slider) {
      slider.addEventListener('input', (e) => Timeline.updateTimeRange(e.target.value));
    }
    
    // Canvas events
    if (Timeline.elements.canvas) {
      this.setupCanvasEvents();
    }
    
    // Event listeners per input time sono ora gestiti in timeline-core.js
    
    // Window resize
    window.addEventListener('app:resize', () => Timeline.handleResize());
  },

  /**
   * Helper per aggiungere click listener
   */
  addClickListener: function(id, handler) {
    const element = document.getElementById(id);
    if (element) {
      // Rileva se è iPhone
      const isIPhone = /iPhone/.test(navigator.userAgent);
      
      if (isIPhone) {
        // Per iPhone usa touchstart per evitare doppi click
        element.removeEventListener('touchstart', this.handleiPhoneTouch);
        element.removeEventListener('click', this.handleiPhoneTouch);
        
        this.handleiPhoneTouch = (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('📱 iPhone touch:', id);
          
          // Debounce per iPhone
          if (this.lastTouch && Date.now() - this.lastTouch < 500) {
            console.log('📱 iPhone: Touch troppo veloce, ignorato');
            return;
          }
          this.lastTouch = Date.now();
          
          handler.call(Timeline);
        };
        
        element.addEventListener('touchstart', this.handleiPhoneTouch, { passive: false });
      } else {
        // Per altri dispositivi usa click normale
        element.removeEventListener('click', handler.bind(Timeline));
        element.addEventListener('click', handler.bind(Timeline));
      }
    } else {
    }
  },

  /**
   * Toggle pannello controlli
   */
  toggleControlsPanel: function() {
    const panel = document.getElementById('controlsPanel');
    const toggleIcon = document.querySelector('#toggleControls .toggle-icon');
    
    if (panel && toggleIcon) {
      const isCollapsed = panel.classList.contains('collapsed');
      
      if (isCollapsed) {
        panel.classList.remove('collapsed');
        toggleIcon.textContent = '▼';
        toggleIcon.style.transform = 'rotate(0deg)';
        localStorage.setItem('timeline_controls_collapsed', 'false');
      } else {
        panel.classList.add('collapsed');
        toggleIcon.textContent = '▶';
        toggleIcon.style.transform = 'rotate(0deg)';
        localStorage.setItem('timeline_controls_collapsed', 'true');
      }
    }
  },

  /**
   * Ripristina stato pannello controlli
   */
  restoreControlsPanelState: function() {
    const isCollapsed = localStorage.getItem('timeline_controls_collapsed') === 'true';
    const panel = document.getElementById('controlsPanel');
    const toggleIcon = document.querySelector('#toggleControls .toggle-icon');
    
    if (panel && toggleIcon) {
      if (isCollapsed) {
        panel.classList.add('collapsed');
        toggleIcon.textContent = '▶';
      } else {
        panel.classList.remove('collapsed');
        toggleIcon.textContent = '▼';
      }
    }
  },

  /**
   * Apre pannello per aggiungere task
   */
  openAddTaskPanel: function() {
    const panel = document.getElementById('controlsPanel');
    const toggleIcon = document.querySelector('#toggleControls .toggle-icon');
    
    if (panel && panel.classList.contains('collapsed')) {
      // Apri il pannello
      panel.classList.remove('collapsed');
      if (toggleIcon) {
        toggleIcon.textContent = '▼';
      }
      localStorage.setItem('timeline_controls_collapsed', 'false');
    }
    
    // Mostra il form task usando il toggle
    const formContainer = document.getElementById('taskFormContainer');
    if (formContainer && formContainer.style.display === 'none') {
      this.toggleTaskForm();
    } else if (formContainer) {
      // Se è già visibile, solo focus sul campo descrizione
      const descrInput = document.getElementById('descr');
      if (descrInput) {
        descrInput.focus();
      }
    }
  },
  
  /**
   * Toggle visibilità form task
   */
  toggleTaskForm: function() {
    const formContainer = document.getElementById('taskFormContainer');
    if (formContainer) {
      if (formContainer.style.display === 'none') {
        formContainer.style.display = 'block';
        this.prefillTaskForm();
        // Focus sul primo campo
        const eventDate = document.getElementById('eventDate');
        if (eventDate) eventDate.focus();
      } else {
        formContainer.style.display = 'none';
      }
    }
  },

  /**
   * Pre-compila il form con valori intelligenti
   */
  prefillTaskForm: function() {
    const dateInput = document.getElementById('eventDate');
    const startInput = document.getElementById('startTime');
    const endInput = document.getElementById('endTime');
    
    if (dateInput) {
      // Usa la data corrente della timeline
      const currentDate = Timeline.state.currentDate;
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = currentDate.getDate().toString().padStart(2, '0');
      dateInput.value = `${year}-${month}-${day}`;
    }
    
    if (startInput) {
      // Usa l'ora corrente arrotondata ai prossimi 15 minuti
      const now = new Date();
      let hours = now.getHours();
      let minutes = Math.ceil(now.getMinutes() / 15) * 15;
      
      if (minutes === 60) {
        hours = (hours + 1) % 24;
        minutes = 0;
      }
      
      startInput.value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    if (endInput && startInput.value) {
      // Imposta fine a +1 ora dall'inizio
      const [h, m] = startInput.value.split(':').map(Number);
      const endHour = (h + 1) % 24;
      endInput.value = `${endHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  },

  /**
   * Setup eventi canvas
   */
  setupCanvasEvents: function() {
    const canvas = Timeline.elements.canvas;
    if (!canvas) return;
    
    // Mouse events
    canvas.addEventListener('mousedown', (e) => Timeline.handleMouseDown(e));
    canvas.addEventListener('mousemove', (e) => Timeline.handleMouseMove(e));
    canvas.addEventListener('mouseup', (e) => Timeline.handleMouseUp(e));
    canvas.addEventListener('mouseleave', (e) => Timeline.handleMouseUp(e));
    
    // Touch events
    canvas.addEventListener('touchstart', (e) => Timeline.handleTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => Timeline.handleTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => Timeline.handleTouchEnd(e), { passive: false });
    
    // Wheel per zoom
    canvas.addEventListener('wheel', (e) => Timeline.handleWheel(e), { passive: false });
    
    // Imposta cursore iniziale
    canvas.style.cursor = 'grab';
  },

  /**
   * Aggiorna tabella eventi
   */
  refreshTable: function(state) {
    const tbody = document.getElementById('eventsTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const key = state.currentDate.toISOString().slice(0, 10);
    const events = state.eventsByDate[key] || [];
    
    events.forEach(event => {
      const row = document.createElement('tr');
      row.setAttribute('data-event-id', event.id);
      row.setAttribute('data-event-date', event.date);
      row.setAttribute('data-event-desc', event.desc);
      row.setAttribute('data-event-category', event.category);
      
      // Trova evento reale corrispondente
      const realEvent = state.realEventsByDate[key]?.find(e => e.plannedEventId === event.id);
      
      // Calcola durata e differenza
      const plannedDuration = TimelineUtils.timeToMinutes(event.end) - TimelineUtils.timeToMinutes(event.start);
      let realDuration = '-';
      let difference = '-';
      
      if (realEvent) {
        realDuration = TimelineUtils.timeToMinutes(realEvent.end) - TimelineUtils.timeToMinutes(realEvent.start);
        difference = realDuration - plannedDuration;
        
        realDuration = `${Math.floor(realDuration/60)}h ${(realDuration%60).toString().padStart(2, '0')}m`;
        difference = difference > 0 ? `+${difference}m` : `${difference}m`;
      }
      
      row.innerHTML = `
        <td>${Utils.formatDate(new Date(event.date), 'DD/MM/YYYY')}</td>
        <td>${event.start}</td>
        <td>${event.end}</td>
        <td>${event.desc}</td>
        <td><span class="category-badge" style="background: ${TimelineConfig.COLORS[event.category]}">${event.category}</span></td>
        <td><input type="time" class="real-start" id="start-${event.id}" data-event-id="${event.id}" value="${realEvent?.start || ''}" onchange="Timeline.handleRealTimeChange(this)"></td>
        <td><input type="time" class="real-end" id="end-${event.id}" data-event-id="${event.id}" value="${realEvent?.end || ''}" onchange="Timeline.handleRealTimeChange(this)"></td>
        <td>${realDuration}</td>
        <td class="${difference.includes('+') ? 'text-danger' : 'text-success'}">${difference}</td>
        <td>
          <button onclick="Timeline.deleteEvent('${event.id}')" class="action-button action-button-danger">×</button>
        </td>
      `;
      
      tbody.appendChild(row);
    });
  },

  /**
   * Get template HTML
   */
  getTemplate: function() {
    return `
      <!-- Current Date Display -->
      <div class="timeline-date-display">
        <button id="floatPrevDayTop" class="date-nav-btn" title="Giorno precedente">◀</button>
        <div class="current-date-info">
          <div id="timelineDateDisplay" class="timeline-date">Caricamento...</div>
          <div id="timelineDayName" class="timeline-day">...</div>
        </div>
        <button id="floatNextDayTop" class="date-nav-btn" title="Giorno successivo">▶</button>
        
        <!-- Pulsante AI Voice integrato -->
        <div id="aiVoiceControl" class="ai-voice-control-inline">
          <button id="aiVoiceToggle" class="ai-voice-toggle-inline" onclick="AIVoiceManager.toggle()">
            <i class="fas fa-microphone"></i>
          </button>
          
          <!-- Indicatore stato comando -->
          <div id="aiCommandIndicator" class="ai-command-indicator-inline">
            <div class="ai-listening-pulse"></div>
            <span class="ai-status-text">In ascolto...</span>
          </div>
        </div>
      </div>
      
      <!-- Timeline Controls Header with Toggle -->
      <div class="timeline-header">
        <div class="timeline-title-bar">
          <h3>Controlli e Inserimento Eventi</h3>
          <button id="toggleControls" class="toggle-btn" aria-label="Mostra/Nascondi Pannello">
            <span class="toggle-icon">▼</span>
          </button>
        </div>
        
        <!-- Collapsible Controls Panel -->
        <div id="controlsPanel" class="controls-panel">
          <div class="controls-grid">
            <!-- Navigation Controls -->
            <div class="control-group">
              <label>Navigazione</label>
              <div class="button-group">
                <button id="prevDay" class="compact-btn">← Prev</button>
                <button id="nextDay" class="compact-btn">Next →</button>
                <button id="nowBtn" class="compact-btn">Ora</button>
              </div>
            </div>
            
            <!-- Zoom Controls -->
            <div class="control-group">
              <label>Zoom</label>
              <div class="button-group">
                <button id="zoomOut" class="compact-btn">-</button>
                <button id="zoomIn" class="compact-btn">+</button>
                <button id="centerBtn" class="compact-btn">Centro</button>
              </div>
            </div>
            
            <!-- Data Controls -->
            <div class="control-group">
              <label>Gestione</label>
              <div class="button-group">
                <button id="clearBtn" class="compact-btn danger">Cancella</button>
                <button id="saveStateBtn" class="compact-btn success">Salva</button>
                <button id="resetStateBtn" class="compact-btn danger">Reset</button>
              </div>
            </div>
            
            <!-- Demo/Fix Controls -->
            <div class="control-group">
              <label>Utilità</label>
              <div class="button-group">
                <button id="addPredefinedBtn" class="compact-btn">Demo</button>
                <button id="fixCategoriesBtn" class="compact-btn">Fix</button>
              </div>
            </div>
          </div>
          
          <!-- Time Range Controls -->
          <div class="time-range-controls">
            <label>Visualizzazione: </label>
            <input type="range" min="1" max="24" value="24" class="time-range-slider" id="timeRangeSlider">
            <span id="timeRangeValue">24 ore</span>
          </div>
          
          <!-- Pulsante per mostrare form task -->
          <div class="control-group">
            <button class="compact-btn success" onclick="TimelineControls.toggleTaskForm()" style="width: 100%;">
              <span style="font-size: 1.1em;">➕</span> Aggiungi Evento
            </button>
          </div>
          
          <!-- Form per aggiungere task (nascosto di default) -->
          <div class="task-form-container" id="taskFormContainer" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h4 style="margin: 0;">Aggiungi Evento</h4>
              <button onclick="TimelineControls.toggleTaskForm()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div class="form-row">
              <input type="date" id="eventDate">
              <input type="time" id="startTime">
              <input type="time" id="endTime">
              <input type="text" id="descr" placeholder="Descrizione...">
              <select id="category">
                ${TimelineConfig.CATEGORIES.map(cat => `<option>${cat}</option>`).join('')}
              </select>
              <button id="addBtn" class="compact-btn success" onclick="TimelineEvents.addEvent(Timeline.state, TimelineConfig)">Aggiungi</button>
              <button class="compact-btn" onclick="TimelineControls.toggleTaskForm()">Annulla</button>
            </div>
          </div>
        </div>
      </div>
      
      <div id="timelineContainer" style="height: 1060px !important; max-height: 1060px !important;">
        <canvas id="timeline"></canvas>
        <div class="zoom-info" id="zoomInfo">Zoom: 1.0x</div>
      </div>
      
      <h2>Elenco Impegni</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Inizio Pianif.</th>
              <th>Fine Pianif.</th>
              <th>Descrizione</th>
              <th>Categoria</th>
              <th>Inizio Reale</th>
              <th>Fine Reale</th>
              <th>Durata Reale</th>
              <th>Differenza</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody id="eventsTable"></tbody>
        </table>
      </div>
    `;
  }
};

// Export per uso globale
window.TimelineControls = TimelineControls;