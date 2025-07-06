/**
 * TEST MIDDLEWARE COUNTING BEHAVIOR
 * Test script per verificare come il middleware conta gli ordini
 */

class MiddlewareCountingTest {
    constructor() {
        this.results = {};
    }

    /**
     * Testa il comportamento del middleware nel conteggio ordini
     */
    async testMiddlewareCounting() {
        console.log('🧪 TEST: Avvio test comportamento middleware...');
        
        if (!window.supabase) {
            console.error('❌ TEST: Supabase non disponibile');
            return;
        }

        try {
            // 1. Simula il comportamento del middleware
            await this.simulateMiddlewareLogic();
            
            // 2. Testa il conteggio corretto
            await this.testCorrectCounting();
            
            // 3. Confronta i risultati
            this.compareResults();
            
        } catch (error) {
            console.error('❌ TEST: Errore durante test:', error);
        }
    }

    /**
     * Simula la logica del middleware per contare gli ordini
     */
    async simulateMiddlewareLogic() {
        console.log('\n📊 SIMULAZIONE MIDDLEWARE:');
        console.log('═'.repeat(50));

        // Replica la logica del middleware (countOrdini function)
        const supabaseData = await this.getSupabaseData();
        const ordini = supabaseData.historicalOrders?.sampleData || [];

        const clienteNorm = 'essemme';
        const ordiniCliente = ordini.filter(ordine => 
            ordine.cliente && ordine.cliente.toLowerCase().includes(clienteNorm)
        );

        console.log(`📈 Middleware simulation:`);
        console.log(`   - Dati storici totali: ${ordini.length}`);
        console.log(`   - Record ESSEMME trovati: ${ordiniCliente.length}`);
        console.log(`   - Tipo di conteggio: RIGHE (non ordini distinti)`);

        // Analisi dettagliata
        const uniqueOrderNumbers = new Set(
            ordiniCliente
                .map(o => o.numero_ordine)
                .filter(n => n && n !== null)
        );

        console.log(`   - Numeri ordine unici: ${uniqueOrderNumbers.size}`);
        console.log(`   - Differenza: ${ordiniCliente.length - uniqueOrderNumbers.size} righe extra`);

        this.results.middlewareSimulation = {
            totalRecords: ordini.length,
            essemmeRecords: ordiniCliente.length,
            uniqueOrders: uniqueOrderNumbers.size,
            extraRows: ordiniCliente.length - uniqueOrderNumbers.size
        };
    }

    /**
     * Testa il conteggio corretto (ordini distinti)
     */
    async testCorrectCounting() {
        console.log('\n✅ CONTEGGIO CORRETTO:');
        console.log('═'.repeat(50));

        // Query diretta per conteggio ordini distinti
        const { data: essemmeOrders, error } = await window.supabase
            .from('archivio_ordini_venduto')
            .select('numero_ordine, cliente, data_consegna')
            .ilike('cliente', '%ESSEMME%')
            .not('numero_ordine', 'is', null);

        if (error) {
            console.error('❌ Errore query ordini:', error);
            return;
        }

        const uniqueOrderNumbers = new Set(essemmeOrders.map(o => o.numero_ordine));
        const totalRecords = essemmeOrders.length;

        console.log(`📊 Conteggio corretto:`);
        console.log(`   - Record totali ESSEMME: ${totalRecords}`);
        console.log(`   - Ordini distinti (corretto): ${uniqueOrderNumbers.size}`);
        console.log(`   - Tipo di conteggio: ORDINI DISTINTI`);

        // Dettaglio ordini
        const orderDetails = [];
        uniqueOrderNumbers.forEach(orderNumber => {
            const orderRecords = essemmeOrders.filter(o => o.numero_ordine === orderNumber);
            orderDetails.push({
                orderNumber,
                lineCount: orderRecords.length,
                date: orderRecords[0].data_consegna
            });
        });

        // Mostra i primi 5 ordini
        console.log(`\n📋 Primi 5 ordini con dettagli:`);
        orderDetails.slice(0, 5).forEach((order, index) => {
            console.log(`   ${index + 1}. Ordine ${order.orderNumber}:`);
            console.log(`      - Righe: ${order.lineCount}`);
            console.log(`      - Data: ${order.date}`);
        });

        this.results.correctCounting = {
            totalRecords,
            uniqueOrders: uniqueOrderNumbers.size,
            orderDetails
        };
    }

    /**
     * Confronta i risultati
     */
    compareResults() {
        console.log('\n🔍 CONFRONTO RISULTATI:');
        console.log('═'.repeat(50));

        const middleware = this.results.middlewareSimulation;
        const correct = this.results.correctCounting;

        console.log(`📊 Confronto conteggi:`);
        console.log(`   - Middleware dice: ${middleware.essemmeRecords} "ordini"`);
        console.log(`   - Conteggio corretto: ${correct.uniqueOrders} ordini`);
        console.log(`   - Differenza: ${middleware.essemmeRecords - correct.uniqueOrders} righe`);

        const accuracy = (correct.uniqueOrders / middleware.essemmeRecords) * 100;
        console.log(`   - Accuratezza conteggio: ${accuracy.toFixed(1)}%`);

        console.log(`\n🎯 CONCLUSIONE:`);
        if (middleware.essemmeRecords > correct.uniqueOrders) {
            console.log(`   ✅ CONFERMATO: Il middleware conta le RIGHE, non gli ordini`);
            console.log(`   📊 ${middleware.essemmeRecords} righe = ${correct.uniqueOrders} ordini distinti`);
            console.log(`   🔧 Per correggere: contare i numero_ordine unici`);
        } else if (middleware.essemmeRecords === correct.uniqueOrders) {
            console.log(`   ⚠️  I conteggi coincidono - ogni riga è un ordine distinto`);
        } else {
            console.log(`   ❓ Situazione anomala rilevata`);
        }

        this.results.comparison = {
            middlewareCount: middleware.essemmeRecords,
            correctCount: correct.uniqueOrders,
            difference: middleware.essemmeRecords - correct.uniqueOrders,
            accuracy: accuracy,
            countsRows: middleware.essemmeRecords > correct.uniqueOrders
        };
    }

    /**
     * Simula il recupero dati come fa il middleware
     */
    async getSupabaseData() {
        // Simula SupabaseAIIntegration.getAllData()
        const { data: historicalData, error } = await window.supabase
            .from('archivio_ordini_venduto')
            .select('*')
            .limit(1000); // Limita per performance

        if (error) {
            console.error('Errore recupero dati:', error);
            return { historicalOrders: { sampleData: [] } };
        }

        return {
            historicalOrders: {
                sampleData: historicalData || []
            }
        };
    }

    /**
     * Genera fix per il middleware
     */
    generateMiddlewareFix() {
        console.log('\n🔧 PROPOSTA FIX MIDDLEWARE:');
        console.log('═'.repeat(50));

        const fixedCode = `
// VERSIONE CORRETTA della funzione countOrdini nel middleware:
async countOrdini(params) {
    try {
        console.log('📊 MIDDLEWARE: Conteggio ordini per:', params.cliente);
        
        const supabaseData = await this.supabaseAI.getAllData();
        const ordini = supabaseData.historicalOrders?.sampleData || [];
        
        if (!params.cliente) {
            // Conta ordini distinti totali
            const uniqueOrders = new Set(ordini.map(o => o.numero_ordine).filter(n => n));
            return {
                success: true,
                response: \`📊 Totale ordini distinti: \${uniqueOrders.size} (su \${ordini.length} righe)\`,
                data: { ordini: uniqueOrders.size, righe: ordini.length }
            };
        }
        
        const clienteNorm = params.cliente.toLowerCase();
        const ordiniCliente = ordini.filter(ordine => 
            ordine.cliente && ordine.cliente.toLowerCase().includes(clienteNorm)
        );
        
        if (ordiniCliente.length === 0) {
            return {
                success: true,
                response: \`❌ Nessun ordine trovato per "\${params.cliente}"\`,
                data: { ordini: 0, righe: 0 }
            };
        }
        
        // CORREZIONE: Conta ordini distinti, non righe
        const uniqueOrderNumbers = new Set(
            ordiniCliente.map(o => o.numero_ordine).filter(n => n && n !== null)
        );
        
        const ultimoOrdine = ordiniCliente.sort((a, b) => new Date(b.data_consegna || b.data_ordine) - new Date(a.data_consegna || a.data_ordine))[0];
        const nomeCliente = ordiniCliente[0].cliente;
        
        return {
            success: true,
            response: \`📊 Cliente \${nomeCliente}: \${uniqueOrderNumbers.size} ordini distinti (\${ordiniCliente.length} righe totali). Ultimo: \${ultimoOrdine.data_consegna || ultimoOrdine.data_ordine}\`,
            data: { 
                cliente: nomeCliente,
                ordini: uniqueOrderNumbers.size,      // ORDINI DISTINTI
                righe: ordiniCliente.length,          // RIGHE TOTALI  
                ultimoOrdine: ultimoOrdine.data_consegna || ultimoOrdine.data_ordine,
                dettaglio: ordiniCliente.slice(0, 3)
            }
        };
        
    } catch (error) {
        console.error('❌ Errore conteggio ordini:', error);
        return { success: false, error: error.message };
    }
}`;

        console.log(fixedCode);
        return fixedCode;
    }

    /**
     * Esporta tutti i risultati
     */
    exportResults() {
        return {
            ...this.results,
            middlewareFix: this.generateMiddlewareFix(),
            summary: {
                middlewareCountsRows: this.results.comparison?.countsRows || false,
                correctOrderCount: this.results.correctCounting?.uniqueOrders || 0,
                middlewareCount: this.results.middlewareSimulation?.essemmeRecords || 0,
                needsFix: (this.results.comparison?.countsRows || false)
            }
        };
    }
}

// Funzione di avvio
async function testMiddlewareCounting() {
    console.log('🧪 Avvio test comportamento middleware...');
    const tester = new MiddlewareCountingTest();
    await tester.testMiddlewareCounting();
    const results = tester.exportResults();
    console.log('\n✅ Test completato!');
    return results;
}

// Esporta per uso globale
window.testMiddlewareCounting = testMiddlewareCounting;
window.MiddlewareCountingTest = MiddlewareCountingTest;

console.log('🧪 Middleware Counting Test caricato. Usa testMiddlewareCounting() per eseguire i test.');