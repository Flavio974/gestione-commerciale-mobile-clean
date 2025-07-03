/**
 * Ordini Export Dropbox Module
 * Gestisce l'export del file ORDINI.xlsx per Dropbox
 */

(function() {
  'use strict';

  class DropboxExporter {
    constructor() {
      this.defaultPath = 'C:\\Users\\FLAVIO\\Dropbox\\2025\\CARTELLA_MIA_APPLICAZIONE\\ORDINI';
    }

    /**
     * Esporta gli ordini nel formato ORDINI.xlsx
     */
    exportToOrdiniFile(orders) {
      try {
        if (!window.XLSX) {
          throw new Error('Libreria XLSX non caricata. Ricaricare la pagina.');
        }
        
        console.log('🚀 Inizio export ORDINI.xlsx');
        console.log(`Ordini da esportare: ${orders.length}`);
        
        // Prepara i dati nel formato richiesto
        const data = this.prepareOrdiniData(orders);
        
        // Crea workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Applica formattazione colonne
        this.applyOrdiniFormatting(ws);
        
        XLSX.utils.book_append_sheet(wb, ws, 'Ordini');
        
        // Salva file con nome fisso ORDINI.xlsx
        XLSX.writeFile(wb, 'ORDINI.xlsx');
        
        // Mostra messaggio di successo con statistiche
        const stats = this.calculateStats(orders);
        this.showSuccessMessage(stats);
        
        return { success: true, stats };
        
      } catch (error) {
        console.error('Errore durante l\'esportazione:', error);
        throw error;
      }
    }

    /**
     * Prepara i dati nel formato standard ORDINI
     */
    prepareOrdiniData(orders) {
      const headers = [
        'Numero Ordine',
        'Data Ordine',
        'Tipo Documento',
        'Numero documento',
        'Data Documento',
        'Codice Cliente',
        'Descrizione Cliente',
        'Indirizzo di Consegna',
        'P.Iva',
        'Codice Prodotto',
        'Descrizione Prodotto',
        'Pezzi',
        'Prezzo Unitario',
        'Sconto (%)',
        'S.M.',
        'Importo'
      ];
      
      const rows = [headers];
      let totale = 0;
      let righeEsportate = 0;
      
      orders.forEach(order => {
        if (order.products && order.products.length > 0) {
          order.products.forEach(product => {
            // Parsing valori numerici
            const quantity = this.parseNumber(product.quantity);
            const unitPrice = this.parseNumber(product.unitPrice || product.price);
            const sm = this.parseNumber(product.sm);
            const discount = this.parseNumber(product.discount);
            
            // Calcola importo
            const importo = this.calculateAmount(quantity, unitPrice, sm, discount);
            totale += importo;
            righeEsportate++;
            
            // Pulisci l'indirizzo
            const cleanAddress = this.cleanAddress(order.deliveryAddress || order.address, order.clientName);
            
            rows.push([
              order.orderNumber || '',                    // 1. Numero Ordine
              this.formatDate(order.orderDate),          // 2. Data Ordine
              'ORDINE',                                  // 3. Tipo Documento
              '',                                        // 4. Numero documento
              this.formatDate(order.orderDate),          // 5. Data Documento
              order.clientCode || '',                    // 6. Codice Cliente
              order.clientName || '',                    // 7. Descrizione Cliente
              cleanAddress,                              // 8. Indirizzo di Consegna
              order.vatNumber || '',                     // 9. P.Iva
              product.code || '',                        // 10. Codice Prodotto
              product.description || '',                 // 11. Descrizione Prodotto
              quantity,                                  // 12. Pezzi
              unitPrice,                                 // 13. Prezzo Unitario
              discount || 0,                             // 14. Sconto (%)
              sm || 0,                                   // 15. S.M.
              importo                                    // 16. Importo
            ]);
          });
        }
      });
      
      // Salva statistiche per il messaggio di successo
      this._lastExportStats = { righeEsportate, totale };
      
      return rows;
    }

    /**
     * Applica la formattazione alle colonne
     */
    applyOrdiniFormatting(worksheet) {
      worksheet['!cols'] = [
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
    }

    /**
     * Calcola statistiche per il report
     */
    calculateStats(orders) {
      let totalProducts = 0;
      let totalAmount = 0;
      
      orders.forEach(order => {
        if (order.products) {
          totalProducts += order.products.length;
          order.products.forEach(product => {
            const quantity = this.parseNumber(product.quantity);
            const unitPrice = this.parseNumber(product.unitPrice || product.price);
            const sm = this.parseNumber(product.sm);
            const discount = this.parseNumber(product.discount);
            totalAmount += this.calculateAmount(quantity, unitPrice, sm, discount);
          });
        }
      });
      
      return {
        orderCount: orders.length,
        productCount: totalProducts,
        totalAmount: totalAmount
      };
    }

    /**
     * Mostra messaggio di successo con istruzioni
     */
    showSuccessMessage(stats) {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.cssText = 'display: block; position: fixed; z-index: 1001; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
      
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.style.cssText = 'background-color: #fefefe; margin: 10% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 600px; border-radius: 8px;';
      
      modalContent.innerHTML = `
        <h3 style="color: #28a745;">✅ Export Completato!</h3>
        <div style="margin: 20px 0;">
          <p><strong>File creato:</strong> ORDINI.xlsx</p>
          <p><strong>Ordini esportati:</strong> ${stats.orderCount}</p>
          <p><strong>Righe totali:</strong> ${stats.productCount}</p>
          <p><strong>Totale importo:</strong> €${stats.totalAmount.toFixed(2)}</p>
        </div>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #e7f3ff; border-radius: 5px;">
          <h4 style="margin-top: 0; color: #0066cc;">📁 Salva il file in Dropbox:</h4>
          <p style="margin: 10px 0;">1. Il file ORDINI.xlsx è stato scaricato nella cartella Download</p>
          <p style="margin: 10px 0;">2. Sposta o copia il file in:</p>
          <code style="display: block; background: #f0f0f0; padding: 10px; border-radius: 3px; margin: 10px 0;">
            ${this.defaultPath}
          </code>
          <p style="margin: 10px 0;">3. Sostituisci il file esistente se richiesto</p>
        </div>
        
        <button class="btn btn-primary" onclick="this.closest('.modal').remove()">OK</button>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
    }

    /**
     * Utilities
     */
    parseNumber(value) {
      if (!value) return 0;
      return parseFloat(value.toString().replace(',', '.').replace('%', '')) || 0;
    }

    formatDate(date) {
      if (!date) return '';
      // Assume il formato sia già corretto (gg/mm/aaaa)
      return date;
    }

    cleanAddress(address, clientName) {
      if (!address) return '';
      if (!clientName) return address;
      
      // Rimuovi il nome del cliente dall'inizio dell'indirizzo se presente
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
  window.DropboxExporter = new DropboxExporter();
})();