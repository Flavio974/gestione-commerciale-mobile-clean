/**
 * Pattern regex aggiornati per il modulo DDT-FT
 * Basati sull'analisi dei PDF di esempio
 */

// Pattern per identificazione tipo documento
const DOCUMENT_TYPE_PATTERNS = {
  DDT: {
    // Pattern esistenti
    primary: /DDT\s+(\d+)\s+\d{2}\/\d{2}\/\d{2}/i,
    secondary: /D\.D\.T\.\s+(\d+)/i,
    alternative: /DOCUMENTO\s+DI\s+TRASPORTO\s+N[°.]?\s*(\d+)/i,
    
    // NUOVO: Pattern per formato Alfieri (numero/data/anno)
    alfieri: /(\d{4,6})\/(\d{2})\/(\d{2})/,
    
    // NUOVO: Pattern che cerca dopo la riga 30 per documenti Alfieri
    alfieriSpecific: function(text) {
      const lines = text.split('\n');
      // Cerca dopo la riga con "ALFIERI SPECIALITA' ALIMENTARI"
      let foundAlfieri = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('ALFIERI SPECIALITA') || lines[i].includes('ALFIERI SPEC')) {
          foundAlfieri = true;
        }
        // Se abbiamo trovato Alfieri, cerca il numero nelle prossime righe
        if (foundAlfieri && i < lines.length - 5) {
          // Pattern: numero di 4-6 cifre seguito da data
          const match = lines[i].match(/^(\d{4,6})\/(\d{2})\/(\d{2})$/);
          if (match) {
            return match[1]; // Ritorna solo il numero documento
          }
        }
      }
      return null;
    }
  },
  FATTURA: {
    primary: /FATTURA\s*N[°.]?\s*(\d+)/i,
    secondary: /FT\s+(\d+)/i,
    alternative: /FATT\.\s*N[°.]?\s*(\d+)/i,
    
    // NUOVO: Pattern per FTV nel nome file o contenuto
    ftv: /FTV[_\s]*(\d+)/i,
    
    // NUOVO: Estrazione dal nome file se altri pattern falliscono
    fromFileName: function(fileName) {
      // Cerca pattern come FTV_701029_2025_20001_4226
      const match = fileName.match(/FTV_(\d+)_(\d+)_(\d+)_(\d+)/);
      if (match) {
        return match[3]; // Ritorna il terzo gruppo di numeri (20001)
      }
      return null;
    }
  }
};

// Pattern per estrazione date
const DATE_PATTERNS = {
  standard: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
  withLabel: /DATA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  fullDate: /(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i,
  
  // NUOVO: Pattern per date nel formato Alfieri
  alfieriDate: /\d{4,6}\/(\d{2}\/\d{2})/
};

// Pattern migliorati per nome cliente
const CLIENT_PATTERNS = {
  // Pattern esistenti
  spettabile: /Spett(?:\.le|abile)\s*/i,
  destinatario: /DESTINATARIO[:\s]+([^\n]+)/i,
  cliente: /CLIENTE[:\s]+([^\n]+)/i,
  ragioneSociale: /RAGIONE\s+SOCIALE[:\s]+([^\n]+)/i,
  
  // NUOVO: Estrazione cliente per documenti Alfieri
  alfieriClient: function(text) {
    const lines = text.split('\n');
    let foundAlfieri = false;
    let foundNumber = false;
    
    for (let i = 0; i < lines.length; i++) {
      // Cerca ALFIERI SPECIALITA
      if (lines[i].includes('ALFIERI SPECIALITA') || lines[i].includes('ALFIERI SPEC')) {
        foundAlfieri = true;
      }
      
      // Se troviamo il numero documento (pattern data)
      if (foundAlfieri && lines[i].match(/^\d{4,6}\/\d{2}\/\d{2}$/)) {
        foundNumber = true;
        continue;
      }
      
      // Dopo il numero, cerca il nome cliente
      if (foundNumber && lines[i].trim()) {
        // Salta codici numerici e codici cliente
        if (lines[i].match(/^\d{5,}$/) || lines[i].match(/^[A-Z]{2}\d+$/)) {
          continue;
        }
        
        // Verifica che non sia un indirizzo
        if (!lines[i].match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|STRADA|STR\.|P\.ZZA|PIAZZA)/i)) {
          // Probabilmente è il nome del cliente
          const clientName = lines[i].trim();
          
          // Verifica se la riga successiva è uguale (nome ripetuto)
          if (i < lines.length - 1 && lines[i + 1].trim() === clientName) {
            return clientName;
          }
          
          // Se non è ripetuto ma sembra un nome valido
          if (clientName.match(/[A-Z][A-Z\s\.&]+/) && clientName.length > 3) {
            return clientName;
          }
        }
      }
    }
    
    return null;
  },
  
  // NUOVO: Estrazione per fatture dopo Spett.le
  fatturaAfterSpettabile: function(text) {
    const spettMatch = text.match(/Spett(?:\.le|abile)\s*\n([^\n]*)\n([^\n]*)/i);
    if (spettMatch) {
      // Salta "Luogo di consegna" se presente
      const line1 = spettMatch[1].trim();
      const line2 = spettMatch[2].trim();
      
      if (line1.match(/Luogo di consegna/i)) {
        // Cerca il cliente più avanti nel documento
        const afterLuogo = text.substring(text.indexOf('Luogo di consegna') + 100);
        // Cerca pattern tipo "PIEMONTE CARNI"
        const clientMatch = afterLuogo.match(/^([A-Z][A-Z\s]+(?:S\.R\.L\.|SRL|S\.P\.A\.|SPA|SNC|SAS)?)/m);
        if (clientMatch) {
          return clientMatch[1].trim();
        }
      }
    }
    return null;
  }
};

// Pattern per dati fiscali
const FISCAL_PATTERNS = {
  partitaIva: /P(?:ARTITA)?\.?\s*IVA[:\s]*(\d{11})/i,
  codiceFiscale: /C(?:ODICE)?\.?\s*F(?:ISCALE)?[:\s]*([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])/i,
  codiceCliente: /COD(?:ICE)?\.?\s*CLIENTE[:\s]*(\d+)/i,
  
  // NUOVO: Pattern per codice cliente nel formato posizionale
  codiceClientePositional: /^\d{5,6}$/m
};

// Funzione helper per estrarre dati con pattern multipli
function extractWithPatterns(text, patterns, fileName = '') {
  // Prova pattern regex standard
  for (const [key, pattern] of Object.entries(patterns)) {
    if (typeof pattern === 'function') {
      // Se è una funzione, chiamala
      const result = pattern(text, fileName);
      if (result) return result;
    } else if (pattern instanceof RegExp) {
      const match = text.match(pattern);
      if (match) return match[1] || match[0];
    }
  }
  return null;
}

// Esporta i pattern aggiornati
const PATTERNS_UPDATED = {
  DOCUMENT_TYPE: DOCUMENT_TYPE_PATTERNS,
  DATE: DATE_PATTERNS,
  CLIENT: CLIENT_PATTERNS,
  FISCAL: FISCAL_PATTERNS,
  
  // Helper function
  extractWithPatterns: extractWithPatterns
};

// Per compatibilità
if (typeof window !== 'undefined') {
  window.DDTFT_PATTERNS_UPDATED = PATTERNS_UPDATED;
}

// Export per Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PATTERNS_UPDATED;
}