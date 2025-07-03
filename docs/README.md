# Gestione Commerciale Mobile

## Panoramica
Applicazione web mobile-first per la gestione commerciale completa, ottimizzata per dispositivi mobili e tablet.

## Struttura del Progetto

```
GestioneCommerciale-Mobile/
├── index.html              # Entry point principale
├── css/
│   ├── main.css           # Stili base e variabili CSS
│   ├── mobile.css         # Stili specifici per mobile
│   ├── components.css     # Componenti UI riutilizzabili
│   └── tables.css         # Stili per tabelle responsive
├── js/
│   ├── app.js             # Core dell'applicazione
│   ├── api.js             # Service layer per API
│   ├── navigation.js      # Gestione navigazione e routing
│   ├── utils.js           # Funzioni di utilità
│   ├── timeline.js        # Modulo timeline
│   ├── clienti.js         # Modulo gestione clienti
│   ├── ordini.js          # Modulo gestione ordini
│   └── prodotti.js        # Modulo gestione prodotti
├── assets/
│   ├── images/            # Immagini e icone
│   └── fonts/             # Font personalizzati
├── config/
│   └── api-config.js      # Configurazione endpoint API
└── docs/
    ├── README.md          # Questo file
    └── structure.md       # Documentazione architettura
```

## Tecnologie Utilizzate

- **HTML5** - Struttura semantica
- **CSS3** - Styling con CSS Variables e Flexbox/Grid
- **JavaScript ES6+** - Vanilla JS modulare
- **Librerie Esterne:**
  - XLSX.js - Import/export Excel
  - PDF.js - Lettura file PDF

## Caratteristiche Principali

### 1. Design Mobile-First
- Layout responsive che si adatta a tutti i dispositivi
- Touch-friendly con gesture di swipe
- Ottimizzato per performance su dispositivi mobili

### 2. Architettura Modulare
- Separazione delle responsabilità (MVC-like)
- Moduli indipendenti per ogni funzionalità
- Service layer per gestione API

### 3. Gestione Stato
- Stato centralizzato nell'oggetto App
- Persistenza dati con localStorage
- Auto-save ogni 30 secondi

### 4. API Ready
- Configurazione centralizzata degli endpoint
- Gestione cache delle richieste
- Retry automatico su errori di rete
- Supporto offline con sincronizzazione

## Setup Locale

1. **Clona o copia la cartella** sul tuo computer
2. **Apri con un server locale** (es. Live Server di VS Code)
3. **Naviga a** `http://localhost:5500` (o porta del tuo server)

### Usando Live Server (VS Code)
1. Installa l'estensione "Live Server"
2. Click destro su `index.html`
3. Seleziona "Open with Live Server"

### Usando Python
```bash
cd GestioneCommerciale-Mobile
python -m http.server 8000
```

### Usando Node.js
```bash
npx http-server -p 8000
```

## Configurazione API

Modifica `config/api-config.js` per configurare:
- `BASE_URL`: URL base delle API
- `ENDPOINTS`: Tutti gli endpoint disponibili
- `TIMEOUT`: Timeout delle richieste
- `RETRY`: Configurazione retry

## Sviluppo

### Aggiungere un Nuovo Modulo

1. Crea il file in `js/nomemodulo.js`
2. Struttura base del modulo:

```javascript
const NomeModulo = {
  state: {
    // stato locale del modulo
  },
  
  init: function() {
    // inizializzazione
  },
  
  onEnter: function() {
    // chiamato quando si entra nel tab
  },
  
  onLeave: function() {
    // chiamato quando si lascia il tab
  }
};

window.NomeModulo = NomeModulo;
```

3. Aggiungi il modulo in `index.html`
4. Registra in `app.js` nella lista dei moduli

### Aggiungere un Nuovo Tab

1. Aggiungi il tab link in `index.html`:
```html
<div id="tab-nome" class="tab-link" data-target="nome-content">Nome Tab</div>
```

2. Aggiungi il contenuto:
```html
<div id="nome-content" class="tab-content">
  <!-- Contenuto del tab -->
</div>
```

3. Aggiungi all'array in `navigation.js`:
```javascript
getTabOrder: function() {
  return [..., 'nome'];
}
```

## Best Practices

1. **Performance Mobile**
   - Usa `transform` invece di `left/top` per animazioni
   - Minimizza reflow/repaint
   - Lazy load contenuti pesanti

2. **Accessibilità**
   - Usa semantic HTML
   - Mantieni contrasto colori WCAG AA
   - Supporta navigazione da tastiera

3. **Codice**
   - Commenta funzioni complesse
   - Usa nomi descrittivi
   - Mantieni funzioni piccole e focalizzate

## Deployment

1. **Ottimizzazione**
   - Minifica CSS/JS in produzione
   - Comprimi immagini
   - Abilita caching HTTP

2. **PWA (opzionale)**
   - Aggiungi manifest.json
   - Implementa Service Worker
   - Configura icone app

## Supporto Browser

- Chrome/Edge (ultimi 2 versioni)
- Firefox (ultimi 2 versioni)
- Safari iOS 12+
- Chrome Android 80+

## Troubleshooting

### Problemi Comuni

1. **"CORS Error" in console**
   - Usa un server locale, non file://
   - Configura CORS sul server API

2. **Layout rotto su mobile**
   - Verifica viewport meta tag
   - Testa con DevTools mobile

3. **Performance lenta**
   - Controlla Network tab
   - Riduci chiamate API
   - Implementa paginazione

## Contatti e Supporto

Per problemi o domande:
- Crea una issue su GitHub
- Contatta il team di sviluppo

---

## Changelog

### v2.0.0 (2024-01-26)
- Refactoring completo da monolitico a modulare
- Implementazione design mobile-first
- Aggiunto service layer per API
- Migliorata gestione stato e navigazione

### v1.0.0
- Versione iniziale monolitica