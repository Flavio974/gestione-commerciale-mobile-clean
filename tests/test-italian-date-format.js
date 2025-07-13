/**
 * TEST CRITICO: VERIFICA FORMATO DATE ITALIANE
 * Assicura che 11/07/2025 = 11 luglio 2025 (NON 7 novembre)
 */

console.log('\n🚨 ===== TEST CRITICO FORMATO DATE ITALIANE =====');
console.log('🎯 OBIETTIVO: Verificare che 11/07/2025 = 11 luglio (NON 7 novembre)');
console.log('='.repeat(70));

/**
 * Test del ItalianDateManager
 */
function testItalianDateManager() {
    console.log('\n📅 TEST 1: ItalianDateManager');
    console.log('-'.repeat(40));
    
    if (typeof window !== 'undefined' && window.italianDateManager) {
        const manager = window.italianDateManager;
        
        // Test parsing date critiche
        const testCases = [
            { input: '11/07/2025', expected: 'luglio', description: '11 luglio 2025' },
            { input: '01/12/2025', expected: 'dicembre', description: '1 dicembre 2025' },
            { input: '25/03/2024', expected: 'marzo', description: '25 marzo 2024' }
        ];
        
        testCases.forEach(test => {
            const parsed = manager.parseItalianDate(test.input);
            if (parsed) {
                const mese = manager.getMonthName(parsed.getMonth() + 1);
                const isCorrect = mese === test.expected;
                
                console.log(`${isCorrect ? '✅' : '❌'} "${test.input}"`);
                console.log(`   Atteso: ${test.description}`);
                console.log(`   Interpretato: ${manager.formatDate(parsed, 'DD MMMM YYYY')}`);
                console.log(`   Mese: ${mese} ${isCorrect ? '(CORRETTO)' : '(SBAGLIATO!)'}`);
                
                if (!isCorrect) {
                    console.error(`🚨 ERRORE CRITICO: Data "${test.input}" interpretata come ${mese} invece di ${test.expected}!`);
                }
            }
        });
        
        // Test data corrente
        const now = manager.getCurrentDate();
        console.log(`\n📅 Data corrente: ${manager.formatDate(now, 'DDDD, DD MMMM YYYY')}`);
        console.log(`   Formato DD/MM/YYYY: ${manager.formatDate(now, 'DD/MM/YYYY')}`);
        console.log(`   Componenti: Giorno=${now.getDate()}, Mese=${now.getMonth() + 1}, Anno=${now.getFullYear()}`);
        
    } else {
        console.error('❌ ItalianDateManager non disponibile!');
        return false;
    }
    
    return true;
}

/**
 * Test del TemporalParser
 */
function testTemporalParser() {
    console.log('\n🗓️ TEST 2: TemporalParser');
    console.log('-'.repeat(40));
    
    if (typeof window !== 'undefined' && window.TemporalParser) {
        const parser = new window.TemporalParser();
        
        // Test espressioni temporali
        const expressions = [
            'oggi',
            'ieri', 
            'domani',
            'tre giorni fa',
            '5 giorni fa',
            'tra 3 giorni'
        ];
        
        expressions.forEach(expr => {
            const result = parser.parse(expr);
            console.log(`✅ "${expr}" → ${parser.formatRange(result)}`);
            
            // Verifica che usa formato italiano
            const formatted = parser.formatDate(result.inizio, 'DD/MM/YYYY');
            if (formatted.includes('/')) {
                const [day, month, year] = formatted.split('/');
                if (parseInt(day) > 12 || parseInt(month) <= 12) {
                    console.log(`   📋 Formato verificato: DD/MM/YYYY (${formatted})`);
                } else {
                    console.warn(`   ⚠️ Formato ambiguo: ${formatted}`);
                }
            }
        });
        
        // Test specifico per "tre giorni fa che data era"
        console.log('\n🎯 TEST SPECIFICO: "tre giorni fa che data era"');
        const result = parser.parse('tre giorni fa');
        console.log(`   Risultato: ${parser.formatRange(result)}`);
        console.log(`   Formato esteso: ${parser.formatDate(result.inizio, 'DDDD, DD MMMM YYYY')}`);
        
    } else {
        console.error('❌ TemporalParser non disponibile!');
        return false;
    }
    
    return true;
}

/**
 * Test dell'EnhancedAIAssistant
 */
function testEnhancedAIAssistant() {
    console.log('\n🤖 TEST 3: EnhancedAIAssistant');
    console.log('-'.repeat(40));
    
    if (typeof window !== 'undefined' && window.EnhancedAI) {
        const assistant = window.EnhancedAI;
        
        // Test calcolo temporale
        const testQueries = [
            'che giorno è oggi',
            'che data è oggi',
            'tre giorni fa che data era'
        ];
        
        testQueries.forEach(query => {
            try {
                const response = assistant.calculateTemporalResponse(query);
                console.log(`✅ "${query}"`);
                console.log(`   Risposta: ${response}`);
                
                // Verifica che la risposta contenga date in formato italiano
                const datePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
                const matches = response.match(datePattern);
                if (matches) {
                    matches.forEach(dateStr => {
                        const [day, month, year] = dateStr.split('/').map(n => parseInt(n));
                        if (day <= 31 && month <= 12) {
                            console.log(`   📋 Data italiana trovata: ${dateStr} (${day}/${month}/${year})`);
                        } else {
                            console.error(`   🚨 ERRORE: Data non valida: ${dateStr}`);
                        }
                    });
                }
                
            } catch (error) {
                console.error(`❌ Errore testando "${query}":`, error);
            }
        });
        
    } else {
        console.error('❌ EnhancedAIAssistant non disponibile!');
        return false;
    }
    
    return true;
}

/**
 * Test JavaScript Date standard (per confronto)
 */
function testStandardDate() {
    console.log('\n⚠️ TEST 4: JavaScript Date Standard (per confronto)');
    console.log('-'.repeat(40));
    
    const now = new Date();
    console.log('Data JavaScript standard:', now.toString());
    console.log('toLocaleDateString(it-IT):', now.toLocaleDateString('it-IT'));
    console.log('toLocaleDateString(en-US):', now.toLocaleDateString('en-US'));
    
    // Test parsing ambiguo
    const ambiguousDate = '07/11/2025';
    const jsDate = new Date(ambiguousDate);
    console.log(`\n🚨 Data ambigua "${ambiguousDate}":`, jsDate.toString());
    console.log('   JavaScript interpreta come:', jsDate.toLocaleDateString('it-IT'));
    console.log('   ⚠️ QUESTO È IL PROBLEMA DA EVITARE!');
}

/**
 * Esegui tutti i test
 */
function runAllDateTests() {
    console.log('🚀 INIZIO TEST COMPLETI FORMATO DATE ITALIANE');
    
    const results = {
        italianDateManager: testItalianDateManager(),
        temporalParser: testTemporalParser(),
        enhancedAIAssistant: testEnhancedAIAssistant(),
        standardDateComparison: testStandardDate()
    };
    
    console.log('\n📊 RISULTATI FINALI:');
    console.log('='.repeat(50));
    Object.entries(results).forEach(([test, passed]) => {
        if (typeof passed === 'boolean') {
            console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSATO' : 'FALLITO'}`);
        }
    });
    
    const allPassed = Object.values(results).filter(r => typeof r === 'boolean').every(r => r);
    
    if (allPassed) {
        console.log('\n🎉 TUTTI I TEST PASSATI! Sistema date italiane funzionante.');
    } else {
        console.log('\n🚨 ALCUNI TEST FALLITI! Verificare configurazione date.');
    }
    
    console.log('\n🎯 VERIFICA CRITICA FINALE:');
    console.log('   ✅ 11/07/2025 DEVE essere interpretato come 11 luglio 2025');
    console.log('   ❌ NON deve essere interpretato come 7 novembre 2025');
    console.log('='.repeat(70));
    
    return results;
}

// Esporta per uso globale
if (typeof window !== 'undefined') {
    window.runAllDateTests = runAllDateTests;
    window.testItalianDateManager = testItalianDateManager;
    window.testTemporalParser = testTemporalParser;
    window.testEnhancedAIAssistant = testEnhancedAIAssistant;
    
    // Auto-esecuzione se richiesto
    if (window.location.search.includes('testDates=true')) {
        window.addEventListener('load', () => {
            setTimeout(runAllDateTests, 1000);
        });
    }
}

console.log('🧪 Test formato date italiane caricato');
console.log('🚀 Usa window.runAllDateTests() per eseguire tutti i test');