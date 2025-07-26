/**
 * AI ASSISTANT
 * Sistema base per assistente AI
 */

window.AIAssistant = (function() {
    'use strict';

    const assistant = {
        isInitialized: false,
        currentProvider: null,
        providers: {},

        /**
         * Inizializzazione
         */
        init() {
            try {
                this.registerProviders();
                this.isInitialized = true;
                console.log('✅ AIAssistant inizializzato');
                return true;
            } catch (error) {
                console.error('❌ Errore inizializzazione AIAssistant:', error);
                return false;
            }
        },

        /**
         * Registra provider AI disponibili
         */
        registerProviders() {
            // OpenAI GPT - Registra ma NON inizializza automaticamente
            if (window.OpenAI) {
                this.providers.openai = window.OpenAI;
                // NON inizializza automaticamente per evitare doppio AI
                console.log('📝 OpenAI registrato (senza auto-init)');
            }

            // Anthropic AI (Claude 4)
            if (window.AnthropicAI) {
                this.providers.anthropic = window.AnthropicAI;
                // Inizializza automaticamente se non già fatto
                if (!window.AnthropicAI.isInitialized) {
                    window.AnthropicAI.init();
                }
            }

            // Altri provider possono essere aggiunti qui
        },

        /**
         * Imposta provider corrente
         */
        setProvider(providerName) {
            if (this.providers[providerName]) {
                // Inizializza solo quando viene selezionato
                if (providerName === 'openai' && !this.providers[providerName].isInitialized) {
                    console.log('🔧 Inizializzazione OpenAI su richiesta...');
                    this.providers[providerName].init('backend');
                }
                
                this.currentProvider = this.providers[providerName];
                console.log(`✅ Provider AI impostato: ${providerName}`);
                return true;
            } else {
                console.error(`❌ Provider AI non trovato: ${providerName}`);
                return false;
            }
        },

        /**
         * Invia messaggio al provider corrente
         */
        async sendMessage(message, context = null) {
            if (!this.currentProvider) {
                throw new Error('Nessun provider AI configurato');
            }

            try {
                if (this.currentProvider.generateResponse) {
                    return await this.currentProvider.generateResponse(message, context);
                } else if (this.currentProvider.chat) {
                    return await this.currentProvider.chat(message);
                } else {
                    throw new Error('Provider AI non compatibile');
                }
            } catch (error) {
                console.error('❌ Errore invio messaggio AI:', error);
                throw error;
            }
        },

        /**
         * Analizza dati
         */
        async analyzeData(data, question) {
            if (!this.currentProvider) {
                throw new Error('Nessun provider AI configurato');
            }

            if (this.currentProvider.analyzeBusinessData) {
                return await this.currentProvider.analyzeBusinessData(data, question);
            } else {
                // Fallback generico
                const context = { data, type: 'analysis' };
                return await this.sendMessage(question, context);
            }
        },

        /**
         * Ottieni suggerimenti
         */
        async getSuggestions(data, action) {
            if (!this.currentProvider) {
                throw new Error('Nessun provider AI configurato');
            }

            if (this.currentProvider.getSuggestions) {
                return await this.currentProvider.getSuggestions(data, action);
            } else {
                const prompt = `Suggerisci azioni per: ${action}`;
                const context = { data, type: 'suggestions' };
                return await this.sendMessage(prompt, context);
            }
        },

        /**
         * Test provider corrente
         */
        async testProvider() {
            if (!this.currentProvider) {
                console.error('❌ Nessun provider da testare');
                return false;
            }

            try {
                if (this.currentProvider.testConnection) {
                    return await this.currentProvider.testConnection();
                } else {
                    const response = await this.sendMessage('Test connessione');
                    console.log('✅ Test generico riuscito:', response);
                    return true;
                }
            } catch (error) {
                console.error('❌ Test provider fallito:', error);
                return false;
            }
        },

        /**
         * Lista provider disponibili
         */
        getAvailableProviders() {
            return Object.keys(this.providers).map(key => ({
                id: key,
                name: this.getProviderDisplayName(key),
                isActive: this.currentProvider === this.providers[key]
            }));
        },

        /**
         * Ottieni nome visualizzato del provider
         */
        getProviderDisplayName(providerId) {
            const names = {
                'openai': 'OpenAI GPT',
                'anthropic': 'Anthropic Claude'
            };
            return names[providerId] || providerId;
        },

        /**
         * Stato corrente
         */
        getStatus() {
            return {
                initialized: this.isInitialized,
                currentProvider: this.currentProvider ? 'configurato' : 'non configurato',
                availableProviders: this.getAvailableProviders()
            };
        }
    };

    // Auto-inizializzazione
    assistant.init();

    return assistant;
})();

console.log('✅ AIAssistant caricato');