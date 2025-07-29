/**
 * 🎤 AI COMMAND PARSER - CLEAN ARCHITECTURE
 * Ridotto da 1102 → ~400 righe (64% riduzione)
 * Design Patterns: Command, Strategy, Chain of Responsibility
 */

console.log('[LOAD] ✅ ai-command-parser-clean.js caricato');

// ==================== CONFIGURATION ====================

const COMMAND_CONFIG = {
  DEBUG: localStorage.getItem('command_debug') === 'true',
  VERSION: '2.0.0',
  
  PATTERNS: {
    // Navigation commands
    NAVIGATION: {
      'ordini': ['ordini'],
      'clienti': ['client', 'anagraf'],
      'prodotti': ['prodott', 'articol'],
      'ddtft': ['ddt', 'fattur', 'document'],
      'percorsi': ['percors', 'consegn'],
      'worksheet': ['foglio', 'lavoro', 'worksheet']
    },
    
    // Time patterns
    TIME: /(?:^|\s)(\d{1,2})(?:[:.](\d{2}))?(?:\s|$)/,
    DATE: /(\d{1,2})[\/\-\s](\d{1,2})(?:[\/\-\s](\d{2,4}))?/,
    
    // Field mapping
    FIELDS: {
      'date': ['data', 'giorno'],
      'time': ['ora', 'alle', 'orario'],
      'startTime': ['inizio', 'ora inizio'],
      'endTime': ['fine', 'ora fine'],
      'description': ['descrizione', 'titolo', 'testo'],
      'category': ['categoria']
    }
  },
  
  TTS: {
    LANG: 'it-IT',
    RATE: 1.0,
    PITCH: 1.0,
    VOLUME: 1.0
  }
};

// ==================== BASE COMMAND HANDLER ====================

class BaseCommandHandler {
  canHandle(command) {
    throw new Error('Abstract method');
  }
  
  handle(command) {
    throw new Error('Abstract method');
  }
  
  speak(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      Object.assign(utterance, COMMAND_CONFIG.TTS);
      window.speechSynthesis.speak(utterance);
    }
  }
}

// ==================== COMMAND HANDLERS ====================

class NavigationHandler extends BaseCommandHandler {
  canHandle(command) {
    return command.includes('vai') || command.includes('apri') || command.includes('mostra');
  }
  
  handle(command) {
    for (const [target, keywords] of Object.entries(COMMAND_CONFIG.PATTERNS.NAVIGATION)) {
      if (keywords.some(keyword => command.includes(keyword))) {
        const tabId = `${target}-tab`;
        const tab = document.getElementById(tabId);
        if (tab) {
          tab.click();
          this.speak(`Apro la sezione ${target}.`);
        }
        return true;
      }
    }
    return false;
  }
}

class SearchHandler extends BaseCommandHandler {
  canHandle(command) {
    return command.includes('cerca') || command.includes('trova');
  }
  
  handle(command) {
    const searchTerm = command.replace(/(cerca|trova)\s*/i, '').trim();
    if (!searchTerm) return false;
    
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
      const searchInput = activeTab.querySelector('input[type="search"], input[placeholder*="Cerca"], .search-input');
      if (searchInput) {
        searchInput.value = searchTerm;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        this.speak(`Cerco "${searchTerm}".`);
        return true;
      }
    }
    this.speak('Non trovo un campo di ricerca.');
    return false;
  }
}

class CreateHandler extends BaseCommandHandler {
  canHandle(command) {
    return command.includes('nuovo') || command.includes('crea') || command.includes('aggiungi');
  }
  
  handle(command) {
    const targetMap = {
      'ordine': ['ordine'],
      'cliente': ['client'],
      'prodotto': ['prodott'],
      'evento': ['evento', 'task', 'appuntamento']
    };
    
    for (const [target, keywords] of Object.entries(targetMap)) {
      if (keywords.some(keyword => command.includes(keyword))) {
        return this.createNew(target);
      }
    }
    return false;
  }
  
  createNew(target) {
    const buttonSelectors = {
      'ordine': ['#nuovo-ordine-btn', '.btn-nuovo-ordine'],
      'cliente': ['#nuovo-cliente-btn', '.btn-nuovo-cliente'],
      'prodotto': ['#nuovo-prodotto-btn', '.btn-nuovo-prodotto'],
      'evento': ['#addBtn', '[onclick*="TimelineEvents.addEvent"]', '.compact-btn.success']
    };
    
    const selectors = buttonSelectors[target];
    if (!selectors) return false;
    
    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button) {
        button.click();
        this.speak(`Creo un nuovo ${target}.`);
        
        if (target === 'evento') {
          setTimeout(() => {
            if (window.AIVoiceManager?.enterFormMode) {
              window.AIVoiceManager.enterFormMode();
              this.speak('Ora puoi dettare i campi.');
            }
          }, 500);
        }
        return true;
      }
    }
    
    // Fallback for events
    if (target === 'evento' && window.TimelineControls?.openAddTaskPanel) {
      window.TimelineControls.openAddTaskPanel();
      this.speak('Apro il pannello eventi.');
      return true;
    }
    
    return false;
  }
}

class InfoHandler extends BaseCommandHandler {
  canHandle(command) {
    return command.includes('che ore sono') || command.includes('che giorno è') || 
           command.includes('data e ora') || command.includes('ora e data');
  }
  
  handle(command) {
    const now = new Date();
    const dateOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    if (command.includes('data e ora') || command.includes('che giorno è oggi e che ore sono')) {
      const dateStr = now.toLocaleDateString('it-IT', dateOptions);
      this.speak(`Oggi è ${dateStr} e sono le ${now.getHours()} e ${now.getMinutes()} minuti.`);
    } else if (command.includes('ora e data') || command.includes('che ore sono e che giorno è')) {
      const dateStr = now.toLocaleDateString('it-IT', dateOptions);
      this.speak(`Sono le ${now.getHours()} e ${now.getMinutes()} minuti di ${dateStr}.`);
    } else if (command.includes('che ore sono')) {
      this.speak(`Sono le ${now.getHours()} e ${now.getMinutes()} minuti.`);
    } else if (command.includes('che giorno è')) {
      const dateStr = now.toLocaleDateString('it-IT', dateOptions);
      this.speak(`Oggi è ${dateStr}.`);
    }
    
    return true;
  }
}

class FormHandler extends BaseCommandHandler {
  canHandle(command) {
    // Check for date/time patterns or field keywords
    return COMMAND_CONFIG.PATTERNS.DATE.test(command) ||
           COMMAND_CONFIG.PATTERNS.TIME.test(command) ||
           Object.values(COMMAND_CONFIG.PATTERNS.FIELDS).some(keywords => 
             keywords.some(keyword => command.includes(keyword))
           );
  }
  
  handle(command) {
    // Date handling
    const dateMatch = command.match(COMMAND_CONFIG.PATTERNS.DATE);
    if (dateMatch) {
      const date = this.parseDate(dateMatch);
      return this.fillField('date', date, 'data');
    }
    
    // Time handling
    const timeMatch = command.match(COMMAND_CONFIG.PATTERNS.TIME);
    if (timeMatch && (command.includes('ora') || command.includes('alle'))) {
      const time = this.parseTime(timeMatch);
      const field = command.includes('inizio') ? 'startTime' : 
                   command.includes('fine') ? 'endTime' : 'time';
      const fieldName = field === 'startTime' ? 'ora inizio' : 
                       field === 'endTime' ? 'ora fine' : 'ora';
      return this.fillField(field, time, fieldName);
    }
    
    // Description handling
    if (command.includes('descrizione') || command.includes('titolo')) {
      const value = command.replace(/(descrizione|titolo|testo)\s*/i, '').trim();
      if (value) {
        return this.fillField('description', value, 'descrizione');
      }
    }
    
    // Category handling
    const categories = ['lavoro', 'viaggio', 'formazione', 'personale', 'sport', 'altro'];
    for (const cat of categories) {
      if (command.includes(cat)) {
        return this.fillField('category', cat.charAt(0).toUpperCase() + cat.slice(1), 'categoria');
      }
    }
    
    return false;
  }
  
  fillField(field, value, displayName) {
    const fieldMap = {
      'date': 'eventDate',
      'time': 'startTime',
      'startTime': 'startTime',
      'endTime': 'endTime',
      'description': 'descr',
      'category': 'category'
    };
    
    const fieldId = fieldMap[field];
    const element = document.getElementById(fieldId);
    
    if (element) {
      // Special handling for relative dates
      if (field === 'date') {
        if (value === 'oggi') {
          value = new Date().toISOString().split('T')[0];
        } else if (value === 'domani') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          value = tomorrow.toISOString().split('T')[0];
        }
      }
      
      element.value = value;
      element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      this.speak(`Ho impostato ${displayName} a ${value}.`);
      return true;
    }
    
    this.speak('Non trovo il campo da compilare.');
    return false;
  }
  
  parseDate(match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3] || new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }
  
  parseTime(match) {
    const hour = match[1].padStart(2, '0');
    const minutes = match[2] || '00';
    return `${hour}:${minutes}`;
  }
}

class SystemHandler extends BaseCommandHandler {
  canHandle(command) {
    return command.includes('salva') || command.includes('chiudi') || 
           command.includes('aiuto') || command.includes('disattiva') ||
           command.includes('stop') || command.includes('basta');
  }
  
  handle(command) {
    if (command.includes('salva') || command.includes('conferma')) {
      return this.saveForm();
    }
    
    if (command.includes('chiudi') || command.includes('annulla')) {
      return this.closeModal();
    }
    
    if (command.includes('aiuto') || command.includes('comandi')) {
      return this.showHelp();
    }
    
    if ((command.includes('disattiva') || command.includes('stop') || command.includes('basta')) &&
        (command.includes('ascolto') || command.includes('assistente') || !command.includes('evento'))) {
      return this.stopListening();
    }
    
    return false;
  }
  
  saveForm() {
    const taskForm = document.getElementById('taskFormContainer');
    if (taskForm?.style.display !== 'none') {
      const addBtn = document.getElementById('addBtn');
      if (addBtn) {
        addBtn.click();
        if (window.AIVoiceManager?.exitFormMode) {
          window.AIVoiceManager.exitFormMode();
        }
        this.speak('Evento salvato.');
        return true;
      }
    }
    this.speak('Non c\'è nessun form da salvare.');
    return false;
  }
  
  closeModal() {
    const taskForm = document.getElementById('taskFormContainer');
    if (taskForm?.style.display !== 'none') {
      if (window.TimelineControls?.toggleTaskForm) {
        window.TimelineControls.toggleTaskForm();
      }
      if (window.AIVoiceManager?.exitFormMode) {
        window.AIVoiceManager.exitFormMode();
      }
      this.speak('Chiudo il form.');
      return true;
    }
    
    const openModal = document.querySelector('.modal.show, .modal[style*="display: block"]');
    if (openModal) {
      const closeBtn = openModal.querySelector('.close, .btn-close, [data-dismiss="modal"]');
      if (closeBtn) {
        closeBtn.click();
        this.speak('Chiudo.');
        return true;
      }
    }
    
    this.speak('Non c\'è nulla da chiudere.');
    return false;
  }
  
  showHelp() {
    const commands = [
      '"Vai agli ordini" per navigare',
      '"Cerca" per cercare',
      '"Nuovo ordine" per creare',
      '"Aggiungi evento" per la timeline',
      '"Che ore sono" per l\'ora',
      '"Che giorno è" per la data',
      '"Disattiva ascolto" per spegnere'
    ];
    this.speak('Comandi disponibili: ' + commands.join(', '));
    return true;
  }
  
  stopListening() {
    this.speak('Disattivo l\'ascolto. A presto!');
    setTimeout(() => {
      if (window.AIVoiceManager?.stopListening) {
        window.AIVoiceManager.stopListening();
      }
    }, 2000);
    return true;
  }
}

// ==================== MAIN COMMAND PARSER ====================

class AICommandParserClean {
  constructor() {
    this.handlers = [
      new NavigationHandler(),
      new SearchHandler(),
      new CreateHandler(),
      new InfoHandler(),
      new FormHandler(),
      new SystemHandler()
    ];
  }
  
  processCommand(transcript) {
    if (COMMAND_CONFIG.DEBUG) {
      console.log('🎯 Processing:', transcript);
    }
    
    // Clean transcript
    const cleaned = transcript
      .toLowerCase()
      .trim()
      .replace(/^(assistente|hey assistente|ok assistente|ehi assistente)\s*/i, '');
    
    if (!cleaned) {
      this.speak('Sì, dimmi cosa posso fare per te.');
      return;
    }
    
    // Process through handler chain
    for (const handler of this.handlers) {
      if (handler.canHandle(cleaned)) {
        if (handler.handle(cleaned)) {
          return;
        }
      }
    }
    
    // No handler found
    this.speak('Non ho capito il comando. Puoi ripetere?');
  }
  
  speak(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      Object.assign(utterance, COMMAND_CONFIG.TTS);
      window.speechSynthesis.speak(utterance);
    }
  }
  
  speakSafe(text) {
    this.speak(text);
  }
}

// ==================== SINGLETON EXPORT ====================

const AICommandParser = new AICommandParserClean();

// Export with compatibility
window.AICommandParserClean = AICommandParserClean;
window.AICommandParser = AICommandParser;

console.log('🎤 AICommandParser Clean ready!');