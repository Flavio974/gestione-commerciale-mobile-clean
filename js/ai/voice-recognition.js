/**
 * RICONOSCIMENTO VOCALE AI
 * Sistema avanzato di riconoscimento vocale con integrazione AI
 */

window.VoiceRecognition = (function() {
    'use strict';

    const recognition = {
        engine: null,
        isActive: false,
        isSupported: false,
        currentSession: null,

        /**
         * Inizializzazione
         */
        init() {
            try {
                // Verifica supporto
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                
                if (!SpeechRecognition) {
                    console.warn('⚠️ SpeechRecognition non supportato');
                    return false;
                }

                this.engine = new SpeechRecognition();
                this.configureEngine();
                this.setupEventHandlers();
                
                this.isSupported = true;
                console.log('✅ VoiceRecognition inizializzato');
                return true;

            } catch (error) {
                console.error('❌ Errore inizializzazione VoiceRecognition:', error);
                return false;
            }
        },

        /**
         * Configura il motore di riconoscimento
         */
        configureEngine() {
            if (!this.engine) return;

            this.engine.lang = 'it-IT';
            this.engine.continuous = true;
            this.engine.interimResults = true;
            this.engine.maxAlternatives = 3;
        },

        /**
         * Setup event handlers
         */
        setupEventHandlers() {
            if (!this.engine) return;

            this.engine.onstart = () => {
                this.isActive = true;
                this.onStart();
            };

            this.engine.onend = () => {
                this.isActive = false;
                this.onEnd();
            };

            this.engine.onresult = (event) => {
                this.processResults(event);
            };

            this.engine.onerror = (event) => {
                this.onError(event);
            };

            this.engine.onnomatch = () => {
                console.log('🤷 Nessuna corrispondenza trovata');
            };
        },

        /**
         * Avvia riconoscimento
         */
        start() {
            if (!this.isSupported) {
                console.warn('⚠️ Riconoscimento vocale non supportato');
                return false;
            }

            if (this.isActive) {
                console.log('🎤 Già attivo');
                return true;
            }

            try {
                this.currentSession = {
                    startTime: Date.now(),
                    interim: '',
                    final: []
                };

                this.engine.start();
                return true;

            } catch (error) {
                console.error('❌ Errore avvio riconoscimento:', error);
                return false;
            }
        },

        /**
         * Ferma riconoscimento
         */
        stop() {
            if (this.engine && this.isActive) {
                this.engine.stop();
            }
        },

        /**
         * Processa i risultati del riconoscimento
         */
        processResults(event) {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;

                if (result.isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Aggiorna sessione corrente
            if (this.currentSession) {
                this.currentSession.interim = interimTranscript;
                if (finalTranscript) {
                    this.currentSession.final.push(finalTranscript);
                }
            }

            // Notifica risultati
            this.onInterimResult(interimTranscript);
            if (finalTranscript) {
                this.onFinalResult(finalTranscript);
            }
        },

        /**
         * Handler per inizio sessione
         */
        onStart() {
            console.log('🎤 Riconoscimento vocale avviato');
            this.dispatchEvent('voicerecognition:start');
        },

        /**
         * Handler per fine sessione
         */
        onEnd() {
            console.log('🎤 Riconoscimento vocale terminato');
            
            if (this.currentSession) {
                const session = this.currentSession;
                this.currentSession = null;
                this.dispatchEvent('voicerecognition:end', { session });
            }
        },

        /**
         * Handler per risultati intermedi
         */
        onInterimResult(transcript) {
            this.dispatchEvent('voicerecognition:interim', { transcript });
        },

        /**
         * Handler per risultati finali
         */
        onFinalResult(transcript) {
            console.log('🗣️ Testo riconosciuto:', transcript);
            this.dispatchEvent('voicerecognition:final', { transcript });

            // Invia all'AI se disponibile
            if (window.FlavioAIAssistant && window.FlavioAIAssistant.processVoiceInput) {
                window.FlavioAIAssistant.processVoiceInput(transcript);
            }
        },

        /**
         * Handler per errori
         */
        onError(event) {
            console.error('❌ Errore riconoscimento vocale:', event.error);
            this.dispatchEvent('voicerecognition:error', { error: event.error });
        },

        /**
         * Dispatch custom events
         */
        dispatchEvent(eventName, detail = {}) {
            window.dispatchEvent(new CustomEvent(eventName, { detail }));
        },

        /**
         * Toggle riconoscimento
         */
        toggle() {
            if (this.isActive) {
                this.stop();
            } else {
                this.start();
            }
        },

        /**
         * Verifica se è attivo
         */
        isListening() {
            return this.isActive;
        }
    };

    // Auto-inizializzazione
    recognition.init();

    return recognition;
})();

console.log('✅ VoiceRecognition caricato');