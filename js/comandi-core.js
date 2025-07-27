/**
 * Comandi Core Module
 * Gestisce il vocabolario dei comandi e l'interfaccia di editing
 */

const ComandiModule = {
  vocabolario: null,
  isLoading: false,
  
  /**
   * Inizializzazione del modulo
   */
  init: async function() {
    console.log('🎯 Inizializzazione modulo Comandi');
    
    // Solo su desktop - Fix: permetti sempre su desktop reali
    const isRealDesktop = window.innerWidth >= 1024 && 
                         !(/Mobi|Android/i.test(navigator.userAgent)) &&
                         !('ontouchstart' in window);
    
    if (!isRealDesktop && window.DeviceDetector && !window.DeviceDetector.info.isDesktop) {
      console.log('📱 Modulo Comandi disponibile solo su desktop');
      return;
    }
    
    console.log('💻 Desktop rilevato - Inizializzazione Comandi in corso...');
    
    // Carica vocabolario
    await this.loadVocabolario();
    
    // Setup UI
    this.setupUI();
    
    // Setup event listeners
    this.setupEventListeners();
  },
  
  /**
   * Carica il vocabolario dei comandi
   */
  loadVocabolario: async function() {
    try {
      this.isLoading = true;
      let text = '';
      let source = '';
      
      // 1. PRIORITÀ: Controlla localStorage (modifiche utente)
      // DEBUG: Changed key to vocabulary_user
      const savedVocabolario = localStorage.getItem('vocabulary_user');
      if (savedVocabolario) {
        text = savedVocabolario;
        source = 'localStorage (modifiche utente)';
        console.log('🔄 Vocabolario caricato da localStorage (modifiche dell\'utente)');
      } else {
        // 2. FALLBACK: Carica dal file statico
        const response = await fetch('/comandi/vocabolario_comandi.txt');
        if (!response.ok) {
          throw new Error('Impossibile caricare il vocabolario');
        }
        text = await response.text();
        source = 'file statico';
        console.log('📄 Vocabolario caricato dal file statico');
        
        // Salva automaticamente in localStorage per preservare in futuro
        // DEBUG: Changed key to vocabulary_user
        localStorage.setItem('vocabulary_user', text);
        console.log('💾 Vocabolario salvato automaticamente in localStorage');
      }
      
      this.vocabolario = this.parseVocabolario(text);
      console.log('✅ Vocabolario caricato da', source + ':', Object.keys(this.vocabolario).length, 'categorie');
      
      // Aggiorna l'interfaccia dopo il caricamento
      this.updateInterface(text);
      
    } catch (error) {
      console.error('❌ Errore caricamento vocabolario:', error);
      this.vocabolario = {};
    } finally {
      this.isLoading = false;
    }
  },
  
  /**
   * Parse del vocabolario
   */
  parseVocabolario: function(text) {
    const commands = {};
    let currentCategory = null;
    
    text.split('\n').forEach(line => {
      line = line.trim();
      
      if (line.startsWith('# CATEGORIA:')) {
        currentCategory = line.replace('# CATEGORIA:', '').trim();
        commands[currentCategory] = [];
      } else if (line && currentCategory && !line.startsWith('#')) {
        commands[currentCategory].push({
          pattern: line,
          regex: this.createRegexFromPattern(line)
        });
      }
    });
    
    return commands;
  },
  
  /**
   * Converte pattern con placeholder in regex
   */
  createRegexFromPattern: function(pattern) {
    return pattern
      .replace(/\[CLIENTE\]/g, '(.+?)')
      .replace(/\[CLIENTE_A\]/g, '(.+?)')
      .replace(/\[CLIENTE_B\]/g, '(.+?)')
      .replace(/\[DATA\]/g, '(.+?)')
      .replace(/\[ORA\]/g, '(.+?)')
      .replace(/\[PERIODO\]/g, '(settimana|mese|anno)')
      .replace(/\[PERIODO_A\]/g, '(.+?)')
      .replace(/\[PERIODO_B\]/g, '(.+?)')
      .replace(/\[GIORNI\]/g, '(\\d+)')
      .replace(/\[GIORNO\]/g, '(.+?)')
      .replace(/\[ZONA\]/g, '(.+?)')
      .replace(/\[PRODOTTO\]/g, '(.+?)')
      .replace(/\[NOTA\]/g, '(.+)');
  },
  
  /**
   * Setup interfaccia utente
   */
  setupUI: function() {
    const container = document.getElementById('comandi-content');
    if (!container) return;
    
    container.innerHTML = `
      <div class="comandi-container">
        <div class="comandi-header">
          <h2>📋 Vocabolario Comandi</h2>
          <p class="text-muted">Gestisci i comandi riconosciuti dall'applicazione</p>
        </div>
        
        <div class="comandi-toolbar">
          <button class="btn btn-primary" onclick="ComandiModule.saveVocabolario()">
            💾 Salva modifiche
          </button>
          <button class="btn btn-secondary" onclick="ComandiModule.loadVocabolario()">
            🔄 Ricarica
          </button>
          <button class="btn btn-info" onclick="ComandiModule.exportVocabolario()">
            📥 Esporta Backup
          </button>
          <button class="btn btn-success" onclick="ComandiModule.importVocabolario()">
            📤 Importa Backup
          </button>
          <button class="btn btn-warning" onclick="ComandiModule.resetToDefault()">
            🔧 Reset Default
          </button>
        </div>
        
        <div class="comandi-quick-add">
          <h4>Aggiungi comando rapido</h4>
          <div class="form-row">
            <select id="quick-category" class="form-control">
              <option value="">Seleziona categoria...</option>
            </select>
            <input type="text" id="quick-command" class="form-control" 
                   placeholder="Inserisci nuovo comando...">
            <button class="btn btn-success" onclick="ComandiModule.addQuickCommand()">
              <i class="fas fa-plus"></i> Aggiungi
            </button>
          </div>
        </div>
        
        <div class="comandi-editor-container">
          <h4>Editor vocabolario</h4>
          <textarea id="vocabolario-editor" class="form-control vocabolario-editor" 
                    rows="20" spellcheck="false"></textarea>
        </div>
        
        <div class="comandi-stats">
          <div id="comandi-stats-content"></div>
        </div>
        
        <div class="comandi-aliases-section">
          <h4>🔗 Gestione Alias Clienti</h4>
          <p class="text-muted">Configura nomi alternativi per i clienti (es. ESSEMME → Essemme Conad Montegrosso)</p>
          
          <div class="alias-search">
            <div class="form-row">
              <input type="text" id="alias-search-input" class="form-control" 
                     placeholder="Cerca cliente per nome o alias...">
              <button class="btn btn-primary" onclick="ComandiModule.searchClientAliases()">
                <i class="fas fa-search"></i> Cerca
              </button>
            </div>
          </div>
          
          <div id="alias-results" class="alias-results" style="display: none;">
            <!-- Risultati ricerca alias -->
          </div>
          
          <div class="alias-add-section">
            <h5>Aggiungi nuovo alias</h5>
            <div class="form-row">
              <input type="text" id="alias-client-name" class="form-control" 
                     placeholder="Nome cliente principale">
              <input type="text" id="alias-new-alias" class="form-control" 
                     placeholder="Nuovo alias">
              <button class="btn btn-success" onclick="ComandiModule.addNewAlias()">
                <i class="fas fa-plus"></i> Aggiungi
              </button>
            </div>
          </div>
        </div>
        
        <div class="comandi-timeline-section">
          <h4>📅 Gestione Regole Timeline</h4>
          <p class="text-muted">Configura regole per inserimento automatico appuntamenti</p>
          
          <div class="timeline-rules-actions">
            <button class="btn btn-primary" onclick="ComandiModule.showTimelineRules()">
              <i class="fas fa-cog"></i> Visualizza Regole
            </button>
            <button class="btn btn-info" onclick="ComandiModule.testDateParser()">
              <i class="fas fa-test-tube"></i> Test Parser Date
            </button>
            <button class="btn btn-secondary" onclick="ComandiModule.reloadTimelineRules()">
              <i class="fas fa-sync"></i> Ricarica Regole
            </button>
          </div>
          
          <div id="timeline-rules-display" class="timeline-rules-display" style="display: none;">
            <!-- Contenuto regole timeline -->
          </div>
        </div>
      </div>
    `;
    
    // Popola select categorie
    this.updateCategorySelect();
    
    // Carica contenuto nell'editor
    this.updateEditor();
    
    // Mostra statistiche
    this.updateStats();
  },
  
  /**
   * Aggiorna l'interfaccia con i dati caricati
   */
  updateInterface: function(rawText) {
    // Popola select categorie
    this.updateCategorySelect();
    
    // Carica contenuto nell'editor
    this.updateEditor(rawText);
    
    // Mostra statistiche
    this.updateStats();
    
    console.log('🎨 Interfaccia aggiornata con vocabolario');
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners: function() {
    // Auto-save on editor change
    const editor = document.getElementById('vocabolario-editor');
    if (editor) {
      let saveTimeout;
      editor.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          this.parseEditorContent();
          this.updateStats();
        }, 1000);
      });
    }
  },
  
  /**
   * Aggiorna select delle categorie
   */
  updateCategorySelect: function() {
    const select = document.getElementById('quick-category');
    if (!select || !this.vocabolario) return;
    
    select.innerHTML = '<option value="">Seleziona categoria...</option>';
    
    Object.keys(this.vocabolario).forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
  },
  
  /**
   * Aggiorna contenuto editor
   */
  updateEditor: function() {
    const editor = document.getElementById('vocabolario-editor');
    if (!editor || !this.vocabolario) return;
    
    let content = '';
    
    Object.entries(this.vocabolario).forEach(([category, commands]) => {
      content += `# CATEGORIA: ${category}\n`;
      commands.forEach(cmd => {
        content += `${cmd.pattern}\n`;
      });
      content += '\n';
    });
    
    editor.value = content.trim();
  },
  
  /**
   * Parse contenuto dall'editor
   */
  parseEditorContent: function() {
    const editor = document.getElementById('vocabolario-editor');
    if (!editor) return;
    
    this.vocabolario = this.parseVocabolario(editor.value);
    this.updateCategorySelect();
  },
  
  /**
   * Aggiorna il select delle categorie
   */
  updateCategorySelect: function() {
    const select = document.getElementById('quick-category');
    if (!select || !this.vocabolario) return;
    
    // Svuota e riempi select
    select.innerHTML = '<option value="">Seleziona categoria...</option>';
    
    Object.keys(this.vocabolario).forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
    
    console.log('🎯 Dropdown categorie aggiornato con', Object.keys(this.vocabolario).length, 'categorie');
  },
  
  /**
   * Aggiorna l'editor con il contenuto del vocabolario
   */
  updateEditor: function(rawText) {
    const editor = document.getElementById('vocabolario-editor');
    if (!editor) return;
    
    if (rawText) {
      editor.value = rawText;
    } else {
      // Ricostruisci il testo dal vocabolario parsato
      let text = '';
      Object.entries(this.vocabolario).forEach(([category, commands]) => {
        text += `# CATEGORIA: ${category}\n`;
        commands.forEach(cmd => {
          text += `${cmd.pattern}\n`;
        });
        text += '\n';
      });
      editor.value = text;
    }
    
    console.log('📝 Editor aggiornato con contenuto vocabolario');
  },
  
  /**
   * Aggiorna statistiche
   */
  updateStats: function() {
    const container = document.getElementById('comandi-stats-content');
    if (!container || !this.vocabolario) return;
    
    let totalCommands = 0;
    let stats = '<h4>📊 Statistiche</h4><ul>';
    
    Object.entries(this.vocabolario).forEach(([category, commands]) => {
      totalCommands += commands.length;
      stats += `<li><strong>${category}:</strong> ${commands.length} comandi</li>`;
    });
    
    stats += `</ul><p><strong>Totale:</strong> ${totalCommands} comandi in ${Object.keys(this.vocabolario).length} categorie</p>`;
    
    container.innerHTML = stats;
  },
  
  /**
   * Aggiungi comando rapido
   */
  addQuickCommand: function() {
    const categorySelect = document.getElementById('quick-category');
    const commandInput = document.getElementById('quick-command');
    
    if (!categorySelect || !commandInput) return;
    
    const category = categorySelect.value;
    const command = commandInput.value.trim();
    
    if (!category || !command) {
      alert('Seleziona una categoria e inserisci un comando');
      return;
    }
    
    // Aggiungi al vocabolario
    if (!this.vocabolario[category]) {
      this.vocabolario[category] = [];
    }
    
    this.vocabolario[category].push({
      pattern: command,
      regex: this.createRegexFromPattern(command)
    });
    
    // Aggiorna UI
    this.updateEditor();
    this.updateStats();
    
    // Clear input
    commandInput.value = '';
    
    // Feedback
    this.showToast('Comando aggiunto con successo!', 'success');
  },
  
  /**
   * Salva vocabolario
   */
  saveVocabolario: async function() {
    const editor = document.getElementById('vocabolario-editor');
    if (!editor) return;
    
    try {
      // Per ora salviamo in localStorage (in produzione userai un endpoint API)
      // DEBUG: Add new total orders command before saving
      let contentToSave = editor.value;
      
      // Check if total orders command already exists
      if (!contentToSave.includes('quanti ordini ci sono nel database')) {
        // Add new command for total orders counting
        const totalOrdersCommand = `
# CATEGORIA: Sistema e Database  
quanti ordini ci sono nel database
numero ordini totali
conta ordini
totale ordini
count ordini`;
        contentToSave += totalOrdersCommand;
      }
      
      localStorage.setItem('vocabulary_user', contentToSave);
      console.debug('[COMANDI-SAVE]', { key: 'vocabulary_user', content: contentToSave });
      
      // Ricarica il vocabolario parsato
      this.vocabolario = this.parseVocabolario(editor.value);
      
      this.showToast('Vocabolario salvato con successo!', 'success');
      
      // Notifica il middleware del cambiamento
      window.dispatchEvent(new CustomEvent('vocabolario:updated', {
        detail: { vocabolario: this.vocabolario }
      }));
      
    } catch (error) {
      console.error('Errore salvataggio:', error);
      this.showToast('Errore durante il salvataggio', 'error');
    }
  },
  
  /**
   * Esporta vocabolario
   */
  exportVocabolario: function() {
    const editor = document.getElementById('vocabolario-editor');
    if (!editor) return;
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const filename = `vocabolario_comandi_backup_${timestamp}.txt`;
    
    const blob = new Blob([editor.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showToast('Backup esportato: ' + filename, 'success');
  },
  
  /**
   * Importa vocabolario da file
   */
  importVocabolario: function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        
        // Conferma importazione
        if (confirm('Vuoi importare questo vocabolario? Le modifiche attuali saranno sovrascritte.')) {
          const editor = document.getElementById('vocabolario-editor');
          if (editor) {
            editor.value = content;
            // Salva automaticamente
            this.saveVocabolario();
            this.showToast('Vocabolario importato con successo!', 'success');
          }
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },
  
  /**
   * Reset al vocabolario di default
   */
  resetToDefault: async function() {
    if (!confirm('🔄 Vuoi ricaricare il vocabolario dal file aggiornato?\n\n✅ Questo mostrerà tutte le categorie più recenti\n⚠️ Sostituirà solo la versione cache, non cancella niente')) {
      return;
    }
    
    try {
      // Rimuovi dal localStorage
      // DEBUG: Changed key to vocabulary_user
      localStorage.removeItem('vocabulary_user');
      
      // Ricarica dal file statico
      const response = await fetch('/comandi/vocabolario_comandi.txt');
      if (!response.ok) {
        throw new Error('Impossibile caricare il vocabolario di default');
      }
      
      const text = await response.text();
      const editor = document.getElementById('vocabolario-editor');
      if (editor) {
        editor.value = text;
      }
      
      // Ricarica il vocabolario
      this.vocabolario = this.parseVocabolario(text);
      this.updateInterface(text);
      
      this.showToast('Vocabolario ripristinato alle impostazioni di default', 'success');
      
    } catch (error) {
      console.error('Errore reset:', error);
      this.showToast('Errore durante il reset: ' + error.message, 'error');
    }
  },
  
  /**
   * Mostra toast notification
   */
  showToast: function(message, type = 'info') {
    // Implementazione semplice di toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
  
  /**
   * Hook per quando si entra nel tab
   */
  onEnter: function() {
    console.log('📋 Entering Comandi tab');
    
    // Solo su desktop - Fix: permetti sempre su desktop reali
    const isRealDesktop = window.innerWidth >= 1024 && 
                         !(/Mobi|Android/i.test(navigator.userAgent)) &&
                         !('ontouchstart' in window);
    
    if (!isRealDesktop && window.DeviceDetector && !window.DeviceDetector.info.isDesktop) {
      console.log('📱 Modulo Comandi disponibile solo su desktop');
      const container = document.getElementById('comandi-content');
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #6c757d;">
            <h3>📱 Funzione disponibile solo su desktop</h3>
            <p>Il modulo comandi è ottimizzato per l'uso su schermi desktop.<br>
            Accedi da un computer per gestire il vocabolario comandi.</p>
          </div>
        `;
      }
      return;
    }
    
    console.log('💻 Desktop confermato - Caricamento interfaccia Comandi...');
    
    this.setupUI();
    this.loadVocabolario();
    this.setupEventListeners();
  },
  
  /**
   * Cerca alias di un cliente
   */
  searchClientAliases: async function() {
    const input = document.getElementById('alias-search-input');
    const results = document.getElementById('alias-results');
    
    if (!input || !results) return;
    
    const searchName = input.value.trim();
    if (!searchName) {
      results.style.display = 'none';
      return;
    }
    
    try {
      // Usa il ClientAliasResolver del VocabolarioMiddleware
      if (window.EnhancedAIAssistant && window.EnhancedAIAssistant.vocabolarioMiddleware) {
        const resolver = window.EnhancedAIAssistant.vocabolarioMiddleware.aliasResolver;
        const resolution = await resolver.resolveClientName(searchName);
        
        this.displayAliasResults(resolution, results);
        results.style.display = 'block';
      } else {
        this.showToast('Sistema alias non disponibile', 'error');
      }
    } catch (error) {
      console.error('❌ Errore ricerca alias:', error);
      this.showToast('Errore durante la ricerca', 'error');
    }
  },
  
  /**
   * Mostra risultati ricerca alias
   */
  displayAliasResults: function(resolution, container) {
    let html = '';
    
    if (resolution.found) {
      html = `
        <div class="alias-result-card">
          <h6>✅ Cliente trovato</h6>
          <p><strong>Nome principale:</strong> ${resolution.resolved}</p>
          <p><strong>Input:</strong> ${resolution.input}</p>
          <p><strong>Tipo match:</strong> ${resolution.matchType}</p>
          
          ${resolution.alternatives ? `
            <p><strong>Alternative:</strong> ${resolution.alternatives.join(', ')}</p>
          ` : ''}
          
          <div class="alias-actions">
            <button class="btn btn-sm btn-info" onclick="ComandiModule.showAllAliases('${resolution.resolved}')">
              <i class="fas fa-list"></i> Mostra tutti gli alias
            </button>
          </div>
        </div>
      `;
    } else {
      html = `
        <div class="alias-result-card error">
          <h6>❌ Cliente non trovato</h6>
          <p><strong>Input:</strong> ${resolution.input}</p>
          <p>${resolution.message}</p>
          
          ${resolution.suggestions && resolution.suggestions.length > 0 ? `
            <p><strong>Suggerimenti:</strong></p>
            <ul>
              ${resolution.suggestions.map(s => `<li>${s}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `;
    }
    
    container.innerHTML = html;
  },
  
  /**
   * Mostra tutti gli alias di un cliente
   */
  showAllAliases: async function(clientName) {
    try {
      if (window.EnhancedAIAssistant && window.EnhancedAIAssistant.vocabolarioMiddleware) {
        const resolver = window.EnhancedAIAssistant.vocabolarioMiddleware.aliasResolver;
        const aliases = resolver.getClientAliases(clientName);
        
        let message = `Alias per "${clientName}":\n\n`;
        aliases.forEach(alias => {
          message += `• ${alias.alias} (${alias.tipo})\n`;
        });
        
        alert(message);
      }
    } catch (error) {
      console.error('❌ Errore visualizzazione alias:', error);
      this.showToast('Errore durante la visualizzazione', 'error');
    }
  },
  
  /**
   * Aggiunge nuovo alias
   */
  addNewAlias: async function() {
    const clientNameInput = document.getElementById('alias-client-name');
    const newAliasInput = document.getElementById('alias-new-alias');
    
    if (!clientNameInput || !newAliasInput) return;
    
    const clientName = clientNameInput.value.trim();
    const newAlias = newAliasInput.value.trim();
    
    if (!clientName || !newAlias) {
      this.showToast('Inserisci nome cliente e nuovo alias', 'error');
      return;
    }
    
    try {
      if (window.EnhancedAIAssistant && window.EnhancedAIAssistant.vocabolarioMiddleware) {
        const resolver = window.EnhancedAIAssistant.vocabolarioMiddleware.aliasResolver;
        
        // Prima trova il cliente
        const resolution = await resolver.resolveClientName(clientName);
        if (!resolution.found) {
          this.showToast('Cliente non trovato', 'error');
          return;
        }
        
        // Aggiungi alias
        const result = await resolver.addAlias(resolution.clientId, newAlias);
        
        if (result.success) {
          this.showToast('Alias aggiunto con successo!', 'success');
          clientNameInput.value = '';
          newAliasInput.value = '';
        } else {
          this.showToast(result.message, 'error');
        }
      } else {
        this.showToast('Sistema alias non disponibile', 'error');
      }
    } catch (error) {
      console.error('❌ Errore aggiunta alias:', error);
      this.showToast('Errore durante l\'aggiunta', 'error');
    }
  },
  
  /**
   * Mostra regole timeline
   */
  showTimelineRules: async function() {
    const display = document.getElementById('timeline-rules-display');
    if (!display) return;
    
    try {
      if (window.TimelineIntelligentManager) {
        // Crea istanza temporanea per ottenere le regole
        const manager = new TimelineIntelligentManager();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Aspetta caricamento
        
        const rules = manager.getRules();
        
        if (rules) {
          this.displayTimelineRules(rules, display);
          display.style.display = 'block';
        } else {
          display.innerHTML = '<p class="text-danger">Errore caricamento regole</p>';
          display.style.display = 'block';
        }
      } else {
        display.innerHTML = '<p class="text-warning">TimelineIntelligentManager non disponibile</p>';
        display.style.display = 'block';
      }
    } catch (error) {
      console.error('❌ Errore visualizzazione regole:', error);
      display.innerHTML = '<p class="text-danger">Errore visualizzazione regole</p>';
      display.style.display = 'block';
    }
  },
  
  /**
   * Visualizza le regole in formato leggibile
   */
  displayTimelineRules: function(rules, container) {
    let html = `
      <div class="rules-display-card">
        <h6>⏰ Orari di Lavoro</h6>
        <p><strong>Default:</strong> ${rules.orari_lavoro.default.inizio} - ${rules.orari_lavoro.default.fine}</p>
        <p><strong>Pausa pranzo:</strong> ${rules.orari_lavoro.pausa_pranzo.inizio} - ${rules.orari_lavoro.pausa_pranzo.fine}</p>
        
        <h6>📏 Durate Standard</h6>
        <p><strong>Appuntamento base:</strong> ${rules.durate_standard.appuntamento_base} minuti</p>
        <p><strong>Buffer minimo:</strong> ${rules.durate_standard.buffer_minimo} minuti</p>
        
        <h6>🚗 Gestione Spostamenti</h6>
        <p><strong>Tempo default se mancante:</strong> ${rules.regole_spostamenti.tempo_default_se_mancante} minuti</p>
        <p><strong>Avviso percorso mancante:</strong> ${rules.regole_spostamenti.avviso_percorso_mancante ? 'Sì' : 'No'}</p>
        
        <h6>⚖️ Vincoli Pianificazione</h6>
        <p><strong>Max appuntamenti/giorno:</strong> ${rules.vincoli_pianificazione.max_appuntamenti_giorno}</p>
        <p><strong>Max km/giorno:</strong> ${rules.vincoli_pianificazione.max_km_giorno}</p>
        
        <div class="rules-actions">
          <button class="btn btn-sm btn-warning" onclick="ComandiModule.editTimelineRules()">
            <i class="fas fa-edit"></i> Modifica Regole
          </button>
          <button class="btn btn-sm btn-success" onclick="ComandiModule.exportTimelineRules()">
            <i class="fas fa-download"></i> Esporta
          </button>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  },
  
  /**
   * Test del parser delle date
   */
  testDateParser: function() {
    if (window.DateNaturalParser) {
      const parser = new DateNaturalParser();
      parser.test();
      this.showToast('Test completato, verifica console', 'info');
    } else {
      this.showToast('DateNaturalParser non disponibile', 'error');
    }
  },
  
  /**
   * Ricarica regole timeline
   */
  reloadTimelineRules: async function() {
    try {
      if (window.TimelineIntelligentManager) {
        const manager = new TimelineIntelligentManager();
        await manager.loadRules();
        this.showToast('Regole ricaricate con successo!', 'success');
        
        // Aggiorna visualizzazione se aperta
        const display = document.getElementById('timeline-rules-display');
        if (display && display.style.display !== 'none') {
          await this.showTimelineRules();
        }
      }
    } catch (error) {
      console.error('❌ Errore ricaricamento regole:', error);
      this.showToast('Errore ricaricamento regole', 'error');
    }
  },
  
  /**
   * Modifica regole timeline (placeholder)
   */
  editTimelineRules: function() {
    alert('Funzionalità di modifica regole timeline in sviluppo.\\nPer ora modifica manualmente il file config/timeline-rules.json');
  },
  
  /**
   * Esporta regole timeline
   */
  exportTimelineRules: async function() {
    try {
      const response = await fetch('/config/timeline-rules.json');
      if (response.ok) {
        const rules = await response.json();
        const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timeline-rules.json';
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Regole esportate!', 'success');
      }
    } catch (error) {
      console.error('❌ Errore esportazione regole:', error);
      this.showToast('Errore esportazione regole', 'error');
    }
  },
  
  /**
   * Hook per quando si lascia il tab
   */
  onLeave: function() {
    console.log('📋 Leaving Comandi tab');
  }
};

// Export globale
window.ComandiModule = ComandiModule;

// Stili CSS per il modulo (aggiunti inline per semplicità)
const comandiModalStyle = document.createElement('style');
comandiModalStyle.textContent = `
  .comandi-container {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .comandi-header {
    margin-bottom: 30px;
  }
  
  .comandi-toolbar {
    margin-bottom: 20px;
    display: flex;
    gap: 10px;
  }
  
  .comandi-quick-add {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  
  .comandi-quick-add .form-row {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  
  .comandi-quick-add select {
    flex: 0 0 200px;
  }
  
  .comandi-quick-add input {
    flex: 1;
  }
  
  .vocabolario-editor {
    font-family: 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.6;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    resize: vertical;
  }
  
  .comandi-stats {
    margin-top: 20px;
    background: #e9ecef;
    padding: 20px;
    border-radius: 8px;
  }
  
  .comandi-stats ul {
    list-style: none;
    padding: 0;
  }
  
  .comandi-stats li {
    padding: 5px 0;
  }
  
  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); }
    to { transform: translateX(100%); }
  }
`;
document.head.appendChild(comandiModalStyle);

console.log('📋 Modulo Comandi caricato');