/**
 * 🧪 WORKER CONTEXT DETECTOR
 * Tool per identificare se i moduli temporal vengono caricati in Worker context
 */

// ✅ Funzione per diagnosticare contesto di esecuzione
window.diagnoseExecutionContext = function() {
    console.log('🔍 [CONTEXT DIAGNOSTIC] Analyzing execution environment...');
    
    const context = {
        // Basic checks
        hasWindow: typeof window !== 'undefined',
        hasDocument: typeof document !== 'undefined',
        hasSelf: typeof self !== 'undefined',
        hasGlobal: typeof global !== 'undefined',
        
        // Worker detection
        isWorker: typeof importScripts === 'function',
        isServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
        isDedicatedWorker: typeof DedicatedWorkerGlobalScope !== 'undefined',
        isSharedWorker: typeof SharedWorkerGlobalScope !== 'undefined',
        
        // Browser APIs
        hasLocalStorage: typeof localStorage !== 'undefined',
        hasSessionStorage: typeof sessionStorage !== 'undefined',
        hasFetch: typeof fetch !== 'undefined',
        hasIndexedDB: typeof indexedDB !== 'undefined',
        
        // Current URL context
        currentURL: typeof location !== 'undefined' ? location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };
    
    console.log('📊 [CONTEXT] Execution context:', context);
    
    // Diagnosi specifica per problemi temporal
    if (!context.hasWindow) {
        console.error('❌ [CONTEXT] PROBLEMA: Moduli temporal caricati senza window object!');
        console.error('💡 [CONTEXT] Soluzione: Aggiungere worker-safe guards a tutti i moduli');
    }
    
    if (!context.hasDocument) {
        console.error('❌ [CONTEXT] PROBLEMA: Moduli temporal caricati senza document object!');
        console.error('💡 [CONTEXT] Soluzione: Evitare DOM manipulation nei moduli');
    }
    
    if (context.isWorker) {
        console.error('❌ [CONTEXT] CONFERMATO: Esecuzione in Worker context!');
        console.error('💡 [CONTEXT] Soluzione: Non importare moduli DOM-dependent nei Worker');
    }
    
    return context;
};

// ✅ Test automatico per verificare quando cambia il contesto
window.startContextMonitoring = function() {
    console.log('🔄 [CONTEXT MONITOR] Starting context monitoring...');
    
    let lastContext = window.diagnoseExecutionContext();
    
    const monitor = setInterval(() => {
        const currentContext = window.diagnoseExecutionContext();
        
        // Rileva cambiamenti di contesto
        const changes = [];
        Object.keys(currentContext).forEach(key => {
            if (currentContext[key] !== lastContext[key]) {
                changes.push(`${key}: ${lastContext[key]} → ${currentContext[key]}`);
            }
        });
        
        if (changes.length > 0) {
            console.warn('⚠️ [CONTEXT MONITOR] Context change detected:', changes);
        }
        
        lastContext = currentContext;
    }, 2000); // Check ogni 2 secondi
    
    // Stop monitoring dopo 30 secondi
    setTimeout(() => {
        clearInterval(monitor);
        console.log('🛑 [CONTEXT MONITOR] Monitoring stopped');
    }, 30000);
    
    return monitor;
};

// ✅ Simula caricamento modulo temporal in diversi contesti
window.simulateTemporalLoadInWorker = function() {
    console.log('🧪 [WORKER SIMULATION] Simulating temporal module load in Worker...');
    
    try {
        // Crea un worker temporaneo per testare il caricamento
        const workerCode = `
            console.log('[WORKER] Loading temporal module...');
            console.log('[WORKER] typeof window:', typeof window);
            console.log('[WORKER] typeof document:', typeof document);
            console.log('[WORKER] typeof self:', typeof self);
            
            try {
                // importScripts('/config/temporal-settings.js'); // ❌ DISABILITATO - Causava duplicati
                console.log('[WORKER] ℹ️ Temporal module loading disabled to prevent duplicates');
            } catch (error) {
                console.error('[WORKER] ❌ Temporal module failed:', error);
                self.postMessage({error: error.message});
            }
            
            self.postMessage({completed: true});
        `;
        
        const blob = new Blob([workerCode], {type: 'application/javascript'});
        const worker = new Worker(URL.createObjectURL(blob));
        
        worker.onmessage = function(e) {
            if (e.data.error) {
                console.error('❌ [WORKER SIMULATION] Error:', e.data.error);
            } else if (e.data.completed) {
                console.log('✅ [WORKER SIMULATION] Test completed');
                worker.terminate();
            }
        };
        
        worker.onerror = function(error) {
            console.error('💥 [WORKER SIMULATION] Worker error:', error);
        };
        
    } catch (error) {
        console.error('💥 [WORKER SIMULATION] Failed to create worker:', error);
    }
};

// ✅ Auto-run diagnosis on load
console.log('🔍 [CONTEXT DETECTOR] Loaded - Run diagnoseExecutionContext() to analyze');
console.log('🔍 [CONTEXT DETECTOR] Available functions:');
console.log('   - diagnoseExecutionContext() - Analyze current context');
console.log('   - startContextMonitoring() - Monitor context changes');
console.log('   - simulateTemporalLoadInWorker() - Test Worker loading');

// Auto-diagnose context on script load
if (typeof window !== 'undefined') {
    setTimeout(() => {
        console.log('\n🔍 [AUTO-DIAGNOSIS] Running automatic context diagnosis...');
        window.diagnoseExecutionContext();
    }, 1000);
}