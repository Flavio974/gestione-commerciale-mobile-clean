/**
 * TEMPORAL PARSER - SISTEMA DEFINITIVO DI GESTIONE DATE
 * Traduce QUALSIASI espressione temporale italiana in date concrete
 * 
 * Author: Claude Code
 * Version: 1.0.0
 * Date: 2025-07-11
 */

class TemporalParser {
    constructor() {
        // ✅ TEMPORAL POLYFILL GUARD
        if (typeof Temporal === 'undefined') {
            console.warn('[temporal-parser] Polyfill Temporal mancante – script uscita sicura');
            this.disabled = true;
            return;
        }
        
        // Usa ItalianDateManager per gestione corretta delle date
        if (typeof window !== 'undefined' && window.italianDateManager) {
            this.dateManager = window.italianDateManager;
        } else if (typeof require !== 'undefined') {
            this.dateManager = require('./italian-date-manager');
        } else {
            console.warn('⚠️ ItalianDateManager non disponibile, uso Date standard');
            this.dateManager = null;
        }
        
        // Data corrente in formato italiano
        this.oggi = this.dateManager ? this.dateManager.getCurrentDate() : new Date();
        this.oggi.setHours(0, 0, 0, 0);
        
        // Mappa giorni settimana (0=domenica, 1=lunedì, etc.)
        this.giorniSettimana = {
            'domenica': 0, 'lunedì': 1, 'martedì': 2, 'mercoledì': 3,
            'giovedì': 4, 'venerdì': 5, 'sabato': 6
        };
        
        // Mappa mesi
        this.mesi = {
            'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3,
            'maggio': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7,
            'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11
        };
        
        // Pattern di riconoscimento
        this.patterns = this.inizializzaPatterns();
        
        console.log('🗓️ TemporalParser inizializzato - Data corrente (formato italiano):', this.formatDate(this.oggi));
        
        // Debug critico per verificare formato data
        if (this.dateManager) {
            console.log('🇮🇹 Usando ItalianDateManager - Formato DD/MM/YYYY garantito');
            this.dateManager.debugDateFormats();
        } else {
            console.warn('⚠️ ItalianDateManager non disponibile - Possibili problemi con formato date');
        }
    }

    /**
     * METODO PRINCIPALE - Parse di qualsiasi espressione temporale
     */
    parse(espressione) {
        if (!espressione || typeof espressione !== 'string') {
            return this.creaRisultatoDefault();
        }

        const input = this.normalizza(espressione);
        console.log('🔍 Parsing espressione temporale:', espressione, '→', input);

        // Prova tutti i pattern in ordine di priorità
        for (const [nome, pattern] of Object.entries(this.patterns)) {
            const match = input.match(pattern.regex);
            if (match) {
                console.log(`✅ Pattern "${nome}" riconosciuto:`, match[0]);
                const risultato = pattern.handler.call(this, match, input);
                risultato.originale = espressione;
                risultato.pattern = nome;
                console.log('📅 Risultato parsing:', risultato);
                return risultato;
            }
        }

        console.log('⚠️ Nessun pattern riconosciuto, fallback a oggi');
        return this.creaRisultatoDefault(espressione);
    }

    /**
     * Normalizza l'input per il parsing
     */
    normalizza(testo) {
        return testo
            .toLowerCase()
            .trim()
            .replace(/[àáâã]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõ]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/\s+/g, ' ');
    }

    /**
     * Inizializza tutti i pattern di riconoscimento
     */
    inizializzaPatterns() {
        return {
            // GIORNI RELATIVI AL PRESENTE
            oggi: {
                regex: /\boggi\b/,
                handler: () => this.creaRisultato('data', this.oggi)
            },

            ieri: {
                regex: /\bieri\b/,
                handler: () => {
                    const data = new Date(this.oggi);
                    data.setDate(data.getDate() - 1);
                    return this.creaRisultato('data', data);
                }
            },

            domani: {
                regex: /\bdomani\b/,
                handler: () => {
                    const data = new Date(this.oggi);
                    data.setDate(data.getDate() + 1);
                    return this.creaRisultato('data', data);
                }
            },

            avantieri: {
                regex: /\b(l'altro ieri|avantieri|altro ieri)\b/,
                handler: () => {
                    const data = new Date(this.oggi);
                    data.setDate(data.getDate() - 2);
                    return this.creaRisultato('data', data);
                }
            },

            dopodomani: {
                regex: /\bdopodomani\b/,
                handler: () => {
                    const data = new Date(this.oggi);
                    data.setDate(data.getDate() + 2);
                    return this.creaRisultato('data', data);
                }
            },

            // NUMERI + GIORNI FA/TRA
            giorniFa: {
                regex: /(\d+)\s+giorni?\s+(fa|addietro)/,
                handler: (match) => {
                    const giorni = parseInt(match[1]);
                    const data = new Date(this.oggi);
                    data.setDate(data.getDate() - giorni);
                    return this.creaRisultato('data', data);
                }
            },

            traGiorni: {
                regex: /(tra|fra)\s+(\d+)\s+giorni?/,
                handler: (match) => {
                    const giorni = parseInt(match[2]);
                    const data = new Date(this.oggi);
                    data.setDate(data.getDate() + giorni);
                    return this.creaRisultato('data', data);
                }
            },

            // SETTIMANE
            settimanaScorsa: {
                regex: /\b(la\s+)?settimana\s+(scorsa|passata|precedente)\b/,
                handler: () => {
                    const lunediScorso = this.getLunediCorrente();
                    lunediScorso.setDate(lunediScorso.getDate() - 7);
                    const domenicaScorsa = new Date(lunediScorso);
                    domenicaScorsa.setDate(domenicaScorsa.getDate() + 6);
                    return this.creaRisultato('range', lunediScorso, domenicaScorsa);
                }
            },

            settimanaCorrente: {
                regex: /\b(questa\s+settimana|settimana\s+corrente)\b/,
                handler: () => {
                    const lunedi = this.getLunediCorrente();
                    const domenica = new Date(lunedi);
                    domenica.setDate(domenica.getDate() + 6);
                    return this.creaRisultato('range', lunedi, domenica);
                }
            },

            settimanaRossimaA: {
                regex: /\b(la\s+)?(prossima\s+settimana|settimana\s+prossima)\b/,
                handler: () => {
                    const lunediProssimo = this.getLunediCorrente();
                    lunediProssimo.setDate(lunediProssimo.getDate() + 7);
                    const domenicaProssima = new Date(lunediProssimo);
                    domenicaProssima.setDate(domenicaProssima.getDate() + 6);
                    return this.creaRisultato('range', lunediProssimo, domenicaProssima);
                }
            },

            settimaneNumeriche: {
                regex: /(\d+)\s+settimane?\s+(fa|addietro)/,
                handler: (match) => {
                    const settimane = parseInt(match[1]);
                    const lunedi = this.getLunediCorrente();
                    lunedi.setDate(lunedi.getDate() - (settimane * 7));
                    const domenica = new Date(lunedi);
                    domenica.setDate(domenica.getDate() + 6);
                    return this.creaRisultato('range', lunedi, domenica);
                }
            },

            traSettimane: {
                regex: /(tra|fra)\s+(\d+)\s+settimane?/,
                handler: (match) => {
                    const settimane = parseInt(match[2]);
                    const lunedi = this.getLunediCorrente();
                    lunedi.setDate(lunedi.getDate() + (settimane * 7));
                    const domenica = new Date(lunedi);
                    domenica.setDate(domenica.getDate() + 6);
                    return this.creaRisultato('range', lunedi, domenica);
                }
            },

            // GIORNI DELLA SETTIMANA
            giornoScorso: {
                regex: /\b(lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)\s+(scorso|passato|precedente)\b/,
                handler: (match) => {
                    const nomeGiorno = match[1].replace(/[ìà]/g, 'i').replace(/è/g, 'e');
                    const giorno = this.giorniSettimana[nomeGiorno + (nomeGiorno.endsWith('i') ? '' : 'ì')];
                    const data = this.getGiornoSettimana(giorno, false); // passato
                    return this.creaRisultato('data', data);
                }
            },

            giornoProssimo: {
                regex: /\b(lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)\s+(prossimo|venturo)\b/,
                handler: (match) => {
                    const nomeGiorno = match[1].replace(/[ìà]/g, 'i').replace(/è/g, 'e');
                    const giorno = this.giorniSettimana[nomeGiorno + (nomeGiorno.endsWith('i') ? '' : 'ì')];
                    const data = this.getGiornoSettimana(giorno, true); // futuro
                    return this.creaRisultato('data', data);
                }
            },

            // MESI
            meseScorso: {
                regex: /\b(il\s+)?(mese\s+(scorso|passato|precedente)|scorso\s+mese)\b/,
                handler: () => {
                    const primoMeseScorso = new Date(this.oggi.getFullYear(), this.oggi.getMonth() - 1, 1);
                    const ultimoMeseScorso = new Date(this.oggi.getFullYear(), this.oggi.getMonth(), 0);
                    return this.creaRisultato('range', primoMeseScorso, ultimoMeseScorso);
                }
            },

            meseCorrente: {
                regex: /\b(questo\s+mese|mese\s+corrente)\b/,
                handler: () => {
                    const primoMese = new Date(this.oggi.getFullYear(), this.oggi.getMonth(), 1);
                    const ultimoMese = new Date(this.oggi.getFullYear(), this.oggi.getMonth() + 1, 0);
                    return this.creaRisultato('range', primoMese, ultimoMese);
                }
            },

            meseProssimo: {
                regex: /\b(il\s+)?(prossimo\s+mese|mese\s+prossimo)\b/,
                handler: () => {
                    const primoMeseProssimo = new Date(this.oggi.getFullYear(), this.oggi.getMonth() + 1, 1);
                    const ultimoMeseProssimo = new Date(this.oggi.getFullYear(), this.oggi.getMonth() + 2, 0);
                    return this.creaRisultato('range', primoMeseProssimo, ultimoMeseProssimo);
                }
            },

            // RANGE TEMPORALI
            ultimiGiorni: {
                regex: /(negli?\s+)?ultimi\s+(\d+)\s+giorni?/,
                handler: (match) => {
                    const giorni = parseInt(match[2]);
                    const inizio = new Date(this.oggi);
                    inizio.setDate(inizio.getDate() - giorni);
                    return this.creaRisultato('range', inizio, this.oggi);
                }
            },

            prossimiGiorni: {
                regex: /(nei\s+)?prossimi\s+(\d+)\s+giorni?/,
                handler: (match) => {
                    const giorni = parseInt(match[2]);
                    const fine = new Date(this.oggi);
                    fine.setDate(fine.getDate() + giorni);
                    return this.creaRisultato('range', this.oggi, fine);
                }
            },

            // ESPRESSIONI SPECIALI
            weekend: {
                regex: /\b(weekend|fine\s+settimana|week\s*end)\b/,
                handler: () => {
                    const sabato = this.getGiornoSettimana(6); // prossimo sabato
                    const domenica = new Date(sabato);
                    domenica.setDate(domenica.getDate() + 1);
                    return this.creaRisultato('range', sabato, domenica);
                }
            },

            fineMese: {
                regex: /\b(fine\s+mese|ultimi\s+giorni\s+del\s+mese)\b/,
                handler: () => {
                    const ultimoGiorno = new Date(this.oggi.getFullYear(), this.oggi.getMonth() + 1, 0);
                    const inizio = new Date(ultimoGiorno);
                    inizio.setDate(ultimoGiorno.getDate() - 4); // ultimi 5 giorni
                    return this.creaRisultato('range', inizio, ultimoGiorno);
                }
            }
        };
    }

    /**
     * Helper: Ottiene il lunedì della settimana corrente
     */
    getLunediCorrente() {
        const lunedi = new Date(this.oggi);
        const giorno = lunedi.getDay();
        const diff = lunedi.getDate() - giorno + (giorno === 0 ? -6 : 1); // aggiusta per domenica
        lunedi.setDate(diff);
        return lunedi;
    }

    /**
     * Helper: Ottiene una data per un giorno della settimana specifico
     */
    getGiornoSettimana(numeroGiorno, futuro = null) {
        const oggi = this.oggi.getDay();
        let diff = numeroGiorno - oggi;
        
        if (futuro === null) {
            // Logica automatica: se è oggi stesso, prossimo; altrimenti il più vicino
            if (diff === 0) diff = 7; // prossimo della stessa settimana
            else if (diff < 0) diff += 7; // prossimo nel futuro
        } else if (futuro === false && diff >= 0) {
            // Forza passato
            diff -= 7;
        } else if (futuro === true && diff <= 0) {
            // Forza futuro
            diff += 7;
        }
        
        const data = new Date(this.oggi);
        data.setDate(data.getDate() + diff);
        return data;
    }

    /**
     * Crea un oggetto risultato standardizzato
     */
    creaRisultato(tipo, inizio, fine = null) {
        return {
            tipo: tipo,
            inizio: new Date(inizio),
            fine: fine ? new Date(fine) : new Date(inizio),
            successo: true
        };
    }

    /**
     * Crea un risultato di default (oggi)
     */
    creaRisultatoDefault(originale = '') {
        return {
            tipo: 'data',
            inizio: new Date(this.oggi),
            fine: new Date(this.oggi),
            successo: false,
            originale: originale,
            fallback: true
        };
    }

    /**
     * Formatta una data in stringa leggibile usando ItalianDateManager
     */
    formatDate(data, formato = 'DD/MM/YYYY') {
        if (this.dateManager) {
            return this.dateManager.formatDate(data, formato);
        }
        
        // Fallback se ItalianDateManager non disponibile
        const d = new Date(data);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        
        switch (formato.toUpperCase()) {
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'DD MMMM YYYY':
                const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
                            'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
                return `${day} ${mesi[d.getMonth()]} ${year}`;
            default:
                return `${day}/${month}/${year}`;
        }
    }

    /**
     * Formatta un range di date
     */
    formatRange(risultato, formato = 'DD/MM/YYYY') {
        if (risultato.tipo === 'data') {
            return this.formatDate(risultato.inizio, formato);
        } else {
            return `${this.formatDate(risultato.inizio, formato)} - ${this.formatDate(risultato.fine, formato)}`;
        }
    }

    /**
     * Test rapido del parser
     */
    test() {
        const espressioni = [
            'oggi', 'ieri', 'domani', 'l\'altro ieri', 'dopodomani',
            '3 giorni fa', 'tra 5 giorni', 'settimana scorsa', 'questa settimana',
            'prossima settimana', 'mese scorso', 'questo mese', 'prossimo mese',
            'lunedì scorso', 'venerdì prossimo', 'weekend', 'fine mese',
            'ultimi 7 giorni', 'prossimi 10 giorni'
        ];

        console.log('\n🧪 TEST TEMPORAL PARSER');
        console.log('='.repeat(50));
        
        espressioni.forEach(expr => {
            const risultato = this.parse(expr);
            console.log(`📅 "${expr}" → ${this.formatRange(risultato)}`);
        });
    }
    
    /**
     * TEST CRITICO per verificare il formato DD/MM/YYYY
     */
    testDateFormats() {
        console.log('\n🚨 TEST CRITICO TEMPORAL PARSER: FORMATO DATE');
        console.log('='.repeat(60));
        
        const today = this.oggi;
        const formatted = this.formatDate(today);
        
        console.log('📅 Data di oggi:');
        console.log('   Oggetto Date:', today);
        console.log('   Formato italiano:', formatted);
        console.log('   Giorno:', today.getDate());
        console.log('   Mese:', today.getMonth() + 1);
        console.log('   Anno:', today.getFullYear());
        
        // Test specifici per "tre giorni fa"
        console.log('\n🔍 TEST "tre giorni fa":');
        const treGiorniFa = new Date(today);
        treGiorniFa.setDate(today.getDate() - 3);
        const risultato = this.parse('tre giorni fa');
        
        console.log('   Espressione: "tre giorni fa"');
        console.log('   Data calcolata:', this.formatDate(treGiorniFa));
        console.log('   Parser result:', this.formatRange(risultato));
        console.log('   Formato esteso:', this.formatDate(treGiorniFa, 'DD MMMM YYYY'));
        
        // Test espressioni varie
        console.log('\n🧪 TEST ALTRE ESPRESSIONI:');
        const espressioni = ['oggi', 'ieri', 'domani', '5 giorni fa', 'tra 3 giorni'];
        espressioni.forEach(expr => {
            const result = this.parse(expr);
            console.log(`   "${expr}" → ${this.formatRange(result)}`);
        });
        
        // Verifica critica: 11/07/2025 deve essere 11 luglio
        if (this.dateManager) {
            console.log('\n🎯 VERIFICA CRITICA:');
            this.dateManager.testDateInterpretation();
        }
        
        console.log('='.repeat(60));
        return {
            oggi: formatted,
            treGiorniFa: this.formatDate(treGiorniFa),
            parsingOk: risultato.successo,
            dateManagerAttivo: !!this.dateManager
        };
    }
}

// Export per uso globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemporalParser;
}

// Disponibile globalmente nel browser
if (typeof window !== 'undefined') {
    window.TemporalParser = TemporalParser;
}

console.log('✅ TemporalParser caricato - Sistema definitivo gestione date attivo');

/**
 * TEST CRITICO per verificare il formato DD/MM/YYYY
 */
function testTemporalDateFormats() {
    if (typeof window !== 'undefined' && window.TemporalParser) {
        const parser = new window.TemporalParser();
        return parser.testDateFormats();
    } else {
        console.error('❌ TemporalParser non disponibile per test');
        return null;
    }
}

// Aggiungi ai metodi globali
if (typeof window !== 'undefined') {
    window.testTemporalDateFormats = testTemporalDateFormats;
}