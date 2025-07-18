/**
 * ROBUST CONNECTION MANAGER
 * Sistema di connessione robusta, duratura e costante per PC
 * Gestisce connessioni a Supabase e Vocabolario senza timeout
 */

class RobustConnectionManager {
    constructor() {
        this.isActive = false;
        this.connections = {
            supabase: false,
            vocabulary: false,
            aiMiddleware: false,
            requestMiddleware: false
        };
        
        this.instances = {
            supabaseAI: null,
            vocabularyManager: null,
            aiMiddleware: null,
            requestMiddleware: null
        };
        
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 50; // Tenta fino a 50 volte
        this.reconnectDelay = 2000; // 2 secondi tra i tentativi
        
        this.debug = true;
        this.statusCallback = null;
        
        console.log('🔌 RobustConnectionManager: Inizializzato');
    }

    /**
     * Avvia il sistema di connessione robusta
     */
    async start() {
        console.log('🔌 RobustConnectionManager: Avvio sistema connessione robusta');
        
        this.isActive = true;
        this.reconnectAttempts = 0;
        
        // Avvia il monitoraggio continuo
        this.startMonitoring();
        
        // Tenta la connessione iniziale
        await this.attemptConnection();
        
        return this.isFullyConnected();
    }

    /**
     * Monitora costantemente lo stato delle connessioni
     */
    startMonitoring() {
        // Controlla ogni 30 secondi (ridotto da 5 secondi)
        setInterval(() => {
            if (this.isActive) {
                this.checkConnections();
            }
        }, 30000);
        
        // Controllo approfondito ogni 5 minuti (ridotto da 30 secondi)
        setInterval(() => {
            if (this.isActive) {
                this.deepConnectionCheck();
            }
        }, 300000);
    }

    /**
     * Tenta di stabilire tutte le connessioni
     */
    async attemptConnection() {
        console.log('🔌 RobustConnectionManager: Tentativo connessione', this.reconnectAttempts + 1);
        
        // Debug: stato corrente delle classi
        console.log('🔌 🔍 Stato classi disponibili:', {
            SupabaseAIIntegration: !!window.SupabaseAIIntegration,
            VocabularyManager: !!window.VocabularyManager,
            AIMiddleware: !!window.AIMiddleware,
            RequestMiddleware: !!window.RequestMiddleware
        });
        
        try {
            // Step 1: Supabase
            console.log('🔌 📋 Step 1: Connessione Supabase...');
            await this.connectSupabase();
            
            // Step 2: Vocabulary Manager
            console.log('🔌 📋 Step 2: Connessione Vocabulary Manager...');
            await this.connectVocabulary();
            
            // Step 3: AI Middleware
            console.log('🔌 📋 Step 3: Connessione AI Middleware...');
            await this.connectAIMiddleware();
            
            // Step 4: Request Middleware
            console.log('🔌 📋 Step 4: Connessione Request Middleware...');
            await this.connectRequestMiddleware();
            
            // Step 5: Integrazione finale
            console.log('🔌 📋 Step 5: Finalizzazione integrazione...');
            await this.finalizeIntegration();
            
            console.log('🔌 ✅ CONNESSIONE ROBUSTA COMPLETATA');
            this.reconnectAttempts = 0; // Reset counter dopo successo
            this.notifyStatusChange('connected');
            
            return true;
            
        } catch (error) {
            console.error('🔌 ❌ Errore connessione:', error);
            console.error('🔌 ❌ Stack trace:', error.stack);
            this.reconnectAttempts++;
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                console.log(`🔌 🔄 Riconnessione in ${this.reconnectDelay}ms (tentativo ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                
                setTimeout(() => {
                    this.attemptConnection();
                }, this.reconnectDelay);
            } else {
                console.error('🔌 ❌ Connessione fallita dopo', this.maxReconnectAttempts, 'tentativi');
                this.notifyStatusChange('failed');
            }
            
            return false;
        }
    }

    /**
     * Connette Supabase
     */
    async connectSupabase() {
        return new Promise((resolve, reject) => {
            let attemptCount = 0;
            const maxAttempts = 30; // Max 15 seconds (30 * 500ms)
            
            const attempt = () => {
                attemptCount++;
                
                if (window.SupabaseAIIntegration) {
                    console.log('🔌 💾 Connessione Supabase: Classe trovata');
                    
                    if (!window.supabaseAI) {
                        console.log('🔌 💾 Creando istanza SupabaseAI');
                        window.supabaseAI = new SupabaseAIIntegration();
                    }
                    
                    this.instances.supabaseAI = window.supabaseAI;
                    this.connections.supabase = true;
                    
                    console.log('🔌 ✅ Supabase connesso');
                    resolve();
                } else if (attemptCount >= maxAttempts) {
                    console.error('🔌 ❌ Timeout connessione SupabaseAI dopo', maxAttempts, 'tentativi');
                    console.log('🔌 🔍 Debug - SupabaseAIIntegration disponibile:', !!window.SupabaseAIIntegration);
                    reject(new Error('Timeout connessione SupabaseAI'));
                } else {
                    console.log(`🔌 ⏳ Attendo SupabaseAIIntegration... (${attemptCount}/${maxAttempts})`);
                    setTimeout(attempt, 500);
                }
            };
            
            attempt();
        });
    }

    /**
     * Connette Vocabulary Manager
     */
    async connectVocabulary() {
        return new Promise((resolve, reject) => {
            const attempt = () => {
                if (window.VocabularyManager) {
                    console.log('🔌 📚 Connessione Vocabulary: Classe trovata');
                    
                    if (!window.vocabularyManager) {
                        console.log('🔌 📚 Creando istanza VocabularyManager');
                        window.vocabularyManager = new VocabularyManager();
                    }
                    
                    this.instances.vocabularyManager = window.vocabularyManager;
                    this.connections.vocabulary = true;
                    
                    console.log('🔌 ✅ VocabularyManager connesso');
                    resolve();
                } else {
                    console.log('🔌 ⏳ Attendo VocabularyManager...');
                    setTimeout(attempt, 500);
                }
            };
            
            attempt();
        });
    }

    /**
     * Connette AI Middleware
     */
    async connectAIMiddleware() {
        return new Promise((resolve, reject) => {
            const attempt = () => {
                if (window.AIMiddleware) {
                    console.log('🔌 🤖 Connessione AI Middleware: Classe trovata');
                    
                    if (!window.aiMiddleware) {
                        console.log('🔌 🤖 Creando istanza AIMiddleware');
                        window.aiMiddleware = new AIMiddleware();
                    }
                    
                    this.instances.aiMiddleware = window.aiMiddleware;
                    this.connections.aiMiddleware = true;
                    
                    console.log('🔌 ✅ AIMiddleware connesso');
                    resolve();
                } else {
                    console.log('🔌 ⏳ Attendo AIMiddleware...');
                    setTimeout(attempt, 500);
                }
            };
            
            attempt();
        });
    }

    /**
     * Connette Request Middleware
     */
    async connectRequestMiddleware() {
        return new Promise((resolve, reject) => {
            let attemptCount = 0;
            const maxAttempts = 30; // Max 15 seconds (30 * 500ms)
            
            const attempt = () => {
                attemptCount++;
                
                if (window.RequestMiddleware && this.instances.supabaseAI) {
                    console.log('🔌 📋 Connessione Request Middleware: Classe trovata');
                    
                    if (!window.requestMiddleware) {
                        console.log('🔌 📋 Creando istanza RequestMiddleware');
                        window.requestMiddleware = new RequestMiddleware(this.instances.supabaseAI);
                    }
                    
                    this.instances.requestMiddleware = window.requestMiddleware;
                    this.connections.requestMiddleware = true;
                    
                    console.log('🔌 ✅ RequestMiddleware connesso');
                    resolve();
                } else if (attemptCount >= maxAttempts) {
                    console.warn('🔌 ⏰ Timeout connessione RequestMiddleware dopo', maxAttempts, 'tentativi - procedo senza');
                    console.log('🔌 🔍 Debug - RequestMiddleware disponibile:', !!window.RequestMiddleware);
                    console.log('🔌 🔍 Debug - SupabaseAI disponibile:', !!this.instances.supabaseAI);
                    // Non rifiutare la connessione, prosegui senza middleware
                    resolve();
                } else {
                    console.log(`🔌 ⏳ Attendo RequestMiddleware o SupabaseAI... (${attemptCount}/${maxAttempts})`);
                    setTimeout(attempt, 500);
                }
            };
            
            attempt();
        });
    }

    /**
     * Finalizza l'integrazione dei middleware
     */
    async finalizeIntegration() {
        console.log('🔌 🔗 Finalizzazione integrazione middleware');
        
        // Collega i middleware tra loro
        if (this.instances.aiMiddleware && this.instances.requestMiddleware) {
            this.instances.aiMiddleware.requestMiddleware = this.instances.requestMiddleware;
            console.log('🔌 🔗 AIMiddleware collegato a RequestMiddleware');
        }
        
        // Collega il vocabulary manager all'AI middleware
        if (this.instances.aiMiddleware && this.instances.vocabularyManager) {
            this.instances.aiMiddleware.vocabularyManager = this.instances.vocabularyManager;
            console.log('🔌 🔗 AIMiddleware collegato a VocabularyManager');
        }
        
        // Intercetta le funzioni AI per usare i middleware
        this.interceptAIFunctions();
        
        console.log('🔌 ✅ Integrazione finalizzata');
    }

    /**
     * Intercetta le funzioni AI per usare i middleware
     */
    interceptAIFunctions() {
        console.log('🔌 🎯 Intercettazione funzioni AI');
        
        // Intercetta FlavioAIAssistant
        if (window.FlavioAIAssistant && window.FlavioAIAssistant.sendMessage) {
            const originalSendMessage = window.FlavioAIAssistant.sendMessage.bind(window.FlavioAIAssistant);
            
            window.FlavioAIAssistant.sendMessage = async (customMessage = null, isVoiceInput = false) => {
                console.log('🔌 🎯 Intercettazione ROBUSTA - customMessage:', customMessage, 'isVoiceInput:', isVoiceInput);
                
                // Estrai il messaggio come fa la funzione originale
                let message;
                if (customMessage) {
                    message = customMessage.trim();
                    console.log('🔌 🎯 Messaggio da customMessage:', message);
                } else {
                    const input = document.getElementById('ai-input');
                    message = input ? input.value.trim() : '';
                    console.log('🔌 🎯 Input prima di svuotarlo:', message, 'Input element:', input);
                    // Svuota l'input immediatamente
                    if (input) {
                        input.value = '';
                        console.log('🔌 🎯 Input svuotato, nuovo valore:', input.value);
                    }
                }
                
                if (!message) return;
                
                console.log('🔌 🎯 Messaggio estratto:', message);
                
                // SEMPRE aggiungi il messaggio dell'utente alla chat
                console.log('🔌 🎯 Aggiungendo messaggio utente alla chat:', message);
                window.FlavioAIAssistant.addMessage(message, 'user');
                console.log('🔌 🎯 Messaggio utente aggiunto');
                
                // PRIORITÀ 1: Controlla SEMPRE il vocabolario per primo
                console.log('🔌 🎯 Controllando vocabolario per primi...');
                
                // Verifica se il vocabolario può gestire la richiesta
                if (this.instances.vocabularyManager && this.instances.vocabularyManager.findMatch) {
                    try {
                        const vocabularyMatch = await this.instances.vocabularyManager.findMatch(message);
                        if (vocabularyMatch) {
                            console.log('🔌 📚 Match trovato nel vocabolario:', vocabularyMatch);
                            
                            // Aggiungi messaggio di caricamento
                            window.FlavioAIAssistant.addMessage(isVoiceInput ? '🎤 Sto eseguendo il comando vocale...' : '📚 Eseguendo comando dal vocabolario...', 'assistant', true);
                            
                            // Esegui azione dal vocabolario tramite AIMiddleware
                            if (this.instances.aiMiddleware && this.instances.aiMiddleware.executeLocalAction) {
                                const vocabularyResponse = await this.instances.aiMiddleware.executeLocalAction(vocabularyMatch, message, {});
                                if (vocabularyResponse && vocabularyResponse.success) {
                                    console.log('🔌 ✅ Risposta da vocabolario:', vocabularyResponse.response);
                                    window.FlavioAIAssistant.addMessage(vocabularyResponse.response, 'assistant');
                                    return;
                                }
                            }
                        }
                    } catch (error) {
                        console.error('🔌 ❌ Errore nel controllo vocabolario:', error);
                    }
                }
                
                // PRIORITÀ 2: Se vocabolario non gestisce, controlla se è richiesta dati
                const isDataRequestResult = this.isDataRequest(message);
                console.log('🔌 🎯 Controllo richiesta dati:', { message, isDataRequestResult });
                
                if (isDataRequestResult) {
                    console.log('🔌 🎯 Richiesta dati identificata - uso middleware');
                    
                    // Verifica che il middleware sia disponibile
                    if (!this.instances.requestMiddleware || !this.instances.requestMiddleware.processRequest) {
                        console.error('🔌 ❌ RequestMiddleware non disponibile, fallback ad AI');
                        console.log('🔌 🔍 Debug middleware:', {
                            instance: !!this.instances.requestMiddleware,
                            processRequest: !!(this.instances.requestMiddleware && this.instances.requestMiddleware.processRequest)
                        });
                    } else {
                        console.log('🔌 ✅ RequestMiddleware disponibile, elaborazione in corso...');
                        
                        // Aggiungi messaggio di caricamento
                        window.FlavioAIAssistant.addMessage(isVoiceInput ? '🎤 Sto elaborando il tuo messaggio vocale...' : '🤔 Sto elaborando...', 'assistant', true);
                        
                        try {
                            const response = await this.instances.requestMiddleware.processRequest(message);
                            console.log('🔌 📊 Risposta middleware ricevuta:', response);
                            
                            if (response && response.handled) {
                                console.log('🔌 ✅ Risposta da middleware:', response.response);
                                
                                // Rimuovi messaggi di caricamento
                                const messagesContainer = document.getElementById('ai-messages');
                                if (messagesContainer) {
                                    const loadingMessages = messagesContainer.querySelectorAll('div');
                                    loadingMessages.forEach(msg => {
                                        if (msg.textContent && (msg.textContent.includes('Sto elaborando') || msg.textContent.includes('🤔'))) {
                                            msg.remove();
                                        }
                                    });
                                }
                                
                                // Aggiungi risposta del middleware
                                window.FlavioAIAssistant.addMessage(response.response, 'assistant');
                                
                                // 🔊 SINTESI VOCALE se è input vocale
                                if (isVoiceInput && window.FlavioAIAssistant.speakResponse) {
                                    console.log('🔊 Attivazione sintesi vocale per risposta middleware');
                                    window.FlavioAIAssistant.speakResponse(response.response);
                                }
                                
                                return response.response;
                            } else {
                                console.warn('🔌 ⚠️ Middleware response non valida:', response);
                            }
                        } catch (error) {
                            console.error('🔌 ❌ Errore middleware, fallback ad AI:', error);
                        }
                    }
                } else {
                    console.log('🔌 🎯 Non è una richiesta dati, uso AI normale');
                }
                
                // Fallback ad AI normale - ma il messaggio utente è già stato aggiunto
                // Aggiungi messaggio di caricamento
                window.FlavioAIAssistant.addMessage(isVoiceInput ? '🎤 Sto elaborando il tuo messaggio vocale...' : '🤔 Sto elaborando...', 'assistant', true);
                
                try {
                    const modelSelect = document.getElementById('ai-model');
                    const model = modelSelect ? modelSelect.value : 'claude-3-5-sonnet-20241022';
                    
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
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    
                    const result = await response.json();
                    
                    // Rimuovi messaggio di caricamento
                    const messagesContainer = document.getElementById('ai-messages');
                    if (messagesContainer) {
                        const loadingMessages = messagesContainer.querySelectorAll('div');
                        loadingMessages.forEach(msg => {
                            if (msg.textContent && (msg.textContent.includes('Sto elaborando') || msg.textContent.includes('🤔'))) {
                                msg.remove();
                            }
                        });
                    }
                    
                    const aiResponse = result.response || 'Nessuna risposta ricevuta.';
                    window.FlavioAIAssistant.addMessage(aiResponse, 'assistant');
                    
                    // 🔊 SINTESI VOCALE PER INPUT VOCALI
                    if (isVoiceInput && window.FlavioAIAssistant.speakResponse) {
                        console.log('🔊 Attivazione sintesi vocale per risposta AI');
                        window.FlavioAIAssistant.speakResponse(aiResponse);
                    }
                    
                    return aiResponse;
                    
                } catch (error) {
                    console.error('🔌 ❌ Errore AI:', error);
                    
                    // Rimuovi messaggio di caricamento
                    const messagesContainer = document.getElementById('ai-messages');
                    if (messagesContainer) {
                        const loadingMessages = messagesContainer.querySelectorAll('div');
                        loadingMessages.forEach(msg => {
                            if (msg.textContent && (msg.textContent.includes('Sto elaborando') || msg.textContent.includes('🤔'))) {
                                msg.remove();
                            }
                        });
                    }
                    
                    const fallbackResponse = '⚠️ Errore di connessione. Verifica la configurazione API.';
                    window.FlavioAIAssistant.addMessage(fallbackResponse, 'assistant');
                    
                    if (isVoiceInput && window.FlavioAIAssistant.speakResponse) {
                        window.FlavioAIAssistant.speakResponse(fallbackResponse);
                    }
                    
                    return fallbackResponse;
                }
            };
            
            console.log('🔌 ✅ FlavioAIAssistant intercettato');
        }
    }

    /**
     * Verifica se è una richiesta di dati
     */
    isDataRequest(message) {
        if (!message || typeof message !== 'string') {
            console.warn('🔌 ⚠️ Messaggio non valido per isDataRequest:', message);
            return false;
        }
        
        const dataKeywords = [
            'ordini', 'clienti', 'prodotti', 'database', 'quanti', 'elenco', 'lista',
            'fatturato', 'vendite', 'cliente', 'ordine', 'prodotto', 'acquisti',
            'statistiche', 'report', 'analisi', 'dati', 'ricavi', 'venduto',
            'acquistato', 'importo', 'totale', 'somma', 'costo', 'prezzo', 'gennaio',
            'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto',
            'settembre', 'ottobre', 'novembre', 'dicembre', 'mese', 'anno'
        ];
        
        const lowerMessage = message.toLowerCase();
        const matchedKeywords = dataKeywords.filter(keyword => lowerMessage.includes(keyword));
        const isDataRequest = matchedKeywords.length > 0;
        
        console.log('🔌 🔍 Controllo richiesta dati:', { 
            message, 
            lowerMessage, 
            matchedKeywords, 
            isDataRequest 
        });
        
        return isDataRequest;
    }

    /**
     * Controlla lo stato delle connessioni
     */
    checkConnections() {
        const previousState = { ...this.connections };
        
        this.connections.supabase = !!(window.supabaseAI && this.instances.supabaseAI);
        this.connections.vocabulary = !!(window.vocabularyManager && this.instances.vocabularyManager);
        this.connections.aiMiddleware = !!(window.aiMiddleware && this.instances.aiMiddleware);
        this.connections.requestMiddleware = !!(window.requestMiddleware && this.instances.requestMiddleware);
        
        // Se qualcosa è cambiato E non siamo completamente connessi, riconnetti
        if (JSON.stringify(previousState) !== JSON.stringify(this.connections)) {
            console.log('🔌 🔄 Cambiamento stato connessioni:', this.connections);
            
            if (!this.isFullyConnected() && this.reconnectAttempts === 0) {
                console.log('🔌 🔄 Riconnessione automatica in corso...');
                this.attemptConnection();
            } else if (this.reconnectAttempts > 0) {
                console.log('🔌 ⏸️ Riconnessione già in corso, salto controllo automatico');
            } else {
                console.log('🔌 ✅ Connessioni stabili - nessuna riconnessione necessaria');
            }
        }
    }

    /**
     * Controllo approfondito delle connessioni
     */
    deepConnectionCheck() {
        console.log('🔌 🔍 Controllo approfondito connessioni');
        
        const status = {
            supabase: this.testSupabaseConnection(),
            vocabulary: this.testVocabularyConnection(),
            aiMiddleware: this.testAIMiddlewareConnection(),
            requestMiddleware: this.testRequestMiddlewareConnection()
        };
        
        console.log('🔌 📊 Stato connessioni:', status);
        
        // Se qualcosa non funziona E non siamo in un tentativo di connessione, riconnetti
        if (!Object.values(status).every(s => s) && this.reconnectAttempts === 0) {
            console.log('🔌 🔄 Riconnessione necessaria');
            this.attemptConnection();
        } else if (Object.values(status).every(s => s)) {
            console.log('🔌 ✅ Tutte le connessioni funzionano correttamente');
        }
    }

    /**
     * Test connessione Supabase
     */
    testSupabaseConnection() {
        return !!(this.instances.supabaseAI && 
                 this.instances.supabaseAI.processRequest && 
                 typeof this.instances.supabaseAI.processRequest === 'function');
    }

    /**
     * Test connessione Vocabulary
     */
    testVocabularyConnection() {
        return !!(this.instances.vocabularyManager && 
                 this.instances.vocabularyManager.processCommand && 
                 typeof this.instances.vocabularyManager.processCommand === 'function');
    }

    /**
     * Test connessione AI Middleware
     */
    testAIMiddlewareConnection() {
        return !!(this.instances.aiMiddleware && 
                 this.instances.aiMiddleware.processMessage && 
                 typeof this.instances.aiMiddleware.processMessage === 'function');
    }

    /**
     * Test connessione Request Middleware
     */
    testRequestMiddlewareConnection() {
        return !!(this.instances.requestMiddleware && 
                 this.instances.requestMiddleware.processRequest && 
                 typeof this.instances.requestMiddleware.processRequest === 'function');
    }

    /**
     * Verifica se tutte le connessioni sono attive
     */
    isFullyConnected() {
        return Object.values(this.connections).every(connected => connected);
    }

    /**
     * Ottieni stato dettagliato
     */
    getStatus() {
        return {
            isActive: this.isActive,
            connections: { ...this.connections },
            reconnectAttempts: this.reconnectAttempts,
            isFullyConnected: this.isFullyConnected(),
            instances: {
                supabaseAI: !!this.instances.supabaseAI,
                vocabularyManager: !!this.instances.vocabularyManager,
                aiMiddleware: !!this.instances.aiMiddleware,
                requestMiddleware: !!this.instances.requestMiddleware
            }
        };
    }

    /**
     * Notifica cambio stato
     */
    notifyStatusChange(status) {
        if (this.statusCallback) {
            this.statusCallback(status, this.getStatus());
        }
    }

    /**
     * Imposta callback per notifiche di stato
     */
    setStatusCallback(callback) {
        this.statusCallback = callback;
    }

    /**
     * Ferma il sistema
     */
    stop() {
        this.isActive = false;
        console.log('🔌 RobustConnectionManager: Fermato');
    }
    
    /**
     * Resetta lo stato del connection manager
     */
    reset() {
        console.log('🔌 🔄 Reset RobustConnectionManager');
        
        this.isActive = false;
        this.reconnectAttempts = 0;
        
        // Reset connessioni
        this.connections = {
            supabase: false,
            vocabulary: false,
            aiMiddleware: false,
            requestMiddleware: false
        };
        
        // Reset istanze
        this.instances = {
            supabaseAI: null,
            vocabularyManager: null,
            aiMiddleware: null,
            requestMiddleware: null
        };
        
        console.log('🔌 ✅ RobustConnectionManager resettato');
    }
}

// Esporta globalmente
window.RobustConnectionManager = RobustConnectionManager;

// Crea istanza globale
window.robustConnectionManager = new RobustConnectionManager();

console.log('✅ RobustConnectionManager caricato');