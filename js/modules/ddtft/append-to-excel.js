/**
 * Modulo per aggiungere dati a un file Excel esistente
 * Mantiene tutti i dati esistenti e aggiunge i nuovi alla fine
 */

window.DDTFTAppendToExcel = (function() {
    'use strict';
    
    /**
     * Analizza il file Excel e confronta con i nuovi dati
     * @param {File} existingFile - Il file Excel esistente
     * @param {Array} newDocuments - I nuovi documenti da aggiungere
     * @param {Function} callback - Callback con il risultato dell'analisi
     */
    async function analyzeAndCompare(existingFile, newDocuments, callback) {
        console.log('📊 Analisi file Excel e confronto dati...');
        
        try {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array', cellDates: true});
                    
                    // Prendi il primo foglio
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Converti in JSON per analisi
                    const existingData = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ''});
                    
                    // Rimuovi header se presente
                    let dataRows = existingData;
                    if (dataRows.length > 0 && dataRows[0][0] === 'Numero Ordine') {
                        dataRows = dataRows.slice(1);
                    }
                    
                    // Prepara i nuovi dati
                    const newData = window.DDTFTExportExcel.prepareWorksheetData(newDocuments);
                    const newRows = newData.slice(1); // Rimuovi header
                    
                    // Debug: mostra struttura dati
                    console.log('🔍 Analisi duplicati:');
                    console.log('Numero righe esistenti:', dataRows.length);
                    console.log('Numero nuove righe:', newRows.length);
                    
                    // Mostra headers per capire la struttura
                    if (existingData.length > 0 && existingData[0][0] === 'Numero Ordine') {
                        console.log('Headers file esistente:', existingData[0]);
                    }
                    
                    if (dataRows.length > 0) {
                        console.log('Prima riga esistente completa:', dataRows[0]);
                        console.log('Valori colonne esistenti:');
                        dataRows[0].forEach((val, idx) => {
                            if (idx < 16) console.log(`  [${idx}]: "${val}"`);
                        });
                    }
                    
                    if (newRows.length > 0) {
                        console.log('Prima nuova riga completa:', newRows[0]);
                        console.log('Valori colonne nuove:');
                        newRows[0].forEach((val, idx) => {
                            if (idx < 16) console.log(`  [${idx}]: "${val}"`);
                        });
                    }
                    
                    // Crea set di chiavi univoche esistenti
                    const existingKeys = new Set();
                    dataRows.forEach((row, index) => {
                        if (row && row.length >= 11) {
                            // Chiave: NumeroOrdine_CodiceProdotto O NumeroDocumento_CodiceProdotto
                            // Per fatture (row[0] vuoto), usa il numero documento (row[3])
                            const key = `${row[0] || row[3]}_${row[9]}`;
                            existingKeys.add(key);
                            
                            // Debug prime 5 righe
                            if (index < 5) {
                                console.log(`Riga esistente ${index + 1}: chiave="${key}"`);
                            }
                        }
                    });
                    
                    console.log('Totale chiavi esistenti:', existingKeys.size);
                    
                    // Trova duplicati e righe univoche
                    const duplicates = [];
                    const uniqueRows = [];
                    
                    newRows.forEach((row, index) => {
                        // Usa NumeroOrdine se presente, altrimenti NumeroDocumento
                        const key = `${row[0] || row[3]}_${row[9]}`; // NumeroOrdine_CodiceProdotto o NumeroDocumento_CodiceProdotto
                        
                        // Debug prime righe
                        if (index < 5) {
                            console.log(`Nuova riga ${index + 1}: chiave="${key}", è duplicato=${existingKeys.has(key)}`);
                        }
                        
                        if (existingKeys.has(key)) {
                            duplicates.push({
                                orderNumber: row[0],
                                documentType: row[2],
                                documentNumber: row[3],
                                client: row[6],
                                productCode: row[9],
                                product: row[10],
                                quantity: row[11],
                                amount: row[15],
                                row: row
                            });
                        } else {
                            uniqueRows.push(row);
                        }
                    });
                    
                    console.log('Risultato analisi:', {
                        duplicati: duplicates.length,
                        univoci: uniqueRows.length
                    });
                    
                    // Mostra dialog con risultati
                    showComparisonResults({
                        existingFile: existingFile,
                        existingRowsCount: dataRows.length,
                        newRowsCount: newRows.length,
                        duplicatesCount: duplicates.length,
                        uniqueRowsCount: uniqueRows.length,
                        duplicates: duplicates,
                        uniqueRows: uniqueRows,
                        allNewRows: newRows,
                        workbook: workbook,
                        worksheet: worksheet,
                        lastRow: dataRows.length
                    });
                    
                } catch (error) {
                    console.error('Errore durante l\'analisi:', error);
                    if (callback) {
                        callback({
                            success: false,
                            error: error.message
                        });
                    }
                }
            };
            
            reader.onerror = function(error) {
                console.error('Errore lettura file:', error);
                if (callback) {
                    callback({
                        success: false,
                        error: 'Errore nella lettura del file'
                    });
                }
            };
            
            reader.readAsArrayBuffer(existingFile);
            
        } catch (error) {
            console.error('Errore generale:', error);
            if (callback) {
                callback({
                    success: false,
                    error: error.message
                });
            }
        }
    }
    
    /**
     * Mostra i risultati del confronto
     */
    function showComparisonResults(data) {
        // Chiudi eventuali modal esistenti
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content comparison-results" style="max-width: 900px;">
                <div class="modal-header">
                    <h3>Analisi del file Excel</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="analysis-summary">
                        <div class="summary-grid">
                            <div class="summary-card">
                                <h4>File esistente</h4>
                                <p class="summary-number">${data.existingRowsCount}</p>
                                <p class="summary-label">righe totali</p>
                            </div>
                            <div class="summary-card">
                                <h4>Nuovi dati</h4>
                                <p class="summary-number">${data.newRowsCount}</p>
                                <p class="summary-label">righe da aggiungere</p>
                            </div>
                            <div class="summary-card ${data.duplicatesCount > 0 ? 'warning' : 'success'}">
                                <h4>Duplicati trovati</h4>
                                <p class="summary-number">${data.duplicatesCount}</p>
                                <p class="summary-label">righe già presenti</p>
                            </div>
                            <div class="summary-card success">
                                <h4>Righe univoche</h4>
                                <p class="summary-number">${data.uniqueRowsCount}</p>
                                <p class="summary-label">nuove righe</p>
                            </div>
                        </div>
                    </div>
                    
                    ${data.duplicatesCount > 0 ? `
                        <div class="duplicates-section">
                            <h4>⚠️ Attenzione: Trovati ${data.duplicatesCount} duplicati</h4>
                            <p>I seguenti articoli sono già presenti nel file:</p>
                            <div class="duplicates-table-wrapper">
                                <table class="duplicates-table">
                                    <thead>
                                        <tr>
                                            <th>Ordine</th>
                                            <th>Tipo</th>
                                            <th>Documento</th>
                                            <th>Cliente</th>
                                            <th>Cod.Prodotto</th>
                                            <th>Prodotto</th>
                                            <th>Q.tà</th>
                                            <th>Importo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${data.duplicates.slice(0, 10).map(dup => `
                                            <tr>
                                                <td>${dup.orderNumber}</td>
                                                <td>${dup.documentType}</td>
                                                <td>${dup.documentNumber}</td>
                                                <td>${dup.client}</td>
                                                <td>${dup.productCode}</td>
                                                <td>${dup.product}</td>
                                                <td>${dup.quantity}</td>
                                                <td>€${parseFloat(dup.amount || 0).toFixed(2)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                                ${data.duplicatesCount > 10 ? `<p class="more-items">... e altri ${data.duplicatesCount - 10} duplicati</p>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="action-section">
                        <h4>Cosa vuoi fare?</h4>
                        <div class="action-buttons">
                            ${data.uniqueRowsCount > 0 ? `
                                <button class="btn btn-success" id="addUniqueOnly">
                                    <i class="fas fa-check-circle"></i>
                                    Aggiungi solo righe univoche (${data.uniqueRowsCount})
                                </button>
                            ` : ''}
                            
                            <button class="btn btn-primary" id="addAll">
                                <i class="fas fa-plus-circle"></i>
                                Aggiungi tutto comunque (${data.newRowsCount})
                            </button>
                            
                            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                                <i class="fas fa-times"></i>
                                Annulla
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        if (data.uniqueRowsCount > 0) {
            document.getElementById('addUniqueOnly').addEventListener('click', function() {
                appendRowsToWorkbook(data.workbook, data.worksheet, data.uniqueRows, data.lastRow);
                modal.remove();
            });
        }
        
        document.getElementById('addAll').addEventListener('click', function() {
            appendRowsToWorkbook(data.workbook, data.worksheet, data.allNewRows, data.lastRow);
            modal.remove();
        });
    }
    
    /**
     * Aggiunge le righe al workbook e salva
     */
    function appendRowsToWorkbook(workbook, worksheet, rowsToAdd, startRow) {
        console.log(`📝 Aggiunta di ${rowsToAdd.length} righe al file...`);
        console.log(`📝 startRow iniziale: ${startRow}`);
        
        // Trova l'ultima riga reale con dati
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        console.log(`📝 Range del worksheet: ${worksheet['!ref']} (righe: 0-${range.e.r}, colonne: 0-${range.e.c})`);
        
        let lastRowWithData = 0;
        
        // Parti dall'ultima riga del range e vai indietro fino a trovare dati
        for (let row = range.e.r; row >= 0; row--) {
            let hasData = false;
            for (let col = 0; col <= Math.min(range.e.c, 15); col++) { // Controlla solo le prime 16 colonne
                const cellAddress = XLSX.utils.encode_cell({r: row, c: col});
                const cell = worksheet[cellAddress];
                if (cell && cell.v !== '' && cell.v !== null && cell.v !== undefined) {
                    hasData = true;
                    break;
                }
            }
            if (hasData) {
                lastRowWithData = row;
                console.log(`📝 Ultima riga con dati trovata: ${row + 1} (indice ${row})`);
                break;
            }
        }
        
        // Aggiunge le righe al worksheet partendo dalla riga successiva all'ultima con dati
        let currentRow = lastRowWithData + 1;
        
        rowsToAdd.forEach((row, index) => {
            row.forEach((cellValue, colIndex) => {
                const cellAddress = XLSX.utils.encode_cell({r: currentRow, c: colIndex});
                
                // Determina il tipo di cella
                let cellType = 'n';
                let value = cellValue;
                
                // Colonne che devono essere testo
                const textColumns = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                
                if (textColumns.includes(colIndex)) {
                    cellType = 's';
                    value = String(cellValue || '');
                } else if (typeof cellValue === 'number') {
                    cellType = 'n';
                    value = cellValue;
                } else {
                    cellType = 's';
                    value = String(cellValue || '');
                }
                
                worksheet[cellAddress] = {
                    t: cellType,
                    v: value,
                    w: String(value)
                };
                
                // Formattazione numerica
                if (colIndex === 12 || colIndex === 15) {
                    worksheet[cellAddress].z = '#,##0.00';
                } else if (colIndex === 13) {
                    worksheet[cellAddress].z = '0%';
                }
            });
            
            currentRow++;
        });
        
        // Aggiorna il range
        const maxCol = rowsToAdd[0] ? rowsToAdd[0].length - 1 : 15;
        worksheet['!ref'] = XLSX.utils.encode_range({
            s: {r: 0, c: 0},
            e: {r: currentRow - 1, c: maxCol}
        });
        
        // Salva il file
        XLSX.writeFile(workbook, 'DDT-FT.xlsx');
        
        const totalDataRows = currentRow - 1; // -1 perché currentRow punta alla prossima riga vuota
        console.log(`📝 File salvato. Totale righe con dati: ${totalDataRows} (escluso header)`);
        
        alert(`✅ File aggiornato con successo!\n\nRighe aggiunte: ${rowsToAdd.length}\nPrima nuova riga: ${lastRowWithData + 2}\nTotale righe nel file: ${totalDataRows}`);
    }
    
    /**
     * Aggiunge dati a un file Excel esistente (vecchia funzione per compatibilità)
     */
    async function appendToExistingFile(existingFile, newDocuments, callback) {
        // Usa la nuova funzione di analisi
        analyzeAndCompare(existingFile, newDocuments, callback);
    }
    
    /**
     * Mostra dialog per selezionare file Excel esistente
     */
    function showAppendDialog(documents) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Aggiungi a file Excel esistente</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p>Seleziona il file DDT-FT.xlsx esistente a cui aggiungere i nuovi dati:</p>
                    <input type="file" id="existingExcelFile" accept=".xlsx,.xls" style="margin: 20px 0;">
                    <div id="appendResult" style="margin-top: 20px;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="proceedAppend">Procedi</button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annulla</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listener per il pulsante
        document.getElementById('proceedAppend').addEventListener('click', function() {
            const fileInput = document.getElementById('existingExcelFile');
            const file = fileInput.files[0];
            
            if (!file) {
                alert('Seleziona un file Excel');
                return;
            }
            
            // Disabilita il pulsante durante l'elaborazione
            this.disabled = true;
            this.textContent = 'Elaborazione...';
            
            appendToExistingFile(file, documents, function(result) {
                const resultDiv = document.getElementById('appendResult');
                
                if (result.success) {
                    resultDiv.innerHTML = `
                        <div class="alert alert-success">
                            <strong>✅ File aggiornato con successo!</strong><br>
                            Righe aggiunte: ${result.rowsAdded}<br>
                            Prima nuova riga: ${result.firstNewRow}<br>
                            Totale righe nel file: ${result.totalRows}
                        </div>
                    `;
                    
                    setTimeout(() => {
                        modal.remove();
                    }, 3000);
                } else {
                    resultDiv.innerHTML = `
                        <div class="alert alert-danger">
                            <strong>❌ Errore:</strong> ${result.error}
                        </div>
                    `;
                    
                    // Riabilita il pulsante
                    const btn = document.getElementById('proceedAppend');
                    btn.disabled = false;
                    btn.textContent = 'Procedi';
                }
            });
        });
    }
    
    // Stili CSS
    const comparisonResultsStyle = document.createElement('style');
    comparisonResultsStyle.textContent = `
        .comparison-results .modal-body {
            padding: 0;
        }
        
        .analysis-summary {
            background: #f8f9fa;
            padding: 20px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .summary-card h4 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #6c757d;
            font-weight: normal;
        }
        
        .summary-number {
            font-size: 32px;
            font-weight: bold;
            margin: 0;
            color: #333;
        }
        
        .summary-label {
            margin: 5px 0 0 0;
            font-size: 12px;
            color: #6c757d;
        }
        
        .summary-card.warning {
            border: 2px solid #ffc107;
        }
        
        .summary-card.warning .summary-number {
            color: #ff6b00;
        }
        
        .summary-card.success {
            border: 2px solid #28a745;
        }
        
        .summary-card.success .summary-number {
            color: #28a745;
        }
        
        .duplicates-section {
            padding: 20px;
            background: #fff8e1;
            border-bottom: 1px solid #dee2e6;
        }
        
        .duplicates-section h4 {
            margin: 0 0 10px 0;
            color: #ff6b00;
        }
        
        .duplicates-table-wrapper {
            max-height: 300px;
            overflow-y: auto;
            margin-top: 15px;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            background: white;
        }
        
        .duplicates-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .duplicates-table th {
            background: #f8f9fa;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #dee2e6;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        .duplicates-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .duplicates-table tr:hover {
            background: #f8f9fa;
        }
        
        .more-items {
            margin: 10px 0 0 0;
            font-style: italic;
            color: #6c757d;
        }
        
        .action-section {
            padding: 20px;
        }
        
        .action-section h4 {
            margin: 0 0 15px 0;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .action-buttons .btn {
            flex: 1;
            min-width: 200px;
            padding: 12px 20px;
            font-size: 16px;
        }
        
        .btn i {
            margin-right: 8px;
        }
        
        .alert {
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
        }
        
        .alert-success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-danger {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    `;
    document.head.appendChild(comparisonResultsStyle);
    
    return {
        appendToExistingFile,
        showAppendDialog,
        analyzeAndCompare
    };
})();

console.log('✅ DDTFTAppendToExcel caricato con successo');