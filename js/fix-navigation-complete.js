/**
 * 🚨 FIX CRITICO NAVIGAZIONE COMPLETA
 * 
 * PROBLEMA: Solo tab "Comandi" funziona perché ha onEnter(), 
 * gli altri moduli hanno solo init() che non viene chiamato
 */

console.log('🚨 [FIX NAV COMPLETE] Inizializzazione fix navigazione completa...');

// Mappa corretta moduli -> metodi init
const MODULE_INIT_MAP = {
  'timeline': { module: 'Timeline', init: 'init', hasOnEnter: false },
  'clients': { module: 'Clienti', init: 'init', hasOnEnter: false },
  'orders': { module: 'Ordini', init: 'init', hasOnEnter: false },
  'travels': { module: 'Percorsi', init: 'init', hasOnEnter: false },
  'worksheet': { module: 'Worksheet', init: 'init', hasOnEnter: false },
  'ddtft': { module: 'DDTFTModule', init: 'init', hasOnEnter: false },
  'smart': { module: 'SmartAssistant', init: 'init', hasOnEnter: false },
  'ai': { module: 'FlavioAIAssistant', init: 'init', hasOnEnter: false },
  'comandi': { module: 'ComandiModule', init: 'init', hasOnEnter: true },
  'prodotti': { module: 'Prodotti', init: 'init', hasOnEnter: false },
  'data': { module: 'Timeline', init: 'init', hasOnEnter: false } // data è alias per timeline
};

// Flag per tracciare tab inizializzate
const initializedTabs = new Set();

// Override afterEnterTab per gestire correttamente le inizializzazioni
if (window.Navigation && window.Navigation.afterEnterTab) {
    console.log('🔧 [FIX NAV] Patching Navigation.afterEnterTab...');
    
    const originalAfterEnterTab = window.Navigation.afterEnterTab.bind(window.Navigation);
    
    window.Navigation.afterEnterTab = function(tabName) {
        console.log(`📋 [FIX NAV] afterEnterTab chiamato per: ${tabName}`);
        
        // Chiama l'originale (per Comandi che ha onEnter)
        originalAfterEnterTab(tabName);
        
        // Gestisci inizializzazione per tab che non hanno onEnter
        const tabConfig = MODULE_INIT_MAP[tabName];
        
        if (tabConfig && !tabConfig.hasOnEnter) {
            console.log(`⚙️ [FIX NAV] Inizializzazione ${tabName}...`);
            
            const moduleObj = window[tabConfig.module];
            
            if (moduleObj) {
                // Se il modulo ha init e non è già inizializzato
                if (typeof moduleObj[tabConfig.init] === 'function') {
                    try {
                        console.log(`🚀 [FIX NAV] Chiamata ${tabConfig.module}.${tabConfig.init}()`);
                        moduleObj[tabConfig.init]();
                        initializedTabs.add(tabName);
                        console.log(`✅ [FIX NAV] ${tabName} inizializzata con successo`);
                    } catch (error) {
                        console.error(`❌ [FIX NAV] Errore inizializzazione ${tabName}:`, error);
                    }
                } else {
                    console.warn(`⚠️ [FIX NAV] ${tabConfig.module}.${tabConfig.init} non è una funzione`);
                }
            } else {
                console.error(`❌ [FIX NAV] Modulo ${tabConfig.module} non trovato`);
            }
        }
        
        // Fix specifico per Timeline
        if (tabName === 'timeline' || tabName === 'data') {
            setTimeout(() => {
                initializeTimelineSafe();
            }, 100);
        }
    };
}

// Funzione sicura per inizializzare Timeline
function initializeTimelineSafe() {
    console.log('📅 [FIX NAV] Inizializzazione Timeline sicura...');
    
    if (!window.Timeline) {
        console.error('❌ [FIX NAV] Timeline non disponibile');
        return;
    }
    
    // Verifica se già inizializzata
    if (window.Timeline.elements && window.Timeline.elements.canvas) {
        console.log('✅ [FIX NAV] Timeline già inizializzata');
        return;
    }
    
    // Verifica elementi DOM
    const content = document.getElementById('timeline-content');
    if (!content || content.style.display === 'none') {
        console.warn('⚠️ [FIX NAV] timeline-content non visibile');
        return;
    }
    
    try {
        window.Timeline.init();
        console.log('✅ [FIX NAV] Timeline inizializzata');
    } catch (error) {
        console.error('❌ [FIX NAV] Errore init Timeline:', error);
    }
}

// Aggiungi metodi onEnter dove mancano
function addMissingOnEnterMethods() {
    console.log('🔧 [FIX NAV] Aggiunta metodi onEnter mancanti...');
    
    Object.entries(MODULE_INIT_MAP).forEach(([tabName, config]) => {
        if (!config.hasOnEnter && window[config.module]) {
            const moduleObj = window[config.module];
            
            if (!moduleObj.onEnter) {
                console.log(`➕ [FIX NAV] Aggiunto onEnter a ${config.module}`);
                
                moduleObj.onEnter = function() {
                    console.log(`📋 Entering ${tabName} tab`);
                    
                    if (typeof this.init === 'function') {
                        console.log(`⚙️ Inizializzazione ${tabName}...`);
                        try {
                            this.init();
                            console.log(`✅ ${tabName} inizializzata`);
                        } catch (error) {
                            console.error(`❌ Errore init ${tabName}:`, error);
                        }
                    }
                };
            }
            
            if (!moduleObj.onLeave) {
                moduleObj.onLeave = function() {
                    console.log(`📋 Leaving ${tabName} tab`);
                };
            }
        }
    });
}

// Applica fix dopo che i moduli sono caricati
setTimeout(() => {
    addMissingOnEnterMethods();
    console.log('✅ [FIX NAV] Metodi onEnter aggiunti a tutti i moduli');
}, 2000);

// Fix click handler per tutte le tab
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 [FIX NAV] Setup click handlers...');
    
    // Trova tutte le tab
    const tabs = document.querySelectorAll('[data-tab]');
    
    tabs.forEach(tab => {
        const tabName = tab.getAttribute('data-tab');
        console.log(`🖱️ [FIX NAV] Setup click per tab: ${tabName}`);
        
        // Rimuovi vecchi handler
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
        
        // Aggiungi nuovo handler
        newTab.addEventListener('click', (e) => {
            e.preventDefault();
            console.log(`🖱️ [FIX NAV] Click su tab: ${tabName}`);
            
            // Usa navigateTo se disponibile
            if (window.navigateTo) {
                window.navigateTo(tabName + '-content');
            } else if (window.Navigation && window.Navigation.switchToTab) {
                window.Navigation.switchToTab(tabName);
            }
        });
    });
});

// Funzione di test completa
window.testNavigationComplete = function() {
    console.log('\n🧪 === TEST NAVIGAZIONE COMPLETA ===\n');
    
    console.log('📊 Moduli disponibili:');
    Object.entries(MODULE_INIT_MAP).forEach(([tab, config]) => {
        const available = !!window[config.module];
        const hasInit = available && typeof window[config.module][config.init] === 'function';
        const hasOnEnter = available && typeof window[config.module].onEnter === 'function';
        
        console.log(`${tab}:`);
        console.log(`  - Modulo ${config.module}: ${available ? '✅' : '❌'}`);
        console.log(`  - Metodo ${config.init}: ${hasInit ? '✅' : '❌'}`);
        console.log(`  - Metodo onEnter: ${hasOnEnter ? '✅' : '❌'}`);
    });
    
    console.log('\n📋 Tab inizializzate:', Array.from(initializedTabs));
    
    console.log('\n🖱️ Tab elements:');
    document.querySelectorAll('[data-tab]').forEach(tab => {
        console.log(`- ${tab.getAttribute('data-tab')}: ${tab.id || tab.className}`);
    });
    
    console.log('\n💡 Test manuale:');
    console.log('1. Clicca su ogni tab e verifica che si carichi');
    console.log('2. Controlla i log per vedere le inizializzazioni');
    
    console.log('\n✅ Test completato\n');
};

// Test veloce navigazione
window.testAllTabs = async function() {
    console.log('\n🧪 === TEST RAPIDO TUTTE LE TAB ===\n');
    
    const tabs = ['timeline', 'clients', 'orders', 'ddtft', 'worksheet'];
    
    for (const tab of tabs) {
        console.log(`\n📋 Test ${tab}...`);
        
        if (window.navigateTo) {
            window.navigateTo(tab + '-content');
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n✅ Test completato - verifica i log sopra\n');
};

console.log('✅ [FIX NAV COMPLETE] Fix navigazione caricato!');
console.log('💡 Comandi disponibili:');
console.log('   window.testNavigationComplete() - Stato completo sistema');
console.log('   window.testAllTabs() - Test rapido tutte le tab');