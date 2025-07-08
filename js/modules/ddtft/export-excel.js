/**
 * DDTFT Export Excel Module - Esportazione in formato Excel reale
 * 
 * INTESTAZIONI COLONNE EXCEL (16 colonne - NON MODIFICARE):
 * 1. Numero Ordine
 * 2. Data Ordine
 * 3. Tipo Documento
 * 4. Numero documento (minuscola)
 * 5. Data Documento
 * 6. Codice Cliente
 * 7. Descrizione Cliente
 * 8. Indirizzo di Consegna
 * 9. P.Iva
 * 10. Codice Prodotto
 * 11. Descrizione Prodotto
 * 12. Pezzi
 * 13. Prezzo Unitario
 * 14. Sconto (%)
 * 15. S.M.
 * 16. Importo
 */
window.DDTFTExportExcel = {
  // Esporta documenti in formato Excel
  exportToExcel: function(documents, filename = 'DDT-FT.xlsx') {
    console.log(`Esportazione ${documents.length} documenti in Excel`);
    
    if (!documents || documents.length === 0) {
      alert('Nessun documento da esportare');
      return;
    }

    // Verifica che XLSX sia disponibile
    if (typeof XLSX === 'undefined') {
      console.error('XLSX library non caricata');
      alert('Libreria Excel non disponibile');
      return;
    }

    try {
      // Crea un nuovo workbook
      const wb = XLSX.utils.book_new();
      
      // Prepara i dati per il foglio
      const wsData = this.prepareWorksheetData(documents);
      
      // Debug: verifica dati prima di creare il worksheet
      console.log('=== DATI DA SCRIVERE IN EXCEL ===');
      console.log('Numero totale righe (con header):', wsData.length);
      console.log('Headers:', wsData[0]);
      if (wsData.length > 1) {
        console.log('Prima riga dati completa:', wsData[1]);
        console.log('Dettaglio prima riga:');
        wsData[0].forEach((header, idx) => {
          console.log(`  ${header}: "${wsData[1][idx]}"`);
        });
        console.log('Descrizione Prodotto nella prima riga:', wsData[1][9]);
        
        if (wsData.length > 2) {
          console.log('Seconda riga dati:', wsData[2]);
        }
      } else {
        console.error('❌ ERRORE: Nessuna riga di dati oltre agli headers!');
      }
      
      // Crea il worksheet con opzioni per forzare stringhe
      const ws = XLSX.utils.aoa_to_sheet(wsData, {
        raw: false, // Non interpretare automaticamente i tipi
        cellDates: false // Non convertire automaticamente le date
      });
      
      // Debug: verifica worksheet creato
      console.log('Worksheet creato:', ws);
      console.log('Range worksheet:', ws['!ref']);
      
      // Debug: controlla alcune celle specifiche
      console.log('=== VERIFICA CELLE NEL WORKSHEET ===');
      console.log('Cella A1 (header):', ws['A1']);
      console.log('Cella K1 (header Descrizione Prodotto):', ws['K1']);
      console.log('Cella J2 (primo codice prodotto):', ws['J2']);
      console.log('Cella K2 (prima descrizione prodotto):', ws['K2']);
      
      // Verifica se le celle esistono
      if (!ws['K2']) {
        console.error('❌ ERRORE: La cella K2 (descrizione prodotto) non esiste nel worksheet!');
      } else {
        console.log('✅ Valore in K2:', ws['K2'].v);
        console.log('✅ Tipo in K2:', ws['K2'].t);
      }
      
      // FIX CRITICO: Forza manualmente le celle della colonna K (Descrizione Prodotto) come stringhe
      console.log('=== APPLICAZIONE FIX MANUALE COLONNA DESCRIZIONI ===');
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = 1; R <= range.e.r; ++R) { // Salta header (riga 0)
        const cellAddress = XLSX.utils.encode_cell({r: R, c: 10}); // Colonna K (index 10)
        const cell = ws[cellAddress];
        if (cell) {
          const oldValue = cell.v;
          const oldType = cell.t;
          
          // Forza conversione a stringa
          if (cell.v === "0" || cell.v === 0 || !cell.v) {
            console.warn(`FIX: Riga ${R+1}, cella ${cellAddress}: valore errato "${cell.v}", sostituito con stringa vuota`);
            cell.v = '';
          } else {
            cell.v = String(cell.v);
          }
          
          cell.t = 's'; // Tipo stringa
          cell.w = cell.v; // Valore formattato = valore
          
          if (R <= 3) { // Log solo le prime righe
            console.log(`FIX applicato a ${cellAddress}: "${oldValue}" (${oldType}) → "${cell.v}" (${cell.t})`);
          }
        }
      }
      console.log('✅ Fix manuale completato per colonna descrizioni');
      
      // Applica formato numerico alle celle numeriche
      this.applyNumberFormats(ws, wsData);
      
      // Imposta larghezza colonne
      ws['!cols'] = [
        {wch: 15}, // Numero Ordine
        {wch: 12}, // Data Ordine
        {wch: 12}, // Tipo Documento
        {wch: 15}, // Numero Documento
        {wch: 12}, // Data Documento
        {wch: 12}, // Codice Cliente
        {wch: 35}, // Nome Cliente
        {wch: 40}, // Indirizzo Consegna
        {wch: 15}, // P.Iva
        {wch: 15}, // Codice Prodotto
        {wch: 50}, // Descrizione Prodotto
        {wch: 10}, // Pezzi
        {wch: 15}, // Prezzo Unitario
        {wch: 10}, // Sconto %
        {wch: 12}, // Sconto Merce
        {wch: 15}  // Importo
      ];
      
      // Aggiungi il worksheet al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'DDT-FT');
      
      // Scrivi il file
      XLSX.writeFile(wb, filename);
      
      console.log(`✅ File ${filename} esportato con successo`);
    } catch (error) {
      console.error('Errore esportazione Excel:', error);
      alert('Errore durante l\'esportazione: ' + error.message);
    }
  },

  // Prepara i dati per il worksheet Excel
  prepareWorksheetData: function(documents) {
    // Headers UFFICIALI per DDT e FT - NON MODIFICARE
    const headers = [
      'Numero Ordine',
      'Data Ordine',
      'Tipo Documento',
      'Numero documento',      // minuscola come richiesto
      'Data Documento',
      'Data Consegna',         // NUOVO CAMPO
      'Codice Cliente',
      'Descrizione Cliente',   // "Descrizione" invece di "Nome"
      'Indirizzo di Consegna',
      'P.Iva',
      'Codice Prodotto',
      'Descrizione Prodotto',
      'Pezzi',
      'Prezzo Unitario',
      'Sconto (%)',           // con parentesi
      'S.M.',                  // abbreviato invece di "Sconto Merce"
      'Importo'
    ];
    
    // Prepara le righe
    const rows = [];
    
    // Debug: log della struttura documenti
    console.log('=== DEBUG EXPORT EXCEL - INIZIO ===');
    console.log(`Numero documenti da esportare: ${documents.length}`);
    
    documents.forEach((doc, docIndex) => {
      console.log(`\nDocumento ${docIndex + 1}:`, {
        numero: doc.documentNumber || doc.number,
        cliente: doc.clientName,
        numeroItems: doc.items ? doc.items.length : 0
      });
      if (doc.items && doc.items.length > 0) {
        // Una riga per ogni articolo
        doc.items.forEach((item, itemIndex) => {
          // Debug: log dettagliato di ogni item
          if (docIndex === 0 && itemIndex === 0) {
            console.log('=== ANALISI ITEM ORIGINALE ===');
            console.log('Item completo:', item);
            console.log('Campi disponibili:', Object.keys(item));
            console.log('Valori dei campi:');
            Object.keys(item).forEach(key => {
              console.log(`  ${key}: "${item[key]}" (tipo: ${typeof item[key]})`);
            });
          }
          
          if (docIndex < 3 || item.description === "0" || !item.description) {
            console.log(`  Item ${itemIndex + 1}:`, {
              codice: item.code,
              descrizione: item.description,
              tipoDescrizione: typeof item.description,
              lunghezzaDescrizione: item.description ? item.description.length : 0,
              tuttiCampi: Object.keys(item)
            });
          }
          
          // Se la descrizione è "0" o mancante, log di warning
          if (!item.description || item.description === "0" || item.description === 0) {
            console.warn(`  ⚠️ ATTENZIONE: Descrizione mancante o "0" per prodotto ${item.code}`);
          }
          
          // Estrai numero ordine e numero documento
          const orderNumber = doc.orderNumber || doc.orderReference || '';
          const documentNumber = doc.documentNumber || doc.number || doc.documentNo || '';
          
          // Converti valori numerici in numeri reali per Excel
          const parseNumber = (value) => {
            if (!value || value === '') return 0;
            if (typeof value === 'number') return value;
            // Se è una stringa, converti virgola in punto e parsa
            const cleanValue = value.toString().replace(',', '.').replace(/[€$£\s%]/g, '');
            const num = parseFloat(cleanValue);
            return isNaN(num) ? 0 : num;
          };
          
          // Funzione per assicurarsi che la descrizione sia una stringa
          const ensureString = (value) => {
            if (value === null || value === undefined) return '';
            if (value === 0 || value === "0") {
              console.error(`❌ ERRORE: Valore "0" trovato per la descrizione!`);
              return ''; // Restituisce stringa vuota invece di "0"
            }
            return String(value);
          };
          
          // Controllo aggiuntivo per la descrizione
          // Se item è un array invece di un oggetto, prova a prendere la descrizione dalla posizione corretta
          let finalDescription = '';
          
          // Debug per primo item
          if (docIndex === 0 && itemIndex === 0) {
            console.log('=== DEBUG DESCRIZIONE ===');
            console.log('item.description:', item.description);
            console.log('typeof item.description:', typeof item.description);
            console.log('item.description !== undefined:', item.description !== undefined);
          }
          
          if (Array.isArray(item)) {
            console.warn(`⚠️ ATTENZIONE: Item è un array invece di un oggetto!`);
            // In base ai pattern comuni, la descrizione è spesso all'indice 1 o 2
            finalDescription = ensureString(item[1] || item[2] || '');
          } else if (item.description !== undefined) {
            finalDescription = ensureString(item.description);
            if (docIndex === 0 && itemIndex === 0) {
              console.log('✅ Descrizione presa da item.description:', finalDescription);
            }
          } else if (item.descrizione !== undefined) {
            finalDescription = ensureString(item.descrizione);
          } else if (item.descrizioneProdotto !== undefined) {
            finalDescription = ensureString(item.descrizioneProdotto);
          } else {
            // Cerca altri possibili nomi campo
            const possibleFields = ['desc', 'nome', 'nomeProdotto', 'articolo', 'denominazione'];
            for (const field of possibleFields) {
              if (item[field] !== undefined && item[field] !== "0") {
                finalDescription = ensureString(item[field]);
                console.log(`  📝 Descrizione trovata nel campo "${field}": ${finalDescription}`);
                break;
              }
            }
          }
          
          // Se ancora non trovata, controlla se item ha proprietà numeriche
          if (!finalDescription || finalDescription === "0") {
            for (let i = 0; i < 10; i++) {
              if (item[i] !== undefined && typeof item[i] === 'string' && 
                  item[i].length > 5 && item[i] !== "0" && !/^\d+$/.test(item[i])) {
                console.log(`  🔍 Possibile descrizione trovata all'indice [${i}]: "${item[i]}"`);
                finalDescription = ensureString(item[i]);
                break;
              }
            }
          }
          
          // Debug finale per primo item
          if (docIndex === 0 && itemIndex === 0) {
            console.log('=== VALORE FINALE DESCRIZIONE ===');
            console.log('finalDescription:', finalDescription);
            console.log('lunghezza:', finalDescription.length);
          }
          
          // FIX CRITICO: Se finalDescription è vuota o "0", prova a prenderla direttamente
          if (!finalDescription || finalDescription === "0" || finalDescription === "") {
            if (item.description && item.description !== "0") {
              finalDescription = String(item.description);
              console.warn(`⚠️ FIX CRITICO: Descrizione recuperata direttamente: "${finalDescription}"`);
            }
          }
          
          // SUPER FIX: Assicurati che la descrizione sia SEMPRE una stringa valida
          const safeDescription = (desc) => {
            if (desc === null || desc === undefined || desc === 0 || desc === "0") {
              return ''; // Stringa vuota invece di "0"
            }
            return String(desc);
          };
          
          // Salva l'unità di misura per la formattazione condizionale
          const unitMeasure = item.unit || item.um || 'PZ';
          
          // Unità che richiedono decimali
          const decimalUnits = ['KG', 'LT', 'MT', 'GR', 'ML'];
          
          // Formatta la quantità in base all'unità di misura
          let formattedQuantity = parseNumber(item.quantity);
          if (!decimalUnits.includes(unitMeasure.toUpperCase())) {
            // Per unità discrete (PZ, CF, CT, ecc.), arrotonda all'intero
            formattedQuantity = Math.round(formattedQuantity);
          }
          
          const row = [
            orderNumber,                                                   // Numero Ordine
            doc.orderDate || '',                                          // Data Ordine (dalla riga dell'ordine)
            (doc.type || doc.documentType || '').toUpperCase(),          // Tipo Documento (DDT/FT)
            documentNumber,                                               // Numero Documento
            doc.date || '',                                               // Data Documento
            doc.deliveryDate || '',                                       // Data Consegna (NUOVO CAMPO)
            doc.clientCode || doc.codiceCliente || '',                   // Codice Cliente
            doc.clientName || '',                                         // Nome Cliente
            doc.deliveryAddress || '',                                    // Indirizzo Consegna
            doc.vatNumber || '',                                          // P.Iva
            item.code || item.codice || '',                              // Codice Prodotto
            safeDescription(finalDescription || item.description),        // Descrizione Prodotto - SEMPRE STRINGA
            formattedQuantity,                                            // Pezzi (intero o decimale in base all'unità)
            parseNumber(item.price),                                      // Prezzo Unitario
            parseNumber(item.discount),                                   // Sconto %
            parseNumber(item.sm),                                         // Sconto Merce
            parseNumber(item.total)                                       // Importo
          ];
          
          // Debug: verifica contenuto riga
          if (docIndex === 0 && itemIndex === 0) {
            console.log('=== PRIMA RIGA DI DATI DETTAGLIATA ===');
            console.log('Riga completa:', row);
            console.log('Dettaglio valori:');
            headers.forEach((header, idx) => {
              console.log(`  ${idx}. ${header}: "${row[idx]}"`);
            });
            console.log('Descrizione prodotto (posizione 11):', row[11]);
            console.log('Tipo descrizione:', typeof row[11]);
            console.log('Verifica mapping - Codice Prodotto (pos 10):', row[10]);
            console.log('Verifica mapping - Descrizione (pos 11):', row[11]);
          }
          
          rows.push(row);
        });
      } else {
        // Se non ci sono articoli, crea una riga con i dati del documento
        // Estrai numero ordine e numero documento
        const orderNumber = doc.orderNumber || doc.orderReference || '';
        const documentNumber = doc.documentNumber || doc.number || doc.documentNo || '';
        
        // Converti valori numerici in numeri reali per Excel
        const parseNumber = (value) => {
          if (!value || value === '') return 0;
          if (typeof value === 'number') return value;
          // Se è una stringa, converti virgola in punto e parsa
          const cleanValue = value.toString().replace(',', '.').replace(/[€$£\s%]/g, '');
          const num = parseFloat(cleanValue);
          return isNaN(num) ? 0 : num;
        };
        
        const row = [
          orderNumber,                                                    // Numero Ordine
          doc.date || '',                                                // Data Ordine
          (doc.type || doc.documentType || '').toUpperCase(),           // Tipo Documento
          documentNumber,                                                // Numero Documento
          doc.date || '',                                                // Data Documento
          doc.deliveryDate || '',                                        // Data Consegna (NUOVO CAMPO)
          doc.clientCode || doc.codiceCliente || '',                    // Codice Cliente
          doc.clientName || '',                                          // Nome Cliente
          doc.deliveryAddress || '',                                     // Indirizzo Consegna
          doc.vatNumber || '',                                           // P.Iva
          '',                                                            // Codice Prodotto
          '',                                                            // Descrizione Prodotto
          0,                                                             // Pezzi
          0,                                                             // Prezzo Unitario
          0,                                                             // Sconto %
          0,                                                             // Sconto Merce
          parseNumber(doc.total)                                         // Importo
        ];
        
        rows.push(row);
      }
    });
    
    console.log('=== DEBUG EXPORT EXCEL - FINE ===');
    console.log(`Totale righe create: ${rows.length}`);
    
    // Controllo finale: verifica che nessuna descrizione sia "0"
    let descrizioniCorrette = 0;
    let descrizioniVuoteOZero = 0;
    
    rows.forEach((row, index) => {
      const descrizione = row[11]; // La descrizione è ora alla posizione 11 (0-based) dopo l'aggiunta di Data Consegna
      if (descrizione === "0" || descrizione === 0) {
        console.error(`❌ ERRORE FINALE: Riga ${index + 1} ha ancora descrizione "0"!`);
        descrizioniVuoteOZero++;
        // Sostituisci con stringa vuota per evitare "0" nell'export
        row[11] = '';
      } else if (!descrizione) {
        console.warn(`⚠️ Riga ${index + 1} ha descrizione vuota`);
        descrizioniVuoteOZero++;
      } else {
        descrizioniCorrette++;
      }
    });
    
    console.log(`📊 Riepilogo descrizioni: ${descrizioniCorrette} corrette, ${descrizioniVuoteOZero} vuote o zero`);
    
    // Combina headers e rows
    return [headers, ...rows];
  },

  // Applica formati numerici alle celle
  applyNumberFormats: function(ws, data) {
    // Indici delle colonne numeriche (0-based) - aggiornati per le nuove colonne
    const numericColumns = {
      12: 'quantity',   // Pezzi
      13: 'currency',   // Prezzo Unitario
      14: 'percentage', // Sconto %
      15: 'currency',   // Sconto Merce
      16: 'currency'    // Importo
    };
    
    // Colonne che DEVONO rimanere testo (0-based) - aggiornate per le nuove colonne
    const textColumns = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // Include Descrizione Prodotto (11)
    
    // Unità di misura che richiedono decimali
    const decimalUnits = ['KG', 'LT', 'MT', 'GR', 'ML'];
    
    // Itera sulle righe (salta l'header)
    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      
      // Prima assicurati che le colonne di testo rimangano testo
      textColumns.forEach(colIndex => {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        const cell = ws[cellAddress];
        
        if (cell) {
          // Forza il tipo stringa per le colonne di testo
          cell.t = 's';
          
          // Controllo speciale per la colonna descrizione (indice 11 con le nuove colonne)
          if (colIndex === 11) {
            // FORZA sempre la descrizione come stringa
            if (cell.v === "0" || cell.v === 0 || cell.v === null || cell.v === undefined) {
              console.error(`❌ Cella ${cellAddress} (Descrizione) contiene valore errato: "${cell.v}"!`);
              cell.v = ''; // Sostituisci con stringa vuota
            }
            // Assicurati che sia sempre una stringa
            cell.v = String(cell.v || '');
            cell.t = 's'; // Forza tipo stringa
            cell.w = cell.v; // Imposta anche il valore formattato
          }
        }
      });
      
      // Poi applica i formati numerici
      Object.keys(numericColumns).forEach(colIndex => {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: parseInt(colIndex) });
        const cell = ws[cellAddress];
        
        if (cell) {
          // Assicurati che sia un numero
          cell.t = 'n';
          
          // Applica il formato numero appropriato
          switch (numericColumns[colIndex]) {
            case 'currency':
              cell.z = '#,##0.00';  // Formato valuta senza simbolo
              break;
            case 'quantity':
              // Il valore è già formattato correttamente (intero o decimale)
              // Applica formato appropriato in base al tipo di valore
              if (Number.isInteger(cell.v)) {
                cell.z = '0';     // Formato intero semplice senza separatore migliaia
              } else {
                cell.z = '0.###'; // Formato con decimali (max 3) senza separatore migliaia
              }
              break;
            case 'percentage':
              cell.z = '0.00';      // Formato percentuale semplice
              break;
          }
        }
      });
    }
  },

  // Converte i documenti in formato CSV (backup)
  convertToCSV: function(documents) {
    // Headers
    const headers = [
      'Tipo', 'Numero', 'Data', 'Cliente', 'P.IVA', 
      'Indirizzo Consegna', 'Totale Imponibile', 'IVA', 'Totale'
    ];
    
    // Rows
    const rows = documents.map(doc => [
      doc.type || 'N/A',
      doc.documentNumber || 'N/A',
      doc.date || 'N/A',
      doc.clientName || 'N/A',
      doc.vatNumber || 'N/A',
      doc.deliveryAddress || 'N/A',
      doc.subtotal || '0.00',
      doc.vat || '0.00',
      doc.total || '0.00'
    ]);
    
    // Combina headers e rows
    const allRows = [headers, ...rows];
    
    // Converti in CSV
    return allRows.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
  },

  // Scarica il file CSV
  downloadCSV: function(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) {
      // IE 10+
      navigator.msSaveBlob(blob, filename);
    } else {
      // Altri browser
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    console.log(`File ${filename} scaricato`);
  }
};

// Esporta anche come funzione diretta per compatibilità
window.exportDDTFTToExcel = function(documents) {
  window.DDTFTExportExcel.exportToExcel(documents, 'DDT-FT.xlsx');
};

// Metodo aggiuntivo per esportare tutti i documenti salvati
window.DDTFTExportExcel.exportDocumentsToExcel = function(documents) {
  this.exportToExcel(documents, 'DDT-FT.xlsx');
};

console.log('Modulo export-excel.js caricato');