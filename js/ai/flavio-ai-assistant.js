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
        clearingHistory: false,

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
            // Protezione contro chiamate multiple
            if (this.clearingHistory) {
                console.log('🛑 Clear history già in corso, ignoro chiamata duplicata');
                return;
            }
            
            this.clearingHistory = true;
            
            try {
                this.chatHistory = [];
                
                // Pulisci UI - usa il selettore corretto per l'interfaccia attuale
                const chatContainer = document.getElementById('ai-messages');
                if (chatContainer) {
                    // Mantieni solo il messaggio di benvenuto dell'AI
                    chatContainer.innerHTML = `
                        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                            <div style="display: flex; gap: 10px; align-items: flex-start;">
                                <div style="width: 30px; height: 30px; background: #28a745; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">AI</div>
                                <div>Ciao! Sono pronto ad aiutarti. Chiedimi qualsiasi cosa sui tuoi dati commerciali!</div>
                            </div>
                        </div>
                    `;
                }

                console.log('🧹 Cronologia chat pulita - UI ripristinata');
            } finally {
                // Reset flag dopo un breve delay
                setTimeout(() => {
                    this.clearingHistory = false;
                }, 500);
            }
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
                // Ferma qualsiasi speech in corso
                speechSynthesis.cancel();
                
                // Pulisci il testo da markdown e HTML
                const cleanText = text
                    .replace(/[#*`_~]/g, '') // Rimuovi markdown
                    .replace(/<[^>]*>/g, '') // Rimuovi HTML
                    .replace(/\s+/g, ' ') // Normalizza spazi
                    .trim();
                
                if (!cleanText) return;
                
                console.log('🔊 Pronunciando risposta AI:', cleanText.substring(0, 50) + '...');
                
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = 'it-IT';
                
                // 🎛️ USA IMPOSTAZIONI CONTROLLI AVANZATI
                if (window.currentTTSSettings) {
                    utterance.volume = window.currentTTSSettings.volume || 1.0;
                    utterance.rate = window.currentTTSSettings.rate || 0.9;
                    
                    if (window.currentTTSSettings.voice) {
                        utterance.voice = window.currentTTSSettings.voice;
                        console.log('🗣️ Utilizzando voce dai controlli avanzati:', window.currentTTSSettings.voice.name);
                    }
                } else {
                    // Fallback valori predefiniti
                    utterance.rate = 0.9;
                    utterance.volume = 1.0;
                }
                
                utterance.pitch = 1.0;
                
                // Selezione voce italiana se non impostata dai controlli avanzati
                if (!utterance.voice) {
                    const voices = speechSynthesis.getVoices();
                    const italianVoice = voices.find(voice => 
                        voice.lang.includes('it') && 
                        (voice.name.includes('Alice') || voice.name.includes('Federica') || voice.name.includes('Luca'))
                    ) || voices.find(voice => voice.lang.includes('it'));
                    
                    if (italianVoice) {
                        utterance.voice = italianVoice;
                        console.log('🗣️ Utilizzando voce italiana predefinita:', italianVoice.name);
                    }
                }
                
                utterance.onstart = () => {
                    console.log('🔊 Sintesi vocale avviata');
                    
                    // 🛑 FERMA IL RICONOSCIMENTO VOCALE QUANDO L'AI INIZIA A PARLARE
                    this.stopAllVoiceRecognition();
                    
                    // 🛑 MOSTRA PULSANTE DI STOP FLOTTANTE
                    const floatingStopBtn = document.getElementById('floating-stop-btn');
                    if (floatingStopBtn) {
                        floatingStopBtn.style.display = 'block';
                    }
                    
                    // 🛑 MOSTRA PULSANTE DI STOP NELL'INTERFACCIA AI
                    const aiStopBtn = document.getElementById('ai-stop-tts-btn');
                    if (aiStopBtn) {
                        aiStopBtn.style.display = 'inline-block';
                    }
                    
                    if (window.showFloatingStatus) {
                        window.showFloatingStatus('🔊 AI sta parlando...');
                    }
                };
                
                utterance.onend = () => {
                    console.log('✅ Sintesi vocale completata');
                    
                    // 🛑 NASCONDI PULSANTE DI STOP FLOTTANTE
                    const floatingStopBtn = document.getElementById('floating-stop-btn');
                    if (floatingStopBtn) {
                        floatingStopBtn.style.display = 'none';
                    }
                    
                    // 🛑 NASCONDI PULSANTE DI STOP NELL'INTERFACCIA AI
                    const aiStopBtn = document.getElementById('ai-stop-tts-btn');
                    if (aiStopBtn) {
                        aiStopBtn.style.display = 'none';
                    }
                    
                    if (window.showFloatingStatus) {
                        window.showFloatingStatus('🤖 AI pronto');
                    }
                    
                    // 🔄 AGGIORNA UI PER MOSTRARE CHE IL MICROFONO È FERMO
                    if (window.updateFloatingUI) {
                        window.isCurrentlyListening = false;
                        window.updateFloatingUI();
                    }
                };
                
                utterance.onerror = (event) => {
                    console.error('❌ Errore sintesi vocale:', event.error);
                    
                    // 🛑 NASCONDI PULSANTE DI STOP FLOTTANTE ANCHE IN CASO DI ERRORE
                    const floatingStopBtn = document.getElementById('floating-stop-btn');
                    if (floatingStopBtn) {
                        floatingStopBtn.style.display = 'none';
                    }
                    
                    // 🛑 NASCONDI PULSANTE DI STOP NELL'INTERFACCIA AI
                    const aiStopBtn = document.getElementById('ai-stop-tts-btn');
                    if (aiStopBtn) {
                        aiStopBtn.style.display = 'none';
                    }
                    
                    // 🔄 AGGIORNA UI ANCHE IN CASO DI ERRORE
                    if (window.updateFloatingUI) {
                        window.isCurrentlyListening = false;
                        window.updateFloatingUI();
                    }
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
         * Ferma la sintesi vocale in corso
         */
        stopSpeaking() {
            console.log('⏹️ Stop sintesi vocale dall\'interfaccia AI');
            
            // Ferma immediatamente la sintesi vocale
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            
            // Nascondi il pulsante STOP nell'interfaccia AI
            const stopBtn = document.getElementById('ai-stop-tts-btn');
            if (stopBtn) {
                stopBtn.style.display = 'none';
            }
            
            // Nascondi anche il pulsante STOP flottante
            const floatingStopBtn = document.getElementById('floating-stop-btn');
            if (floatingStopBtn) {
                floatingStopBtn.style.display = 'none';
            }
            
            // Aggiorna status
            if (window.showFloatingStatus) {
                window.showFloatingStatus('⏹️ Lettura fermata');
            }
        },

        /**
         * Ferma tutti i sistemi di riconoscimento vocale per evitare loop TTS
         */
        stopAllVoiceRecognition() {
            console.log('🛑 Fermando tutti i sistemi di riconoscimento vocale per evitare loop TTS...');
            
            // Usa la funzione globale se disponibile
            if (window.stopAllVoiceRecognitionGlobal) {
                window.stopAllVoiceRecognitionGlobal();
                return;
            }
            
            // Fallback: ferma manualmente tutti i sistemi
            // Ferma VoiceRecognition (prioritario)
            if (window.VoiceRecognition && typeof window.VoiceRecognition.stop === 'function') {
                window.VoiceRecognition.stop();
                console.log('🛑 VoiceRecognition fermato');
            }
            
            // Ferma AIVoiceManager
            if (window.AIVoiceManager) {
                if (typeof window.AIVoiceManager.stopListening === 'function') {
                    window.AIVoiceManager.stopListening();
                }
                if (typeof window.AIVoiceManager.stopWakeWordDetection === 'function') {
                    window.AIVoiceManager.stopWakeWordDetection();
                }
                console.log('🛑 AIVoiceManager fermato');
            }
            
            // Ferma AIVoiceManagerV2
            if (window.AIVoiceManagerV2 && typeof window.AIVoiceManagerV2.stopListening === 'function') {
                window.AIVoiceManagerV2.stopListening();
                console.log('🛑 AIVoiceManagerV2 fermato');
            }
            
            // Ferma VoiceAssistant
            if (window.VoiceAssistant && typeof window.VoiceAssistant.stopListening === 'function') {
                window.VoiceAssistant.stopListening();
                console.log('🛑 VoiceAssistant fermato');
            }
            
            // Aggiorna flag globali
            if (window.isCurrentlyListening !== undefined) {
                window.isCurrentlyListening = false;
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
                            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                                <input type="text" id="ai-input" placeholder="Scrivi qui la tua domanda..." style="flex: 1; padding: 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 14px;">
                                <button onclick="window.FlavioAIAssistant.sendMessage()" style="padding: 12px 20px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Invia</button>
                            </div>
                            <div style="text-align: center; display: flex; gap: 10px; justify-content: center;">
                                <button onclick="window.FlavioAIAssistant.clearHistory()" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️ Cancella Cronologia</button>
                                <button id="ai-stop-tts-btn" onclick="window.FlavioAIAssistant.stopSpeaking()" style="padding: 8px 16px; background: #FF453A; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: none;">⏹️ Stop Lettura</button>
                            </div>
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 15px;">
                        <button onclick="window.FlavioAIAssistant.quickQuery('Quanti clienti ho?')" style="padding: 10px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">👥 Clienti</button>
                        <button onclick="window.FlavioAIAssistant.quickQuery('Fatturato totale?')" style="padding: 10px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">💰 Fatturato</button>
                        <button onclick="window.FlavioAIAssistant.quickQuery('Ordini in sospeso?')" style="padding: 10px; background: #ffc107; color: #212529; border: none; border-radius: 4px; cursor: pointer;">📋 Ordini</button>
                        <button onclick="window.FlavioAIAssistant.quickQuery('Statistiche vendite?')" style="padding: 10px; background: #6f42c1; color: white; border: none; border-radius: 4px; cursor: pointer;">📊 Stats</button>
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
         * Debug API per sviluppatori
         */
        debugAPI() {
            console.log('🔍 DEBUG API STATUS:');
            console.log('- Endpoint:', '/.netlify/functions/claude-ai');
            console.log('- Environment:', window.location.hostname);
            console.log('- User Agent:', navigator.userAgent);
            
            this.addMessage('🔍 Debug info stampato nella console. Controlla DevTools.', 'assistant');
        }

    };

    // Auto-inizializzazione
    flavioAI.init();

    return flavioAI;
})();

console.log('✅ FlavioAIAssistant caricato');