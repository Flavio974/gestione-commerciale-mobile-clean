/**
 * SISTEMA DATE ITALIANO - MODULO PRINCIPALE
 * Unified entry point per tutti i sistemi di data italiani
 */

console.log('[LOAD] ✅ italian-date-system.js caricato correttamente');
console.log('[DEBUG] italian-date-system execution context:', typeof self, typeof window);

// ✅ WORKER-SAFE GUARD: Evita esecuzione in contesti senza DOM
if (typeof window === 'undefined') {
    console.warn('[italian-date-system] Caricato in Worker/Isolated context: modulo disabilitato');
    // Export stub vuoto per evitare errori di import
    if (typeof self !== 'undefined') {
        self.ItalianDateSystem = {};
    }
    // Non proseguire con l'inizializzazione DOM-dependent
} else {
    console.log('[italian-date-system] Contesto DOM valido, inizializzazione completa');
}

// Continua solo se window è disponibile
if (typeof window !== 'undefined') {
window.ItalianDateSystem = (function() {
    'use strict';

    const system = {
        // Reference ai moduli specializzati
        parser: null,
        formatter: null,
        middleware: null,
        utils: null,

        /**
         * Inizializzazione del sistema
         */
        init() {
            // Collegamento ai moduli se disponibili
            this.parser = window.ItalianDateParser || null;
            this.formatter = window.ItalianDateFormatter || null;
            this.middleware = window.ItalianDateMiddleware || null;
            this.utils = window.ItalianDateUtils || null;

            console.log('✅ ItalianDateSystem inizializzato');
            return true;
        },

        /**
         * Parse data con fallback robusto
         */
        parseDate(dateValue) {
            if (this.parser && this.parser.parseDate) {
                return this.parser.parseDate(dateValue);
            }

            // Fallback interno semplice
            if (!dateValue) return null;
            
            try {
                if (dateValue instanceof Date) return dateValue;
                
                // Pattern italiano DD/MM/YYYY
                if (typeof dateValue === 'string' && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateValue)) {
                    const [day, month, year] = dateValue.split('/').map(n => parseInt(n, 10));
                    return new Date(year, month - 1, day);
                }

                return new Date(dateValue);
            } catch (error) {
                console.error('❌ Errore parsing data:', error);
                return null;
            }
        },

        /**
         * Formatta data in italiano
         */
        formatDate(date) {
            if (this.formatter && this.formatter.formatItalianDate) {
                return this.formatter.formatItalianDate(date);
            }

            // Fallback interno
            if (!date) return null;
            const d = date instanceof Date ? date : new Date(date);
            if (isNaN(d.getTime())) return null;

            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();

            return `${day}/${month}/${year}`;
        },

        /**
         * Test del sistema
         */
        test() {
            console.log('🧪 Test ItalianDateSystem:');
            
            const testCases = [
                { input: '02/01/2025', expected: '02/01/2025' },
                { input: '15/06/2025', expected: '15/06/2025' },
                { input: new Date(2025, 0, 2), expected: '02/01/2025' }
            ];

            testCases.forEach((test, i) => {
                const parsed = this.parseDate(test.input);
                const formatted = this.formatDate(parsed);
                console.log(`Test ${i + 1}: ${JSON.stringify(test.input)} → ${formatted} (expected: ${test.expected})`);
            });
        }
    };

    // Auto-inizializzazione
    system.init();

    return system;
})();

console.log('✅ ItalianDateSystem caricato');