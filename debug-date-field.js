// Debug per analizzare il campo data negli ordini
console.log("🔍 DEBUG CAMPO DATA ORDINI");
console.log("=".repeat(50));

async function debugDateField() {
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
    
    // Analisi campi data disponibili
    console.log("\n📅 ANALISI CAMPI DATA:");
    const dateFields = ['data', 'date', 'data_ordine', 'data_consegna', 'data_documento', 'created_at', 'timestamp'];
    
    const firstOrder = essemmeOrders[0];
    console.log("Campi disponibili nel primo record:", Object.keys(firstOrder));
    
    dateFields.forEach(field => {
        const withField = essemmeOrders.filter(o => o[field] && o[field] !== null && o[field] !== '').length;
        if (withField > 0) {
            console.log(`${field}: ${withField} record valorizzati`);
            
            // Mostra primi 3 valori
            const sampleValues = essemmeOrders
                .filter(o => o[field] && o[field] !== null && o[field] !== '')
                .slice(0, 3)
                .map(o => o[field]);
            console.log(`  Esempi: ${sampleValues.join(', ')}`);
        } else {
            console.log(`${field}: 0 record valorizzati`);
        }
    });
    
    // Mostra primi 5 ordini con tutti i campi data
    console.log("\n📋 PRIMI 5 ORDINI ESSEMME - CAMPI DATA:");
    essemmeOrders.slice(0, 5).forEach((order, index) => {
        console.log(`\n${index + 1}. Numero ordine: ${order.numero_ordine}`);
        dateFields.forEach(field => {
            if (order[field] !== undefined) {
                console.log(`   ${field}: "${order[field]}"`);
            }
        });
    });
    
    // Trova il campo data più popolato
    console.log("\n🎯 CAMPO DATA PIÙ USATO:");
    const fieldCounts = {};
    dateFields.forEach(field => {
        fieldCounts[field] = essemmeOrders.filter(o => o[field] && o[field] !== null && o[field] !== '').length;
    });
    
    const bestField = Object.entries(fieldCounts)
        .sort(([,a], [,b]) => b - a)
        .filter(([,count]) => count > 0)[0];
    
    if (bestField) {
        console.log(`Campo migliore: "${bestField[0]}" con ${bestField[1]} record valorizzati`);
        
        // Ordina per data usando il campo migliore
        const sortedOrders = essemmeOrders
            .filter(o => o[bestField[0]] && o[bestField[0]] !== null && o[bestField[0]] !== '')
            .sort((a, b) => new Date(b[bestField[0]]) - new Date(a[bestField[0]]));
        
        if (sortedOrders.length > 0) {
            const latest = sortedOrders[0];
            console.log(`Ultimo ordine: ${latest.numero_ordine} - Data: ${latest[bestField[0]]}`);
        }
    } else {
        console.log("❌ Nessun campo data valorizzato");
    }
    
    return {
        totalOrders: essemmeOrders.length,
        fieldCounts,
        bestField: bestField ? bestField[0] : null,
        sampleOrders: essemmeOrders.slice(0, 3)
    };
}

// Esegui analisi
debugDateField().then(result => {
    if (result) {
        console.log("\n✅ ANALISI COMPLETATA");
        console.log("🎯 RISULTATO:", result);
    }
});

// Rendi disponibile globalmente
window.debugDateField = debugDateField;