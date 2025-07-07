/**
 * Ordini Export Coordinator
 * Coordinatore principale che integra tutti i moduli di export
 */

(function() {
  'use strict';

  class ExportCoordinator {
    constructor() {
      // Stato globale
      this.currentOrders = [];
      this._ordersToExport = [];
      
      // Inizializza riferimenti ai moduli (saranno disponibili dopo il caricamento)
      this.dialogManager = null;
      this.dropboxExporter = null;
      this.vendutoExporter = null;
      this.analytics = null;
      this.fileIO = null;
      
      // Inizializza dopo che tutti i moduli sono caricati
      this.initializeModules();
    }

    /**
     * Inizializza i riferimenti ai moduli
     */
    initializeModules() {
      // Attendi che tutti i moduli siano caricati
      const checkModules = () => {
        if (window.ExportDialogManager && 
            window.DropboxExporter && 
            window.VendutoExporter && 
            window.VendutoAnalytics && 
            window.FileIOManager) {
          
          this.dialogManager = window.ExportDialogManager;
          this.dropboxExporter = window.DropboxExporter;
          this.vendutoExporter = window.VendutoExporter;
          this.analytics = window.VendutoAnalytics;
          this.fileIO = window.FileIOManager;
          
          console.log('✅ Export Coordinator: tutti i moduli caricati');
        } else {
          // Riprova dopo 100ms
          setTimeout(checkModules, 100);
        }
      };
      
      checkModules();
    }

    /**
     * Entry point principale - chiamato da ordini.js
     */
    exportOrdersToExcel(orders) {
      try {
        console.log('🚀 ExportCoordinator: avvio export');
        
        // Se vengono passati ordini, usali
        if (orders && orders.length > 0) {
          this.currentOrders = orders;
          this._ordersToExport = orders;
        } else {
          // Altrimenti prova a recuperarli dal modulo Ordini
          this.currentOrders = this.getOrdersFromModule();
          this._ordersToExport = this.currentOrders;
        }
        
        if (this.currentOrders.length === 0) {
          alert('Nessun ordine da esportare');
          return;
        }

        // Mostra il dialog principale
        if (this.dialogManager) {
          this.dialogManager.showExportDialog(this.currentOrders);
        } else {
          console.error('DialogManager non ancora inizializzato');
          alert('Sistema di export non ancora pronto. Riprova tra qualche secondo.');
        }
      } catch (error) {
        console.error('Errore inizializzazione export:', error);
        alert('Errore durante l\'inizializzazione dell\'export: ' + error.message);
      }
    }

    /**
     * Recupera ordini dal modulo Ordini o dal localStorage
     */
    getOrdersFromModule() {
      // Prova prima dal modulo Ordini
      if (window.Ordini && window.Ordini.state && window.Ordini.state.orders) {
        console.log('Ordini recuperati dal modulo Ordini');
        return window.Ordini.state.orders;
      }
      
      // Fallback al localStorage
      const storedOrders = localStorage.getItem('parsedOrders');
      if (storedOrders) {
        try {
          console.log('Ordini recuperati dal localStorage');
          return JSON.parse(storedOrders);
        } catch (e) {
          console.error('Errore parsing ordini dal localStorage:', e);
        }
      }
      
      return [];
    }

    /**
     * Gestione export ORDINI.xlsx
     */
    handleExportOrdini() {
      try {
        this.dialogManager.closeExportDialog();
        const result = this.dropboxExporter.exportToOrdiniFile(this._ordersToExport);
        
        if (!result.success) {
          this.dialogManager.showMessage('Errore durante l\'export', 'error');
        }
      } catch (error) {
        console.error('Errore export ORDINI:', error);
        this.dialogManager.showMessage(
          'Errore durante l\'esportazione: ' + error.message, 
          'error'
        );
      }
    }

    /**
     * Gestione export ORDINI
     */
    handleExportVenduto() {
      try {
        this.dialogManager.closeExportDialog();
        // Mostra dialog per confronto
        this.dialogManager.showVendutoComparisonDialog();
      } catch (error) {
        console.error('Errore export ORDINI:', error);
        this.dialogManager.showMessage(
          'Errore durante l\'esportazione: ' + error.message, 
          'error'
        );
      }
    }

    /**
     * Gestione export nuovo file
     */
    handleExportNew() {
      try {
        this.dialogManager.closeExportDialog();
        this.fileIO.exportToNewFile(this._ordersToExport);
      } catch (error) {
        console.error('Errore export nuovo file:', error);
        this.dialogManager.showMessage(
          'Errore durante l\'esportazione: ' + error.message, 
          'error'
        );
      }
    }

    /**
     * Metodi di utilità per i moduli
     */
    getCurrentOrders() {
      return this._ordersToExport;
    }

    setCurrentOrders(orders) {
      this.currentOrders = orders;
      this._ordersToExport = orders;
    }

    /**
     * Statistiche rapide
     */
    getStats() {
      let totalProducts = 0;
      let totalAmount = 0;
      
      this.currentOrders.forEach(order => {
        if (order.products) {
          totalProducts += order.products.length;
          order.products.forEach(product => {
            const quantity = parseFloat((product.quantity || '0').toString().replace(',', '.')) || 0;
            const unitPrice = parseFloat((product.unitPrice || product.price || '0').toString().replace(',', '.')) || 0;
            const sm = parseFloat((product.sm || '0').toString().replace(',', '.')) || 0;
            const discount = parseFloat((product.discount || '0').toString().replace(',', '.').replace('%', '')) || 0;
            
            let effectiveQuantity = quantity - sm;
            if (effectiveQuantity < 0) effectiveQuantity = 0;
            
            let amount = effectiveQuantity * unitPrice;
            if (discount > 0) {
              amount = amount * (1 - discount / 100);
            }
            
            totalAmount += amount;
          });
        }
      });
      
      return {
        totalOrders: this.currentOrders.length,
        totalProducts: totalProducts,
        totalValue: totalAmount
      };
    }
  }

  // Crea istanza globale del coordinatore
  window.ExportCoordinator = new ExportCoordinator();
  
  console.log('✅ ExportCoordinator inizializzato');
})();