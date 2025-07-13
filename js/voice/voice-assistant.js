/**
 * ASSISTENTE VOCALE
 * Gestisce il riconoscimento vocale e l'integrazione con l'AI
 */

window.VoiceAssistant = (function() {
    'use strict';

    const assistant = {
        recognition: null,
        isListening: false,
        isSupported: false,

        /**
         * Inizializzazione
         */
        init() {
            try {
                // Verifica supporto browser
                if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    console.warn('⚠️ Riconoscimento vocale non supportato');
                    return false;
                }

                // Crea l'oggetto recognition
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();

                // Configurazione
                this.recognition.lang = 'it-IT';
                this.recognition.continuous = false;
                this.recognition.interimResults = false;
                this.recognition.maxAlternatives = 1;

                // Event listeners
                this.setupEventListeners();

                this.isSupported = true;
                console.log('✅ VoiceAssistant inizializzato');
                return true;

            } catch (error) {
                console.error('❌ Errore inizializzazione VoiceAssistant:', error);
                return false;
            }
        },

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            if (!this.recognition) return;

            this.recognition.onstart = () => {
                this.isListening = true;
                console.log('🎤 Ascolto iniziato');
                this.updateUI('listening');
            };

            this.recognition.onend = () => {
                this.isListening = false;
                console.log('🎤 Ascolto terminato');
                this.updateUI('idle');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('🗣️ Riconosciuto:', transcript);
                this.processVoiceCommand(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('❌ Errore riconoscimento vocale:', event.error);
                this.updateUI('error');
            };
        },

        /**
         * Avvia l'ascolto
         */
        startListening() {
            if (!this.isSupported || !this.recognition) {
                console.warn('⚠️ Riconoscimento vocale non disponibile');
                return false;
            }

            if (this.isListening) {
                console.log('🎤 Già in ascolto');
                return true;
            }

            try {
                this.recognition.start();
                return true;
            } catch (error) {
                console.error('❌ Errore avvio ascolto:', error);
                return false;
            }
        },

        /**
         * Ferma l'ascolto
         */
        stopListening() {
            if (this.recognition && this.isListening) {
                this.recognition.stop();
            }
        },

        /**
         * Processa comando vocale
         */
        processVoiceCommand(transcript) {
            try {
                // Invia all'AI assistant se disponibile
                if (window.FlavioAIAssistant && window.FlavioAIAssistant.sendMessage) {
                    window.FlavioAIAssistant.sendMessage(transcript);
                    return;
                }

                // Fallback per comandi semplici
                this.handleSimpleCommands(transcript);

            } catch (error) {
                console.error('❌ Errore elaborazione comando vocale:', error);
            }
        },

        /**
         * Gestisce comandi semplici
         */
        handleSimpleCommands(transcript) {
            const command = transcript.toLowerCase();

            if (command.includes('timeline') || command.includes('cronologia')) {
                if (window.Navigation) {
                    window.Navigation.switchToTab('timeline');
                }
            } else if (command.includes('clienti') || command.includes('cliente')) {
                if (window.Navigation) {
                    window.Navigation.switchToTab('clients');
                }
            } else if (command.includes('ordini') || command.includes('ordine')) {
                if (window.Navigation) {
                    window.Navigation.switchToTab('orders');
                }
            } else {
                console.log('🤖 Comando non riconosciuto:', transcript);
            }
        },

        /**
         * Aggiorna interfaccia utente
         */
        updateUI(state) {
            const voiceButton = document.querySelector('.voice-button, #voice-button');
            if (!voiceButton) return;

            voiceButton.classList.remove('listening', 'error', 'idle');
            voiceButton.classList.add(state);

            switch (state) {
                case 'listening':
                    voiceButton.textContent = '🎤';
                    voiceButton.title = 'In ascolto...';
                    break;
                case 'error':
                    voiceButton.textContent = '❌';
                    voiceButton.title = 'Errore riconoscimento';
                    break;
                default:
                    voiceButton.textContent = '🎙️';
                    voiceButton.title = 'Clicca per parlare';
            }
        },

        /**
         * Toggle ascolto
         */
        toggle() {
            if (this.isListening) {
                this.stopListening();
            } else {
                this.startListening();
            }
        }
    };

    // Auto-inizializzazione
    assistant.init();

    return assistant;
})();

console.log('✅ VoiceAssistant caricato');