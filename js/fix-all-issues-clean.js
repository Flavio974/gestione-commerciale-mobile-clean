// Fix completo e pulito per tutti i problemi post-refactoring
console.log('🔧 FIX COMPLETO PROBLEMI - Avvio...');

(async function() {
    // Attende che tutti i componenti siano pronti
    async function waitForComponents(timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (window.supabase && 
                window.SupabaseAIIntegration && 
                window.smartAssistantSecureStorage) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return false;
    }

    // FIX 1: Pulisce vocabulary_user corrotto
    function fixVocabularyStorage() {
        const stored = localStorage.getItem('vocabulary_user');
        if (stored) {
            try {
                JSON.parse(stored);
            } catch {
                console.log('🗑️ Pulizia vocabulary_user corrotto');
                localStorage.removeItem('vocabulary_user');
            }
        }
    }

    // FIX 2: Aggiunge getClientsCount a SupabaseAI esistente
    async function fixGetClientsCount() {
        if (!window.supabaseAI) {
            console.log('⚠️ SupabaseAI non trovato, attendo...');
            
            // Attende che sia disponibile
            const ready = await waitForComponents();
            if (!ready) {
                console.error('❌ Timeout attesa componenti');
                return;
            }
        }

        // Se ancora non c'è supabaseAI, lo crea
        if (!window.supabaseAI && window.SupabaseAIIntegration) {
            window.supabaseAI = new window.SupabaseAIIntegration();
            console.log('✅ SupabaseAI creato');
        }

        // Aggiunge il metodo se manca
        if (window.supabaseAI && !window.supabaseAI.getClientsCount) {
            window.supabaseAI.getClientsCount = async function() {
                try {
                    if (window.supabase) {
                        const { count, error } = await window.supabase
                            .from('clienti')
                            .select('*', { count: 'exact', head: true });
                        
                        if (error) throw error;
                        return count || 0;
                    }
                    
                    // Fallback su localStorage
                    const clientiData = localStorage.getItem('clienti_data');
                    if (clientiData) {
                        const clienti = JSON.parse(clientiData);
                        return Array.isArray(clienti) ? clienti.length : 0;
                    }
                    
                    return 0;
                } catch (error) {
                    console.error('❌ Errore conteggio clienti:', error);
                    return 0;
                }
            };
            console.log('✅ Metodo getClientsCount aggiunto');
        }
    }

    // FIX 3: Corregge SmartAssistantSecureStorage
    function fixSecureStorageCategories() {
        if (window.smartAssistantSecureStorage?.foldersIndex) {
            const originalSaveToSecureFolder = window.smartAssistantSecureStorage.saveToSecureFolder;
            
            window.smartAssistantSecureStorage.saveToSecureFolder = function(secureNote) {
                // Crea categoria dinamica se necessario
                if (secureNote.category && secureNote.category.startsWith('CLIENTE_')) {
                    const clientName = secureNote.category.replace('CLIENTE_', '').replace(/_/g, ' ');
                    const categoryKey = secureNote.category;
                    
                    if (!this.foldersIndex[categoryKey]) {
                        this.foldersIndex[categoryKey] = {
                            id: categoryKey.toLowerCase(),
                            name: `Cliente: ${clientName}`,
                            icon: '👤',
                            noteCount: 0,
                            notes: [],
                            lastUpdated: new Date().toISOString(),
                            isClientFolder: true
                        };
                        console.log(`📁 Categoria cliente creata: ${categoryKey}`);
                    }
                }
                
                return originalSaveToSecureFolder.call(this, secureNote);
            };
            console.log('✅ Fix categorie dinamiche installato');
        }
    }

    // FIX 4: Previene inizializzazioni multiple
    function preventMultipleInits() {
        // Marca moduli già inizializzati
        if (!window._modulesInitialized) {
            window._modulesInitialized = new Set();
        }

        // Helper per prevenire init multiple
        window.preventDuplicateInit = function(moduleName, initFunction) {
            if (window._modulesInitialized.has(moduleName)) {
                console.log(`⚠️ ${moduleName} già inizializzato, skip`);
                return false;
            }
            window._modulesInitialized.add(moduleName);
            return true;
        };
    }

    // Esegue tutti i fix
    console.log('🚀 APPLICAZIONE FIX...\n');
    
    // Fix immediati
    fixVocabularyStorage();
    preventMultipleInits();
    
    // Fix che richiedono componenti pronti
    await fixGetClientsCount();
    fixSecureStorageCategories();
    
    // Test finale
    if (window.supabaseAI?.getClientsCount) {
        try {
            const count = await window.supabaseAI.getClientsCount();
            console.log(`✅ TEST CONTEGGIO: ${count} clienti nel database`);
        } catch (error) {
            console.error('❌ Test conteggio fallito:', error);
        }
    }
    
    console.log('\n✅ TUTTI I FIX APPLICATI!');
    
    // Funzione di test globale
    window.testAllFixes = async function() {
        console.log('🧪 TEST COMPLETO SISTEMA...');
        
        const tests = {
            vocabulary: localStorage.getItem('vocabulary_user') === null || 
                       (() => { try { JSON.parse(localStorage.getItem('vocabulary_user')); return true; } catch { return false; } })(),
            getClientsCount: typeof window.supabaseAI?.getClientsCount === 'function',
            secureStorage: typeof window.smartAssistantSecureStorage?.saveToSecureFolder === 'function'
        };
        
        console.log('📊 Risultati test:', tests);
        
        if (tests.getClientsCount) {
            const count = await window.supabaseAI.getClientsCount();
            console.log(`📊 Clienti nel database: ${count}`);
        }
        
        return tests;
    };
    
    console.log('💡 Usa window.testAllFixes() per verificare il sistema');
})();