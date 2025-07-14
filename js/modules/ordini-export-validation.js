/**
 * Ordini Export Validation Module
 * Funzioni di validazione e pulizia dati
 */

window.OrdiniExportValidation = {
  /**
   * Funzione di debug per analizzare il contenuto del file ORDINI nel localStorage
   */
  debugVendutoCount: function() {
    console.log('\n🔍 DEBUG ORDINI COUNT - ANALISI DETTAGLIATA');
    console.log('==========================================');
    
    try {
      // 1. Leggi i dati dal localStorage
      const savedData = localStorage.getItem('ordiniFileData');
      
      if (!savedData) {
        console.log('❌ Nessun dato ORDINI trovato nel localStorage');
        return;
      }
      
      // 2. Parse dei dati
      const data = JSON.parse(savedData);
      console.log(`\n📊 DATI BASE:`);
      console.log(`  - Righe totali nel localStorage: ${data.length}`);
      console.log(`  - Dimensione dati: ${savedData.length} caratteri`);
      
      // 3. Analisi dettagliata delle righe
      let validRows = 0;
      let emptyRows = 0;
      let partialRows = 0;
      const duplicateMap = new Map();
      const orderProductCount = new Map();
      const problematicRows = [];
      
      data.forEach((row, index) => {
        // Verifica riga vuota
        if (!row || row.length === 0) {
          emptyRows++;
          problematicRows.push({
            index: index,
            type: 'EMPTY',
            data: row
          });
          return;
        }
        
        // Verifica se tutti i campi sono vuoti
        const nonEmptyFields = row.filter(field => field !== '' && field !== null && field !== undefined).length;
        if (nonEmptyFields === 0) {
          emptyRows++;
          problematicRows.push({
            index: index,
            type: 'ALL_FIELDS_EMPTY',
            data: row
          });
          return;
        }
        
        // Verifica righe parziali (con alcuni campi vuoti)
        if (nonEmptyFields < row.length / 2) {
          partialRows++;
          problematicRows.push({
            index: index,
            type: 'PARTIAL',
            nonEmptyFields: nonEmptyFields,
            data: row
          });
        }
        
        // Crea chiave per duplicati (struttura 13 colonne)
        const key = `${row[0]}_${row[6]}`; // NumeroOrdine_CodiceProdotto
        if (duplicateMap.has(key)) {
          duplicateMap.get(key).push(index);
        } else {
          duplicateMap.set(key, [index]);
        }
        
        // Conta prodotti per ordine
        const orderNum = row[0];
        if (orderNum) {
          orderProductCount.set(orderNum, (orderProductCount.get(orderNum) || 0) + 1);
        }
        
        // Se arriviamo qui, la riga è valida
        if (nonEmptyFields > row.length / 2) {
          validRows++;
        }
      });
      
      // 4. Report sui duplicati
      const duplicates = [];
      duplicateMap.forEach((indices, key) => {
        if (indices.length > 1) {
          duplicates.push({ key, indices, count: indices.length });
        }
      });
      
      console.log(`\n📈 ANALISI QUALITÀ:`);
      console.log(`  - Righe valide: ${validRows}`);
      console.log(`  - Righe vuote: ${emptyRows}`);
      console.log(`  - Righe parziali: ${partialRows}`);
      console.log(`  - Chiavi duplicate: ${duplicates.length}`);
      console.log(`  - Ordini unici: ${orderProductCount.size}`);
      
      // 5. Dettaglio duplicati
      if (duplicates.length > 0) {
        console.log(`\n🔄 DUPLICATI TROVATI:`);
        duplicates.slice(0, 10).forEach(dup => {
          console.log(`  - Chiave: ${dup.key} (${dup.count} occorrenze)`);
          console.log(`    Righe: ${dup.indices.join(', ')}`);
        });
        if (duplicates.length > 10) {
          console.log(`  ... e altri ${duplicates.length - 10} duplicati`);
        }
      }
      
      // 6. Dettaglio righe problematiche
      if (problematicRows.length > 0) {
        console.log(`\n⚠️ RIGHE PROBLEMATICHE (prime 10):`);
        problematicRows.slice(0, 10).forEach(prob => {
          console.log(`  - Riga ${prob.index}: ${prob.type}`);
          if (prob.type === 'PARTIAL') {
            console.log(`    Campi non vuoti: ${prob.nonEmptyFields}`);
          }
          console.log(`    Dati: ${JSON.stringify(prob.data)}`);
        });
        if (problematicRows.length > 10) {
          console.log(`  ... e altre ${problematicRows.length - 10} righe problematiche`);
        }
      }
      
      // 7. Calcolo totale importi
      let totalAmount = 0;
      let rowsWithAmount = 0;
      data.forEach(row => {
        const amount = parseFloat(row[12]) || 0; // Colonna 12: Importo
        if (amount > 0) {
          totalAmount += amount;
          rowsWithAmount++;
        }
      });
      
      console.log(`\n💰 TOTALI:`);
      console.log(`  - Importo totale: €${totalAmount.toFixed(2)}`);
      console.log(`  - Righe con importo: ${rowsWithAmount}`);
      console.log(`  - Media per riga: €${(totalAmount / rowsWithAmount).toFixed(2)}`);
      
      // 8. Top 5 ordini per numero di prodotti
      const topOrders = Array.from(orderProductCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      console.log(`\n📦 TOP 5 ORDINI PER NUMERO PRODOTTI:`);
      topOrders.forEach(([orderNum, count]) => {
        console.log(`  - Ordine ${orderNum}: ${count} prodotti`);
      });
      
      // 9. Confronto con Excel
      console.log(`\n📊 RIEPILOGO FINALE:`);
      console.log(`  - Righe totali salvate: ${data.length}`);
      console.log(`  - Righe effettivamente valide: ${validRows}`);
      console.log(`  - Righe da verificare: ${emptyRows + partialRows}`);
      console.log(`  - Discrepanza: ${data.length - validRows} righe`);
      
      // 10. Suggerimenti
      if (emptyRows > 0 || partialRows > 0 || duplicates.length > 0) {
        console.log(`\n💡 SUGGERIMENTI:`);
        if (emptyRows > 0) {
          console.log(`  - Rimuovere ${emptyRows} righe vuote`);
        }
        if (partialRows > 0) {
          console.log(`  - Verificare ${partialRows} righe parziali`);
        }
        if (duplicates.length > 0) {
          console.log(`  - Gestire ${duplicates.length} gruppi di duplicati`);
        }
      }
      
      console.log('\n==========================================\n');
      
      // Ritorna un oggetto con il summary
      return {
        totalRows: data.length,
        validRows: validRows,
        emptyRows: emptyRows,
        partialRows: partialRows,
        duplicates: duplicates.length,
        totalAmount: totalAmount,
        uniqueOrders: orderProductCount.size
      };
      
    } catch (error) {
      console.error('❌ Errore durante il debug:', error);
      return null;
    }
  },

  /**
   * Funzione di validazione finale per verificare il conteggio corretto
   */
  validateFinalCount: function() {
    console.log('\n🎯 VALIDAZIONE FINALE CONTEGGIO ORDINI');
    console.log('======================================');
    
    try {
      const data = JSON.parse(localStorage.getItem('ordiniFileData') || '[]');
      const righeUniche = new Set();
      const duplicatiMap = new Map();
      let righeValide = 0;
      let righeInvalide = 0;
      
      data.forEach((row, index) => {
        if (row && row.length >= 13 && row[0] && row[6]) {
          const chiaveUnica = `${row[0]}_${row[6]}`;
          
          if (righeUniche.has(chiaveUnica)) {
            // Traccia duplicati
            if (!duplicatiMap.has(chiaveUnica)) {
              duplicatiMap.set(chiaveUnica, []);
            }
            duplicatiMap.get(chiaveUnica).push(index);
          } else {
            righeUniche.add(chiaveUnica);
            righeValide++;
          }
        } else {
          righeInvalide++;
          console.log(`❌ Riga invalida [${index}]: ${JSON.stringify(row ? row.slice(0, 3) : 'null')}`);
        }
      });
      
      console.log(`\n📊 RISULTATI VALIDAZIONE:`);
      console.log(`  - Righe totali in localStorage: ${data.length}`);
      console.log(`  - Righe valide univoche: ${righeValide}`);
      console.log(`  - Righe invalide: ${righeInvalide}`);
      console.log(`  - Chiavi univoche: ${righeUniche.size}`);
      console.log(`  - Duplicati rilevati: ${data.length - righeUniche.size - righeInvalide}`);
      
      // Mostra alcuni duplicati se presenti
      if (duplicatiMap.size > 0) {
        console.log(`\n⚠️ DETTAGLIO DUPLICATI:`);
        let count = 0;
        duplicatiMap.forEach((indices, key) => {
          if (count < 5) {
            console.log(`  - ${key}: presente alle righe ${indices.join(', ')}`);
            count++;
          }
        });
        if (duplicatiMap.size > 5) {
          console.log(`  ... e altri ${duplicatiMap.size - 5} duplicati`);
        }
      }
      
      // Verifica finale
      console.log(`\n🎯 VERIFICA OBIETTIVO:`);
      if (righeUniche.size === 522) {
        console.log('✅ CONTEGGIO CORRETTO! Esattamente 522 righe univoche');
      } else {
        const differenza = righeUniche.size - 522;
        console.log(`❌ CONTEGGIO ERRATO: atteso 522, trovato ${righeUniche.size}`);
        console.log(`   Differenza: ${differenza > 0 ? '+' : ''}${differenza} righe`);
        
        // Suggerimenti
        if (differenza > 0) {
          console.log(`\n💡 SUGGERIMENTO: Ci sono ${differenza} righe in più del previsto.`);
          console.log(`   Verificare possibili duplicati non rilevati o righe aggiunte per errore.`);
        }
      }
      
      console.log('\n======================================\n');
      
      return {
        totale: data.length,
        univoche: righeUniche.size,
        duplicati: data.length - righeUniche.size - righeInvalide,
        invalide: righeInvalide,
        corretto: righeUniche.size === 522
      };
      
    } catch (error) {
      console.error('❌ Errore durante la validazione:', error);
      return null;
    }
  },

  /**
   * Funzione per pulire il localStorage rimuovendo tutti i duplicati
   */
  cleanupVendutoData: function() {
    console.log('\n🧹 PULIZIA DATI ORDINI');
    console.log('======================');
    
    try {
      const data = JSON.parse(localStorage.getItem('ordiniFileData') || '[]');
      console.log(`📥 Righe iniziali: ${data.length}`);
      
      const cleanData = [];
      const seenKeys = new Set();
      let duplicatiRimossi = 0;
      let righeInvalideRimosse = 0;
      
      data.forEach(row => {
        if (row && row.length >= 13 && row[0] && row[6]) {
          const uniqueKey = `${row[0]}_${row[6]}`;
          const quantita = parseFloat(row[8]) || 0;
          
          // Verifica validità
          if (quantita > 0 && !seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            cleanData.push(row);
          } else if (seenKeys.has(uniqueKey)) {
            duplicatiRimossi++;
          } else {
            righeInvalideRimosse++;
          }
        } else {
          righeInvalideRimosse++;
        }
      });
      
      // Salva dati puliti
      localStorage.setItem('ordiniFileData', JSON.stringify(cleanData));
      
      console.log(`\n✅ PULIZIA COMPLETATA:`);
      console.log(`  - Righe iniziali: ${data.length}`);
      console.log(`  - Duplicati rimossi: ${duplicatiRimossi}`);
      console.log(`  - Righe invalide rimosse: ${righeInvalideRimosse}`);
      console.log(`  - Righe finali: ${cleanData.length}`);
      console.log(`  - Riduzione: ${data.length - cleanData.length} righe`);
      
      // Validazione finale
      this.validateFinalCount();
      
      return {
        before: data.length,
        after: cleanData.length,
        removed: data.length - cleanData.length
      };
      
    } catch (error) {
      console.error('❌ Errore durante la pulizia:', error);
      return null;
    }
  }
};