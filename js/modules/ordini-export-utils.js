/**
 * Ordini Export Utils Module
 * Funzioni di utilità e helper
 */

window.OrdiniExportUtils = {
  /**
   * Formatta le colonne numeriche nel worksheet
   */
  formatNumericColumns: function(ws) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let row = 1; row <= range.e.r; row++) {
      // Colonna L (Pezzi) - indice 11
      const qtyCell = XLSX.utils.encode_cell({r: row, c: 11});
      if (ws[qtyCell]) {
        ws[qtyCell].t = 'n';
        ws[qtyCell].z = '0.00';
      }
      
      // Colonna M (Prezzo Unitario) - indice 12
      const priceCell = XLSX.utils.encode_cell({r: row, c: 12});
      if (ws[priceCell]) {
        ws[priceCell].t = 'n';
        ws[priceCell].z = '0.00';
      }
      
      // Colonna N (Sconto %) - indice 13
      const discountCell = XLSX.utils.encode_cell({r: row, c: 13});
      if (ws[discountCell]) {
        ws[discountCell].t = 'n';
        ws[discountCell].z = '0.00%';
      }
      
      // Colonna O (S.M.) - indice 14
      const smCell = XLSX.utils.encode_cell({r: row, c: 14});
      if (ws[smCell]) {
        ws[smCell].t = 'n';
        ws[smCell].z = '0.00';
      }
      
      // Colonna P (Importo) - indice 15
      const totalCell = XLSX.utils.encode_cell({r: row, c: 15});
      if (ws[totalCell]) {
        ws[totalCell].t = 'n';
        ws[totalCell].z = '0.00';
      }
    }
  },
  
  /**
   * Pulisce l'indirizzo rimuovendo il nome del cliente
   */
  cleanAddress: function(address, clientName) {
    if (!address || !clientName) return address || '';
    
    // Rimuovi il nome del cliente dall'inizio dell'indirizzo
    const clientNamePattern = new RegExp('^' + clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i');
    return address.replace(clientNamePattern, '').trim();
  },
  
  /**
   * Converte un valore in numero float gestendo virgole
   */
  parseNumber: function(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    // Rimuovi simboli di valuta e converti virgola in punto
    const cleaned = value.toString()
      .replace(/[€$]/g, '')
      .replace(',', '.')
      .replace('%', '');
    
    return parseFloat(cleaned) || 0;
  },
  
  /**
   * Calcola l'importo di un prodotto con formula corretta
   */
  calculateAmount: function(quantity, unitPrice, sm, discount) {
    // S.M. = Sconto Merce = quantità di pezzi in sconto
    // Formula: (quantità totale - pezzi in sconto merce) × prezzo unitario
    let quantitaEffettiva = quantity - sm;
    if (quantitaEffettiva < 0) quantitaEffettiva = 0;
    
    let importo = quantitaEffettiva * unitPrice;
    
    // Applica sconto percentuale se presente
    if (discount > 0) {
      importo = importo * (1 - discount / 100);
    }
    
    return importo;
  },
  
  /**
   * Genera una chiave univoca per identificare duplicati
   */
  generateUniqueKey: function(orderNumber, productCode) {
    return `${orderNumber}_${productCode}`;
  },
  
  /**
   * Verifica se una riga è valida
   */
  isValidRow: function(row) {
    if (!row || row.length < 16) return false;
    
    // Verifica campi essenziali
    const orderNumber = row[0];
    const productCode = row[9];  // Codice Prodotto ora è alla posizione 9
    const quantity = this.parseNumber(row[11]); // Pezzi ora è alla posizione 11
    
    return !!(orderNumber && productCode && quantity > 0);
  },
  
  /**
   * Formatta una data nel formato italiano
   */
  formatDate: function(date) {
    if (!date) return '';
    
    // Se è già una stringa nel formato giusto, ritorna così com'è
    if (typeof date === 'string' && date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return date;
    }
    
    // Altrimenti prova a convertire
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
  },
  
  /**
   * Raggruppa i dati per ordine
   */
  groupByOrder: function(data) {
    const ordersMap = new Map();
    
    data.forEach(row => {
      const orderNum = row[0];
      if (!orderNum) return;
      
      if (!ordersMap.has(orderNum)) {
        ordersMap.set(orderNum, {
          orderNumber: orderNum,
          orderDate: row[1],
          documentType: row[2],
          documentNumber: row[3],
          documentDate: row[4],
          clientCode: row[5],
          clientDescription: row[6],
          deliveryAddress: row[7],
          vatNumber: row[8],
          products: []
        });
      }
      
      ordersMap.get(orderNum).products.push({
        code: row[9],       // Codice Prodotto
        description: row[10], // Descrizione Prodotto
        quantity: row[11],   // Pezzi
        unitPrice: row[12],  // Prezzo Unitario
        discount: row[13],   // Sconto (%)
        sm: row[14],        // S.M.
        amount: row[15]     // Importo
      });
    });
    
    return ordersMap;
  },
  
  /**
   * Calcola statistiche sui dati
   */
  calculateStats: function(data) {
    const stats = {
      totalRows: data.length,
      totalAmount: 0,
      totalQuantity: 0,
      uniqueOrders: new Set(),
      uniqueProducts: new Set(),
      uniqueClients: new Set()
    };
    
    data.forEach(row => {
      if (!this.isValidRow(row)) return;
      
      stats.uniqueOrders.add(row[0]);
      stats.uniqueClients.add(row[6]);  // Descrizione Cliente ora è alla posizione 6
      stats.uniqueProducts.add(row[9]); // Codice Prodotto ora è alla posizione 9
      stats.totalQuantity += this.parseNumber(row[11]); // Pezzi ora è alla posizione 11
      stats.totalAmount += this.parseNumber(row[15]);   // Importo ora è alla posizione 15
    });
    
    return {
      ...stats,
      uniqueOrders: stats.uniqueOrders.size,
      uniqueProducts: stats.uniqueProducts.size,
      uniqueClients: stats.uniqueClients.size
    };
  }
};