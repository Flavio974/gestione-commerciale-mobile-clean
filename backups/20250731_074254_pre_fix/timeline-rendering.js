/**
 * Timeline Rendering
 * Gestione del rendering e disegno della timeline
 */

const TimelineRendering = {
  /**
   * Aggiorna dimensioni canvas
   */
  updateCanvasSize: function(canvas, container) {
    if (!canvas || !container) return;
    
    const rect = container.getBoundingClientRect();
    const zoomFactor = Timeline.state?.zoomFactor || 1;
    
    // Calcola larghezza basata su zoom
    const baseWidth = Math.max(rect.width * 2, 3000);
    const newWidth = baseWidth * zoomFactor;
    
    // Imposta dimensioni del canvas usando la configurazione standard
    canvas.width = newWidth;
    canvas.height = Timeline.config.TIMELINE_HEIGHT;
    
    // Imposta stile CSS per visualizzazione
    canvas.style.width = newWidth + 'px';
    canvas.style.height = Timeline.config.TIMELINE_HEIGHT + 'px';
    
    // Forza anche il container
    if (container) {
      container.style.height = Timeline.config.TIMELINE_HEIGHT + 'px';
      container.style.maxHeight = Timeline.config.TIMELINE_HEIGHT + 'px';
    }
  },

  /**
   * Disegna timeline completa
   */
  drawTimeline: function(ctx, canvas, state, config) {
    if (!ctx || !canvas) return;
    
    try {
      // Pulisci canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const now = new Date();
      const timelineY = config.TIMELINE_Y; // Usa posizione standard dalla configurazione
      const key = state.currentDate.toISOString().slice(0, 10);
      
      // Disegna linea orizzontale principale
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(config.MARGIN, timelineY);
      ctx.lineTo(canvas.width - config.MARGIN, timelineY);
      ctx.stroke();
      
      // Disegna ore e linee verticali
      this.drawHourMarkers(ctx, canvas, timelineY, config);
      
      // Disegna legenda
      this.drawLegend(ctx, config);
      
      // Disegna eventi
      this.drawAllEvents(ctx, canvas, state, config, timelineY, key);
      
      // Disegna puntatore ora corrente
      if (TimelineUtils.isDateToday(state.currentDate)) {
        this.drawCurrentTimePointer(ctx, canvas, now, timelineY, config);
      }
      
    } catch(e) {
      console.error("Errore nel disegno della timeline:", e);
    }
  },

  /**
   * Disegna marcatori ore
   */
  drawHourMarkers: function(ctx, canvas, timelineY, config) {
    // Disegna ore e suddivisioni minuti
    for (let h = 0; h <= 24; h++) {
      // Posizione ora intera
      const xHour = TimelineUtils.timeToX(h, canvas.width, config.MARGIN);
      
      // Linea verticale ora (più lunga)
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xHour, timelineY - 15);
      ctx.lineTo(xHour, timelineY + 15);
      ctx.stroke();
      
      // Etichetta ora
      ctx.fillStyle = '#333';
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${h.toString().padStart(2, '0')}:00`, xHour, timelineY + 30);
      
      // Disegna suddivisioni minuti (solo se non siamo all'ultima ora)
      if (h < 24) {
        // 15 minuti
        const x15 = TimelineUtils.timeToX(h + 0.25, canvas.width, config.MARGIN);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x15, timelineY - 5);
        ctx.lineTo(x15, timelineY + 5);
        ctx.stroke();
        
        // 30 minuti (più grande)
        const x30 = TimelineUtils.timeToX(h + 0.5, canvas.width, config.MARGIN);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x30, timelineY - 10);
        ctx.lineTo(x30, timelineY + 10);
        ctx.stroke();
        
        // Etichetta opzionale per i 30 minuti (più piccola)
        ctx.fillStyle = '#888';
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.fillText(':30', x30, timelineY + 25);
        
        // 45 minuti
        const x45 = TimelineUtils.timeToX(h + 0.75, canvas.width, config.MARGIN);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x45, timelineY - 5);
        ctx.lineTo(x45, timelineY + 5);
        ctx.stroke();
      }
    }
  },

  /**
   * Disegna legenda
   */
  drawLegend: function(ctx, config) {
    ctx.fillStyle = '#333';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Legenda:', config.MARGIN, 20);
    
    // Pianificato
    ctx.fillStyle = config.COLORS['Lavoro'];
    TimelineUtils.roundRect(ctx, config.MARGIN, 30, 40, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillText('Pianificato (parte alta o bassa della corsia)', config.MARGIN + 50, 40);
    
    // Reale
    const baseColor = config.COLORS['Lavoro'];
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r*0.7}, ${g*0.7}, ${b*0.7}, 0.9)`;
    TimelineUtils.roundRect(ctx, config.MARGIN, 55, 40, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillText('Reale (al centro della corsia)', config.MARGIN + 50, 65);
    
    // Ricalcolato (ritardo)
    ctx.fillStyle = config.RECALC_COLOR;
    TimelineUtils.roundRect(ctx, config.MARGIN, 80, 40, 15, 3);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillText('Ricalcolato in ritardo (sopra la timeline)', config.MARGIN + 50, 90);
    
    // Ricalcolato (anticipo)
    ctx.fillStyle = '#2ecc71';
    TimelineUtils.roundRect(ctx, config.MARGIN, 105, 40, 15, 3);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillText('Ricalcolato in anticipo (sopra la timeline)', config.MARGIN + 50, 115);
  },

  /**
   * Disegna tutti gli eventi
   */
  drawAllEvents: function(ctx, canvas, state, config, timelineY, key) {
    // Eventi pianificati
    if (state.eventsByDate[key]) {
      state.eventsByDate[key].forEach((ev, idx) => {
        const categoryIdx = config.CATEGORIES.indexOf(ev.category);
        this.paintBlock(ctx, canvas, ev.start, ev.end, ev.desc, ev.category, 
                       timelineY, categoryIdx, 'planned', config);
      });
    }
    
    // Eventi reali
    if (state.realEventsByDate[key]) {
      state.realEventsByDate[key].forEach((ev, idx) => {
        const categoryIdx = config.CATEGORIES.indexOf(ev.category);
        this.paintBlock(ctx, canvas, ev.start, ev.end, ev.desc, ev.category, 
                       timelineY, categoryIdx, 'real', config);
      });
    }
    
    // Eventi ricalcolati
    if (state.recalculatedEventsByDate[key]) {
      state.recalculatedEventsByDate[key].forEach((ev, idx) => {
        const categoryIdx = config.CATEGORIES.indexOf(ev.category);
        this.paintBlock(ctx, canvas, ev.start, ev.end, ev.desc, ev.category, 
                       timelineY, categoryIdx, 'recalculated', config);
      });
    }
  },

  /**
   * Disegna puntatore ora corrente
   */
  drawCurrentTimePointer: function(ctx, canvas, now, timelineY, config) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const x = config.MARGIN + ((now - dayStart) / config.DAY_MS) * (canvas.width - 2 * config.MARGIN);
    
    // Colore rosso vivace per massima visibilità
    const pointerColor = '#FF0000';
    
    // Linea verticale puntatore (più spessa)
    ctx.strokeStyle = pointerColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
    
    // Triangolo puntatore superiore (più grande)
    ctx.fillStyle = pointerColor;
    ctx.beginPath();
    ctx.moveTo(x, timelineY - 15);
    ctx.lineTo(x - 8, timelineY - 30);
    ctx.lineTo(x + 8, timelineY - 30);
    ctx.closePath();
    ctx.fill();
    
    // Triangolo puntatore inferiore
    ctx.beginPath();
    ctx.moveTo(x, timelineY + 15);
    ctx.lineTo(x - 8, timelineY + 30);
    ctx.lineTo(x + 8, timelineY + 30);
    ctx.closePath();
    ctx.fill();
    
    // Box per l'ora corrente con sfondo
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    // Misura il testo per il box
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    const textWidth = ctx.measureText(timeString).width;
    const boxPadding = 8;
    const boxWidth = textWidth + boxPadding * 2;
    const boxHeight = 26;
    const boxY = 5;
    
    // Disegna box sfondo bianco con bordo rosso
    ctx.fillStyle = 'white';
    ctx.fillRect(x - boxWidth/2, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = pointerColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - boxWidth/2, boxY, boxWidth, boxHeight);
    
    // Testo ora corrente in rosso
    ctx.fillStyle = pointerColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeString, x, boxY + boxHeight/2);
    
    // Cerchio al centro della timeline per evidenziare la posizione
    ctx.beginPath();
    ctx.arc(x, timelineY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = pointerColor;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  /**
   * Disegna blocco evento
   */
  paintBlock: function(ctx, canvas, start, end, desc, category, timelineY, categoryIdx, type, config) {
    try {
      const sM = TimelineUtils.timeToMinutes(start);
      const eM = TimelineUtils.timeToMinutes(end);
      const wTot = canvas.width - 2 * config.MARGIN;
      const x1 = config.MARGIN + (sM / 1440) * wTot;
      const w = ((eM - sM) / 1440) * wTot;
      
      // Altezza dei rettangoli
      let blockH;
      if (type === 'real') {
        blockH = config.LANE_H * 0.7; // Più bassi dei pianificati
      } else if (type === 'recalculated') {
        blockH = config.RECALC_LANE_H * 0.95;
      } else {
        blockH = config.LANE_H * 0.95;
      }
      
      // Calcola posizione verticale
      let y;
      const baseOffset = 40; // Aumentato per non coprire le etichette delle ore
      // Lo spacing deve includere spazio per pianificato + reale + gap
      const realHeight = config.LANE_H * 0.7;
      const laneSpacing = config.LANE_H + realHeight + config.LANE_GAP;
      
      if (type === 'recalculated') {
        // Eventi ricalcolati sopra la timeline
        y = timelineY - config.MARGIN - (categoryIdx + 1) * (config.RECALC_LANE_H + config.RECALC_LANE_GAP);
      } else if (type === 'real') {
        // Eventi reali - posizionali subito sotto gli eventi pianificati con un piccolo gap
        const plannedY = timelineY + baseOffset + categoryIdx * laneSpacing;
        y = plannedY + config.LANE_H + 5; // 5 pixel di gap tra pianificato e reale
      } else {
        // Eventi pianificati nelle corsie principali
        y = timelineY + baseOffset + categoryIdx * laneSpacing;
      }
      
      // Colore basato su tipo
      if (type === 'recalculated') {
        const originalStart = TimelineUtils.timeToMinutes(start.replace(" (ricalcolato)", ""));
        ctx.fillStyle = sM > originalStart ? config.RECALC_COLOR : '#2ecc71';
      } else if (type === 'real') {
        const baseColor = config.COLORS[category] || '#999';
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r*0.7}, ${g*0.7}, ${b*0.7}, 0.9)`;
      } else {
        ctx.fillStyle = config.COLORS[category] || '#999';
      }
      
      // Disegna rettangolo con riempimento
      TimelineUtils.roundRect(ctx, x1, y, w, blockH, 3);
      ctx.fill();
      
      // Aggiungi bordo
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; // Bordo scuro semi-trasparente
      ctx.lineWidth = 1.5;
      TimelineUtils.roundRect(ctx, x1, y, w, blockH, 3);
      ctx.stroke();
      
      // Testo multi-riga
      ctx.fillStyle = 'white';
      ctx.font = type === 'recalculated' ? '11px "Segoe UI", sans-serif' : '11px "Segoe UI", sans-serif';
      
      // Prepara il testo
      const timeText = `${start}-${end}`;
      const fullText = `${timeText} ${desc}`;
      
      // Calcola dimensioni per il wrapping
      const padding = 4;
      const maxWidth = w - (padding * 2);
      const lineHeight = type === 'recalculated' ? 13 : 14;
      const maxLines = Math.floor((blockH - padding * 2) / lineHeight);
      const effectiveMaxLines = Math.min(maxLines, 3); // Massimo 3 righe
      
      // Wrap del testo
      const lines = this.wrapText(ctx, fullText, maxWidth, effectiveMaxLines);
      
      // Disegna le righe centrate verticalmente
      const totalTextHeight = lines.length * lineHeight;
      const startY = y + (blockH - totalTextHeight) / 2 + lineHeight / 2;
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      lines.forEach((line, index) => {
        ctx.fillText(line, x1 + w/2, startY + (index * lineHeight));
      });
      
    } catch(e) {
      console.error("Errore nel disegno del blocco:", e);
    }
  },

  /**
   * Wrap del testo su più righe
   */
  wrapText: function(ctx, text, maxWidth, maxLines) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
        
        // Se abbiamo raggiunto il massimo numero di righe
        if (lines.length >= maxLines - 1) {
          // Aggiungi il resto del testo con ellipsis
          const remainingWords = words.slice(i).join(' ');
          let truncatedLine = remainingWords;
          
          // Tronca fino a quando non entra nella larghezza
          while (ctx.measureText(truncatedLine + '...').width > maxWidth && truncatedLine.length > 0) {
            truncatedLine = truncatedLine.slice(0, -1);
          }
          
          lines.push(truncatedLine + '...');
          return lines;
        }
      } else {
        currentLine = testLine;
      }
    }
    
    // Aggiungi l'ultima riga se c'è
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }
};

// Export per uso globale
window.TimelineRendering = TimelineRendering;