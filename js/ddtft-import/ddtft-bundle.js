/**
 * DDTFT Bundle - Sistema Modulare Compatible
 * Versione non-ES6 che funziona ovunque
 */

(function() {
    'use strict';
    
    console.log('🚀 Caricamento DDTFT Bundle...');
    
    // Utils Module
    const DDTFTImportUtils = {
        standardizeClientName: function(fullName) {
            if (!fullName) return null;
            
            const NAME_MAPPING = {
                'IL GUSTO FRUTTA E VERDURA DI SQUILLACIOTI FRANCESCA': 'Il Gusto',
                'IL GUSTO FRUTTA E VERDURA': 'Il Gusto',
                'IL GUSTO FRUTTA & VERDURA': 'Il Gusto',
                'AZ. AGR. LA MANDRIA S.S.': 'La Mandria',
                'AZ. AGR. LA MANDRIA S.S. DI GOIA E BRUNO': 'La Mandria',
                'BARISONE E BALDON SRL': 'Barisone E Baldon',
                'BARISONE E BALDON S.R.L.': 'Barisone E Baldon',
                'BARISONE & BALDON S.R.L.': 'Barisone E Baldon',
                'PIEMONTE CARNI': 'Piemonte Carni',
                'PIEMONTE CARNI DI CALDERA MASSIMO & C. S.A.S.': 'Piemonte Carni',
                'MAROTTA S.R.L.': 'Marotta',
                'BOREALE S.R.L.': 'Boreale'
            };
            
            const upperName = fullName.toUpperCase().trim();
            if (NAME_MAPPING[upperName]) {
                return NAME_MAPPING[upperName];
            }
            
            if (upperName.includes('IL GUSTO')) return 'Il Gusto';
            if (upperName.includes('PIEMONTE CARNI')) return 'Piemonte Carni';
            
            const brandMatch = upperName.match(/^([A-Z\s]+?)\s+DI\s+[A-Z\s]+/i);
            if (brandMatch) {
                const brand = brandMatch[1].trim();
                return brand.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
            }
            
            return fullName.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        },
        
        isAlfieriAddress: function(address) {
            if (!address) return false;
            
            const alfieriKeywords = [
                'MARCONI', 'MAGLIANO ALFIERI', 'MAGLIANO', 'ALFIERI',
                'C.SO G. MARCONI', 'CORSO MARCONI', 'G. MARCONI',
                '12050', 'CN)', '(CN)', '10/E'
            ];
            
            const upperAddress = address.toUpperCase();
            return alfieriKeywords.some(keyword => upperAddress.includes(keyword));
        },
        
        validateDeliveryAddress: function(address) {
            if (!address) return false;
            
            if (this.isAlfieriAddress(address)) {
                console.log(`❌ RIFIUTATO indirizzo Alfieri: ${address}`);
                return false;
            }
            
            const hasStreetType = /(?:VIA|V\.LE|VIALE|CORSO|C\.SO|P\.ZA|PIAZZA|STRADA|STR\.)/i.test(address);
            const hasNumber = /\d+[A-Z]?\s*(?:\/|$|\s|\d{5})/i.test(address);
            const hasCap = /\d{5}/.test(address);
            
            if (!hasStreetType) {
                console.log(`❌ RIFIUTATO tipo strada mancante: ${address}`);
                return false;
            }
            
            if (!hasNumber && !hasCap) {
                console.log(`❌ RIFIUTATO numero civico e CAP mancanti: ${address}`);
                return false;
            }
            
            console.log(`✅ VALIDATO indirizzo consegna: ${address}`);
            return hasStreetType && (hasNumber || hasCap);
        },
        
        generateId: function() {
            return 'ddtft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    };
    
    // Extractors Module (versione semplificata)
    const DDTFTImportExtractors = {
        extractDocumentNumber: function(text, type) {
            if (type === 'DDT') {
                const patterns = [
                    /DDT\s+(\d+)\s+\d{2}\/\d{2}\/\d{2}/i,
                    /D\.D\.T\.\s+(\d+)/i,
                    /DOCUMENTO\s+DI\s+TRASPORTO\s*N[°.]?\s*(\d+)/i
                ];
                
                for (const pattern of patterns) {
                    const match = text.match(pattern);
                    if (match) return match[1];
                }
            } else if (type === 'Fattura') {
                const patterns = [
                    /FATTURA\s*N[°.]?\s*(\d+)/i,
                    /FT\s+(\d+)/i,
                    /INVOICE\s*N[°.]?\s*(\d+)/i
                ];
                
                for (const pattern of patterns) {
                    const match = text.match(pattern);
                    if (match) return match[1];
                }
            }
            
            return '';
        },
        
        extractDate: function(text) {
            const patterns = [
                /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
                /DATA[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
                /DEL[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
            ];

            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) {
                    let date = match[1];
                    date = date.replace(/\-/g, '/');
                    
                    const parts = date.split('/');
                    if (parts.length === 3 && parts[2].length === 2) {
                        parts[2] = '20' + parts[2];
                        date = parts.join('/');
                    }
                    
                    return date;
                }
            }
            
            return '';
        },
        
        extractClientName: function(text) {
            // Versione semplificata
            const simplePatterns = [
                /DESTINATARIO[:\s]+([^\n]+)/i,
                /CLIENTE[:\s]+([^\n]+)/i,
                /RAGIONE\s+SOCIALE[:\s]+([^\n]+)/i,
                /Spett\.le\s+([^\n]+)/i
            ];

            for (const pattern of simplePatterns) {
                const match = text.match(pattern);
                if (match) {
                    const extracted = match[1].trim();
                    if (!extracted.match(/^Luogo$/i)) {
                        return extracted;
                    }
                }
            }
            
            return '';
        },
        
        extractVatNumber: function(text) {
            const match = text.match(/P(?:ARTITA)?\.?\s*IVA[:\s]*(\d{11})/i);
            return match ? match[1] : '';
        },
        
        extractDeliveryAddress: function(text, fileName, clientName) {
            // Versione semplificata
            const addressPattern = /(VIA|CORSO|P\.ZA|PIAZZA)\s+[^,\n]+/i;
            const match = text.match(addressPattern);
            if (match && DDTFTImportUtils.validateDeliveryAddress(match[0])) {
                return match[0];
            }
            return null;
        },
        
        extractOrderReference: function(text) {
            const patterns = [
                /ORDINE[:\s]+([A-Z0-9\-\/]+)/i,
                /ORD[:\s]+([A-Z0-9\-\/]+)/i,
                /RIFERIMENTO[:\s]+([A-Z0-9\-\/]+)/i,
                /RIF[:\s]+([A-Z0-9\-\/]+)/i
            ];

            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) return match[1];
            }
            
            return '';
        },
        
        extractItems: function(text, type) {
            const items = [];
            const lines = text.split('\n');
            
            for (const line of lines) {
                if (line.match(/\d+,\d{2}/) && line.length > 20) {
                    items.push({
                        description: line.trim(),
                        quantity: 1,
                        price: 0,
                        total: 0
                    });
                }
            }
            
            return items;
        }
    };
    
    // PDF Module (placeholder)
    const DDTFTImportPDF = {
        extractTextFromPdf: async function(file) {
            if (window.DDTFTPdfParser && window.DDTFTPdfParser.extractTextFromPdf) {
                return window.DDTFTPdfParser.extractTextFromPdf(file);
            }
            
            // Fallback al metodo originale
            if (window.pdfjsLib) {
                // Implementazione PDF.js originale
                throw new Error('Implementazione PDF.js non inclusa nel bundle');
            }
            
            throw new Error('PDF.js non caricato');
        }
    };
    
    // Parser Module
    const DDTFTImportParser = {
        parseDocumentFromText: function(text, fileName) {
            console.log('🔄 Parsing documento:', fileName);
            
            // Determina tipo documento
            let detectedType = 'Documento';
            
            if (fileName) {
                const upperFileName = fileName.toUpperCase();
                if (upperFileName.includes('DDV') || upperFileName.includes('DDT')) {
                    detectedType = 'DDT';
                } else if (upperFileName.includes('FTV') || upperFileName.includes('FT') || upperFileName.includes('FATT')) {
                    detectedType = 'Fattura';
                }
            }
            
            // Parser base
            const parsedDoc = {
                id: DDTFTImportUtils.generateId(),
                type: detectedType === 'DDT' ? 'ddt' : 'ft',
                fileName: fileName,
                importDate: new Date().toISOString(),
                number: DDTFTImportExtractors.extractDocumentNumber(text, detectedType),
                documentNumber: DDTFTImportExtractors.extractDocumentNumber(text, detectedType),
                orderNumber: DDTFTImportExtractors.extractOrderReference(text),
                orderDate: '',
                date: DDTFTImportExtractors.extractDate(text),
                clientName: DDTFTImportExtractors.extractClientName(text),
                vatNumber: DDTFTImportExtractors.extractVatNumber(text),
                deliveryAddress: DDTFTImportExtractors.extractDeliveryAddress(text, fileName, ''),
                orderReference: DDTFTImportExtractors.extractOrderReference(text),
                items: DDTFTImportExtractors.extractItems(text, detectedType),
                subtotal: 0,
                total: 0
            };
            
            return parsedDoc;
        }
    };
    
    // UI Module (placeholder)
    const DDTFTImportUI = {
        exportDocumentsToExcel: function(documents) {
            if (window.DDTFTExportExcel) {
                window.DDTFTExportExcel.exportDocumentsToExcel(documents);
            } else {
                console.error('Modulo DDTFTExportExcel non caricato');
                alert('Modulo di esportazione Excel non disponibile');
            }
        },
        
        viewDDTFTContent: function() {
            console.log('Visualizzazione contenuto DDT-FT');
            const ddtftData = localStorage.getItem('ddtftFileData');
            if (ddtftData) {
                const data = JSON.parse(ddtftData);
                alert(`Dati DDT-FT caricati: ${data.length} righe`);
            } else {
                alert('Nessun dato DDT-FT trovato');
            }
        },
        
        showLoadingModal: function(message) {
            const modal = document.createElement('div');
            modal.id = 'ddtft-loading-modal';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); display: flex; align-items: center;
                justify-content: center; z-index: 9999;
            `;
            
            modal.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <div>📄 ${message}</div>
                    <div style="margin-top: 10px;">Attendere...</div>
                </div>
            `;
            
            document.body.appendChild(modal);
            return modal;
        }
    };
    
    // Sistema Principale
    const DDTFTImportModular = {
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
        extractOrderReference: DDTFTImportExtractors.extractOrderReference,
        extractItems: DDTFTImportExtractors.extractItems,
        
        // Utils Functions
        standardizeClientName: DDTFTImportUtils.standardizeClientName,
        isAlfieriAddress: DDTFTImportUtils.isAlfieriAddress,
        validateDeliveryAddress: DDTFTImportUtils.validateDeliveryAddress,
        generateId: DDTFTImportUtils.generateId,
        
        // UI Functions
        exportDocumentsToExcel: DDTFTImportUI.exportDocumentsToExcel,
        viewDDTFTContent: DDTFTImportUI.viewDDTFTContent,
        showLoadingModal: DDTFTImportUI.showLoadingModal,
        
        // Funzione principale
        importDDTFTFile: async function(file) {
            console.log('🔄 Inizio importazione DDTFT:', file.name);
            
            try {
                const text = await this.extractTextFromPdf(file);
                const parsedData = this.parseDocumentFromText(text, file.name);
                return parsedData;
                
            } catch (error) {
                console.error('❌ Errore importazione DDTFT:', error);
                throw error;
            }
        }
    };
    
    // Esporta il sistema modulare
    window.DDTFTImportModular = DDTFTImportModular;
    // ALIAS per compatibilità con codice esistente
    window.DDTFTImport = DDTFTImportModular;
    console.log('✅ DDTFT Bundle caricato - Sistema modulare disponibile!');
    console.log('📦 Funzioni:', Object.keys(DDTFTImportModular).length);
    
})();