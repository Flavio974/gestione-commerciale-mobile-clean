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
      
      // STEP 3: Configurazione mappatura colonne flessibile
      this.defaultColumnMapping = {
        'numero_ordine': ['N° Ordine', 'Numero Ordine', 'Ordine', 'NumOrdine'],
        'data_ordine': ['Data Ordine', 'DataOrdine', 'Data'],
        'cliente': ['Cliente', 'Ragione Sociale', 'Denominazione'],
        'indirizzo_consegna': ['Indirizzo Consegna', 'Indirizzo', 'Consegna'],
        'partita_iva': ['P.IVA', 'Partita IVA', 'PartitaIVA', 'P IVA'],
        'data_consegna': ['Data Consegna', 'DataConsegna', 'Consegna'],
        'codice_prodotto': ['Codice Prodotto', 'Codice', 'Cod Prodotto', 'CodProdotto'],
        'prodotto': ['Prodotto', 'Descrizione Prodotto', 'Descrizione', 'Articolo'],
        'quantita': ['Quantità', 'Qty', 'Q.tà', 'Qta'],
        'prezzo_unitario': ['Prezzo Unitario', 'Prezzo', 'Prezzo Unit.', 'P.Unit'],
        'sconto_merce': ['S.M.', 'Sconto Merce', 'ScontoMerce'],
        'sconto_percentuale': ['Sconto %', 'Sconto', 'Sc %', 'Perc Sconto'],
        'importo': ['Importo', 'Totale', 'Tot.', 'Valore']
      };
      
      this.currentMapping = null; // Sarà impostato automaticamente
      
      // STEP 4: Sistema di logging dettagliato
      this.errorLog = [];
      this.warningLog = [];
      this.debugMode = false;
      this.logToConsole = true;
      this.logToStorage = true;
    }

    /**
     * STEP 4: Sistema di logging dettagliato
     */
    logError(context, message, data = null) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        context: context,
        message: message,
        data: data,
        stack: new Error().stack
      };
      
      this.errorLog.push(logEntry);
      
      if (this.logToConsole) {
        console.error(`❌ [${context}] ${message}`, data || '');
      }
      
      if (this.logToStorage) {
        this.saveLogToStorage();
      }
      
      return logEntry;
    }

    logWarning(context, message, data = null) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'WARNING',
        context: context,
        message: message,
        data: data
      };
      
      this.warningLog.push(logEntry);
      
      if (this.logToConsole) {
        console.warn(`⚠️ [${context}] ${message}`, data || '');
      }
      
      if (this.logToStorage) {
        this.saveLogToStorage();
      }
      
      return logEntry;
    }

    logDebug(context, message, data = null) {
      if (!this.debugMode) return;
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        context: context,
        message: message,
        data: data
      };
      
      if (this.logToConsole) {
        console.log(`🐛 [${context}] ${message}`, data || '');
      }
      
      return logEntry;
    }

    logInfo(context, message, data = null) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        context: context,
        message: message,
        data: data
      };
      
      if (this.logToConsole) {
        console.log(`ℹ️ [${context}] ${message}`, data || '');
      }
      
      return logEntry;
    }

    saveLogToStorage() {
      try {
        const allLogs = {
          errors: this.errorLog,
          warnings: this.warningLog,
          lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('supabaseSync_logs', JSON.stringify(allLogs));
      } catch (error) {
        console.error('❌ Errore salvataggio log:', error);
      }
    }

    getLogReport() {
      const report = {
        summary: {
          totalErrors: this.errorLog.length,
          totalWarnings: this.warningLog.length,
          lastError: this.errorLog.length > 0 ? this.errorLog[this.errorLog.length - 1] : null,
          lastWarning: this.warningLog.length > 0 ? this.warningLog[this.warningLog.length - 1] : null
        },
        recentErrors: this.errorLog.slice(-10),
        recentWarnings: this.warningLog.slice(-10),
        errorsByContext: this.groupLogsByContext(this.errorLog),
        warningsByContext: this.groupLogsByContext(this.warningLog)
      };
      
      return report;
    }

    groupLogsByContext(logs) {
      return logs.reduce((groups, log) => {
        const context = log.context;
        if (!groups[context]) {
          groups[context] = [];
        }
        groups[context].push(log);
        return groups;
      }, {});
    }

    clearLogs() {
      this.errorLog = [];
      this.warningLog = [];
      localStorage.removeItem('supabaseSync_logs');
      this.logInfo('SYSTEM', 'Log puliti');
    }

    setDebugMode(enabled) {
      this.debugMode = enabled;
      this.logInfo('SYSTEM', `Debug mode ${enabled ? 'attivato' : 'disattivato'}`);
    }

    /**
     * STEP 4: Test sistema di logging
     */
    testLogging() {
      console.log('🧪 TEST SISTEMA LOGGING:');
      
      // Test diversi tipi di log
      this.logInfo('TEST', 'Questo è un messaggio informativo');
      this.logWarning('TEST', 'Questo è un warning di test', { testData: 'esempio' });
      this.logError('TEST', 'Questo è un errore di test', { errorCode: 'TEST_ERROR' });
      
      // Test debug (se abilitato)
      const debugWasEnabled = this.debugMode;
      this.setDebugMode(true);
      this.logDebug('TEST', 'Questo è un messaggio di debug');
      this.setDebugMode(debugWasEnabled);
      
      // Mostra report
      const report = this.getLogReport();
      console.log('\n📊 REPORT LOG:');
      console.log(`  Errori totali: ${report.summary.totalErrors}`);
      console.log(`  Warning totali: ${report.summary.totalWarnings}`);
      console.log(`  Contesti con errori: ${Object.keys(report.errorsByContext).join(', ')}`);
      console.log(`  Contesti con warning: ${Object.keys(report.warningsByContext).join(', ')}`);
      
      return report;
    }

    /**
     * STEP 3: Rileva automaticamente la mappatura colonne da un array di dati
     */
    detectColumnMapping(sampleData) {
      if (!sampleData || sampleData.length === 0) {
        this.logWarning('COLUMN_MAPPING', 'Nessun dato campione fornito per rilevamento colonne');
        return null;
      }

      const firstRow = sampleData[0];
      const availableColumns = Object.keys(firstRow);
      const detectedMapping = {};
      
      this.logInfo('COLUMN_MAPPING', 'Inizio rilevamento automatico mappatura colonne');
      this.logDebug('COLUMN_MAPPING', `Colonne disponibili: ${availableColumns.join(', ')}`);
      
      // Per ogni campo target, trova la colonna corrispondente
      Object.keys(this.defaultColumnMapping).forEach(targetField => {
        const possibleColumns = this.defaultColumnMapping[targetField];
        
        // Cerca corrispondenza esatta
        let matchedColumn = null;
        for (const possibleCol of possibleColumns) {
          if (availableColumns.includes(possibleCol)) {
            matchedColumn = possibleCol;
            break;
          }
        }
        
        // Se non trova corrispondenza esatta, cerca per similarità
        if (!matchedColumn) {
          for (const availableCol of availableColumns) {
            for (const possibleCol of possibleColumns) {
              // Confronto case-insensitive e senza spazi
              const cleanAvailable = availableCol.toLowerCase().replace(/[\s\.]/g, '');
              const cleanPossible = possibleCol.toLowerCase().replace(/[\s\.]/g, '');
              
              if (cleanAvailable.includes(cleanPossible) || cleanPossible.includes(cleanAvailable)) {
                matchedColumn = availableCol;
                break;
              }
            }
            if (matchedColumn) break;
          }
        }
        
        if (matchedColumn) {
          detectedMapping[targetField] = matchedColumn;
          this.logDebug('COLUMN_MAPPING', `${targetField} -> "${matchedColumn}"`);
        } else {
          this.logWarning('COLUMN_MAPPING', `Campo non mappato: ${targetField}`, { possibleColumns });
        }
      });
      
      // Statistiche di mappatura
      const mappedFields = Object.keys(detectedMapping).length;
      const totalFields = Object.keys(this.defaultColumnMapping).length;
      const mappingScore = Math.round((mappedFields / totalFields) * 100);
      
      const mappingResult = {
        mappedFields,
        totalFields,
        mappingScore,
        detectedMapping
      };
      
      this.logInfo('COLUMN_MAPPING', `Campi mappati: ${mappedFields}/${totalFields} (${mappingScore}%)`, mappingResult);
      
      if (mappingScore >= 80) {
        this.logInfo('COLUMN_MAPPING', 'Qualità mappatura: OTTIMA');
      } else if (mappingScore >= 60) {
        this.logWarning('COLUMN_MAPPING', 'Qualità mappatura: BUONA - alcuni campi mancanti');
      } else {
        this.logError('COLUMN_MAPPING', 'Qualità mappatura: SCARSA - verificare manualmente', mappingResult);
      }
      
      this.currentMapping = detectedMapping;
      return detectedMapping;
    }

    /**
     * STEP 3: Applica la mappatura colonne per ottenere il valore dal nome colonna originale
     */
    getMappedValue(row, targetField) {
      if (!this.currentMapping || !this.currentMapping[targetField]) {
        return null;
      }
      
      const sourceColumn = this.currentMapping[targetField];
      return row[sourceColumn];
    }

    /**
     * STEP 3: Test sistema mappatura colonne flessibile
     */
    testColumnMapping() {
      console.log('🧪 TEST SISTEMA MAPPATURA COLONNE:');
      
      // Test con dati in formato alternativo
      const testDataAlternative = [
        {
          'Ordine': '12345',
          'Data': '15/06/2025',
          'Ragione Sociale': 'Test Cliente SRL',
          'Indirizzo': 'Via Test 123',
          'Partita IVA': '12345678901',
          'Codice': 'ABC123',
          'Descrizione': 'Prodotto Test',
          'Qty': '10',
          'Prezzo': '5,50',
          'Totale': '55,00'
        }
      ];
      
      console.log('\nTestando rilevamento automatico con formato alternativo...');
      const mapping = this.detectColumnMapping(testDataAlternative);
      
      if (mapping) {
        console.log('\n🔍 Test estrazione valori:');
        const testRow = testDataAlternative[0];
        
        console.log(`  numero_ordine: "${this.getMappedValue(testRow, 'numero_ordine')}"`);
        console.log(`  cliente: "${this.getMappedValue(testRow, 'cliente')}"`);
        console.log(`  codice_prodotto: "${this.getMappedValue(testRow, 'codice_prodotto')}"`);
        console.log(`  quantita: "${this.getMappedValue(testRow, 'quantita')}"`);
        console.log(`  prezzo_unitario: "${this.getMappedValue(testRow, 'prezzo_unitario')}"`);
      }
      
      return {
        mapping: mapping,
        success: mapping && Object.keys(mapping).length > 0
      };
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
      
      // PRIORITÀ 1: Numero intero semplice (es: "10", "5", "100")
      if (/^\d+$/.test(stringValue)) {
        const parsed = parseInt(stringValue, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      
      // PRIORITÀ 2: Numero decimale semplice con virgola italiana (es: "5,50", "10,00")
      if (/^\d+,\d+$/.test(stringValue)) {
        const normalized = stringValue.replace(/,/g, '.');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
      }
      
      // PRIORITÀ 3: Numero decimale con punto inglese (es: "5.50", "10.00")
      if (/^\d+\.\d+$/.test(stringValue)) {
        const parsed = parseFloat(stringValue);
        return isNaN(parsed) ? 0 : parsed;
      }
      
      // PRIORITÀ 4: Formato migliaia italiano "1.234" (solo se esattamente 3 cifre dopo il punto)
      if (/^\d{1,3}\.\d{3}$/.test(stringValue)) {
        // Es: "1.234" -> rimuovi punto -> "1234"
        const withoutThousands = stringValue.replace('.', '');
        const parsed = parseFloat(withoutThousands);
        return isNaN(parsed) ? 0 : parsed;
      }
      
      // PRIORITÀ 5: Formato italiano completo "1.234,56" o "12.345.678,90"
      if (stringValue.includes(',')) {
        // Rimuovi tutti i punti (separatori migliaia) e sostituisci virgola con punto
        const normalized = stringValue
          .replace(/\./g, '')  // Rimuovi separatori migliaia
          .replace(/,/g, '.'); // Converti virgola decimale in punto
        
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
      }
      
      // PRIORITÀ 6: Formato migliaia multipli "12.345.678"
      if (stringValue.includes('.') && !stringValue.includes(',')) {
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
     * Test del sistema di validazione - chiamabile da console
     * Uso: window.supabaseSync.testValidation()
     */
    testValidation() {
      console.log('🧪 TEST SISTEMA VALIDAZIONE DATI:');
      
      const testData = [
        // Riga valida
        {
          'N° Ordine': '12345',
          'Data Ordine': '15/06/2025',
          'Cliente': 'Test Cliente SRL',
          'Indirizzo Consegna': 'Via Test 123',
          'P.IVA': '12345678901',
          'Data Consegna': '16/06/2025',
          'Codice Prodotto': 'ABC123',
          'Prodotto': 'Prodotto Test',
          'Quantità': '10',
          'Prezzo Unitario': '5,50',
          'S.M.': '0',
          'Sconto %': '0',
          'Importo': '55,00'
        },
        // Riga con errori
        {
          'N° Ordine': '', // Mancante
          'Data Ordine': '',
          'Cliente': '',
          'Codice Prodotto': '', // Mancante
          'Prodotto': '',
          'Quantità': '0', // Quantità zero
          'Prezzo Unitario': '-10,00', // Prezzo negativo
          'Importo': '-100,00' // Importo negativo
        },
        // Riga con warning calcolo
        {
          'N° Ordine': '12346',
          'Cliente': 'Cliente Due',
          'Codice Prodotto': 'DEF456',
          'Prodotto': 'Prodotto Due',
          'Quantità': '5',
          'Prezzo Unitario': '10,00',
          'S.M.': '1',
          'Sconto %': '10',
          'Importo': '50,00' // Dovrebbe essere (5-1)*10*0.9 = 36,00
        }
      ];
      
      console.log('\nTestando 3 righe campione...');
      const formatted = this.formatDataForSupabase(testData);
      
      console.log(`\n✅ Risultato: ${formatted.length} righe validate su ${testData.length} input`);
      
      return {
        input: testData.length,
        output: formatted.length,
        success: formatted.length > 0
      };
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
        { input: "5,00", expected: 5.00 },
        // Test specifici per quantità
        { input: "10", expected: 10 },
        { input: "5", expected: 5 },
        { input: "100", expected: 100 },
        { input: "1", expected: 1 },
        { input: "25", expected: 25 }
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

    /**
     * Valida una singola riga prima della conversione
     */
    validateRow(row, index) {
      const errors = [];
      const warnings = [];
      
      // STEP 3: Usa mappatura flessibile per validazioni
      const numeroOrdine = this.getMappedValue(row, 'numero_ordine') || row['N° Ordine'];
      const codiceProdotto = this.getMappedValue(row, 'codice_prodotto') || row['Codice Prodotto'];
      const cliente = this.getMappedValue(row, 'cliente') || row['Cliente'];
      const quantitaRaw = this.getMappedValue(row, 'quantita') || row['Quantità'];
      const prezzoRaw = this.getMappedValue(row, 'prezzo_unitario') || row['Prezzo Unitario'];
      const importoRaw = this.getMappedValue(row, 'importo') || row['Importo'];
      const smRaw = this.getMappedValue(row, 'sconto_merce') || row['S.M.'];
      const scontoRaw = this.getMappedValue(row, 'sconto_percentuale') || row['Sconto %'];
      
      // Validazioni obbligatorie
      if (!numeroOrdine || numeroOrdine.toString().trim() === '') {
        errors.push('Numero ordine mancante');
      }
      
      if (!codiceProdotto || codiceProdotto.toString().trim() === '') {
        errors.push('Codice prodotto mancante');
      }
      
      if (!cliente || cliente.toString().trim() === '') {
        warnings.push('Nome cliente mancante');
      }
      
      // Validazioni numeriche
      const quantita = this.parseItalianNumber(quantitaRaw);
      const prezzo = this.parseItalianNumber(prezzoRaw);
      const importo = this.parseItalianNumber(importoRaw);
      
      if (quantita <= 0) {
        warnings.push(`Quantità non valida: ${quantitaRaw} -> ${quantita}`);
      }
      
      if (prezzo < 0) {
        warnings.push(`Prezzo unitario negativo: ${prezzoRaw} -> ${prezzo}`);
      }
      
      if (importo < 0) {
        warnings.push(`Importo negativo: ${importoRaw} -> ${importo}`);
      }
      
      // Validazione consistenza calcolo
      const sm = this.parseItalianNumber(smRaw) || 0;
      const sconto = this.parseItalianNumber(scontoRaw) || 0;
      
      let importoCalcolato = (quantita - sm) * prezzo;
      if (sconto > 0) {
        importoCalcolato = importoCalcolato * (1 - sconto / 100);
      }
      
      const differenzaImporto = Math.abs(importo - importoCalcolato);
      if (differenzaImporto > 0.1) {
        warnings.push(`Possibile errore calcolo: ${importo.toFixed(2)} vs ${importoCalcolato.toFixed(2)} (diff: €${differenzaImporto.toFixed(2)})`);
      }
      
      // Validazioni date con mappatura flessibile
      const dataOrdineRaw = this.getMappedValue(row, 'data_ordine') || row['Data Ordine'];
      const dataConsegnaRaw = this.getMappedValue(row, 'data_consegna') || row['Data Consegna'];
      
      if (dataOrdineRaw) {
        const dataOrdine = this.parseDate(dataOrdineRaw);
        if (!dataOrdine) {
          warnings.push(`Data ordine non valida: ${dataOrdineRaw}`);
        }
      }
      
      if (dataConsegnaRaw) {
        const dataConsegna = this.parseDate(dataConsegnaRaw);
        if (!dataConsegna) {
          warnings.push(`Data consegna non valida: ${dataConsegnaRaw}`);
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings,
        hasWarnings: warnings.length > 0
      };
    }

    formatDataForSupabase(vendutoData) {
      this.logInfo('DATA_PROCESSING', `Inizio elaborazione ${vendutoData.length} righe per Supabase`);
      
      // STEP 3: Rileva automaticamente la mappatura colonne
      if (!this.currentMapping) {
        this.logInfo('DATA_PROCESSING', 'Avvio rilevamento mappatura colonne automatico');
        this.detectColumnMapping(vendutoData);
      }
      
      const validationStats = {
        total: vendutoData.length,
        valid: 0,
        invalid: 0,
        withWarnings: 0,
        errors: [],
        warnings: []
      };
      
      const validatedData = vendutoData.map((row, index) => {
        // Validazione riga
        const validation = this.validateRow(row, index);
        
        if (!validation.isValid) {
          validationStats.invalid++;
          validationStats.errors.push({
            row: index + 1,
            errors: validation.errors
          });
          this.logError('VALIDATION', `Riga ${index + 1} non valida`, validation.errors);
          return null; // Riga non valida, sarà filtrata
        }
        
        validationStats.valid++;
        
        if (validation.hasWarnings) {
          validationStats.withWarnings++;
          validationStats.warnings.push({
            row: index + 1,
            warnings: validation.warnings
          });
          this.logWarning('VALIDATION', `Riga ${index + 1} con warning`, validation.warnings);
        }
        
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
        
        // STEP 3: Usa mappatura flessibile per conversione finale
        const numeroOrdine = this.getMappedValue(row, 'numero_ordine') || row['N° Ordine'] || '';
        const codiceProdotto = this.getMappedValue(row, 'codice_prodotto') || row['Codice Prodotto'] || '';
        
        return {
          id: uniqueId,
          numero_ordine: numeroOrdine.toString(),
          data_ordine: this.parseDate(this.getMappedValue(row, 'data_ordine') || row['Data Ordine']),
          cliente: (this.getMappedValue(row, 'cliente') || row['Cliente'] || '').toString(),
          indirizzo_consegna: (this.getMappedValue(row, 'indirizzo_consegna') || row['Indirizzo Consegna'] || '').toString(),
          partita_iva: (this.getMappedValue(row, 'partita_iva') || row['P.IVA'] || '').toString(),
          data_consegna: this.parseDate(this.getMappedValue(row, 'data_consegna') || row['Data Consegna']),
          codice_prodotto: codiceProdotto.toString(),
          prodotto: (this.getMappedValue(row, 'prodotto') || row['Prodotto'] || '').toString(),
          quantita: this.parseItalianNumber(this.getMappedValue(row, 'quantita') || row['Quantità']),
          prezzo_unitario: this.parseItalianNumber(this.getMappedValue(row, 'prezzo_unitario') || row['Prezzo Unitario']),
          sconto_merce: this.parseItalianNumber(this.getMappedValue(row, 'sconto_merce') || row['S.M.']),
          sconto_percentuale: this.parseItalianNumber(this.getMappedValue(row, 'sconto_percentuale') || row['Sconto %']),
          importo: this.parseItalianNumber(this.getMappedValue(row, 'importo') || row['Importo']),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }).filter(row => row !== null); // Filtra righe non valide
      
      // Report di validazione con logging strutturato
      const finalReport = {
        total: validationStats.total,
        valid: validationStats.valid,
        invalid: validationStats.invalid,
        withWarnings: validationStats.withWarnings,
        qualityScore: Math.round((validationStats.valid / validationStats.total) * 100)
      };
      
      this.logInfo('DATA_PROCESSING', 'Report validazione completato', finalReport);
      
      // Mostra errori critici
      if (validationStats.errors.length > 0) {
        console.log('\n🚨 ERRORI CRITICI (prime 10):');
        validationStats.errors.slice(0, 10).forEach(error => {
          console.log(`  Riga ${error.row}: ${error.errors.join(', ')}`);
        });
        if (validationStats.errors.length > 10) {
          console.log(`  ... e altri ${validationStats.errors.length - 10} errori`);
        }
      }
      
      // Mostra warnings principali
      if (validationStats.warnings.length > 0) {
        console.log('\n⚠️ WARNING PRINCIPALI (primi 5):');
        validationStats.warnings.slice(0, 5).forEach(warning => {
          console.log(`  Riga ${warning.row}: ${warning.warnings.join(', ')}`);
        });
        if (validationStats.warnings.length > 5) {
          console.log(`  ... e altri ${validationStats.warnings.length - 5} warning`);
        }
      }
      
      // Calcola statistiche di qualità
      const qualityScore = Math.round((validationStats.valid / validationStats.total) * 100);
      const warningRate = Math.round((validationStats.withWarnings / validationStats.valid) * 100);
      
      console.log('\n🎯 QUALITÀ DATI:');
      console.log(`  Score di qualità: ${qualityScore}%`);
      console.log(`  Tasso di warning: ${warningRate}%`);
      
      if (qualityScore >= 95) {
        console.log('  🟢 Qualità OTTIMA');
      } else if (qualityScore >= 85) {
        console.log('  🟡 Qualità BUONA');
      } else {
        console.log('  🔴 Qualità SCARSA - Verificare dati');
      }
      
      return validatedData
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
console.log('🧪 Test disponibili:');
console.log('  - window.supabaseSync.testNumberParser()   // Test parser numeri italiani');
console.log('  - window.supabaseSync.testValidation()     // Test sistema validazione');
console.log('  - window.supabaseSync.testColumnMapping()  // Test mappatura colonne flessibile');
console.log('  - window.supabaseSync.testLogging()        // Test sistema logging dettagliato');
console.log('  - window.supabaseSync.getLogReport()       // Visualizza report log completo');