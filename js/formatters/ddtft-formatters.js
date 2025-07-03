/**
 * DDTFT Formatters Module
 * Modulo per la formattazione dei dati DDT e Fatture
 */

(function(window) {
    'use strict';

    const DDTFTFormatters = {
        /**
         * Formatta un documento completo per la visualizzazione
         */
        formatDocument(doc, options = {}) {
            const formatted = {
                tipo: this.formatDocumentType(doc.tipo),
                numero: this.formatDocumentNumber(doc.numero, doc.tipo),
                data: this.formatDate(doc.data),
                cliente: this.formatCliente(doc.cliente),
                articoli: this.formatArticoli(doc.articoli),
                totali: this.formatTotali(doc.totali),
                note: doc.note || ''
            };

            // Campi opzionali
            if (doc.destinazione) {
                formatted.destinazione = this.formatAddress(doc.destinazione);
            }

            if (doc.modalitaPagamento) {
                formatted.modalitaPagamento = this.formatPaymentMethod(doc.modalitaPagamento);
            }

            return formatted;
        },

        /**
         * Formatta il tipo di documento
         */
        formatDocumentType(tipo) {
            const tipi = {
                'DDT': 'Documento di Trasporto',
                'DDV': 'Documento di Vendita',
                'FT': 'Fattura',
                'NC': 'Nota di Credito'
            };

            return tipi[tipo] || tipo;
        },

        /**
         * Formatta il numero documento
         */
        formatDocumentNumber(numero, tipo) {
            if (!numero) return '';

            // Aggiungi prefisso se mancante
            if (tipo && !numero.toString().includes(tipo)) {
                return `${tipo} ${numero}`;
            }

            return numero.toString();
        },

        /**
         * Formatta una data
         */
        formatDate(data, formato = 'dd/mm/yyyy') {
            if (!data) return '';

            let dateObj;
            if (typeof data === 'string') {
                dateObj = new Date(data);
            } else if (data instanceof Date) {
                dateObj = data;
            } else {
                return '';
            }

            if (isNaN(dateObj.getTime())) return '';

            const dd = String(dateObj.getDate()).padStart(2, '0');
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const yyyy = dateObj.getFullYear();

            switch (formato) {
                case 'dd/mm/yyyy':
                    return `${dd}/${mm}/${yyyy}`;
                case 'dd-mm-yyyy':
                    return `${dd}-${mm}-${yyyy}`;
                case 'yyyy-mm-dd':
                    return `${yyyy}-${mm}-${dd}`;
                case 'it-long':
                    const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
                                  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
                    return `${dd} ${mesi[dateObj.getMonth()]} ${yyyy}`;
                default:
                    return `${dd}/${mm}/${yyyy}`;
            }
        },

        /**
         * Formatta i dati del cliente
         */
        formatCliente(cliente) {
            if (!cliente) return {};

            const formatted = {
                nome: this.formatRagioneSociale(cliente.nome || cliente.ragioneSociale),
                indirizzo: this.formatAddress(cliente.indirizzo),
                cap: cliente.cap || '',
                citta: this.formatCitta(cliente.citta),
                provincia: cliente.provincia || '',
                partitaIva: this.formatPartitaIva(cliente.partitaIva),
                codiceFiscale: this.formatCodiceFiscale(cliente.codiceFiscale)
            };

            // Rimuovi campi vuoti
            Object.keys(formatted).forEach(key => {
                if (!formatted[key]) delete formatted[key];
            });

            return formatted;
        },

        /**
         * Formatta ragione sociale
         */
        formatRagioneSociale(nome) {
            if (!nome) return '';

            // Capitalizza correttamente
            return nome.split(' ')
                .map(word => {
                    // Mantieni maiuscole per sigle
                    if (word.length <= 3 && word === word.toUpperCase()) {
                        return word;
                    }
                    // Capitalizza prima lettera
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                })
                .join(' ');
        },

        /**
         * Formatta indirizzo
         */
        formatAddress(indirizzo) {
            if (!indirizzo) return '';

            // Normalizza spazi
            indirizzo = indirizzo.replace(/\s+/g, ' ').trim();

            // Capitalizza via/piazza/etc
            const prefissi = ['via', 'viale', 'piazza', 'corso', 'largo', 'vicolo'];
            const words = indirizzo.split(' ');
            
            return words.map((word, i) => {
                const wordLower = word.toLowerCase();
                if (i === 0 && prefissi.includes(wordLower)) {
                    return word.charAt(0).toUpperCase() + wordLower.slice(1);
                }
                return word;
            }).join(' ');
        },

        /**
         * Formatta città
         */
        formatCitta(citta) {
            if (!citta) return '';

            // Capitalizza ogni parola
            return citta.split(/[\s-]/)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                .join(' ');
        },

        /**
         * Formatta partita IVA
         */
        formatPartitaIva(piva) {
            if (!piva) return '';

            // Rimuovi spazi e caratteri non numerici
            piva = piva.toString().replace(/\D/g, '');

            // Aggiungi IT se mancante e lunghezza corretta
            if (piva.length === 11 && !piva.startsWith('IT')) {
                piva = 'IT' + piva;
            }

            return piva;
        },

        /**
         * Formatta codice fiscale
         */
        formatCodiceFiscale(cf) {
            if (!cf) return '';

            return cf.toUpperCase().replace(/\s/g, '');
        },

        /**
         * Formatta lista articoli
         */
        formatArticoli(articoli) {
            if (!articoli || !Array.isArray(articoli)) return [];

            return articoli.map((art, index) => this.formatArticolo(art, index));
        },

        /**
         * Formatta singolo articolo
         */
        formatArticolo(articolo, index) {
            const formatted = {
                riga: index + 1,
                codice: articolo.codice || '',
                descrizione: this.formatDescrizione(articolo.descrizione),
                quantita: this.formatQuantita(articolo.quantita),
                unitaMisura: articolo.unitaMisura || 'PZ',
                prezzo: this.formatCurrency(articolo.prezzo),
                importo: this.formatCurrency(articolo.importo),
                iva: this.formatPercentuale(articolo.iva)
            };

            // Calcola importo se mancante
            if (!formatted.importo && articolo.quantita && articolo.prezzo) {
                formatted.importo = this.formatCurrency(articolo.quantita * articolo.prezzo);
            }

            return formatted;
        },

        /**
         * Formatta descrizione articolo
         */
        formatDescrizione(descrizione) {
            if (!descrizione) return '';

            // Rimuovi spazi multipli e trim
            descrizione = descrizione.replace(/\s+/g, ' ').trim();

            // Capitalizza prima lettera
            if (descrizione.length > 0) {
                descrizione = descrizione.charAt(0).toUpperCase() + descrizione.slice(1);
            }

            return descrizione;
        },

        /**
         * Formatta quantità
         */
        formatQuantita(quantita) {
            if (quantita === undefined || quantita === null) return '0';

            const num = parseFloat(quantita);
            if (isNaN(num)) return '0';

            // Se è un intero, mostra senza decimali
            if (num === Math.floor(num)) {
                return num.toString();
            }

            // Altrimenti mostra con 2 decimali
            return num.toFixed(2).replace('.', ',');
        },

        /**
         * Formatta valuta
         */
        formatCurrency(value, symbol = '€') {
            if (value === undefined || value === null) return '';

            const num = parseFloat(value);
            if (isNaN(num)) return '';

            const formatted = num.toFixed(2).replace('.', ',');
            
            // Aggiungi separatori migliaia
            const parts = formatted.split(',');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');

            return symbol + ' ' + parts.join(',');
        },

        /**
         * Formatta percentuale
         */
        formatPercentuale(value) {
            if (value === undefined || value === null) return '';

            const num = parseFloat(value);
            if (isNaN(num)) return '';

            return num.toFixed(0) + '%';
        },

        /**
         * Formatta totali
         */
        formatTotali(totali) {
            if (!totali) return {};

            return {
                imponibile: this.formatCurrency(totali.imponibile),
                iva: this.formatCurrency(totali.iva),
                totale: this.formatCurrency(totali.totale)
            };
        },

        /**
         * Formatta modalità pagamento
         */
        formatPaymentMethod(modalita) {
            const modalitaStandard = {
                'BB': 'Bonifico Bancario',
                'RB': 'Ricevuta Bancaria',
                'RD': 'Rimessa Diretta',
                'AS': 'Assegno',
                'CN': 'Contanti',
                'CC': 'Carta di Credito'
            };

            return modalitaStandard[modalita] || modalita;
        },

        /**
         * Formatta per export Excel
         */
        formatForExcel(doc) {
            const formatted = {
                'Tipo': doc.tipo,
                'Numero': doc.numero,
                'Data': this.formatDate(doc.data, 'dd/mm/yyyy'),
                'Cliente': doc.cliente?.nome || '',
                'P.IVA': doc.cliente?.partitaIva || '',
                'Indirizzo': doc.cliente?.indirizzo || '',
                'CAP': doc.cliente?.cap || '',
                'Città': doc.cliente?.citta || '',
                'Provincia': doc.cliente?.provincia || '',
                'Imponibile': this.formatCurrency(doc.totali?.imponibile, '').replace('€', '').trim(),
                'IVA': this.formatCurrency(doc.totali?.iva, '').replace('€', '').trim(),
                'Totale': this.formatCurrency(doc.totali?.totale, '').replace('€', '').trim()
            };

            return formatted;
        },

        /**
         * Formatta per stampa
         */
        formatForPrint(doc) {
            const header = `
${this.formatDocumentType(doc.tipo).toUpperCase()}
Numero: ${doc.numero}
Data: ${this.formatDate(doc.data)}

CLIENTE
${doc.cliente?.nome || ''}
${doc.cliente?.indirizzo || ''}
${doc.cliente?.cap || ''} ${doc.cliente?.citta || ''} ${doc.cliente?.provincia || ''}
P.IVA: ${doc.cliente?.partitaIva || ''}
`;

            const articoli = doc.articoli?.map(art => 
                `${art.codice || ''} ${art.descrizione || ''} - Qt: ${art.quantita || 0} x ${this.formatCurrency(art.prezzo)} = ${this.formatCurrency(art.importo)}`
            ).join('\n');

            const footer = `
TOTALI
Imponibile: ${this.formatCurrency(doc.totali?.imponibile)}
IVA: ${this.formatCurrency(doc.totali?.iva)}
TOTALE: ${this.formatCurrency(doc.totali?.totale)}
`;

            return header + '\nARTICOLI\n' + articoli + footer;
        }
    };

    // Esporta il modulo
    window.DDTFTFormatters = DDTFTFormatters;

})(window);