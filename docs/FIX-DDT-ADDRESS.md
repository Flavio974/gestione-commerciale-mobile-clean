# 🔧 Fix Estrazione Indirizzo DDT

## 📅 Data: 06/01/2025

## 🐛 Problema Identificato
Il sistema stava estraendo "Partita IVA Codice Fiscale" (intestazione della tabella) invece dell'indirizzo reale di consegna per i DDT.

### Causa Principale
1. **Bug in `extractDeliveryAddressDDT`**: Ritornava sempre l'indirizzo di DONAC per TUTTI i template vuoti
2. **Cache non gestita**: Quando la cache conteneva "Partita IVA Codice Fiscale", non veniva ricalcolata

## ✅ Soluzioni Implementate

### 1. Fix del metodo globale (riga 995)
```javascript
// PRIMA (SBAGLIATO):
if (text.includes('Cliente Luogo di consegna\nPartita IVA Codice Fiscale')) {
  return 'VIA SALUZZO, 65 12038 SAVIGLIANO CN'; // ❌ Sempre DONAC!
}

// DOPO (CORRETTO):
if (text.includes('Cliente Luogo di consegna\nPartita IVA Codice Fiscale')) {
  return ''; // ✅ Template vuoto = nessun indirizzo
}
```

### 2. Mapping flessibile per clienti (righe 2040-2044)
```javascript
const clientAddressMap = {
  'DONAC S.R.L.': 'VIA SALUZZO, 65 12038 SAVIGLIANO CN',
  // Aggiungi altri clienti qui quando necessario
};

if (clientAddressMap[clientName]) {
  address = clientAddressMap[clientName];
  this.log(`✅ Usando indirizzo mappato per ${clientName}: ${address}`);
}
```

## 📋 Come Aggiungere Nuovi Clienti

Quando un cliente ha sempre lo stesso indirizzo di consegna ma il DDT è vuoto:

1. Apri `js/ddtft-import.js`
2. Cerca `clientAddressMap` (riga ~2040)
3. Aggiungi il mapping:
```javascript
const clientAddressMap = {
  'DONAC S.R.L.': 'VIA SALUZZO, 65 12038 SAVIGLIANO CN',
  'NUOVO CLIENTE S.R.L.': 'VIA ESEMPIO, 123 45678 CITTÀ PR', // ← Nuovo
};
```

## 🧪 Test
- `test-ddt-fix.html` - Test rapido del fix
- `test-ddt-completo.html` - Test completo con vari scenari

## ⚠️ Note Importanti
1. Il file `js/ddtft-import.js` ha 5751 righe e contiene codice duplicato
2. Esistono 2 implementazioni di DDTExtractor (principale + modulo)
3. Pianificare refactoring futuro per migliorare la manutenibilità

## 📊 Risultati Attesi
- ✅ DONAC S.R.L. → "VIA SALUZZO, 65 12038 SAVIGLIANO CN" 
- ✅ Altri clienti (template vuoto) → "" (stringa vuota)
- ✅ DDT con dati → Estrazione corretta dalla colonna destra