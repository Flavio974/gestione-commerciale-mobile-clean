/**
 * Modulo Import/Export per DDT-FT
 * Gestisce importazione ed esportazione file Excel, sincronizzazione dati
 */

window.DDTFTImportExport = (function() {
    'use strict';
    
    /**
     * Importa un file DDT-FT.xlsx esistente per sincronizzare il localStorage
     * @param {File} file - Il file Excel da importare
     * @returns {Promise<Array>} I dati importati
     */
    async function importDDTFTFile(file) {
        console.log('📥 Importazione file DDT-FT esistente...');
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    
                    // Leggi il primo foglio
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Converti in array di array
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                    
                    console.log(`Lette ${jsonData.length} righe dal file DDT-FT`);
                    
                    // Rimuovi header se presente
                    let dataRows = jsonData;
                    if (dataRows.length > 0 && dataRows[0][0] === 'Numero Ordine') {
                        dataRows = dataRows.slice(1);
                        console.log('Rimosso header, righe dati: ' + dataRows.length);
                    }
                    
                    resolve(dataRows);
                } catch (error) {
                    console.error('Errore nella lettura del file:', error);
                    reject(error);
                }
            };
            
            reader.onerror = function(error) {
                console.error('Errore nel caricamento file:', error);
                reject(error);
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Sincronizza il localStorage con i dati letti dal file DDT-FT esistente
     * @param {File} file - Il file Excel da sincronizzare
     * @returns {Promise<boolean>} True se la sincronizzazione è riuscita
     */
    async function syncWithExistingDDTFT(file) {
        try {
            // Mostra indicatore di caricamento
            const loadingModal = showLoadingModal('Sincronizzazione in corso...');
            
            // Importa i dati dal file
            const importedData = await importDDTFTFile(file);
            
            // Analizza i dati importati
            const stats = analyzeDDTFTData(importedData);
            
            // Salva nel localStorage
            localStorage.setItem('ddtftFileData', JSON.stringify(importedData));
            console.log(`✅ Sincronizzazione completata: ${importedData.length} righe salvate`);
            
            // Chiudi loading modal
            if (loadingModal) loadingModal.remove();
            
            // Mostra risultati
            showSyncResults(importedData.length, stats);
            
            return true;
        } catch (error) {
            console.error('Errore durante la sincronizzazione:', error);
            alert('Errore durante la sincronizzazione: ' + error.message);
            return false;
        }
    }
    
    /**
     * Esporta documenti in formato Excel
     * @param {Array} documents - Array di documenti da esportare
     * @param {string} filename - Nome del file di output
     * @returns {boolean} True se l'export è riuscito
     */
    function exportDocumentsToExcel(documents, filename = 'DDT-FT.xlsx') {
        // Delega al modulo export-excel se disponibile
        if (window.DDTFTExportExcel && window.DDTFTExportExcel.exportToExcel) {
            return window.DDTFTExportExcel.exportToExcel(documents, filename);
        }
        
        console.error('Modulo export-excel non disponibile');
        return false;
    }
    
    /**
     * Analizza i dati DDT-FT importati
     * @param {Array} data - I dati da analizzare
     * @returns {Object} Statistiche sui dati
     */
    function analyzeDDTFTData(data) {
        if (!data || !Array.isArray(data)) {
            return {
                totalRows: 0,
                uniqueOrders: 0,
                uniqueClients: 0,
                dateRange: { min: null, max: null }
            };
        }
        
        const stats = {
            totalRows: data.length,
            uniqueOrders: new Set(),
            uniqueClients: new Set(),
            dates: []
        };
        
        // Analizza ogni riga
        data.forEach(row => {
            if (row && row.length >= 10) {
                // Numero ordine (colonna 0)
                if (row[0]) stats.uniqueOrders.add(row[0]);
                
                // Cliente (colonna 3)
                if (row[3]) stats.uniqueClients.add(row[3]);
                
                // Data (colonna 2)
                if (row[2]) stats.dates.push(row[2]);
            }
        });
        
        // Calcola range date
        const sortedDates = stats.dates.sort();
        
        return {
            totalRows: stats.totalRows,
            uniqueOrders: stats.uniqueOrders.size,
            uniqueClients: stats.uniqueClients.size,
            dateRange: {
                min: sortedDates[0] || null,
                max: sortedDates[sortedDates.length - 1] || null
            }
        };
    }
    
    /**
     * Helpers UI (delegati a DDTFTUIDialogs se disponibile)
     */
    function showLoadingModal(message) {
        if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.showLoadingModal) {
            return window.DDTFTUIDialogs.showLoadingModal(message);
        }
        console.log(message);
        return null;
    }
    
    function showSyncResults(rowCount, stats) {
        if (window.DDTFTUIDialogs && window.DDTFTUIDialogs.showSyncResults) {
            return window.DDTFTUIDialogs.showSyncResults(rowCount, stats);
        }
        console.log(`Sincronizzazione completata: ${rowCount} righe`);
    }
    
    /**
     * Recupera i dati DDT-FT dal localStorage
     * @returns {Array} I dati salvati o array vuoto
     */
    function getStoredDDTFTData() {
        try {
            const data = localStorage.getItem('ddtftFileData');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Errore lettura dati DDT-FT da localStorage:', error);
            return [];
        }
    }
    
    /**
     * Salva i dati DDT-FT nel localStorage
     * @param {Array} data - I dati da salvare
     * @returns {boolean} True se il salvataggio è riuscito
     */
    function saveStoredDDTFTData(data) {
        try {
            localStorage.setItem('ddtftFileData', JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Errore salvataggio dati DDT-FT in localStorage:', error);
            return false;
        }
    }
    
    /**
     * Verifica se ci sono dati DDT-FT salvati
     * @returns {boolean}
     */
    function hasStoredDDTFTData() {
        const data = getStoredDDTFTData();
        return data && data.length > 0;
    }
    
    // Esporta le funzioni pubbliche
    return {
        // Import/Export principali
        importDDTFTFile,
        syncWithExistingDDTFT,
        exportDocumentsToExcel,
        
        // Analisi dati
        analyzeDDTFTData,
        
        // Storage
        getStoredDDTFTData,
        saveStoredDDTFTData,
        hasStoredDDTFTData
    };
})();

console.log('✅ DDTFTImportExport caricato con successo');