/**
 * AI Voice Manager
 * Gestione input/output vocale con attivazione tramite parola chiave
 */

const AIVoiceManager = {
  // Configurazione
  config: {
    wakeWord: 'assistente', // Parola di attivazione
    alternativeWakeWords: ['hey assistente', 'ok assistente', 'ehi assistente'],
    language: 'it-IT',
    voiceName: 'Google italiano', // Voce femminile italiana se disponibile
    listenTimeout: 10000, // 10 secondi di ascolto dopo attivazione
    continuous: false // Per sicurezza in auto, ascolto non continuo
  },

  // Stato
  state: {
    isInitialized: false,
    isListening: false,
    isWaitingForCommand: false,
    isInFormMode: false, // Nuovo flag per modalità form
    recognition: null,
    synthesis: window.speechSynthesis,
    selectedVoice: null,
    lastActivation: 0,
    recognitionActive: false // Nuovo flag per tracciare stato attivo
  },

  /**
   * Inizializzazione specifica per iPhone
   */
  initForIPhone: function() {
    console.log('📱 Inizializzazione iPhone...');
    
    // Su iPad, se AIVoiceManagerV2 è attivo, disabilita questo sistema
    const isIPad = /iPad/.test(navigator.userAgent) || localStorage.getItem('force_ipad_mode') === 'true';
    if (isIPad && window.AIVoiceManagerV2) {
      console.log('📱 iPad rilevato con AIVoiceManagerV2 - Disabilito AIVoiceManager vecchio');
      return false;
    }
    
    // Configurazione ottimizzata per iPhone
    this.config.continuous = true;
    this.config.wakeWordEnabled = true;
    this.config.listenTimeout = 8000;
    this.config.mode = 'continuous';
    
    // Forza creazione immediata del pulsante
    this.createIPhoneButton();
    
    // Inizializza il resto normalmente
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Web Speech API non supportata');
      return false;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.state.recognition = new SpeechRecognition();
      
      this.state.recognition.continuous = true;
      this.state.recognition.interimResults = true;
      this.state.recognition.lang = 'it-IT';
      this.state.recognition.maxAlternatives = 3;

      this.setupRecognitionEvents();
      this.loadVoices();
      
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }

      this.state.isInitialized = true;
      console.log('✅ iPhone Voice Manager inizializzato');
      return true;
    } catch (error) {
      console.error('❌ Errore init iPhone:', error);
      return false;
    }
  },

  /**
   * Crea pulsante specifico per iPhone
   */
  createIPhoneButton: function() {
    console.log('📱 Creando pulsante iPhone...');
    
    // Rimuovi qualsiasi pulsante esistente
    const existing = document.querySelector('#aiVoiceToggle, .iphone-voice-btn');
    if (existing) existing.remove();
    
    const btn = document.createElement('div');
    btn.id = 'aiVoiceToggle';
    btn.className = 'iphone-voice-btn';
    btn.innerHTML = '🎤';
    
    // Stile ultra-specifico per iPhone
    btn.style.cssText = `
      position: fixed !important;
      top: env(safe-area-inset-top, 10px) !important;
      right: 10px !important;
      width: 50px !important;
      height: 50px !important;
      background: linear-gradient(135deg, #ff4757, #ff3838) !important;
      border: 3px solid white !important;
      border-radius: 25px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 24px !important;
      cursor: pointer !important;
      z-index: 99999 !important;
      box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4) !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      -webkit-tap-highlight-color: transparent !important;
      transform: scale(1) !important;
      transition: transform 0.2s ease !important;
    `;
    
    // Event listeners ottimizzati per iPhone
    const handleTouch = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('📱 iPhone: Pulsante microfono toccato!');
      
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        btn.style.transform = 'scale(1)';
      }, 150);
      
      this.toggle();
    };
    
    btn.addEventListener('touchstart', handleTouch, { passive: false });
    btn.addEventListener('click', handleTouch, { passive: false });
    
    // Inserimento sicuro nel DOM
    document.body.insertBefore(btn, document.body.firstChild);
    
    console.log('✅ Pulsante iPhone creato e inserito');
    return btn;
  },

  /**
   * Forza creazione pulsante (senza controlli)
   */
  forceCreateButton: function() {
    console.log('🚨 FORCE CREATE: Creando pulsante microfono forzatamente...');
    
    // Rimuovi eventuali pulsanti esistenti
    const existingBtn = document.getElementById('aiVoiceToggle');
    if (existingBtn) {
      existingBtn.remove();
    }
    
    const btn = document.createElement('button');
    btn.id = 'aiVoiceToggle';
    btn.innerHTML = '🎤';
    btn.onclick = () => {
      console.log('🎤 FORCE BUTTON: Pulsante microfono cliccato!');
      this.toggle();
    };
    
    // Stile forzato inline (bypassa CSS)
    btn.style.cssText = `
      position: fixed !important;
      top: 60px !important;
      right: 10px !important;
      width: 50px !important;
      height: 50px !important;
      border-radius: 50% !important;
      background: #e74c3c !important;
      color: white !important;
      border: none !important;
      cursor: pointer !important;
      z-index: 9999 !important;
      font-size: 20px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
    `;
    
    document.body.appendChild(btn);
    console.log('🚨 FORCE CREATE: Pulsante creato e aggiunto!');
    
    return btn;
  },

  /**
   * Crea pulsante microfono se non esiste
   */
  createVoiceButton: function() {
    let btn = document.getElementById('aiVoiceToggle');
    if (!btn) {
      console.log('🎤 Creando pulsante microfono...');
      
      btn = document.createElement('button');
      btn.id = 'aiVoiceToggle';
      btn.className = 'voice-toggle-btn';
      btn.innerHTML = '<i class="fas fa-microphone"></i>';
      btn.title = 'Attiva/Disattiva comandi vocali';
      btn.setAttribute('aria-label', 'Comandi vocali');
      
      // Stile base con touch target appropriato
      btn.style.cssText = `
        position: fixed;
        top: 15px;
        right: 15px;
        width: 48px;
        height: 48px;
        min-width: 48px;
        min-height: 48px;
        border-radius: 50%;
        background: #457b9d;
        color: white;
        border: 2px solid white;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      `;
      
      // Aggiungi event listener con gestione mobile ottimizzata
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎤 PULSANTE MICROFONO CLICCATO!');
        this.toggle();
      });
      
      // Aggiungi feedback tattile per mobile
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        btn.style.transform = 'scale(0.95)';
      });
      
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn.style.transform = 'scale(1)';
      });
      
      // Aggiungi al body
      document.body.appendChild(btn);
      
      console.log('✅ Pulsante microfono creato');
    }
    return btn;
  },

  /**
   * Inizializzazione
   */
  init: function() {
    // Su iPad, se AIVoiceManagerV2 esiste, NON inizializzare questo sistema
    const isIPad = /iPad/.test(navigator.userAgent) || localStorage.getItem('force_ipad_mode') === 'true';
    if (isIPad) {
      console.log('🔇 iPad rilevato - Sistema vecchio NON inizializzato (AIVoiceManagerV2 gestisce tutto)');
      return false;
    }
    
    // Check HTTPS
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.error('❌ HTTPS richiesto per il riconoscimento vocale');
      this.showError('Il riconoscimento vocale richiede una connessione sicura (HTTPS)');
      return false;
    }
    
    // Feature detection migliorato
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Web Speech API non supportata in questo browser');
      return false;
    }

    // Adatta configurazione al dispositivo
    if (window.DeviceDetector) {
      const deviceConfig = DeviceDetector.getVoiceConfig();
      Object.assign(this.config, deviceConfig);
      
      // Mostra avvisi di compatibilità
      const warnings = DeviceDetector.showCompatibilityWarnings();
      warnings.forEach(warning => console.warn('⚠️', warning));
    }

    try {
      // Crea istanza di riconoscimento vocale
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.state.recognition = new SpeechRecognition();
      
      // Configurazione
      this.state.recognition.continuous = true; // Ascolto continuo per wake word
      this.state.recognition.interimResults = true;
      this.state.recognition.lang = this.config.language;
      this.state.recognition.maxAlternatives = 3;

      // Setup eventi
      this.setupRecognitionEvents();
      
      // Carica voci disponibili
      this.loadVoices();
      
      // Listener per caricamento voci
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }

      // Crea pulsante microfono
      this.createVoiceButton();
      
      this.state.isInitialized = true;
      console.log('AI Voice Manager inizializzato con successo');
      return true;
    } catch (error) {
      console.error('Errore inizializzazione Voice Manager:', error);
      return false;
    }
  },

  /**
   * Carica voci disponibili
   */
  loadVoices: function() {
    const voices = this.state.synthesis.getVoices();
    
    // Cerca voce italiana preferita
    const italianVoices = voices.filter(voice => voice.lang.includes('it'));
    
    // Priorità: Google italiano femminile > Qualsiasi italiano > Prima voce disponibile
    this.state.selectedVoice = 
      italianVoices.find(v => v.name.includes('Google') && v.name.includes('italiano')) ||
      italianVoices.find(v => v.name.includes('female') || v.name.includes('femminile')) ||
      italianVoices[0] ||
      voices[0];

    console.log('Voce selezionata:', this.state.selectedVoice?.name);
  },

  /**
   * Setup eventi riconoscimento
   */
  setupRecognitionEvents: function() {
    const recognition = this.state.recognition;
    let isRestarting = false; // Flag per evitare riavvii multipli

    // Risultati riconoscimento
    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript.toLowerCase().trim();
      
      console.log('Riconosciuto:', transcript);

      // Se siamo in modalità form, ogni comando è valido
      if (this.state.isInFormMode) {
        if (event.results[current].isFinal) {
          console.log('Comando in modalità form:', transcript);
          // Invia direttamente al parser senza controlli
          if (window.AICommandParser) {
            AICommandParser.processCommand(transcript);
          }
        }
      }
      // Se stiamo aspettando un comando dopo l'attivazione
      else if (this.state.isWaitingForCommand) {
        this.handleCommand(transcript, event.results[current].isFinal);
      } 
      // Altrimenti controlla la wake word
      else {
        this.checkWakeWord(transcript);
      }
    };

    // Errori
    recognition.onerror = (event) => {
      console.error('Errore riconoscimento:', event.error);
      
      // Gestisci errori specifici
      if (event.error === 'no-speech') {
        if (this.state.isWaitingForCommand) {
          this.speak('Non ho sentito nulla. Riprova.');
          this.state.isWaitingForCommand = false;
          this.hideCommandUI();
        }
        // Per wake word, continua silenziosamente
      } else if (event.error === 'aborted' || event.error === 'network') {
        // Non fare nulla per questi errori
        return;
      } else if (event.error === 'not-allowed') {
        console.error('Permesso microfono negato!');
        this.state.isListening = false;
        this.updateUI(false);
        this.showPermissionDeniedMessage();
        return;
      } else if (event.error === 'audio-capture') {
        console.error('Errore cattura audio');
        this.showError('Errore accesso microfono. Riprova o controlla le impostazioni.');
        return;
      } else if (event.error === 'not-supported') {
        console.error('Riconoscimento vocale non supportato');
        this.showError('Riconoscimento vocale non supportato su questo dispositivo.');
        return;
      }
      
      // Segna che il riconoscimento non è più attivo
      this.state.recognitionActive = false;
    };

    // Fine riconoscimento
    recognition.onend = () => {
      console.log('Riconoscimento terminato. isListening:', this.state.isListening, 'isWaitingForCommand:', this.state.isWaitingForCommand);
      
      // Segna che il riconoscimento non è più attivo
      this.state.recognitionActive = false;
      
      // Riavvia solo se dovrebbe essere in ascolto e non è già in corso un riavvio
      if (this.state.isListening && !isRestarting) {
        isRestarting = true;
        console.log('Riavvio ascolto wake word dopo onend');
        setTimeout(() => {
          isRestarting = false;
          if (this.state.isListening) {
            this.startWakeWordListening();
          }
        }, 500); // Aumentato il delay a 500ms
      }
    };

    // Inizio riconoscimento
    recognition.onstart = () => {
      console.log('Riconoscimento avviato');
      this.state.recognitionActive = true;
      this.updateUI(true);
    };
  },

  /**
   * Controlla wake word
   */
  checkWakeWord: function(transcript) {
    const now = Date.now();
    
    console.log('Controllo wake word per:', transcript);
    
    // Evita attivazioni multiple ravvicinate
    if (now - this.state.lastActivation < 2000) {
      console.log('Attivazione troppo ravvicinata, ignoro');
      return;
    }

    // Controlla se contiene la wake word
    const hasWakeWord = (this.config.wakeWord && transcript.includes(this.config.wakeWord)) ||
                       this.config.alternativeWakeWords.some(word => transcript.includes(word));

    console.log('Wake word trovata:', hasWakeWord);

    if (hasWakeWord) {
      console.log('Wake word rilevata! Attivando modalità comando...');
      this.state.lastActivation = now;
      this.activateCommandMode();
    }
  },

  /**
   * Richiede permessi microfono con UI progressiva
   */
  requestMicrophonePermission: async function() {
    try {
      // Controlla se i permessi sono già stati concessi
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'microphone' });
        console.log('Stato permessi microfono:', result.state);
        
        if (result.state === 'denied') {
          this.showPermissionDeniedMessage();
          return false;
        }
      }
      
      // Mostra spiegazione prima di richiedere permessi
      if (!localStorage.getItem('micPermissionExplained')) {
        this.showPermissionExplanation();
        localStorage.setItem('micPermissionExplained', 'true');
      }
      
      // Richiedi permessi usando getUserMedia (più affidabile su mobile)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Permessi microfono concessi');
      return true;
      
    } catch (error) {
      console.error('❌ Errore permessi microfono:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.showPermissionDeniedMessage();
      } else if (error.name === 'NotFoundError') {
        this.showError('Nessun microfono trovato su questo dispositivo');
      } else {
        this.showError('Errore accesso microfono: ' + error.message);
      }
      return false;
    }
  },

  /**
   * Mostra spiegazione permessi
   */
  showPermissionExplanation: function() {
    const modal = document.createElement('div');
    modal.className = 'voice-permission-modal';
    modal.innerHTML = `
      <div class="voice-permission-content">
        <h3>🎤 Attivazione Comandi Vocali</h3>
        <p>Per utilizzare i comandi vocali, l'app necessita l'accesso al microfono.</p>
        <p>Potrai:</p>
        <ul>
          <li>Navigare l'app con la voce</li>
          <li>Cercare clienti e prodotti</li>
          <li>Creare ordini vocalmente</li>
          <li>Dettare note e descrizioni</li>
        </ul>
        <button onclick="AIVoiceManager.closePermissionModal()">Ho capito</button>
      </div>
    `;
    document.body.appendChild(modal);
  },

  /**
   * Chiude modal permessi
   */
  closePermissionModal: function() {
    const modal = document.querySelector('.voice-permission-modal');
    if (modal) modal.remove();
  },

  /**
   * Mostra messaggio permessi negati
   */
  showPermissionDeniedMessage: function() {
    this.showError('Permessi microfono negati. Per riattivare, vai nelle impostazioni del browser/dispositivo.');
  },

  /**
   * Mostra errore user-friendly
   */
  showError: function(message) {
    // Crea notifica mobile-friendly
    const notification = document.createElement('div');
    notification.className = 'voice-error-notification';
    notification.innerHTML = `
      <div class="voice-error-content">
        <span class="voice-error-icon">⚠️</span>
        <span class="voice-error-message">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    // Aggiungi stili inline per compatibilità
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      background: #ff4757;
      color: white;
      padding: 15px;
      border-radius: 8px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      font-size: 14px;
      line-height: 1.4;
    `;
    
    const content = notification.querySelector('.voice-error-content');
    content.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    
    const button = notification.querySelector('button');
    button.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      margin-left: auto;
      padding: 5px;
      min-width: 30px;
      min-height: 30px;
    `;
    
    document.body.appendChild(notification);
    
    // Rimuovi automaticamente dopo 5 secondi
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
    
    // Log per debug
    console.error('🎤 Voice Error:', message);
  },

  /**
   * Attiva modalità comando
   */
  activateCommandMode: function() {
    console.log('Attivando modalità comando...');
    this.state.isWaitingForCommand = true;
    
    // NON fermare il riconoscimento se è già attivo e continuous
    // Questo evita richieste multiple del microfono
    
    // Mostra indicatore visivo
    this.showCommandUI();
    
    // Feedback vocale e visivo
    this.speak('Ciao Flavio, dimmi pure, sono qui per aiutarti.');
    
    // Timeout per tornare in ascolto wake word (solo se non siamo in form mode)
    setTimeout(() => {
      if (this.state.isWaitingForCommand && !this.state.isInFormMode) {
        console.log('Timeout comando raggiunto, torno in ascolto wake word');
        this.state.isWaitingForCommand = false;
        this.hideCommandUI();
        this.speak('Sono tornata in ascolto.');
      }
    }, this.config.listenTimeout);
  },

  /**
   * Gestisce comando ricevuto
   */
  handleCommand: function(transcript, isFinal) {
    if (!isFinal) return; // Aspetta il risultato finale
    
    console.log('🎤 VOICE: Gestisco comando finale:', transcript);
    
    // Se il trascritto contiene solo la wake word, continua ad ascoltare
    const isOnlyWakeWord = transcript.toLowerCase().trim() === this.config.wakeWord ||
                          this.config.alternativeWakeWords.some(word => transcript.toLowerCase().trim() === word);
    
    if (isOnlyWakeWord) {
      console.log('Solo wake word rilevata, continuo ad ascoltare per il comando...');
      // Non resettare isWaitingForCommand, continua ad ascoltare
      return;
    }
    
    // Reset stato comando E ferma completamente l'ascolto
    this.state.isWaitingForCommand = false;
    this.state.isListening = false; // FERMA completamente l'ascolto
    this.hideCommandUI();
    
    // Ferma il riconoscimento vocale per evitare interferenze durante la risposta
    if (this.state.recognition) {
      try {
        this.state.recognition.stop();
        console.log('🎤 VOICE: Fermo riconoscimento per evitare interferenze durante risposta AI');
      } catch (error) {
        console.log('🎤 VOICE: Errore stop riconoscimento:', error);
      }
    }
    
    // Invia direttamente all'AI Assistant se è attivo
    const aiAssistant = window.flavioAI || window.FlavioAIAssistant;
    console.log('🔍 DEBUG: Controllo AI Assistant:', {
      flavioAI: !!window.flavioAI,
      FlavioAIAssistant: !!window.FlavioAIAssistant,
      aiAssistant: !!aiAssistant
    });
    
    if (aiAssistant) {
      console.log('🎤 Inviando comando vocale direttamente all\'AI Assistant:', transcript);
      const input = document.getElementById('aiInput');
      if (input) {
        input.value = transcript;
        console.log('🎤 Chiamando aiAssistant.sendMessage(true)...');
        aiAssistant.sendMessage(true); // true = input vocale
        return; // Non fare altro processing
      }
    } else {
      console.log('⚠️ AI Assistant non ancora disponibile, riprovo...');
      // Prova a trovare l'AI attraverso il DOM dopo un breve delay
      setTimeout(() => {
        const retryAiAssistant = window.flavioAI || window.FlavioAIAssistant;
        if (retryAiAssistant) {
          console.log('🔄 AI Assistant trovato al secondo tentativo');
          const input = document.getElementById('aiInput');
          if (input) {
            input.value = transcript;
            console.log('🎤 Chiamando retryAiAssistant.sendMessage(true)...');
            retryAiAssistant.sendMessage(true);
            return;
          }
        } else {
          console.log('❌ AI Assistant ancora non disponibile dopo retry');
        }
      }, 500);
    }
    
    // Fallback: invia al parser
    if (window.AICommandParser) {
      AICommandParser.processCommand(transcript);
    } else {
      console.log('🎤 Nessun sistema AI disponibile per:', transcript);
    }
  },

  /**
   * Avvia ascolto wake word
   */
  startWakeWordListening: function() {
    if (!this.state.isInitialized) {
      if (!this.init()) return;
    }

    // Se il riconoscimento è già attivo, non fare nulla
    if (this.state.recognitionActive) {
      console.log('Riconoscimento già attivo, skip start');
      return;
    }

    try {
      this.state.isListening = true;
      this.state.recognition.start();
      console.log('Ascolto wake word avviato');
    } catch (error) {
      if (error.name === 'InvalidStateError') {
        // Se il riconoscimento è già attivo, ferma e riprova
        console.log('InvalidStateError: ferma e riprova');
        this.state.recognition.stop();
        // Non riprovare subito, lascia che sia onend a gestire il riavvio
      } else {
        console.error('Errore avvio ascolto:', error);
        this.state.isListening = false;
      }
    }
  },

  /**
   * Ferma ascolto
   */
  stopListening: function() {
    if (this.state.recognition && this.state.isListening) {
      console.log('Fermando ascolto...');
      this.state.isListening = false;
      this.state.isWaitingForCommand = false;
      this.state.recognitionActive = false;
      
      try {
        this.state.recognition.stop();
      } catch (error) {
        console.log('Errore stop:', error);
      }
      
      this.updateUI(false);
      this.hideCommandUI();
    }
  },

  /**
   * Parla
   */
  speak: function(text) {
    console.log('🔊 Voice Manager - Parlando:', text);
    
    // Su iPad, se AIVoiceManagerV2 è attivo, DISABILITA completamente questo sistema
    const isIPad = /iPad/.test(navigator.userAgent) || localStorage.getItem('force_ipad_mode') === 'true';
    if (isIPad && window.AIVoiceManagerV2) {
      console.log('🔇 iPad: Sistema vecchio DISABILITATO - AIVoiceManagerV2 gestisce tutto');
      return; // NON fare nulla - lascia che solo il nuovo sistema gestisca
    }
    
    // Rileva dispositivi iOS
    const isIPhone = /iPhone/.test(navigator.userAgent);
    const isIOS = isIPhone || isIPad;
    
    if (isIOS) {
      console.log('📱 iOS Device: Uso metodo speech ottimizzato', isIPhone ? 'iPhone' : 'iPad');
      this.speakForIOS(text, isIPad);
      return;
    }
    
    // Cancella eventuali code vocali precedenti
    this.state.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.config.language;
    utterance.rate = 1.1; // Leggermente più veloce
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    if (this.state.selectedVoice) {
      utterance.voice = this.state.selectedVoice;
    }

    // Gestione eventi utterance
    utterance.onstart = () => {
      console.log('Inizio sintesi vocale');
    };
    
    utterance.onend = () => {
      console.log('Fine sintesi vocale');
      // Se siamo in modalità comando, riavvia ascolto per il comando
      if (this.state.isWaitingForCommand) {
        console.log('Riavvio ascolto per comando');
        setTimeout(() => this.startWakeWordListening(), 500);
      }
      // Altrimenti se eravamo in ascolto, riprendi ascolto wake word
      else if (this.state.isListening) {
        console.log('Riavvio ascolto wake word');
        setTimeout(() => this.startWakeWordListening(), 500);
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Errore sintesi vocale:', event.error);
    };

    // NON fermare il riconoscimento durante il parlato se è continuous
    // Questo evita richieste multiple del microfono
    
    this.state.synthesis.speak(utterance);
  },
  
  /**
   * Pronuncia ottimizzata per dispositivi iOS (iPhone e iPad)
   */
  speakForIOS: function(text, isIPad = false) {
    const deviceName = isIPad ? 'iPad' : 'iPhone';
    console.log(`📱 ${deviceName} speech:`, text);
    
    // Mostra sempre il testo nella debug box
    if (window.AICommandParser && AICommandParser.showDebugOnScreen) {
      AICommandParser.showDebugOnScreen(`🔊 ${deviceName}: ` + text);
    }
    
    // METODO 1: Prova la sintesi standard con fix iOS
    this.tryiOSSpeech(text, isIPad);
    
    // METODO 2: Fallback con feedback appropriato per il dispositivo
    setTimeout(() => {
      if (!isIPad && navigator.vibrate) {
        // Vibrazione solo per iPhone (iPad non ha vibrazione)
        navigator.vibrate([200, 100, 200]);
      }
      
      // Feedback visivo per entrambi i dispositivi
      if (window.AICommandParser && AICommandParser.showDebugOnScreen) {
        const feedback = isIPad ? '📺 Display + Audio: ' : '📳 Vibrazione + Testo: ';
        AICommandParser.showDebugOnScreen(feedback + text);
      }
    }, 2000);
  },
  
  /**
   * Tentativo speech iOS con tutte le ottimizzazioni
   */
  tryiOSSpeech: function(text, isIPad = false) {
    const deviceName = isIPad ? 'iPad' : 'iPhone';
    
    try {
      // Forza ricaricamento voci
      const voices = speechSynthesis.getVoices();
      console.log(`📱 ${deviceName}: Voci disponibili:`, voices.length);
      
      if (voices.length === 0) {
        // Se non ci sono voci, prova a forzare il caricamento
        console.log(`📱 ${deviceName}: Forzo caricamento voci...`);
        speechSynthesis.onvoiceschanged = () => {
          console.log(`📱 ${deviceName}: Voci caricate, riprovo speech`);
          this.executeiOSSpeech(text, isIPad);
        };
        return;
      }
      
      this.executeiOSSpeech(text, isIPad);
      
    } catch (error) {
      console.error(`📱 ${deviceName}: Errore tryiOSSpeech:`, error);
      if (window.AICommandParser && AICommandParser.showDebugOnScreen) {
        AICommandParser.showDebugOnScreen(`❌ try${deviceName}: ` + error.message);
      }
    }
  },
  
  /**
   * Esecuzione speech iOS con massima compatibilità
   */
  executeiOSSpeech: function(text, isIPad = false) {
    const deviceName = isIPad ? 'iPad' : 'iPhone';
    try {
      // Cancella tutto
      speechSynthesis.cancel();
      
      // Aspetta un po' per essere sicuri (iPad potrebbe aver bisogno di più tempo)
      const delay = isIPad ? 100 : 50;
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configurazione iOS specifica (iPad potrebbe preferire impostazioni diverse)
        utterance.lang = 'it-IT';
        utterance.rate = isIPad ? 0.9 : 0.8; // iPad leggermente più veloce
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Trova voce iOS italiana
        const voices = speechSynthesis.getVoices();
        console.log(`📱 ${deviceName}: Lista voci:`, voices.map(v => v.name));
        
        const iosVoice = voices.find(voice => 
          voice.lang.startsWith('it') && 
          (voice.name.includes('Italian') || voice.name.includes('Alice') || voice.name.includes('Luca'))
        ) || voices.find(voice => voice.lang.startsWith('it'));
        
        if (iosVoice) {
          utterance.voice = iosVoice;
          console.log('📱 iPhone: Voce selezionata:', iosVoice.name);
          if (window.AICommandParser && AICommandParser.showDebugOnScreen) {
            AICommandParser.showDebugOnScreen('🎤 Voce: ' + iosVoice.name);
          }
        }
        
        // Event listeners con debug intensivo
        utterance.onstart = () => {
          console.log('📱 iPhone: SPEECH INIZIATO!');
          if (window.AICommandParser && AICommandParser.showDebugOnScreen) {
            AICommandParser.showDebugOnScreen('✅ AUDIO AVVIATO!');
          }
        };
        
        utterance.onend = () => {
          console.log('📱 iPhone: Speech completato');
          if (window.AICommandParser && AICommandParser.showDebugOnScreen) {
            AICommandParser.showDebugOnScreen('✅ Audio completato');
          }
          
          // Riavvio ascolto
          if (this.state.isWaitingForCommand || this.state.isListening) {
            setTimeout(() => this.startWakeWordListening(), 500);
          }
        };
        
        utterance.onerror = (e) => {
          console.error('📱 iPhone: ERRORE SPEECH:', e.error);
          if (window.AICommandParser && AICommandParser.showDebugOnScreen) {
            AICommandParser.showDebugOnScreen('❌ ERRORE AUDIO: ' + e.error);
          }
        };
        
        // FORZA L'ESECUZIONE
        console.log('📱 iPhone: Eseguo speechSynthesis.speak()');
        speechSynthesis.speak(utterance);
        
        // FORCE CHECK: Se dopo 500ms non ha parlato, forza di nuovo
        setTimeout(() => {
          if (!speechSynthesis.speaking && !speechSynthesis.pending) {
            console.log('📱 iPhone: Speech non avviato, FORZO DI NUOVO!');
            if (window.AICommandParser && AICommandParser.showDebugOnScreen) {
              AICommandParser.showDebugOnScreen('🔁 FORZO SPEECH!');
            }
            
            // Prova una seconda volta
            const utterance2 = new SpeechSynthesisUtterance(text);
            utterance2.lang = 'it-IT';
            utterance2.rate = 1.0;
            utterance2.volume = 1.0;
            speechSynthesis.speak(utterance2);
          }
        }, 500);
        
        // Debug stato sintesi
        setTimeout(() => {
          console.log('📱 iPhone: Stato synthesis:', {
            speaking: speechSynthesis.speaking,
            pending: speechSynthesis.pending,
            paused: speechSynthesis.paused
          });
          
          if (window.AICommandParser && AICommandParser.showDebugOnScreen) {
            AICommandParser.showDebugOnScreen(`📊 Stato: speaking=${speechSynthesis.speaking}`);
          }
          
          // Se ancora non parla, vibra e mostra alert
          if (!speechSynthesis.speaking && !speechSynthesis.pending) {
            if (navigator.vibrate) navigator.vibrate(300);
            if (window.AICommandParser && AICommandParser.showDebugOnScreen) {
              AICommandParser.showDebugOnScreen('📳 SPEECH FALLITO - Solo testo');
            }
          }
        }, 1000);
        
      }, 50);
      
    } catch (error) {
      console.error('📱 iPhone: Errore executeiOSSpeech:', error);
      if (window.AICommandParser && AICommandParser.showDebugOnScreen) {
        AICommandParser.showDebugOnScreen('❌ execiOS: ' + error.message);
      }
    }
  },

  /**
   * Inizializza audio per iPad (richiede interazione utente)
   */
  initAudioForiPad: function() {
    const isIPad = /iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
    if (!isIPad) return;

    // Crea un audio context dummy per "unlockare" l'audio su iPad
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 0; // Silenzioso
        oscillator.frequency.value = 440;
        oscillator.start(0);
        oscillator.stop(0.1);
        
        console.log('📱 iPad: Audio context inizializzato');
      }
    } catch (error) {
      console.log('📱 iPad: Errore init audio context:', error);
    }

    // Test speech synthesis "unlock"
    try {
      const testUtterance = new SpeechSynthesisUtterance('');
      testUtterance.volume = 0;
      speechSynthesis.speak(testUtterance);
      console.log('📱 iPad: Speech synthesis unlocked');
    } catch (error) {
      console.log('📱 iPad: Errore unlock speech:', error);
    }
  },

  /**
   * Mostra UI comando
   */
  showCommandUI: function() {
    const indicator = document.getElementById('aiCommandIndicator');
    if (indicator) {
      indicator.classList.add('active');
      const statusText = indicator.querySelector('.ai-status-text');
      if (statusText) {
        statusText.textContent = 'In ascolto del comando...';
      }
    }
  },

  /**
   * Nascondi UI comando
   */
  hideCommandUI: function() {
    const indicator = document.getElementById('aiCommandIndicator');
    if (indicator) {
      indicator.classList.remove('active');
    }
  },

  /**
   * Aggiorna UI stato ascolto
   */
  updateUI: function(isListening) {
    const btn = document.getElementById('aiVoiceToggle');
    if (btn) {
      btn.classList.toggle('listening', isListening);
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = isListening ? 'fas fa-microphone-slash' : 'fas fa-microphone';
      }
    }
  },

  /**
   * Toggle ascolto
   */
  toggle: async function() {
    console.log('🎤 VOICE TOGGLE chiamato. Stato corrente isListening:', this.state.isListening);
    
    if (this.state.isListening) {
      console.log('Fermo ascolto');
      this.stopListening();
    } else {
      console.log('🎤 VOICE: Controllo permessi microfono...');
      
      // Richiedi permessi prima di avviare
      const hasPermission = await this.requestMicrophonePermission();
      if (!hasPermission) {
        console.error('❌ Permessi microfono non concessi');
        return;
      }
      
      console.log('🎤 Avvio ascolto DIRETTO (senza wake word)');
      
      // Inizializza audio per iPad se necessario
      this.initAudioForiPad();
      
      // Vai direttamente in modalità comando (senza wake word)
      this.startDirectCommandMode();
    }
  },

  /**
   * Modalità ascolto diretto (senza wake word)
   */
  startDirectCommandMode: function() {
    if (!this.state.isInitialized) {
      if (!this.init()) return;
    }

    console.log('🎤 Attivando modalità ascolto diretto...');
    this.state.isListening = true;
    this.state.isWaitingForCommand = true; // Vai direttamente in modalità comando
    this.showCommandUI();
    
    try {
      this.state.recognition.start();
      // NON dire nulla, vai direttamente in ascolto silenzioso
      console.log('🎤 Modalità ascolto diretto attivata - ascolto silenzioso');
      
      // Auto-stop dopo timeout (silenzioso)
      setTimeout(() => {
        if (this.state.isListening && this.state.isWaitingForCommand) {
          console.log('🎤 Timeout ascolto diretto raggiunto - stop silenzioso');
          this.stopListening();
          // NON dire "Tempo scaduto" per evitare interferenze
        }
      }, this.config.listenTimeout);
      
    } catch (error) {
      console.error('Errore avvio ascolto diretto:', error);
      this.state.isListening = false;
      this.state.isWaitingForCommand = false;
    }
  },

  /**
   * Modalità push-to-talk per mobile
   */
  startPushToTalkMode: function() {
    if (!this.state.isInitialized) {
      if (!this.init()) return;
    }

    this.state.isListening = true;
    this.state.isWaitingForCommand = true; // Vai direttamente in modalità comando
    this.showCommandUI();
    
    try {
      this.state.recognition.start();
      this.speak('Parla ora.');
      console.log('Modalità push-to-talk attivata');
      
      // Auto-stop dopo timeout
      setTimeout(() => {
        if (this.state.isListening) {
          this.stopListening();
          this.speak('Tempo scaduto.');
        }
      }, this.config.listenTimeout);
      
    } catch (error) {
      console.error('Errore avvio push-to-talk:', error);
      this.state.isListening = false;
    }
  },
  
  /**
   * Entra in modalità form
   */
  enterFormMode: function() {
    console.log('Entrando in modalità form...');
    this.state.isInFormMode = true;
    this.state.isWaitingForCommand = true;
    // In modalità form non torniamo automaticamente alla wake word
  },
  
  /**
   * Esce dalla modalità form
   */
  exitFormMode: function() {
    console.log('Uscendo dalla modalità form...');
    this.state.isInFormMode = false;
    this.state.isWaitingForCommand = false;
    // Torna in ascolto wake word
    if (this.state.isListening) {
      this.speak('Form chiuso. Torno in ascolto.');
    }
  }
};

// Export globale
window.AIVoiceManager = AIVoiceManager;

// Auto-inizializzazione con soluzione iPhone specifica
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎤 Inizializzando AI Voice Manager...');
  
  // Rileva se è iPhone
  const isIPhone = /iPhone/.test(navigator.userAgent);
  
  if (isIPhone) {
    console.log('📱 iPhone rilevato - Attivando soluzione specifica...');
    AIVoiceManager.initForIPhone();
  } else {
    AIVoiceManager.init();
  }
  
  // Controlli multipli per tutti i dispositivi
  [1000, 2000, 3000, 5000].forEach(delay => {
    setTimeout(() => {
      if (!document.getElementById('aiVoiceToggle')) {
        console.log(`🚨 Retry ${delay}ms: Creando pulsante...`);
        if (isIPhone) {
          AIVoiceManager.createIPhoneButton();
        } else {
          AIVoiceManager.forceCreateButton();
        }
      }
    }, delay);
  });
});

console.log('✅ AI Voice Manager caricato');