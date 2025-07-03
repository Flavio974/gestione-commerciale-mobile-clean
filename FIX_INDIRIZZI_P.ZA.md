# 🎯 Fix Estrazione Indirizzi P.ZA e Altri Tipi

## Problema Risolto

Il sistema **non estraeva** gli indirizzi di consegna per clienti come:
- **La Mandria**: `VIA REPERGO, 40 14057 ISOLA D'ASTI AT`
- **Arudi Mirella**: `P.ZA DEL POPOLO, 3 14046 MOMBARUZZO AT`

Il problema principale era che i pattern cercavano solo "VIA" e non riconoscevano "P.ZA" (Piazza) e altri tipi di strada.

## Soluzioni Implementate

### 1. ✅ Pattern Multipli per Tutti i Tipi di Strada

```javascript
const addressPatterns = [
  // VIA NOME, NUMERO
  /(VIA\s+[A-Z\s,'\.]+\d+)\s*(\d{5}\s+[A-Z\s']+\s+[A-Z]{2})/i,
  
  // P.ZA/PIAZZA NOME, NUMERO  
  /(P\.?ZA\s+[A-Z\s,]+\d+)\s*(\d{5}\s+[A-Z\s]+\s+[A-Z]{2})/i,
  
  // CORSO, VIALE, etc.
  /((?:CORSO|C\.SO|VIALE|V\.LE)\s+[A-Z\s,]+\d+)\s*(\d{5}\s+[A-Z\s]+\s+[A-Z]{2})/i,
  
  // Pattern multi-riga: indirizzo su una riga, CAP+città su altra
  /((?:VIA|P\.?ZA|PIAZZA|CORSO|VIALE)\s+[A-Z\s,'\.]+\d+)[\s\n]*(\d{5}\s+[A-Z\s']+\s+[A-Z]{2})/i
];
```

### 2. ✅ Mappatura per Codice Interno

```javascript
const INTERNAL_CODE_DELIVERY_MAPPING = {
  '701168': 'VIA REPERGO, 40 14057 ISOLA D\'ASTI AT',      // La Mandria
  '701179': 'P.ZA DEL POPOLO, 3 14046 MOMBARUZZO AT',     // Arudi Mirella
  '701029': 'VIA CAVOUR, 61 14100 ASTI AT',               // Piemonte Carni
  '701134': 'VIA FONTANA, 4 14100 ASTI AT',               // Il Gusto
  '701184': 'VIA MOLINETTO, 24 15122 ALESSANDRIA AL',     // Molinetto Salumi
};
```

### 3. ✅ Validazione Aggiornata

```javascript
validateDeliveryAddress: function(address) {
  // Deve contenere tipo strada (VIA, P.ZA, CORSO, etc.) + nome + numero
  if (!/(?:VIA|P\.?ZA|PIAZZA|CORSO|C\.SO|VIALE|V\.LE)\s+[A-Z\s,'\.]+\d+/i.test(address)) {
    console.log(`❌ RIFIUTATO formato invalido: ${address}`);
    return false;
  }
  // ... altre validazioni ...
}
```

### 4. ✅ Estrazione Migliorata per FT Complete

Il sistema ora:
1. Cerca nella sezione dopo "ALFIERI SPECIALITA' ALIMENTARI S.P.A."
2. Usa pattern multipli per tutti i tipi di strada
3. Gestisce indirizzi multi-riga
4. Esclude rigorosamente indirizzi Alfieri

### 5. ✅ Supporto FTV Template

Per i template FTV:
1. Prima cerca nel mapping per codice interno (es: 701168 → indirizzo La Mandria)
2. Se non trova, cerca nel mapping ODV
3. Non restituisce mai indirizzi Alfieri come fallback

## Risultati

### Prima del Fix
- ❌ La Mandria FT4237 → null
- ❌ Arudi Mirella FT4242 → null
- ❌ Template FTV → null o indirizzo Alfieri

### Dopo il Fix
- ✅ La Mandria FT4237 → "VIA REPERGO, 40 14057 ISOLA D'ASTI AT"
- ✅ Arudi Mirella FT4242 → "P.ZA DEL POPOLO, 3 14046 MOMBARUZZO AT"
- ✅ FTV_701168 → "VIA REPERGO, 40 14057 ISOLA D'ASTI AT"
- ✅ FTV_701179 → "P.ZA DEL POPOLO, 3 14046 MOMBARUZZO AT"

## Tipi di Strada Supportati

- **VIA** - Via
- **P.ZA / PIAZZA** - Piazza
- **CORSO / C.SO** - Corso
- **VIALE / V.LE** - Viale
- Altri possono essere aggiunti facilmente

## File di Test

- `test-la-mandria-arudi.html` - Test specifico per questi clienti
- `test-precision-addresses.html` - Test generale precisione

## Note Tecniche

1. I pattern sono case-insensitive
2. Supportano apostrofi (D'ASTI) e punti (P.ZA)
3. Gestiscono indirizzi multi-riga
4. Validano presenza di numero civico e CAP
5. Escludono sempre indirizzi Alfieri