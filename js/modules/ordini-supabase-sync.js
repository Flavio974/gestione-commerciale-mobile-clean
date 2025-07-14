/**
 * Ordini Supabase Sync Module
 * Gestisce la sincronizzazione del file Excel ORDINI con la tabella Supabase
 */

window.OrdiniSupabaseSync = {
  /**
   * Importa i dati dal file Excel ORDINI nel database Supabase
   */
  importFromExcel: async function() {
    try {
      console.log('📤 Avvio importazione ORDINI in Supabase...');
      
      // Verifica se Supabase è disponibile
      if (!window.supabaseClient) {
        alert('❌ Connessione Supabase non disponibile. Verifica la configurazione.');
        return;
      }
      
      // Recupera i dati dal localStorage
      const savedOrdini = localStorage.getItem('ordiniFileData');
      if (!savedOrdini) {
        alert('⚠️ Nessun file ORDINI trovato. Prima esporta degli ordini in Excel.');
        return;
      }
      
      let ordiniData;
      try {
        ordiniData = JSON.parse(savedOrdini);
      } catch (e) {
        alert('❌ Errore nel caricamento dei dati ORDINI dal localStorage.');
        return;
      }
      
      if (!ordiniData || ordiniData.length === 0) {
        alert('⚠️ Il file ORDINI è vuoto.');
        return;
      }
      
      // Mostra dialog di conferma con statistiche
      const stats = this.analyzeOrdiniData(ordiniData);
      const confirmed = confirm(
        `📊 Sincronizzazione ORDINI → Supabase\n\n` +
        `Righe da sincronizzare: ${ordiniData.length}\n` +
        `Ordini unici: ${stats.uniqueOrders}\n` +
        `Clienti diversi: ${stats.uniqueClients}\n` +
        `Valore totale: €${stats.totalAmount.toFixed(2)}\n\n` +
        `Procedere con la sincronizzazione?`
      );
      
      if (!confirmed) {
        return;
      }
      
      // Mostra progress modal
      const progressModal = this.showProgressModal();
      
      // Converti i dati in formato Supabase
      const supabaseRecords = this.convertToSupabaseFormat(ordiniData);
      
      // Sincronizza con Supabase in batch
      const result = await this.syncToSupabase(supabaseRecords, progressModal);
      
      // Chiudi progress modal
      progressModal.remove();
      
      // Mostra risultati
      this.showSyncResults(result);
      
    } catch (error) {
      console.error('❌ Errore durante importazione in Supabase:', error);
      alert('❌ Errore durante l\'importazione: ' + error.message);
    }
  },
  
  /**
   * Analizza i dati ORDINI per fornire statistiche
   */
  analyzeOrdiniData: function(data) {
    const uniqueOrders = new Set();
    const uniqueClients = new Set();
    let totalAmount = 0;
    
    data.forEach(row => {
      if (row && row.length >= 13) {
        uniqueOrders.add(row[0]);           // N° Ordine
        uniqueClients.add(row[2]);          // Cliente
        totalAmount += parseFloat(row[12]) || 0;  // Importo
      }
    });
    
    return {
      uniqueOrders: uniqueOrders.size,
      uniqueClients: uniqueClients.size,
      totalAmount: totalAmount
    };
  },
  
  /**
   * Converte i dati Excel nel formato richiesto da Supabase
   */
  convertToSupabaseFormat: function(ordiniData) {
    const records = [];
    
    ordiniData.forEach((row, index) => {
      if (!row || row.length < 13) {
        console.warn(`Riga ${index} invalida, saltata:`, row);
        return;
      }
      
      // Mappa le colonne Excel ai campi Supabase (archivio_ordini_venduto)
      // Struttura Excel (13 colonne):
      // 0: N° Ordine, 1: Data Ordine, 2: Cliente, 3: Indirizzo Consegna, 
      // 4: P.IVA, 5: Data Consegna, 6: Codice Prodotto, 7: Prodotto,
      // 8: Quantità, 9: Prezzo Unitario, 10: S.M., 11: Sconto %, 12: Importo
      
      const record = {
        id: `${row[0]}_${row[6]}`,          // Primary key: numero_ordine_codice_prodotto
        numero_ordine: row[0] || '',
        data_ordine: this.parseDate(row[1]),
        cliente: row[2] || '',
        indirizzo_consegna: row[3] || '',
        partita_iva: row[4] || '',          // FIXED: piva -> partita_iva
        data_consegna: this.parseDate(row[5]),
        codice_prodotto: row[6] || '',
        prodotto: row[7] || '',
        quantita: this.parseNumber(row[8]),
        prezzo_unitario: this.parseNumber(row[9]),
        sconto_merce: this.parseNumber(row[10]),
        sconto_percentuale: this.parseNumber(row[11]),
        importo: this.parseNumber(row[12])
        // Note: created_at and updated_at are handled automatically by the database
      };
      
      records.push(record);
    });
    
    console.log(`📝 Convertiti ${records.length} record per Supabase`);
    return records;
  },
  
  /**
   * Parsing sicuro delle date
   */
  parseDate: function(dateStr) {
    if (!dateStr || dateStr === '') return null;
    
    // Se è già in formato ISO, ritorna così
    if (dateStr.includes('T')) return dateStr;
    
    // Prova a parsare diversi formati di data
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
      /(\d{1,2})-(\d{1,2})-(\d{4})/    // DD-MM-YYYY
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        try {
          if (format === formats[1]) {
            // YYYY-MM-DD
            return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
          } else {
            // DD/MM/YYYY o DD-MM-YYYY
            return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
          }
        } catch (e) {
          console.warn('Errore parsing data:', dateStr, e);
        }
      }
    }
    
    console.warn('Formato data non riconosciuto:', dateStr);
    return null;
  },
  
  /**
   * Parsing sicuro dei numeri
   */
  parseNumber: function(value) {
    if (!value || value === '') return 0;
    
    // Converti da formato italiano (virgola decimale) a inglese (punto decimale)
    const cleanValue = String(value).replace(',', '.');
    const parsed = parseFloat(cleanValue);
    
    return isNaN(parsed) ? 0 : parsed;
  },
  
  /**
   * Sincronizza i record con Supabase in batch
   */
  syncToSupabase: async function(records, progressModal) {
    const batchSize = 100;
    const totalBatches = Math.ceil(records.length / batchSize);
    let processedRecords = 0;
    let insertedRecords = 0;
    let updatedRecords = 0;
    let errors = [];
    
    console.log(`📦 Sincronizzazione in ${totalBatches} batch di ${batchSize} record`);
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = records.slice(i * batchSize, (i + 1) * batchSize);
      
      // Aggiorna progress
      this.updateProgress(progressModal, i + 1, totalBatches, processedRecords, records.length);
      
      try {
        // Per ogni record nel batch, verifica se esiste già
        for (const record of batch) {
          try {
            // Controlla se esiste già
            const { data: existing, error: checkError } = await window.supabaseClient
              .from('archivio_ordini_venduto')
              .select('id')
              .eq('id', record.id)
              .limit(1);
            
            if (checkError) {
              throw checkError;
            }
            
            if (existing && existing.length > 0) {
              // Record esiste, aggiorna (escludi id dall'update)
              const { id, ...updateData } = record;
              const { error: updateError } = await window.supabaseClient
                .from('archivio_ordini_venduto')
                .update(updateData)
                .eq('id', record.id);
              
              if (updateError) {
                throw updateError;
              }
              
              updatedRecords++;
            } else {
              // Record non esiste, inserisci
              const { error: insertError } = await window.supabaseClient
                .from('archivio_ordini_venduto')
                .insert([record]);
              
              if (insertError) {
                throw insertError;
              }
              
              insertedRecords++;
            }
            
            processedRecords++;
            
          } catch (recordError) {
            console.error('Errore su record:', record.id, recordError);
            errors.push({
              record: record.id,
              error: recordError.message
            });
          }
        }
        
        // Pausa breve tra i batch per non sovraccaricare
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (batchError) {
        console.error(`Errore nel batch ${i + 1}:`, batchError);
        errors.push({
          batch: i + 1,
          error: batchError.message
        });
      }
    }
    
    return {
      totalRecords: records.length,
      processedRecords: processedRecords,
      insertedRecords: insertedRecords,
      updatedRecords: updatedRecords,
      errors: errors
    };
  },
  
  /**
   * Mostra modal di progress
   */
  showProgressModal: function() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'display: block; position: fixed; z-index: 2000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = 'background-color: #fefefe; margin: 20% auto; padding: 20px; border: 1px solid #888; width: 400px; border-radius: 8px; text-align: center;';
    
    modalContent.innerHTML = `
      <h3>📤 Sincronizzazione in corso...</h3>
      <div style="margin: 20px 0;">
        <div style="background-color: #f0f0f0; border-radius: 10px; height: 20px; margin: 10px 0;">
          <div id="syncProgressBar" style="background-color: #28a745; height: 100%; border-radius: 10px; width: 0%; transition: width 0.3s;"></div>
        </div>
        <div id="syncProgressText">Preparazione...</div>
        <div id="syncProgressDetails" style="margin-top: 10px; font-size: 0.9em; color: #666;"></div>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    return modal;
  },
  
  /**
   * Aggiorna il progress della sincronizzazione
   */
  updateProgress: function(modal, currentBatch, totalBatches, processedRecords, totalRecords) {
    const progressBar = modal.querySelector('#syncProgressBar');
    const progressText = modal.querySelector('#syncProgressText');
    const progressDetails = modal.querySelector('#syncProgressDetails');
    
    const batchProgress = (currentBatch / totalBatches) * 100;
    const recordProgress = (processedRecords / totalRecords) * 100;
    
    if (progressBar) {
      progressBar.style.width = `${batchProgress}%`;
    }
    
    if (progressText) {
      progressText.textContent = `Batch ${currentBatch} di ${totalBatches}`;
    }
    
    if (progressDetails) {
      progressDetails.textContent = `Record processati: ${processedRecords} / ${totalRecords} (${recordProgress.toFixed(1)}%)`;
    }
  },
  
  /**
   * Mostra i risultati della sincronizzazione
   */
  showSyncResults: function(result) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'display: block; position: fixed; z-index: 1001; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = 'background-color: #fefefe; margin: 10% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 600px; border-radius: 8px;';
    
    const hasErrors = result.errors.length > 0;
    const successClass = hasErrors ? '#ffc107' : '#28a745';
    const successIcon = hasErrors ? '⚠️' : '✅';
    
    modalContent.innerHTML = `
      <h3 style="color: ${successClass};">${successIcon} Sincronizzazione Completata</h3>
      
      <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        <h4 style="margin-top: 0;">Riepilogo:</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <div><strong>Record totali:</strong> ${result.totalRecords}</div>
          <div><strong>Record processati:</strong> ${result.processedRecords}</div>
          <div><strong>Nuovi inserimenti:</strong> ${result.insertedRecords}</div>
          <div><strong>Aggiornamenti:</strong> ${result.updatedRecords}</div>
          <div><strong>Errori:</strong> ${result.errors.length}</div>
          <div><strong>Successo:</strong> ${((result.processedRecords / result.totalRecords) * 100).toFixed(1)}%</div>
        </div>
      </div>
      
      ${result.errors.length > 0 ? `
        <div style="margin: 20px 0;">
          <h4 style="color: #dc3545;">Errori riscontrati:</h4>
          <div style="max-height: 200px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 5px; padding: 10px; background-color: #fff;">
            ${result.errors.map(err => `
              <div style="margin: 5px 0; padding: 5px; background-color: #f8d7da; border-radius: 3px; font-size: 0.9em;">
                <strong>${err.record || 'Batch ' + err.batch}:</strong> ${err.error}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <div style="margin-top: 20px; text-align: center;">
        <button class="btn btn-primary" onclick="this.closest('.modal').remove()">OK</button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Log dettagliato
    console.log('📊 === RISULTATI SINCRONIZZAZIONE SUPABASE ===');
    console.log(`Record totali: ${result.totalRecords}`);
    console.log(`Record processati: ${result.processedRecords}`);
    console.log(`Nuovi inserimenti: ${result.insertedRecords}`);
    console.log(`Aggiornamenti: ${result.updatedRecords}`);
    console.log(`Errori: ${result.errors.length}`);
    if (result.errors.length > 0) {
      console.log('Dettaglio errori:', result.errors);
    }
    console.log('=============================================');
  }
};