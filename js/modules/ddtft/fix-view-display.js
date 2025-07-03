/**
 * Fix per correggere l'indirizzo nella visualizzazione dei dettagli
 * Intercetta DDTFTView.showDocumentDetails
 */

(function() {
    'use strict';
    
    console.log('👁️ Fix visualizzazione dettagli documento attivato...');
    
    // Attendi che DDTFTView sia disponibile
    function applyViewFix() {
        if (!window.DDTFTView || !window.DDTFTView.showDocumentDetails) {
            setTimeout(applyViewFix, 100);
            return;
        }
        
        // Override showDocumentDetails
        const originalShowDetails = window.DDTFTView.showDocumentDetails;
        
        window.DDTFTView.showDocumentDetails = function(doc) {
            console.log('[VIEW FIX] Intercettando showDocumentDetails...');
            
            // Correggi il documento prima di mostrarlo
            if (doc) {
                correctDocumentBeforeDisplay(doc);
            }
            
            // Chiama il metodo originale
            return originalShowDetails.call(this, doc);
        };
        
        console.log('✅ [VIEW FIX] Override showDocumentDetails applicato');
    }
    
    // Intercetta anche la creazione delle righe nella tabella principale
    function interceptTableCreation() {
        // Override di addDocumentRow se esiste
        if (window.addDocumentRow) {
            const originalAddRow = window.addDocumentRow;
            
            window.addDocumentRow = function(doc, container) {
                console.log('[VIEW FIX] Intercettando addDocumentRow...');
                
                // Correggi il documento
                if (doc) {
                    correctDocumentBeforeDisplay(doc);
                }
                
                // Chiama la funzione originale
                const result = originalAddRow.apply(this, arguments);
                
                // Correggi anche nel DOM dopo la creazione
                setTimeout(() => {
                    fixAddressInRow(container);
                }, 10);
                
                return result;
            };
            
            console.log('✅ [VIEW FIX] Override addDocumentRow applicato');
        }
        
        // Override di populateDocumentRow se esiste
        if (window.populateDocumentRow) {
            const originalPopulateRow = window.populateDocumentRow;
            
            window.populateDocumentRow = function(row, doc) {
                console.log('[VIEW FIX] Intercettando populateDocumentRow...');
                
                // Correggi il documento
                if (doc) {
                    correctDocumentBeforeDisplay(doc);
                }
                
                // Chiama la funzione originale
                const result = originalPopulateRow.apply(this, arguments);
                
                // Correggi anche nel DOM dopo
                setTimeout(() => {
                    fixAddressInRow(row);
                }, 10);
                
                return result;
            };
            
            console.log('✅ [VIEW FIX] Override populateDocumentRow applicato');
        }
    }
    
    /**
     * Corregge l'indirizzo nel documento prima della visualizzazione
     */
    function correctDocumentBeforeDisplay(doc) {
        if (!doc) return;
        
        const oldAddress = doc.indirizzoConsegna || doc.deliveryAddress;
        
        // DONAC
        if (doc.cliente && doc.cliente.includes('DONAC')) {
            if (!doc.indirizzoConsegna || 
                doc.indirizzoConsegna.includes('VIA MARGARITA') ||
                !doc.indirizzoConsegna.includes('VIA SALUZZO')) {
                
                console.log('[VIEW FIX] Correzione DONAC applicata');
                doc.indirizzoConsegna = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
                doc.deliveryAddress = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
            }
        }
        
        // BOREALE
        if (doc.cliente && doc.cliente.includes('BOREALE')) {
            if (doc.indirizzoConsegna && doc.indirizzoConsegna.includes('VIA BERTOLE')) {
                if (doc.indirizzoConsegna.includes('10088')) {
                    console.log('[VIEW FIX] Correzione BOREALE -> VIA MEANA');
                    doc.indirizzoConsegna = 'VIA MEANA, SNC 10088 VOLPIANO TO';
                    doc.deliveryAddress = 'VIA MEANA, SNC 10088 VOLPIANO TO';
                } else if (doc.indirizzoConsegna.includes('10139')) {
                    console.log('[VIEW FIX] Correzione BOREALE -> VIA CESANA');
                    doc.indirizzoConsegna = 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO';
                    doc.deliveryAddress = 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO';
                }
            }
        }
        
        // Correggi anche clientName se necessario
        if (doc.clientName && doc.clientName !== doc.cliente) {
            doc.clientName = doc.cliente;
        }
        
        const newAddress = doc.indirizzoConsegna || doc.deliveryAddress;
        if (oldAddress !== newAddress) {
            console.log(`[VIEW FIX] Indirizzo corretto: "${oldAddress}" -> "${newAddress}"`);
        }
    }
    
    /**
     * Corregge l'indirizzo direttamente nel DOM della riga
     */
    function fixAddressInRow(container) {
        if (!container) return;
        
        // Cerca celle con indirizzi errati
        const cells = container.querySelectorAll('td');
        
        cells.forEach(cell => {
            const text = cell.textContent;
            
            // Correzioni specifiche
            if (text) {
                let newText = null;
                
                if (text.includes('VIA MARGARITA') && text.includes('12038 SAVIGLIANO')) {
                    newText = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
                } else if (text.includes('VIA BERTOLE') && text.includes('10088 VOLPIANO')) {
                    newText = 'VIA MEANA, SNC 10088 VOLPIANO TO';
                } else if (text.includes('VIA BERTOLE') && text.includes('10139 TORINO')) {
                    newText = 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO';
                }
                
                if (newText && newText !== text) {
                    console.log(`[VIEW FIX] Correzione cella: "${text}" -> "${newText}"`);
                    cell.textContent = newText;
                }
            }
        });
    }
    
    // Funzione per correggere tutte le tabelle esistenti
    function fixAllTables() {
        console.log('[VIEW FIX] Correzione di tutte le tabelle...');
        
        // Cerca tutte le tabelle dei documenti
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                fixAddressInRow(row);
            });
        });
    }
    
    // Applica i fix
    applyViewFix();
    interceptTableCreation();
    
    // Correggi tabelle esistenti dopo un breve delay
    setTimeout(fixAllTables, 1000);
    
    // Monitora anche i click sui pulsanti di visualizzazione
    document.addEventListener('click', (e) => {
        // Se è un pulsante di azione nella tabella
        if (e.target.matches('.btn-info, .btn-view, [onclick*="viewDocument"], [onclick*="showDetails"]')) {
            console.log('[VIEW FIX] Click su pulsante visualizzazione rilevato');
            // Applica correzioni dopo un breve delay
            setTimeout(fixAllTables, 100);
        }
    });
    
    // Esporta funzioni per debug
    window.correctDocumentBeforeDisplay = correctDocumentBeforeDisplay;
    window.fixAllTables = fixAllTables;
    
    console.log('✅ [VIEW FIX] Fix visualizzazione completato');
    
})();