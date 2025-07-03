/**
 * Ordini Export Core Module
 * Funzioni principali per l'export degli ordini
 */

window.OrdiniExportCore = {
  /**
   * Funzione principale per esportare ordini in Excel
   */
  exportOrdersToExcel: function(orders) {
    console.log('🚀 INIZIO EXPORT EXCEL - CODICE AGGIORNATO');
    try {
      // Mostra dialog con opzioni di esportazione
      OrdiniExportUI.showExportDialog(orders);
    } catch (e) {
      console.error('Errore durante l\'esportazione:', e);
      alert('Errore durante l\'esportazione: ' + e.message);
    }
  },
  
  /**
   * Export in un nuovo file Excel
   */
  exportToNewFile: function(orders) {
    try {
      const result = this.prepareOrderData(orders);
      const orderData = result.data;
      const totaleRealeExcel = result.totale;
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(orderData);
      
      // Formatta le colonne numeriche
      OrdiniExportUtils.formatNumericColumns(ws);
      
      // Imposta larghezza colonne
      const colWidths = [
        {wch: 15}, // Numero Ordine
        {wch: 12}, // Data Ordine
        {wch: 12}, // Tipo Documento
        {wch: 15}, // Numero documento
        {wch: 12}, // Data Documento
        {wch: 12}, // Codice Cliente
        {wch: 35}, // Descrizione Cliente
        {wch: 40}, // Indirizzo di Consegna
        {wch: 15}, // P.Iva
        {wch: 15}, // Codice Prodotto
        {wch: 50}, // Descrizione Prodotto
        {wch: 10}, // Pezzi
        {wch: 15}, // Prezzo Unitario
        {wch: 10}, // Sconto (%)
        {wch: 12}, // S.M.
        {wch: 15}  // Importo
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Ordini');
      
      // Salva il file Excel
      const fileName = `Ordini_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      // Conta le righe effettive (esclusa intestazione)
      const rowCount = orderData.length - 1;
      
      console.log('🚀 === EXPORT EXCEL COMPLETATO ===');
      console.log(`Righe esportate: ${rowCount}`);
      console.log(`Totale: €${totaleRealeExcel.toFixed(2)}`);
      
      // Mostra risultati
      OrdiniExportUI.showExportResults(rowCount, totaleRealeExcel, orders.length);
      
    } catch (e) {
      console.error('Errore durante l\'esportazione:', e);
      alert('Errore durante l\'esportazione: ' + e.message);
    }
  },
  
  /**
   * Prepara i dati degli ordini per l'export
   * Crea un singolo foglio Excel con le seguenti colonne nell'ordine:
   * 1. Numero Ordine
   * 2. Data Ordine
   * 3. Tipo Documento
   * 4. Numero documento
   * 5. Data Documento
   * 6. Codice Cliente
   * 7. Descrizione Cliente
   * 8. Indirizzo di Consegna
   * 9. P.Iva
   * 10. Codice Prodotto
   * 11. Descrizione Prodotto
   * 12. Pezzi
   * 13. Prezzo Unitario
   * 14. Sconto (%)
   * 15. S.M.
   * 16. Importo
   * 
   * Ogni riga rappresenta un prodotto, ripetendo i dati dell'ordine per ogni prodotto
   */
  prepareOrderData: function(orders) {
    console.log('📊 Preparazione dati per export Excel...');
    console.log(`Numero ordini da processare: ${orders.length}`);
    
    const data = [];
    let totaleRealeExcel = 0;
    let ordiniConProdotti = 0;
    let ordiniSenzaProdotti = 0;
    let prodottiTotali = 0;
    
    // Intestazione con le colonne nell'ordine richiesto
    data.push([
      'Numero Ordine',        // 1. Numero Ordine
      'Data Ordine',          // 2. Data Ordine
      'Tipo Documento',       // 3. Tipo Documento
      'Numero documento',     // 4. Numero documento (minuscola)
      'Data Documento',       // 5. Data Documento
      'Codice Cliente',       // 6. Codice Cliente
      'Descrizione Cliente',  // 7. Descrizione Cliente (invece di solo "Cliente")
      'Indirizzo di Consegna',// 8. Indirizzo di Consegna
      'P.Iva',               // 9. P.Iva
      'Codice Prodotto',      // 10. Codice Prodotto
      'Descrizione Prodotto', // 11. Descrizione Prodotto (invece di solo "Prodotto")
      'Pezzi',               // 12. Pezzi (invece di "Quantità")
      'Prezzo Unitario',      // 13. Prezzo Unitario
      'Sconto (%)',          // 14. Sconto (%)
      'S.M.',                // 15. S.M.
      'Importo'              // 16. Importo
    ]);
    
    // Processa ogni ordine
    orders.forEach((order, index) => {
      console.log(`\nProcessando ordine ${index + 1}/${orders.length}: ${order.orderNumber || 'Senza numero'}`);
      
      if (order.products && order.products.length > 0) {
        ordiniConProdotti++;
        console.log(`  - ${order.products.length} prodotti trovati`);
        
        order.products.forEach((product, prodIndex) => {
          prodottiTotali++;
          
          // Converti valori numerici
          const quantity = parseFloat((product.quantity || '0').toString().replace(',', '.')) || 0;
          const unitPrice = parseFloat((product.unitPrice || product.price || '0').toString().replace(',', '.')) || 0;
          const sm = parseFloat((product.sm || '0').toString().replace(',', '.')) || 0;
          const discount = parseFloat((product.discount || '0').toString().replace(',', '.').replace('%', '')) || 0;
          
          // Debug specifico per DL000301
          if (product.code === 'DL000301') {
            console.log(`\n🔍 DEBUG DL000301:`);
            console.log(`  Dati originali dal prodotto:`, product);
            console.log(`  product.quantity originale:`, product.quantity);
            console.log(`  product.price originale:`, product.price);
            console.log(`  product.sm originale:`, product.sm);
            console.log(`  Dopo conversione:`);
            console.log(`  quantity (numero):`, quantity, typeof quantity);
            console.log(`  unitPrice (numero):`, unitPrice, typeof unitPrice);
            console.log(`  sm (numero):`, sm, typeof sm);
            console.log(`  discount (numero):`, discount, typeof discount);
          }
          
          // SEMPRE ricalcola l'importo con la formula corretta
          // S.M. = Sconto Merce = quantità di pezzi in sconto
          // Formula: (quantità totale - pezzi in sconto merce) × prezzo unitario
          let quantitaEffettiva = quantity - sm;
          if (quantitaEffettiva < 0) quantitaEffettiva = 0;
          
          let importo = quantitaEffettiva * unitPrice;
          
          // Applica sconto percentuale se presente
          if (discount > 0) {
            importo = importo * (1 - discount / 100);
          }
          
          if (product.code === 'DL000301') {
            console.log(`  Calcolo: (${quantity} - ${sm}) × ${unitPrice} = ${importo}`);
            console.log(`  Importo finale calcolato: €${importo.toFixed(2)}`);
          }
          
          if (sm > 0 || discount > 0) {
            console.log(`    Prodotto: ${product.code}`);
            console.log(`    Formula: (${quantity} - ${sm}) × €${unitPrice} = €${importo.toFixed(2)}`);
            if (discount > 0) {
              console.log(`    Con sconto ${discount}%: €${importo.toFixed(2)}`);
            }
          }
          
          totaleRealeExcel += importo;
          
          // Log della conversione
          console.log(`  Prodotto ${prodIndex + 1}: ${product.code} - Q:${quantity} x P:${unitPrice} - SM:${sm} - Sc:${discount}% = €${importo.toFixed(2)}`);
          
          // Debug specifico per DL000301 - Verifica cosa viene scritto
          if (product.code === 'DL000301') {
            console.log(`\n📝 SCRITTURA EXCEL DL000301:`);
            console.log(`  Riga che verrà scritta nell'Excel:`);
            console.log(`  [7] Codice: ${product.code}`);
            console.log(`  [8] Descrizione: ${product.description}`);
            console.log(`  [9] Quantità: ${quantity}`);
            console.log(`  [10] Prezzo: ${unitPrice}`);
            console.log(`  [11] S.M.: ${sm}`);
            console.log(`  [12] Sconto: ${discount}`);
            console.log(`  [13] IMPORTO FINALE: ${importo}`);
            console.log(`  Importo arrotondato: ${importo.toFixed(2)}`);
            
            // VERIFICA CRITICA
            const expectedImporto = (quantity - sm) * unitPrice;
            console.log(`\n🚨 VERIFICA CALCOLO:`);
            console.log(`  Formula: (${quantity} - ${sm}) × ${unitPrice}`);
            console.log(`  Risultato atteso: ${expectedImporto}`);
            console.log(`  Risultato effettivo: ${importo}`);
            if (Math.abs(importo - 920) > 0.01) {
              console.error(`  ❌ ERRORE: Il risultato dovrebbe essere 920, ma è ${importo}`);
            } else {
              console.log(`  ✅ OK: Il calcolo è corretto (920)`);
            }
          }
          
          // Pulisci l'indirizzo rimuovendo il nome del cliente se presente
          let cleanAddress = order.deliveryAddress || order.address || '';
          if (cleanAddress && order.clientName) {
            // Rimuovi il nome del cliente dall'inizio dell'indirizzo
            const clientNamePattern = new RegExp('^' + order.clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i');
            cleanAddress = cleanAddress.replace(clientNamePattern, '').trim();
          }
          
          // Aggiungi riga con i dati nell'ordine richiesto
          // Ogni riga rappresenta un prodotto, ripetendo i dati dell'ordine
          data.push([
            order.orderNumber || '',                      // 1. Numero Ordine
            order.orderDate || '',                        // 2. Data Ordine
            'ORDINE',                                     // 3. Tipo Documento (per gli ordini è sempre "ORDINE")
            '',                                           // 4. Numero documento (vuoto per ordini)
            order.orderDate || '',                        // 5. Data Documento (uguale a Data Ordine per ordini)
            order.clientCode || '',                       // 6. Codice Cliente
            order.clientName || '',                       // 7. Descrizione Cliente
            cleanAddress,                                 // 8. Indirizzo di Consegna (pulito)
            order.vatNumber || '',                        // 9. P.Iva
            product.code || '',                           // 10. Codice Prodotto
            product.description || '',                    // 11. Descrizione Prodotto
            quantity,                                     // 12. Pezzi
            unitPrice,                                    // 13. Prezzo Unitario
            discount || 0,                                // 14. Sconto (%)
            sm || 0,                                      // 15. S.M.
            importo                                       // 16. Importo
          ]);
        });
      } else {
        ordiniSenzaProdotti++;
        console.log(`  - Nessun prodotto`);
        
        // Pulisci l'indirizzo anche per ordini senza prodotti
        let cleanAddress = order.deliveryAddress || order.address || '';
        if (cleanAddress && order.clientName) {
          const clientNamePattern = new RegExp('^' + order.clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i');
          cleanAddress = cleanAddress.replace(clientNamePattern, '').trim();
        }
        
        // Se non ci sono prodotti, crea comunque una riga con i dati dell'ordine
        data.push([
          order.orderNumber || '',                      // 1. Numero Ordine
          order.orderDate || '',                        // 2. Data Ordine
          'ORDINE',                                     // 3. Tipo Documento
          '',                                           // 4. Numero documento
          order.orderDate || '',                        // 5. Data Documento
          order.clientCode || '',                       // 6. Codice Cliente
          order.clientName || '',                       // 7. Descrizione Cliente
          cleanAddress,                                 // 8. Indirizzo di Consegna (pulito)
          order.vatNumber || '',                        // 9. P.Iva
          '',  // 10. Codice Prodotto vuoto
          '',  // 11. Descrizione Prodotto vuoto
          '',  // 12. Pezzi vuoto
          '',  // 13. Prezzo Unitario vuoto
          '',  // 14. Sconto vuoto
          '',  // 15. S.M. vuoto
          ''   // 16. Importo vuoto
        ]);
      }
    });
    
    // Calcola totale referenze diverse
    let totalUniqueProducts = 0;
    orders.forEach(order => {
      if (order.uniqueProductCount) {
        totalUniqueProducts += order.uniqueProductCount;
      } else if (order.products) {
        totalUniqueProducts += order.products.length;
      }
    });
    
    console.log('\n📊 RIEPILOGO EXPORT:');
    console.log(`- Ordini totali: ${orders.length}`);
    console.log(`- Ordini con prodotti: ${ordiniConProdotti}`);
    console.log(`- Ordini senza prodotti: ${ordiniSenzaProdotti}`);
    console.log(`- Prodotti totali: ${prodottiTotali}`);
    console.log(`- Referenze diverse totali: ${totalUniqueProducts}`);
    console.log(`- Righe dati (escluso header): ${data.length - 1}`);
    console.log(`- TOTALE IMPORTO: €${totaleRealeExcel.toFixed(2)}`);
    
    return { 
      data: data, 
      totale: totaleRealeExcel,
      uniqueProducts: totalUniqueProducts
    };
  }
};