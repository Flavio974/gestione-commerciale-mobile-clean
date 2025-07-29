// 🎯 NAVIGATION MANAGER
console.log('🎯 Inizializzazione Navigation Manager...');

class NavigationManager {
    constructor() {
        this.currentTab = null;
        this.tabHandlers = new Map();
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) return;
        
        console.log('🚨 RIPRISTINO NAVIGAZIONE...');
        
        // Setup tab navigation
        this.setupTabNavigation();
        
        // Register tab handlers
        this.registerTabHandlers();
        
        this.initialized = true;
        console.log('✅ NAVIGAZIONE RIPRISTINATA - Tutte le tab dovrebbero funzionare');
    }
    
    setupTabNavigation() {
        // Rimuovi il forcing dal demo tab e ripristina click normale per tutti
        document.querySelectorAll('.tab-link').forEach(tab => {
            // Rimuovi eventuali event listener che bloccano
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            // Aggiungi click handler normale
            newTab.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToTab(newTab.getAttribute('data-target'));
            });
        });
    }
    
    navigateToTab(targetId) {
        if (!targetId) return;
        
        // Update UI
        document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Find and activate tab
        const tabLink = document.querySelector(`[data-target="${targetId}"]`);
        const targetContent = document.getElementById(targetId);
        
        if (tabLink && targetContent) {
            tabLink.classList.add('active');
            targetContent.classList.add('active');
            console.log('🎯 Navigazione a:', targetId);
            
            this.currentTab = targetId;
            
            // Execute tab handler if exists
            const handler = this.tabHandlers.get(targetId);
            if (handler) {
                handler();
            }
        }
    }
    
    registerTabHandlers() {
        // Comandi tab
        this.tabHandlers.set('comandi-content', () => {
            if (window.ComandiModule && typeof window.ComandiModule.onEnter === 'function') {
                console.log('⚙️ Inizializzazione tab Comandi...');
                window.ComandiModule.onEnter();
            }
        });
        
        // AI Assistant tab
        this.tabHandlers.set('ai-content', () => {
            if (window.FlavioAIAssistant) {
                console.log('🤖 Inizializzazione tab AI Assistant...');
                window.FlavioAIAssistant.renderInterface();
            }
        });
        
        // Smart Assistant tab
        this.tabHandlers.set('smart-content', () => {
            if (window.SmartAssistant) {
                console.log('🎤 Inizializzazione tab Smart Assistant...');
                if (window.SmartAssistant.isInitialized) {
                    window.SmartAssistant.refreshInterface();
                } else {
                    window.SmartAssistant.init();
                }
            }
        });
    }
    
    // Public API
    addTabHandler(tabId, handler) {
        this.tabHandlers.set(tabId, handler);
    }
    
    getCurrentTab() {
        return this.currentTab;
    }
    
    goToTab(tabId) {
        this.navigateToTab(tabId);
    }
}

// Create global instance
window.navigationManager = new NavigationManager();

// Auto-init after DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.navigationManager.init(), 100);
    });
} else {
    setTimeout(() => window.navigationManager.init(), 100);
}

// Export global function for backward compatibility
window.showTab = function(tabName) {
    const tabId = tabName + '-content';
    window.navigationManager.goToTab(tabId);
};