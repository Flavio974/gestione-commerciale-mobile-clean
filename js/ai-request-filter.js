/**
 * 🤖 AI Request Filter - Filtri Intelligenti per Ridurre Costi API
 * 
 * PRINCIPIO: "Se l'AI deve cercare, hai sbagliato."
 * 
 * Questo modulo implementa il filtro intelligente lato client che:
 * 1. Analizza la richiesta utente con regex/pattern matching
 * 2. Filtra i dati localmente per includere SOLO quello che serve
 * 3. Invia payload minimale all'API AI
 * 4. Evita dati ridondanti o non pertinenti
 * 
 * OBIETTIVO: Riduzione 95% dei costi API passando da 400KB+ a 1-5KB per richieste specifiche
 */

class AIRequestFilter {
    constructor() {
        console.log('🤖 AI Request Filter inizializzato');
        
        // Pattern per rilevare diversi tipi di richieste
        this.patterns = {
            // Richieste percorsi/viaggi
            route: [
                /quanto.*tempo.*da\s+([^a]+?)\s+a\s+(.+?)[\?\.]?$/i,
                /percorso.*da\s+([^a]+?)\s+a\s+(.+?)[\?\.]?$/i,
                /strada.*da\s+([^a]+?)\s+a\s+(.+?)[\?\.]?$/i,
                /come.*arriv.*da\s+([^a]+?)\s+a\s+(.+?)[\?\.]?$/i
            ],
            
            // Richieste prodotti
            product: [
                /quanti.*([^?]+?).*ho venduto/i,
                /vendite.*([^?]+)/i,
                /prodotto.*([^?]+)/i,
                /quanto.*venduto.*([^?]+)/i
            ],
            
            // Richieste clienti
            client: [
                /cliente\s+([^?]+?).*ordini/i,
                /ordini.*cliente\s+([^?]+)/i,
                /([^?]+?).*quanti.*ordini/i,
                /fatture.*cliente\s+([^?]+)/i
            ],
            
            // Query conversazionali pure (nuove)
            conversational: [
                /^(ciao|salve|buongiorno|buonasera|hey|hi)[\s\!\?]*$/i,
                /^(grazie|thanks|ok|bene|perfetto)[\s\!\?]*$/i,
                /^(come\s+stai|come\s+va)[\s\!\?]*$/i,
                /^(arrivederci|ciao\s+ciao|a\s+presto)[\s\!\?]*$/i
            ],
            
            // Richieste ordini per data
            ordersByDate: [
                /ordini.*oggi/i,
                /ordini.*ieri/i,
                /ordini.*settimana/i,
                /ordini.*mese/i,
                /ordini.*\d{1,2}\/\d{1,2}\/\d{2,4}/i
            ]
        };
    }
    
    /**
     * Analizza il messaggio dell'utente e determina il tipo di richiesta
     * @param {string} message - Messaggio dell'utente
     * @returns {Object} - { type, params, confidence }
     */
    analyzeRequest(message) {
        console.log('🔍 Analisi richiesta:', message);
        
        // Test query conversazionali (priorità alta)
        if (this.isPureConversationalQuery(message)) {
            return {
                type: 'conversational',
                params: {},
                confidence: 0.95,
                payload: 'minimal'
            };
        }
        
        // Test richieste percorsi
        const routeMatch = this.detectRouteRequest(message);
        if (routeMatch.isRouteRequest) {
            return {
                type: 'route',
                params: routeMatch,
                confidence: 0.9,
                payload: 'specific'
            };
        }
        
        // Test richieste prodotti
        const productMatch = this.detectProductQuery(message);
        if (productMatch.isProductQuery) {
            return {
                type: 'product',
                params: productMatch,
                confidence: 0.8,
                payload: 'specific'
            };
        }
        
        // Test richieste clienti
        const clientMatch = this.detectClientQuery(message);
        if (clientMatch.isClientQuery) {
            return {
                type: 'client',
                params: clientMatch,
                confidence: 0.8,
                payload: 'specific'
            };
        }
        
        // Test ordini per data
        const ordersMatch = this.detectOrdersByDate(message);
        if (ordersMatch.isOrdersQuery) {
            return {
                type: 'ordersByDate',
                params: ordersMatch,
                confidence: 0.7,
                payload: 'filtered'
            };
        }
        
        // Fallback: richiesta generica
        return {
            type: 'generic',
            params: {},
            confidence: 0.3,
            payload: 'full'
        };
    }
    
    /**
     * Rileva se è una query conversazionale pura
     * @param {string} message
     * @returns {boolean}
     */
    isPureConversationalQuery(message) {
        const cleanMessage = message.trim().toLowerCase();
        
        return this.patterns.conversational.some(pattern => 
            pattern.test(cleanMessage)
        );
    }
    
    /**
     * Rileva richieste di percorsi/viaggi
     * @param {string} message
     * @returns {Object}
     */
    detectRouteRequest(message) {
        for (const pattern of this.patterns.route) {
            const match = message.match(pattern);
            if (match) {
                return {
                    isRouteRequest: true,
                    from: match[1]?.trim(),
                    to: match[2]?.trim(),
                    originalQuery: message
                };
            }
        }
        
        return { isRouteRequest: false };
    }
    
    /**
     * Rileva richieste sui prodotti
     * @param {string} message
     * @returns {Object}
     */
    detectProductQuery(message) {
        for (const pattern of this.patterns.product) {
            const match = message.match(pattern);
            if (match) {
                return {
                    isProductQuery: true,
                    productName: match[1]?.trim(),
                    originalQuery: message
                };
            }
        }
        
        return { isProductQuery: false };
    }
    
    /**
     * Rileva richieste sui clienti
     * @param {string} message
     * @returns {Object}
     */
    detectClientQuery(message) {
        for (const pattern of this.patterns.client) {
            const match = message.match(pattern);
            if (match) {
                return {
                    isClientQuery: true,
                    clientName: match[1]?.trim(),
                    originalQuery: message
                };
            }
        }
        
        return { isClientQuery: false };
    }
    
    /**
     * Rileva richieste ordini per data
     * @param {string} message
     * @returns {Object}
     */
    detectOrdersByDate(message) {
        for (const pattern of this.patterns.ordersByDate) {
            const match = message.match(pattern);
            if (match) {
                return {
                    isOrdersQuery: true,
                    dateQuery: match[0],
                    originalQuery: message
                };
            }
        }
        
        return { isOrdersQuery: false };
    }
    
    /**
     * Filtra i dati basandosi sul tipo di richiesta identificata
     * @param {Object} analysis - Risultato di analyzeRequest()
     * @param {Object} supabaseData - Dati completi da Supabase
     * @returns {Object} - Dati filtrati e ottimizzati
     */
    filterDataForRequest(analysis, supabaseData) {
        console.log('🎯 Filtro dati per richiesta:', analysis.type);
        
        switch (analysis.type) {
            case 'conversational':
                return this.getConversationalPayload();
                
            case 'route':
                return this.getRoutePayload(analysis.params, supabaseData);
                
            case 'product':
                return this.getProductPayload(analysis.params, supabaseData);
                
            case 'client':
                return this.getClientPayload(analysis.params, supabaseData);
                
            case 'ordersByDate':
                return this.getOrdersByDatePayload(analysis.params, supabaseData);
                
            case 'generic':
            default:
                return this.getGenericPayload(supabaseData);
        }
    }
    
    /**
     * Payload minimale per query conversazionali
     * @returns {Object}
     */
    getConversationalPayload() {
        return {
            conversationalMode: true,
            context: "L'utente sta facendo una conversazione informale",
            dataSize: "~200 bytes",
            message: "Rispondi in modo naturale e amichevole"
        };
    }
    
    /**
     * Payload specifico per richieste percorsi
     * @param {Object} params
     * @param {Object} supabaseData
     * @returns {Object}
     */
    getRoutePayload(params, supabaseData) {
        // Cerca il percorso specifico nei dati
        const routes = supabaseData?.viaggi || [];
        const specificRoute = this.findSpecificRoute(params.from, params.to, routes);
        
        if (specificRoute) {
            return {
                type: 'route_specific',
                percorso: specificRoute,
                query: params,
                dataSize: JSON.stringify(specificRoute).length + " bytes"
            };
        }
        
        // Se non trova percorso specifico, ritorna tutti i percorsi (fallback)
        return {
            type: 'route_all',
            percorsi: routes.slice(0, 20), // Limita a primi 20
            query: params,
            note: "Percorso specifico non trovato, forniti percorsi disponibili"
        };
    }
    
    /**
     * Payload specifico per richieste prodotti
     * @param {Object} params
     * @param {Object} supabaseData
     * @returns {Object}
     */
    getProductPayload(params, supabaseData) {
        const products = supabaseData?.prodotti || [];
        const specificProduct = this.findProduct(params.productName, products);
        
        if (specificProduct) {
            return {
                type: 'product_specific',
                prodotto: specificProduct,
                vendite: this.getProductSales(specificProduct, supabaseData),
                query: params
            };
        }
        
        // Fallback: prodotti simili
        const similarProducts = this.findSimilarProducts(params.productName, products);
        return {
            type: 'product_similar',
            prodotti: similarProducts.slice(0, 10),
            query: params,
            note: "Prodotto esatto non trovato, forniti prodotti simili"
        };
    }
    
    /**
     * Payload specifico per richieste clienti
     * @param {Object} params
     * @param {Object} supabaseData
     * @returns {Object}
     */
    getClientPayload(params, supabaseData) {
        const clients = supabaseData?.clienti || [];
        const specificClient = this.findClient(params.clientName, clients);
        
        if (specificClient) {
            return {
                type: 'client_specific',
                cliente: specificClient,
                ordini: this.getClientOrders(specificClient, supabaseData),
                query: params
            };
        }
        
        // Fallback: clienti simili
        const similarClients = this.findSimilarClients(params.clientName, clients);
        return {
            type: 'client_similar',
            clienti: similarClients.slice(0, 5),
            query: params,
            note: "Cliente esatto non trovato, forniti clienti simili"
        };
    }
    
    /**
     * Payload per ordini filtrati per data
     * @param {Object} params
     * @param {Object} supabaseData
     * @returns {Object}
     */
    getOrdersByDatePayload(params, supabaseData) {
        const orders = supabaseData?.ordini || [];
        const filteredOrders = this.filterOrdersByDate(params.dateQuery, orders);
        
        return {
            type: 'orders_by_date',
            ordini: filteredOrders,
            periodo: params.dateQuery,
            totale: filteredOrders.length,
            query: params
        };
    }
    
    /**
     * Payload generico con dati aggregati
     * @param {Object} supabaseData
     * @returns {Object}
     */
    getGenericPayload(supabaseData) {
        // Usa il metodo semplificato esistente
        if (supabaseData && typeof supabaseData.formatForAI_Simple === 'function') {
            return supabaseData.formatForAI_Simple();
        }
        
        // Fallback manuale
        return {
            type: 'generic_summary',
            summary: this.createDataSummary(supabaseData),
            note: "Dati aggregati per richiesta generica"
        };
    }
    
    // ===== METODI HELPER =====
    
    findSpecificRoute(from, to, routes) {
        return routes.find(route => {
            const routeFrom = route.partenza?.toLowerCase() || '';
            const routeTo = route.arrivo?.toLowerCase() || '';
            
            return routeFrom.includes(from?.toLowerCase()) && 
                   routeTo.includes(to?.toLowerCase());
        });
    }
    
    findProduct(productName, products) {
        return products.find(product => {
            const name = product.nome?.toLowerCase() || '';
            return name.includes(productName?.toLowerCase());
        });
    }
    
    findSimilarProducts(productName, products) {
        const query = productName?.toLowerCase() || '';
        return products.filter(product => {
            const name = product.nome?.toLowerCase() || '';
            return name.includes(query) || query.includes(name);
        });
    }
    
    findClient(clientName, clients) {
        return clients.find(client => {
            const name = client.nome?.toLowerCase() || '';
            return name.includes(clientName?.toLowerCase()) || 
                   clientName?.toLowerCase().includes(name);
        });
    }
    
    findSimilarClients(clientName, clients) {
        const query = clientName?.toLowerCase() || '';
        return clients.filter(client => {
            const name = client.nome?.toLowerCase() || '';
            return name.includes(query) || query.includes(name);
        });
    }
    
    getProductSales(product, supabaseData) {
        const orders = supabaseData?.ordini || [];
        return orders.filter(order => 
            order.prodotti?.some(p => p.id === product.id)
        );
    }
    
    getClientOrders(client, supabaseData) {
        const orders = supabaseData?.ordini || [];
        return orders.filter(order => order.cliente_id === client.id);
    }
    
    filterOrdersByDate(dateQuery, orders) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (dateQuery.includes('oggi')) {
            return orders.filter(order => {
                const orderDate = new Date(order.data);
                return orderDate.toDateString() === today.toDateString();
            });
        }
        
        if (dateQuery.includes('ieri')) {
            return orders.filter(order => {
                const orderDate = new Date(order.data);
                return orderDate.toDateString() === yesterday.toDateString();
            });
        }
        
        // Altri filtri per settimana, mese, etc.
        return orders.slice(0, 50); // Limita comunque per sicurezza
    }
    
    createDataSummary(supabaseData) {
        if (!supabaseData) return "Nessun dato disponibile";
        
        return {
            clienti: supabaseData.clienti?.length || 0,
            ordini: supabaseData.ordini?.length || 0,
            prodotti: supabaseData.prodotti?.length || 0,
            viaggi: supabaseData.viaggi?.length || 0,
            note: "Riassunto dati per richiesta generica"
        };
    }
    
    /**
     * Metodo principale per processare una richiesta AI
     * @param {string} message - Messaggio utente
     * @param {Object} supabaseData - Dati completi
     * @returns {Object} - { analysis, filteredData, savings }
     */
    processRequest(message, supabaseData) {
        const analysis = this.analyzeRequest(message);
        const filteredData = this.filterDataForRequest(analysis, supabaseData);
        
        const originalSize = JSON.stringify(supabaseData || {}).length;
        const filteredSize = JSON.stringify(filteredData).length;
        const savings = ((originalSize - filteredSize) / originalSize * 100).toFixed(1);
        
        console.log(`📊 Ottimizzazione payload:`, {
            tipo: analysis.type,
            originale: `${(originalSize/1024).toFixed(1)}KB`,
            filtrato: `${(filteredSize/1024).toFixed(1)}KB`,
            risparmio: `${savings}%`
        });
        
        return {
            analysis,
            filteredData,
            stats: {
                originalSize,
                filteredSize,
                savings: parseFloat(savings)
            }
        };
    }
}

// Esporta il filtro globalmente
window.AIRequestFilter = AIRequestFilter;

// Istanza singleton
window.aiRequestFilter = new AIRequestFilter();

console.log('🚀 AI Request Filter caricato e pronto!');