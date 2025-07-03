# Guida alla Configurazione della Mappatura Clienti

## Introduzione

Questa guida spiega come configurare correttamente la mappatura dei clienti nel sistema GestioneCommerciale-Mobile. La mappatura è necessaria perché nei file PDF delle fatture (FTV) il nome del cliente spesso non viene estratto correttamente e appare come "Luogo di consegna".

## Come Funziona il Sistema

### 1. Struttura del Nome File

I file delle fatture seguono questo formato:
```
FTV_705048_2025_[20001]_4915_9062025.PDF
```

Dove:
- `FTV` = Tipo documento (Fattura)
- `705048` = Numero progressivo
- `2025` = Anno
- **`[20001]`** = **CODICE CLIENTE** (questo è il valore che ci interessa)
- `4915` = Altro codice
- `9062025` = Data (formato GGMMAAAA)

### 2. File di Configurazione

Il file di configurazione si trova in:
```
js/modules/ddtft/client-mapping-fix.js
```

## Istruzioni per la Configurazione

### Passo 1: Identificare i Codici Cliente

1. Guarda i nomi dei file PDF delle fatture nella cartella di importazione
2. Identifica il codice cliente tra le parentesi quadre nel nome file
   - Esempio: in `FTV_705048_2025_[20001]_4915_9062025.PDF` il codice è `20001`
3. Fai una lista di tutti i codici cliente trovati

### Passo 2: Modificare il File di Mappatura

1. Apri il file `js/modules/ddtft/client-mapping-fix.js`
2. Trova la sezione `CLIENT_MAPPING` (intorno alla riga 12)
3. Aggiungi o modifica le mappature seguendo questo formato:

```javascript
const CLIENT_MAPPING = {
    '20001': 'Nome Reale del Cliente Srl',
    '20322': 'DONAC S.R.L.',
    '20123': 'Supermercato Rossi SpA',
    '20456': 'Bar Centrale di Mario Bianchi',
    // Aggiungi altre mappature qui
};
```

### Passo 3: Esempi Pratici

#### Esempio 1: Aggiungere un Nuovo Cliente

Se hai un file `FTV_705048_2025_[20789]_4915_9062025.PDF` e sai che il codice 20789 corrisponde a "Pizzeria da Luigi":

```javascript
const CLIENT_MAPPING = {
    '20001': 'Nome Reale del Cliente Srl',
    '20322': 'DONAC S.R.L.',
    '20789': 'Pizzeria da Luigi',  // <-- Nuova riga aggiunta
};
```

#### Esempio 2: Modificare un Cliente Esistente

Se scopri che il codice 20001 corrisponde a "Ristorante La Torre":

```javascript
const CLIENT_MAPPING = {
    '20001': 'Ristorante La Torre',  // <-- Modificato da 'INSERIRE NOME REALE CLIENTE 20001'
    '20322': 'DONAC S.R.L.',
};
```

#### Esempio 3: Mappatura Completa

```javascript
const CLIENT_MAPPING = {
    // Ristoranti
    '20001': 'Ristorante La Torre',
    '20002': 'Trattoria del Borgo',
    '20003': 'Pizzeria Margherita',
    
    // Bar e caffetterie
    '20100': 'Bar Centrale',
    '20101': 'Caffè degli Artisti',
    
    // Supermercati
    '20200': 'Supermercato Conad',
    '20201': 'Minimarket 24h',
    
    // Altri clienti
    '20322': 'DONAC S.R.L.',
    '20400': 'Hotel Bellavista',
};
```

### Passo 4: Salvare le Modifiche

1. Dopo aver modificato il file, salva le modifiche
2. **IMPORTANTE**: Usa sempre l'apostrofo singolo `'` per delimitare i valori
3. Assicurati che ogni riga (tranne l'ultima) termini con una virgola `,`
4. Non inserire caratteri speciali che potrebbero causare errori JavaScript

## Come Verificare che Funzioni

### Test 1: Verifica nel Browser

1. Apri l'applicazione nel browser
2. Apri la Console del browser (F12 → Console)
3. Importa un file PDF di fattura
4. Dovresti vedere messaggi come:
   ```
   🔧 Applicando fix mappatura clienti...
   🎯 [CLIENT MAPPING FIX] Intercettato extract su FatturaExtractor
   [CLIENT MAPPING FIX] Codice cliente estratto dal nome file: 20001
   ✅ [CLIENT MAPPING FIX] Cliente mappato: 20001 -> Ristorante La Torre
   ```

### Test 2: Verifica nell'Interfaccia

1. Dopo l'importazione, controlla la colonna "Cliente" nella tabella
2. Dovrebbe mostrare il nome reale del cliente invece di "Luogo di consegna"
3. Se vedi ancora "Luogo di consegna", verifica:
   - Il codice cliente nel nome file
   - La mappatura nel file di configurazione
   - Eventuali errori nella console del browser

### Test 3: Debug Avanzato

Se non funziona, aggiungi questo codice temporaneo per debug:

```javascript
// Aggiungi dopo la riga 11 nel file client-mapping-fix.js
console.log('Mappature caricate:', CLIENT_MAPPING);
```

Poi ricarica la pagina e verifica che le mappature siano caricate correttamente.

## Risoluzione Problemi

### Problema 1: Il cliente non viene mappato

**Possibili cause:**
- Il codice cliente nel file non corrisponde a quello nella mappatura
- Errore di sintassi nel file JavaScript
- Il file non viene caricato correttamente

**Soluzione:**
1. Verifica che il codice sia esattamente lo stesso (attenzione a zeri iniziali)
2. Controlla la sintassi JavaScript
3. Pulisci la cache del browser (Ctrl+F5)

### Problema 2: Errore JavaScript nella console

**Possibili cause:**
- Virgola mancante o di troppo
- Apostrofi non bilanciati
- Caratteri speciali nel nome cliente

**Soluzione:**
1. Controlla che ogni riga (tranne l'ultima) abbia la virgola
2. Usa solo apostrofi singoli `'`
3. Se il nome contiene apostrofi, usa il backslash: `'L\'Osteria'`

### Problema 3: La mappatura funziona solo per alcuni file

**Possibili cause:**
- Formato del nome file diverso
- Codice cliente in posizione diversa

**Soluzione:**
1. Verifica il formato del nome file
2. Se necessario, contatta lo sviluppatore per adattare il pattern di estrazione

## Mappatura Indirizzi (Opzionale)

Il sistema supporta anche la mappatura degli indirizzi di consegna. Per configurarla:

1. Crea un file `js/config/ddtft-mappings.js` se non esiste
2. Aggiungi la configurazione degli indirizzi:

```javascript
window.DDTFT_MAPPINGS = {
    clientAddresses: {
        'Ristorante La Torre': 'Via Roma 123, 00100 Roma',
        'DONAC S.R.L.': 'Via Milano 45, 20100 Milano',
        // Altri indirizzi...
    }
};
```

## Note Importanti

1. **Backup**: Prima di modificare il file, fai sempre una copia di backup
2. **Maiuscole/Minuscole**: I codici cliente sono sensibili alle maiuscole/minuscole
3. **Spazi**: Non aggiungere spazi prima o dopo i codici cliente
4. **Aggiornamenti**: Quando aggiungi nuovi clienti, aggiorna sempre la mappatura
5. **Privacy**: Non condividere il file di mappatura contenente i nomi reali dei clienti

## Contatti per Supporto

Se hai problemi con la configurazione o hai bisogno di modifiche al sistema di mappatura, contatta il supporto tecnico fornendo:
- Il nome del file PDF problematico
- Il codice cliente estratto
- Eventuali messaggi di errore dalla console del browser

---

**Ultimo aggiornamento**: 15 Giugno 2025