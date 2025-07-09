/**
 * Debug script per analizzare la struttura degli ordini nel database
 */

function debugOrdiniDatabase() {
  console.log('🔍 DEBUG: Analisi struttura database ordini...');
  
  // Recupera dati dal localStorage
  const savedVenduto = localStorage.getItem('ordiniFileData');
  if (!savedVenduto) {
    console.log('❌ Nessun dato trovato in ordiniFileData');
    return;
  }
  
  try {
    const data = JSON.parse(savedVenduto);
    console.log(`📊 Trovati ${data.length} record totali`);
    
    if (data.length === 0) {
      console.log('❌ Database vuoto');
      return;
    }
    
    // Analizza header
    console.log('\n📋 HEADER (riga 0):');
    console.log('Posizioni colonne:');
    data[0].forEach((col, index) => {
      console.log(`  [${index}] "${col}"`);
    });
    
    // Analizza prime 3 righe dati
    console.log('\n📊 PRIME 3 RIGHE DATI:');
    for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
      console.log(`\nRiga ${i}:`);
      data[i].forEach((cell, index) => {
        console.log(`  [${index}] "${cell}" (${typeof cell})`);
      });
    }
    
    // Analizza colonna clienti (dovrebbe essere [7] o [6])
    console.log('\n👥 ANALISI COLONNA CLIENTI:');
    
    // Prova colonna 6 (Codice Cliente)
    const codiciClienti = new Set();
    const nomiClienti = new Set();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      const codiceCliente = row[6]; // Colonna "Codice Cliente"
      const nomeCliente = row[7];   // Colonna "Descrizione Cliente"
      
      if (codiceCliente && codiceCliente.trim() !== '') {
        codiciClienti.add(codiceCliente);
      }
      
      if (nomeCliente && nomeCliente.trim() !== '') {
        nomiClienti.add(nomeCliente);
      }
    }
    
    console.log(`Codici clienti unici (colonna 6): ${codiciClienti.size}`);
    console.log('Primi 5 codici:', Array.from(codiciClienti).slice(0, 5));
    
    console.log(`Nomi clienti unici (colonna 7): ${nomiClienti.size}`);
    console.log('Primi 5 nomi:', Array.from(nomiClienti).slice(0, 5));
    
    // Analizza ordini
    console.log('\n📋 ANALISI ORDINI:');
    const numeriOrdine = new Set();
    for (let i = 1; i < data.length; i++) {
      const numeroOrdine = data[i][0]; // Colonna "Numero Ordine"
      if (numeroOrdine && numeroOrdine.trim() !== '') {
        numeriOrdine.add(numeroOrdine);
      }
    }
    
    console.log(`Numeri ordine unici: ${numeriOrdine.size}`);
    console.log('Numeri ordine:', Array.from(numeriOrdine));
    
    // Analizza valori vuoti
    console.log('\n🔍 ANALISI VALORI VUOTI:');
    let righeVuoteCliente = 0;
    let righeVuoteOrdine = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[7] || row[7].trim() === '') righeVuoteCliente++;
      if (!row[0] || row[0].trim() === '') righeVuoteOrdine++;
    }
    
    console.log(`Righe con nome cliente vuoto: ${righeVuoteCliente}/${data.length - 1}`);
    console.log(`Righe con numero ordine vuoto: ${righeVuoteOrdine}/${data.length - 1}`);
    
    // Verifica se i dati sono nella struttura attesa
    console.log('\n✅ VERIFICA STRUTTURA:');
    console.log('Header atteso vs trovato:');
    const expectedHeaders = [
      'Numero Ordine', 'Data Ordine', 'Data Consegna', 'Tipo Documento',
      'Numero documento', 'Data Documento', 'Codice Cliente', 'Descrizione Cliente',
      'Indirizzo di Consegna', 'P.Iva', 'Codice Prodotto', 'Descrizione Prodotto',
      'Pezzi', 'Prezzo Unitario', 'Sconto (%)', 'S.M.', 'Importo'
    ];
    
    expectedHeaders.forEach((expected, index) => {
      const found = data[0][index] || 'MANCANTE';
      const match = expected === found ? '✅' : '❌';
      console.log(`  [${index}] ${match} "${expected}" → "${found}"`);
    });
    
    return {
      totalRecords: data.length,
      uniqueOrders: numeriOrdine.size,
      uniqueClients: nomiClienti.size,
      header: data[0],
      sampleData: data.slice(1, 4)
    };
    
  } catch (e) {
    console.error('❌ Errore nell\'analisi:', e);
    return null;
  }
}

// Esegui il debug
debugOrdiniDatabase();