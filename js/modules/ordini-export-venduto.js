/**
 * Ordini Export ORDINI Module
 * Gestione specifica del file ORDINI
 */

window.OrdiniExportVenduto = {
  /**
   * Export nel file ORDINI permanente (append, non sovrascrittura)
   */
  exportToOrdiniFile: function(orders) {
    try {
      const result = OrdiniExportCore.prepareOrderData(orders);
      const orderData = result.data;
      const totaleRealeExcel = result.totale;
      
      // Recupera dati esistenti dal file ORDINI se presente
      let existingData = [];
      const savedOrdini = localStorage.getItem('ordiniFileData');
      if (savedOrdini) {
        try {
          existingData = JSON.parse(savedOrdini);
          console.log(`📥 Dati caricati dal localStorage: ${existingData.length} righe`);
          
          // Rimuovi l'header se presente
          if (existingData.length > 0 && existingData[0][0] === 'N° Ordine') {
            existingData.shift();
            console.log(`📋 Header rimosso. Righe dati: ${existingData.length}`);
          }
          
          // NUOVO: Rimuovi duplicati basato su chiave unica
          const uniqueData = [];
          const seenKeys = new Set();
          let duplicatiRimossi = 0;
          
          existingData.forEach(row => {
            if (row && row.length >= 13) { // Verifica che la riga sia valida (13 colonne)
              const uniqueKey = `${row[0]}_${row[6]}`; // Numero Ordine + Codice Prodotto (colonna 6)
              if (!seenKeys.has(uniqueKey)) {
                seenKeys.add(uniqueKey);
                uniqueData.push(row);
              } else {
                duplicatiRimossi++;
                console.log(`🗑️ Riga duplicata rimossa: ${uniqueKey}`);
              }
            }
          });
          
          console.log(`🧹 Duplicati rimossi: ${duplicatiRimossi}. Righe univoche: ${uniqueData.length}`);
          
          // Filtra righe valide (non vuote, con tutti i campi necessari)
          existingData = uniqueData.filter(row => {
            // Verifica che la riga abbia almeno 16 colonne (struttura completa)
            if (!row || row.length < 13) {
              console.log(`🗑️ Riga con colonne mancanti rimossa`);
              return false;
            }
            
            // Verifica che i campi essenziali non siano vuoti
            const numeroOrdine = row[0];
            const codiceProdotto = row[6];   // Codice Prodotto è alla colonna 6
            const quantita = parseFloat(row[8]) || 0; // Quantità è alla colonna 8
            
            if (!numeroOrdine || !codiceProdotto || quantita === 0) {
              console.log(`🗑️ Riga invalida rimossa: Ordine=${numeroOrdine}, Prodotto=${codiceProdotto}, Q=${quantita}`);
              return false;
            }
            
            return true;
          });
          
          console.log(`✅ Righe valide dopo filtro: ${existingData.length}`);
          
          // Analisi dettagliata per debug
          console.log('\n📊 ANALISI DETTAGLIATA RIGHE ESISTENTI:');
          const righePerOrdine = {};
          existingData.forEach(row => {
            const ordine = row[0];
            righePerOrdine[ordine] = (righePerOrdine[ordine] || 0) + 1;
          });
          
          console.log(`Ordini unici: ${Object.keys(righePerOrdine).length}`);
          console.log(`Totale prodotti: ${existingData.length}`);
          
          // Identifica ordini con troppi prodotti (possibili duplicati)
          const ordiniSospetti = Object.entries(righePerOrdine)
            .filter(([ordine, count]) => count > 50)
            .map(([ordine, count]) => `${ordine}: ${count} righe`);
          
          if (ordiniSospetti.length > 0) {
            console.log('⚠️ ORDINI CON MOLTI PRODOTTI:', ordiniSospetti);
          }
          
        } catch (e) {
          console.error('Errore nel caricamento dati ORDINI esistenti:', e);
        }
      }
      
      // Controlla duplicati
      const newDataWithoutHeader = orderData.slice(1); // Rimuovi header dai nuovi dati
      const duplicateCheck = this.checkForDuplicates(existingData, newDataWithoutHeader);
      
      if (duplicateCheck.hasDuplicates) {
        // Mostra dialog per gestire i duplicati
        OrdiniExportUI.showDuplicatesDialog(duplicateCheck, existingData, orderData, totaleRealeExcel);
        return; // Interrompi l'esecuzione normale
      }
      
      // Se non ci sono duplicati, procedi normalmente
      const combinedData = [
        orderData[0], // Header
        ...existingData,
        ...newDataWithoutHeader
      ];
      
      // Usa la funzione comune per completare l'export
      this.finishOrdiniExport(combinedData, newDataWithoutHeader.length);
      
    } catch (e) {
      console.error('Errore durante l\'aggiornamento ORDINI:', e);
      alert('Errore durante l\'aggiornamento ORDINI: ' + e.message);
    }
  },
  
  /**
   * Controlla se ci sono duplicati tra i dati esistenti e quelli nuovi
   */
  checkForDuplicates: function(existingData, newData) {
    const duplicates = [];
    const uniqueNewData = [];
    
    // Crea un set di chiavi uniche per i dati esistenti
    // Chiave = NumeroOrdine + CodiceProdotto
    const existingKeys = new Set();
    existingData.forEach(row => {
      const key = `${row[0]}_${row[6]}`; // NumeroOrdine_CodiceProdotto (colonna 6)
      existingKeys.add(key);
    });
    
    // Controlla ogni nuova riga
    newData.forEach((row, index) => {
      const key = `${row[0]}_${row[6]}`; // NumeroOrdine_CodiceProdotto (colonna 6)
      if (existingKeys.has(key)) {
        duplicates.push({
          index: index,
          orderNumber: row[0],
          productCode: row[6],  // Codice Prodotto è alla colonna 6  
          client: row[2],       // Cliente è alla colonna 2
          description: row[7],  // Prodotto è alla colonna 7
          amount: row[12]       // Importo è alla colonna 12
        });
      } else {
        uniqueNewData.push(row);
      }
    });
    
    return {
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates,
      uniqueNewData: uniqueNewData,
      totalDuplicates: duplicates.length,
      totalNew: newData.length
    };
  },
  
  /**
   * Completa l'export del file ORDINI (append, non sovrascrittura)
   */
  finishOrdiniExport: function(combinedData, newRowsCount) {
    try {
      // === INIZIO DEBUG DETTAGLIATO ===
      console.log('\n🔍 DEBUG DETTAGLIATO - finishOrdiniExport');
      console.log('=====================================');
      
      // 1. Log dettagliato del contenuto di combinedData
      console.log('📋 ANALISI COMBINED DATA:');
      console.log(`  - Lunghezza totale array: ${combinedData.length}`);
      console.log(`  - Di cui header: 1 riga`);
      console.log(`  - Righe dati effettive: ${combinedData.length - 1}`);
      
      // NUOVO: Rimuovi duplicati anche prima del salvataggio finale
      console.log('\n🔍 CONTROLLO FINALE DUPLICATI:');
      const dataToSave = combinedData.slice(1); // Rimuovi header
      const finalUniqueData = [];
      const finalSeenKeys = new Set();
      let duplicatiFinali = 0;
      
      dataToSave.forEach((row, index) => {
        if (row && row.length >= 13 && row[0] && row[6]) {
          const uniqueKey = `${row[0]}_${row[6]}`; // NumeroOrdine_CodiceProdotto (colonna 6)
          if (!finalSeenKeys.has(uniqueKey)) {
            finalSeenKeys.add(uniqueKey);
            finalUniqueData.push(row);
          } else {
            duplicatiFinali++;
            console.log(`🗑️ Duplicato finale rimosso [${index}]: ${uniqueKey}`);
          }
        }
      });
      
      console.log(`✅ Controllo finale: ${duplicatiFinali} duplicati rimossi`);
      console.log(`✅ Righe univoche finali: ${finalUniqueData.length}`);
      
      // Ricrea combinedData con dati puliti
      combinedData = [combinedData[0], ...finalUniqueData];
      
      // 2. Verifica righe vuote o duplicate
      let emptyRows = 0;
      let validRows = 0;
      let problematicRows = [];
      const rowsMap = new Map();
      
      for (let i = 1; i < combinedData.length; i++) {
        const row = combinedData[i];
        
        // Controlla se la riga è vuota o invalida
        if (!row || row.length === 0) {
          emptyRows++;
          problematicRows.push({ index: i, issue: 'Riga completamente vuota' });
          continue;
        }
        
        // Controlla se tutti i campi sono vuoti
        const hasContent = row.some(cell => cell !== '' && cell !== null && cell !== undefined);
        if (!hasContent) {
          emptyRows++;
          problematicRows.push({ index: i, issue: 'Tutti i campi vuoti' });
          continue;
        }
        
        // Crea chiave unica per verificare duplicati
        const rowKey = `${row[0]}_${row[6]}`; // NumeroOrdine_CodiceProdotto
        if (rowsMap.has(rowKey)) {
          problematicRows.push({ 
            index: i, 
            issue: 'Duplicato', 
            key: rowKey,
            firstOccurrence: rowsMap.get(rowKey)
          });
        } else {
          rowsMap.set(rowKey, i);
          validRows++;
        }
      }
      
      console.log('\n📊 STATISTICHE RIGHE:');
      console.log(`  - Righe valide: ${validRows}`);
      console.log(`  - Righe vuote: ${emptyRows}`);
      console.log(`  - Righe problematiche totali: ${problematicRows.length}`);
      
      if (problematicRows.length > 0) {
        console.log('\n⚠️ DETTAGLIO RIGHE PROBLEMATICHE:');
        problematicRows.forEach(p => {
          console.log(`  Riga ${p.index}: ${p.issue}${p.key ? ' (chiave: ' + p.key + ')' : ''}`);
        });
      }
      
      // 3. Analisi pre-salvataggio
      console.log('\n💾 DATI PRE-SALVATAGGIO:');
      console.log(`  - Righe da salvare nel localStorage: ${finalUniqueData.length}`);
      console.log(`  - Dimensione stimata JSON: ${JSON.stringify(finalUniqueData).length} caratteri`);
      
      // Mostra prime 5 e ultime 5 righe
      console.log('\n📄 PRIME 5 RIGHE:');
      for (let i = 0; i < Math.min(5, finalUniqueData.length); i++) {
        console.log(`  [${i}] Ordine: ${finalUniqueData[i][0]}, Prodotto: ${finalUniqueData[i][6]}, Importo: ${finalUniqueData[i][12]}`);
      }
      
      if (finalUniqueData.length > 5) {
        console.log('\n📄 ULTIME 5 RIGHE:');
        for (let i = Math.max(0, finalUniqueData.length - 5); i < finalUniqueData.length; i++) {
          console.log(`  [${i}] Ordine: ${finalUniqueData[i][0]}, Prodotto: ${finalUniqueData[i][6]}, Importo: ${finalUniqueData[i][12]}`);
        }
      }
      // === FINE DEBUG DETTAGLIATO ===
      
      // Crea workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(combinedData);
      
      // Formatta colonne numeriche
      OrdiniExportUtils.formatNumericColumns(ws);
      
      // Imposta larghezza colonne
      const colWidths = [
        {wch: 15}, // N° Ordine
        {wch: 12}, // Data Ordine
        {wch: 30}, // Cliente
        {wch: 40}, // Indirizzo Consegna
        {wch: 15}, // P.IVA
        {wch: 12}, // Data Consegna
        {wch: 12}, // Codice Prodotto
        {wch: 40}, // Prodotto
        {wch: 8},  // Quantità
        {wch: 12}, // Prezzo Unitario
        {wch: 8},  // S.M.
        {wch: 8},  // Sconto %
        {wch: 12}  // Importo
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, 'ORDINI');
      
      // Salva il file
      XLSX.writeFile(wb, 'ORDINI.xlsx');
      
      // Salva i dati combinati nel localStorage per il prossimo aggiornamento
      // IMPORTANTE: Salva solo i dati puliti (finalUniqueData)
      localStorage.setItem('ordiniFileData', JSON.stringify(finalUniqueData));
      
      // 3. Controllo post-salvataggio
      console.log('\n✅ VERIFICA POST-SALVATAGGIO:');
      const savedData = localStorage.getItem('ordiniFileData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log(`  - Righe salvate nel localStorage: ${parsedData.length}`);
        console.log(`  - Verifica: ${parsedData.length === finalUniqueData.length ? '✅ OK' : '❌ DISCREPANZA!'}`);
        
        if (parsedData.length !== finalUniqueData.length) {
          console.error('⚠️ ATTENZIONE: Il numero di righe salvate non corrisponde!');
          console.error(`  Attese: ${finalUniqueData.length}, Salvate: ${parsedData.length}`);
        }
      }
      
      // Calcola totali
      const totalRows = combinedData.length - 1;
      let grandTotal = 0;
      
      for (let i = 1; i < combinedData.length; i++) {
        grandTotal += parseFloat(combinedData[i][12]) || 0; // Colonna 12: Importo
      }
      
      console.log('\n📊 === AGGIORNAMENTO FILE ORDINI COMPLETATO ===');
      console.log(`Righe totali: ${totalRows}`);
      console.log(`Nuove righe aggiunte: ${newRowsCount}`);
      console.log(`Totale complessivo: €${grandTotal.toFixed(2)}`);
      console.log('=====================================\n');
      
      // Mostra risultati
      OrdiniExportUI.showOrdiniResults(totalRows, newRowsCount, grandTotal);
      
    } catch (e) {
      console.error('Errore durante l\'aggiornamento ORDINI:', e);
      alert('Errore durante l\'aggiornamento ORDINI: ' + e.message);
    }
  },
  
  /**
   * Visualizza il contenuto del file ORDINI salvato
   */
  viewOrdiniContent: function() {
    console.log('📋 Visualizzazione contenuto file ORDINI...');
    
    // Recupera dati dal localStorage
    const savedVenduto = localStorage.getItem('ordiniFileData');
    if (!savedVenduto) {
      OrdiniExportUI.showVendutoContentModal(null, 0);
      return;
    }
    
    try {
      const data = JSON.parse(savedVenduto);
      console.log(`File ORDINI contiene ${data.length} righe`);
      
      // Analizza i dati
      const stats = this.analyzeOrdiniData(data);
      OrdiniExportUI.showVendutoContentModal(stats, data.length);
      
    } catch (e) {
      console.error('Errore nel caricamento dati ORDINI:', e);
      alert('Errore nel caricamento del file ORDINI');
    }
  },
  
  /**
   * Analizza i dati del file ORDINI
   */
  analyzeOrdiniData: function(data) {
    const stats = {
      ordersMap: new Map(),
      totalAmount: 0,
      totalQuantity: 0,
      uniqueProducts: new Set(),
      uniqueClients: new Set(),
      dateRange: { min: null, max: null }
    };
    
    data.forEach(row => {
      // Struttura file esistente (13 colonne):
      // row[0] = N° Ordine
      // row[1] = Data Ordine  
      // row[2] = Cliente
      // row[3] = Indirizzo Consegna
      // row[4] = P.IVA
      // row[5] = Data Consegna
      // row[6] = Codice Prodotto
      // row[7] = Prodotto
      // row[8] = Quantità
      // row[9] = Prezzo Unitario
      // row[10] = S.M.
      // row[11] = Sconto %
      // row[12] = Importo
      
      const orderNum = row[0];
      const client = row[2];
      const productCode = row[6];
      const quantity = parseFloat(row[8]) || 0;
      const amount = parseFloat(row[12]) || 0;
      const orderDate = row[1];
      
      // Aggrega per ordine
      if (!stats.ordersMap.has(orderNum)) {
        stats.ordersMap.set(orderNum, {
          orderNumber: orderNum,
          client: client,
          date: orderDate,
          products: 0,
          totalAmount: 0
        });
      }
      
      const orderInfo = stats.ordersMap.get(orderNum);
      orderInfo.products++;
      orderInfo.totalAmount += amount;
      
      // Statistiche globali
      stats.totalAmount += amount;
      stats.totalQuantity += quantity;
      stats.uniqueProducts.add(productCode);
      stats.uniqueClients.add(client);
      
      // Date range
      if (orderDate) {
        if (!stats.dateRange.min || orderDate < stats.dateRange.min) {
          stats.dateRange.min = orderDate;
        }
        if (!stats.dateRange.max || orderDate > stats.dateRange.max) {
          stats.dateRange.max = orderDate;
        }
      }
    });
    
    return stats;
  },
  
  /**
   * Importa un file ORDINI.xlsx esistente per sincronizzare il localStorage
   */
  importOrdiniFile: function(file) {
    console.log('📥 Importazione file ORDINI esistente...');
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {type: 'array'});
          
          // Leggi il primo foglio
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Converti in array di array
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
          
          console.log(`Lette ${jsonData.length} righe dal file ORDINI`);
          
          // Rimuovi header se presente
          let dataRows = jsonData;
          if (dataRows.length > 0 && dataRows[0][0] === 'N° Ordine') {
            dataRows = dataRows.slice(1);
            console.log('Rimosso header, righe dati: ' + dataRows.length);
          }
          
          resolve(dataRows);
        } catch (error) {
          console.error('Errore nella lettura del file:', error);
          reject(error);
        }
      };
      
      reader.onerror = function(error) {
        console.error('Errore nel caricamento file:', error);
        reject(error);
      };
      
      reader.readAsArrayBuffer(file);
    });
  },
  
  /**
   * Sincronizza il localStorage con i dati letti dal file ORDINI esistente
   */
  syncWithExistingOrdini: async function(file) {
    try {
      // Mostra indicatore di caricamento
      const loadingModal = OrdiniExportUI.showLoadingModal('Sincronizzazione in corso...');
      
      // Importa i dati dal file
      const importedData = await this.importOrdiniFile(file);
      
      // Analizza i dati importati
      const stats = this.analyzeOrdiniData(importedData);
      
      // Salva nel localStorage
      localStorage.setItem('ordiniFileData', JSON.stringify(importedData));
      console.log(`✅ Sincronizzazione completata: ${importedData.length} righe salvate`);
      
      // Chiudi loading modal
      if (loadingModal) loadingModal.remove();
      
      // Mostra risultati
      OrdiniExportUI.showSyncResults(importedData.length, stats);
      
      return true;
    } catch (error) {
      console.error('Errore durante la sincronizzazione:', error);
      alert('Errore durante la sincronizzazione: ' + error.message);
      return false;
    }
  },
  
  /**
   * Test diretto del calcolo per DL000301
   */
  testCalcoloDL000301: function() {
    console.log('\n🧪 TEST DIRETTO CALCOLO DL000301:');
    
    // Dati del prodotto
    const testData = {
      code: 'DL000301',
      description: 'TORC ETTI "GOLOSI" SAC C HETTO 400 G',
      quantity: '480,00',
      price: '2,30',
      sm: '80,00',
      discount: '0,00'
    };
    
    // Conversione valori
    const quantity = parseFloat(testData.quantity.replace(',', '.')) || 0;
    const unitPrice = parseFloat(testData.price.replace(',', '.')) || 0;
    const sm = parseFloat(testData.sm.replace(',', '.')) || 0;
    const discount = parseFloat(testData.discount.replace(',', '.')) || 0;
    
    console.log('Input:');
    console.log(`  Quantità: ${quantity}`);
    console.log(`  Prezzo: ${unitPrice}`);
    console.log(`  S.M.: ${sm}`);
    console.log(`  Sconto %: ${discount}`);
    
    // Calcolo
    const quantitaEffettiva = quantity - sm;
    let importo = quantitaEffettiva * unitPrice;
    
    if (discount > 0) {
      importo = importo * (1 - discount / 100);
    }
    
    console.log('\nCalcolo:');
    console.log(`  Quantità effettiva: ${quantity} - ${sm} = ${quantitaEffettiva}`);
    console.log(`  Importo: ${quantitaEffettiva} × ${unitPrice} = ${importo}`);
    console.log(`\n✅ RISULTATO FINALE: €${importo.toFixed(2)}`);
    
    if (Math.abs(importo - 920) < 0.01) {
      console.log('✅ TEST PASSATO: Il risultato è corretto (920)');
    } else {
      console.error(`❌ TEST FALLITO: Il risultato è ${importo} invece di 920`);
    }
    
    return importo;
  }
};