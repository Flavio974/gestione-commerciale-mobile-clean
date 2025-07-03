/**
 * Fix per estrarre i dati delle fatture dai metadati nel PDF
 * Simile a come funziona per i DDT
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix metadati fatture...');
    
    // Funzione per estrarre metadati dal testo
    function extractFatturaMetadata(text) {
        const metadata = {};
        
        // Cerca sezione metadati (simile ai DDT)
        const metadataMatch = text.match(/\[METADATA_START\]([\s\S]*?)\[METADATA_END\]/);
        if (metadataMatch) {
            const metadataText = metadataMatch[1];
            const lines = metadataText.split('\n');
            
            lines.forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > -1) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();
                    
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
        
        return null;
    }
    
    // Override specifico per FatturaExtractor
    if (window.FatturaExtractor) {
        const originalExtract = window.FatturaExtractor.prototype.extract;
        
        window.FatturaExtractor.prototype.extract = function() {
            console.log('🔍 [FATTURA METADATA FIX] Verifico presenza metadati...');
            
            // Prima cerca i metadati
            const metadata = extractFatturaMetadata(this.text);
            
            // Chiama il metodo originale
            const result = originalExtract.call(this);
            
            if (metadata) {
                console.log('✅ [FATTURA METADATA FIX] Metadati trovati:', metadata);
                
                // Sovrascrivi con i dati dai metadati se presenti
                if (metadata.cliente) {
                    result.cliente = metadata.cliente;
                    result.clientName = metadata.cliente;
                }
                if (metadata.numero) {
                    result.numero = metadata.numero;
                    result.documentNumber = metadata.numero;
                }
                if (metadata.data) {
                    result.data = metadata.data;
                    result.date = metadata.data;
                }
                if (metadata.partitaIva) {
                    result.partitaIva = metadata.partitaIva;
                    result.vatNumber = metadata.partitaIva;
                }
                if (metadata.indirizzoConsegna) {
                    result.indirizzoConsegna = metadata.indirizzoConsegna;
                    result.deliveryAddress = metadata.indirizzoConsegna;
                }
                
                console.log('✅ [FATTURA METADATA FIX] Risultato con metadati:', result);
            } else {
                console.log('❌ [FATTURA METADATA FIX] Nessun metadato trovato');
                
                // Se non ci sono metadati, prova con pattern specifici per fatture Alfieri
                // Cerca il codice cliente nel formato "Cod. Cli. 20001" o simile
                const codClienteMatch = this.text.match(/Cod\.\s*Cli\.\s*(\d+)/i);
                if (codClienteMatch) {
                    result.clientCode = codClienteMatch[1];
                    console.log(`✅ [FATTURA METADATA FIX] Codice cliente trovato: ${result.clientCode}`);
                }
                
                // Estrai data dal nome file se presente
                if (this.fileName) {
                    const dateFromFile = this.fileName.match(/_(\d{1,2})(\d{2})(\d{4})\.PDF$/i);
                    if (dateFromFile) {
                        result.data = `${dateFromFile[1]}/${dateFromFile[2]}/${dateFromFile[3]}`;
                        result.date = result.data;
                        console.log(`✅ [FATTURA METADATA FIX] Data estratta dal nome file: ${result.data}`);
                    }
                }
            }
            
            return result;
        };
    }
    
    // Applica lo stesso a FatturaExtractorModular
    if (window.FatturaExtractorModular) {
        const originalExtractModular = window.FatturaExtractorModular.prototype.extract;
        
        window.FatturaExtractorModular.prototype.extract = function() {
            const metadata = extractFatturaMetadata(this.text);
            const result = originalExtractModular.call(this);
            
            if (metadata) {
                if (metadata.cliente) {
                    result.cliente = metadata.cliente;
                    result.clientName = metadata.cliente;
                }
                if (metadata.data) {
                    result.data = metadata.data;
                    result.date = metadata.data;
                }
                // ... altri campi come sopra
            }
            
            return result;
        };
    }
    
    console.log('✅ Fix metadati fatture applicato');
    
})();