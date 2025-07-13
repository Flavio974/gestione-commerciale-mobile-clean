/**
 * Ordini Module
 * Gestione ordini con import PDF, export Excel e tracking
 * Integra i moduli parser, export e UI
 */

// Carica i moduli dipendenti
if (typeof OrdiniParser === 'undefined') {
  console.warn('OrdiniParser non caricato, carico il modulo...');
  const script = document.createElement('script');
  script.src = 'js/modules/ordini-parser.js';
  
  // CRITICAL FIX: Rileva moduli ES6 e imposta type="module"
  const isES6Module = script.src.includes('temporal') || 
                     script.src.includes('middleware') ||
                     script.src.includes('semantic') ||
                     script.src.includes('parser');
  
  if (isES6Module) {
    script.type = 'module';
    console.log('📦 Caricamento modulo ES6 in ordini.js:', script.src);
  }
  
  document.head.appendChild(script);
}

if (typeof OrdiniExport === 'undefined') {
  console.warn('OrdiniExport non caricato, carico il modulo...');
  const script = document.createElement('script');
  script.src = 'js/modules/ordini-export.js';
  
  // CRITICAL FIX: Rileva moduli ES6 e imposta type="module"
  const isES6Module = script.src.includes('temporal') || 
                     script.src.includes('middleware') ||
                     script.src.includes('semantic') ||
                     script.src.includes('parser');
  
  if (isES6Module) {
    script.type = 'module';
    console.log('📦 Caricamento modulo ES6 in ordini.js:', script.src);
  }
  
  document.head.appendChild(script);
}

if (typeof OrdiniUI === 'undefined') {
  console.warn('OrdiniUI non caricato, carico il modulo...');
  const script = document.createElement('script');
  script.src = 'js/modules/ordini-ui.js';
  
  // CRITICAL FIX: Rileva moduli ES6 e imposta type="module"
  const isES6Module = script.src.includes('temporal') || 
                     script.src.includes('middleware') ||
                     script.src.includes('semantic') ||
                     script.src.includes('parser');
  
  if (isES6Module) {
    script.type = 'module';
    console.log('📦 Caricamento modulo ES6 in ordini.js:', script.src);
  }
  
  document.head.appendChild(script);
}

const Ordini = {
  state: {
    orders: [],
    currentOrder: null,
    pendingImport: null,
    tempOrdersToImport: [] // Array temporaneo per import
  },
  
  init: function() {
    this.loadOrdersFromStorage();
  },
  
  onEnter: function() {
    // Usa OrdiniUI per renderizzare la sezione
    OrdiniUI.renderOrdersSection();
    OrdiniUI.initializeEventListeners();
    OrdiniUI.renderOrdersList(this.state.orders);
  },
  
  onEnterOld: function() {
    const content = document.getElementById('orders-content');
    if (!content) return;
    
    content.innerHTML = `
      <div class="orders-container">
        <div class="orders-header">
          <h2>Gestione Ordini</h2>
          <div class="orders-stats">
            <span id="ordersCount">Totale ordini: ${this.state.orders.length}</span>
          </div>
        </div>
        
        <div class="orders-toolbar">
          <button class="btn btn-primary" id="importPdfBtn">
            <i class="fas fa-file-pdf"></i> Importa PDF
          </button>
          <button class="btn btn-success" id="exportExcelBtn">
            <i class="fas fa-file-excel"></i> Esporta Excel
          </button>
          <button class="btn btn-danger" id="clearOrdersBtn">
            <i class="fas fa-trash"></i> Elimina Tutti
          </button>
          <input type="file" id="pdfFileInput" accept=".pdf" multiple style="display: none;">
        </div>
        
        <div id="progressContainer" style="display: none;">
          <div class="progress">
            <div id="uploadProgress" class="progress-bar"></div>
          </div>
        </div>
        
        <div class="orders-table-container">
          <table id="ordersTable" class="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" id="selectAllOrders"></th>
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
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Modal per dettagli ordine -->
      <div id="orderDetailsModal" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close" onclick="Utils.closeModal('orderDetailsModal')">&times;</span>
          <div id="orderDetailsContent"></div>
        </div>
      </div>
      
      <!-- Modal per preview import -->
      <div id="importPreviewModal" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close" onclick="Utils.closeModal('importPreviewModal')">&times;</span>
          <h3>Anteprima Importazione</h3>
          <div id="previewContent"></div>
          <div class="modal-buttons">
            <button class="btn btn-primary" onclick="Ordini.confirmOrderImport()">Conferma Import</button>
            <button class="btn btn-secondary" onclick="Utils.closeModal('importPreviewModal')">Annulla</button>
          </div>
        </div>
      </div>
    `;
    
    this.initializeEventListeners();
    this.renderOrdersList();
  },
  
  onLeave: function() {
    // Cleanup event listeners if needed
  },
  
  initializeEventListeners: function() {
    // Import PDF
    const importBtn = document.getElementById('importPdfBtn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.handlePdfUpload());
    }
    
    // Export Excel
    const exportBtn = document.getElementById('exportExcelBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportOrdersToExcel());
    }
    
    // Clear all orders
    const clearBtn = document.getElementById('clearOrdersBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAllOrders());
    }
    
    // Select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllOrders');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.order-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
      });
    }
    
    // File input for PDF
    const fileInput = document.getElementById('pdfFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.processPdfFiles(e.target.files));
    }
    
    // Confirm order upload button
    const confirmBtn = document.getElementById('confirmOrderUploadBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.confirmOrderImport());
    }
  },
  
  loadOrdersFromStorage: function() {
    const stored = localStorage.getItem('ordersData'); // Usa 'ordersData' per compatibilità
    if (stored) {
      try {
        this.state.orders = JSON.parse(stored);
        console.log(`Caricati ${this.state.orders.length} ordini dal localStorage`);
      } catch (e) {
        console.error('Errore nel caricamento ordini:', e);
        this.state.orders = [];
      }
    }
  },
  
  saveOrdersToStorage: function() {
    try {
      localStorage.setItem('ordersData', JSON.stringify(this.state.orders));
      console.log(`Salvati ${this.state.orders.length} ordini nel localStorage`);
    } catch (e) {
      console.error('Errore nel salvataggio ordini:', e);
    }
  },
  
  renderOrdersList: function() {
    // Delega a OrdiniUI
    OrdiniUI.renderOrdersList(this.state.orders);
  },
  
  renderOrdersListOld: function() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    this.state.orders.forEach(order => {
      const row = document.createElement('tr');
      const statusClass = order.status.toLowerCase().replace(/\s+/g, '-');
      const channelClass = order.channel.toLowerCase();
      
      row.innerHTML = `
        <td><input type="checkbox" class="order-checkbox" data-id="${order.id}"></td>
        <td>${order.orderNumber || '-'}</td>
        <td>${order.clientName || '-'}</td>
        <td>${order.orderDate || '-'}</td>
        <td><span class="channel-badge channel-${channelClass}">${order.channel}</span></td>
        <td><span class="status-badge status-${statusClass}">${order.status}</span></td>
        <td>${order.deliveryPreference || '-'}</td>
        <td>${order.notes || '-'}</td>
        <td>
          <button class="btn-icon" onclick="Ordini.showOrderDetails('${order.id}')">
            <i class="fas fa-eye"></i>
          </button>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon btn-edit" onclick="Ordini.editOrder('${order.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon btn-delete" onclick="Ordini.deleteOrder('${order.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    this.updateOrdersCount();
  },
  
  updateOrdersCount: function() {
    const countElement = document.getElementById('ordersCount');
    if (countElement) {
      countElement.textContent = `Totale ordini: ${this.state.orders.length}`;
    }
  },
  
  handlePdfUpload: function() {
    // Mostra la sezione di importazione ordini
    const ordersImportSection = document.getElementById('ordersImportSection');
    if (ordersImportSection) {
      ordersImportSection.style.display = 'block';
    }
  },
  
  processPdfOrder: function() {
    // Reset del debug content
    const debugContent = document.getElementById('debugContent');
    if (debugContent) {
      debugContent.textContent = '=== INIZIO PROCESSAMENTO PDF ===\n\n';
    }
    
    // Prima prova con il nuovo input
    let fileInput = document.getElementById('orderPDFInput');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      alert('⚠️ Per favore seleziona almeno un file PDF dal Passo 1');
      return;
    }
    
    const files = fileInput.files;
    
    // Verifica che tutti i file siano PDF
    for (let i = 0; i < files.length; i++) {
      if (files[i].type !== 'application/pdf') {
        alert(`❌ Il file ${files[i].name} non è un PDF valido`);
        return;
      }
    }
    
    // Reset ordini temporanei
    this.state.tempOrdersToImport = [];
    
    // Configura PDF.js
    if (typeof pdfjsLib === 'undefined') {
      alert('Errore: Libreria PDF.js non caricata');
      return;
    }
    
    // Configurazione del worker PDF.js con fallback
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Processa ogni file
    this.processMultiplePdfFiles(files);
  },
  
  async processMultiplePdfFiles(files) {
    const fileProcessingList = document.getElementById('fileProcessingList');
    if (fileProcessingList) {
      fileProcessingList.style.display = 'block';
      fileProcessingList.innerHTML = '';
    }
    
    OrdiniUI.showProgress(true, 0, files.length);
    
    // Converti FileList in Array
    const filesArray = Array.from(files);
    
    // Processa tutti i file in parallelo per fluidità
    const promises = filesArray.map(async (file, index) => {
      // Aggiungi subito l'elemento in elaborazione con un piccolo delay per l'animazione staggered
      setTimeout(() => {
        OrdiniUI.updateFileProcessingList(file.name, 'Elaborazione in corso...', true, true);
      }, index * 50); // 50ms di delay tra ogni file per effetto cascata
      
      try {
        const text = await this.extractTextFromPdf(file);
        const order = OrdiniParser.parseOrderFromText(text, file.name);
        
        // Debug: verifica cosa ritorna il parser
        console.log(`\n=== ORDINE PARSATO DA ${file.name} ===`);
        console.log('Numero prodotti:', order?.products?.length || 0);
        if (order?.products?.length > 0) {
          console.log('Primi 3 prodotti:', order.products.slice(0, 3));
        }
        
        // Piccolo delay random per rendere più naturale l'aggiornamento
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
        
        if (order) {
          // Verifica duplicati
          const existingOrder = this.state.tempOrdersToImport.find(o => 
            o.orderNumber === order.orderNumber && o.clientName === order.clientName
          );
          
          if (!existingOrder) {
            this.state.tempOrdersToImport.push(order);
            OrdiniUI.updateProcessingItem(file.name, `Ordine ${order.orderNumber || 'N/A'} estratto con successo`, true);
          } else {
            OrdiniUI.updateProcessingItem(file.name, 'Ordine duplicato - ignorato', 'warning');
          }
        } else {
          OrdiniUI.updateProcessingItem(file.name, 'Nessun ordine trovato nel PDF', false);
        }
      } catch (error) {
        console.error(`Errore nel processare ${file.name}:`, error);
        OrdiniUI.updateProcessingItem(file.name, `Errore: ${error.message}`, false);
      }
      
      // Aggiorna progress bar in modo fluido
      const completed = this.state.tempOrdersToImport.length;
      OrdiniUI.showProgress(true, Math.min(completed + 1, files.length), files.length);
    });
    
    // Attendi che tutti i file siano processati
    await Promise.all(promises);
    
    // Chiudi progress bar con un piccolo delay
    setTimeout(() => {
      OrdiniUI.showProgress(false);
    }, 500);
    
    if (this.state.tempOrdersToImport.length > 0) {
      OrdiniUI.displayOrdersPreview(this.state.tempOrdersToImport);
      document.getElementById('confirmOrderUploadBtn').disabled = false;
    } else {
      alert('Nessun ordine valido trovato nei file selezionati');
    }
  },
  
  async extractTextFromPdf(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function(e) {
        try {
          const typedarray = new Uint8Array(e.target.result);
          const pdf = await pdfjsLib.getDocument(typedarray).promise;
          let fullText = '';
          
          // Estrai il testo da tutte le pagine
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            // Unisci gli elementi di testo preservando gli a capo
            let pageText = '';
            let lastY = null;
            
            textContent.items.forEach(item => {
              // Se l'elemento Y è diverso dal precedente, aggiungi un a capo
              if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) {
                pageText += '\n';
              }
              pageText += item.str + ' ';
              lastY = item.transform[5];
            });
            
            fullText += pageText + '\n';
          }
          
          resolve(fullText);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },
  
  // Parsing delegato a OrdiniParser
  parseOrderFromText: function(text, fileName) {
    return OrdiniParser.parseOrderFromText(text, fileName);
  },
  
  extractPattern: function(text, pattern) {
    const match = text.match(pattern);
    return match ? match[1].trim() : '';
  },
  
  cleanClientName: function(name) {
    return name
      .replace(/S\.R\.L\.?|SRL|S\.P\.A\.?|SPA|S\.A\.S\.?|SAS/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  },
  
  extractShippingAddress: function(text) {
    const patterns = [
      /Indirizzo spedizione:\s*([^\n]+)/i,
      /Indirizzo di consegna:\s*([^\n]+)/i,
      /Consegnare a:\s*([^\n]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    
    return '';
  },
  
  extractProducts: function(text) {
    const products = [];
    const productPattern = /([A-Z0-9]+)\s*-\s*([^-]+)\s*-\s*Q\.tà:\s*(\d+)\s*-\s*Prezzo:\s*€?([0-9.,]+)\s*-\s*Totale:\s*€?([0-9.,]+)/gi;
    
    let match;
    while ((match = productPattern.exec(text)) !== null) {
      products.push({
        code: match[1],
        description: match[2].trim(),
        quantity: match[3],
        unitPrice: match[4],
        totalPrice: match[5]
      });
    }
    
    return products;
  },
  
  showImportPreview: function(orders) {
    const modal = document.getElementById('importPreviewModal');
    const content = document.getElementById('previewContent');
    
    if (!modal || !content) {
      this.confirmOrderImport(orders);
      return;
    }
    
    content.innerHTML = orders.map(order => `
      <div class="preview-order">
        <h4>Ordine: ${order.orderNumber}</h4>
        <p><strong>Cliente:</strong> ${order.clientName}</p>
        <p><strong>Data:</strong> ${order.orderDate}</p>
        <p><strong>Totale:</strong> €${order.grandTotal}</p>
        <p><strong>Prodotti:</strong> ${order.products.length} articoli</p>
      </div>
    `).join('');
    
    modal.style.display = 'block';
    this.state.pendingImport = orders;
  },
  
  confirmOrderImport: function() {
    if (!this.state.tempOrdersToImport || this.state.tempOrdersToImport.length === 0) {
      alert('Nessun ordine da importare');
      return;
    }
    
    // Aggiungi gli ordini temporanei all'array principale
    this.state.orders = this.state.orders.concat(this.state.tempOrdersToImport);
    
    // Salva nel localStorage
    this.saveOrdersToStorage();
    
    // Aggiorna la visualizzazione
    this.renderOrdersList();
    
    // Reset UI
    OrdiniUI.resetImportForm();
    
    alert(`Importati ${this.state.tempOrdersToImport.length} ordini con successo!`);
    
    // Reset
    this.state.tempOrdersToImport = [];
  },
  
  showOrderDetails: function(orderId) {
    // Delega a OrdiniUI
    OrdiniUI.showOrderDetails(orderId);
  },
  
  showOrderDetailsOld: function(orderId) {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('orderDetailsModal');
    const content = document.getElementById('orderDetailsContent');
    
    if (!modal || !content) return;
    
    const statusClass = order.status.toLowerCase().replace(/\s+/g, '-');
    const channelClass = order.channel.toLowerCase();
    
    content.innerHTML = `
      <div class="order-details">
        <div class="detail-section">
          <h3>Informazioni Ordine</h3>
          <p><strong>Numero Ordine:</strong> ${order.orderNumber}</p>
          <p><strong>Data:</strong> ${order.orderDate}</p>
          <p><strong>Stato:</strong> <span class="status-badge status-${statusClass}">${order.status}</span></p>
          <p><strong>Canale:</strong> <span class="channel-badge channel-${channelClass}">${order.channel}</span></p>
        </div>
        
        <div class="detail-section">
          <h3>Informazioni Cliente</h3>
          <p><strong>Nome:</strong> ${order.clientName}</p>
          <p><strong>P.IVA:</strong> ${order.vatNumber}</p>
          <p><strong>Indirizzo Fatturazione:</strong> ${order.invoiceAddress}</p>
          <p><strong>Indirizzo Spedizione:</strong> ${order.deliveryAddress}</p>
        </div>
        
        <div class="detail-section">
          <h3>Prodotti</h3>
          <table class="products-table">
            <thead>
              <tr>
                <th>Codice</th>
                <th>Descrizione</th>
                <th>Q.tà</th>
                <th>Prezzo Unit.</th>
                <th>Totale</th>
              </tr>
            </thead>
            <tbody>
              ${order.products.map(p => `
                <tr>
                  <td>${p.code}</td>
                  <td>${p.description}</td>
                  <td>${p.quantity}</td>
                  <td>€${p.unitPrice}</td>
                  <td>€${p.totalPrice}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="detail-section">
          <h3>Totali</h3>
          <p><strong>Quantità Totale:</strong> ${order.totalQuantity}</p>
          <p><strong>Totale:</strong> €${order.totalAmount}</p>
          <p><strong>Totale con IVA:</strong> €${order.grandTotal}</p>
        </div>
        
        ${order.notes ? `
        <div class="detail-section">
          <h3>Note</h3>
          <p>${order.notes}</p>
        </div>
        ` : ''}
      </div>
    `;
    
    modal.style.display = 'block';
  },
  
  editOrder: function(orderId) {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return;
    
    // TODO: Implementare funzionalità di modifica
    alert('Funzionalità di modifica in sviluppo');
  },
  
  deleteOrder: function(orderId) {
    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return;
    
    this.state.orders = this.state.orders.filter(o => o.id !== orderId);
    this.saveOrdersToStorage();
    this.renderOrdersList();
  },
  
  clearAllOrders: function() {
    if (!confirm('Sei sicuro di voler eliminare TUTTI gli ordini? Questa azione non può essere annullata.')) return;
    
    this.state.orders = [];
    this.saveOrdersToStorage();
    this.renderOrdersList();
  },
  
  exportOrdersToExcel: function() {
    if (this.state.orders.length === 0) {
      alert('Nessun ordine da esportare');
      return;
    }
    
    // Usa OrdiniExport per export avanzato con XLSX
    if (typeof window.OrdiniExport !== 'undefined' && window.OrdiniExport.exportOrdersToExcel) {
      window.OrdiniExport.exportOrdersToExcel(this.state.orders);
    } else {
      // Prova a caricare dopo un breve ritardo
      setTimeout(() => {
        if (typeof window.OrdiniExport !== 'undefined' && window.OrdiniExport.exportOrdersToExcel) {
          window.OrdiniExport.exportOrdersToExcel(this.state.orders);
        } else {
          console.error('OrdiniExport non è caricato. Verificare che il file ordini-export-inline.js sia incluso correttamente.');
          alert('Errore: Il modulo di esportazione non è disponibile. Ricaricare la pagina.');
        }
      }, 100);
    }
  },
  
  clearAllOrders: function() {
    if (!confirm('Sei sicuro di voler eliminare TUTTI gli ordini? Questa azione non può essere annullata.')) return;
    
    this.state.orders = [];
    this.saveOrdersToStorage();
    this.renderOrdersList();
  },
  
};

window.Ordini = Ordini;