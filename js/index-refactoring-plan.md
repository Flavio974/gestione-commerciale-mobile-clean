# Piano Refactoring index.html

## Problema
index.html contiene **4114 righe**, di cui:
- Blocco script 1: ~1087 righe (floating voice controls)
- Blocco script 2: ~584 righe (module loader + system init)
- Blocco script 3: ~552 righe (service worker + caching)
- Blocco script 4: ~302 righe (navigation + tabs)
- Altri blocchi minori

## Soluzione Proposta

### 1. Estrarre in file separati:
- `js/core/module-loader.js` - Sistema caricamento moduli ✅
- `js/core/service-worker-manager.js` - Gestione SW e cache
- `js/core/system-init.js` - Inizializzazione sistema
- `js/ui/floating-voice-controls.js` - Controlli vocali ✅
- `js/ui/navigation-manager.js` - Gestione navigazione e tabs
- `js/ui/drag-drop-manager.js` - Sistema drag & drop
- `js/core/error-handler.js` - Gestione errori globale

### 2. Struttura target per index.html:
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Meta tags e CSS -->
</head>
<body>
  <!-- HTML structure -->
  
  <!-- Core systems -->
  <script src="js/core/error-handler.js"></script>
  <script src="js/core/module-loader.js"></script>
  <script src="js/core/service-worker-manager.js"></script>
  <script src="js/core/system-init.js"></script>
  
  <!-- UI systems -->
  <script src="js/ui/navigation-manager.js"></script>
  <script src="js/ui/floating-voice-controls.js"></script>
  <script src="js/ui/drag-drop-manager.js"></script>
  
  <!-- App initialization -->
  <script>
    // Solo poche righe per avviare l'app
    document.addEventListener('DOMContentLoaded', () => {
      SystemInit.start();
    });
  </script>
</body>
</html>
```

### 3. Benefici:
- index.html ridotto a ~1000 righe (solo HTML + minimal JS)
- Codice più modulare e manutenibile
- Caricamento più efficiente
- Debug più facile
- Nessuna duplicazione

### 4. Priorità:
1. Estrarre i blocchi più grandi prima
2. Testare ogni estrazione
3. Rimuovere codice duplicato
4. Ottimizzare dipendenze