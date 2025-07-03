/**
 * Modulo Gestione DDT e Fatture - Utility Functions
 * Funzioni di utilità e formattazione
 */

// Estende l'oggetto DDTFTModule con le funzioni di utilità
Object.assign(DDTFTModule, {
  /**
   * Genera ID univoco
   */
  generateId: function() {
    return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Genera numero DDT
   */
  generateDDTNumber: function() {
    const year = new Date().getFullYear();
    const documents = this.state.documents.filter(d => 
      d.type === 'ddt' && 
      d.date && 
      new Date(d.date).getFullYear() === year
    );
    
    const lastNumber = documents.length;
    return `DDT-${year}/${(lastNumber + 1).toString().padStart(4, '0')}`;
  },

  /**
   * Formatta data
   */
  formatDate: function(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  /**
   * Formatta valuta
   */
  formatCurrency: function(value) {
    if (typeof value !== 'number') {
      value = parseFloat(value) || 0;
    }
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  },

  /**
   * Parse data da stringa
   */
  parseDate: function(dateStr) {
    if (!dateStr) return '';
    
    // Try different date formats
    const formats = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,  // DD/MM/YYYY or DD-MM-YYYY
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,  // YYYY/MM/DD or YYYY-MM-DD
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (match[1].length === 4) {
          // YYYY-MM-DD format
          return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else {
          // DD-MM-YYYY format
          return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        }
      }
    }
    
    return dateStr;
  },

  /**
   * Parse importo da stringa
   */
  parseAmount: function(amountStr) {
    if (!amountStr) return 0;
    
    // Remove currency symbols and spaces
    let cleaned = amountStr.replace(/[€$£\s]/g, '');
    
    // Handle different decimal separators
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Both separators present - assume comma is decimal
      cleaned = cleaned.replace('.', '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      // Only comma - check if it's thousand separator or decimal
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Likely decimal separator
        cleaned = cleaned.replace(',', '.');
      } else {
        // Likely thousand separator
        cleaned = cleaned.replace(',', '');
      }
    }
    
    return parseFloat(cleaned) || 0;
  },

  /**
   * Carica documenti da storage
   */
  loadDocumentsFromStorage: function() {
    try {
      const saved = localStorage.getItem('ddtft_documents');
      if (saved) {
        const documents = JSON.parse(saved);
        
        // FIX: Verifica e correggi le descrizioni dei prodotti
        console.log('=== VERIFICA DESCRIZIONI AL CARICAMENTO ===');
        let fixedCount = 0;
        
        documents.forEach((doc, docIndex) => {
          if (doc.items && Array.isArray(doc.items)) {
            doc.items.forEach((item, itemIndex) => {
              // Log del contenuto dell'item per debug
              if (itemIndex === 0 && docIndex < 3) { // Log solo i primi 3 documenti
                console.log(`Documento ${docIndex + 1}, Item ${itemIndex + 1}:`, {
                  code: item.code,
                  description: item.description,
                  tipoDescription: typeof item.description,
                  tuttiCampi: Object.keys(item)
                });
              }
              
              // Se la descrizione è "0" o un numero, è un errore
              if (item.description === "0" || item.description === 0 || typeof item.description === 'number') {
                console.warn(`⚠️ Descrizione errata trovata: "${item.description}" per prodotto ${item.code}`);
                
                // Prova a recuperare la descrizione da altri campi
                if (item.descrizione && item.descrizione !== "0") {
                  item.description = item.descrizione;
                  fixedCount++;
                } else if (item.descrizioneProdotto && item.descrizioneProdotto !== "0") {
                  item.description = item.descrizioneProdotto;
                  fixedCount++;
                } else if (item.nome && item.nome !== "0") {
                  item.description = item.nome;
                  fixedCount++;
                } else {
                  // Se non troviamo niente, mettiamo un placeholder
                  item.description = `Prodotto ${item.code || 'SCONOSCIUTO'}`;
                  fixedCount++;
                }
                
                console.log(`✅ Descrizione corretta a: "${item.description}"`);
              }
              
              // Assicurati che la descrizione sia sempre una stringa
              if (item.description && typeof item.description !== 'string') {
                item.description = String(item.description);
              }
            });
          }
        });
        
        if (fixedCount > 0) {
          console.log(`✅ Corrette ${fixedCount} descrizioni errate`);
          // Salva i documenti corretti
          localStorage.setItem('ddtft_documents', JSON.stringify(documents));
        }
        
        this.state.documents = documents;
        console.log(`📦 Caricati ${documents.length} documenti dal localStorage`);
      }
    } catch (e) {
      console.error('Errore caricamento documenti:', e);
    }
  },

  /**
   * Salva documenti in storage
   */
  saveDocumentsToStorage: function() {
    try {
      localStorage.setItem('ddtft_documents', JSON.stringify(this.state.documents));
    } catch (e) {
      console.error('Errore salvataggio documenti:', e);
    }
  },

  /**
   * Funzione di utilità per correggere le descrizioni nei documenti esistenti
   * Da eseguire una volta per sistemare i dati corrotti
   */
  fixAllDocumentDescriptions: function() {
    console.log('=== INIZIO CORREZIONE GLOBALE DESCRIZIONI ===');
    
    let totalFixed = 0;
    let documentsFixed = 0;
    
    this.state.documents.forEach((doc, docIndex) => {
      let docFixed = false;
      
      if (doc.items && Array.isArray(doc.items)) {
        doc.items.forEach((item, itemIndex) => {
          // Se la descrizione è "0" o invalida
          if (!item.description || item.description === "0" || item.description === 0 || 
              typeof item.description === 'number') {
            
            console.log(`Documento ${docIndex + 1}, Item ${itemIndex + 1}: Descrizione errata "${item.description}"`);
            
            // Cerca in tutti i possibili campi
            const alternatives = [
              item.descrizione, item.descrizioneProdotto, item.desc, 
              item.nome, item.nomeProdotto, item.articolo, item.denominazione
            ];
            
            let fixed = false;
            for (const alt of alternatives) {
              if (alt && alt !== "0" && alt !== 0) {
                item.description = String(alt);
                console.log(`  ✅ Corretta con: "${item.description}"`);
                totalFixed++;
                docFixed = true;
                fixed = true;
                break;
              }
            }
            
            if (!fixed) {
              item.description = `Prodotto ${item.code || 'SCONOSCIUTO'}`;
              console.log(`  ⚠️ Nessuna alternativa trovata, uso: "${item.description}"`);
              totalFixed++;
              docFixed = true;
            }
          }
        });
      }
      
      if (docFixed) documentsFixed++;
    });
    
    if (totalFixed > 0) {
      this.saveDocumentsToStorage();
      console.log(`✅ Corrette ${totalFixed} descrizioni in ${documentsFixed} documenti`);
      console.log('📦 Dati salvati nel localStorage');
    } else {
      console.log('✅ Nessuna correzione necessaria');
    }
    
    console.log('=== FINE CORREZIONE GLOBALE ===');
    
    return {
      totalFixed,
      documentsFixed
    };
  }
});