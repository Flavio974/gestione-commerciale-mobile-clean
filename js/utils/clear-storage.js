/**
 * Utility per azzerare completamente localStorage e sessionStorage
 * con report dettagliato di cosa viene rimosso
 */

(function() {
    'use strict';
    
    console.log('========================================');
    console.log('INIZIO PULIZIA STORAGE');
    console.log('========================================');
    console.log(`Timestamp: ${new Date().toLocaleString()}`);
    console.log('');
    
    // Funzione per ottenere tutti i dati da uno storage
    function getStorageData(storage, storageName) {
        const data = {};
        const keys = [];
        
        try {
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                keys.push(key);
                try {
                    data[key] = storage.getItem(key);
                } catch (e) {
                    data[key] = `[Errore lettura: ${e.message}]`;
                }
            }
        } catch (e) {
            console.error(`Errore durante la lettura di ${storageName}:`, e);
        }
        
        return { data, keys };
    }
    
    // Funzione per formattare la dimensione in bytes
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Funzione per calcolare la dimensione approssimativa dei dati
    function calculateSize(data) {
        try {
            return new Blob([JSON.stringify(data)]).size;
        } catch (e) {
            return 0;
        }
    }
    
    // 1. PULIZIA LOCALSTORAGE
    console.log('1. LOCALSTORAGE');
    console.log('----------------------------------------');
    
    const localStorageData = getStorageData(localStorage, 'localStorage');
    const localStorageSize = calculateSize(localStorageData.data);
    
    if (localStorageData.keys.length > 0) {
        console.log(`Elementi trovati: ${localStorageData.keys.length}`);
        console.log(`Dimensione stimata: ${formatBytes(localStorageSize)}`);
        console.log('\nChiavi rimosse:');
        
        localStorageData.keys.forEach((key, index) => {
            const value = localStorageData.data[key];
            const valuePreview = value && value.length > 50 
                ? value.substring(0, 50) + '...' 
                : value;
            console.log(`  ${index + 1}. "${key}" => ${valuePreview}`);
        });
        
        // Rimuovi tutti gli elementi
        try {
            localStorage.clear();
            console.log('\n✓ localStorage azzerato con successo');
        } catch (e) {
            console.error('✗ Errore durante la pulizia del localStorage:', e);
        }
    } else {
        console.log('Nessun elemento trovato nel localStorage');
    }
    
    console.log('');
    
    // 2. PULIZIA SESSIONSTORAGE
    console.log('2. SESSIONSTORAGE');
    console.log('----------------------------------------');
    
    const sessionStorageData = getStorageData(sessionStorage, 'sessionStorage');
    const sessionStorageSize = calculateSize(sessionStorageData.data);
    
    if (sessionStorageData.keys.length > 0) {
        console.log(`Elementi trovati: ${sessionStorageData.keys.length}`);
        console.log(`Dimensione stimata: ${formatBytes(sessionStorageSize)}`);
        console.log('\nChiavi rimosse:');
        
        sessionStorageData.keys.forEach((key, index) => {
            const value = sessionStorageData.data[key];
            const valuePreview = value && value.length > 50 
                ? value.substring(0, 50) + '...' 
                : value;
            console.log(`  ${index + 1}. "${key}" => ${valuePreview}`);
        });
        
        // Rimuovi tutti gli elementi
        try {
            sessionStorage.clear();
            console.log('\n✓ sessionStorage azzerato con successo');
        } catch (e) {
            console.error('✗ Errore durante la pulizia del sessionStorage:', e);
        }
    } else {
        console.log('Nessun elemento trovato nel sessionStorage');
    }
    
    console.log('');
    
    // 3. RIEPILOGO FINALE
    console.log('========================================');
    console.log('RIEPILOGO OPERAZIONE');
    console.log('========================================');
    
    const totalItems = localStorageData.keys.length + sessionStorageData.keys.length;
    const totalSize = localStorageSize + sessionStorageSize;
    
    console.log(`Totale elementi rimossi: ${totalItems}`);
    console.log(`  - Da localStorage: ${localStorageData.keys.length}`);
    console.log(`  - Da sessionStorage: ${sessionStorageData.keys.length}`);
    console.log(`Dimensione totale liberata: ${formatBytes(totalSize)}`);
    
    // Verifica finale
    const localStorageEmpty = localStorage.length === 0;
    const sessionStorageEmpty = sessionStorage.length === 0;
    
    console.log('');
    console.log('Verifica finale:');
    console.log(`  - localStorage vuoto: ${localStorageEmpty ? '✓ Sì' : '✗ No'}`);
    console.log(`  - sessionStorage vuoto: ${sessionStorageEmpty ? '✓ Sì' : '✗ No'}`);
    
    if (localStorageEmpty && sessionStorageEmpty) {
        console.log('\n✓ OPERAZIONE COMPLETATA CON SUCCESSO!');
        console.log('Tutti i dati sono stati rimossi correttamente.');
    } else {
        console.log('\n⚠ ATTENZIONE: Alcuni dati potrebbero non essere stati rimossi.');
    }
    
    console.log('');
    console.log('========================================');
    
    // Restituisci un oggetto con il risultato dell'operazione
    return {
        success: localStorageEmpty && sessionStorageEmpty,
        removedItems: {
            localStorage: localStorageData.keys.length,
            sessionStorage: sessionStorageData.keys.length,
            total: totalItems
        },
        freedSpace: {
            localStorage: localStorageSize,
            sessionStorage: sessionStorageSize,
            total: totalSize,
            formatted: formatBytes(totalSize)
        },
        timestamp: new Date().toISOString()
    };
})();

// Esporta la funzione per uso modulare
if (typeof module !== 'undefined' && module.exports) {
    module.exports = clearStorage;
}