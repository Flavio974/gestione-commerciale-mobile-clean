/**
 * TEMPORAL BOOT - Inizializzazione namespace temporale
 * Registra window.TemporalNS prima di qualsiasi altro modulo temporal
 */

// ✅ TEMPORAL POLYFILL GUARD
if (typeof Temporal === 'undefined') {
    console.warn('[temporal-boot] Polyfill Temporal mancante – script uscita sicura');
    throw new Error('[temporal-boot] Temporal non disponibile');
}

// REGISTRA NAMESPACE GLOBALE
window.TemporalNS = window.TemporalNS || {
    initialized: false,
    modules: {},
    config: null,
    dateManager: null,
    parser: null
};

// SISTEMA DI REGISTRAZIONE MODULI
window.TemporalNS.register = function(moduleName, moduleInstance) {
    console.log('[temporal-ns]', 'Registering module:', moduleName);
    this.modules[moduleName] = moduleInstance;
    
    // Auto-link common modules
    if (moduleName === 'config' && moduleInstance) {
        this.config = moduleInstance;
    }
    if (moduleName === 'dateManager' && moduleInstance) {
        this.dateManager = moduleInstance;
    }
    if (moduleName === 'parser' && moduleInstance) {
        this.parser = moduleInstance;
    }
};

// WAIT FOR MODULE - Utility per aspettare moduli
window.TemporalNS.waitFor = function(moduleName, timeout = 5000) {
    return new Promise((resolve, reject) => {
        if (this.modules[moduleName]) {
            resolve(this.modules[moduleName]);
            return;
        }
        
        const start = Date.now();
        const check = () => {
            if (this.modules[moduleName]) {
                resolve(this.modules[moduleName]);
            } else if (Date.now() - start > timeout) {
                reject(new Error(`Module ${moduleName} not available after ${timeout}ms`));
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
};

// INIT COMPLETE
window.TemporalNS.markInitialized = function() {
    this.initialized = true;
    console.log('✅ TemporalNS initialized with modules:', Object.keys(this.modules));
};

console.log('🚀 TemporalNS namespace registered');