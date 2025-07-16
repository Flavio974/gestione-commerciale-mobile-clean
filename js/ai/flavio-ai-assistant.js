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

                // Inizializza sistema vocale
                this.initVoiceSystem();
                
                this.isInitialized = true;
                console.log('✅ FlavioAIAssistant inizializzato con sistema vocale');
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
        async sendMessage(message, isVoiceInput = false) {
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

                // Se è input vocale, pronuncia la risposta
                if (isVoiceInput) {
                    console.log('🔊 Input vocale rilevato, pronunciando risposta...');
                    this.speakResponse(response);
                }

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
         * Processa input vocale e fornisce risposta parlata
         */
        processVoiceInput(transcript) {
            console.log('🗣️ Input vocale ricevuto:', transcript);
            
            // Invia messaggio con flag vocale
            this.sendMessage(transcript, true);
        },

        /**
         * Sintesi vocale della risposta
         */
        speakResponse(text) {
            if (!text || typeof text !== 'string') return;
            
            try {
                // Pulisci il testo da markdown e HTML
                const cleanText = text
                    .replace(/[#*`_~]/g, '') // Rimuovi markdown
                    .replace(/<[^>]*>/g, '') // Rimuovi HTML
                    .replace(/\s+/g, ' ') // Normalizza spazi
                    .trim();
                
                if (!cleanText) return;
                
                console.log('🔊 Pronunciando risposta AI:', cleanText.substring(0, 50) + '...');
                
                // Controlla se è iPad e se IOSTTSManager è disponibile
                const isIPad = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                              (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document) ||
                              (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ||
                              // Supporto per Chrome DevTools Device Emulation
                              (navigator.maxTouchPoints > 0 && /Mobile/.test(navigator.userAgent)) ||
                              // Forza per test se localStorage contiene flag
                              localStorage.getItem('force_ipad_mode') === 'true';
                
                if (isIPad && window.iosTTSManager) {
                    console.log('🔊 Utilizzando iosTTSManager per iPad');
                    window.iosTTSManager.speak(cleanText);
                    return;
                }
                
                // Fallback standard per altri dispositivi
                // Ferma qualsiasi speech in corso
                speechSynthesis.cancel();
                
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = 'it-IT';
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                
                // Seleziona voce italiana se disponibile
                const voices = speechSynthesis.getVoices();
                const italianVoice = voices.find(voice => 
                    voice.lang.includes('it') && 
                    (voice.name.includes('Alice') || voice.name.includes('Federica') || voice.name.includes('Luca'))
                ) || voices.find(voice => voice.lang.includes('it'));
                
                if (italianVoice) {
                    utterance.voice = italianVoice;
                    console.log('🗣️ Utilizzando voce italiana:', italianVoice.name);
                }
                
                utterance.onstart = () => {
                    console.log('🔊 Sintesi vocale avviata');
                    if (window.showFloatingStatus) {
                        window.showFloatingStatus('🔊 AI sta parlando...');
                    }
                };
                
                utterance.onend = () => {
                    console.log('✅ Sintesi vocale completata');
                    if (window.showFloatingStatus) {
                        window.showFloatingStatus('🤖 AI pronto');
                    }
                };
                
                utterance.onerror = (event) => {
                    console.error('❌ Errore sintesi vocale:', event.error);
                };
                
                speechSynthesis.speak(utterance);
                
                // Fallback per iOS - doppio tentativo
                if (/iPad|iPhone/.test(navigator.userAgent)) {
                    setTimeout(() => {
                        if (!speechSynthesis.speaking && !speechSynthesis.pending) {
                            console.log('🔄 Retry speech synthesis per iOS');
                            speechSynthesis.speak(utterance);
                        }
                    }, 500);
                }
                
            } catch (error) {
                console.error('❌ Errore speech synthesis:', error);
            }
        },

        /**
         * Inizializza sistema vocale e carica voci
         */
        initVoiceSystem() {
            try {
                // Carica voci disponibili
                const loadVoices = () => {
                    const voices = speechSynthesis.getVoices();
                    console.log('🗣️ Voci disponibili:', voices.length);
                    
                    const italianVoices = voices.filter(voice => voice.lang.includes('it'));
                    console.log('🇮🇹 Voci italiane:', italianVoices.map(v => v.name));
                };
                
                // Carica immediatamente se disponibili
                if (speechSynthesis.getVoices().length > 0) {
                    loadVoices();
                } else {
                    // Aspetta che vengano caricate
                    speechSynthesis.onvoiceschanged = loadVoices;
                }
                
                console.log('✅ Sistema vocale AI inizializzato');
            } catch (error) {
                console.error('❌ Errore inizializzazione sistema vocale:', error);
            }
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
                                <optgroup label="🤖 Claude (Anthropic)">
                                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Veloce)</option>
                                    <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Economico)</option>
                                    <option value="claude-3-opus-20240229">Claude 3 Opus (Potente)</option>
                                    <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                                    <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                                </optgroup>
                                <optgroup label="🧠 GPT (OpenAI)">
                                    <option value="gpt-4o">GPT-4o (Più recente)</option>
                                    <option value="gpt-4o-mini">GPT-4o Mini (Economico)</option>
                                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                    <option value="gpt-4">GPT-4 (Classico)</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                </optgroup>
                                <optgroup label="🚀 OpenAI o1 (Reasoning)">
                                    <option value="o1-preview">o1-preview (Beta)</option>
                                    <option value="o1-mini">o1-mini (Veloce)</option>
                                </optgroup>
                            </select>
                            <button onclick="window.FlavioAIAssistant.testConnection()" style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Test API</button>
                        </div>
                        
                        <!-- Contatori Token e Costi -->
                        <div style="background: #e9ecef; padding: 10px; border-radius: 6px; margin-top: 10px;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; font-size: 13px;">
                                <!-- Ultima richiesta -->
                                <div style="background: white; padding: 8px; border-radius: 4px; border-left: 3px solid #007bff;">
                                    <div style="font-weight: bold; color: #495057; margin-bottom: 4px;">📊 Ultima richiesta</div>
                                    <div>Token: <span id="last-request-tokens" style="color: #007bff;">0</span></div>
                                    <div>Costo: <span id="last-request-cost" style="color: #28a745;">€0.0000</span></div>
                                </div>
                                <!-- Totale sessione -->
                                <div style="background: white; padding: 8px; border-radius: 4px; border-left: 3px solid #28a745;">
                                    <div style="font-weight: bold; color: #495057; margin-bottom: 4px;">💻 Totale sessione</div>
                                    <div>Token: <span id="session-tokens" style="color: #007bff;">0</span></div>
                                    <div>Costo: <span id="session-cost" style="color: #28a745;">€0.0000</span></div>
                                </div>
                                <!-- Totale giornaliero -->
                                <div style="background: white; padding: 8px; border-radius: 4px; border-left: 3px solid #fd7e14;">
                                    <div style="font-weight: bold; color: #495057; margin-bottom: 4px;">📅 Totale oggi</div>
                                    <div>Token: <span id="daily-tokens" style="color: #007bff;">0</span></div>
                                    <div>Costo: <span id="daily-cost" style="color: #fd7e14;">€0.0000</span></div>
                                </div>
                            </div>
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
                        <button onclick="window.FlavioAIAssistant.clearChat()" style="padding: 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">🗑️ Cancella Chat</button>
                        <button onclick="window.FlavioAIAssistant.debugAPI()" style="padding: 10px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">🔍 Debug</button>
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
            
            // Inizializza contatori
            this.initializeCounters();

            console.log('✅ Interfaccia AI leggera renderizzata');
        },

        /**
         * Invia messaggio con API corretta, supporto vocale e fallback
         */
        async sendMessage(customMessage = null, isVoiceInput = false) {
            let message;
            
            if (customMessage) {
                // Messaggio diretto (es. da input vocale)
                message = customMessage.trim();
            } else {
                // Messaggio da interfaccia
                const input = document.getElementById('ai-input');
                message = input.value.trim();
                if (input) input.value = '';
            }
            
            if (!message) return;

            console.log(`🗣️ Messaggio ${isVoiceInput ? 'VOCALE' : 'TESTUALE'}: ${message}`);
            
            this.addMessage(message, 'user');
            this.addMessage(isVoiceInput ? '🎤 Sto elaborando il tuo messaggio vocale...' : '🤔 Sto elaborando...', 'assistant', true);

            try {
                const modelSelect = document.getElementById('ai-model');
                const model = modelSelect ? modelSelect.value : 'claude-3-5-sonnet-20241022';
                
                console.log('🚀 Tentativo chiamata API:', { message, model, isVoiceInput });
                
                const response = await fetch('/.netlify/functions/claude-ai', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        message: message,
                        model: model,
                        isVoiceInput: isVoiceInput,
                        supabaseData: { timestamp: new Date().toISOString() }
                    })
                });

                console.log('📡 Response status:', response.status);
                
                if (!response.ok) {
                    // Prova a leggere il corpo della risposta per debug
                    let errorText = '';
                    try {
                        const errorData = await response.json();
                        errorText = errorData.error || `HTTP ${response.status}`;
                        console.log('❌ Error details:', errorData);
                    } catch (e) {
                        errorText = `HTTP ${response.status}`;
                    }
                    throw new Error(errorText);
                }
                
                const result = await response.json();
                console.log('✅ Response received:', result);
                
                // Rimuovi messaggio di caricamento
                const messages = document.getElementById('ai-messages');
                if (messages && messages.lastElementChild) {
                    messages.removeChild(messages.lastElementChild);
                }
                
                const aiResponse = result.response || 'Nessuna risposta ricevuta.';
                this.addMessage(aiResponse, 'assistant');
                
                // 📊 Aggiorna contatori token e costi
                if (result.usage) {
                    this.updateTokenCounters(result.usage, model);
                }
                
                // 🔊 SINTESI VOCALE PER INPUT VOCALI
                if (isVoiceInput) {
                    console.log('🔊 Attivazione sintesi vocale per risposta AI');
                    this.speakResponse(aiResponse);
                }
                
            } catch (error) {
                console.error('❌ Errore AI completo:', error);
                const messages = document.getElementById('ai-messages');
                if (messages && messages.lastElementChild) {
                    messages.removeChild(messages.lastElementChild);
                }
                
                let fallbackResponse;
                // Usa fallback locale per test
                if (error.message.includes('500') || error.message.includes('API key')) {
                    this.addMessage('⚠️ API non configurata. Uso risposta di test:', 'assistant');
                    fallbackResponse = this.getFallbackResponse(message);
                    this.addMessage(fallbackResponse, 'assistant');
                } else {
                    fallbackResponse = '⚠️ Errore di rete. Verifica la connessione internet.';
                    this.addMessage(fallbackResponse, 'assistant');
                }
                
                // 🔊 SINTESI VOCALE ANCHE PER ERRORI SE INPUT VOCALE
                if (isVoiceInput && fallbackResponse) {
                    console.log('🔊 Attivazione sintesi vocale per fallback');
                    this.speakResponse(fallbackResponse);
                }
            }
        },

        /**
         * Risposta fallback per test senza API
         */
        getFallbackResponse(message) {
            const lowerMessage = message.toLowerCase();
            
            if (lowerMessage.includes('ciao') || lowerMessage.includes('test')) {
                return '👋 Ciao! Il sistema AI è funzionante ma le API keys potrebbero non essere configurate correttamente su Netlify. Per ora uso risposte di test.';
            }
            
            if (lowerMessage.includes('clienti')) {
                return '👥 Per i clienti: puoi visualizzare, aggiungere e modificare i tuoi clienti nella sezione dedicata. Che informazione ti serve?';
            }
            
            if (lowerMessage.includes('ordini')) {
                return '📋 Per gli ordini: puoi creare nuovi ordini, visualizzare quelli esistenti e gestire lo stato. Vuoi sapere qualcosa di specifico?';
            }
            
            if (lowerMessage.includes('fatturato') || lowerMessage.includes('vendite')) {
                return '💰 Per il fatturato: posso aiutarti ad analizzare le vendite e calcolare i totali. Dimmi quale periodo ti interessa.';
            }
            
            return `🤖 Ho ricevuto: "${message}". Le API esterne non sono disponibili, ma il sistema locale funziona. Configura le API keys su Netlify per risposte complete.`;
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
        async testConnection() {
            this.addMessage('🧪 Test connessione API in corso...', 'assistant');
            
            try {
                // Prima testa se l'endpoint esiste
                const healthResponse = await fetch('/.netlify/functions/claude-ai', {
                    method: 'GET'
                });
                
                console.log('🏥 Health check:', healthResponse.status);
                
                if (healthResponse.ok) {
                    const healthData = await healthResponse.json();
                    this.addMessage(`✅ Endpoint attivo: ${healthData.message}`, 'assistant');
                    
                    // Ora testa con una richiesta reale
                    this.quickQuery('Test API - Ciao, funzioni?');
                } else {
                    this.addMessage('❌ Endpoint Netlify Functions non raggiungibile', 'assistant');
                }
                
            } catch (error) {
                console.error('❌ Test connection error:', error);
                this.addMessage('❌ Errore nel test di connessione. Netlify Functions potrebbe non essere attivo.', 'assistant');
            }
        },

        /**
         * Cancella la chat corrente
         */
        clearChat() {
            if (confirm('Sei sicuro di voler cancellare tutta la conversazione?')) {
                // Svuota la cronologia
                this.chatHistory = [];
                
                // Pulisci l'interfaccia
                const messagesContainer = document.getElementById('ai-messages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = `
                        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                            <div style="display: flex; gap: 10px; align-items: flex-start;">
                                <div style="width: 30px; height: 30px; background: #28a745; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">AI</div>
                                <div>Ciao! Sono pronto ad aiutarti. Chiedimi qualsiasi cosa sui tuoi dati commerciali!</div>
                            </div>
                        </div>
                    `;
                }
                
                // Svuota anche l'input
                const input = document.getElementById('ai-input');
                if (input) {
                    input.value = '';
                    input.focus();
                }
                
                console.log('🗑️ Chat cancellata');
            }
        },

        /**
         * Debug API per sviluppatori
         */
        debugAPI() {
            console.log('🔍 DEBUG API STATUS:');
            console.log('- Endpoint:', '/.netlify/functions/claude-ai');
            console.log('- Environment:', window.location.hostname);
            console.log('- User Agent:', navigator.userAgent);
            
            this.addMessage('🔍 Debug info stampato nella console. Controlla DevTools.', 'assistant');
        },

        /**
         * Inizializza contatori all'avvio
         */
        initializeCounters() {
            try {
                // Recupera valori dalla sessione
                const lastTokens = parseInt(sessionStorage.getItem('last_request_tokens') || '0');
                const totalTokens = parseInt(sessionStorage.getItem('total_tokens_used') || '0');
                const sessionCost = parseFloat(sessionStorage.getItem('session_cost_eur') || '0');
                const lastCost = parseFloat(sessionStorage.getItem('last_request_cost_eur') || '0');
                
                // Aggiorna UI ultima richiesta
                const lastTokensElement = document.getElementById('last-request-tokens');
                if (lastTokensElement) {
                    lastTokensElement.textContent = lastTokens.toLocaleString();
                }
                
                const lastCostElement = document.getElementById('last-request-cost');
                if (lastCostElement) {
                    lastCostElement.textContent = `€${lastCost.toFixed(4)}`;
                }
                
                // Aggiorna UI totale sessione
                const sessionTokensElement = document.getElementById('session-tokens');
                if (sessionTokensElement) {
                    sessionTokensElement.textContent = totalTokens.toLocaleString();
                }
                
                const sessionCostElement = document.getElementById('session-cost');
                if (sessionCostElement) {
                    sessionCostElement.textContent = `€${sessionCost.toFixed(4)}`;
                }
                
                // Aggiorna totali giornalieri
                if (window.getTodayKey) {
                    const todayKey = window.getTodayKey();
                    const dailyData = JSON.parse(localStorage.getItem(todayKey) || '{}');
                    
                    const dailyTokensElement = document.getElementById('daily-tokens');
                    if (dailyTokensElement && dailyData.totalTokens) {
                        dailyTokensElement.textContent = dailyData.totalTokens.toLocaleString();
                    }
                    
                    const dailyCostElement = document.getElementById('daily-cost');
                    if (dailyCostElement && dailyData.totalCostEUR) {
                        dailyCostElement.textContent = `€${dailyData.totalCostEUR.toFixed(4)}`;
                    }
                }
                
                console.log('📊 Contatori inizializzati:', { lastTokens, totalTokens, sessionCost });
                
            } catch (error) {
                console.error('❌ Errore inizializzazione contatori:', error);
            }
        },

        /**
         * Aggiorna contatori token e costi
         */
        updateTokenCounters(usage, model) {
            try {
                const tokens = usage.total_tokens || usage.totalTokens || 0;
                
                // Aggiorna token totali nella sessione
                const currentTokens = parseInt(sessionStorage.getItem('total_tokens_used') || '0');
                const newTotal = currentTokens + tokens;
                sessionStorage.setItem('total_tokens_used', newTotal.toString());
                sessionStorage.setItem('last_request_tokens', tokens.toString());
                
                // Calcola costo
                const provider = model.includes('claude') ? 'anthropic' : 'openai';
                const cost = window.calculateAICost ? window.calculateAICost(tokens, model, provider) : null;
                
                // Salva costo ultima richiesta
                if (cost) {
                    sessionStorage.setItem('last_request_cost_eur', cost.eur.toString());
                }
                
                // Aggiorna UI ultima richiesta
                const lastTokensElement = document.getElementById('last-request-tokens');
                if (lastTokensElement) {
                    lastTokensElement.textContent = tokens.toLocaleString();
                }
                
                const lastCostElement = document.getElementById('last-request-cost');
                if (lastCostElement && cost) {
                    lastCostElement.textContent = `€${cost.eur.toFixed(4)}`;
                }
                
                // Aggiorna UI totale sessione
                const sessionTokensElement = document.getElementById('session-tokens');
                if (sessionTokensElement) {
                    sessionTokensElement.textContent = newTotal.toLocaleString();
                }
                
                const sessionCostElement = document.getElementById('session-cost');
                if (sessionCostElement && cost) {
                    const sessionCost = parseFloat(sessionStorage.getItem('session_cost_eur') || '0') + cost.eur;
                    sessionStorage.setItem('session_cost_eur', sessionCost.toString());
                    sessionCostElement.textContent = `€${sessionCost.toFixed(4)}`;
                }
                
                // Aggiorna statistiche giornaliere
                if (window.updateDailyStats) {
                    window.updateDailyStats(tokens, model, provider);
                    
                    // Aggiorna display totali giornalieri
                    const todayKey = window.getTodayKey();
                    const dailyData = JSON.parse(localStorage.getItem(todayKey) || '{}');
                    
                    const dailyTokensElement = document.getElementById('daily-tokens');
                    if (dailyTokensElement && dailyData.totalTokens) {
                        dailyTokensElement.textContent = dailyData.totalTokens.toLocaleString();
                    }
                    
                    const dailyCostElement = document.getElementById('daily-cost');
                    if (dailyCostElement && dailyData.totalCostEUR) {
                        dailyCostElement.textContent = `€${dailyData.totalCostEUR.toFixed(4)}`;
                    }
                }
                
                console.log('📊 Token update:', { tokens, model, cost });
                
            } catch (error) {
                console.error('❌ Errore aggiornamento contatori:', error);
            }
        },

        /**
         * Ottieni statistiche del provider AI
         */
        getProviderStats() {
            return {
                currentProvider: this.baseAssistant?.currentProvider || 'none',
                totalRequests: this.chatHistory.length,
                hasProvider: !!this.baseAssistant,
                isInitialized: this.isInitialized
            };
        },

        /**
         * Cambia provider AI
         */
        changeProvider(providerName) {
            console.log(`🔄 Tentativo cambio provider a: ${providerName}`);
            
            if (this.baseAssistant && this.baseAssistant.setProvider) {
                return this.baseAssistant.setProvider(providerName);
            } else {
                console.warn('⚠️ BaseAssistant non disponibile per cambio provider');
                return false;
            }
        }

    };

    // Auto-inizializzazione
    flavioAI.init();

    return flavioAI;
})();

console.log('✅ FlavioAIAssistant caricato');