/**
 * AI Voice Manager V2 - Sistema vocale ottimizzato per iPad
 * Gestisce input vocale, output TTS e modalità automobile
 */

class AIVoiceManagerV2 {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isAutoMode = false;
        this.wakePhrases = ['assistente', 'hey assistente', 'ok assistente', 'ehi assistente'];
        this.useWakeWord = true;
        this.transcriptionBuffer = [];
        this.lastSpeechTime = Date.now();
        this.ttsActivated = false; // Flag per tracciare attivazione TTS
        
        // Configurazione TTS
        this.ttsConfig = {
            rate: 1.0,  // Velocità normale di default
            pitch: 1.0,
            volume: 1.0,
            voice: null
        };
        
        // Elementi UI
        this.elements = {
            micButton: null,
            autoModeOnBtn: null,
            autoModeOffBtn: null,
            statusIndicator: null,
            transcriptionDisplay: null,
            volumeControl: null,
            speedControl: null
        };
        
        this.init();
    }

    async init() {
        // Verifica supporto browser
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('Speech recognition non supportato');
            this.showNotification('Il riconoscimento vocale non è supportato su questo browser', 'error');
            return;
        }

        // Inizializza riconoscimento vocale
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'it-IT';
        this.recognition.continuous = false; // Verrà impostato in base alla modalità
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        // Setup eventi riconoscimento
        this.setupRecognitionEvents();
        
        // Setup voce TTS italiana
        this.setupTTSVoice();
        
        // Crea interfaccia utente
        this.createUI();
        
        // Gestisci eventi UI
        this.setupUIEvents();
    }

    setupRecognitionEvents() {
        this.recognition.onstart = () => {
            console.log('Riconoscimento vocale avviato');
            this.updateUIState('listening');
        };

        this.recognition.onresult = (event) => {
            const current = event.resultIndex;
            const transcript = event.results[current][0].transcript;
            const isFinal = event.results[current].isFinal;

            if (isFinal) {
                this.processTranscript(transcript);
            } else {
                // Mostra trascrizione in tempo reale
                if (this.elements.transcriptionDisplay) {
                    this.elements.transcriptionDisplay.textContent = transcript;
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Errore riconoscimento:', event.error);
            if (event.error !== 'no-speech') {
                this.showNotification(`Errore: ${event.error}`, 'error');
            }
            
            // In modalità auto, riavvia automaticamente
            if (this.isAutoMode && event.error !== 'not-allowed') {
                setTimeout(() => this.startListening(), 1000);
            }
        };

        this.recognition.onend = () => {
            console.log('Riconoscimento terminato');
            this.isListening = false;
            
            // In modalità auto, riavvia automaticamente
            if (this.isAutoMode) {
                setTimeout(() => this.startListening(), 500);
            } else {
                this.updateUIState('idle');
            }
        };
    }

    setupTTSVoice() {
        // Attendi che le voci siano caricate
        if (this.synthesis.getVoices().length === 0) {
            this.synthesis.addEventListener('voiceschanged', () => this.selectBestVoice());
        } else {
            this.selectBestVoice();
        }
    }

    selectBestVoice() {
        const voices = this.synthesis.getVoices();
        console.log('🎤 Voci disponibili:', voices.map(v => `${v.name} (${v.lang})`));
        
        // Priorità specifiche per dispositivo
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        let priorities;
        if (isIOS) {
            // Priorità per iPad/iPhone
            priorities = [
                { lang: 'it-IT', name: 'Alice' },
                { lang: 'it-IT', name: 'Federica' },
                { lang: 'it-IT', name: 'Luca' },
                { lang: 'it-IT', name: '' } // Qualsiasi voce italiana
            ];
        } else {
            // Priorità per desktop
            priorities = [
                { lang: 'it-IT', name: 'Google italiano' },
                { lang: 'it-IT', name: 'Microsoft Elsa' },
                { lang: 'it-IT', name: 'Alice' },
                { lang: 'it-IT', name: '' } // Qualsiasi voce italiana
            ];
        }

        for (const priority of priorities) {
            const voice = voices.find(v => 
                v.lang.startsWith(priority.lang) && 
                (priority.name === '' || v.name.includes(priority.name))
            );
            
            if (voice) {
                this.ttsConfig.voice = voice;
                console.log('✅ Voce TTS selezionata:', voice.name, 'per', isIOS ? 'iOS' : 'Desktop');
                return;
            }
        }
        
        // Fallback: prima voce italiana disponibile
        const italianVoice = voices.find(v => v.lang.startsWith('it'));
        if (italianVoice) {
            this.ttsConfig.voice = italianVoice;
            console.log('⚠️ Fallback voce italiana:', italianVoice.name);
        } else {
            console.log('❌ Nessuna voce italiana trovata');
        }
    }

    createUI() {
        // Container principale
        const container = document.createElement('div');
        container.id = 'voice-controls-v2';
        container.className = 'voice-controls-container';
        
        // Pulsante microfono principale
        const micButton = document.createElement('button');
        micButton.id = 'mic-button-v2';
        micButton.className = 'voice-button mic-button';
        micButton.innerHTML = `
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
        `;
        
        // Container controlli modalità auto
        const autoModeContainer = document.createElement('div');
        autoModeContainer.className = 'auto-mode-controls';
        
        // Pulsante ON modalità auto
        const autoOnBtn = document.createElement('button');
        autoOnBtn.id = 'auto-mode-on';
        autoOnBtn.className = 'voice-button auto-button on-button';
        autoOnBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>AUTO ON</span>
        `;
        
        // Pulsante OFF modalità auto
        const autoOffBtn = document.createElement('button');
        autoOffBtn.id = 'auto-mode-off';
        autoOffBtn.className = 'voice-button auto-button off-button';
        autoOffBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
            <span>AUTO OFF</span>
        `;
        
        // Indicatore stato
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'voice-status-indicator';
        statusIndicator.className = 'status-indicator';
        statusIndicator.innerHTML = '<span class="status-text">Pronto</span>';
        
        // Display trascrizione
        const transcriptionDisplay = document.createElement('div');
        transcriptionDisplay.id = 'voice-transcription';
        transcriptionDisplay.className = 'transcription-display';
        
        // Controlli volume e velocità
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'voice-advanced-controls';
        controlsContainer.innerHTML = `
            <div class="control-group">
                <label for="tts-volume">Volume:</label>
                <input type="range" id="tts-volume" min="0" max="1" step="0.1" value="1">
            </div>
            <div class="control-group">
                <label for="tts-speed">Velocità:</label>
                <input type="range" id="tts-speed" min="0.5" max="2" step="0.1" value="1">
            </div>
            <div class="control-group">
                <label for="wake-word-toggle">
                    <input type="checkbox" id="wake-word-toggle" checked>
                    Usa wake word in auto
                </label>
            </div>
            <div class="control-group">
                <button id="test-tts-btn" style="padding: 8px 16px; background: #007AFF; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    🔊 Test Audio
                </button>
            </div>
        `;
        
        // Assembla UI
        autoModeContainer.appendChild(autoOnBtn);
        autoModeContainer.appendChild(autoOffBtn);
        
        container.appendChild(micButton);
        container.appendChild(autoModeContainer);
        container.appendChild(statusIndicator);
        container.appendChild(transcriptionDisplay);
        container.appendChild(controlsContainer);
        
        // Aggiungi al DOM
        document.body.appendChild(container);
        
        // Salva riferimenti elementi
        this.elements = {
            micButton: micButton,
            autoModeOnBtn: autoOnBtn,
            autoModeOffBtn: autoOffBtn,
            statusIndicator: statusIndicator,
            transcriptionDisplay: transcriptionDisplay,
            volumeControl: document.getElementById('tts-volume'),
            speedControl: document.getElementById('tts-speed'),
            wakeWordToggle: document.getElementById('wake-word-toggle')
        };
        
        // Aggiorna stato iniziale UI
        this.updateAutoModeUI();
    }

    setupUIEvents() {
        // Pulsante microfono
        this.elements.micButton.addEventListener('click', () => {
            this.activateTTS(); // Attiva TTS su interazione utente
            if (!this.isAutoMode) {
                this.toggleListening();
            }
        });
        
        // Pulsanti modalità auto
        this.elements.autoModeOnBtn.addEventListener('click', () => {
            this.activateTTS(); // Attiva TTS su interazione utente
            this.enableAutoMode();
        });
        
        this.elements.autoModeOffBtn.addEventListener('click', () => {
            this.disableAutoMode();
        });
        
        // Controlli volume e velocità
        this.elements.volumeControl.addEventListener('input', (e) => {
            this.ttsConfig.volume = parseFloat(e.target.value);
        });
        
        this.elements.speedControl.addEventListener('input', (e) => {
            this.ttsConfig.rate = parseFloat(e.target.value);
        });
        
        // Toggle wake word
        this.elements.wakeWordToggle.addEventListener('change', (e) => {
            this.useWakeWord = e.target.checked;
        });
        
        // Pulsante test TTS
        const testTtsBtn = document.getElementById('test-tts-btn');
        if (testTtsBtn) {
            testTtsBtn.addEventListener('click', () => {
                console.log('🧪 Test TTS richiesto');
                this.activateTTS(); // Attiva TTS prima del test
                this.speak('Test audio funzionante. Questo è un test della sintesi vocale su iPad.');
            });
        }
    }

    // Attiva TTS con interazione utente (richiesto da iOS)
    activateTTS() {
        if (!this.ttsActivated) {
            console.log('🎵 Attivazione TTS per iOS...');
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            
            if (isIOS) {
                // Crea un utterance silenzioso per attivare TTS
                const utterance = new SpeechSynthesisUtterance('');
                utterance.volume = 0;
                this.synthesis.speak(utterance);
                
                this.ttsActivated = true;
                console.log('✅ TTS attivato per iOS');
                this.showNotification('🔊 Audio attivato', 'success');
            } else {
                this.ttsActivated = true;
            }
        }
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        if (this.isListening) return;
        
        try {
            this.isListening = true;
            this.recognition.continuous = this.isAutoMode;
            this.recognition.start();
        } catch (error) {
            console.error('Errore avvio riconoscimento:', error);
            this.isListening = false;
            this.showNotification('Errore avvio riconoscimento vocale', 'error');
        }
    }

    stopListening() {
        if (!this.isListening) return;
        
        try {
            this.isListening = false;
            this.recognition.stop();
        } catch (error) {
            console.error('Errore stop riconoscimento:', error);
        }
    }

    enableAutoMode() {
        this.isAutoMode = true;
        this.showNotification('Modalità AUTO attivata - Ascolto continuo', 'success');
        this.updateAutoModeUI();
        this.startListening();
    }

    disableAutoMode() {
        this.isAutoMode = false;
        this.showNotification('Modalità AUTO disattivata', 'info');
        this.updateAutoModeUI();
        this.stopListening();
    }

    updateAutoModeUI() {
        if (this.isAutoMode) {
            this.elements.autoModeOnBtn.classList.add('active');
            this.elements.autoModeOffBtn.classList.remove('active');
            this.elements.micButton.classList.add('disabled');
            this.elements.statusIndicator.classList.add('auto-mode');
            this.elements.statusIndicator.querySelector('.status-text').textContent = 'ASCOLTO ATTIVO';
        } else {
            this.elements.autoModeOnBtn.classList.remove('active');
            this.elements.autoModeOffBtn.classList.add('active');
            this.elements.micButton.classList.remove('disabled');
            this.elements.statusIndicator.classList.remove('auto-mode');
            this.elements.statusIndicator.querySelector('.status-text').textContent = 'Pronto';
        }
    }

    updateUIState(state) {
        const statusText = this.elements.statusIndicator.querySelector('.status-text');
        
        switch(state) {
            case 'listening':
                this.elements.micButton.classList.add('listening');
                if (!this.isAutoMode) {
                    statusText.textContent = 'In ascolto...';
                }
                this.elements.statusIndicator.classList.add('active');
                break;
            case 'processing':
                statusText.textContent = 'Elaborazione...';
                break;
            case 'speaking':
                statusText.textContent = 'Risposta vocale...';
                break;
            case 'idle':
            default:
                this.elements.micButton.classList.remove('listening');
                if (!this.isAutoMode) {
                    statusText.textContent = 'Pronto';
                    this.elements.statusIndicator.classList.remove('active');
                }
                break;
        }
    }

    async processTranscript(transcript) {
        console.log('Trascrizione:', transcript);
        
        // Mostra trascrizione
        if (this.elements.transcriptionDisplay) {
            this.elements.transcriptionDisplay.textContent = transcript;
        }
        
        // In modalità auto con wake word, verifica se contiene wake word
        if (this.isAutoMode && this.useWakeWord) {
            const containsWakeWord = this.wakePhrases.some(phrase => 
                transcript.toLowerCase().includes(phrase)
            );
            
            if (!containsWakeWord) {
                console.log('Nessuna wake word rilevata, ignoro');
                return;
            }
            
            // Rimuovi wake word dal testo
            let cleanTranscript = transcript;
            this.wakePhrases.forEach(phrase => {
                cleanTranscript = cleanTranscript.replace(new RegExp(phrase, 'gi'), '').trim();
            });
            transcript = cleanTranscript;
        }
        
        // Invia all'assistente AI
        if (window.FlavioAIAssistant) {
            this.updateUIState('processing');
            
            try {
                const response = await window.FlavioAIAssistant.processCommand(transcript);
                
                // Mostra risposta in chat
                if (response) {
                    // Leggi risposta vocalmente
                    await this.speak(response);
                }
            } catch (error) {
                console.error('Errore elaborazione comando:', error);
                this.showNotification('Errore elaborazione comando', 'error');
            }
        }
    }

    async speak(text) {
        return new Promise((resolve) => {
            console.log('🔊 Avvio TTS per:', text);
            
            // Verifica attivazione TTS per iOS
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS && !this.ttsActivated) {
                console.log('⚠️ TTS non attivato su iOS - skip sintesi vocale');
                this.showNotification('Clicca il microfono per attivare l\'audio', 'warning');
                resolve();
                return;
            }
            
            // Cancella code precedenti
            this.synthesis.cancel();
            
            // Prepara utterance
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'it-IT';
            utterance.rate = this.ttsConfig.rate;
            utterance.pitch = this.ttsConfig.pitch;
            utterance.volume = this.ttsConfig.volume;
            
            if (this.ttsConfig.voice) {
                utterance.voice = this.ttsConfig.voice;
                console.log('🎤 Voce selezionata:', this.ttsConfig.voice.name);
            }
            
            // Fix specifico per iPad/iOS
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
                console.log('📱 Dispositivo iOS rilevato - Applicando fix TTS');
                // Su iOS, a volte bisogna aspettare che il synthesis sia pronto
                if (this.synthesis.speaking) {
                    this.synthesis.cancel();
                    // Piccola pausa per iOS
                    setTimeout(() => this.synthesis.speak(utterance), 100);
                } else {
                    this.synthesis.speak(utterance);
                }
            } else {
                this.synthesis.speak(utterance);
            }
            
            // Eventi
            utterance.onstart = () => {
                console.log('🔊 TTS avviato');
                this.updateUIState('speaking');
            };
            
            utterance.onend = () => {
                console.log('🔊 TTS terminato');
                this.updateUIState(this.isAutoMode ? 'listening' : 'idle');
                resolve();
            };
            
            utterance.onerror = (event) => {
                console.error('❌ Errore TTS:', event);
                this.updateUIState(this.isAutoMode ? 'listening' : 'idle');
                
                // Fallback per iOS: prova a riavviare dopo errore
                if (isIOS && event.error === 'network') {
                    console.log('🔄 Tentativo fallback TTS per iOS');
                    setTimeout(() => {
                        this.synthesis.cancel();
                        this.synthesis.speak(utterance);
                    }, 500);
                }
                
                resolve();
            };
            
            // Timeout di sicurezza per iOS
            setTimeout(() => {
                if (this.synthesis.speaking) {
                    console.log('⏰ Timeout TTS - force resolve');
                    resolve();
                }
            }, 15000); // 15 secondi max
        });
    }

    showNotification(message, type = 'info') {
        // Implementa notifiche visive
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Se esiste un sistema di notifiche nell'app, usalo
        if (window.showToast) {
            window.showToast(message, type);
        }
    }
}

// Inizializza al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
    window.AIVoiceManagerV2 = new AIVoiceManagerV2();
});

// Export per uso in altri moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIVoiceManagerV2;
}