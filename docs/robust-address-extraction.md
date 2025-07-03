# Sistema Robusto di Estrazione Indirizzi

## Panoramica

Il nuovo sistema `RobustAddressExtractor` sostituisce tutti i fix precedenti per l'estrazione degli indirizzi di consegna da DDT e Fatture. Utilizza un approccio multi-strategia con fallback automatici per gestire layout variabili.

## Caratteristiche Principali

### 1. Multi-Strategia
Il sistema prova 5 diverse strategie in ordine:
- **Column Position**: Cerca l'header "Luogo di consegna" e estrae dalla colonna
- **Keyword Proximity**: Cerca parole chiave come "consegna", "scarico", etc.
- **Pattern Matching**: Usa regex per identificare pattern di indirizzi italiani
- **Relative Position**: Trova il cliente e cerca nella colonna a destra
- **Fuzzy Search**: Ricerca contestuale basata sul nome cliente

### 2. Confidence Scoring
Ogni strategia ritorna un punteggio di confidenza (0-1):
- 0.9: Pattern matching (molto affidabile)
- 0.8: Column position (affidabile se trova l'header)
- 0.7: Keyword proximity
- 0.6: Relative position
- 0.5-0.8: Fuzzy search (varia in base ai dati trovati)

### 3. Risultati Combinati
Se nessuna strategia ha alta confidence (>0.8), il sistema combina i risultati usando un sistema di voto pesato.

## Utilizzo

### Configurazione Base
```javascript
const extractor = new RobustAddressExtractor({
    debug: false,
    logStrategies: false,
    saveIntermediateResults: false
});
```

### Configurazione Debug
```javascript
const extractor = new RobustAddressExtractor({
    debug: true,           // Log dettagliati
    logStrategies: true,   // Log per ogni strategia
    saveIntermediateResults: true  // Salva risultati intermedi
});
```

### Estrazione
```javascript
const result = await extractor.extractDeliveryAddress(rows, metadata);

// result contiene:
{
    formatted: "VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO",
    structured: {
        street: "VIA CESANA, 78",
        additionalInfo: "INGR. SCARICO: VIA PEROSA, 75",
        postalCode: "10139",
        city: "TORINO",
        province: "TO"
    },
    components: { /* stessi dati di structured */ }
}
```

## Formato Dati Input

### Rows
Array di righe, dove ogni riga è un array di elementi:
```javascript
[
    [{ x: 27, text: "Cliente" }, { x: 294, text: "Luogo di consegna" }],
    [{ x: 39, text: "BOREALE SRL" }, { x: 309, text: "BOREALE SRL" }]
]
```

### Metadata
Informazioni contestuali sul documento:
```javascript
{
    clientName: "BOREALE SRL",
    clientCode: "20323",
    documentNumber: "4525",
    documentType: "DDT"  // o "FT"
}
```

## Debug e Troubleshooting

### Abilitare il Debug
Nel file `robust-address-integration.js`, l'estrattore è configurato con debug abilitato:
```javascript
const addressExtractor = new RobustAddressExtractor({
    debug: true,
    logStrategies: true,
    saveIntermediateResults: true
});
```

### Output Debug Esempio
```
📋 [extractByColumnPosition] Attempting strategy...
[Column Position] Found header at row 10
[Column Position] Column X position: 309
✅ [extractByColumnPosition] Success! Confidence: 0.8
   Address: {"street":"VIA CESANA, 78","additionalInfo":"INGR. SCARICO: VIA PEROSA, 75"}

📋 [extractByPatternMatching] Attempting strategy...
[Pattern Matching] Found patterns: streets: 4, postalCodes: 2, additional: 1
✅ [extractByPatternMatching] Success! Confidence: 0.9
   Address: {"street":"VIA CESANA, 78","postalCode":"10139","city":"TORINO","province":"TO"}

🎯 [Final Result] Combined address: {
    formatted: "VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO",
    structured: { ... }
}
```

## Strategie in Dettaglio

### 1. Column Position Strategy
- Cerca header contenenti "luogo di consegna", "destinazione", etc.
- Identifica la coordinata X della colonna
- Estrae tutte le righe allineate verticalmente (tolleranza 50px)
- Funziona bene con layout strutturati a colonne

### 2. Keyword Proximity Strategy
- Cerca keywords: "consegna", "scarico", "destinazione", "ingr.", etc.
- Analizza il contesto (±3 righe)
- Raggruppa risultati per colonna
- Utile quando non c'è un header chiaro

### 3. Pattern Matching Strategy
- Pattern per vie: `/(?:via|corso|piazza...)\s+[^,]+,?\s*\d*/gi`
- Pattern per CAP: `/\b(\d{5})\s*[-\s]\s*([A-Z]+)(?:\s+([A-Z]{2}))?/g`
- Pattern info aggiuntive: `/ingr\.?\s*scarico.../gi`
- Molto affidabile per indirizzi ben formattati

### 4. Relative Position Strategy
- Trova il nome cliente nel documento
- Cerca dati nella colonna a destra (X > clientX + 100)
- Utile per layout a due colonne (sede | consegna)

### 5. Fuzzy Search Strategy
- Trova tutte le occorrenze del cliente
- Estrae indirizzi nelle righe successive
- Usa fuzzy matching per variazioni del nome
- Fallback quando altre strategie falliscono

## Estensione del Sistema

### Aggiungere una Nuova Strategia
```javascript
class CustomExtractor extends RobustAddressExtractor {
    constructor(options) {
        super(options);
        // Aggiungi la nuova strategia
        this.strategies.push(this.extractByCustomMethod.bind(this));
    }
    
    extractByCustomMethod(rows, metadata) {
        // Implementa la logica
        return {
            address: parsedAddress,
            confidence: 0.75,
            method: 'custom_method'
        };
    }
}
```

### Modificare i Pattern
Modifica i pattern nel metodo `extractByPatternMatching`:
```javascript
const patterns = {
    street: /nuovo pattern vie/gi,
    postalCode: /nuovo pattern CAP/g,
    // etc...
};
```

## Performance

- **Tempo medio estrazione**: 10-50ms per documento
- **Memory footprint**: Minimo, nessun caching permanente
- **Scalabilità**: Lineare con il numero di righe

## Migrazione dai Fix Precedenti

Il nuovo sistema sostituisce completamente:
- delivery-address-fix.js
- delivery-address-complete-fix.js
- delivery-address-final-fix.js
- luogo-consegna-fix.js
- consegna-specifica-fix.js
- indirizzo-cliente-fix.js

Questi file possono essere rimossi dopo la verifica del funzionamento.

## Testing

Esegui i test decommentando la riga in index.html:
```html
<script src="test/test-robust-address-extractor.js"></script>
```

I test verificano:
- DDT con info aggiuntive di consegna
- DDT con layout a due colonne
- Fatture con indirizzo singolo
- Vari formati di CAP e città

## Esclusione Automatica Indirizzi Vettore

Il sistema esclude automaticamente gli indirizzi dei vettori/trasportatori che non sono indirizzi di consegna:

### Pattern Esclusi
- Righe contenenti "VETTORE"
- Indirizzi contenenti: "S.A.F.I.M.", "NONE", "SUPEJA GALLINO"
- Targhe veicoli (es: "TO 74321")
- Sezioni dopo "Trasporto a mezzo"

### Come Funziona
1. **Column Position**: Si ferma quando trova "vettore"
2. **Pattern Matching**: Salta la sezione vettore
3. **Filtering**: Rimuove match contenenti keyword del vettore

### Esempio
```
Cliente                    Luogo di consegna
DONAC S.R.L.              DONAC S.R.L.
VIA MARGARITA, 8          VIA SALUZZO, 65        ← QUESTO viene estratto
12100 - CUNEO CN          12038 SAVIGLIANO CN    ← QUESTO viene estratto

VETTORE
S.A.F.I.M. S.P.A
VIA SUPEJA GALLINO 20/28                         ← QUESTO viene IGNORATO
10060 NONE TO                                    ← QUESTO viene IGNORATO
```

## Troubleshooting Comuni

### Indirizzo non trovato
1. Verifica che il debug sia abilitato
2. Controlla quale strategia sta fallendo
3. Verifica il formato dei dati in input (rows)

### Indirizzo parziale
1. Controlla i pattern regex
2. Verifica la tolleranza delle colonne (default 50px)
3. Aumenta il contesto delle keyword (default ±3 righe)

### Viene estratto l'indirizzo sbagliato (es. vettore)
1. Aggiungi keyword di esclusione in `isAddressComponent()`
2. Aggiungi vettori specifici in `vettoreKeywords`
3. Verifica che la sezione vettore sia identificata correttamente

### Performance lenta
1. Disabilita il debug in produzione
2. Riduci il numero di strategie se alcune non servono
3. Ottimizza i pattern regex