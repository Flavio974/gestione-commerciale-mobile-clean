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

        /**
         * Render interfaccia AI veloce e funzionante
         */
        renderInterface() {
            const container = document.getElementById('ai-content');
            if (!container) return;

            container.innerHTML = `
                <div style="padding: 20px; max-width: 900px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #457b9d;">🤖 AI Assistant</h2>
                        <p style="color: #6c757d;">Sistema AI rapido con Netlify Functions</p>
                    </div>

                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                            <label><strong>Modello:</strong></label>
                            <select id="ai-model" style="padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
                                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Veloce)</option>
                                <option value="gpt-4o-mini">GPT-4o Mini (Economico)</option>
                                <option value="gpt-4o">GPT-4o (Potente)</option>
                            </select>
                            <button onclick="this.testConnection()" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Test API</button>
                        </div>
                    </div>

                    <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; height: 450px; display: flex; flex-direction: column;">
                        <div id="ai-messages" style="flex: 1; overflow-y: auto; padding: 20px; background: #f8f9fa;">
                            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                                <div style="display: flex; gap: 10px; align-items: flex-start;">
                                    <div style="width: 30px; height: 30px; background: #28a745; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">AI</div>
                                    <div>Ciao! Sono pronto ad aiutarti. Chiedimi qualsiasi cosa sui tuoi dati commerciali!</div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="padding: 15px; background: white; border-top: 1px solid #dee2e6;">
                            <div style="display: flex; gap: 10px;">
                                <input type="text" id="ai-input" placeholder="Scrivi qui la tua domanda..." style="flex: 1; padding: 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 14px;">
                                <button onclick="window.FlavioAIAssistant.sendMessage()" style="padding: 12px 20px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Invia</button>
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 15px;">
                        <button onclick="window.FlavioAIAssistant.quickQuery('Quanti clienti ho?')" style="padding: 10px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">👥 Clienti</button>
                        <button onclick="window.FlavioAIAssistant.quickQuery('Fatturato totale?')" style="padding: 10px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">💰 Fatturato</button>
                        <button onclick="window.FlavioAIAssistant.quickQuery('Ordini in sospeso?')" style="padding: 10px; background: #ffc107; color: #212529; border: none; border-radius: 4px; cursor: pointer;">📋 Ordini</button>
                        <button onclick="window.FlavioAIAssistant.quickQuery('Statistiche vendite?')" style="padding: 10px; background: #6f42c1; color: white; border: none; border-radius: 4px; cursor: pointer;">📊 Stats</button>
                    </div>
                </div>
            `;

            // Setup event listener per input
            const input = document.getElementById('ai-input');
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.sendMessage();
                });
            }

            console.log('✅ Interfaccia AI leggera renderizzata');
        },

        /**
         * Invia messaggio con API corretta
         */
        async sendMessage() {
            const input = document.getElementById('ai-input');
            const message = input.value.trim();
            if (!message) return;

            input.value = '';
            this.addMessage(message, 'user');
            this.addMessage('🤔 Sto elaborando...', 'assistant', true);

            try {
                const modelSelect = document.getElementById('ai-model');
                const model = modelSelect ? modelSelect.value : 'claude-3-5-sonnet-20241022';
                
                const response = await fetch('/.netlify/functions/claude-ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: message,
                        model: model,
                        isVoiceInput: false,
                        supabaseData: { timestamp: new Date().toISOString() }
                    })
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const result = await response.json();
                
                // Rimuovi messaggio di caricamento
                const messages = document.getElementById('ai-messages');
                if (messages && messages.lastElementChild) {
                    messages.removeChild(messages.lastElementChild);
                }
                
                this.addMessage(result.response || 'Nessuna risposta ricevuta.', 'assistant');
                
            } catch (error) {
                console.error('❌ Errore AI:', error);
                const messages = document.getElementById('ai-messages');
                if (messages && messages.lastElementChild) {
                    messages.removeChild(messages.lastElementChild);
                }
                this.addMessage('⚠️ Errore di connessione. API non raggiungibile.', 'assistant');
            }
        },

        /**
         * Query rapida
         */
        quickQuery(query) {
            const input = document.getElementById('ai-input');
            if (input) {
                input.value = query;
                this.sendMessage();
            }
        },

        /**
         * Aggiungi messaggio alla chat
         */
        addMessage(content, sender, isLoading = false) {
            const messages = document.getElementById('ai-messages');
            if (!messages) return;

            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = 'background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px;';
            
            const isUser = sender === 'user';
            messageDiv.innerHTML = `
                <div style="display: flex; gap: 10px; align-items: flex-start; ${isUser ? 'flex-direction: row-reverse;' : ''}">
                    <div style="width: 30px; height: 30px; background: ${isUser ? '#007bff' : '#28a745'}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">${isUser ? 'TU' : 'AI'}</div>
                    <div style="flex: 1; ${isUser ? 'text-align: right;' : ''}">${content}</div>
                </div>
            `;

            messages.appendChild(messageDiv);
            messages.scrollTop = messages.scrollHeight;
        },

        /**
         * Test connessione API
         */
        testConnection() {
            this.addMessage('Test connessione API...', 'assistant');
            this.quickQuery('Ciao, funzioni?');
        }

    };

    // Auto-inizializzazione
    flavioAI.init();

    return flavioAI;
})();

console.log('✅ FlavioAIAssistant caricato');