/**
 * Modulo Export Avanzato per DDT-FT
 * Sistema di esportazione con confronto e gestione duplicati
 */

window.DDTFTExportAdvanced = (function() {
    'use strict';
    
    // Variabile temporanea per memorizzare i documenti
    let _tempDocuments = null;
    
    /**
     * Mostra il dialog principale di esportazione
     */
    function showExportDialog(documents) {
        if (!documents || documents.length === 0) {
            alert('Nessun documento da esportare');
            return;
        }
        
        // Conta righe esistenti in memoria
        const existingCount = getStoredRowsCount();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content export-dialog">
                <div class="modal-header">
                    <h3>Esporta DDT-FT in Excel</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="export-info">
                        <p><strong>Documenti da esportare:</strong> ${documents.length}</p>
                        <p><strong>Righe totali da esportare:</strong> ${countTotalRows(documents)}</p>
                        <p><strong>Righe già in memoria:</strong> ${existingCount}</p>
                    </div>
                    
                    <div class="export-options">
                        <button class="export-option-btn" data-action="update">
                            <i class="fas fa-file-excel"></i>
                            <div class="option-text">
                                <h4>Aggiorna file DDT-FT.xlsx</h4>
                                <p>File principale con storico completo</p>
                            </div>
                        </button>
                        
                        <button class="export-option-btn" data-action="new">
                            <i class="fas fa-file-plus"></i>
                            <div class="option-text">
                                <h4>Esporta in nuovo file</h4>
                                <p>Crea file con data odierna</p>
                            </div>
                        </button>
                        
                        <button class="export-option-btn warning" data-action="replace">
                            <i class="fas fa-sync-alt"></i>
                            <div class="option-text">
                                <h4>Sostituisci tutto</h4>
                                <p>Elimina dati esistenti e ricomincia</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Salva documenti temporaneamente
        _tempDocuments = documents;
        
        // Aggiungi event listeners
        modal.querySelectorAll('.export-option-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const action = this.getAttribute('data-action');
                switch(action) {
                    case 'update':
                        exportToDDTFT(_tempDocuments);
                        break;
                    case 'new':
                        exportToNewFile(_tempDocuments);
                        break;
                    case 'replace':
                        exportWithReplace(_tempDocuments);
                        break;
                }
            });
        });
    }
    
    /**
     * Conta il numero totale di righe (una per prodotto)
     */
    function countTotalRows(documents) {
        let totalRows = 0;
        documents.forEach(doc => {
            if (doc.items && doc.items.length > 0) {
                totalRows += doc.items.length;
            } else {
                totalRows += 1; // Documento senza prodotti = 1 riga
            }
        });
        return totalRows;
    }
    
    /**
     * Recupera il conteggio delle righe salvate
     */
    function getStoredRowsCount() {
        const storedData = localStorage.getItem('ddtftExportData');
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                return data.length;
            } catch (e) {
                return 0;
            }
        }
        return 0;
    }
    
    /**
     * Esporta aggiornando il file DDT-FT principale
     */
    function exportToDDTFT(documents) {
        // Chiudi il dialog principale
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
        
        // Mostra dialog per confronto
        showComparisonDialog(documents);
    }
    
    /**
     * Mostra dialog di confronto
     */
    function showComparisonDialog(documents) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content comparison-dialog">
                <div class="modal-header">
                    <h3>Confronto con file DDT-FT esistente</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p>Per un confronto accurato dei duplicati, puoi caricare il file DDT-FT.xlsx esistente.</p>
                    
                    <div class="comparison-options">
                        <div class="option-card">
                            <h4><i class="fas fa-plus-circle"></i> Aggiungi direttamente al file</h4>
                            <p>Aggiungi i nuovi dati alla fine del file Excel esistente</p>
                            <input type="file" id="ddtftFileInput" accept=".xlsx" style="display:none">
                            <button class="btn btn-success" onclick="document.getElementById('ddtftFileInput').click()">
                                Seleziona file e aggiungi
                            </button>
                        </div>
                        
                        <div class="option-card">
                            <h4><i class="fas fa-upload"></i> Confronta con file esistente</h4>
                            <p>Verifica duplicati prima di aggiungere</p>
                            <button class="btn btn-primary" id="compareWithFileBtn">
                                Confronta
                            </button>
                        </div>
                        
                        <div class="option-card">
                            <h4><i class="fas fa-memory"></i> Procedi senza confronto</h4>
                            <p>Usa solo la memoria del browser (${getStoredRowsCount()} righe)</p>
                            <button class="btn btn-secondary" id="proceedWithMemoryBtn">
                                Procedi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Aggiungi event listeners per comparison dialog
        const fileInput = modal.querySelector('#ddtftFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                if (e.target.files[0]) {
                    // Aggiungi direttamente al file
                    handleDirectAppend(documents);
                }
            });
        }
        
        const compareBtn = modal.querySelector('#compareWithFileBtn');
        if (compareBtn) {
            compareBtn.addEventListener('click', function() {
                // Apri un nuovo file input per il confronto
                const compareInput = document.createElement('input');
                compareInput.type = 'file';
                compareInput.accept = '.xlsx';
                compareInput.onchange = function(e) {
                    if (e.target.files[0]) {
                        handleFileUpload(e.target.files[0], documents);
                    }
                };
                compareInput.click();
            });
        }
        
        const proceedBtn = modal.querySelector('#proceedWithMemoryBtn');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', function() {
                proceedWithMemory(documents);
            });
        }
    }
    
    /**
     * Gestisce il caricamento del file per confronto
     */
    function handleFileUpload(file, documents) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ''});
                
                // Rimuovi header
                const fileData = jsonData.slice(1);
                
                // Confronta con i nuovi dati
                compareAndShowResults(fileData, documents, true);
                
            } catch (error) {
                console.error('Errore lettura file:', error);
                alert('Errore nella lettura del file Excel');
            }
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    /**
     * Procede con il confronto usando solo la memoria
     */
    function proceedWithMemory(documents) {
        const storedData = localStorage.getItem('ddtftExportData');
        const existingData = storedData ? JSON.parse(storedData) : [];
        
        compareAndShowResults(existingData, documents, false);
    }
    
    /**
     * Confronta i dati e mostra i risultati
     */
    function compareAndShowResults(existingData, documents, isRealFile) {
        // Prepara i nuovi dati per l'export
        const newData = window.DDTFTExportExcel.prepareWorksheetData(documents);
        const newRows = newData.slice(1); // Rimuovi header
        
        // Crea un set di chiavi univoche esistenti (NumeroOrdine_CodiceProdotto)
        const existingKeys = new Set();
        existingData.forEach(row => {
            if (row && row.length >= 7) {
                const key = `${row[0]}_${row[6]}`; // NumeroOrdine_CodiceProdotto
                existingKeys.add(key);
            }
        });
        
        // Trova duplicati e righe univoche
        const duplicates = [];
        const uniqueNewRows = [];
        
        newRows.forEach(row => {
            const key = `${row[0]}_${row[9]}`; // NumeroOrdine_CodiceProdotto (colonna 9 con 16 colonne)
            
            if (existingKeys.has(key)) {
                duplicates.push({
                    orderNumber: row[0],
                    date: row[1],
                    documentType: row[2],
                    documentNumber: row[3],
                    client: row[6],      // Descrizione Cliente alla colonna 6
                    productCode: row[9], // Codice Prodotto alla colonna 9
                    product: row[10],    // Descrizione Prodotto alla colonna 10
                    quantity: row[11],   // Pezzi alla colonna 11
                    amount: row[15]      // Importo alla colonna 15
                });
            } else {
                uniqueNewRows.push(row);
            }
        });
        
        // Mostra dialog dei risultati
        showResultsDialog(existingData, newRows, duplicates, uniqueNewRows, isRealFile);
    }
    
    /**
     * Mostra dialog con i risultati del confronto
     */
    function showResultsDialog(existingData, newRows, duplicates, uniqueNewRows, isRealFile) {
        // Chiudi dialog precedenti
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        
        // Calcola totali
        let duplicatesTotal = 0;
        duplicates.forEach(dup => {
            duplicatesTotal += parseFloat(dup.amount) || 0;
        });
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content results-dialog" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>Risultati del confronto</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="results-summary">
                        <div class="summary-card">
                            <h4>Riepilogo</h4>
                            <p><strong>Fonte dati:</strong> ${isRealFile ? 'File Excel reale' : 'Memoria browser'}</p>
                            <p><strong>Righe esistenti:</strong> ${existingData.length}</p>
                            <p><strong>Nuove righe:</strong> ${newRows.length}</p>
                            <p><strong>Duplicati trovati:</strong> ${duplicates.length}</p>
                            <p><strong>Righe univoche:</strong> ${uniqueNewRows.length}</p>
                            ${duplicates.length > 0 ? `<p><strong>Valore duplicati:</strong> €${duplicatesTotal.toFixed(2)}</p>` : ''}
                        </div>
                    </div>
                    
                    ${duplicates.length > 0 ? `
                        <div class="duplicates-section">
                            <h4>Duplicati trovati (${duplicates.length > 20 ? 'primi 20' : 'tutti'})</h4>
                            <div class="duplicates-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Ordine</th>
                                            <th>Data</th>
                                            <th>Cliente</th>
                                            <th>Cod.Prodotto</th>
                                            <th>Prodotto</th>
                                            <th>Q.tà</th>
                                            <th>Importo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${duplicates.slice(0, 20).map(dup => `
                                            <tr>
                                                <td>${dup.orderNumber}</td>
                                                <td>${dup.date}</td>
                                                <td>${dup.client}</td>
                                                <td>${dup.productCode}</td>
                                                <td>${dup.product}</td>
                                                <td>${dup.quantity}</td>
                                                <td>€${parseFloat(dup.amount).toFixed(2)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="export-actions">
                        <button class="btn btn-primary" data-export-action="unique">
                            <i class="fas fa-plus-circle"></i> Aggiungi solo righe univoche (${uniqueNewRows.length})
                        </button>
                        
                        <button class="btn btn-secondary" data-export-action="all">
                            <i class="fas fa-plus-square"></i> Aggiungi tutte le righe (${newRows.length})
                        </button>
                        
                        <button class="btn btn-warning" data-export-action="replace">
                            <i class="fas fa-sync-alt"></i> Sostituisci tutto
                        </button>
                        
                        <button class="btn btn-danger" data-export-action="clear">
                            <i class="fas fa-trash"></i> Cancella memoria
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Salva dati temporanei per export
        modal._exportData = {
            existingData: existingData,
            newRows: newRows,
            uniqueNewRows: uniqueNewRows
        };
        
        // Aggiungi event listeners
        modal.querySelectorAll('[data-export-action]').forEach(btn => {
            btn.addEventListener('click', function() {
                const action = this.getAttribute('data-export-action');
                const data = modal._exportData;
                
                switch(action) {
                    case 'unique':
                        exportWithOptions(data.existingData, data.uniqueNewRows, 'unique');
                        break;
                    case 'all':
                        exportWithOptions(data.existingData, data.newRows, 'all');
                        break;
                    case 'replace':
                        exportWithOptions([], data.newRows, 'replace');
                        break;
                    case 'clear':
                        clearMemory();
                        break;
                }
            });
        });
    }
    
    /**
     * Esporta con le opzioni selezionate
     */
    function exportWithOptions(existingData, newData, option) {
        let finalData = [];
        
        switch(option) {
            case 'unique':
                // Aggiungi solo righe univoche
                finalData = [...existingData, ...newData];
                break;
            case 'all':
                // Aggiungi tutte le righe
                finalData = [...existingData, ...newData];
                break;
            case 'replace':
                // Solo nuove righe
                finalData = newData;
                break;
        }
        
        // Salva in memoria per futuri confronti
        localStorage.setItem('ddtftExportData', JSON.stringify(finalData));
        
        // Prepara il workbook con header CORRETTI (16 colonne)
        const headers = [
            'Numero Ordine',
            'Data Ordine',
            'Tipo Documento',
            'Numero documento',      // minuscola come richiesto
            'Data Documento',
            'Codice Cliente',
            'Descrizione Cliente',   // "Descrizione" invece di "Nome"
            'Indirizzo di Consegna',
            'P.Iva',                // formato corretto
            'Codice Prodotto',
            'Descrizione Prodotto',  // "Descrizione" invece di "Prodotto"
            'Pezzi',                // "Pezzi" invece di "Quantità"
            'Prezzo Unitario',
            'Sconto (%)',           // con parentesi
            'S.M.',                  // abbreviato
            'Importo'
        ];
        
        // Formatta i dati se il formatter è disponibile
        let formattedData = finalData;
        if (window.DDTFTNumberFormatter) {
            formattedData = finalData.map(row => window.DDTFTNumberFormatter.formatRowData(row));
        }
        
        const wsData = [headers, ...formattedData];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Imposta larghezza colonne (16 colonne)
        ws['!cols'] = [
            {wch: 15}, // Numero Ordine
            {wch: 12}, // Data Ordine
            {wch: 12}, // Tipo Documento
            {wch: 15}, // Numero Documento
            {wch: 12}, // Data Documento
            {wch: 12}, // Codice Cliente
            {wch: 35}, // Descrizione Cliente
            {wch: 40}, // Indirizzo Consegna
            {wch: 15}, // P.Iva
            {wch: 15}, // Codice Prodotto
            {wch: 50}, // Descrizione Prodotto
            {wch: 10}, // Pezzi
            {wch: 15}, // Prezzo Unitario
            {wch: 10}, // Sconto %
            {wch: 12}, // S.M.
            {wch: 15}  // Importo
        ];
        
        // Crea workbook e esporta
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DDT-FT');
        XLSX.writeFile(wb, 'DDT-FT.xlsx');
        
        // Chiudi tutti i modal
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        
        // Mostra messaggio di successo
        alert(`File DDT-FT.xlsx esportato con successo!\n\nRighe totali: ${finalData.length}\nNuove righe aggiunte: ${newData.length}`);
    }
    
    /**
     * Esporta in un nuovo file con data
     */
    function exportToNewFile(documents) {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `DDT-FT_${dateStr}.xlsx`;
        
        // Usa il modulo di export esistente
        window.DDTFTExportExcel.exportToExcel(documents, filename);
        
        // Chiudi modal
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    }
    
    /**
     * Esporta sostituendo tutto
     */
    function exportWithReplace(documents) {
        if (!confirm('Sei sicuro di voler sostituire TUTTI i dati esistenti?\n\nQuesta azione cancellerà lo storico memorizzato.')) {
            return;
        }
        
        // Cancella memoria
        localStorage.removeItem('ddtftExportData');
        
        // Esporta normalmente
        exportWithOptions([], window.DDTFTExportExcel.prepareWorksheetData(documents).slice(1), 'replace');
        
        // Chiudi modal
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    }
    
    /**
     * Cancella la memoria dei dati esportati
     */
    function clearMemory() {
        if (confirm('Sei sicuro di voler cancellare la memoria dei dati esportati?\n\nQuesta azione non influenzerà i file Excel già creati.')) {
            localStorage.removeItem('ddtftExportData');
            alert('Memoria cancellata con successo');
            document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        }
    }
    
    // CSS per i dialog
    const exportDialogStyle = document.createElement('style');
    exportDialogStyle.textContent = `
        .export-dialog .export-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        
        .export-dialog .export-options {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .export-option-btn {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            border: 1px solid #dee2e6;
            background: white;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .export-option-btn:hover {
            background: #f8f9fa;
            border-color: #007bff;
        }
        
        .export-option-btn.warning:hover {
            border-color: #ffc107;
        }
        
        .export-option-btn i {
            font-size: 24px;
            color: #007bff;
        }
        
        .export-option-btn.warning i {
            color: #ffc107;
        }
        
        .option-text h4 {
            margin: 0 0 5px 0;
            color: #333;
        }
        
        .option-text p {
            margin: 0;
            color: #666;
            font-size: 14px;
        }
        
        .comparison-dialog .comparison-options {
            display: flex;
            gap: 20px;
            margin-top: 20px;
        }
        
        .option-card {
            flex: 1;
            padding: 20px;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            text-align: center;
        }
        
        .option-card h4 {
            margin: 0 0 10px 0;
            color: #333;
        }
        
        .option-card p {
            margin: 0 0 15px 0;
            color: #666;
        }
        
        .results-dialog .results-summary {
            margin-bottom: 20px;
        }
        
        .summary-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
        }
        
        .summary-card h4 {
            margin: 0 0 10px 0;
            color: #333;
        }
        
        .summary-card p {
            margin: 5px 0;
        }
        
        .duplicates-section {
            margin: 20px 0;
        }
        
        .duplicates-table {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #dee2e6;
            border-radius: 5px;
        }
        
        .duplicates-table table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .duplicates-table th,
        .duplicates-table td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        
        .duplicates-table th {
            background: #f8f9fa;
            font-weight: bold;
            position: sticky;
            top: 0;
        }
        
        .export-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        
        .export-actions .btn {
            flex: 1;
            min-width: 200px;
        }
    `;
    document.head.appendChild(exportDialogStyle);
    
    // Esporta le funzioni pubbliche
    return {
        showExportDialog,
        exportToDDTFT,
        exportToNewFile,
        exportWithReplace,
        handleFileUpload,
        proceedWithMemory,
        exportWithOptions,
        clearMemory,
        handleDirectAppend: handleDirectAppend
    };
    
    /**
     * Gestisce l'aggiunta diretta al file Excel esistente
     */
    function handleDirectAppend(documents) {
        const fileInput = document.getElementById('ddtftFileInput');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Seleziona un file Excel');
            return;
        }
        
        // Chiudi il modal corrente
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        
        // Usa il nuovo modulo per analizzare e confrontare
        if (window.DDTFTAppendToExcel) {
            // Usa analyzeAndCompare per avere il controllo dei duplicati
            window.DDTFTAppendToExcel.analyzeAndCompare(file, documents, function(result) {
                if (result && result.error) {
                    alert(`❌ Errore durante l'aggiornamento:\n${result.error}`);
                }
                // La funzione analyzeAndCompare mostra automaticamente il dialog dei risultati
            });
        } else {
            alert('Modulo di append non disponibile');
        }
    }
})();

console.log('✅ DDTFTExportAdvanced caricato con successo');