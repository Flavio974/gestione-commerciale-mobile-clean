/**
 * Number Formatter per DDT-FT
 * Formatta i numeri per l'export Excel in formato italiano
 */

window.DDTFTNumberFormatter = (function() {
    'use strict';
    
    /**
     * Converte un numero dal formato con punto a formato con virgola italiana
     */
    function toItalianFormat(value) {
        if (value === null || value === undefined || value === '') {
            return '0';
        }
        
        // Se è già una stringa con virgola, la ritorna
        if (typeof value === 'string' && value.includes(',')) {
            return value;
        }
        
        // Converte in numero
        let num = 0;
        if (typeof value === 'number') {
            num = value;
        } else if (typeof value === 'string') {
            // Rimuove eventuali spazi e simboli di valuta
            const cleanValue = value.replace(/[€$£\s]/g, '').replace(',', '.');
            num = parseFloat(cleanValue);
        }
        
        // Se non è un numero valido, ritorna 0
        if (isNaN(num)) {
            return '0';
        }
        
        // Formatta con 2 decimali e virgola italiana
        return num.toFixed(2).replace('.', ',');
    }
    
    /**
     * Formatta una quantità (può avere decimali variabili)
     */
    function formatQuantity(value) {
        if (value === null || value === undefined || value === '') {
            return '0';
        }
        
        // Converte in numero
        let num = 0;
        if (typeof value === 'number') {
            num = value;
        } else if (typeof value === 'string') {
            num = parseFloat(value.replace(',', '.'));
        }
        
        if (isNaN(num)) {
            return '0';
        }
        
        // Se è un intero, ritorna senza decimali
        if (num % 1 === 0) {
            return num.toString();
        }
        
        // Altrimenti usa i decimali necessari (max 3)
        return num.toFixed(3).replace(/\.?0+$/, '').replace('.', ',');
    }
    
    /**
     * Formatta una percentuale
     */
    function formatPercentage(value) {
        if (value === null || value === undefined || value === '') {
            return '0';
        }
        
        let num = 0;
        if (typeof value === 'number') {
            num = value;
        } else if (typeof value === 'string') {
            // Rimuove il simbolo % se presente
            num = parseFloat(value.replace(',', '.').replace('%', ''));
        }
        
        if (isNaN(num)) {
            return '0';
        }
        
        // Se è un intero, ritorna senza decimali
        if (num % 1 === 0) {
            return num.toString();
        }
        
        // Altrimenti usa max 2 decimali
        return num.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
    }
    
    /**
     * Prepara una riga di dati per Excel con formattazione italiana
     */
    function formatRowData(row) {
        // Copia l'array per non modificare l'originale
        const formattedRow = [...row];
        
        // Indici delle colonne numeriche (0-based) - AGGIORNATI con Numero Documento
        // 0: Numero Ordine, 1: Data Ordine, 2: Numero Documento (NUOVA), 3: Cliente...
        const quantityIndex = 9;    // Quantità (era 8, ora 9)
        const priceIndex = 10;      // Prezzo Unitario (era 9, ora 10)
        const smIndex = 11;         // S.M. (era 10, ora 11)
        const discountIndex = 12;   // Sconto (%) (era 11, ora 12)
        const totalIndex = 13;      // Importo (era 12, ora 13)
        
        // Formatta i valori numerici
        if (formattedRow[quantityIndex] !== undefined) {
            formattedRow[quantityIndex] = formatQuantity(formattedRow[quantityIndex]);
        }
        
        if (formattedRow[priceIndex] !== undefined) {
            formattedRow[priceIndex] = toItalianFormat(formattedRow[priceIndex]);
        }
        
        if (formattedRow[smIndex] !== undefined) {
            formattedRow[smIndex] = formatQuantity(formattedRow[smIndex]);
        }
        
        if (formattedRow[discountIndex] !== undefined) {
            formattedRow[discountIndex] = formatPercentage(formattedRow[discountIndex]);
        }
        
        if (formattedRow[totalIndex] !== undefined) {
            formattedRow[totalIndex] = toItalianFormat(formattedRow[totalIndex]);
        }
        
        return formattedRow;
    }
    
    // Esporta le funzioni pubbliche
    return {
        toItalianFormat,
        formatQuantity,
        formatPercentage,
        formatRowData
    };
})();

console.log('✅ DDTFT Number Formatter caricato');