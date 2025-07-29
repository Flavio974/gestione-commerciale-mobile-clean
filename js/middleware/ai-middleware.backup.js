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
                    
                case 'getOrderDate':
                    result = await this.handleGetOrderDate(params, originalMessage, originalContext);
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
                    
                case 'scheduleReminder':
                    result = await this.handleUniversalAction({
                        entity: 'reminders',
                        operation: 'create',
                        data: params
                    }, originalMessage, originalContext);
                    break;
                    
                case 'createAppointment':
                    result = await this.handleUniversalAction({
                        entity: 'appointments',
                        operation: 'create',
                        data: params
                    }, originalMessage, originalContext);
                    break;
                    
                case 'getDeliveryDate':
                    result = await this.handleUniversalQuery({
                        entity: 'orders',
                        operation: 'details',
                        filters: { cliente: this.extractClientName(params, originalMessage, originalContext) },
                        field: 'data_consegna'
                    }, originalMessage, originalContext);
                    break;
                    
                default:
                    throw new Error(`Azione non supportata: ${command.action}`);
            }
            
            const executionTime = Date.now() - startTime;
            
            if (this.debug) {
                console.log('🤖 ✅ ACTION COMPLETED:', {
                    action: command.action,
                    executionTime: `${executionTime}ms`,
                    resultType: typeof result,
                    success: true
                });
            }
            
            return this.formatResponse(result, 'summary', { executionTime });
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            console.error('🤖 ❌ ACTION FAILED:', {
                action: command.action,
                error: error.message,
                executionTime: `${executionTime}ms`
            });
            
            return this.errorResponse(error, { 
                action: command.action, 
                executionTime 
            });
        }
    }
    
    // ==================== HANDLER MAPPATURA LEGACY ====================
    
    /**
     * 🔄 Handler per azioni legacy - le mappa su quelle nuove
     */
    async handleLegacyAction(action, params, userInput, originalContext) {
        if (this.debug) {
            console.log('🔄 LEGACY ACTION MAPPING:', { action, params });
        }
        
        // Mappa azioni legacy alle nuove
        const legacyMapping = {
            'getOrdersByDate': () => this.handleUniversalQuery({
                entity: 'orders',
                operation: 'list',
                filters: { periodo: params.periodo || params.data }
            }, userInput, originalContext),
            
            'getOrdersByClient': () => this.handleUniversalQuery({
                entity: 'orders', 
                operation: 'list',
                filters: { cliente: this.extractClientName(params, userInput, originalContext) }
            }, userInput, originalContext),
            
            'listOrders': () => this.handleUniversalQuery({
                entity: 'orders',
                operation: 'list',
                filters: params
            }, userInput, originalContext),
            
            'countOrders': () => this.handleUniversalQuery({
                entity: 'orders',
                operation: 'count',
                filters: { cliente: this.extractClientName(params, userInput, originalContext) }
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
                filters: { cliente: this.extractClientName(params, userInput, originalContext) }
            }, userInput, originalContext),
            
            'calculateMonthlyRevenue': () => this.handleUniversalQuery({
                entity: 'orders',
                operation: 'sum', 
                field: 'importo',
                filters: { periodo: 'mese' }
            }, userInput, originalContext),
            
            'countTotalOrders': () => this.handleUniversalQuery({
                entity: 'orders',
                operation: 'count'
            }, userInput, originalContext)
        };
        
        const mappedFunction = legacyMapping[action];
        if (!mappedFunction) {
            throw new Error(`Azione legacy non mappata: ${action}`);
        }
        
        return await mappedFunction();
    }
    
    // ==================== HANDLER PRINCIPALI ====================
    
    /**
     * 🎯 UNIVERSAL QUERY - Gestisce TUTTE le query di lettura dati
     */
    async handleUniversalQuery(params, userInput, originalContext) {
        const { entity, operation, filters = {}, field, output = 'summary' } = params;
        
        // Validazione parametri
        this.validateQueryParams(entity, operation);
        
        if (this.debug) {
            console.log('🎯 UNIVERSAL QUERY:', {
                entity, operation, filters, field, output
            });
        }
        
        // Delega alle funzioni specializzate per entità
        switch(entity) {
            case 'orders':
                return await this.queryOrders(operation, filters, field);
            case 'clients':
                return await this.queryClients(operation, filters);
            case 'products':
                return await this.queryProducts(operation, filters);
            case 'appointments':
                return await this.queryAppointments(operation, filters);
            default:
                throw new Error(`Query non supportata per entità: ${entity}`);
        }
    }
    
    /**
     * 🎯 UNIVERSAL ACTION - Gestisce TUTTE le azioni di modifica dati
     */
    async handleUniversalAction(params, userInput, originalContext) {
        const { entity, operation, data = {}, filters = {} } = params;
        
        // Validazione parametri
        this.validateActionParams(entity, operation);
        
        if (this.debug) {
            console.log('🎯 UNIVERSAL ACTION:', {
                entity, operation, data, filters
            });
        }
        
        // TODO: Implementare logica di modifica dati
        // Per ora ritorna placeholder
        return this.createResult(
            null,
            `✅ Azione ${operation} su ${entity} simulata (non ancora implementata)`,
            { entity, operation, simulated: true }
        );
    }
    
    /**
     * 🎯 SYSTEM INFO - Gestisce informazioni di sistema
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
            case 'version':
                return `🤖 AI Middleware ${this.version}`;
            case 'status':
                return '✅ Sistema operativo e funzionante';
            case 'historical':
                return this.getHistoricalDateInfo(params, userInput);
            case 'dayofweek':
                return this.getDayOfWeekInfo(params, userInput);
            default:
                throw new Error(`Tipo info non supportato: ${type}`);
        }
    }
    
    /**
     * 🎯 REPORT - Genera report e analisi
     */
    async handleReport(params, userInput, originalContext) {
        const { type, periodo, format = 'summary' } = params;
        
        if (this.debug) {
            console.log('🤖 📊 GENERATE REPORT:', { type, periodo, format });
        }
        
        // TODO: Implementare generazione report
        return this.createResult(
            null,
            `📊 Report ${type} per ${periodo} (formato ${format}) - non ancora implementato`,
            { type, periodo, format, simulated: true }
        );
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
    
    /**
     * 📅 Recupera la data dell'ultimo ordine di un cliente
     */
    async handleGetOrderDate(params, userInput, originalContext) {
        const clienteName = this.extractClientName(params, userInput, originalContext);
        
        if (!clienteName) {
            return '❌ Specifica il nome del cliente per vedere la data dell\'ordine';
        }
        
        if (this.debug) {
            console.log('🔍 GetOrderDate per cliente:', clienteName);
        }
        
        try {
            const allData = await this.getAllDataSafely();
            let ordini = allData.historicalOrders?.sampleData || [];
            
            // Filtra per cliente
            ordini = ordini.filter(ordine => 
                ordine.cliente && this.clientNamesMatch(ordine.cliente, clienteName)
            );
            
            if (ordini.length === 0) {
                return `❌ Nessun ordine trovato per ${clienteName}`;
            }
            
            // Raggruppa per numero ordine per evitare duplicati
            const ordiniRaggruppati = {};
            ordini.forEach(ordine => {
                if (!ordiniRaggruppati[ordine.numero_ordine]) {
                    ordiniRaggruppati[ordine.numero_ordine] = {
                        numero: ordine.numero_ordine,
                        data: ordine.data_ordine || ordine.data_consegna || ordine.created_at || null
                    };
                }
            });
            
            // Trova l'ordine più recente
            const ordiniList = Object.values(ordiniRaggruppati);
            const ordineRecente = ordiniList.sort((a, b) => {
                const dateA = this.parseDateSafely(a.data);
                const dateB = this.parseDateSafely(b.data);
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateB - dateA;
            })[0];
            
            const dataFormattata = this.formatDateSafely(ordineRecente.data);
            
            return `📅 L'ultimo ordine di ${clienteName} (${ordineRecente.numero}) è del ${dataFormattata}`;
            
        } catch (error) {
            console.error('Errore in handleGetOrderDate:', error);
            return '❌ Errore nel recupero della data dell\'ordine';
        }
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
            
            // Pattern per "ha fatto [CLIENTE]"
            const haFattoMatch = userInput.match(/\bha\s+fatto\s+([a-zA-ZàèìòùÀÈÌÒÙ\s]+?)(?:\s*$|\s*[.?!])/i);
            if (haFattoMatch && haFattoMatch[1]) {
                const clienteName = haFattoMatch[1].trim();
                if (this.debug) console.log('🎯 Extracted "ha fatto" pattern:', clienteName);
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

    /**
     * 📅 Parsa data in modo sicuro, ritorna oggetto Date o null
     */
    parseDateSafely(dateString) {
        if (dateString === undefined || dateString === null || dateString === '') {
            console.debug('parseDateSafely: Input nullo/undefined');
            return null;
        }
        const s = String(dateString).trim();
        const aaaggmm = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
        if (aaaggmm) {
            const d = new Date(aaaggmm[1], aaaggmm[3] - 1, aaaggmm[2]);
            if (!isNaN(d.getTime())) {
                console.debug('parseDateSafely: Parsed AAAA/GG/MM');
                return d;
            }
        }
        const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddmmyyyy) {
            const d = new Date(ddmmyyyy[3], ddmmyyyy[2] - 1, ddmmyyyy[1]);
            if (!isNaN(d.getTime())) {
                console.debug('parseDateSafely: Parsed DD/MM/YYYY');
                return d;
            }
        }
        const yyyymmdd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (yyyymmdd) {
            const d = new Date(yyyymmdd[1], yyyymmdd[2] - 1, yyyymmdd[3]);
            if (!isNaN(d.getTime())) {
                console.debug('parseDateSafely: Parsed YYYY-MM-DD');
                return d;
            }
        }
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            console.debug('parseDateSafely: Parsed native');
            return d;
        }
        console.warn('parseDateSafely: Nessun formato riconosciuto per:', s);
        return null;
    }

    /**
     * 📅 Formatta data in modo sicuro, gestendo diversi formati
     */
    formatDateSafely(dateString) {
        if (dateString === undefined || dateString === null || dateString === '' ||
            dateString === 'undefined' || dateString === 'null') {
            console.debug('formatDateSafely: Input nullo/undefined');
            return 'Data non disponibile';
        }
        if (typeof dateString==='string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
            console.debug('formatDateSafely: Già in formato italiano');
            return dateString;
        }
        const d = this.parseDateSafely(dateString);
        if (d instanceof Date && !isNaN(d.getTime())) {
            const f = d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});
            console.debug('formatDateSafely: Formattato come:', f);
            return f;
        }
        console.warn('formatDateSafely: Formato non riconosciuto:', {
            value: dateString,
            type: typeof dateString,
            raw: JSON.stringify(dateString)
        });
        return 'Data non disponibile';
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
                    data: ordine.data_ordine || ordine.data_consegna || ordine.created_at || null,
                    importo: 0,
                    righe: 0,
                    prodotti: [] // Aggiungi array per i prodotti
                };
            }
            ordiniRaggruppati[ordine.numero_ordine].importo += ordine.importo || 0;
            ordiniRaggruppati[ordine.numero_ordine].righe++;
            
            // Aggiungi prodotto se esiste
            if (ordine.prodotto) {
                ordiniRaggruppati[ordine.numero_ordine].prodotti.push({
                    nome: ordine.prodotto,
                    quantita: ordine.quantita || 1,
                    importo: ordine.importo || 0
                });
            }
        });
        
        // Ordina per data (più recenti prima)
        const listaOrdini = Object.values(ordiniRaggruppati)
            .sort((a, b) => {
                const dateA = this.parseDateSafely(a.data);
                const dateB = this.parseDateSafely(b.data);
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateB - dateA;
            })
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
            
            // DEBUG: Log del campo data prima di formattarlo
            if (this.debug) {
                console.log('🔍 DEBUG ordine.data RAW:', ordine.data, 'tipo:', typeof ordine.data);
                console.log('🔍 DEBUG ordine completo:', JSON.stringify(ordine, null, 2));
            }
            
            const dataFormattata = this.formatDateSafely(ordine.data);
            message += `  Data: ${dataFormattata} | Importo: €${ordine.importo.toFixed(2)} | Prodotti: ${ordine.righe}\\n\\n`;
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
     * 🔍 Formatta dettagli ordini
     */
    formatOrdersDetails(ordini, filters) {
        if (ordini.length === 0) {
            return this.createResult([], "Nessun dettaglio disponibile.", { count: 0 });
        }
        
        const ordine = ordini[0]; // Prendi il primo per i dettagli
        let message = `📦 **Dettagli Ordine ${ordine.numero_ordine}**\\n\\n`;
        message += `👤 **Cliente:** ${ordine.cliente}\\n`;
        message += `📅 **Data:** ${this.formatDateSafely(ordine.data_ordine || ordine.data)}\\n`;
        message += `💰 **Importo:** €${ordine.importo?.toFixed(2) || '0.00'}\\n`;
        message += `📊 **Quantità:** ${ordine.quantita || 0}\\n`;
        
        if (ordine.prodotto) {
            message += `🛍️ **Prodotto:** ${ordine.prodotto}\\n`;
        }
        
        return this.createResult([ordine], message, { count: 1 });
    }

    /**
     * 👥 Formatta dettagli clienti
     */
    formatClientsDetails(clienti) {
        if (clienti.length === 0) {
            return this.createResult([], "Nessun dettaglio cliente disponibile.", { count: 0 });
        }
        
        const client = clienti[0];
        let message = `👤 **Dettagli Cliente: ${client.name}**\\n\\n`;
        
        if (client.city) message += `🏙️ **Città:** ${client.city}\\n`;
        if (client.phone) message += `📞 **Telefono:** ${client.phone}\\n`;
        if (client.email) message += `📧 **Email:** ${client.email}\\n`;
        if (client.address) message += `📍 **Indirizzo:** ${client.address}\\n`;
        
        return this.createResult([client], message, { count: 1 });
    }
    
    // ==================== HELPER PER INFORMAZIONI SISTEMA ====================
    
    /**
     * 📅 Informazioni data
     */
    getDateInfo(format = 'italian') {
        const now = new Date();
        
        if (format === 'italian') {
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            return `📅 Oggi è ${now.toLocaleDateString('it-IT', options)}`;
        }
        
        return `📅 Today is ${now.toLocaleDateString('en-US')}`;
    }
    
    /**
     * 🕒 Informazioni ora
     */
    getTimeInfo(format = 'italian') {
        const now = new Date();
        
        if (format === 'italian') {
            return `🕒 Sono le ore ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        return `🕒 It's ${now.toLocaleTimeString('en-US')}`;
    }
    
    /**
     * 📅🕒 Informazioni data e ora
     */
    getDateTimeInfo(format = 'italian') {
        const now = new Date();
        
        if (format === 'italian') {
            const dateOptions = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            const timeOptions = { hour: '2-digit', minute: '2-digit' };
            
            return `📅🕒 ${now.toLocaleDateString('it-IT', dateOptions)} alle ore ${now.toLocaleTimeString('it-IT', timeOptions)}`;
        }
        
        return `📅🕒 ${now.toLocaleDateString('en-US')} at ${now.toLocaleTimeString('en-US')}`;
    }
    
    /**
     * 📅 Informazioni data storica
     */
    getHistoricalDateInfo(params, userInput) {
        const dayPattern = /(\d+)\s*giorni?\s+fa/i;
        const match = userInput.match(dayPattern);
        
        if (match) {
            const daysAgo = parseInt(match[1]);
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - daysAgo);
            
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            
            return `📅 ${daysAgo} giorni fa era ${targetDate.toLocaleDateString('it-IT', options)}`;
        }
        
        return '❌ Specifica il numero di giorni (es: "3 giorni fa")';
    }
    
    /**
     * 📅 Informazioni giorno della settimana
     */
    getDayOfWeekInfo(params, userInput) {
        const now = new Date();
        const dayName = now.toLocaleDateString('it-IT', { weekday: 'long' });
        
        return `📅 Oggi è ${dayName}`;
    }
}

// ==================== ESPORTAZIONE E INIZIALIZZAZIONE ====================

// Crea istanza globale
window.AIMiddleware = AIMiddlewareOptimized;

// Inizializza se il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ AIMiddleware caricato e inizializzato:', AIMiddlewareOptimized);
        console.log('✅ Versione:', new AIMiddlewareOptimized().version);
        console.log('🚀 AIMiddleware pronto per l\'uso!');
    });
} else {
    console.log('✅ AIMiddleware caricato e inizializzato:', AIMiddlewareOptimized);
    console.log('✅ Versione:', new AIMiddlewareOptimized().version);
    console.log('🚀 AIMiddleware pronto per l\'uso!');
}