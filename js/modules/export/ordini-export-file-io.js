/**
 * Ordini Export File I/O Module
 * Gestisce import/export di file locali
 */

(function() {
  'use strict';

  class FileIOManager {
    constructor() {
      this.importedData = null;
    }

    /**
     * Esporta ordini in un nuovo file con data
     */
    exportToNewFile(orders) {
      try {
        if (!window.XLSX) {
          throw new Error('Libreria XLSX non caricata. Ricaricare la pagina.');
        }
        
        console.log('📄 Export in nuovo file');
        
        // Crea workbook con più fogli
        const wb = XLSX.utils.book_new();
        
        // Foglio 1: Riepilogo
        const summaryData = this.createSummarySheet(orders);
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Riepilogo');
        
        // Foglio 2: Dettagli ordini
        const detailsData = this.createDetailsSheet(orders);
        const detailsSheet = XLSX.utils.aoa_to_sheet(detailsData);
        this.applyDetailsFormatting(detailsSheet);
        XLSX.utils.book_append_sheet(wb, detailsSheet, 'Dettagli');
        
        // Foglio 3: Analisi per cliente
        const clientData = this.createClientAnalysisSheet(orders);
        const clientSheet = XLSX.utils.aoa_to_sheet(clientData);
        XLSX.utils.book_append_sheet(wb, clientSheet, 'Analisi Clienti');
        
        // Salva file con data
        const fileName = `Ordini_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        // Mostra messaggio di successo
        const stats = this.calculateExportStats(orders);
        window.ExportDialogManager.showMessage(
          `Export completato!<br><br>
          File: <strong>${fileName}</strong><br>
          Ordini esportati: ${stats.orderCount}<br>
          Righe totali: ${stats.productCount}<br>
          Totale importo: €${stats.totalAmount.toFixed(2)}`,
          'success'
        );
        
        // Chiudi dialog export dopo 2 secondi
        setTimeout(() => {
          window.ExportDialogManager.closeExportDialog();
        }, 2000);
        
      } catch (error) {
        console.error('Errore durante l\'esportazione:', error);
        window.ExportDialogManager.showMessage(
          'Errore durante l\'esportazione: ' + error.message, 
          'error'
        );
      }
    }

    /**
     * Importa file ORDINI esistente
     */
    importVendutoFromFile(file) {
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {type: 'array'});
          
          // Cerca il foglio ORDINI
          const sheetName = workbook.SheetNames.find(name => 
            name.toUpperCase() === 'ORDINI'
          ) || workbook.SheetNames[0];
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ''});
          
          if (jsonData.length > 1) {
            // Rimuovi header
            const dataRows = jsonData.slice(1);
            
            // Salva nel localStorage
            localStorage.setItem('ordiniFileData', JSON.stringify(dataRows));
            
            window.ExportDialogManager.showMessage(
              `File ORDINI importato con successo!<br><br>
              Righe importate: <strong>${dataRows.length}</strong>`,
              'success'
            );
            
            // Chiudi dialog e ricarica dopo 2 secondi
            setTimeout(() => {
              window.ExportDialogManager.closeDialog('sync');
              location.reload();
            }, 2000);
            
          } else {
            window.ExportDialogManager.showMessage(
              'Il file selezionato non contiene dati validi.',
              'error'
            );
          }
        } catch (error) {
          console.error('Errore durante l\'importazione:', error);
          window.ExportDialogManager.showMessage(
            'Errore durante l\'importazione del file: ' + error.message,
            'error'
          );
        }
      };
      reader.readAsArrayBuffer(file);
    }

    /**
     * Crea foglio riepilogo
     */
    createSummarySheet(orders) {
      const today = new Date().toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const stats = this.calculateExportStats(orders);
      
      return [
        ['RIEPILOGO ESPORTAZIONE ORDINI'],
        [''],
        ['Data esportazione:', today],
        ['Ora esportazione:', new Date().toLocaleTimeString('it-IT')],
        [''],
        ['STATISTICHE GENERALI'],
        ['Numero ordini:', stats.orderCount],
        ['Numero prodotti totali:', stats.productCount],
        ['Valore totale ordini:', '€' + stats.totalAmount.toFixed(2)],
        [''],
        ['ANALISI PER CLIENTE'],
        ['Clienti unici:', stats.uniqueClients],
        ['Ordine medio per cliente:', '€' + (stats.totalAmount / stats.uniqueClients).toFixed(2)],
        [''],
        ['ANALISI PRODOTTI'],
        ['Prodotti unici:', stats.uniqueProducts],
        ['Quantità media per ordine:', (stats.totalQuantity / stats.orderCount).toFixed(1)],
        ['Valore medio per prodotto:', '€' + (stats.totalAmount / stats.productCount).toFixed(2)]
      ];
    }

    /**
     * Crea foglio dettagli
     */
    createDetailsSheet(orders) {
      const headers = [
        'N° Ordine',
        'Data Ordine',
        'Cliente',
        'Indirizzo Consegna',
        'P.IVA',
        'Data Consegna',
        'Codice Prodotto',
        'Prodotto',
        'Quantità',
        'Prezzo Unitario',
        'S.M.',
        'Sconto %',
        'Importo'
      ];
      
      const rows = [headers];
      
      orders.forEach(order => {
        if (order.products && order.products.length > 0) {
          order.products.forEach(product => {
            const quantity = this.parseNumber(product.quantity);
            const unitPrice = this.parseNumber(product.unitPrice || product.price);
            const sm = this.parseNumber(product.sm);
            const discount = this.parseNumber(product.discount);
            const amount = this.calculateAmount(quantity, unitPrice, sm, discount);
            
            rows.push([
              order.orderNumber || '',
              order.orderDate || '',
              order.clientName || '',
              this.cleanAddress(order.deliveryAddress || order.address, order.clientName),
              order.vatNumber || '',
              order.deliveryDate || '',
              product.code || '',
              product.description || '',
              quantity,
              unitPrice,
              sm || 0,
              discount || 0,
              amount
            ]);
          });
        }
      });
      
      return rows;
    }

    /**
     * Crea foglio analisi clienti
     */
    createClientAnalysisSheet(orders) {
      const clientMap = new Map();
      
      // Aggrega dati per cliente
      orders.forEach(order => {
        if (!clientMap.has(order.clientName)) {
          clientMap.set(order.clientName, {
            orders: 0,
            products: 0,
            totalAmount: 0,
            vatNumber: order.vatNumber || ''
          });
        }
        
        const clientData = clientMap.get(order.clientName);
        clientData.orders++;
        
        if (order.products) {
          order.products.forEach(product => {
            clientData.products++;
            const quantity = this.parseNumber(product.quantity);
            const unitPrice = this.parseNumber(product.unitPrice || product.price);
            const sm = this.parseNumber(product.sm);
            const discount = this.parseNumber(product.discount);
            clientData.totalAmount += this.calculateAmount(quantity, unitPrice, sm, discount);
          });
        }
      });
      
      // Converti in array e ordina per fatturato
      const clientArray = Array.from(clientMap.entries())
        .map(([name, data]) => ({name, ...data}))
        .sort((a, b) => b.totalAmount - a.totalAmount);
      
      // Crea righe
      const headers = ['Cliente', 'P.IVA', 'N° Ordini', 'N° Prodotti', 'Fatturato Totale', 'Media per Ordine'];
      const rows = [headers];
      
      clientArray.forEach(client => {
        rows.push([
          client.name,
          client.vatNumber,
          client.orders,
          client.products,
          client.totalAmount.toFixed(2),
          (client.totalAmount / client.orders).toFixed(2)
        ]);
      });
      
      return rows;
    }

    /**
     * Applica formattazione al foglio dettagli
     */
    applyDetailsFormatting(worksheet) {
      worksheet['!cols'] = [
        {wch: 15}, // N° Ordine
        {wch: 12}, // Data Ordine
        {wch: 30}, // Cliente
        {wch: 40}, // Indirizzo
        {wch: 15}, // P.IVA
        {wch: 12}, // Data Consegna
        {wch: 15}, // Codice Prodotto
        {wch: 40}, // Prodotto
        {wch: 10}, // Quantità
        {wch: 12}, // Prezzo
        {wch: 8},  // S.M.
        {wch: 8},  // Sconto %
        {wch: 12}  // Importo
      ];
    }

    /**
     * Calcola statistiche export
     */
    calculateExportStats(orders) {
      const stats = {
        orderCount: orders.length,
        productCount: 0,
        totalAmount: 0,
        totalQuantity: 0,
        uniqueClients: new Set(),
        uniqueProducts: new Set()
      };
      
      orders.forEach(order => {
        stats.uniqueClients.add(order.clientName);
        
        if (order.products) {
          stats.productCount += order.products.length;
          
          order.products.forEach(product => {
            stats.uniqueProducts.add(product.code);
            const quantity = this.parseNumber(product.quantity);
            const unitPrice = this.parseNumber(product.unitPrice || product.price);
            const sm = this.parseNumber(product.sm);
            const discount = this.parseNumber(product.discount);
            
            stats.totalQuantity += quantity;
            stats.totalAmount += this.calculateAmount(quantity, unitPrice, sm, discount);
          });
        }
      });
      
      stats.uniqueClients = stats.uniqueClients.size;
      stats.uniqueProducts = stats.uniqueProducts.size;
      
      return stats;
    }

    /**
     * Utilities
     */
    parseNumber(value) {
      if (!value) return 0;
      return parseFloat(value.toString().replace(',', '.').replace('%', '')) || 0;
    }

    cleanAddress(address, clientName) {
      if (!address) return '';
      if (!clientName) return address;
      
      const clientNamePattern = new RegExp('^' + clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i');
      return address.replace(clientNamePattern, '').trim();
    }

    calculateAmount(quantity, unitPrice, sm, discount) {
      let effectiveQuantity = quantity - sm;
      if (effectiveQuantity < 0) effectiveQuantity = 0;
      
      let amount = effectiveQuantity * unitPrice;
      if (discount > 0) {
        amount = amount * (1 - discount / 100);
      }
      
      return amount;
    }
  }

  // Espone la classe globalmente
  window.FileIOManager = new FileIOManager();
})();