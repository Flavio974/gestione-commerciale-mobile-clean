/**
 * 🔍 DIAGNOSTICA FILE JAVASCRIPT
 * Verifica esistenza e contenuto dei file che causano errori
 * "Uncaught SyntaxError: Unexpected token '<'"
 */

const JSFileDiagnostic = {
    // Lista dei file problematici identificati dagli errori
    problematicFiles: [
        'js/data/italian-date-system.js',
        'js/utils/italian-date-parser.js', 
        'js/utils/italian-date-system.js',
        'js/utils/italian-date-formatter.js',
        'js/utils/italian-date-middleware.js',
        'js/utils/italian-date-utils.js',
        'js/voice/ai-voice-manager-v2.js',
        'js/voice/voice-assistant.js',
        'js/ai/voice-recognition.js',
        'js/ai/gemini-ai.js',
        'js/ai/ai-assistant.js',
        'js/ai/flavio-ai-assistant.js',
        'js/ai/ai-voice-manager.js',
        'js/ai/ai-voice-manager-v2.js',
        // File middleware potenzialmente problematici
        'js/middleware/temporal-parser.js',
        'js/middleware/temporal-settings.js',
        'js/test/test-temporal-parser.js',
        'js/test/test-italian-date-format.js',
        'js/test/test-nuclear-date-fix.js'
    ],

    /**
     * Verifica singolo file
     */
    async checkFile(filePath) {
        try {
            console.log(`🔍 Controllo file: ${filePath}`);
            
            const response = await fetch(filePath);
            const contentType = response.headers.get('content-type');
            const text = await response.text();
            
            const result = {
                path: filePath,
                status: response.status,
                statusText: response.statusText,
                contentType: contentType,
                size: text.length,
                isHTML: text.includes('<html>') || text.includes('<!DOCTYPE'),
                isJavaScript: contentType && contentType.includes('javascript'),
                firstChars: text.substring(0, 100),
                lastChars: text.substring(text.length - 100)
            };

            // Analizza il problema
            if (result.status === 404) {
                result.problem = 'FILE_NOT_FOUND';
                result.severity = 'CRITICAL';
            } else if (result.isHTML) {
                result.problem = 'HTML_INSTEAD_OF_JS';
                result.severity = 'CRITICAL';
            } else if (!result.isJavaScript && !text.includes('function') && !text.includes('const') && !text.includes('var')) {
                result.problem = 'NOT_JAVASCRIPT_CONTENT';
                result.severity = 'HIGH';
            } else {
                result.problem = 'NONE';
                result.severity = 'OK';
            }

            return result;

        } catch (error) {
            return {
                path: filePath,
                status: 'ERROR',
                error: error.message,
                problem: 'FETCH_ERROR',
                severity: 'CRITICAL'
            };
        }
    },

    /**
     * Controlla tutti i file problematici
     */
    async runDiagnostic() {
        console.log('🚨 AVVIO DIAGNOSTICA FILE JAVASCRIPT...');
        console.log(`📋 File da controllare: ${this.problematicFiles.length}`);
        
        const results = [];
        
        for (const filePath of this.problematicFiles) {
            const result = await this.checkFile(filePath);
            results.push(result);
            
            // Log immediato per ogni file
            if (result.severity === 'CRITICAL') {
                console.error(`❌ CRITICO: ${filePath} - ${result.problem}`);
            } else if (result.severity === 'HIGH') {
                console.warn(`⚠️ ALTO: ${filePath} - ${result.problem}`);
            } else {
                console.log(`✅ OK: ${filePath}`);
            }
        }
        
        this.generateReport(results);
        return results;
    },

    /**
     * Genera report dettagliato
     */
    generateReport(results) {
        console.log('\n📊 REPORT DIAGNOSTICA JAVASCRIPT:');
        console.log('='.repeat(60));
        
        const critical = results.filter(r => r.severity === 'CRITICAL');
        const high = results.filter(r => r.severity === 'HIGH');
        const ok = results.filter(r => r.severity === 'OK');
        
        console.log(`🔴 CRITICI: ${critical.length}`);
        console.log(`🟡 ALTI: ${high.length}`);
        console.log(`🟢 OK: ${ok.length}`);
        
        if (critical.length > 0) {
            console.log('\n🔴 PROBLEMI CRITICI:');
            critical.forEach(result => {
                console.log(`  • ${result.path}`);
                console.log(`    Status: ${result.status}`);
                console.log(`    Problema: ${result.problem}`);
                if (result.contentType) {
                    console.log(`    Content-Type: ${result.contentType}`);
                }
                if (result.firstChars) {
                    console.log(`    Primi caratteri: "${result.firstChars.replace(/\n/g, '\\n')}"`);
                }
                console.log('');
            });
        }
        
        // Suggerimenti di risoluzione
        console.log('\n💡 SUGGERIMENTI RISOLUZIONE:');
        
        const fileNotFound = critical.filter(r => r.problem === 'FILE_NOT_FOUND');
        if (fileNotFound.length > 0) {
            console.log(`  📁 ${fileNotFound.length} file non esistono - creare o rimuovere riferimenti`);
        }
        
        const htmlInsteadJs = critical.filter(r => r.problem === 'HTML_INSTEAD_OF_JS');
        if (htmlInsteadJs.length > 0) {
            console.log(`  🌐 ${htmlInsteadJs.length} file restituiscono HTML - problema server/routing`);
        }
        
        console.log('\n🔧 PROSSIMI PASSI:');
        console.log('  1. Verificare configurazione server web');
        console.log('  2. Controllare .htaccess o nginx.conf');
        console.log('  3. Verificare MIME types per file .js');
        console.log('  4. Creare file mancanti o rimuovere riferimenti');
    },

    /**
     * Test specifico per verificare se server restituisce HTML di default
     */
    async testServerBehavior() {
        console.log('\n🧪 TEST COMPORTAMENTO SERVER:');
        
        // Test con file inesistente
        const fakeFile = 'js/non-existent-test-file.js';
        const result = await this.checkFile(fakeFile);
        
        console.log(`Test file inesistente: ${fakeFile}`);
        console.log(`Status: ${result.status}`);
        console.log(`È HTML: ${result.isHTML}`);
        
        if (result.isHTML && result.status === 200) {
            console.log('🚨 PROBLEMA IDENTIFICATO: Server restituisce pagina HTML per file JS inesistenti');
            console.log('   Causa: Probabile rewrite rule che cattura tutto e restituisce index.html');
        }
    },

    /**
     * Verifica esistenza fisica dei file
     */
    async checkPhysicalFiles() {
        console.log('\n📁 CONTROLLO ESISTENZA FISICA FILE:');
        
        // Verifica se i file esistono fisicamente nel filesystem
        for (const filePath of this.problematicFiles) {
            try {
                // Usa un fetch speciale per verificare solo headers
                const response = await fetch(filePath, { method: 'HEAD' });
                console.log(`${filePath}: ${response.status} ${response.statusText}`);
            } catch (error) {
                console.log(`${filePath}: ERRORE - ${error.message}`);
            }
        }
    },

    /**
     * Identifica script HTML che stanno fallendo
     */
    identifyFailingScripts() {
        console.log('\n🔍 SCRIPT HTML CHE POTREBBERO FALLIRE:');
        
        const scripts = document.querySelectorAll('script[src]');
        const failingScripts = [];
        
        scripts.forEach(script => {
            const src = script.src;
            // Controlla se è un file locale (non CDN)
            if (src && !src.includes('://') || src.includes(window.location.origin)) {
                const relativePath = src.replace(window.location.origin + '/', '');
                
                // Controlla se il path è sospetto
                if (this.problematicFiles.some(p => relativePath.includes(p) || p.includes(relativePath))) {
                    failingScripts.push({
                        element: script,
                        src: src,
                        relativePath: relativePath
                    });
                }
            }
        });
        
        if (failingScripts.length > 0) {
            console.log('❌ Script potenzialmente problematici trovati:');
            failingScripts.forEach(script => {
                console.log(`  • ${script.relativePath}`);
                console.log(`    Elemento:`, script.element);
            });
        } else {
            console.log('✅ Nessuno script HTML problematico identificato');
        }
        
        return failingScripts;
    },

    /**
     * Monitoraggio errori in tempo reale
     */
    startErrorMonitoring() {
        console.log('\n🔍 AVVIO MONITORAGGIO ERRORI IN TEMPO REALE...');
        
        const errors = [];
        
        window.addEventListener('error', (e) => {
            const error = {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                timestamp: new Date().toISOString()
            };
            
            errors.push(error);
            
            if (error.message.includes('Unexpected token') || error.filename.includes('.js')) {
                console.error('🚨 ERRORE RILEVATO:', error);
            }
        }, true);
        
        // Ritorna una funzione per ottenere gli errori
        return {
            getErrors: () => errors,
            stop: () => {
                // Qui potresti rimuovere il listener se necessario
                console.log('⏹️ Monitoraggio errori fermato');
            }
        };
    }
};

// Funzione di avvio diagnostica
window.startJSDiagnostic = async function() {
    console.clear();
    console.log('🔍 AVVIO DIAGNOSTICA COMPLETA...\n');
    
    // 1. Identifica script problematici nell'HTML
    const failingScripts = JSFileDiagnostic.identifyFailingScripts();
    
    // 2. Avvia monitoraggio errori
    const monitor = JSFileDiagnostic.startErrorMonitoring();
    
    // 3. Esegui diagnostica file
    const results = await JSFileDiagnostic.runDiagnostic();
    
    // 4. Test comportamento server
    await JSFileDiagnostic.testServerBehavior();
    
    // 5. Controllo esistenza fisica
    await JSFileDiagnostic.checkPhysicalFiles();
    
    // 6. Mostra errori catturati
    setTimeout(() => {
        const errors = monitor.getErrors();
        if (errors.length > 0) {
            console.log('\n🚨 ERRORI CATTURATI DURANTE LA DIAGNOSTICA:');
            errors.forEach((error, i) => {
                console.log(`${i + 1}. ${error.message}`);
                console.log(`   File: ${error.filename || 'sconosciuto'}`);
                console.log(`   Riga: ${error.lineno}, Colonna: ${error.colno}`);
                console.log('');
            });
        } else {
            console.log('\n✅ Nessun errore rilevato durante la diagnostica');
        }
        
        monitor.stop();
    }, 2000);
    
    console.log('\n✅ DIAGNOSTICA COMPLETATA');
    console.log('📋 Esegui window.startJSDiagnostic() per ripetere');
    
    return {
        results,
        failingScripts,
        monitor
    };
};

// Rendi disponibile globalmente
window.JSFileDiagnostic = JSFileDiagnostic;

console.log('🔍 Diagnostica JS caricata - Usa window.startJSDiagnostic() per avviare');