/**
 * 🚨 FIX NAVIGAZIONE UNIFICATA
 * 
 * PROBLEMA: Multipli sistemi di navigazione in conflitto
 * SOLUZIONE: Sistema unificato che gestisce correttamente tutte le schede
 */

console.log('🚨 [FIX NAV UNIFIED] Inizializzazione sistema navigazione unificato...');

// Mappa completa di tutti i moduli e le loro inizializzazioni
window.TAB_MODULE_MAP = {
    'timeline': {
        module: 'Timeline',
        init: 'init',
        onEnter: function() {
            console.log('📅 Entrata in Timeline');
            if (window.initTimelineSafe) {
                window.initTimelineSafe();
            } else if (window.Timeline && window.Timeline.init) {
                window.Timeline.init();
            }
        }
    },
    'data': {
        module: 'Timeline',
        init: 'init',
        onEnter: function() {
            console.log('📊 Entrata in Data (alias Timeline)');
            if (window.Timeline && window.Timeline.init) {
                window.Timeline.init();
            }
        }
    },
    'clients': {
        module: 'Clienti',
        init: 'init',
        onEnter: function() {
            console.log('👥 Entrata in Clienti');
            if (window.Clienti && window.Clienti.init) {
                window.Clienti.init();
            }
        }
    },
    'orders': {
        module: 'Ordini',
        init: 'init',
        onEnter: function() {
            console.log('📦 Entrata in Ordini');
            if (window.Ordini) {
                if (window.Ordini.onEnter) {
                    window.Ordini.onEnter();
                } else if (window.Ordini.init) {
                    window.Ordini.init();
                }
            }
        }
    },
    'ddtft': {
        module: 'getDDTFTModule',
        init: 'init',
        isFunction: true,
        onEnter: function() {
            console.log('📄 Entrata in DDT/FT');
            const module = window.getDDTFTModule ? window.getDDTFTModule() : window.DDTFTModule;
            if (module && module.init) {
                module.init();
            }
        }
    },
    'worksheet': {
        module: 'Worksheet',
        init: 'init',
        onEnter: function() {
            console.log('📊 Entrata in Worksheet');
            if (window.Worksheet && window.Worksheet.init) {
                window.Worksheet.init();
            }
        }
    },
    'travels': {
        module: 'Percorsi',
        init: 'init',
        onEnter: function() {
            console.log('🛣️ Entrata in Percorsi');
            if (window.Percorsi && window.Percorsi.init) {
                window.Percorsi.init();
            }
        }
    },
    'prodotti': {
        module: 'Prodotti',
        init: 'init',
        onEnter: function() {
            console.log('🛍️ Entrata in Prodotti');
            if (window.Prodotti && window.Prodotti.init) {
                window.Prodotti.init();
            }
        }
    },
    'comandi': {
        module: 'ComandiModule',
        init: 'init',
        hasNativeOnEnter: true,
        onEnter: function() {
            console.log('⚙️ Entrata in Comandi');
            if (window.ComandiModule && window.ComandiModule.onEnter) {
                window.ComandiModule.onEnter();
            }
        }
    },
    'smart': {
        module: 'SmartAssistant',
        init: 'init',
        onEnter: function() {
            console.log('🎤 Entrata in Smart Assistant');
            if (window.SmartAssistant) {
                if (window.SmartAssistant.render) {
                    window.SmartAssistant.render();
                } else if (window.SmartAssistant.init) {
                    window.SmartAssistant.init();
                }
            }
        }
    },
    'ai': {
        module: 'FlavioAIAssistant',
        init: 'init',
        onEnter: function() {
            console.log('🤖 Entrata in AI Assistant');
            if (window.FlavioAIAssistant) {
                if (window.FlavioAIAssistant.renderInterface) {
                    window.FlavioAIAssistant.renderInterface();
                } else if (window.FlavioAIAssistant.init) {
                    window.FlavioAIAssistant.init();
                }
            }
        }
    }
};

// Sistema di navigazione unificato
window.navigateToTab = function(tabName) {
    console.log(`🎯 [NAV UNIFIED] Navigazione a: ${tabName}`);
    
    // Rimuovi -content se presente
    tabName = tabName.replace('-content', '');
    
    // Verifica se il tab esiste nella mappa
    const tabConfig = window.TAB_MODULE_MAP[tabName];
    if (!tabConfig) {
        console.warn(`⚠️ [NAV UNIFIED] Tab non riconosciuto: ${tabName}`);
        return;
    }
    
    // Nascondi tutti i contenuti
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Rimuovi active da tutti i tab
    document.querySelectorAll('.tab-link').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Attiva il tab selezionato
    const targetContent = document.getElementById(`${tabName}-content`);
    const targetTab = document.querySelector(`[data-target="${tabName}-content"]`);
    
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Chiama onEnter del modulo
    if (tabConfig.onEnter) {
        setTimeout(() => {
            try {
                tabConfig.onEnter();
            } catch (error) {
                console.error(`❌ [NAV UNIFIED] Errore onEnter ${tabName}:`, error);
            }
        }, 50);
    }
    
    // Aggiorna Navigation se disponibile
    if (window.Navigation) {
        window.Navigation.currentTab = tabName;
    }
};

// Override di tutti i sistemi di navigazione esistenti
window.navigateTo = window.navigateToTab;

if (window.Navigation && window.Navigation.switchToTab) {
    const originalSwitchToTab = window.Navigation.switchToTab.bind(window.Navigation);
    
    window.Navigation.switchToTab = function(tabName) {
        console.log(`🔄 [NAV UNIFIED] Intercettato Navigation.switchToTab: ${tabName}`);
        window.navigateToTab(tabName);
    };
}

// Setup listener per click sui tab
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 [NAV UNIFIED] Setup listener navigazione...');
    
    // Rimuovi tutti i listener esistenti e aggiungi il nostro
    document.querySelectorAll('.tab-link').forEach(tab => {
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
        
        newTab.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const target = this.getAttribute('data-target');
            if (target) {
                const tabName = target.replace('-content', '');
                window.navigateToTab(tabName);
            }
        });
    });
    
    // Inizializza il tab attivo corrente
    const activeContent = document.querySelector('.tab-content.active');
    if (activeContent) {
        const activeTabName = activeContent.id.replace('-content', '');
        console.log(`📍 [NAV UNIFIED] Tab attivo iniziale: ${activeTabName}`);
        
        // Chiama onEnter per il tab iniziale dopo un breve delay
        setTimeout(() => {
            const tabConfig = window.TAB_MODULE_MAP[activeTabName];
            if (tabConfig && tabConfig.onEnter) {
                tabConfig.onEnter();
            }
        }, 500);
    }
});

// Funzione di test
window.testNavigationUnified = function() {
    console.log('\n🧪 === TEST NAVIGAZIONE UNIFICATA ===\n');
    
    console.log('📊 Moduli disponibili:');
    Object.entries(window.TAB_MODULE_MAP).forEach(([tab, config]) => {
        const moduleAvailable = config.isFunction 
            ? typeof window[config.module] === 'function'
            : !!window[config.module];
            
        console.log(`${tab}:`);
        console.log(`  - Modulo ${config.module}: ${moduleAvailable ? '✅' : '❌'}`);
        console.log(`  - OnEnter definito: ✅`);
    });
    
    console.log('\n📋 Tab DOM:');
    document.querySelectorAll('.tab-link').forEach(tab => {
        const target = tab.getAttribute('data-target');
        console.log(`- ${target}: ${tab.textContent.trim()}`);
    });
    
    console.log('\n💡 Test navigazione:');
    console.log('- window.navigateToTab("timeline") - Vai a Timeline');
    console.log('- window.navigateToTab("orders") - Vai a Ordini');
    console.log('- window.navigateToTab("ddtft") - Vai a DDT/FT');
    
    console.log('\n✅ Test completato\n');
};

// Test automatico veloce
window.testAllTabsUnified = async function() {
    console.log('\n🧪 === TEST VELOCE TUTTI I TAB ===\n');
    
    const tabs = ['timeline', 'orders', 'ddtft', 'clients', 'worksheet'];
    
    for (const tab of tabs) {
        console.log(`\n📋 Navigazione a ${tab}...`);
        window.navigateToTab(tab);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✅ Test completato - controlla che tutti i tab si siano caricati\n');
};

console.log('✅ [FIX NAV UNIFIED] Sistema navigazione unificato caricato!');
console.log('💡 Comandi disponibili:');
console.log('   window.testNavigationUnified() - Stato sistema');
console.log('   window.testAllTabsUnified() - Test tutti i tab');
console.log('   window.navigateToTab("nome-tab") - Naviga a tab specifico');