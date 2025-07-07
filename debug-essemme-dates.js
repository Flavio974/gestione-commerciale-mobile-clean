/**
 * DEBUG SCRIPT - Analisi completa date ordini ESSEMME
 * Identifica problemi con date future (es. 05/11/2025 quando siamo a Luglio 2025)
 * 
 * Esegui questo script nella console del browser per:
 * - Visualizzare tutti i valori date RAW dal database
 * - Identificare quali campi contengono date
 * - Verificare se ci sono problemi di parsing o formattazione
 * - Trovare date impossibili (future)
 */

class EssemmeDateDebugger {
    constructor() {
        this.supabase = window.supabase;
        this.currentDate = new Date();
        this.results = {
            totalRecords: 0,
            dateFields: {},
            futureDates: [],
            dateFormats: {},
            rawSamples: []
        };
    }

    /**
     * Avvia l'analisi completa delle date
     */
    async analyze() {
        console.clear();
        console.log('🔍 DEBUG DATE ESSEMME - ANALISI COMPLETA');
        console.log('=' .repeat(60));
        console.log(`📅 Data corrente: ${this.currentDate.toLocaleDateString('it-IT')} (${this.currentDate.toISOString()})`);
        console.log('=' .repeat(60));

        if (!this.supabase) {
            console.error('❌ Supabase non disponibile. Assicurati di essere sulla pagina corretta.');
            return;
        }

        try {
            // 1. Recupera TUTTI i record Essemme
            const records = await this.fetchEssemmeRecords();
            if (!records || records.length === 0) {
                console.log('⚠️ Nessun record ESSEMME trovato');
                return;
            }

            // 2. Identifica tutti i campi data
            this.identifyDateFields(records);

            // 3. Analizza i valori raw
            this.analyzeRawValues(records);

            // 4. Cerca date future/impossibili
            this.findFutureDates(records);

            // 5. Analizza i formati date
            this.analyzeDateFormats(records);

            // 6. Mostra campioni dettagliati
            this.showDetailedSamples(records);

            // 7. Report finale
            this.generateReport();

        } catch (error) {
            console.error('❌ Errore durante l\'analisi:', error);
        }
    }

    /**
     * Recupera tutti i record ESSEMME dal database
     */
    async fetchEssemmeRecords() {
        console.log('\n📊 RECUPERO RECORD ESSEMME...');
        
        const { data, error } = await this.supabase
            .from('archivio_ordini_venduto')
            .select('*')
            .or('cliente.ilike.%ESSEMME%,cliente.ilike.%essemme%')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Errore query:', error);
            return null;
        }

        this.results.totalRecords = data.length;
        console.log(`✅ Trovati ${data.length} record ESSEMME`);
        return data;
    }

    /**
     * Identifica tutti i campi che potrebbero contenere date
     */
    identifyDateFields(records) {
        console.log('\n🔍 IDENTIFICAZIONE CAMPI DATA...');
        
        const potentialDateFields = [
            'data', 'date', 'data_ordine', 'data_consegna', 'data_documento',
            'created_at', 'updated_at', 'timestamp', 'data_creazione',
            'data_emissione', 'data_scadenza', 'delivery_date', 'order_date'
        ];

        const firstRecord = records[0];
        const allFields = Object.keys(firstRecord);
        
        console.log(`\n📋 Tutti i campi disponibili (${allFields.length}):`);
        allFields.forEach(field => {
            console.log(`   - ${field}`);
        });

        // Controlla quali campi contengono date
        console.log('\n📅 CAMPI CON POSSIBILI DATE:');
        allFields.forEach(field => {
            const isDateField = potentialDateFields.includes(field.toLowerCase()) || 
                               field.toLowerCase().includes('data') || 
                               field.toLowerCase().includes('date');
            
            if (isDateField) {
                const nonNullCount = records.filter(r => r[field] !== null && r[field] !== undefined && r[field] !== '').length;
                
                if (nonNullCount > 0) {
                    this.results.dateFields[field] = {
                        count: nonNullCount,
                        percentage: ((nonNullCount / records.length) * 100).toFixed(1),
                        samples: []
                    };
                    
                    // Prendi alcuni campioni
                    const samples = records
                        .filter(r => r[field])
                        .slice(0, 5)
                        .map(r => ({ value: r[field], orderId: r.numero_ordine || r.id }));
                    
                    this.results.dateFields[field].samples = samples;
                    
                    console.log(`✅ ${field}: ${nonNullCount}/${records.length} (${this.results.dateFields[field].percentage}%)`);
                    console.log(`   Campioni: ${samples.map(s => s.value).join(', ')}`);
                }
            }
        });
    }

    /**
     * Analizza i valori raw delle date
     */
    analyzeRawValues(records) {
        console.log('\n🔬 ANALISI VALORI RAW...');
        
        Object.keys(this.results.dateFields).forEach(field => {
            console.log(`\n📅 Campo: ${field}`);
            
            // Prendi 10 valori unici
            const uniqueValues = [...new Set(records.map(r => r[field]).filter(v => v))].slice(0, 10);
            
            console.log('   Valori unici (primi 10):');
            uniqueValues.forEach(value => {
                console.log(`   - RAW: "${value}"`);
                console.log(`     Tipo: ${typeof value}`);
                
                // Prova a parsare come data
                try {
                    const parsed = new Date(value);
                    if (!isNaN(parsed.getTime())) {
                        console.log(`     Parsed: ${parsed.toISOString()}`);
                        console.log(`     Locale: ${parsed.toLocaleDateString('it-IT')}`);
                    } else {
                        console.log(`     ⚠️ Non parsabile come data`);
                    }
                } catch (e) {
                    console.log(`     ❌ Errore parsing: ${e.message}`);
                }
            });
        });
    }

    /**
     * Trova date future o impossibili
     */
    findFutureDates(records) {
        console.log('\n⚠️ RICERCA DATE FUTURE/IMPOSSIBILI...');
        
        const now = this.currentDate;
        const futureThreshold = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Fine del mese corrente
        
        Object.keys(this.results.dateFields).forEach(field => {
            console.log(`\n📅 Controllo campo: ${field}`);
            
            const futureDatesInField = [];
            
            records.forEach(record => {
                const value = record[field];
                if (!value) return;
                
                try {
                    const date = new Date(value);
                    if (!isNaN(date.getTime()) && date > futureThreshold) {
                        futureDatesInField.push({
                            orderId: record.numero_ordine || record.id,
                            cliente: record.cliente,
                            field: field,
                            rawValue: value,
                            parsedDate: date,
                            formattedDate: date.toLocaleDateString('it-IT'),
                            isoDate: date.toISOString(),
                            prodotto: record.prodotto,
                            quantita: record.quantita
                        });
                    }
                } catch (e) {
                    // Ignora errori di parsing
                }
            });
            
            if (futureDatesInField.length > 0) {
                console.log(`   ❌ TROVATE ${futureDatesInField.length} DATE FUTURE!`);
                futureDatesInField.slice(0, 5).forEach(item => {
                    console.log(`   - Ordine ${item.orderId}: ${item.rawValue} → ${item.formattedDate}`);
                    console.log(`     Prodotto: ${item.prodotto} (Q.tà: ${item.quantita})`);
                });
                
                this.results.futureDates.push(...futureDatesInField);
            } else {
                console.log(`   ✅ Nessuna data futura trovata`);
            }
        });
    }

    /**
     * Analizza i formati delle date
     */
    analyzeDateFormats(records) {
        console.log('\n📐 ANALISI FORMATI DATE...');
        
        Object.keys(this.results.dateFields).forEach(field => {
            console.log(`\n📅 Campo: ${field}`);
            
            const formats = {};
            
            records.forEach(record => {
                const value = record[field];
                if (!value) return;
                
                // Identifica il formato
                let format = 'unknown';
                
                if (typeof value === 'string') {
                    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) format = 'YYYY-MM-DD';
                    else if (value.match(/^\d{4}-\d{2}-\d{2}T/)) format = 'ISO 8601';
                    else if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) format = 'DD/MM/YYYY';
                    else if (value.match(/^\d{2}-\d{2}-\d{4}$/)) format = 'DD-MM-YYYY';
                    else if (value.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) format = 'D/M/YYYY';
                    else if (value.match(/^\d{4}\/\d{2}\/\d{2}$/)) format = 'YYYY/MM/DD';
                    else format = 'altro: ' + value.substring(0, 20);
                }
                
                formats[format] = (formats[format] || 0) + 1;
            });
            
            console.log('   Formati trovati:');
            Object.entries(formats).forEach(([format, count]) => {
                console.log(`   - ${format}: ${count} occorrenze`);
            });
            
            this.results.dateFormats[field] = formats;
        });
    }

    /**
     * Mostra campioni dettagliati
     */
    showDetailedSamples(records) {
        console.log('\n📊 CAMPIONI DETTAGLIATI (primi 5 record):');
        console.log('=' .repeat(60));
        
        records.slice(0, 5).forEach((record, index) => {
            console.log(`\n📄 RECORD ${index + 1}:`);
            console.log(`   ID/Numero ordine: ${record.numero_ordine || record.id}`);
            console.log(`   Cliente: ${record.cliente}`);
            console.log(`   Prodotto: ${record.prodotto}`);
            
            console.log('\n   TUTTI I CAMPI DATA:');
            Object.keys(this.results.dateFields).forEach(field => {
                const value = record[field];
                if (value) {
                    console.log(`   ${field}:`);
                    console.log(`     - Raw: "${value}"`);
                    console.log(`     - Tipo: ${typeof value}`);
                    
                    try {
                        const parsed = new Date(value);
                        if (!isNaN(parsed.getTime())) {
                            console.log(`     - Parsed: ${parsed.toISOString()}`);
                            console.log(`     - IT: ${parsed.toLocaleDateString('it-IT')}`);
                            console.log(`     - US: ${parsed.toLocaleDateString('en-US')}`);
                        }
                    } catch (e) {
                        console.log(`     - Errore: ${e.message}`);
                    }
                }
            });
            
            // Salva per il report
            this.results.rawSamples.push({
                index: index + 1,
                record: record,
                dateFields: Object.keys(this.results.dateFields).reduce((acc, field) => {
                    if (record[field]) acc[field] = record[field];
                    return acc;
                }, {})
            });
        });
    }

    /**
     * Genera il report finale
     */
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 REPORT FINALE - DEBUG DATE ESSEMME');
        console.log('='.repeat(60));
        
        console.log(`\n✅ ANALISI COMPLETATA:`);
        console.log(`   - Record analizzati: ${this.results.totalRecords}`);
        console.log(`   - Campi data trovati: ${Object.keys(this.results.dateFields).length}`);
        console.log(`   - Date future trovate: ${this.results.futureDates.length}`);
        
        if (this.results.futureDates.length > 0) {
            console.log('\n❌ PROBLEMA IDENTIFICATO: Date future!');
            console.log('   Le seguenti date sono nel futuro rispetto alla data corrente:');
            
            // Raggruppa per campo
            const byField = {};
            this.results.futureDates.forEach(item => {
                if (!byField[item.field]) byField[item.field] = [];
                byField[item.field].push(item);
            });
            
            Object.entries(byField).forEach(([field, items]) => {
                console.log(`\n   Campo "${field}": ${items.length} date future`);
                items.slice(0, 3).forEach(item => {
                    console.log(`   - ${item.rawValue} → ${item.formattedDate} (Ordine: ${item.orderId})`);
                });
            });
        }
        
        console.log('\n💡 SUGGERIMENTI:');
        console.log('   1. Verifica il formato di importazione delle date');
        console.log('   2. Controlla se c\'è confusione tra formato DD/MM e MM/DD');
        console.log('   3. Verifica il timezone del database e del client');
        console.log('   4. Controlla se le date vengono modificate durante l\'importazione');
        
        // Esporta risultati
        window.essemmeDateDebugResults = this.results;
        console.log('\n📁 Risultati salvati in: window.essemmeDateDebugResults');
    }
}

// Funzione helper per esecuzione rapida
async function debugEssemmeDates() {
    const debugger = new EssemmeDateDebugger();
    await debugger.analyze();
    return debugger.results;
}

// Esporta per uso nella console
window.debugEssemmeDates = debugEssemmeDates;
window.EssemmeDateDebugger = EssemmeDateDebugger;

// Auto-esegui se richiesto
console.log('🔧 Debug script caricato!');
console.log('📌 Usa debugEssemmeDates() per avviare l\'analisi');
console.log('📌 Oppure premi INVIO per eseguire subito...');

// Esegui automaticamente dopo 1 secondo per dare tempo di leggere
setTimeout(() => {
    console.log('\n🚀 Avvio analisi automatica...\n');
    debugEssemmeDates();
}, 1000);