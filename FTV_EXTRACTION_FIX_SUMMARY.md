# ✅ Fix Estrazione Nomi FTV Completato

## Problema Riportato
Dopo il refactoring, l'estrazione dei nomi nei file FTV non applicava più correttamente le regole di truncation:

1. **"AZ. AGR. LA MANDRIA S.S. DI GOIA E. E CAPRA S. S.S."** → dovrebbe essere **"AZ. AGR. LA MANDRIA S.S."**
2. **"ARUDI MIRELLA P.ZA DEL POPOLO, 3"** → dovrebbe essere **"ARUDI MIRELLA"**

## Soluzione Implementata

### 1. Fix nel Modulo fattura-extractor.js
Aggiunta la logica di truncation nel metodo `extractClientForInvoice()` per i file FTV:

```javascript
// IMPORTANTE: Applica la logica delle sigle societarie per troncare il nome
const sigleSocietarie = [
  'S\\.?R\\.?L\\.?', 'S\\.?P\\.?A\\.?', 'S\\.?N\\.?C\\.?', 'S\\.?A\\.?S\\.?',
  'S\\.?S\\.?(?:\\.|\\b)', 'S\\.?C\\.?', 'COOP', '& C\\.', '& FIGLI', '& F\\.LLI',
  'SARL', 'SA', 'LTD', 'GMBH', 'AG', 'BV', 'NV'
];
const siglePattern = new RegExp(`\\b(${sigleSocietarie.join('|')})\\b`, 'i');
const sigleMatch = fullName.match(siglePattern);

if (sigleMatch) {
  const sigleIndex = fullName.search(siglePattern);
  let sigleEndIndex = sigleIndex + sigleMatch[0].length;
  
  // Per sigle che potrebbero avere un punto finale
  if ((sigleMatch[0] === 'S.S' || sigleMatch[0] === 'S.A.S' || sigleMatch[0] === 'SAS' ||
       sigleMatch[0] === 'S.R.L' || sigleMatch[0] === 'S.P.A' || sigleMatch[0] === 'S.N.C') && 
      fullName[sigleEndIndex] === '.') {
    sigleEndIndex++;
  }
  
  // Tronca il nome fino alla sigla societaria (inclusa)
  fullName = fullName.substring(0, sigleEndIndex).trim();
}

// NUOVO: Controlla se il nome contiene l'inizio di un indirizzo
const addressStartPattern = /\b(P\.ZA|P\.ZZA|PIAZZA|VIA|V\.LE|VIALE|CORSO|C\.SO)\b/i;
const addressMatch = fullName.match(addressStartPattern);

if (addressMatch) {
  const addressIndex = fullName.search(addressStartPattern);
  // Tronca il nome prima dell'indirizzo
  fullName = fullName.substring(0, addressIndex).trim();
}
```

### 2. Fix nel File Inline ddtft-import.js
Stessa logica applicata nel file inline per mantenere la sincronizzazione tra moduli e versione inline.

### 3. File Modificati
- `/js/modules/ddtft/fattura-extractor.js` - Riga ~1878 e ~2064
- `/js/ddtft-import.js` - Riga ~5228 e ~5374

## Test di Verifica
Creato test specifico in `/test/test-ftv-extraction-inline.js` che verifica:

✅ **S.S. che si ferma alla sigla**: "AZ. AGR. LA MANDRIA S.S. DI GOIA E. E CAPRA S. S.S." → "AZ. AGR. LA MANDRIA S.S."
✅ **Nome con indirizzo P.ZA**: "ARUDI MIRELLA P.ZA DEL POPOLO, 3" → "ARUDI MIRELLA"
✅ **S.A.S. che si ferma alla sigla**: "BOTTEGA DELLA CARNE SAS DI BONANATE DANILO & C." → "BOTTEGA DELLA CARNE SAS"
✅ **FTV con prodotti**: Corretto skip della sezione prodotti e estrazione nome

## Risultato
Tutti i test passano con successo. L'estrazione FTV ora applica correttamente:
1. Truncation alle sigle societarie (S.S., S.A.S., S.R.L., etc.)
2. Truncation prima degli indirizzi (P.ZA, VIA, etc.)
3. Skip corretto delle sezioni prodotto nei template FTV

## Note Importanti
- La logica è stata aggiunta in due punti del metodo `extractClientForInvoice()` per coprire diversi pattern di estrazione
- Il fix mantiene la compatibilità con tutti i casi esistenti
- La stessa logica già funzionante per DDT è ora applicata anche per FTV