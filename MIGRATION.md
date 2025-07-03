# Guida alla Migrazione: ddtft-import.js → ddtft-import-modular.js

## Panoramica

Questa guida documenta come migrare dal file monolitico `ddtft-import.js` (7471 righe) alla nuova versione completamente modularizzata.

## Vantaggi della Migrazione

1. **Performance**: Nessun timeout durante il caricamento
2. **Manutenibilità**: Codice organizzato in moduli separati
3. **Testabilità**: Ogni modulo può essere testato indipendentemente
4. **Estensibilità**: Facile aggiungere nuove funzionalità
5. **Debug**: Errori più facili da individuare

## Struttura dei Nuovi Moduli

```
js/
├── ddtft-import-modular.js     # File principale (sostituisce ddtft-import.js)
├── core/
│   └── ddtft-import-core.js    # Logica core di importazione
├── validators/
│   └── ddtft-validators.js     # Validazione documenti
├── formatters/
│   └── ddtft-formatters.js     # Formattazione output
├── parsers/                     # (Esistenti)
│   ├── base-extractor.js
│   ├── ddt-extractor-modular.js
│   ├── fattura-extractor-modular.js
│   └── ddtft-column-parser.js
├── utils/                       # (Esistenti)
│   ├── ddtft-parsing-utils.js
│   ├── ddtft-product-utils.js
│   ├── ddtft-address-utils.js
│   └── ddtft-utils.js
└── config/                      # (Esistenti)
    ├── ddtft-patterns.js
    └── ddtft-mappings.js
```

## Step di Migrazione

### Step 1: Backup

```bash
# Crea backup del file originale
cp js/ddtft-import.js js/ddtft-import.js.backup
```

### Step 2: Aggiorna index.html

Sostituisci nel file `index.html`:

```html
<!-- VECCHIO -->
<script src="js/ddtft-import.js?v=4.4"></script>

<!-- NUOVO -->
<!-- Carica prima le dipendenze -->
<script src="js/config/ddtft-patterns.js"></script>
<script src="js/config/ddtft-mappings.js"></script>
<script src="js/utils/ddtft-parsing-utils.js"></script>
<script src="js/utils/ddtft-product-utils.js"></script>
<script src="js/utils/ddtft-address-utils.js"></script>
<script src="js/parsers/base-extractor.js"></script>
<script src="js/parsers/ddt-extractor-modular.js"></script>
<script src="js/parsers/fattura-extractor-modular.js"></script>
<script src="js/modules/ddtft-pdf-parser.js"></script>
<script src="js/modules/ddtft/document-parser.js"></script>
<script src="js/validators/ddtft-validators.js"></script>
<script src="js/formatters/ddtft-formatters.js"></script>
<script src="js/core/ddtft-import-core.js"></script>
<!-- File principale -->
<script src="js/ddtft-import-modular.js?v=1.0"></script>
```

### Step 3: Test di Compatibilità

Esegui il test di integrazione:

```html
<script src="js/test-modular-import.js"></script>
```

Verifica nella console che tutti i test passino.

### Step 4: Aggiornamento Codice (se necessario)

L'interfaccia pubblica è mantenuta al 100%, quindi non dovrebbero essere necessarie modifiche al codice esistente. 

Tuttavia, se hai esteso `DDTFTImport`:

```javascript
// VECCHIO
class MyCustomImport extends DDTFTImport {
    // ...
}

// NUOVO (opzionale, per maggiore controllo)
class MyCustomImport extends window.DDTFTImportClass {
    // ...
}
```

## Nuove Funzionalità Disponibili

### 1. Validazione Avanzata

```javascript
// Valida un documento
const validation = DDTFTImport.validateDocument(doc);
if (!validation.valid) {
    console.error('Errori:', validation.errors);
    console.warn('Avvisi:', validation.warnings);
}
```

### 2. Formattazione Flessibile

```javascript
// Formatta per visualizzazione
const formatted = DDTFTImport.formatDocument(doc);

// Formatta per Excel
const excelData = DDTFTImport.formatters.formatForExcel(doc);

// Formatta per stampa
const printable = DDTFTImport.formatters.formatForPrint(doc);
```

### 3. Import Multiplo con Progress

```javascript
const files = [...]; // Array di file PDF

const results = await DDTFTImport.importMultipleDocuments(files, {
    onProgress: (progress) => {
        console.log(`${progress.current}/${progress.total} - ${progress.percent}%`);
    }
});
```

### 4. Statistiche

```javascript
const stats = DDTFTImport.getStatistics(documents);
console.log('Statistiche:', stats);
// { totale: 50, perTipo: {...}, perCliente: {...}, ... }
```

## Breaking Changes

**NESSUNO** - La migrazione è stata progettata per essere 100% retrocompatibile.

## Troubleshooting

### Problema: "DDTFTImport is not defined"

**Soluzione**: Assicurati di caricare tutti i moduli nell'ordine corretto in index.html

### Problema: "Metodo X non trovato"

**Soluzione**: Verifica che tutti i file siano caricati eseguendo:
```javascript
console.log(Object.keys(window).filter(k => k.includes('DDTFT')));
```

### Problema: Performance degradata

**Soluzione**: Abilita la cache del browser e verifica che i file JS siano minificati in produzione.

## Rollback

Se necessario tornare alla versione monolitica:

1. Ripristina in index.html:
   ```html
   <script src="js/ddtft-import.js?v=4.4"></script>
   ```

2. Rimuovi i riferimenti ai nuovi moduli

3. Elimina il file `.claudeignore`

## Supporto

Per problemi o domande sulla migrazione:
- Controlla i log della console
- Esegui `test-modular-import.js`
- Verifica che tutti i moduli siano caricati

## Prossimi Passi

Dopo la migrazione riuscita:

1. **Minificazione**: Considera di minificare i moduli per produzione
2. **Bundle**: Opzionalmente crea un bundle con webpack/rollup
3. **Lazy Loading**: Implementa caricamento lazy per moduli non critici
4. **Testing**: Aggiungi test unitari per ogni modulo

## Note Finali

La nuova architettura modulare permette di:
- Modificare singoli moduli senza toccare altri
- Aggiungere nuovi parser/validatori facilmente
- Debuggare problemi più velocemente
- Mantenere il codice più pulito e organizzato

La migrazione è completamente trasparente per l'utente finale e migliora significativamente l'esperienza dello sviluppatore.