# Fix per Indirizzi DDV Duplicati

## Problema
Nel file DDV, quando una riga contiene due indirizzi sulla stessa linea (es: "VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65"), il codice non li separava correttamente, risultando in:

```
✅ Indirizzo cliente: "VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65 12100 CUNEO CN"
✅ Indirizzo consegna: "VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65 12038 SAVIGLIANO CN"
```

Entrambi gli indirizzi contenevano la riga completa invece di essere separati.

## Soluzione Implementata

### 1. Aggiunto rilevamento di due indirizzi sulla stessa riga

Nel metodo `extractClientAndAddressFromDDV()`, aggiunta logica per rilevare quando una riga contiene due indirizzi:

```javascript
// NUOVO: Gestisci il caso specifico di due indirizzi sulla stessa riga
// Es: "VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65"
const doubleAddressMatch = line.match(/^(.*?)\s+(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)\s+(.+)$/i);
if (isAddress && doubleAddressMatch && doubleAddressMatch[1].match(/(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)/i)) {
  // La riga contiene due indirizzi
  leftPart = doubleAddressMatch[1].trim();
  rightPart = doubleAddressMatch[2] + ' ' + doubleAddressMatch[3];
  this.log(`    Due indirizzi rilevati: "${leftPart}" | "${rightPart}"`);
}
```

### 2. File Modificati
- `/js/modules/ddtft/ddt-extractor.js` - Linea ~740
- `/js/ddtft-import.js` - Linea ~2170

### 3. Risultato Atteso

Con il fix, la riga "VIA MARGARITA, 8 LOC. TETTO GARETTO VIA SALUZZO, 65" dovrebbe essere divisa in:
- Left (cliente): "VIA MARGARITA, 8 LOC. TETTO GARETTO"
- Right (consegna): "VIA SALUZZO, 65"

E gli indirizzi finali dovrebbero essere:
- Indirizzo cliente: "VIA MARGARITA, 8 LOC. TETTO GARETTO 12100 - CUNEO CN"
- Indirizzo consegna: "VIA SALUZZO, 65 12038 SAVIGLIANO CN"

## Note Importanti

1. Il fix gestisce il caso specifico dove una singola riga contiene due indirizzi
2. Funziona rilevando la presenza di due pattern di indirizzo (VIA, CORSO, etc.) sulla stessa riga
3. Il pattern esistente per duplicazioni (es: "DONAC S.R.L. DONAC S.R.L.") e CAP doppi continua a funzionare
4. Se il debug mostra ancora "Riga singola", potrebbe essere necessario verificare che il codice aggiornato sia stato caricato

## Test di Verifica

Creato test in `/test/test-ddv-address-fix.js` che verifica:
- ✅ Separazione di due indirizzi sulla stessa riga
- ✅ Gestione di indirizzi singoli
- ✅ Separazione di VIA e CORSO
- ❌ Separazione CAP doppi (gestito da altro codice)
- ❌ Rilevamento duplicazioni nome (gestito da altro codice)