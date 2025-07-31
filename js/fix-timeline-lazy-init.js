/**
 * 🚨 FIX TIMELINE LAZY INIT
 * 
 * PROBLEMA: TimelineEvents non è caricato quando Timeline.init() viene chiamato
 * SOLUZIONE: Implementa inizializzazione lazy e verifica dipendenze
 */

console.log('🚨 [FIX TIMELINE LAZY] Inizializzazione fix Timeline lazy loading...');

// Flag per tracciare stato inizializzazione
window.timelineInitialized = false;
window.timelinePendingInit = false;

// Funzione per verificare se tutte le dipendenze sono caricate
window.checkTimelineDependencies = function() {
    const deps = {
        'Timeline': window.Timeline,
        'TimelineConfig': window.TimelineConfig,
        'TimelineEvents': window.TimelineEvents,
        'TimelineRendering': window.TimelineRendering,
        'TimelineUtils': window.TimelineUtils,
        'TimelineControls': window.TimelineControls
    };
    
    const missing = [];
    for (const [name, obj] of Object.entries(deps)) {
        if (!obj) {
            missing.push(name);
        }
    }
    
    return {
        ready: missing.length === 0,
        missing: missing,
        loaded: Object.keys(deps).filter(name => deps[name])
    };
};

// Funzione per inizializzare Timeline quando tutte le dipendenze sono pronte
window.initTimelineWhenReady = function() {
    console.log('🔧 [FIX TIMELINE LAZY] Verifica dipendenze Timeline...');
    
    const deps = window.checkTimelineDependencies();
    
    if (!deps.ready) {
        console.log('⏳ [FIX TIMELINE LAZY] Dipendenze mancanti:', deps.missing);
        console.log('✅ [FIX TIMELINE LAZY] Dipendenze caricate:', deps.loaded);
        
        // Riprova tra 500ms
        if (!window.timelinePendingInit) {
            window.timelinePendingInit = true;
            setTimeout(() => {
                window.timelinePendingInit = false;
                window.initTimelineWhenReady();
            }, 500);
        }
        return false;
    }
    
    console.log('✅ [FIX TIMELINE LAZY] Tutte le dipendenze caricate!');
    
    // Verifica se Timeline è già nella tab attiva
    const activeTab = document.querySelector('.tab-content.active');
    const isTimelineActive = activeTab && activeTab.id === 'timeline-content';
    
    if (!isTimelineActive) {
        console.log('⏸️ [FIX TIMELINE LAZY] Timeline non è attiva, skip init');
        return false;
    }
    
    // Inizializza Timeline
    try {
        console.log('🚀 [FIX TIMELINE LAZY] Inizializzazione Timeline...');
        
        // Assicurati che Timeline abbia il metodo init
        if (!window.Timeline.init) {
            console.error('❌ [FIX TIMELINE LAZY] Timeline.init non trovato!');
            return false;
        }
        
        // Chiama init
        window.Timeline.init();
        
        // Carica eventi se disponibili
        if (window.TimelineEvents && window.TimelineEvents.loadEvents) {
            console.log('📅 [FIX TIMELINE LAZY] Caricamento eventi...');
            window.TimelineEvents.loadEvents(window.Timeline.state);
        }
        
        // Render iniziale
        if (window.Timeline.render && typeof window.Timeline.render === 'function') {
            console.log('🎨 [FIX TIMELINE LAZY] Rendering Timeline...');
            window.Timeline.render();
        }
        
        window.timelineInitialized = true;
        console.log('✅ [FIX TIMELINE LAZY] Timeline inizializzata con successo!');
        
        return true;
        
    } catch (error) {
        console.error('❌ [FIX TIMELINE LAZY] Errore durante inizializzazione:', error);
        return false;
    }
};

// Override Timeline.init per gestire dipendenze mancanti
if (window.Timeline && window.Timeline.init) {
    const originalInit = window.Timeline.init.bind(window.Timeline);
    
    window.Timeline.init = function() {
        console.log('🔧 [FIX TIMELINE LAZY] Timeline.init intercettato');
        
        // Se le dipendenze non sono pronte, programma init
        const deps = window.checkTimelineDependencies();
        if (!deps.ready) {
            console.log('⏳ [FIX TIMELINE LAZY] Init posticipato, dipendenze mancanti:', deps.missing);
            window.initTimelineWhenReady();
            return;
        }
        
        // Altrimenti procedi con init normale
        try {
            originalInit.call(this);
        } catch (error) {
            console.error('❌ [FIX TIMELINE LAZY] Errore in init originale:', error);
            
            // Se l'errore è dovuto a TimelineEvents mancante, riprova
            if (error.message && error.message.includes('TimelineEvents')) {
                console.log('🔄 [FIX TIMELINE LAZY] Errore dovuto a TimelineEvents, riprovo con lazy init...');
                window.initTimelineWhenReady();
                return;
            }
            throw error;
        }
        
        // Carica eventi se erano stati saltati
        if (window.TimelineEvents && window.TimelineEvents.loadEvents && this.state) {
            console.log('📅 [FIX TIMELINE LAZY] Caricamento eventi post-init...');
            window.TimelineEvents.loadEvents(this.state);
        }
    };
} else {
    console.warn('⚠️ [FIX TIMELINE LAZY] Timeline o Timeline.init non disponibile al momento del patching');
}

// Monitora quando TimelineEvents viene caricato
let checkInterval = setInterval(() => {
    if (window.TimelineEvents) {
        console.log('✅ [FIX TIMELINE LAZY] TimelineEvents caricato!');
        clearInterval(checkInterval);
        
        // Se Timeline è attiva e non inizializzata, prova ora
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'timeline-content' && !window.timelineInitialized) {
            console.log('🔄 [FIX TIMELINE LAZY] Riprovo inizializzazione Timeline...');
            window.initTimelineWhenReady();
        }
    }
}, 1000);

// Pulisci dopo 30 secondi
setTimeout(() => {
    if (checkInterval) {
        clearInterval(checkInterval);
        console.log('🔚 [FIX TIMELINE LAZY] Stop monitoraggio dipendenze');
    }
}, 30000);

// Aggiungi listener per tab change
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 [FIX TIMELINE LAZY] Setup listener per cambio tab...');
    
    // Intercetta navigazione a Timeline
    const originalNavigateTo = window.navigateTo || window.navigateToTab;
    if (originalNavigateTo) {
        window.navigateTo = window.navigateToTab = function(tabName) {
            originalNavigateTo(tabName);
            
            // Se navighiamo a Timeline e non è inizializzata, prova ora
            if ((tabName === 'timeline' || tabName === 'timeline-content') && !window.timelineInitialized) {
                console.log('📅 [FIX TIMELINE LAZY] Navigazione a Timeline, controllo init...');
                setTimeout(() => {
                    window.initTimelineWhenReady();
                }, 100);
            }
        };
    }
});

// Test function
window.testTimelineLazy = function() {
    console.log('\n🧪 === TEST TIMELINE LAZY INIT ===\n');
    
    console.log('📋 Stato Timeline:');
    console.log('   - Inizializzata:', window.timelineInitialized ? '✅' : '❌');
    console.log('   - Init pendente:', window.timelinePendingInit ? '⏳' : '❌');
    
    console.log('\n📦 Dipendenze:');
    const deps = window.checkTimelineDependencies();
    console.log('   - Pronte:', deps.ready ? '✅' : '❌');
    console.log('   - Caricate:', deps.loaded.join(', '));
    console.log('   - Mancanti:', deps.missing.join(', ') || 'Nessuna');
    
    console.log('\n📊 Timeline State:');
    if (window.Timeline && window.Timeline.state) {
        console.log('   - Eventi:', window.Timeline.state.events?.length || 0);
        console.log('   - Data corrente:', window.Timeline.state.currentDate);
    }
    
    console.log('\n💡 Azioni:');
    console.log('   - window.initTimelineWhenReady() - Prova inizializzazione');
    console.log('   - window.checkTimelineDependencies() - Verifica dipendenze');
    
    console.log('\n✅ Test completato\n');
};

console.log('✅ [FIX TIMELINE LAZY] Fix caricato!');
console.log('💡 Usa window.testTimelineLazy() per verificare stato');