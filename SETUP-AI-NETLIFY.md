# 🤖 Configurare AI su Netlify

## 📋 Guida Rapida

### 1. **Crea Account OpenAI**
- Vai su [platform.openai.com](https://platform.openai.com)
- Registrati con email
- Vai su "API Keys" → "Create new secret key"
- Copia la chiave (inizia con `sk-`)
- **IMPORTANTE**: Salvala subito, non la vedrai più!

### 2. **Crea Account Claude (Opzionale)**
- Vai su [console.anthropic.com](https://console.anthropic.com)
- Registrati e ottieni API key
- Copia la chiave

### 3. **Configura su Netlify**

Sul sito Netlify del tuo progetto:

1. **Vai su:** Site settings → Environment variables
2. **Aggiungi variabili:**
   ```
   OPENAI_API_KEY = sk-tuachiave123...
   ANTHROPIC_API_KEY = sk-ant-tuachiave456... (opzionale)
   ```
3. **Salva** e rideploy

### 4. **Test Funzionalità**

Dopo il deploy:
1. Apri l'app su iPad
2. Registra una nota vocale
3. Clicca "Trascrivi"
4. Dovrebbe funzionare!

## ❓ Problemi Comuni

### "Backend: Simulazione"
✅ **Normale** prima di configurare le API keys

### "Errore API: 401"
❌ **API key mancante o errata** - controlla su Netlify

### "Errore API: 429"
❌ **Limite rate superato** - aspetta o upgrade account

### "Trascrizione vuota"
❌ **Audio troppo corto** - registra almeno 2 secondi

## 💰 Costi

**OpenAI Whisper (Trascrizione)**:
- $0.006 per minuto
- 1000 trascrizioni di 30 sec = ~$3

**Claude AI (Analisi)**:
- $0.0008 per 1K token
- 1000 analisi = ~$2

**TOTALE**: ~$5/mese per uso normale

## 🚀 Alternativa Gratuita

Se non vuoi pagare:
1. Usa l'app in modalità simulazione
2. Scrivi note manualmente invece che vocali
3. Tutte le altre funzioni sono gratis!

---

**Nota**: Le Netlify Functions sono già configurate nel progetto. Devi solo aggiungere le API keys!