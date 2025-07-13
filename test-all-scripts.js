/**
 * TEST TUTTI GLI SCRIPT REFERENZIATI
 * Verifica quali script dell'HTML stanno fallendo
 */

window.testAllScripts = async function() {
    console.clear();
    console.log('🔍 TEST TUTTI GLI SCRIPT DELL\'HTML...\n');
    
    const scripts = document.querySelectorAll('script[src]');
    const results = [];
    
    console.log(`📋 Trovati ${scripts.length} script da testare...\n`);
    
    for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        const src = script.src;
        
        // Salta CDN esterni
        if (src.includes('://') && !src.includes(window.location.hostname)) {
            console.log(`⏭️  SKIP CDN: ${src}`);
            continue;
        }
        
        console.log(`🧪 ${i + 1}/${scripts.length} Testing: ${src}`);
        
        try {
            const response = await fetch(src);
            const contentType = response.headers.get('content-type') || '';
            const text = await response.text();
            
            const result = {
                src: src,
                status: response.status,
                contentType: contentType,
                isHTML: text.includes('<html>') || text.includes('<!DOCTYPE'),
                isJavaScript: contentType.includes('javascript') || contentType.includes('text/plain'),
                size: text.length,
                firstChars: text.substring(0, 50).replace(/\n/g, '\\n')
            };
            
            if (result.status !== 200) {
                console.error(`❌ ERROR ${result.status}: ${src}`);
                result.problem = 'HTTP_ERROR';
            } else if (result.isHTML) {
                console.error(`❌ HTML INVECE DI JS: ${src}`);
                console.log(`   Primi caratteri: "${result.firstChars}"`);
                result.problem = 'HTML_INSTEAD_OF_JS';
            } else if (!result.isJavaScript && text.length > 10) {
                console.warn(`⚠️  CONTENT TYPE SOSPETTO: ${src} (${contentType})`);
                result.problem = 'SUSPICIOUS_CONTENT_TYPE';
            } else {
                console.log(`✅ OK: ${src}`);
                result.problem = 'NONE';
            }
            
            results.push(result);
            
        } catch (error) {
            console.error(`❌ FETCH ERROR: ${src} - ${error.message}`);
            results.push({
                src: src,
                status: 'FETCH_ERROR',
                error: error.message,
                problem: 'FETCH_ERROR'
            });
        }
        
        // Pausa breve per non sovraccaricare
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Report finale
    console.log('\n📊 REPORT FINALE:');
    console.log('=' * 50);
    
    const problematic = results.filter(r => r.problem !== 'NONE');
    const ok = results.filter(r => r.problem === 'NONE');
    
    console.log(`✅ Script OK: ${ok.length}`);
    console.log(`❌ Script problematici: ${problematic.length}`);
    
    if (problematic.length > 0) {
        console.log('\n🚨 SCRIPT PROBLEMATICI:');
        problematic.forEach((result, i) => {
            console.log(`\n${i + 1}. ${result.src}`);
            console.log(`   Problema: ${result.problem}`);
            console.log(`   Status: ${result.status}`);
            if (result.contentType) {
                console.log(`   Content-Type: ${result.contentType}`);
            }
            if (result.firstChars) {
                console.log(`   Primi caratteri: "${result.firstChars}"`);
            }
        });
        
        console.log('\n💡 SOLUZIONI SUGGERITE:');
        const htmlErrors = problematic.filter(r => r.problem === 'HTML_INSTEAD_OF_JS');
        const httpErrors = problematic.filter(r => r.problem === 'HTTP_ERROR');
        
        if (htmlErrors.length > 0) {
            console.log(`\n🔧 ${htmlErrors.length} file restituiscono HTML invece di JS:`);
            htmlErrors.forEach(r => {
                console.log(`   - Rimuovi: <script src="${r.src.replace(window.location.origin + '/', '')}"></script>`);
            });
        }
        
        if (httpErrors.length > 0) {
            console.log(`\n🔧 ${httpErrors.length} file hanno errori HTTP:`);
            httpErrors.forEach(r => {
                console.log(`   - Rimuovi: <script src="${r.src.replace(window.location.origin + '/', '')}"></script>`);
            });
        }
    } else {
        console.log('\n🎉 Tutti gli script sono OK!');
    }
    
    return {
        total: results.length,
        ok: ok.length,
        problematic: problematic.length,
        results: results,
        problemScripts: problematic
    };
};

console.log('🧪 Test script caricato - Esegui window.testAllScripts() per iniziare');