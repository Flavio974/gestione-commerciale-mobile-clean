/**
 * Comandi UI Module
 * Gestisce l'interfaccia utente del modulo Comandi
 */

const ComandiUI = {
  /**
   * Inizializza UI per desktop
   */
  init: function() {
    // Solo su desktop
    if (!window.DeviceDetector || !window.DeviceDetector.info.isDesktop) {
      return;
    }
    
    // Aggiungi tab alla navigazione
    this.addNavigationTab();
    
    // Aggiungi contenuto tab
    this.addTabContent();
  },
  
  /**
   * Aggiunge tab alla navigazione
   */
  addNavigationTab: function() {
    const nav = document.getElementById('main-navigation');
    if (!nav) return;
    
    // Verifica se già esiste
    if (document.getElementById('tab-comandi')) return;
    
    // Crea nuovo tab
    const tabDiv = document.createElement('div');
    tabDiv.id = 'tab-comandi';
    tabDiv.className = 'tab-link';
    tabDiv.setAttribute('data-target', 'comandi-content');
    tabDiv.innerHTML = '⚙️ Comandi';
    
    // Aggiungi dopo l'ultimo tab
    nav.appendChild(tabDiv);
    
    // Aggiungi event listener
    tabDiv.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.Navigation) {
        window.Navigation.switchToTab('comandi');
      }
    });
  },
  
  /**
   * Aggiunge contenuto del tab
   */
  addTabContent: function() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    // Verifica se già esiste
    if (document.getElementById('comandi-content')) return;
    
    // Crea contenitore del tab
    const contentDiv = document.createElement('div');
    contentDiv.id = 'comandi-content';
    contentDiv.className = 'tab-content';
    contentDiv.innerHTML = `
      <div class="loading-container">
        <p>Caricamento modulo comandi...</p>
      </div>
    `;
    
    // Aggiungi al main content
    mainContent.appendChild(contentDiv);
  }
};

// Auto-inizializzazione quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
  ComandiUI.init();
});

console.log('🎨 Comandi UI module loaded');