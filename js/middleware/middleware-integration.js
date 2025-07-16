/**
 * Middleware Integration - Integra il middleware con l'applicazione esistente
 * REQUISITO CRITICO: NON MODIFICARE IL CODICE ESISTENTE
 * Usa il pattern decorator per intercettare le richieste
 */

// ✅ DEBUG SNIPPET: Test caricamento moduli temporal  
window.testTemporalLoad = function(modulePath = 'config/temporal-settings.js') {
    console.log('🧪 [TEMPORAL TEST] Testing load for:', modulePath);
    
    const url = new URL(modulePath, window.location.origin + '/').href;
    console.log('🔍 [TEMPORAL TEST] Resolved URL:', url);
    
    fetch(url)
        .then(r => {
            console.log('📡 [TEMPORAL TEST] Response:', r.status, r.headers.get('content-type'));
            return r.text();
        })
        .then(t => {
            const first60 = t.slice(0, 60);
            console.log('📄 [TEMPORAL TEST] First 60 chars:', first60);
            
            if (first60.includes('<!DOCTYPE') || first60.includes('<html')) {
                console.error('❌ [TEMPORAL TEST] PROBLEMA: Ricevuto HTML invece di JS!');
                console.error('💡 [TEMPORAL TEST] Suggerimento: Verifica netlify.toml redirects');
            } else if (first60.includes('console.log') || first60.includes('const ') || first60.includes('/**')) {
                console.log('✅ [TEMPORAL TEST] SUCCESS: File JS valido ricevuto');
            } else {
                console.warn('⚠️ [TEMPORAL TEST] Contenuto inaspettato - verifica manualmente');
            }
        })
        .catch(err => {
            console.error('💥 [TEMPORAL TEST] Errore fetch:', err);
        });
};

// ✅ VERIFICA LAMPO: URL effettivo che fallisce
window.testTemporalURL = async function() {
    try {
        const u = new URL('./config/temporal-settings.js', window.location.origin + '/').href;
        const r = await fetch(u, {cache:'no-store'});
        console.log('[TEST] URL:', u,
                    '| status', r.status,
                    '| type', r.headers.get('content-type'));
        const text = await r.text();
        console.log('[TEST] first bytes:', text.slice(0,40));
        
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            console.error('❌ [TEST] CONFERMATO: Server restituisce HTML invece di JS!');
            console.error('💡 [TEST] Causa: Service Worker intercetta o Worker context sbagliato');
        } else {
            console.log('✅ [TEST] JS valido ricevuto');
        }
    } catch(e) { 
        console.error('[TEST] fetch error', e); 
    }
};

// ✅ QUICK TEST BATCH: Test tutti i moduli temporal problematici
window.testAllTemporalModules = function() {
    console.log('🚀 [BATCH TEST] Testing all temporal modules...');
    
    const modules = [
        'config/temporal-settings.js',
        'js/middleware/vocabulary-manager.js',
        'js/data/italian-date-system.js',
        'js/utils/temporal-parser.js',
        'js/middleware/temporal-integration.js',
        'js/middleware/ai-date-corrector.js'
    ];
    
    modules.forEach((module, index) => {
        setTimeout(() => {
            console.log(`\n📋 [${index + 1}/${modules.length}] Testing: ${module}`);
            window.testTemporalLoad(module);
        }, index * 1000); // 1 secondo tra test per leggibilità
    });
};

class MiddlewareIntegration {
    constructor() {
        this.middleware = null;
        this.originalAIFunction = null;
        this.isActive = false;
        this.debug = true;
        this.lastTTSTime = null; // Protezione anti-doppia lettura TTS
        this.stats = {
            totalRequests: 0,
            vocabularyMatches: 0,
            aiFallbacks: 0,
            errors: 0
        };
        
        console.log('🔌 MiddlewareIntegration: Inizializzato');
    }

    /**
     * Inizializza e attiva il middleware
     */
    async initialize() {
        try {
            console.log('🔌 Step 1: Caricamento dipendenze...');
            // Carica tutte le dipendenze
            await this.loadDependencies();
            console.log('🔌 Step 1: ✅ Dipendenze caricate');
            
            console.log('🔌 Step 2: Attesa Supabase...');
            // Aspetta che SupabaseAI sia disponibile
            await this.waitForSupabase();
            console.log('🔌 Step 2: ✅ Supabase pronto');
            
            console.log('🔌 Step 3: Creazione AIMiddleware...');
            // Crea istanza del middleware con Supabase
            if (!window.AIMiddleware) {
                throw new Error('AIMiddleware non disponibile');
            }
            
            this.middleware = new AIMiddleware();
            // Esporta globalmente per debug
            window.aiMiddleware = this.middleware;
            console.log('🔌 Step 3: ✅ AIMiddleware creato');
            
            console.log('🔌 Step 4: Collegamento Supabase...');
            // Passa il riferimento a Supabase se disponibile
            if (window.supabaseAI && window.RequestMiddleware) {
                this.middleware.requestMiddleware = new RequestMiddleware(window.supabaseAI);
                // Esporta globalmente per debug
                window.requestMiddleware = this.middleware.requestMiddleware;
                console.log('🔌 💾 Middleware collegato a Supabase');
            } else {
                if (!window.RequestMiddleware) {
                    console.warn('🔌 ⚠️ RequestMiddleware non disponibile');
                }
                if (!window.supabaseAI) {
                    console.warn('🔌 ⚠️ Supabase non disponibile');
                }
                console.warn('🔌 ⚠️ Middleware funziona solo con vocabolario');
            }
            console.log('🔌 Step 4: ✅ Collegamento completato');
            
            console.log('🔌 Step 5: Decorazione funzioni AI...');
            // Trova e decora la funzione AI esistente
            this.decorateAIFunction();
            console.log('🔌 Step 5: ✅ Funzioni AI decorate');
            
            console.log('🔌 Step 6: Attivazione middleware...');
            // Attiva il middleware
            this.isActive = true;
            
            if (this.debug) {
                console.log('🔌 ✅ MIDDLEWARE ATTIVATO');
                console.log('🔌 📊 Statistiche middleware:', this.middleware.getStats());
            }
            
            return true;
        } catch (error) {
            console.error('❌ Errore inizializzazione middleware:', error);
            console.error('❌ Stack trace:', error.stack);
            console.error('❌ Dettagli errore:', {
                message: error.message,
                name: error.name,
                line: error.lineNumber,
                column: error.columnNumber
            });
            return false;
        }
    }

    /**
     * Aspetta che VocabularyManager sia disponibile
     */
    async waitForVocabularyManager() {
        return new Promise((resolve) => {
            const checkVocabulary = () => {
                if (window.VocabularyManager) {
                    console.log('🔌 📚 VocabularyManager trovato per middleware');
                    resolve();
                } else {
                    console.log('🔌 ⏳ Attendo VocabularyManager...');
                    setTimeout(checkVocabulary, 500);
                }
            };
            
            // Verifica immediatamente
            checkVocabulary();
            
            // Timeout dopo 10 secondi
            setTimeout(() => {
                console.warn('🔌 ⚠️ Timeout attesa VocabularyManager - procedo comunque');
                resolve();
            }, 10000);
        });
    }

    /**
     * Aspetta che Supabase sia disponibile
     */
    async waitForSupabase() {
        return new Promise((resolve) => {
            const checkSupabase = () => {
                if (window.supabaseAI || window.SupabaseAIIntegration) {
                    console.log('🔌 💾 Supabase trovato per middleware');
                    
                    // Se esiste SupabaseAIIntegration ma non l'istanza, creala
                    if (window.SupabaseAIIntegration && !window.supabaseAI) {
                        console.log('🔌 💾 Creando istanza SupabaseAI per middleware');
                        window.supabaseAI = new SupabaseAIIntegration();
                    }
                    
                    resolve();
                } else {
                    console.log('🔌 ⏳ Attendo Supabase...');
                    setTimeout(checkSupabase, 500);
                }
            };
            
            // Verifica immediatamente
            checkSupabase();
            
            // Timeout dopo 10 secondi
            setTimeout(() => {
                console.warn('🔌 ⚠️ Timeout attesa Supabase - procedo senza DB');
                resolve();
            }, 10000);
        });
    }

    /**
     * Carica tutte le dipendenze necessarie
     */
    async loadDependencies() {
        // Attendi che VocabularyManager sia disponibile
        await this.waitForVocabularyManager();
        
        const dependencies = [
            // 'js/middleware/vocabulary-manager.js', // Già caricato dal sistema principale
            // 'js/middleware/temporal-parser.js', // ❌ DISABILITATO - Causava duplicati
            'js/middleware/ai-middleware.js'
        ];
        
        for (const dep of dependencies) {
            if (window.safeLoad && !this.isScriptLoaded(dep)) {
                console.log('🔧 [MIDDLEWARE] Loading dependency with safeLoad:', dep);
                await window.safeLoad(dep);
            } else if (!this.isScriptLoaded(dep)) {
                // Fallback al metodo vecchio se safeLoad non disponibile
                const absoluteUrl = dep.startsWith('http') ? dep : 
                                   `${window.location.origin}/${dep.replace(/^\.?\//, '')}`;
                console.log('🔧 [MIDDLEWARE] Loading dependency (fallback):', absoluteUrl);
                await this.loadScript(absoluteUrl);
            }
        }
    }

    /**
     * Controlla se uno script è già caricato
     */
    isScriptLoaded(src) {
        const scripts = document.querySelectorAll('script');
        return Array.from(scripts).some(script => script.src.includes(src));
    }

    /**
     * Carica uno script dinamicamente con path assoluto
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            
            // ✅ FIX ASSOLUTO: Usa sempre URL completo per evitare contesto blob/worker
            if (src.startsWith('http')) {
                script.src = src;
            } else {
                // Forza URL assoluto eliminando ./ e /
                const cleanPath = src.replace(/^\.?\//, '');
                script.src = `${window.location.origin}/${cleanPath}`;
                console.log('🔧 [LOADSCRIPT] Absolute path:', src, '→', script.src);
            }
            
            script.async = true;
            
            // CRITICAL FIX: Rileva moduli ES6 e imposta type="module"
            const isES6Module = src.includes('temporal') || 
                               src.includes('middleware') ||
                               src.includes('semantic') ||
                               src.includes('parser') ||
                               /\.(mjs|module\.js)$/.test(src);
            
            if (isES6Module) {
                script.type = 'module';
                console.log('📦 Caricamento modulo ES6 in middleware-integration:', src);
            }
            
            script.onload = () => resolve(script);
            script.onerror = () => reject(new Error(`Errore caricamento script: ${src}`));
            document.head.appendChild(script);
        });
    }

    /**
     * Decora la funzione AI esistente per intercettare le richieste
     */
    decorateAIFunction() {
        // Intercetta FlavioAIAssistant
        this.interceptFlavioAIAssistant();
        
        // Trova la funzione AI esistente nell'applicazione
        if (window.sendAIRequest) {
            this.originalAIFunction = window.sendAIRequest;
            window.sendAIRequest = this.createDecoratedFunction(this.originalAIFunction);
            console.log('🔌 ✅ Funzione sendAIRequest decorata');
        }
        
        // Controlla altri possibili punti di integrazione
        this.findAndDecorateAIFunctions();
    }

    /**
     * Intercetta specificamente FlavioAIAssistant
     */
    interceptFlavioAIAssistant() {
        // Aspetta che FlavioAIAssistant sia disponibile e completamente inizializzato
        const checkInterval = setInterval(() => {
            if (window.flavioAI && window.flavioAI.isInitialized) {
                clearInterval(checkInterval);
                
                // Trova l'istanza
                const aiInstance = window.flavioAI;
                
                if (aiInstance && aiInstance.sendMessage) {
                    // Salva metodo originale
                    const originalSendMessage = aiInstance.sendMessage.bind(aiInstance);
                    
                    // Sostituisci con versione decorata
                    aiInstance.sendMessage = async (message, isVoiceInput = false) => {
                        if (this.debug) {
                            console.log('🔌 🎯 INTERCETTAZIONE FLAVIO AI:', message);
                            console.log('🔌 🔍 Parametri ricevuti:', arguments.length, 'args:', [...arguments]);
                            console.log('🔌 🔍 Tipo messaggio:', typeof message, 'valore:', message);
                            console.log('🔌 🔍 Stack trace:', new Error().stack);
                        }
                        
                        // Se il messaggio non è passato come parametro, leggi dall'input field
                        if (!message || typeof message !== 'string') {
                            const input = document.getElementById('ai-input');
                            if (input) {
                                message = input.value.trim();
                                isVoiceInput = false; // Chiaramente input da tastiera
                                console.log('🔌 📝 Messaggio letto dall\'input field:', message);
                            }
                        }
                        
                        // Se ancora non c'è messaggio, passa all'AI originale
                        if (!message || typeof message !== 'string') {
                            console.log('🔌 ⚠️ Nessun messaggio disponibile, passa all\'AI originale');
                            return originalSendMessage(message, isVoiceInput);
                        }
                        
                        // ✅ LOGICA INTELLIGENTE: MIDDLEWARE PER DATI, AI PER CREATIVITÀ
                        const providerSelect = document.getElementById('ai-provider-select');
                        const hasProviderSelected = providerSelect && providerSelect.value && aiInstance.baseAssistant?.currentProvider;
                        
                        // 🔍 ANALIZZA IL TIPO DI RICHIESTA
                        const isDataRequest = this.isDataRelatedQuery(message);
                        
                        if (hasProviderSelected && !isDataRequest) {
                            console.log('🔌 🎯 PROVIDER SELEZIONATO:', providerSelect.value, '- BYPASS MIDDLEWARE (richiesta creativa)');
                        } else if (isDataRequest) {
                            console.log('🔌 🎯 RICHIESTA DATI RILEVATA - USA MIDDLEWARE (gratis)', {
                                hasProvider: hasProviderSelected,
                                provider: providerSelect?.value || 'none'
                            });
                            
                            // Gestisci richiesta di dati con middleware
                            try {
                                const dataResponse = await this.handleDataRequest(message);
                                if (dataResponse) {
                                    console.log('🔌 ✅ Risposta da middleware (gratis):', dataResponse);
                                    return dataResponse;
                                }
                            } catch (error) {
                                console.error('🔌 ❌ Errore middleware, fallback ad AI:', error);
                                // Continua con AI come fallback
                            }
                        }
                        
                        if (hasProviderSelected && !isDataRequest) {
                            console.log('🔌 🎯 PROVIDER SELEZIONATO:', providerSelect.value, '- BYPASS MIDDLEWARE (richiesta creativa)');
                            
                            // ✅ AGGIUNGI CONTESTO PROVIDER PER IDENTIFICAZIONE
                            let contextualMessage = message;
                            let providerContext = '';
                            
                            if (message.toLowerCase().includes('modello') || message.toLowerCase().includes('ai') || 
                                message.toLowerCase().includes('sistema') || message.toLowerCase().includes('utilizzando') ||
                                message.toLowerCase().includes('quale')) {
                                
                                if (providerSelect.value === 'openai') {
                                    // ✅ LEGGI IL MODELLO EFFETTIVAMENTE SELEZIONATO DALL'UTENTE
                                    const modelSelect = document.getElementById('ai-model');
                                    const selectedModel = modelSelect ? modelSelect.value : 'gpt-4';
                                    
                                    // Mappa il valore del select al nome del modello per l'AI
                                    let modelName = selectedModel;
                                    if (selectedModel === 'gpt-4') {
                                        modelName = 'GPT-4';
                                    } else if (selectedModel === 'o1-preview') {
                                        modelName = 'o1-preview';
                                    } else if (selectedModel === 'gpt-4o-mini') {
                                        modelName = 'GPT-4o-mini';
                                    }
                                    
                                    providerContext = `[CONTESTO: Sei specificamente il modello ${modelName} di OpenAI. Quando chiesto del modello, rispondi esattamente: "Sono ${modelName} di OpenAI".] `;
                                    console.log('🔌 🎯 Usando modello selezionato dall\'utente:', modelName);
                                } else if (providerSelect.value === 'anthropic') {
                                    // ✅ LEGGI IL MODELLO EFFETTIVAMENTE SELEZIONATO DALL'UTENTE
                                    const modelSelect = document.getElementById('ai-model');
                                    const selectedModel = modelSelect ? modelSelect.value : 'claude-3-5-sonnet-20241022';
                                    
                                    // Mappa il valore del select al nome del modello per l'AI
                                    let modelName = selectedModel;
                                    if (selectedModel === 'claude-3-5-sonnet-20241022') {
                                        modelName = 'Claude-3.5-Sonnet';
                                    } else if (selectedModel === 'claude-3-haiku-20240307') {
                                        modelName = 'Claude-3-Haiku';
                                    }
                                    
                                    providerContext = `[CONTESTO: Sei specificamente il modello ${modelName} di Anthropic. Quando chiesto del modello, rispondi esattamente: "Sono ${modelName} di Anthropic".] `;
                                    console.log('🔌 🎯 Usando modello selezionato dall\'utente:', modelName);
                                }
                                
                                if (providerContext) {
                                    contextualMessage = providerContext + message;
                                    console.log('🔌 🤖 Contesto provider aggiunto al messaggio');
                                }
                            }
                            
                            // Invia messaggio con contesto alla funzione originale
                            const result = await originalSendMessage(contextualMessage, isVoiceInput);
                            
                            // ✅ NASCONDE IL CONTESTO DALLA RISPOSTA MOSTRATA ALL'UTENTE
                            if (providerContext && result && typeof result === 'string') {
                                // Rimuovi il contesto dall'output mostrato all'utente
                                const cleanMessage = message; // Il messaggio originale senza contesto
                                
                                // Aggiorna l'UI con il messaggio pulito
                                if (aiInstance.updateChatUI) {
                                    aiInstance.updateChatUI(cleanMessage, result);
                                }
                                
                                console.log('🔌 🧹 Contesto nascosto dalla chat utente');
                            }
                            
                            return result;
                        }
                        
                        // Processa con middleware solo se nessun provider è selezionato
                        const middlewareResult = await this.middleware.processRequest(message);
                        
                        if (middlewareResult.continueWithAI) {
                            // Continua con AI originale
                            console.log('🔌 🔄 FALLBACK AD AI ORIGINALE');
                            return originalSendMessage(message, isVoiceInput);
                        } else if (middlewareResult.success) {
                            // Gestisci risposta middleware
                            console.log('🔌 ✅ RISPOSTA MIDDLEWARE:', middlewareResult.response);
                            this.handleFlavioAIResponse(aiInstance, message, middlewareResult, isVoiceInput);
                            return middlewareResult;
                        } else {
                            // Fallback con log
                            console.log('🔌 ❌ MIDDLEWARE FALLITO - FALLBACK AD AI');
                            return originalSendMessage(message, isVoiceInput);
                        }
                    };
                    
                    console.log('🔌 ✅ FlavioAIAssistant.sendMessage intercettato');
                } else {
                    console.log('🔌 ⚠️ Istanza FlavioAIAssistant non trovata');
                }
            }
        }, 500);
        
        // Timeout dopo 10 secondi
        setTimeout(() => clearInterval(checkInterval), 10000);
    }

    /**
     * Gestisce risposta per FlavioAIAssistant
     */
    handleFlavioAIResponse(aiInstance, userMessage, middlewareResult, isVoiceInput = false) {
        // Inizializza messages se non esiste
        if (!aiInstance.messages) {
            aiInstance.messages = [];
        }
        
        // Aggiungi messaggio utente alla chat
        aiInstance.messages.push({
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString()
        });
        
        // Aggiungi risposta middleware
        aiInstance.messages.push({
            role: 'assistant', 
            content: middlewareResult.response,
            timestamp: new Date().toISOString(),
            source: 'middleware'
        });
        
        // Salva cronologia
        localStorage.setItem('ai_chat_history', JSON.stringify(aiInstance.messages));
        
        // Aggiorna UI usando il metodo corretto di FlavioAIAssistant
        if (aiInstance.addMessage) {
            aiInstance.addMessage(userMessage, 'user');
            aiInstance.addMessage(middlewareResult.response, 'assistant');
            console.log('🔌 ✅ UI aggiornata con messaggio middleware');
        } else {
            console.warn('🔌 ⚠️ aiInstance.addMessage non disponibile');
        }
        
        // Pulisci input field se è input testuale
        if (!isVoiceInput) {
            const input = document.getElementById('ai-input');
            if (input) {
                input.value = '';
                console.log('🔌 🧹 Input field pulito');
            }
        }
        
        // Gestisci TTS solo per input vocale
        if (isVoiceInput && aiInstance.speakResponse) {
            console.log('🔌 🔊 TTS attivato per input vocale');
            aiInstance.speakResponse(middlewareResult.response);
        } else {
            console.log('🔌 🔇 TTS disattivato per input testuale');
        }
    }

    /**
     * Cerca e decora altre funzioni AI nell'applicazione
     */
    findAndDecorateAIFunctions() {
        const possibleFunctions = [
            'handleAIRequest',
            'processAIQuery',
            'submitAIRequest',
            'callAI',
            'aiRequest'
        ];
        
        possibleFunctions.forEach(funcName => {
            if (window[funcName] && typeof window[funcName] === 'function') {
                const originalFunc = window[funcName];
                window[funcName] = this.createDecoratedFunction(originalFunc);
                console.log(`🔌 ✅ Funzione ${funcName} decorata`);
            }
        });
    }

    /**
     * Crea una funzione decorata che intercetta le richieste
     */
    createDecoratedFunction(originalFunction) {
        return async (...args) => {
            if (!this.isActive) {
                return originalFunction.apply(this, args);
            }
            
            try {
                this.stats.totalRequests++;
                
                // Estrai il messaggio utente dai parametri
                const userMessage = this.extractUserMessage(args);
                
                if (!userMessage) {
                    // Se non riesco a estrarre il messaggio, usa funzione originale
                    return originalFunction.apply(this, args);
                }
                
                if (this.debug) {
                    console.log('🔌 🚀 INTERCETTAZIONE RICHIESTA:', userMessage);
                }
                
                // Processa la richiesta con il middleware
                const middlewareResult = await this.middleware.processRequest(userMessage, args);
                
                if (middlewareResult.continueWithAI) {
                    // Il middleware richiede di continuare con l'AI
                    this.stats.aiFallbacks++;
                    return originalFunction.apply(this, args);
                } else if (middlewareResult.success) {
                    // Il middleware ha gestito la richiesta - NON CHIAMARE L'AI ORIGINALE
                    this.stats.vocabularyMatches++;
                    
                    // *** IMPORTANTE: GESTISCI LA RISPOSTA DIRETTAMENTE SENZA CHIAMARE AI ***
                    this.handleMiddlewareResponse(middlewareResult, userMessage);
                    
                    // Ritorna subito per prevenire doppia esecuzione
                    return middlewareResult;
                } else {
                    // Errore nel middleware, fallback
                    this.stats.errors++;
                    return originalFunction.apply(this, args);
                }
                
            } catch (error) {
                console.error('❌ Errore nel middleware decorator:', error);
                this.stats.errors++;
                
                // Fallback alla funzione originale
                return originalFunction.apply(this, args);
            }
        };
    }

    /**
     * Estrae il messaggio utente dai parametri della funzione
     */
    extractUserMessage(args) {
        // Cerca il messaggio in diverse posizioni comuni
        for (const arg of args) {
            if (typeof arg === 'string' && arg.length > 0) {
                return arg;
            }
            if (typeof arg === 'object' && arg !== null) {
                if (arg.message) return arg.message;
                if (arg.query) return arg.query;
                if (arg.input) return arg.input;
                if (arg.text) return arg.text;
            }
        }
        
        // Se non trovato nei parametri, prova a leggere dall'input field
        const input = document.getElementById('ai-input');
        if (input && input.value.trim()) {
            console.log('🔌 📝 Messaggio estratto dall\'input field:', input.value.trim());
            return input.value.trim();
        }
        
        return null;
    }

    /**
     * Formatta la risposta del middleware per l'applicazione
     */
    formatMiddlewareResponse(middlewareResult) {
        // Simula il formato di risposta dell'AI originale
        return {
            success: true,
            response: middlewareResult.response,
            source: middlewareResult.source,
            processingTime: middlewareResult.processingTime,
            data: middlewareResult.data
        };
    }

    /**
     * Gestisce la risposta del middleware direttamente nell'UI
     * CRITICO: Evita doppia esecuzione gestendo la risposta direttamente
     */
    handleMiddlewareResponse(middlewareResult, userMessage) {
        try {
            if (this.debug) {
                console.log('🔌 📱 GESTIONE DIRETTA RISPOSTA MIDDLEWARE (anti-doppia lettura)');
            }
            
            // Trova l'interfaccia AI per mostrare la risposta
            const aiContainer = document.querySelector('#ai-content .ai-messages, .ai-chat-messages, .messages-container');
            
            if (aiContainer) {
                // Aggiungi messaggio utente
                this.addMessageToUI(aiContainer, userMessage, 'user');
                
                // Aggiungi risposta middleware
                this.addMessageToUI(aiContainer, middlewareResult.response, 'assistant');
                
                // Gestisci TTS per iPad (UNA SOLA VOLTA)
                this.handleTTSResponse(middlewareResult.response);
                
                // Scroll in fondo
                aiContainer.scrollTop = aiContainer.scrollHeight;
                
                if (this.debug) {
                    console.log('🔌 ✅ RISPOSTA MIDDLEWARE GESTITA DIRETTAMENTE');
                }
            } else {
                console.warn('🔌 ⚠️ Container AI non trovato per gestione diretta');
            }
            
        } catch (error) {
            console.error('❌ Errore gestione risposta middleware:', error);
        }
    }

    /**
     * Aggiunge messaggio all'interfaccia utente
     */
    addMessageToUI(container, message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${type}`;
        messageDiv.innerHTML = `
            <div class="ai-message-content">
                <div class="ai-message-text">${message}</div>
                <div class="ai-message-time">${new Date().toLocaleTimeString('it-IT')}</div>
            </div>
        `;
        container.appendChild(messageDiv);
    }

    /**
     * Gestisce TTS per iPad (UNA SOLA VOLTA)
     */
    handleTTSResponse(response) {
        // Controlla se è iPad
        const isIPad = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document) ||
                      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ||
                      // Supporto per Chrome DevTools Device Emulation
                      (navigator.maxTouchPoints > 0 && /Mobile/.test(navigator.userAgent)) ||
                      // Forza per test se localStorage contiene flag
                      localStorage.getItem('force_ipad_mode') === 'true';
        
        if (isIPad) {
            // Usa il sistema TTS esistente ma con protezione anti-doppia
            if (window.iosTTSManager) {
                // Verifica se già parlando
                if (window.speechSynthesis.speaking) {
                    console.log('🔌 🛡️ TTS già in esecuzione - SKIP per evitare doppia lettura');
                    return;
                }
                
                // Protezione anti-doppia lettura
                const now = Date.now();
                if (this.lastTTSTime && (now - this.lastTTSTime) < 2000) {
                    console.log('🔌 🛡️ TTS troppo ravvicinato - SKIP');
                    return;
                }
                
                this.lastTTSTime = now;
                
                // Esegui TTS
                console.log('🔌 🔊 MIDDLEWARE TTS per iPad');
                window.iosTTSManager.speak(response);
            }
        } else {
            // Desktop/altri dispositivi
            if (window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(response);
                utterance.lang = 'it-IT';
                window.speechSynthesis.speak(utterance);
            }
        }
    }

    /**
     * Integrazione con l'interfaccia utente esistente
     */
    integrateWithUI() {
        // Cerca elementi UI dell'assistente AI
        const aiContainer = document.querySelector('#ai-content, .ai-container, .smart-assistant-container');
        
        if (aiContainer) {
            // Aggiungi indicatore di stato del middleware
            this.addStatusIndicator(aiContainer);
            
            // Aggiungi pulsante di configurazione
            this.addConfigButton(aiContainer);
        }
    }

    /**
     * Aggiunge indicatore di stato del middleware
     */
    addStatusIndicator(container) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'middleware-status';
        statusDiv.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #28a745;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
        `;
        statusDiv.textContent = 'Middleware Attivo';
        container.style.position = 'relative';
        container.appendChild(statusDiv);
    }

    /**
     * Aggiunge pulsante di configurazione
     */
    addConfigButton(container) {
        const configBtn = document.createElement('button');
        configBtn.id = 'middleware-config-btn';
        configBtn.textContent = '⚙️';
        configBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 120px;
            background: #007bff;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            z-index: 1000;
        `;
        configBtn.onclick = () => this.showConfigModal();
        container.appendChild(configBtn);
    }

    /**
     * Mostra modal di configurazione
     */
    showConfigModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
        `;
        
        const stats = this.getStats();
        content.innerHTML = `
            <h3>Configurazione Middleware AI</h3>
            <h4>Statistiche:</h4>
            <ul>
                <li>Richieste totali: ${stats.totalRequests}</li>
                <li>Match vocabolario: ${stats.vocabularyMatches}</li>
                <li>Fallback AI: ${stats.aiFallbacks}</li>
                <li>Errori: ${stats.errors}</li>
            </ul>
            <h4>Vocabolario:</h4>
            <ul>
                <li>Comandi disponibili: ${stats.vocabularyStats?.totalCommands || 0}</li>
                <li>Pattern totali: ${stats.vocabularyStats?.totalPatterns || 0}</li>
            </ul>
            <div style="margin-top: 20px;">
                <button id="close-modal" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    Chiudi
                </button>
                <button id="reload-vocabulary" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                    Ricarica Vocabolario
                </button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('close-modal').onclick = () => {
            document.body.removeChild(modal);
        };
        
        document.getElementById('reload-vocabulary').onclick = async () => {
            await this.middleware.vocabularyManager.loadVocabulary(true);
            document.body.removeChild(modal);
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }

    /**
     * 🔍 RICONOSCE SE È UNA RICHIESTA DI DATI
     */
    isDataRelatedQuery(message) {
        const dataKeywords = [
            // Database e tabelle
            'ordini', 'clienti', 'prodotti', 'database', 'tabella', 'record',
            'quanti', 'elenco', 'lista', 'cerca', 'trova', 'mostra',
            'vendite', 'fatture', 'documenti', 'storico', 'archivio',
            'magazzino', 'inventario', 'scorte', 'disponibilità',
            'percorsi', 'tragitti', 'distanze', 'chilometri',
            'statistiche', 'report', 'analisi', 'dati', 'informazioni',
            'supabase', 'sql', 'query', 'connessione',
            
            // Operazioni specifiche sui clienti
            'cliente', 'ordine', 'importo', 'prezzo', 'totale', 'costo',
            'fattura', 'documento', 'spedizione', 'consegna', 'pagamento',
            'saldo', 'debito', 'credito', 'scadenza', 'bonifico',
            
            // Nomi clienti comuni (esempi dal tuo database)
            'mandria', 'conad', 'essemme', 'supermercato', 'market',
            'alimentari', 'generi', 'discount', 'ipermercato',
            
            // Verbi di ricerca dati
            'dimmi', 'dimmi come', 'come è', 'quando è', 'dove è',
            'chi ha', 'cosa ha', 'quale è', 'quanto è', 'quanto costa',
            'esiste', 'esistono', 'contiene', 'include', 'comprende',
            
            // Query sui prodotti
            'più venduto', 'più venduti', 'meno venduto', 'meno venduti',
            'venduto', 'venduti', 'articolo', 'articoli', 'merce', 'merci',
            'top vendite', 'bestseller', 'migliori vendite', 'peggiori vendite',
            
            // Informazioni aziendali
            'indirizzo', 'telefono', 'email', 'contatto', 'partita iva',
            'codice fiscale', 'iban', 'banca', 'sede', 'filiale'
        ];
        
        const messageLower = message.toLowerCase();
        const isDataRelated = dataKeywords.some(keyword => 
            messageLower.includes(keyword)
        );
        
        console.log('🔌 🔍 Analisi richiesta:', {
            message: message,
            isDataRelated: isDataRelated,
            matchedKeywords: dataKeywords.filter(k => messageLower.includes(k))
        });
        
        return isDataRelated;
    }

    /**
     * 🔧 GESTISCE RICHIESTE DI DATI CON MIDDLEWARE
     */
    async handleDataRequest(message) {
        try {
            // Verifica se abbiamo connessione Supabase
            if (!this.supabaseAI) {
                console.log('🔌 ❌ Supabase non disponibile per middleware');
                return null;
            }

            // Prova a processare la richiesta di dati
            const result = await this.supabaseAI.processRequest(message);
            
            if (result && result.response) {
                console.log('🔌 ✅ Risposta middleware ottenuta:', result.response);
                return result.response;
            }
            
            return null;
        } catch (error) {
            console.error('🔌 ❌ Errore handleDataRequest:', error);
            return null;
        }
    }

    /**
     * Attiva/disattiva il middleware
     */
    toggle() {
        this.isActive = !this.isActive;
        console.log(`🔌 Middleware ${this.isActive ? 'attivato' : 'disattivato'}`);
        
        // Aggiorna indicatore UI
        const statusDiv = document.getElementById('middleware-status');
        if (statusDiv) {
            statusDiv.textContent = this.isActive ? 'Middleware Attivo' : 'Middleware Disattivo';
            statusDiv.style.background = this.isActive ? '#28a745' : '#dc3545';
        }
    }

    /**
     * Ottieni statistiche complete
     */
    getStats() {
        return {
            ...this.stats,
            isActive: this.isActive,
            vocabularyStats: this.middleware?.getStats()?.vocabularyStats || null
        };
    }

    /**
     * Riavvia il middleware
     */
    async restart() {
        console.log('🔌 Riavvio middleware integration...');
        
        try {
            // Disattiva se attivo
            if (this.isActive) {
                this.isActive = false;
                console.log('🔌 Middleware disattivato per riavvio');
            }
            
            // Reinizializza i componenti
            const success = await this.initialize();
            
            if (success) {
                console.log('✅ Middleware riavviato con successo');
                return true;
            } else {
                console.error('❌ Errore riavvio middleware');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Errore riavvio middleware:', error);
            return false;
        }
    }

    /**
     * Disattiva il middleware e ripristina funzioni originali
     */
    deactivate() {
        this.isActive = false;
        
        // Ripristina funzioni originali
        if (this.originalAIFunction) {
            window.sendAIRequest = this.originalAIFunction;
        }
        
        // Rimuovi elementi UI
        const statusDiv = document.getElementById('middleware-status');
        if (statusDiv) statusDiv.remove();
        
        const configBtn = document.getElementById('middleware-config-btn');
        if (configBtn) configBtn.remove();
        
        console.log('🔌 ❌ MIDDLEWARE DISATTIVATO');
    }
}

// Funzione di inizializzazione middleware
async function initializeMiddleware() {
    console.log('🔌 Inizializzazione automatica middleware...');
    
    // Controllo se il middleware è disabilitato
    if (localStorage.getItem('middleware_disabled') === 'true') {
        console.log('🔌 ⚠️ MIDDLEWARE DISABILITATO da localStorage');
        return;
    }
    
    // Attendi che l'applicazione sia caricata (aumento il delay)
    setTimeout(async () => {
        try {
            window.middlewareIntegration = new MiddlewareIntegration();
            const success = await window.middlewareIntegration.initialize();
            
            if (success) {
                window.middlewareIntegration.integrateWithUI();
                console.log('🔌 ✅ MIDDLEWARE INTEGRATION COMPLETA');
                
                // Aggiungi comandi console per debug
                console.log('🔌 📝 COMANDI UTILI:');
                console.log('   - Per disabilitare: localStorage.setItem("middleware_disabled", "true")');
                console.log('   - Per riabilitare: localStorage.removeItem("middleware_disabled")');
                console.log('   - Toggle: window.middlewareIntegration.toggle()');
                
            } else {
                console.log('🔌 ❌ ERRORE INIZIALIZZAZIONE MIDDLEWARE');
            }
        } catch (error) {
            console.error('❌ Errore inizializzazione middleware:', error);
        }
    }, 5000); // Aumentato da 2 a 5 secondi
}

// Inizializzazione automatica - gestisce sia DOM già caricato che futuro
if (document.readyState === 'loading') {
    // DOM non ancora caricato
    document.addEventListener('DOMContentLoaded', initializeMiddleware);
} else {
    // DOM già caricato, inizializza subito
    initializeMiddleware();
}

// Esporta per uso globale
window.MiddlewareIntegration = MiddlewareIntegration;