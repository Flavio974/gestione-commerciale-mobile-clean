/**
 * 🚨 FIX TIMELINE LOADING
 * 
 * La Timeline non si inizializza correttamente.
 * Questo fix forza l'inizializzazione e aggiunge debug.
 */

console.log('🚨 [FIX TIMELINE] Inizializzazione fix Timeline...');

// Fix immediato al caricamento
document.addEventListener('DOMContentLoaded', () => {
    console.log('📅 [FIX TIMELINE] DOM Ready, verifico Timeline...');
    
    // Attendi un po' per essere sicuri che tutto sia caricato
    setTimeout(() => {
        // Verifica se Timeline esiste
        if (window.Timeline) {
            console.log('✅ [FIX TIMELINE] Timeline trovata:', window.Timeline);
            
            // Verifica se è già inizializzata
            if (window.Timeline.state && window.Timeline.state.events) {
                console.log('✅ [FIX TIMELINE] Timeline già inizializzata, eventi:', window.Timeline.state.events.length);
            } else {
                console.log('🔧 [FIX TIMELINE] Timeline non inizializzata, forzo init...');
                
                try {
                    // Verifica dipendenze
                    if (!window.TimelineConfig) {
                        console.error('❌ TimelineConfig mancante!');
                        return;
                    }
                    
                    if (!window.TimelineEvents) {
                        console.error('❌ TimelineEvents mancante!');
                        return;
                    }
                    
                    if (!window.TimelineRendering) {
                        console.error('❌ TimelineRendering mancante!');
                        return;
                    }
                    
                    // Chiama init
                    window.Timeline.init();
                    console.log('✅ [FIX TIMELINE] Timeline.init() chiamato con successo');
                    
                } catch (error) {
                    console.error('❌ [FIX TIMELINE] Errore durante init:', error);
                }
            }
        } else {
            console.error('❌ [FIX TIMELINE] window.Timeline non trovato!');
        }
        
        // Aggiungi listener per tab timeline
        const timelineTab = document.querySelector('[data-tab="timeline"]');
        if (timelineTab) {
            console.log('✅ [FIX TIMELINE] Tab Timeline trovata, aggiungo listener...');
            
            timelineTab.addEventListener('click', () => {
                console.log('📅 [FIX TIMELINE] Click su tab Timeline');
                
                setTimeout(() => {
                    // Verifica se il contenuto è visibile
                    const timelineContent = document.getElementById('timeline-content');
                    if (timelineContent && timelineContent.style.display !== 'none') {
                        console.log('✅ [FIX TIMELINE] Timeline content visibile');
                        
                        // Forza reinizializzazione se necessario
                        if (window.Timeline && window.Timeline.init) {
                            console.log('🔧 [FIX TIMELINE] Reinizializzo Timeline...');
                            
                            // Trova container e canvas
                            const container = document.getElementById('timeline-container');
                            const canvas = document.getElementById('timeline-canvas');
                            
                            if (!container || !canvas) {
                                console.error('❌ [FIX TIMELINE] Container o canvas mancanti');
                                
                                // Prova a crearli
                                if (!container && timelineContent) {
                                    const newContainer = document.createElement('div');
                                    newContainer.id = 'timeline-container';
                                    newContainer.className = 'timeline-container';
                                    timelineContent.appendChild(newContainer);
                                    console.log('✅ [FIX TIMELINE] Container creato');
                                }
                                
                                if (!canvas && container) {
                                    const newCanvas = document.createElement('canvas');
                                    newCanvas.id = 'timeline-canvas';
                                    container.appendChild(newCanvas);
                                    console.log('✅ [FIX TIMELINE] Canvas creato');
                                }
                            }
                            
                            // Reinizializza
                            try {
                                window.Timeline.init();
                                console.log('✅ [FIX TIMELINE] Timeline reinizializzata');
                            } catch (e) {
                                console.error('❌ [FIX TIMELINE] Errore reinizializzazione:', e);
                            }
                        }
                    }
                }, 100);
            });
        } else {
            console.error('❌ [FIX TIMELINE] Tab Timeline non trovata nel DOM');
        }
        
    }, 2000); // Attendi 2 secondi per essere sicuri
});

// Funzione di test
window.testTimeline = function() {
    console.log('\n🧪 === TEST TIMELINE ===\n');
    
    console.log('Timeline:', window.Timeline);
    console.log('TimelineConfig:', window.TimelineConfig);
    console.log('TimelineEvents:', window.TimelineEvents);
    console.log('TimelineRendering:', window.TimelineRendering);
    console.log('TimelineControls:', window.TimelineControls);
    console.log('TimelineUtils:', window.TimelineUtils);
    
    if (window.Timeline && window.Timeline.state) {
        console.log('\n📊 Timeline State:');
        console.log('- Eventi:', window.Timeline.state.events?.length || 0);
        console.log('- Data corrente:', window.Timeline.state.currentDate);
        console.log('- Canvas:', window.Timeline.elements?.canvas);
    }
    
    // Prova a mostrare la tab timeline
    const timelineTab = document.querySelector('[data-tab="timeline"]');
    if (timelineTab) {
        console.log('\n📅 Aprendo tab Timeline...');
        timelineTab.click();
    }
    
    console.log('\n✅ Test completato\n');
};

console.log('✅ [FIX TIMELINE] Fix caricato');
console.log('💡 Usa window.testTimeline() per debug');