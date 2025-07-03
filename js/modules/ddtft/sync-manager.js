/**
 * DDTFT Sync Manager
 * Gestisce la sincronizzazione dei documenti DDT/FT
 */

window.DDTFTSyncManager = (function() {
    'use strict';
    
    /**
     * Mostra il dialog di sincronizzazione
     */
    function showSyncDialog() {
        // Recupera documenti temporanei da sessionStorage
        const tempDocumentsStr = sessionStorage.getItem('tempDocuments');
        let tempDocuments = [];
        
        try {
            if (tempDocumentsStr) {
                tempDocuments = JSON.parse(tempDocumentsStr);
            }
        } catch (e) {
            console.error('Errore nel parsing dei documenti temporanei:', e);
        }
        
        if (!tempDocuments || tempDocuments.length === 0) {
            alert('Nessun documento da sincronizzare.\n\nImporta prima alcuni DDT o Fatture.');
            return;
        }
        
        // Recupera documenti salvati
        const savedDocuments = JSON.parse(localStorage.getItem('ddtftDocuments') || '[]');
        
        // Crea e mostra il dialog
        const modal = createSyncModal(tempDocuments, savedDocuments);
        document.body.appendChild(modal);
    }
    
    /**
     * Crea il modal di sincronizzazione
     */
    function createSyncModal(tempDocuments, savedDocuments) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'syncModal';
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>🔄 Sincronizzazione Documenti DDT/FT</h3>
                    <button class="close-btn" onclick="DDTFTSyncManager.closeSyncDialog()">×</button>
                </div>
                <div class="modal-body">
                    <div class="sync-summary">
                        <h4>Riepilogo:</h4>
                        <ul>
                            <li>Documenti temporanei da sincronizzare: <strong>${tempDocuments.length}</strong></li>
                            <li>Documenti già salvati: <strong>${savedDocuments.length}</strong></li>
                        </ul>
                    </div>
                    
                    <div class="sync-details">
                        <h4>Documenti da sincronizzare:</h4>
                        <div class="documents-list" style="max-height: 300px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 5px; padding: 10px;">
                            ${renderDocumentsList(tempDocuments)}
                        </div>
                    </div>
                    
                    <div class="sync-actions" style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="btn btn-primary" onclick="DDTFTSyncManager.performSync()">
                            ✅ Sincronizza Documenti
                        </button>
                        <button class="btn btn-warning" onclick="DDTFTSyncManager.replaceAll()">
                            🔄 Sostituisci Tutto
                        </button>
                        <button class="btn btn-secondary" onclick="DDTFTSyncManager.closeSyncDialog()">
                            ❌ Annulla
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }
    
    /**
     * Renderizza la lista dei documenti
     */
    function renderDocumentsList(documents) {
        return documents.map(doc => `
            <div class="document-item" style="padding: 8px; border-bottom: 1px solid #eee;">
                <strong>${doc.type.toUpperCase()} ${doc.number || 'N/A'}</strong> - 
                ${doc.clientName || 'N/A'} - 
                ${doc.date || 'N/A'} - 
                €${parseFloat(doc.total || 0).toFixed(2)}
            </div>
        `).join('');
    }
    
    /**
     * Esegue la sincronizzazione
     */
    function performSync() {
        const tempDocumentsStr = sessionStorage.getItem('tempDocuments');
        if (!tempDocumentsStr) {
            alert('Nessun documento temporaneo trovato');
            return;
        }
        
        try {
            const tempDocuments = JSON.parse(tempDocumentsStr);
            const savedDocuments = JSON.parse(localStorage.getItem('ddtftDocuments') || '[]');
            
            // Unisci i documenti
            const allDocuments = [...savedDocuments, ...tempDocuments];
            
            // Salva nel localStorage
            localStorage.setItem('ddtftDocuments', JSON.stringify(allDocuments));
            
            // Pulisci sessionStorage
            sessionStorage.removeItem('tempDocuments');
            
            // Chiudi dialog
            closeSyncDialog();
            
            // Mostra messaggio di successo
            alert(`✅ Sincronizzazione completata!\n\nDocumenti aggiunti: ${tempDocuments.length}\nTotale documenti salvati: ${allDocuments.length}`);
            
            // Ricarica la pagina per aggiornare la vista
            if (typeof DDTFTModule !== 'undefined' && DDTFTModule.loadDocumentsFromStorage) {
                DDTFTModule.loadDocumentsFromStorage();
                DDTFTModule.render();
            } else {
                location.reload();
            }
            
        } catch (error) {
            console.error('Errore durante la sincronizzazione:', error);
            alert('Errore durante la sincronizzazione: ' + error.message);
        }
    }
    
    /**
     * Sostituisce tutti i documenti
     */
    function replaceAll() {
        if (!confirm('Sei sicuro di voler SOSTITUIRE tutti i documenti salvati con quelli temporanei?\n\nQuesta azione cancellerà tutti i documenti attualmente salvati.')) {
            return;
        }
        
        const tempDocumentsStr = sessionStorage.getItem('tempDocuments');
        if (!tempDocumentsStr) {
            alert('Nessun documento temporaneo trovato');
            return;
        }
        
        try {
            const tempDocuments = JSON.parse(tempDocumentsStr);
            
            // Sostituisci completamente
            localStorage.setItem('ddtftDocuments', JSON.stringify(tempDocuments));
            
            // Pulisci sessionStorage
            sessionStorage.removeItem('tempDocuments');
            
            // Chiudi dialog
            closeSyncDialog();
            
            // Mostra messaggio
            alert(`✅ Sostituzione completata!\n\nDocumenti salvati: ${tempDocuments.length}`);
            
            // Ricarica
            if (typeof DDTFTModule !== 'undefined' && DDTFTModule.loadDocumentsFromStorage) {
                DDTFTModule.loadDocumentsFromStorage();
                DDTFTModule.render();
            } else {
                location.reload();
            }
            
        } catch (error) {
            console.error('Errore durante la sostituzione:', error);
            alert('Errore durante la sostituzione: ' + error.message);
        }
    }
    
    /**
     * Chiude il dialog di sincronizzazione
     */
    function closeSyncDialog() {
        const modal = document.getElementById('syncModal');
        if (modal) {
            modal.remove();
        }
    }
    
    /**
     * Visualizza il contenuto DDT-FT salvato
     */
    function viewDDTFTContent() {
        const savedDocuments = JSON.parse(localStorage.getItem('ddtftDocuments') || '[]');
        
        if (savedDocuments.length === 0) {
            alert('Nessun documento DDT/FT salvato.\n\nImporta e sincronizza prima alcuni documenti.');
            return;
        }
        
        // Calcola statistiche
        const stats = calculateStats(savedDocuments);
        
        // Crea modal
        const modal = createViewModal(savedDocuments, stats);
        document.body.appendChild(modal);
    }
    
    /**
     * Calcola statistiche sui documenti
     */
    function calculateStats(documents) {
        const stats = {
            total: documents.length,
            ddt: documents.filter(d => d.type === 'ddt').length,
            ft: documents.filter(d => d.type === 'ft').length,
            totalAmount: 0,
            clients: new Set(),
            dateRange: { min: null, max: null }
        };
        
        documents.forEach(doc => {
            // Totale
            stats.totalAmount += parseFloat(doc.total || 0);
            
            // Clienti unici
            if (doc.clientName) {
                stats.clients.add(doc.clientName);
            }
            
            // Range date
            if (doc.date) {
                if (!stats.dateRange.min || doc.date < stats.dateRange.min) {
                    stats.dateRange.min = doc.date;
                }
                if (!stats.dateRange.max || doc.date > stats.dateRange.max) {
                    stats.dateRange.max = doc.date;
                }
            }
        });
        
        return stats;
    }
    
    /**
     * Crea modal per visualizzare contenuto
     */
    function createViewModal(documents, stats) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'viewModal';
        
        // Ordina documenti per data (più recenti prima)
        const sortedDocs = [...documents].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3>📋 Contenuto File DDT-FT</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="content-summary" style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                        <h4>Riepilogo:</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <div>Documenti totali: <strong>${stats.total}</strong></div>
                            <div>DDT: <strong>${stats.ddt}</strong> | Fatture: <strong>${stats.ft}</strong></div>
                            <div>Clienti diversi: <strong>${stats.clients.size}</strong></div>
                            <div>Importo totale: <strong>€${stats.totalAmount.toFixed(2)}</strong></div>
                            ${stats.dateRange.min ? `
                                <div style="grid-column: span 2;">
                                    Periodo: <strong>${stats.dateRange.min} - ${stats.dateRange.max}</strong>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="content-list">
                        <h4>Ultimi 20 documenti:</h4>
                        <div style="max-height: 400px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 5px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="position: sticky; top: 0; background: #f8f9fa;">
                                    <tr>
                                        <th style="padding: 8px; border-bottom: 2px solid #dee2e6; text-align: left;">Tipo</th>
                                        <th style="padding: 8px; border-bottom: 2px solid #dee2e6; text-align: left;">Numero</th>
                                        <th style="padding: 8px; border-bottom: 2px solid #dee2e6; text-align: left;">Data</th>
                                        <th style="padding: 8px; border-bottom: 2px solid #dee2e6; text-align: left;">Cliente</th>
                                        <th style="padding: 8px; border-bottom: 2px solid #dee2e6; text-align: right;">Importo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sortedDocs.slice(0, 20).map(doc => `
                                        <tr>
                                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
                                                <span class="doc-type-badge ${doc.type}" style="padding: 2px 8px; border-radius: 3px; font-size: 12px; background: ${doc.type === 'ddt' ? '#28a745' : '#007bff'}; color: white;">
                                                    ${doc.type.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${doc.number || 'N/A'}</td>
                                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${doc.date || 'N/A'}</td>
                                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${doc.clientName || 'N/A'}</td>
                                            <td style="padding: 8px; border-bottom: 1px solid #dee2e6; text-align: right;">
                                                €${parseFloat(doc.total || 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${documents.length > 20 ? `
                                <div style="padding: 10px; text-align: center; color: #666;">
                                    ...e altri ${documents.length - 20} documenti
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; text-align: right;">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Chiudi
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }
    
    // Esporta le funzioni pubbliche
    return {
        showSyncDialog,
        performSync,
        replaceAll,
        closeSyncDialog,
        viewDDTFTContent
    };
})();

console.log('✅ DDTFT Sync Manager caricato');