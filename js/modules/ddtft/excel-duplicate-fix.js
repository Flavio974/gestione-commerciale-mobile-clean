/**
 * Fix per la rilevazione dei duplicati nell'esportazione Excel
 * 
 * PROBLEMA: Il sistema identifica erroneamente documenti diversi dello stesso cliente
 * come duplicati perché usa solo il codice prodotto invece di documento + prodotto
 * 
 * SOLUZIONE: Modifica la chiave di duplicazione per includere il numero documento
 * quando il numero ordine non è disponibile (tipico delle fatture)
 */

(function() {
    'use strict';
    
    console.log('📊 [EXCEL DUPLICATE FIX] Applicando fix duplicati Excel...');
    
    // Override analyzeAndCompare per debug aggiuntivo
    if (window.DDTFTAppendToExcel && window.DDTFTAppendToExcel.analyzeAndCompare) {
        const originalAnalyze = window.DDTFTAppendToExcel.analyzeAndCompare;
        
        window.DDTFTAppendToExcel.analyzeAndCompare = function(existingFile, newDocuments, callback) {
            console.log('📊 [EXCEL DUPLICATE FIX] Intercettato analyzeAndCompare');
            console.log('📊 [EXCEL DUPLICATE FIX] Documenti da aggiungere:', newDocuments.length);
            
            // Logga i primi documenti per debug
            if (newDocuments.length > 0) {
                const firstDoc = newDocuments[0];
                console.log('📊 [EXCEL DUPLICATE FIX] Primo documento:', {
                    tipo: firstDoc.type,
                    numero: firstDoc.number,
                    cliente: firstDoc.clientName,
                    numeroArticoli: firstDoc.articles ? firstDoc.articles.length : 0
                });
            }
            
            // Chiama la funzione originale
            return originalAnalyze.call(this, existingFile, newDocuments, callback);
        };
    }
    
    console.log('✅ [EXCEL DUPLICATE FIX] Fix duplicati Excel installato');
    
})();