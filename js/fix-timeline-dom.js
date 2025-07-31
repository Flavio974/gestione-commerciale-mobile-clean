/**
 * 🚨 FIX TIMELINE DOM
 * 
 * PROBLEMA: Timeline non trova gli elementi DOM necessari per il rendering
 * SOLUZIONE: Creare gli elementi DOM mancanti prima dell'inizializzazione
 */

console.log('🚨 [FIX TIMELINE DOM] Inizializzazione fix DOM Timeline...');

// Funzione per assicurare che il DOM Timeline sia completo
window.ensureTimelineDOM = function() {
    console.log('🔧 [FIX TIMELINE DOM] Verifica DOM Timeline...');
    
    // Verifica timeline-content
    let content = document.getElementById('timeline-content');
    if (!content) {
        console.error('❌ [FIX TIMELINE DOM] timeline-content non trovato!');
        return false;
    }
    
    // Se il contenuto è vuoto, aggiungi la struttura base
    if (!content.innerHTML.trim()) {
        console.log('🔧 [FIX TIMELINE DOM] Creazione struttura Timeline...');
        content.innerHTML = `
            <div class="timeline-wrapper">
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
                
                <div id="timeline-container" class="timeline-container">
                    <canvas id="timeline-canvas"></canvas>
                </div>
                
                <div class="timeline-zoom-controls">
                    <button id="zoomOutBtn" class="btn btn-sm">
                        <i class="fas fa-search-minus"></i> Zoom -
                    </button>
                    <span id="zoomLevel">100%</span>
                    <button id="zoomInBtn" class="btn btn-sm">
                        <i class="fas fa-search-plus"></i> Zoom +
                    </button>
                </div>
                
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
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Verifica elementi essenziali
    const container = document.getElementById('timeline-container');
    const canvas = document.getElementById('timeline-canvas');
    
    if (!container) {
        console.error('❌ [FIX TIMELINE DOM] timeline-container non trovato dopo creazione!');
        return false;
    }
    
    if (!canvas) {
        console.error('❌ [FIX TIMELINE DOM] timeline-canvas non trovato dopo creazione!');
        return false;
    }
    
    // Imposta dimensioni minime
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '500px';
    container.style.overflow = 'auto';
    
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    console.log('✅ [FIX TIMELINE DOM] DOM Timeline pronto');
    return true;
};

// Patch Timeline.init per assicurare DOM prima dell'inizializzazione
if (window.Timeline) {
    const originalInit = window.Timeline.init.bind(window.Timeline);
    
    window.Timeline.init = function() {
        console.log('🔧 [FIX TIMELINE DOM] Intercepting Timeline.init...');
        
        // Assicura DOM
        if (window.ensureTimelineDOM()) {
            // Chiama init originale
            try {
                originalInit();
                console.log('✅ [FIX TIMELINE DOM] Timeline inizializzata con successo');
            } catch (error) {
                console.error('❌ [FIX TIMELINE DOM] Errore durante init:', error);
                
                // Tentativo di recupero
                if (!this.elements || !this.elements.canvas) {
                    console.log('🔧 [FIX TIMELINE DOM] Tentativo recupero elementi...');
                    this.elements = {
                        container: document.getElementById('timeline-container'),
                        canvas: document.getElementById('timeline-canvas'),
                        ctx: null,
                        eventsTable: document.getElementById('eventsTableBody')
                    };
                    
                    if (this.elements.canvas) {
                        this.elements.ctx = this.elements.canvas.getContext('2d');
                    }
                }
            }
        } else {
            console.error('❌ [FIX TIMELINE DOM] Impossibile creare DOM Timeline');
        }
    };
}

// Aggiungi listener per tab Timeline
document.addEventListener('DOMContentLoaded', () => {
    // Intercetta click su tab timeline
    const timelineTab = document.querySelector('[data-target="timeline-content"]');
    if (timelineTab) {
        timelineTab.addEventListener('click', () => {
            console.log('🔧 [FIX TIMELINE DOM] Click su Timeline tab rilevato');
            setTimeout(() => {
                window.ensureTimelineDOM();
            }, 100);
        });
    }
});

// Test function
window.testTimelineDOM = function() {
    console.log('\n🧪 === TEST TIMELINE DOM ===\n');
    
    console.log('📋 Elementi DOM:');
    const elements = [
        'timeline-content',
        'timeline-container', 
        'timeline-canvas',
        'eventsTableBody',
        'currentDateInput',
        'prevDayBtn',
        'nextDayBtn',
        'todayBtn'
    ];
    
    elements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`- ${id}: ${el ? '✅ PRESENTE' : '❌ MANCANTE'}`);
    });
    
    console.log('\n📊 Timeline state:');
    if (window.Timeline) {
        console.log('- Timeline object:', '✅');
        console.log('- Timeline.elements:', window.Timeline.elements);
        if (window.Timeline.elements) {
            console.log('  - container:', window.Timeline.elements.container ? '✅' : '❌');
            console.log('  - canvas:', window.Timeline.elements.canvas ? '✅' : '❌');
            console.log('  - ctx:', window.Timeline.elements.ctx ? '✅' : '❌');
        }
    } else {
        console.log('- Timeline object:', '❌');
    }
    
    console.log('\n✅ Test completato\n');
};

console.log('✅ [FIX TIMELINE DOM] Fix caricato!');
console.log('💡 Usa window.testTimelineDOM() per verificare stato DOM');