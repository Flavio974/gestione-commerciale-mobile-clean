/**
 * Modulo per aggiungere dati a un file Excel esistente invece di sovrascriverlo
 * NON tocca il codice di export funzionante
 */

(function() {
    'use strict';
    
    console.log('📊 Inizializzazione Export Append...');
    
    // Variabile per memorizzare i dati esistenti
    let existingData = [];
    
    // Aggiungi metodo al modulo esistente
    if (window.DDTFTModule) {
        
        // Nuovo metodo per export con append
        window.DDTFTModule.exportWithAppend = function() {
            // I documenti sono già stati corretti in exportDocumentsToExcel
            const documentsToExport = this.state.documents;
            
            if (!documentsToExport || documentsToExport.length === 0) {
                alert('Nessun documento da esportare');
                return;
            }
            
            console.log(`📊 Export con append di ${documentsToExport.length} documenti`);
            
            // Correggi le descrizioni prima di mostrare il dialog
            let fixedDocuments = JSON.parse(JSON.stringify(documentsToExport));
            
            fixedDocuments.forEach((doc) => {
                if (doc.items && Array.isArray(doc.items)) {
                    doc.items.forEach((item) => {
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
                                        found = true;
                                        break;
                                    }
                                }
                            }
                            
                            // Ultimo fallback
                            if (!found) {
                                item.description = `Articolo ${item.code || 'SCONOSCIUTO'}`;
                            }
                        }
                        
                        // Assicurati che sia sempre una stringa
                        item.description = String(item.description);
                    });
                }
            });
            
            // Mostra dialog per scegliere se caricare file esistente
            showAppendDialog(fixedDocuments);
        };
    }
    
    // Mostra dialog per gestire l'append
    function showAppendDialog(documents) {
        // Rimuovi dialog esistenti
        const existingDialog = document.querySelector('.append-dialog-overlay');
        if (existingDialog) existingDialog.remove();
        
        const dialog = document.createElement('div');
        dialog.className = 'append-dialog-overlay';
        dialog.innerHTML = `
            <style>
                .append-dialog-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }
                .append-dialog {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                }
                .append-dialog h3 {
                    margin-top: 0;
                    color: #333;
                }
                .append-dialog-buttons {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                }
                .append-dialog button {
                    flex: 1;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                }
                .btn-load-existing {
                    background: #28a745;
                    color: white;
                }
                .btn-new-file {
                    background: #007bff;
                    color: white;
                }
                .btn-cancel {
                    background: #6c757d;
                    color: white;
                }
                .file-input-wrapper {
                    margin: 20px 0;
                    padding: 20px;
                    border: 2px dashed #ccc;
                    border-radius: 5px;
                    text-align: center;
                    display: none;
                }
                .file-input-wrapper.active {
                    display: block;
                }
                #existingFileInput {
                    display: none;
                }
                .file-info {
                    margin-top: 10px;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 5px;
                    display: none;
                }
            </style>
            
            <div class="append-dialog">
                <h3>Come vuoi esportare i dati?</h3>
                <p>Hai ${documents.length} documenti con ${countTotalRows(documents)} righe da esportare.</p>
                
                <div class="file-input-wrapper" id="fileInputWrapper">
                    <p>Seleziona il file Excel esistente a cui aggiungere i dati:</p>
                    <input type="file" id="existingFileInput" accept=".xlsx">
                    <button onclick="document.getElementById('existingFileInput').click()" 
                            style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        📁 Scegli file Excel
                    </button>
                    <div id="fileInfo" class="file-info"></div>
                </div>
                
                <div class="append-dialog-buttons">
                    <button class="btn-load-existing" id="btnLoadExisting">
                        📂 Aggiungi a file esistente
                    </button>
                    <button class="btn-new-file" id="btnNewFile">
                        📄 Crea nuovo file
                    </button>
                    <button class="btn-cancel" onclick="this.closest('.append-dialog-overlay').remove()">
                        ❌ Annulla
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Event listeners
        const btnLoadExisting = dialog.querySelector('#btnLoadExisting');
        const btnNewFile = dialog.querySelector('#btnNewFile');
        const fileInput = dialog.querySelector('#existingFileInput');
        const fileInputWrapper = dialog.querySelector('#fileInputWrapper');
        
        btnLoadExisting.addEventListener('click', function() {
            fileInputWrapper.classList.add('active');
            this.style.display = 'none';
            btnNewFile.style.display = 'none';
        });
        
        btnNewFile.addEventListener('click', function() {
            // Export nuovo file
            exportNewFile(documents);
            dialog.remove();
        });
        
        fileInput.addEventListener('change', function(e) {
            if (e.target.files[0]) {
                handleExistingFile(e.target.files[0], documents);
            }
        });
    }
    
    // Conta righe totali
    function countTotalRows(documents) {
        let total = 0;
        documents.forEach(doc => {
            if (doc.items && doc.items.length > 0) {
                total += doc.items.length;
            }
        });
        return total;
    }
    
    // Gestisce il file esistente
    function handleExistingFile(file, newDocuments) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // Leggi i dati esistenti (salta header)
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                existingData = jsonData.slice(1); // Rimuovi header
                
                console.log(`File esistente caricato: ${existingData.length} righe trovate`);
                
                // Mostra info
                const fileInfo = document.getElementById('fileInfo');
                fileInfo.style.display = 'block';
                fileInfo.innerHTML = `
                    <strong>✅ File caricato:</strong> ${file.name}<br>
                    <strong>Righe esistenti:</strong> ${existingData.length}<br>
                    <strong>Nuove righe da aggiungere:</strong> ${countTotalRows(newDocuments)}
                `;
                
                // Aggiungi pulsante per procedere
                setTimeout(() => {
                    const dialog = document.querySelector('.append-dialog');
                    const buttons = dialog.querySelector('.append-dialog-buttons');
                    buttons.innerHTML = `
                        <button onclick="window.proceedWithAppend()" 
                                style="flex: 1; padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            ✅ Procedi con l'aggiunta
                        </button>
                        <button onclick="this.closest('.append-dialog-overlay').remove()" 
                                style="flex: 1; padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            ❌ Annulla
                        </button>
                    `;
                }, 100);
                
                // Salva i documenti e IL FILE per l'uso successivo
                window.tempNewDocuments = newDocuments;
                window.tempExistingFile = file; // IMPORTANTE: salva anche il file
                console.log('Documenti salvati per append:', window.tempNewDocuments);
                console.log('File esistente salvato:', window.tempExistingFile);
                
            } catch (error) {
                console.error('Errore lettura file:', error);
                alert('Errore nella lettura del file Excel. Assicurati che sia un file valido.');
            }
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    // Procedi con l'append
    window.proceedWithAppend = function() {
        if (!window.tempNewDocuments) return;
        
        console.log('Aggiunta dati al file esistente...');
        console.log('Documenti da aggiungere:', window.tempNewDocuments);
        
        // Chiudi il dialog corrente
        const dialog = document.querySelector('.append-dialog-overlay');
        if (dialog) dialog.remove();
        
        // Usa il modulo DDTFTAppendToExcel per il controllo duplicati
        if (window.DDTFTAppendToExcel && window.DDTFTAppendToExcel.analyzeAndCompare && window.tempExistingFile) {
            // Usa analyzeAndCompare per avere il controllo dei duplicati
            window.DDTFTAppendToExcel.analyzeAndCompare(
                window.tempExistingFile,  // Usa il file salvato
                window.tempNewDocuments, 
                function(result) {
                    if (result && result.error) {
                        alert(`❌ Errore durante l'analisi:\n${result.error}`);
                    }
                    // La funzione analyzeAndCompare mostra automaticamente il dialog dei risultati
                    
                    // Pulisci
                    window.tempNewDocuments = null;
                    window.tempExistingFile = null;
                    existingData = [];
                }
            );
        } else {
            // Fallback al metodo originale senza controllo duplicati
            console.warn('Modulo DDTFTAppendToExcel non disponibile, uso metodo senza controllo duplicati');
            
            if (window.DDTFTExportExcel && window.DDTFTExportExcel.prepareWorksheetData) {
                const newData = window.DDTFTExportExcel.prepareWorksheetData(window.tempNewDocuments);
                const newRows = newData.slice(1); // Rimuovi header
                
                // Combina dati esistenti + nuovi
                const allData = [...existingData, ...newRows];
                
                console.log(`Totale righe nel file: ${allData.length} (${existingData.length} esistenti + ${newRows.length} nuove)`);
                
                // Genera nome file con timestamp
                const now = new Date();
                const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const filename = `DDT-FT_aggiornato_${timestamp}.xlsx`;
                
                // Crea nuovo workbook con tutti i dati
                createAndDownloadExcel(allData, filename);
            }
            
            // Pulisci
            window.tempNewDocuments = null;
            window.tempExistingFile = null;
            existingData = [];
        }
    };
    
    // Export nuovo file
    function exportNewFile(documents) {
        console.log('📄 Creazione nuovo file Excel con', documents.length, 'documenti');
        if (window.DDTFTExportExcel && window.DDTFTExportExcel.exportToExcel) {
            window.DDTFTExportExcel.exportToExcel(documents);
        } else {
            console.error('Modulo DDTFTExportExcel non disponibile');
            alert('Errore: modulo di export non disponibile.');
        }
    }
    
    // Crea e scarica Excel con tutti i dati
    function createAndDownloadExcel(allRows, filename) {
        // Headers corretti (16 colonne)
        const headers = [
            'Numero Ordine',
            'Data Ordine',
            'Tipo Documento',
            'Numero documento',
            'Data Documento',
            'Codice Cliente',
            'Descrizione Cliente',
            'Indirizzo di Consegna',
            'P.Iva',
            'Codice Prodotto',
            'Descrizione Prodotto',
            'Pezzi',
            'Prezzo Unitario',
            'Sconto (%)',
            'S.M.',
            'Importo'
        ];
        
        // Crea worksheet con headers + dati
        const wsData = [headers, ...allRows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Imposta larghezza colonne
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
        
        // Crea workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DDT-FT');
        
        // Scarica file
        XLSX.writeFile(wb, filename);
        
        alert(`File ${filename} creato con successo!\n\nRighe totali: ${allRows.length}`);
    }
    
    // Modifica il pulsante "Esporta con Confronto" per usare questa funzione
    setTimeout(() => {
        const compareBtn = document.getElementById('exportDocumentsCompareBtn');
        if (compareBtn) {
            compareBtn.onclick = function(e) {
                e.preventDefault();
                console.log('📊 Export con Append');
                if (window.DDTFTModule && window.DDTFTModule.exportWithAppend) {
                    window.DDTFTModule.exportWithAppend();
                }
            };
            compareBtn.innerHTML = '<i class="fas fa-file-excel"></i> Aggiungi a Excel esistente';
            compareBtn.title = 'Aggiungi i dati a un file Excel esistente o crea un nuovo file';
        }
    }, 1000);
    
})();