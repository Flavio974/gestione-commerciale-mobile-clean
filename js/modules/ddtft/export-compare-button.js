/**
 * Aggiunge un pulsante separato per l'export con confronto
 * Non tocca il pulsante esistente che funziona
 */

(function() {
    'use strict';
    
    console.log('📊 Aggiunta pulsante Export con Confronto...');
    
    // Attendi il caricamento del DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCompareButton);
    } else {
        initCompareButton();
    }
    
    let retryCount = 0;
    const maxRetries = 10;
    
    function initCompareButton() {
        // Attendi che il modulo DDT/FT sia visibile
        setTimeout(() => {
            addCompareButton();
        }, 500);
    }
    
    function addCompareButton() {
        // Trova il pulsante export esistente
        const exportBtn = document.getElementById('exportDocumentsExcelBtn');
        if (!exportBtn) {
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`Pulsante export non trovato, tentativo ${retryCount}/${maxRetries}...`);
                setTimeout(addCompareButton, 1000);
            } else {
                console.log('❌ Pulsante export non trovato dopo ' + maxRetries + ' tentativi. Verificare che si sia nella scheda DDT/FT.');
            }
            return;
        }
        
        // Reset counter se trovato
        retryCount = 0;
        
        // Verifica se il pulsante è già stato aggiunto
        if (document.getElementById('exportDocumentsCompareBtn')) {
            return;
        }
        
        // Crea il nuovo pulsante
        const compareBtn = document.createElement('button');
        compareBtn.id = 'exportDocumentsCompareBtn';
        compareBtn.className = exportBtn.className;
        compareBtn.innerHTML = '<i class="fas fa-file-excel"></i> Esporta con Confronto';
        compareBtn.style.marginLeft = '10px';
        compareBtn.title = 'Esporta con possibilità di confrontare con file esistente';
        
        // Inserisci il pulsante dopo quello esistente
        exportBtn.parentNode.insertBefore(compareBtn, exportBtn.nextSibling);
        
        // Aggiungi event listener
        compareBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('📊 Export con Confronto cliccato');
            
            // Usa il modulo avanzato per il confronto
            if (window.DDTFTModule && window.DDTFTModule.exportDocumentsWithCompare) {
                window.DDTFTModule.exportDocumentsWithCompare();
            } else {
                console.error('Funzione exportDocumentsWithCompare non disponibile');
            }
        });
        
        console.log('✅ Pulsante Export con Confronto aggiunto');
    }
    
    // Aggiungi la funzione al modulo DDTFTModule
    if (window.DDTFTModule) {
        window.DDTFTModule.exportDocumentsWithCompare = function() {
            try {
                // Prendi tutti i documenti disponibili
                let documentsToExport = this.state.documents;
                
                if (!documentsToExport || documentsToExport.length === 0) {
                    alert('Nessun documento da esportare');
                    return;
                }

                console.log(`📊 Esportazione con confronto di ${documentsToExport.length} documenti...`);
                
                // Correggi le descrizioni prima dell'export (stesso codice del normale export)
                console.log('=== CORREZIONE DESCRIZIONI PRIMA DELL\'EXPORT ===');
                let fixedDescriptions = 0;
                
                // Crea una copia profonda per non modificare i dati originali
                documentsToExport = JSON.parse(JSON.stringify(documentsToExport));
                
                documentsToExport.forEach((doc, docIndex) => {
                    if (doc.items && Array.isArray(doc.items)) {
                        doc.items.forEach((item, itemIndex) => {
                            // Se la descrizione è "0", numero o mancante
                            if (!item.description || item.description === "0" || item.description === 0 || 
                                typeof item.description === 'number' || item.description === '') {
                                
                                // Prova tutti i possibili campi alternativi
                                const possibleFields = [
                                    'descrizione', 'descrizioneProdotto', 'desc', 'nome', 
                                    'nomeProdotto', 'articolo', 'denominazione', 'name', 'productName'
                                ];
                                
                                let found = false;
                                for (const field of possibleFields) {
                                    if (item[field] && item[field] !== "0" && item[field] !== 0) {
                                        item.description = String(item[field]);
                                        fixedDescriptions++;
                                        found = true;
                                        break;
                                    }
                                }
                                
                                // Se ancora non trovata, cerca in proprietà numeriche
                                if (!found) {
                                    for (let i = 0; i < 10; i++) {
                                        if (item[i] && typeof item[i] === 'string' && item[i].length > 5 && 
                                            item[i] !== "0" && !/^\d+$/.test(item[i])) {
                                            item.description = item[i];
                                            fixedDescriptions++;
                                            found = true;
                                            break;
                                        }
                                    }
                                }
                                
                                // Ultimo fallback
                                if (!found) {
                                    item.description = `Articolo ${item.code || 'SCONOSCIUTO'}`;
                                    fixedDescriptions++;
                                }
                            }
                            
                            // Assicurati che sia sempre una stringa
                            item.description = String(item.description);
                        });
                    }
                });
                
                console.log(`✅ Corrette ${fixedDescriptions} descrizioni prima dell'export`);
                console.log('=== FINE CORREZIONE DESCRIZIONI ===');

                // USA DIRETTAMENTE L'EXPORT CHE FUNZIONA
                // Il confronto verrà implementato in futuro senza rompere l'export
                if (window.DDTFTExportExcel && window.DDTFTExportExcel.exportToExcel) {
                    console.log('Export diretto con dati corretti');
                    window.DDTFTExportExcel.exportToExcel(documentsToExport);
                    alert('Export completato!\n\nNota: La funzione di confronto sarà disponibile prossimamente.');
                } else {
                    console.error('Modulo DDTFTExportExcel non disponibile');
                    alert('Errore: modulo di export non disponibile.');
                }
            } catch (error) {
                console.error('Errore durante l\'esportazione con confronto:', error);
                alert('Errore durante l\'esportazione: ' + error.message);
            }
        };
    }
    
    // Monitora i cambiamenti del DOM per aggiungere il pulsante quando necessario
    const observer = new MutationObserver(function(mutations) {
        if (document.getElementById('exportDocumentsExcelBtn') && !document.getElementById('exportDocumentsCompareBtn')) {
            addCompareButton();
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
})();