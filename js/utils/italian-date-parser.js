/**
 * PARSER DATE ITALIANO ROBUSTO
 * Risolve il problema dell'interpretazione errata delle date
 * Da formato DD/MM/YYYY a formato corretto
 */

window.ItalianDateParser = (function() {
    'use strict';
    
    /**
     * Parse date in formato americano MM/DD/YYYY e convertila in italiano DD/MM/YYYY
     * Per dati provenienti da Supabase
     */
    function parseAmericanDateToItalian(dateStr) {
        if (!dateStr) return null;
        
        // Rimuovi spazi e normalizza separatori
        const cleanStr = dateStr.toString().trim().replace(/[\-\.]/g, '/');
        
        // Pattern per formato americano MM/DD/YYYY o MM/DD/YY
        const americanPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
        const match = cleanStr.match(americanPattern);
        
        if (!match) {
            console.warn('⚠️ Formato data americano non riconosciuto:', dateStr);
            return null;
        }
        
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);
        
        // Validazione base
        if (day < 1 || day > 31 || month < 1 || month > 12) {
            console.warn('⚠️ Data americana non valida:', dateStr);
            return null;
        }
        
        // Gestione anni a 2 cifre
        if (year < 100) {
            const currentYear = new Date().getFullYear();
            const currentCentury = Math.floor(currentYear / 100) * 100;
            
            if (year > 50) {
                year = (currentCentury - 100) + year;
            } else {
                year = currentCentury + year;
            }
        }
        
        // Crea data FORZANDO formato americano MM/DD/YYYY
        const date = new Date(year, month - 1, day);
        
        // Verifica che la data sia valida
        if (date.getFullYear() !== year || 
            date.getMonth() !== (month - 1) || 
            date.getDate() !== day) {
            console.warn('⚠️ Data americana risultante non valida:', dateStr);
            return null;
        }
        
        console.log(`✅ Data americana convertita: ${dateStr} → ${day}/${month}/${year}`);
        return date;
    }

    /**
     * Parse date da Supabase che è in formato ISO YYYY-MM-DD ma rappresenta date americane
     * Es: 2025-02-01 su Supabase significa 2 gennaio (01/02 in formato americano)
     */
    function parseSupabaseDateToItalian(dateStr) {
        if (!dateStr) return null;
        
        // Rimuovi spazi
        const cleanStr = dateStr.toString().trim();
        
        // Pattern per formato ISO YYYY-MM-DD
        const isoPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
        const match = cleanStr.match(isoPattern);
        
        if (!match) {
            console.warn('⚠️ Formato data ISO non riconosciuto:', dateStr);
            return null;
        }
        
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        
        // Validazione base
        if (day < 1 || day > 31 || month < 1 || month > 12) {
            console.warn('⚠️ Data ISO non valida:', dateStr);
            return null;
        }
        
        // IMPORTANTE: Su Supabase 2025-02-01 significa 2 gennaio (formato americano MM/DD)
        // Quindi month/day sono invertiti rispetto al normale ISO
        const date = new Date(year, day - 1, month);
        
        console.log(`✅ Data Supabase convertita: ${dateStr} → ${month}/${day}/${year} (da formato americano)`);
        return date;
    }

    /**
     * Parse date FORZANDO il formato italiano DD/MM/YYYY
     * Ignora completamente l'interpretazione americana MM/DD/YYYY
     */
    function parseItalianDateStrict(dateStr) {
        if (!dateStr) return null;
        
        // Rimuovi spazi e normalizza separatori
        const cleanStr = dateStr.toString().trim().replace(/[\-\.]/g, '/');
        
        // Pattern per formato italiano DD/MM/YYYY o DD/MM/YY
        const italianPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
        const match = cleanStr.match(italianPattern);
        
        if (!match) {
            console.warn('⚠️ Formato data non riconosciuto:', dateStr);
            return null;
        }
        
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);
        
        // Validazione base
        if (day < 1 || day > 31 || month < 1 || month > 12) {
            console.warn('⚠️ Data non valida:', dateStr);
            return null;
        }
        
        // Gestione anni a 2 cifre
        if (year < 100) {
            const currentYear = new Date().getFullYear();
            const currentCentury = Math.floor(currentYear / 100) * 100;
            
            // Se year > 50, assumiamo secolo precedente
            if (year > 50) {
                year = (currentCentury - 100) + year;
            } else {
                year = currentCentury + year;
            }
        }
        
        // Crea data FORZANDO il formato italiano
        // Usa new Date(year, month-1, day) per evitare ambiguità
        const date = new Date(year, month - 1, day);
        
        // Verifica che la data sia valida
        if (date.getDate() !== day || date.getMonth() !== (month - 1) || date.getFullYear() !== year) {
            console.warn('⚠️ Data invalida dopo parsing:', dateStr);
            return null;
        }
        
        return date;
    }
    
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
     * Parser universale che gestisce diversi formati
     */
    function parseDate(dateValue) {
        if (!dateValue) return null;
        
        try {
            // Se è già una Date
            if (dateValue instanceof Date) {
                return dateValue;
            }
            
            // Se è un numero Excel (giorni dal 1900)
            if (typeof dateValue === 'number') {
                const excelEpoch = new Date(1900, 0, 1);
                const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
                return date;
            }
            
            // Se è una stringa in formato DD/MM/YYYY italiano
            if (typeof dateValue === 'string' && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateValue)) {
                return parseItalianDateStrict(dateValue);
            }
            
            // Se è una stringa in formato ISO YYYY-MM-DD
            if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                const parts = dateValue.split('-');
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const day = parseInt(parts[2], 10);
                return new Date(year, month - 1, day);
            }
            
            // Fallback: prova parsing standard (SCONSIGLIATO per date ambigue)
            console.warn('⚠️ Fallback parsing per data:', dateValue);
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                return date;
            }
            
            return null;
        } catch (err) {
            console.error('❌ Errore parsing data:', dateValue, err);
            return null;
        }
    }
    
    /**
     * Converte data in formato stringa italiana
     */
    function toItalianString(dateValue) {
        const date = parseDate(dateValue);
        return formatItalianDate(date);
    }
    
    /**
     * Test del parser
     */
    function testParser() {
        console.log('🧪 TEST PARSER DATE ITALIANO:');
        
        const testCases = [
            { input: '02/01/2025', expected: '2 gennaio 2025' },
            { input: '03/01/2025', expected: '3 gennaio 2025' },
            { input: '15/06/2025', expected: '15 giugno 2025' },
            { input: '01/12/2025', expected: '1 dicembre 2025' },
            { input: '31/01/2025', expected: '31 gennaio 2025' },
            { input: '02/01/25', expected: '2 gennaio 2025' },
            { input: '2025-01-02', expected: '2 gennaio 2025' },
            { input: '2025-01-03', expected: '3 gennaio 2025' }
        ];
        
        testCases.forEach((test, i) => {
            const result = parseDate(test.input);
            const formatted = result ? result.toLocaleDateString('it-IT', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            }) : 'null';
            
            console.log(`Test ${i + 1}: "${test.input}" -> ${formatted} (atteso: ${test.expected})`);
        });
    }
    
    return {
        parseDate,
        parseItalianDateStrict,
        parseAmericanDateToItalian,
        parseSupabaseDateToItalian,
        formatItalianDate,
        toItalianString,
        testParser
    };
})();

console.log('✅ ItalianDateParser caricato - Usa window.ItalianDateParser.testParser() per testare');