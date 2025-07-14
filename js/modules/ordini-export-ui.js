/**
 * Ordini Export UI Module
 * Gestione dialog, modal e interfaccia utente
 */

window.OrdiniExportUI = {
  /**
   * Mostra il dialog con le opzioni di esportazione
   */
  showExportDialog: function(orders) {
    // Crea il dialog modale
    const modal = document.createElement('div');
    modal.id = 'exportDialogModal';
    modal.className = 'modal';
    modal.style.cssText = 'display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = 'background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 500px; border-radius: 8px;';
    
    modalContent.innerHTML = `
      <span class="close" onclick="OrdiniExportUI.closeExportDialog()" style="float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
      <h3 style="margin-top: 0;">Esportazione Ordini</h3>
      <p>Seleziona la modalità di esportazione:</p>
      
      <div style="margin: 20px 0;">
        <button class="btn btn-primary" onclick="OrdiniExportUI.handleExportNew()" style="margin-right: 10px;">
          📄 Esporta in nuovo file
        </button>
        
        <button class="btn btn-success" onclick="OrdiniExportUI.handleExportOrdini()">
          📊 Aggiungi al file ORDINI
        </button>
      </div>
      
      <p><small>Note: Il file ORDINI è un file permanente dove vengono aggiunti i nuovi dati senza sovrascrivere quelli esistenti.</small></p>
      
      <button class="btn btn-secondary" onclick="OrdiniExportUI.closeExportDialog()">
        ❌ Annulla
      </button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Salva riferimento agli ordini per l'export
    this._ordersToExport = orders;
  },
  
  /**
   * Gestione export in nuovo file
   */
  handleExportNew: function() {
    this.closeExportDialog();
    OrdiniExportCore.exportToNewFile(this._ordersToExport);
  },
  
  /**
   * Gestione export nel file ORDINI
   */
  handleExportOrdini: function() {
    this.closeExportDialog();
    OrdiniExportVenduto.exportToOrdiniFile(this._ordersToExport);
  },
  
  /**
   * Chiude il dialog di export
   */
  closeExportDialog: function() {
    const modal = document.getElementById('exportDialogModal');
    if (modal) {
      document.body.removeChild(modal);
    }
  },
  
  /**
   * Mostra i risultati dell'export
   */
  showExportResults: function(rowCount, total, orderCount) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'display: block; position: fixed; z-index: 1001; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = 'background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 400px; border-radius: 8px; text-align: center;';
    
    modalContent.innerHTML = `
      <h3 style="color: #28a745;">✅ Export Completato!</h3>
      <div style="margin: 20px 0;">
        <p><strong>Ordini esportati:</strong> ${orderCount}</p>
        <p><strong>Righe totali:</strong> ${rowCount}</p>
        <p><strong>Totale importo:</strong> €${total.toFixed(2)}</p>
      </div>
      <button class="btn btn-primary" onclick="this.closest('.modal').remove()">OK</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  },
  
  /**
   * Mostra dialog per gestire i duplicati
   */
  showDuplicatesDialog: function(duplicateCheck, existingData, orderData, totaleRealeExcel) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'display: block; position: fixed; z-index: 1002; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = 'background-color: #fefefe; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 900px; max-height: 80vh; overflow-y: auto; border-radius: 8px;';
    
    // Calcola totale dei duplicati
    let duplicatesTotalAmount = 0;
    duplicateCheck.duplicates.forEach(dup => {
      duplicatesTotalAmount += parseFloat(dup.amount) || 0;
    });
    
    modalContent.innerHTML = `
      <span class="close" onclick="this.closest('.modal').remove()" style="float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
      <h3 style="color: #dc3545;">⚠️ Attenzione: Trovati Duplicati!</h3>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
        <p style="margin: 0; color: #856404;">
          <strong>${duplicateCheck.totalDuplicates}</strong> righe su ${duplicateCheck.totalNew} sono già presenti nel file ORDINI.
        </p>
        <p style="margin: 10px 0 0 0; color: #856404;">
          Valore totale duplicati: <strong>€${duplicatesTotalAmount.toFixed(2)}</strong>
        </p>
      </div>
      
      <div style="margin: 20px 0;">
        <h4>Righe Duplicate:</h4>
        <div style="max-height: 300px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 5px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead style="position: sticky; top: 0; background-color: #f8f9fa;">
              <tr>
                <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">N° Ordine</th>
                <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Codice</th>
                <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Descrizione</th>
                <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Cliente</th>
                <th style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">Importo</th>
              </tr>
            </thead>
            <tbody>
              ${duplicateCheck.duplicates.map(dup => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${dup.orderNumber}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${dup.productCode}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${dup.description}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${dup.client}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">€${parseFloat(dup.amount).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div style="margin: 20px 0; text-align: center;">
        <p style="margin-bottom: 20px;"><strong>Cosa vuoi fare?</strong></p>
        <button class="btn btn-primary" onclick="OrdiniExportUI.proceedWithoutDuplicates()" style="margin: 0 10px;">
          ✅ Procedi SENZA Duplicati
          <br><small>(Aggiungi solo le ${duplicateCheck.uniqueNewData.length} righe nuove)</small>
        </button>
        <button class="btn btn-warning" onclick="OrdiniExportUI.proceedWithAllData()" style="margin: 0 10px;">
          ⚠️ Aggiungi TUTTO
          <br><small>(Includi anche i duplicati)</small>
        </button>
        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()" style="margin: 0 10px;">
          ❌ Annulla
        </button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Salva i dati temporaneamente per le azioni
    this._tempDuplicateData = {
      existingData: existingData,
      orderData: orderData,
      uniqueNewData: duplicateCheck.uniqueNewData,
      allNewData: orderData.slice(1)
    };
  },
  
  /**
   * Procedi aggiungendo solo i dati non duplicati
   */
  proceedWithoutDuplicates: function() {
    // Chiudi il modal
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
    
    if (!this._tempDuplicateData) return;
    
    const { existingData, orderData, uniqueNewData } = this._tempDuplicateData;
    
    // Combina solo i dati unici
    const combinedData = [
      orderData[0], // Header
      ...existingData,
      ...uniqueNewData
    ];
    
    // Continua con l'export
    OrdiniExportVenduto.finishOrdiniExport(combinedData, uniqueNewData.length);
    
    // Pulisci dati temporanei
    this._tempDuplicateData = null;
  },
  
  /**
   * Procedi aggiungendo tutti i dati (inclusi duplicati)
   */
  proceedWithAllData: function() {
    // Chiudi il modal
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
    
    if (!this._tempDuplicateData) return;
    
    const { existingData, orderData, allNewData } = this._tempDuplicateData;
    
    // Combina tutti i dati
    const combinedData = [
      orderData[0], // Header
      ...existingData,
      ...allNewData
    ];
    
    // Continua con l'export
    OrdiniExportVenduto.finishOrdiniExport(combinedData, allNewData.length);
    
    // Pulisci dati temporanei
    this._tempDuplicateData = null;
  },
  
  /**
   * Mostra modal con il contenuto del file ORDINI
   */
  showOrdiniContentModal: function(stats, totalRows) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'display: block; position: fixed; z-index: 1001; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = 'background-color: #fefefe; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 800px; max-height: 80vh; overflow-y: auto; border-radius: 8px;';
    
    if (!stats) {
      modalContent.innerHTML = `
        <span class="close" onclick="this.closest('.modal').remove()" style="float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
        <h3>📋 File ORDINI</h3>
        <p style="color: #666; margin-top: 20px;">Il file ORDINI è vuoto. Nessun dato salvato.</p>
        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()" style="margin-top: 20px;">Chiudi</button>
      `;
    } else {
      const ordersArray = Array.from(stats.ordersMap.values());
      ordersArray.sort((a, b) => b.date.localeCompare(a.date));
      
      modalContent.innerHTML = `
        <span class="close" onclick="this.closest('.modal').remove()" style="float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
        <h3>📋 Contenuto File ORDINI</h3>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <h4 style="margin-top: 0;">Riepilogo Generale</h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            <div><strong>Righe totali:</strong> ${totalRows}</div>
            <div><strong>Ordini:</strong> ${stats.ordersMap.size}</div>
            <div><strong>Clienti diversi:</strong> ${stats.uniqueClients.size}</div>
            <div><strong>Prodotti diversi:</strong> ${stats.uniqueProducts.size}</div>
            <div><strong>Quantità totale:</strong> ${stats.totalQuantity.toFixed(0)}</div>
            <div><strong>Importo totale:</strong> €${stats.totalAmount.toFixed(2)}</div>
            <div><strong>Periodo:</strong> ${stats.dateRange.min || 'N/A'} - ${stats.dateRange.max || 'N/A'}</div>
          </div>
        </div>
        
        <div style="margin: 20px 0;">
          <h4>Ultimi 10 Ordini</h4>
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
              ${ordersArray.slice(0, 10).map(order => `
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
          ${ordersArray.length > 10 ? `<p style="margin-top: 10px; color: #666;">...e altri ${ordersArray.length - 10} ordini</p>` : ''}
        </div>
        
        <div style="margin-top: 20px; display: flex; gap: 10px;">
          <button class="btn btn-danger" onclick="if(confirm('Sei sicuro di voler cancellare tutto il contenuto del file ORDINI?')) { localStorage.removeItem('vendutoFileData'); alert('File ORDINI cancellato'); this.closest('.modal').remove(); }">
            🗑️ Cancella File ORDINI
          </button>
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
            Chiudi
          </button>
        </div>
      `;
    }
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  },
  
  /**
   * Mostra i risultati dell'aggiornamento ORDINI
   */
  showOrdiniResults: function(totalRows, newRows, grandTotal) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'display: block; position: fixed; z-index: 1001; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = 'background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 400px; border-radius: 8px; text-align: center;';
    
    modalContent.innerHTML = `
      <h3 style="color: #28a745;">✅ File ORDINI Aggiornato!</h3>
      <div style="margin: 20px 0;">
        <p><strong>Righe totali nel file:</strong> ${totalRows}</p>
        <p><strong>Nuove righe aggiunte:</strong> ${newRows}</p>
        <p><strong>Totale complessivo:</strong> €${grandTotal.toFixed(2)}</p>
      </div>
      <button class="btn btn-primary" onclick="this.closest('.modal').remove()">OK</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  },
  
  /**
   * Mostra dialog per sincronizzazione con file ORDINI esistente
   */
  showSyncDialog: function() {
    const modal = document.createElement('div');
    modal.id = 'syncDialogModal';
    modal.className = 'modal';
    modal.style.cssText = 'display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = 'background-color: #fefefe; margin: 10% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 600px; border-radius: 8px;';
    
    modalContent.innerHTML = `
      <span class="close" onclick="OrdiniExportUI.closeSyncDialog()" style="float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
      <h3 style="margin-top: 0;">🔄 Sincronizzazione File ORDINI</h3>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        <h4 style="margin-top: 0;">Operazioni disponibili:</h4>
        <ul style="margin: 10px 0;">
          <li><strong>Importa file esistente:</strong> Carica un file ORDINI.xlsx per sincronizzare il localStorage</li>
          <li><strong>Visualizza contenuto:</strong> Mostra i dati attualmente salvati</li>
          <li><strong>Reset completo:</strong> Cancella tutti i dati salvati</li>
        </ul>
      </div>
      
      <div style="margin: 20px 0;">
        <input type="file" id="syncFileInput" accept=".xlsx" style="display: none;">
        
        <button class="btn btn-primary" onclick="document.getElementById('syncFileInput').click()" style="margin: 5px;">
          📁 Importa file ORDINI.xlsx
        </button>
        
        <button class="btn btn-info" onclick="OrdiniExportVenduto.viewOrdiniContent(); OrdiniExportUI.closeSyncDialog()" style="margin: 5px;">
          👁️ Visualizza contenuto salvato
        </button>
        
        <button class="btn btn-warning" onclick="OrdiniExportUI.handleResetOrdini()" style="margin: 5px;">
          🗑️ Reset completo
        </button>
      </div>
      
      <div id="syncStatus" style="margin: 20px 0; display: none;">
        <!-- Messaggi di stato verranno mostrati qui -->
      </div>
      
      <button class="btn btn-secondary" onclick="OrdiniExportUI.closeSyncDialog()">
        ❌ Chiudi
      </button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Setup file input listener
    const fileInput = document.getElementById('syncFileInput');
    fileInput.addEventListener('change', async function(e) {
      if (e.target.files && e.target.files[0]) {
        await OrdiniExportVenduto.syncWithExistingOrdini(e.target.files[0]);
        OrdiniExportUI.closeSyncDialog();
      }
    });
  },
  
  /**
   * Chiude il dialog di sincronizzazione
   */
  closeSyncDialog: function() {
    const modal = document.getElementById('syncDialogModal');
    if (modal) {
      document.body.removeChild(modal);
    }
  },
  
  /**
   * Gestisce il reset completo del file ORDINI
   */
  handleResetOrdini: function() {
    if (confirm('⚠️ ATTENZIONE\n\nQuesto cancellerà TUTTI i dati salvati del file ORDINI.\n\nSei sicuro di voler procedere?')) {
      localStorage.removeItem('vendutoFileData');
      
      // Mostra messaggio di conferma
      const statusDiv = document.getElementById('syncStatus');
      if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
          <div style="padding: 15px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; color: #155724;">
            ✅ Reset completato! Tutti i dati del file ORDINI sono stati cancellati.
          </div>
        `;
      }
      
      setTimeout(() => {
        this.closeSyncDialog();
      }, 2000);
    }
  },
  
  /**
   * Mostra modal di caricamento
   */
  showLoadingModal: function(message) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'display: block; position: fixed; z-index: 2000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = 'background-color: #fefefe; margin: 20% auto; padding: 20px; border: 1px solid #888; width: 300px; border-radius: 8px; text-align: center;';
    
    modalContent.innerHTML = `
      <div style="margin: 20px 0;">
        <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
        <p>${message}</p>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    return modal;
  },
  
  /**
   * Mostra i risultati della sincronizzazione
   */
  showSyncResults: function(rowCount, stats) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'display: block; position: fixed; z-index: 1001; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = 'background-color: #fefefe; margin: 10% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 500px; border-radius: 8px;';
    
    modalContent.innerHTML = `
      <h3 style="color: #28a745;">✅ Sincronizzazione Completata!</h3>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        <h4 style="margin-top: 0;">Dati importati:</h4>
        <p><strong>Righe totali:</strong> ${rowCount}</p>
        <p><strong>Ordini:</strong> ${stats.ordersMap.size}</p>
        <p><strong>Clienti diversi:</strong> ${stats.uniqueClients.size}</p>
        <p><strong>Prodotti diversi:</strong> ${stats.uniqueProducts.size}</p>
        <p><strong>Importo totale:</strong> €${stats.totalAmount.toFixed(2)}</p>
        <p><strong>Periodo:</strong> ${stats.dateRange.min || 'N/A'} - ${stats.dateRange.max || 'N/A'}</p>
      </div>
      
      <p style="color: #666;">Il localStorage è stato aggiornato con i dati del file ORDINI.</p>
      
      <button class="btn btn-primary" onclick="this.closest('.modal').remove()">OK</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }
};