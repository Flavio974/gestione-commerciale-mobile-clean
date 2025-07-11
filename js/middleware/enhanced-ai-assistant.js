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
        
        // Proxy proprietà dall'assistant originale
        this.costWarningAccepted = false;
        
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
                    
                    // Inizializza ImprovedVocabolarioMiddleware se disponibile, altrimenti VocabolarioMiddleware
                    if (typeof ImprovedVocabolarioMiddleware !== 'undefined') {
                        console.log('🚀 Utilizzo ImprovedVocabolarioMiddleware');
                        this.vocabolarioMiddleware = new ImprovedVocabolarioMiddleware(this.middleware);
                    } else {
                        console.log('📋 Utilizzo VocabolarioMiddleware standard');
                        this.vocabolarioMiddleware = new VocabolarioMiddleware(this.middleware);
                    }
                    
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
            
            // 📅 INTERCETTA RICHIESTE TEMPORALI PRIMA DEL MIDDLEWARE
            if (this.shouldHandleTemporalRequest(message)) {
                console.log('📅 ENHANCED: Richiesta temporale rilevata - gestisco localmente');
                await this.handleTemporalRequest(message, isVoiceInput);
                return;
            }
            
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
                    
                    // Aggiungi indicatore sorgente
                    middlewareResult.source = middlewareResult.source || 'APP';
                    
                    // Gestisci risposta diretta del middleware
                    await this.handleMiddlewareResponse(middlewareResult, isVoiceInput);
                    return;
                } else {
                    console.log('🧠 ENHANCED: VocabolarioMiddleware ha passato la richiesta all\'AI');
                    console.log('📝 ENHANCED: Motivo:', middlewareResult.reason);
                    
                    // Se ci sono suggerimenti, mostrali
                    if (middlewareResult.suggestions && middlewareResult.suggestions.length > 0) {
                        console.log('💡 ENHANCED: Suggerimenti disponibili:', middlewareResult.suggestions);
                        await this.showSuggestions(middlewareResult.suggestions);
                    }
                    
                    // Se è stato trovato un match ma non gestito, aggiungi contesto per l'AI
                    if (middlewareResult.matchFound) {
                        console.log('🔍 ENHANCED: Match trovato nel vocabolario, aggiungo contesto per AI');
                        await this.addVocabolarioContextToAI(message, middlewareResult);
                    }
                    
                    // Se c'è stato un errore, mostra messaggio user-friendly
                    if (middlewareResult.error) {
                        console.error('❌ ENHANCED: Errore nel middleware:', middlewareResult.message);
                        this.showErrorMessage(middlewareResult.message);
                    }
                }
            }
            
            // ULTIMA VERIFICA: Controlla se è una richiesta temporale che deve essere gestita dal voice manager
            if (isVoiceInput && window.aiVoiceManagerV2) {
                const handled = window.aiVoiceManagerV2.handleTemporalRequest(message);
                if (handled) {
                    console.log('✅ ENHANCED: Richiesta temporale gestita dal AIVoiceManagerV2');
                    return; // Non continuare con l'AI
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
            
            // Formatta risposta con indicatore sorgente
            let formattedResponse = middlewareResult.response;
            if (middlewareResult.source === 'APP') {
                formattedResponse = `${middlewareResult.response}\n\n[📱 Elaborato localmente]`;
            }
            
            // Aggiungi risposta alla chat
            this.originalAssistant.messages.push({ 
                role: 'assistant', 
                content: formattedResponse 
            });
            
            // Aggiorna interfaccia
            this.originalAssistant.updateChat();
            this.originalAssistant.hideThinking();
            
            // Debug info se abilitato
            if (this.debugMode) {
                console.log('📊 MIDDLEWARE DATA:', middlewareResult.data);
                console.log('🏷️ MIDDLEWARE TYPE:', middlewareResult.type);
                console.log('🎯 MATCH TYPE:', middlewareResult.matchType);
                console.log('📈 CONFIDENCE:', middlewareResult.confidence);
            }
            
            // TTS se input vocale
            // DISABILITATO: Il TTS viene già gestito in index.html per evitare doppia lettura
            /*
            if (isVoiceInput) {
                console.log('🔊 ENHANCED: Attivazione TTS per risposta middleware');
                
                // Usa il nuovo Voice Manager V2 se disponibile
                if (window.AIVoiceManagerV2) {
                    await window.AIVoiceManagerV2.speak(middlewareResult.response);
                } else if (this.originalAssistant.voiceManager) {
                    this.originalAssistant.voiceManager.speak(middlewareResult.response);
                }
            }
            */
            
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
    
    // Metodo per aggiornare le opzioni del modello
    updateModelOptions() {
        return this.originalAssistant.updateModelOptions();
    }
    
    // Altri metodi di configurazione
    updateWakeWord() {
        return this.originalAssistant.updateWakeWord();
    }
    
    saveConfig() {
        return this.originalAssistant.saveConfig();
    }
    
    clearHistory() {
        return this.originalAssistant.clearHistory();
    }
    
    refreshSupabaseData() {
        return this.originalAssistant.refreshSupabaseData();
    }
    
    quickQuery(type) {
        return this.originalAssistant.quickQuery(type);
    }
    
    stopSpeaking() {
        if (this.originalAssistant.stopSpeaking) {
            return this.originalAssistant.stopSpeaking();
        }
    }
    
    toggleVoice() {
        return this.originalAssistant.toggleVoice();
    }
    
    switchToGPT() {
        return this.originalAssistant.switchToGPT();
    }
    
    startListening() {
        if (this.originalAssistant.startListening) {
            return this.originalAssistant.startListening();
        }
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
            
            // Salva l'ultimo messaggio per poter restituire la risposta
            const messagesBefore = [...this.originalAssistant.messages];
            
            await this.sendMessage(true); // true = voice input
            
            // Trova la nuova risposta dell'assistant
            const newMessages = this.originalAssistant.messages.slice(messagesBefore.length);
            const assistantResponse = newMessages.find(msg => msg.role === 'assistant');
            
            return assistantResponse ? assistantResponse.content : null;
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
     * Mostra suggerimenti all'utente
     */
    async showSuggestions(suggestions) {
        try {
            for (const suggestion of suggestions) {
                if (suggestion.type === 'client_correction') {
                    const message = `💡 Forse intendevi uno di questi clienti: ${suggestion.suggestions.join(', ')}?`;
                    this.originalAssistant.messages.push({ 
                        role: 'system', 
                        content: message 
                    });
                } else if (suggestion.type === 'similar_commands') {
                    const message = `💡 Comandi simili disponibili:\n${suggestion.commands.map(c => `• ${c}`).join('\n')}`;
                    this.originalAssistant.messages.push({ 
                        role: 'system', 
                        content: message 
                    });
                }
            }
            this.originalAssistant.updateChat();
        } catch (error) {
            console.error('❌ Errore mostrando suggerimenti:', error);
        }
    }
    
    /**
     * Mostra messaggio di errore user-friendly
     */
    showErrorMessage(message) {
        try {
            this.originalAssistant.messages.push({ 
                role: 'system', 
                content: `⚠️ ${message}` 
            });
            this.originalAssistant.updateChat();
            this.originalAssistant.hideThinking();
        } catch (error) {
            console.error('❌ Errore mostrando messaggio errore:', error);
        }
    }
    
    /**
     * Statistiche middleware avanzate
     */
    getMiddlewareStats() {
        try {
            const usage = JSON.parse(localStorage.getItem('middlewareUsage') || '[]');
            const basicStats = {
                totalRequests: usage.length,
                handledByType: {},
                averageResponseLength: 0
            };
            
            usage.forEach(u => {
                basicStats.handledByType[u.type] = (basicStats.handledByType[u.type] || 0) + 1;
                basicStats.averageResponseLength += u.responseLength;
            });
            
            if (usage.length > 0) {
                basicStats.averageResponseLength = Math.round(basicStats.averageResponseLength / usage.length);
            }
            
            // Se abbiamo ImprovedVocabolarioMiddleware, aggiungi stats avanzate
            if (this.vocabolarioMiddleware && this.vocabolarioMiddleware.getStats) {
                const advancedStats = this.vocabolarioMiddleware.getStats();
                return { ...basicStats, ...advancedStats };
            }
            
            return basicStats;
        } catch (error) {
            console.error('❌ Errore recupero statistiche:', error);
            return { error: error.message };
        }
    }

    /**
     * Verifica se la richiesta è temporale e deve essere gestita localmente
     */
    shouldHandleTemporalRequest(message) {
        const lowerMessage = message.toLowerCase();
        
        // Pattern "giorni fa"
        const hasGiorniFa = /\d+\s+giorni\s+fa/.test(lowerMessage) || 
                           /(un|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+giorni?\s+fa/.test(lowerMessage);
        
        // Pattern date temporali
        const hasTemporalDate = lowerMessage.includes('che data era') ||
                               lowerMessage.includes('che data sarà') ||
                               lowerMessage.includes('che data avremo') ||
                               lowerMessage.includes('data di ieri') ||
                               lowerMessage.includes('data di domani') ||
                               lowerMessage.includes('giorni fa che data');
        
        // Pattern giorni della settimana temporali
        const hasTemporalDay = (lowerMessage.includes('che giorno era') && hasGiorniFa) ||
                              lowerMessage.includes('domani che giorno') ||
                              lowerMessage.includes('ieri che giorno');
        
        return hasGiorniFa || hasTemporalDate || hasTemporalDay;
    }

    /**
     * Gestisce una richiesta temporale localmente
     */
    async handleTemporalRequest(message, isVoiceInput) {
        try {
            console.log('📅 TEMPORAL: Gestendo richiesta temporale:', message);
            
            // Aggiungi messaggio utente alla chat
            this.originalAssistant.messages.push({ role: 'user', content: message });
            this.originalAssistant.updateChat();
            
            // Pulisci input
            const input = document.getElementById('aiInput');
            if (input) input.value = '';
            
            // Calcola la risposta temporale
            const response = this.calculateTemporalResponse(message);
            
            // Aggiungi risposta dell'assistente
            this.originalAssistant.messages.push({ role: 'assistant', content: response });
            this.originalAssistant.updateChat();
            
            // TTS se richiesto
            if (isVoiceInput && window.speechSynthesis) {
                this.originalAssistant.speak(response);
            }
            
            console.log('✅ TEMPORAL: Risposta temporale generata:', response);
            
        } catch (error) {
            console.error('❌ TEMPORAL: Errore gestione richiesta temporale:', error);
            
            // Fallback al sistema normale
            console.log('🔄 TEMPORAL: Fallback al sistema AI normale');
            // Rimetti il messaggio nell'input e processa normalmente
            const input = document.getElementById('aiInput');
            if (input) input.value = message;
            await this.sendMessage(isVoiceInput);
        }
    }

    /**
     * Calcola la risposta per una richiesta temporale
     */
    calculateTemporalResponse(message) {
        const lowerMessage = message.toLowerCase();
        const now = new Date();
        let targetDate = new Date(now);
        let dayModifier = 'oggi';
        
        console.log('📅 TEMPORAL CALC: Data corrente:', now.toISOString());
        
        // Pattern "X giorni fa"
        const pastMatch = lowerMessage.match(/(\d+|un|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+(giorni?|giorno)\s+fa/i);
        
        if (pastMatch) {
            const numberMap = {
                'un': 1, 'una': 1, 'due': 2, 'tre': 3, 'quattro': 4, 'cinque': 5,
                'sei': 6, 'sette': 7, 'otto': 8, 'nove': 9, 'dieci': 10
            };
            
            const amountStr = pastMatch[1].toLowerCase();
            const amount = isNaN(amountStr) ? numberMap[amountStr] : parseInt(amountStr);
            
            console.log('📅 TEMPORAL CALC: Pattern giorni fa trovato:', {amountStr, amount});
            
            targetDate.setDate(now.getDate() - amount);
            dayModifier = `${amount} ${amount === 1 ? 'giorno' : 'giorni'} fa`;
            
            console.log('📅 TEMPORAL CALC: Data calcolata:', targetDate.toISOString());
        }
        
        // Formatta la risposta
        const options = {
            weekday: 'long',
            year: 'numeric', 
            month: 'long',
            day: 'numeric'
        };
        
        const dateString = targetDate.toLocaleDateString('it-IT', options);
        
        if (lowerMessage.includes('che data era') || lowerMessage.includes('che data c\'era')) {
            return `${dayModifier.charAt(0).toUpperCase() + dayModifier.slice(1)} era ${dateString}.`;
        } else if (lowerMessage.includes('che giorno era')) {
            const dayName = targetDate.toLocaleDateString('it-IT', { weekday: 'long' });
            return `${dayModifier.charAt(0).toUpperCase() + dayModifier.slice(1)} era ${dayName}.`;
        }
        
        return `${dayModifier.charAt(0).toUpperCase() + dayModifier.slice(1)} era ${dateString}.`;
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

console.log('✅ EnhancedAIAssistant caricato (inizializzazione in corso...)');// Deploy timestamp: Wed Jul  9 19:20:27 CEST 2025
