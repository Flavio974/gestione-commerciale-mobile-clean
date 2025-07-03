/**
 * Modulo Gestione DDT e Fatture - Core
 * Funzioni principali e gestione stato
 */

const DDTFTModule = {
  // Stato del modulo
  state: {
    documents: [],
    filteredDocuments: [],
    tempDocumentsToImport: [],
    pendingDocuments: [],
    currentFilter: 'all',
    searchTerm: '',
    sortBy: 'date',
    sortDirection: 'desc'
  },

  /**
   * Inizializzazione modulo
   */
  init: function() {
    console.log('🚀 Inizializzazione DDTFTModule...');
    
    // Verifica dipendenze critiche
    console.log('📋 Verifica moduli:');
    console.log('- DDTFTImport:', typeof window.DDTFTImport);
    console.log('- DDTFTPdfParser:', typeof window.DDTFTPdfParser);
    console.log('- DDTFTColumnParser:', typeof window.DDTFTColumnParser);
    
    if (typeof window.DDTFTImport === 'undefined') {
      console.error('❌ DDTFTImport non trovato durante init!');
      console.log('🔍 Controllo se è in un namespace diverso...');
      console.log('- window.DDTImport:', typeof window.DDTImport);
      console.log('- window.DDT:', typeof window.DDT);
      
      // Prova a caricare il modulo in modo asincrono
      setTimeout(() => {
        if (typeof window.DDTFTImport !== 'undefined') {
          console.log('✅ DDTFTImport caricato con ritardo');
        }
      }, 1000);
    }
    
    // Usa il state manager se disponibile
    if (window.DDTFTStateManager) {
      const docs = window.DDTFTStateManager.loadDocuments();
      this.state.documents = docs;
    } else {
      this.loadDocumentsFromStorage();
    }
    this.setupPDFJS();
  },

  /**
   * Setup PDF.js
   */
  setupPDFJS: function() {
    if (typeof window.pdfjsLib !== 'undefined') {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      console.log('PDF.js configurato correttamente');
    } else {
      console.error('PDF.js non trovato!');
    }
  },

  /**
   * Chiamato quando si entra nel tab
   */
  onEnter: function() {
    this.render();
    this.setupEventListeners();
    this.fixButtonVisibility();
    
    // Applica stato debug se attivo
    if (this.state.debugMode) {
      const debugBtn = document.getElementById('toggleDebugBtn');
      const debugArea = document.getElementById('documentDebugArea');
      
      if (debugBtn) {
        debugBtn.innerHTML = '🔍 Debug: ON';
        debugBtn.style.backgroundColor = '#28a745';
      }
      
      if (debugArea) {
        debugArea.style.display = 'block';
      }
    }
  },

  /**
   * Forza la visibilità dei pulsanti
   */
  fixButtonVisibility: function() {
    // Forza visibilità di tutti i pulsanti nel modulo
    const buttons = document.querySelectorAll('#ddtft-content button');
    buttons.forEach(btn => {
      btn.style.opacity = '1';
      btn.style.visibility = 'visible';
      
      // Se non ha già un colore di sfondo, aggiungilo
      const bgColor = window.getComputedStyle(btn).backgroundColor;
      if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
        if (btn.classList.contains('action-button-danger') || btn.classList.contains('btn-delete')) {
          btn.style.backgroundColor = '#dc3545';
          btn.style.color = 'white';
        } else if (btn.classList.contains('filter-btn')) {
          btn.style.backgroundColor = btn.classList.contains('active') ? '#007bff' : '#ffffff';
          btn.style.color = btn.classList.contains('active') ? 'white' : '#495057';
          btn.style.border = '1px solid #dee2e6';
        } else {
          btn.style.backgroundColor = '#007bff';
          btn.style.color = 'white';
        }
      }
    });
    
    console.log('Visibilità pulsanti DDT/FT forzata');
  },

  /**
   * Chiamato quando si lascia nel tab
   */
  onLeave: function() {
    this.saveDocumentsToStorage();
  },

  /**
   * Render del contenuto
   */
  render: function() {
    const content = document.getElementById('ddtft-content');
    if (!content) return;

    content.innerHTML = `
      <div class="ddtft-container">
        <div class="ddtft-header">
          <h2>Gestione DDT e Fatture</h2>
          <div class="ddtft-stats">
            <span>Totale documenti: <strong id="totalDocumentsCount">${this.state.documents.length}</strong></span>
          </div>
        </div>

        <div class="ddtft-actions">
          <button id="uploadDocumentPdfBtn" class="action-button" style="background-color: #007bff !important; color: white !important; opacity: 1 !important; visibility: visible !important;">
            📄 Importa DDT/FT da PDF
          </button>
          <button id="toggleDebugBtn" class="action-button" style="background-color: #6f42c1 !important; color: white !important; opacity: 1 !important; visibility: visible !important;">
            🔍 Debug: OFF
          </button>
          <button id="exportDocumentsExcelBtn" class="action-button" style="background-color: #28a745 !important; color: white !important; opacity: 1 !important; visibility: visible !important;">
            📊 Esporta in Excel
          </button>
          <button id="viewDDTFTContentBtn" class="action-button" style="background-color: #17a2b8 !important; color: white !important; opacity: 1 !important; visibility: visible !important;">
            👁️ Visualizza contenuto DDT-FT
          </button>
          <button id="syncDDTFTBtn" class="action-button" style="background-color: #ffc107 !important; color: black !important; opacity: 1 !important; visibility: visible !important;">
            🔄 Sincronizza file DDT-FT
          </button>
          <button id="clearDocumentsBtn" class="action-button action-button-danger" style="background-color: #dc3545 !important; color: white !important; opacity: 1 !important; visibility: visible !important;">
            🗑️ Cancella Documenti
          </button>
        </div>

        <!-- Filtri -->
        <div class="ddtft-filters">
          <button class="filter-btn active" data-filter="all" style="opacity: 1 !important; visibility: visible !important;">Tutti</button>
          <button class="filter-btn" data-filter="ddt" style="opacity: 1 !important; visibility: visible !important;">DDT</button>
          <button class="filter-btn" data-filter="ft" style="opacity: 1 !important; visibility: visible !important;">Fatture</button>
          <input type="text" id="documentSearchInput" placeholder="Cerca per cliente o numero..." class="search-input">
        </div>

        <!-- Sezione per caricamento documenti PDF -->
        <div id="documentsImportSection" style="padding: 20px; display: none;">
          <h3>📄 Caricamento DDT/Fatture da PDF</h3>
          
          <!-- Passo 1: Selezione file -->
          <div class="import-step">
            <h4>Passo 1: Seleziona i file PDF</h4>
            <input type="file" id="documentPDFInput" accept=".pdf" multiple style="display: none;">
            <button id="selectDocumentPDFBtn" class="action-button" style="background-color: #007bff !important; color: white !important; opacity: 1 !important; visibility: visible !important;">
              📎 Seleziona PDF Documenti
            </button>
            <span id="selectedDocumentPDFCount" style="margin-left: 10px;"></span>
          </div>
          
          <!-- Barra di progresso -->
          <div id="documentProcessingProgress" style="display: none; margin: 20px 0;">
            <h4>Processamento in corso...</h4>
            <div class="progress-container">
              <div id="documentProgressBar" style="width: 0%;"></div>
            </div>
            <p id="documentProgressText" style="text-align: center; margin-top: 10px; font-weight: bold;">Processando file 0 di 0</p>
            <p id="currentDocumentFileText" style="text-align: center; color: #666;">Preparazione...</p>
            <div id="documentFileProcessingList" style="margin-top: 20px; max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; padding: 10px; display: none;">
              <!-- Lista dei file processati con stato -->
            </div>
          </div>
          
          <!-- Passo 2: Anteprima con Debug -->
          <div id="documentPDFPreview" class="preview-section" style="display: none;">
            <h4>Passo 2: Verifica e modifica</h4>
            
            <!-- Area Debug -->
            <div id="documentDebugArea" style="background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; padding: 10px; margin-bottom: 20px; max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 12px; display: none;">
              <h5 style="margin: 0 0 10px 0; color: #d9534f; font-weight: bold;">🔍 DEBUG DDT/FT - Analisi dettagliata del parsing PDF</h5>
              <div style="background: #333; color: #0f0; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
                <strong>SUGGERIMENTO:</strong> Se il parser non trova i dati corretti, controlla:
                <ul style="margin: 5px 0 0 20px;">
                  <li>Il pattern DDV Alfieri cerca: numero(4 cifre) data(gg/mm/aa) pag codCliente(5 cifre) nomeCliente</li>
                  <li>Esempio: "5023 3/06/25 1 20322 DONAC S.R.L."</li>
                  <li>Se vedi solo coordinate [X:294, "Numero"], il PDF potrebbe avere un layout complesso</li>
                </ul>
              </div>
              <pre id="documentDebugContent" style="margin: 0; white-space: pre-wrap; word-wrap: break-word;"></pre>
            </div>
            
            <div id="documentsPreviewTable">
              <!-- La tabella di anteprima verrà inserita qui -->
            </div>
          </div>
          
          <!-- Passo 3: Conferma importazione -->
          <div id="documentImportConfirm" class="import-step" style="display: none;">
            <h4>Passo 3: Verifica e conferma</h4>
            <div id="documentUploadResults">
              <!-- I risultati dell'importazione verranno visualizzati qui -->
            </div>
            <div class="button-group" style="margin-top: 20px;">
              <button id="confirmDocumentUploadBtn" class="btn btn-primary" disabled style="background-color: #007bff !important; color: white !important; opacity: 1 !important; visibility: visible !important; padding: 10px 20px !important; border: none !important; border-radius: 5px !important;">
                ✅ Importa nell'Elenco
              </button>
              <button id="cancelDocumentUploadBtn" class="btn btn-secondary" style="background-color: #6c757d !important; color: white !important; opacity: 1 !important; visibility: visible !important; padding: 10px 20px !important; border: none !important; border-radius: 5px !important;">
                ❌ Annulla
              </button>
            </div>
          </div>
        </div>

        <!-- Tabella documenti -->
        <div class="ddtft-table-container">
          <table class="ddtft-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Numero</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>P.IVA</th>
                <th>Indirizzo Consegna</th>
                <th>Rif. Ordine</th>
                <th>N° Prodotti</th>
                <th>Subtotale</th>
                <th>Totale</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody id="documentsTableBody">
              <!-- Documenti verranno inseriti qui -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal dettagli documento -->
      <div id="documentDetailsModal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 90%; width: 1200px; max-height: 90vh; overflow-y: auto; margin: 5vh auto;">
          <span class="close">&times;</span>
          <h3 style="text-align: center;">Dettagli Documento</h3>
          <div id="documentDetailsContent" style="padding: 20px;">
            <!-- I dettagli del documento verranno inseriti qui -->
          </div>
        </div>
      </div>
    `;

    this.updateDocumentsCount();
    this.renderDocumentsList();
  },

  /**
   * Setup event listeners
   */
  setupEventListeners: function() {
    // Fix visibilità pulsanti con un piccolo delay
    setTimeout(() => {
      this.fixButtonVisibility();
    }, 100);
    
    // Usa event delegation per garantire che i pulsanti funzionino
    const content = document.getElementById('ddtft-content');
    if (!content) return;
    
    // Rimuovi listener precedenti per evitare duplicati
    if (this.boundHandleButtonClick) {
      content.removeEventListener('click', this.boundHandleButtonClick);
    }
    
    // Handler per tutti i click nel container
    this.handleButtonClick = (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      
      console.log('Button clicked:', button.id); // Debug
      
      // Gestisci i vari pulsanti tramite ID
      switch(button.id) {
        case 'uploadDocumentPdfBtn':
          console.log('📄 Upload PDF cliccato');
          e.preventDefault();
          e.stopPropagation();
          // Usa DDTFTModule direttamente per evitare problemi di contesto
          DDTFTModule.showImportSection();
          break;
          
        case 'toggleDebugBtn':
          console.log('🔍 Toggle Debug cliccato');
          e.preventDefault();
          e.stopPropagation();
          this.toggleDebugMode();
          break;
          
        case 'exportDocumentsExcelBtn':
          console.log('📊 Export Excel cliccato');
          this.exportDocumentsToExcel();
          break;
          
        case 'clearDocumentsBtn':
          console.log('🗑️ Clear Documents cliccato');
          this.clearAllDocuments();
          break;
          
        case 'viewDDTFTContentBtn':
          console.log('👁️ View Content cliccato');
          if (typeof DDTFTSyncManager !== 'undefined' && DDTFTSyncManager.viewDDTFTContent) {
            DDTFTSyncManager.viewDDTFTContent();
          } else {
            alert('Nessun documento salvato da visualizzare.\n\nImporta e sincronizza prima alcuni DDT o Fatture.');
          }
          break;
          
        case 'syncDDTFTBtn':
          console.log('🔄 Sync cliccato');
          if (typeof DDTFTSyncManager !== 'undefined' && DDTFTSyncManager.showSyncDialog) {
            DDTFTSyncManager.showSyncDialog();
          } else {
            alert('Nessun documento da sincronizzare.\n\nImporta prima alcuni DDT o Fatture.');
          }
          break;
          
        case 'selectDocumentPDFBtn':
          console.log('📎 Select PDF cliccato');
          e.preventDefault();
          e.stopPropagation();
          // Non fare nulla qui, gestiamo con un listener separato
          break;
          
        case 'confirmDocumentUploadBtn':
          console.log('✅ Confirm Upload cliccato');
          this.confirmDocumentImport();
          break;
          
        case 'cancelDocumentUploadBtn':
          console.log('❌ Cancel Upload cliccato');
          this.cancelImport();
          break;
      }
      
      // Gestisci anche i pulsanti con onclick inline (dettagli, elimina)
      if (button.getAttribute('onclick')) {
        // L'onclick verrà eseguito normalmente
        console.log('Pulsante con onclick inline cliccato');
      }
    };
    
    // Bind dell'handler per mantenere il contesto
    this.boundHandleButtonClick = this.handleButtonClick.bind(this);
    
    // Aggiungi il listener con event delegation
    content.addEventListener('click', this.boundHandleButtonClick);

    // Filtri - gestiti tramite event delegation
    content.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        this.filterDocuments(e.target.dataset.filter);
      }
    });

    // Ricerca
    const searchInput = document.getElementById('documentSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.searchDocuments(e.target.value));
    }

    // Input file
    const fileInput = document.getElementById('documentPDFInput');
    if (fileInput) {
      // Rimuovi listener precedenti
      fileInput.removeEventListener('change', this.boundHandleFileSelection);
      // Crea bound function
      this.boundHandleFileSelection = (e) => {
        console.log('File input changed, files:', e.target.files.length);
        this.handleFileSelection(e);
      };
      fileInput.addEventListener('change', this.boundHandleFileSelection);
    }
    
    // Bottone selezione file - listener diretto per evitare conflitti
    setTimeout(() => {
      const selectBtn = document.getElementById('selectDocumentPDFBtn');
      if (selectBtn) {
        // Rimuovi qualsiasi listener precedente
        const newSelectBtn = selectBtn.cloneNode(true);
        selectBtn.parentNode.replaceChild(newSelectBtn, selectBtn);
        
        // Aggiungi nuovo listener
        newSelectBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Select PDF button clicked (direct listener)');
          const input = document.getElementById('documentPDFInput');
          if (input) {
            input.click();
          }
        });
      }
    }, 200);

    // Close modal - usa event delegation
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('close') || e.target.classList.contains('modal-overlay')) {
        const modal = e.target.closest('.modal-overlay') || e.target.closest('.modal');
        if (modal) {
          modal.style.display = 'none';
        }
      }
    });
    
    console.log('✅ Event listeners DDT/FT configurati con event delegation');
  },

  /**
   * Toggle modalità debug
   */
  toggleDebugMode: function() {
    this.state.debugMode = !this.state.debugMode;
    localStorage.setItem('ddtft_debug_mode', this.state.debugMode);
    
    const debugBtn = document.getElementById('toggleDebugBtn');
    const debugArea = document.getElementById('documentDebugArea');
    
    if (debugBtn) {
      debugBtn.innerHTML = `🔍 Debug: ${this.state.debugMode ? 'ON' : 'OFF'}`;
      debugBtn.style.backgroundColor = this.state.debugMode ? '#28a745' : '#6f42c1';
    }
    
    if (debugArea) {
      debugArea.style.display = this.state.debugMode ? 'block' : 'none';
    }
    
    console.log(`Debug mode: ${this.state.debugMode ? 'ATTIVATO' : 'DISATTIVATO'}`);
  },

  /**
   * Mostra sezione import
   */
  showImportSection: function() {
    console.log('showImportSection chiamato');
    
    // Verifica prima che DDTFTImport sia disponibile
    if (typeof window.DDTFTImport === 'undefined') {
      console.error('❌ DDTFTImport non disponibile!');
      alert('Il sistema di importazione non è ancora pronto.\n\nAttendi qualche secondo e riprova.\n\nSe il problema persiste, ricarica la pagina (F5).');
      return;
    }
    
    const section = document.getElementById('documentsImportSection');
    if (section) {
      const isHidden = section.style.display === 'none' || !section.style.display;
      section.style.display = isHidden ? 'block' : 'none';
      console.log('Sezione import:', isHidden ? 'mostrata' : 'nascosta');
    } else {
      console.error('Sezione documentsImportSection non trovata!');
    }
  },

  /**
   * Visualizza un documento
   */
  viewDocument: function(docId) {
    const doc = this.state.documents.find(d => d.id === docId);
    if (doc && window.DDTFTView) {
      window.DDTFTView.showDocumentDetails(doc);
    }
  },

  /**
   * Modifica un documento
   */
  editDocument: function(docId) {
    const doc = this.state.documents.find(d => d.id === docId);
    if (doc && window.DDTFTCreate) {
      window.DDTFTCreate.editDocument(doc);
    }
  },

  /**
   * Elimina un documento
   */
  deleteDocument: function(docId) {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) {
      return;
    }
    
    const index = this.state.documents.findIndex(d => d.id === docId);
    if (index !== -1) {
      this.state.documents.splice(index, 1);
      this.saveDocumentsToStorage();
      this.displayDocuments();
      console.log(`✅ Documento ${docId} eliminato`);
    }
  },

  /**
   * Gestione selezione file
   */
  handleFileSelection: function(event) {
    console.log('handleFileSelection chiamato');
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.target.files;
    console.log('Files selezionati:', files.length);
    
    if (files.length > 0) {
      const countSpan = document.getElementById('selectedDocumentPDFCount');
      if (countSpan) {
        countSpan.textContent = `${files.length} file selezionati`;
      }
      console.log('Chiamando processDocumentPDF...');
      this.processDocumentPDF(files);
    }
  },

  /**
   * Processa file PDF
   */
  processDocumentPDF: function(files) {
    // Reset del debug content
    const debugContent = document.getElementById('documentDebugContent');
    if (debugContent) {
      debugContent.textContent = '=== INIZIO PROCESSAMENTO PDF DOCUMENTI ===\n\n';
    }

    // Reset documenti temporanei
    this.state.tempDocumentsToImport = [];
    
    // Mostra progress
    this.showProgress(true, 0, files.length);
    
    // Processa ogni file
    this.processMultiplePdfFiles(files);
  },

  /**
   * Processa multipli file PDF
   */
  async processMultiplePdfFiles(files) {
    const fileProcessingList = document.getElementById('documentFileProcessingList');
    if (fileProcessingList) {
      fileProcessingList.style.display = 'block';
      fileProcessingList.innerHTML = '';
    }

    const filesArray = Array.from(files);
    
    // Attendi che DDTFTImport sia disponibile
    let attempts = 0;
    const maxAttempts = 30; // 3 secondi totali
    
    console.log('⏳ Attendo caricamento modulo DDTFTImport...');
    
    while (typeof DDTFTImport === 'undefined' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
      
      // Log ogni 5 tentativi
      if (attempts % 5 === 0) {
        console.log(`⏳ Ancora in attesa... (${attempts}/${maxAttempts})`);
      }
    }
    
    if (typeof DDTFTImport === 'undefined') {
      console.error('❌ DDTFTImport non disponibile dopo 3 secondi');
      
      // Verifica quali moduli sono stati caricati
      console.log('📋 Moduli disponibili:');
      console.log('- window.DDTFTImport:', typeof window.DDTFTImport);
      console.log('- window.DDTFTPdfParser:', typeof window.DDTFTPdfParser);
      console.log('- window.DDTFTColumnParser:', typeof window.DDTFTColumnParser);
      console.log('- window.DDTExtractor:', typeof window.DDTExtractor);
      console.log('- window.FatturaExtractor:', typeof window.FatturaExtractor);
      
      alert('I moduli di importazione non sono ancora caricati.\n\nRicarica la pagina (F5) e riprova.\n\nSe il problema persiste, controlla la console per gli errori.');
      this.showProgress(false);
      return;
    }
    
    console.log('✅ DDTFTImport caricato correttamente');
    
    // Verifica anche che i metodi necessari esistano
    if (!DDTFTImport.extractTextFromPdf || !DDTFTImport.parseDocumentFromText) {
      console.error('❌ Metodi DDTFTImport mancanti');
      console.log('- extractTextFromPdf:', typeof DDTFTImport.extractTextFromPdf);
      console.log('- parseDocumentFromText:', typeof DDTFTImport.parseDocumentFromText);
      
      alert('Il modulo di importazione non è completo. Ricarica la pagina e riprova.');
      this.showProgress(false);
      return;
    }
    
    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      // Mostra solo il titolo del documento durante il caricamento
      const docTitle = file.name.replace('.pdf', '').replace('.PDF', '');
      this.updateFileProcessingList(file.name, `Caricamento ${docTitle}...`, true, true);
      
      try {
        console.log(`📄 Processando file ${i+1}/${filesArray.length}: ${file.name}`);
        
        // Estrai testo
        console.log('Estrazione testo PDF...');
        const text = await DDTFTImport.extractTextFromPdf(file);
        console.log(`Testo estratto, lunghezza: ${text.length} caratteri`);
        
        // Parsa documento
        console.log('Parsing documento...');
        const parsedDocument = await DDTFTImport.parseDocumentFromText(text, file.name);
        
        console.log(`Documento parsato da ${file.name}:`, parsedDocument);
        
        if (parsedDocument) {
          this.state.tempDocumentsToImport.push(parsedDocument);
          // Crea un riepilogo dettagliato del documento
          const docSummary = this.createDocumentSummary(parsedDocument, file.name);
          // Piccolo ritardo per mostrare la transizione
          setTimeout(() => {
            this.updateFileProcessingList(file.name, docSummary, true, false);
          }, 300);
        } else {
          setTimeout(() => {
            this.updateFileProcessingList(file.name, 'Nessun documento valido trovato', false, false);
          }, 300);
        }
      } catch (error) {
        console.error(`Errore nel processare ${file.name}:`, error);
        console.error('Stack trace:', error.stack);
        setTimeout(() => {
          this.updateFileProcessingList(file.name, `Errore: ${error.message}`, false, false);
        }, 300);
      }
      
      this.showProgress(true, i + 1, filesArray.length);
    }

    this.showProgress(false);

    console.log('Documenti importati temporaneamente:', this.state.tempDocumentsToImport);
    
    // Salva anche in sessionStorage per la sincronizzazione
    sessionStorage.setItem('tempDocuments', JSON.stringify(this.state.tempDocumentsToImport));

    if (this.state.tempDocumentsToImport.length > 0) {
      this.showDocumentPreview(this.state.tempDocumentsToImport);
      
      // Mostra anche il passo 3 con i pulsanti di conferma
      const confirmSection = document.getElementById('documentImportConfirm');
      if (confirmSection) {
        confirmSection.style.display = 'block';
      }
      
      // Abilita il pulsante di conferma
      const confirmBtn = document.getElementById('confirmDocumentUploadBtn');
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
        confirmBtn.style.cursor = 'pointer';
      }
      
      // Mostra riepilogo nel passo 3
      const resultsDiv = document.getElementById('documentUploadResults');
      if (resultsDiv) {
        resultsDiv.innerHTML = `
          <div class="alert alert-info">
            <h5>📋 Riepilogo documenti da importare:</h5>
            <ul>
              <li>Totale documenti: <strong>${this.state.tempDocumentsToImport.length}</strong></li>
              <li>DDT: <strong>${this.state.tempDocumentsToImport.filter(d => d.type === 'ddt').length}</strong></li>
              <li>Fatture: <strong>${this.state.tempDocumentsToImport.filter(d => d.type === 'ft').length}</strong></li>
            </ul>
            <p class="mb-0">Clicca su <strong>"Importa nell'Elenco"</strong> per aggiungere questi documenti all'elenco principale.</p>
          </div>
        `;
      }
    } else {
      alert('Nessun documento valido trovato nei file selezionati');
    }
  },

  /**
   * Mostra anteprima documenti
   */
  showDocumentPreview: function(documents) {
    const previewDiv = document.getElementById('documentPDFPreview');
    const previewTable = document.getElementById('documentsPreviewTable');
    
    if (!previewDiv || !previewTable) return;
    
    previewDiv.style.display = 'block';
    
    let html = `
      <table class="preview-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Numero</th>
            <th>Data</th>
            <th>Cliente</th>
            <th>Totale</th>
            <th>Prodotti</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    documents.forEach(doc => {
      // Mappa i campi dal formato nuovo a quello atteso
      const docType = doc.type || doc.tipo || 'DDT';
      const docNumber = doc.number || doc.numero || doc.documentNumber || 'N/A';
      const docDate = doc.date || doc.data || 'N/A';
      const clientName = doc.clientName || doc.cliente || 'N/A';
      const total = doc.total || doc.totale || 0;
      const itemCount = doc.items ? doc.items.length : (doc.articoli ? doc.articoli.length : 0);
      
      html += `
        <tr>
          <td><span class="doc-type-badge ${docType.toLowerCase()}">${docType.toUpperCase()}</span></td>
          <td>${docNumber}</td>
          <td>${docDate}</td>
          <td>${clientName}</td>
          <td>€ ${(parseFloat(total) || 0).toFixed(2)}</td>
          <td>${itemCount}</td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    previewTable.innerHTML = html;
  },

  /**
   * Conferma importazione documenti
   */
  confirmDocumentImport: function() {
    if (this.state.tempDocumentsToImport.length === 0) {
      alert('Nessun documento da importare');
      return;
    }

    // Aggiungi documenti all'array principale
    this.state.documents = this.state.documents.concat(this.state.tempDocumentsToImport);
    
    // Salva nel localStorage
    this.saveDocumentsToStorage();
    
    // Aggiorna visualizzazione
    this.renderDocumentsList();
    this.updateDocumentsCount();
    
    // Calcola i conteggi prima del reset
    const importedCount = this.state.tempDocumentsToImport.length;
    const ddtCount = this.state.tempDocumentsToImport.filter(d => d.type === 'ddt').length;
    const ftCount = this.state.tempDocumentsToImport.filter(d => d.type === 'ft').length;
    
    // Reset UI
    this.cancelImport();
    
    let message = `✅ Importazione completata con successo!\n\n`;
    message += `Documenti importati: ${importedCount}\n`;
    if (ddtCount > 0) message += `- DDT: ${ddtCount}\n`;
    if (ftCount > 0) message += `- Fatture: ${ftCount}\n`;
    message += `\nI documenti sono stati aggiunti all'elenco principale.`;
    
    alert(message);
    
    // Reset
    this.state.tempDocumentsToImport = [];
  },

  /**
   * Annulla importazione
   */
  cancelImport: function() {
    document.getElementById('documentsImportSection').style.display = 'none';
    document.getElementById('documentPDFPreview').style.display = 'none';
    document.getElementById('documentImportConfirm').style.display = 'none';
    document.getElementById('documentPDFInput').value = '';
    document.getElementById('selectedDocumentPDFCount').textContent = '';
    document.getElementById('confirmDocumentUploadBtn').disabled = true;
    this.state.tempDocumentsToImport = [];
  },

  /**
   * Filtra documenti
   */
  filterDocuments: function(filter) {
    this.state.currentFilter = filter;
    
    // Aggiorna classi bottoni
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    this.renderDocumentsList();
  },

  /**
   * Cerca documenti
   */
  searchDocuments: function(term) {
    this.state.searchTerm = term.toLowerCase();
    this.renderDocumentsList();
  },

  /**
   * Render lista documenti
   */
  renderDocumentsList: function() {
    const tbody = document.getElementById('documentsTableBody');
    if (!tbody) return;

    // Filtra documenti
    let filtered = this.state.documents;
    
    // Applica filtro tipo
    if (this.state.currentFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === this.state.currentFilter);
    }
    
    // Applica ricerca
    if (this.state.searchTerm) {
      filtered = filtered.filter(doc => 
        doc.clientName?.toLowerCase().includes(this.state.searchTerm) ||
        doc.number?.toLowerCase().includes(this.state.searchTerm) ||
        doc.vatNumber?.toLowerCase().includes(this.state.searchTerm)
      );
    }

    tbody.innerHTML = '';
    
    filtered.forEach(doc => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><span class="doc-type-badge ${doc.type}">${doc.type.toUpperCase()}</span></td>
        <td>${doc.number || ''}</td>
        <td>${doc.date || ''}</td>
        <td>${doc.clientName || ''}</td>
        <td>${doc.vatNumber || ''}</td>
        <td>${doc.deliveryAddress || ''}</td>
        <td>${doc.orderReference || ''}</td>
        <td>${doc.items ? doc.items.length : 0}</td>
        <td>€ ${(parseFloat(doc.subtotal) || 0).toFixed(2)}</td>
        <td>€ ${(parseFloat(doc.total) || 0).toFixed(2)}</td>
        <td>
          <button class="btn-icon" onclick="DDTFTModule.showDocumentDetails('${doc.id}')" style="opacity: 1 !important; visibility: visible !important; background-color: #f8f9fa !important; color: #495057 !important; border: 1px solid #dee2e6 !important; padding: 8px !important; border-radius: 4px !important; cursor: pointer !important;">
            <i class="fas fa-eye"></i> Dettagli
          </button>
          <button class="btn-icon btn-delete" onclick="DDTFTModule.deleteDocument('${doc.id}')" style="opacity: 1 !important; visibility: visible !important; background-color: #dc3545 !important; color: white !important; border: none !important; padding: 8px !important; border-radius: 4px !important; cursor: pointer !important; margin-left: 5px !important;">
            <i class="fas fa-trash"></i> Elimina
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  },

  /**
   * Mostra dettagli documento
   */
  showDocumentDetails: function(docId) {
    const doc = this.state.documents.find(d => d.id === docId);
    if (!doc) return;

    DDTFTView.showDocumentDetails(doc);
  },

  /**
   * Elimina documento
   */
  deleteDocument: function(docId) {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) return;
    
    this.state.documents = this.state.documents.filter(d => d.id !== docId);
    this.saveDocumentsToStorage();
    this.renderDocumentsList();
    this.updateDocumentsCount();
  },

  /**
   * Cancella tutti i documenti
   */
  clearAllDocuments: function() {
    if (!confirm('Sei sicuro di voler eliminare TUTTI i documenti DDT/FT?\n\nQuesta azione cancellerà:\n- Documenti temporanei non salvati\n- Documenti sincronizzati\n- File Excel salvati\n\nQuesta azione NON può essere annullata.')) return;
    
    // Cancella documenti temporanei in memoria
    this.state.documents = [];
    this.state.tempDocumentsToImport = [];
    
    // Cancella documenti da localStorage
    localStorage.removeItem('ddtftDocuments');
    localStorage.removeItem('ddtftFileData');
    
    // Cancella documenti da sessionStorage
    sessionStorage.removeItem('tempDocuments');
    
    // Aggiorna l'interfaccia
    this.saveDocumentsToStorage();
    this.renderDocumentsList();
    this.updateDocumentsCount();
    
    // Nascondi eventuali preview
    const previewSection = document.getElementById('documentImportPreview');
    if (previewSection) {
      previewSection.innerHTML = '';
    }
    
    const confirmSection = document.getElementById('documentImportConfirm');
    if (confirmSection) {
      confirmSection.style.display = 'none';
    }
    
    console.log('✅ Tutti i documenti DDT/FT sono stati cancellati');
    alert('Tutti i documenti DDT/FT sono stati cancellati con successo.');
  },

  /**
   * Esporta documenti in Excel
   */
  exportDocumentsToExcel: function() {
    try {
      // Prendi tutti i documenti disponibili
      let documentsToExport = this.state.documents;
      
      if (!documentsToExport || documentsToExport.length === 0) {
        alert('Nessun documento da esportare');
        return;
      }

      console.log(`📊 Esportazione di ${documentsToExport.length} documenti...`);
      
      // FIX CRITICO: Correggi le descrizioni prima dell'export
      console.log('=== CORREZIONE DESCRIZIONI PRIMA DELL\'EXPORT ===');
      let fixedDescriptions = 0;
      
      // Crea una copia profonda per non modificare i dati originali
      documentsToExport = JSON.parse(JSON.stringify(documentsToExport));
      
      documentsToExport.forEach((doc, docIndex) => {
        if (doc.items && Array.isArray(doc.items)) {
          doc.items.forEach((item, itemIndex) => {
            // Debug: log dei primi items
            if (docIndex < 2 && itemIndex < 3) {
              console.log(`Doc ${docIndex + 1}, Item ${itemIndex + 1} PRIMA:`, {
                code: item.code,
                description: item.description,
                tipo: typeof item.description,
                campi: Object.keys(item)
              });
            }
            
            // Se la descrizione è "0", numero o mancante
            if (!item.description || item.description === "0" || item.description === 0 || 
                typeof item.description === 'number' || item.description === '') {
              
              console.warn(`⚠️ Descrizione invalida: "${item.description}" per prodotto ${item.code}`);
              
              // Prova tutti i possibili campi alternativi
              const possibleFields = [
                'descrizione', 'descrizioneProdotto', 'desc', 'nome', 
                'nomeProdotto', 'articolo', 'denominazione', 'name', 'productName'
              ];
              
              let found = false;
              for (const field of possibleFields) {
                if (item[field] && item[field] !== "0" && item[field] !== 0) {
                  item.description = String(item[field]);
                  console.log(`✅ Descrizione recuperata da campo "${field}": ${item.description}`);
                  fixedDescriptions++;
                  found = true;
                  break;
                }
              }
              
              // Se ancora non trovata, cerca in proprietà numeriche
              if (!found) {
                for (let i = 0; i < 10; i++) {
                  if (item[i] && typeof item[i] === 'string' && item[i].length > 5 && 
                      item[i] !== "0" && !/^\d+$/.test(item[i])) {
                    item.description = item[i];
                    console.log(`✅ Descrizione recuperata da indice [${i}]: ${item.description}`);
                    fixedDescriptions++;
                    found = true;
                    break;
                  }
                }
              }
              
              // Ultimo fallback
              if (!found) {
                item.description = `Articolo ${item.code || 'SCONOSCIUTO'}`;
                console.log(`⚠️ Descrizione non trovata, uso fallback: ${item.description}`);
                fixedDescriptions++;
              }
            }
            
            // Assicurati che sia sempre una stringa
            item.description = String(item.description);
            
            // Debug: log dei primi items dopo la correzione
            if (docIndex < 2 && itemIndex < 3) {
              console.log(`Doc ${docIndex + 1}, Item ${itemIndex + 1} DOPO:`, {
                code: item.code,
                description: item.description,
                tipo: typeof item.description
              });
            }
          });
        }
      });
      
      console.log(`✅ Corrette ${fixedDescriptions} descrizioni prima dell'export`);
      console.log('=== FINE CORREZIONE DESCRIZIONI ===');

      // USA IL NUOVO SISTEMA CON APPEND
      // Verifica se il modulo export append è disponibile
      if (window.DDTFTModule && window.DDTFTModule.exportWithAppend) {
        console.log('Uso export con possibilità di append');
        window.DDTFTModule.exportWithAppend();
      }
      // Fallback all'export normale se il modulo append non è disponibile
      else if (window.DDTFTExportExcel && window.DDTFTExportExcel.exportToExcel) {
        console.log('Fallback a export semplice diretto');
        window.DDTFTExportExcel.exportToExcel(documentsToExport);
      }
      // Fallback se nessun modulo è disponibile
      else if (window.exportDDTFTToExcel) {
        window.exportDDTFTToExcel(documentsToExport);
      }
      else {
        console.error('Nessun modulo di export disponibile');
        alert('Il modulo di esportazione non è ancora caricato. Riprova tra qualche istante.');
      }
    } catch (error) {
      console.error('Errore durante l\'esportazione:', error);
      alert('Errore durante l\'esportazione: ' + error.message);
    }
  },

  /**
   * Aggiorna contatore documenti
   */
  updateDocumentsCount: function() {
    const countEl = document.getElementById('totalDocumentsCount');
    if (countEl) {
      countEl.textContent = this.state.documents.length;
    }
  },

  /**
   * Mostra/nasconde progress
   */
  showProgress: function(show, current = 0, total = 0) {
    const progressDiv = document.getElementById('documentProcessingProgress');
    const progressBar = document.getElementById('documentProgressBar');
    const progressText = document.getElementById('documentProgressText');
    
    if (!progressDiv) return;
    
    progressDiv.style.display = show ? 'block' : 'none';
    
    if (show && total > 0) {
      const percentage = (current / total) * 100;
      progressBar.style.width = percentage + '%';
      progressText.textContent = `Processando file ${current} di ${total}`;
    }
  },

  /**
   * Crea un riepilogo dettagliato del documento
   */
  createDocumentSummary: function(doc, fileName) {
    const docType = doc.type === 'ddt' ? 'DDT' : 'Fattura';
    const totalItems = doc.items ? doc.items.length : 0;
    const totalQuantity = doc.items ? doc.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) : 0;
    
    return `
      <div style="padding: 10px;">
        <div style="font-weight: bold; color: #155724;">
          ✅ ${docType} importato con successo
        </div>
        <div style="margin-top: 8px; padding: 10px; background: rgba(255,255,255,0.9); border-radius: 4px;">
          <div style="color: #155724; margin-bottom: 5px;">
            <span style="color: #007bff;">📄</span> <strong>${fileName}</strong>
          </div>
          <div style="font-size: 13px; color: #495057; line-height: 1.6;">
            <div>🏢 Cliente: <strong>${doc.clientName || 'Non specificato'}</strong></div>
            <div>📍 Consegna: ${doc.deliveryAddress || 'Non specificato'}</div>
            <div>📋 ${docType} N°: <strong>${doc.number || 'N/A'}</strong> del ${doc.date || 'N/A'}</div>
            <div>📦 Prodotti: <strong>${totalItems}</strong> articoli (${totalQuantity.toFixed(2)} PZ)</div>
            <div>💰 Imponibile: <strong>€ ${(parseFloat(doc.subtotal) || 0).toFixed(2)}</strong></div>
            <div>🧾 P.IVA: ${doc.vatNumber || 'Non specificata'}</div>
            <div style="margin-top: 5px; font-weight: bold; color: #28a745;">
              💶 Totale: € ${(parseFloat(doc.total) || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Aggiorna lista file in elaborazione
   */
  updateFileProcessingList: function(fileName, status, success, isProcessing = false) {
    const list = document.getElementById('documentFileProcessingList');
    if (!list) return;
    
    list.style.display = 'block';
    
    let item = list.querySelector(`[data-file="${fileName}"]`);
    
    if (!item) {
      // Crea nuovo elemento come nel modulo ordini
      item = document.createElement('div');
      item.setAttribute('data-file', fileName);
      
      // Stile iniziale giallo per processing
      item.style.cssText = `
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
      
      list.appendChild(item);
      
      // Scroll fluido verso il nuovo elemento
      setTimeout(() => {
        list.scrollTo({
          top: list.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
    
    if (isProcessing) {
      // Durante l'elaborazione - sfondo giallo
      item.style.backgroundColor = '#fff3cd';
      item.style.color = '#856404';
      item.innerHTML = `
        <span style="flex: 1;">${fileName}</span>
        <span style="margin-left: 10px;">⏳ In elaborazione...</span>
      `;
    } else if (success && status.includes('<div')) {
      // Successo con riepilogo dettagliato - sfondo verde
      item.style.backgroundColor = '#d4edda';
      item.style.color = '#155724';
      item.style.padding = '0';
      item.innerHTML = status;
    } else if (success) {
      // Successo semplice - sfondo verde
      item.style.backgroundColor = '#d4edda';
      item.style.color = '#155724';
      item.innerHTML = `
        <span style="flex: 1;">${fileName}</span>
        <span style="margin-left: 10px;">✅ ${status}</span>
      `;
    } else {
      // Errore - sfondo rosso
      item.style.backgroundColor = '#f8d7da';
      item.style.color = '#721c24';
      item.innerHTML = `
        <span style="flex: 1;">${fileName}</span>
        <span style="margin-left: 10px;">❌ ${status}</span>
      `;
    }
  },

  /**
   * Salva documenti nel localStorage
   */
  saveDocumentsToStorage: function() {
    try {
      localStorage.setItem('ddtftDocuments', JSON.stringify(this.state.documents));
    } catch (e) {
      console.error('Errore nel salvataggio documenti:', e);
    }
  },

  /**
   * Carica documenti dal localStorage
   */
  loadDocumentsFromStorage: function() {
    try {
      const stored = localStorage.getItem('ddtftDocuments');
      if (stored) {
        this.state.documents = JSON.parse(stored);
        console.log(`Caricati ${this.state.documents.length} documenti dal localStorage`);
      }
    } catch (e) {
      console.error('Errore nel caricamento documenti:', e);
      this.state.documents = [];
    }
  },

};

// Esporta il modulo
window.DDTFTModule = DDTFTModule;

// Verifica che tutti i moduli necessari siano caricati
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Verifica moduli DDT/FT dopo DOMContentLoaded:');
    console.log('- DDTFTImport:', typeof window.DDTFTImport);
    console.log('- DDTFTPdfParser:', typeof window.DDTFTPdfParser);
    console.log('- DDTFTColumnParser:', typeof window.DDTFTColumnParser);
    console.log('- DDTExtractor:', typeof window.DDTExtractor);
    console.log('- FatturaExtractor:', typeof window.FatturaExtractor);
    
    if (typeof window.DDTFTImport === 'undefined') {
      console.error('⚠️ ATTENZIONE: DDTFTImport non caricato correttamente!');
    }
  });
} else {
  // Il DOM è già caricato
  setTimeout(() => {
    console.log('🎯 Verifica moduli DDT/FT (DOM già caricato):');
    console.log('- DDTFTImport:', typeof window.DDTFTImport);
    console.log('- DDTFTPdfParser:', typeof window.DDTFTPdfParser);
    console.log('- DDTFTColumnParser:', typeof window.DDTFTColumnParser);
    
    if (typeof window.DDTFTImport === 'undefined') {
      console.error('⚠️ ATTENZIONE: DDTFTImport non caricato correttamente!');
    }
  }, 500);
}