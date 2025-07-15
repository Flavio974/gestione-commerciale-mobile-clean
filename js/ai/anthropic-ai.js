/**
 * ANTHROPIC AI PROVIDER
 * Provider per modelli Claude 4 di Anthropic
 */

window.AnthropicAI = (function() {
    'use strict';

    const anthropic = {
        isInitialized: false,
        apiKey: null,
        modelName: 'claude-opus-4-20250514', // Modello predefinito Claude 4
        baseUrl: 'https://api.anthropic.com/v1/messages',
        maxTokens: 4000,
        temperature: 0.7,
        
        // Modelli disponibili (aggiornati con Claude 4 - Luglio 2025)
        availableModels: {
            // 🚀 CLAUDE 4 MODELS (Latest Generation - Released July 15, 2025)
            'claude-opus-4-20250514': {
                name: 'Claude Opus 4 🔥',
                description: 'Il modello più potente al mondo per coding (72.5% SWE-bench)',
                maxTokens: 200000,
                contextWindow: 200000
            },
            'claude-sonnet-4-20250514': {
                name: 'Claude Sonnet 4 🌟',
                description: 'Prestazioni eccezionali con ragionamento avanzato',
                maxTokens: 200000,
                contextWindow: 200000
            },
            
            // Claude 3.7 Generation
            'claude-3-7-sonnet-20241022': {
                name: 'Claude 3.7 Sonnet',
                description: 'Stato dell\'arte per coding agentivo',
                maxTokens: 200000,
                contextWindow: 200000
            },
            
            // Claude 3.5 Generation
            'claude-3-5-sonnet-20241022': {
                name: 'Claude 3.5 Sonnet',
                description: 'Bilanciato e performante per uso generale',
                maxTokens: 200000,
                contextWindow: 200000
            },
            'claude-3-5-haiku-20241022': {
                name: 'Claude 3.5 Haiku',
                description: 'Veloce ed economico per compiti semplici',
                maxTokens: 200000,
                contextWindow: 200000
            },
            
            // Claude 3 Generation
            'claude-3-opus-20240229': {
                name: 'Claude 3 Opus',
                description: 'Il più potente della serie Claude 3',
                maxTokens: 200000,
                contextWindow: 200000
            },
            'claude-3-sonnet-20240229': {
                name: 'Claude 3 Sonnet',
                description: 'Bilanciato tra velocità e intelligenza',
                maxTokens: 200000,
                contextWindow: 200000
            },
            'claude-3-haiku-20240307': {
                name: 'Claude 3 Haiku',
                description: 'Il più veloce per risposte immediate',
                maxTokens: 200000,
                contextWindow: 200000
            },
            
            // Legacy Models
            'claude-2.1': {
                name: 'Claude 2.1',
                description: 'Versione precedente stabile e affidabile',
                maxTokens: 100000,
                contextWindow: 100000
            },
            'claude-instant-1.2': {
                name: 'Claude Instant 1.2',
                description: 'Ultra-veloce per compiti semplici e rapidi',
                maxTokens: 100000,
                contextWindow: 100000
            }
        },

        /**
         * Inizializzazione
         */
        init(apiKey, modelName = 'claude-opus-4-20250514') {
            try {
                if (!apiKey) {
                    // Cerca API key dalle variabili d'ambiente o configurazione
                    this.apiKey = this.getApiKeyFromConfig();
                    if (!this.apiKey) {
                        console.warn('⚠️ API Key Anthropic non configurata');
                        return false;
                    }
                } else if (apiKey === 'backend') {
                    // Usa backend per le API calls
                    this.apiKey = 'backend';
                    this.useBackend = true;
                    console.log('✅ Anthropic configurato per usare backend');
                } else {
                    this.apiKey = apiKey;
                }

                if (this.availableModels[modelName]) {
                    this.modelName = modelName;
                    console.log(`✅ Anthropic AI inizializzato con modello: ${this.availableModels[modelName].name}`);
                } else {
                    console.warn(`⚠️ Modello ${modelName} non disponibile, uso predefinito`);
                }

                this.isInitialized = true;
                return true;

            } catch (error) {
                console.error('❌ Errore inizializzazione Anthropic AI:', error);
                return false;
            }
        },

        /**
         * Ottieni API key dalla configurazione
         */
        getApiKeyFromConfig() {
            // Prova da localStorage
            const storedKey = localStorage.getItem('anthropic_api_key');
            if (storedKey) {
                return storedKey;
            }

            // Prova da configurazione globale
            if (window.AI_CONFIG?.anthropic?.apiKey) {
                return window.AI_CONFIG.anthropic.apiKey;
            }

            // Prova da variabili d'ambiente (per ambiente di sviluppo)
            if (typeof process !== 'undefined' && process.env?.ANTHROPIC_API_KEY) {
                return process.env.ANTHROPIC_API_KEY;
            }

            return null;
        },

        /**
         * Imposta API key
         */
        setApiKey(apiKey) {
            this.apiKey = apiKey;
            localStorage.setItem('anthropic_api_key', apiKey);
            console.log('✅ API Key Anthropic configurata');
        },

        /**
         * Imposta modello
         */
        setModel(modelName) {
            if (this.availableModels[modelName]) {
                this.modelName = modelName;
                console.log(`✅ Modello Anthropic cambiato a: ${this.availableModels[modelName].name}`);
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
                throw new Error('Anthropic AI non inizializzato o API key mancante');
            }

            try {
                console.log('🤖 Anthropic AI: Generando risposta...');
                
                // Prepara il messaggio per l'API
                const systemPrompt = this.buildSystemPrompt(context);
                const userMessage = this.formatMessage(message, context);

                const response = await this.callAnthropicAPI(systemPrompt, userMessage);
                
                console.log('✅ Risposta generata da Anthropic AI');
                return response;

            } catch (error) {
                console.error('❌ Errore generazione risposta Anthropic:', error);
                throw error;
            }
        },

        /**
         * Costruisce il prompt di sistema
         */
        buildSystemPrompt(context) {
            let systemPrompt = `Sei un assistente AI specializzato in gestione commerciale e aziendale. 
Rispondi sempre in italiano, sii preciso e professionale.`;

            if (context?.data) {
                systemPrompt += `\n\nDati di contesto disponibili:\n${JSON.stringify(context.data, null, 2)}`;
            }

            if (context?.type === 'analysis') {
                systemPrompt += `\n\nStai analizzando dati aziendali. Fornisci insights utili e actionable.`;
            }

            return systemPrompt;
        },

        /**
         * Formatta il messaggio utente
         */
        formatMessage(message, context) {
            if (!context) {
                return message;
            }

            let formattedMessage = message;

            // Aggiungi contesto se presente
            if (context.businessData) {
                formattedMessage += `\n\nDati aziendali:\n${JSON.stringify(context.businessData, null, 2)}`;
            }

            return formattedMessage;
        },

        /**
         * Chiamata API Anthropic
         */
        async callAnthropicAPI(systemPrompt, userMessage) {
            // Se usa backend, invia alla funzione serverless
            if (this.useBackend || this.apiKey === 'backend') {
                const backendPayload = {
                    provider: 'anthropic',
                    messages: [
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ],
                    model: this.modelName,
                    max_tokens: this.maxTokens,
                    temperature: this.temperature,
                    system: systemPrompt,
                    stream: false
                };

                const response = await fetch('/.netlify/functions/claude-ai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(backendPayload)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Backend API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
                }

                const data = await response.json();
                return data.content || data.message || 'Errore risposta backend';
            }

            // Altrimenti usa API diretta
            const payload = {
                model: this.modelName,
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: userMessage
                    }
                ]
            };

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API Anthropic error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            
            // Estrai il contenuto della risposta
            if (data.content && data.content.length > 0) {
                return data.content[0].text;
            } else {
                throw new Error('Risposta API Anthropic non valida');
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
                console.log('✅ Test connessione Anthropic AI riuscito');
                return true;
            } catch (error) {
                console.error('❌ Test connessione Anthropic AI fallito:', error);
                return false;
            }
        },

        /**
         * Ottieni statistiche utilizzo
         */
        getUsageStats() {
            return {
                provider: 'Anthropic',
                model: this.modelName,
                modelInfo: this.availableModels[this.modelName],
                maxTokens: this.maxTokens,
                temperature: this.temperature,
                isInitialized: this.isInitialized
            };
        }
    };

    return anthropic;
})();

console.log('✅ AnthropicAI provider caricato');