/**
 * DDTFTImport Modular
 * File principale modulare che sostituisce completamente ddtft-import.js
 * Integra tutti i moduli separati per l'importazione di DDT e Fatture
 */

(function(window) {
    'use strict';

    // Verifica dipendenze
    const checkDependencies = () => {
        const required = [
            'DDTFTImportCore',
            'DDTFTPdfParser', 
            'DDTFTDocumentParser',
            'DDTFTParsingUtils',
            'DDTFTProductUtils',
            'DDTFTAddressUtils',
            'DDTFTValidators',
            'DDTFTFormatters',
            'DDTFT_PATTERNS',
            'DDTFT_MAPPINGS'
        ];

        const missing = required.filter(dep => !window[dep]);
        
        if (missing.length > 0) {
            console.warn('DDTFTImport: Dipendenze mancanti:', missing);
            
            // Carica dinamicamente se possibile
            missing.forEach(dep => {
                const script = document.querySelector(`script[src*="${dep.toLowerCase()}"]`);
                if (!script) {
                    console.error(`Impossibile trovare script per ${dep}`);
                }
            });
        }
    };

    /**
     * Classe principale DDTFTImport che estende il core
     * Mantiene la stessa interfaccia del file originale
     */
    class DDTFTImport extends (window.DDTFTImportCore || Object) {
        constructor() {
            super();
            
            // Verifica dipendenze
            checkDependencies();
            
            // Integra moduli aggiuntivi
            this.validators = window.DDTFTValidators;
            this.formatters = window.DDTFTFormatters;
            
            // Mantieni riferimenti per compatibilità
            this.version = '4.4-modular';
            this.initialized = false;
            
            // Inizializza
            this.init();
        }

        /**
         * Inizializzazione
         */
        init() {
            if (this.initialized) return;
            
            // Configura extractors modulari se disponibili
            if (window.DDTExtractorModular) {
                window.DDTExtractor = window.DDTExtractorModular;
            }
            
            if (window.FatturaExtractorModular) {
                window.FatturaExtractor = window.FatturaExtractorModular;
            }
            
            this.initialized = true;
            console.log('DDTFTImport modulare inizializzato v' + this.version);
        }

        /**
         * Metodi pubblici principali mantenuti per compatibilità
         */

        // Override per aggiungere validazione
        async importDocument(file) {
            const result = await super.importDocument(file);
            
            if (result.success && this.validators) {
                // Valida il documento importato
                const validation = this.validators.validateDocument(result.document);
                result.validation = validation;
                
                if (!validation.valid) {
                    console.warn('Documento con errori di validazione:', validation.errors);
                }
            }
            
            return result;
        }

        // Metodo per formattare documento
        formatDocument(doc, options) {
            if (this.formatters) {
                return this.formatters.formatDocument(doc, options);
            }
            return doc;
        }

        // Metodi di utilità mantenuti per compatibilità

        /**
         * Converte formato data
         */
        convertDateFormat(dateStr) {
            if (this.parsingUtils && this.parsingUtils.parseItalianDate) {
                const parsed = this.parsingUtils.parseItalianDate(dateStr);
                if (parsed) {
                    return this.formatters ? 
                        this.formatters.formatDate(parsed, 'yyyy-mm-dd') : 
                        parsed.toISOString().split('T')[0];
                }
            }
            return dateStr;
        }

        /**
         * Normalizza importo
         */
        normalizeAmount(value) {
            if (this.parsingUtils && this.parsingUtils.parseItalianNumber) {
                return this.parsingUtils.parseItalianNumber(value);
            }
            
            // Fallback
            if (typeof value === 'string') {
                value = value.replace(/[^\d,.-]/g, '');
                value = value.replace(',', '.');
            }
            return parseFloat(value) || 0;
        }

        /**
         * Estrae prodotti dal testo
         */
        extractProductsFromText(text, docType) {
            if (this.productUtils && this.productUtils.extractProductsFromText) {
                return this.productUtils.extractProductsFromText(text, docType);
            }
            
            // Fallback base
            return [];
        }

        /**
         * Raggruppa prodotti per IVA
         */
        groupProductsByVAT(products) {
            if (this.productUtils && this.productUtils.groupProductsByVAT) {
                return this.productUtils.groupProductsByVAT(products);
            }
            
            // Fallback
            const groups = {};
            products.forEach(p => {
                const iva = p.iva || 0;
                if (!groups[iva]) groups[iva] = [];
                groups[iva].push(p);
            });
            return groups;
        }

        /**
         * Metodi UI delegati
         */
        
        showImportDialog() {
            if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.showImportDialog) {
                return window.DDTFTUIDialogs.showImportDialog();
            }
            console.log('Import dialog richiesto');
        }

        showProgressDialog(message, progress) {
            if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.showProgressDialog) {
                return window.DDTFTUIDialogs.showProgressDialog(message, progress);
            }
            console.log(`Progress: ${message} (${progress}%)`);
        }

        /**
         * Metodi di esportazione
         */
        
        async exportToExcel(documents) {
            if (window.DDTFTImportExport && window.DDTFTImportExport.exportToExcel) {
                return await window.DDTFTImportExport.exportToExcel(documents);
            }
            
            throw new Error('Modulo di esportazione Excel non disponibile');
        }

        async exportToPDF(documents) {
            if (window.DDTFTImportExport && window.DDTFTImportExport.exportToPDF) {
                return await window.DDTFTImportExport.exportToPDF(documents);
            }
            
            throw new Error('Modulo di esportazione PDF non disponibile');
        }

        /**
         * Batch processing
         */
        
        async importMultipleDocuments(files, options = {}) {
            const results = [];
            const total = files.length;
            
            for (let i = 0; i < total; i++) {
                const file = files[i];
                
                // Mostra progresso
                if (options.onProgress) {
                    options.onProgress({
                        current: i + 1,
                        total: total,
                        fileName: file.name,
                        percent: Math.round((i + 1) / total * 100)
                    });
                }
                
                try {
                    const result = await this.importDocument(file);
                    results.push(result);
                } catch (error) {
                    results.push({
                        success: false,
                        fileName: file.name,
                        error: error.message
                    });
                }
            }
            
            return results;
        }

        /**
         * Metodi di sincronizzazione
         */
        
        async syncWithServer(documents, endpoint) {
            // Implementazione base di sincronizzazione
            const payload = {
                documents: documents.map(doc => this.formatDocument(doc)),
                timestamp: new Date().toISOString(),
                version: this.version
            };
            
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`Sync failed: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error('Errore sincronizzazione:', error);
                throw error;
            }
        }

        /**
         * Gestione cache
         */
        
        clearCache() {
            if (this.cache) {
                this.cache.clear();
            }
            
            // Pulisci anche cache dei moduli
            if (this.pdfParser && this.pdfParser.clearCache) {
                this.pdfParser.clearCache();
            }
            
            console.log('Cache pulita');
        }

        /**
         * Metodi di debug
         */
        
        debugDocument(doc) {
            console.group('Debug Documento');
            console.log('Documento:', doc);
            
            if (this.validators) {
                const validation = this.validators.validateDocument(doc);
                console.log('Validazione:', validation);
            }
            
            if (this.formatters) {
                const formatted = this.formatters.formatDocument(doc);
                console.log('Formattato:', formatted);
            }
            
            console.groupEnd();
        }

        /**
         * Statistiche
         */
        
        getStatistics(documents) {
            const stats = {
                totale: documents.length,
                perTipo: {},
                perCliente: {},
                perMese: {},
                totaliImporti: {
                    imponibile: 0,
                    iva: 0,
                    totale: 0
                }
            };
            
            documents.forEach(doc => {
                // Per tipo
                const tipo = doc.tipo || 'UNKNOWN';
                stats.perTipo[tipo] = (stats.perTipo[tipo] || 0) + 1;
                
                // Per cliente
                const cliente = doc.cliente?.nome || 'UNKNOWN';
                stats.perCliente[cliente] = (stats.perCliente[cliente] || 0) + 1;
                
                // Per mese
                if (doc.data) {
                    const date = new Date(doc.data);
                    const mese = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    stats.perMese[mese] = (stats.perMese[mese] || 0) + 1;
                }
                
                // Totali
                if (doc.totali) {
                    stats.totaliImporti.imponibile += doc.totali.imponibile || 0;
                    stats.totaliImporti.iva += doc.totali.iva || 0;
                    stats.totaliImporti.totale += doc.totali.totale || 0;
                }
            });
            
            return stats;
        }
    }

    // Crea istanza singleton
    const instance = new DDTFTImport();

    // Esporta come window.DDTFTImport per compatibilità
    window.DDTFTImport = instance;

    // Esporta anche la classe per estensioni future
    window.DDTFTImportClass = DDTFTImport;

    // Supporto moduli ES6
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DDTFTImport;
    }

})(window);