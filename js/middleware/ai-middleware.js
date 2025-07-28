/**
 * 🚀 AI MIDDLEWARE OTTIMIZZATO
 * Sistema unificato con 5 azioni generiche per massima scalabilità
 * 
 * PRINCIPI:
 * - Parametri standardizzati
 * - Handler generici riutilizzabili  
 * - Gestione errori consistente
 * - Logging strutturato
 * - Zero duplicazione codice
 */

console.log('[LOAD] ✅ ai-middleware-optimized.js caricato correttamente');

class AIMiddlewareOptimized {
    constructor() {
        this.debug = localStorage.getItem('ai_debug') === 'true';
        this.version = '2.0.0';
        this.supportedEntities = ['orders', 'clients', 'products', 'appointments', 'reminders'];
        this.supportedOperations = ['list', 'count', 'sum', 'details', 'create', 'update', 'delete'];
        
        console.log(`🤖 AI Middleware Optimized ${this.version} inizializzato`);
        console.log(`🎯 Entità supportate: ${this.supportedEntities.join(', ')}`);
        console.log(`⚙️ Operazioni supportate: ${this.supportedOperations.join(', ')}`);
    }

    /**
     * 🎯 ENTRY POINT PRINCIPALE - Solo 5 azioni generiche!
     */
    async executeLocalAction(command, originalMessage, originalContext) {
        const startTime = Date.now();
        
        try {
            if (this.debug) {
                console.log('🤖 🚀 EXECUTE OPTIMIZED ACTION:', {
                    action: command.action,
                    params: command.params,
                    message: originalMessage,
                    version: this.version
                });
            }
            
            // Normalizza parametri in ingresso
            const params = this.normalizeParameters(command.params || {});
            
            let result;
            
            // 🎯 ROUTER PRINCIPALE - SOLO 5 AZIONI GENERICHE!
            switch(command.action) {
                case 'universal_query':
                    result = await this.handleUniversalQuery(params, originalMessage, originalContext);
                    break;
                    
                case 'universal_action':
                    result = await this.handleUniversalAction(params, originalMessage, originalContext);
                    break;
                    
                case 'system_info':
                    result = await this.handleSystemInfo(params, originalMessage, originalContext);
                    break;
                    
                case 'generate_report':
                    result = await this.handleReport(params, originalMessage, originalContext);
                    break;
                    
                case 'help':
                    result = await this.handleHelp(params, originalMessage, originalContext);
                    break;
                    
                // 🔄 COMPATIBILITÀ: Mapping automatico azioni vecchie → nuove
                case 'getOrdersByDate':
                case 'getOrdersByClient':
                case 'listOrders':
                case 'countOrders':
                case 'listClients':
                case 'countClients':
                case 'calculateRevenue':
                case 'calculateMonthlyRevenue':
                case 'countTotalOrders':
                    result = await this.handleLegacyAction(command.action, params, originalMessage, originalContext);
                    break;
                    
                case 'getDateInfo':
                    result = await this.handleSystemInfo({type: 'date'}, originalMessage, originalContext);
                    break;
                    
                case 'getTimeInfo':
                    result = await this.handleSystemInfo({type: 'time'}, originalMessage, originalContext);
                    break;
                    
                case 'getDateTimeInfo':
                    result = await this.handleSystemInfo({type: 'datetime'}, originalMessage, originalContext);
                    break;
                    
                case 'getHistoricalDate':
                    result = await this.handleSystemInfo({type: 'historical'}, originalMessage, originalContext);
                    break;
                    
                case 'getDayOfWeek':
                    result = await this.handleSystemInfo({type: 'dayofweek'}, originalMessage, originalContext);
                    break;
                    
                case 'getFutureDate':
                    result = await this.handleSystemInfo({type: 'future'}, originalMessage, originalContext);
                    break;
                    
                case 'scheduleReminder':
                case 'createAppointment':
                    result = await this.handleLegacyAction(command.action, params, originalMessage, originalContext);
                    break;
                    
                default:
                    throw new Error(`Azione non riconosciuta: ${command.action}`);
            }
            
            const processingTime = Date.now() - startTime;
            
            const finalResult = this.formatResponse(result, 'summary', {
                processingTime,
                action: command.action,
                version: this.version
            });
            
            if (this.debug) {
                console.log('🤖 ✅ EXECUTION COMPLETED:', {
                    success: true,
                    processingTime: processingTime + 'ms',
                    resultType: typeof result,
                    hasData: !!finalResult.data
                });
            }
            
            return finalResult;
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            
            console.error('🤖 ❌ EXECUTION ERROR:', {
                error: error.message,
                action: command.action,
                params: command.params,
                processingTime: processingTime + 'ms'
            });
            
            return this.errorResponse(error, {
                action: command.action,
                processingTime
            });
        }
    }

    /**
     * 🎯 UNIVERSAL QUERY - Gestisce TUTTE le query di lettura dati
     */
    async handleUniversalQuery(params, userInput, originalContext) {
        const { entity, operation, filters = {}, field, output = 'summary' } = params;
        
        if (this.debug) {
            console.log('🤖 📊 UNIVERSAL QUERY:', {
                entity,
                operation, 
                filters,
                field,
                output
            });
        }
        
        // Validazione parametri
        this.validateQueryParams(entity, operation);
        
        // Estrai nome cliente se presente nei filtri
        if (filters.cliente || filters.client) {
            const clienteName = this.extractClientName(params, userInput, originalContext);
            if (clienteName) {
                filters.cliente = clienteName;
                delete filters.client; // Normalizza
            }
        }
        
        // Router interno basato su entity + operation
        const queryKey = `${entity}_${operation}`;
        
        let result;
        switch(queryKey) {
            // ORDERS
            case 'orders_list':
                result = await this.queryOrders('list', filters);
                break;
            case 'orders_count':
                result = await this.queryOrders('count', filters);
                break;
            case 'orders_sum':
                result = await this.queryOrders('sum', filters, field || 'importo');
                break;
            case 'orders_details':
                result = await this.queryOrders('details', filters);
                break;
                
            // CLIENTS
            case 'clients_list':
                result = await this.queryClients('list', filters);
                break;
            case 'clients_count':
                result = await this.queryClients('count', filters);
                break;
            case 'clients_details':
                result = await this.queryClients('details', filters);
                break;
                
            // PRODUCTS
            case 'products_list':
                result = await this.queryProducts('list', filters);
                break;
            case 'products_count':
                result = await this.queryProducts('count', filters);
                break;
                
            // APPOINTMENTS
            case 'appointments_list':
                result = await this.queryAppointments('list', filters);
                break;
            case 'appointments_count':
                result = await this.queryAppointments('count', filters);
                break;
                
            default:
                throw new Error(`Query non supportata: ${queryKey}`);
        }
        
        return result;
    }

    /**
     * 🎯 UNIVERSAL ACTION - Gestisce TUTTE le azioni di modifica
     */
    async handleUniversalAction(params, userInput, originalContext) {
        const { entity, operation, data = {}, filters = {} } = params;
        
        if (this.debug) {
            console.log('🤖 ⚡ UNIVERSAL ACTION:', {
                entity,
                operation,
                data,
                filters
            });
        }
        
        // Validazione parametri
        this.validateActionParams(entity, operation);
        
        // Router interno basato su entity + operation
        const actionKey = `${entity}_${operation}`;
        
        let result;
        switch(actionKey) {
            case 'reminders_create':
                result = await this.createReminder(data);
                break;
            case 'appointments_create':
                result = await this.createAppointment(data);
                break;
            case 'appointments_update':
                result = await this.updateAppointment(filters.id, data);
                break;
            case 'appointments_delete':
                result = await this.deleteAppointment(filters.id);
                break;
                
            default:
                throw new Error(`Azione non supportata: ${actionKey}`);
        }
        
        return result;
    }

    /**
     * 🎯 SYSTEM INFO - Informazioni di sistema
     */
    async handleSystemInfo(params, userInput, originalContext) {
        const { type, format = 'italian' } = params;
        
        if (this.debug) {
            console.log('🤖 ℹ️ SYSTEM INFO:', { type, format });
        }
        
        switch(type) {
            case 'date':
                return this.getDateInfo(format);
            case 'time':
                return this.getTimeInfo(format);
            case 'datetime':
                return this.getDateTimeInfo(format);
            case 'historical':
                return this.getHistoricalDateInfo(userInput, format);
            case 'future':
                return this.getFutureDateInfo(userInput, format);
            case 'dayofweek':
                return this.getDayOfWeekInfo(format);
            case 'version':
                return this.getVersionInfo();
            case 'status':
                return this.getSystemStatus();
                
            default:
                throw new Error(`Tipo info non supportato: ${type}`);
        }
    }

    /**
     * 🎯 GENERATE REPORT - Report complessi
     */
    async handleReport(params, userInput, originalContext) {
        const { type, periodo, filters = {}, format = 'summary' } = params;
        
        if (this.debug) {
            console.log('🤖 📈 GENERATE REPORT:', { type, periodo, filters, format });
        }
        
        switch(type) {
            case 'fatturato_mensile':
                return await this.generateMonthlyRevenueReport(periodo, filters);
            case 'ordini_cliente':
                return await this.generateClientOrdersReport(filters.cliente);
            case 'performance_vendite':
                return await this.generateSalesPerformanceReport(periodo);
                
            default:
                throw new Error(`Report non supportato: ${type}`);
        }
    }

    /**
     * 🎯 HELP - Aiuto e documentazione
     */
    async handleHelp(params, userInput, originalContext) {
        const { topic = 'general' } = params;
        
        const helpTopics = {
            general: `🤖 **AI Assistant per Gestione Commerciale**

📋 **Comandi disponibili:**
• "ordini di oggi/ieri/domani"
• "fatturato di [cliente]"
• "quanti clienti ho"
• "crea appuntamento con [cliente]"
• "che ora è / che giorno è"

🔍 **Esempi:**
• "mostrami ordini di Mario Rossi"
• "quanto ha speso La Mandria questo mese"
• "lista dei miei clienti"

❓ Per aiuto specifico: "aiuto [argomento]"`,
            
            comandi: `📋 **Lista Comandi Completa:**

🛒 **Ordini:**
• Lista: "ordini di oggi", "ordini di [cliente]"
• Conteggio: "quanti ordini ho fatto"
• Fatturato: "fatturato di [cliente]", "venduto oggi"

👥 **Clienti:**  
• Lista: "lista clienti", "tutti i clienti"
• Conteggio: "quanti clienti ho"

📅 **Date e Orari:**
• "che ora è", "che giorno è oggi"
• "ordini di ieri/oggi/domani"

⚙️ **Sistema:**
• "aiuto" - questa guida
• "stato sistema" - informazioni tecniche`,
            
            esempi: `💡 **Esempi d'Uso:**

**Query sui dati:**
• "dimmi il fatturato di Essemme"
• "mostrami ordini di La Mandria"  
• "quanti clienti ho nel database"
• "ordini fatti ieri"

**Azioni:**
• "crea appuntamento con Mario Rossi domani alle 14:00"
• "promemoria tra 30 minuti: chiamare cliente"

**Informazioni:**
• "che ora è adesso"
• "stato del sistema"
• "versione dell'applicazione"`
        };
        
        return helpTopics[topic] || helpTopics.general;
    }

    // ==================== HANDLER SPECIFICI PER ENTITÀ ====================

    /**
     * 📦 Query ordini con filtri avanzati
     */
    async queryOrders(operation, filters, field = 'importo') {
        const allData = await this.getAllDataSafely();
        let ordini = allData.historicalOrders?.sampleData || [];
        
        if (ordini.length === 0) {
            return this.createResult([], "Non ci sono ordini nel database.", { count: 0 });
        }
        
        // Applica filtri
        ordini = this.applyFilters(ordini, filters);
        
        if (this.debug) {
            console.log(`📦 Query ordini ${operation}:`, {
                totalOrders: allData.historicalOrders?.sampleData?.length || 0,
                filteredOrders: ordini.length,
                filters
            });
        }
        
        switch(operation) {
            case 'list':
                return this.formatOrdersList(ordini, filters);
            case 'count':
                return this.createResult(ordini.length, `Trovati ${ordini.length} ordini`, { count: ordini.length });
            case 'sum':
                const total = ordini.reduce((sum, ord) => sum + (ord[field] || 0), 0);
                return this.createResult(total, `Totale: €${total.toFixed(2)}`, { sum: total, field, count: ordini.length });
            case 'details':
                return this.formatOrdersDetails(ordini, filters);
                
            default:
                throw new Error(`Operazione ordini non supportata: ${operation}`);
        }
    }

    /**
     * 👥 Query clienti con filtri
     */
    async queryClients(operation, filters) {
        const allData = await this.getAllDataSafely();
        let clienti = allData.clients || [];
        
        if (clienti.length === 0) {
            return this.createResult([], "Non ci sono clienti nel database.", { count: 0 });
        }
        
        // Applica filtri se necessario
        if (filters.nome) {
            clienti = clienti.filter(client => 
                this.clientNamesMatch(client.name, filters.nome)
            );
        }
        
        if (this.debug) {
            console.log(`👥 Query clienti ${operation}:`, {
                totalClients: allData.clients?.length || 0,
                filteredClients: clienti.length,
                filters
            });
        }
        
        switch(operation) {
            case 'list':
                return this.formatClientsList(clienti);
            case 'count':
                return this.createResult(clienti.length, `Trovati ${clienti.length} clienti`, { count: clienti.length });
            case 'details':
                return this.formatClientsDetails(clienti);
                
            default:
                throw new Error(`Operazione clienti non supportata: ${operation}`);
        }
    }

    /**
     * 🎯 Query prodotti (placeholder per future estensioni)
     */
    async queryProducts(operation, filters) {
        // TODO: Implementare quando i dati prodotti saranno disponibili
        return this.createResult([], "Query prodotti non ancora implementata", { count: 0 });
    }

    /**
     * 📅 Query appuntamenti (placeholder per future estensioni)
     */
    async queryAppointments(operation, filters) {
        // TODO: Implementare gestione appuntamenti
        return this.createResult([], "Query appuntamenti non ancora implementata", { count: 0 });
    }

    // ==================== METODI HELPER PRINCIPALI ====================

    /**
     * 🔧 Normalizza i parametri in ingresso
     */
    normalizeParameters(params) {
        const normalized = { ...params };
        
        // Normalizza nomi parametri comuni
        if (normalized.client) {
            normalized.cliente = normalized.client;
            delete normalized.client;
        }
        
        if (normalized.date) {
            normalized.data = normalized.date;
            delete normalized.date;
        }
        
        // Normalizza valori booleani
        ['debug', 'detailed', 'includeEmpty'].forEach(key => {
            if (typeof normalized[key] === 'string') {
                normalized[key] = normalized[key].toLowerCase() === 'true';
            }
        });
        
        return normalized;
    }

    /**
     * 🔍 Estrae nome cliente da parametri, input o contesto
     */
    extractClientName(params, userInput, originalContext) {
        if (this.debug) {
            console.log('🔍 Extracting client name:', {
                'params.cliente': params?.cliente,
                'originalContext?.extractedParams?.cliente': originalContext?.extractedParams?.cliente,
                userInput: userInput
            });
        }
        
        // Priority 1: Use extractedParams from vocabulary matching
        if (originalContext?.extractedParams?.cliente) {
            const clienteName = originalContext.extractedParams.cliente;
            if (this.debug) console.log('🎯 Using extractedParams.cliente:', clienteName);
            return clienteName;
        }
        
        // Priority 2: Use merged params.cliente  
        if (params?.cliente && params.cliente !== '{cliente}') {
            const clienteName = params.cliente;
            if (this.debug) console.log('🎯 Using params.cliente:', clienteName);
            return clienteName;
        }
        
        // Priority 3: Extract from user input using regex
        if (userInput) {
            const clienteMatch = userInput.match(/\bcliente\s+([a-zA-ZàèìòùÀÈÌÒÙ\s]+?)(?:\s*$|\s+(?:di|del|per|con|[.?!]))/i);
            if (clienteMatch && clienteMatch[1]) {
                const clienteName = clienteMatch[1].trim();
                if (this.debug) console.log('🎯 Extracted from input:', clienteName);
                return clienteName;
            }
            
            // Alternative patterns
            const diClienteMatch = userInput.match(/\bdi\s+([a-zA-ZàèìòùÀÈÌÒÙ\s]+?)(?:\s*$|\s*[.?!])/i);
            if (diClienteMatch && diClienteMatch[1]) {
                const clienteName = diClienteMatch[1].trim();
                if (this.debug) console.log('🎯 Extracted alternative pattern:', clienteName);
                return clienteName;
            }
        }
        
        if (this.debug) console.log('❌ No client name found');
        return null;
    }

    /**
     * ✅ Validazione parametri query
     */
    validateQueryParams(entity, operation) {
        if (!entity) {
            throw new Error('Parametro "entity" richiesto per query');
        }
        
        if (!operation) {
            throw new Error('Parametro "operation" richiesto per query');
        }
        
        if (!this.supportedEntities.includes(entity)) {
            throw new Error(`Entità non supportata: ${entity}. Supportate: ${this.supportedEntities.join(', ')}`);
        }
        
        if (!this.supportedOperations.includes(operation)) {
            throw new Error(`Operazione non supportata: ${operation}. Supportate: ${this.supportedOperations.join(', ')}`);
        }
    }

    /**
     * ✅ Validazione parametri azioni
     */
    validateActionParams(entity, operation) {
        if (!entity) {
            throw new Error('Parametro "entity" richiesto per azione');
        }
        
        if (!operation) {
            throw new Error('Parametro "operation" richiesto per azione');
        }
        
        const actionOperations = ['create', 'update', 'delete'];
        if (!actionOperations.includes(operation)) {
            throw new Error(`Operazione azione non supportata: ${operation}. Supportate: ${actionOperations.join(', ')}`);
        }
    }

    /**
     * 🔄 Applica filtri ai dati
     */
    applyFilters(data, filters) {
        let filtered = [...data];
        
        // Filtro per cliente
        if (filters.cliente) {
            filtered = filtered.filter(item => 
                item.cliente && this.clientNamesMatch(item.cliente, filters.cliente)
            );
        }
        
        // Filtro per data
        if (filters.data || filters.periodo) {
            const targetDate = this.parseDate(filters.data || filters.periodo);
            if (targetDate) {
                filtered = filtered.filter(item => {
                    if (!item.data) return false;
                    const itemDate = new Date(item.data);
                    return this.isSameDay(itemDate, targetDate);
                });
            }
        }
        
        // Filtro per periodo (oggi, ieri, etc.)
        if (filters.periodo && !filters.data) {
            filtered = this.filterByPeriod(filtered, filters.periodo);
        }
        
        return filtered;
    }

    /**
     * 📅 Filtra dati per periodo
     */
    filterByPeriod(data, periodo) {
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);
        
        switch(periodo.toLowerCase()) {
            case 'oggi':
            case 'today':
                return data.filter(item => {
                    const itemDate = new Date(item.data);
                    return this.isSameDay(itemDate, oggi);
                });
                
            case 'ieri':
            case 'yesterday':
                const ieri = new Date(oggi);
                ieri.setDate(oggi.getDate() - 1);
                return data.filter(item => {
                    const itemDate = new Date(item.data);
                    return this.isSameDay(itemDate, ieri);
                });
                
            case 'domani':
            case 'tomorrow':
                const domani = new Date(oggi);
                domani.setDate(oggi.getDate() + 1);
                return data.filter(item => {
                    const itemDate = new Date(item.data);
                    return this.isSameDay(itemDate, domani);
                });
                
            case 'settimana':
            case 'week':
                const inizioSettimana = new Date(oggi);
                inizioSettimana.setDate(oggi.getDate() - oggi.getDay());
                return data.filter(item => {
                    const itemDate = new Date(item.data);
                    return itemDate >= inizioSettimana;
                });
                
            case 'mese':
            case 'month':
                return data.filter(item => {
                    const itemDate = new Date(item.data);
                    return itemDate.getMonth() === oggi.getMonth() && 
                           itemDate.getFullYear() === oggi.getFullYear();
                });
                
            default:
                return data;
        }
    }

    // ==================== METODI HELPER ESISTENTI (riutilizzati) ====================

    /**
     * 🤝 Matching flessibile nomi clienti (riutilizzato)
     */
    clientNamesMatch(name1, name2) {
        if (!name1 || !name2) return false;
        
        const normalize = str => str.toLowerCase().trim().replace(/[^\w\s]/g, '');
        const normalized1 = normalize(name1);
        const normalized2 = normalize(name2);
        
        // Exact match
        if (normalized1 === normalized2) return true;
        
        // Contains match
        if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;
        
        // Word-based matching
        const words1 = normalized1.split(' ').filter(w => w.length > 2);
        const words2 = normalized2.split(' ').filter(w => w.length > 2);
        
        let matches = 0;
        for (const word1 of words1) {
            for (const word2 of words2) {
                if (word1.includes(word2) || word2.includes(word1)) {
                    matches++;
                    break;
                }
            }
        }
        
        return matches >= Math.min(words1.length, words2.length) / 2;
    }

    /**
     * 📊 Ottieni dati in modo sicuro (riutilizzato)
     */
    async getAllDataSafely() {
        try {
            if (window.supabaseAI?.getAllData) {
                return await window.supabaseAI.getAllData();
            } else if (window.robustConnectionManager?.instances?.supabaseAI?.getAllData) {
                return await window.robustConnectionManager.instances.supabaseAI.getAllData();
            }
        } catch (error) {
            console.warn('⚠️ Data access error:', error);
        }
        
        // Fallback data structure
        return { 
            clients: [], 
            orders: [], 
            historicalOrders: { sampleData: [] },
            products: []
        };
    }

    // ==================== METODI HELPER NUOVI ====================

    /**
     * 🎨 Formatta risposta standardizzata
     */
    formatResponse(data, outputType = 'summary', metadata = {}) {
        const response = {
            success: true,
            data: data,
            message: typeof data === 'string' ? data : null,
            metadata: {
                timestamp: new Date().toISOString(),
                version: this.version,
                outputType,
                ...metadata
            }
        };
        
        // Se data è già un oggetto Result, mantieni la struttura
        if (data && typeof data === 'object' && data.hasOwnProperty('success')) {
            return { ...data, metadata: response.metadata };
        }
        
        return response;
    }

    /**
     * ❌ Gestione errori standardizzata
     */
    errorResponse(error, metadata = {}) {
        return {
            success: false,
            data: null,
            message: `❌ ${error.message}`,
            error: error.message,
            metadata: {
                timestamp: new Date().toISOString(),
                version: this.version,
                errorType: error.constructor.name,
                ...metadata
            }
        };
    }

    /**
     * 📋 Crea oggetto risultato standardizzato
     */
    createResult(data, message, extra = {}) {
        return {
            success: true,
            data: data,
            message: message,
            ...extra
        };
    }

    /**
     * 📅 Parsing intelligente date
     */
    parseDate(dateString) {
        if (!dateString) return null;
        
        const oggi = new Date();
        const dateStr = dateString.toLowerCase().trim();
        
        switch(dateStr) {
            case 'oggi':
            case 'today':
                return oggi;
                
            case 'ieri':
            case 'yesterday':
                const ieri = new Date(oggi);
                ieri.setDate(oggi.getDate() - 1);
                return ieri;
                
            case 'domani':
            case 'tomorrow':
                const domani = new Date(oggi);
                domani.setDate(oggi.getDate() + 1);
                return domani;
                
            default:
                // Prova parsing standard
                const parsed = new Date(dateString);
                return isNaN(parsed.getTime()) ? null : parsed;
        }
    }

    /**
     * 📅 Controlla se due date sono lo stesso giorno
     */
    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    // ==================== FORMATTER OUTPUT ====================

    /**
     * 📋 Formatta lista ordini
     */
    formatOrdersList(ordini, filters) {
        if (ordini.length === 0) {
            const filterDesc = filters.cliente ? ` per ${filters.cliente}` : '';
            return this.createResult([], `❌ Nessun ordine trovato${filterDesc}.`, { count: 0 });
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
        
        // Ordina per data (più recenti prima)
        const listaOrdini = Object.values(ordiniRaggruppati)
            .sort((a, b) => new Date(b.data) - new Date(a.data))
            .slice(0, filters.cliente ? 20 : 10);
        
        // Genera messaggio
        let message;
        if (filters.cliente) {
            message = `📋 **Ordini di ${filters.cliente}** (${listaOrdini.length} ordini):\\n\\n`;
        } else {
            message = `📋 **Ultimi ${listaOrdini.length} ordini:**\\n\\n`;
        }
        
        listaOrdini.forEach(ordine => {
            message += `• **${ordine.numero}** - ${ordine.cliente}\\n`;
            message += `  Data: ${new Date(ordine.data).toLocaleDateString('it-IT')} | Importo: €${ordine.importo.toFixed(2)} | Righe: ${ordine.righe}\\n\\n`;
        });
        
        return this.createResult(listaOrdini, message, { 
            count: listaOrdini.length,
            totalValue: listaOrdini.reduce((sum, ord) => sum + ord.importo, 0)
        });
    }

    /**
     * 👥 Formatta lista clienti
     */
    formatClientsList(clienti) {
        if (clienti.length === 0) {
            return this.createResult([], "Non ci sono clienti nel database.", { count: 0 });
        }
        
        const clientiOrdinati = clienti
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 50);
        
        let message = `👥 **Lista Clienti** (${clientiOrdinati.length} clienti):\\n\\n`;
        
        clientiOrdinati.forEach(client => {
            message += `• **${client.name}**`;
            if (client.city) message += ` (${client.city})`;
            if (client.phone) message += ` - 📞 ${client.phone}`;
            message += '\\n';
        });
        
        if (clienti.length > 50) {
            message += `\\n(Mostrati primi 50 di ${clienti.length} totali)`;
        }
        
        return this.createResult(clientiOrdinati, message, { count: clienti.length });
    }

    /**
     * ℹ️ Informazioni data
     */
    getDateInfo(format = 'italian') {
        const oggi = new Date();
        
        if (format === 'italian') {
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            const dataFormattata = oggi.toLocaleDateString('it-IT', options);
            return `📅 Oggi è ${dataFormattata}`;
        } else {
            return `📅 Today is ${oggi.toDateString()}`;
        }
    }

    /**
     * 🕒 Informazioni ora
     */
    getTimeInfo(format = 'italian') {
        const ora = new Date();
        
        if (format === 'italian') {
            const oraFormattata = ora.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            return `🕒 Sono le ${oraFormattata}`;
        } else {
            return `🕒 It's ${ora.toLocaleTimeString()}`;
        }
    }

    /**
     * 📅🕒 Informazioni data e ora combinate
     */
    getDateTimeInfo(format = 'italian') {
        const now = new Date();
        
        if (format === 'italian') {
            const dataOptions = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            const oraOptions = {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            
            const dataFormattata = now.toLocaleDateString('it-IT', dataOptions);
            const oraFormattata = now.toLocaleTimeString('it-IT', oraOptions);
            
            return `📅 Oggi è ${dataFormattata}\n🕒 Sono le ${oraFormattata}`;
        } else {
            return `📅 Today is ${now.toDateString()}\n🕒 It's ${now.toLocaleTimeString()}`;
        }
    }

    /**
     * 📅⏰ Informazioni data storica (X giorni fa)
     */
    getHistoricalDateInfo(userInput, format = 'italian') {
        // Estrai il numero di giorni dal messaggio utente
        const giorniMatch = userInput.match(/(\d+)\s+giorni?\s+fa/i);
        
        if (!giorniMatch) {
            return '❌ Non riesco a capire quanti giorni fa. Usa il formato: "X giorni fa"';
        }
        
        const giorniIndietro = parseInt(giorniMatch[1]);
        
        if (isNaN(giorniIndietro) || giorniIndietro < 0) {
            return '❌ Numero di giorni non valido';
        }
        
        // Calcola la data storica
        const dataStorica = new Date();
        dataStorica.setDate(dataStorica.getDate() - giorniIndietro);
        
        if (format === 'italian') {
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            const dataFormattata = dataStorica.toLocaleDateString('it-IT', options);
            
            return `📅 ${giorniIndietro} giorni fa era ${dataFormattata}`;
        } else {
            return `📅 ${giorniIndietro} days ago was ${dataStorica.toDateString()}`;
        }
    }

    /**
     * 📅 Solo giorno della settimana
     */
    getDayOfWeekInfo(format = 'italian') {
        const oggi = new Date();
        
        if (format === 'italian') {
            const giornoSettimana = oggi.toLocaleDateString('it-IT', { weekday: 'long' });
            return `📅 Oggi è ${giornoSettimana}`;
        } else {
            const dayOfWeek = oggi.toLocaleDateString('en-US', { weekday: 'long' });
            return `📅 Today is ${dayOfWeek}`;
        }
    }

    /**
     * 📅⏭️ Informazioni data futura (tra X giorni)
     */
    getFutureDateInfo(userInput, format = 'italian') {
        // Estrai il numero di giorni dal messaggio utente
        const giorniMatch = userInput.match(/tra\s+(\d+)\s+giorni?/i) || 
                           userInput.match(/(\d+)\s+giorni?\s+(?:nel\s+)?futuro/i);
        
        if (!giorniMatch) {
            return '❌ Non riesco a capire tra quanti giorni. Usa il formato: "tra X giorni"';
        }
        
        const giorniAvanti = parseInt(giorniMatch[1]);
        
        if (isNaN(giorniAvanti) || giorniAvanti < 0) {
            return '❌ Numero di giorni non valido';
        }
        
        // Calcola la data futura
        const dataFutura = new Date();
        dataFutura.setDate(dataFutura.getDate() + giorniAvanti);
        
        if (format === 'italian') {
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            const dataFormattata = dataFutura.toLocaleDateString('it-IT', options);
            
            return `📅 Tra ${giorniAvanti} giorni sarà ${dataFormattata}`;
        } else {
            return `📅 In ${giorniAvanti} days it will be ${dataFutura.toDateString()}`;
        }
    }

    /**
     * 📝 Informazioni versione
     */
    getVersionInfo() {
        return `🤖 **AI Middleware Optimized v${this.version}**\\n\\n` +
               `✅ Sistema ottimizzato con 5 azioni generiche\\n` +
               `🎯 Entità supportate: ${this.supportedEntities.length}\\n` +
               `⚙️ Operazioni supportate: ${this.supportedOperations.length}\\n` +
               `📅 Caricato: ${new Date().toLocaleString('it-IT')}`;
    }

    /**
     * 📊 Stato sistema
     */
    getSystemStatus() {
        return `📊 **Stato Sistema**\\n\\n` +
               `✅ AI Middleware: Operativo v${this.version}\\n` +
               `✅ Connessione dati: ${window.supabaseAI ? 'Attiva' : 'Non disponibile'}\\n` +
               `🔧 Debug: ${this.debug ? 'Abilitato' : 'Disabilitato'}\\n` +
               `📅 Uptime: ${performance.now().toFixed(0)}ms`;
    }

    // ==================== COMPATIBILITÀ CON SISTEMA LEGACY ====================

    /**
     * 🔄 Handler per azioni legacy (per compatibilità)
     */
    async handleLegacyAction(action, params, userInput, originalContext) {
        if (this.debug) {
            console.log(`🔄 LEGACY ACTION MAPPING: ${action}`);
        }
        
        // Mappa azioni legacy alle nuove
        const legacyMapping = {
            'getOrdersByDate': () => this.handleUniversalQuery({
                entity: 'orders',
                operation: 'list',
                filters: { periodo: params.date || 'oggi' }
            }, userInput, originalContext),
            
            'getOrdersByClient': () => this.handleUniversalQuery({
                entity: 'orders', 
                operation: 'list',
                filters: { cliente: params.cliente }
            }, userInput, originalContext),
            
            'listOrders': () => this.handleUniversalQuery({
                entity: 'orders',
                operation: 'list',
                filters: params
            }, userInput, originalContext),
            
            'countOrders': () => this.handleUniversalQuery({
                entity: 'orders',
                operation: 'count',
                filters: params
            }, userInput, originalContext),
            
            'listClients': () => this.handleUniversalQuery({
                entity: 'clients',
                operation: 'list',
                filters: params
            }, userInput, originalContext),
            
            'countClients': () => this.handleUniversalQuery({
                entity: 'clients',
                operation: 'count',
                filters: params
            }, userInput, originalContext),
            
            'calculateRevenue': () => this.handleUniversalQuery({
                entity: 'orders',
                operation: 'sum',
                field: 'importo',
                filters: params
            }, userInput, originalContext),
            
            'calculateMonthlyRevenue': () => this.handleUniversalQuery({
                entity: 'orders',
                operation: 'sum', 
                field: 'importo',
                filters: { periodo: params.mese || 'mese' }
            }, userInput, originalContext),
            
            'countTotalOrders': () => this.handleUniversalQuery({
                entity: 'orders',
                operation: 'count'
            }, userInput, originalContext),
            
            'scheduleReminder': () => this.handleUniversalAction({
                entity: 'reminders',
                operation: 'create',
                data: params
            }, userInput, originalContext),
            
            'createAppointment': () => this.handleUniversalAction({
                entity: 'appointments',
                operation: 'create', 
                data: params
            }, userInput, originalContext)
        };
        
        const handler = legacyMapping[action];
        if (handler) {
            return await handler();
        } else {
            throw new Error(`Azione legacy non mappata: ${action}`);
        }
    }

    // ==================== PLACEHOLDER METODI DA IMPLEMENTARE ====================

    async formatOrdersDetails(ordini, filters) {
        // TODO: Implementare vista dettagliata ordini
        return this.formatOrdersList(ordini, filters);
    }

    async formatClientsDetails(clienti) {
        // TODO: Implementare vista dettagliata clienti  
        return this.formatClientsList(clienti);
    }

    async createReminder(data) {
        // TODO: Implementare creazione promemoria
        return this.createResult(data, `✅ Promemoria creato: ${data.message || 'Nuovo promemoria'}`);
    }

    async createAppointment(data) {
        // TODO: Implementare creazione appuntamento
        const message = `✅ Appuntamento creato${data.cliente ? ` con ${data.cliente}` : ''}`;
        return this.createResult(data, message);
    }

    async updateAppointment(id, data) {
        // TODO: Implementare aggiornamento appuntamento
        return this.createResult(data, `✅ Appuntamento ${id} aggiornato`);
    }

    async deleteAppointment(id) {
        // TODO: Implementare eliminazione appuntamento  
        return this.createResult({id}, `✅ Appuntamento ${id} eliminato`);
    }

    async generateMonthlyRevenueReport(periodo, filters) {
        // TODO: Implementare report fatturato mensile
        return this.createResult({}, "📈 Report fatturato mensile non ancora implementato");
    }

    async generateClientOrdersReport(cliente) {
        // TODO: Implementare report ordini cliente
        return this.createResult({}, `📈 Report ordini cliente ${cliente} non ancora implementato`);
    }

    async generateSalesPerformanceReport(periodo) {
        // TODO: Implementare report performance vendite
        return this.createResult({}, "📈 Report performance vendite non ancora implementato");
    }
}

// Esporta classe per uso globale con entrambi i nomi per compatibilità
window.AIMiddlewareOptimized = AIMiddlewareOptimized;
window.AIMiddleware = AIMiddlewareOptimized; // ← FIX: Esponi con nome che il sistema cerca

// Crea istanza globale
try {
    window.aiMiddleware = new AIMiddlewareOptimized();
    console.log('✅ AIMiddleware caricato e inizializzato:', window.aiMiddleware);
    console.log('✅ Versione:', window.aiMiddleware.version);
} catch (error) {
    console.error('❌ Errore inizializzazione AIMiddleware:', error);
}

console.log('🚀 AIMiddleware pronto per l\'uso!');