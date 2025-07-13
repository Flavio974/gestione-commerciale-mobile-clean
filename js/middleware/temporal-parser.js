/**
 * TEMPORAL PARSER - PLACEHOLDER
 * Parser temporale per date e orari in linguaggio naturale
 */

window.TemporalParser = (function() {
    'use strict';

    const parser = {
        isEnabled: true,

        /**
         * Parse testo con riferimenti temporali
         */
        parse(text) {
            if (!text || typeof text !== 'string') return null;

            try {
                const result = {
                    originalText: text,
                    parsedDates: [],
                    timeReferences: [],
                    dateRanges: []
                };

                // Pattern base per date italiane
                const datePatterns = [
                    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g,  // DD/MM/YYYY
                    /(\d{1,2})-(\d{1,2})-(\d{2,4})/g,   // DD-MM-YYYY
                    /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g  // DD.MM.YYYY
                ];

                // Cerca pattern di date
                datePatterns.forEach(pattern => {
                    let match;
                    while ((match = pattern.exec(text)) !== null) {
                        result.parsedDates.push({
                            match: match[0],
                            day: parseInt(match[1], 10),
                            month: parseInt(match[2], 10),
                            year: parseInt(match[3], 10),
                            position: match.index
                        });
                    }
                });

                // Pattern per riferimenti temporali relativi
                const timePatterns = [
                    /oggi|stamattina|stasera|stanotte/gi,
                    /domani|dopodomani/gi,
                    /ieri|l'altro ieri/gi,
                    /questa (settimana|mese|anno)/gi,
                    /la (prossima|scorsa) (settimana|mese|anno)/gi
                ];

                timePatterns.forEach(pattern => {
                    const matches = text.match(pattern);
                    if (matches) {
                        matches.forEach(match => {
                            result.timeReferences.push({
                                text: match,
                                type: this.classifyTimeReference(match)
                            });
                        });
                    }
                });

                return result.parsedDates.length > 0 || result.timeReferences.length > 0 ? result : null;

            } catch (error) {
                console.error('❌ Errore TemporalParser:', error);
                return null;
            }
        },

        /**
         * Classifica riferimento temporale
         */
        classifyTimeReference(text) {
            const lowerText = text.toLowerCase();
            
            if (lowerText.includes('oggi') || lowerText.includes('stamattina') || lowerText.includes('stasera')) {
                return 'today';
            }
            if (lowerText.includes('domani')) {
                return 'tomorrow';
            }
            if (lowerText.includes('ieri')) {
                return 'yesterday';
            }
            if (lowerText.includes('settimana')) {
                return 'week';
            }
            if (lowerText.includes('mese')) {
                return 'month';
            }
            if (lowerText.includes('anno')) {
                return 'year';
            }
            
            return 'generic';
        },

        /**
         * Converte riferimento temporale in data
         */
        resolveTimeReference(reference) {
            const now = new Date();
            const type = this.classifyTimeReference(reference);

            switch (type) {
                case 'today':
                    return now;
                case 'tomorrow':
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return tomorrow;
                case 'yesterday':
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    return yesterday;
                default:
                    return null;
            }
        },

        /**
         * Test del parser
         */
        test() {
            console.log('🧪 Test TemporalParser:');
            
            const testCases = [
                'Consegna per domani 15/01/2025',
                'Ordine di oggi alle 14:30',
                'Appuntamento la prossima settimana',
                'Fattura del 02/01/2025'
            ];

            testCases.forEach((test, i) => {
                const result = this.parse(test);
                console.log(`Test ${i + 1}: "${test}"`, result);
            });
        }
    };

    return parser;
})();

console.log('✅ TemporalParser caricato (placeholder)');