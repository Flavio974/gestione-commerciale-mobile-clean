/**
 * Timeline Configuration
 * Configurazione centralizzata per il modulo Timeline
 */

const TimelineConfig = {
  // Dimensioni e margini
  MARGIN: 50,
  LANE_H: 50,
  LANE_GAP: 25,  // Aumentato per evitare sovrapposizioni
  RECALC_LANE_H: 35,
  RECALC_LANE_GAP: 8,
  
  // DIMENSIONE STANDARD TIMELINE - NON MODIFICARE
  TIMELINE_HEIGHT: 1060,  // Altezza standard definitiva
  TIMELINE_Y: 350,       // Posizione linea centrale
  
  // Tempi
  DAY_MS: 86400000,
  HOUR_MS: 3600000,
  WEEK_MS: 604800000,
  
  // Zoom
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 6,
  ZOOM_STEP: 0.2,
  VISIBLE_HOURS: 24,
  VIEW_START_HOUR: 0,
  ZOOM_ATTEMPTS: 5,
  ZOOM_CENTER_DELAY: 10,
  
  // Comportamento
  SINGLE_LANE: true,
  EVENT_VERTICAL_RATIO: 0.9,
  BUFFER_MINUTES: 0,
  ALWAYS_CENTER_EVENTS: true,
  
  // Categorie
  CATEGORIES: ['Lavoro', 'Viaggio', 'Formazione', 'Personale', 'Sport', 'Altro'],
  
  // Colori
  RECALC_COLOR: "#ff9800",
  COLORS: {
    Lavoro: '#e63946',
    Viaggio: '#00b4d8',
    Formazione: '#e9c46a',
    Personale: '#4361ee',
    Sport: '#2ecc71',
    Altro: '#9d4edd'
  }
};

// Export per uso globale
window.TimelineConfig = TimelineConfig;