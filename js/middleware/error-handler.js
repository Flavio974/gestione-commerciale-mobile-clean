/**
 * ERROR HANDLING SYSTEM
 * Sistema robusto per gestione errori con logging strutturato
 */

class ErrorHandlingSystem {
    constructor() {
        // Livelli di log
        this.logLevels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            CRITICAL: 4
        };
        
        // Configurazione
        this.config = {
            currentLevel: this.logLevels.INFO,
            maxLogSize: 1000, // Numero massimo di log in memoria
            persistLogs: true,
            logToConsole: true,
            sendToServer: false,
            userFriendlyMessages: true
        };
        
        // Storage per log
        this.logs = [];
        this.errorStats = {
            total: 0,
            byType: {},
            byModule: {},
            recent: []
        };
        
        // Mappatura errori comuni a messaggi user-friendly
        this.userMessages = {
            'NETWORK_ERROR': 'Connessione non disponibile. Alcune funzionalità potrebbero essere limitate.',
            'INVALID_CLIENT': 'Cliente non trovato. Verifica il nome e riprova.',
            'INVALID_DATE': 'Data non valida. Usa il formato GG/MM/AAAA.',
            'PARSE_ERROR': 'Impossibile elaborare i dati. Controlla il formato del file.',
            'PERMISSION_ERROR': 'Non hai i permessi per questa operazione.',
            'DATA_NOT_FOUND': 'Dati non trovati per la richiesta specificata.',
            'TIMEOUT': 'Operazione scaduta. Riprova tra qualche istante.',
            'VALIDATION_ERROR': 'Dati non validi. Controlla i campi inseriti.',
            'DUPLICATE_ERROR': 'Elemento già esistente nel sistema.',
            'QUOTA_EXCEEDED': 'Limite di utilizzo raggiunto. Contatta l\'amministratore.'
        };
        
        // Inizializza error boundary globale
        this.setupGlobalErrorHandling();
        
        // Carica log persistenti
        this.loadPersistedLogs();
    }
    
    /**
     * Setup gestione errori globale
     */
    setupGlobalErrorHandling() {
        // Intercetta errori non gestiti
        window.addEventListener('error', (event) => {
            this.handleError(new Error(event.message), {
                type: 'UNCAUGHT_ERROR',
                file: event.filename,
                line: event.lineno,
                column: event.colno
            });
        });
        
        // Intercetta promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(new Error(event.reason), {
                type: 'UNHANDLED_REJECTION',
                promise: event.promise
            });
        });
    }
    
    /**
     * Gestisce un errore
     */
    handleError(error, context = {}) {
        // Crea entry strutturata
        const errorEntry = this.createErrorEntry(error, context);
        
        // Log errore
        this.log('ERROR', errorEntry.message, errorEntry);
        
        // Aggiorna statistiche
        this.updateErrorStats(errorEntry);
        
        // Notifica utente se necessario
        if (this.config.userFriendlyMessages && context.showUser !== false) {
            this.notifyUser(errorEntry);
        }
        
        // Invia al server se configurato
        if (this.config.sendToServer) {
            this.sendToServer(errorEntry);
        }
        
        // Ritorna informazioni per recovery
        return {
            handled: true,
            recovery: this.suggestRecovery(errorEntry),
            userMessage: this.getUserMessage(errorEntry)
        };
    }
    
    /**
     * Crea entry strutturata per errore
     */
    createErrorEntry(error, context) {
        const entry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message: error.message || 'Errore sconosciuto',
            stack: error.stack,
            type: context.type || this.detectErrorType(error),
            module: context.module || this.detectModule(error),
            context: context,
            browser: this.getBrowserInfo(),
            recovery: null
        };
        
        // Aggiungi informazioni specifiche per tipo
        switch (entry.type) {
            case 'NETWORK_ERROR':
                entry.details = {
                    url: context.url,
                    method: context.method,
                    status: context.status
                };
                break;
                
            case 'VALIDATION_ERROR':
                entry.details = {
                    field: context.field,
                    value: context.value,
                    rule: context.rule
                };
                break;
                
            case 'PARSE_ERROR':
                entry.details = {
                    input: context.input?.substring(0, 100),
                    format: context.format
                };
                break;
        }
        
        return entry;
    }
    
    /**
     * Rileva tipo di errore
     */
    detectErrorType(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'NETWORK_ERROR';
        }
        if (message.includes('parse') || message.includes('json')) {
            return 'PARSE_ERROR';
        }
        if (message.includes('validation') || message.includes('invalid')) {
            return 'VALIDATION_ERROR';
        }
        if (message.includes('permission') || message.includes('denied')) {
            return 'PERMISSION_ERROR';
        }
        if (message.includes('timeout')) {
            return 'TIMEOUT';
        }
        if (message.includes('not found')) {
            return 'DATA_NOT_FOUND';
        }
        
        return 'UNKNOWN_ERROR';
    }
    
    /**
     * Rileva modulo da stack trace
     */
    detectModule(error) {
        if (!error.stack) return 'unknown';
        
        const stackLines = error.stack.split('\n');
        for (const line of stackLines) {
            // Cerca file .js nel percorso
            const match = line.match(/\/js\/([\w-]+)\/([\w-]+)\.js/);
            if (match) {
                return `${match[1]}/${match[2]}`;
            }
        }
        
        return 'unknown';
    }
    
    /**
     * Log generico con livelli
     */
    log(level, message, data = {}) {
        const levelValue = this.logLevels[level] || this.logLevels.INFO;
        
        // Controlla se il livello è abbastanza alto
        if (levelValue < this.config.currentLevel) {
            return;
        }
        
        const logEntry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            data: data
        };
        
        // Aggiungi a memoria
        this.logs.push(logEntry);
        
        // Mantieni dimensione massima
        if (this.logs.length > this.config.maxLogSize) {
            this.logs.shift();
        }
        
        // Log su console se abilitato
        if (this.config.logToConsole) {
            this.logToConsole(logEntry);
        }
        
        // Persisti se abilitato
        if (this.config.persistLogs) {
            this.persistLogs();
        }
    }
    
    /**
     * Log su console con formattazione
     */
    logToConsole(entry) {
        const emoji = {
            'DEBUG': '🐛',
            'INFO': 'ℹ️',
            'WARN': '⚠️',
            'ERROR': '❌',
            'CRITICAL': '🚨'
        };
        
        const style = {
            'DEBUG': 'color: gray',
            'INFO': 'color: blue',
            'WARN': 'color: orange',
            'ERROR': 'color: red',
            'CRITICAL': 'color: red; font-weight: bold'
        };
        
        console.log(
            `%c${emoji[entry.level]} [${entry.level}] ${entry.message}`,
            style[entry.level],
            entry.data
        );
    }
    
    /**
     * Notifica utente in modo user-friendly
     */
    notifyUser(errorEntry) {
        const userMessage = this.getUserMessage(errorEntry);
        
        // Crea elemento di notifica se non esiste
        let notification = document.getElementById('error-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'error-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 300px;
                padding: 16px;
                background: #f44336;
                color: white;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 10000;
                animation: slideIn 0.3s ease;
            `;
            document.body.appendChild(notification);
        }
        
        // Imposta messaggio
        notification.innerHTML = `
            <div style="display: flex; align-items: start;">
                <span style="margin-right: 8px;">⚠️</span>
                <div>
                    <div style="font-weight: bold; margin-bottom: 4px;">Attenzione</div>
                    <div>${userMessage}</div>
                </div>
            </div>
        `;
        
        // Rimuovi dopo 5 secondi
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    /**
     * Ottiene messaggio user-friendly
     */
    getUserMessage(errorEntry) {
        // Prima controlla messaggi predefiniti
        if (this.userMessages[errorEntry.type]) {
            return this.userMessages[errorEntry.type];
        }
        
        // Poi prova a generare messaggio contestuale
        switch (errorEntry.type) {
            case 'VALIDATION_ERROR':
                if (errorEntry.details?.field) {
                    return `Il campo "${errorEntry.details.field}" non è valido.`;
                }
                break;
                
            case 'NETWORK_ERROR':
                if (errorEntry.details?.status === 404) {
                    return 'Risorsa non trovata. Verifica l\'indirizzo.';
                }
                if (errorEntry.details?.status >= 500) {
                    return 'Errore del server. Riprova più tardi.';
                }
                break;
        }
        
        // Default generico
        return 'Si è verificato un errore. Riprova o contatta l\'assistenza.';
    }
    
    /**
     * Suggerisce azioni di recovery
     */
    suggestRecovery(errorEntry) {
        const suggestions = [];
        
        switch (errorEntry.type) {
            case 'NETWORK_ERROR':
                suggestions.push({
                    action: 'retry',
                    description: 'Riprova l\'operazione',
                    delay: 2000
                });
                suggestions.push({
                    action: 'offline',
                    description: 'Continua in modalità offline'
                });
                break;
                
            case 'VALIDATION_ERROR':
                suggestions.push({
                    action: 'correct',
                    description: 'Correggi i dati inseriti',
                    field: errorEntry.details?.field
                });
                break;
                
            case 'PARSE_ERROR':
                suggestions.push({
                    action: 'reformat',
                    description: 'Verifica il formato del file'
                });
                suggestions.push({
                    action: 'manual',
                    description: 'Inserisci i dati manualmente'
                });
                break;
                
            case 'TIMEOUT':
                suggestions.push({
                    action: 'retry',
                    description: 'Riprova con timeout maggiore',
                    delay: 5000
                });
                break;
        }
        
        return suggestions;
    }
    
    /**
     * Aggiorna statistiche errori
     */
    updateErrorStats(errorEntry) {
        this.errorStats.total++;
        
        // Per tipo
        if (!this.errorStats.byType[errorEntry.type]) {
            this.errorStats.byType[errorEntry.type] = 0;
        }
        this.errorStats.byType[errorEntry.type]++;
        
        // Per modulo
        if (!this.errorStats.byModule[errorEntry.module]) {
            this.errorStats.byModule[errorEntry.module] = 0;
        }
        this.errorStats.byModule[errorEntry.module]++;
        
        // Recenti
        this.errorStats.recent.unshift({
            id: errorEntry.id,
            type: errorEntry.type,
            message: errorEntry.message,
            timestamp: errorEntry.timestamp
        });
        
        // Mantieni solo ultimi 10
        if (this.errorStats.recent.length > 10) {
            this.errorStats.recent.pop();
        }
    }
    
    /**
     * Wrapper per operazioni con gestione errori
     */
    async tryOperation(operation, context = {}) {
        try {
            const result = await operation();
            return { success: true, data: result };
        } catch (error) {
            const handled = this.handleError(error, context);
            return { 
                success: false, 
                error: error,
                handled: handled,
                recovery: handled.recovery
            };
        }
    }
    
    /**
     * Decorator per metodi con gestione errori automatica
     */
    withErrorHandling(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function(...args) {
            try {
                return await originalMethod.apply(this, args);
            } catch (error) {
                const context = {
                    module: target.constructor.name,
                    method: propertyKey,
                    args: args
                };
                
                const handled = this.handleError(error, context);
                
                // Se c'è recovery automatico, prova
                if (handled.recovery && handled.recovery[0]?.action === 'retry') {
                    await new Promise(resolve => setTimeout(resolve, handled.recovery[0].delay));
                    return await originalMethod.apply(this, args);
                }
                
                throw error;
            }
        };
        
        return descriptor;
    }
    
    /**
     * Ottiene informazioni browser
     */
    getBrowserInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            onLine: navigator.onLine,
            screenResolution: `${screen.width}x${screen.height}`
        };
    }
    
    /**
     * Genera ID univoco
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Persiste log su localStorage
     */
    persistLogs() {
        try {
            const logsToSave = this.logs.slice(-100); // Salva solo ultimi 100
            localStorage.setItem('errorLogs', JSON.stringify(logsToSave));
            localStorage.setItem('errorStats', JSON.stringify(this.errorStats));
        } catch (e) {
            console.warn('Impossibile salvare log:', e);
        }
    }
    
    /**
     * Carica log persistiti
     */
    loadPersistedLogs() {
        try {
            const savedLogs = localStorage.getItem('errorLogs');
            if (savedLogs) {
                this.logs = JSON.parse(savedLogs);
            }
            
            const savedStats = localStorage.getItem('errorStats');
            if (savedStats) {
                this.errorStats = JSON.parse(savedStats);
            }
        } catch (e) {
            console.warn('Impossibile caricare log salvati:', e);
        }
    }
    
    /**
     * Invia errori al server
     */
    async sendToServer(errorEntry) {
        // Implementazione futura per invio a servizio di monitoring
        // Per ora solo log
        console.log('📤 Errore da inviare al server:', errorEntry);
    }
    
    /**
     * Esporta report errori
     */
    exportErrorReport() {
        return {
            generated: new Date().toISOString(),
            stats: this.errorStats,
            recentErrors: this.errorStats.recent,
            configuration: this.config
        };
    }
    
    /**
     * Pulisce log vecchi
     */
    clearOldLogs(daysToKeep = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        this.logs = this.logs.filter(log => 
            new Date(log.timestamp) > cutoffDate
        );
        
        this.persistLogs();
    }
}

// Singleton pattern
let errorHandler = null;

function getErrorHandler() {
    if (!errorHandler) {
        errorHandler = new ErrorHandlingSystem();
    }
    return errorHandler;
}

// Esporta
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorHandlingSystem, getErrorHandler };
}