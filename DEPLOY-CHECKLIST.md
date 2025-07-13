# 🚀 CHECKLIST DEPLOY NETLIFY - Anti-Errori JS

## ✅ PRE-DEPLOY

### 1. **Verifica File Locali**
```bash
# Test script creato:
node test-js-files.js

# Controlla che tutti i file esistano:
ls -la config/temporal-settings.js
ls -la js/middleware/vocabulary-*.js
ls -la js/data/italian-date-*.js
```

### 2. **Sintassi JS Pulita**
```bash
# Test sintassi (se hai eslint):
npx eslint config/temporal-settings.js
npx eslint js/middleware/vocabulary-manager.js

# O semplicemente:
node -c config/temporal-settings.js
node -c js/middleware/vocabulary-manager.js
```

### 3. **Console.log Debug Headers**
Verifica che ogni file JS inizi con:
```javascript
console.log('[LOAD] ✅ nome-file.js caricato correttamente');
```

## ✅ NETLIFY.TOML - CONFIGURAZIONE CORRETTA

### ❌ **NON FARE** (causa "Unexpected token '<'):
```toml
# SBAGLIATO - Loop infinito
[[redirects]]
  from = "/config/*"
  to = "/config/:splat"

# SBAGLIATO - Troppo aggressivo  
[[redirects]]
  from = "/*.js"
  to = "/:splat"
```

### ✅ **CONFIGURAZIONE CORRETTA**:
```toml
[build]
  publish = "."
  command = "npm install --prefix functions"

# ✅ SOLO redirect API
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

# ✅ SPA fallback (SEMPRE ULTIMO)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  force = false
```

## ✅ HEADERS CORRETTI

```toml
[[headers]]
  for = "*.js"
  [headers.values]
    Content-Type = "application/javascript"
    Cache-Control = "public, max-age=3600"

[[headers]]
  for = "*.css"
  [headers.values]
    Content-Type = "text/css"
    Cache-Control = "public, max-age=3600"
```

## ✅ POST-DEPLOY

### 1. **Test Immediato**
```bash
# Esegui subito dopo deploy:
node test-js-files.js

# O manualmente:
curl -I https://tuodominio.netlify.app/config/temporal-settings.js
# Deve ritornare: Content-Type: application/javascript
```

### 2. **Console Browser**
Apri DevTools → Console e verifica:
```
✅ [LOAD] temporal-settings.js caricato correttamente
✅ [LOAD] vocabulary-manager.js caricato correttamente
✅ ItalianDateParser caricato
```

### 3. **Network Tab**
DevTools → Network → Reload:
- Tutti i file .js devono essere **200 OK**
- Content-Type deve essere `application/javascript`
- **NON** `text/html`

## 🚨 **TROUBLESHOOTING RAPIDO**

### Errore: `Unexpected token '<'`
**Causa:** File JS restituisce HTML invece di JavaScript
**Fix:** 
1. Controlla `netlify.toml` - rimuovi redirect loops
2. Verifica che il file esista nella cartella corretta
3. Clear cache: `Ctrl+Shift+R` o deploy forzato

### Errore: `ReferenceError: Class is not defined`  
**Causa:** Ordine di caricamento moduli sbagliato
**Fix:**
1. Aggiungi protezioni nei file:
```javascript
if (typeof DependentClass === 'undefined') {
    console.warn('DependentClass non disponibile, skip init');
    return;
}
```

### Errore: `503 Service Unavailable`
**Causa:** API esterna down (Replit/PHP)
**Fix:** Già implementato graceful degradation in `keep-alive.js`

## 🔧 **CACHE BUSTING**

### Per deployment critici:
```html
<!-- In index.html -->
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<script src="config/temporal-settings.js?v=20250713"></script>
```

### O programmaticamente:
```javascript
const timestamp = Date.now();
const script = document.createElement('script');
script.src = `config/temporal-settings.js?t=${timestamp}`;
```

## 🎯 **BEST PRACTICES ANTI-ERRORE**

1. **Mai redirect di file statici** - lascia che Netlify li serva direttamente
2. **Sempre test locale prima di deploy** - `node test-js-files.js`
3. **Console.log all'inizio di ogni modulo** - debug immediato
4. **Protezioni per dipendenze** - mai assumere che altre classi esistano
5. **Graceful degradation** - app deve funzionare anche se alcune parti falliscono

## ⚡ **DEPLOY RAPIDO**

```bash
# 1. Test pre-deploy
node test-js-files.js

# 2. Commit & push
git add .
git commit -m "fix: risoluzione conflitti JS"
git push

# 3. Test post-deploy (attendi 30-60s)
node test-js-files.js

# 4. Verifica manuale browser
# → F12 → Console → dovrebbe essere pulita ✅
```

---

**✅ Con questa checklist, i tuoi errori JS dovrebbero essere risolti definitivamente!**