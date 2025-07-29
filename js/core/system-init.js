// 🚀 SYSTEM INITIALIZATION
console.log('🚀 System Init - Inizializzazione applicazione...');

class SystemInit {
    static async start() {
        console.log('📱 App caricata - demo tab lasciato al comportamento naturale');
        
        try {
            // 1. Initialize core systems
            await this.initCoreSystems();
            
            // 2. Load critical modules
            await this.loadCriticalModules();
            
            // 3. Initialize UI systems
            await this.initUISystems();
            
            // 4. Start background services
            await this.startBackgroundServices();
            
            // 5. Initialize content when tabs are shown
            this.initContentHandlers();
            
            console.log('✅ Sistema inizializzato con successo');
            
        } catch (error) {
            console.error('❌ Errore inizializzazione sistema:', error);
        }
    }
    
    static async initCoreSystems() {
        console.log('⚡ Inizializzazione sistemi core...');
        
        // Stats refresh
        if (window.refreshStats) {
            window.refreshStats();
        }
        
        // Module loader is already initialized
        console.log('✅ Sistemi core pronti');
    }
    
    static async loadCriticalModules() {
        console.log('⚡ Caricamento moduli critici...');
        
        const criticalModules = [
            'js/timeline/timeline-config.js',
            'js/timeline/timeline-core.js',
            'js/clienti-core.js',
            'js/worksheet-core.js'
        ];
        
        for (const module of criticalModules) {
            await window.ModuleLoader.loadScript(module);
        }
        
        console.log('✅ Moduli critici caricati');
    }
    
    static async initUISystems() {
        console.log('✅ UI base pronta - inizializzazione app...');
        
        const uiModules = [
            'js/comandi-core.js',
            'js/comandi-ui.js'
        ];
        
        for (const module of uiModules) {
            await window.ModuleLoader.loadScript(module);
        }
        
        console.log('✅ Bootstrap completo - UI pronta!');
    }
    
    static async startBackgroundServices() {
        console.log('🔄 Avvio caricamento background...');
        
        // Load remaining modules in background
        setTimeout(async () => {
            const backgroundModules = [
                'js/clienti-form.js',
                'js/timeline/timeline-utils.js',
                'js/voice/voice-assistant.js',
                'js/worksheet-data.js',
                'js/ddtft-core.js',
                'js/clienti-table.js',
                'js/smart-assistant/smart-assistant-bundle.js',
                'js/timeline/timeline-rendering.js',
                'js/ordini.js',
                'js/worksheet-ui.js',
                'js/ddtft-view.js',
                'js/clienti-utils.js',
                'js/modules/smart-assistant-supabase.js',
                'js/timeline/timeline-events.js',
                'js/prodotti.js',
                'js/modules/ordini-parser.js',
                'js/modules/ordini-export-core.js',
                'js/timeline/timeline-controls.js',
                'js/percorsi.js',
                'js/keep-alive.js',
                'js/worksheet-itinerary.js',
                'js/ddtft-filters.js',
                'js/ddtft-utils.js',
                'js/worksheet-dragdrop.js',
                'js/modules/ddtft-import-export.js',
                'js/modules/ddtft-export-advanced.js'
            ];
            
            for (const module of backgroundModules) {
                await window.ModuleLoader.loadScript(module);
            }
            
            console.log('🎉 Caricamento background completato!');
            
            // Start robust connection after background load
            this.startRobustConnection();
            
        }, 100);
    }
    
    static startRobustConnection() {
        setTimeout(() => {
            console.log('🔌 Avvio sistema connessione robusta...');
            
            if (window.robustConnectionManager) {
                window.robustConnectionManager.start().then((connected) => {
                    if (connected) {
                        console.log('🔌 ✅ Sistema connessione robusta attivo');
                    } else {
                        console.log('🔌 ⚠️ Sistema connessione robusta: connessione parziale');
                    }
                });
            }
        }, 3000);
    }
    
    static initContentHandlers() {
        console.log('🚨 INIZIALIZZAZIONE CONTENUTI TAB...');
        
        // Timeline
        console.log('⏰ Inizializzazione Timeline...');
        
        // Clienti
        console.log('👥 Inizializzazione Clienti...');
        
        // Worksheet
        console.log('📊 Inizializzazione Worksheet...');
        if (window.WorksheetCore) {
            window.WorksheetCore.init();
            console.log('📊 Worksheet inizializzato');
        }
        
        // Comandi
        console.log('⚙️ Inizializzazione ComandiModule...');
        if (window.ComandiModuleClean) {
            window.comandiModule = new window.ComandiModuleClean();
            window.comandiModule.init();
            console.log('✅ CONTENUTI INIZIALIZZATI');
        }
    }
}

// Export globally
window.SystemInit = SystemInit;