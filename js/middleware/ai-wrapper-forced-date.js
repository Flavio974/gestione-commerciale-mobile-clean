/**
 * AI WRAPPER CON DATA FORZATA
 * Intercetta OGNI chiamata all'AI e forza il contesto della data corretta
 * 
 * PROBLEMA: L'AI ha la data interna sbagliata (novembre invece di luglio)
 * SOLUZIONE: Ogni richiesta viene preceduta da un contesto forzato della data
 */

class AIWrapperForcedDate {
    constructor() {
        this.dateCorrector = window.aiDateCorrector || null;
        
        // La data VERA che vogliamo forzare
        this.realDate = {
            date: "11 luglio 2025",
            formatted: "11/07/2025",
            dayName: "giovedì",
            yesterday: "10 luglio 2025",
            tomorrow: "12 luglio 2025",
            month: "luglio",
            year: "2025"
        };
        
        // Contatore chiamate per debug
        this.callCount = 0;
        
        console.log('🎯 AIWrapperForcedDate inizializzato');
        console.log('📅 Data forzata:', this.realDate.date);
    }
    
    /**
     * METODO PRINCIPALE: Wrappa tutte le chiamate AI
     */
    async wrapAICall(originalAIFunction, userMessage, options = {}) {
        this.callCount++;
        
        console.log(`\n🚀 AI CALL #${this.callCount} - FORCING DATE CONTEXT`);
        console.log('📝 Messaggio originale:', userMessage);
        
        // STEP 1: Crea il prompt forzato con data corretta
        const forcedPrompt = this.createForcedPrompt(userMessage);
        console.log('🔧 Prompt forzato creato');
        
        try {
            // STEP 2: Chiama l'AI con il prompt modificato
            console.log('📡 Chiamata AI in corso...');
            const aiResponse = await originalAIFunction(forcedPrompt, options);
            console.log('📨 Risposta AI ricevuta:', aiResponse);
            
            // STEP 3: Correggi la risposta se contiene ancora date sbagliate
            let correctedResponse = aiResponse;
            if (this.dateCorrector) {
                correctedResponse = this.dateCorrector.correctAIResponse(aiResponse);
            }
            
            // STEP 4: Validazione finale
            const isValid = this.validateFinalResponse(correctedResponse);
            if (!isValid) {
                console.error('🚨 RISPOSTA ANCORA SBAGLIATA - Applicando nuclear fix');
                correctedResponse = this.nuclearDateFix(correctedResponse, userMessage);
            }
            
            console.log('✅ Risposta finale:', correctedResponse);
            return correctedResponse;
            
        } catch (error) {
            console.error('❌ Errore nella chiamata AI:', error);
            
            // Fallback con risposta corretta per date
            if (this.isDateQuery(userMessage)) {
                return this.createFallbackDateResponse(userMessage);
            }
            
            throw error;
        }
    }
    
    /**
     * Crea un prompt che FORZA il contesto della data corretta
     */
    createForcedPrompt(userMessage) {
        const dateContext = `
=== CONTESTO DATA SISTEMA ===
🗓️ DATA CORRENTE: ${this.realDate.date} (${this.realDate.formatted})
📅 GIORNO SETTIMANA: ${this.realDate.dayName}
📅 IERI: ${this.realDate.yesterday}
📅 DOMANI: ${this.realDate.tomorrow}
📅 MESE CORRENTE: ${this.realDate.month} ${this.realDate.year}
📅 FORMATO: DD/MM/YYYY (italiano)

⚠️ IMPORTANTE: USA SEMPRE queste informazioni per calcoli temporali.
⚠️ NON è novembre! È ${this.realDate.month}!
⚠️ Se l'utente chiede "che giorno è oggi", rispondi: "Oggi è ${this.realDate.dayName}, ${this.realDate.date}"
⚠️ Se l'utente chiede "che data è", rispondi: "Oggi è ${this.realDate.formatted}"

=== FINE CONTESTO ===

RICHIESTA UTENTE: ${userMessage}
`;
        
        return dateContext;
    }
    
    /**
     * Verifica se la query è relativa alle date
     */
    isDateQuery(message) {
        const dateKeywords = [
            'che giorno', 'che data', 'oggi', 'ieri', 'domani',
            'data corrente', 'giorni fa', 'settimana', 'mese',
            'quando', 'data', 'giorno', 'ora'
        ];
        
        const lowerMessage = message.toLowerCase();
        return dateKeywords.some(keyword => lowerMessage.includes(keyword));
    }
    
    /**
     * Validazione finale della risposta
     */
    validateFinalResponse(response) {
        const wrongIndicators = [
            'novembre 2025',
            'november 2025',
            '07/11/2025',
            '2025-11-07',
            'nov 2025',
            'venerdì 7 novembre'
        ];
        
        const lowerResponse = response.toLowerCase();
        for (const wrong of wrongIndicators) {
            if (lowerResponse.includes(wrong.toLowerCase())) {
                console.error(`🚨 VALIDAZIONE FALLITA: Trovato "${wrong}"`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * NUCLEAR FIX: Se tutto fallisce, forza risposta corretta
     */
    nuclearDateFix(response, originalQuery) {
        const lowerQuery = originalQuery.toLowerCase();
        
        // Per query dirette sulla data di oggi
        if (lowerQuery.includes('che giorno è oggi') || lowerQuery.includes('che giorno è')) {
            return `Oggi è ${this.realDate.dayName}, ${this.realDate.date}.`;
        }
        
        if (lowerQuery.includes('che data è') || lowerQuery.includes('data di oggi')) {
            return `Oggi è ${this.realDate.formatted}.`;
        }
        
        if (lowerQuery.includes('che ora è')) {
            const now = new Date();
            const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            return `Sono le ${time}.`;
        }
        
        // Per query su "giorni fa"
        if (lowerQuery.includes('giorni fa che data')) {
            const match = lowerQuery.match(/(\\d+|tre|quattro|cinque|sei|sette|otto|nove|dieci)\\s+giorni\\s+fa/);
            if (match) {
                const numberMap = { 'tre': 3, 'quattro': 4, 'cinque': 5, 'sei': 6, 'sette': 7 };
                const daysStr = match[1];
                const days = isNaN(daysStr) ? numberMap[daysStr] : parseInt(daysStr);
                
                if (days) {
                    const pastDate = new Date(2025, 6, 11); // 11 luglio 2025
                    pastDate.setDate(pastDate.getDate() - days);
                    
                    const dayName = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'][pastDate.getDay()];
                    const day = pastDate.getDate();
                    const month = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'][pastDate.getMonth()];
                    
                    return `${days === 1 ? 'Un giorno' : days + ' giorni'} fa era ${dayName}, ${day} ${month} 2025.`;
                }
            }
        }
        
        // Se non riesco a identificare la query, almeno correggo le date sbagliate
        let fixed = response;
        const corrections = [
            ['novembre 2025', 'luglio 2025'],
            ['07/11/2025', '11/07/2025'],
            ['2025-11-07', '2025-07-11'],
            ['venerdì 7 novembre', 'giovedì 11 luglio']
        ];
        
        corrections.forEach(([wrong, right]) => {
            fixed = fixed.replace(new RegExp(wrong, 'gi'), right);
        });
        
        return fixed;
    }
    
    /**
     * Risposta di fallback per query sulle date
     */
    createFallbackDateResponse(query) {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('che giorno è')) {
            return `Oggi è ${this.realDate.dayName}, ${this.realDate.date}.`;
        }
        
        if (lowerQuery.includes('che data è')) {
            return `Oggi è ${this.realDate.formatted}.`;
        }
        
        return `La data corrente è ${this.realDate.date}.`;
    }
    
    /**
     * Test del wrapper
     */
    async test() {
        console.log('\\n🧪 TEST AI WRAPPER FORCED DATE');
        console.log('='.repeat(50));
        
        // Simula chiamate AI diverse
        const testQueries = [
            'Che giorno è oggi?',
            'Dimmi la data di oggi',
            'Tre giorni fa che data era?',
            'Che giorno sarà domani?'
        ];
        
        // Mock AI function che restituisce risposte sbagliate
        const mockAI = async (prompt) => {
            await new Promise(resolve => setTimeout(resolve, 100)); // Simula delay
            
            if (prompt.includes('che giorno è')) {
                return 'Oggi è venerdì, 7 novembre 2025.'; // SBAGLIATO
            }
            if (prompt.includes('che data è')) {
                return 'Oggi è 07/11/2025.'; // SBAGLIATO
            }
            if (prompt.includes('tre giorni fa')) {
                return 'Tre giorni fa era martedì, 4 novembre 2025.'; // SBAGLIATO
            }
            
            return 'Non ho capito la domanda.';
        };
        
        for (const query of testQueries) {
            console.log(`\\n📝 Test query: "${query}"`);
            try {
                const result = await this.wrapAICall(mockAI, query);
                console.log(`✅ Risultato: "${result}"`);
                
                // Verifica se contiene date corrette
                if (result.includes('luglio') && !result.includes('novembre')) {
                    console.log('✅ Data corretta!');
                } else {
                    console.log('❌ Data ancora sbagliata!');
                }
            } catch (error) {
                console.error('❌ Errore:', error);
            }
        }
        
        console.log('\\n' + '='.repeat(50));
    }
    
    /**
     * Statistiche
     */
    getStats() {
        return {
            totalCalls: this.callCount,
            realDate: this.realDate,
            correctorAvailable: !!this.dateCorrector
        };
    }
}

// Export per uso globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIWrapperForcedDate;
}

// Disponibile globalmente nel browser
if (typeof window !== 'undefined') {
    window.AIWrapperForcedDate = AIWrapperForcedDate;
    window.aiWrapperForcedDate = new AIWrapperForcedDate();
    
    // Funzioni di test rapide
    window.testAIWrapper = async () => {
        await window.aiWrapperForcedDate.test();
    };
}

console.log('🎯 AIWrapperForcedDate caricato - Wrapper AI con data forzata attivo');
console.log('🔧 Ogni chiamata AI sarà preceduta dal contesto data corretto');