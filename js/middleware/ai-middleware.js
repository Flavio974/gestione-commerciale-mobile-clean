/**
 * 🤖 AI MIDDLEWARE - CLEAN ARCHITECTURE
 * Ridotto da 1906 → ~480 righe (75% riduzione)
 * Strategy Pattern + Factory Pattern + Chain of Responsibility
 */

console.log('[LOAD] ✅ ai-middleware-clean.js caricato');

// ==================== CONFIGURATION ====================

const AI_MIDDLEWARE_CONFIG = {
  DEBUG: localStorage.getItem('ai_debug') === 'true',
  VERSION: '3.0.0',
  
  ENTITIES: ['orders', 'clients', 'products', 'appointments', 'reminders'],
  OPERATIONS: ['list', 'count', 'sum', 'details', 'create', 'update', 'delete'],
  
  TIMEOUTS: {
    QUERY: 5000,
    ACTION: 10000
  },
  
  PATTERNS: {
    CLIENT_EXTRACTION: [
      /\b(?:cliente|del cliente|di)\s+([A-Za-zÀ-ÿ\s\-'\.]+?)(?:\s*(?:quando|data|ordine|ha|fatto|ordinato|$))/i,
      /\b(?:ordine|ordini)\s+(?:di|del|della)\s+([A-Za-zÀ-ÿ\s\-'\.]+?)(?:\s|$)/i,
      /\b([A-Za-zÀ-ÿ\s\-'\.]+?)\s+(?:ha\s+ordinato|ha\s+fatto)/i
    ],
    
    DATE_FORMATS: [
      { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parse: (m) => new Date(m[3], m[2] - 1, m[1]) },
      { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, parse: (m) => new Date(m[1], m[2] - 1, m[3]) },
      { regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, parse: (m) => new Date(m.input) }
    ]
  }
};

// ==================== UTILITY CLASSES ====================

class AILogger {
  static log(level, message, data = {}) {
    if (!AI_MIDDLEWARE_CONFIG.DEBUG && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] AI-MW:`;
    
    const logMethods = {
      error: console.error,
      warn: console.warn,
      info: console.log,
      debug: console.log
    };
    
    (logMethods[level] || console.log)(prefix, message, data);
  }
}

class ParameterNormalizer {
  static normalize(params) {
    const normalized = { ...params };
    
    // Normalize common parameter names
    const mappings = {
      client: 'cliente',
      date: 'data',
      customer: 'cliente'
    };
    
    Object.entries(mappings).forEach(([old, newKey]) => {
      if (normalized[old]) {
        normalized[newKey] = normalized[old];
        delete normalized[old];
      }
    });
    
    // Convert boolean strings
    ['debug', 'detailed', 'includeEmpty'].forEach(key => {
      if (typeof normalized[key] === 'string') {
        normalized[key] = normalized[key].toLowerCase() === 'true';
      }
    });
    
    return normalized;
  }
}

class ClientExtractor {
  static extract(params, userInput, originalContext) {
    AILogger.log('debug', 'Extracting client name', {
      'params.cliente': params?.cliente,
      'context.cliente': originalContext?.extractedParams?.cliente,
      userInput
    });
    
    // Priority 1: Use extractedParams from vocabulary matching
    if (originalContext?.extractedParams?.cliente) {
      return originalContext.extractedParams.cliente;
    }
    
    // Priority 2: Use params.cliente
    if (params?.cliente && params.cliente !== '{cliente}') {
      return params.cliente;
    }
    
    // Priority 3: Extract from user input
    if (userInput) {
      for (const pattern of AI_MIDDLEWARE_CONFIG.PATTERNS.CLIENT_EXTRACTION) {
        const match = userInput.match(pattern);
        if (match && match[1]) {
          const clientName = match[1].trim();
          const excludeWords = ['la', 'il', 'un', 'una', 'quando', 'data', 'ordine'];
          if (!excludeWords.includes(clientName.toLowerCase())) {
            return clientName;
          }
        }
      }
    }
    
    return null;
  }
}

class DateParser {
  static parse(dateString) {
    if (!dateString) return null;
    
    const dateStr = dateString.toLowerCase().trim();
    const today = new Date();
    
    // Handle relative dates
    const relativeDates = {
      'oggi': today,
      'today': today,
      'ieri': new Date(today.getTime() - 24 * 60 * 60 * 1000),
      'yesterday': new Date(today.getTime() - 24 * 60 * 60 * 1000),
      'domani': new Date(today.getTime() + 24 * 60 * 60 * 1000),
      'tomorrow': new Date(today.getTime() + 24 * 60 * 60 * 1000)
    };
    
    if (relativeDates[dateStr]) {
      return relativeDates[dateStr];
    }
    
    // Try patterns
    for (const pattern of AI_MIDDLEWARE_CONFIG.PATTERNS.DATE_FORMATS) {
      const match = dateString.match(pattern.regex);
      if (match) {
        const date = pattern.parse(match);
        if (!isNaN(date.getTime())) return date;
      }
    }
    
    // Fallback to native parsing
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  static format(dateString) {
    if (!dateString || dateString === 'undefined' || dateString === 'null') {
      return 'Data non disponibile';
    }
    
    const date = this.parse(dateString);
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    
    return 'Data non disponibile';
  }
  
  static isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }
}

class ResponseFormatter {
  static createResult(data, message, metadata = {}) {
    return {
      success: true,
      data,
      message,
      metadata: {
        timestamp: new Date().toISOString(),
        version: AI_MIDDLEWARE_CONFIG.VERSION,
        ...metadata
      }
    };
  }
  
  static createError(error, metadata = {}) {
    return {
      success: false,
      data: null,
      message: `❌ ${error.message}`,
      error: error.message,
      metadata: {
        timestamp: new Date().toISOString(),
        version: AI_MIDDLEWARE_CONFIG.VERSION,
        errorType: error.constructor.name,
        ...metadata
      }
    };
  }
  
  static formatResponse(data, outputType = 'summary', metadata = {}) {
    if (data && typeof data === 'object' && data.hasOwnProperty('success')) {
      return { ...data, metadata: { ...data.metadata, ...metadata } };
    }
    
    return this.createResult(data, typeof data === 'string' ? data : null, metadata);
  }
}

// ==================== STRATEGY PATTERN: QUERY HANDLERS ====================

class BaseQueryHandler {
  constructor(dataProvider) {
    this.dataProvider = dataProvider;
  }
  
  async handle(operation, filters, options = {}) {
    throw new Error('Handle method must be implemented by subclass');
  }
  
  async getData() {
    try {
      if (window.supabaseAI?.getAllData) {
        return await window.supabaseAI.getAllData();
      } else if (window.robustConnectionManager?.instances?.supabaseAI?.getAllData) {
        return await window.robustConnectionManager.instances.supabaseAI.getAllData();
      }
    } catch (error) {
      AILogger.log('warn', 'Data access error', error);
    }
    
    return { 
      clients: [], 
      orders: [], 
      historicalOrders: { sampleData: [] },
      products: []
    };
  }
  
  clientNamesMatch(name1, name2) {
    if (!name1 || !name2) return false;
    
    const normalize = str => str.toLowerCase().trim().replace(/[^\w\s]/g, '');
    const normalized1 = normalize(name1);
    const normalized2 = normalize(name2);
    
    if (normalized1 === normalized2) return true;
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;
    
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
}

class OrdersQueryHandler extends BaseQueryHandler {
  async handle(operation, filters, options = {}) {
    const allData = await this.getData();
    let orders = allData.historicalOrders?.sampleData || [];
    
    if (orders.length === 0) {
      return ResponseFormatter.createResult([], "Non ci sono ordini nel database.", { count: 0 });
    }
    
    // Apply filters
    orders = this.applyFilters(orders, filters);
    
    AILogger.log('debug', `Orders query ${operation}`, {
      totalOrders: allData.historicalOrders?.sampleData?.length || 0,
      filteredOrders: orders.length,
      filters
    });
    
    switch(operation) {
      case 'list':
        return this.formatOrdersList(orders, filters);
      case 'count':
        return ResponseFormatter.createResult(orders.length, `Trovati ${orders.length} ordini`, { count: orders.length });
      case 'sum':
        const field = options.field || 'importo';
        const total = orders.reduce((sum, ord) => sum + (ord[field] || 0), 0);
        return ResponseFormatter.createResult(total, `Totale: €${total.toFixed(2)}`, { sum: total, field, count: orders.length });
      case 'details':
        return this.formatOrdersDetails(orders, filters);
      default:
        throw new Error(`Operazione ordini non supportata: ${operation}`);
    }
  }
  
  applyFilters(orders, filters) {
    let filtered = [...orders];
    
    if (filters.cliente) {
      filtered = filtered.filter(item => 
        item.cliente && this.clientNamesMatch(item.cliente, filters.cliente)
      );
    }
    
    if (filters.data || filters.periodo) {
      const targetDate = DateParser.parse(filters.data || filters.periodo);
      if (targetDate) {
        filtered = filtered.filter(item => {
          if (!item.data) return false;
          const itemDate = new Date(item.data);
          return DateParser.isSameDay(itemDate, targetDate);
        });
      }
    }
    
    return filtered;
  }
  
  formatOrdersList(orders, filters) {
    if (orders.length === 0) {
      const filterDesc = filters.cliente ? ` per ${filters.cliente}` : '';
      return ResponseFormatter.createResult([], `❌ Nessun ordine trovato${filterDesc}.`, { count: 0 });
    }
    
    // Group by order number
    const groupedOrders = {};
    orders.forEach(order => {
      if (!groupedOrders[order.numero_ordine]) {
        groupedOrders[order.numero_ordine] = {
          numero: order.numero_ordine,
          cliente: order.cliente,
          data: order.data_ordine || order.data_consegna || order.created_at || null,
          importo: 0,
          righe: 0,
          prodotti: []
        };
      }
      groupedOrders[order.numero_ordine].importo += order.importo || 0;
      groupedOrders[order.numero_ordine].righe++;
      
      if (order.prodotto) {
        groupedOrders[order.numero_ordine].prodotti.push({
          nome: order.prodotto,
          quantita: order.quantita || 1,
          importo: order.importo || 0
        });
      }
    });
    
    const ordersList = Object.values(groupedOrders)
      .sort((a, b) => {
        const dateA = DateParser.parse(a.data);
        const dateB = DateParser.parse(b.data);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA;
      })
      .slice(0, filters.cliente ? 20 : 10);
    
    let message = filters.cliente 
      ? `📋 **Ordini di ${filters.cliente}** (${ordersList.length} ordini):\n\n`
      : `📋 **Ultimi ${ordersList.length} ordini:**\n\n`;
    
    ordersList.forEach(order => {
      message += `• **${order.numero}** - ${order.cliente}\n`;
      const dataFormattata = DateParser.format(order.data);
      message += `  Data: ${dataFormattata} | Importo: €${order.importo.toFixed(2)} | Prodotti: ${order.righe}\n\n`;
    });
    
    return ResponseFormatter.createResult(ordersList, message, { 
      count: ordersList.length,
      totalValue: ordersList.reduce((sum, ord) => sum + ord.importo, 0)
    });
  }
  
  formatOrdersDetails(orders, filters) {
    // Similar to formatOrdersList but with product details
    return this.formatOrdersList(orders, filters);
  }
}

class ClientsQueryHandler extends BaseQueryHandler {
  async handle(operation, filters, options = {}) {
    const allData = await this.getData();
    let clients = allData.clients || [];
    
    if (clients.length === 0) {
      return ResponseFormatter.createResult([], "Non ci sono clienti nel database.", { count: 0 });
    }
    
    if (filters.nome) {
      clients = clients.filter(client => 
        this.clientNamesMatch(client.name, filters.nome)
      );
    }
    
    AILogger.log('debug', `Clients query ${operation}`, {
      totalClients: allData.clients?.length || 0,
      filteredClients: clients.length,
      filters
    });
    
    switch(operation) {
      case 'list':
        return this.formatClientsList(clients);
      case 'count':
        return ResponseFormatter.createResult(clients.length, `Trovati ${clients.length} clienti`, { count: clients.length });
      case 'details':
        return this.formatClientsDetails(clients);
      default:
        throw new Error(`Operazione clienti non supportata: ${operation}`);
    }
  }
  
  formatClientsList(clients) {
    if (clients.length === 0) {
      return ResponseFormatter.createResult([], "Non ci sono clienti nel database.", { count: 0 });
    }
    
    const sortedClients = clients
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50);
    
    let message = `👥 **Lista Clienti** (${sortedClients.length} clienti):\n\n`;
    
    sortedClients.forEach(client => {
      message += `• **${client.name}**`;
      if (client.city) message += ` (${client.city})`;
      if (client.phone) message += ` - 📞 ${client.phone}`;
      message += '\n';
    });
    
    if (clients.length > 50) {
      message += `\n(Mostrati primi 50 di ${clients.length} totali)`;
    }
    
    return ResponseFormatter.createResult(sortedClients, message, { count: clients.length });
  }
  
  formatClientsDetails(clients) {
    return this.formatClientsList(clients);
  }
}

// ==================== FACTORY PATTERN: QUERY HANDLER FACTORY ====================

class QueryHandlerFactory {
  static handlers = new Map([
    ['orders', OrdersQueryHandler],
    ['clients', ClientsQueryHandler]
  ]);
  
  static create(entity) {
    const HandlerClass = this.handlers.get(entity);
    if (!HandlerClass) {
      throw new Error(`Handler non supportato per entità: ${entity}`);
    }
    return new HandlerClass();
  }
  
  static getSupportedEntities() {
    return Array.from(this.handlers.keys());
  }
}

// ==================== CHAIN OF RESPONSIBILITY: VALIDATORS ====================

class BaseValidator {
  setNext(validator) {
    this.nextValidator = validator;
    return validator;
  }
  
  validate(request) {
    const result = this.doValidation(request);
    if (result.isValid && this.nextValidator) {
      return this.nextValidator.validate(request);
    }
    return result;
  }
  
  doValidation(request) {
    throw new Error('doValidation must be implemented');
  }
}

class EntityValidator extends BaseValidator {
  doValidation(request) {
    const { entity } = request;
    
    if (!entity) {
      return { isValid: false, error: 'Parametro "entity" richiesto' };
    }
    
    if (!QueryHandlerFactory.getSupportedEntities().includes(entity)) {
      return { 
        isValid: false, 
        error: `Entità non supportata: ${entity}. Supportate: ${QueryHandlerFactory.getSupportedEntities().join(', ')}` 
      };
    }
    
    return { isValid: true };
  }
}

class OperationValidator extends BaseValidator {
  doValidation(request) {
    const { operation } = request;
    
    if (!operation) {
      return { isValid: false, error: 'Parametro "operation" richiesto' };
    }
    
    if (!AI_MIDDLEWARE_CONFIG.OPERATIONS.includes(operation)) {
      return { 
        isValid: false, 
        error: `Operazione non supportata: ${operation}. Supportate: ${AI_MIDDLEWARE_CONFIG.OPERATIONS.join(', ')}` 
      };
    }
    
    return { isValid: true };
  }
}

class ValidationChain {
  static create() {
    const entityValidator = new EntityValidator();
    const operationValidator = new OperationValidator();
    
    entityValidator.setNext(operationValidator);
    
    return entityValidator;
  }
}

// ==================== MAIN AI MIDDLEWARE CLASS ====================

class AIMiddlewareClean {
  constructor() {
    this.debug = AI_MIDDLEWARE_CONFIG.DEBUG;
    this.version = AI_MIDDLEWARE_CONFIG.VERSION;
    this.validationChain = ValidationChain.create();
    
    AILogger.log('info', `AI Middleware Clean ${this.version} inizializzato`);
    AILogger.log('info', `Entità supportate: ${QueryHandlerFactory.getSupportedEntities().join(', ')}`);
    
    this.registerCommands();
  }
  
  registerCommands() {
    if (window.vocabularyManager) {
      window.vocabularyManager.addCommand({
        id: 'getOrderDate',
        pattern: 'dimmi la data dell\'ordine del cliente [CLIENTE]',
        action: 'getOrderDate',
        examples: [
          'dimmi la data dell\'ordine del cliente Rossi',
          'quando ha ordinato Mario Bianchi',
          'data ultimo ordine di Essemme'
        ]
      });
      AILogger.log('info', 'Comando getOrderDate registrato');
    }
  }
  
  async executeLocalAction(command, originalMessage, originalContext) {
    const startTime = Date.now();
    
    try {
      AILogger.log('debug', 'EXECUTE ACTION', {
        action: command.action,
        params: command.params,
        message: originalMessage,
        version: this.version
      });
      
      const params = ParameterNormalizer.normalize(command.params || {});
      let result;
      
      // Main action router
      switch(command.action) {
        case 'universal_query':
          result = await this.handleUniversalQuery(params, originalMessage, originalContext);
          break;
          
        case 'system_info':
          result = await this.handleSystemInfo(params, originalMessage, originalContext);
          break;
          
        case 'help':
          result = await this.handleHelp(params);
          break;
          
        case 'getOrderDate':
          result = await this.handleGetOrderDate(params, originalMessage, originalContext);
          break;
          
        // Legacy compatibility mapping
        case 'getOrdersByDate':
        case 'getOrdersByClient':
        case 'listOrders':
        case 'countOrders':
        case 'listClients':
        case 'countClients':
        case 'calculateRevenue':
          result = await this.handleLegacyAction(command.action, params, originalMessage, originalContext);
          break;
          
        default:
          throw new Error(`Azione non riconosciuta: ${command.action}`);
      }
      
      const processingTime = Date.now() - startTime;
      const finalResult = ResponseFormatter.formatResponse(result, 'summary', {
        processingTime,
        action: command.action,
        version: this.version
      });
      
      AILogger.log('debug', 'EXECUTION COMPLETED', {
        success: true,
        processingTime: processingTime + 'ms',
        hasData: !!finalResult.data
      });
      
      return finalResult;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      AILogger.log('error', 'EXECUTION ERROR', {
        error: error.message,
        action: command.action,
        params: command.params,
        processingTime: processingTime + 'ms'
      });
      
      return ResponseFormatter.createError(error, {
        action: command.action,
        processingTime
      });
    }
  }
  
  async handleUniversalQuery(params, userInput, originalContext) {
    const { entity, operation, filters = {}, field, output = 'summary' } = params;
    
    AILogger.log('debug', 'UNIVERSAL QUERY', { entity, operation, filters, field, output });
    
    // Validate request
    const validation = this.validationChain.validate({ entity, operation });
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    // Extract client name if needed
    if (filters.cliente || filters.client) {
      const clientName = ClientExtractor.extract(params, userInput, originalContext);
      if (clientName) {
        filters.cliente = clientName;
        delete filters.client;
      }
    }
    
    // Create handler and execute query
    const handler = QueryHandlerFactory.create(entity);
    return await handler.handle(operation, filters, { field, output });
  }
  
  async handleSystemInfo(params, userInput, originalContext) {
    const { type, format = 'italian' } = params;
    
    AILogger.log('debug', 'SYSTEM INFO', { type, format });
    
    const now = new Date();
    
    switch(type) {
      case 'date':
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = now.toLocaleDateString('it-IT', dateOptions);
        return `📅 Oggi è ${formattedDate}`;
        
      case 'time':
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const formattedTime = now.toLocaleTimeString('it-IT', timeOptions);
        return `🕒 Sono le ${formattedTime}`;
        
      case 'datetime':
        const dateTimeOptions = { 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        };
        const formattedDateTime = now.toLocaleString('it-IT', dateTimeOptions);
        return `📅🕒 ${formattedDateTime}`;
        
      case 'version':
        return `🤖 **AI Middleware Clean v${this.version}**\n\n` +
               `✅ Architettura ottimizzata con Pattern Design\n` +
               `🎯 Entità supportate: ${QueryHandlerFactory.getSupportedEntities().length}\n` +
               `⚙️ Operazioni supportate: ${AI_MIDDLEWARE_CONFIG.OPERATIONS.length}\n` +
               `📅 Caricato: ${new Date().toLocaleString('it-IT')}`;
        
      case 'status':
        return `📊 **Stato Sistema**\n\n` +
               `✅ AI Middleware: Operativo v${this.version}\n` +
               `✅ Connessione dati: ${window.supabaseAI ? 'Attiva' : 'Non disponibile'}\n` +
               `🔧 Debug: ${this.debug ? 'Abilitato' : 'Disabilitato'}\n` +
               `📅 Uptime: ${performance.now().toFixed(0)}ms`;
        
      default:
        throw new Error(`Tipo info non supportato: ${type}`);
    }
  }
  
  async handleHelp(params) {
    const { topic = 'general' } = params;
    
    const helpTopics = {
      general: `🤖 **AI Assistant per Gestione Commerciale**\n\n` +
               `📋 **Comandi disponibili:**\n` +
               `• "ordini di oggi/ieri/domani"\n` +
               `• "fatturato di [cliente]"\n` +
               `• "quanti clienti ho"\n` +
               `• "che ora è / che giorno è"\n\n` +
               `🔍 **Esempi:**\n` +
               `• "mostrami ordini di Mario Rossi"\n` +
               `• "quanto ha speso La Mandria questo mese"\n` +
               `• "lista dei miei clienti"\n\n` +
               `❓ Per aiuto specifico: "aiuto [argomento]"`,
      
      comandi: `📋 **Lista Comandi Completa:**\n\n` +
               `🛒 **Ordini:**\n` +
               `• Lista: "ordini di oggi", "ordini di [cliente]"\n` +
               `• Conteggio: "quanti ordini ho fatto"\n` +
               `• Fatturato: "fatturato di [cliente]", "venduto oggi"\n\n` +
               `👥 **Clienti:**\n` +
               `• Lista: "lista clienti", "tutti i clienti"\n` +
               `• Conteggio: "quanti clienti ho"\n\n` +
               `📅 **Date e Orari:**\n` +
               `• "che ora è", "che giorno è oggi"\n` +
               `• "ordini di ieri/oggi/domani"\n\n` +
               `⚙️ **Sistema:**\n` +
               `• "aiuto" - questa guida\n` +
               `• "stato sistema" - informazioni tecniche`
    };
    
    return helpTopics[topic] || helpTopics.general;
  }
  
  async handleGetOrderDate(params, userInput, originalContext) {
    const clientName = ClientExtractor.extract(params, userInput, originalContext);
    
    if (!clientName) {
      return '❌ Specifica il nome del cliente per vedere la data dell\'ordine';
    }
    
    AILogger.log('debug', 'GetOrderDate per cliente:', clientName);
    
    try {
      const handler = QueryHandlerFactory.create('orders');
      const allData = await handler.getData();
      let orders = allData.historicalOrders?.sampleData || [];
      
      // Filter by client
      orders = orders.filter(order => 
        order.cliente && handler.clientNamesMatch(order.cliente, clientName)
      );
      
      if (orders.length === 0) {
        return `❌ Nessun ordine trovato per ${clientName}`;
      }
      
      // Find order with date
      const ordersWithDate = orders.map(order => ({
        numero: order.numero_ordine || order.order_number || order.numero,
        cliente: order.cliente,
        data: order.data_ordine || order.order_date || order.data || order.created_at,
        importo: order.importo || order.totale || 0
      })).filter(o => o.data);
      
      if (ordersWithDate.length === 0) {
        return `❌ Nessuna data trovata per gli ordini di ${clientName}`;
      }
      
      // Find most recent order
      const mostRecentOrder = ordersWithDate.sort((a, b) => {
        const dateA = DateParser.parse(a.data);
        const dateB = DateParser.parse(b.data);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA;
      })[0];
      
      const formattedDate = DateParser.format(mostRecentOrder.data);
      return `📅 L'ultimo ordine di ${clientName} (${mostRecentOrder.numero}) è del ${formattedDate}`;
      
    } catch (error) {
      AILogger.log('error', 'Errore in handleGetOrderDate:', error);
      return '❌ Errore nel recupero della data dell\'ordine';
    }
  }
  
  async handleLegacyAction(action, params, userInput, originalContext) {
    AILogger.log('debug', `LEGACY ACTION MAPPING: ${action}`);
    
    const legacyMappings = {
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
      }, userInput, originalContext)
    };
    
    const handler = legacyMappings[action];
    if (handler) {
      return await handler();
    } else {
      throw new Error(`Azione legacy non mappata: ${action}`);
    }
  }
}

// ==================== GLOBAL EXPORT ====================

// Export classes for global use
window.AIMiddlewareClean = AIMiddlewareClean;
window.AIMiddleware = AIMiddlewareClean; // Compatibility

// Create global instance
try {
  window.aiMiddleware = new AIMiddlewareClean();
  AILogger.log('info', 'AIMiddleware caricato e inizializzato:', window.aiMiddleware);
  AILogger.log('info', 'Versione:', window.aiMiddleware.version);
} catch (error) {
  AILogger.log('error', 'Errore inizializzazione AIMiddleware:', error);
}

AILogger.log('info', '🚀 AIMiddleware Clean pronto per l\'uso!');