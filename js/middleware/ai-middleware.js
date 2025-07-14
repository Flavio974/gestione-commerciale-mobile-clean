/**
 * AI Middleware - Interceptor intelligente che consulta SEMPRE il vocabolario
 * REQUISITO CRITICO: DEVE SEMPRE consultare il vocabolario PRIMA dell'AI
 */

class AIMiddleware {
    constructor() {
        // Inizializza con verifiche di sicurezza
        if (window.VocabularyManager) {
            this.vocabularyManager = new VocabularyManager();
            console.log('🤖 VocabularyManager collegato al middleware');
        } else {
            console.warn('🤖 ⚠️ VocabularyManager non disponibile - creazione fallback');
            this.vocabularyManager = this.createVocabularyFallback();
        }
        
        if (window.TemporalParser) {
            this.temporalParser = new TemporalParser();
        } else {
            console.warn('🤖 ⚠️ TemporalParser non disponibile - creazione fallback');
            this.temporalParser = this.createTemporalFallback();
        }
        
        this.isEnabled = true;
        this.fallbackToAI = true;
        this.debug = true;
        
        console.log('🤖 AIMiddleware: Inizializzato');
    }

    /**
     * FUNZIONE PRINCIPALE: Processa TUTTE le richieste
     * 1. SEMPRE consulta il vocabolario aggiornato
     * 2. Solo se non trova match, passa all'AI
     */
    async processRequest(userInput, originalContext = null) {
        const startTime = Date.now();
        
        if (!this.isEnabled) {
            return this.passToAI(userInput, originalContext);
        }

        try {
            if (this.debug) {
                console.log('🤖 🚀 MIDDLEWARE: Processando richiesta:', userInput);
            }

            // STEP 1: SEMPRE consulta vocabolario aggiornato
            const vocabularyMatch = await this.vocabularyManager.findMatch(userInput);
            
            if (vocabularyMatch) {
                // MATCH TROVATO: Esegui azione locale
                if (this.debug) {
                    console.log('🤖 ✅ MATCH VOCABOLARIO:', vocabularyMatch.command.id);
                }
                
                const result = await this.executeLocalAction(vocabularyMatch, userInput, originalContext);
                
                if (result) {
                    return {
                        success: true,
                        source: 'vocabulary',
                        command: vocabularyMatch.command.id,
                        response: result.response,
                        data: result.data,
                        processingTime: result.processingTime
                    };
                }
            }

            // STEP 2: Prova con RequestMiddleware se disponibile
            if (this.requestMiddleware) {
                if (this.debug) {
                    console.log('🤖 💾 TENTATIVO REQUEST MIDDLEWARE (Supabase)');
                }
                
                const middlewareResult = await this.requestMiddleware.processRequest(userInput);
                
                if (middlewareResult && middlewareResult.handled) {
                    // Request middleware ha elaborato la richiesta
                    return {
                        success: true,
                        source: 'request_middleware',
                        response: middlewareResult.response || middlewareResult,
                        data: middlewareResult.data,
                        processingTime: Date.now() - startTime
                    };
                }
            }

            // STEP 3: Nessun match trovato, usa AI come fallback
            if (this.fallbackToAI) {
                if (this.debug) {
                    console.log('🤖 🔄 FALLBACK AD AI: Nessun match nel vocabolario');
                }
                
                return await this.passToAI(userInput, originalContext);
            } else {
                return {
                    success: false,
                    source: 'middleware',
                    error: 'Comando non riconosciuto e fallback AI disabilitato'
                };
            }

        } catch (error) {
            console.error('❌ Errore nel middleware:', error);
            
            // Fallback di sicurezza
            if (this.fallbackToAI) {
                return await this.passToAI(userInput, originalContext);
            } else {
                return {
                    success: false,
                    source: 'middleware',
                    error: error.message
                };
            }
        }
    }

    /**
     * Esegue azione locale basata sul vocabolario
     */
    async executeLocalAction(vocabularyMatch, userInput, originalContext) {
        const startTime = Date.now();
        const command = vocabularyMatch.command;
        const params = { ...command.params, ...vocabularyMatch.extractedParams };
        
        if (this.debug) {
            console.log('🤖 ⚡ ESECUZIONE LOCALE:', {
                action: command.action,
                params: params,
                pattern: vocabularyMatch.pattern
            });
        }

        try {
            let result;
            
            switch (command.action) {
                case 'getDateInfo':
                    result = await this.handleDateInfo(params, userInput);
                    break;
                    
                case 'getOrdersByDate':
                    result = await this.handleOrdersByDate(params, userInput, originalContext);
                    break;
                    
                case 'getOrdersByClient':
                    result = await this.handleOrdersByClient(params, userInput, originalContext);
                    break;
                    
                case 'scheduleReminder':
                    result = await this.handleScheduleReminder(params, userInput, originalContext);
                    break;
                    
                case 'createAppointment':
                    result = await this.handleCreateAppointment(params, userInput, originalContext);
                    break;
                    
                case 'countOrders':
                    result = await this.handleCountOrders(params, userInput, originalContext);
                    break;
                    
                case 'listOrders':
                    result = await this.handleListOrders(params, userInput, originalContext);
                    break;
                    
                case 'countClients':
                    result = await this.handleCountClients(params, userInput, originalContext);
                    break;
                    
                case 'calculateRevenue':
                    result = await this.handleCalculateRevenue(params, userInput, originalContext);
                    break;
                    
                case 'calculateMonthlyRevenue':
                    result = await this.handleCalculateMonthlyRevenue(params, userInput, originalContext);
                    break;
                    
                default:
                    // Azione non implementata, fallback
                    if (this.debug) {
                        console.log('🤖 ⚠️ AZIONE NON IMPLEMENTATA:', command.action);
                    }
                    return null;
            }

            const processingTime = Date.now() - startTime;
            
            return {
                response: result,
                data: null,
                processingTime: processingTime
            };

        } catch (error) {
            console.error('❌ Errore esecuzione azione locale:', error);
            return null;
        }
    }

    /**
     * Gestisce richieste di informazioni sulla data
     */
    async handleDateInfo(params, userInput) {
        let targetDate;
        let contextText;
        
        // Gestisci date con parametri dinamici
        if (params.date === 'daysAgo' && params.days) {
            const daysNum = parseInt(params.days);
            targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - daysNum);
            contextText = `${daysNum} ${daysNum === 1 ? 'giorno' : 'giorni'} fa`;
        } else if (params.date === 'daysFromNow' && params.days) {
            const daysNum = parseInt(params.days);
            targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + daysNum);
            contextText = `tra ${daysNum} ${daysNum === 1 ? 'giorno' : 'giorni'}`;
        } else {
            // Usa temporal parser per date standard
            targetDate = this.temporalParser.parseDate(params.date);
            contextText = this.getDateContext(params.date);
        }
        
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        
        const dateString = targetDate.toLocaleDateString('it-IT', options);
        
        // Determina il tipo di risposta basato sull'input
        if (userInput.toLowerCase().includes('che giorno')) {
            const dayName = targetDate.toLocaleDateString('it-IT', { weekday: 'long' });
            if (contextText.includes('fa')) {
                return `${this.capitalizeFirst(contextText)} era ${dayName}`;
            } else if (contextText.includes('tra')) {
                return `${this.capitalizeFirst(contextText)} sarà ${dayName}`;
            } else {
                return `${this.capitalizeFirst(contextText)} è ${dayName}`;
            }
        } else {
            if (contextText.includes('fa')) {
                return `${this.capitalizeFirst(contextText)} era ${dateString}`;
            } else if (contextText.includes('tra')) {
                return `${this.capitalizeFirst(contextText)} sarà ${dateString}`;
            } else {
                return `${this.capitalizeFirst(contextText)} è ${dateString}`;
            }
        }
    }

    /**
     * Gestisce richieste di ordini per data
     */
    async handleOrdersByDate(params, userInput, originalContext) {
        const targetDate = this.temporalParser.parseDate(params.date);
        
        // Simula ricerca ordini (in futuro: integrazione con database)
        const orders = await this.getOrdersFromDate(targetDate, originalContext);
        
        if (orders.length === 0) {
            return `Non ci sono ordini per ${this.getDateContext(params.date)}.`;
        }
        
        const orderList = orders.map(order => 
            `- ${order.client}: ${order.amount}€ (${order.status})`
        ).join('\n');
        
        return `Ordini per ${this.getDateContext(params.date)}:\n${orderList}`;
    }

    /**
     * Gestisce richieste di ordini per cliente
     */
    async handleOrdersByClient(params, userInput, originalContext) {
        const clientName = params.client;
        
        // Simula ricerca ordini cliente
        const orders = await this.getOrdersFromClient(clientName, originalContext);
        
        if (orders.length === 0) {
            return `Non ci sono ordini per il cliente ${clientName}.`;
        }
        
        const orderList = orders.map(order => 
            `- ${order.date}: ${order.amount}€ (${order.status})`
        ).join('\n');
        
        return `Ordini del cliente ${clientName}:\n${orderList}`;
    }

    /**
     * Simula ricerca ordini per data (da sostituire con vera integrazione)
     */
    async getOrdersFromDate(date, originalContext) {
        // Placeholder: in futuro integrerà con il database Supabase
        return [
            {
                id: 1,
                client: "Mario Rossi",
                amount: 150.00,
                status: "completato",
                date: date.toISOString().split('T')[0]
            }
        ];
    }

    /**
     * Simula ricerca ordini per cliente (da sostituire con vera integrazione)
     */
    async getOrdersFromClient(clientName, originalContext) {
        // Placeholder: in futuro integrerà con il database Supabase
        return [
            {
                id: 1,
                date: "2025-07-10",
                amount: 200.00,
                status: "in elaborazione"
            }
        ];
    }

    /**
     * Passa la richiesta all'AI originale
     */
    async passToAI(userInput, originalContext) {
        if (this.debug) {
            console.log('🤖 🧠 PASSAGGIO AD AI:', userInput);
        }
        
        // Restituisce un oggetto che indica di proseguire con l'AI originale
        return {
            success: true,
            source: 'ai_fallback',
            continueWithAI: true,
            originalInput: userInput,
            originalContext: originalContext
        };
    }

    /**
     * Utility: Ottiene contesto temporale
     */
    getDateContext(dateParam) {
        switch (dateParam) {
            case 'today': return 'oggi';
            case 'yesterday': return 'ieri';
            case 'tomorrow': return 'domani';
            default: return dateParam;
        }
    }

    /**
     * Utility: Capitalizza prima lettera
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * GESTIONE PROMEMORIA - Integrazione con SmartAssistant
     */
    async handleScheduleReminder(params, userInput, originalContext) {
        try {
            // Cerca istanza SmartAssistant
            const smartAssistant = window.smartAssistantInstance || 
                                 document.querySelector('.smart-assistant-container')?.__smartAssistant;
            
            if (smartAssistant && smartAssistant.scheduleReminder) {
                // Estrai parametri dal comando
                const taskText = params.task || userInput;
                const when = params.when || params.time || 'più tardi';
                
                // Calcola delay in minuti
                let delayMinutes = 0;
                if (params.delayMinutes) {
                    delayMinutes = parseInt(params.delayMinutes);
                } else if (params.time) {
                    delayMinutes = this.parseTimeToMinutes(params.time);
                }
                
                // Crea task se necessario
                const taskId = await this.createReminderTask(taskText, when, smartAssistant);
                
                // Programma promemoria
                smartAssistant.scheduleReminder(taskId, delayMinutes);
                
                return `✅ Promemoria impostato: "${taskText}" ${this.formatReminderTime(when, delayMinutes)}`;
            } else {
                console.warn('⚠️ SmartAssistant non disponibile per promemoria');
                return '⚠️ Sistema promemoria non disponibile al momento';
            }
        } catch (error) {
            console.error('❌ Errore gestione promemoria:', error);
            return `❌ Errore creazione promemoria: ${error.message}`;
        }
    }

    /**
     * GESTIONE APPUNTAMENTI - Integrazione con TimelineIntelligentManager
     */
    async handleCreateAppointment(params, userInput, originalContext) {
        try {
            // Cerca istanza TimelineIntelligentManager
            const timelineManager = window.timelineIntelligentManager || 
                                   window.TimelineIntelligentManager?.instance;
            
            if (!timelineManager) {
                // Prova a crearla se non esiste
                if (window.TimelineIntelligentManager) {
                    window.timelineIntelligentManager = new TimelineIntelligentManager();
                } else {
                    return '⚠️ Sistema appuntamenti non disponibile';
                }
            }
            
            // Prepara parametri appuntamento
            const appointmentParams = {
                cliente: params.cliente || this.extractClientFromInput(userInput),
                data: params.data || params.when || 'oggi',
                ora: params.ora || this.extractTimeFromInput(userInput) || '10:00',
                durata: parseInt(params.durata) || 60,
                note: params.note || ''
            };
            
            // Usa temporal parser per convertire data
            if (appointmentParams.data) {
                const parsedDate = this.temporalParser.parseDate(appointmentParams.data);
                appointmentParams.data = parsedDate.toISOString().split('T')[0];
            }
            
            console.log('📅 Creazione appuntamento:', appointmentParams);
            
            // Chiama il sistema appuntamenti
            const result = await window.timelineIntelligentManager.insertAppointmentFromCommand(appointmentParams);
            
            if (result.success) {
                return result.message;
            } else {
                return `❌ ${result.message || 'Errore creazione appuntamento'}`;
            }
            
        } catch (error) {
            console.error('❌ Errore gestione appuntamento:', error);
            return `❌ Errore creazione appuntamento: ${error.message}`;
        }
    }

    /**
     * Crea task per promemoria
     */
    async createReminderTask(taskText, when, smartAssistant) {
        const task = {
            id: 'reminder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            descrizione: taskText,
            priorita: 'media',
            dataCreazione: new Date().toISOString(),
            dataScadenza: this.calculateReminderDate(when),
            stato: 'pending',
            categoria: 'reminder'
        };
        
        // Salva task
        const tasks = JSON.parse(localStorage.getItem('smart_automatic_tasks') || '[]');
        tasks.unshift(task);
        localStorage.setItem('smart_automatic_tasks', JSON.stringify(tasks));
        
        return task.id;
    }

    /**
     * Calcola data promemoria
     */
    calculateReminderDate(when) {
        const now = new Date();
        
        // Usa temporal parser se disponibile
        const parsed = this.temporalParser.parseDate(when);
        if (parsed && parsed.getTime() !== now.getTime()) {
            return parsed.toISOString();
        }
        
        // Default: 1 ora da ora
        now.setHours(now.getHours() + 1);
        return now.toISOString();
    }

    /**
     * Parsing tempo in minuti
     */
    parseTimeToMinutes(timeStr) {
        const str = timeStr.toLowerCase();
        
        // Pattern: "X minuti"
        const minuteMatch = str.match(/(\d+)\s*minut/);
        if (minuteMatch) return parseInt(minuteMatch[1]);
        
        // Pattern: "X ore"
        const hourMatch = str.match(/(\d+)\s*or/);
        if (hourMatch) return parseInt(hourMatch[1]) * 60;
        
        // Pattern: "mezz'ora"
        if (str.includes('mezz') && str.includes('ora')) return 30;
        
        return 60; // Default: 1 ora
    }

    /**
     * Formatta tempo promemoria
     */
    formatReminderTime(when, delayMinutes) {
        if (delayMinutes > 0) {
            if (delayMinutes < 60) {
                return `tra ${delayMinutes} minuti`;
            } else {
                const hours = Math.floor(delayMinutes / 60);
                return `tra ${hours} ${hours === 1 ? 'ora' : 'ore'}`;
            }
        }
        return when ? `per ${when}` : '';
    }

    /**
     * Estrai cliente dall'input
     */
    extractClientFromInput(input) {
        // Pattern: "con NOME" o "per NOME"
        const match = input.match(/(?:con|per)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
        return match ? match[1] : 'Cliente';
    }

    /**
     * Estrai orario dall'input
     */
    extractTimeFromInput(input) {
        // Pattern: "alle HH:MM" o "ore HH"
        const timeMatch = input.match(/(?:alle|ore)\s*(\d{1,2}):?(\d{2})?/);
        if (timeMatch) {
            const hours = timeMatch[1];
            const minutes = timeMatch[2] || '00';
            return `${hours.padStart(2, '0')}:${minutes}`;
        }
        return null;
    }

    /**
     * Abilita/disabilita middleware
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`🤖 Middleware ${enabled ? 'abilitato' : 'disabilitato'}`);
    }

    /**
     * Abilita/disabilita fallback AI
     */
    setFallbackToAI(enabled) {
        this.fallbackToAI = enabled;
        console.log(`🤖 Fallback AI ${enabled ? 'abilitato' : 'disabilitato'}`);
    }

    /**
     * Crea fallback per VocabularyManager
     */
    createVocabularyFallback() {
        return {
            findMatch: async (input) => {
                console.warn('🤖 ⚠️ VocabularyManager fallback - nessun match');
                return null;
            },
            getStats: () => ({ totalCommands: 0, totalPatterns: 0 })
        };
    }

    /**
     * Gestisce conteggio ordini
     */
    async handleCountOrders(params, userInput, originalContext) {
        try {
            if (this.debug) {
                console.log('🤖 📊 CONTEGGIO ORDINI');
            }
            
            // Usa RequestMiddleware se disponibile
            if (this.requestMiddleware) {
                const result = await this.requestMiddleware.countOrdini({ righeOrdine: false });
                if (result && result.success) {
                    return result.response;
                }
            }
            
            // Fallback: usa dati diretti
            const allData = await this.getAllDataSafely();
            const ordini = allData.historicalOrders?.sampleData || [];
            
            if (ordini.length === 0) {
                return "Non ci sono ordini nel database.";
            }
            
            // Conta ordini distinti
            const ordiniDistinti = new Set(
                ordini.map(o => o.numero_ordine).filter(n => n && n !== null)
            );
            
            return `📊 Ci sono ${ordiniDistinti.size} ordini distinti nel database (${ordini.length} righe totali).`;
            
        } catch (error) {
            console.error('❌ Errore conteggio ordini:', error);
            return "❌ Errore nel conteggio degli ordini.";
        }
    }
    
    /**
     * Gestisce lista ordini
     */
    async handleListOrders(params, userInput, originalContext) {
        try {
            if (this.debug) {
                console.log('🤖 📋 LISTA ORDINI');
            }
            
            const allData = await this.getAllDataSafely();
            const ordini = allData.historicalOrders?.sampleData || [];
            
            if (ordini.length === 0) {
                return "Non ci sono ordini nel database.";
            }
            
            // Raggruppa per numero ordine
            const ordiniRaggruppati = {};
            ordini.forEach(ordine => {
                if (!ordiniRaggruppati[ordine.numero_ordine]) {
                    ordiniRaggruppati[ordine.numero_ordine] = {
                        numero: ordine.numero_ordine,
                        cliente: ordine.cliente,
                        data: ordine.data,
                        importo: 0,
                        righe: 0
                    };
                }
                ordiniRaggruppati[ordine.numero_ordine].importo += ordine.importo || 0;
                ordiniRaggruppati[ordine.numero_ordine].righe++;
            });
            
            // Crea lista ordinata
            const listaOrdini = Object.values(ordiniRaggruppati)
                .sort((a, b) => new Date(b.data) - new Date(a.data))
                .slice(0, 10); // Primi 10 ordini
            
            let risposta = "📋 **Ultimi 10 ordini:**\\n\\n";
            listaOrdini.forEach(ordine => {
                risposta += `• **${ordine.numero}** - ${ordine.cliente}\\n`;
                risposta += `  Data: ${ordine.data} | Importo: €${ordine.importo.toFixed(2)} | Righe: ${ordine.righe}\\n\\n`;
            });
            
            return risposta;
            
        } catch (error) {
            console.error('❌ Errore lista ordini:', error);
            return "❌ Errore nella visualizzazione degli ordini.";
        }
    }
    
    /**
     * Gestisce conteggio clienti
     */
    async handleCountClients(params, userInput, originalContext) {
        try {
            if (this.debug) {
                console.log('🤖 👥 CONTEGGIO CLIENTI');
            }
            
            const allData = await this.getAllDataSafely();
            const clienti = allData.clients || [];
            
            if (clienti.length === 0) {
                return "Non ci sono clienti nel database.";
            }
            
            return `👥 Ci sono ${clienti.length} clienti nel database.`;
            
        } catch (error) {
            console.error('❌ Errore conteggio clienti:', error);
            return "❌ Errore nel conteggio dei clienti.";
        }
    }
    
    /**
     * Gestisce calcolo fatturato totale
     */
    async handleCalculateRevenue(params, userInput, originalContext) {
        try {
            if (this.debug) {
                console.log('🤖 💰 CALCOLO FATTURATO TOTALE');
            }
            
            // Usa RequestMiddleware se disponibile
            if (this.requestMiddleware) {
                const result = await this.requestMiddleware.calcFatturato({});
                if (result && result.success) {
                    return result.response;
                }
            }
            
            // Fallback: calcolo diretto
            const allData = await this.getAllDataSafely();
            const ordini = allData.historicalOrders?.sampleData || [];
            
            if (ordini.length === 0) {
                return "Non ci sono ordini per calcolare il fatturato.";
            }
            
            const totale = ordini.reduce((sum, ordine) => sum + (parseFloat(ordine.importo) || 0), 0);
            
            return `💰 Fatturato totale: €${totale.toLocaleString('it-IT', {minimumFractionDigits: 2})} su ${ordini.length} righe ordini`;
            
        } catch (error) {
            console.error('❌ Errore calcolo fatturato:', error);
            return "❌ Errore nel calcolo del fatturato.";
        }
    }
    
    /**
     * Gestisce calcolo fatturato mensile
     */
    async handleCalculateMonthlyRevenue(params, userInput, originalContext) {
        try {
            if (this.debug) {
                console.log('🤖 📅 CALCOLO FATTURATO MENSILE:', params.mese);
            }
            
            const allData = await this.getAllDataSafely();
            const ordini = allData.historicalOrders?.sampleData || [];
            
            if (ordini.length === 0) {
                return "Non ci sono ordini per calcolare il fatturato mensile.";
            }
            
            // Filtra per mese se specificato
            let ordiniFiltrati = ordini;
            if (params.mese) {
                const mese = params.mese.toLowerCase();
                ordiniFiltrati = ordini.filter(ordine => {
                    if (!ordine.data) return false;
                    const dataOrdine = new Date(ordine.data);
                    const nomeMesseOrdine = dataOrdine.toLocaleDateString('it-IT', { month: 'long' }).toLowerCase();
                    return nomeMesseOrdine.includes(mese) || mese.includes(nomeMesseOrdine);
                });
            } else {
                // Mese corrente
                const meseCorrente = new Date().getMonth();
                ordiniFiltrati = ordini.filter(ordine => {
                    if (!ordine.data) return false;
                    const dataOrdine = new Date(ordine.data);
                    return dataOrdine.getMonth() === meseCorrente;
                });
            }
            
            if (ordiniFiltrati.length === 0) {
                const meseStr = params.mese || 'questo mese';
                return `Non ci sono ordini per ${meseStr}.`;
            }
            
            const totale = ordiniFiltrati.reduce((sum, ordine) => sum + (parseFloat(ordine.importo) || 0), 0);
            const meseStr = params.mese || 'questo mese';
            
            return `💰 Fatturato ${meseStr}: €${totale.toLocaleString('it-IT', {minimumFractionDigits: 2})} su ${ordiniFiltrati.length} righe ordini`;
            
        } catch (error) {
            console.error('❌ Errore calcolo fatturato mensile:', error);
            return "❌ Errore nel calcolo del fatturato mensile.";
        }
    }

    /**
     * Ottiene dati in modo sicuro
     */
    async getAllDataSafely() {
        try {
            if (this.requestMiddleware && this.requestMiddleware.supabaseAI) {
                return await this.requestMiddleware.supabaseAI.getAllData();
            }
            
            // Fallback a dati locali
            return {
                historicalOrders: { sampleData: [] },
                clients: [],
                orders: []
            };
        } catch (error) {
            console.error('❌ Errore accesso dati:', error);
            return {
                historicalOrders: { sampleData: [] },
                clients: [],
                orders: []
            };
        }
    }

    /**
     * Crea fallback per TemporalParser
     */
    createTemporalFallback() {
        return {
            parseDate: (dateStr) => {
                console.warn('🤖 ⚠️ TemporalParser fallback');
                return new Date();
            }
        };
    }

    /**
     * Statistiche del middleware
     */
    getStats() {
        return {
            enabled: this.isEnabled,
            fallbackToAI: this.fallbackToAI,
            vocabularyStats: this.vocabularyManager ? this.vocabularyManager.getStats() : null
        };
    }
}

// Esporta classe per uso globale
window.AIMiddleware = AIMiddleware;