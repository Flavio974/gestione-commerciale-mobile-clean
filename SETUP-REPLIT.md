# 🚀 Setup API su Replit (Soluzione Semplice)

## Perché Replit?
- ✅ Gratis
- ✅ Funziona subito
- ✅ Nessuna configurazione complessa
- ✅ Supporta PHP nativamente

## Setup in 5 minuti:

### 1. Crea account Replit
- Vai su [replit.com](https://replit.com)
- Registrati (gratis)

### 2. Crea nuovo Repl
- Click "Create Repl"
- Scegli "PHP Web Server"
- Nome: "smart-assistant-api"

### 3. Carica i file API
Copia questi file nel Repl:
- `api/speech-to-text.php`
- `api/claude-ai.php`

### 4. Ottieni URL pubblico
Il tuo Repl avrà un URL tipo:
```
https://smart-assistant-api.tuousername.repl.co
```

### 5. Aggiorna l'app
Cambia in `index.html` e `smart-assistant.js`:
```javascript
// Da:
const apiUrl = '/api/...';

// A:
const apiUrl = 'https://smart-assistant-api.tuousername.repl.co/api/...';
```

## Fatto! 
L'AI funzionerà ovunque: PC, iPad, Netlify!

---

**Vantaggi:**
- Funziona SEMPRE, ovunque
- Nessun problema di CORS
- PHP già configurato
- API keys già nel codice