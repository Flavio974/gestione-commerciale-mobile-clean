/**
 * Ordini Export Analytics Module
 * Gestisce l'analisi e la visualizzazione dei dati VENDUTO
 */

(function() {
  'use strict';

  class VendutoAnalytics {
    constructor() {
      this.vendutoData = [];
    }

    /**
     * Visualizza il contenuto del file VENDUTO
     */
    viewVendutoContent() {
      console.log('📋 Visualizzazione contenuto file VENDUTO...');
      
      // Recupera dati dal localStorage
      const savedVenduto = localStorage.getItem('vendutoFileData');
      if (!savedVenduto) {
        window.ExportDialogManager.showMessage('Il file VENDUTO è vuoto. Nessun dato salvato.', 'warning');
        return;
      }
      
      try {
        const data = JSON.parse(savedVenduto);
        this.vendutoData = data;
        
        // Analizza i dati
        const stats = this.analyzeData(data);
        
        // Mostra il viewer
        this.showVendutoViewer(data, stats);
        
      } catch (e) {
        console.error('Errore nel caricamento dati VENDUTO:', e);
        window.ExportDialogManager.showMessage('Errore nel caricamento del file VENDUTO', 'error');
      }
    }

    /**
     * Analizza i dati VENDUTO
     */
    analyzeData(data) {
      const stats = {
        ordersMap: new Map(),
        totalAmount: 0,
        totalQuantity: 0,
        uniqueProducts: new Set(),
        uniqueClients: new Set(),
        monthlyData: new Map(),
        clientStats: new Map(),
        productStats: new Map()
      };
      
      data.forEach(row => {
        const orderNum = row[0];
        const orderDate = row[1];
        const client = row[2];
        const productCode = row[6];
        const quantity = parseFloat(row[8]) || 0;
        const amount = parseFloat(row[12]) || 0;
        
        // Aggrega per ordine
        if (!stats.ordersMap.has(orderNum)) {
          stats.ordersMap.set(orderNum, {
            orderNumber: orderNum,
            client: client,
            date: orderDate,
            products: 0,
            totalAmount: 0
          });
        }
        
        const orderInfo = stats.ordersMap.get(orderNum);
        orderInfo.products++;
        orderInfo.totalAmount += amount;
        
        // Statistiche globali
        stats.totalAmount += amount;
        stats.totalQuantity += quantity;
        stats.uniqueProducts.add(productCode);
        stats.uniqueClients.add(client);
        
        // Statistiche mensili
        const monthKey = this.getMonthKey(orderDate);
        if (!stats.monthlyData.has(monthKey)) {
          stats.monthlyData.set(monthKey, { orders: 0, amount: 0 });
        }
        stats.monthlyData.get(monthKey).amount += amount;
        
        // Statistiche per cliente
        if (!stats.clientStats.has(client)) {
          stats.clientStats.set(client, { orders: new Set(), amount: 0 });
        }
        stats.clientStats.get(client).orders.add(orderNum);
        stats.clientStats.get(client).amount += amount;
        
        // Statistiche per prodotto
        if (!stats.productStats.has(productCode)) {
          stats.productStats.set(productCode, { quantity: 0, amount: 0, description: row[7] });
        }
        stats.productStats.get(productCode).quantity += quantity;
        stats.productStats.get(productCode).amount += amount;
      });
      
      return stats;
    }

    /**
     * Mostra il viewer con i dati VENDUTO
     */
    showVendutoViewer(data, stats) {
      // Chiudi eventuali dialog aperti
      window.ExportDialogManager.closeAllDialogs();
      
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.cssText = 'display: block; position: fixed; z-index: 1001; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
      
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.style.cssText = 'background-color: #fefefe; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 1200px; max-height: 90vh; overflow-y: auto; border-radius: 8px;';
      
      // Prepara dati per visualizzazione
      const ordersArray = Array.from(stats.ordersMap.values());
      ordersArray.sort((a, b) => b.date.localeCompare(a.date));
      
      const topClients = Array.from(stats.clientStats.entries())
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 10);
      
      const topProducts = Array.from(stats.productStats.entries())
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 10);
      
      modalContent.innerHTML = `
        <span class="close" onclick="this.closest('.modal').remove()" style="float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
        <h3>📋 Contenuto File VENDUTO</h3>
        
        <!-- Riepilogo Generale -->
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <h4 style="margin-top: 0;">Riepilogo Generale</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div>
              <strong>Righe totali:</strong><br>
              <span style="font-size: 24px; color: #007bff;">${data.length}</span>
            </div>
            <div>
              <strong>Ordini unici:</strong><br>
              <span style="font-size: 24px; color: #28a745;">${stats.ordersMap.size}</span>
            </div>
            <div>
              <strong>Clienti diversi:</strong><br>
              <span style="font-size: 24px; color: #17a2b8;">${stats.uniqueClients.size}</span>
            </div>
            <div>
              <strong>Prodotti diversi:</strong><br>
              <span style="font-size: 24px; color: #ffc107;">${stats.uniqueProducts.size}</span>
            </div>
            <div>
              <strong>Quantità totale:</strong><br>
              <span style="font-size: 24px; color: #6c757d;">${stats.totalQuantity.toFixed(0)}</span>
            </div>
            <div>
              <strong>Importo totale:</strong><br>
              <span style="font-size: 24px; color: #dc3545;">€${stats.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <!-- Tab navigation -->
        <div style="margin: 20px 0;">
          <div style="border-bottom: 2px solid #dee2e6;">
            <button class="tab-btn active" onclick="window.VendutoAnalytics.showTab(this, 'recent-orders')" style="padding: 10px 20px; border: none; background: none; cursor: pointer; border-bottom: 2px solid #007bff;">Ordini Recenti</button>
            <button class="tab-btn" onclick="window.VendutoAnalytics.showTab(this, 'top-clients')" style="padding: 10px 20px; border: none; background: none; cursor: pointer;">Top Clienti</button>
            <button class="tab-btn" onclick="window.VendutoAnalytics.showTab(this, 'top-products')" style="padding: 10px 20px; border: none; background: none; cursor: pointer;">Top Prodotti</button>
            <button class="tab-btn" onclick="window.VendutoAnalytics.showTab(this, 'raw-data')" style="padding: 10px 20px; border: none; background: none; cursor: pointer;">Dati Grezzi</button>
          </div>
        </div>
        
        <!-- Tab content -->
        <div id="tab-content">
          <!-- Ordini Recenti -->
          <div id="recent-orders" class="tab-pane" style="display: block;">
            <h4>Ultimi 20 Ordini</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">N° Ordine</th>
                  <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Data</th>
                  <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Cliente</th>
                  <th style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">Prodotti</th>
                  <th style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">Importo</th>
                </tr>
              </thead>
              <tbody>
                ${ordersArray.slice(0, 20).map(order => `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #dee2e6;">${order.orderNumber}</td>
                    <td style="padding: 8px; border: 1px solid #dee2e6;">${order.date}</td>
                    <td style="padding: 8px; border: 1px solid #dee2e6;">${order.client}</td>
                    <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${order.products}</td>
                    <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">€${order.totalAmount.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${ordersArray.length > 20 ? `<p style="margin-top: 10px; color: #666;">...e altri ${ordersArray.length - 20} ordini</p>` : ''}
          </div>
          
          <!-- Top Clienti -->
          <div id="top-clients" class="tab-pane" style="display: none;">
            <h4>Top 10 Clienti per Fatturato</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Cliente</th>
                  <th style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">N° Ordini</th>
                  <th style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">Fatturato Totale</th>
                  <th style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">% sul Totale</th>
                </tr>
              </thead>
              <tbody>
                ${topClients.map(([client, data]) => {
                  const percentage = (data.amount / stats.totalAmount * 100).toFixed(1);
                  return `
                    <tr>
                      <td style="padding: 8px; border: 1px solid #dee2e6;">${client}</td>
                      <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${data.orders.size}</td>
                      <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">€${data.amount.toFixed(2)}</td>
                      <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${percentage}%</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <!-- Top Prodotti -->
          <div id="top-products" class="tab-pane" style="display: none;">
            <h4>Top 10 Prodotti per Fatturato</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Codice</th>
                  <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Descrizione</th>
                  <th style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">Quantità</th>
                  <th style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">Fatturato</th>
                </tr>
              </thead>
              <tbody>
                ${topProducts.map(([code, data]) => `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #dee2e6;">${code}</td>
                    <td style="padding: 8px; border: 1px solid #dee2e6;">${data.description}</td>
                    <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${data.quantity.toFixed(0)}</td>
                    <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">€${data.amount.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <!-- Dati Grezzi -->
          <div id="raw-data" class="tab-pane" style="display: none;">
            <h4>Dati Grezzi (prime 50 righe)</h4>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 4px; border: 1px solid #dee2e6;">N° Ordine</th>
                    <th style="padding: 4px; border: 1px solid #dee2e6;">Data</th>
                    <th style="padding: 4px; border: 1px solid #dee2e6;">Cliente</th>
                    <th style="padding: 4px; border: 1px solid #dee2e6;">Indirizzo</th>
                    <th style="padding: 4px; border: 1px solid #dee2e6;">P.IVA</th>
                    <th style="padding: 4px; border: 1px solid #dee2e6;">Data Cons.</th>
                    <th style="padding: 4px; border: 1px solid #dee2e6;">Cod.Prod.</th>
                    <th style="padding: 4px; border: 1px solid #dee2e6;">Prodotto</th>
                    <th style="padding: 4px; border: 1px solid #dee2e6;">Q.tà</th>
                    <th style="padding: 4px; border: 1px solid #dee2e6;">Prezzo</th>
                    <th style="padding: 4px; border: 1px solid #dee2e6;">S.M.</th>
                    <th style="padding: 4px; border: 1px solid #dee2e6;">Sc.%</th>
                    <th style="padding: 4px; border: 1px solid #dee2e6;">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.slice(0, 50).map(row => `
                    <tr>
                      ${row.map(cell => `<td style="padding: 4px; border: 1px solid #dee2e6;">${cell || ''}</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ${data.length > 50 ? '<p style="margin-top: 10px; color: #666;">...e altre ' + (data.length - 50) + ' righe</p>' : ''}
            </div>
          </div>
        </div>
        
        <div style="margin-top: 20px; text-align: right;">
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
            Chiudi
          </button>
        </div>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
    }

    /**
     * Gestione tab
     */
    showTab(btn, tabId) {
      // Rimuovi active da tutti i bottoni
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.borderBottom = 'none';
      });
      
      // Aggiungi active al bottone cliccato
      btn.classList.add('active');
      btn.style.borderBottom = '2px solid #007bff';
      
      // Nascondi tutti i tab
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.style.display = 'none';
      });
      
      // Mostra il tab selezionato
      const selectedTab = document.getElementById(tabId);
      if (selectedTab) {
        selectedTab.style.display = 'block';
      }
    }

    /**
     * Ottiene chiave mese per statistiche
     */
    getMonthKey(dateStr) {
      if (!dateStr) return 'N/A';
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}`;
      }
      return dateStr;
    }

    /**
     * Analisi rapida dei dati
     */
    async getQuickStats() {
      const savedVenduto = localStorage.getItem('vendutoFileData');
      if (!savedVenduto) {
        return { totalRows: 0, totalAmount: 0 };
      }
      
      try {
        const data = JSON.parse(savedVenduto);
        let totalAmount = 0;
        data.forEach(row => {
          totalAmount += parseFloat(row[12]) || 0;
        });
        
        return {
          totalRows: data.length,
          totalAmount: totalAmount
        };
      } catch (e) {
        return { totalRows: 0, totalAmount: 0 };
      }
    }
  }

  // Espone la classe globalmente
  window.VendutoAnalytics = new VendutoAnalytics();
})();