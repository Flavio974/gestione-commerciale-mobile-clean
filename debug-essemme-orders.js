/**
 * DEBUG SCRIPT - Analisi Ordini ESSEMME SRL
 * Analizza la struttura degli ordini per determinare se i 97 record rappresentano
 * ordini distinti o righe di prodotti all'interno di meno ordini.
 */

class EssemmeOrderAnalyzer {
    constructor() {
        this.supabase = window.supabase;
        this.results = {};
    }

    /**
     * Analizza completamente gli ordini ESSEMME
     */
    async analyzeEssemmeOrders() {
        console.log('🔍 ANALISI ESSEMME: Avvio analisi ordini...');
        
        if (!this.supabase) {
            console.error('❌ ANALISI ESSEMME: Supabase non disponibile');
            return;
        }

        try {
            // 1. Recupera tutti i record per ESSEMME SRL
            console.log('📊 ANALISI ESSEMME: Recupero tutti i record...');
            const { data: essemmeRecords, error } = await this.supabase
                .from('archivio_ordini_venduto')
                .select('*')
                .ilike('cliente', '%ESSEMME%')
                .order('data_consegna', { ascending: false });

            if (error) {
                console.error('❌ ANALISI ESSEMME: Errore query:', error);
                return;
            }

            const totalRecords = essemmeRecords?.length || 0;
            console.log(`📊 ANALISI ESSEMME: Trovati ${totalRecords} record totali`);

            if (totalRecords === 0) {
                console.log('⚠️ ANALISI ESSEMME: Nessun record trovato');
                return;
            }

            // 2. Analizza la struttura dei dati
            this.analyzeDataStructure(essemmeRecords);

            // 3. Raggruppa per numero_ordine
            this.groupByOrderNumber(essemmeRecords);

            // 4. Analizza per data
            this.analyzeByDate(essemmeRecords);

            // 5. Analizza prodotti
            this.analyzeProducts(essemmeRecords);

            // 6. Genera report finale
            this.generateFinalReport(essemmeRecords);

        } catch (error) {
            console.error('❌ ANALISI ESSEMME: Errore generale:', error);
        }
    }

    /**
     * Analizza la struttura base dei dati
     */
    analyzeDataStructure(records) {
        console.log('\n📋 ANALISI STRUTTURA DATI:');
        console.log('═'.repeat(50));

        // Analizza i primi 3 record per capire la struttura
        const sampleRecords = records.slice(0, 3);
        sampleRecords.forEach((record, index) => {
            console.log(`\n📄 Record ${index + 1}:`);
            console.log(`   - Cliente: ${record.cliente}`);
            console.log(`   - Numero Ordine: ${record.numero_ordine || 'N/A'}`);
            console.log(`   - Data Consegna: ${record.data_consegna || 'N/A'}`);
            console.log(`   - Data Ordine: ${record.data_ordine || 'N/A'}`);
            console.log(`   - Prodotto: ${record.prodotto || 'N/A'}`);
            console.log(`   - Codice Prodotto: ${record.codice_prodotto || 'N/A'}`);
            console.log(`   - Quantità: ${record.quantita || 'N/A'}`);
            console.log(`   - Importo: €${record.importo || 'N/A'}`);
            console.log(`   - Prezzo Unitario: €${record.prezzo_unitario || 'N/A'}`);
        });

        // Analizza i campi disponibili
        const availableFields = Object.keys(records[0] || {});
        console.log(`\n🔍 Campi disponibili (${availableFields.length}):`);
        availableFields.forEach(field => {
            const nonNullCount = records.filter(r => r[field] !== null && r[field] !== undefined && r[field] !== '').length;
            const percentage = ((nonNullCount / records.length) * 100).toFixed(1);
            console.log(`   - ${field}: ${nonNullCount}/${records.length} (${percentage}%)`);
        });
    }

    /**
     * Raggruppa per numero_ordine
     */
    groupByOrderNumber(records) {
        console.log('\n📊 ANALISI PER NUMERO ORDINE:');
        console.log('═'.repeat(50));

        const orderGroups = new Map();
        let recordsWithoutOrderNumber = 0;

        records.forEach(record => {
            const orderNumber = record.numero_ordine;
            
            if (!orderNumber || orderNumber === null || orderNumber === '') {
                recordsWithoutOrderNumber++;
                return;
            }

            if (!orderGroups.has(orderNumber)) {
                orderGroups.set(orderNumber, {
                    numeroOrdine: orderNumber,
                    cliente: record.cliente,
                    dataConsegna: record.data_consegna,
                    dataOrdine: record.data_ordine,
                    righe: [],
                    totaleImporto: 0,
                    prodotti: new Set()
                });
            }

            const order = orderGroups.get(orderNumber);
            order.righe.push(record);
            order.totaleImporto += parseFloat(record.importo || 0);
            if (record.prodotto) order.prodotti.add(record.prodotto);
        });

        console.log(`📈 RISULTATI RAGGRUPPAMENTO:`);
        console.log(`   - Record totali: ${records.length}`);
        console.log(`   - Record senza numero ordine: ${recordsWithoutOrderNumber}`);
        console.log(`   - Ordini distinti: ${orderGroups.size}`);
        console.log(`   - Media righe per ordine: ${(records.length / orderGroups.size).toFixed(2)}`);

        // Analizza gli ordini più grandi
        const ordersArray = Array.from(orderGroups.values());
        const topOrdersByLines = ordersArray
            .sort((a, b) => b.righe.length - a.righe.length)
            .slice(0, 10);

        console.log(`\n🏆 TOP 10 ORDINI PER NUMERO RIGHE:`);
        topOrdersByLines.forEach((order, index) => {
            console.log(`   ${index + 1}. Ordine ${order.numeroOrdine}:`);
            console.log(`      - Righe: ${order.righe.length}`);
            console.log(`      - Prodotti distinti: ${order.prodotti.size}`);
            console.log(`      - Totale: €${order.totaleImporto.toFixed(2)}`);
            console.log(`      - Data: ${order.dataConsegna || order.dataOrdine || 'N/A'}`);
        });

        // Salva per il report finale
        this.results.orderGroups = orderGroups;
        this.results.recordsWithoutOrderNumber = recordsWithoutOrderNumber;
    }

    /**
     * Analizza per data
     */
    analyzeByDate(records) {
        console.log('\n📅 ANALISI PER DATA:');
        console.log('═'.repeat(50));

        const dateGroups = new Map();
        
        records.forEach(record => {
            const date = record.data_consegna || record.data_ordine;
            if (!date) return;

            if (!dateGroups.has(date)) {
                dateGroups.set(date, {
                    data: date,
                    record: [],
                    ordiniDistinti: new Set(),
                    prodotti: new Set(),
                    importoTotale: 0
                });
            }

            const dateGroup = dateGroups.get(date);
            dateGroup.record.push(record);
            dateGroup.importoTotale += parseFloat(record.importo || 0);
            if (record.numero_ordine) dateGroup.ordiniDistinti.add(record.numero_ordine);
            if (record.prodotto) dateGroup.prodotti.add(record.prodotto);
        });

        const dateArray = Array.from(dateGroups.values())
            .sort((a, b) => new Date(b.data) - new Date(a.data))
            .slice(0, 10);

        console.log(`📊 ULTIME 10 DATE CON ATTIVITÀ:`);
        dateArray.forEach((dateGroup, index) => {
            console.log(`   ${index + 1}. ${dateGroup.data}:`);
            console.log(`      - Record: ${dateGroup.record.length}`);
            console.log(`      - Ordini distinti: ${dateGroup.ordiniDistinti.size}`);
            console.log(`      - Prodotti: ${dateGroup.prodotti.size}`);
            console.log(`      - Totale: €${dateGroup.importoTotale.toFixed(2)}`);
        });

        this.results.dateGroups = dateGroups;
    }

    /**
     * Analizza prodotti
     */
    analyzeProducts(records) {
        console.log('\n📦 ANALISI PRODOTTI:');
        console.log('═'.repeat(50));

        const productStats = new Map();
        
        records.forEach(record => {
            const product = record.prodotto;
            if (!product) return;

            if (!productStats.has(product)) {
                productStats.set(product, {
                    nome: product,
                    codice: record.codice_prodotto,
                    occorrenze: 0,
                    quantitaTotale: 0,
                    importoTotale: 0,
                    ordiniDistinti: new Set()
                });
            }

            const stats = productStats.get(product);
            stats.occorrenze++;
            stats.quantitaTotale += parseFloat(record.quantita || 0);
            stats.importoTotale += parseFloat(record.importo || 0);
            if (record.numero_ordine) stats.ordiniDistinti.add(record.numero_ordine);
        });

        const topProducts = Array.from(productStats.values())
            .sort((a, b) => b.occorrenze - a.occorrenze)
            .slice(0, 10);

        console.log(`📊 TOP 10 PRODOTTI PIÙ ORDINATI:`);
        topProducts.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.nome}:`);
            console.log(`      - Occorrenze: ${product.occorrenze}`);
            console.log(`      - Quantità totale: ${product.quantitaTotale}`);
            console.log(`      - Importo totale: €${product.importoTotale.toFixed(2)}`);
            console.log(`      - Ordini distinti: ${product.ordiniDistinti.size}`);
        });

        this.results.productStats = productStats;
    }

    /**
     * Genera report finale
     */
    generateFinalReport(records) {
        console.log('\n🎯 REPORT FINALE - ESSEMME SRL:');
        console.log('═'.repeat(60));

        const totalRecords = records.length;
        const distinctOrders = this.results.orderGroups.size;
        const recordsWithoutOrderNumber = this.results.recordsWithoutOrderNumber;
        const totalAmount = records.reduce((sum, r) => sum + (parseFloat(r.importo) || 0), 0);

        console.log(`📊 STATISTICHE GENERALI:`);
        console.log(`   - Record totali per ESSEMME SRL: ${totalRecords}`);
        console.log(`   - Record senza numero ordine: ${recordsWithoutOrderNumber}`);
        console.log(`   - Ordini distinti identificati: ${distinctOrders}`);
        console.log(`   - Importo totale: €${totalAmount.toFixed(2)}`);

        if (distinctOrders > 0) {
            const avgLinesPerOrder = totalRecords / distinctOrders;
            console.log(`   - Media righe per ordine: ${avgLinesPerOrder.toFixed(2)}`);
        }

        console.log(`\n🔍 INTERPRETAZIONE:`);
        
        if (distinctOrders > 0 && distinctOrders < totalRecords) {
            console.log(`   ✅ I ${totalRecords} record rappresentano RIGHE DI PRODOTTI`);
            console.log(`   ✅ Numero ordini distinti effettivi: ${distinctOrders}`);
            console.log(`   ✅ Ogni ordine contiene multiple righe prodotto`);
            console.log(`   ✅ La dicitura "97 ordini" nel sistema si riferisce a 97 RIGHE, non 97 ordini distinti`);
        } else if (distinctOrders === totalRecords) {
            console.log(`   ⚠️  Ogni record sembra rappresentare un ordine distinto`);
            console.log(`   ⚠️  Non ci sono ordini con multiple righe prodotto`);
        } else {
            console.log(`   ❓ Situazione anomala da investigare ulteriormente`);
        }

        // Esempi di ordini multi-riga
        if (this.results.orderGroups.size > 0) {
            const multiLineOrders = Array.from(this.results.orderGroups.values())
                .filter(o => o.righe.length > 1)
                .sort((a, b) => b.righe.length - a.righe.length)
                .slice(0, 3);

            if (multiLineOrders.length > 0) {
                console.log(`\n📋 ESEMPI DI ORDINI MULTI-RIGA:`);
                multiLineOrders.forEach((order, index) => {
                    console.log(`   ${index + 1}. Ordine ${order.numeroOrdine}:`);
                    console.log(`      - Righe: ${order.righe.length}`);
                    console.log(`      - Prodotti: ${order.prodotti.size}`);
                    console.log(`      - Primi 3 prodotti:`);
                    Array.from(order.prodotti).slice(0, 3).forEach(p => {
                        console.log(`        • ${p}`);
                    });
                });
            }
        }

        console.log(`\n📈 CONCLUSIONE:`);
        console.log(`   I "97 ordini" di ESSEMME SRL sono in realtà ${distinctOrders} ordini distinti`);
        console.log(`   contenenti ${totalRecords} righe di prodotti totali.`);
        console.log(`   Il sistema conta le righe, non gli ordini veri e propri.`);
    }

    /**
     * Esporta i risultati in un oggetto per uso esterno
     */
    exportResults() {
        return {
            totalRecords: this.results.totalRecords,
            distinctOrders: this.results.orderGroups?.size || 0,
            recordsWithoutOrderNumber: this.results.recordsWithoutOrderNumber || 0,
            orderGroups: Array.from(this.results.orderGroups?.values() || []),
            summary: `${this.results.orderGroups?.size || 0} ordini distinti con ${this.results.totalRecords || 0} righe totali`
        };
    }
}

// Funzione di avvio per uso diretto
async function debugEssemmeOrders() {
    const analyzer = new EssemmeOrderAnalyzer();
    await analyzer.analyzeEssemmeOrders();
    return analyzer.exportResults();
}

// Esporta per uso nella console
window.debugEssemmeOrders = debugEssemmeOrders;
window.EssemmeOrderAnalyzer = EssemmeOrderAnalyzer;

console.log('🔧 Debug script caricato. Usa debugEssemmeOrders() per avviare l\'analisi.');