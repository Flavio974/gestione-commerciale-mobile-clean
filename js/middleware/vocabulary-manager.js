/**
 * 🔤 VOCABULARY MANAGER - CLEAN ARCHITECTURE
 * Ridotto da 2822 → ~700 righe (75% riduzione)
 * Design Patterns: Strategy, Observer, Singleton, Repository
 */

console.log('[LOAD] ✅ vocabulary-manager-clean.js caricato');

// ==================== CONFIGURATION ====================

const VOCABULARY_CONFIG = {
  DEBUG: localStorage.getItem('vocabulary_debug') === 'true',
  VERSION: '3.0.0',
  
  PATHS: {
    JSON: 'js/middleware/vocabulary.json',
    TXT: '/comandi/vocabolario_comandi.txt',
    USER_STORAGE_KEY: 'vocabulary_user'
  },
  
  SYNC: {
    DEBOUNCE_DELAY: 500,
    POLLING_INTERVAL: 2000,
    MAX_RETRIES: 3,
    CACHE_TIMEOUT: 300000 // 5 minutes
  },
  
  MATCHING: {
    SIMILARITY_THRESHOLD: 0.30,
    MAX_DISTANCE: 3,
    FUZZY_MATCH_ENABLED: true
  },
  
  EDITOR_SELECTORS: [
    '[id*="commands"]',
    '[class*="editor"]',
    'textarea[class*="command"]',
    '#vocabulary-editor',
    '.commands-textarea'
  ]
};

// ==================== UTILITY CLASSES ====================

class VocabularyLogger {
  static log(level, message, data = {}) {
    if (!VOCABULARY_CONFIG.DEBUG && level === 'debug') return;
    
    const prefix = `[VOCAB-${level.toUpperCase()}]`;
    const logMethod = level === 'error' ? console.error : console.log;
    logMethod(prefix, message, data);
  }
}

class TextNormalizer {
  static normalize(text) {
    if (!text) return '';
    
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\sàèéìòù]/g, '')
      .replace(/\s+/g, ' ');
  }
  
  static extractPlaceholders(pattern) {
    const placeholders = [];
    const regex = /\[([^\]]+)\]/g;
    let match;
    
    while ((match = regex.exec(pattern)) !== null) {
      placeholders.push({
        full: match[0],
        name: match[1].toUpperCase(),
        position: match.index
      });
    }
    
    return placeholders;
  }
  
  static replacePlaceholders(pattern, values) {
    let result = pattern;
    
    Object.entries(values).forEach(([key, value]) => {
      const placeholder = `[${key}]`;
      const regex = new RegExp(placeholder.replace(/[[\]]/g, '\\$&'), 'gi');
      result = result.replace(regex, value);
    });
    
    return result;
  }
}

class SimilarityCalculator {
  static calculate(str1, str2) {
    const s1 = TextNormalizer.normalize(str1);
    const s2 = TextNormalizer.normalize(str2);
    
    if (s1 === s2) return 1.0;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  static levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

// ==================== REPOSITORY PATTERN ====================

class VocabularyRepository {
  constructor() {
    this.cache = new Map();
    this.lastModified = null;
  }
  
  async loadFromJSON() {
    try {
      const timestamp = Date.now();
      const url = `${VOCABULARY_CONFIG.PATHS.JSON}?t=${timestamp}`;
      
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      this.lastModified = response.headers.get('Last-Modified');
      
      return this.parseVocabularyData(data);
      
    } catch (error) {
      VocabularyLogger.log('error', 'Failed to load JSON vocabulary', error);
      throw error;
    }
  }
  
  async loadFromTXT() {
    try {
      const response = await fetch(VOCABULARY_CONFIG.PATHS.TXT);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      return this.parseTxtCommands(text);
      
    } catch (error) {
      VocabularyLogger.log('warn', 'Failed to load TXT vocabulary', error);
      return [];
    }
  }
  
  loadUserCommands() {
    try {
      const stored = localStorage.getItem(VOCABULARY_CONFIG.PATHS.USER_STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
      
    } catch (error) {
      VocabularyLogger.log('error', 'Failed to load user commands', error);
      return [];
    }
  }
  
  saveUserCommands(commands) {
    try {
      localStorage.setItem(
        VOCABULARY_CONFIG.PATHS.USER_STORAGE_KEY,
        JSON.stringify(commands)
      );
      return true;
    } catch (error) {
      VocabularyLogger.log('error', 'Failed to save user commands', error);
      return false;
    }
  }
  
  parseVocabularyData(data) {
    const commands = [];
    
    // Support v2.0 categorized format
    if (data.categories) {
      Object.values(data.categories).forEach(category => {
        if (category.patterns) {
          commands.push(...category.patterns);
        }
      });
    }
    // Support v1.x legacy format
    else if (data.commands) {
      commands.push(...data.commands);
    }
    
    return commands;
  }
  
  parseTxtCommands(text) {
    const commands = [];
    const lines = text.split('\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      
      const parts = trimmed.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        commands.push({
          id: `txt_${index}`,
          pattern: parts[0],
          action: parts[1],
          description: parts[2],
          source: 'txt'
        });
      }
    });
    
    return commands;
  }
}

// ==================== STRATEGY PATTERN: MATCHERS ====================

class BaseMatcher {
  match(input, command) {
    throw new Error('match() must be implemented');
  }
}

class ExactMatcher extends BaseMatcher {
  match(input, command) {
    const normalized = TextNormalizer.normalize(input);
    const pattern = TextNormalizer.normalize(command.pattern);
    
    if (normalized === pattern) {
      return {
        score: 1.0,
        type: 'exact',
        command,
        params: {}
      };
    }
    
    return null;
  }
}

class PlaceholderMatcher extends BaseMatcher {
  match(input, command) {
    if (!command.pattern.includes('[')) return null;
    
    const placeholders = TextNormalizer.extractPlaceholders(command.pattern);
    if (placeholders.length === 0) return null;
    
    let regexPattern = command.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const params = {};
    
    placeholders.forEach(placeholder => {
      const captureGroup = placeholder.name === 'CLIENTE' ? '([A-Za-zÀ-ÿ\\s\\-\'\.]+?)' : '(.+?)';
      regexPattern = regexPattern.replace(
        placeholder.full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        captureGroup
      );
    });
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    const match = input.match(regex);
    
    if (match) {
      placeholders.forEach((placeholder, index) => {
        params[placeholder.name] = match[index + 1]?.trim();
      });
      
      return {
        score: 0.9,
        type: 'placeholder',
        command,
        params
      };
    }
    
    return null;
  }
}

class FuzzyMatcher extends BaseMatcher {
  match(input, command) {
    const similarity = SimilarityCalculator.calculate(input, command.pattern);
    
    if (similarity >= VOCABULARY_CONFIG.MATCHING.SIMILARITY_THRESHOLD) {
      return {
        score: similarity,
        type: 'fuzzy',
        command,
        params: {}
      };
    }
    
    return null;
  }
}

class MatchingStrategy {
  constructor() {
    this.matchers = [
      new ExactMatcher(),
      new PlaceholderMatcher(),
      new FuzzyMatcher()
    ];
  }
  
  findBestMatch(input, commands) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const command of commands) {
      for (const matcher of this.matchers) {
        const result = matcher.match(input, command);
        
        if (result && result.score > bestScore) {
          bestMatch = result;
          bestScore = result.score;
          
          // Exit early on perfect match
          if (bestScore === 1.0) {
            return bestMatch;
          }
        }
      }
    }
    
    return bestMatch;
  }
}

// ==================== OBSERVER PATTERN: SYNC MANAGER ====================

class VocabularySyncManager {
  constructor() {
    this.observers = new Set();
    this.syncInterval = null;
    this.lastSignature = null;
  }
  
  addObserver(callback) {
    this.observers.add(callback);
  }
  
  removeObserver(callback) {
    this.observers.delete(callback);
  }
  
  notifyObservers(event, data) {
    this.observers.forEach(callback => callback(event, data));
  }
  
  startSync(repository) {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(async () => {
      try {
        const currentSignature = this.getSignature(repository);
        
        if (currentSignature !== this.lastSignature) {
          this.lastSignature = currentSignature;
          this.notifyObservers('vocabulary-changed', { signature: currentSignature });
        }
      } catch (error) {
        VocabularyLogger.log('error', 'Sync check failed', error);
      }
    }, VOCABULARY_CONFIG.SYNC.POLLING_INTERVAL);
  }
  
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  getSignature(repository) {
    const userCommands = repository.loadUserCommands();
    return JSON.stringify(userCommands).length + '_' + repository.lastModified;
  }
  
  setupEventListeners() {
    // Listen for storage events
    window.addEventListener('storage', (e) => {
      if (e.key === VOCABULARY_CONFIG.PATHS.USER_STORAGE_KEY) {
        this.notifyObservers('user-commands-changed', { newValue: e.newValue });
      }
    });
    
    // Listen for editor changes
    VOCABULARY_CONFIG.EDITOR_SELECTORS.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.addEventListener('change', () => {
          this.notifyObservers('editor-changed', { selector });
        });
      }
    });
  }
}

// ==================== MAIN VOCABULARY MANAGER CLASS ====================

class VocabularyManagerClean {
  constructor() {
    this.repository = new VocabularyRepository();
    this.matchingStrategy = new MatchingStrategy();
    this.syncManager = new VocabularySyncManager();
    
    this.masterVocabulary = [];
    this.userVocabulary = [];
    this.systemVocabulary = [];
    
    this.cache = new Map();
    this.isInitialized = false;
    
    VocabularyLogger.log('info', 'VocabularyManager Clean initialized');
  }
  
  async init() {
    if (this.isInitialized) return;
    
    try {
      // Load all vocabularies
      await this.loadAllVocabularies();
      
      // Setup sync
      this.syncManager.addObserver((event, data) => {
        this.handleSyncEvent(event, data);
      });
      
      this.syncManager.setupEventListeners();
      this.syncManager.startSync(this.repository);
      
      this.isInitialized = true;
      
      VocabularyLogger.log('info', 'VocabularyManager ready', {
        total: this.masterVocabulary.length,
        user: this.userVocabulary.length,
        system: this.systemVocabulary.length
      });
      
      return true;
      
    } catch (error) {
      VocabularyLogger.log('error', 'Initialization failed', error);
      return false;
    }
  }
  
  async loadAllVocabularies(forceReload = false) {
    try {
      // Clear cache on force reload
      if (forceReload) {
        this.cache.clear();
      }
      
      // Load system vocabulary
      const [jsonCommands, txtCommands] = await Promise.all([
        this.repository.loadFromJSON(),
        this.repository.loadFromTXT()
      ]);
      
      this.systemVocabulary = [...jsonCommands, ...txtCommands];
      
      // Load user vocabulary
      this.userVocabulary = this.repository.loadUserCommands();
      
      // Create master vocabulary (user commands have priority)
      this.masterVocabulary = [...this.userVocabulary, ...this.systemVocabulary];
      
      VocabularyLogger.log('debug', 'Vocabularies loaded', {
        system: this.systemVocabulary.length,
        user: this.userVocabulary.length,
        master: this.masterVocabulary.length
      });
      
      return this.masterVocabulary;
      
    } catch (error) {
      VocabularyLogger.log('error', 'Failed to load vocabularies', error);
      
      // Fallback to cached or empty
      if (this.masterVocabulary.length > 0) {
        return this.masterVocabulary;
      }
      
      return this.getBasicVocabulary();
    }
  }
  
  async findMatch(userInput) {
    if (!userInput || typeof userInput !== 'string') {
      return null;
    }
    
    // Initialize if needed
    if (!this.isInitialized) {
      await this.init();
    }
    
    const normalizedInput = TextNormalizer.normalize(userInput);
    const cacheKey = `match_${normalizedInput}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < VOCABULARY_CONFIG.SYNC.CACHE_TIMEOUT) {
        VocabularyLogger.log('debug', 'Cache hit', { input: userInput });
        return cached.result;
      }
    }
    
    // Find best match
    const match = this.matchingStrategy.findBestMatch(userInput, this.masterVocabulary);
    
    if (match) {
      VocabularyLogger.log('debug', 'Match found', {
        input: userInput,
        pattern: match.command.pattern,
        score: match.score,
        type: match.type
      });
      
      // Cache result
      this.cache.set(cacheKey, {
        result: match,
        timestamp: Date.now()
      });
      
      return match;
    }
    
    VocabularyLogger.log('debug', 'No match found', { input: userInput });
    
    // Cache negative result too
    this.cache.set(cacheKey, {
      result: null,
      timestamp: Date.now()
    });
    
    return null;
  }
  
  async addCommand(command) {
    if (!command || !command.pattern || !command.action) {
      throw new Error('Invalid command format');
    }
    
    // Add ID if missing
    if (!command.id) {
      command.id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Add to user vocabulary
    this.userVocabulary.push(command);
    
    // Save to storage
    const saved = this.repository.saveUserCommands(this.userVocabulary);
    
    if (saved) {
      // Reload vocabularies
      await this.loadAllVocabularies(true);
      
      VocabularyLogger.log('info', 'Command added', { command });
      return command;
    }
    
    throw new Error('Failed to save command');
  }
  
  async removeCommand(commandId) {
    const index = this.userVocabulary.findIndex(cmd => cmd.id === commandId);
    
    if (index === -1) {
      throw new Error('Command not found');
    }
    
    // Remove from array
    const removed = this.userVocabulary.splice(index, 1)[0];
    
    // Save to storage
    const saved = this.repository.saveUserCommands(this.userVocabulary);
    
    if (saved) {
      // Reload vocabularies
      await this.loadAllVocabularies(true);
      
      VocabularyLogger.log('info', 'Command removed', { command: removed });
      return removed;
    }
    
    throw new Error('Failed to remove command');
  }
  
  handleSyncEvent(event, data) {
    VocabularyLogger.log('debug', 'Sync event', { event, data });
    
    switch (event) {
      case 'vocabulary-changed':
      case 'user-commands-changed':
      case 'editor-changed':
        // Reload vocabularies
        this.loadAllVocabularies(true);
        break;
    }
  }
  
  getBasicVocabulary() {
    return [
      {
        id: 'basic_help',
        pattern: 'aiuto',
        action: 'help',
        description: 'Mostra aiuto'
      },
      {
        id: 'basic_status',
        pattern: 'stato sistema',
        action: 'system_info',
        params: { type: 'status' }
      }
    ];
  }
  
  // Public API methods for compatibility
  async loadVocabulary(forceReload = false) {
    await this.loadAllVocabularies(forceReload);
    return {
      commands: this.masterVocabulary,
      version: VOCABULARY_CONFIG.VERSION,
      settings: {
        enableDebug: VOCABULARY_CONFIG.DEBUG,
        similarityThreshold: VOCABULARY_CONFIG.MATCHING.SIMILARITY_THRESHOLD
      }
    };
  }
  
  normalizeText(text) {
    return TextNormalizer.normalize(text);
  }
  
  calculateSimilarity(str1, str2) {
    return SimilarityCalculator.calculate(str1, str2);
  }
  
  extractParameters(pattern, input) {
    const matcher = new PlaceholderMatcher();
    const dummyCommand = { pattern };
    const result = matcher.match(input, dummyCommand);
    return result ? result.params : {};
  }
}

// ==================== SINGLETON EXPORT ====================

// Create singleton instance
let vocabularyManagerInstance = null;

window.VocabularyManagerClean = VocabularyManagerClean;
window.VocabularyManager = VocabularyManagerClean; // Compatibility alias

window.getVocabularyManager = function() {
  if (!vocabularyManagerInstance) {
    vocabularyManagerInstance = new VocabularyManagerClean();
    vocabularyManagerInstance.init();
  }
  return vocabularyManagerInstance;
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.getVocabularyManager();
  });
} else {
  window.getVocabularyManager();
}

// Export debug utilities
window.VocabularyDebug = {
  enableDebug: () => {
    localStorage.setItem('vocabulary_debug', 'true');
    console.log('Vocabulary debug enabled');
  },
  disableDebug: () => {
    localStorage.removeItem('vocabulary_debug');
    console.log('Vocabulary debug disabled');
  },
  getStats: () => {
    const manager = window.getVocabularyManager();
    return {
      isInitialized: manager.isInitialized,
      masterCount: manager.masterVocabulary.length,
      userCount: manager.userVocabulary.length,
      systemCount: manager.systemVocabulary.length,
      cacheSize: manager.cache.size
    };
  },
  clearCache: () => {
    const manager = window.getVocabularyManager();
    manager.cache.clear();
    console.log('Vocabulary cache cleared');
  }
};

VocabularyLogger.log('info', '🔤 VocabularyManager Clean ready!');