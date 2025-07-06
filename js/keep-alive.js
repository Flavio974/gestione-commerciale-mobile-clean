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

    try {
      const response = await fetch(`${this.REPLIT_URL}/claude-ai.php?keepalive=1`, {
        method: 'GET',
        mode: 'no-cors', // Evita problemi CORS per il ping
        signal: AbortSignal.timeout(5000) // Timeout 5 secondi
      });
      console.log('✅ Keep-alive ping inviato');
    } catch (error) {
      console.error('❌ Keep-alive error:', error);
      // Non bloccare l'app per errori keep-alive
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