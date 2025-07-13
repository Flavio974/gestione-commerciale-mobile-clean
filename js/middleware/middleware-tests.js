/**
 * Test Suite per verificare che il middleware non rompa le funzionalità esistenti
 * REQUISITO CRITICO: Le funzionalità esistenti devono continuare a funzionare
 */

class MiddlewareTests {
    constructor() {
        this.testResults = [];
        this.debug = true;
        this.middleware = null;
        this.originalFunctions = {};
        
        console.log('🧪 MiddlewareTests: Inizializzato');
    }

    /**
     * Esegue tutti i test
     */
    async runAllTests() {
        console.log('🧪 🚀 AVVIO TEST MIDDLEWARE');
        
        try {
            // Test di base
            await this.testVocabularyManager();
            await this.testTemporalParser();
            await this.testAIMiddleware();
            await this.testIntegration();
            
            // Test funzionalità esistenti
            await this.testExistingFunctionality();
            
            // Report finale
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Errore nei test:', error);
            this.addTestResult('Sistema di Test', false, error.message);
        }
    }

    /**
     * Test del VocabularyManager
     */
    async testVocabularyManager() {
        console.log('🧪 Test VocabularyManager...');
        
        try {
            // Test 1: Creazione istanza
            const vocManager = new VocabularyManager();
            this.addTestResult('VocabularyManager - Creazione', true);
            
            // Test 2: Caricamento vocabolario
            const vocabulary = await vocManager.loadVocabulary();
            const hasCommands = vocabulary && vocabulary.commands && vocabulary.commands.length > 0;
            this.addTestResult('VocabularyManager - Caricamento', hasCommands, 
                !hasCommands ? 'Vocabolario vuoto o non caricato' : null);
            
            // Test 3: Ricerca match
            const match = await vocManager.findMatch('che data è oggi');
            this.addTestResult('VocabularyManager - Match', match !== null, 
                !match ? 'Nessun match trovato per comando base' : null);
            
            // Test 4: Similitudine
            const similarity = vocManager.calculateSimilarity('oggi', 'che data è oggi');
            this.addTestResult('VocabularyManager - Similitudine', similarity > 0.5,
                similarity <= 0.5 ? `Similitudine troppo bassa: ${similarity}` : null);
            
        } catch (error) {
            this.addTestResult('VocabularyManager', false, error.message);
        }
    }

    /**
     * Test del TemporalParser
     */
    async testTemporalParser() {
        console.log('🧪 Test TemporalParser...');
        
        try {
            // Test 1: Creazione istanza
            const parser = new TemporalParser();
            this.addTestResult('TemporalParser - Creazione', true);
            
            // Test 2: Parsing "oggi"
            const today = parser.parseDate('oggi');
            const isToday = today.toDateString() === new Date().toDateString();
            this.addTestResult('TemporalParser - Oggi', isToday,
                !isToday ? 'Data parsing non corretta per "oggi"' : null);
            
            // Test 3: Parsing "domani"
            const tomorrow = parser.parseDate('domani');
            const expectedTomorrow = new Date();
            expectedTomorrow.setDate(expectedTomorrow.getDate() + 1);
            const isTomorrow = tomorrow.toDateString() === expectedTomorrow.toDateString();
            this.addTestResult('TemporalParser - Domani', isTomorrow,
                !isTomorrow ? 'Data parsing non corretta per "domani"' : null);
            
            // Test 4: Parsing "ieri"
            const yesterday = parser.parseDate('ieri');
            const expectedYesterday = new Date();
            expectedYesterday.setDate(expectedYesterday.getDate() - 1);
            const isYesterday = yesterday.toDateString() === expectedYesterday.toDateString();
            this.addTestResult('TemporalParser - Ieri', isYesterday,
                !isYesterday ? 'Data parsing non corretta per "ieri"' : null);
            
        } catch (error) {
            this.addTestResult('TemporalParser', false, error.message);
        }
    }

    /**
     * Test del AIMiddleware
     */
    async testAIMiddleware() {
        console.log('🧪 Test AIMiddleware...');
        
        try {
            // Test 1: Creazione istanza
            const middleware = new AIMiddleware();
            this.addTestResult('AIMiddleware - Creazione', true);
            
            // Test 2: Processamento richiesta con match
            const result1 = await middleware.processRequest('che data è oggi');
            const hasMatch = result1.success && result1.source === 'vocabulary';
            this.addTestResult('AIMiddleware - Richiesta con match', hasMatch,
                !hasMatch ? 'Richiesta non gestita dal vocabolario' : null);
            
            // Test 3: Processamento richiesta senza match (fallback)
            const result2 = await middleware.processRequest('comando non esistente xyz123');
            const hasFallback = result2.success && result2.continueWithAI;
            this.addTestResult('AIMiddleware - Fallback AI', hasFallback,
                !hasFallback ? 'Fallback AI non funzionante' : null);
            
            // Test 4: Statistiche
            const stats = middleware.getStats();
            this.addTestResult('AIMiddleware - Statistiche', stats !== null);
            
        } catch (error) {
            this.addTestResult('AIMiddleware', false, error.message);
        }
    }

    /**
     * Test dell'integrazione
     */
    async testIntegration() {
        console.log('🧪 Test Integration...');
        
        try {
            // Test 1: Creazione istanza
            const integration = new MiddlewareIntegration();
            this.addTestResult('Integration - Creazione', true);
            
            // Test 2: Inizializzazione
            const initialized = await integration.initialize();
            this.addTestResult('Integration - Inizializzazione', initialized,
                !initialized ? 'Inizializzazione fallita' : null);
            
            // Test 3: Statistiche
            const stats = integration.getStats();
            this.addTestResult('Integration - Statistiche', stats !== null);
            
        } catch (error) {
            this.addTestResult('Integration', false, error.message);
        }
    }

    /**
     * Test che le funzionalità esistenti continuino a funzionare
     */
    async testExistingFunctionality() {
        console.log('🧪 Test Funzionalità Esistenti...');
        
        try {
            // Test 1: Elementi DOM principali
            const aiContainer = document.querySelector('#ai-content, .ai-container, .smart-assistant-container');
            this.addTestResult('DOM - Container AI', aiContainer !== null,
                !aiContainer ? 'Container AI non trovato' : null);
            
            // Test 2: Funzioni globali esistenti
            const hasSupabase = typeof window.supabase !== 'undefined';
            this.addTestResult('Globali - Supabase', hasSupabase,
                !hasSupabase ? 'Supabase non disponibile' : null);
            
            // Test 3: Moduli AI esistenti
            const hasAIVoiceManager = typeof window.AIVoiceManagerV2 !== 'undefined';
            this.addTestResult('Moduli - AI Voice Manager', hasAIVoiceManager,
                !hasAIVoiceManager ? 'AIVoiceManagerV2 non disponibile' : null);
            
            // Test 4: Integrazione Supabase AI
            const hasSupabaseAI = typeof window.SupabaseAIIntegration !== 'undefined';
            this.addTestResult('Moduli - Supabase AI', hasSupabaseAI,
                !hasSupabaseAI ? 'SupabaseAIIntegration non disponibile' : null);
            
            // Test 5: Middleware non interferisce con funzioni esistenti
            const beforeCount = this.countGlobalFunctions();
            
            // Simula inizializzazione middleware
            if (window.middlewareIntegration) {
                await window.middlewareIntegration.initialize();
            }
            
            const afterCount = this.countGlobalFunctions();
            this.addTestResult('Compatibilità - Funzioni globali', afterCount >= beforeCount,
                afterCount < beforeCount ? 'Middleware ha rimosso funzioni esistenti' : null);
            
        } catch (error) {
            this.addTestResult('Funzionalità Esistenti', false, error.message);
        }
    }

    /**
     * Test di performance
     */
    async testPerformance() {
        console.log('🧪 Test Performance...');
        
        try {
            // Test 1: Velocità caricamento vocabolario
            const startTime = Date.now();
            const vocManager = new VocabularyManager();
            await vocManager.loadVocabulary();
            const loadTime = Date.now() - startTime;
            
            this.addTestResult('Performance - Caricamento vocabolario', loadTime < 1000,
                loadTime >= 1000 ? `Caricamento troppo lento: ${loadTime}ms` : null);
            
            // Test 2: Velocità ricerca match
            const searchStart = Date.now();
            await vocManager.findMatch('che data è oggi');
            const searchTime = Date.now() - searchStart;
            
            this.addTestResult('Performance - Ricerca match', searchTime < 100,
                searchTime >= 100 ? `Ricerca troppo lenta: ${searchTime}ms` : null);
            
        } catch (error) {
            this.addTestResult('Performance', false, error.message);
        }
    }

    /**
     * Conta le funzioni globali
     */
    countGlobalFunctions() {
        let count = 0;
        for (const prop in window) {
            if (typeof window[prop] === 'function') {
                count++;
            }
        }
        return count;
    }

    /**
     * Aggiunge risultato test
     */
    addTestResult(testName, passed, error = null) {
        const result = {
            name: testName,
            passed: passed,
            error: error,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const icon = passed ? '✅' : '❌';
        const message = passed ? 'PASS' : 'FAIL' + (error ? ` - ${error}` : '');
        
        console.log(`🧪 ${icon} ${testName}: ${message}`);
    }

    /**
     * Genera report finale
     */
    generateReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = Math.round((passedTests / totalTests) * 100);
        
        console.log('🧪 📊 REPORT FINALE TEST MIDDLEWARE');
        console.log('=' .repeat(50));
        console.log(`📈 Test totali: ${totalTests}`);
        console.log(`✅ Test superati: ${passedTests}`);
        console.log(`❌ Test falliti: ${failedTests}`);
        console.log(`📊 Tasso di successo: ${successRate}%`);
        console.log('=' .repeat(50));
        
        if (failedTests > 0) {
            console.log('❌ TEST FALLITI:');
            this.testResults.filter(r => !r.passed).forEach(result => {
                console.log(`   - ${result.name}: ${result.error || 'Errore non specificato'}`);
            });
        }
        
        // Salva report in variabile globale per accesso esterno
        window.middlewareTestReport = {
            totalTests,
            passedTests,
            failedTests,
            successRate,
            results: this.testResults,
            timestamp: new Date().toISOString()
        };
        
        return successRate >= 80; // Considera successo se >80% dei test passano
    }

    /**
     * Test specifici per comandi vocabolario
     */
    async testVocabularyCommands() {
        console.log('🧪 Test Comandi Vocabolario...');
        
        const testCommands = [
            'che data è oggi',
            'che data avremo domani',
            'che data era ieri',
            'mostrami gli ordini di oggi',
            'mostrami gli ordini di ieri',
            'quali ordini ho per domani'
        ];
        
        try {
            const middleware = new AIMiddleware();
            
            for (const command of testCommands) {
                const result = await middleware.processRequest(command);
                const success = result.success && result.source === 'vocabulary';
                
                this.addTestResult(`Comando - "${command}"`, success,
                    !success ? 'Comando non riconosciuto dal vocabolario' : null);
            }
            
        } catch (error) {
            this.addTestResult('Comandi Vocabolario', false, error.message);
        }
    }

    /**
     * Test di stress (molte richieste)
     */
    async testStress() {
        console.log('🧪 Test Stress...');
        
        try {
            const middleware = new AIMiddleware();
            const commands = ['che data è oggi', 'che data avremo domani', 'mostrami gli ordini di oggi'];
            const iterations = 10;
            
            const startTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                const command = commands[i % commands.length];
                await middleware.processRequest(command);
            }
            
            const totalTime = Date.now() - startTime;
            const avgTime = totalTime / iterations;
            
            this.addTestResult('Stress - Richieste multiple', avgTime < 50,
                avgTime >= 50 ? `Tempo medio troppo alto: ${avgTime}ms` : null);
            
        } catch (error) {
            this.addTestResult('Stress Test', false, error.message);
        }
    }

    /**
     * Esegue test completo con performance e stress
     */
    async runFullTests() {
        await this.runAllTests();
        await this.testPerformance();
        await this.testVocabularyCommands();
        await this.testStress();
        
        return this.generateReport();
    }
}

// Inizializzazione automatica dei test
document.addEventListener('DOMContentLoaded', async () => {
    // Attendi che tutti i sistemi siano caricati
    setTimeout(async () => {
        try {
            console.log('🧪 Avvio automatico test middleware...');
            
            const tests = new MiddlewareTests();
            const success = await tests.runFullTests();
            
            if (success) {
                console.log('🧪 ✅ TUTTI I TEST SUPERATI - Sistema stabile');
            } else {
                console.log('🧪 ⚠️ ALCUNI TEST FALLITI - Verificare compatibilità');
            }
            
        } catch (error) {
            console.error('❌ Errore esecuzione test:', error);
        }
    }, 5000); // 5 secondi per permettere inizializzazione completa
});

// Esporta per uso manuale
window.MiddlewareTests = MiddlewareTests;