/**
 * Fix per correggere l'indirizzo direttamente nella visualizzazione della tabella
 * Intercetta il rendering della tabella DDT/FT
 */

(function() {
    'use strict';
    
    console.log('📊 Fix visualizzazione tabella DDT/FT attivato...');
    
    // Override della funzione che aggiorna la tabella documenti
    if (window.updateDocumentsTable) {
        const originalUpdateTable = window.updateDocumentsTable;
        
        window.updateDocumentsTable = function() {
            console.log('[TABLE FIX] Intercettando updateDocumentsTable...');
            
            // Chiama la funzione originale
            const result = originalUpdateTable.apply(this, arguments);
            
            // Correggi gli indirizzi nella tabella
            setTimeout(() => {
                fixTableAddresses();
            }, 10);
            
            return result;
        };
    }
    
    // Override anche di renderDocumentsTable se esiste
    if (window.renderDocumentsTable) {
        const originalRenderTable = window.renderDocumentsTable;
        
        window.renderDocumentsTable = function(documents) {
            console.log('[TABLE FIX] Intercettando renderDocumentsTable...');
            
            // Correggi i documenti prima del rendering
            if (Array.isArray(documents)) {
                documents.forEach(doc => {
                    correctDocumentAddress(doc);
                });
            }
            
            // Chiama la funzione originale
            const result = originalRenderTable.apply(this, arguments);
            
            // Correggi anche dopo il rendering
            setTimeout(() => {
                fixTableAddresses();
            }, 10);
            
            return result;
        };
    }
    
    // Intercetta anche la creazione delle righe della tabella
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName);
        
        // Se è una cella TD, aggiungi un observer per correggere il contenuto
        if (tagName.toLowerCase() === 'td') {
            // Usa MutationObserver per monitorare cambiamenti
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        const text = element.textContent;
                        if (text && text.includes('VIA MARGARITA') && text.includes('12038 SAVIGLIANO')) {
                            console.log('[TABLE FIX] Correzione cella tabella: VIA MARGARITA -> VIA SALUZZO');
                            element.textContent = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
                            observer.disconnect(); // Stop observing after fix
                        }
                    }
                });
            });
            
            // Inizia a osservare non appena viene aggiunto contenuto
            observer.observe(element, {
                childList: true,
                characterData: true,
                subtree: true
            });
            
            // Disconnetti dopo 5 secondi per evitare memory leak
            setTimeout(() => observer.disconnect(), 5000);
        }
        
        return element;
    };
    
    /**
     * Corregge gli indirizzi direttamente nel DOM della tabella
     */
    function fixTableAddresses() {
        console.log('[TABLE FIX] Correzione indirizzi nella tabella...');
        
        // Cerca tutte le celle che potrebbero contenere indirizzi
        const cells = document.querySelectorAll('td');
        let fixed = 0;
        
        cells.forEach(cell => {
            const text = cell.textContent;
            
            // Correzione DONAC
            if (text && text.includes('VIA MARGARITA') && text.includes('12038 SAVIGLIANO')) {
                console.log('[TABLE FIX] Trovata cella con indirizzo errato DONAC');
                cell.textContent = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
                fixed++;
            }
            
            // Correzione BOREALE
            if (text && text.includes('VIA BERTOLE') && text.includes('10088 VOLPIANO')) {
                console.log('[TABLE FIX] Trovata cella con indirizzo errato BOREALE');
                cell.textContent = 'VIA MEANA, SNC 10088 VOLPIANO TO';
                fixed++;
            }
            
            if (text && text.includes('VIA BERTOLE') && text.includes('10139 TORINO')) {
                console.log('[TABLE FIX] Trovata cella con indirizzo errato BOREALE');
                cell.textContent = 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO';
                fixed++;
            }
        });
        
        if (fixed > 0) {
            console.log(`[TABLE FIX] Corretti ${fixed} indirizzi nella tabella`);
        }
    }
    
    /**
     * Corregge l'indirizzo nel documento
     */
    function correctDocumentAddress(doc) {
        if (!doc) return;
        
        // DONAC
        if (doc.cliente && doc.cliente.includes('DONAC')) {
            if (doc.indirizzoConsegna && doc.indirizzoConsegna.includes('VIA MARGARITA')) {
                console.log('[TABLE FIX] Correzione documento DONAC');
                doc.indirizzoConsegna = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
                doc.deliveryAddress = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
            }
        }
        
        // BOREALE
        if (doc.cliente && doc.cliente.includes('BOREALE')) {
            if (doc.indirizzoConsegna && doc.indirizzoConsegna.includes('VIA BERTOLE')) {
                if (doc.indirizzoConsegna.includes('10088')) {
                    console.log('[TABLE FIX] Correzione documento BOREALE -> VIA MEANA');
                    doc.indirizzoConsegna = 'VIA MEANA, SNC 10088 VOLPIANO TO';
                    doc.deliveryAddress = 'VIA MEANA, SNC 10088 VOLPIANO TO';
                } else if (doc.indirizzoConsegna.includes('10139')) {
                    console.log('[TABLE FIX] Correzione documento BOREALE -> VIA CESANA');
                    doc.indirizzoConsegna = 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO';
                    doc.deliveryAddress = 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO';
                }
            }
        }
    }
    
    // Monitora cambiamenti nel DOM per correggere nuove tabelle
    const tableObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                // Controlla se sono state aggiunte tabelle
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.tagName === 'TABLE' || node.querySelector('table')) {
                            console.log('[TABLE FIX] Nuova tabella rilevata');
                            setTimeout(() => {
                                fixTableAddresses();
                            }, 100);
                        }
                    }
                });
            }
        });
    });
    
    // Inizia a osservare il body per nuove tabelle
    if (document.body) {
        tableObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            tableObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
    
    // Correggi anche al caricamento della pagina
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(fixTableAddresses, 500);
        });
    } else {
        setTimeout(fixTableAddresses, 500);
    }
    
    // Esporta funzioni per test
    window.fixTableAddresses = fixTableAddresses;
    window.correctDocumentAddress = correctDocumentAddress;
    
    console.log('✅ [TABLE FIX] Fix visualizzazione tabella installato');
    
})();