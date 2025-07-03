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
    try {
      const response = await fetch(`${this.REPLIT_URL}/claude-ai.php?keepalive=1`, {
        method: 'GET',
        mode: 'no-cors' // Evita problemi CORS per il ping
      });
      console.log('✅ Keep-alive ping inviato');
    } catch (error) {
      console.error('❌ Keep-alive error:', error);
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