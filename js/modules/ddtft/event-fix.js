/**
 * Fix per gli event listener dei pulsanti DDT/FT
 * Usa event delegation per garantire che i pulsanti funzionino sempre
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix eventi DDT/FT...');
    
    // Attendi il caricamento del DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEventFix);
    } else {
        initEventFix();
    }
    
    function initEventFix() {
        // Usa event delegation sul container principale
        document.addEventListener('click', function(e) {
            // Solo se siamo nel tab DDT/FT
            const ddtftContent = document.getElementById('ddtft-content');
            if (!ddtftContent || !ddtftContent.contains(e.target)) {
                return;
            }
            
            // Identifica il pulsante cliccato
            const button = e.target.closest('button');
            if (!button) return;
            
            // Gestisci i vari pulsanti
            switch(button.id) {
                case 'exportDocumentsExcelBtn':
                    e.preventDefault();
                    console.log('📊 Export Excel cliccato');
                    if (window.DDTFTModule && window.DDTFTModule.exportDocumentsToExcel) {
                        window.DDTFTModule.exportDocumentsToExcel();
                    } else {
                        console.error('DDTFTModule.exportDocumentsToExcel non disponibile');
                        alert('Funzione di export non disponibile. Ricarica la pagina.');
                    }
                    break;
                    
                case 'clearDocumentsBtn':
                    e.preventDefault();
                    console.log('🗑️ Clear Documents cliccato');
                    if (window.DDTFTModule && window.DDTFTModule.clearAllDocuments) {
                        window.DDTFTModule.clearAllDocuments();
                    } else {
                        console.error('DDTFTModule.clearAllDocuments non disponibile');
                        alert('Funzione di cancellazione non disponibile. Ricarica la pagina.');
                    }
                    break;
                    
                case 'viewDDTFTContentBtn':
                    e.preventDefault();
                    console.log('👁️ View Content cliccato');
                    if (window.DDTFTSyncManager && window.DDTFTSyncManager.viewDDTFTContent) {
                        window.DDTFTSyncManager.viewDDTFTContent();
                    } else if (window.DDTFTImport && window.DDTFTImport.viewDDTFTContent) {
                        window.DDTFTImport.viewDDTFTContent();
                    } else {
                        console.error('Funzione viewDDTFTContent non disponibile');
                        alert('Funzione di visualizzazione non disponibile. Ricarica la pagina.');
                    }
                    break;
                    
                case 'syncDDTFTBtn':
                    e.preventDefault();
                    console.log('🔄 Sync cliccato');
                    if (window.DDTFTSyncManager && window.DDTFTSyncManager.showSyncDialog) {
                        window.DDTFTSyncManager.showSyncDialog();
                    } else if (window.DDTFTImport && window.DDTFTImport.showSyncDialog) {
                        window.DDTFTImport.showSyncDialog();
                    } else {
                        console.error('Funzione showSyncDialog non disponibile');
                        alert('Funzione di sincronizzazione non disponibile. Ricarica la pagina.');
                    }
                    break;
                    
                case 'uploadDocumentPdfBtn':
                    e.preventDefault();
                    console.log('📄 Upload PDF cliccato');
                    if (window.DDTFTModule && window.DDTFTModule.showImportSection) {
                        window.DDTFTModule.showImportSection();
                    } else {
                        console.error('DDTFTModule.showImportSection non disponibile');
                        alert('Funzione di import non disponibile. Ricarica la pagina.');
                    }
                    break;
                    
                case 'selectDocumentPDFBtn':
                    e.preventDefault();
                    console.log('📎 Select PDF cliccato');
                    const fileInput = document.getElementById('documentPDFInput');
                    if (fileInput) {
                        fileInput.click();
                    }
                    break;
                    
                case 'confirmDocumentUploadBtn':
                    e.preventDefault();
                    console.log('✅ Confirm Upload cliccato');
                    if (window.DDTFTModule && window.DDTFTModule.confirmDocumentImport) {
                        window.DDTFTModule.confirmDocumentImport();
                    }
                    break;
                    
                case 'cancelDocumentUploadBtn':
                    e.preventDefault();
                    console.log('❌ Cancel Upload cliccato');
                    if (window.DDTFTModule && window.DDTFTModule.cancelImport) {
                        window.DDTFTModule.cancelImport();
                    }
                    break;
            }
            
            // Gestisci i pulsanti filtro
            if (button.classList.contains('filter-btn')) {
                e.preventDefault();
                const filter = button.dataset.filter;
                console.log(`🔍 Filtro ${filter} cliccato`);
                if (window.DDTFTModule && window.DDTFTModule.filterDocuments) {
                    window.DDTFTModule.filterDocuments(filter);
                }
            }
            
            // Gestisci i pulsanti delle azioni nelle righe della tabella
            if (button.classList.contains('btn-view')) {
                e.preventDefault();
                const docId = button.dataset.id;
                console.log(`👁️ View documento ${docId}`);
                if (window.DDTFTModule && window.DDTFTModule.viewDocument) {
                    window.DDTFTModule.viewDocument(docId);
                }
            }
            
            if (button.classList.contains('btn-edit')) {
                e.preventDefault();
                const docId = button.dataset.id;
                console.log(`✏️ Edit documento ${docId}`);
                if (window.DDTFTModule && window.DDTFTModule.editDocument) {
                    window.DDTFTModule.editDocument(docId);
                }
            }
            
            if (button.classList.contains('btn-delete')) {
                e.preventDefault();
                const docId = button.dataset.id;
                console.log(`🗑️ Delete documento ${docId}`);
                if (window.DDTFTModule && window.DDTFTModule.deleteDocument) {
                    window.DDTFTModule.deleteDocument(docId);
                }
            }
        });
        
        // Gestisci anche l'input di ricerca
        document.addEventListener('input', function(e) {
            if (e.target.id === 'documentSearchInput') {
                console.log(`🔍 Ricerca: ${e.target.value}`);
                if (window.DDTFTModule && window.DDTFTModule.searchDocuments) {
                    window.DDTFTModule.searchDocuments(e.target.value);
                }
            }
        });
        
        // Gestisci il cambio file
        document.addEventListener('change', function(e) {
            if (e.target.id === 'documentPDFInput') {
                console.log('📁 File selezionati');
                if (window.DDTFTModule && window.DDTFTModule.handleFileSelection) {
                    window.DDTFTModule.handleFileSelection(e);
                }
            }
        });
        
        console.log('✅ Fix eventi DDT/FT applicato');
    }
    
    // Funzione helper per debug
    window.debugDDTFTButtons = function() {
        console.log('=== DEBUG PULSANTI DDT/FT ===');
        console.log('DDTFTModule disponibile:', !!window.DDTFTModule);
        console.log('DDTFTSyncManager disponibile:', !!window.DDTFTSyncManager);
        console.log('DDTFTImport disponibile:', !!window.DDTFTImport);
        console.log('DDTFTExportAdvanced disponibile:', !!window.DDTFTExportAdvanced);
        console.log('DDTFTExportExcel disponibile:', !!window.DDTFTExportExcel);
        
        const buttons = document.querySelectorAll('#ddtft-content button');
        console.log(`Trovati ${buttons.length} pulsanti:`);
        buttons.forEach(btn => {
            console.log(`- ${btn.id || 'no-id'}: ${btn.textContent.trim()}`);
        });
    };
})();