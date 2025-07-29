/**
 * Smart Commercial Assistant - Optimized Version
 * Ridotto da 4837 → ~800 righe (83% riduzione)
 * Architettura modulare con Dependency Injection Pattern
 */

// Configurazione centralizzata
const SMART_ASSISTANT_CONFIG = {
  DEBUG: true,
  
  // API Endpoints
  API: {
    SPEECH_TO_TEXT: '/.netlify/functions/speech-to-text',
    FALLBACK: 'http://localhost:3000',
    TIMEOUT: 30000
  },
  
  // Device Configuration
  IPAD: {
    USE_SERVER_TRANSCRIPTION: true,
    ENABLE_MOCK_RESPONSES: false,
    REDUCED_TIMEOUT: 30000
  },
  
  // Audio Settings
  AUDIO: {
    SAMPLE_RATE: 16000,
    CHANNELS: 1,
    FORMAT: 'webm',
    MAX_DURATION: 300000 // 5 minuti
  },
  
  // UI Constants
  UI: {
    RECORDING_COLOR: '#dc3545',
    SUCCESS_COLOR: '#28a745',
    WARNING_COLOR: '#ffc107',
    ANIMATION_DURATION: 300
  },
  
  // Storage Keys
  STORAGE: {
    VOICE_NOTES: 'smart_assistant_voice_notes',
    TASKS: 'smart_assistant_tasks',
    KPI_CACHE: 'smart_assistant_kpi_cache',
    SETTINGS: 'smart_assistant_settings'
  }
};

// Utility Functions centrali
const SmartAssistantUtils = {
  // Device detection
  isIPad() {
    return /iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
  },
  
  // Date utilities
  formatDate(date) {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  },
  
  // Storage utilities
  saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Storage error:', error);
      return false;
    }
  },
  
  loadFromStorage(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error('Storage load error:', error);
      return defaultValue;
    }
  },
  
  // Validation utilities
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  
  isValidPhone(phone) {
    return /^[\+]?[0-9\s\-\(\)]{8,}$/.test(phone);
  },
  
  // Text processing
  cleanText(text) {
    return text ? text.trim().replace(/\s+/g, ' ') : '';
  },
  
  // Extract entities from text
  extractEntities(text) {
    const emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
    const phones = text.match(/[\+]?[0-9\s\-\(\)]{8,}/g) || [];
    const companies = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:S\.?R\.?L\.?|S\.?P\.?A\.?|S\.?R\.?L\.?S\.?))/g) || [];
    
    return { emails, phones, companies };
  },
  
  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },
  
  // Debounce function
  debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }
};

// Voice Recognition Module
class VoiceRecognition {
  constructor(config = {}) {
    this.config = { ...SMART_ASSISTANT_CONFIG.AUDIO, ...config };
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recognition = null;
    this.currentAudio = null;
    
    this.setupWebSpeechAPI();
  }
  
  setupWebSpeechAPI() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'it-IT';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }
  }
  
  async startRecording() {
    if (this.isRecording) return false;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.config.SAMPLE_RATE,
          channelCount: this.config.CHANNELS,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: `audio/${this.config.FORMAT}`
      });
      
      this.audioChunks = [];
      this.isRecording = true;
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.start();
      
      // Auto-stop dopo durata massima
      setTimeout(() => {
        if (this.isRecording) {
          this.stopRecording();
        }
      }, this.config.MAX_DURATION);
      
      return true;
    } catch (error) {
      console.error('Recording start error:', error);
      return false;
    }
  }
  
  async stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return null;
    
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: `audio/${this.config.FORMAT}` });
        this.cleanup();
        resolve(audioBlob);
      };
      
      this.mediaRecorder.stop();
      this.mediaRecorder.stream?.getTracks().forEach(track => track.stop());
    });
  }
  
  async transcribeAudio(audioBlob) {
    // Prova prima Web Speech API (più veloce)
    if (this.recognition && audioBlob.size < 1024 * 1024) { // < 1MB
      try {
        return await this.transcribeWithWebSpeech(audioBlob);
      } catch (error) {
        console.warn('Web Speech API fallito, uso server transcription');
      }
    }
    
    // Fallback a server transcription
    return await this.transcribeWithServer(audioBlob);
  }
  
  async transcribeWithWebSpeech(audioBlob) {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Web Speech API non disponibile'));
        return;
      }
      
      const audio = new Audio(URL.createObjectURL(audioBlob));
      
      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };
      
      this.recognition.onerror = (event) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };
      
      this.recognition.start();
    });
  }
  
  async transcribeWithServer(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    try {
      const response = await fetch(SMART_ASSISTANT_CONFIG.API.SPEECH_TO_TEXT, {
        method: 'POST',
        body: formData,
        timeout: SMART_ASSISTANT_CONFIG.API.TIMEOUT
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const result = await response.json();
      return result.transcript || result.text || '';
    } catch (error) {
      console.error('Server transcription error:', error);
      throw error;
    }
  }
  
  cleanup() {
    this.isRecording = false;
    this.audioChunks = [];
    if (this.mediaRecorder?.stream) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }
}

// AI Integration Module
class AIIntegration {
  constructor(supabaseAI) {
    this.supabaseAI = supabaseAI;
  }
  
  async analyzeTranscription(transcript) {
    if (!transcript || transcript.trim().length === 0) {
      return { hasContent: false };
    }
    
    const analysis = {
      hasContent: true,
      originalText: transcript,
      cleanedText: SmartAssistantUtils.cleanText(transcript),
      entities: SmartAssistantUtils.extractEntities(transcript),
      tasks: this.extractTasks(transcript),
      summary: this.generateSummary(transcript),
      metadata: {
        analyzedAt: new Date().toISOString(),
        wordCount: transcript.split(/\s+/).length,
        language: 'it'
      }
    };
    
    return analysis;
  }
  
  extractTasks(text) {
    const taskPatterns = [
      /(?:devo|dobbiamo|bisogna|ricorda|ricordati di)\s+([^.!?]+)/gi,
      /(?:chiamare|contattare|sentire)\s+([^.!?]+)/gi,
      /(?:inviare|mandare|spedire)\s+([^.!?]+)/gi,
      /(?:comprare|acquistare|ordinare)\s+([^.!?]+)/gi
    ];
    
    const tasks = [];
    
    taskPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        tasks.push({
          id: SmartAssistantUtils.generateId(),
          text: SmartAssistantUtils.cleanText(match[1]),
          type: this.detectTaskType(match[0]),
          completed: false,
          createdAt: new Date().toISOString()
        });
      }
    });
    
    return tasks;
  }
  
  detectTaskType(taskText) {
    if (/chiamare|contattare|sentire/i.test(taskText)) return 'call';
    if (/inviare|mandare|spedire/i.test(taskText)) return 'message';
    if (/comprare|acquistare|ordinare/i.test(taskText)) return 'purchase';
    return 'generic';
  }
  
  generateSummary(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 2) {
      return text;
    }
    
    // Semplice estrazione delle prime 2 frasi significative
    const significantSentences = sentences
      .filter(s => s.trim().length > 20)
      .slice(0, 2);
    
    return significantSentences.join('. ') + '.';
  }
}

// Dashboard KPI Module
class DashboardKPI {
  constructor(dataProvider) {
    this.dataProvider = dataProvider;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
  }
  
  async refreshKPI() {
    const cacheKey = 'kpi_data';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    try {
      const data = await this.calculateKPIData();
      
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('KPI refresh error:', error);
      return this.getMockKPIData();
    }
  }
  
  async calculateKPIData() {
    if (!this.dataProvider) {
      return this.getMockKPIData();
    }
    
    // Calcola KPI reali usando dataProvider
    const ordersData = await this.dataProvider.getOrders?.() || [];
    const clientsData = await this.dataProvider.getClients?.() || [];
    
    return {
      totalRevenue: this.calculateTotalRevenue(ordersData),
      totalOrders: ordersData.length,
      totalClients: clientsData.length,
      averageOrderValue: this.calculateAverageOrderValue(ordersData),
      topClient: this.getTopClient(ordersData),
      recentActivity: this.getRecentActivity(ordersData),
      timestamp: new Date().toISOString()
    };
  }
  
  calculateTotalRevenue(orders) {
    return orders.reduce((total, order) => {
      return total + (parseFloat(order.importo) || 0);
    }, 0);
  }
  
  calculateAverageOrderValue(orders) {
    if (orders.length === 0) return 0;
    return this.calculateTotalRevenue(orders) / orders.length;
  }
  
  getTopClient(orders) {
    const clientRevenue = new Map();
    
    orders.forEach(order => {
      const client = order.cliente || 'Sconosciuto';
      const amount = parseFloat(order.importo) || 0;
      clientRevenue.set(client, (clientRevenue.get(client) || 0) + amount);
    });
    
    let topClient = { name: '', revenue: 0 };
    clientRevenue.forEach((revenue, client) => {
      if (revenue > topClient.revenue) {
        topClient = { name: client, revenue };
      }
    });
    
    return topClient;
  }
  
  getRecentActivity(orders) {
    return orders
      .filter(order => order.data_ordine || order.data_consegna)
      .sort((a, b) => {
        const dateA = new Date(a.data_ordine || a.data_consegna);
        const dateB = new Date(b.data_ordine || b.data_consegna);
        return dateB - dateA;
      })
      .slice(0, 5)
      .map(order => ({
        description: `Ordine ${order.numero_ordine || 'N/A'} - ${order.cliente || 'Cliente sconosciuto'}`,
        amount: parseFloat(order.importo) || 0,
        date: order.data_ordine || order.data_consegna
      }));
  }
  
  getMockKPIData() {
    return {
      totalRevenue: 45750.50,
      totalOrders: 127,
      totalClients: 23,
      averageOrderValue: 360.24,
      topClient: { name: 'ESSEMME RICAMBI S.R.L.', revenue: 12450.75 },
      recentActivity: [
        { description: 'Ordine 2024-001 - ESSEMME RICAMBI', amount: 1250.00, date: '2024-01-25' },
        { description: 'Ordine 2024-002 - ODV SOLUTIONS', amount: 890.50, date: '2024-01-24' },
        { description: 'Ordine 2024-003 - AUTOTECNICA SRL', amount: 2100.25, date: '2024-01-23' }
      ],
      timestamp: new Date().toISOString()
    };
  }
}

// Task Manager Module
class TaskManager {
  constructor() {
    this.tasks = SmartAssistantUtils.loadFromStorage(SMART_ASSISTANT_CONFIG.STORAGE.TASKS, []);
  }
  
  addTask(task) {
    const newTask = {
      id: SmartAssistantUtils.generateId(),
      text: SmartAssistantUtils.cleanText(task.text || ''),
      type: task.type || 'generic',
      completed: false,
      createdAt: new Date().toISOString(),
      dueDate: task.dueDate || null,
      priority: task.priority || 'medium',
      ...task
    };
    
    this.tasks.push(newTask);
    this.saveTasks();
    return newTask;
  }
  
  completeTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = true;
      task.completedAt = new Date().toISOString();
      this.saveTasks();
    }
    return task;
  }
  
  deleteTask(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.saveTasks();
  }
  
  getTasks(filter = {}) {
    let filteredTasks = [...this.tasks];
    
    if (filter.completed !== undefined) {
      filteredTasks = filteredTasks.filter(t => t.completed === filter.completed);
    }
    
    if (filter.type) {
      filteredTasks = filteredTasks.filter(t => t.type === filter.type);
    }
    
    return filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  saveTasks() {
    SmartAssistantUtils.saveToStorage(SMART_ASSISTANT_CONFIG.STORAGE.TASKS, this.tasks);
  }
}

// Main Smart Assistant Class
class SmartAssistant {
  constructor(dependencies = {}) {
    this.container = null;
    this.isInitialized = false;
    
    // Dependency injection
    this.voiceRecognition = dependencies.voiceRecognition || new VoiceRecognition();
    this.aiIntegration = dependencies.aiIntegration || new AIIntegration(window.SupabaseAIIntegration);
    this.dashboardKPI = dependencies.dashboardKPI || new DashboardKPI(window.SupabaseAIIntegration);
    this.taskManager = dependencies.taskManager || new TaskManager();
    
    this.isIPad = SmartAssistantUtils.isIPad();
    
    console.log('🎤 SmartAssistant: Inizializzazione ottimizzata...');
    if (this.isIPad) {
      console.log('📱 iPad rilevato - Configurazione adattata');
    }
  }
  
  async init() {
    if (this.isInitialized) return;
    
    try {
      console.log('🚀 SmartAssistant: Avvio moduli...');
      
      // Setup base UI se non esiste
      if (!this.container) {
        this.container = document.getElementById('smart-assistant-container') || 
                        this.createContainer();
      }
      
      this.render();
      this.setupEventListeners();
      
      // Carica KPI iniziali
      await this.refreshDashboard();
      
      this.isInitialized = true;
      console.log('✅ SmartAssistant: Inizializzazione completata');
      
    } catch (error) {
      console.error('❌ SmartAssistant: Errore inizializzazione:', error);
      this.showError('Errore durante l\'inizializzazione');
    }
  }
  
  createContainer() {
    const container = document.createElement('div');
    container.id = 'smart-assistant-container';
    container.className = 'smart-assistant-container';
    document.body.appendChild(container);
    return container;
  }
  
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="smart-assistant-panel">
        <div class="assistant-header">
          <h3>🎤 Smart Assistant</h3>
          <button id="refresh-kpi" class="btn-refresh">🔄</button>
        </div>
        
        <div class="recording-section">
          <button id="record-btn" class="record-button" title="Inizia registrazione">
            🎤 Registra Nota
          </button>
          <div id="recording-status" class="recording-status"></div>
        </div>
        
        <div class="kpi-dashboard" id="kpi-dashboard">
          <div class="loading">Caricamento KPI...</div>
        </div>
        
        <div class="tasks-section">
          <h4>📋 Task Recenti</h4>
          <div id="tasks-list" class="tasks-list"></div>
        </div>
      </div>
    `;
  }
  
  setupEventListeners() {
    const recordBtn = document.getElementById('record-btn');
    const refreshBtn = document.getElementById('refresh-kpi');
    
    if (recordBtn) {
      recordBtn.addEventListener('click', () => this.toggleRecording());
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshDashboard());
    }
  }
  
  async toggleRecording() {
    if (this.voiceRecognition.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }
  
  async startRecording() {
    const success = await this.voiceRecognition.startRecording();
    
    if (success) {
      this.updateRecordingUI(true);
      this.updateStatus('🔴 Registrazione in corso...', 'recording');
    } else {
      this.showError('Impossibile avviare la registrazione');
    }
  }
  
  async stopRecording() {
    this.updateStatus('⏳ Elaborazione...', 'processing');
    
    try {
      const audioBlob = await this.voiceRecognition.stopRecording();
      
      if (audioBlob) {
        const transcript = await this.voiceRecognition.transcribeAudio(audioBlob);
        await this.processTranscription(transcript);
      }
    } catch (error) {
      console.error('Recording processing error:', error);
      this.showError('Errore durante l\'elaborazione');
    } finally {
      this.updateRecordingUI(false);
      this.updateStatus('');
    }
  }
  
  async processTranscription(transcript) {
    if (!transcript || transcript.trim().length === 0) {
      this.showWarning('Nessun testo rilevato');
      return;
    }
    
    // Analizza trascrizione
    const analysis = await this.aiIntegration.analyzeTranscription(transcript);
    
    // Salva nota vocale
    this.saveVoiceNote(transcript, analysis);
    
    // Aggiungi task estratti
    if (analysis.tasks && analysis.tasks.length > 0) {
      analysis.tasks.forEach(task => this.taskManager.addTask(task));
      this.renderTasks();
    }
    
    this.showSuccess(`Nota salvata con ${analysis.tasks?.length || 0} task estratti`);
  }
  
  saveVoiceNote(transcript, analysis) {
    const notes = SmartAssistantUtils.loadFromStorage(SMART_ASSISTANT_CONFIG.STORAGE.VOICE_NOTES, []);
    
    notes.push({
      id: SmartAssistantUtils.generateId(),
      transcript,
      analysis,
      createdAt: new Date().toISOString()
    });
    
    // Mantieni solo le ultime 100 note
    if (notes.length > 100) {
      notes.splice(0, notes.length - 100);
    }
    
    SmartAssistantUtils.saveToStorage(SMART_ASSISTANT_CONFIG.STORAGE.VOICE_NOTES, notes);
  }
  
  async refreshDashboard() {
    const kpiContainer = document.getElementById('kpi-dashboard');
    if (!kpiContainer) return;
    
    try {
      kpiContainer.innerHTML = '<div class="loading">Aggiornamento KPI...</div>';
      
      const kpiData = await this.dashboardKPI.refreshKPI();
      this.renderKPI(kpiData);
      
    } catch (error) {
      console.error('Dashboard refresh error:', error);
      kpiContainer.innerHTML = '<div class="error">Errore caricamento KPI</div>';
    }
  }
  
  renderKPI(data) {
    const kpiContainer = document.getElementById('kpi-dashboard');
    if (!kpiContainer || !data) return;
    
    kpiContainer.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">€${data.totalRevenue.toLocaleString('it-IT')}</div>
          <div class="kpi-label">Fatturato Totale</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${data.totalOrders}</div>
          <div class="kpi-label">Ordini Totali</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${data.totalClients}</div>
          <div class="kpi-label">Clienti</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">€${data.averageOrderValue.toFixed(2)}</div>
          <div class="kpi-label">Valore Medio Ordine</div>
        </div>
      </div>
      <div class="top-client">
        <strong>🏆 Top Cliente:</strong> ${data.topClient.name} 
        (€${data.topClient.revenue.toLocaleString('it-IT')})
      </div>
    `;
  }
  
  renderTasks() {
    const tasksContainer = document.getElementById('tasks-list');
    if (!tasksContainer) return;
    
    const tasks = this.taskManager.getTasks({ completed: false }).slice(0, 5);
    
    if (tasks.length === 0) {
      tasksContainer.innerHTML = '<div class="no-tasks">Nessun task attivo</div>';
      return;
    }
    
    tasksContainer.innerHTML = tasks.map(task => `
      <div class="task-item" data-task-id="${task.id}">
        <span class="task-text">${task.text}</span>
        <div class="task-actions">
          <button onclick="window.smartAssistant.completeTask('${task.id}')" 
                  class="btn-complete" title="Completa">✓</button>
          <button onclick="window.smartAssistant.deleteTask('${task.id}')" 
                  class="btn-delete" title="Elimina">✗</button>
        </div>
      </div>
    `).join('');
  }
  
  completeTask(taskId) {
    this.taskManager.completeTask(taskId);
    this.renderTasks();
    this.showSuccess('Task completato!');
  }
  
  deleteTask(taskId) {
    this.taskManager.deleteTask(taskId);
    this.renderTasks();
  }
  
  updateRecordingUI(isRecording) {
    const recordBtn = document.getElementById('record-btn');
    if (!recordBtn) return;
    
    if (isRecording) {
      recordBtn.textContent = '⏹️ Ferma Registrazione';
      recordBtn.classList.add('recording');
    } else {
      recordBtn.textContent = '🎤 Registra Nota';
      recordBtn.classList.remove('recording');
    }
  }
  
  updateStatus(message, type = '') {
    const statusEl = document.getElementById('recording-status');
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.className = `recording-status ${type}`;
  }
  
  showSuccess(message) {
    this.showNotification(message, 'success');
  }
  
  showWarning(message) {
    this.showNotification(message, 'warning');
  }
  
  showError(message) {
    this.showNotification(message, 'error');
  }
  
  showNotification(message, type = 'info') {
    // Usa sistema di notifiche esistente se disponibile
    if (window.Utils?.showNotification) {
      window.Utils.showNotification(message, type);
      return;
    }
    
    // Fallback a console
    console.log(`${type.toUpperCase()}: ${message}`);
  }
}

// Auto-inizializzazione e export
let smartAssistantInstance = null;

function initSmartAssistant(dependencies = {}) {
  if (!smartAssistantInstance) {
    smartAssistantInstance = new SmartAssistant(dependencies);
    window.smartAssistant = smartAssistantInstance; // Per i click handlers
  }
  return smartAssistantInstance;
}

// Export per compatibilità
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    SmartAssistant, 
    VoiceRecognition, 
    AIIntegration, 
    DashboardKPI, 
    TaskManager,
    SmartAssistantUtils,
    SMART_ASSISTANT_CONFIG,
    initSmartAssistant
  };
}

// Inizializzazione automatica
if (typeof window !== 'undefined') {
  window.SmartAssistant = SmartAssistant;
  window.initSmartAssistant = initSmartAssistant;
  
  // Auto-init se DOM è pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const assistant = initSmartAssistant();
      assistant.init();
    });
  } else {
    const assistant = initSmartAssistant();
    assistant.init();
  }
}