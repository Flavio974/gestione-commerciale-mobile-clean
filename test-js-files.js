#!/usr/bin/env node

/**
 * Script di test per verificare che tutti i file JS restituiscano 200/OK
 * Testa sia localhost che il deploy su Netlify
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ✅ CONFIGURAZIONE
const CONFIG = {
    // Cambia qui il tuo dominio Netlify
    netlifyDomain: 'dancing-kashata-353af9.netlify.app',
    localPort: 3000,
    
    // File JS critici da testare
    criticalFiles: [
        'config/temporal-settings.js',
        'js/middleware/vocabulary-manager.js',
        'js/middleware/vocabulary-sync.js',
        'js/data/italian-date-system.js',
        'js/utils/temporal-parser.js',
        'js/middleware/temporal-integration.js',
        'js/middleware/ai-date-corrector.js',
        'js/middleware/ai-wrapper-forced-date.js'
    ]
};

// ✅ Utility per fare richieste HTTP/HTTPS
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        
        const req = protocol.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                    url: url
                });
            });
        });
        
        req.on('error', (err) => {
            reject({ error: err.message, url: url });
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject({ error: 'Timeout (10s)', url: url });
        });
    });
}

// ✅ Test singolo file
async function testFile(baseUrl, filePath) {
    const fullUrl = `${baseUrl}/${filePath}`;
    
    try {
        const result = await makeRequest(fullUrl);
        const isJS = result.headers['content-type']?.includes('javascript');
        const isHTML = result.body.trim().startsWith('<');
        
        return {
            file: filePath,
            url: fullUrl,
            status: result.status,
            contentType: result.headers['content-type'],
            isValidJS: result.status === 200 && isJS && !isHTML,
            size: result.body.length,
            error: null,
            preview: result.body.substring(0, 100).replace(/\n/g, '\\n')
        };
    } catch (err) {
        return {
            file: filePath,
            url: fullUrl,
            status: null,
            contentType: null,
            isValidJS: false,
            size: 0,
            error: err.error || err.message,
            preview: null
        };
    }
}

// ✅ Test completo
async function runTests() {
    console.log('🧪 TESTING JS FILES - Verifica caricamento corretto\n');
    
    const environments = [
        { name: 'Netlify PROD', url: `https://${CONFIG.netlifyDomain}` },
        { name: 'Localhost DEV', url: `http://localhost:${CONFIG.localPort}` }
    ];
    
    for (const env of environments) {
        console.log(`\n📍 Testing: ${env.name} (${env.url})`);
        console.log('='.repeat(60));
        
        const results = [];
        let validCount = 0;
        let invalidCount = 0;
        
        for (const filePath of CONFIG.criticalFiles) {
            const result = await testFile(env.url, filePath);
            results.push(result);
            
            const status = result.isValidJS ? '✅' : '❌';
            const statusCode = result.status || 'ERR';
            const size = result.size ? `(${result.size}b)` : '';
            
            console.log(`${status} ${statusCode} ${filePath} ${size}`);
            
            if (result.error) {
                console.log(`   ⚠️  Error: ${result.error}`);
            } else if (!result.isValidJS && result.preview) {
                console.log(`   📄 Preview: ${result.preview}...`);
            }
            
            result.isValidJS ? validCount++ : invalidCount++;
        }
        
        console.log(`\n📊 Summary: ${validCount} ✅ valid, ${invalidCount} ❌ invalid`);
        
        if (invalidCount > 0) {
            console.log('\n🔧 SUGGESTED FIXES:');
            results.filter(r => !r.isValidJS).forEach(r => {
                if (r.status === 404) {
                    console.log(`   • File non trovato: ${r.file}`);
                } else if (r.preview && r.preview.includes('<html')) {
                    console.log(`   • HTML invece di JS: ${r.file} (problema redirect Netlify)`);
                } else if (r.error) {
                    console.log(`   • Errore connessione: ${r.file} - ${r.error}`);
                }
            });
        }
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('   1. Se vedi "HTML invece di JS" → problemi nel netlify.toml');
    console.log('   2. Se vedi "404" → file mancante o path sbagliato');
    console.log('   3. Se localhost fallisce → avvia server di dev');
    console.log('   4. Se tutto OK ma app ha errori → verifica sintassi JS');
}

// ✅ Verifica file locali esistenti
function checkLocalFiles() {
    console.log('📂 Checking local files...\n');
    
    const missing = [];
    const existing = [];
    
    CONFIG.criticalFiles.forEach(filePath => {
        const fullPath = path.join(__dirname, filePath);
        if (fs.existsSync(fullPath)) {
            existing.push(filePath);
            const stats = fs.statSync(fullPath);
            console.log(`✅ ${filePath} (${stats.size}b)`);
        } else {
            missing.push(filePath);
            console.log(`❌ ${filePath} - FILE MANCANTE`);
        }
    });
    
    console.log(`\n📊 Local: ${existing.length} found, ${missing.length} missing`);
    
    if (missing.length > 0) {
        console.log('\n⚠️  MISSING FILES:');
        missing.forEach(f => console.log(`   • ${f}`));
        return false;
    }
    
    return true;
}

// ✅ MAIN
async function main() {
    console.log('🧪 JS FILES TEST SUITE\n');
    
    // Prima verifica file locali
    const hasAllFiles = checkLocalFiles();
    
    if (!hasAllFiles) {
        console.log('\n❌ Alcuni file mancano localmente - fix prima di testare deploy');
        process.exit(1);
    }
    
    // Poi testa gli URL
    await runTests();
    
    console.log('\n✅ Test completato!');
}

// Run se chiamato direttamente
if (require.main === module) {
    main().catch(err => {
        console.error('💥 Test fallito:', err);
        process.exit(1);
    });
}

module.exports = { testFile, runTests, checkLocalFiles };