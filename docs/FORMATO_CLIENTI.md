# 👥 Formato File Clienti

## 🗂️ Struttura File

Il file Excel/CSV deve contenere le seguenti colonne:

| Colonna | Tipo | Descrizione | Esempio |
|---------|------|-------------|---------|
| `CODICE CLIENTE` | Testo | Codice univoco del cliente | "CL001" |
| `NOME` | Testo | Nome o ragione sociale | "Supermercato Rossi" |
| `CONTATTO` | Testo | Persona di riferimento | "Mario Rossi" |
| `VIA` | Testo | Via dell'indirizzo | "Via Roma" |
| `NUMERO` | Testo | Numero civico | "123" |
| `CAP` | Testo | Codice postale | "10100" |
| `CITTA'` | Testo | Città | "Torino" |
| `PROVINCIA` | Testo | Provincia | "TO" |
| `ZONA` | Testo | Zona commerciale | "Nord" |
| `TELEFONO` | Testo | Numero di telefono | "011-1234567" |
| `PRIORITA'` | Testo | Priorità (alta/media/bassa) | "alta" |
| `GIORNO DI CHIUSURA` | Testo | Giorno settimanale di chiusura | "domenica" |
| `GIORNO DA EVITARE` | Testo | Giorno da evitare per visite | "lunedì" |
| `ULTIMA VISITA` | Data | Data ultima visita | "2024-12-28" |
| `MOMENTO PREFERITO` | Testo | Momento preferito (mattina/pomeriggio/sera) | "mattina" |
| `tempo di visita minuti` | Numero | Durata media visita in minuti | 30 |
| `frequenza visite in giorni` | Numero | Frequenza visite in giorni | 30 |

## 📋 Esempio File

```
CODICE CLIENTE	NOME	CONTATTO	VIA	NUMERO	CAP	CITTA'	PROVINCIA	ZONA	TELEFONO	PRIORITA'	GIORNO DI CHIUSURA	GIORNO DA EVITARE	ULTIMA VISITA	MOMENTO PREFERITO	tempo di visita minuti	frequenza visite in giorni
CL001	Supermercato Rossi	Mario Rossi	Via Roma	123	10100	Torino	TO	Nord	011-1234567	alta	domenica	lunedì	2024-12-28	mattina	30	30
CL002	Bar Centrale	Luigi Bianchi	Corso Italia	45	10100	Torino	TO	Centro	011-9876543	media	lunedì		2024-12-20	pomeriggio	15	15
```

## 🔄 Processo di Importazione

1. **Caricamento File**: Usa il pulsante "Importa Lista" nella scheda CLIENTI
2. **Processamento**: L'app legge automaticamente le colonne e crea i clienti
3. **Sincronizzazione Locale**: I clienti vengono salvati nel localStorage
4. **Sincronizzazione Cloud**: Usa "☁️ Sync Supabase" per caricare su Supabase
5. **AI Integration**: L'AI può immediatamente accedere ai clienti importati

## ✅ Controlli di Validazione

- ✅ **CODICE CLIENTE** e **NOME** non possono essere vuoti
- ✅ **CODICE CLIENTE** deve essere univoco (evita duplicati)
- ✅ **PRIORITA'** accetta: alta, media, bassa (case insensitive)
- ✅ **GIORNO DI CHIUSURA** e **GIORNO DA EVITARE**: giorni della settimana in italiano
- ✅ **MOMENTO PREFERITO** accetta: mattina, pomeriggio, sera
- ✅ Date nel formato Excel o ISO (YYYY-MM-DD)
- ✅ Valori di default: tempo visita = 30 min, frequenza = 30 giorni

## 🗄️ Struttura Database Supabase

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
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🤖 Accesso AI

L'AI Assistant può ora:
- ✅ Vedere tutti i clienti importati
- ✅ Filtrare clienti per città, zona o priorità
- ✅ Calcolare statistiche visite
- ✅ Suggerire pianificazione visite
- ✅ Rispondere a domande sui clienti

## 📱 Formati Supportati

- ✅ **Excel** (.xlsx, .xls)
- ✅ **CSV** (separato da virgole)
- ✅ **TSV** (separato da tab)

## 🔧 Risoluzione Problemi

### File non caricato?
- Verifica che le colonne abbiano i nomi esatti (inclusi spazi e apostrofi)
- Controlla che non ci siano righe completamente vuote
- Assicurati che CODICE CLIENTE e NOME non siano vuoti

### Clienti duplicati?
- Ogni **CODICE CLIENTE** deve essere unico
- Se esiste già, il cliente esistente viene mantenuto

### Sincronizzazione Supabase?
1. Clicca su "☁️ Sync Supabase" per caricare
2. Clicca su "📥 Da Supabase" per scaricare
3. Verifica lo stato nella console (F12)

### AI non vede i clienti?
- L'AI accede automaticamente ai clienti importati
- Prova a ricaricare la pagina se necessario

## 💡 Suggerimenti

1. **Codici univoci**: Usa una convenzione tipo "CL001", "CL002"
2. **Zone coerenti**: Usa sempre gli stessi nomi per le zone
3. **Priorità bilanciate**: Non tutti i clienti dovrebbero essere "alta priorità"
4. **Date reali**: Inserisci date visite realistiche per una migliore pianificazione
5. **Note utili**: Aggiungi note direttamente nell'app dopo l'importazione