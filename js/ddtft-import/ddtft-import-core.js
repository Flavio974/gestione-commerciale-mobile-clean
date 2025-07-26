/**
 * DDTFT Import Core Module
 * Coordina tutti i moduli di importazione DDT/Fatture
 * Mantiene compatibilità con il codice esistente
 */

// Import tutti i moduli necessari
import { DDTFTImportPDF } from './ddtft-import-pdf.js';
import { DDTFTImportParser } from './ddtft-import-parser.js';
import { DDTFTImportExtractors } from './ddtft-import-extractors.js';
import { DDTFTImportUtils } from './ddtft-import-utils.js';
import { DDTFTImportUI } from './ddtft-import-ui.js';

// Le classi DDTExtractor e FatturaExtractor saranno create nei prossimi moduli
// Per ora usiamo classi placeholder
class DDTExtractor {
  constructor(text, debugElement, fileName) {
    this.text = text;
    this.debug = debugElement;
    this.fileName = fileName;
  }
  
  extract() {
    return {
      id: DDTFTImportUtils.generateId(),
      documentNumber: 'N/A',
      date: '',
      clientName: '',
      items: []
    };
  }
}

class FatturaExtractor {
  constructor(text, debugElement, fileName) {
    this.text = text;
    this.debug = debugElement;
    this.fileName = fileName;
  }
  
  extract() {
    return {
      id: DDTFTImportUtils.generateId(),
      documentNumber: 'N/A',
      date: '',
      clientName: '',
      items: []
    };
  }
}

/**
 * Oggetto principale che espone tutte le funzionalità
 * Mantiene la stessa API del file originale
 */
const DDTFTImport = {
  // PDF Functions
  extractTextFromPdf: DDTFTImportPDF.extractTextFromPdf,
  
  // Parser Functions
  parseDocumentFromText: DDTFTImportParser.parseDocumentFromText,
  
  // Extractor Functions
  extractDocumentNumber: DDTFTImportExtractors.extractDocumentNumber,
  extractDate: DDTFTImportExtractors.extractDate,
  extractClientName: DDTFTImportExtractors.extractClientName,
  extractVatNumber: DDTFTImportExtractors.extractVatNumber,
  extractDeliveryAddress: DDTFTImportExtractors.extractDeliveryAddress,
  extractFromDeliverySection: DDTFTImportExtractors.extractFromDeliverySection,
  extractDeliveryFromInternalCode: DDTFTImportExtractors.extractDeliveryFromInternalCode,
  extractDeliveryFromODV: DDTFTImportExtractors.extractDeliveryFromODV,
  extractDeliveryFromFTV: DDTFTImportExtractors.extractDeliveryFromFTV,
  extractDeliveryAddressDDT: DDTFTImportExtractors.extractDeliveryAddressDDT,
  extractDeliveryBackupPatterns: DDTFTImportExtractors.extractDeliveryBackupPatterns,
  extractOrderReference: DDTFTImportExtractors.extractOrderReference,
  extractItems: DDTFTImportExtractors.extractItems,
  debugAddressExtraction: DDTFTImportExtractors.debugAddressExtraction,
  
  // Utils Functions
  standardizeClientName: DDTFTImportUtils.standardizeClientName,
  isAlfieriAddress: DDTFTImportUtils.isAlfieriAddress,
  validateDeliveryAddress: DDTFTImportUtils.validateDeliveryAddress,
  generateId: DDTFTImportUtils.generateId,
  
  // UI Functions
  exportDocumentsToExcel: DDTFTImportUI.exportDocumentsToExcel,
  viewDDTFTContent: DDTFTImportUI.viewDDTFTContent,
  analyzeDDTFTData: DDTFTImportUI.analyzeDDTFTData,
  showDDTFTContentModal: DDTFTImportUI.showDDTFTContentModal,
  showSyncDialog: DDTFTImportUI.showSyncDialog,
  closeSyncDialog: DDTFTImportUI.closeSyncDialog,
  handleResetDDTFT: DDTFTImportUI.handleResetDDTFT,
  showLoadingModal: DDTFTImportUI.showLoadingModal,
  showSyncResults: DDTFTImportUI.showSyncResults,
  
  /**
   * Funzione principale di importazione
   * Mantiene la logica originale ma usa i moduli
   */
  importDDTFTFile: async function(file) {
    console.log('🔄 Inizio importazione DDTFT:', file.name);
    
    try {
      // 1. Estrai testo dal PDF
      const text = await this.extractTextFromPdf(file);
      
      // 2. Parse del documento
      const parsedData = this.parseDocumentFromText(text, file.name);
      
      // 3. Ritorna i dati parsati
      return parsedData;
      
    } catch (error) {
      console.error('❌ Errore importazione DDTFT:', error);
      throw error;
    }
  }
};

// Esporta per compatibilità globale
window.DDTFTImport = DDTFTImport;

// Esporta anche le classi Extractor per retrocompatibilità
window.DDTExtractor = DDTExtractor;
window.FatturaExtractor = FatturaExtractor;

// Export per moduli ES6
export { DDTFTImport, DDTExtractor, FatturaExtractor };