# 🤖 AI Assistant Setup - Integrazione OpenAI + Claude + Supabase

## 📋 Configurazione Richiesta

### 1. Variabili Ambiente
Aggiungi al tuo server web (o file .env):

```bash
OPENAI_API_KEY=sk-proj-...          # La tua API key di OpenAI (opzionale)
ANTHROPIC_API_KEY=sk-ant-api03-...  # La tua API key di Anthropic Claude (opzionale)
```

**IMPORTANTE**: Puoi configurare uno o entrambi i provider. Sostituisci `YOUR_OPENAI_API_KEY_HERE` e `YOUR_ANTHROPIC_API_KEY_HERE` nel file `api/claude-ai.php` con le tue vere API key se non usi variabili ambiente.

### 2. Permissions File System
```bash
chmod 755 api/
chmod 644 api/claude-ai.php
chmod 755 api/logs/
chmod 644 api/.htaccess
```

### 3. Configurazione Web Server

#### Apache
Il file `.htaccess` è già configurato per gestire CORS e sicurezza.

#### Nginx
Aggiungi al tuo config:
```nginx
location /api/ {
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "POST, GET, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    
    if ($request_method = 'OPTIONS') {
        return 200;
    }
    
    try_files $uri $uri/ /api/claude-ai.php?$query_string;
}
```

## 🔗 Struttura Supabase Supportata

L'AI si aspetta queste tabelle nel tuo Supabase:

### Tabella `clients`
```sql
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    city VARCHAR(100),
    total_revenue DECIMAL(10,2),
    last_contact TIMESTAMP,
    status VARCHAR(50)
);
```

### Tabella `orders`
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(255),
    order_date DATE,
    amount DECIMAL(10,2),
    status VARCHAR(50),
    products JSONB
);
```

### Tabella `documents`
```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(50), -- 'DDT', 'Fattura', etc.
    document_number VARCHAR(100),
    client_name VARCHAR(255),
    document_date DATE,
    total_amount DECIMAL(10,2)
);
```

### Tabella `timeline_events`
```sql
CREATE TABLE timeline_events (
    id SERIAL PRIMARY KEY,
    event_date TIMESTAMP,
    event_type VARCHAR(100),
    description TEXT,
    client_name VARCHAR(255)
);
```

## 🧪 Test Installazione

### 1. Test Backend
Visita: `https://tuodominio.com/api/claude-ai.php?test`

Risposta attesa:
```json
{
    "status": "ok",
    "message": "Claude AI API endpoint is working",
    "timestamp": "2024-01-01 12:00:00"
}
```

### 2. Test Frontend
1. Apri l'app web
2. Clicca sul tab "🤖 AI Assistant"
3. Verifica che mostri "✅ Backend attivo"
4. Prova una query rapida come "Fatturato"

### 3. Test Query AI
Esempi di query da testare:
- "Fatturato totale questo mese"
- "Clienti zona Torino"
- "Ordini in sospeso"
- "Appuntamenti questa settimana"

## 📊 Monitoraggio Costi

### Log Files
- `api/logs/ai_usage_YYYY-MM.json` - Log mensili utilizzo
- Contiene: tokens usati, modello, costi, timestamp

### Prezzi Approssimativi (aggiorna secondo prezzi attuali)

#### OpenAI
- **GPT-3.5 Turbo**: €0.50/1M input tokens, €1.50/1M output tokens
- **GPT-4**: €30.00/1M input tokens, €60.00/1M output tokens
- **GPT-4 Turbo**: €10.00/1M input tokens, €30.00/1M output tokens

#### Claude (Anthropic)
- **Claude 3 Haiku**: €0.25/1M input tokens, €1.25/1M output tokens
- **Claude 3 Sonnet**: €3.00/1M input tokens, €15.00/1M output tokens  
- **Claude 3 Opus**: €15.00/1M input tokens, €75.00/1M output tokens

## 🔧 Personalizzazione

### Modificare Prompt Sistema
Edita la funzione `buildSystemPrompt()` in `api/claude-ai.php`

### Aggiungere Query Rapide
Modifica l'oggetto `queries` nel metodo `quickQuery()` in `index.html`

### Configurare Timeout Cache
Modifica `cacheTimeout` in `js/ai/supabase-ai-integration.js` (default: 5 minuti)

## 🚨 Troubleshooting

### Errore "Tab non valido: ai"
Il tab AI è stato aggiunto al sistema di navigazione. Se vedi questo errore:
1. Verifica che `js/navigation.js` sia aggiornato
2. Controlla che il tab 'ai' sia incluso in `getTabOrder()`
3. Ricarica completamente la pagina (F5 o Ctrl+F5)

### Errore "Backend non raggiungibile"
1. Verifica che il file `api/claude-ai.php` sia accessibile
2. Controlla i permessi file (755/644)
3. Verifica configurazione CORS nel web server

### Errore "API Key non valida"

#### Per OpenAI:
1. Verifica che OPENAI_API_KEY sia impostata correttamente
2. Controlla che inizi con `sk-proj-` o `sk-`
3. Verifica i crediti disponibili nel tuo account OpenAI

#### Per Claude:
1. Verifica che ANTHROPIC_API_KEY sia impostata correttamente
2. Controlla che inizi con `sk-ant-`
3. Verifica i crediti disponibili nel tuo account Anthropic

### Errore "Dati Supabase non trovati"
1. Verifica che `window.supabase` sia disponibile
2. Controlla che le tabelle esistano con i nomi corretti
3. Verifica permessi RLS (Row Level Security) su Supabase

### Performance lente
1. Riduci il `cacheTimeout` in `supabase-ai-integration.js`
2. Usa Claude 3 Haiku per risposte più veloci
3. Limita il numero di record nelle query Supabase

## 📞 Supporto

Per problemi:
1. Controlla i log browser (F12 -> Console)
2. Controlla i log server in `api/logs/`
3. Testa l'endpoint backend direttamente
4. Verifica la configurazione Supabase

## 🔄 Aggiornamenti

L'AI Assistant è modulare e può essere facilmente aggiornato:
- Backend: sostituisci `api/claude-ai.php`
- Frontend: modifica i metodi in `index.html`
- Supabase: aggiorna `js/ai/supabase-ai-integration.js`