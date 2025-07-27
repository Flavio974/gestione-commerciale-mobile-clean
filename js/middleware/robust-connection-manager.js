/**
 * ROBUST CONNECTION MANAGER - v2025.07.26.21:15 - SINGLETON PATTERN ROBUSTO
 * Sistema di connessione robusta, duratura e costante per PC
 * Gestisce connessioni a Supabase e Vocabolario senza timeout
 * ✅ CHANGE: RequestMiddleware completamente rimosso
 * 🔒 CHANGE: Singleton Pattern robusto per evitare istanze multiple
 */

// 🔒 SINGLETON PATTERN ROBUSTO - Garantisce una sola istanza
let robustConnectionManagerInstance = null;

class RobustConnectionManager {
    constructor() {
        // Contatore globale per tracciare tentativi di creazione
        window.robustConnectionAttempts = (window.robustConnectionAttempts || 0) + 1;
        console.log(`🔌 Tentativo creazione RobustConnectionManager #${window.robustConnectionAttempts}`);
        
        // 🔒 SINGLETON: Se esiste già un'istanza, ritorna quella
        if (robustConnectionManagerInstance) {
            console.log('🔌 RobustConnectionManager: Riutilizzo istanza esistente');
            return robustConnectionManagerInstance;
        }
        
        console.log('🔌 RobustConnectionManager: Creazione NUOVA istanza (prima e unica)');
        
        this.isActive = false;
        this.connections = {
            supabase: false,
            vocabulary: false,
            aiMiddleware: false
        };
        
        this.instances = {
            supabaseAI: null,
            vocabularyManager: null,
            aiMiddleware: null
        };
        
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 50; // Tenta fino a 50 volte
        this.reconnectDelay = 2000; // 2 secondi tra i tentativi
        
        this.debug = true;
        this.statusCallback = null;
        
        console.log('🔌 RobustConnectionManager: Inizializzato (SINGLETON)');
        
        // 🔒 SINGLETON: Salva questa come unica istanza
        robustConnectionManagerInstance = this;
        
        // Esponi globalmente per debug
        window.RobustConnectionManagerInstance = this;
    }
    
    /**
     * 🔒 SINGLETON: Metodo statico per ottenere l'istanza unica
     */
    static getInstance() {
        if (!robustConnectionManagerInstance) {
            robustConnectionManagerInstance = new RobustConnectionManager();
        }
        return robustConnectionManagerInstance;
    }
    
    /**
     * 🔒 SINGLETON: Metodo per reset forzato (solo per debug)
     */
    static resetInstance() {
        console.warn('🔌 RobustConnectionManager: RESET FORZATO dell\'istanza');
        robustConnectionManagerInstance = null;
        window.RobustConnectionManagerInstance = null;
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
            
            // Step 4: Integrazione finale
            console.log('🔌 📋 Step 4: Finalizzazione integrazione...');
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
     * Connette AI Middleware con timeout e graceful degradation
     */
    async connectAIMiddleware() {
        return new Promise((resolve, reject) => {
            let attemptCount = 0;
            const maxAttempts = 60; // Max 30 seconds (60 * 500ms)
            
            const attempt = () => {
                attemptCount++;
                
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
                } else if (attemptCount >= maxAttempts) {
                    console.warn('🔌 ⚠️ Timeout connessione AIMiddleware dopo', maxAttempts, 'tentativi');
                    console.log('🔌 🔄 Sistema continua senza AIMiddleware (degraded mode)');
                    console.log('🔌 🔍 Debug - AIMiddleware disponibile:', !!window.AIMiddleware);
                    
                    // Graceful degradation - continua senza AIMiddleware
                    this.instances.aiMiddleware = null;
                    this.connections.aiMiddleware = false;
                    
                    resolve(); // Risolve comunque per permettere al sistema di continuare
                } else {
                    console.log(`🔌 ⏳ Attendo AIMiddleware... (${attemptCount}/${maxAttempts})`);
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
        
        // Collega il vocabulary manager all'AI middleware (se disponibile)
        if (this.instances.aiMiddleware && this.instances.vocabularyManager) {
            this.instances.aiMiddleware.vocabularyManager = this.instances.vocabularyManager;
            console.log('🔌 🔗 AIMiddleware collegato a VocabularyManager');
        } else if (!this.instances.aiMiddleware && this.instances.vocabularyManager) {
            console.log('🔌 ⚠️ AIMiddleware non disponibile - VocabularyManager funziona in modalità autonoma');
        }
        
        // Intercetta le funzioni AI per usare i middleware
        this.interceptAIFunctions();
        
        console.log('🔌 ✅ Integrazione finalizzata (degraded mode se AIMiddleware non disponibile)');
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
                console.log('🔌 🎯 Intercettazione ROBUSTA **VERSIONE MODIFICATA** - customMessage:', customMessage, 'isVoiceInput:', isVoiceInput);
                
                // 🛑 CONTROLLO BLOCCO - Se un comando è già stato completato, ignora
                if (window._vocabularyCommandCompleted) {
                    console.log('🛑 COMANDO GIÀ COMPLETATO - Blocco esecuzione multipla');
                    window._vocabularyCommandCompleted = false; // Reset per il prossimo comando
                    return;
                }
                
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
                        console.log('🔌 🔍 VERIFICA vocabularyMatch:', {
                            hasMatch: !!vocabularyMatch,
                            matchType: typeof vocabularyMatch,
                            matchValue: vocabularyMatch
                        });
                        
                        if (vocabularyMatch) {
                            console.log('🔌 📚 Match trovato nel vocabolario:', vocabularyMatch);
                            
                            // 🚀 NUOVO: Controlla se è un comando locale dal .txt
                            if (vocabularyMatch.command.executeLocal && vocabularyMatch.command.source === 'txt') {
                                console.log('🏠 ⚡ ESECUZIONE LOCALE DIRETTA per comando del .txt:', vocabularyMatch.command.id);
                                
                                window.FlavioAIAssistant.addMessage('🏠 Eseguendo comando locale...', 'assistant', true);
                                
                                try {
                                    const vocabularyManager = this.instances.vocabularyManager;
                                    if (vocabularyManager && vocabularyManager.executeLocalCommand) {
                                        const result = await vocabularyManager.executeLocalCommand(vocabularyMatch.command, message);
                                        
                                        // Rimuovi messaggio di caricamento
                                        const messagesContainer = document.getElementById('ai-messages');
                                        if (messagesContainer && messagesContainer.lastElementChild) {
                                            messagesContainer.removeChild(messagesContainer.lastElementChild);
                                        }
                                        
                                        // Aggiungi risposta
                                        window.FlavioAIAssistant.addMessage(result.response, 'assistant');
                                        
                                        console.log('🏠 ✅ ESECUZIONE LOCALE COMPLETATA:', result.response);
                                        console.log('🛑 STOP - Comando gestito localmente, no AI esterna');
                                        
                                        // 🔊 SINTESI VOCALE se è input vocale
                                        if (isVoiceInput && window.FlavioAIAssistant.speakResponse) {
                                            console.log('🔊 Attivazione sintesi vocale per risposta locale');
                                            window.FlavioAIAssistant.speakResponse(result.response);
                                        }
                                        
                                        return; // BLOCCO TOTALE - Comando eseguito localmente
                                    }
                                } catch (error) {
                                    console.error('🏠 ❌ Errore esecuzione locale:', error);
                                    // Fallback ai sistemi normali se l'esecuzione locale fallisce
                                }
                            }
                            
                            // 🚀 ESEGUI COMANDO VOCABOLARIO NORMALE (non locale)
                            console.log('🔌 ⚡ ESECUZIONE COMANDO VOCABOLARIO:', vocabularyMatch.command.id);
                            
                            // 🛑 BLOCCO IMMEDIATO - VocabularyManager ha PRIORITÀ ASSOLUTA
                            if (vocabularyMatch.command.id === 'count_clients') {
                                console.log('🛑 PRIORITÀ ASSOLUTA: Conteggio clienti dal VocabularyManager');
                                
                                // Esegui DIRETTAMENTE handleCountClients
                                const aiMiddleware = this.instances.aiMiddleware;
                                if (aiMiddleware && aiMiddleware.handleCountClients) {
                                    window.FlavioAIAssistant.addMessage('📚 Conteggio clienti in corso...', 'assistant', true);
                                    
                                    const response = await aiMiddleware.handleCountClients({}, message, null);
                                    
                                    // Rimuovi messaggio di caricamento e aggiungi risposta
                                    const messagesContainer = document.getElementById('ai-messages');
                                    if (messagesContainer && messagesContainer.lastElementChild) {
                                        messagesContainer.removeChild(messagesContainer.lastElementChild);
                                    }
                                    
                                    window.FlavioAIAssistant.addMessage(response, 'assistant');
                                    
                                    console.log('🛑 ✅ RISPOSTA DIRETTA DAL VOCABULARYMANAGER:', response);
                                    console.log('🛑 STOP TOTALE - Nessun altro sistema può intervenire');
                                    return; // BLOCCO TOTALE
                                }
                            }
                            
                            // Aggiungi messaggio di caricamento per il comando vocabolario
                            window.FlavioAIAssistant.addMessage('📚 Eseguendo comando dal vocabolario...', 'assistant', true);
                            
                            try {
                                // Usa AIMiddleware per eseguire il comando (se disponibile)
                                if (this.instances.aiMiddleware && this.instances.aiMiddleware.executeLocalAction) {
                                    const result = await this.instances.aiMiddleware.executeLocalAction(vocabularyMatch, message, null);
                                    console.log('🔌 ✅ Risultato comando vocabolario:', result);
                                    console.log('🔌 🔍 DEBUG result details:', {
                                        hasResult: !!result,
                                        resultType: typeof result,
                                        hasResponse: !!(result && result.response),
                                        responseValue: result?.response,
                                        fullResult: result
                                    });
                                    
                                    if (result && result.response) {
                                        // Rimuovi messaggio di caricamento
                                        const messagesContainer = document.getElementById('ai-messages');
                                        if (messagesContainer && messagesContainer.lastElementChild) {
                                            messagesContainer.removeChild(messagesContainer.lastElementChild);
                                        }
                                        
                                        // Aggiungi risposta del vocabolario
                                        window.FlavioAIAssistant.addMessage(result.response, 'assistant');
                                        
                                        // 🔊 SINTESI VOCALE se è input vocale
                                        if (isVoiceInput && window.FlavioAIAssistant.speakResponse) {
                                            console.log('🔊 Attivazione sintesi vocale per risposta vocabolario');
                                            window.FlavioAIAssistant.speakResponse(result.response);
                                        }
                                        
                                        console.log('🔌 🚀 COMANDO VOCABOLARIO ESEGUITO CON SUCCESSO - BLOCCO FLUSSO');
                                        
                                        // 🛑 BLOCCO FORZATO - IMPEDISCI QUALSIASI ALTRA ESECUZIONE
                                        console.log('🛑 STOP DEFINITIVO - Nessun altro sistema deve intervenire');
                                        
                                        // Marca che il comando è stato completato
                                        window._vocabularyCommandCompleted = true;
                                        
                                        return; // STOP - comando eseguito con successo
                                    }
                                } else {
                                    console.warn('🔌 ⚠️ AIMiddleware non disponibile per comando vocabolario');
                                    console.log('🔌 🔄 Fallback: Uso VocabularyManager diretto per comando:', vocabularyMatch.command.id);
                                    
                                    // Fallback diretto al VocabularyManager
                                    if (this.instances.vocabularyManager && this.instances.vocabularyManager.executeDirectCommand) {
                                        const result = await this.instances.vocabularyManager.executeDirectCommand(vocabularyMatch, message);
                                        if (result && result.response) {
                                            // Rimuovi messaggio di caricamento
                                            const messagesContainer = document.getElementById('ai-messages');
                                            if (messagesContainer && messagesContainer.lastElementChild) {
                                                messagesContainer.removeChild(messagesContainer.lastElementChild);
                                            }
                                            
                                            window.FlavioAIAssistant.addMessage(result.response, 'assistant');
                                            
                                            if (isVoiceInput && window.FlavioAIAssistant.speakResponse) {
                                                window.FlavioAIAssistant.speakResponse(result.response);
                                            }
                                            
                                            console.log('🔌 ✅ Comando eseguito via VocabularyManager diretto');
                                            return;
                                        }
                                    }
                                }
                            } catch (error) {
                                console.error('🔌 ❌ Errore esecuzione comando vocabolario:', error);
                            }
                            
                            // Se l'esecuzione fallisce, pulisci e mostra messaggio informativo
                            const messagesContainer = document.getElementById('ai-messages');
                            if (messagesContainer && messagesContainer.lastElementChild) {
                                messagesContainer.removeChild(messagesContainer.lastElementChild);
                            }
                            
                            // Informa l'utente che il comando è riconosciuto ma non può essere eseguito
                            const commandName = vocabularyMatch.command?.description || vocabularyMatch.command?.id || 'comando';
                            const degradedMessage = `⚠️ Ho riconosciuto il comando "${commandName}" ma il sistema di elaborazione non è al momento disponibile. Il sistema funziona in modalità limitata.`;
                            
                            window.FlavioAIAssistant.addMessage(degradedMessage, 'assistant');
                            
                            if (isVoiceInput && window.FlavioAIAssistant.speakResponse) {
                                window.FlavioAIAssistant.speakResponse('Comando riconosciuto ma sistema di elaborazione non disponibile');
                            }
                            
                            console.log('🔌 ⚠️ Esecuzione comando vocabolario fallita - messaggio informativo inviato');
                            return; // Stop qui per evitare fallback all'AI
                        }
                    } catch (error) {
                        console.error('🔌 ❌ Errore nel controllo vocabolario:', error);
                    }
                }
                
                // 🔄 VOCABOLARIO NON HA GESTITO - CONTROLLA SUGGERIMENTI PRIMA DI AI
                console.log('🔌 🎯 Vocabolario non ha gestito la richiesta, controllo suggerimenti...');
                
                // 🚀 NUOVO: Controlla se la query è simile a comandi esistenti
                if (this.instances.vocabularyManager && this.instances.vocabularyManager.detectSimilarQueries) {
                    try {
                        const similarQueries = this.instances.vocabularyManager.detectSimilarQueries(message);
                        
                        if (similarQueries) {
                            console.log('🎯 Query simile ai dati locali rilevata:', similarQueries);
                            
                            const educationalMessage = this.instances.vocabularyManager.generateEducationalMessage(message, similarQueries);
                            
                            if (educationalMessage) {
                                console.log('📚 Invio messaggio educativo per aggiornamento vocabolario');
                                
                                window.FlavioAIAssistant.addMessage(educationalMessage, 'assistant');
                                
                                // 🔊 SINTESI VOCALE per messaggio educativo
                                if (isVoiceInput && window.FlavioAIAssistant.speakResponse) {
                                    const speechText = `Query sui dati locali rilevata. Per ottenere una risposta precisa, aggiungi il comando suggerito alla scheda Comandi dell'app.`;
                                    window.FlavioAIAssistant.speakResponse(speechText);
                                }
                                
                                console.log('🛑 STOP - Messaggio educativo inviato, nessun fallback AI');
                                return;
                            }
                        }
                    } catch (error) {
                        console.error('❌ Errore controllo suggerimenti:', error);
                    }
                }
                
                // 🔄 NESSUN SUGGERIMENTO - FALLBACK DIRETTO ALL'AI
                console.log('🔌 🎯 Nessun suggerimento trovato, fallback diretto all\'AI');
                
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
     * Controlla lo stato delle connessioni
     */
    checkConnections() {
        const previousState = { ...this.connections };
        
        this.connections.supabase = !!(window.supabaseAI && this.instances.supabaseAI);
        this.connections.vocabulary = !!(window.vocabularyManager && this.instances.vocabularyManager);
        this.connections.aiMiddleware = !!(window.aiMiddleware && this.instances.aiMiddleware);
        
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
            aiMiddleware: this.testAIMiddlewareConnection()
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
                aiMiddleware: !!this.instances.aiMiddleware
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
            aiMiddleware: false
        };
        
        // Reset istanze
        this.instances = {
            supabaseAI: null,
            vocabularyManager: null,
            aiMiddleware: null
        };
        
        console.log('🔌 ✅ RobustConnectionManager resettato');
    }
}

// Esporta globalmente
window.RobustConnectionManager = RobustConnectionManager;

// 🔒 SINGLETON: Crea istanza globale usando getInstance()
window.robustConnectionManager = RobustConnectionManager.getInstance();

console.log('✅ RobustConnectionManager caricato');