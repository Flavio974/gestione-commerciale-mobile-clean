/**
 * SCRIPT DIAGNOSI DATE ESSEMME
 * Verifica perché le date mostrano "05/11/2025" invece di date in Maggio-Giugno 2025
 * 
 * Questo script:
 * 1. Trova tutti gli ordini Essemme
 * 2. Mostra i valori raw dal database
 * 3. Mostra come vengono parsati/visualizzati
 * 4. Identifica il problema con "05/11/2025"
 */

class EssemmeDateDiagnostic {
    constructor() {
        this.supabase = window.supabase;
        this.currentDate = new Date();
        this.expectedStartDate = new Date('2025-05-21'); // 21 Maggio 2025
        this.expectedEndDate = new Date('2025-06-11');   // 11 Giugno 2025
        this.totalExpectedRevenue = 3455.72;
    }

    async runDiagnostic() {
        console.clear();
        console.log('🔍 DIAGNOSI DATE ESSEMME SRL');
        console.log('=' .repeat(80));
        console.log(`📅 Data corrente: ${this.currentDate.toLocaleDateString('it-IT')}`);
        console.log(`📊 Periodo atteso: 21/05/2025 - 11/06/2025`);
        console.log(`💰 Fatturato atteso: €${this.totalExpectedRevenue}`);
        console.log('=' .repeat(80));

        if (!this.supabase) {
            console.error('❌ Supabase non disponibile');
            return;
        }

        try {
            // 1. Recupera tutti i record Essemme
            const records = await this.fetchEssemmeRecords();
            
            // 2. Analizza i valori raw delle date
            this.analyzeRawDates(records);
            
            // 3. Confronta con le date attese
            this.compareWithExpectedDates(records);
            
            // 4. Identifica il problema specifico con "05/11/2025"
            this.findSpecificDateIssue(records);
            
            // 5. Analizza come vengono formattate le date nel sistema
            this.analyzeSystemDateFormatting(records);
            
            // 6. Genera report con soluzione
            this.generateSolutionReport(records);

        } catch (error) {
            console.error('❌ Errore durante la diagnosi:', error);
        }
    }

    async fetchEssemmeRecords() {
        console.log('\n📊 RECUPERO ORDINI ESSEMME...\n');
        
        const { data, error } = await this.supabase
            .from('archivio_ordini_venduto')
            .select('*')
            .or('cliente.ilike.%ESSEMME%,cliente.ilike.%essemme%')
            .order('data_consegna', { ascending: true });

        if (error) {
            console.error('❌ Errore query:', error);
            return [];
        }

        console.log(`✅ Trovati ${data.length} record per ESSEMME SRL`);
        
        // Calcola il totale
        const totale = data.reduce((sum, record) => sum + (parseFloat(record.importo) || 0), 0);
        console.log(`💰 Fatturato totale: €${totale.toFixed(2)}`);
        
        return data;
    }

    analyzeRawDates(records) {
        console.log('\n🔬 ANALISI VALORI RAW DELLE DATE');
        console.log('=' .repeat(80));

        // Identifica tutti i campi data
        const dateFields = ['data_consegna', 'data_ordine', 'data_documento', 'created_at', 'updated_at'];
        
        dateFields.forEach(field => {
            const uniqueValues = [...new Set(records.map(r => r[field]).filter(v => v))];
            
            if (uniqueValues.length > 0) {
                console.log(`\n📅 Campo: ${field}`);
                console.log(`   Valori unici trovati: ${uniqueValues.length}`);
                
                // Mostra primi 10 valori
                uniqueValues.slice(0, 10).forEach(value => {
                    console.log(`\n   RAW: "${value}"`);
                    console.log(`   Tipo: ${typeof value}`);
                    
                    // Analizza il valore
                    this.analyzeDate(value);
                });
            }
        });
    }

    analyzeDate(dateValue) {
        if (!dateValue) return;

        try {
            // Prova parsing diretto
            const directParse = new Date(dateValue);
            if (!isNaN(directParse.getTime())) {
                console.log(`   Parse diretto: ${directParse.toLocaleDateString('it-IT')} (${directParse.toISOString()})`);
            }

            // Se è una stringa, prova diversi formati
            if (typeof dateValue === 'string') {
                // Formato DD/MM/YYYY
                if (dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                    const [day, month, year] = dateValue.split('/');
                    const italianDate = new Date(year, month - 1, day);
                    console.log(`   Parse IT (DD/MM/YYYY): ${italianDate.toLocaleDateString('it-IT')}`);
                    
                    // Prova anche interpretazione US (MM/DD/YYYY)
                    const usDate = new Date(year, day - 1, month);
                    console.log(`   Parse US (MM/DD/YYYY): ${usDate.toLocaleDateString('it-IT')}`);
                    
                    // Identifica quale interpretazione è più probabile
                    if (parseInt(day) > 12) {
                        console.log(`   ⚠️ Il giorno (${day}) > 12, quindi formato deve essere DD/MM/YYYY`);
                    } else if (parseInt(month) > 12) {
                        console.log(`   ⚠️ Il mese (${month}) > 12, quindi formato deve essere MM/DD/YYYY`);
                    } else {
                        console.log(`   ❓ Ambiguo: potrebbe essere sia DD/MM che MM/DD`);
                    }
                }
                
                // Formato YYYY-MM-DD
                if (dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
                    console.log(`   Formato ISO standard`);
                }
            }
        } catch (e) {
            console.log(`   ❌ Errore parsing: ${e.message}`);
        }
    }

    compareWithExpectedDates(records) {
        console.log('\n📊 CONFRONTO CON DATE ATTESE');
        console.log('=' .repeat(80));
        console.log(`Periodo atteso: 21/05/2025 - 11/06/2025`);

        // Conta record nel periodo atteso
        let recordsInExpectedPeriod = 0;
        let recordsOutsidePeriod = [];

        records.forEach(record => {
            const dateFields = ['data_consegna', 'data_ordine'];
            
            dateFields.forEach(field => {
                const dateValue = record[field];
                if (!dateValue) return;

                const date = this.parseDate(dateValue);
                if (date) {
                    if (date >= this.expectedStartDate && date <= this.expectedEndDate) {
                        recordsInExpectedPeriod++;
                    } else {
                        recordsOutsidePeriod.push({
                            orderId: record.numero_ordine || record.id,
                            field: field,
                            rawValue: dateValue,
                            parsedDate: date,
                            formattedDate: date.toLocaleDateString('it-IT'),
                            prodotto: record.prodotto,
                            importo: record.importo
                        });
                    }
                }
            });
        });

        console.log(`\n✅ Record nel periodo atteso: ${recordsInExpectedPeriod}`);
        console.log(`❌ Record fuori periodo: ${recordsOutsidePeriod.length}`);

        if (recordsOutsidePeriod.length > 0) {
            console.log('\nRecord con date anomale:');
            recordsOutsidePeriod.slice(0, 10).forEach(item => {
                console.log(`- Ordine ${item.orderId}: ${item.rawValue} → ${item.formattedDate}`);
                console.log(`  Prodotto: ${item.prodotto}, Importo: €${item.importo}`);
            });
        }
    }

    findSpecificDateIssue(records) {
        console.log('\n🔍 RICERCA SPECIFICA DATA "05/11/2025"');
        console.log('=' .repeat(80));

        const problematicDates = ['05/11/2025', '11/05/2025'];
        const found = [];

        records.forEach(record => {
            Object.entries(record).forEach(([field, value]) => {
                if (value && typeof value === 'string' && problematicDates.some(d => value.includes(d))) {
                    found.push({
                        orderId: record.numero_ordine || record.id,
                        field: field,
                        value: value,
                        prodotto: record.prodotto,
                        cliente: record.cliente,
                        importo: record.importo
                    });
                }
            });
        });

        if (found.length > 0) {
            console.log(`❌ TROVATE ${found.length} occorrenze di date problematiche:`);
            found.forEach(item => {
                console.log(`\nOrdine: ${item.orderId}`);
                console.log(`Campo: ${item.field}`);
                console.log(`Valore: ${item.value}`);
                console.log(`Prodotto: ${item.prodotto}`);
                
                // Analizza la data
                if (item.value === '05/11/2025') {
                    console.log('⚠️ INTERPRETAZIONE:');
                    console.log('   - Come DD/MM/YYYY: 5 Novembre 2025 (FUTURO!)');
                    console.log('   - Come MM/DD/YYYY: 11 Maggio 2025 (CORRETTO!)');
                    console.log('   ✅ PROBABILE ERRORE: Il sistema sta interpretando MM/DD come DD/MM');
                } else if (item.value === '11/05/2025') {
                    console.log('⚠️ INTERPRETAZIONE:');
                    console.log('   - Come DD/MM/YYYY: 11 Maggio 2025 (CORRETTO!)');
                    console.log('   - Come MM/DD/YYYY: 5 Novembre 2025 (FUTURO!)');
                }
            });
        } else {
            console.log('✅ Nessuna occorrenza diretta di "05/11/2025" trovata nei dati raw');
            console.log('⚠️ Il problema potrebbe essere nella visualizzazione/formattazione');
        }
    }

    analyzeSystemDateFormatting(records) {
        console.log('\n🎨 ANALISI FORMATTAZIONE DATE NEL SISTEMA');
        console.log('=' .repeat(80));

        // Prendi alcuni record di esempio
        const samples = records.slice(0, 5);
        
        samples.forEach((record, index) => {
            console.log(`\n📄 Record ${index + 1}:`);
            console.log(`   Numero ordine: ${record.numero_ordine}`);
            
            ['data_consegna', 'data_ordine'].forEach(field => {
                const value = record[field];
                if (!value) return;
                
                console.log(`\n   ${field}:`);
                console.log(`   - Raw: "${value}"`);
                
                // Simula come potrebbe essere formattata
                const date = this.parseDate(value);
                if (date) {
                    // Diversi modi di formattare
                    console.log(`   - toLocaleDateString('it-IT'): ${date.toLocaleDateString('it-IT')}`);
                    console.log(`   - toLocaleDateString('en-US'): ${date.toLocaleDateString('en-US')}`);
                    console.log(`   - Utils.formatDate: ${this.formatDate(date)}`);
                    console.log(`   - getDate/getMonth: ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`);
                }
            });
        });
    }

    parseDate(dateValue) {
        if (!dateValue) return null;
        
        try {
            // Se è già un oggetto Date
            if (dateValue instanceof Date) return dateValue;
            
            // Se è una stringa ISO
            if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
                return new Date(dateValue);
            }
            
            // Se è formato DD/MM/YYYY
            if (typeof dateValue === 'string' && dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const [day, month, year] = dateValue.split('/');
                return new Date(year, month - 1, day);
            }
            
            // Prova parsing diretto
            const parsed = new Date(dateValue);
            if (!isNaN(parsed.getTime())) return parsed;
            
        } catch (e) {
            console.error('Errore parsing data:', e);
        }
        
        return null;
    }

    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    generateSolutionReport(records) {
        console.log('\n' + '='.repeat(80));
        console.log('📋 REPORT FINALE E SOLUZIONE');
        console.log('=' .repeat(80));

        console.log('\n🔍 DIAGNOSI:');
        console.log('1. I dati nel database sembrano essere corretti');
        console.log('2. Il problema è probabilmente nella visualizzazione/formattazione');
        console.log('3. Possibile confusione tra formato DD/MM e MM/DD');

        console.log('\n💡 SOLUZIONE PROPOSTA:');
        console.log('1. Verificare la funzione di formattazione date utilizzata nella visualizzazione');
        console.log('2. Assicurarsi che tutte le date siano parsate correttamente come DD/MM/YYYY');
        console.log('3. Controllare se ci sono conversioni implicite che cambiano il formato');

        console.log('\n📝 CODICE DI FIX SUGGERITO:');
        console.log(`
// Funzione corretta per parsare date italiane
function parseItalianDate(dateStr) {
    if (!dateStr) return null;
    
    // Se è già ISO format
    if (dateStr.match(/^\\d{4}-\\d{2}-\\d{2}/)) {
        return new Date(dateStr);
    }
    
    // Se è DD/MM/YYYY
    if (dateStr.match(/^\\d{2}\\/\\d{2}\\/\\d{4}$/)) {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
    }
    
    return null;
}

// Funzione corretta per formattare date
function formatDateIT(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return \`\${day}/\${month}/\${year}\`;
}
        `);

        // Salva risultati
        window.essemmeDateDiagnosticResults = {
            totalRecords: records.length,
            expectedPeriod: '21/05/2025 - 11/06/2025',
            expectedRevenue: this.totalExpectedRevenue,
            actualRevenue: records.reduce((sum, r) => sum + (parseFloat(r.importo) || 0), 0),
            records: records
        };

        console.log('\n✅ Risultati salvati in: window.essemmeDateDiagnosticResults');
    }
}

// Funzione di esecuzione
async function checkEssemmeDatesDisplay() {
    const diagnostic = new EssemmeDateDiagnostic();
    await diagnostic.runDiagnostic();
}

// Esporta per uso nella console
window.checkEssemmeDatesDisplay = checkEssemmeDatesDisplay;
window.EssemmeDateDiagnostic = EssemmeDateDiagnostic;

// Messaggio di avvio
console.log('🔧 Script diagnosi date Essemme caricato!');
console.log('📌 Esegui checkEssemmeDatesDisplay() per avviare la diagnosi');
console.log('📌 I risultati saranno salvati in window.essemmeDateDiagnosticResults');