# 🎯 Fix Precisione Estrazione Indirizzi

## Problema Risolto

Per clienti come **La Mandria** e **Arudi Mirella**, il sistema estraeva l'indirizzo del MITTENTE (Alfieri) invece dell'indirizzo di consegna.

## Implementazioni Completate

### 1. ✅ Filtro Alfieri Rigoroso

```javascript
isAlfieriAddress: function(address) {
  const alfieriKeywords = [
    'MARCONI',
    'MAGLIANO ALFIERI',
    'MAGLIANO',
    'ALFIERI',
    'C.SO G. MARCONI',
    'CORSO MARCONI',
    'G. MARCONI',
    '12050',
    'CN)',
    '(CN)',
    '10/E'
  ];
  
  const upperAddress = address.toUpperCase();
  return alfieriKeywords.some(keyword => upperAddress.includes(keyword));
}
```

### 2. ✅ Validazione Indirizzi

```javascript
validateDeliveryAddress: function(address) {
  if (!address) return false;
  
  // ESCLUSIONE RIGOROSA Alfieri
  if (this.isAlfieriAddress(address)) {
    console.log(`❌ RIFIUTATO indirizzo Alfieri: ${address}`);
    return false;
  }
  
  // Deve contenere VIA + numero
  if (!/VIA\s+[A-Z\s,]+\d+/i.test(address)) {
    console.log(`❌ RIFIUTATO formato invalido: ${address}`);
    return false;
  }
  
  // Deve avere CAP (5 cifre)
  if (!/\d{5}/.test(address)) {
    console.log(`❌ RIFIUTATO CAP mancante: ${address}`);
    return false;
  }
  
  console.log(`✅ VALIDATO indirizzo consegna: ${address}`);
  return true;
}
```

### 3. ✅ Debug Avanzato per Clienti Problematici

```javascript
debugAddressExtraction: function(text, fileName, clientName) {
  console.log(`🔍 === DEBUG INDIRIZZO per ${clientName} ===`);
  
  // Mostra TUTTI gli indirizzi VIA trovati
  const viaPattern = /(VIA\s+[A-Z\s,]+\d+[\s\S]*?\d{5}\s+[A-Z\s]+\s+[A-Z]{2})/gi;
  const allVias = [...text.matchAll(viaPattern)];
  
  console.log(`Trovati ${allVias.length} indirizzi VIA:`);
  allVias.forEach((match, i) => {
    const addr = match[1].trim().replace(/\s+/g, ' ');
    const isAlfieri = this.isAlfieriAddress(addr);
    console.log(`  ${i+1}. ${isAlfieri ? '❌ ALFIERI' : '✅ CLIENTE'}: "${addr}"`);
  });
}
```

### 4. ✅ Estrazione Migliorata con Passaggio Nome Cliente

```javascript
extractDeliveryAddress: function(text, fileName, clientName) {
  console.log("🚚 === ESTRAZIONE INDIRIZZO DI CONSEGNA PRECISIONE ===");
  
  // Debug per clienti problematici
  if (clientName && (clientName.includes('Mandria') || clientName.includes('Arudi'))) {
    this.debugAddressExtraction(text, fileName, clientName);
  }
  
  // ... logica di estrazione con validazione rigorosa ...
}
```

### 5. ✅ Metodi di Ricerca Migliorati

#### METODO 1: Sezione tra ALFIERI e FT
```javascript
const alfieriMatch = text.match(/ALFIERI SPECIALITA['']?\s*ALIMENTARI\s*S\.P\.A\.([\s\S]*?)(?=FT\s+\d)/i);
```

#### METODO 2: Solo dopo "Luogo di consegna" e prima di Alfieri
```javascript
if (luogoIndex < alfieriIndex) {
  const deliveryOnly = text.substring(luogoIndex, alfieriIndex);
  // ... estrai solo da questa sezione ...
}
```

#### METODO 3: Ricerca VIA con esclusione rigorosa
```javascript
for (let i = 0; i < allMatches.length; i++) {
  const fullAddress = `${allMatches[i][1]} ${allMatches[i][2]}`.trim();
  console.log(`  ${i+1}. Testando: "${fullAddress}"`);
  
  if (this.validateDeliveryAddress(fullAddress)) {
    return fullAddress;
  }
}
```

### 6. ✅ Mappatura ODV con Avvisi

```javascript
const deliveryAddress = ODV_DELIVERY_MAPPING[odvCode];
if (deliveryAddress && !deliveryAddress.includes('DA_VERIFICARE')) {
  console.log(`✅ Indirizzo consegna da ODV ${odvCode}: ${deliveryAddress}`);
  return deliveryAddress;
}

console.log(`⚠️ ODV ${odvCode} non mappato - VERIFICA MANUALMENTE per evitare indirizzo Alfieri`);
console.log(`📦 IMPORTANTE: Aggiungi mappatura per ODV ${odvCode} nel codice`);
return null; // NON restituire fallback che potrebbe essere Alfieri
```

## Risultati

### Prima del Fix
- ❌ La Mandria → "C.so G. Marconi, 10/E 12050 MAGLIANO ALFIERI CN"
- ❌ Arudi Mirella → "VIA MARCONI 10 12050 MAGLIANO ALFIERI CN"

### Dopo il Fix
- ✅ La Mandria → null (richiede mappatura ODV)
- ✅ Arudi Mirella → null (richiede mappatura ODV)
- ✅ Il Gusto → "VIA FONTANA, 4 14100 ASTI AT"

## File di Test

1. `test-precision-addresses.html` - Test completo precisione indirizzi
2. `test-alfieri-filter.html` - Test specifico filtro Alfieri

## TODO

Per completare il fix per La Mandria e Arudi Mirella, è necessario:

1. Identificare i codici ODV corretti dai documenti
2. Aggiungere le mappature in `ODV_DELIVERY_MAPPING`:
```javascript
'507A168AS01234': 'INDIRIZZO_CORRETTO_LA_MANDRIA',   // La Mandria
'507A179AS05678': 'INDIRIZZO_CORRETTO_ARUDI_MIRELLA' // Arudi Mirella
```

## Punti Chiave

- ✅ **Esclusione rigorosa** di tutti gli indirizzi Alfieri
- ✅ **Validazione formato** (VIA + numero + CAP)
- ✅ **Debug avanzato** per clienti problematici
- ✅ **Nessun fallback** che potrebbe restituire Alfieri
- ✅ **Avvisi espliciti** per ODV non mappati