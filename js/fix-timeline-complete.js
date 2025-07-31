/**
 * 🚨 FIX COMPLETO TIMELINE
 * 
 * PROBLEMA: Timeline non si carica, manca DOM e inizializzazione corretta
 * SOLUZIONE: Gestione completa del DOM e inizializzazione quando necessario
 */

console.log('🚨 [FIX TIMELINE COMPLETE] Inizializzazione fix completo Timeline...');

// Funzione helper per verificare tutte le dipendenze
window.checkAllTimelineDependencies = function() {
    const deps = {
        'TimelineConfig': window.TimelineConfig,
        'Timeline': window.Timeline,
        'TimelineEvents': window.TimelineEvents,
        'TimelineRendering': window.TimelineRendering,
        'TimelineUtils': window.TimelineUtils,
        'TimelineControls': window.TimelineControls
    };
    
    const missing = [];
    const loaded = [];
    
    for (const [name, obj] of Object.entries(deps)) {
        if (!obj) {
            missing.push(name);
        } else {
            loaded.push(name);
        }
    }
    
    console.log('📊 [FIX TIMELINE] Stato dipendenze:', {
        loaded: loaded,
        missing: missing,
        allReady: missing.length === 0
    });
    
    return {
        allReady: missing.length === 0,
        missing: missing,
        loaded: loaded,
        deps: deps
    };
};

// Funzione per creare DOM completo Timeline
window.createTimelineDOM = function() {
    console.log('🔧 [FIX TIMELINE] Creazione DOM Timeline completo...');
    
    const content = document.getElementById('timeline-content');
    if (!content) {
        console.error('❌ [FIX TIMELINE] timeline-content non trovato!');
        return false;
    }
    
    // Crea struttura completa
    content.innerHTML = `
        <div class="timeline-wrapper">
            <!-- Header con controlli data -->
            <div class="timeline-header">
                <h2>Timeline Eventi</h2>
                <div class="timeline-controls">
                    <button id="prevDayBtn" class="btn btn-secondary">
                        <i class="fas fa-chevron-left"></i> Giorno Precedente
                    </button>
                    <input type="date" id="currentDateInput" class="date-input">
                    <button id="nextDayBtn" class="btn btn-secondary">
                        Giorno Successivo <i class="fas fa-chevron-right"></i>
                    </button>
                    <button id="todayBtn" class="btn btn-primary">Oggi</button>
                </div>
            </div>
            
            <!-- Container Timeline Canvas -->
            <div id="timeline-container" class="timeline-container" style="position: relative; width: 100%; height: 500px; overflow-x: auto;">
                <canvas id="timeline-canvas" style="display: block;"></canvas>
            </div>
            
            <!-- Controlli Zoom -->
            <div class="timeline-zoom-controls">
                <button id="zoomOutBtn" class="btn btn-sm">
                    <i class="fas fa-search-minus"></i> Zoom -
                </button>
                <span id="zoomLevel">100%</span>
                <button id="zoomInBtn" class="btn btn-sm">
                    <i class="fas fa-search-plus"></i> Zoom +
                </button>
            </div>
            
            <!-- Tabella Eventi -->
            <div class="events-section">
                <h3>Eventi del Giorno</h3>
                <div id="eventsTableContainer">
                    <table class="events-table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Inizio</th>
                                <th>Fine</th>
                                <th>Durata</th>
                                <th>Tipo</th>
                                <th>Note</th>
                                <th>Reale Inizio</th>
                                <th>Reale Fine</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody id="eventsTableBody">
                            <tr>
                                <td colspan="9" style="text-align: center; padding: 20px;">
                                    Caricamento eventi...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Pulsanti Azioni -->
            <div class="timeline-actions" style="margin-top: 20px;">
                <button id="addEventBtn" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Aggiungi Evento
                </button>
                <button id="refreshTimelineBtn" class="btn btn-secondary">
                    <i class="fas fa-sync"></i> Aggiorna
                </button>
            </div>
        </div>
    `;
    
    console.log('✅ [FIX TIMELINE] DOM creato con successo');
    return true;
};

// Funzione per inizializzare Timeline in modo sicuro
window.initTimelineSafe = function() {
    console.log('🔧 [FIX TIMELINE] Inizializzazione sicura Timeline...');
    
    // Verifica se Timeline esiste
    if (!window.Timeline) {
        console.error('❌ [FIX TIMELINE] window.Timeline non esiste!');
        return false;
    }
    
    // Verifica dipendenze
    const deps = ['TimelineConfig', 'TimelineEvents', 'TimelineRendering', 'TimelineUtils'];
    const missingDeps = deps.filter(dep => !window[dep]);
    
    if (missingDeps.length > 0) {
        console.error('❌ [FIX TIMELINE] Dipendenze mancanti:', missingDeps);
        return false;
    }
    
    // Crea DOM se necessario
    const content = document.getElementById('timeline-content');
    if (!content || !content.querySelector('#timeline-container')) {
        console.log('🔧 [FIX TIMELINE] DOM mancante, creazione...');
        if (!window.createTimelineDOM()) {
            return false;
        }
    }
    
    // Inizializza Timeline
    try {
        // Reset elementi se necessario
        if (!window.Timeline.elements || !window.Timeline.elements.canvas) {
            window.Timeline.elements = {
                container: document.getElementById('timeline-container'),
                canvas: document.getElementById('timeline-canvas'),
                ctx: null,
                eventsTable: document.getElementById('eventsTableBody')
            };
        }
        
        // Verifica che tutte le dipendenze siano caricate prima di init
        const deps = window.checkAllTimelineDependencies();
        if (!deps.allReady) {
            console.warn('⏳ [FIX TIMELINE] Dipendenze mancanti, posticipo init:', deps.missing);
            
            // Usa il sistema lazy init se disponibile
            if (window.initTimelineWhenReady) {
                window.initTimelineWhenReady();
            } else {
                // Riprova tra poco
                setTimeout(window.initializeTimeline, 500);
            }
            return;
        }
        
        // Chiama init
        console.log('🚀 [FIX TIMELINE] Tutte le dipendenze pronte, chiamo Timeline.init()');
        window.Timeline.init();
        
        // Verifica canvas context
        if (window.Timeline.elements.canvas && !window.Timeline.elements.ctx) {
            window.Timeline.elements.ctx = window.Timeline.elements.canvas.getContext('2d');
        }
        
        // Setup controlli se TimelineControls disponibile
        if (window.TimelineControls && window.TimelineControls.init) {
            window.TimelineControls.init(window.Timeline.state);
        }
        
        // Carica eventi se disponibili
        if (window.TimelineEvents && window.TimelineEvents.loadEvents) {
            window.TimelineEvents.loadEvents(window.Timeline.state);
        }
        
        // Render iniziale
        if (window.Timeline.render) {
            window.Timeline.render();
        }
        
        console.log('✅ [FIX TIMELINE] Timeline inizializzata con successo!');
        return true;
        
    } catch (error) {
        console.error('❌ [FIX TIMELINE] Errore durante inizializzazione:', error);
        return false;
    }
};

// Patch Navigation per gestire Timeline
if (window.Navigation) {
    const originalAfterEnter = window.Navigation.afterEnterTab;
    
    window.Navigation.afterEnterTab = function(tabName) {
        console.log('🔧 [FIX TIMELINE] afterEnterTab:', tabName);
        
        // Chiama originale se esiste
        if (originalAfterEnter) {
            originalAfterEnter.call(this, tabName);
        }
        
        // Gestione speciale per Timeline
        if (tabName === 'timeline') {
            console.log('📅 [FIX TIMELINE] Entrata in Timeline tab');
            
            setTimeout(() => {
                // Verifica visibilità
                const content = document.getElementById('timeline-content');
                if (content && content.classList.contains('active')) {
                    window.initTimelineSafe();
                }
            }, 100);
        }
    };
}

// Intercetta click su tab timeline
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 [FIX TIMELINE] Setup listener per tab...');
    
    // Listener per click su timeline tab
    document.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-target="timeline-content"]');
        if (tab) {
            console.log('🖱️ [FIX TIMELINE] Click su Timeline tab');
            
            setTimeout(() => {
                window.initTimelineSafe();
            }, 200);
        }
    });
    
    // Se siamo già su timeline, inizializza
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'timeline-content') {
        console.log('📅 [FIX TIMELINE] Già su timeline, inizializzo...');
        setTimeout(() => {
            window.initTimelineSafe();
        }, 500);
    }
});

// Test function
window.testTimelineComplete = function() {
    console.log('\n🧪 === TEST TIMELINE COMPLETO ===\n');
    
    console.log('📋 Moduli Timeline:');
    const modules = ['Timeline', 'TimelineConfig', 'TimelineEvents', 'TimelineRendering', 'TimelineUtils', 'TimelineControls'];
    modules.forEach(mod => {
        const exists = window[mod] !== undefined;
        console.log(`- ${mod}: ${exists ? '✅ CARICATO' : '❌ MANCANTE'}`);
    });
    
    console.log('\n📋 Elementi DOM:');
    const elements = [
        'timeline-content',
        'timeline-container',
        'timeline-canvas',
        'eventsTableBody',
        'currentDateInput',
        'prevDayBtn',
        'nextDayBtn',
        'todayBtn',
        'zoomInBtn',
        'zoomOutBtn'
    ];
    
    elements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`- ${id}: ${el ? '✅ PRESENTE' : '❌ MANCANTE'}`);
    });
    
    console.log('\n📊 Timeline State:');
    if (window.Timeline) {
        console.log('- Timeline object:', '✅');
        console.log('- Timeline.state:', window.Timeline.state);
        console.log('- Timeline.elements:', window.Timeline.elements);
        
        if (window.Timeline.elements) {
            console.log('  - container:', window.Timeline.elements.container ? '✅' : '❌');
            console.log('  - canvas:', window.Timeline.elements.canvas ? '✅' : '❌');
            console.log('  - ctx:', window.Timeline.elements.ctx ? '✅' : '❌');
            console.log('  - eventsTable:', window.Timeline.elements.eventsTable ? '✅' : '❌');
        }
        
        if (window.Timeline.state) {
            console.log('- Eventi caricati:', window.Timeline.state.events?.length || 0);
            console.log('- Data corrente:', window.Timeline.state.currentDate);
        }
    } else {
        console.log('- Timeline object:', '❌');
    }
    
    console.log('\n💡 Azioni disponibili:');
    console.log('- window.createTimelineDOM() - Crea DOM Timeline');
    console.log('- window.initTimelineSafe() - Inizializza Timeline');
    console.log('- window.Timeline.render() - Forza rendering');
    
    console.log('\n✅ Test completato\n');
};

console.log('✅ [FIX TIMELINE COMPLETE] Fix caricato!');
console.log('💡 Usa window.testTimelineComplete() per verificare stato completo');