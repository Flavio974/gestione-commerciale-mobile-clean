/**
 * Fix per estrarre correttamente i metadati dai PDF
 * Gestisce il formato [METADATA_START]...[METADATA_END]
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix estrazione metadati...');
    
    // Funzione per estrarre metadati dal testo
    function extractMetadata(text) {
        const metadata = {};
        
        // Cerca sezione metadati
        const metadataMatch = text.match(/\[METADATA_START\]([\s\S]*?)\[METADATA_END\]/);
        if (!metadataMatch) {
            return null;
        }
        
        const metadataText = metadataMatch[1];
        const lines = metadataText.split('\n');
        
        lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > -1) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                
                // Mappa i campi dei metadati
                switch(key) {
                    case 'NUMERO_DOC':
                        metadata.numero = value;
                        break;
                    case 'DATA_DOC':
                        metadata.data = value;
                        break;
                    case 'CODICE_CLIENTE':
                        metadata.codiceCliente = value;
                        break;
                    case 'NOME_CLIENTE':
                        metadata.cliente = value.replace(/\s+/g, ' ').trim();
                        break;
                    case 'INDIRIZZO_CONSEGNA':
                        if (value) metadata.indirizzoConsegna = value;
                        break;
                    case 'PIVA':
                        metadata.partitaIva = value;
                        break;
                }
            }
        });
        
        return Object.keys(metadata).length > 0 ? metadata : null;
    }
    
    // Override del metodo extract di DDTExtractor
    if (window.DDTExtractor) {
        const originalExtract = window.DDTExtractor.prototype.extract;
        
        window.DDTExtractor.prototype.extract = function() {
            console.log('🔍 [METADATA FIX] Verifico presenza metadati...');
            
            // Prima cerca i metadati
            const metadata = extractMetadata(this.text);
            
            if (metadata) {
                console.log('✅ [METADATA FIX] Metadati trovati:', metadata);
                
                // Usa i metadati come cache per i metodi di estrazione
                this._metadataCache = metadata;
                
                // Override temporaneo dei metodi di estrazione
                const originalExtractClientName = this.extractClientName;
                const originalExtractDocumentNumber = this.extractDocumentNumber;
                const originalExtractDate = this.extractDate;
                const originalExtractVatNumber = this.extractVatNumber;
                
                this.extractClientName = function() {
                    if (this._metadataCache && this._metadataCache.cliente) {
                        console.log('✅ [METADATA FIX] Cliente da metadati:', this._metadataCache.cliente);
                        return this._metadataCache.cliente;
                    }
                    return originalExtractClientName.call(this);
                };
                
                this.extractDocumentNumber = function() {
                    if (this._metadataCache && this._metadataCache.numero) {
                        console.log('✅ [METADATA FIX] Numero da metadati:', this._metadataCache.numero);
                        return this._metadataCache.numero;
                    }
                    return originalExtractDocumentNumber.call(this);
                };
                
                this.extractDate = function() {
                    if (this._metadataCache && this._metadataCache.data) {
                        console.log('✅ [METADATA FIX] Data da metadati:', this._metadataCache.data);
                        return this._metadataCache.data;
                    }
                    return originalExtractDate.call(this);
                };
                
                this.extractVatNumber = function() {
                    if (this._metadataCache && this._metadataCache.partitaIva) {
                        console.log('✅ [METADATA FIX] P.IVA da metadati:', this._metadataCache.partitaIva);
                        return this._metadataCache.partitaIva;
                    }
                    return originalExtractVatNumber.call(this);
                };
            }
            
            // Chiama il metodo originale
            const result = originalExtract.call(this);
            
            // Se abbiamo metadati, assicuriamoci che siano nel risultato
            if (metadata && result) {
                if (metadata.cliente && (!result.cliente || result.cliente.includes('numero di lotto'))) {
                    result.cliente = metadata.cliente;
                }
                if (metadata.numero && !result.numero) {
                    result.numero = metadata.numero;
                }
                if (metadata.data && !result.data) {
                    result.data = metadata.data;
                }
                if (metadata.partitaIva && !result.partitaIva) {
                    result.partitaIva = metadata.partitaIva;
                }
                if (metadata.indirizzoConsegna && !result.indirizzoConsegna) {
                    result.indirizzoConsegna = metadata.indirizzoConsegna;
                }
                
                console.log('✅ [METADATA FIX] Risultato finale con metadati:', result);
            }
            
            return result;
        };
    }
    
    // Applica lo stesso fix a DDTExtractorModular se esiste
    if (window.DDTExtractorModular) {
        const originalExtractModular = window.DDTExtractorModular.prototype.extract;
        
        window.DDTExtractorModular.prototype.extract = function() {
            console.log('🔍 [METADATA FIX MODULAR] Verifico presenza metadati...');
            
            const metadata = extractMetadata(this.text);
            if (metadata) {
                this._metadataCache = metadata;
            }
            
            const result = originalExtractModular.call(this);
            
            if (metadata && result) {
                if (metadata.cliente && (!result.cliente || result.cliente.includes('numero di lotto'))) {
                    result.cliente = metadata.cliente;
                }
                // ... altri campi come sopra
            }
            
            return result;
        };
    }
    
    console.log('✅ Fix estrazione metadati applicato');
    
})();