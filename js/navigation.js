/**
 * Navigation Module
 * Gestisce la navigazione tra i tab e le pagine
 */

const Navigation = {
  currentTab: null,
  tabHistory: [],
  
  /**
   * Inizializzazione
   */
  init: function() {
    
    // Setup event listeners per i tab
    this.setupTabListeners();
    
    // Gestione back button del browser
    this.setupHistoryManagement();
    
    // Mostra tab iniziale
    const initialTab = this.getInitialTab();
    this.switchToTab(initialTab);
  },
  
  /**
   * Setup listeners per i tab
   */
  setupTabListeners: function() {
    const tabLinks = document.querySelectorAll('.tab-link');
    
    tabLinks.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = tab.getAttribute('data-target');
        if (targetId) {
          this.switchToTab(targetId.replace('-content', ''));
        }
      });
    });
    
    // Gestione swipe per mobile
    if (Utils.isTouchDevice()) {
      this.setupSwipeNavigation();
    }
  },
  
  /**
   * Setup navigazione con swipe
   */
  setupSwipeNavigation: function() {
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 100;
    
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      this.handleSwipeGesture(touchStartX, touchEndX, minSwipeDistance);
    });
  },
  
  /**
   * Gestisce gesture di swipe
   */
  handleSwipeGesture: function(startX, endX, minDistance) {
    const distance = startX - endX;
    
    if (Math.abs(distance) < minDistance) return;
    
    const tabs = this.getTabOrder();
    const currentIndex = tabs.indexOf(this.currentTab);
    
    if (distance > 0 && currentIndex < tabs.length - 1) {
      // Swipe left - next tab
      this.switchToTab(tabs[currentIndex + 1]);
    } else if (distance < 0 && currentIndex > 0) {
      // Swipe right - previous tab
      this.switchToTab(tabs[currentIndex - 1]);
    }
  },
  
  /**
   * Ottiene ordine dei tab
   */
  getTabOrder: function() {
    return ['timeline', 'data', 'planner', 'clients', 'travels', 'worksheet', 'orders', 'ddtft', 'smart', 'ai'];
  },
  
  /**
   * Setup gestione history del browser
   */
  setupHistoryManagement: function() {
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.tab) {
        this.switchToTab(e.state.tab, false);
      }
    });
  },
  
  /**
   * Ottiene tab iniziale
   */
  getInitialTab: function() {
    // Controlla URL hash
    const hash = window.location.hash.replace('#', '');
    if (hash && this.isValidTab(hash)) {
      return hash;
    }
    
    // Altrimenti usa default
    return 'timeline';
  },
  
  /**
   * Verifica se tab è valido
   */
  isValidTab: function(tabName) {
    return this.getTabOrder().includes(tabName);
  },
  
  /**
   * Switch to tab
   */
  switchToTab: function(tabName, updateHistory = true) {
    if (!this.isValidTab(tabName)) {
      console.error('Tab non valido:', tabName);
      return;
    }
    
    if (tabName === this.currentTab) return;
    
    
    // Before leave hook
    if (this.currentTab) {
      this.beforeLeaveTab(this.currentTab);
    }
    
    // Nasconde tutti i tab content
    const allContents = document.querySelectorAll('.tab-content');
    allContents.forEach(content => {
      content.classList.remove('active');
    });
    
    // Rimuove active da tutti i tab links
    const allTabs = document.querySelectorAll('.tab-link');
    allTabs.forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Mostra tab selezionato
    const targetContent = document.getElementById(`${tabName}-content`);
    const targetTab = document.querySelector(`[data-target="${tabName}-content"]`);
    
    if (targetContent && targetTab) {
      targetContent.classList.add('active');
      targetTab.classList.add('active');
      
      // Scroll tab into view se necessario (mobile)
      if (Utils.isMobile()) {
        targetTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
      
      // Aggiorna stato
      this.currentTab = tabName;
      this.tabHistory.push(tabName);
      
      // Aggiorna App state
      if (window.App) {
        App.state.currentTab = tabName;
      }
      
      // Aggiorna URL
      if (updateHistory) {
        window.history.pushState({ tab: tabName }, '', `#${tabName}`);
      }
      
      // After enter hook
      this.afterEnterTab(tabName);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('navigation:tabchange', {
        detail: { tab: tabName }
      }));
    }
  },
  
  /**
   * Hook prima di lasciare un tab
   */
  beforeLeaveTab: function(tabName) {
    
    // Chiama metodo specifico del modulo se esiste
    const moduleMap = {
      'timeline': 'Timeline',
      'clients': 'Clienti',
      'orders': 'Ordini',
      'travels': 'Percorsi',
      'worksheet': 'Worksheet',
      'ddtft': 'DDTFTModule',
      'smart': 'SmartAssistant',
      'ai': 'FlavioAIAssistant'
    };
    
    const moduleName = moduleMap[tabName];
    if (moduleName && window[moduleName] && typeof window[moduleName].onLeave === 'function') {
      window[moduleName].onLeave();
    }
  },
  
  /**
   * Hook dopo essere entrati in un tab
   */
  afterEnterTab: function(tabName) {
    
    // Chiama metodo specifico del modulo se esiste
    const moduleMap = {
      'timeline': 'Timeline',
      'clients': 'Clienti',
      'orders': 'Ordini',
      'travels': 'Percorsi',
      'worksheet': 'Worksheet',
      'ddtft': 'DDTFTModule',
      'smart': 'SmartAssistant',
      'ai': 'FlavioAIAssistant'
    };
    
    const moduleName = moduleMap[tabName];
    if (moduleName && window[moduleName] && typeof window[moduleName].onEnter === 'function') {
      window[moduleName].onEnter();
    }
    
    // Focus primo elemento input se presente
    setTimeout(() => {
      const firstInput = document.querySelector(`#${tabName}-content input:not([type="hidden"]), #${tabName}-content select`);
      if (firstInput && !Utils.isMobile()) {
        firstInput.focus();
      }
    }, 100);
  },
  
  /**
   * Naviga al tab precedente
   */
  goBack: function() {
    if (this.tabHistory.length > 1) {
      this.tabHistory.pop(); // Rimuove current
      const previousTab = this.tabHistory[this.tabHistory.length - 1];
      this.switchToTab(previousTab);
    }
  },
  
  /**
   * Naviga a tab specifico con parametri
   */
  navigateTo: function(tabName, params = {}) {
    this.switchToTab(tabName);
    
    // Passa parametri al modulo
    window.dispatchEvent(new CustomEvent('navigation:params', {
      detail: { tab: tabName, params: params }
    }));
  },
  
  /**
   * Mostra/nasconde loading su tab corrente
   */
  showTabLoading: function(show = true) {
    const currentContent = document.getElementById(`${this.currentTab}-content`);
    if (currentContent) {
      currentContent.classList.toggle('loading', show);
    }
  },
  
  /**
   * Aggiunge breadcrumb (per navigazione complessa)
   */
  updateBreadcrumb: function(items) {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;
    
    breadcrumb.innerHTML = items.map((item, index) => {
      if (index === items.length - 1) {
        return `<span class="breadcrumb-item active">${item.label}</span>`;
      }
      return `<a href="#" class="breadcrumb-item" data-navigate="${item.tab}">${item.label}</a>`;
    }).join(' <span class="breadcrumb-separator">›</span> ');
    
    // Setup click handlers
    breadcrumb.querySelectorAll('[data-navigate]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.getAttribute('data-navigate');
        this.navigateTo(tab);
      });
    });
  }
};

// Rendi disponibile globalmente
window.Navigation = Navigation;