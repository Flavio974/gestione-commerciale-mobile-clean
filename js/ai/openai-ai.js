/**
 * OPENAI AI PROVIDER
 * Provider per modelli OpenAI GPT
 */

window.OpenAI = (function() {
    'use strict';

    const openai = {
        isInitialized: false,
        apiKey: null,
        modelName: 'gpt-4o', // Modello predefinito
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        maxTokens: 4000,
        temperature: 0.7,
        
        // Modelli disponibili
        availableModels: {
            'gpt-4o': {
                name: 'GPT-4o',
                description: 'Modello multimodale più avanzato, veloce ed economico',
                maxTokens: 128000,
                contextWindow: 128000
            },
            'gpt-4o-mini': {
                name: 'GPT-4o Mini',
                description: 'Versione economica e veloce di GPT-4o',
                maxTokens: 128000,
                contextWindow: 128000
            },
            'gpt-4-turbo': {
                name: 'GPT-4 Turbo',
                description: 'Modello GPT-4 ottimizzato per velocità e efficienza',
                maxTokens: 128000,
                contextWindow: 128000
            },
            'gpt-4': {
                name: 'GPT-4',
                description: 'Modello GPT-4 standard, molto potente',
                maxTokens: 8192,
                contextWindow: 8192
            },
            'gpt-3.5-turbo': {
                name: 'GPT-3.5 Turbo',
                description: 'Modello veloce ed economico per la maggior parte dei compiti',
                maxTokens: 16384,
                contextWindow: 16384
            }
        },

        /**
         * Inizializzazione
         */
        init(apiKey, modelName = 'gpt-4o') {
            try {
                if (!apiKey) {
                    // Cerca API key dalle variabili d'ambiente o configurazione
                    this.apiKey = this.getApiKeyFromConfig();
                    if (!this.apiKey) {
                        console.warn('⚠️ API Key OpenAI non configurata');
                        return false;
                    }
                } else {
                    this.apiKey = apiKey;
                }

                if (this.availableModels[modelName]) {
                    this.modelName = modelName;
                    console.log(`✅ OpenAI inizializzato con modello: ${this.availableModels[modelName].name}`);
                } else {
                    console.warn(`⚠️ Modello ${modelName} non disponibile, uso predefinito`);
                }

                this.isInitialized = true;
                return true;

            } catch (error) {
                console.error('❌ Errore inizializzazione OpenAI:', error);
                return false;
            }
        },

        /**
         * Ottieni API key dalla configurazione
         */
        getApiKeyFromConfig() {
            // Prova da localStorage
            const storedKey = localStorage.getItem('openai_api_key');
            if (storedKey) {
                return storedKey;
            }

            // Prova da configurazione globale
            if (window.AI_CONFIG?.openai?.apiKey) {
                return window.AI_CONFIG.openai.apiKey;
            }

            // Prova da variabili d'ambiente (per ambiente di sviluppo)
            if (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY) {
                return process.env.OPENAI_API_KEY;
            }

            return null;
        },

        /**
         * Imposta API key
         */
        setApiKey(apiKey) {
            this.apiKey = apiKey;
            localStorage.setItem('openai_api_key', apiKey);
            console.log('✅ API Key OpenAI configurata');
        },

        /**
         * Imposta modello
         */
        setModel(modelName) {
            if (this.availableModels[modelName]) {
                this.modelName = modelName;
                console.log(`✅ Modello OpenAI cambiato a: ${this.availableModels[modelName].name}`);
                return true;
            } else {
                console.error(`❌ Modello ${modelName} non disponibile`);
                return false;
            }
        },

        /**
         * Ottieni lista modelli disponibili
         */
        getAvailableModels() {
            return this.availableModels;
        },

        /**
         * Genera risposta (metodo principale)
         */
        async generateResponse(message, context = null) {
            if (!this.isInitialized || !this.apiKey) {
                throw new Error('OpenAI non inizializzato o API key mancante');
            }

            try {
                console.log('🤖 OpenAI: Generando risposta...');
                
                // Prepara i messaggi per l'API
                const messages = this.buildMessages(message, context);

                const response = await this.callOpenAIAPI(messages);
                
                console.log('✅ Risposta generata da OpenAI');
                return response;

            } catch (error) {
                console.error('❌ Errore generazione risposta OpenAI:', error);
                throw error;
            }
        },

        /**
         * Costruisce array di messaggi per l'API
         */
        buildMessages(message, context) {
            const messages = [];

            // Messaggio di sistema
            let systemPrompt = `Sei un assistente AI specializzato in gestione commerciale e aziendale. 
Rispondi sempre in italiano, sii preciso e professionale.`;

            if (context?.data) {
                systemPrompt += `\n\nDati di contesto disponibili:\n${JSON.stringify(context.data, null, 2)}`;
            }

            if (context?.type === 'analysis') {
                systemPrompt += `\n\nStai analizzando dati aziendali. Fornisci insights utili e actionable.`;
            }

            messages.push({
                role: 'system',
                content: systemPrompt
            });

            // Messaggio utente
            let userMessage = message;
            if (context?.businessData) {
                userMessage += `\n\nDati aziendali:\n${JSON.stringify(context.businessData, null, 2)}`;
            }

            messages.push({
                role: 'user',
                content: userMessage
            });

            return messages;
        },

        /**
         * Chiamata API OpenAI
         */
        async callOpenAIAPI(messages) {
            const payload = {
                model: this.modelName,
                messages: messages,
                max_tokens: this.maxTokens,
                temperature: this.temperature
            };

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API OpenAI error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            
            // Estrai il contenuto della risposta
            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message.content;
            } else {
                throw new Error('Risposta API OpenAI non valida');
            }
        },

        /**
         * Analizza dati aziendali (metodo specializzato)
         */
        async analyzeBusinessData(data, question) {
            const context = {
                data: data,
                type: 'analysis',
                businessData: data
            };

            const analysisPrompt = `Analizza i seguenti dati aziendali e rispondi alla domanda: "${question}"
            
Fornisci:
1. Analisi dei dati
2. Insights principali
3. Raccomandazioni actionable
4. Metriche chiave se rilevanti

Rispondi in italiano in modo professionale e strutturato.`;

            return await this.generateResponse(analysisPrompt, context);
        },

        /**
         * Chat semplice
         */
        async chat(message) {
            return await this.generateResponse(message);
        },

        /**
         * Ottieni suggerimenti
         */
        async getSuggestions(data, action) {
            const context = {
                data: data,
                type: 'suggestions'
            };

            const suggestionsPrompt = `Basandoti sui dati forniti, suggerisci le migliori azioni per: "${action}"
            
Fornisci suggerimenti:
1. Specifici e actionable
2. Prioritizzati per impatto
3. Con timeline stimata
4. Con risorse necessarie

Rispondi in italiano in formato lista strutturata.`;

            return await this.generateResponse(suggestionsPrompt, context);
        },

        /**
         * Test connessione
         */
        async testConnection() {
            try {
                const response = await this.generateResponse('Test di connessione. Rispondi semplicemente "OK".');
                console.log('✅ Test connessione OpenAI riuscito');
                return true;
            } catch (error) {
                console.error('❌ Test connessione OpenAI fallito:', error);
                return false;
            }
        },

        /**
         * Ottieni statistiche utilizzo
         */
        getUsageStats() {
            return {
                provider: 'OpenAI',
                model: this.modelName,
                modelInfo: this.availableModels[this.modelName],
                maxTokens: this.maxTokens,
                temperature: this.temperature,
                isInitialized: this.isInitialized
            };
        }
    };

    return openai;
})();

console.log('✅ OpenAI provider caricato');