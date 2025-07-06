// Debug dettagliato per analizzare la struttura degli ordini Essemme
console.log("🔍 ANALISI DETTAGLIATA ORDINI ESSEMME");
console.log("=".repeat(60));

async function analyzeEssemmeDetailed() {
    if (!window.flavioAI?.originalAssistant?.supabaseAI) {
        console.log("❌ Supabase AI non disponibile");
        return;
    }
    
    const data = await window.flavioAI.originalAssistant.supabaseAI.getAllData();
    const ordini = data.historicalOrders?.sampleData || [];
    
    // Trova ordini Essemme
    const essemmeOrders = ordini.filter(order => {
        const cliente = (order.cliente || '').toLowerCase();
        return cliente.includes('essemme');
    });
    
    console.log(`\n📊 TROVATI ${essemmeOrders.length} RECORD ESSEMME`);
    
    if (essemmeOrders.length === 0) {
        console.log("❌ Nessun ordine Essemme trovato");
        return;
    }
    
    // Analisi campi disponibili
    console.log("\n🔍 CAMPI DISPONIBILI NEL PRIMO RECORD:");
    console.log(Object.keys(essemmeOrders[0]));
    
    // Analisi numero_ordine
    console.log("\n📋 ANALISI NUMERO_ORDINE:");
    const numeroOrdineStats = {
        totali: essemmeOrders.length,
        conNumeroOrdine: essemmeOrders.filter(o => o.numero_ordine && o.numero_ordine !== null).length,
        senzaNumeroOrdine: essemmeOrders.filter(o => !o.numero_ordine || o.numero_ordine === null).length,
        valoriUnici: new Set(essemmeOrders.map(o => o.numero_ordine).filter(n => n && n !== null)).size
    };
    
    console.log("Totali record:", numeroOrdineStats.totali);
    console.log("Con numero_ordine:", numeroOrdineStats.conNumeroOrdine);
    console.log("Senza numero_ordine:", numeroOrdineStats.senzaNumeroOrdine);
    console.log("Valori unici numero_ordine:", numeroOrdineStats.valoriUnici);
    
    // Mostra primi 10 numero_ordine
    console.log("\n📝 PRIMI 10 NUMERO_ORDINE:");
    essemmeOrders.slice(0, 10).forEach((order, index) => {
        console.log(`${index + 1}. numero_ordine: "${order.numero_ordine}" | data: ${order.data} | importo: ${order.importo}`);
    });
    
    // Cerca campi alternativi per identificare ordini
    console.log("\n🔍 RICERCA CAMPI ALTERNATIVI:");
    const possibleOrderFields = ['id_ordine', 'ordine_id', 'order_id', 'codice_ordine', 'riferimento', 'documento'];
    
    possibleOrderFields.forEach(field => {
        const withField = essemmeOrders.filter(o => o[field] && o[field] !== null).length;
        const uniqueValues = new Set(essemmeOrders.map(o => o[field]).filter(v => v && v !== null)).size;
        if (withField > 0) {
            console.log(`${field}: ${withField} record, ${uniqueValues} valori unici`);
        }
    });
    
    // Analisi per data
    console.log("\n📅 ANALISI PER DATA:");
    const ordersByDate = {};
    essemmeOrders.forEach(order => {
        const date = order.data || 'N/A';
        if (!ordersByDate[date]) {
            ordersByDate[date] = [];
        }
        ordersByDate[date].push(order);
    });
    
    const dateKeys = Object.keys(ordersByDate).sort();
    console.log(`Date diverse: ${dateKeys.length}`);
    console.log("Prime 5 date con conteggio righe:");
    dateKeys.slice(0, 5).forEach(date => {
        console.log(`${date}: ${ordersByDate[date].length} righe`);
    });
    
    // Verifica se ci sono pattern nei dati
    console.log("\n🔍 PATTERN ANALYSIS:");
    const uniqueImporti = new Set(essemmeOrders.map(o => o.importo)).size;
    const uniqueDate = new Set(essemmeOrders.map(o => o.data)).size;
    const uniqueProdotti = new Set(essemmeOrders.map(o => o.prodotto || o.articolo || o.descrizione)).size;
    
    console.log(`Importi unici: ${uniqueImporti}`);
    console.log(`Date uniche: ${uniqueDate}`);
    console.log(`Prodotti unici: ${uniqueProdotti}`);
    
    return {
        totalRecords: essemmeOrders.length,
        numeroOrdineStats,
        uniqueDates: uniqueDate,
        uniqueProducts: uniqueProdotti,
        sampleData: essemmeOrders.slice(0, 3)
    };
}

// Esegui analisi
analyzeEssemmeDetailed().then(result => {
    if (result) {
        console.log("\n✅ ANALISI COMPLETATA");
        console.log("🎯 RISULTATO:", result);
    }
});

// Rendi disponibile globalmente
window.analyzeEssemmeDetailed = analyzeEssemmeDetailed;