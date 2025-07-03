/**
 * Modulo Gestione Percorsi - Import Functions
 * Gestione importazione file Excel e testo
 */

// Estende l'oggetto Percorsi con le funzioni di importazione
Object.assign(Percorsi, {
  /**
   * Gestione upload file Excel
   */
  handleFileUpload: function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Reset del file input per permettere di ricaricare lo stesso file
    event.target.value = '';

    // Controlla l'estensione del file
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.txt') || fileName.endsWith('.tsv')) {
      // File di testo con tab
      this.handleTextFileUpload(file);
    } else {
      // File Excel normale
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Prendi il primo foglio
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          // Processa i dati
          this.processExcelData(jsonData);
          
          // Non serve notifica qui perché viene già mostrata in processExcelData
        } catch (error) {
          console.error('Errore durante l\'importazione:', error);
          Utils.notify('Errore durante l\'importazione del file', 'error');
        }
      };
      
      reader.readAsArrayBuffer(file);
    }
  },

  /**
   * Gestione file di testo con TAB
   */
  handleTextFileUpload: function(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Intestazioni del nuovo formato
        const headers = ['PARTENZA', 'ARRIVO', 'MINUTI', 'CHILOMETRI', 'ChiaveUnivoca', 'Cordinate_Gps_Partenza', 'Cordinate_Gps_Arrivo'];
        
        const jsonData = [];
        // Salta la prima riga se è un'intestazione
        const startIndex = lines[0].includes('PARTENZA') ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const values = lines[i].split('\t');
          if (values.length >= 5) { // Almeno 5 colonne
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            jsonData.push(row);
          }
        }
        
        console.log('Dati parsati dal file di testo:', jsonData);
        this.processExcelData(jsonData);
      } catch (error) {
        console.error('Errore durante l\'importazione:', error);
        Utils.notify('Errore durante l\'importazione del file', 'error');
      }
    };
    
    reader.readAsText(file);
  },

  /**
   * Processa dati Excel
   */
  processExcelData: function(data) {
    // Assicurati che lo stato sia caricato dal localStorage
    this.loadPercorsiFromStorage();
    
    // Ottieni la data selezionata dall'input
    const importDateInput = document.getElementById('importDate');
    const selectedDate = importDateInput ? importDateInput.value : new Date().toISOString().split('T')[0];
    
    console.log('=== INIZIO PROCESSAMENTO DATI ===');
    console.log('Numero di righe ricevute:', data.length);
    console.log('Percorsi esistenti prima dell\'import:', this.state.percorsi.length);
    if (data.length > 0) {
      console.log('Prima riga completa:', data[0]);
      console.log('🔍 TUTTE LE CHIAVI DISPONIBILI:', Object.keys(data[0]));
      console.log('🔍 VERIFICA TUTTI I CAMPI DALLA PRIMA RIGA:');
      Object.keys(data[0]).forEach(key => {
        console.log(`- "${key}": "${data[0][key]}"`);
      });
    }
    
    const processedData = data.filter((row, index) => {
      // Filtra righe vuote o incomplete - NUOVO FORMATO
      const partenza = row['PARTENZA'] || row['idOrigine'] || row['Partenza'] || row['partenza'] || '';
      const arrivo = row['ARRIVO'] || row['idDestinazione'] || row['Arrivo'] || row['arrivo'] || '';
      
      // Controlla che non sia una riga completamente vuota
      const hasData = Object.values(row).some(value => 
        value !== null && value !== undefined && String(value).trim() !== ''
      );
      
      const isValid = hasData && partenza.trim() !== '' && arrivo.trim() !== '';
      
      if (!isValid && index < 10) {
        console.log(`🗑️ Riga ${index} filtrata (vuota): partenza="${partenza}" arrivo="${arrivo}" hasData=${hasData}`);
      }
      
      return isValid;
    }).map((row, index) => {
      // Mapping AGGIORNATO per il nuovo formato file
      const partenza = row['PARTENZA'] || row['idOrigine'] || '';
      const arrivo = row['ARRIVO'] || row['idDestinazione'] || '';
      const minuti = parseInt(row['MINUTI'] || row['tempoMinuti'] || 0);
      const chilometri = parseFloat(row['CHILOMETRI'] || row['distanzaKm'] || 0);
      const chiaveUnivoca = row['ChiaveUnivoca'] || '';
      const coordPartenza = row['Cordinate_Gps_Partenza'] || row['Longitudine-Latitudine-Partenza'] || '';
      const coordArrivo = row['Cordinate_Gps_Arrivo'] || row['Longitudine-Latitudine-Arrivo'] || '';
      
      // Log dettagliato per le prime 3 righe
      if (index < 3) {
        console.log(`🔍 RIGA ${index} DETTAGLIATA:`);
        console.log(`  - idOrigine: "${row['idOrigine']}"`);
        console.log(`  - idDestinazione: "${row['idDestinazione']}"`);
        console.log(`  - tempoMinuti: "${row['tempoMinuti']}"`);
        console.log(`  - distanzaKm: "${row['distanzaKm']}"`);
        console.log(`  - ChiaveUnivoca: "${row['ChiaveUnivoca']}"`);
        console.log(`  - Longitudine-Latitudine-Partenza: "${row['Longitudine-Latitudine-Partenza']}"`);
        console.log(`  - Longitudine-Latitudine-Arrivo: "${row['Longitudine-Latitudine-Arrivo']}"`);
      }
      
      console.log(`🔍 Riga ${index}: ${partenza} → ${arrivo} | Minuti: ${minuti} | Km: ${chilometri} | ChiaveUnivoca: "${chiaveUnivoca}" | Coord: "${coordPartenza}" → "${coordArrivo}"`);
      
      // Calcola durata in formato HH:MM
      const ore = Math.floor(minuti / 60);
      const minutiRest = minuti % 60;
      const durata = `${ore}:${minutiRest.toString().padStart(2, '0')}`;
      
      // La chiave univoca è la fusione di partenza+arrivo (es: CONTEAALFIERIMATTINO)
      // Verifica se la chiave corrisponde alla concatenazione di partenza+arrivo
      const generatedKey = (partenza + arrivo).replace(/[\s\-\.\,]/g, '').toUpperCase();
      
      // Log per debug (opzionale)
      if (chiaveUnivoca && chiaveUnivoca !== generatedKey) {
        console.log(`Chiave diversa: file="${chiaveUnivoca}" vs generata="${generatedKey}"`);
      }
      
      return {
        id: Utils.generateId('PRC'),
        data: selectedDate,
        partenza: partenza,
        arrivo: arrivo,
        km: chilometri,
        minuti: minuti,
        durata: durata,
        chiaveUnivoca: chiaveUnivoca,
        coordPartenza: coordPartenza,
        coordArrivo: coordArrivo,
        importedAt: new Date().toISOString()
      };
    });

    console.log('=== DATI PROCESSATI ===');
    console.log('Numero di percorsi processati:', processedData.length);
    console.log('Percorsi processati:', processedData);
    
    // Chiedi all'utente se vuole sostituire o aggiungere
    if (this.state.percorsi.length > 0) {
      if (confirm('Vuoi sostituire i percorsi esistenti? (OK = Sostituisci, Annulla = Aggiungi)')) {
        this.state.percorsi = processedData;
      } else {
        // Evita duplicati controllando la chiave univoca
        processedData.forEach(newPercorso => {
          const exists = this.state.percorsi.some(p => 
            p.chiaveUnivoca === newPercorso.chiaveUnivoca ||
            (p.partenza === newPercorso.partenza && p.arrivo === newPercorso.arrivo)
          );
          if (!exists) {
            this.state.percorsi.push(newPercorso);
          }
        });
      }
    } else {
      this.state.percorsi = processedData;
    }
    
    this.state.filteredPercorsi = [...this.state.percorsi];
    
    console.log('Stato finale percorsi:', this.state.percorsi);
    console.log('Numero totale percorsi:', this.state.percorsi.length);
    
    // Salva locale e su Supabase
    this.savePercorsiToStorage();
    this.syncPercorsiToSupabase(processedData);
    
    // Aggiorna immediatamente la visualizzazione
    this.updateTable();
    this.updateStats();
    
    // Notifica successo
    const message = this.state.percorsi.length === processedData.length 
      ? `${processedData.length} percorsi importati con successo`
      : `${processedData.length} percorsi elaborati, ${this.state.percorsi.length} totali nel database`;
    Utils.notify(message, 'success');
  },

  /**
   * Parse data Excel
   */
  parseExcelDate: function(excelDate) {
    if (!excelDate) return new Date().toISOString().split('T')[0];
    
    // Se è già una stringa di data
    if (typeof excelDate === 'string') {
      return excelDate;
    }
    
    // Se è un numero Excel (giorni dal 1900)
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Esporta percorsi
   */
  exportPercorsi: function() {
    if (this.state.percorsi.length === 0) {
      Utils.notify('Nessun percorso da esportare', 'warning');
      return;
    }

    // Prepara i dati per l'export
    const exportData = this.state.percorsi.map(p => ({
      'Data': p.data,
      'Partenza': p.partenza,
      'Arrivo': p.arrivo,
      'Km': p.km,
      'Minuti': p.minuti,
      'Durata': p.durata
    }));

    // Crea il workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Aggiungi il foglio al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Percorsi');
    
    // Genera il file
    const fileName = `percorsi_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    Utils.notify(`${this.state.percorsi.length} percorsi esportati`, 'success');
  },

  /**
   * Sincronizza percorsi con Supabase
   */
  syncPercorsiToSupabase: async function(percorsi) {
    if (!window.supabase) {
      console.log('🔧 Supabase non disponibile, salvo solo in locale');
      return;
    }

    try {
      console.log('🔄 Sincronizzando', percorsi.length, 'percorsi con Supabase...');
      
      // Converte i dati nel formato Supabase
      const supabaseData = percorsi.map(p => ({
        data: p.data,
        partenza: p.partenza,
        arrivo: p.arrivo,
        km: p.km,
        minuti: p.minuti,
        durata: p.durata,
        chiave_univoca: p.chiaveUnivoca,
        coord_partenza: p.coordPartenza,
        coord_arrivo: p.coordArrivo,
        imported_at: p.importedAt
      }));

      // Prima cancella i percorsi esistenti per questa data se richiesto
      const confirmReplace = confirm('Vuoi sostituire i percorsi esistenti su Supabase per questa data?');
      
      if (confirmReplace && percorsi.length > 0) {
        const firstDate = percorsi[0].data;
        const { error: deleteError } = await window.supabase
          .from('percorsi')
          .delete()
          .eq('data', firstDate);
        
        if (deleteError) {
          console.error('Errore cancellazione percorsi esistenti:', deleteError);
        } else {
          console.log('✅ Percorsi esistenti cancellati per data:', firstDate);
        }
      }

      // Inserisce i nuovi percorsi uno alla volta per gestire conflitti
      console.log('🔄 Inserimento percorsi in Supabase...');
      let insertedCount = 0;
      let errorCount = 0;
      
      for (const percorso of supabaseData) {
        try {
          const { data, error } = await window.supabase
            .from('percorsi')
            .insert([percorso]);
          
          if (error) {
            if (error.code === '23505') { // Unique constraint violation
              console.log(`⚠️ Percorso già esistente saltato: ${percorso.partenza} → ${percorso.arrivo}`);
            } else {
              console.error(`❌ Errore inserimento ${percorso.partenza} → ${percorso.arrivo}:`, error);
              errorCount++;
            }
          } else {
            insertedCount++;
          }
        } catch (e) {
          console.error(`❌ Errore generale inserimento:`, e);
          errorCount++;
        }
      }

      // Mostra risultato finale
      if (insertedCount > 0 || errorCount === 0) {
        console.log(`✅ Sincronizzazione completata: ${insertedCount} inseriti, ${errorCount} errori`);
        Utils.notify(`${insertedCount} percorsi sincronizzati con Supabase${errorCount > 0 ? ` (${errorCount} errori)` : ''}`, insertedCount > 0 ? 'success' : 'warning');
      } else {
        console.error('❌ Errore sincronizzazione Supabase');
        Utils.notify('Errore sincronizzazione con Supabase', 'error');
      }
    } catch (error) {
      console.error('❌ Errore generale sincronizzazione:', error);
      Utils.notify('Errore durante la sincronizzazione', 'error');
    }
  }
});