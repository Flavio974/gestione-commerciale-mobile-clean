/**
 * Ordini Export Module - Main Entry Point
 * Coordina tutti i moduli per l'export degli ordini
 * 
 * Questo file ora funge da orchestratore per i moduli separati:
 * - ordini-export-core.js: Funzioni principali di export
 * - ordini-export-venduto.js: Gestione file VENDUTO
 * - ordini-export-validation.js: Validazione e pulizia dati
 * - ordini-export-ui.js: Interfaccia utente e dialog
 * - ordini-export-utils.js: Funzioni di utilità
 */

// Definisci OrdiniExport nel namespace globale
window.OrdiniExport = {
  /**
   * Funzione principale per esportare ordini in Excel
   */
  exportOrdersToExcel: function(orders) {
    return OrdiniExportCore.exportOrdersToExcel(orders);
  },
  
  /**
   * Mostra il dialog con le opzioni di esportazione
   */
  showExportDialog: function(orders) {
    return OrdiniExportUI.showExportDialog(orders);
  },
  
  /**
   * Gestione export in nuovo file
   */
  handleExportNew: function() {
    return OrdiniExportUI.handleExportNew();
  },
  
  /**
   * Gestione export nel file ORDINI
   */
  handleExportOrdini: function() {
    return OrdiniExportUI.handleExportOrdini();
  },
  
  /**
   * Chiude il dialog di export
   */
  closeExportDialog: function() {
    return OrdiniExportUI.closeExportDialog();
  },
  
  /**
   * Export in un nuovo file Excel
   */
  exportToNewFile: function(orders) {
    return OrdiniExportCore.exportToNewFile(orders);
  },
  
  /**
   * Export nel file ORDINI permanente (append)
   */
  exportToOrdiniFile: function(orders) {
    return OrdiniExportOrdini.exportToOrdiniFile(orders);
  },
  
  /**
   * Prepara i dati degli ordini per l'export
   */
  prepareOrderData: function(orders) {
    return OrdiniExportCore.prepareOrderData(orders);
  },
  
  /**
   * Formatta le colonne numeriche nel worksheet
   */
  formatNumericColumns: function(ws) {
    return OrdiniExportUtils.formatNumericColumns(ws);
  },
  
  /**
   * Mostra i risultati dell'export
   */
  showExportResults: function(rowCount, total, orderCount) {
    return OrdiniExportUI.showExportResults(rowCount, total, orderCount);
  },
  
  /**
   * Controlla se ci sono duplicati tra i dati esistenti e quelli nuovi
   */
  checkForDuplicates: function(existingData, newData) {
    return OrdiniExportOrdini.checkForDuplicates(existingData, newData);
  },
  
  /**
   * Mostra dialog per gestire i duplicati
   */
  showDuplicatesDialog: function(duplicateCheck, existingData, orderData, totaleRealeExcel) {
    return OrdiniExportUI.showDuplicatesDialog(duplicateCheck, existingData, orderData, totaleRealeExcel);
  },
  
  /**
   * Procedi aggiungendo solo i dati non duplicati
   */
  proceedWithoutDuplicates: function() {
    return OrdiniExportUI.proceedWithoutDuplicates();
  },
  
  /**
   * Procedi aggiungendo tutti i dati (inclusi duplicati)
   */
  proceedWithAllData: function() {
    return OrdiniExportUI.proceedWithAllData();
  },
  
  /**
   * Completa l'export del file VENDUTO
   */
  finishOrdiniExport: function(combinedData, newRowsCount) {
    return OrdiniExportOrdini.finishOrdiniExport(combinedData, newRowsCount);
  },
  
  /**
   * Visualizza il contenuto del file VENDUTO salvato
   */
  viewOrdiniContent: function() {
    return OrdiniExportOrdini.viewOrdiniContent();
  },
  
  /**
   * Analizza i dati del file VENDUTO
   */
  analyzeOrdiniData: function(data) {
    return OrdiniExportOrdini.analyzeOrdiniData(data);
  },
  
  /**
   * Mostra modal con il contenuto del file VENDUTO
   */
  showOrdiniContentModal: function(stats, totalRows) {
    return OrdiniExportUI.showOrdiniContentModal(stats, totalRows);
  },
  
  /**
   * Test diretto del calcolo per DL000301
   */
  testCalcoloDL000301: function() {
    return OrdiniExportOrdini.testCalcoloDL000301();
  },
  
  /**
   * Mostra i risultati dell'aggiornamento VENDUTO
   */
  showOrdiniResults: function(totalRows, newRows, grandTotal) {
    return OrdiniExportUI.showOrdiniResults(totalRows, newRows, grandTotal);
  },
  
  /**
   * Importa un file VENDUTO.xlsx esistente per sincronizzare il localStorage
   */
  importOrdiniFile: function(file) {
    return OrdiniExportOrdini.importOrdiniFile(file);
  },
  
  /**
   * Sincronizza il localStorage con i dati letti dal file VENDUTO esistente
   */
  syncWithExistingOrdini: async function(file) {
    return await OrdiniExportOrdini.syncWithExistingOrdini(file);
  },
  
  /**
   * Mostra dialog per sincronizzazione con file VENDUTO esistente
   */
  showSyncDialog: function() {
    return OrdiniExportUI.showSyncDialog();
  },
  
  /**
   * Chiude il dialog di sincronizzazione
   */
  closeSyncDialog: function() {
    return OrdiniExportUI.closeSyncDialog();
  },
  
  /**
   * Gestisce il reset completo del file VENDUTO
   */
  handleResetOrdini: function() {
    return OrdiniExportUI.handleResetOrdini();
  },
  
  /**
   * Mostra modal di caricamento
   */
  showLoadingModal: function(message) {
    return OrdiniExportUI.showLoadingModal(message);
  },
  
  /**
   * Mostra i risultati della sincronizzazione
   */
  showSyncResults: function(rowCount, stats) {
    return OrdiniExportUI.showSyncResults(rowCount, stats);
  },
  
  /**
   * Funzione di debug per analizzare il contenuto del file VENDUTO nel localStorage
   */
  debugOrdiniCount: function() {
    return OrdiniExportValidation.debugOrdiniCount();
  },
  
  /**
   * Funzione di validazione finale per verificare il conteggio corretto
   */
  validateFinalCount: function() {
    return OrdiniExportValidation.validateFinalCount();
  },
  
  /**
   * Funzione per pulire il localStorage rimuovendo tutti i duplicati
   */
  cleanupOrdiniData: function() {
    return OrdiniExportValidation.cleanupOrdiniData();
  },
  
  // Aggiungi riferimento temporaneo per compatibilità
  _ordersToExport: null,
  _tempDuplicateData: null
};