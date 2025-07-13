/**
 * Semantic Intent Engine - Sistema di riconoscimento semantico intelligente
 * Sostituisce i pattern rigidi con comprensione del linguaggio naturale
 */

class SemanticIntentEngine {
    constructor() {
        // Definizioni semantiche dei domini temporali
        this.temporalDomains = {
            settimana: {
                keywords: ['settimana', 'week', 'settimane'],
                synonyms: ['sett', 'sett.', 'w'],
                context: ['numero', 'dell\'anno', 'corrente', 'questa', 'scorsa']
            },
            mese: {
                keywords: ['mese', 'month', 'mesi'],
                synonyms: ['mensile', 'mensili'],
                context: ['corrente', 'questo', 'scorso', 'dell\'anno']
            },
            trimestre: {
                keywords: ['trimestre', 'quarter', 'trimestri'],
                synonyms: ['q1', 'q2', 'q3', 'q4', 'primo', 'secondo', 'terzo', 'quarto'],
                context: ['corrente', 'questo', 'scorso', 'dell\'anno']
            },
            quadrimestre: {
                keywords: ['quadrimestre', 'quadrimestri'],
                synonyms: ['4mesi', 'quattro mesi'],
                context: ['corrente', 'questo', 'scorso', 'dell\'anno']
            },
            semestre: {
                keywords: ['semestre', 'semestri'],
                synonyms: ['6mesi', 'sei mesi', 'primo', 'secondo'],
                context: ['corrente', 'questo', 'scorso', 'dell\'anno']
            },
            anno: {
                keywords: ['anno', 'year', 'anni'],
                synonyms: ['annuale', 'annuali'],
                context: ['corrente', 'questo', 'scorso']
            },
            stagione: {
                keywords: ['stagione', 'season', 'stagioni'],
                synonyms: ['primavera', 'estate', 'autunno', 'inverno'],
                context: ['corrente', 'questa', 'scorsa']
            },
            giorno_settimana: {
                keywords: ['giorno della settimana', 'giorno settimana'],
                synonyms: ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'],
                context: ['oggi', 'corrente', 'questo', 'domani', 'sarà', 'che giorno', 'ieri', 'era', 'dopo domani', 'altro ieri', 'ieri l\'altro']
            },
            data_corrente: {
                keywords: ['che data è oggi', 'data di oggi', 'data corrente', 'in che data siamo', 'che giorno è oggi', 'dimmi che data è oggi', 'che data è', 'che data abbiamo'],
                synonyms: ['data attuale', 'oggi che data', 'che data abbiamo oggi', 'dimmi che data è'],
                context: ['oggi', 'corrente', 'attuale', 'adesso', 'ora', 'siamo', 'abbiamo', 'è']
            },
            data_temporale: {
                keywords: ['che data sarà', 'che data avremo', 'che data era', 'che data avevamo', 'data sarà', 'data avremo', 'data di domani', 'data di ieri', 'tra giorni', 'tra settimane', 'tra mesi', 'che data sarà domani', 'che data sarà dopo domani', 'che data avremo dopodomani', 'che data avremo dopo domani', 'tra un giorno', 'tra una settimana', 'tra un mese', 'tra due giorni', 'tra tre giorni', 'settimana prossima', 'mese prossimo', 'anno prossimo', 'settimana scorsa', 'mese scorso', 'anno scorso', 'fra poco', 'tra poco', 'a breve', 'stamattina', 'stasera', 'stanotte', 'domani che data avremo', 'che data avremo domani', 'ma domani che data avremo', 'dopodomani che data sarà', 'tra due giorni che data avremo', 'giorni fa che data era', 'giorni fa che data c\'era', 'tre giorni fa', 'sette giorni fa', 'un giorno fa', 'due giorni fa', 'quattro giorni fa', 'cinque giorni fa'],
                synonyms: ['domani che data', 'ieri che data', 'dopo domani che data', 'altro ieri che data', 'dimmi la data', 'tra un giorno', 'tra una settimana', 'tra un mese', 'fra giorni', 'fra settimane', 'fra mesi', 'data domani', 'data ieri', 'la prossima settimana', 'il prossimo mese', 'il prossimo anno', 'la scorsa settimana', 'il mese scorso', 'l\'anno scorso', 'stamani', 'data avremo domani', 'avremo domani', 'data di domani', 'che data era', 'la data di', 'giorni fa', 'fa che data'],
                context: ['domani', 'ieri', 'dopo domani', 'altro ieri', 'ieri l\'altro', 'sarà', 'era', 'avremo', 'avevamo', 'la data di', 'dimmi la data', 'tra', 'fra', 'giorni', 'settimane', 'mesi', 'anni', 'ore', 'minuti', 'un', 'una', 'due', 'tre', 'quattro', 'cinque', 'prossima', 'prossimo', 'scorsa', 'scorso', 'poco', 'breve', 'mattina', 'sera', 'notte', 'ma', 'fa']
            }
        };

        // Parole interrogative e contesto
        this.questionPatterns = {
            interrogative: ['che', 'quale', 'quali', 'cosa', 'come', 'quando'],
            locative: ['in che', 'nel', 'nella', 'dentro', 'all\'interno'],
            request: ['dimmi', 'dicci', 'spiegami', 'voglio sapere', 'mi serve', 'ho bisogno', 'che data è', 'che data è oggi', 'che data sarà', 'che data era'],
            state: ['siamo', 'sono', 'è', 'ci troviamo', 'stiamo', 'sarà', 'era', 'avremo'],
            time_modifiers: ['adesso', 'ora', 'attualmente', 'in questo momento', 'oggi', 'corrente', 'attuale', 'domani', 'ieri', 'dopo domani', 'altro ieri', 'ieri l\'altro'],
            direct_request: ['per favore', 'per cortesia', 'grazie', 'prego', 'per piacere']
        };

        console.log('🧠 SemanticIntentEngine inizializzato');
    }

    /**
     * Analizza il testo per riconoscere intent temporali
     */
    analyzeTemporalIntent(text) {
        const normalizedText = this.normalizeText(text);
        const words = normalizedText.split(/\s+/);
        
        console.log('🔍 SEMANTIC ANALYSIS:', {
            originalText: text,
            normalizedText: normalizedText,
            words: words
        });

        // Cerca domini temporali
        const temporalMatches = this.findTemporalDomains(words, normalizedText);
        
        // Cerca pattern interrogativi
        const questionIntent = this.detectQuestionIntent(words, normalizedText);
        
        // Calcola confidenza complessiva
        const confidence = this.calculateConfidence(temporalMatches, questionIntent, normalizedText);
        
        const result = {
            hasTemporal: temporalMatches.length > 0,
            hasQuestion: questionIntent.detected,
            domains: temporalMatches,
            questionType: questionIntent.type,
            confidence: confidence,
            isTemporalQuery: confidence > 0.7
        };

        console.log('🧠 SEMANTIC RESULT:', result);
        return result;
    }

    /**
     * Normalizza il testo per l'analisi
     */
    normalizeText(text) {
        return text.toLowerCase()
                  .trim()
                  .replace(/[^\w\s']/g, ' ')  // Rimuovi punteggiatura ma mantieni apostrofi
                  .replace(/\s+/g, ' ')       // Normalizza spazi
                  .replace(/'/g, '\'');       // Normalizza apostrofi
    }

    /**
     * Trova domini temporali nel testo
     */
    findTemporalDomains(words, fullText) {
        const matches = [];
        
        for (const [domain, config] of Object.entries(this.temporalDomains)) {
            const score = this.scoreDomain(domain, config, words, fullText);
            
            if (score.confidence > 0.5) {
                matches.push({
                    domain: domain,
                    confidence: score.confidence,
                    triggers: score.triggers,
                    contextMatch: score.contextMatch
                });
            }
        }
        
        // PRIORITÀ: Se ci sono marker temporali, metti data_temporale in cima
        const hasTemporalMarkers = fullText.includes('domani') || 
                                  fullText.includes('ieri') || 
                                  fullText.includes('dopodomani') || 
                                  fullText.includes('dopo domani') || 
                                  fullText.includes('altro ieri') || 
                                  fullText.includes('ieri l\'altro') ||
                                  fullText.includes('sarà') ||
                                  fullText.includes('avremo') ||
                                  fullText.includes('era') ||
                                  fullText.includes('avevamo') ||
                                  fullText.includes('tra') ||
                                  fullText.includes('fra') ||
                                  /\d+\s+giorni\s+fa/.test(fullText) ||
                                  /(un|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+giorni?\s+fa/.test(fullText);
        
        if (hasTemporalMarkers) {
            // Metti data_temporale per primo se presente
            matches.sort((a, b) => {
                if (a.domain === 'data_temporale' && b.domain !== 'data_temporale') return -1;
                if (b.domain === 'data_temporale' && a.domain !== 'data_temporale') return 1;
                return b.confidence - a.confidence;
            });
        } else {
            // Ordina per confidenza normale
            matches.sort((a, b) => b.confidence - a.confidence);
        }
        
        return matches;
    }

    /**
     * Calcola score per un dominio specifico
     */
    scoreDomain(domain, config, words, fullText) {
        let score = 0;
        let triggers = [];
        let contextMatch = false;
        
        // Controlla keywords principali
        for (const keyword of config.keywords) {
            if (fullText.includes(keyword)) {
                score += 1.0;
                triggers.push(keyword);
            }
        }
        
        // Controlla sinonimi (peso minore)
        for (const synonym of config.synonyms) {
            if (fullText.includes(synonym)) {
                score += 0.5;
                triggers.push(synonym);
            }
        }
        
        // Controlla contesto (aumenta confidenza)
        for (const context of config.context) {
            if (fullText.includes(context)) {
                score += 0.3;
                contextMatch = true;
            }
        }
        
        // Normalizza score (max 1.0)
        const confidence = Math.min(score, 1.0);
        
        return {
            confidence: confidence,
            triggers: triggers,
            contextMatch: contextMatch
        };
    }

    /**
     * Rileva intent interrogativo
     */
    detectQuestionIntent(words, fullText) {
        let questionScore = 0;
        let questionType = 'unknown';
        
        // Controlla parole interrogative
        for (const [type, patterns] of Object.entries(this.questionPatterns)) {
            for (const pattern of patterns) {
                if (fullText.includes(pattern)) {
                    questionScore += 1.0;
                    questionType = type;
                    break;
                }
            }
        }
        
        return {
            detected: questionScore > 0,
            type: questionType,
            confidence: Math.min(questionScore, 1.0)
        };
    }

    /**
     * Calcola confidenza complessiva
     */
    calculateConfidence(temporalMatches, questionIntent, fullText) {
        let confidence = 0;
        
        // SPECIALE: Priorità per data temporale con marker temporali
        const hasTemporalMarkers = fullText.includes('domani') || 
                                  fullText.includes('ieri') || 
                                  fullText.includes('dopodomani') || 
                                  fullText.includes('dopo domani') || 
                                  fullText.includes('altro ieri') || 
                                  fullText.includes('ieri l\'altro') ||
                                  fullText.includes('sarà') ||
                                  fullText.includes('avremo') ||
                                  fullText.includes('era') ||
                                  fullText.includes('avevamo') ||
                                  fullText.includes('tra') ||
                                  fullText.includes('fra') ||
                                  /\d+\s+giorni\s+fa/.test(fullText) ||
                                  /(un|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+giorni?\s+fa/.test(fullText);
        
        // Se ha marker temporali e c'è un match data_temporale, forza alta confidenza
        if (hasTemporalMarkers && temporalMatches.length > 0 && temporalMatches[0].domain === 'data_temporale') {
            return 1.0; // Massima confidenza per richieste temporali con marker
        }
        
        // SPECIALE: Se contiene pattern "X giorni fa", forza data_temporale
        const hasGiorniFaPattern = /\d+\s+giorni\s+fa/.test(fullText) ||
                                  /(un|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+giorni?\s+fa/.test(fullText);
        if (hasGiorniFaPattern && temporalMatches.length > 0) {
            // Trova data_temporale nei match
            const temporaleMatch = temporalMatches.find(m => m.domain === 'data_temporale');
            if (temporaleMatch) {
                return 1.0; // Massima confidenza per pattern "giorni fa"
            }
        }

        // Se NON ha marker temporali e contiene SOLO "che data è", forza data_corrente
        const isGenericDataQuestion = fullText.includes('che data è') && !hasTemporalMarkers &&
                                     !fullText.includes('sarà') && !fullText.includes('avremo') &&
                                     !fullText.includes('era') && !fullText.includes('avevamo') &&
                                     !hasGiorniFaPattern;
        if (isGenericDataQuestion && temporalMatches.length > 0 && temporalMatches[0].domain === 'data_corrente') {
            return 1.0; // Massima confidenza per data corrente generica
        }
        
        // Base: presenza di dominio temporale
        if (temporalMatches.length > 0) {
            confidence += temporalMatches[0].confidence * 0.7; // Aumentato da 0.6 a 0.7
        }
        
        // Bonus: presenza di pattern interrogativo
        if (questionIntent.detected) {
            confidence += questionIntent.confidence * 0.2; // Ridotto da 0.3 a 0.2
        }
        
        // Bonus speciale: richieste dirette con time_modifiers o direct_request
        const hasTimeModifier = this.questionPatterns.time_modifiers.some(mod => fullText.includes(mod));
        const hasDirectRequest = this.questionPatterns.direct_request.some(req => fullText.includes(req));
        
        if (hasTimeModifier || hasDirectRequest) {
            confidence += 0.15; // Ridotto da 0.2 a 0.15
        }
        
        // Bonus per pattern "tra/fra X tempo"
        const hasRelativePattern = /(tra|fra)\s+(\d+|un|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+(giorni?|giorno|settimane?|settimana|mesi?|mese)/i.test(fullText);
        if (hasRelativePattern) {
            confidence += 0.2; // Bonus per pattern relativi
        }
        
        // Bonus: lunghezza appropriata (evita match accidentali)
        const wordCount = fullText.split(' ').length;
        if (wordCount >= 2 && wordCount <= 15) { // Esteso da 10 a 15 parole
            confidence += 0.05; // Ridotto da 0.1 a 0.05
        }
        
        // Penalty ridotta: testo troppo generico
        if (fullText.length < 3) { // Ridotto da 5 a 3
            confidence *= 0.7; // Meno penalizzante (era 0.5)
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * Ottiene il miglior match temporale
     */
    getBestTemporalMatch(text) {
        const analysis = this.analyzeTemporalIntent(text);
        
        if (analysis.isTemporalQuery && analysis.domains.length > 0) {
            return {
                domain: analysis.domains[0].domain,
                confidence: analysis.confidence,
                isValid: true,
                details: analysis
            };
        }
        
        return {
            domain: null,
            confidence: 0,
            isValid: false,
            details: analysis
        };
    }

    /**
     * Test del sistema con esempi
     */
    runTests() {
        console.log('🧪 TESTING Semantic Intent Engine...');
        
        const testCases = [
            'quale trimestre',
            'che mese siamo',
            'dimmi in che settimana siamo',
            'voglio sapere il trimestre corrente',
            'mi dici che stagione è',
            'anno attuale per favore',
            'settimana corrente per cortesia',
            'in che quadrimestre ci troviamo',
            'settimana numero 5',
            'mese attuale grazie',
            'semestre corrente prego',
            'domani che giorno della settimana sarà',
            'che giorno sarà domani',
            'dopo domani che giorno sarà',
            'che giorno sarà dopo domani',
            'ieri che giorno della settimana era',
            'che giorno era ieri',
            'altro ieri che giorno era',
            'ieri l\'altro che giorno era',
            'che data è',
            'che data è oggi',
            'data di oggi',
            'dimmi che data è',
            // NUOVI TEST per data + temporale
            'che data sarà domani',
            'che data avremo domani',
            'domani che data sarà',
            'che data era ieri',
            'che data avevamo ieri',
            'ieri che data era',
            'che data sarà dopo domani',
            'dopo domani che data sarà',
            'che data era l\'altro ieri',
            'che data avevamo l\'altro ieri',
            'l\'altro ieri che data era',
            // NUOVI TEST per "tra X giorni/settimane/mesi"
            'che data avremo tra 7 giorni',
            'che data sarà tra 3 giorni',
            'tra 5 giorni che data sarà',
            'che data avremo tra 2 settimane',
            'tra una settimana che data sarà',
            'che data avremo tra 3 mesi',
            'tra un mese che data sarà',
            'tra 10 giorni',
            // NUOVI TEST per verificare fix pattern
            'che data è',
            'dimmi che data è',
            'che data sarà domani',
            'che data abbiamo oggi',
            'che data abbiamo',
            'fra un mese che data sarà',
            'fra 15 giorni',
            'fra una settimana',
            'tra due settimane',
            'tra tre mesi',
            'ciao come stai',  // Dovrebbe fallire
            'ordini del cliente'  // Dovrebbe fallire
        ];
        
        testCases.forEach(testCase => {
            const result = this.getBestTemporalMatch(testCase);
            console.log(`📝 "${testCase}" → ${result.isValid ? result.domain : 'NO MATCH'} (${result.confidence.toFixed(2)})`);
        });
    }
}

// Export per uso globale
window.SemanticIntentEngine = SemanticIntentEngine;

// Auto-inizializzazione per test immediato
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (!window.semanticEngine) {
            window.semanticEngine = new SemanticIntentEngine();
        }
        
        // Test automatico se in modalità debug
        if (localStorage.getItem('debug_semantic') === 'true') {
            window.semanticEngine.runTests();
        }
        
        console.log('✅ SemanticIntentEngine disponibile globalmente come window.semanticEngine');
        console.log('🧪 Per testare: window.semanticEngine.runTests()');
    } catch (error) {
        console.error('❌ Errore inizializzazione SemanticIntentEngine:', error);
    }
});

// Inizializzazione manuale di fallback
window.initSemanticEngine = function() {
    try {
        if (!window.semanticEngine) {
            window.semanticEngine = new SemanticIntentEngine();
            console.log('✅ SemanticIntentEngine inizializzato manualmente');
        }
        return window.semanticEngine;
    } catch (error) {
        console.error('❌ Errore inizializzazione manuale SemanticIntentEngine:', error);
        return null;
    }
};