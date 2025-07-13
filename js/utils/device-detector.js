/**
 * Device Detector
 * Rileva il tipo di dispositivo e adatta l'interfaccia
 */

const DeviceDetector = {
  /**
   * Informazioni sul dispositivo corrente
   */
  info: {
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    supportsVoice: false,
    supportsPWA: false
  },

  /**
   * Inizializza il rilevamento
   */
  init: function() {
    this.detectDevice();
    this.detectBrowser();
    this.detectFeatures();
    this.applyAdaptations();
    
    console.log('📱 Device info:', this.info);
  },

  /**
   * Rileva il tipo di dispositivo
   */
  detectDevice: function() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // iOS specifico
    this.info.isIOS = /iphone|ipad|ipod/.test(userAgent);
    this.info.isIPhone = /iphone/.test(userAgent);
    this.info.isIPad = /ipad/.test(userAgent);
    
    // Android
    this.info.isAndroid = /android/.test(userAgent);
    
    // Mobile (escludi iPad)
    this.info.isMobile = /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent) && !this.info.isIPad;
    
    // Tablet (include iPad)
    this.info.isTablet = /ipad|android(?!.*mobile)|tablet|kindle|silk/.test(userAgent);
    
    // Desktop (se non è mobile né tablet)
    this.info.isDesktop = !this.info.isMobile && !this.info.isTablet;
    
    // Touch screen
    this.info.hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  /**
   * Rileva il browser
   */
  detectBrowser: function() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    this.info.isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    this.info.isChrome = /chrome/.test(userAgent);
    this.info.isFirefox = /firefox/.test(userAgent);
  },

  /**
   * Rileva le funzionalità supportate
   */
  detectFeatures: function() {
    // Web Speech API
    this.info.supportsVoice = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    
    // PWA Support
    this.info.supportsPWA = 'serviceWorker' in navigator && 'PushManager' in window;
    
    // HTTPS
    this.info.isHTTPS = location.protocol === 'https:';
    
    // Orientamento schermo
    this.info.supportsOrientation = 'orientation' in window;
  },

  /**
   * Applica adattamenti UI basati sul dispositivo
   */
  applyAdaptations: function() {
    const body = document.body;
    
    // Aggiungi classi CSS per styling responsivo
    if (this.info.isMobile) body.classList.add('mobile-device');
    if (this.info.isTablet) body.classList.add('tablet-device');
    if (this.info.isDesktop) body.classList.add('desktop-device');
    if (this.info.isIOS) body.classList.add('ios-device');
    if (this.info.isAndroid) body.classList.add('android-device');
    if (this.info.hasTouch) body.classList.add('touch-device');
    
    // Adatta viewport per mobile
    if (this.info.isMobile && !document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover';
      document.head.appendChild(viewport);
    }
    
    // Previeni zoom su iOS per input
    if (this.info.isIOS) {
      const iosInputStyle = document.createElement('style');
      iosInputStyle.textContent = `
        input, select, textarea {
          font-size: 16px !important;
        }
      `;
      document.head.appendChild(iosInputStyle);
    }
  },

  /**
   * Configurazione ottimale per voice manager
   */
  getVoiceConfig: function() {
    // Tutti i dispositivi funzionano come desktop (modalità continua)
    return {
      continuous: true,
      wakeWordEnabled: true,
      listenTimeout: 10000,
      mode: 'continuous'
    };
  },

  /**
   * Verifica se è necessario HTTPS per le funzionalità
   */
  requiresHTTPS: function() {
    return (this.info.isMobile || this.info.isTablet) && !this.info.isHTTPS;
  },

  /**
   * Mostra avvisi per limitazioni del dispositivo
   */
  showCompatibilityWarnings: function() {
    const warnings = [];
    
    if (!this.info.supportsVoice) {
      warnings.push('Il riconoscimento vocale non è supportato su questo browser.');
    }
    
    if (this.requiresHTTPS()) {
      warnings.push('Per usare il microfono su mobile è necessario HTTPS.');
    }
    
    if (this.info.isIOS && !this.info.isHTTPS) {
      warnings.push('Safari richiede HTTPS per il riconoscimento vocale.');
    }
    
    return warnings;
  }
};

// Export globale
window.DeviceDetector = DeviceDetector;

// Auto-inizializzazione
document.addEventListener('DOMContentLoaded', () => {
  DeviceDetector.init();
});

console.log('📱 Device Detector caricato');