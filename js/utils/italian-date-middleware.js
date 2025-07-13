/**
 * MIDDLEWARE DATE ITALIANO
 * Intercetta e corregge automaticamente le date
 */

window.ItalianDateMiddleware = (function() {
    'use strict';

    const middleware = {
        enabled: true,

        /**
         * Processa automaticamente le date nei dati
         */
        processData(data) {
            if (!this.enabled || !data) return data;

            try {
                return this.walkObject(data);
            } catch (error) {
                console.error('❌ Errore middleware date:', error);
                return data;
            }
        },

        /**
         * Attraversa ricorsivamente un oggetto per processare le date
         */
        walkObject(obj) {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map(item => this.walkObject(item));
            }

            const result = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    result[key] = this.processValue(key, obj[key]);
                }
            }
            return result;
        },

        /**
         * Processa un singolo valore
         */
        processValue(key, value) {
            // Se la chiave suggerisce una data
            if (this.isDateField(key)) {
                const parsedDate = this.parseAndCorrectDate(value);
                if (parsedDate) {
                    return parsedDate;
                }
            }

            // Se il valore è un oggetto, processalo ricorsivamente
            if (typeof value === 'object' && value !== null) {
                return this.walkObject(value);
            }

            return value;
        },

        /**
         * Verifica se un campo contiene probabilmente una data
         */
        isDateField(fieldName) {
            const dateFields = [
                'data', 'date', 'datetime', 'timestamp',
                'data_ordine', 'data_consegna', 'data_documento',
                'created_at', 'updated_at', 'dataOrdine', 'dataConsegna'
            ];

            return dateFields.some(field => 
                fieldName.toLowerCase().includes(field.toLowerCase())
            );
        },

        /**
         * Parse e corregge una data
         */
        parseAndCorrectDate(value) {
            if (!value) return value;

            try {
                // Usa il parser italiano se disponibile
                if (window.ItalianDateParser && window.ItalianDateParser.parseDate) {
                    return window.ItalianDateParser.parseDate(value);
                }

                // Fallback semplice
                if (typeof value === 'string' && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) {
                    const [day, month, year] = value.split('/').map(n => parseInt(n, 10));
                    return new Date(year, month - 1, day);
                }

                return value;
            } catch (error) {
                console.warn('⚠️ Errore parsing data middleware:', value, error);
                return value;
            }
        },

        /**
         * Abilita/disabilita il middleware
         */
        enable() {
            this.enabled = true;
            console.log('✅ Middleware date italiano abilitato');
        },

        disable() {
            this.enabled = false;
            console.log('⚠️ Middleware date italiano disabilitato');
        }
    };

    return middleware;
})();

console.log('✅ ItalianDateMiddleware caricato');