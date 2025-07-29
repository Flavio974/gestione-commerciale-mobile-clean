/**
 * 📊 SUPABASE SYNC VENDUTO - CLEAN ARCHITECTURE
 * Ridotto da 1147 → ~350 righe (69% riduzione)
 * Design Patterns: Strategy, Repository, Observer, Factory
 * FIXED: Cambiato nome tabella da 'archivio_ordini_venduto' a 'orders'
 */

console.log('[LOAD] ✅ supabase-sync-venduto-clean.js caricato');

// ==================== CONFIGURATION ====================

const SYNC_CONFIG = {
  TABLE_NAME: 'orders', // FIXED: Changed from 'archivio_ordini_venduto'
  BATCH_SIZE: 100,
  DEBUG: localStorage.getItem('sync_debug') === 'true',
  
  COLUMN_MAPPING: {
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
  }
};

// ==================== STRATEGY PATTERN - PARSERS ====================

class BaseParser {
  parse(value) {
    throw new Error('Abstract method');
  }
}

class ItalianNumberParser extends BaseParser {
  parse(value) {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (value === null || value === undefined || value === '') return 0;
    
    const stringValue = value.toString().trim();
    if (stringValue === '') return 0;
    
    // Simple integer
    if (/^\d+$/.test(stringValue)) {
      return parseInt(stringValue, 10) || 0;
    }
    
    // Italian decimal with comma
    if (/^\d+,\d+$/.test(stringValue)) {
      return parseFloat(stringValue.replace(',', '.')) || 0;
    }
    
    // English decimal with dot
    if (/^\d+\.\d+$/.test(stringValue)) {
      return parseFloat(stringValue) || 0;
    }
    
    // Italian thousands format
    if (stringValue.includes(',')) {
      const normalized = stringValue.replace(/\./g, '').replace(',', '.');
      return parseFloat(normalized) || 0;
    }
    
    return parseFloat(stringValue) || 0;
  }
}

class ItalianDateParser extends BaseParser {
  parse(dateValue) {
    if (!dateValue) return null;
    
    if (dateValue instanceof Date) {
      return this.formatDate(dateValue);
    }
    
    // Excel date number
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
      return this.formatDate(date);
    }
    
    // Italian format DD/MM/YYYY
    if (typeof dateValue === 'string' && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateValue)) {
      const [day, month, year] = dateValue.split('/').map(p => parseInt(p, 10));
      const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
      const date = new Date(fullYear, month - 1, day);
      return isNaN(date.getTime()) ? null : this.formatDate(date);
    }
    
    return null;
  }
  
  formatDate(date) {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}

// ==================== REPOSITORY PATTERN ====================

class SupabaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }
  
  async checkConnection() {
    if (!window.supabase || !window.SUPABASE_CONFIG?.enableSync) {
      return { connected: false, reason: 'not_configured' };
    }
    
    try {
      const { data, error } = await window.supabase
        .from(this.tableName)
        .select('id')
        .limit(1);
        
      return { connected: !error, error };
    } catch (err) {
      return { connected: false, error: err };
    }
  }
  
  async upsertBatch(records) {
    const { data, error } = await window.supabase
      .from(this.tableName)
      .upsert(records, { 
        onConflict: 'id',
        returning: 'minimal' 
      });
      
    return { success: !error, error, count: error ? 0 : records.length };
  }
  
  async getStats() {
    const { data, error } = await window.supabase
      .from(this.tableName)
      .select('numero_ordine, data_ordine, cliente, importo', { count: 'exact' });
      
    if (error) return null;
    
    const numberParser = new ItalianNumberParser();
    const totalImporto = data.reduce((sum, row) => sum + numberParser.parse(row.importo), 0);
    
    return {
      totalRecords: data.length,
      totalImporto: totalImporto.toFixed(2),
      uniqueOrders: new Set(data.map(row => row.numero_ordine)).size,
      uniqueClients: new Set(data.map(row => row.cliente)).size
    };
  }
}

// ==================== COLUMN MAPPER ====================

class ColumnMapper {
  constructor(mappingConfig) {
    this.mappingConfig = mappingConfig;
    this.currentMapping = null;
  }
  
  detectMapping(sampleData) {
    if (!sampleData?.length) return null;
    
    const firstRow = sampleData[0];
    const availableColumns = Object.keys(firstRow);
    const detectedMapping = {};
    
    Object.entries(this.mappingConfig).forEach(([targetField, possibleColumns]) => {
      // Find exact match
      let matchedColumn = possibleColumns.find(col => availableColumns.includes(col));
      
      // Find fuzzy match
      if (!matchedColumn) {
        for (const availableCol of availableColumns) {
          const cleanAvailable = availableCol.toLowerCase().replace(/[\s\.]/g, '');
          if (possibleColumns.some(possibleCol => {
            const cleanPossible = possibleCol.toLowerCase().replace(/[\s\.]/g, '');
            return cleanAvailable.includes(cleanPossible) || cleanPossible.includes(cleanAvailable);
          })) {
            matchedColumn = availableCol;
            break;
          }
        }
      }
      
      if (matchedColumn) {
        detectedMapping[targetField] = matchedColumn;
      }
    });
    
    this.currentMapping = detectedMapping;
    return detectedMapping;
  }
  
  getMappedValue(row, targetField) {
    if (!this.currentMapping?.[targetField]) return null;
    return row[this.currentMapping[targetField]];
  }
}

// ==================== DATA VALIDATOR ====================

class DataValidator {
  constructor(columnMapper, numberParser) {
    this.columnMapper = columnMapper;
    this.numberParser = numberParser;
  }
  
  validateRow(row, index) {
    const errors = [];
    const warnings = [];
    
    // Required fields
    const numeroOrdine = this.columnMapper.getMappedValue(row, 'numero_ordine');
    const codiceProdotto = this.columnMapper.getMappedValue(row, 'codice_prodotto');
    
    if (!numeroOrdine?.toString().trim()) {
      errors.push('Numero ordine mancante');
    }
    
    if (!codiceProdotto?.toString().trim()) {
      errors.push('Codice prodotto mancante');
    }
    
    // Numeric validation
    const quantita = this.numberParser.parse(this.columnMapper.getMappedValue(row, 'quantita'));
    const prezzo = this.numberParser.parse(this.columnMapper.getMappedValue(row, 'prezzo_unitario'));
    const importo = this.numberParser.parse(this.columnMapper.getMappedValue(row, 'importo'));
    
    if (quantita <= 0) warnings.push('Quantità non valida');
    if (prezzo < 0) warnings.push('Prezzo negativo');
    if (importo < 0) warnings.push('Importo negativo');
    
    // Calculation validation
    const sm = this.numberParser.parse(this.columnMapper.getMappedValue(row, 'sconto_merce')) || 0;
    const sconto = this.numberParser.parse(this.columnMapper.getMappedValue(row, 'sconto_percentuale')) || 0;
    
    const expectedImporto = (quantita - sm) * prezzo * (1 - sconto / 100);
    if (Math.abs(importo - expectedImporto) > 0.1) {
      warnings.push(`Discrepanza calcolo: €${Math.abs(importo - expectedImporto).toFixed(2)}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      hasWarnings: warnings.length > 0
    };
  }
}

// ==================== MAIN SYNC MODULE ====================

class SupabaseSyncVendutoClean {
  constructor() {
    this.repository = new SupabaseRepository(SYNC_CONFIG.TABLE_NAME);
    this.columnMapper = new ColumnMapper(SYNC_CONFIG.COLUMN_MAPPING);
    this.numberParser = new ItalianNumberParser();
    this.dateParser = new ItalianDateParser();
    this.validator = new DataValidator(this.columnMapper, this.numberParser);
    
    console.log(`📊 SupabaseSync initialized for table: ${SYNC_CONFIG.TABLE_NAME}`);
  }
  
  async syncToSupabase(vendutoData, options = {}) {
    const connection = await this.repository.checkConnection();
    if (!connection.connected) {
      console.warn('⚠️ Supabase not connected:', connection.reason);
      return { success: false, reason: connection.reason };
    }
    
    // Detect column mapping
    this.columnMapper.detectMapping(vendutoData);
    
    // Process and validate data
    const processedData = this.processData(vendutoData);
    if (processedData.length === 0) {
      return { success: true, inserted: 0, errors: 0 };
    }
    
    // Upload in batches
    let totalInserted = 0;
    let totalErrors = 0;
    
    for (let i = 0; i < processedData.length; i += SYNC_CONFIG.BATCH_SIZE) {
      const batch = processedData.slice(i, i + SYNC_CONFIG.BATCH_SIZE);
      const result = await this.repository.upsertBatch(batch);
      
      if (result.success) {
        totalInserted += result.count;
      } else {
        totalErrors += batch.length;
        console.error('❌ Batch error:', result.error);
      }
      
      // Progress callback
      if (options.onProgress) {
        const progress = Math.round((i + batch.length) / processedData.length * 100);
        options.onProgress(progress, {
          current: i + batch.length,
          total: processedData.length,
          inserted: totalInserted,
          errors: totalErrors
        });
      }
    }
    
    console.log(`✅ Sync completed: ${totalInserted} inserted, ${totalErrors} errors`);
    return {
      success: true,
      inserted: totalInserted,
      errors: totalErrors,
      total: processedData.length
    };
  }
  
  processData(vendutoData) {
    const validData = [];
    
    vendutoData.forEach((row, index) => {
      const validation = this.validator.validateRow(row, index);
      
      if (!validation.isValid) {
        if (SYNC_CONFIG.DEBUG) {
          console.error(`❌ Row ${index + 1} invalid:`, validation.errors);
        }
        return;
      }
      
      if (validation.hasWarnings && SYNC_CONFIG.DEBUG) {
        console.warn(`⚠️ Row ${index + 1} warnings:`, validation.warnings);
      }
      
      // Create record
      const numeroOrdine = this.columnMapper.getMappedValue(row, 'numero_ordine') || row['N° Ordine'];
      const codiceProdotto = this.columnMapper.getMappedValue(row, 'codice_prodotto') || row['Codice Prodotto'];
      
      validData.push({
        id: `${numeroOrdine}_${codiceProdotto}`,
        numero_ordine: numeroOrdine.toString(),
        data_ordine: this.dateParser.parse(this.columnMapper.getMappedValue(row, 'data_ordine')),
        cliente: (this.columnMapper.getMappedValue(row, 'cliente') || '').toString(),
        indirizzo_consegna: (this.columnMapper.getMappedValue(row, 'indirizzo_consegna') || '').toString(),
        partita_iva: (this.columnMapper.getMappedValue(row, 'partita_iva') || '').toString(),
        data_consegna: this.dateParser.parse(this.columnMapper.getMappedValue(row, 'data_consegna')),
        codice_prodotto: codiceProdotto.toString(),
        prodotto: (this.columnMapper.getMappedValue(row, 'prodotto') || '').toString(),
        quantita: this.numberParser.parse(this.columnMapper.getMappedValue(row, 'quantita')),
        prezzo_unitario: this.numberParser.parse(this.columnMapper.getMappedValue(row, 'prezzo_unitario')),
        sconto_merce: this.numberParser.parse(this.columnMapper.getMappedValue(row, 'sconto_merce')),
        sconto_percentuale: this.numberParser.parse(this.columnMapper.getMappedValue(row, 'sconto_percentuale')),
        importo: this.numberParser.parse(this.columnMapper.getMappedValue(row, 'importo')),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
    
    return validData;
  }
  
  async syncFromLocalStorage() {
    const savedData = localStorage.getItem('ordiniFileData');
    if (!savedData) {
      console.log('⚠️ No data found in localStorage');
      return { success: false, reason: 'no_data' };
    }
    
    const vendutoDataArray = JSON.parse(savedData);
    const vendutoDataObjects = vendutoDataArray.map(row => ({
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
    
    return await this.syncToSupabase(vendutoDataObjects, { mode: 'upsert' });
  }
  
  async getStats() {
    return await this.repository.getStats();
  }
}

// ==================== EXPORTS ====================

window.SupabaseSyncVendutoClean = SupabaseSyncVendutoClean;
window.SupabaseSyncVenduto = SupabaseSyncVendutoClean; // Compatibility alias
window.supabaseSync = new SupabaseSyncVendutoClean(); // Global instance

console.log('📊 SupabaseSync Clean ready! Table: ' + SYNC_CONFIG.TABLE_NAME);