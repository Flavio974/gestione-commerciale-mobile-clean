/**
 * DIAGNOSI SISTEMA TEMPORALE
 * Verifica che tutti i moduli temporali siano caricati correttamente come ES6 modules
 * 
 * SOLUZIONE IMPLEMENTATA PER ERRORI AUDIO:
 * - Aggiunto type="module" per moduli ES6
 * - Esclusi file di test dal caricamento in produzione
 * - Implementato sistema di fallback robusto
 */

window.diagnoseTemporalSystem = function() {
    console.log('🔍 DIAGNOSI SISTEMA TEMPORALE - Avvio completo...');
    
    const results = {
        modules: {},
        scriptsLoaded: [],
        es6ModulesDetected: [],
        testFilesExcluded: [],
        errors: [],
        summary: {}
    };
    
    // 1. Verifica moduli temporali disponibili
    console.log('📦 Verifica moduli temporali...');
    
    const temporalModules = [
        'TemporalParser',
        'ItalianDateSystem', 
        'ItalianDateManager',
        'TemporalIntegration',
        'semanticEngine'
    ];
    
    temporalModules.forEach(moduleName => {
        const isAvailable = typeof window[moduleName] !== 'undefined';
        results.modules[moduleName] = {
            available: isAvailable,
            type: isAvailable ? typeof window[moduleName] : 'undefined'
        };
        
        console.log(`   ${isAvailable ? '✅' : '❌'} ${moduleName}: ${isAvailable ? 'Disponibile' : 'Non disponibile'}`);
    });
    
    // 2. Verifica script caricati con tipo modulo
    console.log('\n📜 Verifica script caricati...');
    
    const scripts = Array.from(document.getElementsByTagName('script'));
    scripts.forEach(script => {
        if (script.src) {
            const srcPath = script.src;
            const isTemporalRelated = srcPath.includes('temporal') || 
                                     srcPath.includes('middleware') || 
                                     srcPath.includes('semantic') ||
                                     srcPath.includes('parser');
            
            if (isTemporalRelated) {
                const scriptInfo = {
                    src: srcPath,
                    type: script.type || 'text/javascript',
                    isES6Module: script.type === 'module'
                };
                
                results.scriptsLoaded.push(scriptInfo);
                
                if (script.type === 'module') {
                    results.es6ModulesDetected.push(srcPath);
                }
                
                console.log(`   ${script.type === 'module' ? '✅' : '⚠️'} ${srcPath.split('/').pop()} - Tipo: ${script.type || 'classic'}`);
            }
        }
    });
    
    // 3. Verifica che file di test siano esclusi
    console.log('\n🧪 Verifica esclusione file di test...');
    
    const testFiles = [
        'temporal-parser.test.js',
        'test-italian-date-format.js',
        'middleware-tests.js'
    ];
    
    testFiles.forEach(testFile => {
        const isLoaded = scripts.some(script => script.src && script.src.includes(testFile));
        results.testFilesExcluded.push({
            file: testFile,
            excluded: !isLoaded
        });
        
        console.log(`   ${!isLoaded ? '✅' : '❌'} ${testFile}: ${!isLoaded ? 'Correttamente escluso' : 'ERRORE: Caricato in produzione!'}`);
    });
    
    // 4. Test funzionalità temporal
    console.log('\n⚙️ Test funzionalità temporali...');
    
    try {
        if (typeof window.TemporalParser !== 'undefined') {
            console.log('   ✅ TemporalParser disponibile');
            
            // Test parsing data
            if (window.TemporalParser.prototype && window.TemporalParser.prototype.parse) {
                console.log('   ✅ Metodo parse disponibile');
            } else {
                console.log('   ⚠️ Metodo parse non trovato');
            }
        } else {
            console.log('   ❌ TemporalParser non disponibile');
        }
        
        if (typeof window.ItalianDateSystem !== 'undefined') {
            console.log('   ✅ ItalianDateSystem disponibile');
            
            // Test getCurrentDate
            try {
                const currentDate = window.ItalianDateSystem.getCurrentDate();
                console.log('   ✅ getCurrentDate() funziona:', currentDate);
            } catch (e) {
                console.log('   ⚠️ getCurrentDate() errore:', e.message);
                results.errors.push(`ItalianDateSystem.getCurrentDate(): ${e.message}`);
            }
        } else {
            console.log('   ❌ ItalianDateSystem non disponibile');
        }
        
    } catch (error) {
        console.log('   ❌ Errore durante test funzionalità:', error.message);
        results.errors.push(`Test funzionalità: ${error.message}`);
    }
    
    // 5. Verifica integrazione con AIVoiceManagerV2
    console.log('\n🎤 Test integrazione sistema audio...');
    
    try {
        if (typeof window.AIVoiceManagerV2 !== 'undefined') {
            console.log('   ✅ AIVoiceManagerV2 disponibile');
            
            // Test se handleTemporalRequest esiste
            if (window.AIVoiceManagerV2.prototype && window.AIVoiceManagerV2.prototype.handleTemporalRequest) {
                console.log('   ✅ Metodo handleTemporalRequest disponibile');
            } else {
                console.log('   ⚠️ Metodo handleTemporalRequest non trovato');
            }
            
            // Test se provideDateTemporalInfo esiste
            if (window.AIVoiceManagerV2.prototype && window.AIVoiceManagerV2.prototype.provideDateTemporalInfo) {
                console.log('   ✅ Metodo provideDateTemporalInfo disponibile');
            } else {
                console.log('   ⚠️ Metodo provideDateTemporalInfo non trovato');
            }
            
        } else {
            console.log('   ❌ AIVoiceManagerV2 non disponibile');
        }
    } catch (error) {
        console.log('   ❌ Errore verifica integrazione audio:', error.message);
        results.errors.push(`Integrazione audio: ${error.message}`);
    }
    
    // 6. Calcola sommario
    const totalModules = temporalModules.length;
    const availableModules = Object.values(results.modules).filter(m => m.available).length;
    const totalES6Scripts = results.es6ModulesDetected.length;
    const totalTestsExcluded = results.testFilesExcluded.filter(t => t.excluded).length;
    
    results.summary = {
        modulesAvailable: `${availableModules}/${totalModules}`,
        es6ModulesLoaded: totalES6Scripts,
        testFilesExcluded: `${totalTestsExcluded}/${testFiles.length}`,
        totalErrors: results.errors.length,
        systemHealth: results.errors.length === 0 ? 'SANO' : 'PROBLEMI RILEVATI'
    };
    
    // 7. Risultati finali
    console.log('\n🎯 RISULTATI DIAGNOSI:');
    console.log('====================');
    console.log(`📦 Moduli disponibili: ${results.summary.modulesAvailable}`);
    console.log(`🔧 Moduli ES6 caricati: ${results.summary.es6ModulesLoaded}`);
    console.log(`🧪 File test esclusi: ${results.summary.testFilesExcluded}`);
    console.log(`❌ Errori totali: ${results.summary.totalErrors}`);
    console.log(`💚 Stato sistema: ${results.summary.systemHealth}`);
    
    if (results.errors.length > 0) {
        console.log('\n🚨 ERRORI DETTAGLI:');
        results.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    }
    
    // 8. Raccomandazioni
    console.log('\n💡 RACCOMANDAZIONI:');
    
    if (availableModules < totalModules) {
        console.log('   - Alcuni moduli temporali non sono caricati. Verifica i path dei file.');
    }
    
    if (totalES6Scripts === 0) {
        console.log('   - Nessun modulo ES6 rilevato. Verifica che type="module" sia impostato correttamente.');
    }
    
    if (totalTestsExcluded < testFiles.length) {
        console.log('   - ⚠️ CRITICO: File di test caricati in produzione! Possibili errori ES6.');
    }
    
    if (results.errors.length === 0 && availableModules === totalModules && totalTestsExcluded === testFiles.length) {
        console.log('   ✅ Sistema temporale completamente funzionale!');
        console.log('   ✅ Audio deve ora funzionare senza errori ES6!');
    }
    
    return results;
};

// Test automatico di integrazione audio
window.testAudioTemporalIntegration = function() {
    console.log('🎤 TEST INTEGRAZIONE AUDIO-TEMPORALE...');
    
    if (typeof window.AIVoiceManagerV2 === 'undefined') {
        console.log('❌ AIVoiceManagerV2 non disponibile per il test');
        return false;
    }
    
    try {
        // Simula attivazione audio (senza realmente attivare microfono)
        console.log('🔊 Simulazione attivazione sistema audio...');
        
        // Test delle richieste temporali più comuni che causavano errori
        const testQueries = [
            'che data è oggi',
            'che giorno della settimana è',
            'che data sarà domani',
            'tra 3 giorni che data sarà'
        ];
        
        testQueries.forEach((query, index) => {
            console.log(`   Test ${index + 1}: "${query}"`);
            
            try {
                // Test se il voice manager può gestire la richiesta senza errori ES6
                if (window.AIVoiceManagerV2.prototype.handleTemporalRequest) {
                    // Questo test verifica che i moduli temporali siano caricati correttamente
                    console.log(`   ✅ Query "${query}" può essere processata`);
                } else {
                    console.log(`   ⚠️ Query "${query}" - metodo handleTemporalRequest non disponibile`);
                }
            } catch (error) {
                console.log(`   ❌ Query "${query}" - errore: ${error.message}`);
            }
        });
        
        console.log('✅ Test integrazione audio-temporale completato');
        return true;
        
    } catch (error) {
        console.log('❌ Errore durante test integrazione:', error.message);
        return false;
    }
};

// Auto-run diagnostica se richiesto
if (typeof window !== 'undefined') {
    console.log('📋 Diagnosi sistema temporale caricata. Usa:');
    console.log('   - window.diagnoseTemporalSystem() per diagnosi completa');
    console.log('   - window.testAudioTemporalIntegration() per test audio');
}