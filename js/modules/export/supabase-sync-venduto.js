/**
 * Supabase Sync per file ORDINI
 * Sincronizza i dati degli ordini con Supabase per analisi AI
 */

(function() {
  'use strict';

  class SupabaseSyncVenduto {
    constructor() {
      this.tableName = 'archivio_ordini_venduto';
      this.isEnabled = this.checkSupabaseConfig();
      this.batchSize = 100; // Inserimenti a batch per prestazioni
    }

    /**
     * Verifica se Supabase è configurato
     */
    checkSupabaseConfig() {
      return window.supabase && 
             window.SUPABASE_CONFIG && 
             window.SUPABASE_CONFIG.enableSync;
    }

    /**
     * Crea la tabella se non esiste
     */
    async createTableIfNotExists() {
      if (!this.isEnabled) return false;

      try {
        // Prima verifica se la tabella esiste già
        const { data, error } = await window.supabase
          .from(this.tableName)
          .select('id')
          .limit(1);

        if (!error) {
          console.log('✅ Tabella archivio_ordini_venduto già esistente');
          return true;
        }

        // Se arriviamo qui, la tabella non esiste, ma non possiamo crearla via JS
        console.warn('⚠️ Tabella archivio_ordini_venduto non esiste. Crearla manualmente in Supabase.');
        return false;
      } catch (err) {
        console.error('❌ Errore verifica tabella:', err);
        return false;
      }
    }

    /**
     * Converte i dati dal formato Excel al formato Supabase
     */
    /**
     * Parser numeri italiani robusto - gestisce formato "1.234,56"
     * Compatibile con numeri già convertiti
     * 
     * Test cases:
     * parseItalianNumber("1.234,56") -> 1234.56
     * parseItalianNumber("1234,56") -> 1234.56  
     * parseItalianNumber("1234.56") -> 1234.56
     * parseItalianNumber("1.234") -> 1234
     * parseItalianNumber(1234.56) -> 1234.56
     */
    parseItalianNumber(value) {
      // Se è già un numero, restituiscilo così com'è
      if (typeof value === 'number' && !isNaN(value)) {
        return value;
      }
      
      // Se è null, undefined o stringa vuota
      if (value === null || value === undefined || value === '') {
        return 0;
      }
      
      // Converti in stringa per elaborazione
      const stringValue = value.toString().trim();
      
      // Se è stringa vuota dopo trim
      if (stringValue === '') {
        return 0;
      }
      
      // Se è un numero normale (formato inglese) con solo punto decimale
      if (/^\d+\.?\d*$/.test(stringValue)) {
        const parsed = parseFloat(stringValue);
        return isNaN(parsed) ? 0 : parsed;
      }
      
      // Caso speciale: "1.234" senza virgola - trattalo come separatore migliaia se ha 3 cifre dopo il punto
      if (/^\d{1,3}\.\d{3}$/.test(stringValue)) {
        // Es: "1.234" -> rimuovi punto -> "1234"
        const withoutThousands = stringValue.replace('.', '');
        const parsed = parseFloat(withoutThousands);
        return isNaN(parsed) ? 0 : parsed;
      }
      
      // Se è formato italiano "1.234,56" o "1234,56"
      if (stringValue.includes(',')) {
        // Rimuovi tutti i punti (separatori migliaia) e sostituisci virgola con punto
        const normalized = stringValue
          .replace(/\./g, '')  // Rimuovi separatori migliaia
          .replace(/,/g, '.'); // Converti virgola decimale in punto
        
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
      }
      
      // Se contiene solo punti (potrebbe essere separatore migliaia senza decimali)
      if (stringValue.includes('.') && !stringValue.includes(',')) {
        // Se ha più di un punto, trattali come separatori migliaia
        const parts = stringValue.split('.');
        if (parts.length > 2) {
          // Rimuovi tutti i punti tranne l'ultimo (che diventa decimale)
          const withoutThousands = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
          const parsed = parseFloat(withoutThousands);
          return isNaN(parsed) ? 0 : parsed;
        }
      }
      
      // Tentativo finale con parseFloat standard
      const parsed = parseFloat(stringValue);
      return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Test del parser numeri italiani - chiamabile da console
     * Uso: window.supabaseSync.testNumberParser()
     */
    testNumberParser() {
      const testCases = [
        { input: "1.234,56", expected: 1234.56 },
        { input: "1234,56", expected: 1234.56 },
        { input: "1234.56", expected: 1234.56 },
        { input: "1.234", expected: 1234 },
        { input: 1234.56, expected: 1234.56 },
        { input: "0", expected: 0 },
        { input: "", expected: 0 },
        { input: null, expected: 0 },
        { input: "12.345.678,90", expected: 12345678.90 },
        { input: "5,00", expected: 5.00 }
      ];

      console.log('🧪 TEST PARSER NUMERI ITALIANI:');
      let allPassed = true;

      testCases.forEach((test, i) => {
        const result = this.parseItalianNumber(test.input);
        const passed = Math.abs(result - test.expected) < 0.01; // Tolleranza float
        
        console.log(`${passed ? '✅' : '❌'} Test ${i + 1}: "${test.input}" -> ${result} (atteso: ${test.expected})`);
        
        if (!passed) allPassed = false;
      });

      console.log(allPassed ? '🎉 TUTTI I TEST PASSATI!' : '⚠️ ALCUNI TEST FALLITI');
      return allPassed;
    }

    formatDataForSupabase(vendutoData) {
      return vendutoData.map((row, index) => {
        // Genera un ID univoco basato su ordine + prodotto
        const uniqueId = `${row['N° Ordine']}_${row['Codice Prodotto']}`;
        
        // Log per debug conversione numeri (solo primi 3 record per non spammare)
        if (index < 3) {
          console.log(`🔢 Conversione numeri riga ${index + 1}:`, {
            quantita_originale: row['Quantità'],
            quantita_convertita: this.parseItalianNumber(row['Quantità']),
            prezzo_originale: row['Prezzo Unitario'],
            prezzo_convertito: this.parseItalianNumber(row['Prezzo Unitario']),
            importo_originale: row['Importo'],
            importo_convertito: this.parseItalianNumber(row['Importo'])
          });
        }
        
        return {
          id: uniqueId,
          numero_ordine: row['N° Ordine']?.toString() || '',
          data_ordine: this.parseDate(row['Data Ordine']),
          cliente: row['Cliente']?.toString() || '',
          indirizzo_consegna: row['Indirizzo Consegna']?.toString() || '',
          partita_iva: row['P.IVA']?.toString() || '',
          data_consegna: this.parseDate(row['Data Consegna']),
          codice_prodotto: row['Codice Prodotto']?.toString() || '',
          prodotto: row['Prodotto']?.toString() || '',
          quantita: this.parseItalianNumber(row['Quantità']),
          prezzo_unitario: this.parseItalianNumber(row['Prezzo Unitario']),
          sconto_merce: this.parseItalianNumber(row['S.M.']),
          sconto_percentuale: this.parseItalianNumber(row['Sconto %']),
          importo: this.parseItalianNumber(row['Importo']),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }).filter(row => row.numero_ordine && row.codice_prodotto); // Filtra righe incomplete
    }

    /**
     * Parse date da formato Excel a formato italiano DD/MM/YYYY
     */
    parseDate(dateValue) {
      if (!dateValue) return null;
      
      try {
        // Se è già una data
        if (dateValue instanceof Date) {
          return dateValue.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
        
        // Se è un numero Excel (giorni dal 1900)
        if (typeof dateValue === 'number') {
          const excelEpoch = new Date(1900, 0, 1);
          const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
          return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
        
        // Se è una stringa in formato DD/MM/YYYY italiano, mantienila così
        if (typeof dateValue === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
          return dateValue;
        }
        
        // Se è una stringa in formato ISO YYYY-MM-DD, convertila
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          const parts = dateValue.split('-');
          const year = parts[0];
          const month = parts[1];
          const day = parts[2];
          return `${day}/${month}/${year}`;
        }
        
        // Se è una stringa, prova a parsarla e convertila in formato italiano
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
        
        return null;
      } catch (err) {
        console.warn('⚠️ Errore parsing data:', dateValue, err);
        return null;
      }
    }

    /**
     * Sincronizza i dati con Supabase
     */
    async syncToSupabase(vendutoData, options = {}) {
      if (!this.isEnabled) {
        console.log('⚠️ Sync Supabase disabilitato o non configurato');
        return { success: false, reason: 'disabled' };
      }

      try {
        console.log('🔄 Inizio sincronizzazione Supabase...');
        
        // Verifica/crea tabella
        const tableExists = await this.createTableIfNotExists();
        if (!tableExists) {
          return { success: false, reason: 'table_missing' };
        }

        // Formatta i dati
        const formattedData = this.formatDataForSupabase(vendutoData);
        console.log(`📊 Preparati ${formattedData.length} record per Supabase`);

        if (formattedData.length === 0) {
          return { success: true, inserted: 0, updated: 0 };
        }

        // Gestisci upload a batch
        let totalInserted = 0;
        let totalUpdated = 0;
        let totalErrors = 0;

        for (let i = 0; i < formattedData.length; i += this.batchSize) {
          const batch = formattedData.slice(i, i + this.batchSize);
          const batchResult = await this.uploadBatch(batch, options);
          
          totalInserted += batchResult.inserted;
          totalUpdated += batchResult.updated;
          totalErrors += batchResult.errors;
          
          // Progress callback se fornito
          if (options.onProgress) {
            const progress = Math.min(100, Math.round((i + batch.length) / formattedData.length * 100));
            options.onProgress(progress, {
              current: i + batch.length,
              total: formattedData.length,
              inserted: totalInserted,
              updated: totalUpdated,
              errors: totalErrors
            });
          }
        }

        console.log(`✅ Sync completata: ${totalInserted} inseriti, ${totalUpdated} aggiornati, ${totalErrors} errori`);
        
        return {
          success: true,
          inserted: totalInserted,
          updated: totalUpdated,
          errors: totalErrors,
          total: formattedData.length
        };

      } catch (error) {
        console.error('❌ Errore sincronizzazione Supabase:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Upload di un batch di dati
     */
    async uploadBatch(batch, options = {}) {
      const mode = options.mode || 'upsert'; // 'insert', 'update', 'upsert'
      
      try {
        let result;
        
        if (mode === 'upsert') {
          // Upsert: inserisce se non esiste, aggiorna se esiste
          result = await window.supabase
            .from(this.tableName)
            .upsert(batch, { 
              onConflict: 'id',
              returning: 'minimal' 
            });
        } else if (mode === 'insert') {
          // Solo inserimento (ignora se esistono)
          result = await window.supabase
            .from(this.tableName)
            .insert(batch, { 
              returning: 'minimal',
              ignoreDuplicates: true 
            });
        } else {
          // Solo aggiornamento
          result = await window.supabase
            .from(this.tableName)
            .update(batch)
            .eq('id', batch.map(b => b.id));
        }

        if (result.error) {
          console.error('❌ Errore batch:', result.error);
          return { inserted: 0, updated: 0, errors: batch.length };
        }

        return { 
          inserted: mode === 'insert' ? batch.length : 0,
          updated: mode === 'update' ? batch.length : batch.length,
          errors: 0 
        };

      } catch (error) {
        console.error('❌ Errore upload batch:', error);
        return { inserted: 0, updated: 0, errors: batch.length };
      }
    }

    /**
     * Ottieni statistiche da Supabase per l'AI
     */
    async getStats() {
      if (!this.isEnabled) return null;

      try {
        const { data, error } = await window.supabase
          .from(this.tableName)
          .select('numero_ordine, data_ordine, cliente, importo', { count: 'exact' });

        if (error) {
          console.error('❌ Errore statistiche:', error);
          return null;
        }

        // Calcola statistiche
        const totalRecords = data.length;
        const totalImporto = data.reduce((sum, row) => sum + this.parseItalianNumber(row.importo), 0);
        const uniqueOrders = new Set(data.map(row => row.numero_ordine)).size;
        const uniqueClients = new Set(data.map(row => row.cliente)).size;

        // Periodo dati
        const dates = data.map(row => row.data_ordine).filter(d => d).sort();
        const firstDate = dates[0];
        const lastDate = dates[dates.length - 1];

        return {
          totalRecords,
          totalImporto: totalImporto.toFixed(2),
          uniqueOrders,
          uniqueClients,
          firstDate,
          lastDate,
          lastUpdate: new Date().toISOString()
        };

      } catch (error) {
        console.error('❌ Errore statistiche:', error);
        return null;
      }
    }

    /**
     * Sincronizza dati dal localStorage (file importato) direttamente a Supabase
     */
    async syncFromLocalStorage() {
      if (!this.isEnabled) {
        console.log('⚠️ Sync Supabase disabilitato o non configurato');
        return { success: false, reason: 'disabled' };
      }

      try {
        // Carica dati dal localStorage
        const savedData = localStorage.getItem('ordiniFileData');
        if (!savedData) {
          console.log('⚠️ Nessun dato ORDINI trovato nel localStorage');
          return { success: false, reason: 'no_data' };
        }

        const vendutoDataArray = JSON.parse(savedData);
        console.log(`📊 Trovati ${vendutoDataArray.length} record nel localStorage`);

        // Converte da formato array a formato oggetto
        const vendutoDataObjects = this.convertArrayToObjects(vendutoDataArray);
        
        // Sincronizza con Supabase
        return await this.syncToSupabase(vendutoDataObjects, {
          mode: 'upsert',
          onProgress: (progress, stats) => {
            console.log(`📊 Sync localStorage progress: ${progress}% - ${stats.current}/${stats.total}`);
          }
        });

      } catch (error) {
        console.error('❌ Errore sync da localStorage:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * Converte dati da formato array (localStorage) a formato oggetto
     */
    convertArrayToObjects(arrayData) {
      return arrayData.map(row => ({
        'N° Ordine': row[0] || '',
        'Data Ordine': row[1] || '',
        'Cliente': row[2] || '',
        'Indirizzo Consegna': row[3] || '',
        'P.IVA': row[4] || '',
        'Data Consegna': row[5] || '',
        'Codice Prodotto': row[6] || '',
        'Prodotto': row[7] || '',
        'Quantità': row[8] || 0,
        'Prezzo Unitario': row[9] || 0,
        'S.M.': row[10] || 0,
        'Sconto %': row[11] || 0,
        'Importo': row[12] || 0
      }));
    }

    /**
     * Pulisce dati vecchi (se necessario)
     */
    async cleanOldData(daysOld = 365) {
      if (!this.isEnabled) return false;

      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const { error } = await window.supabase
          .from(this.tableName)
          .delete()
          .lt('data_ordine', cutoffDate.toISOString().split('T')[0]);

        if (error) {
          console.error('❌ Errore pulizia dati:', error);
          return false;
        }

        console.log(`✅ Puliti dati più vecchi di ${daysOld} giorni`);
        return true;

      } catch (error) {
        console.error('❌ Errore pulizia:', error);
        return false;
      }
    }
  }

  // Esponi la classe globalmente
  window.SupabaseSyncVenduto = SupabaseSyncVenduto;

  console.log('✅ SupabaseSyncVenduto caricato');

})();

// Crea istanza globale FUORI dall'IIFE per testing e uso immediato
window.supabaseSync = new window.SupabaseSyncVenduto();
console.log('🧪 Test numeri italiani: window.supabaseSync.testNumberParser()');