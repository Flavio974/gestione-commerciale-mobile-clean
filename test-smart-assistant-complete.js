#!/usr/bin/env node

/**
 * 🔍 Test Completo Smart Assistant
 * Script per testare tutte le funzionalità dello Smart Assistant
 */

const https = require('https');
const http = require('http');

// Configurazione
const NETLIFY_URL = 'https://dancing-kashata-353af9.netlify.app';
const LOCAL_URL = 'http://localhost:8888';

// Test environment
const USE_LOCAL = process.argv.includes('--local');
const BASE_URL = USE_LOCAL ? LOCAL_URL : NETLIFY_URL;

console.log(`🔍 Testing Smart Assistant su: ${BASE_URL}`);
console.log(`🌐 Ambiente: ${USE_LOCAL ? 'Locale (netlify dev)' : 'Produzione'}`);

// Utility per HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const lib = isHttps ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            json: data ? JSON.parse(data) : null
          };
          resolve(result);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            json: null,
            parseError: e.message
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test Functions
async function testSpeechToText() {
  console.log('\n📢 Test Speech-to-Text Function...');
  
  try {
    const testAudio = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////';
    
    const response = await makeRequest(`${BASE_URL}/.netlify/functions/speech-to-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ audio: testAudio })
    });
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response:`, response.json);
    
    if (response.statusCode === 200 && response.json?.success) {
      console.log('   ✅ Speech-to-Text: OK');
      return true;
    } else {
      console.log('   ❌ Speech-to-Text: FAILED');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Speech-to-Text Error:', error.message);
    return false;
  }
}

async function testClaudeAI() {
  console.log('\n🤖 Test Claude AI Function...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/.netlify/functions/claude-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Test messaggio per Smart Assistant',
        model: 'claude-3-haiku-20240307'
      })
    });
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response:`, response.json);
    
    if (response.statusCode === 200 && response.json?.success) {
      console.log('   ✅ Claude AI: OK');
      return true;
    } else {
      console.log('   ❌ Claude AI: FAILED');
      if (response.json?.code === 'MISSING_ANTHROPIC_KEY') {
        console.log('   ⚠️  Manca ANTHROPIC_API_KEY nelle variabili ambiente');
      }
      return false;
    }
  } catch (error) {
    console.log('   ❌ Claude AI Error:', error.message);
    return false;
  }
}

async function testEndpointHealth() {
  console.log('\n🏥 Test Health degli Endpoints...');
  
  const endpoints = [
    '/.netlify/functions/claude-ai',
    '/.netlify/functions/speech-to-text'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${BASE_URL}${endpoint}`, {
        method: 'GET'
      });
      
      console.log(`   ${endpoint}: ${response.statusCode}`);
      
      if (response.statusCode === 200) {
        console.log(`   ✅ ${endpoint}: OK`);
      } else if (response.statusCode === 405) {
        console.log(`   ✅ ${endpoint}: OK (Method not allowed - normale)`);
      } else {
        console.log(`   ❌ ${endpoint}: ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint}: ${error.message}`);
    }
  }
}

async function testSupabaseConnectivity() {
  console.log('\n🔌 Test Supabase Connectivity...');
  
  try {
    // Test attraverso le functions per verificare la connettività
    const response = await makeRequest(`${BASE_URL}/.netlify/functions/claude-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Test connessione database',
        model: 'claude-3-haiku-20240307',
        supabaseData: { test: true }
      })
    });
    
    console.log(`   Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('   ✅ Supabase Data Processing: OK');
      return true;
    } else {
      console.log('   ❌ Supabase Data Processing: FAILED');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Supabase Test Error:', error.message);
    return false;
  }
}

// Main Test Runner
async function runTests() {
  console.log('🚀 Avvio Test Completo Smart Assistant\n');
  
  const results = {
    health: false,
    speechToText: false,
    claudeAI: false,
    supabase: false
  };
  
  // Esegui tutti i test
  results.health = await testEndpointHealth();
  results.speechToText = await testSpeechToText();
  results.claudeAI = await testClaudeAI();
  results.supabase = await testSupabaseConnectivity();
  
  // Riassunto
  console.log('\n📊 RIASSUNTO TEST:');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`${icon} ${test.padEnd(20)}: ${status}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n📈 RISULTATO FINALE:');
  console.log(`   Test passati: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('   🎉 TUTTI I TEST PASSATI!');
  } else {
    console.log('   ⚠️  ALCUNI TEST FALLITI');
    
    console.log('\n🔧 AZIONI SUGGERITE:');
    if (!results.claudeAI) {
      console.log('   - Verificare ANTHROPIC_API_KEY in Netlify Environment Variables');
    }
    if (!results.speechToText) {
      console.log('   - Verificare deployment delle Netlify Functions');
    }
    if (!results.health) {
      console.log('   - Verificare che l\'app sia deployata e accessibile');
    }
    if (!results.supabase) {
      console.log('   - Verificare configurazione Supabase');
    }
  }
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Help
if (process.argv.includes('--help')) {
  console.log(`
🔍 Test Smart Assistant

Uso:
  node test-smart-assistant-complete.js [opzioni]

Opzioni:
  --local     Testa l'ambiente locale (netlify dev)
  --help      Mostra questo aiuto

Esempi:
  node test-smart-assistant-complete.js
  node test-smart-assistant-complete.js --local
  `);
  process.exit(0);
}

// Esegui i test
runTests().catch(error => {
  console.error('❌ Errore durante i test:', error);
  process.exit(1);
});