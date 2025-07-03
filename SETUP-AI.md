# 🤖 Attivare AI su Netlify

## 🔧 Opzione 1: Netlify Functions (Gratis)

### 1. **Crea account OpenAI**
- Vai su [platform.openai.com](https://platform.openai.com)
- Registrati e ottieni API Key
- Copia la chiave (inizia con `sk-`)

### 2. **Installa Netlify CLI**
```bash
npm install -g netlify-cli
```

### 3. **Crea le Functions**

Crea cartella `netlify/functions/` nel progetto e aggiungi:

**netlify/functions/speech-to-text.js**
```javascript
exports.handler = async (event, context) => {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  
  try {
    const { audio } = JSON.parse(event.body);
    
    // Chiama OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: createFormData(audio)
    });
    
    const data = await response.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ text: data.text })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

### 4. **Configura Environment**
Su Netlify Dashboard:
- Site settings → Environment variables
- Aggiungi: `OPENAI_API_KEY` = `la-tua-chiave`

### 5. **Aggiorna smart-assistant.js**
Cambia URL da `/api/speech-to-text.php` a `/.netlify/functions/speech-to-text`

---

## 🚀 Opzione 2: Servizio Esterno (Più semplice)

### 1. **Usa Replit/Render**
- Crea account su [replit.com](https://replit.com) (gratis)
- Crea nuovo progetto PHP
- Carica i file da `api/`
- Ottieni URL pubblico tipo `https://tuoapp.replit.app`

### 2. **Aggiorna URL in smart-assistant.js**
```javascript
// Cambia da:
const API_BASE = '/api';

// A:
const API_BASE = 'https://tuoapp.replit.app/api';
```

### 3. **Configura CORS**
Nel file PHP aggiungi:
```php
header('Access-Control-Allow-Origin: *');
```

---

## ⚡ Opzione 3: Edge Functions (Più veloce)

Usa Vercel Edge Functions o Cloudflare Workers per latenza minima.

---

## 🎯 Raccomandazione

**Per iniziare subito**: Usa Opzione 2 con Replit
- ✅ Gratis
- ✅ Configurazione in 5 minuti
- ✅ Nessun setup locale

**Per produzione**: Usa Opzione 1 con Netlify Functions
- ✅ Integrato
- ✅ Scalabile
- ✅ Professionale

Quale opzione preferisci?