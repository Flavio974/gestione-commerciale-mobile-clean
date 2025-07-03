# Integrazione Supabase per Dati Storici VENDUTO

## Panoramica
Il sistema ora supporta la sincronizzazione automatica dei dati degli ordini venduto con Supabase per consentire all'AI Assistant di analizzare i dati storici e fornire insights avanzati.

## Configurazione

### 1. Creazione Tabella Supabase
Eseguire il file SQL `sql/create_archivio_ordini_venduto.sql` nel dashboard Supabase:

```sql
-- Vai su Supabase Dashboard > SQL Editor
-- Copia e incolla il contenuto del file SQL
-- Esegui la query
```

### 2. Configurazione SUPABASE_CONFIG
Assicurarsi che in `index.html` sia presente:

```javascript
window.SUPABASE_CONFIG = {
  enableSync: true,  // Abilita sincronizzazione automatica
  // altre configurazioni Supabase...
};
```

## Funzionalità

### Export con Sincronizzazione Automatica
Quando si esegue l'export del file VENDUTO.xlsx:

1. **Export Excel**: I dati vengono salvati nel file Excel come sempre
2. **Sync Supabase**: I dati vengono automaticamente sincronizzati con la tabella `archivio_ordini_venduto`
3. **AI Access**: L'AI Assistant può ora accedere ai dati storici per analisi avanzate

### Struttura Dati Supabase

La tabella `archivio_ordini_venduto` contiene:

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | TEXT | ID univoco (numero_ordine_codice_prodotto) |
| numero_ordine | TEXT | Numero ordine |
| data_ordine | DATE | Data ordine |
| cliente | TEXT | Nome cliente |
| indirizzo_consegna | TEXT | Indirizzo consegna |
| partita_iva | TEXT | P.IVA cliente |
| data_consegna | DATE | Data consegna |
| codice_prodotto | TEXT | Codice prodotto |
| prodotto | TEXT | Descrizione prodotto |
| quantita | DECIMAL | Quantità |
| prezzo_unitario | DECIMAL | Prezzo unitario |
| sconto_merce | DECIMAL | Sconto merce (S.M.) |
| sconto_percentuale | DECIMAL | Sconto % |
| importo | DECIMAL | Importo totale riga |
| created_at | TIMESTAMP | Data inserimento |
| updated_at | TIMESTAMP | Ultimo aggiornamento |

## Modalità di Sincronizzazione

### UPSERT (Default)
- **Inserisce** nuovi record se non esistono
- **Aggiorna** record esistenti (basato su ID univoco)
- Evita duplicati mantenendo integrità dati

### Gestione Duplicati
Il sistema gestisce automaticamente i duplicati usando la chiave:
```
ID = numero_ordine + "_" + codice_prodotto
```

## AI Assistant con Dati Storici

### Nuove Funzionalità AI
L'AI Assistant ora può:

1. **Analizzare Trend**: Confrontare performance tra periodi
2. **Ranking Clienti**: Identificare i migliori clienti per fatturato
3. **Analisi Prodotti**: Mostrare prodotti più venduti
4. **Statistiche Avanzate**: Calcolare medie, totali, crescita

### Query Rapide Disponibili
- `analisi-vendite`: Trend di vendita e prodotti top
- `storico-clienti`: Migliori clienti per fatturato
- `fatturato`: Confronti mensili/annuali

### Esempi di Domande AI
```
"Quali sono i miei 10 migliori clienti per fatturato totale?"
"Mostra l'andamento delle vendite negli ultimi 6 mesi"
"Qual è il prodotto più venduto e chi sono i principali acquirenti?"
"Confronta il fatturato di questo anno con l'anno scorso"
```

## Monitoraggio e Debug

### Console Log
Il sistema fornisce log dettagliati:
```
🔄 Avvio sincronizzazione Supabase...
📊 Preparati X record per Supabase
📊 Sync progress: 50% - 50/100
✅ Sync Supabase completata: 45 inseriti, 5 aggiornati
```

### Controllo Statistiche
Verificare i dati con:
```sql
SELECT * FROM archivio_ordini_stats;
```

## Gestione Errori

### Tabella Non Esistente
Se la tabella non esiste:
```
⚠️ Tabella archivio_ordini_venduto non esiste. Crearla manualmente in Supabase.
```
**Soluzione**: Eseguire il file SQL di creazione tabella

### Supabase Non Configurato
```
⚠️ Sync Supabase disabilitato o non configurato
```
**Soluzione**: Verificare `SUPABASE_CONFIG.enableSync = true`

### Errori di Sincronizzazione
```
❌ Errore sync Supabase: [dettagli errore]
```
**Soluzione**: Controllare connessione Supabase e permessi tabella

## Performance

### Sincronizzazione a Batch
- I dati vengono sincronizzati in batch da 100 record
- Progress callback per monitorare l'avanzamento
- Gestione automatica di timeout e retry

### Ottimizzazioni
- Indici automatici su campi chiave
- Vista `archivio_ordini_stats` per query rapide
- Trigger automatico per `updated_at`

## Backup e Maintenance

### Pulizia Dati Vecchi
```javascript
// Rimuove dati più vecchi di 365 giorni
const syncer = new SupabaseSyncVenduto();
await syncer.cleanOldData(365);
```

### Export Completo
I dati rimangono sempre disponibili anche nel file Excel locale.

## Note Tecniche

### File Coinvolti
- `js/modules/export/supabase-sync-venduto.js`: Modulo sincronizzazione
- `js/modules/export/ordini-export-venduto.js`: Export con sync integrata
- `sql/create_archivio_ordini_venduto.sql`: Schema database
- `index.html`: AI Assistant con accesso dati storici

### Compatibilità
- Funziona con il sistema esistente senza interruzioni
- Export Excel rimane invariato
- Aggiunta trasparente di funzionalità AI avanzate