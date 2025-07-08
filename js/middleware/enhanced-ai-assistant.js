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
                    
                    // Inizializza VocabolarioMiddleware
                    this.vocabolarioMiddleware = new VocabolarioMiddleware(this.middleware);
                    
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
            
            // VOCABOLARIO MIDDLEWARE INTEGRATION POINT
            if (this.middlewareEnabled) {
                console.log('📋 ENHANCED: Tentativo elaborazione con VocabolarioMiddleware...');
                
                const middlewareResult = await this.vocabolarioMiddleware.processWithVocabulario(message);
                
                if (middlewareResult.handled) {
                    console.log('✅ ENHANCED: VocabolarioMiddleware ha gestito la richiesta');
                    
                    // Gestisci risposta diretta del middleware
                    await this.handleMiddlewareResponse(middlewareResult, isVoiceInput);
                    return;
                } else {
                    console.log('🧠 ENHANCED: VocabolarioMiddleware ha passato la richiesta all\'AI');
                    console.log('📝 ENHANCED: Motivo:', middlewareResult.reason);
                    
                    // Se è stato trovato un match ma non gestito, aggiungi contesto per l'AI
                    if (middlewareResult.matchFound) {
                        console.log('🔍 ENHANCED: Match trovato nel vocabolario, aggiungo contesto per AI');
                        await this.addVocabularioContextToAI(message, middlewareResult);
                    }
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
     * Aggiunge contesto vocabolario per l'AI quando viene trovato un match
     */
    async addVocabularioContextToAI(originalMessage, middlewareResult) {
        try {
            const match = middlewareResult.match;
            let contextMessage = `\nCONTESTO VOCABOLARIO:\n`;
            contextMessage += `- Pattern riconosciuto: "${match.pattern}"\n`;
            contextMessage += `- Categoria: ${match.category}\n`;
            contextMessage += `- Confidenza: ${(match.confidence * 100).toFixed(1)}%\n`;
            
            if (middlewareResult.suggestion) {
                contextMessage += `- Suggerimento: ${middlewareResult.suggestion}\n`;
            }
            
            contextMessage += `\nElabora la richiesta considerando questo contesto.`;
            
            // Aggiungi il contesto al messaggio dell'utente
            const lastMessage = this.originalAssistant.messages[this.originalAssistant.messages.length - 1];
            if (lastMessage && lastMessage.role === 'user') {
                lastMessage.content += contextMessage;
            }
            
            console.log('📋 ENHANCED: Contesto vocabolario aggiunto al messaggio AI');
            
        } catch (error) {
            console.error('❌ Errore aggiunta contesto vocabolario:', error);
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

// Espone globalmente per integrazione
window.EnhancedAIAssistant = EnhancedAIAssistant;

// NOTA: L'inizializzazione di EnhancedAIAssistant ora avviene in index.html
// per garantire che venga usato al posto di FlavioAIAssistant
console.log('🔄 ENHANCED: EnhancedAIAssistant caricato, attesa inizializzazione da index.html...');

/**
 * Funzione per rebinding automatico dell'interfaccia utente
 */
function autoRebindToEnhanced() {
    try {
        console.log('🔄 ENHANCED: Inizio rebinding automatico...');
        
        // Trova elementi UI
        const sendBtn = document.getElementById('sendBtn');
        const aiInput = document.getElementById('aiInput');
        
        if (!sendBtn || !aiInput) {
            console.error('❌ ENHANCED: Elementi UI non trovati per rebinding');
            return;
        }
        
        // Verifica che EnhancedAI sia disponibile
        if (!window.EnhancedAI) {
            console.error('❌ ENHANCED: EnhancedAI non disponibile per rebinding');
            return;
        }
        
        // Rimuovi event listeners esistenti clonando gli elementi
        const newSendBtn = sendBtn.cloneNode(true);
        const newAiInput = aiInput.cloneNode(true);
        
        // Sostituisci elementi nel DOM
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        aiInput.parentNode.replaceChild(newAiInput, aiInput);
        
        // Aggiungi nuovi event listeners per EnhancedAI
        newSendBtn.addEventListener('click', () => {
            console.log('🔄 ENHANCED: Click send button (rebinded)');
            window.EnhancedAI.sendMessage(false);
        });
        
        newAiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('🔄 ENHANCED: Enter key pressed (rebinded)');
                window.EnhancedAI.sendMessage(false);
            }
        });
        
        // Aggiorna riferimenti globali se esistono
        if (window.FlavioAI) {
            window.FlavioAI.sendBtn = newSendBtn;
            window.FlavioAI.aiInput = newAiInput;
        }
        
        console.log('✅ ENHANCED: Rebinding automatico completato con successo');
        
    } catch (error) {
        console.error('❌ ENHANCED: Errore durante rebinding automatico:', error);
    }
}

console.log('✅ EnhancedAIAssistant caricato (inizializzazione in corso...)');