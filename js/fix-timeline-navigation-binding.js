/**
 * 🚨 FIX BINDING NAVIGAZIONE TIMELINE
 * 
 * PROBLEMA: Timeline non ha metodo onEnter, quindi non viene reinizializzata al cambio tab
 * SOLUZIONE: Aggiungi onEnter/onLeave a Timeline e correggi il binding nel sistema di navigazione
 */

console.log('🔧 [FIX TIMELINE BINDING] Inizializzazione fix binding navigazione Timeline...');

// 1. WRAP METODI onEnter/onLeave DI TIMELINE
if (window.Timeline) {
    console.log('🔧 [FIX TIMELINE BINDING] Wrapping metodi onEnter/onLeave di Timeline...');
    
    // Salva i metodi originali se esistono
    const originalOnEnter = window.Timeline.onEnter ? window.Timeline.onEnter.bind(window.Timeline) : null;
    const originalOnLeave = window.Timeline.onLeave ? window.Timeline.onLeave.bind(window.Timeline) : null;
    
    /**
     * Wrapper per onEnter che aggiunge controlli extra
     */
    window.Timeline.onEnter = function() {
        console.debug('[Timeline] onEnter wrapper called');
        
        // Se esiste il metodo originale, chiamalo
        if (originalOnEnter) {
            console.debug('[Timeline] Chiamata onEnter originale...');
            try {
                originalOnEnter.call(this);
            } catch (error) {
                console.error('[Timeline] Errore in onEnter originale:', error);
            }
        }
        
        // Controlli aggiuntivi per assicurare l'inizializzazione
        const content = document.getElementById('timeline-content');
        if (!content) {
            console.error('[Timeline] timeline-content non trovato!');
            return;
        }
        
        // Se mancano elementi critici, prova a reinizializzare
        if (!this.elements || !this.elements.canvas || !document.getElementById('timeline')) {
            console.debug('[Timeline] Elementi mancanti, tentativo reinizializzazione...');
            
            // Se TimelineEvents non è ancora caricato, usa il lazy init
            if (!window.TimelineEvents && window.initTimelineWhenReady) {
                console.debug('[Timeline] TimelineEvents non caricato, uso lazy init...');
                window.initTimelineWhenReady();
                return;
            }
            
            // Altrimenti prova init normale
            try {
                this.init();
                console.debug('[Timeline] init() completato con successo');
                
                // Chiama setupElements e refreshUI se disponibili
                if (this.setupElements) {
                    this.setupElements();
                }
                if (this.refreshUI) {
                    this.refreshUI();
                }
            } catch (error) {
                console.error('[Timeline] Errore durante reinizializzazione:', error);
            }
        }
    };
    
    /**
     * Wrapper per onLeave che mantiene il comportamento originale
     */
    window.Timeline.onLeave = function() {
        console.debug('[Timeline] onLeave wrapper called');
        
        // Se esiste il metodo originale, chiamalo
        if (originalOnLeave) {
            console.debug('[Timeline] Chiamata onLeave originale...');
            try {
                originalOnLeave.call(this);
            } catch (error) {
                console.error('[Timeline] Errore in onLeave originale:', error);
            }
        }
    };
    
    console.log('✅ [FIX TIMELINE BINDING] Metodi onEnter/onLeave wrappati con successo');
}

// 2. VERIFICA E CORREGGI IL SELETTORE NEL MODULO TIMELINE
if (window.Timeline) {
    const originalInit = window.Timeline.init;
    
    window.Timeline.init = function() {
        console.debug('[Timeline] init wrapper - Verifica selettori DOM');
        
        // Assicurati che il selettore sia corretto
        const container = document.getElementById('timeline-content');
        if (!container) {
            console.error('[Timeline] ERRORE: #timeline-content non trovato!');
            return;
        }
        
        // Se non esiste timeline-container dentro timeline-content, crealo
        let timelineContainer = document.getElementById('timeline-container');
        if (!timelineContainer) {
            console.debug('[Timeline] Creazione timeline-container mancante...');
            timelineContainer = document.createElement('div');
            timelineContainer.id = 'timeline-container';
            timelineContainer.className = 'timeline-container';
            timelineContainer.style.cssText = 'position: relative; width: 100%; height: 500px; overflow: auto;';
            container.appendChild(timelineContainer);
        }
        
        // Chiama l'init originale
        if (originalInit) {
            originalInit.call(this);
        }
        
        console.debug('[Timeline] init completato, elementi:', this.elements);
    };
}

// 3. PATCH NAVIGATION PER LOGGING MIGLIORATO
if (window.Navigation) {
    const originalAfterEnterTab = window.Navigation.afterEnterTab;
    
    window.Navigation.afterEnterTab = function(tabName) {
        console.debug(`[Navigation] afterEnterTab('${tabName}')`);
        
        // Chiama l'originale
        if (originalAfterEnterTab) {
            originalAfterEnterTab.call(this, tabName);
        }
        
        // Log specifico per Timeline
        if (tabName === 'timeline') {
            console.debug('[Navigation] Timeline tab attivato, verifica binding...');
            
            if (window.Timeline) {
                if (typeof window.Timeline.onEnter === 'function') {
                    console.debug('[Navigation] Timeline.onEnter disponibile ✅');
                } else {
                    console.error('[Navigation] Timeline.onEnter NON disponibile ❌');
                }
            } else {
                console.error('[Navigation] window.Timeline non trovato!');
            }
        }
    };
    
    const originalBeforeLeaveTab = window.Navigation.beforeLeaveTab;
    
    window.Navigation.beforeLeaveTab = function(tabName) {
        console.debug(`[Navigation] beforeLeaveTab('${tabName}')`);
        
        // Chiama l'originale
        if (originalBeforeLeaveTab) {
            originalBeforeLeaveTab.call(this, tabName);
        }
    };
}

// 4. FUNZIONE DI TEST PER VERIFICARE IL BINDING
window.testTimelineBinding = function() {
    console.log('\n🧪 === TEST TIMELINE BINDING ===\n');
    
    console.log('1️⃣ Verifica modulo Timeline:');
    console.log('   - window.Timeline:', window.Timeline ? '✅ Presente' : '❌ Mancante');
    
    if (window.Timeline) {
        console.log('   - Timeline.onEnter:', typeof window.Timeline.onEnter === 'function' ? '✅ Definito' : '❌ Mancante');
        console.log('   - Timeline.onLeave:', typeof window.Timeline.onLeave === 'function' ? '✅ Definito' : '❌ Mancante');
        console.log('   - Timeline.init:', typeof window.Timeline.init === 'function' ? '✅ Definito' : '❌ Mancante');
        console.log('   - Timeline.render:', typeof window.Timeline.render === 'function' ? '✅ Definito' : '❌ Mancante');
    }
    
    console.log('\n2️⃣ Verifica Navigation:');
    console.log('   - window.Navigation:', window.Navigation ? '✅ Presente' : '❌ Mancante');
    
    if (window.Navigation) {
        console.log('   - Navigation.afterEnterTab:', typeof window.Navigation.afterEnterTab === 'function' ? '✅ Definito' : '❌ Mancante');
        console.log('   - Navigation.beforeLeaveTab:', typeof window.Navigation.beforeLeaveTab === 'function' ? '✅ Definito' : '❌ Mancante');
    }
    
    console.log('\n3️⃣ Verifica DOM:');
    const timelineContent = document.getElementById('timeline-content');
    console.log('   - #timeline-content:', timelineContent ? '✅ Presente' : '❌ Mancante');
    
    const timelineContainer = document.getElementById('timeline-container');
    console.log('   - #timeline-container:', timelineContainer ? '✅ Presente' : '❌ Mancante');
    
    const timelineCanvas = document.getElementById('timeline-canvas');
    console.log('   - #timeline-canvas:', timelineCanvas ? '✅ Presente' : '❌ Mancante');
    
    console.log('\n4️⃣ Test navigazione:');
    console.log('   Prova a cambiare tab e tornare a Timeline.');
    console.log('   Dovresti vedere i log [Timeline] onLeave e [Timeline] onEnter');
    
    console.log('\n✅ Test completato\n');
};

// 5. AUTO-TEST AL CARICAMENTO
setTimeout(() => {
    if (window.Timeline && !window.Timeline.onEnter) {
        console.error('❌ [FIX TIMELINE BINDING] Timeline ancora senza onEnter dopo il fix!');
    } else {
        console.log('✅ [FIX TIMELINE BINDING] Timeline.onEnter correttamente configurato');
    }
}, 2000);

console.log('✅ [FIX TIMELINE BINDING] Fix caricato con successo');
console.log('💡 Usa window.testTimelineBinding() per verificare il binding');