/**
 * Keep Alive per Replit
 * Mantiene il server attivo pingandolo ogni 4 minuti
 */

const KeepAlive = {
  REPLIT_URL: 'https://395d12df-1597-448e-8190-4c79e73a20ec-00-29g0ynu2kldi8.janeway.replit.dev',
  interval: null,
  
  start() {
    // Ping immediato
    this.ping();
    
    // Ping ogni 4 minuti
    this.interval = setInterval(() => {
      this.ping();
    }, 4 * 60 * 1000); // 4 minuti
    
    console.log('🔄 Keep-alive avviato');
  },
  
  async ping() {
    // Rileva iPad e disabilita ping se necessario
    const isIPad = /iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
    if (isIPad) {
      console.log('📱 iPad: Keep-alive disabilitato per evitare errori 502');
      return;
    }

    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${this.REPLIT_URL}/claude-ai.php?keepalive=1`, {
          method: 'GET',
          mode: 'no-cors',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('✅ Keep-alive ping inviato');
        return; // Successo, esci dal loop
        
      } catch (error) {
        retries++;
        console.warn(`⚠️ Keep-alive tentativo ${retries}/${maxRetries} fallito:`, error.message);
        
        if (retries < maxRetries) {
          // Attesa esponenziale: 1s, 2s, 4s
          const delay = Math.pow(2, retries - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('❌ Keep-alive fallito dopo', maxRetries, 'tentativi. Server probabilmente offline.');
          
          // ✅ GRACEFUL DEGRADATION: Notifica utente e fallback
          if (window.flavioAI) {
            window.flavioAI.serverStatus = 'offline';
            console.warn('⚠️ Modalità offline attivata - funzionalità AI limitate');
            
            // Mostra toast discreto (se il sistema toast esiste)
            if (window.showToast) {
              window.showToast('⚠️ Connessione AI momentaneamente limitata', 'warning', 3000);
            }
          }
          
          // ✅ RETRY PIÙ AGGRESSIVO: Aumenta intervallo a 10 minuti quando offline
          if (this.interval) {
            clearInterval(this.interval);
            this.interval = setInterval(() => this.ping(), 10 * 60 * 1000);
            console.log('🔄 Retry ogni 10 minuti durante offline');
          }
        }
      }
    }
  },
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('🛑 Keep-alive fermato');
    }
  }
};

// Avvia automaticamente quando la pagina si carica
document.addEventListener('DOMContentLoaded', () => {
  KeepAlive.start();
});

// Ferma quando la pagina si chiude
window.addEventListener('beforeunload', () => {
  KeepAlive.stop();
});