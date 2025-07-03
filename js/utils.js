/**
 * Utility Functions
 * Funzioni di utilità riutilizzabili in tutta l'applicazione
 */

const Utils = {
  /**
   * Formattazione Date
   */
  formatDate: function(date, format = 'DD/MM/YYYY') {
    if (!date) return '';
    
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return format
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', year)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },
  
  /**
   * Parse Date da stringa italiana
   */
  parseItalianDate: function(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return new Date(parts[2], parts[1] - 1, parts[0]);
  },
  
  /**
   * Calcola differenza in giorni tra due date
   */
  daysDifference: function(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },
  
  /**
   * Formattazione Valuta
   */
  formatCurrency: function(amount) {
    if (amount === null || amount === undefined) return '€ 0,00';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  },
  
  /**
   * Parse numero da stringa italiana
   */
  parseItalianNumber: function(str) {
    if (!str) return 0;
    return parseFloat(str.toString().replace(',', '.').replace(/[^\d.-]/g, ''));
  },
  
  /**
   * Debounce function
   */
  debounce: function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  /**
   * Throttle function
   */
  throttle: function(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  /**
   * Deep clone object
   */
  deepClone: function(obj) {
    return JSON.parse(JSON.stringify(obj));
  },
  
  /**
   * Check if mobile device
   */
  isMobile: function() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  /**
   * Check if touch device
   */
  isTouchDevice: function() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },
  
  /**
   * Get viewport dimensions
   */
  getViewport: function() {
    return {
      width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
      height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    };
  },
  
  /**
   * Local Storage con fallback
   */
  storage: {
    get: function(key) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        console.error('Errore lettura storage:', e);
        return null;
      }
    },
    
    set: function(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error('Errore scrittura storage:', e);
        return false;
      }
    },
    
    remove: function(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        console.error('Errore rimozione storage:', e);
        return false;
      }
    },
    
    clear: function() {
      try {
        localStorage.clear();
        return true;
      } catch (e) {
        console.error('Errore pulizia storage:', e);
        return false;
      }
    }
  },
  
  /**
   * Genera ID univoco con prefisso opzionale
   */
  generateId: function(prefix = '') {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    return prefix ? `${prefix}_${id}` : id;
  },
  
  /**
   * Chiude modal per ID
   */
  closeModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  },
  
  /**
   * Valida email
   */
  isValidEmail: function(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  /**
   * Valida numero di telefono italiano
   */
  isValidPhone: function(phone) {
    const cleaned = phone.replace(/\s+/g, '');
    const re = /^(\+39)?3\d{8,9}$/;
    return re.test(cleaned);
  },
  
  /**
   * Capitalizza prima lettera
   */
  capitalize: function(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  
  /**
   * Truncate text
   */
  truncate: function(str, length = 50, ending = '...') {
    if (!str || str.length <= length) return str;
    return str.substring(0, length - ending.length) + ending;
  },
  
  /**
   * Sort array di oggetti
   */
  sortBy: function(array, key, order = 'asc') {
    return array.sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal === bVal) return 0;
      
      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  },
  
  /**
   * Filtra array di oggetti
   */
  filterBy: function(array, filters) {
    return array.filter(item => {
      return Object.keys(filters).every(key => {
        if (filters[key] === '' || filters[key] === 'all') return true;
        return item[key] && item[key].toString().toLowerCase().includes(filters[key].toLowerCase());
      });
    });
  },
  
  /**
   * Raggruppa array per chiave
   */
  groupBy: function(array, key) {
    return array.reduce((result, item) => {
      const group = item[key];
      if (!result[group]) result[group] = [];
      result[group].push(item);
      return result;
    }, {});
  },
  
  /**
   * Download file
   */
  downloadFile: function(content, filename, contentType = 'text/plain') {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
  
  /**
   * Show notification (placeholder per futura implementazione)
   */
  notify: function(message, type = 'info', duration = 3000) {
    // TODO: Implementare sistema di notifiche
  },
  
  /**
   * Gestione errori centralizzata
   */
  handleError: function(error, context = '') {
    console.error(`Errore${context ? ' in ' + context : ''}:`, error);
    
    if (error.response) {
      // Errore dalla risposta del server
      this.notify(error.response.data?.message || 'Errore del server', 'error');
    } else if (error.request) {
      // Errore di rete
      this.notify('Errore di connessione. Verifica la rete.', 'error');
    } else {
      // Altri errori
      this.notify(error.message || 'Si è verificato un errore', 'error');
    }
  },
  
  /**
   * Calcola coordinate per zoom sulla timeline
   */
  calculateTimelineZoom: function(currentZoom, zoomIn = true, centerHour = 12) {
    const zoomStep = 0.2;
    const minZoom = 0.5;
    const maxZoom = 6;
    
    let newZoom = zoomIn ? 
      Math.min(currentZoom + zoomStep, maxZoom) : 
      Math.max(currentZoom - zoomStep, minZoom);
    
    return {
      zoom: newZoom,
      centerHour: centerHour
    };
  },
  
  /**
   * Sanitizza input HTML
   */
  sanitizeHtml: function(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }
};

// Rendi disponibile globalmente
window.Utils = Utils;