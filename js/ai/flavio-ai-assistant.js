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
         * Render interfaccia AI nel tab
         */
        renderInterface() {
            const container = document.getElementById('ai-content');
            if (!container) {
                console.warn('⚠️ Container ai-content non trovato');
                return;
            }

            container.innerHTML = `
                <div class="ai-assistant-container" style="padding: 20px; max-width: 800px; margin: 0 auto;">
                    <div class="ai-header" style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #457b9d; margin-bottom: 10px;">🤖 AI Assistant</h2>
                        <p style="color: #6c757d;">Assistente AI integrato con i tuoi dati commerciali</p>
                    </div>

                    <div class="ai-status" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4>📊 Stato Sistema</h4>
                        <div id="ai-status-details">
                            <p>🔄 Caricamento stato...</p>
                        </div>
                        
                        <div class="ai-config" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                            <h5>⚙️ Configurazione</h5>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <label for="ai-model-select" style="font-weight: bold;">Modello AI:</label>
                                <select id="ai-model-select" style="padding: 5px 10px; border: 1px solid #ced4da; border-radius: 4px;">
                                    <option value="claude-3-sonnet">Claude 3 Sonnet (Consigliato)</option>
                                    <option value="claude-3-haiku">Claude 3 Haiku (Veloce)</option>
                                    <option value="gpt-4">GPT-4 (OpenAI)</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Veloce)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="ai-chat-container" style="background: white; border: 1px solid #dee2e6; border-radius: 8px; height: 400px; display: flex; flex-direction: column;">
                        <div class="ai-messages" id="ai-messages" style="flex: 1; overflow-y: auto; padding: 20px; background: #f8f9fa;">
                            <div class="ai-message assistant" style="margin-bottom: 15px;">
                                <div style="display: flex; gap: 10px;">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; background: #28a745; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold;">AI</div>
                                    <div style="max-width: 70%; padding: 10px 15px; border-radius: 12px; background: white; border: 1px solid #e9ecef;">
                                        Ciao! Sono il tuo assistente AI. Posso aiutarti con analisi dei dati, statistiche vendite, gestione clienti e molto altro. Come posso aiutarti oggi?
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="ai-input-container" style="padding: 20px; background: white; border-top: 1px solid #dee2e6; display: flex; gap: 10px;">
                            <input type="text" id="ai-input" placeholder="Scrivi la tua domanda..." style="flex: 1; padding: 10px 15px; border: 1px solid #ced4da; border-radius: 20px; font-size: 14px; outline: none;">
                            <button id="ai-send-btn" style="padding: 10px 20px; background: #457b9d; color: white; border: none; border-radius: 20px; cursor: pointer; font-weight: 600;">Invia</button>
                        </div>
                    </div>

                    <div class="ai-capabilities" style="background: #e9ecef; padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <h4 style="margin-bottom: 10px; color: #495057;">🎯 Funzionalità Disponibili</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                            <div style="padding: 10px; background: white; border-radius: 4px;">📊 Analisi vendite</div>
                            <div style="padding: 10px; background: white; border-radius: 4px;">👥 Gestione clienti</div>
                            <div style="padding: 10px; background: white; border-radius: 4px;">📈 Statistiche</div>
                            <div style="padding: 10px; background: white; border-radius: 4px;">🗺️ Ottimizzazione percorsi</div>
                            <div style="padding: 10px; background: white; border-radius: 4px;">📋 Gestione ordini</div>
                            <div style="padding: 10px; background: white; border-radius: 4px;">🎤 Comandi vocali</div>
                        </div>
                    </div>
                </div>
            `;

            // Aggiorna stato
            this.updateStatusDisplay();

            // Setup event listeners
            this.setupEventListeners();

            console.log('✅ Interfaccia AI Assistant renderizzata');
        },

        /**
         * Aggiorna display dello stato
         */
        updateStatusDisplay() {
            const statusElement = document.getElementById('ai-status-details');
            if (!statusElement) return;

            const status = this.getStatus();
            statusElement.innerHTML = `
                <p><strong>Inizializzato:</strong> ${status.initialized ? '✅ Sì' : '❌ No'}</p>
                <p><strong>Sistema Base:</strong> ${status.hasBaseAssistant ? '✅ Attivo' : '❌ Non disponibile'}</p>
                <p><strong>Cronologia Chat:</strong> ${status.chatHistoryLength} messaggi</p>
                <p><strong>Contesto:</strong> ${status.hasContext ? '✅ Caricato' : '⚪ Nessuno'}</p>
            `;
        },

        /**
         * Setup event listeners per l'interfaccia
         */
        setupEventListeners() {
            const input = document.getElementById('ai-input');
            const sendBtn = document.getElementById('ai-send-btn');

            if (input && sendBtn) {
                const handleSend = () => {
                    const message = input.value.trim();
                    if (message) {
                        this.addMessageToChat(message, 'user');
                        input.value = '';
                        this.processMessage(message);
                    }
                };

                sendBtn.addEventListener('click', handleSend);
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') handleSend();
                });

                console.log('✅ Event listeners AI configurati');
            }
        },

        /**
         * Aggiungi messaggio alla chat
         */
        addMessageToChat(message, sender) {
            const messagesContainer = document.getElementById('ai-messages');
            if (!messagesContainer) return;

            const messageElement = document.createElement('div');
            messageElement.className = `ai-message ${sender}`;
            
            const isUser = sender === 'user';
            messageElement.innerHTML = `
                <div style="display: flex; gap: 10px; ${isUser ? 'justify-content: flex-end;' : ''}">
                    ${!isUser ? '<div style="width: 32px; height: 32px; border-radius: 50%; background: #28a745; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold;">AI</div>' : ''}
                    <div style="max-width: 70%; padding: 10px 15px; border-radius: 12px; ${isUser ? 'background: #457b9d; color: white;' : 'background: white; border: 1px solid #e9ecef;'}">
                        ${message}
                    </div>
                    ${isUser ? '<div style="width: 32px; height: 32px; border-radius: 50%; background: #6c757d; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold;">TU</div>' : ''}
                </div>
            `;

            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        },

        /**
         * Processa messaggio dell'utente
         */
        async processMessage(message) {
            // Aggiungi alla cronologia
            this.chatHistory.push({ sender: 'user', message, timestamp: new Date() });

            // Mostra indicatore di caricamento
            this.addMessageToChat('🤔 Sto pensando...', 'assistant');
            
            try {
                // Chiama l'AI reale
                const response = await this.generateResponse(message);
                
                // Rimuovi l'indicatore di caricamento
                const messages = document.getElementById('ai-messages');
                if (messages && messages.lastElementChild) {
                    messages.removeChild(messages.lastElementChild);
                }
                
                // Aggiungi la risposta reale
                this.addMessageToChat(response, 'assistant');
                this.chatHistory.push({ sender: 'assistant', message: response, timestamp: new Date() });
                
            } catch (error) {
                console.error('❌ Errore processamento messaggio:', error);
                
                // Rimuovi l'indicatore di caricamento
                const messages = document.getElementById('ai-messages');
                if (messages && messages.lastElementChild) {
                    messages.removeChild(messages.lastElementChild);
                }
                
                // Mostra errore
                this.addMessageToChat('Mi dispiace, si è verificato un errore. Riprova tra poco.', 'assistant');
            }
        },

        /**
         * Genera risposta usando API AI reali
         */
        async generateResponse(message) {
            try {
                // Determina l'endpoint API corretto
                const isNetlify = window.location.hostname.includes('netlify');
                const apiUrl = isNetlify ? '/.netlify/functions/claude-ai' : '/api/claude-ai.php';
                
                console.log('🤖 Invio richiesta a:', apiUrl);
                
                // Ottieni modello selezionato
                const modelSelect = document.getElementById('ai-model-select');
                const selectedModel = modelSelect ? modelSelect.value : 'claude-3-sonnet';
                
                // Costruisci il payload per l'AI
                const payload = {
                    message: message,
                    model: selectedModel,
                    isVoiceInput: false,
                    supabaseData: this.getBusinessContext(),
                    history: this.chatHistory.slice(-5) // Ultimi 5 messaggi per contesto
                };
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status}`);
                }
                
                const result = await response.json();
                console.log('✅ Risposta AI ricevuta:', result);
                
                return result.response || 'Mi dispiace, non sono riuscito a elaborare una risposta.';
                
            } catch (error) {
                console.error('❌ Errore API AI:', error);
                return 'Mi dispiace, si è verificato un errore nel contattare il servizio AI. Riprova tra poco.';
            }
        },

        /**
         * Ottieni contesto business per l'AI
         */
        getBusinessContext() {
            const context = {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                source: 'ai-assistant-tab'
            };

            // Aggiungi dati Supabase se disponibili
            if (window.supabaseClient) {
                context.hasSupabaseConnection = true;
            }

            // Aggiungi informazioni tab attivo
            const activeTab = document.querySelector('.tab-link.active');
            if (activeTab) {
                context.activeTab = activeTab.textContent;
            }

            return context;
        }
    };

    // Auto-inizializzazione
    flavioAI.init();

    return flavioAI;
})();

console.log('✅ FlavioAIAssistant caricato');