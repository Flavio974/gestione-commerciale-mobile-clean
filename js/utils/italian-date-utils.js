/**
 * UTILITÀ DATE ITALIANO
 * Funzioni di supporto per il sistema date italiano
 */

window.ItalianDateUtils = (function() {
    'use strict';

    /**
     * Valida una data italiana
     */
    function isValidItalianDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return false;
        
        const pattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
        const match = dateStr.match(pattern);
        
        if (!match) return false;
        
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        
        if (day < 1 || day > 31) return false;
        if (month < 1 || month > 12) return false;
        if (year < 1900 || year > 2100) return false;
        
        // Verifica che la data sia realmente valida
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && 
               date.getMonth() === (month - 1) && 
               date.getFullYear() === year;
    }

    /**
     * Confronta due date italiane
     */
    function compareItalianDates(date1, date2) {
        const d1 = parseItalianDate(date1);
        const d2 = parseItalianDate(date2);
        
        if (!d1 || !d2) return 0;
        
        if (d1 < d2) return -1;
        if (d1 > d2) return 1;
        return 0;
    }

    /**
     * Parse semplice data italiana
     */
    function parseItalianDate(dateStr) {
        if (!dateStr) return null;
        
        if (dateStr instanceof Date) return dateStr;
        
        const pattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
        const match = dateStr.toString().match(pattern);
        
        if (!match) return null;
        
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);
        
        // Gestione anni a 2 cifre
        if (year < 100) {
            const currentYear = new Date().getFullYear();
            const currentCentury = Math.floor(currentYear / 100) * 100;
            year = year > 50 ? (currentCentury - 100) + year : currentCentury + year;
        }
        
        return new Date(year, month - 1, day);
    }

    /**
     * Calcola differenza in giorni tra due date
     */
    function daysDifference(date1, date2) {
        const d1 = parseItalianDate(date1);
        const d2 = parseItalianDate(date2);
        
        if (!d1 || !d2) return null;
        
        const timeDiff = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    /**
     * Aggiunge giorni a una data
     */
    function addDays(date, days) {
        const d = parseItalianDate(date);
        if (!d) return null;
        
        const result = new Date(d);
        result.setDate(result.getDate() + days);
        return result;
    }

    /**
     * Ottiene la data di oggi in formato italiano
     */
    function today() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Converte data da/verso diversi formati
     */
    function convertDateFormat(date, fromFormat, toFormat) {
        // Implementazione base per i formati più comuni
        if (fromFormat === 'DD/MM/YYYY' && toFormat === 'YYYY-MM-DD') {
            const d = parseItalianDate(date);
            if (!d) return null;
            
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        return date; // Fallback
    }

    return {
        isValidItalianDate,
        compareItalianDates,
        parseItalianDate,
        daysDifference,
        addDays,
        today,
        convertDateFormat
    };
})();

console.log('✅ ItalianDateUtils caricato');