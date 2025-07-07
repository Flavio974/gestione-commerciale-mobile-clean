/**
 * Ordini Export Dialog Manager
 * Gestisce tutti i dialog e l'interfaccia utente per l'export
 */

(function() {
  'use strict';

  class ExportDialogManager {
    constructor() {
      this.activeDialogs = new Map();
    }

    /**
     * Mostra il dialog principale di export con le opzioni
     */
    showExportDialog(orders) {
      this.closeAllDialogs();
      
      const modal = document.createElement('div');
      modal.id = 'exportDialogModal';
      modal.className = 'modal';
      modal.style.cssText = 'display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
      
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.style.cssText = 'background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 500px; border-radius: 8px;';
      
      modalContent.innerHTML = `
        <span class="close" onclick="window.ExportDialogManager.closeExportDialog()" style="float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
        <h3 style="margin-top: 0;">Esportazione Ordini</h3>
        <p>Seleziona la modalità di esportazione:</p>
        
        <div style="margin: 20px 0;">
          <button class="btn btn-primary" onclick="window.ExportCoordinator.handleExportOrdini()" style="width: 100%; margin-bottom: 10px; padding: 10px;">
            📊 Esporta file ORDINI.xlsx
            <br><small>Per Dropbox: CARTELLA_MIA_APPLICAZIONE\\ORDINI</small>
          </button>
          
          <button class="btn btn-success" onclick="window.ExportCoordinator.handleExportVenduto()" style="width: 100%; margin-bottom: 10px; padding: 10px;">
            📋 Aggiorna file ORDINI.xlsx
            <br><small>File permanente con storico vendite</small>
          </button>
          
          <button class="btn btn-info" onclick="window.ExportCoordinator.handleExportNew()" style="width: 100%; padding: 10px;">
            📄 Esporta in nuovo file
            <br><small>File con data odierna</small>
          </button>
        </div>
        
        <p style="font-size: 12px; color: #666; margin-top: 15px;">
          <strong>Nota:</strong> Dopo il download, salva il file ORDINI.xlsx in:<br>
          <code style="background: #f0f0f0; padding: 2px 5px; border-radius: 3px;">C:\\Users\\FLAVIO\\Dropbox\\2025\\CARTELLA_MIA_APPLICAZIONE\\ORDINI</code>
        </p>
        
        <button class="btn btn-secondary" onclick="window.ExportDialogManager.closeExportDialog()">
          ❌ Annulla
        </button>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      this.activeDialogs.set('export', modal);
    }

    /**
     * Mostra dialog per confronto file ORDINI
     */
    showVendutoComparisonDialog() {
      this.closeDialog('comparison');
      
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.cssText = 'display: block; position: fixed; z-index: 1002; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
      
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.style.cssText = 'background-color: #fefefe; margin: 10% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 600px; border-radius: 8px;';
      
      modalContent.innerHTML = `
        <h3>📋 Aggiornamento File ORDINI</h3>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #e7f3ff; border-radius: 5px;">
          <h4 style="margin-top: 0; color: #0066cc;">Per confrontare i dati:</h4>
          <p>1. Carica il file ORDINI.xlsx esistente per verificare i duplicati</p>
          <p>2. Oppure procedi senza confronto (usa solo la memoria del browser)</p>
        </div>
        
        <div style="margin: 20px 0; display: flex; flex-direction: column; gap: 10px;">
          <input type="file" id="vendutoCompareFile" accept=".xlsx" style="display: none;">
          
          <button class="btn btn-primary" id="vendutoLoadBtn" style="padding: 10px;">
            📁 Carica file ORDINI.xlsx per confronto
            <br><small>Confronta con il file reale prima di aggiungere nuovi dati</small>
          </button>
          
          <button class="btn btn-warning" id="vendutoProceedBtn" style="padding: 10px;">
            🔄 Procedi senza confronto
            <br><small>Usa solo la memoria del browser</small>
          </button>
          
          <button class="btn btn-secondary" id="vendutoCancelBtn" style="padding: 10px;">
            ❌ Annulla
          </button>
        </div>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      this.activeDialogs.set('comparison', modal);
      
      // Aggiungi event listeners dopo che il DOM è stato creato
      const fileInput = document.getElementById('vendutoCompareFile');
      const loadBtn = document.getElementById('vendutoLoadBtn');
      const proceedBtn = document.getElementById('vendutoProceedBtn');
      const cancelBtn = document.getElementById('vendutoCancelBtn');
      
      // Handler per caricamento file
      if (fileInput && loadBtn) {
        loadBtn.addEventListener('click', () => {
          console.log('Cliccato bottone carica file');
          fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
          console.log('File selezionato:', e.target.files[0]);
          if (e.target.files && e.target.files[0]) {
            if (window.ExportCoordinator && window.ExportCoordinator.vendutoExporter) {
              window.ExportCoordinator.vendutoExporter.compareWithFile(e.target.files[0]);
            } else {
              console.error('VendutoExporter non disponibile');
              window.ExportDialogManager.showMessage('Errore: sistema export non pronto', 'error');
            }
          }
        });
      }
      
      // Handler per procedere senza confronto
      if (proceedBtn) {
        proceedBtn.addEventListener('click', () => {
          console.log('Procedi senza confronto');
          this.closeDialog('comparison');
          if (window.ExportCoordinator && window.ExportCoordinator.vendutoExporter) {
            window.ExportCoordinator.vendutoExporter.exportWithoutComparison();
          }
        });
      }
      
      // Handler per annulla
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          console.log('Annulla operazione');
          this.closeDialog('comparison');
        });
      }
    }

    /**
     * Mostra dialog con duplicati trovati
     */
    showDuplicatesDialog(duplicates, uniqueData, onProceed) {
      this.closeDialog('duplicates');
      
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.cssText = 'display: block; position: fixed; z-index: 1002; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
      
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.style.cssText = 'background-color: #fefefe; margin: 10% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 700px; max-height: 80vh; overflow-y: auto; border-radius: 8px;';
      
      // Determina se stiamo confrontando con file o memoria
      const isFileComparison = window.VendutoExporter && window.VendutoExporter.isUsingFileData === true;
      
      modalContent.innerHTML = `
        <h3 style="color: #dc3545;">⚠️ Attenzione: Dati già presenti ${isFileComparison ? 'nel FILE EXCEL' : 'nella memoria del browser'}</h3>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
          <p style="margin: 0; color: #856404;">
            <strong>${duplicates.length}</strong> prodotti su ${duplicates.length + uniqueData.length} sono già presenti ${isFileComparison ? '<strong>nel FILE EXCEL CARICATO</strong>' : 'nella memoria del browser'}.
          </p>
          ${isFileComparison ? `
            <p style="margin: 10px 0 0 0; color: #28a745; font-size: 14px;">
              <strong>✅ CONFRONTO CON FILE REALE:</strong> Questi duplicati esistono effettivamente nel file Excel che hai caricato.
            </p>
          ` : `
            <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
              <strong>⚠️ ATTENZIONE:</strong> Questi dati sono nella memoria locale del browser e potrebbero non essere nel file Excel reale se l'hai svuotato manualmente.
            </p>
          `}
        </div>
        
        <div style="margin: 20px 0;">
          <h4>Cosa vuoi fare?</h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="btn btn-primary" onclick="window.ExportDialogManager.closeDialog('duplicates'); window.ExportCoordinator.vendutoExporter.proceedWithUnique();" style="padding: 10px;">
              ✅ Aggiungi solo i ${uniqueData.length} prodotti nuovi
              <br><small>Evita duplicati ${isFileComparison ? 'già nel file Excel' : 'nella memoria'}</small>
            </button>
            
            <button class="btn btn-warning" onclick="window.ExportDialogManager.closeDialog('duplicates'); window.ExportCoordinator.vendutoExporter.proceedWithAll();" style="padding: 10px;">
              🔄 Aggiungi tutti i prodotti
              <br><small>Includi anche quelli già ${isFileComparison ? 'nel file Excel' : 'in memoria'}</small>
            </button>
            
            <button class="btn btn-danger" onclick="if(confirm('Questo cancellerà tutti i dati salvati nella memoria del browser. Sei sicuro?')) { localStorage.removeItem('ordiniFileData'); alert('Memoria cancellata. Ora puoi riesportare tutti i dati.'); window.ExportDialogManager.closeDialog('duplicates'); }" style="padding: 10px;">
              🗑️ Cancella memoria e ricomincia
              <br><small>Rimuove tutti i dati dalla memoria del browser</small>
            </button>
            
            <button class="btn btn-secondary" onclick="window.ExportDialogManager.closeDialog('duplicates')" style="padding: 10px;">
              ❌ Annulla operazione
            </button>
          </div>
        </div>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      this.activeDialogs.set('duplicates', modal);
    }

    /**
     * Mostra messaggio di successo/errore
     */
    showMessage(message, type = 'success') {
      this.closeDialog('message');
      
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.cssText = 'display: block; position: fixed; z-index: 1001; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
      
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.style.cssText = 'background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 500px; border-radius: 8px;';
      
      const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
      const color = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ffc107';
      
      modalContent.innerHTML = `
        <h3 style="color: ${color};">${icon} ${type === 'success' ? 'Operazione completata' : type === 'error' ? 'Errore' : 'Attenzione'}</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="window.ExportDialogManager.closeDialog('message')">OK</button>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      this.activeDialogs.set('message', modal);
    }

    /**
     * Mostra dialog per sincronizzazione file ORDINI
     */
    showSyncDialog() {
      this.closeDialog('sync');
      
      const vendutoCount = this.getVendutoCount();
      
      const modal = document.createElement('div');
      modal.id = 'syncDialogModal';
      modal.className = 'modal';
      modal.style.cssText = 'display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
      
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.style.cssText = 'background-color: #fefefe; margin: 10% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 600px; border-radius: 8px;';
      
      modalContent.innerHTML = `
        <span class="close" onclick="window.ExportDialogManager.closeDialog('sync')" style="float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
        <h3 style="margin-top: 0;">🔄 Sincronizzazione File ORDINI</h3>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <h4 style="margin-top: 0;">Stato attuale:</h4>
          <p>Il file ORDINI contiene attualmente <strong>${vendutoCount} righe</strong>.</p>
        </div>
        
        <div style="margin: 20px 0;">
          <h4>Operazioni disponibili:</h4>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="btn btn-info" onclick="window.ExportCoordinator.analytics.viewVendutoContent(); window.ExportDialogManager.closeDialog('sync');" style="padding: 10px 20px;">
              👁️ Visualizza contenuto ORDINI
            </button>
            
            <button class="btn btn-warning" onclick="if(confirm('Sei sicuro di voler cancellare tutto il contenuto del file ORDINI?')) { localStorage.removeItem('ordiniFileData'); alert('File ORDINI cancellato con successo!'); window.ExportDialogManager.closeDialog('sync'); location.reload(); }" style="padding: 10px 20px;">
              🗑️ Cancella file ORDINI
            </button>
            
            <input type="file" id="vendutoImportFile" accept=".xlsx" style="display: none;" onchange="window.ExportCoordinator.fileIO.importVendutoFromFile(this.files[0])">
            <button class="btn btn-primary" onclick="document.getElementById('vendutoImportFile').click()" style="padding: 10px 20px;">
              📁 Importa file ORDINI.xlsx esistente
            </button>
            
            <button class="btn btn-success" onclick="window.ExportDialogManager.syncVendutoToSupabase()" style="padding: 10px 20px;">
              🔄 Sincronizza dati importati con Supabase
              <br><small>Carica i dati del file Excel già importato nell'app</small>
            </button>
          </div>
        </div>
        
        <button class="btn btn-secondary" onclick="window.ExportDialogManager.closeDialog('sync')">
          Chiudi
        </button>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      this.activeDialogs.set('sync', modal);
    }

    /**
     * Chiude un dialog specifico
     */
    closeDialog(type) {
      const dialog = this.activeDialogs.get(type);
      if (dialog) {
        dialog.remove();
        this.activeDialogs.delete(type);
      }
    }

    /**
     * Chiude il dialog di export
     */
    closeExportDialog() {
      this.closeDialog('export');
    }

    /**
     * Chiude tutti i dialog aperti
     */
    closeAllDialogs() {
      this.activeDialogs.forEach(dialog => dialog.remove());
      this.activeDialogs.clear();
    }

    /**
     * Sincronizza dati ORDINI importati con Supabase
     */
    async syncVendutoToSupabase() {
      if (!window.SupabaseSyncVenduto) {
        this.showMessage('SupabaseSyncVenduto non disponibile', 'error');
        return;
      }

      try {
        this.showMessage('🔄 Avvio sincronizzazione con Supabase...', 'info');
        
        const syncer = new window.SupabaseSyncVenduto();
        const result = await syncer.syncFromLocalStorage();
        
        if (result.success) {
          this.showMessage(
            `✅ Sincronizzazione completata!<br><br>
            Record inseriti: <strong>${result.inserted}</strong><br>
            Record aggiornati: <strong>${result.updated}</strong><br>
            Totale processati: <strong>${result.total}</strong>`,
            'success'
          );
          
          // Chiudi dialog dopo 3 secondi
          setTimeout(() => {
            this.closeDialog('sync');
          }, 3000);
          
        } else {
          const errorMsg = result.reason === 'no_data' 
            ? 'Nessun dato ORDINI trovato nell\'app. Importa prima un file Excel.'
            : result.reason === 'disabled'
            ? 'Sincronizzazione Supabase disabilitata. Verifica la configurazione.'
            : 'Errore durante la sincronizzazione: ' + (result.error || 'Errore sconosciuto');
            
          this.showMessage(errorMsg, 'error');
        }
        
      } catch (error) {
        console.error('❌ Errore sync:', error);
        this.showMessage('Errore durante la sincronizzazione: ' + error.message, 'error');
      }
    }

    /**
     * Ottiene il conteggio righe ORDINI
     */
    getVendutoCount() {
      try {
        const savedVenduto = localStorage.getItem('ordiniFileData');
        if (savedVenduto) {
          return JSON.parse(savedVenduto).length;
        }
      } catch (e) {
        console.error('Errore nel conteggio ORDINI:', e);
      }
      return 0;
    }
  }

  // Espone la classe globalmente
  window.ExportDialogManager = new ExportDialogManager();
})();