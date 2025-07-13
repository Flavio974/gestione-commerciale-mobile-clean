/**
 * DIAGNOSTICA COMPLETA FILE JAVASCRIPT
 * Verifica tutti i file JS referenziati nell'HTML
 */

window.diagnoseAllJS = async function() {
    console.clear();
    console.log('🔍 DIAGNOSTICA COMPLETA FILE JAVASCRIPT\n');
    
    // Lista di tutti i file JS dall'HTML
    const jsFiles = [
        'config/api-config.js',
        'js/utils.js',
        'js/app.js',
        'js/navigation.js',
        'js/api.js',
        'js/timeline/timeline-config.js',
        'js/timeline/timeline-utils.js',
        'js/timeline/timeline-rendering.js',
        'js/timeline/timeline-events.js',
        'js/timeline/timeline-controls.js',
        'js/timeline/timeline-core.js',
        'config-modules.js',
        'config/supabase-config.js',
        'js/utils/device-detector.js',
        'js/ai/ai-voice-manager.js',
        'js/ai/ai-command-parser.js',
        'js/clienti-core.js',
        'js/clienti-form.js',
        'js/clienti-table.js',
        'js/clienti-import-export.js',
        'js/clienti-supabase-sync.js',
        'js/clienti-utils.js',
        'js/modules/ordini-parser.js',
        'js/modules/export/ordini-export-dialog.js',
        'js/modules/export/ordini-export-dropbox.js',
        'js/modules/export/ordini-export-venduto.js',
        'js/modules/export/supabase-sync-venduto.js',
        'js/modules/export/ordini-export-analytics.js',
        'js/modules/export/ordini-export-file-io.js',
        'js/modules/export/ordini-export-coordinator.js',
        'js/modules/export/ordini-export-wrapper.js',
        'js/modules/ordini-ui.js',
        'js/ordini.js',
        'js/prodotti.js',
        'js/percorsi-core.js',
        'js/percorsi-import.js',
        'js/percorsi-table.js',
        'js/percorsi-crud.js',
        'js/percorsi-utils.js',
        'js/utils/italian-date-system.js',
        'check-js-files.js',
        'test-all-scripts.js',
        'debug-data.js',
        'debug-essemme-detailed.js',
        'debug-date-field.js'
    ];
    
    const results = {
        ok: [],
        missing: [],
        htmlInsteadOfJs: [],
        errors: []
    };
    
    console.log(`📋 Testando ${jsFiles.length} file JS...\n`);
    
    for (let i = 0; i < jsFiles.length; i++) {
        const file = jsFiles[i];
        console.log(`🧪 ${i + 1}/${jsFiles.length} ${file}`);
        
        try {
            const response = await fetch(file);
            const contentType = response.headers.get('content-type') || '';
            const text = await response.text();
            
            if (response.status === 404) {
                console.error(`❌ 404 NOT FOUND: ${file}`);
                results.missing.push(file);
            } else if (response.status !== 200) {
                console.error(`❌ HTTP ${response.status}: ${file}`);
                results.errors.push({ file, status: response.status });
            } else if (text.includes('<html>') || text.includes('<!DOCTYPE')) {
                console.error(`❌ HTML INVECE DI JS: ${file}`);
                console.log(`   Content-Type: ${contentType}`);
                console.log(`   Primi caratteri: "${text.substring(0, 50)}"`);
                results.htmlInsteadOfJs.push(file);
            } else {
                console.log(`✅ OK: ${file}`);
                results.ok.push(file);
            }
            
        } catch (error) {
            console.error(`❌ ERRORE FETCH: ${file} - ${error.message}`);
            results.errors.push({ file, error: error.message });
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Report finale
    console.log('\n📊 REPORT FINALE:');
    console.log('='.repeat(60));
    console.log(`✅ File OK: ${results.ok.length}`);
    console.log(`❌ File mancanti (404): ${results.missing.length}`);
    console.log(`🌐 File che restituiscono HTML: ${results.htmlInsteadOfJs.length}`);
    console.log(`⚠️ Altri errori: ${results.errors.length}`);
    
    if (results.missing.length > 0) {
        console.log('\n🚨 FILE MANCANTI (404):');
        results.missing.forEach(file => {
            console.log(`   - ${file}`);
        });
    }
    
    if (results.htmlInsteadOfJs.length > 0) {
        console.log('\n🌐 FILE CHE RESTITUISCONO HTML:');
        results.htmlInsteadOfJs.forEach(file => {
            console.log(`   - ${file}`);
        });
    }
    
    if (results.errors.length > 0) {
        console.log('\n⚠️ ALTRI ERRORI:');
        results.errors.forEach(item => {
            console.log(`   - ${item.file}: ${item.status || item.error}`);
        });
    }
    
    // Suggerimenti per Netlify
    if (results.htmlInsteadOfJs.length > 0 || results.missing.length > 0) {
        console.log('\n💡 SUGGERIMENTI CONFIGURAZIONE NETLIFY:');
        console.log('1. Creare file _redirects nella root:');
        console.log('   /js/* /js/:splat 200');
        console.log('   /config/* /config/:splat 200');
        console.log('   /*.js /:splat 200');
        console.log('   /* /index.html 200');
        console.log('');
        console.log('2. O creare netlify.toml:');
        console.log('   [[redirects]]');
        console.log('     from = "/js/*"');
        console.log('     to = "/js/:splat"');
        console.log('     status = 200');
        console.log('');
        console.log('   [[redirects]]');
        console.log('     from = "/*"');
        console.log('     to = "/index.html"');
        console.log('     status = 200');
    }
    
    return results;
};

console.log('🔍 Diagnostica JS caricata - Esegui window.diagnoseAllJS()');