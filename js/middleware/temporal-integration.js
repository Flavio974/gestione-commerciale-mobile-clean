/**
 * INTEGRAZIONE TEMPORAL PARSER NEL MIDDLEWARE
 * Sostituisce automaticamente espressioni temporali nei messaggi utente
 */

class TemporalIntegration {
    constructor() {
        // Verifica che TemporalParser sia disponibile
        if (typeof TemporalParser === 'undefined') {
            console.error('❌ TemporalParser non trovato! Assicurati che sia caricato prima.');
            return;
        }
        
        this.parser = new TemporalParser();
        this.enabled = true;
        this.debug = true;
        
        console.log('🔗 TemporalIntegration inizializzato');
    }

    /**
     * METODO PRINCIPALE - Processa un messaggio utente
     * Trova e sostituisce tutte le espressioni temporali
     */
    processMessage(messaggio) {
        if (!this.enabled || !messaggio || typeof messaggio !== 'string') {
            return {
                messaggioOriginale: messaggio,
                messaggioProcessato: messaggio,
                espressioniTrovate: [],
                sostituzioni: 0
            };
        }

        console.log('🔍 TEMPORAL INTEGRATION: Processando messaggio:', messaggio);

        // Trova tutte le espressioni temporali nel messaggio
        const espressioni = this.trovaEspressioniTemporali(messaggio);
        
        if (espressioni.length === 0) {
            if (this.debug) console.log('📝 Nessuna espressione temporale trovata');
            return {
                messaggioOriginale: messaggio,
                messaggioProcessato: messaggio,
                espressioniTrovate: [],
                sostituzioni: 0
            };
        }

        // Sostituisci ogni espressione con la data parsata
        let messaggioProcessato = messaggio;
        const sostituzioni = [];

        espressioni.forEach(expr => {
            const risultato = this.parser.parse(expr.testo);
            const dataFormattata = this.formatRisultatoPerMessaggio(risultato);
            
            // Sostituisci nel messaggio
            messaggioProcessato = messaggioProcessato.replace(expr.testo, dataFormattata);
            
            sostituzioni.push({
                originale: expr.testo,
                sostituito: dataFormattata,
                posizione: expr.posizione,
                risultatoParsing: risultato
            });

            if (this.debug) {
                console.log(`✅ "${expr.testo}" → "${dataFormattata}"`);
            }
        });

        const risultatoFinale = {
            messaggioOriginale: messaggio,
            messaggioProcessato: messaggioProcessato,
            espressioniTrovate: espressioni,
            sostituzioni: sostituzioni.length,
            dettagliSostituzioni: sostituzioni
        };

        console.log('📊 TEMPORAL INTEGRATION completato:', risultatoFinale);
        return risultatoFinale;
    }

    /**
     * Trova tutte le espressioni temporali in un testo
     */
    trovaEspressioniTemporali(testo) {
        const espressioni = [];
        const testoLower = testo.toLowerCase();

        // Lista di pattern da cercare (in ordine di priorità - più specifici prima)
        const patterns = [
            // Range complessi
            /\b(negli?\s+)?ultimi\s+\d+\s+(giorni?|settimane?|mesi?)\b/gi,
            /\b(nei\s+)?prossimi\s+\d+\s+(giorni?|settimane?|mesi?)\b/gi,
            /\b\d+\s+(giorni?|settimane?|mesi?)\s+(fa|addietro)\b/gi,
            /\b(tra|fra)\s+\d+\s+(giorni?|settimane?|mesi?)\b/gi,
            
            // Settimane
            /\b(la\s+)?settimana\s+(scorsa|passata|precedente)\b/gi,
            /\b(questa\s+settimana|settimana\s+corrente)\b/gi,
            /\b(la\s+)?(prossima\s+settimana|settimana\s+prossima)\b/gi,
            
            // Mesi
            /\b(il\s+)?(mese\s+(scorso|passato|precedente)|scorso\s+mese)\b/gi,
            /\b(questo\s+mese|mese\s+corrente)\b/gi,
            /\b(il\s+)?(prossimo\s+mese|mese\s+prossimo)\b/gi,
            
            // Giorni della settimana con qualificatori
            /\b(lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)\s+(scorso|passato|precedente|prossimo|venturo)\b/gi,
            
            // Espressioni speciali
            /\b(weekend|fine\s+settimana|week\s*end)\b/gi,
            /\b(fine\s+mese|ultimi\s+giorni\s+del\s+mese)\b/gi,
            /\b(l'altro\s+ieri|avantieri|altro\s+ieri)\b/gi,
            /\bdopodomani\b/gi,
            
            // Giorni relativi semplici (ultimi per evitare conflitti)
            /\boggi\b/gi,
            /\bieri\b/gi,
            /\bdomani\b/gi
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(testo)) !== null) {
                const espressione = {
                    testo: match[0],
                    posizione: match.index,
                    pattern: pattern.source
                };
                
                // Evita duplicati
                if (!espressioni.some(e => e.posizione === espressione.posizione)) {
                    espressioni.push(espressione);
                }
            }
        });

        // Ordina per posizione nel testo
        espressioni.sort((a, b) => a.posizione - b.posizione);

        if (this.debug && espressioni.length > 0) {
            console.log('🔍 Espressioni temporali trovate:', espressioni);
        }

        return espressioni;
    }

    /**
     * Formatta il risultato del parsing per inserirlo nel messaggio
     */
    formatRisultatoPerMessaggio(risultato) {
        if (risultato.tipo === 'data') {
            return this.parser.formatDate(risultato.inizio, 'dd/mm/yyyy');
        } else if (risultato.tipo === 'range') {
            return `dal ${this.parser.formatDate(risultato.inizio, 'dd/mm/yyyy')} al ${this.parser.formatDate(risultato.fine, 'dd/mm/yyyy')}`;
        } else {
            return this.parser.formatDate(this.parser.oggi, 'dd/mm/yyyy'); // fallback
        }
    }

    /**
     * Test del sistema di integrazione
     */
    test() {
        console.log('\n🧪 TEST TEMPORAL INTEGRATION');
        console.log('='.repeat(50));

        const frasiTest = [
            'Mostrami gli ordini di ieri',
            'Clienti visitati la settimana scorsa',
            'Fatturato di questo mese e quello scorso',
            'Appuntamenti per domani e dopodomani',
            'Riunione del venerdì prossimo',
            'Analisi vendite ultimi 30 giorni',
            'Previsioni per i prossimi 7 giorni',
            'Weekend siamo chiusi',
            'Fine mese facciamo inventario',
            'Tra 3 giorni scadenza',
            'Ho visto quel cliente 5 giorni fa'
        ];

        frasiTest.forEach(frase => {
            console.log(`\n📝 Input: "${frase}"`);
            const risultato = this.processMessage(frase);
            console.log(`📝 Output: "${risultato.messaggioProcessato}"`);
            console.log(`📊 Sostituzioni: ${risultato.sostituzioni}`);
        });
    }

    /**
     * Abilita/disabilita il sistema
     */
    toggle(enabled = null) {
        if (enabled !== null) {
            this.enabled = enabled;
        } else {
            this.enabled = !this.enabled;
        }
        
        console.log(`🔧 TemporalIntegration ${this.enabled ? 'ABILITATO' : 'DISABILITATO'}`);
        return this.enabled;
    }

    /**
     * Abilita/disabilita debug
     */
    setDebug(debug) {
        this.debug = debug;
        console.log(`🔍 Debug TemporalIntegration ${debug ? 'ON' : 'OFF'}`);
    }

    /**
     * Ottieni statistiche di utilizzo
     */
    getStats() {
        return {
            enabled: this.enabled,
            debug: this.debug,
            parserVersion: '1.0.0',
            supportedPatterns: Object.keys(this.parser.patterns).length
        };
    }
}

// Funzione helper per integrare facilmente nei middleware esistenti
function integraTemporalParser(messaggio) {
    if (!window.temporalIntegration) {
        window.temporalIntegration = new TemporalIntegration();
    }
    
    return window.temporalIntegration.processMessage(messaggio);
}

// Export per Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TemporalIntegration, integraTemporalParser };
}

// Disponibile globalmente nel browser
if (typeof window !== 'undefined') {
    window.TemporalIntegration = TemporalIntegration;
    window.integraTemporalParser = integraTemporalParser;
    
    // Inizializza automaticamente
    window.temporalIntegration = new TemporalIntegration();
    
    // Funzioni di test rapide
    window.testTemporalIntegration = () => {
        window.temporalIntegration.test();
    };
}

console.log('🔗 TemporalIntegration caricato e pronto');
console.log('🧪 Usa window.testTemporalIntegration() per testare');