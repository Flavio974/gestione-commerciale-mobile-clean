/**
 * Ordini UI Module
 * Gestisce l'interfaccia utente per la gestione ordini
 */

const OrdiniUI = {
  /**
   * Render della sezione principale ordini
   */
  renderOrdersSection: function() {
    const content = document.getElementById('orders-content');
    if (!content) return;
    
    content.innerHTML = `
      <div class="orders-container">
        <div class="orders-header">
          <h2>Gestione Ordini</h2>
          <div class="orders-stats">
            <span id="ordersCount">Totale ordini: 0</span>
          </div>
        </div>
        
        <div class="orders-actions">
          <button id="uploadOrderPdfBtn" class="action-button">
            📄 Importa Ordini da PDF
          </button>
          <button id="exportOrdersExcelBtn" class="action-button">
            📊 Esporta Ordini in Excel
          </button>
          <button id="viewVendutoBtn" class="action-button">
            👁️ Visualizza File VENDUTO
          </button>
          <button id="syncVendutoBtn" class="action-button">
            🔄 Sincronizza File VENDUTO
          </button>
          <button id="debugOrdersBtn" class="action-button">
            🔍 Debug Ordini
          </button>
          <button id="clearOrdersBtn" class="action-button action-button-danger">
            🗑️ Cancella Ordini
          </button>
        </div>
        
        <!-- Sezione per caricamento ordini PDF -->
        <div id="ordersImportSection" style="padding: 20px; display: none;">
          <h3>📄 Caricamento Ordini da PDF</h3>
          
          <!-- Passo 1: Selezione file -->
          <div class="import-step">
            <h4>Passo 1: Seleziona i file PDF</h4>
            <input type="file" id="orderPDFInput" accept=".pdf" multiple style="display: none;">
            <button id="selectOrderPDFBtn" class="action-button">
              📎 Seleziona PDF Ordini
            </button>
            <span id="selectedPDFCount" style="margin-left: 10px;"></span>
          </div>
          
          <!-- Barra di progresso -->
          <div id="processingProgress" style="display: none; margin: 20px 0;">
            <h4>Processamento in corso...</h4>
            <div class="progress-container">
              <div id="progressBar" style="width: 0%;"></div>
            </div>
            <p id="progressText" style="text-align: center; margin-top: 10px; font-weight: bold;">Processando file 0 di 0</p>
            <p id="currentFileText" style="text-align: center; color: #666;">Preparazione...</p>
            <div id="fileProcessingList" style="margin-top: 20px; max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; padding: 10px; display: none;">
              <!-- Lista dei file processati con stato -->
            </div>
          </div>
          
          <!-- Passo 2: Anteprima con Debug -->
          <div id="orderPDFPreview" class="preview-section" style="display: none;">
            <h4>Passo 2: Verifica e modifica</h4>
            
            <!-- Area Debug -->
            <div id="debugArea" style="background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; padding: 10px; margin-bottom: 20px; max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 12px;">
              <h5 style="margin: 0 0 10px 0; color: #d9534f; font-weight: bold;">🔍 DEBUG TOTALE - Analisi dettagliata del parsing PDF</h5>
              <pre id="debugContent" style="margin: 0; white-space: pre-wrap; word-wrap: break-word;"></pre>
            </div>
            
            <div id="ordersPreviewTable">
              <!-- La tabella di anteprima verrà inserita qui -->
            </div>
          </div>
          
          <!-- Passo 3: Conferma importazione -->
          <div id="orderImportConfirm" class="import-step" style="display: none;">
            <h4>Passo 3: Verifica e conferma</h4>
            <div id="orderUploadResults">
              <!-- I risultati dell'importazione verranno visualizzati qui -->
            </div>
            <div class="button-group" style="margin-top: 20px;">
              <button id="confirmOrderUploadBtn" class="btn btn-primary" disabled>
                ✅ Importa nell'Elenco
              </button>
              <button id="cancelOrderUploadBtn" class="btn btn-secondary">
                ❌ Annulla
              </button>
            </div>
          </div>
        </div>
        
        <!-- Sezione Log Conversioni Numeriche -->
        <div id="numericConversionLog" style="display: none; margin: 20px 0; padding: 15px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px;">
          <h3>📊 Log Conversioni Numeriche</h3>
          <div id="numericLogContent" style="font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto; white-space: pre-wrap;"></div>
          <button onclick="OrdiniParser.numericLogBuffer = []; OrdiniParser.updateNumericLogDisplay();" class="btn btn-sm btn-secondary" style="margin-top: 10px;">
            Pulisci Log
          </button>
        </div>
        
        <!-- Tabella ordini -->
        <div class="table-container" style="margin-top: 20px;">
          <table id="ordersTable" class="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" id="selectAllOrders" /></th>
                <th>N° Ordine</th>
                <th>Cliente</th>
                <th>Data Ordine</th>
                <th>Canale</th>
                <th>Stato</th>
                <th>Preferenza Consegna</th>
                <th>Note</th>
                <th>Dettagli</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody id="ordersTableBody">
              <!-- Gli ordini verranno aggiunti qui dinamicamente -->
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Modal per mostrare i dettagli dell'ordine -->
      <div id="orderDetailsModal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 90%; width: 1200px; max-height: 90vh; overflow-y: auto; margin: 5vh auto;">
          <span class="close">&times;</span>
          <h3 style="text-align: center;">Dettagli Ordine</h3>
          <div id="orderDetailsContent" style="padding: 20px;">
            <!-- I dettagli dell'ordine verranno inseriti qui -->
          </div>
        </div>
      </div>
    `;
  },
  
  /**
   * Visualizza la lista degli ordini
   */
  renderOrdersList: function(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    orders.forEach((order, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input type="checkbox" class="order-select" data-order-id="${order.id}">
        </td>
        <td>${order.orderNumber || ''}</td>
        <td>${OrdiniParser.cleanClientName(order.clientName || '')}</td>
        <td>${order.orderDate || ''}</td>
        <td>${order.channel || ''}</td>
        <td>${order.status || 'In attesa'}</td>
        <td>${order.deliveryDate || order.deliveryPreference || ''}</td>
        <td>${order.notes || ''}</td>
        <td>
          <button class="detail-btn" onclick="window.OrdiniUI.showOrderDetails('${order.id}')">📄 Dettagli</button>
        </td>
        <td>
          <button class="edit-btn" onclick="window.OrdiniUI.editOrder('${order.id}')">✏️</button>
          <button class="delete-btn" onclick="window.OrdiniUI.deleteOrder('${order.id}')">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    this.updateOrdersCount(orders.length);
  },
  
  /**
   * Aggiorna il conteggio ordini
   */
  updateOrdersCount: function(count) {
    const countElement = document.getElementById('ordersCount');
    if (countElement) {
      countElement.textContent = `Totale ordini: ${count}`;
    }
  },
  
  /**
   * Mostra i dettagli dell'ordine
   */
  showOrderDetails: function(orderId) {
    console.log('🔍 showOrderDetails chiamato con orderId:', orderId);
    
    if (!window.Ordini || !window.Ordini.state || !window.Ordini.state.orders) {
      console.error('❌ window.Ordini.state.orders non disponibile');
      return;
    }
    
    const order = window.Ordini.state.orders.find(o => o.id === orderId);
    if (!order) {
      console.error('❌ Ordine non trovato con id:', orderId);
      console.log('Ordini disponibili:', window.Ordini.state.orders.map(o => o.id));
      return;
    }
    
    const modal = document.getElementById('orderDetailsModal');
    const content = document.getElementById('orderDetailsContent');
    
    if (!modal || !content) {
      console.error('❌ Elementi modal o content non trovati');
      return;
    }
    
    // Calcola i totali per il riepilogo
    let totalSM = 0;
    let totalImponibile = 0;
    
    if (order.products) {
      order.products.forEach(product => {
        // Calcola totale S.M. (Sconto Merce)
        if (product.sm && product.sm !== '0' && product.sm !== '0,00') {
          const smValue = parseFloat(product.sm.replace(',', '.')) || 0;
          totalSM += smValue;
        }
      });
      
      // Usa il totale dell'ordine se disponibile
      if (order.totalAmount) {
        totalImponibile = parseFloat(order.totalAmount.replace(',', '.')) || 0;
      }
    }
    
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h4>Informazioni Cliente</h4>
        <p><strong>Cliente:</strong> ${OrdiniParser.cleanClientName(order.clientName) || ''}</p>
        ${order.vatNumber && order.vatNumber !== 'N/A' ? `<p><strong>P.IVA:</strong> ${order.vatNumber}</p>` : ''}
        ${order.phone ? `<p><strong>Telefono:</strong> ${order.phone}</p>` : ''}
        ${order.billAddress || order.invoiceAddress || order.address ? `<p><strong>Indirizzo Fatturazione:</strong> ${order.billAddress || order.invoiceAddress || order.address}</p>` : ''}
        ${order.deliveryAddress || order.address ? `<p><strong>Indirizzo Consegna:</strong> ${order.deliveryAddress || order.address}</p>` : ''}
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4>Dettagli Ordine</h4>
        <p><strong>Numero Ordine:</strong> ${order.orderNumber || ''}</p>
        <p><strong>Data Ordine:</strong> ${order.orderDate || ''}</p>
        <p><strong>Data Consegna:</strong> ${order.deliveryDate || ''}</p>
        <p><strong>Canale:</strong> ${order.channel || ''}</p>
        <p><strong>Stato:</strong> ${order.status || 'In attesa'}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4>Riepilogo Totali</h4>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
          <p style="margin: 5px 0;"><strong>Totale Imponibile:</strong> ${order.totalAmount || '0,00'} €</p>
          ${totalSM > 0 ? `<p style="margin: 5px 0;"><strong>Totale Sconto Merce (S.M.):</strong> ${totalSM.toFixed(2).replace('.', ',')} €</p>` : ''}
          <p style="margin: 5px 0; font-size: 1.2em; color: #28a745;"><strong>Totale Documento:</strong> ${order.grandTotal || order.totalAmount || '0,00'} €</p>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4>Prodotti</h4>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 8px; border: 1px solid #dee2e6;">Codice</th>
              <th style="padding: 8px; border: 1px solid #dee2e6;">Descrizione</th>
              <th style="padding: 8px; border: 1px solid #dee2e6;">UdM</th>
              <th style="padding: 8px; border: 1px solid #dee2e6;">Quantità</th>
              <th style="padding: 8px; border: 1px solid #dee2e6;">Prezzo Unit.</th>
              <th style="padding: 8px; border: 1px solid #dee2e6;" title="Sconto Merce">S.M.</th>
              <th style="padding: 8px; border: 1px solid #dee2e6;" title="Sconto Percentuale">Sconto %</th>
              <th style="padding: 8px; border: 1px solid #dee2e6;">Importo</th>
            </tr>
          </thead>
          <tbody>
            ${(order.products || []).map(product => {
              // Formatta i valori per la visualizzazione
              const sm = (product.sm && product.sm !== '0' && product.sm !== '0,00') ? product.sm : '-';
              const discount = (product.discount && product.discount !== '0' && product.discount !== '0,00') ? product.discount + '%' : '-';
              const unitPrice = product.unitPrice || product.price || '0,00';
              
              return `
                <tr>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${product.code || ''}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${product.description || ''}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${product.unit || product.udm || ''}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${product.quantity || ''}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${unitPrice} €</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right; ${sm !== '-' ? 'color: #dc3545; font-weight: bold;' : ''}">${sm}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right; ${discount !== '-' ? 'color: #007bff; font-weight: bold;' : ''}">${discount}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right; font-weight: bold;">${product.total || '0,00'} €</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #e9ecef; font-weight: bold;">
              <td colspan="7" style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">Totale Prodotti:</td>
              <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${order.totalAmount || '0,00'} €</td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top: 10px; font-size: 0.9em; color: #6c757d;">
          <p><strong>Legenda:</strong> S.M. = Sconto Merce (valore in €) | Sconto % = Sconto Percentuale</p>
        </div>
      </div>
      
      <div>
        <h4>Note</h4>
        <p>${order.notes || 'Nessuna nota'}</p>
      </div>
    `;
    
    modal.style.display = 'block';
    
    // Aggiungi evento per chiudere cliccando fuori dal modal
    modal.onclick = function(event) {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    };
  },
  
  /**
   * Mostra preview ordini prima dell'importazione
   */
  displayOrdersPreview: function(ordersData) {
    console.log('Mostra preview di', ordersData.length, 'ordini');
    
    const previewDiv = document.getElementById('ordersPreviewTable');
    if (!previewDiv) {
      console.error('Elemento ordersPreviewTable non trovato');
      return;
    }
    
    if (ordersData.length === 0) {
      previewDiv.innerHTML = '<p style="color: #dc3545;">Nessun ordine valido trovato nei file PDF selezionati.</p>';
      const confirmBtn = document.getElementById('confirmOrderUploadBtn');
      if (confirmBtn) confirmBtn.disabled = true;
      return;
    }
    
    // Calcola totali
    let totalProducts = 0;
    let totalAmount = 0;
    let totalQuantity = 0;
    
    let summaryHTML = `<p>Trovati <strong>${ordersData.length}</strong> ordini da importare:</p>`;
    summaryHTML += '<ul style="list-style-type: none; padding: 0;">';
    
    ordersData.forEach(order => {
      const productCount = order.products ? order.products.length : 0;
      const uniqueProductCount = order.uniqueProductCount || productCount;
      totalProducts += productCount;
      console.log(`Ordine ${order.orderNumber}: ${productCount} prodotti (${uniqueProductCount} referenze diverse)`, order.products);
      
      // Calcola totale corretto
      if (order.totalAmount) {
        totalAmount += parseFloat(order.totalAmount.replace(',', '.')) || 0;
      }
      
      // Calcola quantità totale
      const orderQuantity = parseFloat(order.totalQuantity?.replace(',', '.')) || 0;
      totalQuantity += orderQuantity;
      
      summaryHTML += `
        <li style="margin: 10px 0; padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">
          <div style="font-weight: bold; color: #495057;">
            <span style="color: #007bff;">📄</span> File: ${order.fileName || 'N/A'}
          </div>
          <div style="margin-top: 5px; color: #6c757d;">
            <span style="color: #28a745;">🏢</span> Cliente: ${OrdiniParser.cleanClientName(order.clientName) || 'Non specificato'}
          </div>
          <div style="margin-top: 5px; color: #6c757d;">
            <span style="color: #dc3545;">📍</span> Consegna: ${order.deliveryAddress || 'Non specificato'}
          </div>
          <div style="margin-top: 5px;">
            <div style="display: flex; justify-content: space-between;">
              <span><span style="color: #17a2b8;">📋</span> Ordine N°: ${order.orderNumber || 'N/A'}</span>
              <span><span style="color: #ffc107;">📅</span> Data: ${order.orderDate || 'N/A'}</span>
            </div>
          </div>
          <div style="margin-top: 5px;">
            <span><span style="color: #6610f2;">📦</span> Prodotti: ${order.products?.length || 0} (${order.uniqueProductCount || order.products?.length || 0} ref.)</span>
          </div>
          <div style="margin-top: 5px;">
            <div style="display: flex; justify-content: space-between;">
              <span><span style="color: #fd7e14;">📦</span> Quantità: ${this.formatQuantityDisplay(order)}</span>
              <span><span style="color: #20c997;">💰</span> Imponibile: ${order.totalAmount || '0,00'} €</span>
            </div>
          </div>
          <div style="margin-top: 5px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: bold; color: #28a745;"><span style="color: #dc3545;">💶</span> Totale: ${order.grandTotal || order.totalAmount || '0,00'} €</span>
            </div>
          </div>
        </li>
      `;
    });
    
    summaryHTML += '</ul>';
    summaryHTML += `
      <div style="margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 4px; font-weight: bold;">
        <div style="color: #495057; font-size: 1.1em;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>📊 Totale prodotti:</span>
            <span>${totalProducts}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>📦 Quantità totale:</span>
            <span>${totalQuantity.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>💰 Valore totale:</span>
            <span style="color: #28a745;">${totalAmount.toFixed(2)} €</span>
          </div>
        </div>
      </div>
    `;
    
    previewDiv.innerHTML = summaryHTML;
    
    // Mostra il passo di conferma
    const confirmSection = document.getElementById('orderImportConfirm');
    if (confirmSection) {
      confirmSection.style.display = 'block';
      
      const confirmBtn = document.getElementById('confirmOrderUploadBtn');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = `✅ Importa ${ordersData.length} ordini nell'Elenco`;
      }
    }
  },
  
  /**
   * Mostra/nascondi progress bar
   */
  showProgress: function(show, current = 0, total = 0) {
    const progressDiv = document.getElementById('processingProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (!progressDiv) return;
    
    if (show) {
      progressDiv.style.display = 'block';
      if (total > 0) {
        const percent = (current / total) * 100;
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `Processando file ${current} di ${total}`;
      }
    } else {
      progressDiv.style.display = 'none';
      progressBar.style.width = '0%';
    }
  },
  
  /**
   * Aggiorna file processing list con animazione
   */
  updateFileProcessingList: function(fileName, status, success = true, isProcessing = false) {
    const list = document.getElementById('fileProcessingList');
    if (!list) return;
    
    list.style.display = 'block';
    
    // Trova l'indice corrente basato sul numero di elementi già presenti
    const currentIndex = list.children.length;
    
    // Crea l'elemento ESATTAMENTE come l'originale
    const processingItem = document.createElement('div');
    processingItem.id = `file-${currentIndex}`;
    processingItem.style.cssText = `
      padding: 8px;
      margin: 4px 0;
      border-radius: 4px;
      background-color: #fff3cd;
      color: #856404;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.5s ease-in-out;
    `;
    processingItem.innerHTML = `
      <span style="flex: 1;">${fileName}</span>
      <span style="margin-left: 10px;">⏳ In elaborazione...</span>
    `;
    
    // Aggiungi alla lista
    list.appendChild(processingItem);
    
    // Scroll fluido verso il nuovo elemento ESATTAMENTE come l'originale
    setTimeout(() => {
      list.scrollTo({
        top: list.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
    
    // Salva il fileName per poterlo ritrovare dopo
    processingItem.dataset.fileName = fileName;
    
    return processingItem;
  },
  
  /**
   * Aggiorna stato di un file in elaborazione
   */
  updateProcessingItem: function(fileName, status, success) {
    const list = document.getElementById('fileProcessingList');
    if (!list) return;
    
    // Trova l'elemento usando data-file-name
    const itemToUpdate = list.querySelector(`[data-file-name="${fileName}"]`);
    if (!itemToUpdate) return;
    
    // Determina se è duplicato dal messaggio
    const isDuplicate = status.includes('duplicato');
    
    // ESATTAMENTE come l'originale
    if (success === true) {
      itemToUpdate.style.backgroundColor = isDuplicate ? '#fff3cd' : '#d4edda';
      itemToUpdate.style.color = isDuplicate ? '#856404' : '#28a745';
      itemToUpdate.innerHTML = `
        <span style="flex: 1;">${fileName}</span>
        <span style="margin-left: 10px;">${isDuplicate ? '⚠️' : '✅'} ${status}</span>
      `;
    } else if (success === false) {
      itemToUpdate.style.backgroundColor = '#f8d7da';
      itemToUpdate.style.color = '#dc3545';
      itemToUpdate.innerHTML = `
        <span style="flex: 1;">${fileName}</span>
        <span style="margin-left: 10px;">❌ ${status}</span>
      `;
    } else if (success === 'warning') {
      itemToUpdate.style.backgroundColor = '#fff3cd';
      itemToUpdate.style.color = '#856404';
      itemToUpdate.innerHTML = `
        <span style="flex: 1;">${fileName}</span>
        <span style="margin-left: 10px;">⚠️ ${status}</span>
      `;
    }
  },
  
  /**
   * Reset form importazione
   */
  resetImportForm: function() {
    const sections = ['ordersImportSection', 'orderPDFPreview', 'orderImportConfirm'];
    sections.forEach(id => {
      const elem = document.getElementById(id);
      if (elem) elem.style.display = 'none';
    });
    
    const debugContent = document.getElementById('debugContent');
    if (debugContent) debugContent.textContent = '';
    
    const fileList = document.getElementById('fileProcessingList');
    if (fileList) {
      fileList.innerHTML = '';
      fileList.style.display = 'none';
    }
    
    this.showProgress(false);
  },
  
  /**
   * Inizializza event listeners
   */
  initializeEventListeners: function() {
    // Seleziona file PDF
    const selectBtn = document.getElementById('selectOrderPDFBtn');
    const fileInput = document.getElementById('orderPDFInput');
    
    if (selectBtn && fileInput) {
      selectBtn.addEventListener('click', () => fileInput.click());
      
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          document.getElementById('selectedPDFCount').textContent = `${e.target.files.length} file selezionati`;
          document.getElementById('orderPDFPreview').style.display = 'block';
          window.Ordini.processPdfOrder();
        }
      });
    }
    
    // Conferma import
    const confirmBtn = document.getElementById('confirmOrderUploadBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => window.Ordini.confirmOrderImport());
    }
    
    // Annulla import
    const cancelBtn = document.getElementById('cancelOrderUploadBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (confirm('Sei sicuro di voler annullare l\'importazione?')) {
          this.resetImportForm();
          window.Ordini.tempOrdersToImport = [];
        }
      });
    }
    
    // Upload PDF
    const uploadBtn = document.getElementById('uploadOrderPdfBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => window.Ordini.handlePdfUpload());
    }
    
    // Export Excel
    const exportBtn = document.getElementById('exportOrdersExcelBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => window.Ordini.exportOrdersToExcel());
    }
    
    // Visualizza File VENDUTO
    const viewVendutoBtn = document.getElementById('viewVendutoBtn');
    if (viewVendutoBtn) {
      viewVendutoBtn.addEventListener('click', () => {
        if (window.OrdiniExport && window.OrdiniExport.viewVendutoContent) {
          window.OrdiniExport.viewVendutoContent();
        } else {
          console.error('OrdiniExport.viewVendutoContent non disponibile');
        }
      });
    }
    
    // Sincronizza File VENDUTO
    const syncVendutoBtn = document.getElementById('syncVendutoBtn');
    if (syncVendutoBtn) {
      syncVendutoBtn.addEventListener('click', () => {
        if (window.OrdiniExport && window.OrdiniExport.showSyncDialog) {
          window.OrdiniExport.showSyncDialog();
        } else {
          console.error('OrdiniExport.showSyncDialog non disponibile');
        }
      });
    }
    
    // Debug ordini
    const debugBtn = document.getElementById('debugOrdersBtn');
    if (debugBtn) {
      debugBtn.addEventListener('click', () => {
        console.log('🔍 Debug Ordini:');
        console.log('- Ordini in memoria:', window.Ordini.state.orders.length);
        console.log('- Contenuto orders:', window.Ordini.state.orders);
        console.log('- localStorage:', localStorage.getItem('ordersData'));
        alert(`Debug: ${window.Ordini.state.orders.length} ordini in memoria. Controlla console per dettagli.`);
      });
    }
    
    // Cancella ordini
    const clearBtn = document.getElementById('clearOrdersBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Sei sicuro di voler cancellare tutti gli ordini?')) {
          window.Ordini.clearAllOrders();
        }
      });
    }
    
    // Chiudi modal
    const closeModal = document.querySelector('#orderDetailsModal .close');
    if (closeModal) {
      closeModal.addEventListener('click', () => {
        document.getElementById('orderDetailsModal').style.display = 'none';
      });
    }
    
    // Chiudi modal cliccando fuori
    window.addEventListener('click', (event) => {
      const modal = document.getElementById('orderDetailsModal');
      if (event.target == modal) {
        modal.style.display = 'none';
      }
    });
    
    // Select all checkbox
    const selectAll = document.getElementById('selectAllOrders');
    if (selectAll) {
      selectAll.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.order-select');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
      });
    }
  },
  
  /**
   * Funzioni delegate per edit/delete
   */
  editOrder: function(orderId) {
    window.Ordini.editOrder(orderId);
  },
  
  deleteOrder: function(orderId) {
    window.Ordini.deleteOrder(orderId);
  },
  
  /**
   * Formatta la visualizzazione delle quantità
   */
  formatQuantityDisplay: function(order) {
    // Mostra sempre il totale come PZ, indipendentemente dalle unità di misura
    const totalQty = order.totalQuantity || '0';
    return `${totalQty} PZ`;
  }
};

// Export del modulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrdiniUI;
} else {
  window.OrdiniUI = OrdiniUI;
}