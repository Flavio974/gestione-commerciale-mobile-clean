/**
 * Timeline Utilities
 * Funzioni di utilità per il modulo Timeline
 */

const TimelineUtils = {
  /**
   * Converte tempo stringa in minuti
   */
  timeToMinutes: function(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  },

  /**
   * Converte minuti in stringa tempo
   */
  minutesToTime: function(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60); // Arrotonda i minuti per evitare decimali
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  /**
   * Aggiunge minuti a tempo stringa
   */
  addMinutesToTime: function(timeStr, minutesToAdd) {
    return this.minutesToTime(this.timeToMinutes(timeStr) + minutesToAdd);
  },

  /**
   * Verifica se data è oggi
   */
  isDateToday: function(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() === today.getTime();
  },

  /**
   * Schiarisce colore
   */
  lightenColor: function(color, factor) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    const newR = Math.round(r + (255 - r) * factor);
    const newG = Math.round(g + (255 - g) * factor);
    const newB = Math.round(b + (255 - b) * factor);
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  },

  /**
   * Disegna rettangolo arrotondato
   */
  roundRect: function(ctx, x, y, width, height, radius) {
    radius = Math.min(radius, width/2, height/2);
    if (radius <= 0 || width <= 0 || height <= 0) {
      ctx.rect(x, y, Math.max(0, width), Math.max(0, height));
      return;
    }
    
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  },

  /**
   * Tronca testo con ellipsis
   */
  truncateText: function(text, maxWidth, ctx) {
    let truncated = text;
    
    while (ctx.measureText(truncated).width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    
    if (truncated !== text) {
      truncated += '...';
    }
    
    return truncated;
  },

  /**
   * Converte ore in coordinate X
   */
  timeToX: function(hours, canvasWidth, margin) {
    const wTot = canvasWidth - 2 * margin;
    return margin + (hours / 24) * wTot;
  }
};

// Export per uso globale
window.TimelineUtils = TimelineUtils;