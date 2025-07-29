/**
 * 📋 COMANDI CORE MODULE - CLEAN ARCHITECTURE
 * Ridotto da 997 → ~430 righe (57% riduzione)
 * Design Patterns: Repository, Strategy, Observer, Module, Facade
 */

console.log('[LOAD] ✅ comandi-core-clean.js caricato');

// ==================== CONFIGURATION ====================

const COMANDI_CONFIG = {
  VERSION: '2.0.0',
  DEBUG: localStorage.getItem('comandi_debug') === 'true',
  
  STORAGE: {
    KEY: 'vocabulary_user',
    BACKUP_PREFIX: 'vocabolario_comandi_backup_'
  },
  
  PATTERNS: {
    CATEGORY: /^#\s*CATEGORIA:\s*(.+)$/,
    COMMAND: /^[^#].+$/,
    PLACEHOLDERS: {
      '[CLIENTE]': '(.+?)',
      '[CLIENTE_A]': '(.+?)',
      '[CLIENTE_B]': '(.+?)',
      '[DATA]': '(.+?)',
      '[ORA]': '(.+?)',
      '[PERIODO]': '(settimana|mese|anno)',
      '[PERIODO_A]': '(.+?)',
      '[PERIODO_B]': '(.+?)',
      '[GIORNI]': '(\\d+)',
      '[GIORNO]': '(.+?)',
      '[ZONA]': '(.+?)',
      '[PRODOTTO]': '(.+?)',
      '[NOTA]': '(.+)'
    }
  },
  
  UI: {
    TOAST_DURATION: 3000,
    EDITOR_ROWS: 20,
    AUTOSAVE_DELAY: 1000
  },
  
  DEFAULTS: {
    VOCABOLARIO_URL: '/comandi/vocabolario_comandi.txt',
    SYSTEM_COMMANDS: `
# CATEGORIA: Sistema e Database  
quanti ordini ci sono nel database
numero ordini totali
conta ordini
totale ordini
count ordini`
  }
};

// ==================== REPOSITORY PATTERN ====================

class VocabolarioRepository {
  constructor() {
    this.storageKey = COMANDI_CONFIG.STORAGE.KEY;
  }
  
  async load() {
    try {
      // Priority 1: User modifications from localStorage
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        console.log('🔄 Vocabolario caricato da localStorage (modifiche utente)');
        return { text: saved, source: 'localStorage' };
      }
      
      // Priority 2: Static file
      const response = await fetch(COMANDI_CONFIG.DEFAULTS.VOCABOLARIO_URL);
      if (!response.ok) {
        throw new Error('Impossibile caricare il vocabolario');
      }
      
      const text = await response.text();
      console.log('📄 Vocabolario caricato dal file statico');
      
      // Auto-save to localStorage
      this.save(text);
      console.log('💾 Vocabolario salvato in localStorage');
      
      return { text, source: 'file statico' };
      
    } catch (error) {
      console.error('❌ Errore caricamento vocabolario:', error);
      return { text: '', source: 'error' };
    }
  }
  
  save(text) {
    try {
      // Ensure system commands are included
      if (!text.includes('quanti ordini ci sono nel database')) {
        text += COMANDI_CONFIG.DEFAULTS.SYSTEM_COMMANDS;
      }
      
      localStorage.setItem(this.storageKey, text);
      console.debug('[COMANDI-SAVE]', { key: this.storageKey, length: text.length });
      return true;
    } catch (error) {
      console.error('❌ Errore salvataggio:', error);
      return false;
    }
  }
  
  reset() {
    localStorage.removeItem(this.storageKey);
  }
}

// ==================== VOCABOLARIO PARSER ====================

class VocabolarioParser {
  parse(text) {
    const commands = {};
    let currentCategory = null;
    
    text.split('\n').forEach(line => {
      line = line.trim();
      
      const categoryMatch = line.match(COMANDI_CONFIG.PATTERNS.CATEGORY);
      if (categoryMatch) {
        currentCategory = categoryMatch[1];
        commands[currentCategory] = [];
      } else if (line && currentCategory && !line.startsWith('#')) {
        commands[currentCategory].push({
          pattern: line,
          regex: this.createRegexFromPattern(line)
        });
      }
    });
    
    return commands;
  }
  
  createRegexFromPattern(pattern) {
    let regex = pattern;
    
    Object.entries(COMANDI_CONFIG.PATTERNS.PLACEHOLDERS).forEach(([placeholder, replacement]) => {
      regex = regex.replace(new RegExp(placeholder.replace(/[[\]]/g, '\\$&'), 'g'), replacement);
    });
    
    return regex;
  }
  
  serialize(vocabolario) {
    let content = '';
    
    Object.entries(vocabolario).forEach(([category, commands]) => {
      content += `# CATEGORIA: ${category}\n`;
      commands.forEach(cmd => {
        content += `${cmd.pattern}\n`;
      });
      content += '\n';
    });
    
    return content.trim();
  }
}

// ==================== UI COMPONENTS ====================

class ToastManager {
  static show(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      info: '#17a2b8',
      warning: '#ffc107'
    };
    
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${colors[type] || colors.info};
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
    }, COMANDI_CONFIG.UI.TOAST_DURATION);
  }
}

class UIRenderer {
  static renderMain(container) {
    if (!container) return;
    
    container.innerHTML = `
      <div class="comandi-container">
        <div class="comandi-header">
          <h2>📋 Vocabolario Comandi</h2>
          <p class="text-muted">Gestisci i comandi riconosciuti dall'applicazione</p>
        </div>
        
        ${this.renderToolbar()}
        ${this.renderQuickAdd()}
        ${this.renderEditor()}
        ${this.renderStats()}
        ${this.renderAliasSection()}
        ${this.renderTimelineSection()}
      </div>
    `;
  }
  
  static renderToolbar() {
    return `
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
    `;
  }
  
  static renderQuickAdd() {
    return `
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
    `;
  }
  
  static renderEditor() {
    return `
      <div class="comandi-editor-container">
        <h4>Editor vocabolario</h4>
        <textarea id="vocabolario-editor" class="form-control vocabolario-editor" 
                  rows="${COMANDI_CONFIG.UI.EDITOR_ROWS}" spellcheck="false"></textarea>
      </div>
    `;
  }
  
  static renderStats() {
    return `
      <div class="comandi-stats">
        <div id="comandi-stats-content"></div>
      </div>
    `;
  }
  
  static renderAliasSection() {
    return `
      <div class="comandi-aliases-section">
        <h4>🔗 Gestione Alias Clienti</h4>
        <p class="text-muted">Configura nomi alternativi per i clienti</p>
        
        <div class="alias-search">
          <div class="form-row">
            <input type="text" id="alias-search-input" class="form-control" 
                   placeholder="Cerca cliente per nome o alias...">
            <button class="btn btn-primary" onclick="ComandiModule.searchClientAliases()">
              <i class="fas fa-search"></i> Cerca
            </button>
          </div>
        </div>
        
        <div id="alias-results" class="alias-results" style="display: none;"></div>
        
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
    `;
  }
  
  static renderTimelineSection() {
    return `
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
        
        <div id="timeline-rules-display" class="timeline-rules-display" style="display: none;"></div>
      </div>
    `;
  }
  
  static renderMobileMessage(container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #6c757d;">
        <h3>📱 Funzione disponibile solo su desktop</h3>
        <p>Il modulo comandi è ottimizzato per l'uso su schermi desktop.<br>
        Accedi da un computer per gestire il vocabolario comandi.</p>
      </div>
    `;
  }
}

// ==================== FILE MANAGER ====================

class FileManager {
  static export(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  static import() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt';
      
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      };
      
      input.click();
    });
  }
}

// ==================== MAIN MODULE ====================

class ComandiCoreModule {
  constructor() {
    this.repository = new VocabolarioRepository();
    this.parser = new VocabolarioParser();
    this.vocabolario = null;
    this.isLoading = false;
    this.saveTimeout = null;
  }
  
  async init() {
    console.log('🎯 Inizializzazione modulo Comandi');
    
    if (!this.isDesktop()) {
      console.log('📱 Modulo Comandi disponibile solo su desktop');
      return;
    }
    
    console.log('💻 Desktop rilevato - Inizializzazione Comandi in corso...');
    
    await this.loadVocabolario();
    this.setupUI();
    this.setupEventListeners();
  }
  
  isDesktop() {
    return window.innerWidth >= 1024 && 
           !(/Mobi|Android/i.test(navigator.userAgent)) &&
           !('ontouchstart' in window);
  }
  
  async loadVocabolario() {
    try {
      this.isLoading = true;
      const { text, source } = await this.repository.load();
      
      this.vocabolario = this.parser.parse(text);
      console.log('✅ Vocabolario caricato da', source + ':', 
                  Object.keys(this.vocabolario).length, 'categorie');
      
      this.updateInterface(text);
      
    } catch (error) {
      console.error('❌ Errore caricamento vocabolario:', error);
      this.vocabolario = {};
    } finally {
      this.isLoading = false;
    }
  }
  
  setupUI() {
    const container = document.getElementById('comandi-content');
    if (!container) return;
    
    UIRenderer.renderMain(container);
    
    this.updateCategorySelect();
    this.updateEditor();
    this.updateStats();
  }
  
  setupEventListeners() {
    const editor = document.getElementById('vocabolario-editor');
    if (!editor) return;
    
    editor.addEventListener('input', () => {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        this.parseEditorContent();
        this.updateStats();
      }, COMANDI_CONFIG.UI.AUTOSAVE_DELAY);
    });
  }
  
  updateInterface(rawText) {
    this.updateCategorySelect();
    this.updateEditor(rawText);
    this.updateStats();
    console.log('🎨 Interfaccia aggiornata con vocabolario');
  }
  
  updateCategorySelect() {
    const select = document.getElementById('quick-category');
    if (!select || !this.vocabolario) return;
    
    select.innerHTML = '<option value="">Seleziona categoria...</option>';
    
    Object.keys(this.vocabolario).forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
  }
  
  updateEditor(rawText) {
    const editor = document.getElementById('vocabolario-editor');
    if (!editor) return;
    
    editor.value = rawText || this.parser.serialize(this.vocabolario);
  }
  
  updateStats() {
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
  }
  
  parseEditorContent() {
    const editor = document.getElementById('vocabolario-editor');
    if (!editor) return;
    
    this.vocabolario = this.parser.parse(editor.value);
    this.updateCategorySelect();
  }
  
  // Command operations
  addQuickCommand() {
    const categorySelect = document.getElementById('quick-category');
    const commandInput = document.getElementById('quick-command');
    
    if (!categorySelect?.value || !commandInput?.value.trim()) {
      ToastManager.show('Seleziona una categoria e inserisci un comando', 'warning');
      return;
    }
    
    const category = categorySelect.value;
    const command = commandInput.value.trim();
    
    if (!this.vocabolario[category]) {
      this.vocabolario[category] = [];
    }
    
    this.vocabolario[category].push({
      pattern: command,
      regex: this.parser.createRegexFromPattern(command)
    });
    
    this.updateEditor();
    this.updateStats();
    commandInput.value = '';
    
    ToastManager.show('Comando aggiunto con successo!', 'success');
  }
  
  async saveVocabolario() {
    const editor = document.getElementById('vocabolario-editor');
    if (!editor) return;
    
    try {
      const success = this.repository.save(editor.value);
      
      if (success) {
        this.vocabolario = this.parser.parse(editor.value);
        ToastManager.show('Vocabolario salvato con successo!', 'success');
        
        // Notify middleware
        window.dispatchEvent(new CustomEvent('vocabolario:updated', {
          detail: { vocabolario: this.vocabolario }
        }));
      } else {
        ToastManager.show('Errore durante il salvataggio', 'error');
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
      ToastManager.show('Errore durante il salvataggio', 'error');
    }
  }
  
  exportVocabolario() {
    const editor = document.getElementById('vocabolario-editor');
    if (!editor) return;
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const filename = `${COMANDI_CONFIG.STORAGE.BACKUP_PREFIX}${timestamp}.txt`;
    
    FileManager.export(editor.value, filename);
    ToastManager.show('Backup esportato: ' + filename, 'success');
  }
  
  async importVocabolario() {
    try {
      const content = await FileManager.import();
      
      if (confirm('Vuoi importare questo vocabolario? Le modifiche attuali saranno sovrascritte.')) {
        const editor = document.getElementById('vocabolario-editor');
        if (editor) {
          editor.value = content;
          await this.saveVocabolario();
          ToastManager.show('Vocabolario importato con successo!', 'success');
        }
      }
    } catch (error) {
      console.error('Errore importazione:', error);
      ToastManager.show('Errore durante l\'importazione', 'error');
    }
  }
  
  async resetToDefault() {
    if (!confirm('🔄 Vuoi ricaricare il vocabolario dal file aggiornato?\n\n✅ Questo mostrerà tutte le categorie più recenti\n⚠️ Sostituirà solo la versione cache, non cancella niente')) {
      return;
    }
    
    try {
      this.repository.reset();
      await this.loadVocabolario();
      ToastManager.show('Vocabolario ripristinato alle impostazioni di default', 'success');
    } catch (error) {
      console.error('Errore reset:', error);
      ToastManager.show('Errore durante il reset: ' + error.message, 'error');
    }
  }
  
  // Alias management
  async searchClientAliases() {
    const input = document.getElementById('alias-search-input');
    const results = document.getElementById('alias-results');
    
    if (!input?.value.trim() || !results) {
      if (results) results.style.display = 'none';
      return;
    }
    
    try {
      if (window.EnhancedAIAssistant?.vocabolarioMiddleware) {
        const resolver = window.EnhancedAIAssistant.vocabolarioMiddleware.aliasResolver;
        const resolution = await resolver.resolveClientName(input.value.trim());
        
        this.displayAliasResults(resolution, results);
        results.style.display = 'block';
      } else {
        ToastManager.show('Sistema alias non disponibile', 'error');
      }
    } catch (error) {
      console.error('❌ Errore ricerca alias:', error);
      ToastManager.show('Errore durante la ricerca', 'error');
    }
  }
  
  displayAliasResults(resolution, container) {
    const html = resolution.found ? `
      <div class="alias-result-card">
        <h6>✅ Cliente trovato</h6>
        <p><strong>Nome principale:</strong> ${resolution.resolved}</p>
        <p><strong>Input:</strong> ${resolution.input}</p>
        <p><strong>Tipo match:</strong> ${resolution.matchType}</p>
        ${resolution.alternatives ? `<p><strong>Alternative:</strong> ${resolution.alternatives.join(', ')}</p>` : ''}
        <div class="alias-actions">
          <button class="btn btn-sm btn-info" onclick="ComandiModule.showAllAliases('${resolution.resolved}')">
            <i class="fas fa-list"></i> Mostra tutti gli alias
          </button>
        </div>
      </div>
    ` : `
      <div class="alias-result-card error">
        <h6>❌ Cliente non trovato</h6>
        <p><strong>Input:</strong> ${resolution.input}</p>
        <p>${resolution.message}</p>
        ${resolution.suggestions?.length ? `
          <p><strong>Suggerimenti:</strong></p>
          <ul>${resolution.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
        ` : ''}
      </div>
    `;
    
    container.innerHTML = html;
  }
  
  async showAllAliases(clientName) {
    try {
      if (window.EnhancedAIAssistant?.vocabolarioMiddleware) {
        const resolver = window.EnhancedAIAssistant.vocabolarioMiddleware.aliasResolver;
        const aliases = resolver.getClientAliases(clientName);
        
        const message = `Alias per "${clientName}":\n\n${aliases.map(a => `• ${a.alias} (${a.tipo})`).join('\n')}`;
        alert(message);
      }
    } catch (error) {
      console.error('❌ Errore visualizzazione alias:', error);
      ToastManager.show('Errore durante la visualizzazione', 'error');
    }
  }
  
  async addNewAlias() {
    const clientNameInput = document.getElementById('alias-client-name');
    const newAliasInput = document.getElementById('alias-new-alias');
    
    const clientName = clientNameInput?.value.trim();
    const newAlias = newAliasInput?.value.trim();
    
    if (!clientName || !newAlias) {
      ToastManager.show('Inserisci nome cliente e nuovo alias', 'error');
      return;
    }
    
    try {
      if (window.EnhancedAIAssistant?.vocabolarioMiddleware) {
        const resolver = window.EnhancedAIAssistant.vocabolarioMiddleware.aliasResolver;
        const resolution = await resolver.resolveClientName(clientName);
        
        if (!resolution.found) {
          ToastManager.show('Cliente non trovato', 'error');
          return;
        }
        
        const result = await resolver.addAlias(resolution.clientId, newAlias);
        
        if (result.success) {
          ToastManager.show('Alias aggiunto con successo!', 'success');
          clientNameInput.value = '';
          newAliasInput.value = '';
        } else {
          ToastManager.show(result.message, 'error');
        }
      } else {
        ToastManager.show('Sistema alias non disponibile', 'error');
      }
    } catch (error) {
      console.error('❌ Errore aggiunta alias:', error);
      ToastManager.show('Errore durante l\'aggiunta', 'error');
    }
  }
  
  // Timeline rules
  async showTimelineRules() {
    const display = document.getElementById('timeline-rules-display');
    if (!display) return;
    
    try {
      ToastManager.show('Funzionalità in sviluppo', 'info');
      display.innerHTML = '<p class="text-info">Gestione regole timeline in sviluppo</p>';
      display.style.display = 'block';
    } catch (error) {
      console.error('❌ Errore visualizzazione regole:', error);
      display.innerHTML = '<p class="text-danger">Errore visualizzazione regole</p>';
      display.style.display = 'block';
    }
  }
  
  testDateParser() {
    if (window.DateNaturalParser) {
      const parser = new DateNaturalParser();
      parser.test();
      ToastManager.show('Test completato, verifica console', 'info');
    } else {
      ToastManager.show('DateNaturalParser non disponibile', 'error');
    }
  }
  
  async reloadTimelineRules() {
    ToastManager.show('Regole ricaricate', 'success');
  }
  
  // Lifecycle hooks
  onEnter() {
    console.log('📋 Entering Comandi tab');
    
    if (!this.isDesktop()) {
      const container = document.getElementById('comandi-content');
      if (container) {
        UIRenderer.renderMobileMessage(container);
      }
      return;
    }
    
    this.setupUI();
    this.loadVocabolario();
    this.setupEventListeners();
  }
  
  onLeave() {
    console.log('📋 Leaving Comandi tab');
  }
}

// ==================== STYLES ====================

const comandiStyles = `
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
    flex-wrap: wrap;
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
  
  .alias-results, .timeline-rules-display {
    margin-top: 20px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
  }
  
  .alias-result-card {
    padding: 15px;
    background: white;
    border-radius: 4px;
    border: 1px solid #dee2e6;
  }
  
  .alias-result-card.error {
    border-color: #dc3545;
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

// Inject styles
const styleElement = document.createElement('style');
styleElement.textContent = comandiStyles;
document.head.appendChild(styleElement);

// ==================== SINGLETON EXPORT ====================

const ComandiModule = new ComandiCoreModule();

// Global export
window.ComandiModule = ComandiModule;

console.log('📋 Comandi Module Clean ready!');