/**
 * AI Command Parser
 * Interpreta i comandi vocali e li traduce in azioni
 */

const AICommandParser = {
  /**
   * Processa un comando vocale
   */
  processCommand: function(transcript) {
    console.log('🎯 Processando comando:', transcript);
    
    // Debug specifico per iPhone
    if (navigator.userAgent.includes('iPhone')) {
      console.log('📱 iPhone - Transcript originale:', transcript);
      console.log('📱 iPhone - Lunghezza:', transcript.length);
      console.log('📱 iPhone - Caratteri speciali:', transcript.split('').map(c => c.charCodeAt(0)));
      
      // Mostra debug visibile su schermo
      this.showDebugOnScreen('Comando: ' + transcript);
    }
    
    const lowerTranscript = transcript.toLowerCase().trim();
    
    // Rimuovi la wake word se presente all'inizio
    const cleanedTranscript = lowerTranscript
      .replace(/^(assistente|hey assistente|ok assistente|ehi assistente)\s*/i, '')
      .trim();
    
    // Se non c'è un comando dopo la wake word
    if (!cleanedTranscript) {
      AIVoiceManager.speak('Sì, dimmi cosa posso fare per te.');
      // IMPORTANTE: Non resettare isWaitingForCommand qui
      // Il voice manager deve continuare ad ascoltare
      return;
    }
    
    // Analizza il comando
    const action = this.parseCommand(cleanedTranscript);
    
    // Debug per iPhone
    if (navigator.userAgent.includes('iPhone')) {
      console.log('📱 iPhone - Comando pulito:', cleanedTranscript);
      console.log('📱 iPhone - Azione parsata:', action);
      this.showDebugOnScreen('Pulito: ' + cleanedTranscript);
      this.showDebugOnScreen('Azione: ' + JSON.stringify(action));
    }
    
    if (action) {
      console.log('✅ Eseguendo azione:', action);
      this.executeAction(action);
    } else {
      console.log('❌ Comando non riconosciuto:', cleanedTranscript);
      AIVoiceManager.speak('Non ho capito il comando. Puoi ripetere?');
    }
  },
  
  /**
   * Analizza il comando e restituisce l'azione da eseguire
   */
  parseCommand: function(command) {
    // Fix trascrizioni iPhone comuni
    command = this.fixiPhoneTranscription(command);
    // Comandi di navigazione
    if (command.includes('vai') || command.includes('apri') || command.includes('mostra')) {
      if (command.includes('ordini')) {
        return { type: 'navigate', target: 'ordini' };
      }
      if (command.includes('client') || command.includes('anagraf')) {
        return { type: 'navigate', target: 'clienti' };
      }
      if (command.includes('prodott') || command.includes('articol')) {
        return { type: 'navigate', target: 'prodotti' };
      }
      if (command.includes('ddt') || command.includes('fattur') || command.includes('document')) {
        return { type: 'navigate', target: 'ddtft' };
      }
      if (command.includes('percors') || command.includes('consegn')) {
        return { type: 'navigate', target: 'percorsi' };
      }
      if (command.includes('foglio') || command.includes('lavoro') || command.includes('worksheet')) {
        return { type: 'navigate', target: 'worksheet' };
      }
    }
    
    // Comandi di ricerca
    if (command.includes('cerca') || command.includes('trova')) {
      const searchTerm = command.replace(/(cerca|trova)\s*/i, '').trim();
      if (searchTerm) {
        return { type: 'search', query: searchTerm };
      }
    }
    
    // Comandi di creazione
    if (command.includes('nuovo') || command.includes('crea') || command.includes('aggiungi')) {
      if (command.includes('ordine')) {
        return { type: 'create', target: 'ordine' };
      }
      if (command.includes('client')) {
        return { type: 'create', target: 'cliente' };
      }
      if (command.includes('prodott')) {
        return { type: 'create', target: 'prodotto' };
      }
      if (command.includes('evento') || command.includes('task') || command.includes('appuntamento')) {
        return { type: 'create', target: 'evento' };
      }
    }
    
    // TEST DIRETTO PER IPHONE
    if (command.includes('test')) {
      return { type: 'test', target: 'iphone' };
    }
    
    // Comandi di importazione
    if (command.includes('import') || command.includes('carica')) {
      if (command.includes('ddt') || command.includes('document')) {
        return { type: 'import', target: 'ddt' };
      }
      if (command.includes('fattur')) {
        return { type: 'import', target: 'fattura' };
      }
    }
    
    // Comandi di esportazione
    if (command.includes('export') || command.includes('esporta') || command.includes('scarica')) {
      if (command.includes('excel')) {
        return { type: 'export', format: 'excel' };
      }
      if (command.includes('ordini')) {
        return { type: 'export', target: 'ordini' };
      }
    }
    
    // Comandi di filtro
    if (command.includes('filtra') || command.includes('mostra solo')) {
      if (command.includes('oggi')) {
        return { type: 'filter', period: 'today' };
      }
      if (command.includes('settimana')) {
        return { type: 'filter', period: 'week' };
      }
      if (command.includes('mese')) {
        return { type: 'filter', period: 'month' };
      }
    }
    
    // Comandi informativi
    if (command.includes('quanti') || command.includes('numero')) {
      if (command.includes('ordini')) {
        return { type: 'count', target: 'ordini' };
      }
      if (command.includes('client')) {
        return { type: 'count', target: 'clienti' };
      }
    }
    
    // Comandi per compilare campi form - Date
    // Prima controlla se c'è una data nel formato dd/mm/yyyy o dd/mm
    const dateMatch = command.match(/(\d{1,2})[\/\-\s](\d{1,2})(?:[\/\-\s](\d{2,4}))?/) || 
                     command.match(/(\d{1,2})\s+(\d{1,2})(?:\s+(\d{2,4}))?/);
    if (dateMatch) {
      return { type: 'fillField', field: 'date', value: this.parseDate(dateMatch) };
    }
    
    // Poi gestisci comandi con parole chiave
    if (command.includes('data') || command.includes('giorno')) {
      // Gestione date relative
      if (command.includes('oggi')) {
        return { type: 'fillField', field: 'date', value: 'oggi' };
      }
      if (command.includes('domani')) {
        return { type: 'fillField', field: 'date', value: 'domani' };
      }
    }
    
    // Comandi per orari - Pattern multipli per iPhone
    const timeMatch = command.match(/(?:^|\s)(\d{1,2})(?:[:.](\d{2}))?(?:\s|$)/) ||
                     command.match(/(\d{1,2})\s+e\s+(\d{2})/) ||
                     command.match(/(\d{1,2})\s+(\d{2})/);
    if (timeMatch && (command.includes('ora') || command.includes('alle') || command.includes('inizio') || command.includes('fine') || /\d{1,2}/.test(command))) {
      const field = command.includes('inizio') ? 'startTime' : 
                   command.includes('fine') ? 'endTime' : 'time';
      return { type: 'fillField', field: field, value: this.parseTime(timeMatch) };
    }
    
    // Comando per descrizione - più flessibile
    if (command.includes('descrizione') || command.includes('titolo') || command.includes('testo')) {
      const description = command.replace(/(descrizione|titolo|testo)\s*/i, '').trim();
      if (description) {
        return { type: 'fillField', field: 'description', value: description };
      }
    }
    
    // Se non contiene altre parole chiave e non è una data/ora, potrebbe essere una descrizione
    if (!command.includes('categoria') && !command.includes('salva') && !command.includes('chiudi') && 
        !command.includes('vai') && !command.includes('apri') && !command.includes('cerca') && 
        !command.includes('nuovo') && !command.includes('crea') && !command.includes('aggiungi') &&
        !dateMatch && !timeMatch && command.length > 3) {
      return { type: 'fillField', field: 'description', value: command };
    }
    
    // Comando per categoria - più flessibile
    let categoria = null;
    if (command.includes('lavoro')) {
      categoria = 'Lavoro';
    } else if (command.includes('viaggio')) {
      categoria = 'Viaggio';
    } else if (command.includes('formazione')) {
      categoria = 'Formazione';
    } else if (command.includes('personale')) {
      categoria = 'Personale';
    } else if (command.includes('sport')) {
      categoria = 'Sport';
    } else if (command.includes('altro')) {
      categoria = 'Altro';
    }
    
    if (categoria) {
      return { type: 'fillField', field: 'category', value: categoria };
    }
    
    // Comando per salvare
    if (command.includes('salva') || command.includes('conferma') || command.includes('ok')) {
      return { type: 'save' };
    }
    
    // Comandi di sistema
    if (command.includes('aiuto') || command.includes('help') || command.includes('comandi')) {
      return { type: 'help' };
    }
    
    if (command.includes('chiudi') || command.includes('esci') || command.includes('annulla')) {
      return { type: 'close' };
    }
    
    // Comandi per disattivare ascolto
    if (command.includes('disattiva') || command.includes('spegni') || command.includes('stop') || 
        command.includes('basta') || command.includes('fine') || command.includes('dormi')) {
      if (command.includes('ascolto') || command.includes('microfono') || command.includes('voce') || 
          command.includes('assistente') || !command.includes('evento')) {
        return { type: 'stopListening' };
      }
    }
    
    return null;
  },
  
  /**
   * Esegue l'azione parsed
   */
  executeAction: function(action) {
    console.log('🚀 Eseguendo azione:', action);
    
    switch (action.type) {
      case 'navigate':
        this.navigateTo(action.target);
        break;
        
      case 'search':
        this.performSearch(action.query);
        break;
        
      case 'create':
        this.createNew(action.target);
        break;
        
      case 'import':
        this.importDocument(action.target);
        break;
        
      case 'export':
        this.exportData(action);
        break;
        
      case 'filter':
        this.applyFilter(action.period);
        break;
        
      case 'count':
        this.getCount(action.target);
        break;
        
      case 'help':
        this.showHelp();
        break;
        
      case 'close':
        this.closeModal();
        break;
        
      case 'fillField':
        this.fillFormField(action.field, action.value);
        break;
        
      case 'save':
        this.saveForm();
        break;
        
      case 'stopListening':
        this.stopVoiceListening();
        break;
        
      case 'test':
        this.testIPhone();
        break;
        
      default:
        AIVoiceManager.speak('Comando non riconosciuto.');
    }
  },
  
  /**
   * Naviga verso una sezione
   */
  navigateTo: function(target) {
    const tabMap = {
      'ordini': 'ordini-tab',
      'clienti': 'clienti-tab',
      'prodotti': 'prodotti-tab',
      'ddtft': 'ddtft-tab',
      'percorsi': 'percorsi-tab',
      'worksheet': 'worksheet-tab'
    };
    
    const tabId = tabMap[target];
    if (tabId) {
      const tab = document.getElementById(tabId);
      if (tab) {
        tab.click();
        AIVoiceManager.speak(`Apro la sezione ${target}.`);
      } else {
        AIVoiceManager.speak(`Non riesco a trovare la sezione ${target}.`);
      }
    }
  },
  
  /**
   * Esegue una ricerca
   */
  performSearch: function(query) {
    // Trova il campo di ricerca attivo nella sezione corrente
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
      const searchInput = activeTab.querySelector('input[type="search"], input[placeholder*="Cerca"], .search-input');
      if (searchInput) {
        searchInput.value = query;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        AIVoiceManager.speak(`Cerco "${query}".`);
      } else {
        AIVoiceManager.speak('Non trovo un campo di ricerca in questa sezione.');
      }
    }
  },
  
  /**
   * Crea un nuovo elemento
   */
  createNew: function(target) {
    console.log('🎯 createNew chiamato con target:', target);
    
    // Debug specifico per iPhone
    if (navigator.userAgent.includes('iPhone')) {
      this.showDebugOnScreen('createNew: ' + target);
    }
    
    const buttonMap = {
      'ordine': ['#nuovo-ordine-btn', '.btn-nuovo-ordine', '[onclick*="nuovoOrdine"]'],
      'cliente': ['#nuovo-cliente-btn', '.btn-nuovo-cliente', '[onclick*="nuovoCliente"]'],
      'prodotto': ['#nuovo-prodotto-btn', '.btn-nuovo-prodotto', '[onclick*="nuovoProdotto"]'],
      'evento': ['#addBtn', '[onclick*="TimelineEvents.addEvent"]', '.compact-btn.success', 'button[onclick*="addEvent"]']
    };
    
    const selectors = buttonMap[target];
    if (selectors) {
      console.log('🔍 Cercando selettori per', target, ':', selectors);
      
      for (const selector of selectors) {
        console.log('🔍 Tentativo selettore:', selector);
        const button = document.querySelector(selector);
        
        if (button) {
          console.log('✅ Pulsante trovato:', selector);
          
          // Debug iPhone
          if (navigator.userAgent.includes('iPhone')) {
            this.showDebugOnScreen('Pulsante trovato: ' + selector);
          }
          
          button.click();
          const targetName = target === 'evento' ? 'evento' : target;
          AIVoiceManager.speak(`Creo un nuovo ${targetName}.`);
          
          // Se è un evento, entra in modalità form
          if (target === 'evento') {
            setTimeout(() => {
              const taskForm = document.getElementById('taskFormContainer');
              console.log('📝 Controllo form:', taskForm);
              
              if (taskForm && taskForm.style.display !== 'none') {
                console.log('✅ Form aperto, entro in modalità form');
                AIVoiceManager.enterFormMode();
                AIVoiceManager.speak('Ora puoi dettare i campi. Dì "data oggi", "ora inizio 19", "descrizione" e poi il testo, "categoria lavoro".');
              } else {
                console.log('❌ Form non trovato o non visibile');
                if (navigator.userAgent.includes('iPhone')) {
                  this.showDebugOnScreen('Form non aperto');
                }
              }
            }, 500);
          }
          return;
        } else {
          console.log('❌ Pulsante non trovato:', selector);
        }
      }
      
      console.log('❌ Nessun pulsante trovato per', target);
      if (navigator.userAgent.includes('iPhone')) {
        this.showDebugOnScreen('Nessun pulsante trovato');
      }
    }
    
    // Gestione speciale per eventi se i pulsanti non sono trovati
    if (target === 'evento') {
      console.log('🔧 Tentativo funzioni dirette per eventi...');
      
      // Prova a chiamare direttamente la funzione se disponibile
      if (window.TimelineControls && TimelineControls.openAddTaskPanel) {
        console.log('✅ Uso TimelineControls.openAddTaskPanel');
        if (navigator.userAgent.includes('iPhone')) {
          this.showDebugOnScreen('Uso TimelineControls');
        }
        
        TimelineControls.openAddTaskPanel();
        AIVoiceManager.speak('Apro il pannello per aggiungere un evento.');
        
        setTimeout(() => {
          const taskForm = document.getElementById('taskFormContainer');
          console.log('📝 Controllo form (metodo diretto):', taskForm);
          
          if (taskForm && taskForm.style.display !== 'none') {
            console.log('✅ Form aperto con metodo diretto');
            AIVoiceManager.enterFormMode();
            AIVoiceManager.speak('Ora puoi dettare i campi.');
          } else {
            console.log('❌ Form non aperto con metodo diretto');
            if (navigator.userAgent.includes('iPhone')) {
              this.showDebugOnScreen('Form diretto fallito');
            }
          }
        }, 500);
        return;
      }
      
      // METODO DIRETTO: Crea evento manualmente
      console.log('🔧 Creazione evento manuale...');
      if (navigator.userAgent.includes('iPhone')) {
        this.showDebugOnScreen('Creazione manuale evento');
      }
      
      try {
        // Crea evento direttamente nella timeline
        this.createEventManually();
        return;
      } catch (error) {
        console.error('❌ Errore creazione manuale:', error);
        if (navigator.userAgent.includes('iPhone')) {
          this.showDebugOnScreen('Errore manuale: ' + error.message);
        }
      }
      
      // FALLBACK: Prova TimelineEvents se disponibile
      if (window.TimelineEvents && window.Timeline && TimelineEvents.addEvent) {
        console.log('🔄 Fallback TimelineEvents...');
        try {
          TimelineEvents.addEvent(Timeline.state, window.TimelineConfig || {});
          AIVoiceManager.speak('Evento aggiunto con fallback.');
          setTimeout(() => AIVoiceManager.enterFormMode(), 300);
          return;
        } catch (error) {
          console.error('❌ Errore TimelineEvents:', error);
        }
      }
      
      console.log('❌ Nessuna funzione diretta disponibile');
      if (navigator.userAgent.includes('iPhone')) {
        this.showDebugOnScreen('Nessuna funzione disponibile');
      }
    }
    
    AIVoiceManager.speak(`Non riesco a creare un nuovo ${target}.`);
  },
  
  /**
   * Importa un documento
   */
  importDocument: function(target) {
    if (target === 'ddt' || target === 'fattura') {
      // Vai prima alla sezione DDT/FT
      const ddtTab = document.getElementById('ddtft-tab');
      if (ddtTab) {
        ddtTab.click();
        
        setTimeout(() => {
          const importBtn = document.querySelector('#importDDTFTBtn, .import-btn');
          if (importBtn) {
            importBtn.click();
            AIVoiceManager.speak(`Apro l'importazione ${target === 'fattura' ? 'fatture' : 'DDT'}.`);
          } else {
            AIVoiceManager.speak('Non trovo il pulsante di importazione.');
          }
        }, 300);
      }
    }
  },
  
  /**
   * Esporta dati
   */
  exportData: function(action) {
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
      const exportBtn = activeTab.querySelector('.export-btn, [onclick*="export"], button:has(.fa-download)');
      if (exportBtn) {
        exportBtn.click();
        AIVoiceManager.speak('Avvio esportazione.');
      } else {
        AIVoiceManager.speak('Non trovo il pulsante di esportazione in questa sezione.');
      }
    }
  },
  
  /**
   * Applica filtro temporale
   */
  applyFilter: function(period) {
    const periodMap = {
      'today': 'oggi',
      'week': 'questa settimana',
      'month': 'questo mese'
    };
    
    AIVoiceManager.speak(`Filtro per ${periodMap[period] || period}.`);
    
    // Implementa la logica di filtro specifica per ogni sezione
    // Per ora è un placeholder
  },
  
  /**
   * Ottiene il conteggio degli elementi
   */
  getCount: function(target) {
    let count = 0;
    let message = '';
    
    switch (target) {
      case 'ordini':
        const ordiniRows = document.querySelectorAll('#ordini-table tbody tr:not(.no-data)');
        count = ordiniRows.length;
        message = count === 1 ? 'C\'è un ordine' : `Ci sono ${count} ordini`;
        break;
        
      case 'clienti':
        const clientiRows = document.querySelectorAll('#clienti-table tbody tr:not(.no-data)');
        count = clientiRows.length;
        message = count === 1 ? 'C\'è un cliente' : `Ci sono ${count} clienti`;
        break;
    }
    
    AIVoiceManager.speak(message || 'Non riesco a contare gli elementi.');
  },
  
  /**
   * Mostra aiuto
   */
  showHelp: function() {
    const helpMessage = `
      Ecco alcuni comandi che puoi usare:
      - "Vai agli ordini" per aprire la sezione ordini
      - "Cerca" seguito dal termine da cercare
      - "Nuovo ordine" per creare un ordine
      - "Aggiungi evento" per creare un evento nella timeline
      - "Importa DDT" per importare documenti
      - "Esporta Excel" per esportare i dati
      - "Quanti ordini" per sapere il numero di ordini
      - "Disattiva ascolto" o "Basta" per spegnere l'assistente
      - "Aiuto" per sentire di nuovo questi comandi
    `;
    
    AIVoiceManager.speak(helpMessage);
  },
  
  /**
   * Chiude modal attivo
   */
  closeModal: function() {
    // Prima prova a chiudere il form eventi se è aperto
    const taskForm = document.getElementById('taskFormContainer');
    if (taskForm && taskForm.style.display !== 'none') {
      TimelineControls.toggleTaskForm();
      AIVoiceManager.exitFormMode(); // Esci dalla modalità form
      AIVoiceManager.speak('Chiudo il form eventi.');
      return;
    }
    
    // Cerca modal aperti
    const openModal = document.querySelector('.modal.show, .modal[style*="display: block"]');
    if (openModal) {
      // Cerca pulsante di chiusura
      const closeBtn = openModal.querySelector('.close, .btn-close, [data-dismiss="modal"]');
      if (closeBtn) {
        closeBtn.click();
        AIVoiceManager.speak('Chiudo.');
      } else {
        // Prova a nascondere direttamente
        openModal.style.display = 'none';
        openModal.classList.remove('show');
        AIVoiceManager.speak('Chiudo.');
      }
    } else {
      AIVoiceManager.speak('Non c\'è nulla da chiudere.');
    }
  },
  
  /**
   * Compila un campo del form
   */
  fillFormField: function(field, value) {
    // Mappa dei campi del form eventi
    const fieldMap = {
      'date': 'eventDate',
      'startTime': 'startTime',
      'endTime': 'endTime',
      'time': 'startTime', // Default per ora generica
      'description': 'descr',
      'category': 'category'
    };
    
    const fieldId = fieldMap[field];
    if (!fieldId) {
      AIVoiceManager.speak('Campo non riconosciuto.');
      return;
    }
    
    const element = document.getElementById(fieldId);
    if (!element) {
      AIVoiceManager.speak('Non trovo il campo da compilare. Assicurati che il form sia aperto.');
      return;
    }
    
    // Gestione valori speciali per date
    if (field === 'date') {
      if (value === 'oggi') {
        value = new Date().toISOString().split('T')[0];
      } else if (value === 'domani') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        value = tomorrow.toISOString().split('T')[0];
      }
    }
    
    // Imposta il valore
    element.value = value;
    
    // Per i select, trigger change event
    if (element.tagName === 'SELECT') {
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    const fieldNames = {
      'date': 'data',
      'startTime': 'ora inizio',
      'endTime': 'ora fine',
      'time': 'ora',
      'description': 'descrizione',
      'category': 'categoria'
    };
    
    AIVoiceManager.speak(`Ho impostato ${fieldNames[field]} a ${value}.`);
  },
  
  /**
   * Salva il form corrente
   */
  saveForm: function() {
    // Controlla se è il form eventi
    const taskForm = document.getElementById('taskFormContainer');
    if (taskForm && taskForm.style.display !== 'none') {
      const addBtn = document.getElementById('addBtn');
      if (addBtn) {
        addBtn.click();
        AIVoiceManager.exitFormMode(); // Esci dalla modalità form
        AIVoiceManager.speak('Evento salvato.');
      } else {
        AIVoiceManager.speak('Non trovo il pulsante di salvataggio.');
      }
      return;
    }
    
    // Altri form potrebbero essere gestiti qui in futuro
    AIVoiceManager.speak('Non c\'è nessun form da salvare.');
  },
  
  /**
   * Parse data dal match regex
   */
  parseDate: function(match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3] || new Date().getFullYear();
    return `${year}-${month}-${day}`;
  },
  
  /**
   * Parse orario dal match regex
   */
  parseTime: function(match) {
    const hour = match[1].padStart(2, '0');
    const minutes = match[2] || '00';
    return `${hour}:${minutes}`;
  },
  
  /**
   * Disattiva l'ascolto vocale
   */
  stopVoiceListening: function() {
    if (window.AIVoiceManager) {
      AIVoiceManager.speak('Disattivo l\'ascolto. A presto!');
      setTimeout(() => {
        AIVoiceManager.stopListening();
      }, 2000); // Aspetta che finisca di parlare
    } else {
      console.log('Voice Manager non disponibile');
    }
  },
  
  /**
   * Corregge trascrizioni iPhone comuni
   */
  fixiPhoneTranscription: function(command) {
    // Mappa di correzioni comuni per iPhone
    const corrections = {
      // Date
      'venti otto zero sei venti venti cinque': '28/06/2025',
      'ventotto zero sei venti venti cinque': '28/06/2025',
      '28 06 2025': '28/06/2025',
      'ventotto giugno': '28/06/2025',
      
      // Orari
      'ora inizio diciannove': 'ora inizio 19',
      'ora inizio 19': 'ora inizio 19',
      'diciannove': '19',
      'venti': '20',
      'ventuno': '21',
      'ventidue': '22',
      
      // Categorie
      'lavoro': 'lavoro',
      'personale': 'personale',
      'formazione': 'formazione',
      'viaggio': 'viaggio',
      'sport': 'sport',
      
      // Comandi
      'aggiungi evento': 'aggiungi evento',
      'nuovo evento': 'aggiungi evento',
      'crea evento': 'aggiungi evento',
      'salva': 'salva',
      'conferma': 'salva',
      'fine': 'salva',
      'ok': 'salva',
      
      // Fix comuni iOS
      'or a': 'ora',
      'alle ore': 'alle',
      'dal le': 'alle',
      'in izio': 'inizio',
      'fi ne': 'fine'
    };
    
    let corrected = command;
    
    // Applica correzioni
    for (const [wrong, right] of Object.entries(corrections)) {
      corrected = corrected.replace(new RegExp(wrong, 'gi'), right);
    }
    
    // Fix numeri scritti in lettere comuni
    corrected = corrected
      .replace(/\buno\b/g, '1')
      .replace(/\bdue\b/g, '2')
      .replace(/\btre\b/g, '3')
      .replace(/\bquattro\b/g, '4')
      .replace(/\bcinque\b/g, '5')
      .replace(/\bsei\b/g, '6')
      .replace(/\bsette\b/g, '7')
      .replace(/\botto\b/g, '8')
      .replace(/\bnove\b/g, '9')
      .replace(/\bdieci\b/g, '10')
      .replace(/\bundici\b/g, '11')
      .replace(/\bdodici\b/g, '12')
      .replace(/\btredici\b/g, '13')
      .replace(/\bquattordici\b/g, '14')
      .replace(/\bquindici\b/g, '15')
      .replace(/\bsedici\b/g, '16')
      .replace(/\bdiciassette\b/g, '17')
      .replace(/\bdiciotto\b/g, '18')
      .replace(/\bdiciannove\b/g, '19')
      .replace(/\bventi\b/g, '20')
      .replace(/\bventuno\b/g, '21')
      .replace(/\bventidue\b/g, '22')
      .replace(/\bventitré\b/g, '23')
      .replace(/\bventiquattro\b/g, '24');
    
    if (command !== corrected) {
      console.log('📱 Correzione iPhone:', command, '→', corrected);
      if (navigator.userAgent.includes('iPhone')) {
        this.showDebugOnScreen('Corretto: ' + command + ' → ' + corrected);
      }
    }
    
    return corrected;
  },
  
  /**
   * Crea evento manualmente (metodo diretto)
   */
  createEventManually: function() {
    console.log('🛠️ createEventManually chiamato');
    
    if (navigator.userAgent.includes('iPhone')) {
      this.showDebugOnScreen('Inizio creazione manuale');
    }
    
    // Crea un nuovo evento con dati di default
    const now = new Date();
    const newEvent = {
      id: Date.now().toString(),
      date: now.toISOString().split('T')[0],
      startTime: now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0'),
      endTime: (now.getHours() + 1).toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0'),
      description: 'Nuovo evento vocale',
      category: 'Personale',
      isCompleted: false,
      realStartTime: '',
      realEndTime: ''
    };
    
    console.log('📝 Nuovo evento creato:', newEvent);
    
    // Aggiungi l'evento alla timeline se Timeline.state esiste
    if (window.Timeline && Timeline.state) {
      if (!Timeline.state.events) {
        Timeline.state.events = [];
      }
      Timeline.state.events.push(newEvent);
      
      console.log('✅ Evento aggiunto a Timeline.state');
      if (navigator.userAgent.includes('iPhone')) {
        this.showDebugOnScreen('Evento aggiunto alla timeline');
      }
      
      // Salva nel localStorage
      try {
        localStorage.setItem('timeline_events', JSON.stringify(Timeline.state.events));
        console.log('💾 Eventi salvati in localStorage');
      } catch (e) {
        console.error('❌ Errore salvataggio localStorage:', e);
      }
      
      // Refresha la UI se possibile
      if (Timeline.refreshUI) {
        Timeline.refreshUI();
        console.log('🔄 UI refreshata');
      }
      
      // Parla e attiva modalità form
      AIVoiceManager.speak('Ho creato un nuovo evento. Ora puoi dettare i dettagli.');
      
      setTimeout(() => {
        AIVoiceManager.enterFormMode();
        console.log('📝 Modalità form attivata');
        if (navigator.userAgent.includes('iPhone')) {
          this.showDebugOnScreen('Modalità form ON - Puoi dettare');
        }
      }, 1000);
      
    } else {
      console.error('❌ Timeline.state non disponibile');
      if (navigator.userAgent.includes('iPhone')) {
        this.showDebugOnScreen('Timeline.state mancante');
      }
      AIVoiceManager.speak('Errore: timeline non disponibile.');
    }
  },

  /**
   * Test completo per iPhone
   */
  testIPhone: function() {
    console.log('🧪 TEST IPHONE INIZIATO');
    this.showDebugOnScreen('🧪 TEST IPHONE');
    
    // TEST 1: Speech semplice
    this.showDebugOnScreen('TEST 1: Speech');
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('Test');
      u.lang = 'it-IT';
      speechSynthesis.speak(u);
      this.showDebugOnScreen('✅ Speech lanciato');
    } catch (e) {
      this.showDebugOnScreen('❌ Speech error: ' + e.message);
    }
    
    // TEST 2: Evento semplice
    setTimeout(() => {
      this.showDebugOnScreen('TEST 2: Evento');
      try {
        const evt = {
          id: 'test_' + Date.now(),
          description: 'Test evento iPhone',
          date: new Date().toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '11:00'
        };
        
        // Salva in localStorage
        let events = JSON.parse(localStorage.getItem('timeline_events') || '[]');
        events.push(evt);
        localStorage.setItem('timeline_events', JSON.stringify(events));
        
        this.showDebugOnScreen('✅ Evento salvato');
        
        // Refresh pagina dopo 2 secondi
        setTimeout(() => {
          this.showDebugOnScreen('🔄 Ricarico pagina...');
          window.location.reload();
        }, 2000);
        
      } catch (e) {
        this.showDebugOnScreen('❌ Evento error: ' + e.message);
      }
    }, 2000);
  },

  /**
   * Mostra debug su schermo per iPhone
   */
  showDebugOnScreen: function(message) {
    let debugDiv = document.getElementById('mobile-debug');
    if (!debugDiv) {
      debugDiv = document.createElement('div');
      debugDiv.id = 'mobile-debug';
      debugDiv.style.cssText = `
        position: fixed;
        top: 50px;
        left: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 10000;
        font-size: 12px;
        max-height: 200px;
        overflow-y: auto;
      `;
      document.body.appendChild(debugDiv);
    }
    
    const time = new Date().toLocaleTimeString();
    debugDiv.innerHTML += `<div>${time}: ${message}</div>`;
    debugDiv.scrollTop = debugDiv.scrollHeight;
    
    // Auto-clear dopo 30 secondi
    setTimeout(() => {
      if (debugDiv.children.length > 10) {
        debugDiv.removeChild(debugDiv.firstChild);
      }
    }, 30000);
  }
};

// Export globale
window.AICommandParser = AICommandParser;

console.log('✅ AI Command Parser caricato');