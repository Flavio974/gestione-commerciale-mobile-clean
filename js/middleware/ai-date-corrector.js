/**
 * AI DATE CORRECTOR - SOLUZIONE ESTREMA
 * Corregge BRUTALMENTE ogni risposta dell'AI che contiene date sbagliate
 * 
 * PROBLEMA: L'AI pensa che oggi sia novembre 2025, ma in realtà è luglio 2025
 * SOLUZIONE: Intercetta ogni risposta e correggi le date forzatamente
 */

class AIDateCorrector {
    constructor() {
        // ✅ TEMPORAL POLYFILL GUARD
        if (typeof Temporal === 'undefined') {
            console.warn('[ai-date-corrector] Polyfill Temporal mancante – script uscita sicura');
            return;
        }
        
        // LA DATA VERA - 11 LUGLIO 2025
        this.realToday = new Date(2025, 6, 11); // 6 = luglio (JS conta da 0)
        this.realTodayString = "11 luglio 2025";
        this.realTodayFormatted = "11/07/2025";
        
        // CORREZIONI AUTOMATICHE
        this.corrections = new Map([
            // Date completamente sbagliate
            ["7 novembre 2025", "11 luglio 2025"],
            ["07 novembre 2025", "11 luglio 2025"],
            ["07/11/2025", "11/07/2025"],
            ["2025-11-07", "2025-07-11"],
            ["novembre 2025", "luglio 2025"],
            ["november 2025", "luglio 2025"],
            ["07-11-2025", "11-07-2025"],
            
            // Varianti possibili
            ["oggi è il 7 novembre", "oggi è l'11 luglio"],
            ["oggi è 7 novembre", "oggi è 11 luglio"],
            ["il 7 novembre 2025", "l'11 luglio 2025"],
            ["venerdì 7 novembre", "giovedì 11 luglio"],
            
            // Ieri e domani sbagliati
            ["6 novembre 2025", "10 luglio 2025"],
            ["8 novembre 2025", "12 luglio 2025"],
            ["ieri, 6 novembre", "ieri, 10 luglio"],
            ["domani, 8 novembre", "domani, 12 luglio"],
            
            // Formati variabili  
            ["nov 2025", "lug 2025"],
            ["Nov 2025", "Lug 2025"],
            ["NOV 2025", "LUG 2025"],
            
            // Date ISO
            ["2025-11-06", "2025-07-10"],
            ["2025-11-07", "2025-07-11"],
            ["2025-11-08", "2025-07-12"]
        ]);
        
        // PATTERN REGEX PER CATCH-ALL
        this.datePatterns = [
            {
                pattern: /(\d{1,2})\s*\/\s*11\s*\/\s*2025/g,
                replacement: (match, day) => {
                    // Se il giorno è 7, diventa 11 luglio
                    if (day === '07' || day === '7') return '11/07/2025';
                    // Altrimenti mantieni il giorno ma cambia mese
                    return `${day}/07/2025`;
                }
            },
            {
                pattern: /novembre\s+2025/gi,
                replacement: 'luglio 2025'
            },
            {
                pattern: /november\s+2025/gi,
                replacement: 'luglio 2025'
            },
            {
                pattern: /2025\-11\-(\d{2})/g,
                replacement: (match, day) => `2025-07-${day}`
            }
        ];
        
        console.log('🔧 AIDateCorrector inizializzato - Correzione forzata date attiva');
        console.log('🎯 Data reale:', this.realTodayString);
        console.log('🔄 Correzioni configurate:', this.corrections.size);
    }
    
    /**
     * METODO PRINCIPALE: Corregge tutte le date sbagliate in una risposta AI
     */
    correctAIResponse(aiResponse) {
        if (!aiResponse || typeof aiResponse !== 'string') {
            return aiResponse;
        }
        
        let corrected = aiResponse;
        let corrections = 0;
        
        console.log('🔍 Analizzando risposta AI per date sbagliate...');
        console.log('📝 Originale:', aiResponse);
        
        // STEP 1: Correzioni esatte da mappa
        for (const [wrong, right] of this.corrections.entries()) {
            const regex = new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const newCorrected = corrected.replace(regex, right);
            if (newCorrected !== corrected) {
                corrections++;
                console.log(`✅ Corretta: "${wrong}" → "${right}"`);
                corrected = newCorrected;
            }
        }
        
        // STEP 2: Pattern regex avanzati
        for (const {pattern, replacement} of this.datePatterns) {
            const newCorrected = corrected.replace(pattern, replacement);
            if (newCorrected !== corrected) {
                corrections++;
                console.log(`🔧 Pattern corretto:`, pattern);
                corrected = newCorrected;
            }
        }
        
        // STEP 3: Controlli semantici specifici
        corrected = this.correctSemanticReferences(corrected);
        
        // STEP 4: Nuclear option - forza data corretta per query dirette
        if (this.isDirectDateQuery(aiResponse)) {
            corrected = this.forceCorrectDateResponse(corrected);
        }
        
        if (corrections > 0 || corrected !== aiResponse) {
            console.log('🔧 CORREZIONI APPLICATE:', corrections);
            console.log('📝 Corretto:', corrected);
        } else {
            console.log('✅ Nessuna correzione necessaria');
        }
        
        return corrected;
    }
    
    /**
     * Corregge riferimenti semantici (ieri, domani, etc.)
     */
    correctSemanticReferences(text) {
        let corrected = text;
        
        // Se parla di "oggi" e contiene date sbagliate
        if (text.toLowerCase().includes('oggi')) {
            // Forza la data corretta per "oggi"
            const todayPatterns = [
                /oggi è [\w\s]*novembre[\w\s]*2025/gi,
                /oggi è [\w\s]*nov[\w\s]*2025/gi,
                /oggi è il \d+[\s\/\-]11[\s\/\-]2025/gi
            ];
            
            for (const pattern of todayPatterns) {
                corrected = corrected.replace(pattern, `oggi è l'${this.realTodayString}`);
            }
        }
        
        // Correggi giorni della settimana se sbagliati
        if (text.includes('venerdì') && text.includes('novembre')) {
            // 7 novembre 2025 sarebbe venerdì, ma 11 luglio 2025 è giovedì
            corrected = corrected.replace(/venerdì[\s,]*\d*[\s\-\/]*novembre/gi, 'giovedì 11 luglio');
        }
        
        return corrected;
    }
    
    /**
     * Verifica se è una query diretta sulla data
     */
    isDirectDateQuery(response) {
        const directDateIndicators = [
            'che giorno è',
            'che data è',
            'oggi è',
            'la data di oggi',
            'data corrente'
        ];
        
        const lowerResponse = response.toLowerCase();
        return directDateIndicators.some(indicator => lowerResponse.includes(indicator));
    }
    
    /**
     * NUCLEAR OPTION: Forza risposta corretta per query dirette
     */
    forceCorrectDateResponse(response) {
        const lowerResponse = response.toLowerCase();
        
        // Se è una risposta su "che giorno è oggi"
        if (lowerResponse.includes('che giorno è') || lowerResponse.includes('oggi è')) {
            if (lowerResponse.includes('novembre') || lowerResponse.includes('07/11') || lowerResponse.includes('2025-11-07')) {
                console.log('🚨 NUCLEAR FIX: Forzando data corretta per query diretta');
                return `Oggi è giovedì, ${this.realTodayString}.`;
            }
        }
        
        // Se è una risposta su "che data è"
        if (lowerResponse.includes('che data è') || lowerResponse.includes('data di oggi')) {
            if (lowerResponse.includes('novembre') || lowerResponse.includes('11/07') || lowerResponse.includes('07/11')) {
                console.log('🚨 NUCLEAR FIX: Forzando data corretta per query data');
                return `Oggi è ${this.realTodayFormatted}.`;
            }
        }
        
        return response;
    }
    
    /**
     * Valida che una risposta non contenga date sbagliate
     */
    validateResponse(response) {
        const wrongDatePatterns = [
            /novembre\s+2025/i,
            /november\s+2025/i,
            /07[\/-]11[\/-]2025/,
            /2025[\/-]11[\/-]07/,
            /nov\s+2025/i,
            /11\/07\/2025/,  // Questo sarebbe giusto ma nell'ordine sbagliato
        ];
        
        for (const pattern of wrongDatePatterns) {
            if (pattern.test(response)) {
                console.error('⚠️ VALIDAZIONE FALLITA: Trovate ancora date sbagliate!');
                console.error('Pattern:', pattern);
                console.error('Testo:', response);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Crea un prompt forzato per l'AI
     */
    createForcedDatePrompt(userMessage) {
        const dateContext = `
🚨 ATTENZIONE SISTEMA AI: 
- La data di oggi è 11 LUGLIO 2025 (11/07/2025)
- NON è novembre! È LUGLIO!
- Ieri era il 10 luglio 2025
- Domani sarà il 12 luglio 2025
- Il giorno della settimana è giovedì
- USA SEMPRE queste date nelle tue risposte
- Formato date: DD/MM/YYYY (italiano)

MESSAGGIO UTENTE: ${userMessage}
`;
        
        return dateContext;
    }
    
    /**
     * Test automatico del sistema di correzione
     */
    test() {
        console.log('\n🧪 TEST SISTEMA CORREZIONE DATE');
        console.log('='.repeat(50));
        
        const testResponses = [
            "Oggi è il 7 novembre 2025",
            "La data corrente è 07/11/2025",
            "Oggi è venerdì, 7 novembre 2025",
            "Ieri era il 6 novembre 2025",
            "Domani sarà l'8 novembre 2025",
            "Siamo nel mese di novembre 2025",
            "La data ISO è 2025-11-07"
        ];
        
        testResponses.forEach((testResponse, index) => {
            console.log(`\n📝 Test ${index + 1}:`);
            console.log(`Input:  "${testResponse}"`);
            
            const corrected = this.correctAIResponse(testResponse);
            console.log(`Output: "${corrected}"`);
            
            const isValid = this.validateResponse(corrected);
            console.log(`Status: ${isValid ? '✅ OK' : '❌ FAIL'}`);
        });
        
        console.log('\n' + '='.repeat(50));
    }
    
    /**
     * Statistiche correzioni
     */
    getStats() {
        return {
            totalCorrections: this.corrections.size,
            patterns: this.datePatterns.length,
            realDate: this.realTodayString,
            formatted: this.realTodayFormatted
        };
    }
}

// Export per uso globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = new AIDateCorrector();
}

// Disponibile globalmente nel browser
if (typeof window !== 'undefined') {
    window.AIDateCorrector = AIDateCorrector;
    window.aiDateCorrector = new AIDateCorrector();
    
    // Funzioni di test rapide
    window.testDateCorrection = () => {
        window.aiDateCorrector.test();
    };
    
    window.correctAIText = (text) => {
        return window.aiDateCorrector.correctAIResponse(text);
    };
}

console.log('🔧 AIDateCorrector caricato - Correzione forzata date AI attiva');
console.log('🎯 Data corretta: 11 luglio 2025');
console.log('🧪 Usa window.testDateCorrection() per testare');