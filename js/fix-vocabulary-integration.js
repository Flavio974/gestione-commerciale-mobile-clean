// Fix integrazione vocabulary-manager in comandi-core
console.log('🔧 FIX INTEGRAZIONE VOCABOLARIO - Avvio...');

(async function() {
    // Attende che vocabulary-manager sia pronto
    async function waitForVocabularyManager(timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (window.vocabularyManager?.isInitialized) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return false;
    }

    // Patch comandi-core per usare vocabulary-manager
    function patchComandiCore() {
        if (!window.ComandiModuleClean) {
            console.log('⚠️ ComandiModule non ancora caricato');
            return false;
        }

        const originalLoad = window.ComandiModuleClean.prototype.loadVocabolario;
        
        window.ComandiModuleClean.prototype.loadVocabolario = async function() {
            console.log('🔄 Caricamento vocabolario tramite VocabularyManager...');
            
            try {
                // Attende vocabulary-manager
                const ready = await waitForVocabularyManager();
                if (!ready) {
                    console.error('❌ VocabularyManager non disponibile');
                    return originalLoad.call(this);
                }

                // Carica vocabulary.json tramite fetch diretto
                const response = await fetch('js/middleware/vocabulary.json');
                const data = await response.json();
                
                // Converte formato JSON in formato compatibile con comandi-core
                const convertedVocabulary = {};
                
                if (data.categories) {
                    Object.entries(data.categories).forEach(([key, category]) => {
                        convertedVocabulary[category.name] = [];
                        
                        if (category.commands) {
                            category.commands.forEach(cmd => {
                                convertedVocabulary[category.name].push({
                                    pattern: cmd.pattern,
                                    regex: new RegExp(cmd.pattern.replace(/\[([^\]]+)\]/g, '(.+)'), 'i'),
                                    action: cmd.action,
                                    params: cmd.params
                                });
                            });
                        }
                    });
                }
                
                // Imposta il vocabolario
                this.vocabolario = convertedVocabulary;
                
                // Crea testo formattato per l'editor
                let text = '';
                Object.entries(convertedVocabulary).forEach(([categoryName, commands]) => {
                    text += `# ${categoryName}\n`;
                    commands.forEach(cmd => {
                        text += `${cmd.pattern}\n`;
                    });
                    text += '\n';
                });
                
                // Aggiorna interfaccia
                this.updateInterface(text);
                
                console.log('✅ Vocabolario caricato:', Object.keys(convertedVocabulary).length, 'categorie');
                
                return { text, source: 'vocabulary.json' };
                
            } catch (error) {
                console.error('❌ Errore caricamento vocabulary.json:', error);
                return originalLoad.call(this);
            }
        };
        
        console.log('✅ ComandiModule patchato per usare vocabulary.json');
        return true;
    }

    // Hook per quando la tab comandi viene aperta
    function setupTabHook() {
        const originalShowTab = window.showTab;
        
        window.showTab = function(tabName) {
            if (tabName === 'comandi') {
                console.log('📋 Tab comandi aperta, ricarico vocabolario...');
                
                setTimeout(async () => {
                    if (window.comandiModule) {
                        await window.comandiModule.loadVocabolario();
                    }
                }, 100);
            }
            
            return originalShowTab.apply(this, arguments);
        };
    }

    // Esegue fix
    console.log('🚀 APPLICAZIONE FIX VOCABOLARIO...\n');
    
    // Applica patch
    const patched = patchComandiCore();
    if (patched) {
        setupTabHook();
        
        // Se comandi-core già inizializzato, ricarica
        if (window.comandiModule) {
            await window.comandiModule.loadVocabolario();
        }
    } else {
        // Ritenta dopo che il modulo è caricato
        const checkInterval = setInterval(() => {
            if (window.ComandiModuleClean) {
                clearInterval(checkInterval);
                patchComandiCore();
                setupTabHook();
                
                if (window.comandiModule) {
                    window.comandiModule.loadVocabolario();
                }
            }
        }, 500);
        
        // Timeout dopo 10 secondi
        setTimeout(() => clearInterval(checkInterval), 10000);
    }
    
    console.log('✅ FIX VOCABOLARIO INSTALLATO');
    
    // Funzione test
    window.testVocabularyIntegration = async function() {
        console.log('🧪 TEST INTEGRAZIONE VOCABOLARIO...');
        
        const tests = {
            vocabularyManager: !!window.vocabularyManager,
            comandiModule: !!window.comandiModule,
            vocabularyLoaded: window.comandiModule ? Object.keys(window.comandiModule.vocabolario || {}).length > 0 : false
        };
        
        console.log('📊 Risultati:', tests);
        
        if (tests.vocabularyLoaded) {
            console.log('📚 Categorie caricate:', Object.keys(window.comandiModule.vocabolario));
        }
        
        return tests;
    };
    
    console.log('💡 Usa window.testVocabularyIntegration() per verificare');
})();