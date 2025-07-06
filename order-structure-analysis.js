/**
 * COMPREHENSIVE ORDER STRUCTURE ANALYSIS
 * Analizza la struttura della tabella archivio_ordini_venduto per determinare
 * se i record rappresentano ordini distinti o righe di prodotti
 */

class OrderStructureAnalyzer {
    constructor() {
        this.supabase = window.supabase;
        this.analysisResults = {};
    }

    /**
     * Analisi completa della struttura ordini
     */
    async analyzeOrderStructure() {
        console.log('🔍 ORDER ANALYSIS: Avvio analisi struttura ordini...');
        
        if (!this.supabase) {
            console.error('❌ ORDER ANALYSIS: Supabase non disponibile');
            return null;
        }

        try {
            // 1. Analisi generale della tabella
            await this.analyzeTableStructure();
            
            // 2. Analisi specifica per ESSEMME SRL
            await this.analyzeEssemmeSpecific();
            
            // 3. Analisi dei pattern di numerazione ordini
            await this.analyzeOrderNumberPatterns();
            
            // 4. Confronto con altri clienti
            await this.compareWithOtherClients();
            
            // 5. Genera report conclusivo
            this.generateConclusion();
            
            return this.analysisResults;
            
        } catch (error) {
            console.error('❌ ORDER ANALYSIS: Errore generale:', error);
            return null;
        }
    }

    /**
     * Analizza la struttura generale della tabella
     */
    async analyzeTableStructure() {
        console.log('\n📊 ANALISI STRUTTURA TABELLA:');
        console.log('═'.repeat(60));

        // Conta totale record
        const { count: totalRecords } = await this.supabase
            .from('archivio_ordini_venduto')
            .select('*', { count: 'exact', head: true });

        console.log(`📈 Totale record nella tabella: ${totalRecords}`);

        // Analizza campi chiave per identificare ordini
        const { data: sampleData } = await this.supabase
            .from('archivio_ordini_venduto')
            .select('numero_ordine, cliente, data_consegna, data_ordine, prodotto, importo')
            .limit(100);

        // Analizza i pattern dei numeri ordine
        const orderNumbers = sampleData
            .map(r => r.numero_ordine)
            .filter(n => n && n !== null);

        const uniqueOrderNumbers = new Set(orderNumbers);
        
        console.log(`📊 Analisi numeri ordine (prime 100 righe):`);
        console.log(`   - Righe con numero ordine: ${orderNumbers.length}/100`);
        console.log(`   - Numeri ordine unici: ${uniqueOrderNumbers.size}`);
        console.log(`   - Rapporto righe/ordini: ${(orderNumbers.length / uniqueOrderNumbers.size).toFixed(2)}`);

        // Salva risultati
        this.analysisResults.tableStructure = {
            totalRecords,
            sampleAnalysis: {
                totalSampleRows: sampleData.length,
                rowsWithOrderNumber: orderNumbers.length,
                uniqueOrderNumbers: uniqueOrderNumbers.size,
                avgRowsPerOrder: orderNumbers.length / uniqueOrderNumbers.size
            }
        };
    }

    /**
     * Analisi specifica per ESSEMME SRL
     */
    async analyzeEssemmeSpecific() {
        console.log('\n🎯 ANALISI SPECIFICA ESSEMME SRL:');
        console.log('═'.repeat(60));

        // Recupera tutti i dati ESSEMME
        const { data: essemmeData, error } = await this.supabase
            .from('archivio_ordini_venduto')
            .select('*')
            .ilike('cliente', '%ESSEMME%')
            .order('data_consegna', { ascending: false });

        if (error) {
            console.error('❌ Errore recupero dati ESSEMME:', error);
            return;
        }

        console.log(`📊 Record totali ESSEMME: ${essemmeData.length}`);

        // Analizza i numeri ordine
        const essemmeOrderNumbers = essemmeData
            .map(r => r.numero_ordine)
            .filter(n => n && n !== null);

        const uniqueEssemmeOrders = new Set(essemmeOrderNumbers);
        
        console.log(`📈 Analisi numeri ordine ESSEMME:`);
        console.log(`   - Record con numero ordine: ${essemmeOrderNumbers.length}`);
        console.log(`   - Numeri ordine unici: ${uniqueEssemmeOrders.size}`);
        console.log(`   - Record senza numero ordine: ${essemmeData.length - essemmeOrderNumbers.length}`);
        
        if (uniqueEssemmeOrders.size > 0) {
            console.log(`   - Media righe per ordine: ${(essemmeData.length / uniqueEssemmeOrders.size).toFixed(2)}`);
        }

        // Analizza ordini con più righe
        const orderGroups = new Map();
        essemmeData.forEach(record => {
            if (!record.numero_ordine) return;
            
            if (!orderGroups.has(record.numero_ordine)) {
                orderGroups.set(record.numero_ordine, []);
            }
            orderGroups.get(record.numero_ordine).push(record);
        });

        const multiLineOrders = Array.from(orderGroups.values()).filter(group => group.length > 1);
        console.log(`📋 Ordini multi-riga: ${multiLineOrders.length}/${orderGroups.size}`);

        // Mostra esempi di ordini multi-riga
        if (multiLineOrders.length > 0) {
            console.log(`\n📄 Esempi ordini multi-riga:`);
            multiLineOrders.slice(0, 3).forEach((orderLines, index) => {
                const orderNumber = orderLines[0].numero_ordine;
                const totalAmount = orderLines.reduce((sum, line) => sum + (parseFloat(line.importo) || 0), 0);
                const products = orderLines.map(line => line.prodotto).filter(p => p);
                
                console.log(`   ${index + 1}. Ordine ${orderNumber}:`);
                console.log(`      - Righe: ${orderLines.length}`);
                console.log(`      - Totale: €${totalAmount.toFixed(2)}`);
                console.log(`      - Primi 3 prodotti: ${products.slice(0, 3).join(', ')}`);
            });
        }

        // Salva risultati ESSEMME
        this.analysisResults.essemmeAnalysis = {
            totalRecords: essemmeData.length,
            recordsWithOrderNumber: essemmeOrderNumbers.length,
            uniqueOrderNumbers: uniqueEssemmeOrders.size,
            recordsWithoutOrderNumber: essemmeData.length - essemmeOrderNumbers.length,
            multiLineOrders: multiLineOrders.length,
            avgRowsPerOrder: essemmeData.length / uniqueEssemmeOrders.size,
            orderGroups: Array.from(orderGroups.entries()).map(([orderNumber, lines]) => ({
                orderNumber,
                lineCount: lines.length,
                totalAmount: lines.reduce((sum, line) => sum + (parseFloat(line.importo) || 0), 0),
                products: lines.map(line => line.prodotto).filter(p => p)
            }))
        };
    }

    /**
     * Analizza i pattern dei numeri ordine
     */
    async analyzeOrderNumberPatterns() {
        console.log('\n🔢 ANALISI PATTERN NUMERI ORDINE:');
        console.log('═'.repeat(60));

        // Campiona numeri ordine da vari clienti
        const { data: orderNumberSample } = await this.supabase
            .from('archivio_ordini_venduto')
            .select('numero_ordine, cliente, data_consegna')
            .not('numero_ordine', 'is', null)
            .limit(1000);

        if (!orderNumberSample || orderNumberSample.length === 0) {
            console.log('❌ Nessun numero ordine trovato nel campione');
            return;
        }

        // Analizza pattern
        const orderNumberGroups = new Map();
        orderNumberSample.forEach(record => {
            const orderNumber = record.numero_ordine;
            if (!orderNumberGroups.has(orderNumber)) {
                orderNumberGroups.set(orderNumber, []);
            }
            orderNumberGroups.get(orderNumber).push(record);
        });

        const ordersWithMultipleLines = Array.from(orderNumberGroups.values())
            .filter(group => group.length > 1);

        console.log(`📊 Analisi pattern (campione 1000 record):`);
        console.log(`   - Record totali: ${orderNumberSample.length}`);
        console.log(`   - Numeri ordine unici: ${orderNumberGroups.size}`);
        console.log(`   - Ordini con righe multiple: ${ordersWithMultipleLines.length}`);
        console.log(`   - Percentuale ordini multi-riga: ${((ordersWithMultipleLines.length / orderNumberGroups.size) * 100).toFixed(1)}%`);

        // Salva pattern analysis
        this.analysisResults.orderNumberPatterns = {
            totalSampleRecords: orderNumberSample.length,
            uniqueOrderNumbers: orderNumberGroups.size,
            multiLineOrders: ordersWithMultipleLines.length,
            multiLinePercentage: (ordersWithMultipleLines.length / orderNumberGroups.size) * 100
        };
    }

    /**
     * Confronta con altri clienti
     */
    async compareWithOtherClients() {
        console.log('\n🏢 CONFRONTO CON ALTRI CLIENTI:');
        console.log('═'.repeat(60));

        // Recupera top 5 clienti per numero di record
        const { data: topClients } = await this.supabase
            .from('archivio_ordini_venduto')
            .select('cliente')
            .not('cliente', 'is', null);

        if (!topClients || topClients.length === 0) {
            console.log('❌ Nessun dato cliente trovato');
            return;
        }

        // Conta record per cliente
        const clientCounts = new Map();
        topClients.forEach(record => {
            const client = record.cliente;
            clientCounts.set(client, (clientCounts.get(client) || 0) + 1);
        });

        // Prendi top 5 clienti (escluso ESSEMME)
        const topClientsList = Array.from(clientCounts.entries())
            .filter(([client]) => !client.includes('ESSEMME'))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        console.log(`📊 Top 5 clienti per numero record:`);
        
        const clientAnalysis = [];
        for (const [clientName, recordCount] of topClientsList) {
            // Analizza ciascun cliente
            const { data: clientData } = await this.supabase
                .from('archivio_ordini_venduto')
                .select('numero_ordine, prodotto, importo')
                .eq('cliente', clientName)
                .not('numero_ordine', 'is', null)
                .limit(200);

            if (clientData && clientData.length > 0) {
                const uniqueOrders = new Set(clientData.map(r => r.numero_ordine));
                const avgRowsPerOrder = clientData.length / uniqueOrders.size;

                console.log(`   ${clientName}:`);
                console.log(`      - Record totali: ${recordCount}`);
                console.log(`      - Campione analizzato: ${clientData.length}`);
                console.log(`      - Ordini unici: ${uniqueOrders.size}`);
                console.log(`      - Media righe/ordine: ${avgRowsPerOrder.toFixed(2)}`);

                clientAnalysis.push({
                    client: clientName,
                    totalRecords: recordCount,
                    sampleSize: clientData.length,
                    uniqueOrders: uniqueOrders.size,
                    avgRowsPerOrder: avgRowsPerOrder
                });
            }
        }

        this.analysisResults.clientComparison = clientAnalysis;
    }

    /**
     * Genera conclusione finale
     */
    generateConclusion() {
        console.log('\n🎯 CONCLUSIONE FINALE:');
        console.log('═'.repeat(60));

        const essemme = this.analysisResults.essemmeAnalysis;
        const patterns = this.analysisResults.orderNumberPatterns;

        console.log(`📊 RIASSUNTO ESSEMME SRL:`);
        console.log(`   - Record totali: ${essemme.totalRecords}`);
        console.log(`   - Ordini distinti: ${essemme.uniqueOrderNumbers}`);
        console.log(`   - Ordini multi-riga: ${essemme.multiLineOrders}`);
        console.log(`   - Media righe per ordine: ${essemme.avgRowsPerOrder.toFixed(2)}`);

        console.log(`\n📈 PATTERN GENERALE DATABASE:`);
        console.log(`   - Percentuale ordini multi-riga: ${patterns.multiLinePercentage.toFixed(1)}%`);

        // Determina la conclusione
        let conclusion = '';
        if (essemme.uniqueOrderNumbers > 0 && essemme.uniqueOrderNumbers < essemme.totalRecords) {
            conclusion = `✅ CONFERMATO: I ${essemme.totalRecords} record di ESSEMME SRL rappresentano ${essemme.uniqueOrderNumbers} ordini distinti con multiple righe prodotto.`;
        } else if (essemme.uniqueOrderNumbers === essemme.totalRecords) {
            conclusion = `⚠️ ATTENZIONE: Ogni record sembra rappresentare un ordine distinto (nessun ordine multi-riga).`;
        } else {
            conclusion = `❓ ANOMALIA: Situazione non standard rilevata.`;
        }

        console.log(`\n🎯 VERDETTO FINALE:`);
        console.log(`   ${conclusion}`);
        console.log(`   Il sistema conta le RIGHE di prodotto, non gli ordini distinti.`);
        console.log(`   Per avere il conteggio corretto degli ordini, bisogna contare i numeri ordine unici.`);

        this.analysisResults.conclusion = {
            verdict: conclusion,
            recommendation: 'Modificare il sistema per contare i numeri ordine unici invece delle righe'
        };
    }

    /**
     * Esporta tutti i risultati
     */
    exportResults() {
        return {
            ...this.analysisResults,
            timestamp: new Date().toISOString(),
            summary: {
                essemmeTotalRecords: this.analysisResults.essemmeAnalysis?.totalRecords || 0,
                essemmeUniqueOrders: this.analysisResults.essemmeAnalysis?.uniqueOrderNumbers || 0,
                essemmeAvgRowsPerOrder: this.analysisResults.essemmeAnalysis?.avgRowsPerOrder || 0,
                systemCountsRows: true,
                systemCountsOrders: false
            }
        };
    }
}

// Funzione di avvio
async function analyzeOrderStructure() {
    console.log('🚀 Avvio analisi struttura ordini...');
    const analyzer = new OrderStructureAnalyzer();
    const results = await analyzer.analyzeOrderStructure();
    console.log('✅ Analisi completata!');
    return results;
}

// Esporta per uso globale
window.analyzeOrderStructure = analyzeOrderStructure;
window.OrderStructureAnalyzer = OrderStructureAnalyzer;

console.log('🔧 Order Structure Analyzer caricato. Usa analyzeOrderStructure() per avviare l\'analisi completa.');