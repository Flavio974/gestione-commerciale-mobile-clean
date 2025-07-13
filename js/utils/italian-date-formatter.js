/**
 * FORMATTATORE DATE ITALIANO
 * Gestisce la formattazione delle date in formato italiano
 */

window.ItalianDateFormatter = (function() {
    'use strict';

    /**
     * Formatta data in formato italiano DD/MM/YYYY
     */
    function formatItalianDate(date) {
        if (!date) return null;
        
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return null;
        
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        return `${day}/${month}/${year}`;
    }

    /**
     * Formatta data in formato lungo italiano
     */
    function formatItalianDateLong(date) {
        if (!date) return null;
        
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return null;
        
        const months = [
            'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
            'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
        ];
        
        const day = d.getDate();
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        
        return `${day} ${month} ${year}`;
    }

    /**
     * Formatta data per input HTML
     */
    function formatForInput(date) {
        if (!date) return '';
        
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    return {
        formatItalianDate,
        formatItalianDateLong,
        formatForInput
    };
})();

console.log('✅ ItalianDateFormatter caricato');