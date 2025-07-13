/**
 * TEST COMPLETI PER TEMPORAL PARSER
 * Verifica OGNI singola espressione temporale supportata
 */

// Simula ambiente test se necessario
if (typeof TemporalParser === 'undefined') {
    const TemporalParser = require('../js/utils/temporal-parser.js');
    global.TemporalParser = TemporalParser;
}

class TemporalParserTester {
    constructor() {
        this.parser = new TemporalParser();
        this.testsEseguiti = 0;
        this.testsPassati = 0;
        this.testsFalliti = [];
    }

    /**
     * Esegue tutti i test
     */
    runAllTests() {
        console.log('\n🧪 AVVIO TEST COMPLETO TEMPORAL PARSER');
        console.log('='.repeat(60));
        console.log(`📅 Data corrente test: ${this.parser.formatDate(this.parser.oggi)}`);
        console.log('='.repeat(60));

        // Esegui tutti i gruppi di test
        this.testGiorniRelativi();
        this.testEspressioniNumeriche();
        this.testSettimane();
        this.testMesi();
        this.testGiorniSettimana();
        this.testRange();
        this.testEspressioniSpeciali();
        this.testCasiComplessi();
        this.testGestioneErrori();

        // Risultati finali
        this.stampaRisultatiFinali();
        
        return {
            totale: this.testsEseguiti,
            passati: this.testsPassati,
            falliti: this.testsFalliti.length,
            successo: this.testsFalliti.length === 0
        };
    }

    /**
     * Test per giorni relativi al presente
     */
    testGiorniRelativi() {
        console.log('\n📅 TEST GIORNI RELATIVI');
        console.log('-'.repeat(30));

        const oggi = new Date(this.parser.oggi);
        
        // Oggi
        this.testEspressione('oggi', {
            tipo: 'data',
            inizio: oggi
        });

        // Ieri
        const ieri = new Date(oggi);
        ieri.setDate(ieri.getDate() - 1);
        this.testEspressione('ieri', {
            tipo: 'data',
            inizio: ieri
        });

        // Domani
        const domani = new Date(oggi);
        domani.setDate(domani.getDate() + 1);
        this.testEspressione('domani', {
            tipo: 'data',
            inizio: domani
        });

        // L'altro ieri / Avantieri
        const altroIeri = new Date(oggi);
        altroIeri.setDate(altroIeri.getDate() - 2);
        this.testEspressione('l\'altro ieri', {
            tipo: 'data',
            inizio: altroIeri
        });
        this.testEspressione('avantieri', {
            tipo: 'data',
            inizio: altroIeri
        });

        // Dopodomani
        const dopodomani = new Date(oggi);
        dopodomani.setDate(dopodomani.getDate() + 2);
        this.testEspressione('dopodomani', {
            tipo: 'data',
            inizio: dopodomani
        });
    }

    /**
     * Test per espressioni numeriche
     */
    testEspressioniNumeriche() {
        console.log('\n🔢 TEST ESPRESSIONI NUMERICHE');
        console.log('-'.repeat(30));

        const oggi = new Date(this.parser.oggi);

        // X giorni fa
        const treGiorniFa = new Date(oggi);
        treGiorniFa.setDate(treGiorniFa.getDate() - 3);
        this.testEspressione('3 giorni fa', {
            tipo: 'data',
            inizio: treGiorniFa
        });

        const setteGiorniFa = new Date(oggi);
        setteGiorniFa.setDate(setteGiorniFa.getDate() - 7);
        this.testEspressione('7 giorni fa', {
            tipo: 'data',
            inizio: setteGiorniFa
        });

        // Tra X giorni
        const traCinqueGiorni = new Date(oggi);
        traCinqueGiorni.setDate(traCinqueGiorni.getDate() + 5);
        this.testEspressione('tra 5 giorni', {
            tipo: 'data',
            inizio: traCinqueGiorni
        });

        const fraDieciGiorni = new Date(oggi);
        fraDieciGiorni.setDate(fraDieciGiorni.getDate() + 10);
        this.testEspressione('fra 10 giorni', {
            tipo: 'data',
            inizio: fraDieciGiorni
        });
    }

    /**
     * Test per settimane
     */
    testSettimane() {
        console.log('\n📆 TEST SETTIMANE');
        console.log('-'.repeat(30));

        // Settimana corrente
        const lunediCorrente = this.parser.getLunediCorrente();
        const domenicaCorrente = new Date(lunediCorrente);
        domenicaCorrente.setDate(domenicaCorrente.getDate() + 6);
        
        this.testEspressione('questa settimana', {
            tipo: 'range',
            inizio: lunediCorrente,
            fine: domenicaCorrente
        });

        // Settimana scorsa
        const lunediScorso = new Date(lunediCorrente);
        lunediScorso.setDate(lunediScorso.getDate() - 7);
        const domenicaScorsa = new Date(lunediScorso);
        domenicaScorsa.setDate(domenicaScorsa.getDate() + 6);
        
        this.testEspressione('settimana scorsa', {
            tipo: 'range',
            inizio: lunediScorso,
            fine: domenicaScorsa
        });

        // Prossima settimana
        const lunediProssimo = new Date(lunediCorrente);
        lunediProssimo.setDate(lunediProssimo.getDate() + 7);
        const domenicaProssima = new Date(lunediProssimo);
        domenicaProssima.setDate(domenicaProssima.getDate() + 6);
        
        this.testEspressione('prossima settimana', {
            tipo: 'range',
            inizio: lunediProssimo,
            fine: domenicaProssima
        });

        // Settimane numeriche
        const dueSettimaneScorse = new Date(lunediCorrente);
        dueSettimaneScorse.setDate(dueSettimaneScorse.getDate() - 14);
        const domenicaDueSettimaneScorse = new Date(dueSettimaneScorse);
        domenicaDueSettimaneScorse.setDate(domenicaDueSettimaneScorse.getDate() + 6);
        
        this.testEspressione('2 settimane fa', {
            tipo: 'range',
            inizio: dueSettimaneScorse,
            fine: domenicaDueSettimaneScorse
        });
    }

    /**
     * Test per mesi
     */
    testMesi() {
        console.log('\n📊 TEST MESI');
        console.log('-'.repeat(30));

        const oggi = new Date(this.parser.oggi);

        // Questo mese
        const primoMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
        const ultimoMese = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0);
        
        this.testEspressione('questo mese', {
            tipo: 'range',
            inizio: primoMese,
            fine: ultimoMese
        });

        // Mese scorso
        const primoMeseScorso = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1);
        const ultimoMeseScorso = new Date(oggi.getFullYear(), oggi.getMonth(), 0);
        
        this.testEspressione('mese scorso', {
            tipo: 'range',
            inizio: primoMeseScorso,
            fine: ultimoMeseScorso
        });

        // Prossimo mese
        const primoMeseProssimo = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 1);
        const ultimoMeseProssimo = new Date(oggi.getFullYear(), oggi.getMonth() + 2, 0);
        
        this.testEspressione('prossimo mese', {
            tipo: 'range',
            inizio: primoMeseProssimo,
            fine: ultimoMeseProssimo
        });
    }

    /**
     * Test per giorni della settimana
     */
    testGiorniSettimana() {
        console.log('\n📅 TEST GIORNI SETTIMANA');
        console.log('-'.repeat(30));

        // Test giorni scorsi e prossimi
        const giorniTest = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
        
        giorniTest.forEach(giorno => {
            // Test solo che ritornino un risultato valido, non date specifiche
            // (dipende dal giorno corrente quando si esegue il test)
            const risultatoScorso = this.parser.parse(`${giorno} scorso`);
            this.assert(
                risultatoScorso.successo && risultatoScorso.tipo === 'data',
                `"${giorno} scorso" dovrebbe restituire una data valida`
            );

            const risultatoProssimo = this.parser.parse(`${giorno} prossimo`);
            this.assert(
                risultatoProssimo.successo && risultatoProssimo.tipo === 'data',
                `"${giorno} prossimo" dovrebbe restituire una data valida`
            );
        });
    }

    /**
     * Test per range temporali
     */
    testRange() {
        console.log('\n📊 TEST RANGE TEMPORALI');
        console.log('-'.repeat(30));

        const oggi = new Date(this.parser.oggi);

        // Ultimi X giorni
        const setteGiorniFa = new Date(oggi);
        setteGiorniFa.setDate(setteGiorniFa.getDate() - 7);
        
        this.testEspressione('ultimi 7 giorni', {
            tipo: 'range',
            inizio: setteGiorniFa,
            fine: oggi
        });

        // Prossimi X giorni
        const dieciGiorniFuturo = new Date(oggi);
        dieciGiorniFuturo.setDate(dieciGiorniFuturo.getDate() + 10);
        
        this.testEspressione('prossimi 10 giorni', {
            tipo: 'range',
            inizio: oggi,
            fine: dieciGiorniFuturo
        });
    }

    /**
     * Test per espressioni speciali
     */
    testEspressioniSpeciali() {
        console.log('\n🎯 TEST ESPRESSIONI SPECIALI');
        console.log('-'.repeat(30));

        // Weekend
        const risultatoWeekend = this.parser.parse('weekend');
        this.assert(
            risultatoWeekend.successo && risultatoWeekend.tipo === 'range',
            'Weekend dovrebbe restituire un range sabato-domenica'
        );

        // Fine settimana (sinonimo)
        const risultatoFineSettimana = this.parser.parse('fine settimana');
        this.assert(
            risultatoFineSettimana.successo && risultatoFineSettimana.tipo === 'range',
            'Fine settimana dovrebbe restituire un range'
        );

        // Fine mese
        const risultatoFineMese = this.parser.parse('fine mese');
        this.assert(
            risultatoFineMese.successo && risultatoFineMese.tipo === 'range',
            'Fine mese dovrebbe restituire un range'
        );
    }

    /**
     * Test per casi complessi e frasi complete
     */
    testCasiComplessi() {
        console.log('\n🔧 TEST CASI COMPLESSI');
        console.log('-'.repeat(30));

        // Frasi complete che contengono espressioni temporali
        const frasiTest = [
            'mostrami gli ordini di ieri',
            'clienti visitati la settimana scorsa',
            'fatturato di questo mese',
            'appuntamenti per domani',
            'riunione del venerdì prossimo'
        ];

        frasiTest.forEach(frase => {
            const risultato = this.parser.parse(frase);
            this.assert(
                risultato.successo,
                `"${frase}" dovrebbe essere parsata correttamente`
            );
        });
    }

    /**
     * Test per gestione errori e fallback
     */
    testGestioneErrori() {
        console.log('\n⚠️ TEST GESTIONE ERRORI');
        console.log('-'.repeat(30));

        // Input non validi
        const inputInvalidi = [
            null,
            undefined,
            '',
            'testo senza date',
            'xyz123',
            'qualcosa di incomprensibile'
        ];

        inputInvalidi.forEach(input => {
            const risultato = this.parser.parse(input);
            this.assert(
                risultato.fallback === true || risultato.successo === false,
                `Input non valido "${input}" dovrebbe attivare fallback`
            );
        });
    }

    /**
     * Test singola espressione
     */
    testEspressione(espressione, atteso) {
        const risultato = this.parser.parse(espressione);
        
        // Verifica tipo
        this.assert(
            risultato.tipo === atteso.tipo,
            `"${espressione}": tipo atteso ${atteso.tipo}, ottenuto ${risultato.tipo}`
        );

        // Verifica data inizio
        this.assert(
            this.dateUguali(risultato.inizio, atteso.inizio),
            `"${espressione}": data inizio attesa ${this.parser.formatDate(atteso.inizio)}, ottenuta ${this.parser.formatDate(risultato.inizio)}`
        );

        // Verifica data fine se è un range
        if (atteso.tipo === 'range' && atteso.fine) {
            this.assert(
                this.dateUguali(risultato.fine, atteso.fine),
                `"${espressione}": data fine attesa ${this.parser.formatDate(atteso.fine)}, ottenuta ${this.parser.formatDate(risultato.fine)}`
            );
        }

        console.log(`✅ "${espressione}" → ${this.parser.formatRange(risultato)}`);
    }

    /**
     * Verifica che due date siano uguali (ignorando ore/minuti/secondi)
     */
    dateUguali(data1, data2) {
        const d1 = new Date(data1);
        const d2 = new Date(data2);
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);
        return d1.getTime() === d2.getTime();
    }

    /**
     * Assertion helper
     */
    assert(condizione, messaggio) {
        this.testsEseguiti++;
        
        if (condizione) {
            this.testsPassati++;
        } else {
            this.testsFalliti.push(messaggio);
            console.log(`❌ FALLITO: ${messaggio}`);
        }
    }

    /**
     * Stampa risultati finali
     */
    stampaRisultatiFinali() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RISULTATI FINALI TEST TEMPORAL PARSER');
        console.log('='.repeat(60));
        console.log(`✅ Test passati: ${this.testsPassati}/${this.testsEseguiti}`);
        console.log(`❌ Test falliti: ${this.testsFalliti.length}`);
        console.log(`📈 Percentuale successo: ${((this.testsPassati / this.testsEseguiti) * 100).toFixed(1)}%`);
        
        if (this.testsFalliti.length > 0) {
            console.log('\n🔍 DETTAGLIO FALLIMENTI:');
            this.testsFalliti.forEach((msg, i) => {
                console.log(`${i + 1}. ${msg}`);
            });
        } else {
            console.log('\n🎉 TUTTI I TEST SONO PASSATI!');
        }
    }

    /**
     * Test rapido per demo
     */
    demo() {
        console.log('\n🎭 DEMO TEMPORAL PARSER');
        console.log('='.repeat(40));
        
        const esempi = [
            'oggi', 'ieri', 'domani', 'settimana scorsa',
            'prossimo mese', '3 giorni fa', 'tra 5 giorni',
            'weekend', 'fine mese', 'ultimi 7 giorni'
        ];

        esempi.forEach(esempio => {
            const risultato = this.parser.parse(esempio);
            console.log(`📅 "${esempio}" → ${this.parser.formatRange(risultato)}`);
        });
    }
}

// Export per uso in Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemporalParserTester;
}

// Disponibile globalmente nel browser
if (typeof window !== 'undefined') {
    window.TemporalParserTester = TemporalParserTester;
    
    // Auto-esecuzione per test rapidi
    window.runTemporalTests = () => {
        const tester = new TemporalParserTester();
        return tester.runAllTests();
    };
    
    window.demoTemporalParser = () => {
        const tester = new TemporalParserTester();
        tester.demo();
    };
}

console.log('✅ TemporalParserTester caricato');
console.log('🧪 Usa window.runTemporalTests() per eseguire tutti i test');
console.log('🎭 Usa window.demoTemporalParser() per vedere una demo');