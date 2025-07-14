/**
 * FLAVIO AI ASSISTANT
 * Sistema AI personalizzato per l'applicazione
 */

window.FlavioAIAssistant = (function() {
    'use strict';

    const flavioAI = {
        isInitialized: false,
        baseAssistant: null,
        chatHistory: [],
        currentContext: null,

        /**
         * Inizializzazione
         */
        init() {
            try {
                // Usa AIAssistant come base
                if (window.AIAssistant) {
                    this.baseAssistant = window.AIAssistant;
                    this.setupDefaultProvider();
                }

                this.isInitialized = true;
                console.log('✅ FlavioAIAssistant inizializzato');
                return true;

            } catch (error) {
                console.error('❌ Errore inizializzazione FlavioAIAssistant:', error);
                return false;
            }
        },

        /**
         * Setup provider di default
         */
        setupDefaultProvider() {
            if (this.baseAssistant) {
                // Prova prima Gemini se disponibile
                if (this.baseAssistant.setProvider('gemini')) {
                    console.log('✅ Gemini AI configurato come provider');
                } else {
                    console.warn('⚠️ Nessun provider AI disponibile');
                }
            }
        },

        /**
         * Invia messaggio
         */
        async sendMessage(message) {
            try {
                // Aggiungi alla cronologia
                this.chatHistory.push({
                    type: 'user',
                    message: message,
                    timestamp: new Date()
                });

                // Prepara contesto
                const context = this.buildContext();

                // Invia al provider AI
                let response;
                if (this.baseAssistant) {
                    response = await this.baseAssistant.sendMessage(message, context);
                } else {
                    response = this.getFallbackResponse(message);
                }

                // Aggiungi risposta alla cronologia
                this.chatHistory.push({
                    type: 'assistant',
                    message: response,
                    timestamp: new Date()
                });

                // Aggiorna UI se presente
                this.updateChatUI(message, response);

                return response;

            } catch (error) {
                console.error('❌ Errore invio messaggio FlavioAI:', error);
                const errorResponse = 'Mi dispiace, si è verificato un errore. Riprova più tardi.';
                this.updateChatUI(message, errorResponse);
                return errorResponse;
            }
        },

        /**
         * Costruisce contesto per l'AI
         */
        buildContext() {
            const context = {
                app: 'Smart Commercial Assistant',
                version: '2.1.3',
                timestamp: new Date().toISOString(),
                chatHistory: this.chatHistory.slice(-5), // Ultimi 5 messaggi
                currentTab: window.App ? window.App.state.currentTab : null
            };

            // Aggiungi dati applicazione se disponibili
            if (this.currentContext) {
                context.applicationData = this.currentContext;
            }

            return context;
        },

        /**
         * Imposta contesto applicazione
         */
        setContext(contextData) {
            this.currentContext = contextData;
        },

        /**
         * Risposta fallback senza AI
         */
        getFallbackResponse(message) {
            const lowerMessage = message.toLowerCase();

            if (lowerMessage.includes('ciao') || lowerMessage.includes('salve')) {
                return 'Ciao! Come posso aiutarti con la gestione commerciale?';
            }

            if (lowerMessage.includes('aiuto') || lowerMessage.includes('help')) {
                return 'Posso aiutarti con ordini, clienti, percorsi e documenti DDT/FT. Cosa ti serve?';
            }

            if (lowerMessage.includes('ordini')) {
                return 'Per gli ordini puoi utilizzare la sezione Ordini per visualizzare, creare e gestire gli ordini.';
            }

            if (lowerMessage.includes('clienti')) {
                return 'Nella sezione Clienti puoi gestire tutti i tuoi clienti e le loro informazioni.';
            }

            return 'Non ho capito bene la tua richiesta. Puoi essere più specifico?';
        },

        /**
         * Aggiorna UI chat
         */
        updateChatUI(userMessage, response) {
            // Cerca container chat
            const chatContainer = document.getElementById('aiChatMessages') || 
                                document.querySelector('.ai-chat-messages') ||
                                document.querySelector('#ai-chat-messages');

            if (!chatContainer) return;

            // Aggiungi messaggio utente
            const userDiv = document.createElement('div');
            userDiv.className = 'chat-message user-message';
            userDiv.innerHTML = `<strong>Tu:</strong> ${userMessage}`;
            chatContainer.appendChild(userDiv);

            // Aggiungi risposta AI
            const aiDiv = document.createElement('div');
            aiDiv.className = 'chat-message ai-message';
            aiDiv.innerHTML = `<strong>AI:</strong> ${response}`;
            chatContainer.appendChild(aiDiv);

            // Scroll in fondo
            chatContainer.scrollTop = chatContainer.scrollHeight;
        },

        /**
         * Pulisci cronologia chat
         */
        clearHistory() {
            this.chatHistory = [];
            
            // Pulisci UI
            const chatContainer = document.getElementById('aiChatMessages') || 
                                document.querySelector('.ai-chat-messages');
            if (chatContainer) {
                chatContainer.innerHTML = '';
            }

            console.log('🧹 Cronologia chat pulita');
        },

        /**
         * Processa input vocale
         */
        processVoiceInput(transcript) {
            console.log('🗣️ Input vocale ricevuto:', transcript);
            return this.sendMessage(transcript);
        },

        /**
         * Ottieni stato
         */
        getStatus() {
            return {
                initialized: this.isInitialized,
                hasBaseAssistant: !!this.baseAssistant,
                chatHistoryLength: this.chatHistory.length,
                hasContext: !!this.currentContext
            };
        },

    };

    // Auto-inizializzazione
    flavioAI.init();

    return flavioAI;
})();

console.log('✅ FlavioAIAssistant caricato');