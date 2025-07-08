/**
 * Script per interrogare i clienti presenti negli ordini del database
 */

function queryClientiDatabase() {
  console.log('🔍 Interrogazione clienti nel database ordini...');
  
  // Recupera dati dal localStorage
  const savedVenduto = localStorage.getItem('ordiniFileData');
  if (!savedVenduto) {
    console.log('❌ Nessun dato trovato nel localStorage (chiave: ordiniFileData)');
    return;
  }
  
  try {
    const data = JSON.parse(savedVenduto);
    console.log(`📊 Trovati ${data.length} record nel database`);
    
    if (data.length === 0) {
      console.log('❌ Il database è vuoto');
      return;
    }
    
    // Mostra header per capire la struttura
    console.log('\n📋 Struttura dati (primi 5 record):');
    console.log('Header:', data[0]);
    
    // Analizza i clienti (assumendo che il cliente sia nella colonna 7 - "Descrizione Cliente")
    const uniqueClients = new Set();
    const clientiDetails = new Map();
    
    data.forEach((row, index) => {
      if (index === 0) return; // Skip header
      
      const numeroOrdine = row[0];
      const dataOrdine = row[1];
      const dataConsegna = row[2];
      const codiceCliente = row[6];
      const nomeCliente = row[7];
      const indirizzoConsegna = row[8];
      const partitaIva = row[9];
      const codiceProdotto = row[10];
      const quantita = row[12];
      const importo = row[16];
      
      if (nomeCliente && nomeCliente.trim() !== '') {
        uniqueClients.add(nomeCliente);
        
        if (!clientiDetails.has(nomeCliente)) {
          clientiDetails.set(nomeCliente, {
            nome: nomeCliente,
            codice: codiceCliente,
            partitaIva: partitaIva,
            indirizzo: indirizzoConsegna,
            ordini: new Set(),
            totalOrders: 0,
            totalAmount: 0
          });
        }
        
        const clientInfo = clientiDetails.get(nomeCliente);
        clientInfo.ordini.add(numeroOrdine);
        clientInfo.totalAmount += parseFloat(importo) || 0;
      }
    });
    
    console.log(`\n👥 Clienti unici trovati: ${uniqueClients.size}`);
    console.log('\n📋 ELENCO CLIENTI NEL DATABASE:');
    console.log('=' .repeat(80));
    
    // Ordina i clienti per totale importo
    const clientiArray = Array.from(clientiDetails.values());
    clientiArray.sort((a, b) => b.totalAmount - a.totalAmount);
    
    clientiArray.forEach((cliente, index) => {
      cliente.totalOrders = cliente.ordini.size;
      console.log(`\n${index + 1}. ${cliente.nome}`);
      console.log(`   Codice: ${cliente.codice || 'N/A'}`);
      console.log(`   P.IVA: ${cliente.partitaIva || 'N/A'}`);
      console.log(`   Indirizzo: ${cliente.indirizzo || 'N/A'}`);
      console.log(`   Ordini: ${cliente.totalOrders}`);
      console.log(`   Valore totale: €${cliente.totalAmount.toFixed(2)}`);
      console.log(`   Numeri ordini: ${Array.from(cliente.ordini).join(', ')}`);
    });
    
    console.log('\n' + '=' .repeat(80));
    console.log(`📊 RIEPILOGO:`);
    console.log(`   • Clienti totali: ${uniqueClients.size}`);
    console.log(`   • Record totali: ${data.length - 1}`);
    console.log(`   • Valore complessivo: €${clientiArray.reduce((sum, c) => sum + c.totalAmount, 0).toFixed(2)}`);
    
    return {
      clienti: clientiArray,
      totaleClienti: uniqueClients.size,
      totaleRecord: data.length - 1
    };
    
  } catch (e) {
    console.error('❌ Errore nell\'analisi dei dati:', e);
    return null;
  }
}

// Esegui la query
queryClientiDatabase();