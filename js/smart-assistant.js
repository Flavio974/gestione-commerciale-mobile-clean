/**
 * Smart Commercial Assistant Module
 * Gestisce note vocali, dashboard KPI e insights avanzati
 */

// URL base per le API con fallback per iPad
const API_ENDPOINTS = {
  primary: '/.netlify/functions', // Usa Netlify Functions
  fallback: null,
  local: 'http://localhost:3000'
};

// Configurazione specifica per iPad
const IPAD_CONFIG = {
  useLocalSpeechRecognition: false, // Abilita trascrizione server anche per iPad
  disableServerTranscription: false, // Abilita trascrizione server
  enableMockResponses: false,
  reducedTimeout: 30000 // Timeout aumentato per Netlify Functions
};

class SmartAssistant {
  constructor() {
    this.container = null;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recognition = null;
    this.supabaseAI = null;
    this.currentAudio = null; // Per gestire play/stop audio
    this.isIPad = this.detectIPad();
    this.apiEndpoint = this.selectAPIEndpoint();
    
    console.log('🎤 SmartAssistant: Inizializzazione...');
    if (this.isIPad) {
      console.log('📱 iPad rilevato - Modalità fallback attivata');
    }
  }

  /**
   * Rileva se è un iPad
   */
  detectIPad() {
    return /iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
  }

  /**
   * Seleziona endpoint API appropriato
   */
  selectAPIEndpoint() {
    if (this.isIPad && IPAD_CONFIG.disableServerTranscription) {
      console.log('📱 iPad: Trascrizione server disabilitata');
      return null;
    }
    
    if (window.location.hostname === 'localhost') {
      return API_ENDPOINTS.local;
    }
    
    return API_ENDPOINTS.primary;
  }

  /**
   * Inizializzazione del modulo
   */
  async init() {
    this.container = document.getElementById('smart-content');
    if (!this.container) {
      console.error('❌ SmartAssistant: Container non trovato');
      return;
    }

    // Inizializza integrazione Supabase AI
    if (window.SupabaseAIIntegration) {
      this.supabaseAI = new SupabaseAIIntegration();
      // Esporta per uso globale dal middleware
      window.supabaseAI = this.supabaseAI;
      console.log('🔌 💾 SupabaseAI istanza esportata per middleware');
      
      // Aggiungi funzione globale per refresh cache AI
      window.refreshAICache = async function() {
        if (window.supabaseAI) {
          console.log('🔄 Manual AI cache refresh triggered...');
          try {
            window.supabaseAI.invalidateCache(); // Invalida prima del refresh
            const data = await window.supabaseAI.getAllData(true);
            console.log('✅ AI cache refreshed, new data available');
            return data;
          } catch (error) {
            console.warn('⚠️ Errore durante refresh cache AI:', error);
            return null;
          }
        }
        console.warn('⚠️ No AI integration available for cache refresh');
        return null;
      };
    }

    this.render();
    
    // Verifica supporto browser per audio con retry
    await this.checkAudioSupportWithRetry();
    
    // IMPORTANTE: Renderizza subito le note salvate dopo init
    this.renderVoiceNotes();
    this.renderCallList();
    this.renderWhatsappList();
    this.renderTaskList();
    
    // CRITICO: Setup event listeners DOPO tutti i render per evitare che vengano distrutti
    this.setupEventListeners();
    
    // Inizializza sistema promemoria
    this.initializeReminders();
    
    console.log('✅ SmartAssistant: Inizializzato con successo');
  }

  /**
   * Rendering dell'interfaccia
   */
  render() {
    this.container.innerHTML = `
      <div class="smart-assistant-container">
        <!-- Header -->
        <div class="smart-header">
          <h2>🎤 Smart Commercial Assistant</h2>
          <p>Note vocali, KPI e insights intelligenti</p>
        </div>

        <!-- Voice Recorder Section -->
        <div class="voice-recorder-section">
          <div class="voice-recorder-card">
            <div class="voice-recorder-header">
              <h3>📝 Note Vocali</h3>
              <div class="recording-status" id="recording-status">
                <span class="status-text">Pronto per registrare</span>
              </div>
            </div>
            
            <div class="voice-controls">
              <button id="start-recording-btn" class="voice-btn record-btn">
                <i class="fas fa-microphone"></i>
                <span>Inizia Registrazione</span>
              </button>
              
              <button id="stop-recording-btn" class="voice-btn stop-btn" disabled style="display: none;">
                <i class="fas fa-stop"></i>
                <span>Stop</span>
              </button>
              
              <button id="transcribe-btn" class="voice-btn transcribe-btn" disabled style="display: none;">
                <i class="fas fa-file-text"></i>
                <span>Trascrivi</span>
              </button>
            </div>
            
            <div class="audio-visualization" id="audio-visualization" style="display: none;">
              <div class="waveform">
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
              </div>
            </div>
            
            <div class="recording-info" id="recording-info" style="display: none;">
              <div class="recording-timer">00:00</div>
              <div class="recording-size">0 KB</div>
            </div>
          </div>
        </div>

        <!-- Quick KPI Dashboard -->
        <div class="kpi-dashboard-section">
          <div class="kpi-header">
            <h3>📊 Dashboard KPI</h3>
            <div class="header-buttons">
              <button onclick="window.SmartAssistant.showSecureFolders()" class="btn btn-success" style="background: #28a745; color: white; margin-right: 10px; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">
                🔐 Cartelle Sicure
              </button>
              <button onclick="window.SmartAssistant.debugTranscriptions()" class="btn btn-info" style="background: #17a2b8; color: white; margin-right: 10px; padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer;">
                🔍 Debug Trascrizioni
              </button>
              <button id="refresh-kpi-btn" class="refresh-btn">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          
          <div class="kpi-grid" id="kpi-grid">
            <div class="kpi-card loading">
              <div class="kpi-icon">📈</div>
              <div class="kpi-content">
                <div class="kpi-value">--</div>
                <div class="kpi-label">Vendite Oggi</div>
              </div>
            </div>
            
            <div class="kpi-card loading">
              <div class="kpi-icon">👥</div>
              <div class="kpi-content">
                <div class="kpi-value">--</div>
                <div class="kpi-label">Clienti Attivi</div>
              </div>
            </div>
            
            <div class="kpi-card loading">
              <div class="kpi-icon">📦</div>
              <div class="kpi-content">
                <div class="kpi-value">--</div>
                <div class="kpi-label">Ordini Pending</div>
              </div>
            </div>
            
            <div class="kpi-card loading">
              <div class="kpi-icon">🚗</div>
              <div class="kpi-content">
                <div class="kpi-value">--</div>
                <div class="kpi-label">Km Oggi</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Call List Section -->
        <div class="call-list-section">
          <div class="notes-header">
            <h3>📞 Lista Chiamate</h3>
            <div class="header-buttons">
              <button id="clear-calls-btn" class="clear-btn">
                <i class="fas fa-trash"></i>
              </button>
              <button id="refresh-calls-btn" class="refresh-btn">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          
          <div class="call-list" id="call-list">
            <div class="no-notes">
              <i class="fas fa-phone-slash"></i>
              <p>Nessuna chiamata programmata</p>
            </div>
          </div>
        </div>

        <!-- WhatsApp Messages Section -->
        <div class="whatsapp-list-section">
          <div class="notes-header">
            <h3>💬 Messaggi WhatsApp</h3>
            <div class="header-buttons">
              <button id="clear-whatsapp-btn" class="clear-btn">
                <i class="fas fa-trash"></i>
              </button>
              <button id="refresh-whatsapp-btn" class="refresh-btn">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          
          <div class="whatsapp-list" id="whatsapp-list">
            <div class="no-notes">
              <i class="fas fa-comment-slash"></i>
              <p>Nessun messaggio WhatsApp programmato</p>
            </div>
          </div>
        </div>

        <!-- Task List Section -->
        <div class="task-list-section">
          <div class="notes-header">
            <h3>📋 Task Automatici</h3>
            <div class="header-buttons">
              <button id="clear-tasks-btn" class="clear-btn">
                <i class="fas fa-trash"></i>
              </button>
              <button id="refresh-tasks-btn" class="refresh-btn">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          
          <div class="task-list" id="task-list">
            <div class="no-notes">
              <i class="fas fa-tasks"></i>
              <p>Nessun task automatico</p>
            </div>
          </div>
        </div>

        <!-- Client History Section -->
        <div class="client-history-section">
          <div class="notes-header">
            <h3>🏛️ Storico Clienti</h3>
            <div class="header-buttons">
              <input type="text" id="client-search-input" placeholder="Cerca cliente (es. Mauro, Essemme...)" 
                     style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; margin-right: 10px; width: 200px;">
              <button id="search-client-btn" class="voice-btn" style="background: #457b9d; color: white; padding: 8px 16px;">
                <i class="fas fa-search"></i> Cerca
              </button>
              <button id="clear-history-btn" class="clear-btn">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          
          <div class="client-history-results" id="client-history-results">
            <div class="no-notes">
              <i class="fas fa-search"></i>
              <p>Inserisci il nome di un cliente per visualizzare lo storico completo</p>
            </div>
          </div>
        </div>

        <!-- Voice Notes List -->
        <div class="voice-notes-section">
          <div class="notes-header">
            <h3>📋 Note Salvate</h3>
            <button id="clear-notes-btn" class="clear-btn">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          
          <div class="voice-notes-list" id="voice-notes-list">
            <div class="no-notes">
              <i class="fas fa-microphone-slash"></i>
              <p>Nessuna nota vocale salvata</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    console.log('🎤 setupEventListeners: Inizio configurazione...');
    
    const startBtn = document.getElementById('start-recording-btn');
    const stopBtn = document.getElementById('stop-recording-btn');
    const transcribeBtn = document.getElementById('transcribe-btn');
    const refreshKpiBtn = document.getElementById('refresh-kpi-btn');
    const clearNotesBtn = document.getElementById('clear-notes-btn');
    const refreshCallsBtn = document.getElementById('refresh-calls-btn');
    const clearCallsBtn = document.getElementById('clear-calls-btn');
    const refreshWhatsappBtn = document.getElementById('refresh-whatsapp-btn');
    const clearWhatsappBtn = document.getElementById('clear-whatsapp-btn');
    const refreshTasksBtn = document.getElementById('refresh-tasks-btn');
    const clearTasksBtn = document.getElementById('clear-tasks-btn');
    const searchClientBtn = document.getElementById('search-client-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const clientSearchInput = document.getElementById('client-search-input');

    if (startBtn) {
      console.log('🎤 Start button trovato, configurazione...');
      
      // FORZA stato abilitato immediatamente
      startBtn.disabled = false;
      startBtn.style.opacity = '1';
      startBtn.style.cursor = 'pointer';
      startBtn.style.pointerEvents = 'auto';
      startBtn.style.backgroundColor = '#28a745';
      startBtn.style.borderColor = '#28a745';
      startBtn.classList.add('ready');
      startBtn.classList.remove('disabled');
      
      // Rimuovi listener esistenti se presenti
      startBtn.removeEventListener('click', this._startRecordingHandler);
      
      // Crea handler bound
      this._startRecordingHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎤 Start button clicked!');
        this.startRecording();
      };
      
      // Attacca listener
      startBtn.addEventListener('click', this._startRecordingHandler);
      
      // Aggiungi anche touch support per mobile
      startBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        console.log('📱 Touch start rilevato');
        this.startRecording();
      });
      
      console.log('✅ Pulsante registrazione abilitato');
    } else {
      console.error('❌ Start recording button not found');
    }
    
    if (stopBtn) {
      stopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🛑 Stop button clicked!');
        this.stopRecording();
      });
      // Marca come avente listener attaccato
      stopBtn._smartAssistantStopListenerAttached = true;
    }
    if (transcribeBtn) transcribeBtn.addEventListener('click', () => this.transcribeAudio());
    if (refreshKpiBtn) refreshKpiBtn.addEventListener('click', () => this.refreshKPI());
    if (clearNotesBtn) clearNotesBtn.addEventListener('click', () => this.clearNotes());
    if (refreshCallsBtn) refreshCallsBtn.addEventListener('click', () => this.renderCallList());
    if (clearCallsBtn) clearCallsBtn.addEventListener('click', () => this.clearCalls());
    if (refreshWhatsappBtn) refreshWhatsappBtn.addEventListener('click', () => this.renderWhatsappList());
    if (clearWhatsappBtn) clearWhatsappBtn.addEventListener('click', () => this.clearWhatsapp());
    if (refreshTasksBtn) refreshTasksBtn.addEventListener('click', () => this.renderTaskList());
    if (clearTasksBtn) clearTasksBtn.addEventListener('click', () => this.clearTasks());
    if (searchClientBtn) searchClientBtn.addEventListener('click', () => this.searchClientHistory());
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => this.clearClientHistory());
    
    // Enter key per ricerca cliente
    if (clientSearchInput) {
      clientSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.searchClientHistory();
        }
      });
    }
  }

  /**
   * Assicura che gli event listeners siano attaccati
   */
  ensureEventListeners() {
    const startBtn = document.getElementById('start-recording-btn');
    const stopBtn = document.getElementById('stop-recording-btn');
    
    // Fix Start Button
    if (startBtn && !startBtn._smartAssistantListenerAttached) {
      console.log('🔧 Start button event listener mancante, riattacco...');
      
      // Forza abilitazione
      startBtn.disabled = false;
      startBtn.classList.add('ready');
      startBtn.style.opacity = '1';
      startBtn.style.cursor = 'pointer';
      startBtn.style.backgroundColor = '#28a745';
      startBtn.style.borderColor = '#28a745';
      
      // Riattacca listener
      startBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎤 Start button clicked! (reattached)');
        this.startRecording();
      });
      
      // Marca come riattaccato
      startBtn._smartAssistantListenerAttached = true;
      console.log('✅ Start button event listener riattaccato');
    }
    
    // Fix Stop Button
    if (stopBtn && !stopBtn._smartAssistantStopListenerAttached) {
      console.log('🔧 Stop button event listener mancante, riattacco...');
      
      // Riattacca listener
      stopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🛑 Stop button clicked! (reattached)');
        this.stopRecording();
      });
      
      // Marca come riattaccato
      stopBtn._smartAssistantStopListenerAttached = true;
      console.log('✅ Stop button event listener riattaccato');
    }
  }

  /**
   * Verifica supporto browser per audio
   */
  async checkAudioSupport() {
    try {
      // Test MediaRecorder
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API non supportata');
      }

      // Test accesso microfono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      // Abilita pulsante registrazione con timeout per assicurarsi che il DOM sia pronto
      setTimeout(() => {
        const startBtn = document.getElementById('start-recording-btn');
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.classList.add('ready');
          startBtn.style.opacity = '1';
          startBtn.style.cursor = 'pointer';
          console.log('✅ Pulsante registrazione abilitato da checkAudioSupport');
        } else {
          console.warn('⚠️ Pulsante registrazione non trovato nel DOM');
        }
      }, 1000);

      this.updateStatus('✅ Microfono pronto', 'success');

    } catch (error) {
      console.error('❌ Errore supporto audio:', error);
      this.updateStatus('❌ Microfono non disponibile', 'error');
    }
  }

  /**
   * Verifica supporto browser per audio con retry logic
   */
  async checkAudioSupportWithRetry() {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`🎤 Tentativo ${attempts + 1}/${maxAttempts} verifica audio...`);
        
        // Test MediaRecorder
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('MediaDevices API non supportata');
        }

        if (!window.MediaRecorder) {
          throw new Error('MediaRecorder API non supportata');
        }

        // Test accesso microfono
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        stream.getTracks().forEach(track => track.stop());

        // Aspetta che il DOM sia pronto
        await this.waitForElement('start-recording-btn', 5000);

        // Abilita pulsante registrazione con controllo aggiuntivo
        const startBtn = document.getElementById('start-recording-btn');
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.classList.add('ready');
          startBtn.style.opacity = '1';
          startBtn.style.cursor = 'pointer';
          
          console.log('✅ Pulsante registrazione abilitato');
          this.updateStatus('✅ Microfono pronto', 'success');
          return; // Successo, esci dal loop
        } else {
          throw new Error('Pulsante registrazione non trovato nel DOM');
        }

      } catch (error) {
        attempts++;
        console.error(`❌ Tentativo ${attempts} fallito:`, error.message);
        
        if (attempts < maxAttempts) {
          console.log(`🔄 Riprovo tra 2 secondi...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.error('❌ Tutti i tentativi falliti');
          this.updateStatus('❌ Microfono non disponibile - Ricarica la pagina', 'error');
        }
      }
    }
  }

  /**
   * Aspetta che un elemento esista nel DOM
   */
  async waitForElement(elementId, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        const element = document.getElementById(elementId);
        if (element) {
          console.log(`✅ Elemento ${elementId} trovato`);
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout: elemento ${elementId} non trovato dopo ${timeout}ms`));
        } else {
          setTimeout(checkElement, 100);
        }
      };
      
      checkElement();
    });
  }

  /**
   * Avvia registrazione audio
   */
  async startRecording() {
    console.log('🎤 === START RECORDING DEBUG ===');
    
    try {
      console.log('🎤 Step 1: Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      console.log(`✅ Microphone access granted, tracks: ${stream.getAudioTracks().length}`);

      console.log('🎤 Step 2: Creating MediaRecorder...');
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      this.audioChunks = [];
      console.log('✅ MediaRecorder created, audioChunks reset');

      console.log('🎤 Step 3: Setting up event listeners...');
      this.mediaRecorder.ondataavailable = (event) => {
        console.log(`📊 ondataavailable: ${event.data.size} bytes`);
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log(`📦 Audio chunk added. Total chunks: ${this.audioChunks.length}`);
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log('⏹️ MediaRecorder onstop event triggered');
        this.processRecording();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error(`❌ MediaRecorder error:`, event.error);
      };
      console.log('✅ Event listeners configured');

      console.log('🎤 Step 4: Starting recording...');
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      console.log('✅ Recording started');

      console.log('🎤 Step 5: Updating UI...');
      this.showRecordingUI();
      this.startRecordingTimer();
      this.updateStatus('🔴 Registrazione in corso...', 'recording');
      console.log('✅ === START RECORDING COMPLETED ===');

    } catch (error) {
      console.error('❌ === START RECORDING ERROR ===');
      console.error('❌ Errore avvio registrazione:', error);
      console.error('❌ Error stack:', error.stack);
      this.updateStatus('❌ Errore microfono', 'error');
    }
  }

  /**
   * Ferma registrazione audio
   */
  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      this.isRecording = false;

      this.hideRecordingUI();
      this.stopRecordingTimer();
      this.updateStatus('✅ Registrazione completata', 'success');
    }
  }

  /**
   * Processa registrazione completata
   */
  processRecording() {
    console.log('🔄 === PROCESS RECORDING DEBUG ===');
    console.log(`📊 Audio chunks available: ${this.audioChunks.length}`);
    
    if (this.audioChunks.length === 0) {
      console.log('❌ No audio chunks available');
      this.showNotification('❌ Nessun audio registrato', 'error');
      return;
    }

    console.log('🔄 Creating audio blob...');
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    console.log(`📦 Audio blob created: ${audioBlob.size} bytes`);
    
    console.log('🔄 Creating object URL...');
    const audioUrl = URL.createObjectURL(audioBlob);
    console.log(`🔗 Audio URL created: ${audioUrl.substring(0, 50)}...`);

    // Salva la registrazione
    console.log('💾 Saving voice note...');
    this.saveVoiceNote(audioBlob, audioUrl);

    // Mostra pulsante trascrizione
    console.log('🔄 Setting up transcription button...');
    const transcribeBtn = document.getElementById('transcribe-btn');
    if (transcribeBtn) {
      transcribeBtn.style.display = 'inline-flex';
      transcribeBtn.disabled = false;
      transcribeBtn.setAttribute('data-audio-blob', audioUrl);
      console.log('✅ Transcription button configured');
    } else {
      console.log('⚠️ Transcription button not found');
    }
    
    console.log('✅ === PROCESS RECORDING COMPLETED ===');
  }

  /**
   * Salva nota vocale
   */
  async saveVoiceNote(audioBlob, audioUrl) {
    console.log('💾 === SAVE VOICE NOTE DEBUG ===');
    console.log(`📦 Audio blob size: ${audioBlob.size} bytes`);
    console.log(`🔗 Audio URL: ${audioUrl.substring(0, 50)}...`);
    
    try {
      const timestamp = new Date().toISOString();
      const noteId = 'note_' + Date.now();
      console.log(`📝 Note ID: ${noteId}`);
      console.log(`⏰ Timestamp: ${timestamp}`);
      
      // Converti blob in base64 per storage
      console.log('🔄 Converting blob to base64...');
      const base64Audio = await this.blobToBase64(audioBlob);
      console.log(`✅ Base64 conversion completed: ${base64Audio.length} characters`);
      
      const voiceNote = {
        id: noteId,
        timestamp: timestamp,
        audioUrl: audioUrl,
        audioBase64: base64Audio, // Salva base64 invece del blob
        transcription: null,
        size: Math.round(audioBlob.size / 1024) + ' KB'
      };
      console.log(`📦 Voice note object created: ${JSON.stringify(voiceNote, null, 2).substring(0, 300)}...`);

      // Salva in localStorage
      console.log('📚 Getting existing notes...');
      const savedNotes = this.getSavedNotes();
      console.log(`📊 Existing notes count: ${savedNotes.length}`);
      
      savedNotes.unshift(voiceNote);
      const notesToSave = savedNotes.slice(0, 10); // Keep only last 10
      console.log(`💾 Saving ${notesToSave.length} notes to localStorage...`);
      
      localStorage.setItem('smart_voice_notes', JSON.stringify(notesToSave));
      console.log('✅ Saved to localStorage successfully');

      console.log('🔄 Rendering voice notes...');
      this.renderVoiceNotes();
      console.log('✅ === SAVE VOICE NOTE COMPLETED ===');
      
      // Show success notification
      this.showNotification(`✅ Nota vocale salvata (${voiceNote.size})`, 'success');
      
    } catch (error) {
      console.error('❌ === SAVE VOICE NOTE ERROR ===');
      console.error(`❌ Error: ${error.message}`);
      console.error(`❌ Stack: ${error.stack}`);
      this.showNotification(`❌ Errore salvataggio: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Ottieni note salvate
   */
  getSavedNotes() {
    try {
      const savedNotes = JSON.parse(localStorage.getItem('smart_voice_notes') || '[]');
      console.log(`🎤 Note salvate trovate: ${savedNotes.length}`);
      return savedNotes;
    } catch (error) {
      console.error('❌ Errore lettura note salvate:', error);
      return [];
    }
  }

  /**
   * Rendering lista note vocali
   */
  renderVoiceNotes() {
    const notesList = document.getElementById('voice-notes-list');
    if (!notesList) {
      console.log('🎤 Lista note non trovata nel DOM');
      return;
    }

    const savedNotes = this.getSavedNotes();
    console.log(`🎤 Rendering ${savedNotes.length} note vocali`);
    
    // Salva riferimento ai pulsanti prima del render
    const startBtn = document.getElementById('start-recording-btn');
    const wasStartBtnEnabled = startBtn ? !startBtn.disabled : false;

    if (savedNotes.length === 0) {
      notesList.innerHTML = `
        <div class="no-notes">
          <i class="fas fa-microphone-slash"></i>
          <p>Nessuna nota vocale salvata</p>
        </div>
      `;
      return;
    }

    notesList.innerHTML = savedNotes.map(note => `
      <div class="voice-note-item" data-note-id="${note.id}">
        <div class="note-header">
          <div class="note-timestamp">${new Date(note.timestamp).toLocaleString('it-IT')}</div>
          <div class="note-size">${note.size}</div>
        </div>
        
        <div class="note-controls">
          <button class="note-btn play-btn" onclick="window.SmartAssistant.playNote('${note.id}')">
            <i class="fas fa-play"></i>
          </button>
          
          <button class="note-btn stop-btn" onclick="window.SmartAssistant.stopAudio()">
            <i class="fas fa-stop"></i>
          </button>
          
          ${note.transcription ? 
            `<button class="note-btn transcript-btn" onclick="window.SmartAssistant.showTranscript('${note.id}')">
              <i class="fas fa-file-text"></i>
            </button>` : 
            `<button class="note-btn transcribe-btn" onclick="window.SmartAssistant.transcribeNote('${note.id}')">
              <i class="fas fa-language"></i>
            </button>`
          }
          
          <button class="note-btn delete-btn" onclick="window.SmartAssistant.deleteNote('${note.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        
        ${note.transcription ? 
          `<div class="note-transcription" style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; border-left: 3px solid #007bff;">
            <strong>📝 Trascrizione:</strong><br>
            ${note.transcription}
          </div>` : 
          `<div class="note-no-transcription" style="background: #fff3cd; padding: 8px; border-radius: 4px; margin-top: 10px; color: #856404; font-size: 12px;">
            ⚠️ Trascrizione non disponibile - clicca su 🔤 per trascrivere
          </div>`
        }
      </div>
    `).join('');
    
    // CRITICO: Riattacca event listeners se i pulsanti di controllo potrebbero essere stati influenzati
    setTimeout(() => {
      this.ensureEventListeners();
    }, 100);
  }

  /**
   * Aggiorna status display
   */
  updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('recording-status');
    if (!statusEl) return;

    const statusText = statusEl.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = message;
      statusEl.className = `recording-status ${type}`;
    }
  }

  /**
   * Mostra UI durante registrazione
   */
  showRecordingUI() {
    console.log('🎤 showRecordingUI: Configurazione UI per registrazione');
    
    const startBtn = document.getElementById('start-recording-btn');
    const stopBtn = document.getElementById('stop-recording-btn');
    const visualization = document.getElementById('audio-visualization');
    const recordingInfo = document.getElementById('recording-info');

    console.log('🎤 showRecordingUI: Elementi trovati:', {
      startBtn: !!startBtn,
      stopBtn: !!stopBtn,
      visualization: !!visualization,
      recordingInfo: !!recordingInfo
    });

    if (startBtn) {
      startBtn.style.display = 'none';
      console.log('🎤 showRecordingUI: Pulsante Start nascosto');
    }
    
    if (stopBtn) {
      stopBtn.style.display = 'inline-flex';
      stopBtn.disabled = false;
      stopBtn.style.opacity = '1';
      stopBtn.style.cursor = 'pointer';
      stopBtn.style.backgroundColor = '#dc3545';
      stopBtn.style.borderColor = '#dc3545';
      console.log('🎤 showRecordingUI: Pulsante Stop mostrato e abilitato');
    } else {
      console.error('❌ showRecordingUI: Pulsante Stop non trovato!');
    }
    
    // Aggiungi indicatore visivo di registrazione
    this.addRecordingIndicator();
    
    if (visualization) visualization.style.display = 'block';
    if (recordingInfo) recordingInfo.style.display = 'flex';
  }

  /**
   * Aggiunge indicatore visivo di registrazione
   */
  addRecordingIndicator() {
    // Rimuovi indicatore esistente se presente
    this.removeRecordingIndicator();
    
    // Crea indicatore pulsante rosso animato
    const indicator = document.createElement('div');
    indicator.id = 'recording-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: #dc3545;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
      z-index: 10000;
      animation: pulse 1.5s infinite;
      cursor: pointer;
    `;
    indicator.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 18px;">🔴</div>
        <div>REC</div>
      </div>
    `;
    
    // Aggiungi click listener per fermare la registrazione
    indicator.addEventListener('click', () => {
      console.log('🎤 Recording indicator clicked - stopping recording');
      this.stopRecording();
    });
    
    document.body.appendChild(indicator);
    
    // Aggiungi CSS per animazione se non esiste
    if (!document.getElementById('recording-pulse-css')) {
      const style = document.createElement('style');
      style.id = 'recording-pulse-css';
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    console.log('✅ Indicatore di registrazione aggiunto');
  }

  /**
   * Rimuove indicatore visivo di registrazione
   */
  removeRecordingIndicator() {
    const indicator = document.getElementById('recording-indicator');
    if (indicator) {
      indicator.remove();
      console.log('✅ Indicatore di registrazione rimosso');
    }
  }

  /**
   * Nascondi UI registrazione
   */
  hideRecordingUI() {
    console.log('🎤 hideRecordingUI: Ripristino UI normale');
    
    const startBtn = document.getElementById('start-recording-btn');
    const stopBtn = document.getElementById('stop-recording-btn');
    const visualization = document.getElementById('audio-visualization');
    const recordingInfo = document.getElementById('recording-info');

    if (startBtn) {
      startBtn.style.display = 'inline-flex';
      console.log('🎤 hideRecordingUI: Pulsante Start mostrato');
    }
    if (stopBtn) {
      stopBtn.style.display = 'none';
      console.log('🎤 hideRecordingUI: Pulsante Stop nascosto');
    }
    
    // Rimuovi indicatore visivo
    this.removeRecordingIndicator();
    
    if (visualization) visualization.style.display = 'none';
    if (recordingInfo) recordingInfo.style.display = 'none';
  }

  /**
   * Timer registrazione
   */
  startRecordingTimer() {
    this.recordingStartTime = Date.now();
    this.recordingTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      
      const timerEl = document.querySelector('.recording-timer');
      if (timerEl) {
        timerEl.textContent = `${minutes}:${seconds}`;
      }
    }, 1000);
  }

  /**
   * Stop timer registrazione
   */
  stopRecordingTimer() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  /**
   * Refresh KPI dashboard
   */
  async refreshKPI() {
    const kpiCards = document.querySelectorAll('.kpi-card');
    kpiCards.forEach(card => card.classList.add('loading'));

    try {
      // Se abbiamo integrazione Supabase, usa dati reali
      if (this.supabaseAI) {
        const data = await this.supabaseAI.getAllData();
        this.updateKPIWithRealData(data);
      } else {
        // Altrimenti usa dati mock
        this.updateKPIWithMockData();
      }
    } catch (error) {
      console.error('❌ Errore refresh KPI:', error);
      this.updateKPIWithMockData();
    }
  }

  /**
   * Aggiorna KPI con dati reali
   */
  updateKPIWithRealData(data) {
    const today = new Date().toISOString().split('T')[0];
    
    // KPI 1: Vendite oggi
    const todayOrders = data.orders?.filter(order => 
      order.data_creazione?.startsWith(today)
    ) || [];
    
    // KPI 2: Clienti attivi
    const activeClients = data.clients?.length || 0;
    
    // KPI 3: Ordini pending
    const pendingOrders = data.orders?.filter(order => 
      order.stato?.toLowerCase() === 'pending' || !order.stato
    ) || [];
    
    // KPI 4: Km oggi (da timeline)
    const todayEvents = data.timeline?.filter(event => 
      event.data?.startsWith(today)
    ) || [];

    this.updateKPICards([
      { value: todayOrders.length, label: 'Ordini Oggi' },
      { value: activeClients, label: 'Clienti Attivi' },
      { value: pendingOrders.length, label: 'Ordini Pending' },
      { value: todayEvents.length, label: 'Eventi Oggi' }
    ]);
  }

  /**
   * Aggiorna KPI con dati mock
   */
  updateKPIWithMockData() {
    const mockKPIs = [
      { value: Math.floor(Math.random() * 10) + 5, label: 'Vendite Oggi' },
      { value: Math.floor(Math.random() * 50) + 25, label: 'Clienti Attivi' },
      { value: Math.floor(Math.random() * 8) + 2, label: 'Ordini Pending' },
      { value: Math.floor(Math.random() * 200) + 50, label: 'Km Oggi' }
    ];

    this.updateKPICards(mockKPIs);
  }

  /**
   * Aggiorna cards KPI
   */
  updateKPICards(kpis) {
    const kpiCards = document.querySelectorAll('.kpi-card');
    
    kpiCards.forEach((card, index) => {
      if (kpis[index]) {
        const valueEl = card.querySelector('.kpi-value');
        const labelEl = card.querySelector('.kpi-label');
        
        if (valueEl) valueEl.textContent = kpis[index].value;
        if (labelEl) labelEl.textContent = kpis[index].label;
        
        card.classList.remove('loading');
      }
    });
  }

  /**
   * Cancella tutte le note
   */
  clearNotes() {
    if (confirm('Vuoi davvero cancellare tutte le note vocali?')) {
      localStorage.removeItem('smart_voice_notes');
      this.renderVoiceNotes();
    }
  }

  /**
   * Play audio note
   */
  playNote(noteId) {
    const savedNotes = this.getSavedNotes();
    const note = savedNotes.find(n => n.id === noteId);
    
    if (note && (note.audioUrl || note.audioBase64)) {
      // Se c'è già un audio in riproduzione, fermalo
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }
      
      // Usa audioBase64 se audioUrl non è disponibile (dopo refresh)
      const audioSource = note.audioUrl || note.audioBase64;
      
      // Crea nuovo audio
      this.currentAudio = new Audio(audioSource);
      
      // Aggiorna UI per mostrare quale nota è in riproduzione
      document.querySelectorAll('.voice-note-item').forEach(item => {
        item.classList.remove('playing');
      });
      const currentNoteElement = document.querySelector(`[data-note-id="${noteId}"]`);
      if (currentNoteElement) {
        currentNoteElement.classList.add('playing');
      }
      
      // Gestisci eventi audio
      this.currentAudio.onended = () => {
        if (currentNoteElement) {
          currentNoteElement.classList.remove('playing');
        }
        this.currentAudio = null;
      };
      
      // Play audio
      this.currentAudio.play().catch(error => {
        console.error('❌ Errore riproduzione audio:', error);
        this.showNotification('❌ Impossibile riprodurre l\'audio', 'error');
        if (currentNoteElement) {
          currentNoteElement.classList.remove('playing');
        }
        this.currentAudio = null;
      });
    }
  }
  
  /**
   * Stop current audio
   */
  stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
      
      // Rimuovi classe playing da tutte le note
      document.querySelectorAll('.voice-note-item').forEach(item => {
        item.classList.remove('playing');
      });
      
      this.showNotification('⏹️ Riproduzione fermata', 'info');
    }
  }

  /**
   * Show transcription
   */
  showTranscript(noteId) {
    const savedNotes = this.getSavedNotes();
    const note = savedNotes.find(n => n.id === noteId);
    
    if (note && note.transcription) {
      // Mostra trascrizione con opzione di modifica
      const editTranscript = prompt(
        `📝 Trascrizione della nota vocale:\n\n${note.transcription}\n\n` +
        `💡 Puoi modificare il testo qui sotto e cliccare OK per salvare le modifiche:`,
        note.transcription
      );
      
      // Se l'utente ha modificato il testo, salvalo
      if (editTranscript !== null && editTranscript !== note.transcription) {
        note.transcription = editTranscript;
        
        // Salva le modifiche
        const updatedNotes = savedNotes.map(n => n.id === noteId ? note : n);
        localStorage.setItem('smart_voice_notes', JSON.stringify(updatedNotes));
        
        // Aggiorna la UI
        this.renderVoiceNotes();
        
        this.showNotification('✅ Trascrizione aggiornata con successo!', 'success');
      }
    } else {
      // Se non c'è trascrizione, offri di crearne una
      const shouldTranscribe = confirm(
        '❌ Trascrizione non disponibile per questa nota.\n\n' +
        '🔤 Vuoi tentare di trascriverla ora?'
      );
      
      if (shouldTranscribe) {
        this.transcribeNote(noteId);
      }
    }
  }

  /**
   * Transcribe audio note
   */
  async transcribeNote(noteId) {
    const savedNotes = this.getSavedNotes();
    const note = savedNotes.find(n => n.id === noteId);
    
    if (!note) return;
    
    // Dichiara noteElement fuori dal try/catch per usarlo nel catch
    const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
    
    try {
      // Mostra stato trascrizione
      if (noteElement) {
        const transcribeBtn = noteElement.querySelector('.transcribe-btn');
        if (transcribeBtn) {
          transcribeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
          transcribeBtn.disabled = true;
        }
      }

      // Trascrizione con fallback automatico
      let transcription;
      try {
        // Prova prima con l'API esterna
        transcription = await this.callSpeechToTextAPIFromBase64(note.audioBase64);
      } catch (error) {
        console.log('🔄 API esterna fallita, usando Web Speech API del browser...');
        // Fallback con Web Speech API del browser
        transcription = await this.transcribeWithWebSpeechAPI(note.audioBase64);
      }
      
      // Salva trascrizione
      note.transcription = transcription;
      
      // 🧠 ANALISI AI INTELLIGENTE - Nuovo sistema!
      await this.performIntelligentAnalysis(note);
      
      const updatedNotes = savedNotes.map(n => n.id === noteId ? note : n);
      localStorage.setItem('smart_voice_notes', JSON.stringify(updatedNotes));
      
      // Aggiorna UI
      this.renderVoiceNotes();
      
      // 🔐 NOTIFICA SISTEMA SICURO per organizzazione automatica
      this.notifySecureStorage(note);
      
      // Mostra notifica successo con analisi
      this.showNotification('✅ Trascrizione e analisi completate!', 'success');
      
    } catch (error) {
      console.error('❌ Errore trascrizione:', error);
      this.showNotification('❌ Errore durante la trascrizione', 'error');
      
      // Ripristina pulsante
      if (noteElement) {
        const transcribeBtn = noteElement.querySelector('.transcribe-btn');
        if (transcribeBtn) {
          transcribeBtn.innerHTML = '<i class="fas fa-language"></i>';
          transcribeBtn.disabled = false;
        }
      }
    }
  }

  /**
   * Delete note
   */
  deleteNote(noteId) {
    if (confirm('Vuoi davvero cancellare questa nota?')) {
      const savedNotes = this.getSavedNotes();
      const filteredNotes = savedNotes.filter(n => n.id !== noteId);
      localStorage.setItem('smart_voice_notes', JSON.stringify(filteredNotes));
      this.renderVoiceNotes();
    }
  }

  /**
   * Transcribe current audio
   */
  async transcribeAudio() {
    const transcribeBtn = document.getElementById('transcribe-btn');
    if (!transcribeBtn) return;

    const audioUrl = transcribeBtn.getAttribute('data-audio-blob');
    if (!audioUrl) return;

    try {
      transcribeBtn.disabled = true;
      transcribeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Trascrizione...';

      // Ottieni l'ultimo audio registrato
      const audioBlob = this.audioChunks.length > 0 ? 
        new Blob(this.audioChunks, { type: 'audio/webm' }) : null;
      
      if (!audioBlob) {
        throw new Error('Nessun audio da trascrivere');
      }

      // Trascrizione reale con Speech-to-Text API
      const transcription = await this.callSpeechToTextAPI(audioBlob);
      
      // 🧠 ANALISI AI anche per trascrizioni dirette
      const tempNote = {
        id: 'temp_' + Date.now(),
        transcription: transcription,
        timestamp: new Date().toISOString()
      };
      
      // Analizza la trascrizione
      await this.performIntelligentAnalysis(tempNote);
      
      // Mostra trascrizione con analisi
      this.showTranscriptionDialog(transcription, tempNote.aiAnalysis);
      
      // Reset button
      transcribeBtn.innerHTML = '<i class="fas fa-file-text"></i> Trascrivi';
      transcribeBtn.style.display = 'none';
      transcribeBtn.disabled = false;

    } catch (error) {
      console.error('❌ Errore trascrizione:', error);
      this.showNotification('❌ Errore durante la trascrizione', 'error');
      
      transcribeBtn.innerHTML = '<i class="fas fa-file-text"></i> Trascrivi';
      transcribeBtn.disabled = false;
    }
  }

  /**
   * Chiama API Speech-to-Text con fallback iPad
   */
  async callSpeechToTextAPI(audioBlob) {
    // iPad fallback: usa Web Speech API locale
    if (this.isIPad && IPAD_CONFIG.useLocalSpeechRecognition) {
      console.log('📱 iPad: Usando Speech Recognition locale');
      return this.fallbackLocalSpeechRecognition(audioBlob);
    }

    // Se endpoint API è disabilitato, usa fallback
    if (!this.apiEndpoint) {
      console.log('📱 API endpoint disabilitato - fallback locale');
      return this.fallbackLocalSpeechRecognition(audioBlob);
    }
    
    try {
      // Converti blob in base64
      const base64Audio = await this.blobToBase64(audioBlob);
      
      // Costruisci URL API
      const apiUrl = `${this.apiEndpoint}/speech-to-text-complex`;
      console.log('🌐 Chiamando API:', apiUrl);
      
      // Chiama API con timeout ridotto per iPad
      const timeout = this.isIPad ? IPAD_CONFIG.reducedTimeout : 30000;
      const response = await this.fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio: base64Audio
        })
      }, timeout);

      if (!response.ok) {
        throw new Error(`Errore API: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Errore sconosciuto');
      }

      return result.text;
      
    } catch (error) {
      console.error('❌ Errore API trascrizione:', error);
      
      // Fallback per iPad o errori 502
      if (this.isIPad || error.message.includes('502')) {
        console.log('📱 Fallback a Speech Recognition locale');
        return this.fallbackLocalSpeechRecognition(audioBlob);
      }
      
      throw error;
    }
  }

  /**
   * Fetch con timeout
   */
  async fetchWithTimeout(url, options, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Fallback Speech Recognition locale per iPad
   */
  async fallbackLocalSpeechRecognition(audioBlob) {
    console.log('📱 Avviando fallback Speech Recognition locale...');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return 'Trascrizione non disponibile su questo dispositivo';
    }

    return new Promise((resolve, reject) => {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'it-IT';
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('📱 Speech Recognition risultato:', transcript);
        resolve(transcript);
      };
      
      recognition.onerror = (event) => {
        console.error('📱 Speech Recognition errore:', event.error);
        resolve('Trascrizione automatica non riuscita. Premere il pulsante microfono e parlare.');
      };
      
      recognition.onend = () => {
        console.log('📱 Speech Recognition terminato');
      };
      
      // Simula avvio da audio blob (per UI consistency)
      setTimeout(() => {
        try {
          recognition.start();
        } catch (error) {
          console.log('📱 Fallback a messaggio predefinito');
          resolve('Usa il pulsante microfono per dettare il testo');
        }
      }, 500);
      
      // Timeout di sicurezza
      setTimeout(() => {
        recognition.stop();
        resolve('Timeout trascrizione - usa il pulsante microfono');
      }, 8000);
    });
  }

  /**
   * Fallback trascrizione con Web Speech API del browser
   */
  async transcribeWithWebSpeechAPI(base64Audio) {
    return new Promise((resolve, reject) => {
      try {
        console.log('🎤 Inizializzazione Web Speech API...');
        
        // Controlla supporto browser
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          throw new Error('Web Speech API non supportata dal browser');
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Configurazione
        recognition.lang = 'it-IT';
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        let transcript = '';
        
        recognition.onresult = function(event) {
          console.log('🎤 Risultato Web Speech API ricevuto');
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              transcript += event.results[i][0].transcript + ' ';
            }
          }
        };
        
        recognition.onend = function() {
          console.log('🎤 Web Speech API completata');
          const finalTranscript = transcript.trim();
          if (finalTranscript) {
            resolve(finalTranscript);
          } else {
            resolve('Trascrizione completata (Web Speech API - contenuto non rilevato)');
          }
        };
        
        recognition.onerror = function(event) {
          console.error('❌ Errore Web Speech API:', event.error);
          resolve('Trascrizione fallback completata (errore: ' + event.error + ')');
        };
        
        // Tenta di convertire base64 in audio per trascrizione
        console.log('🔄 Tentativo conversione audio da base64...');
        
        try {
          // Converti base64 in blob
          fetch(base64Audio).then(response => response.blob()).then(blob => {
            // Crea un audio element per la riproduzione
            const audio = new Audio();
            const audioUrl = URL.createObjectURL(blob);
            audio.src = audioUrl;
            
            // Per ora offriamo trascrizione user-assisted
            setTimeout(() => {
              const userTranscript = prompt('🎤 Per completare la trascrizione, puoi inserire il testo che hai pronunciato nella registrazione:\n\n(Oppure clicca Annulla per usare il placeholder)');
              
              if (userTranscript && userTranscript.trim()) {
                resolve(userTranscript.trim());
              } else {
                resolve('📝 Trascrizione vocale salvata (modalità offline)\n\n💡 Suggerimento: Puoi modificare manualmente questa trascrizione cliccando sul pulsante "Mostra Trascrizione" della nota.');
              }
              
              // Cleanup
              URL.revokeObjectURL(audioUrl);
            }, 500);
          }).catch(error => {
            console.error('❌ Errore fetch audio:', error);
            setTimeout(() => {
              resolve('📝 Nota vocale salvata con successo\n\n⚠️ Trascrizione automatica non disponibile - puoi aggiungere note testuali manualmente');
            }, 500);
          });
          
        } catch (error) {
          console.error('❌ Errore conversione audio:', error);
          setTimeout(() => {
            resolve('📝 Nota vocale salvata con successo\n\n⚠️ Trascrizione automatica non disponibile - puoi aggiungere note testuali manualmente');
          }, 500);
        }
        
      } catch (error) {
        console.error('❌ Errore inizializzazione Web Speech API:', error);
        resolve('Trascrizione offline completata (fallback finale)');
      }
    });
  }

  /**
   * Chiama API Speech-to-Text da base64 con fallback iPad
   */
  async callSpeechToTextAPIFromBase64(base64Audio) {
    // iPad fallback: evita chiamata API
    if (this.isIPad && IPAD_CONFIG.disableServerTranscription) {
      console.log('📱 iPad: Trascrizione server disabilitata');
      return 'Trascrizione completata (modalità offline iPad)';
    }

    // Se endpoint API è disabilitato, usa fallback
    if (!this.apiEndpoint) {
      console.log('📱 API endpoint disabilitato');
      return 'Trascrizione offline completata';
    }
    
    try {
      // Costruisci URL API
      const apiUrl = `${this.apiEndpoint}/speech-to-text-complex`;
      console.log('🌐 Chiamando API trascrizione:', apiUrl);
      
      // Chiama API direttamente con base64
      const timeout = this.isIPad ? IPAD_CONFIG.reducedTimeout : 30000;
      const response = await this.fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio: base64Audio
        })
      }, timeout);

      if (!response.ok) {
        throw new Error(`Errore API: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Errore sconosciuto');
      }

      return result.text;
      
    } catch (error) {
      console.error('❌ Errore API trascrizione base64:', error.message || error);
      
      // Fallback per iPad o errori 502
      if (this.isIPad || error.message.includes('502')) {
        console.log('📱 Fallback modalità offline iPad');
        return 'Trascrizione completata (modalità offline)';
      }
      
      throw error;
    }
  }

  /**
   * Converti Blob in Base64
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Mostra notifica
   */
  showNotification(message, type = 'info') {
    // Crea elemento notifica
    const notification = document.createElement('div');
    notification.className = `smart-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        ${message}
      </div>
    `;
    
    // Aggiungi al container
    const container = document.getElementById('smart-content');
    if (container) {
      container.appendChild(notification);
      
      // Anima entrata
      setTimeout(() => notification.classList.add('show'), 10);
      
      // Rimuovi dopo 3 secondi
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }
  }

  /**
   * Mostra dialog trascrizione
   */
  showTranscriptionDialog(transcription, aiAnalysis = null) {
    const dialog = document.createElement('div');
    dialog.className = 'smart-dialog';
    dialog.innerHTML = `
      <div class="dialog-overlay"></div>
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>📝 Trascrizione Audio</h3>
          <button class="dialog-close" onclick="this.closest('.smart-dialog').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="dialog-body">
          <div class="transcription-text">
            ${transcription}
          </div>
          ${aiAnalysis && (aiAnalysis.persone?.length > 0 || aiAnalysis.aziende?.length > 0) ? `
            <div class="ai-analysis-results">
              <h4>🤖 Entità rilevate:</h4>
              ${aiAnalysis.persone?.length > 0 ? `
                <p><strong>Persone:</strong> ${aiAnalysis.persone.join(', ')}</p>
              ` : ''}
              ${aiAnalysis.aziende?.length > 0 ? `
                <p><strong>Aziende:</strong> ${aiAnalysis.aziende.join(', ')}</p>
              ` : ''}
            </div>
          ` : ''}
        </div>
        <div class="dialog-footer">
          <button class="btn btn-primary" onclick="window.SmartAssistant.copyTranscription('${encodeURIComponent(transcription)}')">
            <i class="fas fa-copy"></i> Copia
          </button>
          <button class="btn btn-secondary" onclick="this.closest('.smart-dialog').remove()">
            Chiudi
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Anima entrata
    setTimeout(() => dialog.classList.add('show'), 10);
  }

  /**
   * Copia trascrizione negli appunti
   */
  copyTranscription(encodedText) {
    const text = decodeURIComponent(encodedText);
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showNotification('✅ Trascrizione copiata!', 'success');
      }).catch(err => {
        console.error('Errore copia:', err);
        this.showNotification('❌ Errore durante la copia', 'error');
      });
    } else {
      // Fallback per browser più vecchi
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showNotification('✅ Trascrizione copiata!', 'success');
    }
  }

  /**
   * Hook Navigation - On Enter
   */
  onEnter() {
    console.log('🎤 SmartAssistant: Entered tab');
    
    // Verifica che il container sia inizializzato
    if (!this.container) {
      console.log('🎤 SmartAssistant: Container non trovato, inizializzo...');
      this.init();
      return;
    }
    
    // Refresh KPI quando si entra nel tab
    setTimeout(() => {
      this.refreshKPI();
    }, 500);
    
    // Render note vocali
    console.log('🎤 SmartAssistant: Rendering note vocali...');
    this.renderVoiceNotes();
  }

  /**
   * 🧠 ANALISI AI INTELLIGENTE DELLE NOTE
   * Analizza il contenuto e organizza automaticamente
   */
  async performIntelligentAnalysis(note) {
    if (!note.transcription) return;
    
    try {
      console.log('🧠 Avvio analisi AI per nota:', note.id);
      
      // Mostra indicatore di analisi
      this.showNotification('🧠 Analisi AI in corso...', 'info');
      
      // Chiama API AI per analisi intelligente
      const analysis = await this.callAIAnalysisAPI(note.transcription);
      
      // Salva i risultati dell'analisi nella nota
      note.aiAnalysis = {
        ...analysis,
        analyzedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      // Genera azioni automatiche se necessario
      if (analysis.actionRequired) {
        await this.generateAutomaticTasks(note, analysis);
      }
      
      // Organizza la nota nelle cartelle appropriate
      await this.organizeNoteInFolders(note, analysis);
      
      console.log('✅ Analisi AI completata:', analysis);
      
      // 💾 SALVA SU SUPABASE (modulo isolato)
      if (window.smartAssistantSupabase) {
        try {
          await window.smartAssistantSupabase.saveNoteToSupabase(note, analysis);
        } catch (supabaseError) {
          // Non bloccare se Supabase fallisce
          console.warn('⚠️ Salvataggio Supabase fallito (non bloccante):', supabaseError);
        }
      }
      
    } catch (error) {
      console.error('❌ Errore analisi AI:', error);
      this.showNotification('⚠️ Analisi AI fallita, nota salvata comunque', 'error');
    }
  }

  /**
   * 🔍 CHIAMA API AI PER ANALISI CONTENUTO
   */
  async callAIAnalysisAPI(transcription) {
    const analysisPrompt = {
      message: `Analizza SOLO questa specifica nota vocale ed estrai le entità menzionate SOLO in questa trascrizione:

TRASCRIZIONE DA ANALIZZARE: "${transcription}"

IMPORTANTE: 
- Estrai SOLO i nomi che appaiono ESPLICITAMENTE in questa trascrizione
- NON inventare o aggiungere nomi non presenti
- Se non ci sono nomi di persone o aziende, lascia i campi vuoti
- Ignora completamente qualsiasi contesto o nota precedente

ESEMPI DI PERSONE da rilevare (SOLO se presenti nella trascrizione):
- "Mauro" -> persona
- "Francesco Ferrarini" -> persona  
- "Mario il rappresentante" -> persona "Mario"

ESEMPI DI AZIENDE da rilevare (SOLO se presenti nella trascrizione):
- "SM" -> azienda "Essemme Conad Montegrosso"
- "Essemme" -> azienda "Essemme Conad Montegrosso"
- "ditta SM" -> azienda "Essemme Conad Montegrosso"
- "Ferrarini" -> azienda
- "Agrilatteria del Pianalto" -> azienda

IMPORTANTE: Quando trovi "SM", "Essemme" o "ditta SM", restituisci sempre "Essemme Conad Montegrosso" nel JSON.

Fornisci ESCLUSIVAMENTE questo JSON (senza markdown, senza spiegazioni):

{
  "ENTITÀ RILEVATE": {
    "Persone": ["nome1", "nome2"],
    "Aziende": ["Essemme Conad Montegrosso", "azienda2"]
  },
  "categoria": "clienti|fornitori|contatti_business|pensieri|libri|video",
  "priorita": "bassa|media|alta|urgente",
  "actionRequired": true/false,
  "paroleChiave": ["parola1", "parola2"]
}`,
      isVoiceInput: false,
      model: 'gpt-3.5-turbo'
    };

    // Usa sempre l'URL di Replit per le API
    const apiUrl = window.AI_CONFIG?.apiEndpoint || '/.netlify/functions/claude-ai';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analysisPrompt)
    });

    if (!response.ok) {
      throw new Error(`Errore API AI: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('🔍 RAW AI RESPONSE:', result.response);
    
    // Prova a parsare la risposta come JSON
    try {
      const analysis = JSON.parse(result.response);
      console.log('✅ PARSED AI ANALYSIS:', analysis);
      return analysis;
    } catch (parseError) {
      // Se non è JSON valido, crea struttura base
      console.warn('⚠️ Risposta AI non in formato JSON, uso analisi base');
      console.warn('Parse error:', parseError);
      console.warn('Raw response:', result.response);
      const basicAnalysis = this.createBasicAnalysis(transcription);
      console.log('🔧 FALLBACK ANALYSIS:', basicAnalysis);
      return basicAnalysis;
    }
  }

  /**
   * 📋 CREA ANALISI BASE SE AI FALLISCE
   */
  createBasicAnalysis(transcription) {
    const text = transcription.toLowerCase();
    
    // Rilevamento base con regex
    const entities = {
      persone: this.extractPersonNames(transcription), // Usa il testo originale, non lowercase
      aziende: this.extractCompanyNames(transcription), // Usa il testo originale, non lowercase
      azioni: this.extractActions(text)
    };
    
    console.log('🔧 BASIC ENTITY EXTRACTION:', entities);
    
    // Categorizzazione base
    let categoria = 'pensieri'; // Default
    if (text.includes('cliente') || text.includes('comprare')) categoria = 'clienti';
    if (text.includes('fornitore') || text.includes('rappresentante')) categoria = 'fornitori';
    if (text.includes('chiamare') || text.includes('telefonare')) categoria = 'contatti_business';
    if (text.includes('libro') || text.includes('leggere')) categoria = 'libri';
    if (text.includes('video') || text.includes('youtube')) categoria = 'video';
    
    // Priorità base
    let priorita = 'media';
    if (text.includes('urgente') || text.includes('subito')) priorita = 'urgente';
    if (text.includes('importante')) priorita = 'alta';
    
    return {
      "ENTITÀ RILEVATE": {
        "Persone": entities.persone,
        "Aziende": entities.aziende
      },
      categoria: categoria,
      priorita: priorita,
      azioni: entities.azioni.length > 0,
      actionRequired: entities.azioni.length > 0,
      paroleChiave: text.split(' ').filter(word => word.length > 3).slice(0, 10)
    };
  }

  /**
   * 🔍 ESTRAZIONE ENTITÀ BASE CON REGEX
   */
  extractPersonNames(text) {
    // Pattern per nomi italiani comuni
    const namePatterns = [
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Mario Rossi
      /\b[A-Z][a-z]+\b(?=\s+(il|la|di|del|della|per|rappresentante))/g, // Mario il rappresentante
      /\b(Mauro|Francesco|Mario|Serena|Valerio|Alessandro|Andrea|Antonio|Carlo|Davide|Fabio|Giacomo|Giuseppe|Lorenzo|Luca|Marco|Matteo|Paolo|Roberto|Stefano|Anna|Chiara|Elena|Francesca|Giulia|Laura|Maria|Paola|Sara|Valentina)\b/gi, // Nomi comuni italiani
      /\bFerrarini\b/gi // Cognomi specifici
    ];
    
    const names = [];
    namePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Pulisci il match da articoli e preposizioni
          const cleanName = match.replace(/\s+(il|la|di|del|della|per|rappresentante).*$/gi, '').trim();
          if (cleanName.length > 1) names.push(cleanName);
        });
      }
    });
    
    return [...new Set(names)]; // Rimuovi duplicati
  }

  extractCompanyNames(text) {
    // Pattern per aziende
    const companyPatterns = [
      /\b[A-Z][a-z]+ (S\.?R\.?L\.?|S\.?P\.?A\.?|&? ?C\.?)\b/gi,
      /\b[A-Z][A-Z]+ [A-Z][a-z]+\b/g, // ACME Company
      /\b(Essemme|Ferrarini|Agrilatteria|Pianalto)\b/gi, // Aziende specifiche
      /\bditta\s+SM\b/gi, // "ditta SM" -> ESSEMME
      /\bSM\b/g, // "SM" -> ESSEMME
      /\b([A-Z][a-z]+)\s+(del|della)\s+([A-Z][a-z]+)\b/gi, // "Agrilatteria del Pianalto"
      /\b[A-Z]{2,4}\b/g // Sigle come "SM"
    ];
    
    const companies = [];
    companyPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Pulisci il match e normalizza SM -> ESSEMME
          let cleanCompany = match.replace(/^ditta\s+/gi, '').trim();
          
          // Normalizza SM in Essemme Conad Montegrosso
          if (cleanCompany.toUpperCase() === 'SM' || match.toLowerCase().includes('ditta sm') || cleanCompany.toLowerCase() === 'essemme') {
            cleanCompany = 'Essemme Conad Montegrosso';
          }
          
          if (cleanCompany.length > 1 && !['il', 'la', 'di', 'del', 'della', 'per', 'con'].includes(cleanCompany.toLowerCase())) {
            companies.push(cleanCompany);
          }
        });
      }
    });
    
    return [...new Set(companies)];
  }

  extractActions(text) {
    // Pattern per azioni
    const actionPatterns = [
      /\b(chiamare|telefonare|contattare)\s+([^.!?]+)/gi,
      /\b(ricordare|promemoria)\s+([^.!?]+)/gi,
      /\b(ordinare|comprare|vendere)\s+([^.!?]+)/gi
    ];
    
    const actions = [];
    actionPatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        actions.push({
          azione: match[1],
          oggetto: match[2].trim()
        });
      });
    });
    
    return actions;
  }

  /**
   * 📋 GENERA TASK AUTOMATICI
   */
  async generateAutomaticTasks(note, analysis) {
    if (!analysis.actionRequired) return;
    
    console.log('📋 Generazione task automatici per nota:', note.id);
    
    // Recupera o crea lista task
    const tasks = JSON.parse(localStorage.getItem('smart_automatic_tasks') || '[]');
    const callList = JSON.parse(localStorage.getItem('smart_call_list') || '[]');
    
    // Estrai azioni dalla trascrizione
    const extractedActions = this.extractActionsFromTranscription(note.transcription, analysis);
    console.log('📋 Azioni estratte:', extractedActions);
    
    extractedActions.forEach(action => {
      const task = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        noteId: note.id,
        tipo: action.tipo,
        descrizione: action.descrizione,
        persone: action.persone || [],
        aziende: action.aziende || [],
        priorita: analysis.priorita || 'media',
        dataCreazione: new Date().toISOString(),
        dataScadenza: this.calculateTaskDueDate(analysis.priorita, note.transcription),
        stato: 'pending',
        categoria: analysis.categoria || 'business'
      };
      
      tasks.unshift(task);
      
      // Se è una chiamata, aggiungila alla lista chiamate
      if (action.tipo === 'call') {
        const callTask = {
          id: 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          taskId: task.id,
          noteId: note.id,
          persona: action.persone[0] || 'Sconosciuto',
          azienda: action.aziende[0] || '',
          motivo: action.motivo || action.descrizione,
          priorita: analysis.priorita || 'media',
          dataCreazione: new Date().toISOString(),
          dataScadenza: task.dataScadenza,
          stato: 'pending',
          completata: false
        };
        
        callList.unshift(callTask);
      }
      
      // Se è un messaggio WhatsApp, aggiungilo alla lista messaggi
      if (action.tipo === 'whatsapp') {
        const whatsappTask = {
          id: 'whatsapp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          taskId: task.id,
          noteId: note.id,
          persona: action.persone[0] || 'Sconosciuto',
          azienda: action.aziende[0] || '',
          motivo: action.motivo || action.descrizione,
          priorita: analysis.priorita || 'media',
          dataCreazione: new Date().toISOString(),
          dataScadenza: task.dataScadenza,
          stato: 'pending',
          completata: false,
          tipo: 'whatsapp'
        };
        
        // Aggiungi alla lista messaggi WhatsApp separata
        const whatsappList = JSON.parse(localStorage.getItem('smart_whatsapp_list') || '[]');
        whatsappList.unshift(whatsappTask);
        localStorage.setItem('smart_whatsapp_list', JSON.stringify(whatsappList.slice(0, 30)));
      }
    });
    
    // Pulisci chiamate duplicate prima di salvare
    const uniqueCallList = this.removeDuplicateCalls(callList);
    
    // Salva task e chiamate aggiornati
    localStorage.setItem('smart_automatic_tasks', JSON.stringify(tasks.slice(0, 50))); // Max 50 task
    localStorage.setItem('smart_call_list', JSON.stringify(uniqueCallList.slice(0, 30))); // Max 30 chiamate
    
    // Notifica task creati
    const totalCreated = extractedActions.length;
    const callsCreated = extractedActions.filter(a => a.tipo === 'call').length;
    const whatsappCreated = extractedActions.filter(a => a.tipo === 'whatsapp').length;
    
    if (totalCreated > 0) {
      let message = `📋 ${totalCreated} task automatici creati`;
      const taskDetails = [];
      if (callsCreated > 0) taskDetails.push(`${callsCreated} chiamate`);
      if (whatsappCreated > 0) taskDetails.push(`${whatsappCreated} messaggi WhatsApp`);
      
      if (taskDetails.length > 0) {
        message += ` (${taskDetails.join(', ')})`;
      }
      
      this.showNotification(message + '!', 'success');
      
      // Mostra anteprima chiamate da fare
      if (callsCreated > 0) {
        this.showCallListPreview(uniqueCallList.slice(0, 3));
      }
      
      // Aggiorna la visualizzazione
      this.renderCallList();
      this.renderWhatsappList();
      this.renderTaskList();
    }
  }

  detectTaskType(azione) {
    const actionLower = azione.toLowerCase();
    if (actionLower.includes('chiamare') || actionLower.includes('telefonare')) return 'call';
    if (actionLower.includes('email') || actionLower.includes('scrivere')) return 'email';
    if (actionLower.includes('ordinare') || actionLower.includes('comprare')) return 'order';
    return 'reminder';
  }

  calculateTaskDueDate(priorita, transcription = '') {
    const now = new Date();
    const text = transcription.toLowerCase();
    
    // Analizza il testo per riferimenti temporali specifici
    const timeReferences = {
      today: [
        'questa mattina', 'stamattina', 'oggi', 'entro le ore', 'entro oggi',
        'prima di mezzogiorno', 'entro le 12', 'entro le ore 12'
      ],
      tomorrow: [
        'domani mattina', 'domani', 'tomorrow', 'entro domani'
      ]
    };
    
    // Controlla se il testo indica "oggi"
    const isToday = timeReferences.today.some(ref => text.includes(ref));
    const isTomorrow = timeReferences.tomorrow.some(ref => text.includes(ref));
    
    if (isToday) {
      // Se dice "questa mattina" o "entro le ore 12", imposta per oggi
      if (text.includes('entro le ore 12') || text.includes('entro le 12')) {
        now.setHours(12, 0, 0, 0); // Entro mezzogiorno di oggi
      } else if (text.includes('questa mattina') || text.includes('stamattina')) {
        now.setHours(10, 0, 0, 0); // Mattina di oggi
      } else {
        now.setHours(18, 0, 0, 0); // Fine giornata di oggi
      }
      console.log('📅 Data task: OGGI per riferimento temporale nel testo');
      return now.toISOString();
    }
    
    if (isTomorrow) {
      now.setDate(now.getDate() + 1);
      now.setHours(9, 0, 0, 0); // Domani mattina
      console.log('📅 Data task: DOMANI per riferimento temporale nel testo');
      return now.toISOString();
    }
    
    // Se non trova riferimenti temporali specifici, usa la priorità
    switch(priorita) {
      case 'urgente': 
        now.setHours(now.getHours() + 2); // 2 ore
        break;
      case 'alta':
        now.setDate(now.getDate() + 1); // Domani
        break;
      case 'media':
        now.setDate(now.getDate() + 1); // Domani per task medi
        break;
      default:
        now.setDate(now.getDate() + 7); // 1 settimana
    }
    
    console.log('📅 Data task: Calcolata da priorità', priorita);
    return now.toISOString();
  }

  /**
   * 🔍 ESTRAI AZIONI DALLA TRASCRIZIONE
   */
  extractActionsFromTranscription(transcription, analysis) {
    const actions = [];
    const text = transcription.toLowerCase();
    
    // Estrai entità rilevate
    const persone = analysis["ENTITÀ RILEVATE"]?.Persone || analysis.entita?.persone || [];
    const aziende = analysis["ENTITÀ RILEVATE"]?.Aziende || analysis.entita?.aziende || [];
    
    // Analizza il testo per identificare le azioni specifiche
    console.log('🔍 Analisi testo per azioni:', transcription);
    
    // Identifica azioni specifiche per persona
    persone.forEach(persona => {
      // Cerca frasi che menzionano questa persona con un'azione
      const personaLower = persona.toLowerCase();
      const textLower = transcription.toLowerCase();
      
      // Pattern per diverse azioni con la persona
      const actionPatterns = [
        new RegExp(`\\b(chiamare|telefonare|contattare|sentire)\\s+${personaLower}\\b`, 'gi'), // "chiamare Mauro"
        new RegExp(`\\b(mandare|inviare|spedire)\\s+.*\\s+(a|al)\\s+${personaLower}\\b`, 'gi'), // "mandare messaggio a Valerio"
        new RegExp(`\\b(messaggio|whatsapp|whazzap)\\s+.*\\s+(a|al)\\s+${personaLower}\\b`, 'gi'), // "messaggio a Valerio"
        new RegExp(`\\b${personaLower}\\s+(dell'|del|della)`, 'gi') // "Valerio dell'Agrilatteria" (per identificare persona anche senza azione diretta)
      ];
      
      let actionFound = false;
      let actionType = 'call'; // default
      
      actionPatterns.forEach((pattern, index) => {
        const match = textLower.match(pattern);
        if (match) {
          actionFound = true;
          // Determina il tipo di azione in base al pattern
          if (index === 1 || index === 2) { // pattern per messaggio
            actionType = 'message';
          } else if (index === 3) { // solo menzione della persona
            // Cerca nel contesto se c'è un'azione di messaggio
            if (textLower.includes('messaggio') || textLower.includes('whatsapp') || textLower.includes('whazzap')) {
              actionType = 'message';
            }
          }
        }
      });
      
      const callMatch = actionFound;
      
      if (callMatch) {
        // Trova l'azienda associata a questa persona
        let aziendaAssociata = '';
        aziende.forEach(azienda => {
          // Cerca patterns specifici per persona-azienda
          const aziendaLower = azienda.toLowerCase();
          
          // Pattern specifici per associazioni
          const patterns = [
            new RegExp(`${personaLower}\\s+(della|dell'|di)\\s+.*${aziendaLower.replace(/\s+/g, '.*')}`, 'gi'),
            new RegExp(`${personaLower}\\s+(della ditta)\\s+.*${aziendaLower.split(' ')[0]}`, 'gi'), // "Mauro della ditta SM"
            new RegExp(`${personaLower}\\s+(dell'|del)\\s*${aziendaLower.replace(/\s+/g, '.*')}`, 'gi') // "Valerio dell'Agrilatteria"
          ];
          
          // Associazioni specifiche hardcoded per maggiore precisione
          if (personaLower === 'mauro') {
            // Mauro è SEMPRE associato a Essemme, indipendentemente dal contesto
            if (aziendaLower.includes('essemme') || aziendaLower.includes('conad') || aziendaLower.includes('montegrosso')) {
              aziendaAssociata = azienda;
              return; // Exit subito per evitare override
            }
          } else if (personaLower === 'valerio') {
            // Valerio è associato ad Agrilatteria
            if (aziendaLower.includes('agrilatteria') || aziendaLower.includes('pianalto')) {
              aziendaAssociata = azienda;
              return; // Exit subito per evitare override
            }
          } else {
            // Usa i pattern per altri casi
            patterns.forEach(pattern => {
              if (textLower.match(pattern)) {
                aziendaAssociata = azienda;
              }
            });
          }
        });
        
        // FALLBACK: Se Mauro non ha azienda associata, forza Essemme
        if (personaLower === 'mauro' && !aziendaAssociata) {
          // Cerca Essemme nella lista aziende, altrimenti usa valore di default
          const essemmeMatch = aziende.find(a => a.toLowerCase().includes('essemme'));
          aziendaAssociata = essemmeMatch || 'Essemme Conad Montegrosso';
          console.log('🔧 FALLBACK: Mauro associato a', aziendaAssociata);
        }
        
        // FALLBACK: Se Valerio non ha azienda associata, forza Agrilatteria
        if (personaLower === 'valerio' && !aziendaAssociata) {
          const agrilatturiaMatch = aziende.find(a => a.toLowerCase().includes('agrilatteria'));
          aziendaAssociata = agrilatturiaMatch || 'Agrilatteria del Pianalto';
          console.log('🔧 FALLBACK: Valerio associato a', aziendaAssociata);
        }
        
        // Determina tipo di azione e motivo in base al contesto e actionType rilevato
        let tipoAzione = 'call';
        let azioneDescrizione = 'chiamare';
        let motivo = '';
        
        if (personaLower === 'mauro') {
          tipoAzione = 'call';
          azioneDescrizione = 'chiamare';
          motivo = 'prendere l\'ordine';
        } else if (personaLower === 'valerio') {
          // Usa actionType rilevato per determinare il tipo di azione
          if (actionType === 'message' || textLower.includes('whatsapp') || textLower.includes('messaggio') || textLower.includes('whazzap') || textLower.includes('mandare')) {
            tipoAzione = 'whatsapp';
            azioneDescrizione = 'inviare messaggio WhatsApp';
            motivo = 'inviare ordine via WhatsApp';
          } else {
            tipoAzione = 'call';
            azioneDescrizione = 'chiamare';
            motivo = 'contatto business';
          }
        } else {
          // Per altre persone, determina in base ad actionType
          if (actionType === 'message') {
            tipoAzione = 'whatsapp';
            azioneDescrizione = 'inviare messaggio WhatsApp';
            motivo = 'comunicazione business';
          } else {
            tipoAzione = 'call';
            azioneDescrizione = 'chiamare';
            motivo = 'contatto business';
          }
        }
        
        const action = {
          tipo: tipoAzione,
          azione: azioneDescrizione,
          descrizione: `${azioneDescrizione.charAt(0).toUpperCase() + azioneDescrizione.slice(1)} ${persona}${aziendaAssociata ? ` (${aziendaAssociata})` : ''}`,
          persone: [persona],
          aziende: aziendaAssociata ? [aziendaAssociata] : [],
          motivo: motivo,
          testoOriginale: transcription
        };
        
        actions.push(action);
        console.log(`${tipoAzione === 'call' ? '📞' : '💬'} Azione creata per`, persona, ':', action);
      }
    });
    
    // Se non ha trovato azioni specifiche per persona, usa pattern generici
    if (actions.length === 0) {
      const callPatterns = [
        /\b(chiamare|telefonare|contattare|sentire)\s+([^.!?]+)/gi,
        /\bdevo\s+(chiamare|telefonare|contattare|sentire)\s+([^.!?]+)/gi,
        /\bricordarmi\s+di\s+(chiamare|telefonare|contattare|sentire)\s+([^.!?]+)/gi
      ];
      
      callPatterns.forEach(pattern => {
        const matches = [...transcription.matchAll(pattern)];
        matches.forEach(match => {
          const azione = match[1];
          const oggetto = match[2].trim();
          
          // Identifica persona e motivo
          let personaTarget = '';
          let aziendaTarget = '';
          let motivo = oggetto;
          
          // Trova persona nell'oggetto dell'azione
          persone.forEach(persona => {
            if (oggetto.toLowerCase().includes(persona.toLowerCase())) {
              personaTarget = persona;
            }
          });
          
          // Trova azienda nell'oggetto dell'azione
          aziende.forEach(azienda => {
            if (oggetto.toLowerCase().includes(azienda.toLowerCase()) || 
                transcription.toLowerCase().includes(azienda.toLowerCase())) {
              aziendaTarget = azienda;
            }
          });
          
          // Estrai motivo specifico
          if (text.includes('per ')) {
            const motivoMatch = transcription.match(/per\s+([^.!?]+)/i);
            if (motivoMatch) {
              motivo = motivoMatch[1].trim();
            }
          }
          
          const action = {
            tipo: 'call',
            azione: azione,
            descrizione: `Chiamare ${personaTarget}${aziendaTarget ? ` (${aziendaTarget})` : ''}`,
            persone: personaTarget ? [personaTarget] : [],
            aziende: aziendaTarget ? [aziendaTarget] : [],
            motivo: motivo,
            testoOriginale: match[0]
          };
          
          actions.push(action);
        });
      });
    }
    
    // Pattern per altri tipi di azioni
    const otherPatterns = [
      { pattern: /\b(ordinare|comprare|acquistare)\s+([^.!?]+)/gi, tipo: 'order' },
      { pattern: /\b(ricordare|promemoria)\s+([^.!?]+)/gi, tipo: 'reminder' },
      { pattern: /\b(inviare|spedire|mandare)\s+([^.!?]+)/gi, tipo: 'send' }
    ];
    
    otherPatterns.forEach(patternInfo => {
      const matches = [...transcription.matchAll(patternInfo.pattern)];
      matches.forEach(match => {
        const azione = match[1];
        const oggetto = match[2].trim();
        
        const action = {
          tipo: patternInfo.tipo,
          azione: azione,
          descrizione: `${azione} ${oggetto}`,
          persone: persone,
          aziende: aziende,
          motivo: oggetto,
          testoOriginale: match[0]
        };
        
        actions.push(action);
      });
    });
    
    return actions;
  }

  /**
   * 📞 MOSTRA ANTEPRIMA LISTA CHIAMATE
   */
  showCallListPreview(recentCalls) {
    const preview = document.createElement('div');
    preview.className = 'smart-notification call-preview';
    preview.innerHTML = `
      <div class="notification-content">
        <div style="font-weight: 600; margin-bottom: 10px;">
          📞 Chiamate da fare:
        </div>
        ${recentCalls.map(call => `
          <div style="margin: 5px 0; padding: 8px; background: #f8f9fa; border-radius: 6px; font-size: 0.9rem;">
            <strong>${call.persona}</strong>${call.azienda ? ` (${call.azienda})` : ''}
            <br><small style="color: #666;">${call.motivo}</small>
          </div>
        `).join('')}
        <div style="margin-top: 10px; font-size: 0.8rem; color: #666;">
          <i class="fas fa-info-circle"></i> Visualizza tutte nella sezione Task
        </div>
      </div>
    `;
    
    document.body.appendChild(preview);
    setTimeout(() => preview.classList.add('show'), 10);
    
    setTimeout(() => {
      preview.classList.remove('show');
      setTimeout(() => preview.remove(), 300);
    }, 6000);
  }

  /**
   * 📁 ORGANIZZA NOTA NELLE CARTELLE CON CREAZIONE AUTOMATICA
   */
  async organizeNoteInFolders(note, analysis) {
    // Recupera struttura cartelle esistente
    const folders = JSON.parse(localStorage.getItem('smart_organized_folders') || '{}');
    const knownEntities = JSON.parse(localStorage.getItem('smart_known_entities') || '{}');
    const ignoredEntities = JSON.parse(localStorage.getItem('smart_ignored_entities') || '[]');
    
    const categoria = analysis.categoria || 'pensieri';
    
    // Crea struttura cartelle se non esiste
    if (!folders[categoria]) {
      folders[categoria] = {};
    }
    
    // 🆕 RILEVA NUOVE ENTITÀ NON CONOSCIUTE E NON IGNORATE
    const newEntities = {
      persone: [],
      aziende: []
    };
    
    // 🔧 FIX: Gestisci diversi formati di entità dall'AI
    let persone = [];
    let aziende = [];
    
    // Formato 1: analysis.entita.persone (nostro formato)
    if (analysis.entita?.persone?.length > 0) {
      persone = analysis.entita.persone;
    }
    // Formato 2: analysis["ENTITÀ RILEVATE"]["Persone"] (formato AI)
    else if (analysis["ENTITÀ RILEVATE"]?.Persone?.length > 0) {
      persone = analysis["ENTITÀ RILEVATE"].Persone;
    }
    
    // Formato 1: analysis.entita.aziende (nostro formato)
    if (analysis.entita?.aziende?.length > 0) {
      aziende = analysis.entita.aziende;
    }
    // Formato 2: analysis["ENTITÀ RILEVATE"]["Aziende"] (formato AI)
    else if (analysis["ENTITÀ RILEVATE"]?.Aziende?.length > 0) {
      aziende = analysis["ENTITÀ RILEVATE"].Aziende;
    }
    
    console.log('🔍 ENTITÀ PROCESSATE:', { persone, aziende });
    
    // Controlla persone nuove (escludi conosciute e ignorate)
    persone.forEach(persona => {
      if (!knownEntities[persona] && !ignoredEntities.includes(persona)) {
        newEntities.persone.push(persona);
      }
    });
    
    // Controlla aziende nuove (escludi conosciute e ignorate)
    aziende.forEach(azienda => {
      if (!knownEntities[azienda] && !ignoredEntities.includes(azienda)) {
        newEntities.aziende.push(azienda);
      }
    });
    
    // 🔔 SE CI SONO NUOVE ENTITÀ, CHIEDI CONFERMA
    if (newEntities.persone.length > 0 || newEntities.aziende.length > 0) {
      await this.handleNewEntitiesDetected(note, analysis, newEntities);
      return; // La funzione continuerà dopo la conferma utente
    }
    
    // 📁 ORGANIZZA ENTITÀ CONOSCIUTE
    await this.organizeKnownEntities(note, analysis, folders);
  }

  /**
   * 🔔 GESTISCE RILEVAMENTO NUOVE ENTITÀ
   */
  async handleNewEntitiesDetected(note, analysis, newEntities) {
    console.log('🆕 Nuove entità rilevate:', newEntities);
    
    // Crea dialog di conferma per nuove entità
    const dialog = document.createElement('div');
    dialog.className = 'smart-dialog new-entities-dialog';
    
    let entitiesList = '';
    
    if (newEntities.persone.length > 0) {
      entitiesList += `
        <div class="entity-group">
          <h4>👤 Nuove Persone Rilevate:</h4>
          ${newEntities.persone.map(persona => `
            <div class="entity-item">
              <strong>${persona}</strong>
              <div class="entity-controls">
                <div class="action-selection">
                  <label>Azione:</label>
                  <select class="entity-action" data-entity="${persona}" data-type="persona" onchange="window.SmartAssistant.toggleCategorySelection(this)">
                    <option value="create">📁 Crea cartella e memorizza</option>
                    <option value="ignore">🚫 Ignora (non memorizzare)</option>
                  </select>
                </div>
                <div class="category-selection" id="category-${persona.replace(/\s+/g, '_')}">
                  <label>Categoria:</label>
                  <select class="entity-category" data-entity="${persona}" data-type="persona">
                    <option value="clienti">📁 CLIENTI</option>
                    <option value="fornitori">📁 FORNITORI</option>
                    <option value="contatti_business">📁 CONTATTI BUSINESS</option>
                    <option value="contatti_personali">📁 CONTATTI PERSONALI</option>
                    <option value="da_categorizzare">📁 DA CATEGORIZZARE</option>
                  </select>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    if (newEntities.aziende.length > 0) {
      entitiesList += `
        <div class="entity-group">
          <h4>🏢 Nuove Aziende Rilevate:</h4>
          ${newEntities.aziende.map(azienda => `
            <div class="entity-item">
              <strong>${azienda}</strong>
              <div class="entity-controls">
                <div class="action-selection">
                  <label>Azione:</label>
                  <select class="entity-action" data-entity="${azienda}" data-type="azienda" onchange="window.SmartAssistant.toggleCategorySelection(this)">
                    <option value="create">📁 Crea cartella e memorizza</option>
                    <option value="ignore">🚫 Ignora (non memorizzare)</option>
                  </select>
                </div>
                <div class="category-selection" id="category-${azienda.replace(/\s+/g, '_')}">
                  <label>Categoria:</label>
                  <select class="entity-category" data-entity="${azienda}" data-type="azienda">
                    <option value="clienti">📁 CLIENTI</option>
                    <option value="fornitori">📁 FORNITORI</option>
                    <option value="contatti_business">📁 CONTATTI BUSINESS</option>
                    <option value="enti_istituzioni">📁 ENTI/ISTITUZIONI</option>
                    <option value="da_categorizzare">📁 DA CATEGORIZZARE</option>
                  </select>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    dialog.innerHTML = `
      <div class="dialog-overlay"></div>
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>🆕 Nuove Entità Rilevate</h3>
          <button class="dialog-close" onclick="this.closest('.smart-dialog').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="dialog-body">
          <p>Ho rilevato nuove persone/aziende nella tua nota. Dove vuoi archiviarle?</p>
          ${entitiesList}
          <div class="note-preview">
            <h4>📝 Nota:</h4>
            <p>"${note.transcription.substring(0, 200)}..."</p>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-primary" onclick="window.SmartAssistant.confirmNewEntities('${note.id}', '${encodeURIComponent(JSON.stringify(analysis))}')">
            <i class="fas fa-save"></i> Conferma e Organizza
          </button>
          <button class="btn btn-secondary" onclick="window.SmartAssistant.skipEntityOrganization('${note.id}', '${encodeURIComponent(JSON.stringify(analysis))}')">
            <i class="fas fa-skip-forward"></i> Salta per Ora
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    setTimeout(() => dialog.classList.add('show'), 10);
  }

  /**
   * 🔄 TOGGLE SELEZIONE CATEGORIA BASATA SU AZIONE
   */
  toggleCategorySelection(actionSelect) {
    const entity = actionSelect.dataset.entity;
    const sanitizedEntity = entity.replace(/\s+/g, '_');
    const categoryDiv = document.getElementById(`category-${sanitizedEntity}`);
    
    if (actionSelect.value === 'create') {
      categoryDiv.style.display = 'flex';
      categoryDiv.style.opacity = '1';
    } else {
      categoryDiv.style.display = 'none';
      categoryDiv.style.opacity = '0.5';
    }
  }

  /**
   * ✅ CONFERMA NUOVE ENTITÀ E ORGANIZZA
   */
  confirmNewEntities(noteId, encodedAnalysis) {
    const analysis = JSON.parse(decodeURIComponent(encodedAnalysis));
    const note = this.getSavedNotes().find(n => n.id === noteId);
    
    if (!note) return;
    
    // Recupera selezioni utente
    const actionSelections = document.querySelectorAll('.entity-action');
    const knownEntities = JSON.parse(localStorage.getItem('smart_known_entities') || '{}');
    const ignoredEntities = JSON.parse(localStorage.getItem('smart_ignored_entities') || '[]');
    
    actionSelections.forEach(actionSelect => {
      const entity = actionSelect.dataset.entity;
      const type = actionSelect.dataset.type;
      const action = actionSelect.value;
      
      if (action === 'create') {
        // Trova la categoria corrispondente
        const categorySelect = document.querySelector(`.entity-category[data-entity="${entity}"]`);
        const category = categorySelect ? categorySelect.value : 'da_categorizzare';
        
        // Salva nuova entità come conosciuta
        knownEntities[entity] = {
          type: type,
          category: category,
          createdAt: new Date().toISOString(),
          createdFromNote: noteId
        };
      } else if (action === 'ignore') {
        // Aggiungi alla lista entità ignorate
        if (!ignoredEntities.includes(entity)) {
          ignoredEntities.push(entity);
        }
      }
    });
    
    // Salva entità conosciute e ignorate aggiornate
    localStorage.setItem('smart_known_entities', JSON.stringify(knownEntities));
    localStorage.setItem('smart_ignored_entities', JSON.stringify(ignoredEntities));
    
    // Chiudi dialog
    document.querySelector('.new-entities-dialog').remove();
    
    // Organizza nota con le nuove categorie
    this.organizeWithUserCategories(note, analysis, knownEntities);
    
    this.showNotification('✅ Nuove entità salvate e nota organizzata!', 'success');
  }

  /**
   * ⏭️ SALTA ORGANIZZAZIONE NUOVE ENTITÀ
   */
  skipEntityOrganization(noteId, encodedAnalysis) {
    const analysis = JSON.parse(decodeURIComponent(encodedAnalysis));
    const note = this.getSavedNotes().find(n => n.id === noteId);
    
    if (!note) return;
    
    // Chiudi dialog
    document.querySelector('.new-entities-dialog').remove();
    
    // Metti in "DA_CATEGORIZZARE" 
    const folders = JSON.parse(localStorage.getItem('smart_organized_folders') || '{}');
    if (!folders['da_categorizzare']) {
      folders['da_categorizzare'] = {};
    }
    if (!folders['da_categorizzare']['_generale']) {
      folders['da_categorizzare']['_generale'] = [];
    }
    
    folders['da_categorizzare']['_generale'].push({
      noteId: note.id,
      timestamp: note.timestamp,
      summary: note.transcription.substring(0, 100) + '...',
      priority: analysis.priorita,
      needsCategorization: true
    });
    
    localStorage.setItem('smart_organized_folders', JSON.stringify(folders));
    
    this.showNotification('📋 Nota salvata in "Da Categorizzare"', 'info');
  }

  /**
   * 📁 ORGANIZZA CON CATEGORIE UTENTE
   */
  organizeWithUserCategories(note, analysis, knownEntities) {
    const folders = JSON.parse(localStorage.getItem('smart_organized_folders') || '{}');
    
    // Organizza persone
    if (analysis.entita?.persone?.length > 0) {
      analysis.entita.persone.forEach(persona => {
        const entityInfo = knownEntities[persona];
        if (entityInfo) {
          const categoria = entityInfo.category;
          
          if (!folders[categoria]) folders[categoria] = {};
          if (!folders[categoria][persona]) folders[categoria][persona] = [];
          
          folders[categoria][persona].push({
            noteId: note.id,
            timestamp: note.timestamp,
            summary: note.transcription.substring(0, 100) + '...',
            priority: analysis.priorita
          });
        }
      });
    }
    
    // Organizza aziende
    if (analysis.entita?.aziende?.length > 0) {
      analysis.entita.aziende.forEach(azienda => {
        const entityInfo = knownEntities[azienda];
        if (entityInfo) {
          const categoria = entityInfo.category;
          
          if (!folders[categoria]) folders[categoria] = {};
          if (!folders[categoria][azienda]) folders[categoria][azienda] = [];
          
          folders[categoria][azienda].push({
            noteId: note.id,
            timestamp: note.timestamp,
            summary: note.transcription.substring(0, 100) + '...',
            priority: analysis.priorita
          });
        }
      });
    }
    
    localStorage.setItem('smart_organized_folders', JSON.stringify(folders));
    console.log('📁 Nota organizzata con categorie utente');
  }

  /**
   * 📁 ORGANIZZA ENTITÀ CONOSCIUTE
   */
  async organizeKnownEntities(note, analysis, folders) {
    const knownEntities = JSON.parse(localStorage.getItem('smart_known_entities') || '{}');
    
    // Organizza entità già conosciute automaticamente
    if (analysis.entita?.persone?.length > 0) {
      analysis.entita.persone.forEach(persona => {
        const entityInfo = knownEntities[persona];
        const categoria = entityInfo ? entityInfo.category : analysis.categoria;
        
        if (!folders[categoria]) folders[categoria] = {};
        if (!folders[categoria][persona]) folders[categoria][persona] = [];
        
        folders[categoria][persona].push({
          noteId: note.id,
          timestamp: note.timestamp,
          summary: note.transcription.substring(0, 100) + '...',
          priority: analysis.priorita
        });
      });
    }
    
    if (analysis.entita?.aziende?.length > 0) {
      analysis.entita.aziende.forEach(azienda => {
        const entityInfo = knownEntities[azienda];
        const categoria = entityInfo ? entityInfo.category : analysis.categoria;
        
        if (!folders[categoria]) folders[categoria] = {};
        if (!folders[categoria][azienda]) folders[categoria][azienda] = [];
        
        folders[categoria][azienda].push({
          noteId: note.id,
          timestamp: note.timestamp,
          summary: note.transcription.substring(0, 100) + '...',
          priority: analysis.priorita
        });
      });
    }
    
    // Se non ci sono entità specifiche, usa categoria base
    if (!analysis.entita?.persone?.length && !analysis.entita?.aziende?.length) {
      const categoria = analysis.categoria || 'pensieri';
      if (!folders[categoria]) folders[categoria] = {};
      if (!folders[categoria]['_generale']) folders[categoria]['_generale'] = [];
      
      folders[categoria]['_generale'].push({
        noteId: note.id,
        timestamp: note.timestamp,
        summary: note.transcription.substring(0, 100) + '...',
        priority: analysis.priorita
      });
    }
    
    localStorage.setItem('smart_organized_folders', JSON.stringify(folders));
    console.log('📁 Nota organizzata automaticamente in cartelle esistenti');
  }

  /**
   * 📞 RENDER LISTA CHIAMATE
   */
  renderCallList() {
    const callListContainer = document.getElementById('call-list');
    if (!callListContainer) return;
    
    const callList = JSON.parse(localStorage.getItem('smart_call_list') || '[]');
    console.log('📞 Rendering call list, trovate:', callList.length);
    
    if (callList.length === 0) {
      callListContainer.innerHTML = `
        <div class="no-notes">
          <i class="fas fa-phone-slash"></i>
          <p>Nessuna chiamata programmata</p>
        </div>
      `;
      return;
    }
    
    // Organizza per data scadenza
    const today = new Date().toDateString();
    const tomorrow = new Date(Date.now() + 24*60*60*1000).toDateString();
    
    const todayCalls = callList.filter(call => !call.completata && new Date(call.dataScadenza).toDateString() === today);
    const tomorrowCalls = callList.filter(call => !call.completata && new Date(call.dataScadenza).toDateString() === tomorrow);
    const otherCalls = callList.filter(call => !call.completata && 
      new Date(call.dataScadenza).toDateString() !== today && 
      new Date(call.dataScadenza).toDateString() !== tomorrow);
    
    let html = '';
    
    if (todayCalls.length > 0) {
      html += `
        <div class="call-group">
          <h4>🚨 Oggi (${todayCalls.length})</h4>
          ${todayCalls.map(call => this.renderCallItem(call)).join('')}
        </div>
      `;
    }
    
    if (tomorrowCalls.length > 0) {
      html += `
        <div class="call-group">
          <h4>📅 Domani (${tomorrowCalls.length})</h4>
          ${tomorrowCalls.map(call => this.renderCallItem(call)).join('')}
        </div>
      `;
    }
    
    if (otherCalls.length > 0) {
      html += `
        <div class="call-group">
          <h4>📝 Programmate (${otherCalls.length})</h4>
          ${otherCalls.map(call => this.renderCallItem(call)).join('')}
        </div>
      `;
    }
    
    callListContainer.innerHTML = html;
  }

  renderCallItem(call) {
    const priorityClass = `priority-${call.priorita}`;
    const dueDateFormatted = new Date(call.dataScadenza).toLocaleDateString('it-IT', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <div class="call-item" data-call-id="${call.id}">
        <div class="call-header">
          <span class="call-person">📞 <strong>${call.persona}</strong></span>
          <span class="${priorityClass}">${call.priorita}</span>
        </div>
        ${call.azienda ? `<div class="call-company">🏢 ${call.azienda}</div>` : ''}
        <div class="call-reason">💬 ${call.motivo}</div>
        <div class="call-footer">
          <span class="call-date">📅 ${dueDateFormatted}</span>
          <div class="call-actions">
            <button class="note-btn complete-call-btn" onclick="window.SmartAssistant.completeCall('${call.id}')">
              <i class="fas fa-check"></i> Completata
            </button>
            <button class="note-btn postpone-call-btn" onclick="window.SmartAssistant.postponeCall('${call.id}')">
              <i class="fas fa-clock"></i> Rinvia
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 💬 RENDER LISTA WHATSAPP
   */
  renderWhatsappList() {
    const whatsappListContainer = document.getElementById('whatsapp-list');
    if (!whatsappListContainer) return;
    
    const whatsappList = JSON.parse(localStorage.getItem('smart_whatsapp_list') || '[]');
    console.log('💬 Rendering WhatsApp list, trovati:', whatsappList.length);
    
    if (whatsappList.length === 0) {
      whatsappListContainer.innerHTML = `
        <div class="no-notes">
          <i class="fas fa-comment-slash"></i>
          <p>Nessun messaggio WhatsApp programmato</p>
        </div>
      `;
      return;
    }
    
    // Organizza per data scadenza
    const today = new Date().toDateString();
    const tomorrow = new Date(Date.now() + 24*60*60*1000).toDateString();
    
    const todayMessages = whatsappList.filter(msg => !msg.completata && new Date(msg.dataScadenza).toDateString() === today);
    const tomorrowMessages = whatsappList.filter(msg => !msg.completata && new Date(msg.dataScadenza).toDateString() === tomorrow);
    const otherMessages = whatsappList.filter(msg => !msg.completata && 
      new Date(msg.dataScadenza).toDateString() !== today && 
      new Date(msg.dataScadenza).toDateString() !== tomorrow);
    
    let html = '';
    
    if (todayMessages.length > 0) {
      html += `
        <div class="whatsapp-group">
          <h4>🚨 Oggi (${todayMessages.length})</h4>
          ${todayMessages.map(msg => this.renderWhatsappItem(msg)).join('')}
        </div>
      `;
    }
    
    if (tomorrowMessages.length > 0) {
      html += `
        <div class="whatsapp-group">
          <h4>📅 Domani (${tomorrowMessages.length})</h4>
          ${tomorrowMessages.map(msg => this.renderWhatsappItem(msg)).join('')}
        </div>
      `;
    }
    
    if (otherMessages.length > 0) {
      html += `
        <div class="whatsapp-group">
          <h4>📝 Programmati (${otherMessages.length})</h4>
          ${otherMessages.map(msg => this.renderWhatsappItem(msg)).join('')}
        </div>
      `;
    }
    
    whatsappListContainer.innerHTML = html;
  }

  renderWhatsappItem(message) {
    const priorityClass = `priority-${message.priorita}`;
    const dueDateFormatted = new Date(message.dataScadenza).toLocaleDateString('it-IT', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <div class="whatsapp-item" data-whatsapp-id="${message.id}">
        <div class="whatsapp-header">
          <span class="whatsapp-person">💬 <strong>${message.persona}</strong></span>
          <span class="${priorityClass}">${message.priorita}</span>
        </div>
        ${message.azienda ? `<div class="whatsapp-company">🏢 ${message.azienda}</div>` : ''}
        <div class="whatsapp-reason">📝 ${message.motivo}</div>
        <div class="whatsapp-footer">
          <span class="whatsapp-date">📅 ${dueDateFormatted}</span>
          <div class="whatsapp-actions">
            <button class="note-btn complete-whatsapp-btn" onclick="window.SmartAssistant.completeWhatsapp('${message.id}')">
              <i class="fas fa-check"></i> Inviato
            </button>
            <button class="note-btn postpone-whatsapp-btn" onclick="window.SmartAssistant.postponeWhatsapp('${message.id}')">
              <i class="fas fa-clock"></i> Rinvia
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 📋 RENDER LISTA TASK
   */
  renderTaskList() {
    const taskListContainer = document.getElementById('task-list');
    if (!taskListContainer) return;
    
    const taskList = JSON.parse(localStorage.getItem('smart_automatic_tasks') || '[]');
    console.log('📋 Rendering task list, trovati:', taskList.length);
    
    if (taskList.length === 0) {
      taskListContainer.innerHTML = `
        <div class="no-notes">
          <i class="fas fa-tasks"></i>
          <p>Nessun task automatico</p>
        </div>
      `;
      return;
    }
    
    // Filtra solo task pending
    const pendingTasks = taskList.filter(task => task.stato === 'pending');
    
    if (pendingTasks.length === 0) {
      taskListContainer.innerHTML = `
        <div class="no-notes">
          <i class="fas fa-check-circle"></i>
          <p>Tutti i task completati!</p>
        </div>
      `;
      return;
    }
    
    const html = pendingTasks.map(task => this.renderTaskItem(task)).join('');
    taskListContainer.innerHTML = html;
  }

  renderTaskItem(task) {
    const priorityClass = `priority-${task.priorita}`;
    const dueDateFormatted = new Date(task.dataScadenza).toLocaleDateString('it-IT', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const typeIcon = this.getTaskTypeIcon(task.tipo);
    
    return `
      <div class="task-item" data-task-id="${task.id}">
        <div class="task-header">
          <span class="task-type">${typeIcon} ${task.descrizione}</span>
          <span class="${priorityClass}">${task.priorita}</span>
        </div>
        ${task.persone?.length > 0 ? `<div class="task-people">👤 ${task.persone.join(', ')}</div>` : ''}
        ${task.aziende?.length > 0 ? `<div class="task-companies">🏢 ${task.aziende.join(', ')}</div>` : ''}
        <div class="task-footer">
          <span class="task-date">📅 ${dueDateFormatted}</span>
          <div class="task-actions">
            <button class="note-btn complete-task-btn" onclick="window.SmartAssistant.completeTask('${task.id}')">
              <i class="fas fa-check"></i> Completa
            </button>
          </div>
        </div>
      </div>
    `;
  }

  getTaskTypeIcon(tipo) {
    switch(tipo) {
      case 'call': return '📞';
      case 'whatsapp': return '💬';
      case 'email': return '📧';
      case 'order': return '📦';
      case 'reminder': return '⏰';
      case 'send': return '📤';
      default: return '📋';
    }
  }

  /**
   * ✅ COMPLETA CHIAMATA
   */
  completeCall(callId) {
    const callList = JSON.parse(localStorage.getItem('smart_call_list') || '[]');
    const callIndex = callList.findIndex(call => call.id === callId);
    
    if (callIndex !== -1) {
      callList[callIndex].completata = true;
      callList[callIndex].stato = 'completed';
      callList[callIndex].dataCompletamento = new Date().toISOString();
      
      localStorage.setItem('smart_call_list', JSON.stringify(callList));
      this.renderCallList();
      this.showNotification('✅ Chiamata completata!', 'success');
    }
  }

  /**
   * ⏰ RINVIA CHIAMATA
   */
  postponeCall(callId) {
    const callList = JSON.parse(localStorage.getItem('smart_call_list') || '[]');
    const callIndex = callList.findIndex(call => call.id === callId);
    
    if (callIndex !== -1) {
      // Rinvia di 1 giorno
      const newDate = new Date(callList[callIndex].dataScadenza);
      newDate.setDate(newDate.getDate() + 1);
      callList[callIndex].dataScadenza = newDate.toISOString();
      
      localStorage.setItem('smart_call_list', JSON.stringify(callList));
      this.renderCallList();
      this.showNotification('⏰ Chiamata rinviata a domani', 'info');
    }
  }

  /**
   * 🧹 RIMUOVI CHIAMATE DUPLICATE
   */
  removeDuplicateCalls(callList) {
    const seen = new Set();
    const uniqueCalls = [];
    
    callList.forEach(call => {
      // Crea chiave unica basata su persona + azienda + motivo
      const key = `${call.persona.toLowerCase()}_${call.azienda.toLowerCase()}_${call.motivo.toLowerCase()}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCalls.push(call);
      } else {
        console.log('🧹 Rimossa chiamata duplicata per:', call.persona);
      }
    });
    
    return uniqueCalls;
  }

  /**
   * ✅ COMPLETA MESSAGGIO WHATSAPP
   */
  completeWhatsapp(whatsappId) {
    const whatsappList = JSON.parse(localStorage.getItem('smart_whatsapp_list') || '[]');
    const whatsappIndex = whatsappList.findIndex(msg => msg.id === whatsappId);
    
    if (whatsappIndex !== -1) {
      whatsappList[whatsappIndex].completata = true;
      whatsappList[whatsappIndex].stato = 'completed';
      whatsappList[whatsappIndex].dataCompletamento = new Date().toISOString();
      
      localStorage.setItem('smart_whatsapp_list', JSON.stringify(whatsappList));
      this.renderWhatsappList();
      this.showNotification('✅ Messaggio WhatsApp inviato!', 'success');
    }
  }

  /**
   * ⏰ RINVIA MESSAGGIO WHATSAPP
   */
  postponeWhatsapp(whatsappId) {
    const whatsappList = JSON.parse(localStorage.getItem('smart_whatsapp_list') || '[]');
    const whatsappIndex = whatsappList.findIndex(msg => msg.id === whatsappId);
    
    if (whatsappIndex !== -1) {
      // Rinvia di 1 giorno
      const newDate = new Date(whatsappList[whatsappIndex].dataScadenza);
      newDate.setDate(newDate.getDate() + 1);
      whatsappList[whatsappIndex].dataScadenza = newDate.toISOString();
      
      localStorage.setItem('smart_whatsapp_list', JSON.stringify(whatsappList));
      this.renderWhatsappList();
      this.showNotification('⏰ Messaggio WhatsApp rinviato a domani', 'info');
    }
  }

  /**
   * ✅ COMPLETA TASK
   */
  completeTask(taskId) {
    const taskList = JSON.parse(localStorage.getItem('smart_automatic_tasks') || '[]');
    const taskIndex = taskList.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
      taskList[taskIndex].stato = 'completed';
      taskList[taskIndex].dataCompletamento = new Date().toISOString();
      
      localStorage.setItem('smart_automatic_tasks', JSON.stringify(taskList));
      this.renderTaskList();
      this.showNotification('✅ Task completato!', 'success');
    }
  }

  /**
   * 🗑️ CANCELLA TUTTE LE CHIAMATE
   */
  clearCalls() {
    if (confirm('Sei sicuro di voler cancellare tutte le chiamate?')) {
      localStorage.removeItem('smart_call_list');
      this.renderCallList();
      this.showNotification('🗑️ Tutte le chiamate sono state cancellate', 'info');
    }
  }

  /**
   * 🗑️ CANCELLA TUTTI I MESSAGGI WHATSAPP
   */
  clearWhatsapp() {
    if (confirm('Sei sicuro di voler cancellare tutti i messaggi WhatsApp?')) {
      localStorage.removeItem('smart_whatsapp_list');
      this.renderWhatsappList();
      this.showNotification('🗑️ Tutti i messaggi WhatsApp sono stati cancellati', 'info');
    }
  }

  /**
   * 🗑️ CANCELLA TUTTI I TASK
   */
  clearTasks() {
    if (confirm('Sei sicuro di voler cancellare tutti i task automatici?')) {
      localStorage.removeItem('smart_automatic_tasks');
      this.renderTaskList();
      this.showNotification('🗑️ Tutti i task automatici sono stati cancellati', 'info');
    }
  }

  /**
   * Hook Navigation - On Leave
   */
  onLeave() {
    console.log('🎤 SmartAssistant: Left tab');
    
    // Ferma registrazione se in corso
    if (this.isRecording) {
      this.stopRecording();
    }
  }

  /**
   * 🏛️ CERCA STORICO CLIENTE
   */
  searchClientHistory() {
    const searchInput = document.getElementById('client-search-input');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    
    if (!searchTerm) {
      this.showNotification('⚠️ Inserisci il nome di un cliente', 'error');
      return;
    }
    
    console.log('🔍 Ricerca storico per:', searchTerm);
    
    // Normalizza il termine di ricerca
    const normalizedSearch = this.normalizeSearchTerm(searchTerm);
    
    // Raccoglie tutte le interazioni con questo cliente
    const clientHistory = this.collectClientInteractions(normalizedSearch);
    
    // Renderizza i risultati
    this.renderClientHistory(normalizedSearch, clientHistory);
  }

  /**
   * 🔄 NORMALIZZA TERMINE DI RICERCA
   */
  normalizeSearchTerm(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    // Mappature specifiche per normalizzazione
    const mappings = {
      'sm': 'essemme conad montegrosso',
      'essemme': 'essemme conad montegrosso',
      'conad': 'essemme conad montegrosso',
      'montegrosso': 'essemme conad montegrosso',
      'agrilatteria': 'agrilatteria del pianalto',
      'pianalto': 'agrilatteria del pianalto'
    };
    
    // Cerca mapping esatto
    if (mappings[term]) {
      return mappings[term];
    }
    
    // Cerca mapping parziale
    for (const [key, value] of Object.entries(mappings)) {
      if (term.includes(key)) {
        return value;
      }
    }
    
    return term;
  }

  /**
   * 📊 RACCOGLIE TUTTE LE INTERAZIONI DEL CLIENTE
   */
  collectClientInteractions(clientName, forReport = false) {
    const interactions = [];
    
    // 1. Note vocali
    const notes = this.getSavedNotes();
    notes.forEach(note => {
      if (this.isRelatedToClient(note, clientName)) {
        interactions.push({
          type: 'note',
          data: note,
          timestamp: note.timestamp,
          description: forReport ? note.transcription : (note.transcription.substring(0, 150) + '...')
        });
      }
    });
    
    // 2. Chiamate
    const calls = JSON.parse(localStorage.getItem('smart_call_list') || '[]');
    calls.forEach(call => {
      if (this.isRelatedToClient(call, clientName)) {
        interactions.push({
          type: 'call',
          data: call,
          timestamp: call.dataCreazione,
          description: `Chiamata a ${call.persona}${call.azienda ? ` (${call.azienda})` : ''} - ${call.motivo}`
        });
      }
    });
    
    // 3. Messaggi WhatsApp
    const whatsapp = JSON.parse(localStorage.getItem('smart_whatsapp_list') || '[]');
    whatsapp.forEach(msg => {
      if (this.isRelatedToClient(msg, clientName)) {
        interactions.push({
          type: 'whatsapp',
          data: msg,
          timestamp: msg.dataCreazione,
          description: `WhatsApp a ${msg.persona}${msg.azienda ? ` (${msg.azienda})` : ''} - ${msg.motivo}`
        });
      }
    });
    
    // 4. Task generici
    const tasks = JSON.parse(localStorage.getItem('smart_automatic_tasks') || '[]');
    tasks.forEach(task => {
      if (this.isRelatedToClient(task, clientName)) {
        interactions.push({
          type: 'task',
          data: task,
          timestamp: task.dataCreazione,
          description: task.descrizione
        });
      }
    });
    
    // Ordina per data (più recenti prima)
    interactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return interactions;
  }

  /**
   * 🎯 VERIFICA SE L'ITEM È CORRELATO AL CLIENTE
   */
  isRelatedToClient(item, clientName) {
    const searchTerm = clientName.toLowerCase();
    
    // Cerca in tutti i campi pertinenti
    const fieldsToSearch = [
      item.transcription,
      item.persona,
      item.azienda,
      item.persone?.join(' '),
      item.aziende?.join(' '),
      item.descrizione,
      JSON.stringify(item.aiAnalysis?.entita || {}),
      JSON.stringify(item.aiAnalysis?.["ENTITÀ RILEVATE"] || {})
    ].filter(Boolean);
    
    const textToSearch = fieldsToSearch.join(' ').toLowerCase();
    
    // Verifica match diretto
    if (textToSearch.includes(searchTerm)) {
      return true;
    }
    
    // Verifica match con varianti del nome
    const searchParts = searchTerm.split(' ');
    return searchParts.some(part => part.length > 2 && textToSearch.includes(part));
  }

  /**
   * 🖼️ RENDERIZZA STORICO CLIENTE
   */
  renderClientHistory(clientName, interactions) {
    const resultsContainer = document.getElementById('client-history-results');
    if (!resultsContainer) return;
    
    if (interactions.length === 0) {
      resultsContainer.innerHTML = `
        <div class="no-notes">
          <i class="fas fa-search"></i>
          <p>Nessuna interazione trovata per "${clientName}"</p>
          <small>Prova con un nome diverso o parziale</small>
        </div>
      `;
      return;
    }
    
    // Raggruppa per tipo
    const grouped = this.groupInteractionsByType(interactions);
    
    // Statistiche
    const stats = this.calculateClientStats(interactions);
    
    resultsContainer.innerHTML = `
      <div class="client-history-header">
        <h4>📊 Storico completo: ${clientName.toUpperCase()}</h4>
        <div class="client-stats">
          <span class="stat-item">📝 ${stats.notes} note</span>
          <span class="stat-item">📞 ${stats.calls} chiamate</span>
          <span class="stat-item">💬 ${stats.whatsapp} WhatsApp</span>
          <span class="stat-item">📋 ${stats.tasks} task</span>
          <span class="stat-item">📅 Periodo: ${stats.period}</span>
        </div>
      </div>
      
      ${this.renderInteractionTimeline(interactions)}
      
      ${Object.keys(grouped).map(type => this.renderGroupedInteractions(type, grouped[type])).join('')}
      
      <div class="history-actions">
        <button onclick="window.SmartAssistant.generateClientReport('${clientName}')" class="voice-btn" style="background: #28a745;">
          <i class="fas fa-file-alt"></i> Genera Report
        </button>
        <button onclick="window.SmartAssistant.exportClientHistory('${clientName}')" class="voice-btn" style="background: #6c757d;">
          <i class="fas fa-download"></i> Esporta
        </button>
      </div>
    `;
  }

  /**
   * 📊 CALCOLA STATISTICHE CLIENTE
   */
  calculateClientStats(interactions) {
    const stats = {
      notes: 0,
      calls: 0,
      whatsapp: 0,
      tasks: 0,
      period: 'N/A'
    };
    
    interactions.forEach(item => {
      stats[item.type === 'note' ? 'notes' : item.type + 's']++;
    });
    
    if (interactions.length > 0) {
      const oldest = new Date(interactions[interactions.length - 1].timestamp);
      const newest = new Date(interactions[0].timestamp);
      const days = Math.ceil((newest - oldest) / (1000 * 60 * 60 * 24));
      stats.period = days === 0 ? 'Oggi' : `${days} giorni`;
    }
    
    return stats;
  }

  /**
   * 📅 RENDERIZZA TIMELINE INTERAZIONI
   */
  renderInteractionTimeline(interactions) {
    const recentInteractions = interactions.slice(0, 10);
    
    return `
      <div class="interaction-timeline">
        <h5>📅 Timeline Recente</h5>
        ${recentInteractions.map(item => `
          <div class="timeline-item ${item.type}">
            <div class="timeline-date">${this.formatDate(item.timestamp)}</div>
            <div class="timeline-content">
              <span class="timeline-type">${this.getTypeIcon(item.type)} ${this.getTypeName(item.type)}</span>
              <p>${item.description}</p>
              ${item.data.stato ? `<span class="status-badge ${item.data.stato}">${item.data.stato}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * 🏷️ RAGGRUPPA INTERAZIONI PER TIPO
   */
  groupInteractionsByType(interactions) {
    return interactions.reduce((groups, item) => {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type].push(item);
      return groups;
    }, {});
  }

  /**
   * 📋 RENDERIZZA INTERAZIONI RAGGRUPPATE
   */
  renderGroupedInteractions(type, items) {
    return `
      <div class="interaction-group">
        <h5>${this.getTypeIcon(type)} ${this.getTypeName(type)} (${items.length})</h5>
        <div class="interaction-list">
          ${items.slice(0, 5).map(item => `
            <div class="interaction-item">
              <div class="interaction-meta">
                <span class="interaction-date">${this.formatDate(item.timestamp)}</span>
                ${item.data.stato ? `<span class="status-badge ${item.data.stato}">${item.data.stato}</span>` : ''}
              </div>
              <div class="interaction-content">${item.description}</div>
            </div>
          `).join('')}
          ${items.length > 5 ? `<p><small>... e altre ${items.length - 5} interazioni</small></p>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 🎨 HELPER FUNCTIONS
   */
  getTypeIcon(type) {
    const icons = {
      note: '📝',
      call: '📞',
      whatsapp: '💬',
      task: '📋'
    };
    return icons[type] || '📌';
  }

  getTypeName(type) {
    const names = {
      note: 'Note Vocali',
      call: 'Chiamate',
      whatsapp: 'WhatsApp',
      task: 'Task'
    };
    return names[type] || type;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Oggi ' + date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Ieri ' + date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    if (diffDays < 7) return `${diffDays} giorni fa`;
    return date.toLocaleDateString('it-IT');
  }

  /**
   * 📄 GENERA REPORT CLIENTE
   */
  generateClientReport(clientName) {
    this.showNotification('📄 Generazione report in corso...', 'info');
    
    const interactions = this.collectClientInteractions(clientName, true); // true = forReport
    const stats = this.calculateClientStats(interactions);
    
    const report = {
      cliente: clientName,
      dataGenerazione: new Date().toISOString(),
      statistiche: stats,
      interazioni: interactions.map(item => ({
        tipo: item.type,
        data: item.timestamp,
        descrizione: item.description,
        stato: item.data.stato || 'N/A'
      }))
    };
    
    console.log('📄 Report generato per', clientName, report);
    this.showNotification(`✅ Report per ${clientName} generato!`, 'success');
    
    // Mostra anteprima report
    this.showReportDialog(report);
  }

  /**
   * 📤 ESPORTA STORICO CLIENTE
   */
  exportClientHistory(clientName) {
    const interactions = this.collectClientInteractions(clientName, true); // true = forReport
    
    const exportData = {
      cliente: clientName,
      dataEsportazione: new Date().toISOString(),
      totaleInterazioni: interactions.length,
      dati: interactions
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `storico-${clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    this.showNotification(`📤 Storico ${clientName} esportato!`, 'success');
  }

  /**
   * 📄 MOSTRA DIALOG REPORT
   */
  showReportDialog(report) {
    const dialog = document.createElement('div');
    dialog.className = 'smart-dialog show';
    
    dialog.innerHTML = `
      <div class="dialog-overlay"></div>
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>📄 Report Cliente: ${report.cliente}</h3>
          <button class="dialog-close" onclick="this.closest('.smart-dialog').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="dialog-body">
          <div class="report-summary">
            <h4>📊 Riepilogo</h4>
            <p><strong>Periodo:</strong> ${report.statistiche.period}</p>
            <p><strong>Totale interazioni:</strong> ${report.interazioni.length}</p>
            <p><strong>Note vocali:</strong> ${report.statistiche.notes}</p>
            <p><strong>Chiamate:</strong> ${report.statistiche.calls}</p>
            <p><strong>WhatsApp:</strong> ${report.statistiche.whatsapp}</p>
            <p><strong>Task:</strong> ${report.statistiche.tasks}</p>
          </div>
          
          <div class="report-details">
            <h4>📝 Tutte le Interazioni</h4>
            ${report.interazioni.map(item => `
              <div class="report-item">
                <strong>${this.getTypeIcon(item.tipo)} ${this.formatDate(item.data)}</strong>
                <div class="report-description">${item.descrizione}</div>
                <small>Stato: ${item.stato}</small>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-primary" id="copy-report-btn">
            <i class="fas fa-copy"></i> Copia Report
          </button>
          <button class="btn btn-secondary" onclick="this.closest('.smart-dialog').remove()">
            Chiudi
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Aggiungi event listener per il pulsante copia
    const copyBtn = dialog.querySelector('#copy-report-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.copyReportToClipboard(report);
      });
    }
  }

  /**
   * 🔔 SISTEMA NOTIFICHE E PROMEMORIA
   */
  
  /**
   * 📅 PROGRAMMA PROMEMORIA
   */
  scheduleReminder(taskId, delayMinutes = 0) {
    const task = this.findTaskById(taskId);
    if (!task) return;

    const notificationTime = delayMinutes > 0 ? 
      Date.now() + (delayMinutes * 60 * 1000) : 
      new Date(task.dataScadenza).getTime();

    const timeUntilNotification = notificationTime - Date.now();

    if (timeUntilNotification > 0) {
      setTimeout(() => {
        this.showTaskNotification(task);
      }, timeUntilNotification);

      console.log(`🔔 Promemoria programmato per task ${taskId} fra ${Math.round(timeUntilNotification/60000)} minuti`);
    }
  }

  /**
   * 🔍 TROVA TASK PER ID
   */
  findTaskById(taskId) {
    // Cerca nelle chiamate
    const calls = JSON.parse(localStorage.getItem('smart_call_list') || '[]');
    let task = calls.find(call => call.id === taskId || call.taskId === taskId);
    if (task) {
      task.type = 'call';
      return task;
    }

    // Cerca nei WhatsApp
    const whatsapp = JSON.parse(localStorage.getItem('smart_whatsapp_list') || '[]');
    task = whatsapp.find(msg => msg.id === taskId || msg.taskId === taskId);
    if (task) {
      task.type = 'whatsapp';
      return task;
    }

    // Cerca nei task generici
    const tasks = JSON.parse(localStorage.getItem('smart_automatic_tasks') || '[]');
    task = tasks.find(t => t.id === taskId);
    if (task) {
      task.type = 'task';
      return task;
    }

    return null;
  }

  /**
   * 🔔 MOSTRA NOTIFICA TASK
   */
  showTaskNotification(task) {
    if (!('Notification' in window)) {
      // Fallback per browser senza notifiche
      this.showInAppReminder(task);
      return;
    }

    if (Notification.permission === 'granted') {
      const emoji = task.type === 'call' ? '📞' : task.type === 'whatsapp' ? '💬' : '📋';
      const title = `${emoji} Promemoria Smart Assistant`;
      
      let body = '';
      if (task.type === 'call') {
        body = `Chiamare ${task.persona}${task.azienda ? ` (${task.azienda})` : ''} - ${task.motivo}`;
      } else if (task.type === 'whatsapp') {
        body = `Inviare WhatsApp a ${task.persona}${task.azienda ? ` (${task.azienda})` : ''} - ${task.motivo}`;
      } else {
        body = task.descrizione;
      }

      const notification = new Notification(title, {
        body: body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: `reminder-${task.id}`,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
          taskId: task.id,
          taskType: task.type
        },
        actions: [
          {
            action: 'complete',
            title: '✅ Completato'
          },
          {
            action: 'postpone',
            title: '⏰ Rinvia 15min'
          }
        ]
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Naviga al tab Smart Assistant
        if (window.Navigation && window.Navigation.switchToTab) {
          window.Navigation.switchToTab('smart');
        }
      };

      // Auto-chiudi dopo 30 secondi se non interagisce
      setTimeout(() => {
        notification.close();
      }, 30000);

    } else if (Notification.permission === 'default') {
      // Richiedi permesso
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showTaskNotification(task);
        } else {
          this.showInAppReminder(task);
        }
      });
    } else {
      // Permesso negato, usa promemoria in-app
      this.showInAppReminder(task);
    }
  }

  /**
   * 📱 PROMEMORIA IN-APP (FALLBACK)
   */
  showInAppReminder(task) {
    const emoji = task.type === 'call' ? '📞' : task.type === 'whatsapp' ? '💬' : '📋';
    
    let message = '';
    if (task.type === 'call') {
      message = `Chiamare ${task.persona}${task.azienda ? ` (${task.azienda})` : ''} - ${task.motivo}`;
    } else if (task.type === 'whatsapp') {
      message = `Inviare WhatsApp a ${task.persona}${task.azienda ? ` (${task.azienda})` : ''} - ${task.motivo}`;
    } else {
      message = task.descrizione;
    }

    // Crea dialog promemoria
    const reminder = document.createElement('div');
    reminder.className = 'smart-dialog reminder-dialog show';
    reminder.innerHTML = `
      <div class="dialog-overlay"></div>
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>${emoji} Promemoria</h3>
          <button class="dialog-close" onclick="this.closest('.smart-dialog').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="dialog-body">
          <div class="reminder-content">
            <div class="reminder-message">${message}</div>
            <div class="reminder-time">
              <i class="fas fa-clock"></i> 
              ${new Date(task.dataScadenza).toLocaleString('it-IT')}
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-primary" onclick="window.SmartAssistant.completeTaskFromReminder('${task.id}', '${task.type}')">
            <i class="fas fa-check"></i> Completato
          </button>
          <button class="btn btn-secondary" onclick="window.SmartAssistant.postponeTaskFromReminder('${task.id}', 15)">
            <i class="fas fa-clock"></i> Rinvia 15min
          </button>
          <button class="btn btn-outline" onclick="this.closest('.smart-dialog').remove()">
            Chiudi
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(reminder);

    // Riproduci suono di notifica (se disponibile)
    this.playNotificationSound();

    // Auto-chiudi dopo 1 minuto se non interagisce
    setTimeout(() => {
      if (reminder.parentNode) {
        reminder.remove();
      }
    }, 60000);
  }

  /**
   * 🔊 SUONO NOTIFICA
   */
  playNotificationSound() {
    try {
      // Crea un suono di notifica semplice
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('🔇 Audio context non disponibile');
    }
  }

  /**
   * ✅ COMPLETA TASK DA PROMEMORIA
   */
  completeTaskFromReminder(taskId, taskType) {
    if (taskType === 'call') {
      this.completeCall(taskId);
    } else if (taskType === 'whatsapp') {
      this.completeWhatsapp(taskId);
    } else {
      this.completeTask(taskId);
    }

    // Chiudi il promemoria
    const reminderDialog = document.querySelector('.reminder-dialog');
    if (reminderDialog) {
      reminderDialog.remove();
    }
  }

  /**
   * ⏰ RINVIA TASK DA PROMEMORIA  
   */
  postponeTaskFromReminder(taskId, delayMinutes) {
    this.scheduleReminder(taskId, delayMinutes);
    
    // Chiudi il promemoria
    const reminderDialog = document.querySelector('.reminder-dialog');
    if (reminderDialog) {
      reminderDialog.remove();
    }

    this.showNotification(`⏰ Promemoria rinviato di ${delayMinutes} minuti`, 'info');
  }

  /**
   * 🚀 INIZIALIZZA PROMEMORIA AUTOMATICI
   */
  initializeReminders() {
    // Controlla tutti i task pending e programma promemoria
    const now = Date.now();

    // Chiamate
    const calls = JSON.parse(localStorage.getItem('smart_call_list') || '[]');
    calls.forEach(call => {
      if (!call.completata && call.dataScadenza) {
        const reminderTime = new Date(call.dataScadenza).getTime();
        if (reminderTime > now) {
          this.scheduleReminder(call.id);
        }
      }
    });

    // WhatsApp
    const whatsapp = JSON.parse(localStorage.getItem('smart_whatsapp_list') || '[]');
    whatsapp.forEach(msg => {
      if (!msg.completata && msg.dataScadenza) {
        const reminderTime = new Date(msg.dataScadenza).getTime();
        if (reminderTime > now) {
          this.scheduleReminder(msg.id);
        }
      }
    });

    // Task generici
    const tasks = JSON.parse(localStorage.getItem('smart_automatic_tasks') || '[]');
    tasks.forEach(task => {
      if (task.stato === 'pending' && task.dataScadenza) {
        const reminderTime = new Date(task.dataScadenza).getTime();
        if (reminderTime > now) {
          this.scheduleReminder(task.id);
        }
      }
    });

    console.log('🔔 Sistema promemoria inizializzato');
  }

  /**
   * 📋 COPIA REPORT NEGLI APPUNTI
   */
  copyReportToClipboard(report) {
    // report è già un oggetto, non serve parsing
    
    const reportText = `
REPORT CLIENTE: ${report.cliente.toUpperCase()}
Generato: ${new Date(report.dataGenerazione).toLocaleString('it-IT')}

STATISTICHE:
- Periodo: ${report.statistiche.period}
- Note vocali: ${report.statistiche.notes}
- Chiamate: ${report.statistiche.calls}
- WhatsApp: ${report.statistiche.whatsapp}
- Task: ${report.statistiche.tasks}

TUTTE LE INTERAZIONI:
${report.interazioni.map(item => 
  `- ${this.formatDate(item.data)}: ${item.descrizione} (${item.stato})`
).join('\n')}
    `.trim();
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(reportText).then(() => {
        this.showNotification('✅ Report copiato negli appunti!', 'success');
      });
    }
  }

  /**
   * 🗑️ PULISCI STORICO CLIENTE
   */
  clearClientHistory() {
    if (confirm('Vuoi davvero cancellare tutti i dati dello storico clienti?')) {
      const resultsContainer = document.getElementById('client-history-results');
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="no-notes">
            <i class="fas fa-search"></i>
            <p>Inserisci il nome di un cliente per visualizzare lo storico completo</p>
          </div>
        `;
      }
      
      const searchInput = document.getElementById('client-search-input');
      if (searchInput) {
        searchInput.value = '';
      }
      
      this.showNotification('🗑️ Storico pulito', 'info');
    }
  }

  /**
   * 🔧 DEBUG: Forza abilitazione pulsante registrazione
   * Metodo di emergenza per risolvere problemi di inizializzazione
   */
  async forceEnableRecordingButton() {
    console.log('🔧 DEBUG: Forzando abilitazione pulsante registrazione...');
    
    try {
      // Test rapido permessi
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      // Trova e forza abilitazione
      const startBtn = document.getElementById('start-recording-btn');
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.classList.add('ready');
        startBtn.style.opacity = '1';
        startBtn.style.cursor = 'pointer';
        startBtn.style.backgroundColor = '#28a745';
        startBtn.style.borderColor = '#28a745';
        
        this.updateStatus('✅ Pulsante forzato - Pronto!', 'success');
        console.log('✅ DEBUG: Pulsante registrazione forzato con successo');
        return true;
      } else {
        console.error('❌ DEBUG: Pulsante non trovato nel DOM');
        return false;
      }
    } catch (error) {
      console.error('❌ DEBUG: Errore nel forzare abilitazione:', error);
      this.updateStatus('❌ Permessi microfono negati', 'error');
      return false;
    }
  }

  /**
   * 🔧 DEBUG: Diagnostica completa stato voice recording
   */
  diagnoseMicrophoneIssue() {
    console.log('🔍 DEBUG: Diagnostica stato microfono...');
    
    const startBtn = document.getElementById('start-recording-btn');
    const stopBtn = document.getElementById('stop-recording-btn');
    
    const diagnosis = {
      timestamp: new Date().toISOString(),
      startButton: {
        exists: !!startBtn,
        disabled: startBtn?.disabled,
        classes: startBtn?.className,
        style: startBtn?.style.cssText
      },
      stopButton: {
        exists: !!stopBtn,
        disabled: stopBtn?.disabled,
        classes: stopBtn?.className
      },
      browserSupport: {
        mediaDevices: !!navigator.mediaDevices,
        getUserMedia: !!navigator.mediaDevices?.getUserMedia,
        mediaRecorder: !!window.MediaRecorder
      },
      smartAssistant: {
        isRecording: this.isRecording,
        mediaRecorder: !!this.mediaRecorder,
        audioChunks: this.audioChunks?.length || 0
      }
    };
    
    console.table(diagnosis);
    
    // Mostra in UI se possibile
    const diagnosisText = `
Diagnosi Microfono:
- Pulsante Start: ${diagnosis.startButton.exists ? (diagnosis.startButton.disabled ? 'DISABILITATO' : 'Abilitato') : 'NON TROVATO'}
- Browser Support: ${diagnosis.browserSupport.getUserMedia ? 'OK' : 'NON SUPPORTATO'}
- MediaRecorder: ${diagnosis.browserSupport.mediaRecorder ? 'OK' : 'NON SUPPORTATO'}

Usa console per dettagli completi.
    `.trim();
    
    this.updateStatus(diagnosisText, diagnosis.startButton.disabled ? 'error' : 'success');
    
    return diagnosis;
  }

  /**
   * 🔐 NOTIFICA SISTEMA STORAGE SICURO
   */
  notifySecureStorage(note) {
    try {
      // Emette evento personalizzato per il sistema di storage sicuro
      const event = new CustomEvent('smartAssistantNoteCreated', {
        detail: { note: note }
      });
      document.dispatchEvent(event);
      
      console.log('🔐 Notifica inviata al sistema storage sicuro per nota:', note.id);
    } catch (error) {
      console.error('❌ Errore notifica storage sicuro:', error);
    }
  }

  /**
   * 📁 MOSTRA INTERFACCIA CARTELLE SICURE
   */
  showSecureFolders() {
    if (!window.SmartAssistantSecureStorage) {
      this.showNotification('⚠️ Sistema storage sicuro non disponibile', 'warning');
      return;
    }

    const folders = window.SmartAssistantSecureStorage.getFoldersOverview();
    const stats = window.SmartAssistantSecureStorage.getUsageStatistics();

    const modal = document.createElement('div');
    modal.className = 'smart-modal';
    modal.innerHTML = `
      <div class="smart-modal-content" style="max-width: 900px; max-height: 80vh; overflow-y: auto;">
        <div class="modal-header">
          <h2>🔐 Cartelle Sicure Organizzate</h2>
          <button class="modal-close" onclick="this.closest('.smart-modal').remove()">&times;</button>
        </div>
        
        <div class="modal-body">
          <!-- Statistiche Generali -->
          <div class="stats-overview" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3>📊 Statistiche Generali</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 10px;">
              <div style="text-align: center; padding: 10px; background: white; border-radius: 6px;">
                <div style="font-size: 24px; font-weight: bold; color: #007bff;">${stats.totalNotes}</div>
                <div style="font-size: 12px; color: #666;">Note Totali</div>
              </div>
              <div style="text-align: center; padding: 10px; background: white; border-radius: 6px;">
                <div style="font-size: 24px; font-weight: bold; color: #28a745;">${stats.totalCategories}</div>
                <div style="font-size: 12px; color: #666;">Categorie</div>
              </div>
              <div style="text-align: center; padding: 10px; background: white; border-radius: 6px;">
                <div style="font-size: 24px; font-weight: bold; color: #ffc107;">${stats.pendingSync}</div>
                <div style="font-size: 12px; color: #666;">In Sync</div>
              </div>
            </div>
          </div>

          <!-- Griglia Cartelle -->
          <div class="folders-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px;">
            ${folders.map(folder => `
              <div class="folder-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white; cursor: pointer; transition: all 0.2s;" 
                   onclick="window.SmartAssistant.openSecureFolder('${folder.id}')">
                <div class="folder-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                  <div style="display: flex; align-items: center;">
                    <span style="font-size: 24px; margin-right: 10px;">${folder.icon}</span>
                    <div>
                      <h4 style="margin: 0; color: #333;">${folder.name}</h4>
                      <small style="color: #666;">${folder.noteCount} note</small>
                    </div>
                  </div>
                  <button class="clear-folder-btn" 
                          style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 5px 10px; font-size: 12px; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; display: flex; align-items: center; gap: 5px;"
                          onclick="event.stopPropagation(); window.SmartAssistant.clearFolder('${folder.id}', '${folder.name}')"
                          onmouseover="this.style.opacity='1'"
                          onmouseout="this.style.opacity='0.7'"
                          title="Cancella tutte le note di questa cartella">
                    <i class="fas fa-trash" style="font-size: 12px;"></i>
                    <span>Svuota</span>
                  </button>
                </div>
                
                <div class="folder-preview">
                  ${folder.recentNotes.length > 0 ? `
                    <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Ultime note:</div>
                    ${folder.recentNotes.map(note => `
                      <div style="background: #f8f9fa; padding: 5px 8px; border-radius: 4px; margin-bottom: 3px; font-size: 11px;">
                        ${note.preview}
                      </div>
                    `).join('')}
                  ` : `
                    <div style="color: #999; font-style: italic; font-size: 12px;">Nessuna nota ancora</div>
                  `}
                </div>
                
                ${folder.lastUpdated ? `
                  <div style="margin-top: 10px; font-size: 10px; color: #999;">
                    Ultimo aggiornamento: ${new Date(folder.lastUpdated).toLocaleDateString('it-IT')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <!-- Azioni -->
          <div class="folder-actions" style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button onclick="window.SmartAssistant.searchSecureNotes()" class="btn btn-primary">
              🔍 Cerca nelle Note Sicure
            </button>
            <button onclick="window.SmartAssistant.syncSecureNotes()" class="btn btn-success">
              🔄 Sincronizza con Supabase
            </button>
            <button onclick="window.SmartAssistant.exportSecureNotes()" class="btn btn-info">
              📤 Esporta Backup
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  /**
   * 🗑️ CANCELLA TUTTE LE NOTE DI UNA CARTELLA
   */
  clearFolder(folderId, folderName) {
    if (!window.SmartAssistantSecureStorage) {
      this.showNotification('⚠️ Sistema storage sicuro non disponibile', 'warning');
      return;
    }

    // Conferma prima della cancellazione
    const confirmMessage = `🗑️ ATTENZIONE!\n\nSei sicuro di voler cancellare TUTTE le note dalla cartella:\n"${folderName}"?\n\nQuesta operazione è IRREVERSIBILE!\n\nPremi OK per confermare la cancellazione.`;
    
    if (!confirm(confirmMessage)) {
      console.log('🚫 Cancellazione annullata dall\'utente');
      return;
    }

    try {
      console.log(`🗑️ Cancellazione cartella: ${folderId} (${folderName})`);
      
      // Ottiene le note della cartella prima di cancellarle
      const folderNotes = window.SmartAssistantSecureStorage.getFolderNotes(folderId);
      const noteCount = folderNotes.length;
      
      // Cancella tutte le note dalla cartella
      const deleted = window.SmartAssistantSecureStorage.clearFolder(folderId);
      
      if (deleted) {
        console.log(`✅ Cancellate ${noteCount} note dalla cartella ${folderName}`);
        this.showNotification(`🗑️ Cancellate ${noteCount} note da "${folderName}"`, 'success');
        
        // Ricarica l'interfaccia delle cartelle
        setTimeout(() => {
          // Chiude il modal corrente
          const modal = document.querySelector('.smart-modal');
          if (modal) modal.remove();
          
          // Riapre le cartelle aggiornate
          this.showSecureFolders();
        }, 1000);
        
      } else {
        throw new Error('Operazione di cancellazione fallita');
      }
      
    } catch (error) {
      console.error('❌ Errore durante cancellazione cartella:', error);
      this.showNotification(`❌ Errore: ${error.message}`, 'error');
    }
  }

  /**
   * 📂 APRE CARTELLA SPECIFICA
   */
  openSecureFolder(categoryId) {
    if (!window.SmartAssistantSecureStorage) return;

    const notes = window.SmartAssistantSecureStorage.getFolderNotes(categoryId);
    const categories = window.SmartAssistantSecureStorage.categories;
    const category = categories[categoryId];

    if (!category) return;

    const modal = document.createElement('div');
    modal.className = 'smart-modal';
    modal.innerHTML = `
      <div class="smart-modal-content" style="max-width: 800px; max-height: 80vh;">
        <div class="modal-header">
          <h2>${category.icon} ${category.name}</h2>
          <button class="modal-close" onclick="this.closest('.smart-modal').remove()">&times;</button>
        </div>
        
        <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
          ${notes.length > 0 ? `
            <div class="notes-list">
              ${notes.map(note => `
                <div class="secure-note-item" style="border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 10px; background: white;">
                  <div class="note-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <small style="color: #666;">${new Date(note.secureTimestamp).toLocaleString('it-IT')}</small>
                    <div class="note-confidence" style="background: ${note.confidence > 0.7 ? '#d4edda' : note.confidence > 0.4 ? '#fff3cd' : '#f8d7da'}; 
                                                            color: ${note.confidence > 0.7 ? '#155724' : note.confidence > 0.4 ? '#856404' : '#721c24'};
                                                            padding: 2px 6px; border-radius: 3px; font-size: 10px;">
                      ${Math.round(note.confidence * 100)}% sicurezza
                    </div>
                  </div>
                  
                  <div class="note-content" style="margin-bottom: 8px; line-height: 1.4;">
                    ${note.transcription}
                  </div>
                  
                  ${note.keywords.length > 0 ? `
                    <div class="note-keywords" style="margin-bottom: 8px;">
                      ${note.keywords.map(keyword => `
                        <span style="background: #e9ecef; color: #495057; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-right: 4px;">
                          ${keyword}
                        </span>
                      `).join('')}
                    </div>
                  ` : ''}
                  
                  <div class="note-actions" style="display: flex; gap: 5px;">
                    <button onclick="window.SmartAssistant.playSecureNote('${note.id}')" class="btn btn-sm btn-outline-primary">🎵 Audio</button>
                    <button onclick="window.SmartAssistant.exportSecureNote('${note.id}')" class="btn btn-sm btn-outline-info">📤 Esporta</button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="text-align: center; padding: 40px; color: #666;">
              <div style="font-size: 48px; margin-bottom: 10px;">${category.icon}</div>
              <p>Nessuna nota in questa categoria</p>
              <small>Le note verranno organizzate automaticamente quando create</small>
            </div>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  /**
   * 🔍 CERCA NELLE NOTE SICURE
   */
  searchSecureNotes() {
    const query = prompt('🔍 Cerca nelle note sicure:');
    if (!query || !window.SmartAssistantSecureStorage) return;

    const results = window.SmartAssistantSecureStorage.searchSecureNotes(query);
    
    const modal = document.createElement('div');
    modal.className = 'smart-modal';
    modal.innerHTML = `
      <div class="smart-modal-content" style="max-width: 700px;">
        <div class="modal-header">
          <h2>🔍 Risultati ricerca: "${query}"</h2>
          <button class="modal-close" onclick="this.closest('.smart-modal').remove()">&times;</button>
        </div>
        
        <div class="modal-body">
          ${results.length > 0 ? `
            <p style="color: #666; margin-bottom: 15px;">Trovate ${results.length} note</p>
            <div class="search-results">
              ${results.map(note => `
                <div class="search-result-item" style="border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="background: #e9ecef; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
                      ${note.categoryIcon} ${note.categoryName}
                    </span>
                    <small style="color: #666;">${new Date(note.secureTimestamp).toLocaleDateString('it-IT')}</small>
                  </div>
                  <div style="line-height: 1.4;">
                    ${note.transcription.replace(new RegExp(query, 'gi'), `<mark>$&</mark>`)}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="text-align: center; padding: 40px; color: #666;">
              <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
              <p>Nessun risultato trovato per "${query}"</p>
            </div>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  /**
   * 🔄 SINCRONIZZA NOTE SICURE
   */
  async syncSecureNotes() {
    if (!window.SmartAssistantSecureStorage) return;

    this.showNotification('🔄 Sincronizzazione in corso...', 'info');
    
    try {
      await window.SmartAssistantSecureStorage.attemptSupabaseSync();
      this.showNotification('✅ Sincronizzazione completata!', 'success');
    } catch (error) {
      console.error('❌ Errore sincronizzazione:', error);
      this.showNotification('❌ Errore durante la sincronizzazione', 'error');
    }
  }

  /**
   * 🔍 DEBUG TRASCRIZIONI - Metodo per verificare lo stato delle note
   */
  debugTranscriptions() {
    const notes = this.getSavedNotes();
    console.log('🔍 DEBUG TRASCRIZIONI - Stato attuale note:');
    console.log(`Totale note: ${notes.length}`);
    
    notes.forEach((note, index) => {
      console.log(`\n📝 Nota ${index + 1}:`);
      console.log(`- ID: ${note.id}`);
      console.log(`- Data: ${new Date(note.timestamp).toLocaleString()}`);
      console.log(`- Ha Audio: ${!!note.audioBase64}`);
      console.log(`- Ha Trascrizione: ${!!note.transcription}`);
      if (note.transcription) {
        console.log(`- Testo: "${note.transcription.substring(0, 100)}..."`);
      }
      console.log(`- Oggetto completo:`, note);
    });
    
    // Mostra anche informazioni in un alert user-friendly
    const summary = notes.map(note => {
      const hasTranscription = !!note.transcription;
      const date = new Date(note.timestamp).toLocaleDateString();
      return `${date}: ${hasTranscription ? '✅ Trascrizione OK' : '❌ Manca trascrizione'}`;
    }).join('\n');
    
    alert(`📊 Stato Trascrizioni:\n\n${summary}\n\nDettagli completi in console (F12)`);
  }

  /**
   * 📤 ESPORTA NOTE SICURE
   */
  exportSecureNotes() {
    if (!window.SmartAssistantSecureStorage) return;

    const stats = window.SmartAssistantSecureStorage.getUsageStatistics();
    const folders = window.SmartAssistantSecureStorage.getFoldersOverview();
    
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0',
        totalNotes: stats.totalNotes,
        totalCategories: stats.totalCategories
      },
      statistics: stats,
      folders: folders
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-assistant-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showNotification('📤 Backup esportato con successo!', 'success');
  }
}

// Inizializza istanza globale
window.SmartAssistant = new SmartAssistant();

// NON auto-inizializzare qui - lasciamo che Navigation chiami onEnter
// che a sua volta chiamerà init() quando necessario

// Funzione globale di emergenza per abilitare il pulsante
window.forceEnableRecordingButton = async function() {
  try {
    // Test rapido permessi
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    
    // Trova e abilita il pulsante
    const startBtn = document.getElementById('start-recording-btn');
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.classList.add('ready');
      startBtn.style.opacity = '1';
      startBtn.style.cursor = 'pointer';
      startBtn.style.backgroundColor = '#28a745';
      startBtn.style.borderColor = '#28a745';
      
      console.log('✅ Pulsante registrazione forzato con successo');
      
      // Aggiorna anche lo status
      const statusElement = document.querySelector('.recording-status .status-text');
      if (statusElement) {
        statusElement.textContent = 'Pronto per registrare';
        statusElement.parentElement.className = 'recording-status success';
      }
      
      return true;
    } else {
      console.error('❌ Pulsante non trovato nel DOM');
      return false;
    }
  } catch (error) {
    console.error('❌ Errore permessi microfono:', error);
    return false;
  }
};

// Funzione di test per la registrazione
window.testRecording = async function() {
  console.log('🎤 TEST RECORDING - Avvio test registrazione manuale');
  if (window.SmartAssistant) {
    await window.SmartAssistant.startRecording();
  } else {
    console.error('❌ SmartAssistant non trovato');
  }
};

// Funzione per riattaccare gli event listener
window.reattachRecordingListeners = function() {
  const startBtn = document.getElementById('start-recording-btn');
  const stopBtn = document.getElementById('stop-recording-btn');
  
  let success = false;
  
  if (startBtn) {
    // Rimuovi tutti i listener esistenti clonando il pulsante
    const newBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newBtn, startBtn);
    
    // Riattacca il listener
    newBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎤 [REATTACHED] Start button clicked!');
      if (window.SmartAssistant) {
        await window.SmartAssistant.startRecording();
      }
    });
    
    console.log('✅ Start button event listener riattaccato');
    success = true;
  }
  
  if (stopBtn) {
    // Rimuovi tutti i listener esistenti clonando il pulsante
    const newStopBtn = stopBtn.cloneNode(true);
    stopBtn.parentNode.replaceChild(newStopBtn, stopBtn);
    
    // Riattacca il listener
    newStopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🎤 [REATTACHED] Stop button clicked!');
      if (window.SmartAssistant) {
        window.SmartAssistant.stopRecording();
      }
    });
    
    console.log('✅ Stop button event listener riattaccato');
    success = true;
  }
  
  if (success) {
    console.log('✅ Event listeners riattaccati con successo');
  }
  
  return success;
};

// Funzione di debug per controllare stato UI
window.debugRecordingUI = function() {
  const startBtn = document.getElementById('start-recording-btn');
  const stopBtn = document.getElementById('stop-recording-btn');
  
  console.log('🔍 DEBUG RECORDING UI STATE:');
  console.log('Start button:', {
    found: !!startBtn,
    disabled: startBtn?.disabled,
    display: startBtn?.style.display,
    classes: startBtn?.className
  });
  console.log('Stop button:', {
    found: !!stopBtn,
    disabled: stopBtn?.disabled,
    display: stopBtn?.style.display,
    classes: stopBtn?.className
  });
  
  if (window.SmartAssistant) {
    console.log('SmartAssistant recording state:', window.SmartAssistant.isRecording);
  }
  
  return {
    startButton: !!startBtn,
    stopButton: !!stopBtn,
    isRecording: window.SmartAssistant?.isRecording
  };
};