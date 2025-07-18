/**
 * Integrazione Supabase per AI Assistant
 * Gestisce query dati e fallback offline
 */

class SupabaseAIIntegration {
    constructor() {
        console.log('🔍 INIT: Inizializzazione SupabaseAIIntegration...');
        this.supabase = window.supabase;
        console.log('🔍 INIT: Supabase client:', !!this.supabase);
        this.cache = {
            clients: null,
            orders: null,
            documents: null,
            timeline: null,
            lastUpdate: null
        };
        this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
        this.offlineMode = false;
    }

    /**
     * Verifica se Supabase è disponibile
     */
    isSupabaseAvailable() {
        const available = this.supabase && typeof this.supabase.from === 'function';
        if (!available) {
            console.log('🔍 DEBUG Supabase availability:');
            console.log('  - this.supabase:', !!this.supabase);
            console.log('  - this.supabase.from:', typeof this.supabase?.from);
            console.log('  - window.supabaseClient:', !!window.supabaseClient);
            
            // Fallback: usa window.supabaseClient se disponibile
            if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
                console.log('🔄 Using window.supabaseClient as fallback');
                this.supabase = window.supabaseClient;
                return true;
            }
        }
        return available;
    }

    /**
     * Verifica se i dati in cache sono ancora validi
     */
    isCacheValid() {
        return this.cache.lastUpdate && 
               (Date.now() - this.cache.lastUpdate) < this.cacheTimeout;
    }

    /**
     * Invalida forzatamente la cache per il prossimo refresh
     */
    invalidateCache() {
        console.log('🔄 Invalidating AI cache...');
        this.cache.lastUpdate = 0; // Force next getAllData to refresh
        this.offlineMode = false;   // Reset offline mode
        
        // Pulisci anche cache localStorage
        try {
            localStorage.removeItem('ai_supabase_cache');
            console.log('🗑️ Local cache cleared');
        } catch (error) {
            console.warn('⚠️ Errore pulizia cache locale:', error);
        }
        
        // Force re-check di Supabase availability con window.supabaseClient
        if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
            console.log('🔄 Re-linking to window.supabaseClient during cache invalidation');
            this.supabase = window.supabaseClient;
        }
    }

    /**
     * Ottieni tutti i dati rilevanti per l'AI
     */
    async getAllData(forceRefresh = false) {
        // Usa cache se valida e non forzato il refresh
        if (!forceRefresh && this.isCacheValid()) {
            return this.cache;
        }

        // Se Supabase non è disponibile, usa dati locali
        if (!this.isSupabaseAvailable()) {
            return this.getLocalData();
        }

        try {
            // Esegui query parallele per migliore performance
            const [clients, orders, documents, timeline, percorsi, historicalOrders, products] = await Promise.all([
                this.getClients(),
                this.getOrders(),
                this.getDocuments(),
                this.getTimelineEvents(),
                this.getPercorsi(),
                this.getHistoricalOrders(), // Aggiungiamo la query per archivio_ordini_venduto
                this.getProducts() // Aggiungiamo query prodotti
            ]);

            // Aggiorna cache
            this.cache = {
                clients,
                orders,
                documents,
                timeline,
                percorsi,
                historicalOrders, // Aggiungiamo i dati storici
                products, // Aggiungiamo prodotti
                lastUpdate: Date.now()
            };

            // Salva in localStorage per fallback offline
            this.saveToLocalStorage();

            return this.cache;
        } catch (error) {
            console.error('Errore nel recupero dati Supabase:', error);
            // Fallback su dati locali in caso di errore
            return this.getLocalData();
        }
    }

    /**
     * Query clienti da Supabase
     */
    async getClients() {
        try {
            console.log('🔍 CLIENTI: Verifico connessione Supabase...', !!this.supabase);
            
            if (!this.supabase) {
                console.error('❌ CLIENTI: Supabase client non disponibile');
                return this.getClientsFromStorage();
            }

            console.log('🔍 CLIENTI: Eseguo query clients...');
            const { data, error } = await this.supabase
                .from('clients')
                .select('*')
                .order('nome', { ascending: true });

            console.log('🔍 CLIENTI: Risultato query:', { data, error });

            if (error) {
                console.error('❌ CLIENTI: Errore query:', error);
                // Fallback su localStorage
                return this.getClientsFromStorage();
            }
            
            console.log('✅ CLIENTI: Trovati', data?.length || 0, 'clienti da Supabase');
            
            // Converte formato Supabase a formato locale
            const clientsFormatted = (data || []).map(c => ({
                id: c.codice_cliente,
                codiceCliente: c.codice_cliente,
                nome: c.nome,
                contatto: c.contatto,
                via: c.via,
                numero: c.numero,
                cap: c.cap,
                citta: c.citta,
                provincia: c.provincia,
                zona: c.zona,
                telefono: c.telefono,
                priorita: c.priorita || 'media',
                giornoChiusura: c.giorno_chiusura,
                giornoDaEvitare: c.giorno_da_evitare,
                ultimaVisita: c.ultima_visita,
                momentoPreferito: c.momento_preferito,
                tempoVisitaMinuti: c.tempo_visita_minuti || 30,
                frequenzaVisiteGiorni: c.frequenza_visite_giorni || 30,
                stato: c.stato || 'attivo',
                note: c.note
            }));
            
            return clientsFormatted;
        } catch (error) {
            console.error('❌ CLIENTI: Errore generale:', error);
            return this.getClientsFromStorage();
        }
    }

    /**
     * Query ordini da Supabase
     */
    async getOrders() {
        try {
            // Tabella 'orders' non ancora creata - usa dati di fallback
            console.log('Tabella orders non disponibile, usando dati di fallback');
            return window.ordersData || [];
        } catch (error) {
            console.error('Errore query ordini:', error);
            return [];
        }
    }

    /**
     * Query documenti (DDT/Fatture) da Supabase
     */
    async getDocuments() {
        try {
            // Tabella 'documents' non ancora creata - usa dati di fallback
            console.log('Tabella documents non disponibile, usando dati di fallback');
            return window.ddtftData || [];
        } catch (error) {
            console.error('Errore query documenti:', error);
            return [];
        }
    }

    /**
     * Query prodotti da localStorage o dati locali
     */
    async getProducts() {
        try {
            console.log('🔍 PRODOTTI: Recupero prodotti da localStorage...');
            
            // Prima prova localStorage
            const savedProducts = localStorage.getItem('products');
            if (savedProducts) {
                const products = JSON.parse(savedProducts);
                console.log('✅ PRODOTTI: Trovati', products.length, 'prodotti in localStorage');
                return products;
            }
            
            // Se non ci sono prodotti salvati, usa dati di fallback window
            if (window.productsData && Array.isArray(window.productsData)) {
                console.log('✅ PRODOTTI: Trovati', window.productsData.length, 'prodotti in window.productsData');
                return window.productsData;
            }
            
            // Se non ci sono dati, genera alcuni prodotti di esempio
            console.log('⚠️ PRODOTTI: Nessun dato trovato, genero prodotti di esempio');
            return this.generateSampleProducts();
            
        } catch (error) {
            console.error('❌ PRODOTTI: Errore recupero prodotti:', error);
            return [];
        }
    }
    
    /**
     * Genera prodotti di esempio per test
     */
    generateSampleProducts() {
        return [
            { id: 'ALF001', nome: 'AGNOLOTTI PLIN C ARNE ALFIERI 1000 G', categoria: 'Pasta Fresca', prezzo: 9.43, stock: 150 },
            { id: 'ALF002', nome: 'RAVIOLI RICOTTA E SPINACI ALFIERI 500G', categoria: 'Pasta Fresca', prezzo: 7.50, stock: 200 },
            { id: 'ALF003', nome: 'TAGLIATELLE FRESCHE ALFIERI 500G', categoria: 'Pasta Fresca', prezzo: 4.50, stock: 300 },
            { id: 'MAR001', nome: 'SUGO AL RAG\u00d9 MAROTTA 400G', categoria: 'Sughi', prezzo: 5.80, stock: 100 },
            { id: 'MAR002', nome: 'PESTO GENOVESE MAROTTA 200G', categoria: 'Sughi', prezzo: 6.90, stock: 80 },
            { id: 'ROS001', nome: 'GNOCCHI DI PATATE ROSSINI 1KG', categoria: 'Pasta Fresca', prezzo: 6.50, stock: 120 },
            { id: 'ROS002', nome: 'LASAGNE FRESCHE ROSSINI 500G', categoria: 'Pasta Fresca', prezzo: 8.90, stock: 50 }
        ];
    }

    /**
     * Genera dati di test per ordini incluso GABRIELIS SRL
     */
    generateTestOrderData() {
        console.log('📊 Generando dati di test per ordini...');
        
        const today = new Date();
        const formatDate = (date) => {
            const d = new Date(date);
            return d.toISOString().split('T')[0]; // YYYY-MM-DD format
        };
        
        const testOrders = [
            // Ordini GABRIELIS SRL con date di consegna
            {
                id: 'TEST001',
                numero_ordine: 'ORD-2024-001',
                cliente: 'GABRIELIS SRL',
                data_ordine: formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)), // 7 giorni fa
                data_consegna: formatDate(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)), // 3 giorni nel futuro
                codice_prodotto: 'ALF001',
                prodotto: 'AGNOLOTTI PLIN C ARNE ALFIERI 1000 G',
                quantita: 10,
                importo: 94.30,
                indirizzo_consegna: 'Via Roma 123, 10100 Torino',
                note: 'Ordine test per GABRIELIS SRL'
            },
            {
                id: 'TEST002',
                numero_ordine: 'ORD-2024-002',
                cliente: 'GABRIELIS SRL',
                data_ordine: formatDate(new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)), // 14 giorni fa
                data_consegna: formatDate(new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)), // 10 giorni fa (consegnato)
                codice_prodotto: 'ALF002',
                prodotto: 'RAVIOLI RICOTTA E SPINACI ALFIERI 500G',
                quantita: 20,
                importo: 150.00,
                indirizzo_consegna: 'Via Milano 456, 10100 Torino',
                note: 'Ordine precedente GABRIELIS SRL'
            },
            {
                id: 'TEST003',
                numero_ordine: 'ORD-2024-003',
                cliente: 'GABRIELIS SRL',
                data_ordine: formatDate(new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000)), // 21 giorni fa
                data_consegna: formatDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)), // 7 giorni nel futuro
                codice_prodotto: 'MAR001',
                prodotto: 'SUGO AL RAGÙ MAROTTA 400G',
                quantita: 15,
                importo: 87.00,
                indirizzo_consegna: 'Via Napoli 789, 10100 Torino',
                note: 'Ordine programmato GABRIELIS SRL'
            },
            // Altri clienti per test
            {
                id: 'TEST004',
                numero_ordine: 'ORD-2024-004',
                cliente: 'ESSEMME SRL',
                data_ordine: formatDate(new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)),
                data_consegna: formatDate(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)),
                codice_prodotto: 'ROS001',
                prodotto: 'GNOCCHI DI PATATE ROSSINI 1KG',
                quantita: 25,
                importo: 162.50,
                indirizzo_consegna: 'Via Venezia 321, 10100 Torino',
                note: 'Test ESSEMME SRL'
            },
            {
                id: 'TEST005',
                numero_ordine: 'ORD-2024-005',
                cliente: 'DONAC SRL',
                data_ordine: formatDate(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)),
                data_consegna: formatDate(new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)),
                codice_prodotto: 'ALF003',
                prodotto: 'TAGLIATELLE FRESCHE ALFIERI 500G',
                quantita: 30,
                importo: 135.00,
                indirizzo_consegna: 'Via Firenze 654, 10100 Torino',
                note: 'Test DONAC SRL'
            }
        ];
        
        console.log(`✅ Generati ${testOrders.length} ordini di test, incluso GABRIELIS SRL con date di consegna`);
        return testOrders;
    }

    /**
     * Query percorsi da Supabase
     */
    async getPercorsi() {
        try {
            console.log('🔍 PERCORSI: Verifico connessione Supabase...', !!this.supabase);
            
            if (!this.supabase) {
                console.error('❌ PERCORSI: Supabase client non disponibile');
                return this.getPercorsiFromStorage();
            }

            console.log('🔍 PERCORSI: Eseguo query percorsi...');
            const { data, error } = await this.supabase
                .from('percorsi')
                .select('*')
                .order('data', { ascending: false });

            console.log('🔍 PERCORSI: Risultato query:', { data, error });

            if (error) {
                console.error('❌ PERCORSI: Errore query:', error);
                // Fallback su localStorage
                return this.getPercorsiFromStorage();
            }
            
            console.log('✅ PERCORSI: Trovati', data?.length || 0, 'percorsi da Supabase');
            
            // Converte formato Supabase a formato locale
            const percorsiFormatted = (data || []).map(p => ({
                id: p.id.toString(),
                data: p.data,
                partenza: p.partenza,
                arrivo: p.arrivo,
                km: p.km,
                minuti: p.minuti,
                durata: p.durata,
                chiaveUnivoca: p.chiave_univoca,
                coordPartenza: p.coord_partenza,
                coordArrivo: p.coord_arrivo,
                importedAt: p.imported_at
            }));
            
            return percorsiFormatted;
        } catch (error) {
            console.error('❌ PERCORSI: Errore generale:', error);
            return this.getPercorsiFromStorage();
        }
    }

    /**
     * Query eventi timeline da Supabase
     */
    async getTimelineEvents() {
        try {
            // DEBUG: Verifica connessione Supabase
            console.log('🔍 TIMELINE: Verifico connessione Supabase...', !!this.supabase);
            
            if (!this.supabase) {
                console.error('❌ TIMELINE: Supabase client non disponibile');
                return [];
            }

            // Prendi TUTTI gli eventi per test (senza filtri di data)
            console.log('🔍 TIMELINE: Eseguo query timeline_events...');
            const { data, error } = await this.supabase
                .from('timeline_events')
                .select('id, date, type, title, description, order_value')
                .order('date', { ascending: true })
                .limit(50);

            console.log('🔍 TIMELINE: Risultato query:', { data, error });

            if (error) {
                console.error('❌ TIMELINE: Errore query:', error);
                throw error;
            }
            
            console.log('✅ TIMELINE: Eventi trovati:', data?.length || 0);
            return data || [];
        } catch (error) {
            console.error('❌ TIMELINE: Errore generale:', error);
            return [];
        }
    }

    /**
     * Query dati storici ordini da archivio_ordini_venduto
     */
    async getHistoricalOrders() {
        try {
            console.log('📊 HISTORICAL: Verifico connessione Supabase...', !!this.supabase);
            
            if (!this.supabase) {
                console.error('❌ HISTORICAL: Supabase client non disponibile');
                return [];
            }

            console.log('📊 HISTORICAL: Eseguo query archivio_ordini_venduto...');
            
            // Prima conta totale record
            const { count, error: countError } = await this.supabase
                .from('archivio_ordini_venduto')
                .select('*', { count: 'exact', head: true });
            
            if (countError) {
                console.error('❌ HISTORICAL: Errore conteggio:', countError);
                throw countError;
            }
            
            console.log('📊 HISTORICAL: Totale record nella tabella:', count);
            
            // Recupera TUTTI i record per analisi complete e precise (in blocchi se necessario)
            let allData = [];
            let from = 0;
            const batchSize = 1000;
            
            console.log('📊 HISTORICAL: Scaricando tutti i record in blocchi...');
            
            while (true) {
                const { data, error } = await this.supabase
                    .from('archivio_ordini_venduto')
                    .select('*')
                    .range(from, from + batchSize - 1);
                
                if (error) {
                    console.error('❌ HISTORICAL: Errore query blocco:', error);
                    throw error;
                }
                
                if (!data || data.length === 0) break;
                
                allData = allData.concat(data);
                console.log(`📊 HISTORICAL: Scaricati ${allData.length}/${count} record...`);
                
                if (data.length < batchSize) break; // Ultimo blocco
                from += batchSize;
            }
            
            const data = allData;
            
            console.log('✅ HISTORICAL: Record recuperati:', data?.length || 0);
            
            // Pulisci i nomi dei prodotti da problemi di encoding PDF
            if (data && data.length > 0) {
                console.log('🧹 HISTORICAL: Pulizia nomi prodotti in corso...');
                data.forEach(record => {
                    if (record.prodotto) {
                        record.prodotto = this.cleanProductName(record.prodotto);
                    }
                    if (record.descrizione_prodotto) {
                        record.descrizione_prodotto = this.cleanProductName(record.descrizione_prodotto);
                    }
                    if (record.descrizione) {
                        record.descrizione = this.cleanProductName(record.descrizione);
                    }
                    if (record.nome_prodotto) {
                        record.nome_prodotto = this.cleanProductName(record.nome_prodotto);
                    }
                });
                console.log('✅ HISTORICAL: Pulizia nomi prodotti completata');
            }
            
            // Calcola statistiche aggregate
            const stats = this.calculateHistoricalStats(data || []);
            
            return {
                totalRecords: count || 0,
                sampleData: data || [],
                statistics: stats,
                lastUpdate: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ HISTORICAL: Errore generale:', error);
            
            // Fallback con dati di test se Supabase non è disponibile
            const testData = this.generateTestOrderData();
            
            // Pulisci anche i dati di test
            testData.forEach(record => {
                if (record.prodotto) {
                    record.prodotto = this.cleanProductName(record.prodotto);
                }
                if (record.descrizione_prodotto) {
                    record.descrizione_prodotto = this.cleanProductName(record.descrizione_prodotto);
                }
            });
            
            return {
                totalRecords: testData.length,
                sampleData: testData,
                statistics: this.calculateHistoricalStats(testData),
                error: error.message,
                isTestData: true
            };
        }
    }
    
    /**
     * Calcola statistiche sui dati storici
     */
    calculateHistoricalStats(data) {
        if (!data || data.length === 0) return {};
        
        const stats = {
            totalImporto: data.reduce((sum, row) => sum + (parseFloat(row.importo) || 0), 0),
            numeroOrdini: new Set(data.map(row => row.numero_ordine)).size,
            numeroClienti: new Set(data.map(row => row.cliente)).size,
            numeroProdotti: new Set(data.map(row => row.codice_prodotto)).size,
            // Top 10 clienti per fatturato
            topClienti: this.getTopClients(data),
            // Top 10 prodotti per quantità
            topProdotti: this.getTopProducts(data),
            // TOP ORDINI: Raggruppa per numero_ordine e somma importi
            topOrdini: this.getTopOrders(data),
            // Periodo dati (usa data_consegna se data_ordine è NULL)
            primaData: this.getEarliestDate(data),
            ultimaData: this.getLatestDate(data)
        };
        
        return stats;
    }
    
    /**
     * Calcola top clienti per fatturato
     */
    getTopClients(data) {
        const clientiMap = new Map();
        
        data.forEach(row => {
            const cliente = row.cliente;
            const importo = parseFloat(row.importo) || 0;
            
            if (clientiMap.has(cliente)) {
                clientiMap.set(cliente, clientiMap.get(cliente) + importo);
            } else {
                clientiMap.set(cliente, importo);
            }
        });
        
        return Array.from(clientiMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([cliente, fatturato]) => ({ cliente, fatturato }));
    }
    
    /**
     * Calcola top prodotti per quantità venduta
     */
    getTopProducts(data) {
        const prodottiMap = new Map();
        
        data.forEach(row => {
            const prodotto = row.prodotto;
            const quantita = parseFloat(row.quantita) || 0;
            
            if (prodottiMap.has(prodotto)) {
                prodottiMap.set(prodotto, prodottiMap.get(prodotto) + quantita);
            } else {
                prodottiMap.set(prodotto, quantita);
            }
        });
        
        return Array.from(prodottiMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([prodotto, quantita]) => ({ prodotto, quantita }));
    }
    
    /**
     * Calcola top ordini per fatturato totale (raggruppando per numero_ordine)
     */
    getTopOrders(data) {
        const ordiniMap = new Map();
        
        try {
            data.forEach(row => {
                const numeroOrdine = row.numero_ordine;
                const importo = parseFloat(row.importo) || 0;
                
                if (!numeroOrdine) return; // Salta righe senza numero ordine
                
                if (ordiniMap.has(numeroOrdine)) {
                    const existing = ordiniMap.get(numeroOrdine);
                    existing.totaleImporto += importo;
                    existing.numeroRighe += 1;
                    
                    // Aggiungi TUTTI i prodotti (nessun limite) - precisione completa
                    if (row.prodotto && !existing.prodotti.includes(row.prodotto)) {
                        existing.prodotti.push(row.prodotto);
                    }
                    
                    // Aggiungi dettaglio completo di ogni riga prodotto
                    if (row.codice_prodotto || row.prodotto) {
                        existing.dettagliProdotti.push({
                            codice: row.codice_prodotto || 'N/A',
                            nome: row.prodotto || 'N/A',
                            qta: parseFloat(row.quantita) || 0,
                            prezzo: parseFloat(row.prezzo_unitario || row.importo) || 0,
                            importoRiga: importo
                        });
                    }
                } else {
                    // Nuovo ordine
                    const dettagli = [];
                    if (row.codice_prodotto || row.prodotto) {
                        dettagli.push({
                            codice: row.codice_prodotto || 'N/A',
                            nome: row.prodotto || 'N/A',
                            qta: parseFloat(row.quantita) || 0,
                            prezzo: parseFloat(row.prezzo_unitario || row.importo) || 0,
                            importoRiga: importo
                        });
                    }
                    
                    ordiniMap.set(numeroOrdine, {
                        numeroOrdine: numeroOrdine,
                        cliente: row.cliente || 'N/A',
                        totaleImporto: importo,
                        numeroRighe: 1,
                        dataConsegna: row.data_consegna || 'N/A',
                        prodotti: row.prodotto ? [row.prodotto] : [],
                        dettagliProdotti: dettagli,
                        // Prodotto principale (prima riga)
                        prodottoPrincipale: row.prodotto || 'N/A',
                        codicePrincipale: row.codice_prodotto || 'N/A'
                    });
                }
            });
            
            const result = Array.from(ordiniMap.values())
                .sort((a, b) => b.totaleImporto - a.totaleImporto)
                .slice(0, 10);
                
            console.log('📊 TOP ORDERS: Generati', result.length, 'ordini top con TUTTI i prodotti');
            console.log('📊 TOP ORDERS: Primo ordine dettagli:', result[0]);
            return result;
            
        } catch (error) {
            console.error('❌ ERRORE getTopOrders:', error);
            // Fallback minimo funzionante
            const ordiniMap = new Map();
            data.forEach(row => {
                const numeroOrdine = row.numero_ordine;
                const importo = parseFloat(row.importo) || 0;
                if (!numeroOrdine) return;
                
                if (ordiniMap.has(numeroOrdine)) {
                    ordiniMap.get(numeroOrdine).totaleImporto += importo;
                } else {
                    ordiniMap.set(numeroOrdine, {
                        numeroOrdine: numeroOrdine,
                        cliente: row.cliente || 'N/A',
                        totaleImporto: importo,
                        prodottoPrincipale: row.prodotto || 'N/A'
                    });
                }
            });
            
            return Array.from(ordiniMap.values())
                .sort((a, b) => b.totaleImporto - a.totaleImporto)
                .slice(0, 10);
        }
    }
    
    /**
     * Trova la data più antica (usa data_consegna se data_ordine è NULL)
     */
    getEarliestDate(data) {
        const dates = data.map(row => row.data_consegna || row.data_ordine)
                         .filter(d => d && d !== null)
                         .sort();
        return dates[0] || null;
    }
    
    /**
     * Trova la data più recente (usa data_consegna se data_ordine è NULL)
     */
    getLatestDate(data) {
        const dates = data.map(row => row.data_consegna || row.data_ordine)
                         .filter(d => d && d !== null)
                         .sort();
        return dates[dates.length - 1] || null;
    }

    /**
     * Salva dati in localStorage per fallback offline
     */
    saveToLocalStorage() {
        try {
            localStorage.setItem('ai_supabase_cache', JSON.stringify(this.cache));
        } catch (error) {
            console.error('Errore salvataggio cache locale:', error);
        }
    }

    /**
     * Recupera dati da localStorage o usa dati di default
     */
    getLocalData() {
        this.offlineMode = true;
        
        // Prima prova localStorage
        try {
            const cached = localStorage.getItem('ai_supabase_cache');
            if (cached) {
                const data = JSON.parse(cached);
                console.log('Uso dati dalla cache locale (offline mode)');
                return data;
            }
        } catch (error) {
            console.error('Errore lettura cache locale:', error);
        }

        // Fallback su dati window globali se disponibili
        return {
            clients: this.getClientsFromStorage(),
            orders: window.ordersData || [],
            documents: window.ddtftData || [],
            timeline: window.timelineEvents || [],
            percorsi: this.getPercorsiFromStorage(),
            products: window.productsData || this.generateSampleProducts(),
            lastUpdate: Date.now(),
            offline: true
        };
    }

    /**
     * Recupera clienti dal localStorage
     */
    getClientsFromStorage() {
        try {
            const savedClients = localStorage.getItem('clients');
            if (savedClients) {
                const parsed = JSON.parse(savedClients);
                if (Array.isArray(parsed)) {
                    console.log('✅ AI: Caricati', parsed.length, 'clienti dal localStorage');
                    return parsed;
                }
            }
            console.log('⚠️ AI: Nessun cliente trovato nel localStorage');
            return [];
        } catch (error) {
            console.error('❌ AI: Errore nel caricamento clienti:', error);
            return [];
        }
    }

    /**
     * Recupera percorsi dal localStorage
     */
    getPercorsiFromStorage() {
        try {
            const savedPercorsi = localStorage.getItem('percorsi');
            if (savedPercorsi) {
                const parsed = JSON.parse(savedPercorsi);
                if (Array.isArray(parsed)) {
                    console.log('✅ AI: Caricati', parsed.length, 'percorsi dal localStorage');
                    return parsed;
                }
            }
            console.log('⚠️ AI: Nessun percorso trovato nel localStorage');
            return [];
        } catch (error) {
            console.error('❌ AI: Errore nel caricamento percorsi:', error);
            return [];
        }
    }

    /**
     * Query specifiche per risposte AI più precise
     */
    async getClientsByCity(city) {
        // Usa cache locale dato che tabella clients non esiste
        return this.cache.clients?.filter(c => 
            c.city?.toLowerCase().includes(city.toLowerCase())
        ) || [];
    }

    /**
     * Ottieni ordini in sospeso
     */
    async getPendingOrders() {
        // Usa cache locale dato che tabella orders non esiste
        return this.cache.orders?.filter(o => o.status === 'pending') || [];
    }

    /**
     * Cerca percorsi per località
     */
    async getPercorsiByLocation(location) {
        const searchTerm = location.toLowerCase();
        return this.cache.percorsi?.filter(p => 
            (p.partenza && p.partenza.toLowerCase().includes(searchTerm)) ||
            (p.arrivo && p.arrivo.toLowerCase().includes(searchTerm))
        ) || [];
    }

    /**
     * Ottieni tempo di viaggio tra due punti
     */
    async getTravelTimeBetween(partenza, arrivo) {
        if (!partenza || !arrivo) return null;
        
        const normalizeString = (str) => str.toString().toLowerCase().trim();
        const partenzaNorm = normalizeString(partenza);
        const arrivoNorm = normalizeString(arrivo);
        
        // Cerca corrispondenza esatta
        let percorso = this.cache.percorsi?.find(p => 
            normalizeString(p.partenza) === partenzaNorm && 
            normalizeString(p.arrivo) === arrivoNorm
        );
        
        // Prova il percorso inverso
        if (!percorso) {
            percorso = this.cache.percorsi?.find(p => 
                normalizeString(p.partenza) === arrivoNorm && 
                normalizeString(p.arrivo) === partenzaNorm
            );
        }
        
        if (percorso) {
            return {
                minuti: parseInt(percorso.minuti) || 0,
                km: parseFloat(percorso.km) || 0,
                percorso: percorso
            };
        }
        
        return null;
    }

    /**
     * Calcola statistiche per l'AI
     */
    calculateStats() {
        // Calcola ordini distinti dai dati storici se disponibili
        let distinctOrders = 0;
        if (this.cache.historicalOrders?.statistics?.numeroOrdini) {
            distinctOrders = this.cache.historicalOrders.statistics.numeroOrdini;
        } else if (this.cache.orders?.length > 0) {
            // Fallback: conta ordini distinti dai dati orders se disponibili
            const orderNumbers = new Set(this.cache.orders.map(o => o.numero_ordine || o.order_number || o.id).filter(n => n));
            distinctOrders = orderNumbers.size;
        } else {
            distinctOrders = this.cache.orders?.length || 0;
        }

        const stats = {
            totalClients: this.cache.clients?.length || 0,
            activeClients: this.cache.clients?.filter(c => c.status === 'active').length || 0,
            totalOrders: distinctOrders, // FIX: Usa ordini distinti invece di righe totali
            totalOrderRows: this.cache.orders?.length || 0, // Mantieni il dato delle righe totali separato
            pendingOrders: this.cache.orders?.filter(o => o.status === 'pending').length || 0,
            totalRevenue: this.cache.orders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0,
            documentsCount: this.cache.documents?.length || 0,
            totalEvents: this.cache.timeline?.length || 0,
            totalPercorsi: this.cache.percorsi?.length || 0,
            totalKmPercorsi: this.cache.percorsi?.reduce((sum, p) => sum + (parseFloat(p.km) || 0), 0) || 0,
            totalMinutiPercorsi: this.cache.percorsi?.reduce((sum, p) => sum + (parseInt(p.minuti) || 0), 0) || 0
        };

        // Calcola fatturato mensile
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        stats.monthlyRevenue = this.cache.orders?.filter(o => {
            const orderDate = new Date(o.order_date);
            return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        }).reduce((sum, o) => sum + (o.amount || 0), 0) || 0;

        return stats;
    }

    /**
     * Formatta dati per contesto AI (versione semplificata per payload grandi)
     */
    formatForAI_Simple() {
        const stats = this.calculateStats();
        const data = this.cache;

        return {
            summary: {
                totalClients: stats.totalClients,
                totalOrders: stats.totalOrders,
                totalOrderRows: stats.totalOrderRows,
                totalRevenue: stats.totalRevenue,
                lastUpdate: data.lastUpdate ? new Date(data.lastUpdate).toLocaleString('it-IT') : 'sconosciuto',
                offlineMode: this.offlineMode,
                note: `IMPORTANTE: totalOrders=${stats.totalOrders} rappresenta ORDINI DISTINTI, totalOrderRows=${stats.totalOrderRows} rappresenta RIGHE TOTALI`
            },
            // Solo statistiche aggregate per ridurre payload
            historicalOrders: data.historicalOrders ? {
                totalRecords: data.historicalOrders.totalRecords,
                totalImporto: data.historicalOrders.statistics.totalImporto,
                numeroOrdini: data.historicalOrders.statistics.numeroOrdini,
                numeroClienti: data.historicalOrders.statistics.numeroClienti,
                numeroProdotti: data.historicalOrders.statistics.numeroProdotti,
                // Solo i top 3 ordini con dettagli prodotti limitati ma informativi
                topOrdini: data.historicalOrders.statistics.topOrdini?.slice(0, 3).map(order => ({
                    numeroOrdine: order.numeroOrdine,
                    cliente: order.cliente,
                    totaleImporto: order.totaleImporto,
                    prodottoPrincipale: order.prodottoPrincipale || order.prodotti?.[0] || 'N/A',
                    numeroRighe: order.numeroRighe,
                    // Include TUTTI i prodotti con dettagli essenziali - NESSUN LIMITE
                    dettagliProdotti: order.dettagliProdotti?.map(p => ({
                        nome: p.nome || 'N/A',
                        codice: p.codice || 'N/A',
                        qta: p.qta || 0,
                        importoRiga: p.importoRiga || 0
                    })) || [],
                    // Lista semplice di TUTTI i prodotti nell'ordine - NESSUN LIMITE
                    tuttiiProdotti: order.prodotti || []
                })) || [],
                summary: `Database archivio_ordini_venduto contiene ${data.historicalOrders.totalRecords} record`
            } : {
                totalRecords: 0,
                error: 'Dati storici non disponibili'
            },
            // Includere TUTTI i percorsi per calcoli tempi di viaggio
            percorsi: data.percorsi || [],
            // Aggiungi statistiche percorsi
            percorsiStats: {
                totalPercorsi: data.percorsi?.length || 0,
                totalKm: data.percorsi?.reduce((sum, p) => sum + (parseFloat(p.km) || 0), 0) || 0,
                totalMinuti: data.percorsi?.reduce((sum, p) => sum + (parseInt(p.minuti) || 0), 0) || 0
            },
            // Clienti essenziali per riferimenti
            clients: data.clients?.slice(0, 20).map(c => ({
                name: c.name,
                city: c.city || c.citta,
                address: c.address || c.indirizzo
            })) || []
        };
    }

    /**
     * Formatta dati per contesto AI
     */
    formatForAI() {
        const stats = this.calculateStats();
        const data = this.cache;

        return {
            summary: {
                ...stats,
                lastUpdate: data.lastUpdate ? new Date(data.lastUpdate).toLocaleString('it-IT') : 'sconosciuto',
                offlineMode: this.offlineMode,
                note: `IMPORTANTE: totalOrders=${stats.totalOrders} rappresenta ORDINI DISTINTI, totalOrderRows=${stats.totalOrderRows} rappresenta RIGHE TOTALI`
            },
            clients: data.clients?.slice(0, 10) || [], // Top 10 clienti
            recentOrders: data.orders?.slice(0, 20) || [], // Ultimi 20 ordini
            recentDocuments: data.documents?.slice(0, 15) || [], // Ultimi 15 documenti
            allEvents: data.timeline?.slice(0, 10) || [], // Mostra tutti gli eventi (non solo futuri)
            percorsi: data.percorsi || [], // Tutti i percorsi disponibili
            products: data.products || [], // Tutti i prodotti disponibili
            // Aggiungi dati storici ordini con dettagli top ordini (limitati per evitare payload troppo grandi)
            historicalOrders: data.historicalOrders ? {
                totalRecords: data.historicalOrders.totalRecords,
                statistics: {
                    totalImporto: data.historicalOrders.statistics.totalImporto,
                    numeroOrdini: data.historicalOrders.statistics.numeroOrdini,
                    numeroClienti: data.historicalOrders.statistics.numeroClienti,
                    numeroProdotti: data.historicalOrders.statistics.numeroProdotti,
                    topOrdini: data.historicalOrders.statistics.topOrdini || []
                },
                lastUpdate: data.historicalOrders.lastUpdate,
                summary: `Database archivio_ordini_venduto contiene ${data.historicalOrders.totalRecords} record con ${data.historicalOrders.statistics.numeroOrdini || 0} ordini analizzati`
            } : {
                totalRecords: 0,
                statistics: {},
                error: 'Dati storici non disponibili'
            }
        };
    }

    /**
     * Sincronizza percorsi locali con Supabase
     */
    async syncPercorsiToSupabase() {
        if (!this.isSupabaseAvailable()) {
            console.log('⚠️ SYNC: Supabase non disponibile, skip sincronizzazione percorsi');
            return false;
        }

        try {
            const percorsiLocali = this.getPercorsiFromStorage();
            if (!percorsiLocali || percorsiLocali.length === 0) {
                console.log('⚠️ SYNC: Nessun percorso locale da sincronizzare');
                return true;
            }

            console.log('🔄 SYNC: Sincronizzazione', percorsiLocali.length, 'percorsi con Supabase...');

            // Prima ottieni i percorsi già presenti su Supabase
            const { data: existingPercorsi } = await this.supabase
                .from('percorsi')
                .select('chiave_univoca');

            const existingKeys = new Set(existingPercorsi?.map(p => p.chiave_univoca) || []);

            // Filtra solo i percorsi non ancora presenti
            const percorsiDaSincronizzare = percorsiLocali.filter(p => 
                p.chiaveUnivoca && !existingKeys.has(p.chiaveUnivoca)
            );

            if (percorsiDaSincronizzare.length === 0) {
                console.log('✅ SYNC: Tutti i percorsi sono già sincronizzati');
                return true;
            }

            console.log('📤 SYNC: Invio', percorsiDaSincronizzare.length, 'nuovi percorsi a Supabase');

            // Converte formato locale a formato Supabase
            const percorsiFormatted = percorsiDaSincronizzare.map(p => ({
                data: p.data,
                partenza: p.partenza,
                arrivo: p.arrivo,
                km: parseFloat(p.km || p.chilometri) || null,
                minuti: parseInt(p.minuti) || null,
                durata: p.durata,
                chiave_univoca: p.chiaveUnivoca,
                coord_partenza: p.coordPartenza || null,
                coord_arrivo: p.coordArrivo || null,
                imported_at: p.importedAt ? new Date(p.importedAt).toISOString() : new Date().toISOString()
            }));

            const { error } = await this.supabase
                .from('percorsi')
                .insert(percorsiFormatted);

            if (error) {
                console.error('❌ SYNC: Errore sincronizzazione percorsi:', error);
                return false;
            }

            console.log('✅ SYNC: Percorsi sincronizzati con successo');
            return true;

        } catch (error) {
            console.error('❌ SYNC: Errore generale sincronizzazione:', error);
            return false;
        }
    }

    /**
     * Metodo helper per query personalizzate
     */
    async customQuery(table, filters = {}, options = {}) {
        if (!this.isSupabaseAvailable()) {
            console.warn('Supabase non disponibile, query personalizzata non possibile');
            return [];
        }

        try {
            let query = this.supabase.from(table).select(options.select || '*');

            // Applica filtri
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    query = query.eq(key, value);
                }
            });

            // Applica ordinamento
            if (options.orderBy) {
                query = query.order(options.orderBy, { 
                    ascending: options.ascending ?? true 
                });
            }

            // Applica limite
            if (options.limit) {
                query = query.limit(options.limit);
            }

            const { data, error } = await query;
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Errore query personalizzata:', error);
            return [];
        }
    }
    
    /**
     * Pulisce i nomi dei prodotti da problemi di encoding/estrazione PDF
     */
    cleanProductName(productName) {
        if (!productName || typeof productName !== 'string') {
            return productName;
        }
        
        return productName
            // Fix per caratteri doppi separati erroneamente durante estrazione PDF
            .replace(/\bAC C IUGHE\b/g, 'ACCIUGHE')
            .replace(/\bC AUDA\b/g, 'CAUDA')
            .replace(/\bFRESC HI\b/g, 'FRESCHI')
            .replace(/\bGNOC C HI\b/g, 'GNOCCHI')
            .replace(/\bRAVIOL I\b/g, 'RAVIOLI')
            .replace(/\bTAJARIN\b/g, 'TAJARIN')
            .replace(/\bAGNOLOT T I\b/g, 'AGNOLOTTI')
            .replace(/\bLASAGN E\b/g, 'LASAGNE')
            .replace(/\bTORTEL L INI\b/g, 'TORTELLINI')
            .replace(/\bPAP PARDELLE\b/g, 'PAPPARDELLE')
            .replace(/\bFETT UC C INE\b/g, 'FETTUCCINE')
            .replace(/\bPENNET T E\b/g, 'PENNETTE')
            .replace(/\bRIG ATONI\b/g, 'RIGATONI')
            .replace(/\bSPAGHET T I\b/g, 'SPAGHETTI')
            .replace(/\bTROF IE\b/g, 'TROFIE')
            .replace(/\bORECC HIET T E\b/g, 'ORECCHIETTE')
            .replace(/\bGRIS S INI\b/g, 'GRISSINI')
            .replace(/\bBRUS C HET T A\b/g, 'BRUSCHETTA')
            .replace(/\bFOC AC C IA\b/g, 'FOCACCIA')
            .replace(/\bMOZ Z AREL L A\b/g, 'MOZZARELLA')
            .replace(/\bPAR MIGIANO\b/g, 'PARMIGIANO')
            .replace(/\bGOR GONZOLA\b/g, 'GORGONZOLA')
            .replace(/\bPROSC IUT T O\b/g, 'PROSCIUTTO')
            .replace(/\bSALAM E\b/g, 'SALAME')
            .replace(/\bCOPPA\b/g, 'COPPA')
            .replace(/\bPANET T ONE\b/g, 'PANETTONE')
            .replace(/\bPANDOR O\b/g, 'PANDORO')
            .replace(/\bTOR RONE\b/g, 'TORRONE')
            .replace(/\bNUT EL L A\b/g, 'NUTELLA')
            .replace(/\bAL FIERI\b/g, 'ALFIERI')
            .replace(/\bCONAD\b/g, 'CONAD')
            .replace(/\bESSEMM E\b/g, 'ESSEMME')
            .replace(/\bGABRIEL IS\b/g, 'GABRIELIS')
            .replace(/\bMARO TT A\b/g, 'MAROTTA')
            // Fix generico per pattern "X Y" dove X e Y sono lettere singole (probabile errore)
            .replace(/\b([A-Z]) ([A-Z])\b/g, '$1$2')
            // Fix per pattern "XXX X" dove l'ultima X è separata
            .replace(/\b([A-Z]{2,}) ([A-Z])\b/g, '$1$2')
            // Pulisce spazi multipli
            .replace(/\s+/g, ' ')
            .trim();
    }
}

// Esporta classe per uso globale
window.SupabaseAIIntegration = SupabaseAIIntegration;