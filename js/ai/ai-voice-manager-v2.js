/**
 * 🎤 AI VOICE MANAGER V2 - CLEAN ARCHITECTURE
 * Ridotto da 2910 → ~600 righe (79% riduzione)
 * Module Pattern + Strategy Pattern + Observer Pattern
 */

console.log('[LOAD] ✅ ai-voice-manager-v2-clean.js caricato');

// ==================== CONFIGURATION ====================

const VOICE_MANAGER_CONFIG = {
  DEBUG: localStorage.getItem('voice_debug') === 'true',
  VERSION: '2.0.0',
  
  WAKE_PHRASES: ['assistente', 'hey assistente', 'ok assistente', 'ehi assistente'],
  
  RECOGNITION: {
    CONTINUOUS: true,
    INTERIM_RESULTS: true,
    MAX_ALTERNATIVES: 3,
    LANG: 'it-IT'
  },
  
  TTS: {
    DEFAULT_RATE: 1.0,
    DEFAULT_PITCH: 1.0,
    DEFAULT_VOLUME: 1.0,
    LANG: 'it-IT',
    DUPLICATE_TIMEOUT: 1000 // ms to prevent duplicate speech
  },
  
  UI: {
    ANIMATION_DURATION: 300,
    AUTO_COLLAPSE_DELAY: 10000,
    RIPPLE_DURATION: 600
  },
  
  DEVICE: {
    FORCE_IPAD_KEY: 'force_ipad_mode',
    AUDIO_ACTIVATED_KEY: 'ipad_audio_activated'
  }
};

// ==================== UTILITY CLASSES ====================

class VoiceLogger {
  static log(level, message, data = {}) {
    if (!VOICE_MANAGER_CONFIG.DEBUG && level === 'debug') return;
    
    const prefix = `[VOICE-${level.toUpperCase()}]`;
    const logMethod = level === 'error' ? console.error : console.log;
    logMethod(prefix, message, data);
  }
}

class DeviceDetector {
  static isIPad() {
    const forceMode = localStorage.getItem(VOICE_MANAGER_CONFIG.DEVICE.FORCE_IPAD_KEY) === 'true';
    if (forceMode) return true;
    
    return /iPad|Macintosh/.test(navigator.userAgent) && 
           navigator.maxTouchPoints > 1;
  }
  
  static isIPhone() {
    return /iPhone/.test(navigator.userAgent) && !this.isIPad();
  }
  
  static isMobile() {
    return this.isIPad() || this.isIPhone() || /Android/i.test(navigator.userAgent);
  }
  
  static getDeviceInfo() {
    return {
      isIPad: this.isIPad(),
      isIPhone: this.isIPhone(),
      isMobile: this.isMobile(),
      hasTouch: 'ontouchstart' in window,
      screenWidth: window.screen.width,
      userAgent: navigator.userAgent
    };
  }
}

class TTSEngine {
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.isSpeaking = false;
    this.lastSpokenText = null;
    this.lastSpokenTime = 0;
    this.voice = null;
    this.config = { ...VOICE_MANAGER_CONFIG.TTS };
  }
  
  async init() {
    // Wait for voices to load
    await this.loadVoices();
    this.selectBestVoice();
  }
  
  async loadVoices() {
    return new Promise((resolve) => {
      const checkVoices = () => {
        const voices = this.synthesis.getVoices();
        if (voices.length > 0) {
          resolve(voices);
        } else {
          setTimeout(checkVoices, 100);
        }
      };
      
      this.synthesis.onvoiceschanged = () => resolve(this.synthesis.getVoices());
      checkVoices();
    });
  }
  
  selectBestVoice() {
    const voices = this.synthesis.getVoices();
    
    // Try to find Italian voice
    this.voice = voices.find(v => v.lang.startsWith('it-IT')) ||
                 voices.find(v => v.lang.startsWith('it')) ||
                 voices[0];
    
    VoiceLogger.log('info', 'TTS Voice selected:', {
      name: this.voice?.name,
      lang: this.voice?.lang
    });
  }
  
  speak(text, options = {}) {
    // Prevent duplicate speech
    const now = Date.now();
    if (text === this.lastSpokenText && 
        now - this.lastSpokenTime < this.config.DUPLICATE_TIMEOUT) {
      VoiceLogger.log('debug', 'Duplicate speech prevented');
      return Promise.resolve();
    }
    
    // Cancel any ongoing speech
    this.synthesis.cancel();
    
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply configuration
      utterance.voice = this.voice;
      utterance.rate = options.rate || this.config.rate;
      utterance.pitch = options.pitch || this.config.pitch;
      utterance.volume = options.volume || this.config.volume;
      utterance.lang = this.config.LANG;
      
      // Event handlers
      utterance.onstart = () => {
        this.isSpeaking = true;
        VoiceLogger.log('debug', 'TTS started');
      };
      
      utterance.onend = () => {
        this.isSpeaking = false;
        this.lastSpokenText = text;
        this.lastSpokenTime = now;
        VoiceLogger.log('debug', 'TTS completed');
        resolve();
      };
      
      utterance.onerror = (event) => {
        this.isSpeaking = false;
        VoiceLogger.log('error', 'TTS error:', event);
        reject(event);
      };
      
      this.synthesis.speak(utterance);
    });
  }
  
  stop() {
    this.synthesis.cancel();
    this.isSpeaking = false;
  }
  
  updateConfig(config) {
    Object.assign(this.config, config);
  }
}

class RecognitionEngine {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.transcriptionBuffer = [];
    this.lastSpeechTime = Date.now();
    this.observers = new Set();
  }
  
  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      VoiceLogger.log('error', 'Speech Recognition not supported');
      return false;
    }
    
    this.recognition = new SpeechRecognition();
    this.configureRecognition();
    this.setupEventHandlers();
    
    return true;
  }
  
  configureRecognition() {
    Object.assign(this.recognition, {
      continuous: VOICE_MANAGER_CONFIG.RECOGNITION.CONTINUOUS,
      interimResults: VOICE_MANAGER_CONFIG.RECOGNITION.INTERIM_RESULTS,
      maxAlternatives: VOICE_MANAGER_CONFIG.RECOGNITION.MAX_ALTERNATIVES,
      lang: VOICE_MANAGER_CONFIG.RECOGNITION.LANG
    });
  }
  
  setupEventHandlers() {
    this.recognition.onstart = () => {
      VoiceLogger.log('info', 'Recognition started');
      this.notifyObservers('start');
    };
    
    this.recognition.onresult = (event) => {
      const results = Array.from(event.results);
      const latestResult = results[results.length - 1];
      
      if (latestResult.isFinal) {
        const transcript = latestResult[0].transcript;
        this.transcriptionBuffer.push(transcript);
        this.lastSpeechTime = Date.now();
        
        VoiceLogger.log('debug', 'Final transcript:', transcript);
        this.notifyObservers('result', { transcript, isFinal: true });
      } else {
        const interim = latestResult[0].transcript;
        this.notifyObservers('result', { transcript: interim, isFinal: false });
      }
    };
    
    this.recognition.onerror = (event) => {
      VoiceLogger.log('error', 'Recognition error:', event.error);
      this.notifyObservers('error', event);
      
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        this.restart();
      }
    };
    
    this.recognition.onend = () => {
      VoiceLogger.log('info', 'Recognition ended');
      this.notifyObservers('end');
      
      if (this.isListening) {
        this.restart();
      }
    };
  }
  
  start() {
    if (!this.recognition || this.isListening) return;
    
    this.isListening = true;
    this.recognition.start();
  }
  
  stop() {
    if (!this.recognition || !this.isListening) return;
    
    this.isListening = false;
    this.recognition.stop();
  }
  
  restart() {
    if (!this.isListening) return;
    
    setTimeout(() => {
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch (error) {
          VoiceLogger.log('error', 'Restart failed:', error);
        }
      }
    }, 100);
  }
  
  // Observer pattern for event handling
  addObserver(callback) {
    this.observers.add(callback);
  }
  
  removeObserver(callback) {
    this.observers.delete(callback);
  }
  
  notifyObservers(event, data = {}) {
    this.observers.forEach(callback => callback(event, data));
  }
  
  getTranscriptionBuffer() {
    return [...this.transcriptionBuffer];
  }
  
  clearTranscriptionBuffer() {
    this.transcriptionBuffer = [];
  }
}

// ==================== UI COMPONENTS ====================

class VoiceUIManager {
  constructor() {
    this.elements = {};
    this.isExpanded = false;
    this.deviceInfo = DeviceDetector.getDeviceInfo();
  }
  
  init(container) {
    this.container = container || document.getElementById('ai-voice-container');
    
    if (!this.container) {
      this.createContainer();
    }
    
    this.render();
    this.attachEventListeners();
  }
  
  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'ai-voice-container';
    this.container.className = 'ai-voice-container';
    document.body.appendChild(this.container);
  }
  
  render() {
    const template = this.deviceInfo.isIPad ? this.getIPadTemplate() : 
                     this.deviceInfo.isIPhone ? this.getIPhoneTemplate() : 
                     this.getDesktopTemplate();
    
    this.container.innerHTML = template;
    this.cacheElements();
  }
  
  getIPadTemplate() {
    return `
      <div class="ai-voice-panel ipad-mode">
        <div class="ai-voice-header">
          <h3>🎤 Assistente Vocale</h3>
          <div class="ai-voice-controls">
            <button class="ai-control-btn" id="mic-button" title="Microfono">
              <svg class="mic-icon" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
            <button class="ai-control-btn" id="auto-mode-btn" title="Modalità Auto">
              🚗
            </button>
          </div>
        </div>
        <div class="ai-voice-content">
          <div id="status-indicator" class="status-indicator">
            <span class="status-text">Pronto</span>
          </div>
          <div id="transcription-display" class="transcription-display"></div>
          <div class="tts-controls">
            <label>
              Volume: 
              <input type="range" id="volume-control" min="0" max="1" step="0.1" value="1">
            </label>
            <label>
              Velocità: 
              <input type="range" id="speed-control" min="0.5" max="2" step="0.1" value="1">
            </label>
          </div>
        </div>
      </div>
    `;
  }
  
  getIPhoneTemplate() {
    return `
      <div class="ai-voice-panel iphone-mode ${this.isExpanded ? 'expanded' : 'collapsed'}">
        <button class="ai-voice-toggle" id="toggle-button">
          <span class="toggle-icon">🎤</span>
        </button>
        <div class="ai-voice-content">
          <div id="status-indicator" class="status-indicator compact">
            <span class="status-text">Tocca per parlare</span>
          </div>
          <div id="transcription-display" class="transcription-display compact"></div>
        </div>
      </div>
    `;
  }
  
  getDesktopTemplate() {
    return this.getIPadTemplate(); // Desktop uses same template as iPad
  }
  
  cacheElements() {
    this.elements = {
      micButton: document.getElementById('mic-button'),
      autoModeBtn: document.getElementById('auto-mode-btn'),
      toggleButton: document.getElementById('toggle-button'),
      statusIndicator: document.getElementById('status-indicator'),
      statusText: document.querySelector('.status-text'),
      transcriptionDisplay: document.getElementById('transcription-display'),
      volumeControl: document.getElementById('volume-control'),
      speedControl: document.getElementById('speed-control')
    };
  }
  
  attachEventListeners() {
    // Mic button
    this.elements.micButton?.addEventListener('click', () => {
      this.onMicButtonClick();
    });
    
    // Auto mode button
    this.elements.autoModeBtn?.addEventListener('click', () => {
      this.onAutoModeClick();
    });
    
    // iPhone toggle
    this.elements.toggleButton?.addEventListener('click', () => {
      this.toggleExpanded();
    });
    
    // TTS controls
    this.elements.volumeControl?.addEventListener('change', (e) => {
      this.onVolumeChange(e.target.value);
    });
    
    this.elements.speedControl?.addEventListener('change', (e) => {
      this.onSpeedChange(e.target.value);
    });
  }
  
  updateStatus(status, message) {
    if (!this.elements.statusText) return;
    
    this.elements.statusText.textContent = message;
    this.elements.statusIndicator.className = `status-indicator ${status}`;
  }
  
  updateTranscription(text, isFinal = false) {
    if (!this.elements.transcriptionDisplay) return;
    
    if (isFinal) {
      this.elements.transcriptionDisplay.innerHTML += `<p>${text}</p>`;
      this.elements.transcriptionDisplay.scrollTop = this.elements.transcriptionDisplay.scrollHeight;
    } else {
      const interim = this.elements.transcriptionDisplay.querySelector('.interim');
      if (interim) {
        interim.textContent = text;
      } else {
        this.elements.transcriptionDisplay.innerHTML += `<p class="interim">${text}</p>`;
      }
    }
  }
  
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    const panel = this.container.querySelector('.ai-voice-panel');
    panel?.classList.toggle('expanded', this.isExpanded);
    panel?.classList.toggle('collapsed', !this.isExpanded);
  }
  
  setMicActive(active) {
    this.elements.micButton?.classList.toggle('active', active);
  }
  
  setAutoModeActive(active) {
    this.elements.autoModeBtn?.classList.toggle('active', active);
  }
  
  // Event handlers (to be overridden)
  onMicButtonClick() {}
  onAutoModeClick() {}
  onVolumeChange(value) {}
  onSpeedChange(value) {}
}

// ==================== MAIN VOICE MANAGER CLASS ====================

class AIVoiceManagerV2Clean {
  constructor() {
    this.ttsEngine = new TTSEngine();
    this.recognitionEngine = new RecognitionEngine();
    this.uiManager = new VoiceUIManager();
    
    this.isAutoMode = false;
    this.useWakeWord = true;
    
    VoiceLogger.log('info', 'AIVoiceManagerV2 Clean initialized');
  }
  
  async init() {
    try {
      // Initialize TTS
      await this.ttsEngine.init();
      
      // Initialize Recognition
      if (!this.recognitionEngine.init()) {
        throw new Error('Speech Recognition not available');
      }
      
      // Setup recognition observer
      this.recognitionEngine.addObserver((event, data) => {
        this.handleRecognitionEvent(event, data);
      });
      
      // Initialize UI
      this.uiManager.init();
      this.setupUIHandlers();
      
      // Check if audio activation needed
      if (DeviceDetector.isIPad() && !this.isAudioActivated()) {
        await this.requestAudioActivation();
      }
      
      VoiceLogger.log('info', 'Voice Manager ready');
      return true;
      
    } catch (error) {
      VoiceLogger.log('error', 'Initialization failed:', error);
      return false;
    }
  }
  
  setupUIHandlers() {
    this.uiManager.onMicButtonClick = () => {
      this.toggleListening();
    };
    
    this.uiManager.onAutoModeClick = () => {
      this.toggleAutoMode();
    };
    
    this.uiManager.onVolumeChange = (value) => {
      this.ttsEngine.updateConfig({ volume: parseFloat(value) });
    };
    
    this.uiManager.onSpeedChange = (value) => {
      this.ttsEngine.updateConfig({ rate: parseFloat(value) });
    };
  }
  
  handleRecognitionEvent(event, data) {
    switch (event) {
      case 'start':
        this.uiManager.updateStatus('listening', 'In ascolto...');
        this.uiManager.setMicActive(true);
        break;
        
      case 'result':
        this.handleTranscript(data.transcript, data.isFinal);
        break;
        
      case 'error':
        this.uiManager.updateStatus('error', 'Errore microfono');
        this.uiManager.setMicActive(false);
        break;
        
      case 'end':
        this.uiManager.updateStatus('ready', 'Pronto');
        this.uiManager.setMicActive(false);
        break;
    }
  }
  
  handleTranscript(transcript, isFinal) {
    this.uiManager.updateTranscription(transcript, isFinal);
    
    if (isFinal) {
      if (this.isAutoMode && this.containsWakeWord(transcript)) {
        this.processCommand(transcript);
      } else if (!this.isAutoMode) {
        this.processCommand(transcript);
      }
    }
  }
  
  containsWakeWord(transcript) {
    const normalized = transcript.toLowerCase();
    return VOICE_MANAGER_CONFIG.WAKE_PHRASES.some(phrase => 
      normalized.includes(phrase)
    );
  }
  
  async processCommand(transcript) {
    VoiceLogger.log('info', 'Processing command:', transcript);
    
    // Emit event for external handlers
    window.dispatchEvent(new CustomEvent('voiceCommand', {
      detail: { transcript, source: 'voice' }
    }));
  }
  
  toggleListening() {
    if (this.recognitionEngine.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }
  
  startListening() {
    this.recognitionEngine.start();
  }
  
  stopListening() {
    this.recognitionEngine.stop();
  }
  
  toggleAutoMode() {
    this.isAutoMode = !this.isAutoMode;
    this.uiManager.setAutoModeActive(this.isAutoMode);
    
    if (this.isAutoMode) {
      this.startListening();
      this.speak('Modalità automobile attivata. Dì "assistente" per darmi comandi.');
    } else {
      this.stopListening();
      this.speak('Modalità automobile disattivata.');
    }
  }
  
  async speak(text, options = {}) {
    return this.ttsEngine.speak(text, options);
  }
  
  stopSpeaking() {
    this.ttsEngine.stop();
  }
  
  // iPad Audio Activation
  isAudioActivated() {
    return localStorage.getItem(VOICE_MANAGER_CONFIG.DEVICE.AUDIO_ACTIVATED_KEY) === 'true';
  }
  
  async requestAudioActivation() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'audio-activation-overlay';
      overlay.innerHTML = `
        <div class="audio-activation-content">
          <h2>🎤 Attivazione Audio</h2>
          <p>Per funzionare correttamente su iPad, il sistema audio deve essere attivato.</p>
          <button class="audio-activation-btn">🔊 Attiva Audio</button>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      const button = overlay.querySelector('.audio-activation-btn');
      button.addEventListener('click', async () => {
        // Test TTS to activate audio
        await this.speak('Audio attivato con successo.');
        localStorage.setItem(VOICE_MANAGER_CONFIG.DEVICE.AUDIO_ACTIVATED_KEY, 'true');
        overlay.remove();
        resolve();
      });
    });
  }
}

// ==================== GLOBAL EXPORT ====================

// Export for global use
window.AIVoiceManagerV2Clean = AIVoiceManagerV2Clean;
window.AIVoiceManagerV2 = AIVoiceManagerV2Clean; // Compatibility alias

// Create global instance
let voiceManagerInstance = null;

window.initVoiceManager = async function() {
  if (!voiceManagerInstance) {
    voiceManagerInstance = new AIVoiceManagerV2Clean();
    await voiceManagerInstance.init();
    window.voiceManager = voiceManagerInstance;
  }
  return voiceManagerInstance;
};

// Auto-init if DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.initVoiceManager();
  });
} else {
  window.initVoiceManager();
}

// Export utilities for debugging
window.VoiceDebug = {
  enableDebug: () => {
    localStorage.setItem('voice_debug', 'true');
    console.log('Voice debug enabled');
  },
  disableDebug: () => {
    localStorage.removeItem('voice_debug');
    console.log('Voice debug disabled');
  },
  forceIPadMode: () => {
    localStorage.setItem(VOICE_MANAGER_CONFIG.DEVICE.FORCE_IPAD_KEY, 'true');
    console.log('iPad mode forced - reload page');
  },
  disableIPadMode: () => {
    localStorage.removeItem(VOICE_MANAGER_CONFIG.DEVICE.FORCE_IPAD_KEY);
    console.log('iPad mode disabled - reload page');
  },
  getDeviceInfo: () => DeviceDetector.getDeviceInfo()
};

VoiceLogger.log('info', '🎤 AI Voice Manager V2 Clean ready!');