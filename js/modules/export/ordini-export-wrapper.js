/**
 * Ordini Export Wrapper
 * Mantiene la compatibilità con il vecchio sistema window.OrdiniExport
 * Questo garantisce che il codice esistente continui a funzionare
 */

(function() {
  'use strict';

  // Crea l'oggetto OrdiniExport per mantenere la compatibilità
  window.OrdiniExport = {
    /**
     * Funzione principale per esportare ordini in Excel
     * Chiamata da ordini.js e ordini-ui.js
     */
    exportOrdersToExcel: function(orders) {
      console.log('🔄 OrdiniExport.exportOrdersToExcel chiamato (wrapper)');
      
      // Verifica che il nuovo sistema sia pronto
      if (window.ExportCoordinator) {
        // Passa gli ordini al nuovo coordinatore
        if (orders && orders.length > 0) {
          window.ExportCoordinator.setCurrentOrders(orders);
        }
        window.ExportCoordinator.exportOrdersToExcel(orders);
      } else {
        // Fallback se il coordinatore non è ancora pronto
        console.warn('ExportCoordinator non ancora disponibile, riprovo...');
        setTimeout(() => {
          if (window.ExportCoordinator) {
            if (orders && orders.length > 0) {
              window.ExportCoordinator.setCurrentOrders(orders);
            }
            window.ExportCoordinator.exportOrdersToExcel(orders);
          } else {
            alert('Sistema di export non disponibile. Ricaricare la pagina.');
          }
        }, 500);
      }
    },

    /**
     * Visualizza il contenuto del file ORDINI
     * Chiamata da ordini-ui.js
     */
    viewVendutoContent: function() {
      console.log('🔄 OrdiniExport.viewVendutoContent chiamato (wrapper)');
      
      if (window.VendutoAnalytics) {
        window.VendutoAnalytics.viewVendutoContent();
      } else {
        console.error('VendutoAnalytics non disponibile');
        alert('Funzionalità non disponibile. Ricaricare la pagina.');
      }
    },

    /**
     * Mostra dialog di sincronizzazione
     * Chiamata da ordini-ui.js
     */
    showSyncDialog: function() {
      console.log('🔄 OrdiniExport.showSyncDialog chiamato (wrapper)');
      
      if (window.ExportDialogManager) {
        window.ExportDialogManager.showSyncDialog();
      } else {
        console.error('ExportDialogManager non disponibile');
        alert('Funzionalità non disponibile. Ricaricare la pagina.');
      }
    },

    // Metodi aggiuntivi per compatibilità completa
    
    /**
     * Chiude il dialog di export
     */
    closeExportDialog: function() {
      if (window.ExportDialogManager) {
        window.ExportDialogManager.closeExportDialog();
      }
    },

    /**
     * Chiude il dialog di sincronizzazione
     */
    closeSyncDialog: function() {
      if (window.ExportDialogManager) {
        window.ExportDialogManager.closeDialog('sync');
      }
    },

    /**
     * Gestori per i pulsanti di export (compatibilità)
     */
    handleExportOrdini: function() {
      if (window.ExportCoordinator) {
        window.ExportCoordinator.handleExportOrdini();
      }
    },

    handleExportVenduto: function() {
      if (window.ExportCoordinator) {
        window.ExportCoordinator.handleExportVenduto();
      }
    },

    handleExportNew: function() {
      if (window.ExportCoordinator) {
        window.ExportCoordinator.handleExportNew();
      }
    },

    /**
     * Ottiene il conteggio righe ORDINI
     */
    getVendutoCount: function() {
      if (window.ExportDialogManager) {
        return window.ExportDialogManager.getVendutoCount();
      }
      return 0;
    },

    /**
     * Import file ORDINI
     */
    importVendutoFromFile: function(file) {
      if (window.FileIOManager) {
        window.FileIOManager.importVendutoFromFile(file);
      }
    },

    /**
     * Variabili di stato per compatibilità
     */
    _ordersToExport: [],
    _vendutoTempData: null,
    _proceedWithUniqueOnly: false,
    _proceedWithAll: false,

    /**
     * Continua export ORDINI (compatibilità con vecchio sistema)
     */
    _continueVendutoExport: function() {
      if (window.VendutoExporter) {
        if (this._proceedWithUniqueOnly) {
          window.VendutoExporter.proceedWithUnique();
        } else if (this._proceedWithAll) {
          window.VendutoExporter.proceedWithAll();
        }
      }
      
      // Reset flags
      this._proceedWithUniqueOnly = false;
      this._proceedWithAll = false;
    }
  };

  console.log('✅ OrdiniExport wrapper caricato - compatibilità mantenuta');
})();