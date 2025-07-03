/**
 * DDTFT Validators Module
 * Modulo per la validazione dei documenti DDT e Fatture
 */

(function(window) {
    'use strict';

    const DDTFTValidators = {
        /**
         * Valida un documento completo
         */
        validateDocument(doc, type = 'auto') {
            const errors = [];
            const warnings = [];

            // Determina il tipo se auto
            if (type === 'auto') {
                type = doc.tipo || this.detectDocumentType(doc);
            }

            // Validazioni comuni
            if (!doc.numero) {
                errors.push({
                    field: 'numero',
                    message: 'Numero documento mancante'
                });
            } else if (!this.validateDocumentNumber(doc.numero, type)) {
                warnings.push({
                    field: 'numero',
                    message: 'Formato numero documento non standard'
                });
            }

            if (!doc.data) {
                errors.push({
                    field: 'data',
                    message: 'Data documento mancante'
                });
            } else if (!this.validateDate(doc.data)) {
                errors.push({
                    field: 'data',
                    message: 'Data documento non valida'
                });
            }

            if (!doc.cliente || !doc.cliente.nome) {
                errors.push({
                    field: 'cliente',
                    message: 'Cliente mancante'
                });
            }

            // Validazione articoli
            if (!doc.articoli || !Array.isArray(doc.articoli)) {
                errors.push({
                    field: 'articoli',
                    message: 'Lista articoli mancante o non valida'
                });
            } else if (doc.articoli.length === 0) {
                errors.push({
                    field: 'articoli',
                    message: 'Nessun articolo presente nel documento'
                });
            } else {
                // Valida ogni articolo
                doc.articoli.forEach((articolo, index) => {
                    const articleErrors = this.validateArticle(articolo, index);
                    errors.push(...articleErrors.errors);
                    warnings.push(...articleErrors.warnings);
                });
            }

            // Validazione totali
            if (doc.totali) {
                const totalsValidation = this.validateTotals(doc.totali, doc.articoli);
                if (!totalsValidation.valid) {
                    warnings.push({
                        field: 'totali',
                        message: totalsValidation.message
                    });
                }
            }

            // Validazioni specifiche per tipo
            if (type === 'DDT') {
                const ddtValidation = this.validateDDT(doc);
                errors.push(...ddtValidation.errors);
                warnings.push(...ddtValidation.warnings);
            } else if (type === 'FT') {
                const ftValidation = this.validateFattura(doc);
                errors.push(...ftValidation.errors);
                warnings.push(...ftValidation.warnings);
            }

            return {
                valid: errors.length === 0,
                errors: errors,
                warnings: warnings,
                type: type
            };
        },

        /**
         * Valida un numero di documento
         */
        validateDocumentNumber(numero, type) {
            if (!numero) return false;

            // Pattern per diversi tipi di documento
            const patterns = {
                DDT: /^[A-Z0-9\-\/]+$/i,
                FT: /^[A-Z0-9\-\/]+$/i,
                default: /^[A-Z0-9\-\/\s]+$/i
            };

            const pattern = patterns[type] || patterns.default;
            return pattern.test(numero.toString());
        },

        /**
         * Valida una data
         */
        validateDate(data) {
            if (!data) return false;

            let date;
            if (typeof data === 'string') {
                date = new Date(data);
            } else if (data instanceof Date) {
                date = data;
            } else {
                return false;
            }

            // Verifica che sia una data valida
            if (isNaN(date.getTime())) return false;

            // Verifica che non sia nel futuro
            if (date > new Date()) return false;

            // Verifica che non sia troppo vecchia (es. 5 anni)
            const fiveYearsAgo = new Date();
            fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
            if (date < fiveYearsAgo) return false;

            return true;
        },

        /**
         * Valida un articolo
         */
        validateArticle(articolo, index) {
            const errors = [];
            const warnings = [];

            if (!articolo.codice && !articolo.descrizione) {
                errors.push({
                    field: `articoli[${index}]`,
                    message: 'Articolo senza codice né descrizione'
                });
            }

            if (!articolo.quantita || articolo.quantita <= 0) {
                errors.push({
                    field: `articoli[${index}].quantita`,
                    message: 'Quantità non valida'
                });
            }

            if (articolo.prezzo !== undefined && articolo.prezzo < 0) {
                errors.push({
                    field: `articoli[${index}].prezzo`,
                    message: 'Prezzo negativo'
                });
            }

            if (articolo.iva !== undefined) {
                if (!this.validateIVA(articolo.iva)) {
                    warnings.push({
                        field: `articoli[${index}].iva`,
                        message: 'Aliquota IVA non standard'
                    });
                }
            }

            return { errors, warnings };
        },

        /**
         * Valida l'aliquota IVA
         */
        validateIVA(iva) {
            const validRates = [0, 4, 5, 10, 22];
            const ivaNumber = parseFloat(iva);
            
            return validRates.includes(ivaNumber);
        },

        /**
         * Valida i totali
         */
        validateTotals(totali, articoli) {
            if (!totali || !articoli) {
                return { valid: true, message: 'Impossibile verificare i totali' };
            }

            // Calcola i totali dagli articoli
            let calcolato = {
                imponibile: 0,
                iva: 0,
                totale: 0
            };

            articoli.forEach(art => {
                const importo = (art.quantita || 0) * (art.prezzo || 0);
                const ivaAmount = importo * ((art.iva || 0) / 100);
                
                calcolato.imponibile += importo;
                calcolato.iva += ivaAmount;
            });

            calcolato.totale = calcolato.imponibile + calcolato.iva;

            // Verifica con tolleranza di 0.01
            const tolerance = 0.01;
            const imponibileOk = Math.abs((totali.imponibile || 0) - calcolato.imponibile) <= tolerance;
            const ivaOk = Math.abs((totali.iva || 0) - calcolato.iva) <= tolerance;
            const totaleOk = Math.abs((totali.totale || 0) - calcolato.totale) <= tolerance;

            if (!imponibileOk || !ivaOk || !totaleOk) {
                return {
                    valid: false,
                    message: `Discrepanza nei totali: calcolato ${calcolato.totale.toFixed(2)}, dichiarato ${(totali.totale || 0).toFixed(2)}`
                };
            }

            return { valid: true };
        },

        /**
         * Validazioni specifiche per DDT
         */
        validateDDT(doc) {
            const errors = [];
            const warnings = [];

            // DDT dovrebbe avere destinazione
            if (!doc.destinazione && !doc.indirizzoConsegna) {
                warnings.push({
                    field: 'destinazione',
                    message: 'Indirizzo di destinazione non specificato'
                });
            }

            // Verifica causale trasporto
            if (!doc.causaleTrasporto) {
                warnings.push({
                    field: 'causaleTrasporto',
                    message: 'Causale trasporto non specificata'
                });
            }

            return { errors, warnings };
        },

        /**
         * Validazioni specifiche per Fattura
         */
        validateFattura(doc) {
            const errors = [];
            const warnings = [];

            // Fattura deve avere partita IVA
            if (!doc.cliente || !doc.cliente.partitaIva) {
                errors.push({
                    field: 'cliente.partitaIva',
                    message: 'Partita IVA cliente mancante'
                });
            } else if (!this.validatePartitaIva(doc.cliente.partitaIva)) {
                errors.push({
                    field: 'cliente.partitaIva',
                    message: 'Partita IVA non valida'
                });
            }

            // Verifica modalità pagamento
            if (!doc.modalitaPagamento) {
                warnings.push({
                    field: 'modalitaPagamento',
                    message: 'Modalità di pagamento non specificata'
                });
            }

            return { errors, warnings };
        },

        /**
         * Valida partita IVA italiana
         */
        validatePartitaIva(piva) {
            if (!piva) return false;
            
            // Rimuovi spazi e caratteri non numerici
            piva = piva.replace(/\s/g, '');
            
            // Deve essere di 11 cifre
            if (!/^\d{11}$/.test(piva)) return false;
            
            // Algoritmo di validazione partita IVA italiana
            let sum = 0;
            for (let i = 0; i < 10; i++) {
                const digit = parseInt(piva[i]);
                if (i % 2 === 0) {
                    sum += digit;
                } else {
                    const doubled = digit * 2;
                    sum += doubled > 9 ? doubled - 9 : doubled;
                }
            }
            
            const checkDigit = (10 - (sum % 10)) % 10;
            return checkDigit === parseInt(piva[10]);
        },

        /**
         * Valida codice fiscale
         */
        validateCodiceFiscale(cf) {
            if (!cf) return false;
            
            cf = cf.toUpperCase().replace(/\s/g, '');
            
            // Pattern base per codice fiscale
            const pattern = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
            
            return pattern.test(cf);
        },

        /**
         * Rileva il tipo di documento
         */
        detectDocumentType(doc) {
            // Basato su campi presenti o numero documento
            if (doc.tipo) return doc.tipo;
            
            if (doc.numero) {
                const numero = doc.numero.toUpperCase();
                if (numero.includes('DDT') || numero.includes('DDV')) return 'DDT';
                if (numero.includes('FT') || numero.includes('FATT')) return 'FT';
            }
            
            // Default
            return 'DDT';
        },

        /**
         * Valida un indirizzo
         */
        validateAddress(address) {
            if (!address) return false;
            
            // Verifica presenza CAP
            const capPattern = /\b\d{5}\b/;
            if (!capPattern.test(address)) {
                return false;
            }
            
            // Verifica presenza di una città (almeno 2 caratteri)
            const parts = address.split(/[\s,]+/);
            const hasCity = parts.some(part => part.length >= 2 && /^[A-Za-z]+$/.test(part));
            
            return hasCity;
        }
    };

    // Esporta il modulo
    window.DDTFTValidators = DDTFTValidators;

})(window);