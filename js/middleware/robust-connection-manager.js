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
        // Controlla ogni 5 secondi
        setInterval(() => {
            if (this.isActive) {
                this.checkConnections();
            }
        }, 5000);
        
        // Controllo approfondito ogni 30 secondi
        setInterval(() => {
            if (this.isActive) {
                this.deepConnectionCheck();
            }
        }, 30000);
    }

    /**
     * Tenta di stabilire tutte le connessioni
     */
    async attemptConnection() {
        console.log('🔌 RobustConnectionManager: Tentativo connessione', this.reconnectAttempts + 1);
        
        try {
            // Step 1: Supabase
            await this.connectSupabase();
            
            // Step 2: Vocabulary Manager
            await this.connectVocabulary();
            
            // Step 3: AI Middleware
            await this.connectAIMiddleware();
            
            // Step 4: Request Middleware
            await this.connectRequestMiddleware();
            
            // Step 5: Integrazione finale
            await this.finalizeIntegration();
            
            console.log('🔌 ✅ CONNESSIONE ROBUSTA COMPLETATA');
            this.notifyStatusChange('connected');
            
            return true;
            
        } catch (error) {
            console.error('🔌 ❌ Errore connessione:', error);
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
            const attempt = () => {
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
                } else {
                    console.log('🔌 ⏳ Attendo SupabaseAIIntegration...');
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
            const attempt = () => {
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
                } else {
                    console.log('🔌 ⏳ Attendo RequestMiddleware o SupabaseAI...');
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
            
            window.FlavioAIAssistant.sendMessage = async (message, isVoiceInput = false) => {
                console.log('🔌 🎯 Intercettazione ROBUSTA:', message);
                
                // Controlla se è una richiesta di dati
                if (this.isDataRequest(message)) {
                    console.log('🔌 🎯 Richiesta dati - uso middleware');
                    
                    try {
                        const response = await this.instances.requestMiddleware.processMessage(message);
                        if (response && response.success) {
                            console.log('🔌 ✅ Risposta da middleware:', response.response);
                            return response.response;
                        }
                    } catch (error) {
                        console.error('🔌 ❌ Errore middleware, fallback ad AI:', error);
                    }
                }
                
                // Fallback ad AI normale
                return originalSendMessage(message, isVoiceInput);
            };
            
            console.log('🔌 ✅ FlavioAIAssistant intercettato');
        }
    }

    /**
     * Verifica se è una richiesta di dati
     */
    isDataRequest(message) {
        const dataKeywords = [
            'ordini', 'clienti', 'prodotti', 'database', 'quanti', 'elenco', 'lista',
            'che ora', 'orario', 'data', 'oggi', 'ieri', 'domani'
        ];
        
        const lowerMessage = message.toLowerCase();
        return dataKeywords.some(keyword => lowerMessage.includes(keyword));
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
        
        // Se qualcosa è cambiato, riconnetti
        if (JSON.stringify(previousState) !== JSON.stringify(this.connections)) {
            console.log('🔌 🔄 Cambiamento stato connessioni:', this.connections);
            
            if (!this.isFullyConnected()) {
                console.log('🔌 🔄 Riconnessione automatica in corso...');
                this.attemptConnection();
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
        
        // Se qualcosa non funziona, riconnetti
        if (!Object.values(status).every(s => s)) {
            console.log('🔌 🔄 Riconnessione necessaria');
            this.attemptConnection();
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
                 this.instances.requestMiddleware.processMessage && 
                 typeof this.instances.requestMiddleware.processMessage === 'function');
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
}

// Esporta globalmente
window.RobustConnectionManager = RobustConnectionManager;

// Crea istanza globale
window.robustConnectionManager = new RobustConnectionManager();

console.log('✅ RobustConnectionManager caricato');