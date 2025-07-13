/**
 * GEMINI AI INTEGRATION
 * Integrazione con Google Gemini AI
 */

window.GeminiAI = (function() {
    'use strict';

    const gemini = {
        apiKey: null,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        isConfigured: false,

        /**
         * Inizializzazione
         */
        init(apiKey = null) {
            if (apiKey) {
                this.apiKey = apiKey;
                this.isConfigured = true;
                console.log('✅ GeminiAI configurato');
            } else {
                console.warn('⚠️ GeminiAI: API key non fornita');
            }
            return this.isConfigured;
        },

        /**
         * Configura API key
         */
        setApiKey(apiKey) {
            this.apiKey = apiKey;
            this.isConfigured = !!apiKey;
            return this.isConfigured;
        },

        /**
         * Genera risposta
         */
        async generateResponse(prompt, context = null) {
            if (!this.isConfigured) {
                throw new Error('GeminiAI non configurato - API key mancante');
            }

            try {
                const requestBody = {
                    contents: [{
                        parts: [{
                            text: this.buildPrompt(prompt, context)
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                };

                const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    return data.candidates[0].content.parts[0].text;
                } else {
                    throw new Error('Risposta non valida da Gemini');
                }

            } catch (error) {
                console.error('❌ Errore Gemini AI:', error);
                throw error;
            }
        },

        /**
         * Costruisce il prompt con contesto
         */
        buildPrompt(userPrompt, context) {
            let fullPrompt = '';

            if (context) {
                fullPrompt += `Contesto: ${JSON.stringify(context, null, 2)}\n\n`;
            }

            fullPrompt += `Sei un assistente AI per un'applicazione di gestione commerciale italiana. `;
            fullPrompt += `Rispondi in italiano in modo professionale e conciso.\n\n`;
            fullPrompt += `Domanda: ${userPrompt}`;

            return fullPrompt;
        },

        /**
         * Chat conversazionale
         */
        async chat(message, conversationHistory = []) {
            const context = {
                conversation: conversationHistory,
                timestamp: new Date().toISOString(),
                type: 'chat'
            };

            return await this.generateResponse(message, context);
        },

        /**
         * Analisi dati aziendali
         */
        async analyzeBusinessData(data, question) {
            const context = {
                businessData: data,
                analysisType: 'business',
                timestamp: new Date().toISOString()
            };

            const prompt = `Analizza questi dati aziendali e rispondi alla domanda: ${question}`;
            return await this.generateResponse(prompt, context);
        },

        /**
         * Suggerimenti intelligenti
         */
        async getSuggestions(currentData, action) {
            const context = {
                currentData,
                action,
                type: 'suggestions'
            };

            const prompt = `Basandoti sui dati forniti, suggerisci le migliori azioni per: ${action}`;
            return await this.generateResponse(prompt, context);
        },

        /**
         * Test connessione
         */
        async testConnection() {
            try {
                const response = await this.generateResponse('Ciao, puoi confermare che funzioni?');
                console.log('✅ Test Gemini AI riuscito:', response);
                return true;
            } catch (error) {
                console.error('❌ Test Gemini AI fallito:', error);
                return false;
            }
        }
    };

    return gemini;
})();

console.log('✅ GeminiAI caricato');