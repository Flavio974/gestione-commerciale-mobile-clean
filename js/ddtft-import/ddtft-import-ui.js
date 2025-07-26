/**
 * DDTFT Import UI Module
 * Gestisce le funzioni dell'interfaccia utente
 */

export const DDTFTImportUI = {
  /**
   * Esporta documenti in Excel
   */
  exportDocumentsToExcel: function(documents) {
    // Usa il modulo esterno se disponibile
    if (window.DDTFTImportExport && window.DDTFTImportExport.exportDocumentsToExcel) {
      return window.DDTFTImportExport.exportDocumentsToExcel(documents);
    }
    
    // Fallback al codice originale
    if (window.DDTFTExportExcel) {
      window.DDTFTExportExcel.exportDocumentsToExcel(documents);
    } else {
      console.error('Modulo DDTFTExportExcel non caricato');
      alert('Modulo di esportazione Excel non disponibile');
    }
  },
  
  /**
   * Visualizza il contenuto DDT-FT
   */
  viewDDTFTContent: function() {
    if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.viewDDTFTContent) {
      return window.DDTFTUIDialogs.viewDDTFTContent();
    }
    
    // Implementazione base
    console.log('Visualizzazione contenuto DDT-FT');
    const ddtftData = localStorage.getItem('ddtftFileData');
    if (ddtftData) {
      const data = JSON.parse(ddtftData);
      console.log(`Dati DDTFT: ${data.length} righe`);
      alert(`Dati DDT-FT caricati: ${data.length} righe`);
    } else {
      alert('Nessun dato DDT-FT trovato');
    }
  },
  
  /**
   * Analizza i dati DDT-FT
   */
  analyzeDDTFTData: function(data) {
    if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.analyzeDDTFTData) {
      return window.DDTFTUIDialogs.analyzeDDTFTData(data);
    }
    
    // Implementazione base
    if (!data || !Array.isArray(data)) {
      return {
        totalRows: 0,
        uniqueClients: 0,
        totalValue: 0
      };
    }
    
    const stats = {
      totalRows: data.length,
      uniqueClients: new Set(data.map(row => row[1])).size, // Assumendo che il cliente sia nella colonna 1
      totalValue: data.reduce((sum, row) => {
        const value = parseFloat(row[row.length - 1]) || 0; // Ultimo valore come importo
        return sum + value;
      }, 0)
    };
    
    return stats;
  },
  
  /**
   * Mostra modal con contenuto DDT-FT
   */
  showDDTFTContentModal: function(stats, totalRows) {
    if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.showDDTFTContentModal) {
      return window.DDTFTUIDialogs.showDDTFTContentModal(stats, totalRows);
    }
    
    // Implementazione base
    const message = `Statistiche DDT-FT:
- Righe totali: ${totalRows}
- Clienti unici: ${stats.uniqueClients || 'N/A'}
- Valore totale: €${stats.totalValue || 0}`;
    
    alert(message);
  },
  
  /**
   * Mostra dialog di sincronizzazione
   */
  showSyncDialog: function() {
    if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.showSyncDialog) {
      return window.DDTFTUIDialogs.showSyncDialog();
    }
    
    // Implementazione base
    console.log('Mostra dialog sincronizzazione');
    // Qui si potrebbe aprire un modal per la sincronizzazione
  },
  
  /**
   * Chiude dialog di sincronizzazione
   */
  closeSyncDialog: function() {
    if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.closeSyncDialog) {
      return window.DDTFTUIDialogs.closeSyncDialog();
    }
    
    // Implementazione base
    console.log('Chiude dialog sincronizzazione');
  },
  
  /**
   * Gestisce il reset dei dati DDT-FT
   */
  handleResetDDTFT: function() {
    if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.handleResetDDTFT) {
      return window.DDTFTUIDialogs.handleResetDDTFT();
    }
    
    // Implementazione base
    if (confirm('Sei sicuro di voler resettare tutti i dati DDT-FT?')) {
      localStorage.removeItem('ddtftFileData');
      alert('Dati DDT-FT resettati');
    }
  },
  
  /**
   * Mostra modal di caricamento
   */
  showLoadingModal: function(message) {
    if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.showLoadingModal) {
      return window.DDTFTUIDialogs.showLoadingModal(message);
    }
    
    // Implementazione base
    const modal = document.createElement('div');
    modal.id = 'ddtft-loading-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    
    modal.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
        <div>📄 ${message}</div>
        <div style="margin-top: 10px;">Attendere...</div>
      </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
  },
  
  /**
   * Mostra risultati di sincronizzazione
   */
  showSyncResults: function(rowCount, stats) {
    if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.showSyncResults) {
      return window.DDTFTUIDialogs.showSyncResults(rowCount, stats);
    }
    
    // Implementazione base
    const message = `Sincronizzazione completata!
    
- Righe importate: ${rowCount}
- Clienti unici: ${stats.uniqueClients || 'N/A'}
- Valore totale: €${stats.totalValue || 0}`;
    
    alert(message);
  }
};