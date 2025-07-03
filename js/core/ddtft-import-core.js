/**
 * DDTFTImport Core Module
 * Modulo principale per l'importazione di DDT e Fatture
 * Versione modularizzata che sostituisce il file monolitico
 */

(function(window) {
    'use strict';

    /**
     * Classe principale per l'importazione di DDT e Fatture
     */
    class DDTFTImportCore {
        constructor() {
            // Inizializza le dipendenze
            this.pdfParser = window.DDTFTPdfParser;
            this.documentParser = window.DDTFTDocumentParser;
            this.parsingUtils = window.DDTFTParsingUtils;
            this.productUtils = window.DDTFTProductUtils;
            this.addressUtils = window.DDTFTAddressUtils;
            this.patterns = window.DDTFT_PATTERNS || {};
            this.mappings = window.DDTFT_MAPPINGS || {};
            
            // Cache per i risultati
            this.cache = new Map();
            
            // Configurazione
            this.config = {
                maxFileSize: 10 * 1024 * 1024, // 10MB
                supportedFormats: ['.pdf'],
                debugMode: false
            };
        }

        /**
         * Metodo principale per estrarre testo da PDF
         */
        async extractTextFromPdf(file) {
            if (!file) {
                throw new Error('File non fornito');
            }

            // Verifica dimensione file
            if (file.size > this.config.maxFileSize) {
                throw new Error(`File troppo grande. Massimo ${this.config.maxFileSize / 1024 / 1024}MB`);
            }

            // Usa il parser PDF modulare
            if (this.pdfParser && this.pdfParser.extractTextFromPdf) {
                return await this.pdfParser.extractTextFromPdf(file);
            }

            throw new Error('Parser PDF non disponibile');
        }

        /**
         * Parsing del documento dal testo estratto
         */
        async parseDocumentFromText(text, fileName = '') {
            if (!text) {
                throw new Error('Testo non fornito');
            }

            // Usa il document parser modulare
            if (this.documentParser && this.documentParser.parseDocumentFromText) {
                return await this.documentParser.parseDocumentFromText(text, fileName);
            }

            throw new Error('Document parser non disponibile');
        }

        /**
         * Metodo principale per importare un documento
         */
        async importDocument(file) {
            try {
                // Estrai testo dal PDF
                const extractedData = await this.extractTextFromPdf(file);
                
                // Parsa il documento
                const document = await this.parseDocumentFromText(
                    extractedData.text, 
                    file.name
                );

                // Aggiungi metadati dal file
                document.fileName = file.name;
                document.fileSize = file.size;
                document.importDate = new Date().toISOString();

                return {
                    success: true,
                    document: document,
                    metadata: extractedData.metadata || {}
                };
            } catch (error) {
                console.error('Errore durante l\'importazione:', error);
                return {
                    success: false,
                    error: error.message,
                    fileName: file.name
                };
            }
        }

        /**
         * Genera un ID univoco per il documento
         */
        generateId() {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 9);
            return `doc_${timestamp}_${random}`;
        }

        /**
         * Estrae il numero del documento
         */
        extractDocumentNumber(text, docType) {
            if (!text) return null;

            const patterns = this.patterns.documentNumber || {};
            const pattern = patterns[docType] || patterns.default;

            if (pattern) {
                const match = text.match(new RegExp(pattern, 'i'));
                return match ? match[1] : null;
            }

            return null;
        }

        /**
         * Estrae la data del documento
         */
        extractDate(text, docType) {
            if (!text) return null;

            if (this.parsingUtils && this.parsingUtils.parseItalianDate) {
                // Cerca date nel formato italiano
                const datePattern = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/g;
                const matches = text.match(datePattern);
                
                if (matches) {
                    for (const match of matches) {
                        const parsed = this.parsingUtils.parseItalianDate(match);
                        if (parsed) return parsed;
                    }
                }
            }

            return null;
        }

        /**
         * Estrae il nome del cliente
         */
        extractClientName(text, docType) {
            const lines = text.split('\n');
            const clientSection = this.findClientSection(lines, docType);
            
            if (clientSection) {
                return this.cleanClientName(clientSection);
            }

            return null;
        }

        /**
         * Estrae la partita IVA
         */
        extractVatNumber(text) {
            const vatPattern = /(?:P\.?\s*IVA|PARTITA\s*IVA)[:\s]*([0-9]{11})/i;
            const match = text.match(vatPattern);
            return match ? match[1] : null;
        }

        /**
         * Estrae l'indirizzo di consegna
         */
        extractDeliveryAddress(text, docType) {
            if (this.addressUtils && this.addressUtils.extractAddress) {
                return this.addressUtils.extractAddress(text, docType);
            }

            // Fallback semplice
            const addressPattern = /(?:DESTINAZIONE|CONSEGNA|SPEDIZIONE)[:\s]*([^\n]+(?:\n[^\n]+)?)/i;
            const match = text.match(addressPattern);
            return match ? match[1].trim() : null;
        }

        /**
         * Mostra dialog di sincronizzazione
         */
        showSyncDialog(message, type = 'info') {
            // Implementazione base - può essere sovrascritta
            console.log(`[${type.toUpperCase()}] ${message}`);
            
            // Se esiste un UI manager, usalo
            if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.showSyncDialog) {
                return window.DDTFTUIDialogs.showSyncDialog(message, type);
            }
        }

        /**
         * Chiude il dialog di sincronizzazione
         */
        closeSyncDialog() {
            if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.closeSyncDialog) {
                return window.DDTFTUIDialogs.closeSyncDialog();
            }
        }

        /**
         * Mostra i risultati della sincronizzazione
         */
        showSyncResults(results) {
            if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.showSyncResults) {
                return window.DDTFTUIDialogs.showSyncResults(results);
            }
            
            // Fallback
            console.log('Risultati sincronizzazione:', results);
        }

        /**
         * Visualizza il contenuto del documento
         */
        viewDDTFTContent(documentId) {
            // Implementazione per visualizzare il contenuto
            // Può essere delegata a un modulo UI
            if (window.DDTFTUIManager && window.DDTFTUIManager.viewDocument) {
                return window.DDTFTUIManager.viewDocument(documentId);
            }
            
            console.log('Visualizza documento:', documentId);
        }

        /**
         * Standardizza il nome del cliente
         */
        standardizeClientName(name) {
            if (!name) return '';
            
            if (this.parsingUtils && this.parsingUtils.removeCompanyForms) {
                name = this.parsingUtils.removeCompanyForms(name);
            }
            
            return name.trim().toUpperCase();
        }

        /**
         * Validazione documento
         */
        validateDocument(doc) {
            const errors = [];
            
            if (!doc.numero) errors.push('Numero documento mancante');
            if (!doc.data) errors.push('Data documento mancante');
            if (!doc.cliente) errors.push('Cliente mancante');
            if (!doc.articoli || doc.articoli.length === 0) {
                errors.push('Nessun articolo presente');
            }
            
            return {
                isValid: errors.length === 0,
                errors: errors
            };
        }

        /**
         * Esporta i documenti
         */
        async exportDocuments(documents, format = 'excel') {
            if (window.DDTFTImportExport && window.DDTFTImportExport.exportDocuments) {
                return await window.DDTFTImportExport.exportDocuments(documents, format);
            }
            
            throw new Error('Modulo di esportazione non disponibile');
        }

        /**
         * Importa documenti da Excel
         */
        async importFromExcel(file) {
            if (window.DDTFTImportExport && window.DDTFTImportExport.importFromExcel) {
                return await window.DDTFTImportExport.importFromExcel(file);
            }
            
            throw new Error('Modulo di importazione Excel non disponibile');
        }

        // Metodi di utilità privati

        findClientSection(lines, docType) {
            // Logica per trovare la sezione cliente
            const startMarkers = ['DESTINATARIO', 'CLIENTE', 'INTESTATARIO'];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].toUpperCase();
                
                for (const marker of startMarkers) {
                    if (line.includes(marker)) {
                        // Ritorna le prossime 3-4 righe come possibile cliente
                        return lines.slice(i + 1, i + 5).join(' ');
                    }
                }
            }
            
            return null;
        }

        cleanClientName(name) {
            if (!name) return '';
            
            // Rimuovi caratteri speciali e normalizza
            name = name.replace(/[^\w\s\-\.,']/g, ' ');
            name = name.replace(/\s+/g, ' ');
            
            return name.trim();
        }

        /**
         * Calcola i totali del documento
         */
        calculateTotals(products) {
            if (this.productUtils && this.productUtils.calculateTotals) {
                return this.productUtils.calculateTotals(products);
            }
            
            // Fallback semplice
            let totale = 0;
            let totaleIva = 0;
            
            for (const product of products) {
                totale += product.importo || 0;
                totaleIva += product.importoIva || 0;
            }
            
            return {
                imponibile: totale,
                iva: totaleIva,
                totale: totale + totaleIva
            };
        }

        /**
         * Debug mode
         */
        setDebugMode(enabled) {
            this.config.debugMode = enabled;
            
            // Propaga ai moduli
            if (this.pdfParser) this.pdfParser.debugMode = enabled;
            if (this.documentParser) this.documentParser.debugMode = enabled;
        }
    }

    // Esporta la classe
    window.DDTFTImportCore = DDTFTImportCore;

    // Esporta anche come modulo ES6 se disponibile
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DDTFTImportCore;
    }

})(window);