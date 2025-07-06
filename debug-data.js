// Debug per verificare struttura dati Supabase
console.log("🔍 DEBUG DATI SUPABASE");
console.log("=".repeat(50));

// Funzione per verificare dati clienti
async function checkClientsData() {
    console.log("\n📋 VERIFICA CLIENTI:");
    
    if (window.flavioAI && window.flavioAI.originalAssistant && window.flavioAI.originalAssistant.supabaseAI) {
        const data = await window.flavioAI.originalAssistant.supabaseAI.getAllData();
        
        console.log("Clienti trovati:", data.clients?.length || 0);
        
        if (data.clients && data.clients.length > 0) {
            console.log("Primi 5 clienti:");
            data.clients.slice(0, 5).forEach((client, index) => {
                console.log(`${index + 1}. Nome: "${client.nome || client.cliente || client.name || 'N/A'}"`);
                console.log(`   Campi disponibili:`, Object.keys(client));
            });
            
            // Cerca clienti che contengono "essemme"
            console.log("\n🔍 Ricerca clienti con 'essemme':");
            const essemmeClients = data.clients.filter(client => {
                const nome = (client.nome || client.cliente || client.name || '').toLowerCase();
                return nome.includes('essemme');
            });
            
            if (essemmeClients.length > 0) {
                console.log("✅ Trovati clienti Essemme:", essemmeClients);
            } else {
                console.log("❌ Nessun cliente con 'essemme' trovato");
                
                // Mostra tutti i nomi per debug
                console.log("\n📝 Tutti i nomi clienti:");
                data.clients.forEach((client, index) => {
                    const nome = client.nome || client.cliente || client.name || 'N/A';
                    console.log(`${index + 1}. "${nome}"`);
                });
            }
        }
    }
}

// Funzione per verificare dati ordini
async function checkOrdersData() {
    console.log("\n📦 VERIFICA ORDINI:");
    
    if (window.flavioAI && window.flavioAI.originalAssistant && window.flavioAI.originalAssistant.supabaseAI) {
        const data = await window.flavioAI.originalAssistant.supabaseAI.getAllData();
        
        console.log("Historical orders:", data.historicalOrders?.sampleData?.length || 0);
        
        if (data.historicalOrders && data.historicalOrders.sampleData && data.historicalOrders.sampleData.length > 0) {
            const orders = data.historicalOrders.sampleData;
            console.log("Primi 3 ordini:");
            orders.slice(0, 3).forEach((order, index) => {
                console.log(`${index + 1}. Cliente: "${order.cliente || order.nome_cliente || order.client || 'N/A'}"`);
                console.log(`   Importo: ${order.importo || order.totale || order.amount || 'N/A'}`);
                console.log(`   Campi disponibili:`, Object.keys(order));
            });
            
            // Cerca ordini di Essemme
            console.log("\n🔍 Ricerca ordini di 'essemme':");
            const essemmeOrders = orders.filter(order => {
                const cliente = (order.cliente || order.nome_cliente || order.client || '').toLowerCase();
                return cliente.includes('essemme');
            });
            
            if (essemmeOrders.length > 0) {
                console.log("✅ Trovati ordini Essemme:", essemmeOrders.length);
                console.log("Dettagli primi 3:", essemmeOrders.slice(0, 3));
                
                const totale = essemmeOrders.reduce((sum, order) => {
                    return sum + (parseFloat(order.importo || order.totale || order.amount || 0));
                }, 0);
                console.log(`💰 Fatturato Essemme: €${totale.toFixed(2)}`);
            } else {
                console.log("❌ Nessun ordine con 'essemme' trovato");
                
                // Mostra tutti i clienti negli ordini
                console.log("\n📝 Clienti negli ordini (primi 10):");
                const uniqueClients = [...new Set(orders.slice(0, 50).map(order => 
                    order.cliente || order.nome_cliente || order.client || 'N/A'
                ))];
                uniqueClients.slice(0, 10).forEach((cliente, index) => {
                    console.log(`${index + 1}. "${cliente}"`);
                });
            }
        }
    }
}

// Esegui le verifiche
checkClientsData();
setTimeout(() => checkOrdersData(), 1000);

console.log("\n" + "=".repeat(50));
console.log("🧪 Per eseguire manualmente:");
console.log("checkClientsData() - Verifica clienti");
console.log("checkOrdersData() - Verifica ordini");

// Rendi le funzioni disponibili globalmente
window.checkClientsData = checkClientsData;
window.checkOrdersData = checkOrdersData;