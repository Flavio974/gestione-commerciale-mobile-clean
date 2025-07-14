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
      // Colonna I (Quantità) - indice 8
      const qtyCell = XLSX.utils.encode_cell({r: row, c: 8});
      if (ws[qtyCell]) {
        ws[qtyCell].t = 'n';
        ws[qtyCell].z = '0.00';
      }
      
      // Colonna J (Prezzo Unitario) - indice 9
      const priceCell = XLSX.utils.encode_cell({r: row, c: 9});
      if (ws[priceCell]) {
        ws[priceCell].t = 'n';
        ws[priceCell].z = '0.00';
      }
      
      // Colonna K (S.M.) - indice 10
      const smCell = XLSX.utils.encode_cell({r: row, c: 10});
      if (ws[smCell]) {
        ws[smCell].t = 'n';
        ws[smCell].z = '0.00';
      }
      
      // Colonna L (Sconto %) - indice 11
      const discountCell = XLSX.utils.encode_cell({r: row, c: 11});
      if (ws[discountCell]) {
        ws[discountCell].t = 'n';
        ws[discountCell].z = '0.00%';
      }
      
      // Colonna M (Importo) - indice 12
      const totalCell = XLSX.utils.encode_cell({r: row, c: 12});
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
    if (!row || row.length < 13) return false;
    
    // Verifica campi essenziali (struttura 13 colonne)
    const orderNumber = row[0];  // N° Ordine
    const productCode = row[6];  // Codice Prodotto
    const quantity = this.parseNumber(row[8]); // Quantità
    
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
          orderNumber: orderNum,     // N° Ordine
          orderDate: row[1],         // Data Ordine
          client: row[2],            // Cliente
          deliveryAddress: row[3],   // Indirizzo Consegna
          vatNumber: row[4],         // P.IVA
          deliveryDate: row[5],      // Data Consegna
          products: []
        });
      }
      
      ordersMap.get(orderNum).products.push({
        code: row[6],        // Codice Prodotto
        description: row[7], // Prodotto
        quantity: row[8],    // Quantità
        unitPrice: row[9],   // Prezzo Unitario
        sm: row[10],         // S.M.
        discount: row[11],   // Sconto %
        amount: row[12]      // Importo
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
      
      stats.uniqueOrders.add(row[0]);   // N° Ordine
      stats.uniqueClients.add(row[2]);  // Cliente
      stats.uniqueProducts.add(row[6]); // Codice Prodotto
      stats.totalQuantity += this.parseNumber(row[8]);  // Quantità
      stats.totalAmount += this.parseNumber(row[12]);   // Importo
    });
    
    return {
      ...stats,
      uniqueOrders: stats.uniqueOrders.size,
      uniqueProducts: stats.uniqueProducts.size,
      uniqueClients: stats.uniqueClients.size
    };
  }
};