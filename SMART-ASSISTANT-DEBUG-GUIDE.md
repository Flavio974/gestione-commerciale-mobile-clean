# 🔍 GUIDA DEBUG SMART ASSISTANT

## 🚨 PROBLEMI COMUNI IDENTIFICATI

### 1. **API Keys Mancanti**
**Problema:** Functions restituiscono errori `MISSING_ANTHROPIC_KEY` o `MISSING_OPENAI_KEY`

**Soluzione:**
```bash
# Configurare in Netlify Dashboard > Site Settings > Environment Variables
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### 2. **Speech-to-Text Simulato**
**Problema:** `/functions/speech-to-text.js` usa una trascrizione simulata

**Attuale:**
```javascript
const simulatedTranscription = "Trascrizione simulata: L'AI è attiva e funzionante su Netlify!";
```

**Per Produzione:** Integrare OpenAI Whisper API

### 3. **Tabelle Supabase**
**Problema:** Potrebbero mancare le tabelle richieste

**Verifica Tabelle:**
- `note_ai`
- `smart_assistant_secure_notes`

## 🛠️ STRUMENTI DI DEBUG

### 1. **Script Test Automatico**
```bash
# Test produzione
node test-smart-assistant-complete.js

# Test locale (con netlify dev)
node test-smart-assistant-complete.js --local
```

### 2. **File HTML Debug**
- `debug-smart-assistant-complete.html` - Test completi sistema
- `test-smart-assistant-flow.html` - Test flusso base

### 3. **Test Manuale Endpoints**

#### Test Speech-to-Text:
```bash
curl -X POST https://your-app.netlify.app/.netlify/functions/speech-to-text \
  -H "Content-Type: application/json" \
  -d '{"audio":"data:audio/webm;base64,test"}'
```

#### Test Claude AI:
```bash
curl -X POST https://your-app.netlify.app/.netlify/functions/claude-ai \
  -H "Content-Type: application/json" \
  -d '{"message":"test","model":"claude-3-haiku-20240307"}'
```

## 🔧 CONFIGURAZIONE CORRETTA

### 1. **Netlify Environment Variables**
Necessarie per produzione:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...
```

### 2. **Supabase Config**
File: `config/supabase-config.js`
```javascript
const SUPABASE_CONFIG = {
  url: 'https://ibuwqihgdkinfmvxqfnq.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  enableSync: true
};
```

### 3. **Netlify Functions**
```
functions/
├── claude-ai.js          ✅ Configurato
├── speech-to-text.js     ⚠️  Simulato
└── package.json          ✅ Dipendenze
```

## 📊 CHECKLIST DEBUG

### Ambiente Sviluppo
- [ ] `netlify dev` funziona
- [ ] Functions raggiungibili su `localhost:8888`
- [ ] No errori console browser

### Ambiente Produzione  
- [ ] Deploy Netlify completato
- [ ] Environment variables configurate
- [ ] Functions attive e raggiungibili
- [ ] Supabase connesso

### Test Funzionalità
- [ ] Speech-to-text risponde (anche se simulato)
- [ ] Claude AI risponde con API key valida
- [ ] Supabase tabelle accessibili
- [ ] localStorage funziona per note

## 🚀 NEXT STEPS

### Priorità Alta
1. **Configurare API Keys** in Netlify Environment Variables
2. **Testare con script automatico** `test-smart-assistant-complete.js`
3. **Verificare tabelle Supabase** esistenti

### Priorità Media  
1. **Implementare Whisper reale** in `speech-to-text.js`
2. **Ottimizzare error handling** nelle functions
3. **Aggiungere monitoring** per usage API

### Priorità Bassa
1. **Caching** per richieste frequenti
2. **Rate limiting** per API calls
3. **Analytics** utilizzo Smart Assistant

## 📞 SUPPORT

### Log Debug Browser
```javascript
// Nel browser console
localStorage.getItem('smart_voice_notes');
window.supabaseClient?.from('note_ai').select('*').limit(5);
```

### Log Debug Server
```bash
# Netlify Functions logs
netlify functions:logs
```

### Test Quick
```javascript
// Test rapido nel browser
fetch('/.netlify/functions/claude-ai', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({message: 'test', model: 'claude-3-haiku-20240307'})
}).then(r => r.json()).then(console.log);
```

---
**Ultimo aggiornamento:** 2025-07-21  
**Versione:** 1.0