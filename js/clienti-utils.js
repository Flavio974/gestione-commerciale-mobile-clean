/**
 * Clienti Module - Utilities
 * Utility functions and helpers
 */

// Estendi l'oggetto Clienti esistente
Object.assign(window.Clienti, {
  /**
   * Formatta nome giorno per export
   */
  formatDayName: function(day) {
    if (!day) return '';
    
    const dayMap = {
      'lunedi': 'Lunedì',
      'martedi': 'Martedì',
      'mercoledi': 'Mercoledì',
      'giovedi': 'Giovedì',
      'venerdi': 'Venerdì',
      'sabato': 'Sabato',
      'domenica': 'Domenica'
    };
    
    return dayMap[day] || '';
  },
  
  /**
   * Formatta momento preferito per export
   */
  formatPreferredTime: function(time) {
    if (!time) return '';
    
    const timeMap = {
      'mattina': 'Mattina',
      'pomeriggio': 'Pomeriggio',
      'sera': 'Sera'
    };
    
    return timeMap[time] || '';
  }
});