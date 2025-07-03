/**
 * Integrazione del PreciseDeliveryAddressExtractor nel sistema DDT/FT
 * Sostituisce o affianca il robust extractor per maggiore precisione
 */

(function() {
    'use strict';
    
    console.log('🎯 Caricamento integrazione Precise Delivery Address Extractor...');
    
    // Verifica che l'extractor sia disponibile
    if (!window.PreciseDeliveryAddressExtractor) {
        console.error('❌ PreciseDeliveryAddressExtractor non trovato! Assicurati di caricare il file prima di questo.');
        return;
    }
    
    // Crea istanza dell'extractor
    const preciseExtractor = new PreciseDeliveryAddressExtractor({
        debug: false,  // Imposta a true per debug dettagliato
        strict: true   // Modalità strict per validazione rigorosa
    });
    
    // Override del parseDocumentFromText
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            console.log('[PRECISE ADDRESS] Intercettato parseDocumentFromText');
            
            // Chiama il metodo originale
            const result = originalParse.call(this, text, fileName);
            
            if (!result) return result;
            
            // Prepara i metadati per l'extractor
            const metadata = {
                documentType: result.documentType || 'Unknown',
                clientName: result.clientName || result.cliente || '',
                documentNumber: result.documentNumber || result.numeroDocumento || ''
            };
            
            console.log('[PRECISE ADDRESS] Metadata:', metadata);
            
            // Estrai l'indirizzo usando il precise extractor
            try {
                // Converte il testo in formato rows per l'extractor
                const rows = convertTextToRows(text);
                
                // Chiama l'extractor
                const extractionResult = preciseExtractor.extract(rows, text, metadata);
                
                if (extractionResult && extractionResult.address) {
                    console.log(`✅ [PRECISE ADDRESS] Indirizzo estratto con metodo ${extractionResult.method}:`);
                    console.log(`   ${extractionResult.address}`);
                    console.log(`   Confidence: ${extractionResult.confidence}`);
                    
                    // Aggiorna il risultato solo se l'indirizzo estratto è migliore
                    if (!result.deliveryAddress || 
                        result.deliveryAddress.length < 10 || 
                        extractionResult.confidence > 0.8) {
                        
                        result.deliveryAddress = extractionResult.address;
                        result.indirizzoConsegna = extractionResult.address;
                        result.deliveryAddressMethod = extractionResult.method;
                        result.deliveryAddressConfidence = extractionResult.confidence;
                        
                        console.log('✅ [PRECISE ADDRESS] Indirizzo aggiornato nel documento');
                    }
                } else {
                    console.log('⚠️ [PRECISE ADDRESS] Nessun indirizzo estratto dal precise extractor');
                }
                
            } catch (error) {
                console.error('❌ [PRECISE ADDRESS] Errore durante l\'estrazione:', error);
            }
            
            return result;
        };
        
        console.log('✅ [PRECISE ADDRESS] Override parseDocumentFromText applicato');
    }
    
    // Funzione helper per convertire il testo in formato rows
    function convertTextToRows(text) {
        const lines = text.split('\n');
        const rows = [];
        
        // Analizza ogni riga e crea una struttura simile a quella di PDF.js
        lines.forEach((line, index) => {
            if (!line.trim()) return;
            
            // Simula la struttura con elementi e coordinate X
            const elements = [];
            let currentX = 0;
            
            // Dividi la riga in parti basandosi su spazi multipli
            const parts = line.split(/\s{2,}/);
            
            parts.forEach((part, partIndex) => {
                if (part.trim()) {
                    elements.push({
                        text: part.trim(),
                        x: currentX,
                        y: index * 20  // Simula coordinate Y
                    });
                    currentX += 200; // Incrementa X per simulare colonne
                }
            });
            
            // Se non ci sono elementi multipli, crea un singolo elemento
            if (elements.length === 0 && line.trim()) {
                elements.push({
                    text: line.trim(),
                    x: 0,
                    y: index * 20
                });
            }
            
            rows.push(elements);
        });
        
        return rows;
    }
    
    // Funzione pubblica per test diretti
    window.testPreciseAddressExtraction = function(text, metadata) {
        console.log('\n🧪 Test diretto Precise Address Extraction');
        const rows = convertTextToRows(text);
        const result = preciseExtractor.extract(rows, text, metadata || {});
        
        if (result) {
            console.log('✅ Risultato:');
            console.log(`   Indirizzo: ${result.address}`);
            console.log(`   Metodo: ${result.method}`);
            console.log(`   Confidence: ${result.confidence}`);
        } else {
            console.log('❌ Nessun indirizzo estratto');
        }
        
        return result;
    };
    
    // Aggiungi metodo per abilitare/disabilitare il debug
    window.setPreciseAddressDebug = function(enabled) {
        preciseExtractor.debug = enabled;
        console.log(`🔧 Precise Address Extractor debug ${enabled ? 'abilitato' : 'disabilitato'}`);
    };
    
    // Aggiungi metodo per cambiare modalità strict
    window.setPreciseAddressStrict = function(enabled) {
        preciseExtractor.strict = enabled;
        console.log(`🔧 Precise Address Extractor strict mode ${enabled ? 'abilitato' : 'disabilitato'}`);
    };
    
    console.log('✅ Integrazione Precise Delivery Address Extractor completata');
    console.log('   - Usa testPreciseAddressExtraction(text, metadata) per test diretti');
    console.log('   - Usa setPreciseAddressDebug(true) per abilitare il debug');
    console.log('   - Usa setPreciseAddressStrict(false) per disabilitare la modalità strict');
    
})();