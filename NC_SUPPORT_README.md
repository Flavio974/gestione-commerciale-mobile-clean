# Supporto per documenti NC (Note di Credito)

## Modifiche implementate

Il sistema è stato aggiornato per riconoscere e gestire i documenti di tipo "NC" (Note di Credito) con gestione speciale per i totali.

### File modificati:
1. `/js/modules/ddtft/document-parser.js` - Parser principale
2. `/js/modules/ddtft/fattura-totale-documento-fix-finale.js` - Fix totali
3. `/js/modules/ddtft/ftv-piva-fix.js` - Fix P.IVA
4. `/js/modules/ddtft/nc-number-fix.js` - Fix estrazione numero NC (nuovo)

### Modifiche apportate:

#### 1. Riconoscimento documenti NC (`document-parser.js`):

- **Riconoscimento dal nome file**: 
  - Priorità a NC: `upperFileName.includes('NC_')` o `upperFileName.includes('NCV')`
  - Poi FTV/FT per fatture normali
  
- **Pattern di riconoscimento nel testo** (controlla prima NC):
  - `/NOTA\s+DI\s+CREDITO/i` per "NOTA DI CREDITO"
  - `/NOTA\s+CREDITO/i` per varianti senza "di"
  - `/NC\s+N[°.\s]*\d+/` per "NC N° 123"
  - `/NC\s+\d+/` per "NC 123"
  - `/^NC\s*$/m` per "NC" su riga isolata
  - `/NOTA\s+ACCREDITO/i` per "NOTA ACCREDITO"

- **Tipo documento separato**:
  - NC viene riconosciuto come tipo 'nc' (non più mappato a 'ft')
  - Usa lo stesso parser delle fatture ma mantiene type = 'nc'

#### 2. Gestione totali NC (`fattura-totale-documento-fix-finale.js`):

- **Supporto esplicito per NC**:
  - Aggiunto controllo per `result.type === 'nc' || result.documentType === 'NC'`
  
- **Pattern specifico per NC**:
  - Cerca l'ultimo valore numerico significativo nelle ultime 30 righe
  - Verifica che sia maggiore del subtotale ma ragionevole (< 1.5x subtotale)
  - Corregge automaticamente il problema dello scambio totale/imponibile

#### 3. Fix P.IVA (`ftv-piva-fix.js`):

- Esteso per supportare anche documenti NC oltre a FT/FTV

#### 4. Fix numero documento NC (`nc-number-fix.js`):

- **Problema risolto**: Il sistema estraeva "1" invece del numero corretto (es. 703873)
- **Pattern aggiunti per NC**:
  - `NC N° 703873`
  - `NC 703873`
  - `NOTA DI CREDITO N° 703873`
  - Estrazione dal nome file se altri metodi falliscono
- **Fallback intelligente**: Se trova "1", cerca il numero nel nome file

### Comportamento:
- I documenti NC vengono riconosciuti come tipo separato 'nc'
- Utilizzano lo stesso parser delle fatture (FatturaExtractor)
- Vengono visualizzati nell'interfaccia come documenti di tipo NC
- I totali vengono estratti correttamente (non più scambiati con l'imponibile)
- L'IVA viene ricalcolata correttamente

### Problemi risolti:
1. ✅ NC non più identificate come FT
2. ✅ Totali corretti (non più scambio totale/imponibile)
3. ✅ Calcolo IVA corretto
4. ✅ Numero documento estratto correttamente (non più "1")

### Test:
Per testare il funzionamento, importare i file PDF forniti:
- FTV_703873_2025_20001_4769_4062025.PDF (contiene NC)
- FTV_703931_2025_20001_4776_4062025.PDF (contiene NC)

Il sistema dovrebbe:
- Riconoscerli come NC (non FT)
- Estrarre correttamente i totali (es. 333.24 invece di 331.28)
- Calcolare correttamente l'IVA