# 📚 API REFERENCE - Sistema Vocabolario Ottimizzato v2.0

## 🎯 Panoramica

Il sistema ottimizzato espone **5 azioni generiche** che gestiscono tutti i casi d'uso attraverso parametri strutturati.

### 🚀 Entry Point Principale
```javascript
const result = await aiMiddleware.executeLocalAction(command, originalMessage, originalContext);
```

## 🔧 Le 5 Azioni Principali

### 1. 📊 `universal_query` - Query e Lettura Dati

**Gestisce tutte le operazioni di lettura dati (90% dei casi)**

#### Parametri
```typescript
{
  entity: 'orders' | 'clients' | 'products' | 'appointments',
  operation: 'list' | 'count' | 'sum' | 'details',
  filters?: {
    cliente?: string,
    periodo?: 'oggi' | 'ieri' | 'domani' | 'settimana' | 'mese',
    data?: string,
    stato?: string
  },
  field?: string, // per operation: 'sum'
  output?: 'summary' | 'detailed' | 'raw'
}
```

#### Esempi di Utilizzo

##### Lista Ordini
```javascript
// Tutti gli ordini
{
  "action": "universal_query",
  "params": {
    "entity": "orders",
    "operation": "list"
  }
}

// Ordini per cliente
{
  "action": "universal_query", 
  "params": {
    "entity": "orders",
    "operation": "list",
    "filters": {"cliente": "Mario Rossi"}
  }
}

// Ordini per periodo
{
  "action": "universal_query",
  "params": {
    "entity": "orders", 
    "operation": "list",
    "filters": {"periodo": "oggi"}
  }
}
```

##### Conteggi
```javascript
// Conta ordini totali
{
  "action": "universal_query",
  "params": {
    "entity": "orders",
    "operation": "count"
  }
}

// Conta ordini per cliente
{
  "action": "universal_query",
  "params": {
    "entity": "orders",
    "operation": "count", 
    "filters": {"cliente": "La Mandria"}
  }
}

// Conta clienti
{
  "action": "universal_query",
  "params": {
    "entity": "clients",
    "operation": "count"
  }
}
```

##### Calcoli (Somme)
```javascript
// Fatturato cliente
{
  "action": "universal_query",
  "params": {
    "entity": "orders",
    "operation": "sum",
    "field": "importo",
    "filters": {"cliente": "Essemme"}
  }
}

// Fatturato mensile
{
  "action": "universal_query",
  "params": {
    "entity": "orders",
    "operation": "sum",
    "field": "importo", 
    "filters": {"periodo": "mese"}
  }
}
```

#### Routing Interno (entity_operation)
- `orders_list` → Elenca ordini
- `orders_count` → Conta ordini
- `orders_sum` → Somma importi ordini
- `orders_details` → Dettagli ordini
- `clients_list` → Elenca clienti
- `clients_count` → Conta clienti
- `clients_details` → Dettagli clienti

---

### 2. ⚡ `universal_action` - Azioni e Modifiche

**Gestisce tutte le operazioni di creazione/modifica/eliminazione**

#### Parametri
```typescript
{
  entity: 'reminders' | 'appointments' | 'orders' | 'clients',
  operation: 'create' | 'update' | 'delete',
  data?: object, // per create/update
  filters?: object // per update/delete (identificazione)
}
```

#### Esempi di Utilizzo

##### Creazione
```javascript
// Crea promemoria
{
  "action": "universal_action",
  "params": {
    "entity": "reminders",
    "operation": "create",
    "data": {
      "message": "Chiamare cliente",
      "time": "30 minuti"
    }
  }
}

// Crea appuntamento
{
  "action": "universal_action",
  "params": {
    "entity": "appointments", 
    "operation": "create",
    "data": {
      "cliente": "Mario Rossi",
      "data": "2025-07-28",
      "ora": "14:00"
    }
  }
}
```

##### Modifica/Eliminazione
```javascript
// Aggiorna appuntamento
{
  "action": "universal_action",
  "params": {
    "entity": "appointments",
    "operation": "update",
    "filters": {"id": "123"},
    "data": {"ora": "15:00"}
  }
}

// Elimina appuntamento  
{
  "action": "universal_action",
  "params": {
    "entity": "appointments",
    "operation": "delete",
    "filters": {"id": "123"}
  }
}
```

#### Routing Interno (entity_operation)
- `reminders_create` → Crea promemoria
- `appointments_create` → Crea appuntamento
- `appointments_update` → Modifica appuntamento
- `appointments_delete` → Elimina appuntamento

---

### 3. ℹ️ `system_info` - Informazioni Sistema

**Gestisce informazioni di sistema, data, ora, versione**

#### Parametri
```typescript
{
  type: 'date' | 'time' | 'version' | 'status',
  format?: 'italian' | 'english'
}
```

#### Esempi di Utilizzo
```javascript
// Data corrente
{
  "action": "system_info",
  "params": {
    "type": "date",
    "format": "italian"
  }
}

// Ora corrente
{
  "action": "system_info", 
  "params": {
    "type": "time",
    "format": "italian"
  }
}

// Versione sistema
{
  "action": "system_info",
  "params": {
    "type": "version"
  }
}

// Stato sistema
{
  "action": "system_info",
  "params": {
    "type": "status"
  }
}
```

---

### 4. 📈 `generate_report` - Report Avanzati

**Gestisce generazione report complessi**

#### Parametri
```typescript
{
  type: 'fatturato_mensile' | 'ordini_cliente' | 'performance_vendite',
  periodo?: string,
  filters?: object,
  format?: 'summary' | 'detailed' | 'excel'
}
```

#### Esempi di Utilizzo
```javascript
// Report fatturato mensile
{
  "action": "generate_report",
  "params": {
    "type": "fatturato_mensile",
    "periodo": "mese",
    "format": "summary"
  }
}

// Report cliente specifico
{
  "action": "generate_report",
  "params": {
    "type": "ordini_cliente",
    "filters": {"cliente": "La Mandria"},
    "format": "detailed"
  }
}

// Performance vendite
{
  "action": "generate_report",
  "params": {
    "type": "performance_vendite", 
    "periodo": "trimestre"
  }
}
```

---

### 5. 🆘 `help` - Aiuto e Documentazione

**Fornisce aiuto contestuale e documentazione**

#### Parametri
```typescript
{
  topic?: 'general' | 'comandi' | 'esempi' | 'advanced'
}
```

#### Esempi di Utilizzo
```javascript
// Aiuto generale
{
  "action": "help",
  "params": {
    "topic": "general"
  }
}

// Lista comandi
{
  "action": "help",
  "params": {
    "topic": "comandi"
  }
}

// Esempi di utilizzo
{
  "action": "help",
  "params": {
    "topic": "esempi"
  }
}
```

## 📋 Formato Risposta Standardizzato

Tutte le azioni restituiscono un oggetto con formato standardizzato:

```typescript
interface APIResponse {
  success: boolean;
  data: any;
  message?: string;
  error?: string;
  metadata: {
    timestamp: string;
    version: string;
    processingTime?: number;
    action: string;
    [key: string]: any;
  };
}
```

### Esempi di Risposta

#### Successo
```javascript
{
  "success": true,
  "data": [
    {
      "numero": "ORD001",
      "cliente": "Mario Rossi", 
      "importo": 150.00,
      "data": "2025-07-27"
    }
  ],
  "message": "📋 Trovati 3 ordini per Mario Rossi",
  "metadata": {
    "timestamp": "2025-07-27T14:30:00Z",
    "version": "2.0.0",
    "processingTime": 45,
    "action": "universal_query",
    "count": 3,
    "totalValue": 450.00
  }
}
```

#### Errore
```javascript
{
  "success": false,
  "data": null,
  "message": "❌ Entità non supportata: invalidEntity",
  "error": "Entità non supportata: invalidEntity. Supportate: orders, clients, products, appointments",
  "metadata": {
    "timestamp": "2025-07-27T14:30:00Z",
    "version": "2.0.0", 
    "processingTime": 12,
    "action": "universal_query",
    "errorType": "ValidationError"
  }
}
```

## 🔧 Metodi Helper Pubblici

### `normalizeParameters(params)`
Normalizza i parametri in ingresso per standardizzare formati

```javascript
const normalized = aiMiddleware.normalizeParameters({
  client: "Mario Rossi",  // → cliente: "Mario Rossi"
  date: "oggi"           // → data: "oggi"
});
```

### `extractClientName(params, userInput, originalContext)`
Estrae il nome cliente da varie sorgenti con priorità

```javascript
const clientName = aiMiddleware.extractClientName(
  params,
  "ordini di Mario Rossi",
  originalContext
);
// → "Mario Rossi"
```

### `validateQueryParams(entity, operation)`
Valida parametri per query

```javascript
aiMiddleware.validateQueryParams("orders", "list"); // ✅
aiMiddleware.validateQueryParams("invalid", "list"); // ❌ Throws error
```

### `formatResponse(data, outputType, metadata)`
Formatta risposta in formato standardizzato

```javascript
const response = aiMiddleware.formatResponse(
  data, 
  "summary",
  { count: 5, action: "list_orders" }
);
```

## 🎯 Pattern di Utilizzo Comuni

### 1. Query con Filtro Cliente
```javascript
{
  "entity": "orders",
  "operation": "list", 
  "filters": {"cliente": "[CLIENTE]"}
}
```

### 2. Conteggio con Filtro
```javascript
{
  "entity": "orders",
  "operation": "count",
  "filters": {"periodo": "oggi"}
}
```

### 3. Calcolo Somma con Filtro
```javascript
{
  "entity": "orders",
  "operation": "sum",
  "field": "importo",
  "filters": {"cliente": "[CLIENTE]"}
}
```

### 4. Creazione con Dati
```javascript
{
  "entity": "appointments",
  "operation": "create",
  "data": {"cliente": "[CLIENTE]", "data": "[DATA]"}
}
```

## 🔍 Debug e Troubleshooting

### Abilitare Debug
```javascript
localStorage.setItem('ai_debug', 'true');
```

### Log Dettagliati
Il debug mode fornisce log strutturati per ogni fase:

```
🤖 🚀 EXECUTE OPTIMIZED ACTION: {action, params, message}
🤖 📊 UNIVERSAL QUERY: {entity, operation, filters}
🔍 Extracting client name: {params, context, input}
📦 Query ordini list: {totalOrders, filteredOrders, filters}
🤖 ✅ EXECUTION COMPLETED: {success, processingTime, resultType}
```

### Monitoraggio Performance
```javascript
// Metadata in ogni risposta include:
{
  "processingTime": 45,  // ms
  "action": "universal_query",
  "version": "2.0.0"
}
```

## 🚨 Gestione Errori

### Errori di Validazione
- Entità non supportata
- Operazione non valida
- Parametri mancanti

### Errori di Dati
- Connessione database fallita
- Dati non trovati
- Formato dati invalido

### Errori di Sistema
- Metodi helper non implementati
- Timeout operazioni
- Errori JavaScript generici

## 🔄 Compatibilità Legacy

Il sistema mantiene piena compatibilità con azioni legacy tramite mapping automatico:

```javascript
// Azioni legacy supportate automaticamente:
'getOrdersByDate', 'getOrdersByClient', 'listOrders', 
'countOrders', 'listClients', 'countClients', 
'calculateRevenue', 'calculateMonthlyRevenue', 
'countTotalOrders', 'getDateInfo', 'scheduleReminder', 
'createAppointment'
```

---

**💡 TIP**: Per massime performance, usa sempre le nuove azioni generiche invece delle legacy quando possibile.