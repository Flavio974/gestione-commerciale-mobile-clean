/**
 * ENHANCED AI ASSISTANT - Estensione Non-Invasiva con Middleware
 * Estende FlavioAIAssistant esistente aggiungendo capacità di elaborazione diretta
 */

class EnhancedAIAssistant {
    constructor() {
        console.log('🚀 Inizializzazione EnhancedAIAssistant...');
        
        // Verifica che FlavioAIAssistant sia disponibile
        if (typeof FlavioAIAssistant === 'undefined') {
            console.error('❌ FlavioAIAssistant non trovato! Assicurati che sia caricato prima.');
            throw new Error('FlavioAIAssistant required');
        }
        
        // Inizializza FlavioAIAssistant originale
        this.originalAssistant = new FlavioAIAssistant();
        
        // Attendi che sia completamente inizializzato
        this.initializationPromise = this.waitForInitialization();
        
        // Flags di stato
        this.middlewareEnabled = true;
        this.debugMode = true;
        
        console.log('✅ EnhancedAIAssistant inizializzato');
    }
    
    /**
     * Attende che l'assistant originale sia pronto
     */
    async waitForInitialization() {
        return new Promise((resolve) => {
            // Attendi che l'assistant originale sia pronto
            const checkReady = () => {
                if (this.originalAssistant && this.originalAssistant.supabaseAI) {
                    console.log('✅ FlavioAIAssistant originale pronto');
                    
                    // Inizializza middleware
                    this.middleware = new RequestMiddleware(this.originalAssistant.supabaseAI);
                    
                    resolve();
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
    }
    
    /**
     * Override del metodo sendMessage con middleware integration
     */
    async sendMessage(isVoiceInput = false) {
        try {
            console.log('🔄 ENHANCED: sendMessage chiamato!', {isVoiceInput});
            
            // Assicurati che l'initialization sia completata
            await this.initializationPromise;
            
            const input = document.getElementById('aiInput');
            const message = input.value.trim();
            
            if (!message) return;
            
            console.log('🔄 ENHANCED: Processando messaggio:', message);
            console.log('🎤 ENHANCED: Input vocale:', isVoiceInput);
            
            // Aggiungi messaggio utente alla chat
            this.originalAssistant.messages.push({ role: 'user', content: message });
            this.originalAssistant.updateChat();
            input.value = '';
            
            // Mostra thinking indicator
            this.originalAssistant.showThinking();
            
            // MIDDLEWARE INTEGRATION POINT
            if (this.middlewareEnabled) {
                console.log('🤖 ENHANCED: Tentativo elaborazione middleware...');
                
                const middlewareResult = await this.middleware.processRequest(message);
                
                if (middlewareResult.handled) {
                    console.log('✅ ENHANCED: Middleware ha gestito la richiesta');
                    
                    // Gestisci risposta diretta del middleware
                    await this.handleMiddlewareResponse(middlewareResult, isVoiceInput);
                    return;
                } else {
                    console.log('🧠 ENHANCED: Middleware ha passato la richiesta all\'AI');
                    console.log('📝 ENHANCED: Motivo:', middlewareResult.reason);
                }
            }
            
            // Fallback all'AI originale se middleware non gestisce
            console.log('🔄 ENHANCED: Fallback a FlavioAIAssistant originale...');
            
            // Ripristina l'input per l'assistant originale
            input.value = message;
            
            // Rimuovi il messaggio già aggiunto per evitare duplicati
            this.originalAssistant.messages.pop();
            
            // Chiama l'assistant originale
            return await this.originalAssistant.sendMessage(isVoiceInput);
            
        } catch (error) {
            console.error('❌ ENHANCED: Errore in sendMessage:', error);
            
            // Fallback di emergenza
            console.log('🚨 ENHANCED: Fallback di emergenza all\'AI originale');
            const input = document.getElementById('aiInput');
            input.value = message;
            return await this.originalAssistant.sendMessage(isVoiceInput);
        }
    }
    
    /**
     * Gestisce le risposte dirette del middleware
     */
    async handleMiddlewareResponse(middlewareResult, isVoiceInput) {
        try {
            console.log('📤 ENHANCED: Gestione risposta middleware');
            
            // Aggiungi risposta alla chat
            this.originalAssistant.messages.push({ 
                role: 'assistant', 
                content: middlewareResult.response 
            });
            
            // Aggiorna interfaccia
            this.originalAssistant.updateChat();
            this.originalAssistant.hideThinking();
            
            // Debug info se abilitato
            if (this.debugMode) {
                console.log('📊 MIDDLEWARE DATA:', middlewareResult.data);
                console.log('🏷️ MIDDLEWARE TYPE:', middlewareResult.type);
            }
            
            // TTS se input vocale
            if (isVoiceInput) {
                console.log('🔊 ENHANCED: Attivazione TTS per risposta middleware');
                
                // Usa il nuovo Voice Manager V2 se disponibile
                if (window.AIVoiceManagerV2) {
                    await window.AIVoiceManagerV2.speak(middlewareResult.response);
                } else if (this.originalAssistant.voiceManager) {
                    this.originalAssistant.voiceManager.speak(middlewareResult.response);
                }
            }
            
            // Traccia l'interazione
            this.trackMiddlewareUsage(middlewareResult);
            
        } catch (error) {
            console.error('❌ ENHANCED: Errore gestione risposta middleware:', error);
            this.originalAssistant.hideThinking();
        }
    }
    
    /**
     * Traccia l'utilizzo del middleware per analytics
     */
    trackMiddlewareUsage(result) {
        try {
            const usage = {
                timestamp: new Date().toISOString(),
                type: result.type,
                handled: result.handled,
                responseLength: result.response?.length || 0
            };
            
            // Salva in localStorage per tracking
            const existingUsage = JSON.parse(localStorage.getItem('middlewareUsage') || '[]');
            existingUsage.push(usage);
            
            // Mantieni solo gli ultimi 50 utilizzi
            if (existingUsage.length > 50) {
                existingUsage.splice(0, existingUsage.length - 50);
            }
            
            localStorage.setItem('middlewareUsage', JSON.stringify(existingUsage));
            
            console.log('📈 ENHANCED: Utilizzo middleware tracciato');
            
        } catch (error) {
            console.error('❌ Errore tracking middleware:', error);
        }
    }
    
    /**
     * Proxy di tutti gli altri metodi all'assistant originale
     */
    
    // Metodi di configurazione
    setModel(model) {
        return this.originalAssistant.setModel(model);
    }
    
    setProvider(provider) {
        return this.originalAssistant.setProvider(provider);
    }
    
    // Metodi di interfaccia
    updateChat() {
        return this.originalAssistant.updateChat();
    }
    
    showThinking() {
        return this.originalAssistant.showThinking();
    }
    
    hideThinking() {
        return this.originalAssistant.hideThinking();
    }
    
    // Metodi voice
    setupVoiceIntegration() {
        return this.originalAssistant.setupVoiceIntegration();
    }
    
    // Metodo per Voice Manager V2 compatibility
    async processCommand(message) {
        const input = document.getElementById('aiInput');
        if (input) {
            input.value = message;
            return await this.sendMessage(true); // true = voice input
        }
    }
    
    /**
     * Metodi di controllo middleware
     */
    enableMiddleware() {
        this.middlewareEnabled = true;
        console.log('✅ ENHANCED: Middleware abilitato');
    }
    
    disableMiddleware() {
        this.middlewareEnabled = false;
        console.log('⚠️ ENHANCED: Middleware disabilitato - solo AI');
    }
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        console.log(`🔍 ENHANCED: Debug mode ${this.debugMode ? 'ON' : 'OFF'}`);
    }
    
    /**
     * Statistiche middleware
     */
    getMiddlewareStats() {
        try {
            const usage = JSON.parse(localStorage.getItem('middlewareUsage') || '[]');
            const stats = {
                totalRequests: usage.length,
                handledByType: {},
                averageResponseLength: 0
            };
            
            usage.forEach(u => {
                stats.handledByType[u.type] = (stats.handledByType[u.type] || 0) + 1;
                stats.averageResponseLength += u.responseLength;
            });
            
            if (usage.length > 0) {
                stats.averageResponseLength = Math.round(stats.averageResponseLength / usage.length);
            }
            
            return stats;
        } catch (error) {
            console.error('❌ Errore recupero statistiche:', error);
            return { error: error.message };
        }
    }
}

// Export per uso in altri moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedAIAssistant;
}

console.log('✅ EnhancedAIAssistant caricato');