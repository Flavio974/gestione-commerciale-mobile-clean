# 🔍 Verifica Clienti Database Supabase

## Panoramica

Questo documento descrive la verifica della presenza di dati dei clienti nel database Supabase, con particolare attenzione ai clienti "La Mandria" e "Bottega della carne".

## File Creati

### 1. `verifica-clienti-supabase.js`
Contiene le funzioni principali per interrogare il database Supabase:

- **`verificaClientiSupabase()`** - Verifica la presenza di "La Mandria" e "Bottega della carne"
- **`queryClientiPersonalizzata(searchTerm, field)`** - Ricerca personalizzata per termine e campo
- **`getClientiStatistiche()`** - Ottiene statistiche generali sui clienti

### 2. `inserisci-clienti-esempio.js`
Contiene le funzioni per gestire clienti di esempio:

- **`inserisciClientiEsempio()`** - Inserisce 5 clienti di esempio inclusi "La Mandria" e "Bottega della carne"
- **`verificaEInserisciClientiMancanti()`** - Verifica e inserisce solo se mancanti
- **`rimuoviClientiEsempio()`** - Rimuove i clienti di esempio per test

### 3. `test-verifica-clienti.html`
Interfaccia web completa per testare tutte le funzioni con:

- Verifica connessione Supabase
- Ricerca clienti specifici
- Statistiche database
- Elenco tutti i clienti
- Ricerca personalizzata
- Gestione clienti di esempio
- Log console integrato

## Configurazione Database

Il sistema utilizza la configurazione Supabase da `config/supabase-config.js`:

```javascript
const SUPABASE_CONFIG = {
  url: 'https://ibuwqihgdkinfmvxqfnq.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  tables: {
    clients: 'clients',
    // ... altre tabelle
  }
};
```

## Struttura Tabella Clienti

La tabella `clients` in Supabase ha la seguente struttura:

```sql
CREATE TABLE clients (
    id BIGSERIAL PRIMARY KEY,
    codice_cliente TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    contatto TEXT,
    via TEXT,
    numero TEXT,
    cap TEXT,
    citta TEXT,
    provincia TEXT,
    zona TEXT,
    telefono TEXT,
    priorita TEXT CHECK (priorita IN ('alta', 'media', 'bassa')),
    giorno_chiusura TEXT,
    giorno_da_evitare TEXT,
    ultima_visita DATE,
    momento_preferito TEXT,
    tempo_visita_minuti INTEGER DEFAULT 30,
    frequenza_visite_giorni INTEGER DEFAULT 30,
    stato TEXT DEFAULT 'attivo',
    note TEXT,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    imported_at TIMESTAMP WITH TIME ZONE
);
```

## Clienti di Esempio

I clienti di esempio includono:

### 1. La Mandria
```javascript
{
  codice_cliente: '701168',
  nome: 'AZ. AGR. LA MANDRIA S.S.',
  contatto: 'Goia E. e Capra S.',
  via: 'VIA REPERGO',
  numero: '40',
  cap: '14057',
  citta: 'ISOLA D\'ASTI',
  provincia: 'AT',
  zona: 'NORD',
  telefono: '0141-958123',
  priorita: 'alta',
  // ... altri campi
}
```

### 2. Bottega della Carne
```javascript
{
  codice_cliente: '701213',
  nome: 'BOTTEGA DELLA CARNE SAS',
  contatto: 'Bonanate Danilo',
  via: 'VIA CHIVASSO',
  numero: '7',
  cap: '15020',
  citta: 'MURISENGO',
  provincia: 'AL',
  zona: 'EST',
  telefono: '0142-643789',
  priorita: 'media',
  // ... altri campi
}
```

## Come Utilizzare

### 1. Verifica Tramite Browser
1. Apri `test-verifica-clienti.html` nel browser
2. Attendi l'inizializzazione Supabase
3. Clicca "🔗 Verifica Connessione" per testare la connessione
4. Clicca "🔍 Verifica Clienti Specifici" per cercare "La Mandria" e "Bottega della carne"

### 2. Verifica Tramite Console
```javascript
// Verifica clienti specifici
await verificaClientiSupabase();

// Ricerca personalizzata
await queryClientiPersonalizzata('La Mandria', 'nome');

// Statistiche
await getClientiStatistiche();
```

### 3. Inserimento Clienti di Esempio
```javascript
// Inserisci tutti i clienti di esempio
await inserisciClientiEsempio();

// Verifica e inserisci solo se mancanti
await verificaEInserisciClientiMancanti();
```

## Funzioni di Ricerca

### Ricerca per Nome
```javascript
await queryClientiPersonalizzata('La Mandria', 'nome');
```

### Ricerca per Città
```javascript
await queryClientiPersonalizzata('ASTI', 'citta');
```

### Ricerca per Zona
```javascript
await queryClientiPersonalizzata('NORD', 'zona');
```

## Gestione Errori

Il sistema gestisce automaticamente:

- **Connessione Supabase non disponibile** - Attende fino a 10 secondi
- **Tabelle non esistenti** - Mostra errori descrittivi
- **Dati mancanti** - Fornisce opzioni di inserimento
- **Errori di query** - Log dettagliati nella console

## Sincronizzazione

Il sistema può sincronizzare con:

- **localStorage** - Tramite `Clienti.state.clients`
- **Supabase** - Tramite `ClientiSupabaseSync`
- **Excel** - Tramite moduli di importazione

## Statistiche Disponibili

Il sistema fornisce statistiche complete:

- Totale clienti
- Clienti attivi/inattivi
- Città servite
- Zone commerciali
- Distribuzione per priorità
- Clienti visitati
- Visite recenti

## Manutenzione

### Pulizia Dati Test
```javascript
// Rimuovi clienti di esempio
await rimuoviClientiEsempio();
```

### Backup Dati
```javascript
// Esporta tutti i clienti
const { data } = await window.supabaseClient
  .from('clients')
  .select('*');
```

## Note Tecniche

1. **Inizializzazione**: Il sistema attende automaticamente l'inizializzazione di Supabase
2. **Fallback**: Se Supabase non è disponibile, si può usare localStorage
3. **Performance**: Le query utilizzano indici per ottimizzare le performance
4. **Sicurezza**: Utilizza Row Level Security (RLS) di Supabase

## Troubleshooting

### Problema: Supabase non si connette
**Soluzione**: Verifica le credenziali in `config/supabase-config.js`

### Problema: Clienti non trovati
**Soluzione**: Usa `inserisciClientiEsempio()` per popolare il database

### Problema: Errori di query
**Soluzione**: Verifica che la tabella `clients` esista in Supabase

### Problema: Sincronizzazione fallita
**Soluzione**: Controlla la connessione internet e le policy RLS

## Integrazione con Altri Moduli

Il sistema è integrato con:

- **`clienti-supabase-sync.js`** - Sincronizzazione bidirezionale
- **`query-clienti.js`** - Query localStorage
- **`ddtft-import.js`** - Mappatura clienti da documenti
- **`timeline-core.js`** - Eventi timeline per clienti

## Conclusioni

Il sistema fornisce una verifica completa dei dati clienti in Supabase con:

✅ **Verifica automatica** di "La Mandria" e "Bottega della carne"  
✅ **Inserimento dati esempio** se mancanti  
✅ **Ricerca personalizzata** per tutti i campi  
✅ **Statistiche complete** del database  
✅ **Interfaccia web** per test facili  
✅ **Gestione errori** robusta  
✅ **Sincronizzazione** con sistemi esistenti  

Il database è ora pronto per l'uso in produzione con dati di esempio completi.