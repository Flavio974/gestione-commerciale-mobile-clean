/**
 * UNIFIED AI SYSTEM - Combina il meglio di EnhancedAIAssistant e il nuovo middleware
 * Mantiene la struttura di EnhancedAIAssistant ma usa il VocabularyManager dinamico
 */

class UnifiedAIAssistant {
    constructor() {
        console.log('🎯 UnifiedAIAssistant: Inizializzazione sistema unificato...');
        
        // Inizializza EnhancedAIAssistant come base
        this.enhancedAI = new EnhancedAIAssistant();
        
        // Copia le proprietà principali
        this.originalAssistant = this.enhancedAI.originalAssistant;
        this.initializationPromise = this.enhancedAI.initializationPromise;
        this.middlewareEnabled = true;
        this.debugMode = true;
        this.costWarningAccepted = false;
        
        // Sostituisci con il nuovo sistema
        this.vocabularyManager = new VocabularyManager();
        this.temporalParser = new TemporalParser();
        this.aiMiddleware = new AIMiddleware();
        
        console.log('✅ UnifiedAIAssistant: Sistema unificato pronto');
    }
    
    /**
     * Override del metodo sendMessage per usare il nuovo middleware
     */
    async sendMessage(isVoiceInput = false) {
        const input = document.getElementById('ai-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        console.log('🎯 UNIFIED: Processando messaggio:', message);
        
        try {
            // Usa il nuovo AI Middleware
            const middlewareResult = await this.aiMiddleware.processRequest(message, {
                isVoiceInput: isVoiceInput,
                supabaseAI: this.originalAssistant.supabaseAI
            });
            
            if (middlewareResult.continueWithAI) {
                // Continua con l'AI originale via EnhancedAI
                console.log('🎯 UNIFIED: Passaggio all\'AI originale');
                return await this.enhancedAI.sendMessage(isVoiceInput);
                
            } else if (middlewareResult.success) {
                // Gestisci risposta locale
                console.log('🎯 UNIFIED: Risposta locale dal vocabolario');
                
                // Pulisci input
                input.value = '';
                
                // Aggiungi alla chat
                this.originalAssistant.messages.push({
                    role: 'user',
                    content: message,
                    timestamp: new Date().toISOString()
                });
                
                this.originalAssistant.messages.push({
                    role: 'assistant',
                    content: middlewareResult.response,
                    timestamp: new Date().toISOString(),
                    source: 'vocabulary'
                });
                
                // Salva e renderizza
                localStorage.setItem('ai_chat_history', JSON.stringify(this.originalAssistant.messages));
                this.originalAssistant.renderMessages();
                
                // TTS se richiesto
                if (isVoiceInput && this.originalAssistant.speakResponse) {
                    this.originalAssistant.speakResponse(middlewareResult.response);
                }
                
                return middlewareResult;
            }
            
        } catch (error) {
            console.error('❌ UNIFIED: Errore processamento:', error);
            // Fallback all'originale via EnhancedAI
            return await this.enhancedAI.sendMessage(isVoiceInput);
        }
    }
    
    /**
     * Metodo per ricaricare il vocabolario on-demand
     */
    async reloadVocabulary() {
        console.log('🔄 UNIFIED: Ricaricamento vocabolario...');
        await this.vocabularyManager.loadVocabulary(true);
        console.log('✅ UNIFIED: Vocabolario ricaricato');
    }
    
    /**
     * Ottieni statistiche del sistema
     */
    getSystemStats() {
        return {
            vocabulary: this.vocabularyManager.getStats(),
            middleware: this.aiMiddleware.getStats(),
            original: {
                messages: this.originalAssistant.messages.length,
                provider: this.originalAssistant.provider,
                model: this.originalAssistant.model
            }
        };
    }
}

// Registra globalmente
window.UnifiedAIAssistant = UnifiedAIAssistant;