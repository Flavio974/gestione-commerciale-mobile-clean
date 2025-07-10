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
                keywords: ['che data è', 'data di oggi', 'data corrente', 'in che data siamo'],
                synonyms: ['che data', 'data attuale', 'oggi che data'],
                context: ['oggi', 'corrente', 'attuale', 'adesso', 'ora', 'siamo']
            },
            data_temporale: {
                keywords: ['che data sarà', 'che data avremo', 'che data era', 'che data avevamo', 'data sarà', 'data avremo', 'data di domani', 'data di ieri', 'tra giorni', 'tra settimane', 'tra mesi'],
                synonyms: ['domani che data', 'ieri che data', 'dopo domani che data', 'altro ieri che data', 'dimmi la data', 'tra un giorno', 'tra una settimana', 'tra un mese'],
                context: ['domani', 'ieri', 'dopo domani', 'altro ieri', 'ieri l\'altro', 'sarà', 'era', 'avremo', 'avevamo', 'la data di', 'dimmi la data', 'tra', 'giorni', 'settimane', 'mesi']
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
        
        // Ordina per confidenza
        return matches.sort((a, b) => b.confidence - a.confidence);
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
        
        // Base: presenza di dominio temporale
        if (temporalMatches.length > 0) {
            confidence += temporalMatches[0].confidence * 0.6;
        }
        
        // Bonus: presenza di pattern interrogativo
        if (questionIntent.detected) {
            confidence += questionIntent.confidence * 0.3;
        }
        
        // Bonus speciale: richieste dirette con time_modifiers o direct_request
        const hasTimeModifier = this.questionPatterns.time_modifiers.some(mod => fullText.includes(mod));
        const hasDirectRequest = this.questionPatterns.direct_request.some(req => fullText.includes(req));
        
        if (hasTimeModifier || hasDirectRequest) {
            confidence += 0.2; // Bonus extra per richieste dirette temporali
        }
        
        // Bonus: lunghezza appropriata (evita match accidentali)
        const wordCount = fullText.split(' ').length;
        if (wordCount >= 2 && wordCount <= 10) {
            confidence += 0.1;
        }
        
        // Penalty: testo troppo generico
        if (fullText.length < 5) {
            confidence *= 0.5;
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