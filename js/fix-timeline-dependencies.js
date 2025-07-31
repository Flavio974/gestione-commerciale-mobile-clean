/**
 * 🚨 FIX DIPENDENZE TIMELINE
 * 
 * PROBLEMA: Timeline richiede TimelineConfig che potrebbe non essere ancora caricato
 * SOLUZIONE: Verifica e assicura che tutte le dipendenze siano pronte
 */

console.log('🔧 [FIX TIMELINE DEPS] Inizializzazione fix dipendenze Timeline...');

// Verifica e correggi TimelineConfig
if (typeof window.TimelineConfig === 'undefined') {
    console.warn('⚠️ [FIX TIMELINE DEPS] TimelineConfig non trovato, provo a caricarlo...');
    
    // Prova a caricare il modulo
    const script = document.createElement('script');
    script.src = 'js/timeline/timeline-config.js?' + Date.now();
    script.onload = function() {
        console.log('✅ [FIX TIMELINE DEPS] TimelineConfig caricato dinamicamente');
        
        // Ricarica Timeline se necessario
        if (typeof window.Timeline === 'undefined') {
            const timelineScript = document.createElement('script');
            timelineScript.src = 'js/timeline/timeline-core.js?' + Date.now();
            document.body.appendChild(timelineScript);
        }
    };
    document.body.appendChild(script);
}

// Patch Timeline per gestire dipendenze mancanti
if (window.Timeline && !window.Timeline._depsPatched) {
    console.log('🔧 [FIX TIMELINE DEPS] Patching Timeline per gestire dipendenze...');
    
    const originalInit = window.Timeline.init;
    
    window.Timeline.init = function() {
        console.log('🔍 [FIX TIMELINE DEPS] Verifica dipendenze prima di init...');
        
        // Verifica TimelineConfig
        if (typeof window.TimelineConfig === 'undefined') {
            console.error('❌ [FIX TIMELINE DEPS] TimelineConfig mancante, impossibile inizializzare');
            return;
        }
        
        // Assegna config se mancante
        if (!this.config && window.TimelineConfig) {
            this.config = window.TimelineConfig;
            console.log('✅ [FIX TIMELINE DEPS] TimelineConfig assegnato a Timeline');
        }
        
        // Chiama init originale
        if (originalInit) {
            originalInit.call(this);
        }
    };
    
    window.Timeline._depsPatched = true;
}

// Funzione helper per verificare dipendenze
window.verifyTimelineDependencies = function() {
    const deps = {
        'TimelineConfig': window.TimelineConfig,
        'Timeline': window.Timeline,
        'TimelineEvents': window.TimelineEvents,
        'TimelineRendering': window.TimelineRendering,
        'TimelineUtils': window.TimelineUtils,
        'TimelineControls': window.TimelineControls,
        'TimelineIntelligentManager': window.TimelineIntelligentManager
    };
    
    console.log('📊 [FIX TIMELINE DEPS] Stato dipendenze:');
    for (const [name, dep] of Object.entries(deps)) {
        console.log(`   - ${name}: ${dep ? '✅ Caricato' : '❌ Mancante'}`);
    }
    
    return deps;
};

// Monitor per TimelineConfig
let configCheckInterval = setInterval(() => {
    if (window.TimelineConfig) {
        console.log('✅ [FIX TIMELINE DEPS] TimelineConfig rilevato');
        
        // Se Timeline esiste ma non ha config, assegnalo
        if (window.Timeline && !window.Timeline.config) {
            window.Timeline.config = window.TimelineConfig;
            console.log('✅ [FIX TIMELINE DEPS] Config assegnato a Timeline esistente');
        }
        
        clearInterval(configCheckInterval);
    }
}, 100);

// Pulisci dopo 10 secondi
setTimeout(() => {
    if (configCheckInterval) {
        clearInterval(configCheckInterval);
        console.log('🔚 [FIX TIMELINE DEPS] Stop monitoraggio dipendenze');
    }
}, 10000);

console.log('✅ [FIX TIMELINE DEPS] Fix caricato');
console.log('💡 Usa window.verifyTimelineDependencies() per verificare lo stato');