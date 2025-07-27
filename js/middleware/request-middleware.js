/**
 * REQUEST MIDDLEWARE RIABILITATO CON FIX CLIENTI/ORDINI
 * Versione funzionante che corregge la classificazione
 */

class RequestMiddleware {
    constructor(supabaseAI) {
        this.supabaseAI = supabaseAI;
        this.disabled = false;
        console.log('✅ RequestMiddleware ATTIVO - Versione con fix clienti/ordini');
    }
    
    /**
     * METODO CRITICO: Classifica correttamente clienti vs ordini
     */
    classifyRequest(query) {
        const lowercase = query.toLowerCase();
        console.log('🔍 CLASSIFY REQUEST:', query, 'lowercase:', lowercase);
        
        // 🚨 FIX PRIORITARIO: Controlla PRIMA le parole specifiche
        
        // 1. CLIENTI hanno priorità assoluta
        if (lowercase.includes('client')) {
            console.log('📊 MIDDLEWARE: Tipo richiesta: clienti');
            return 'clienti';
        }
        
        // 2. ORDINI solo se esplicitamente richiesti
        if (lowercase.includes('ordin')) {
            console.log('📊 MIDDLEWARE: Tipo richiesta: ordini');
            return 'ordini';
        }
        
        // 3. Percorsi
        if (lowercase.includes('tempo') && (lowercase.includes('da') || lowercase.includes('a'))) {
            console.log('📊 MIDDLEWARE: Tipo richiesta: percorsi');
            return 'percorsi';
        }
        
        // 4. Date
        if (lowercase.includes('quando') || lowercase.includes('data')) {
            console.log('📊 MIDDLEWARE: Tipo richiesta: data');
            return 'data';
        }
        
        // 5. Fatturato
        if (lowercase.includes('fatturato') || lowercase.includes('vendite')) {
            console.log('📊 MIDDLEWARE: Tipo richiesta: fatturato');
            return 'fatturato';
        }
        
        // 6. Default per query generiche con "quanti" - NON più "ordini"!
        if (lowercase.includes('quant') || lowercase.includes('database')) {
            console.log('📊 MIDDLEWARE: Tipo richiesta: general (non classificabile)');
            return 'general';
        }
        
        console.log('📊 MIDDLEWARE: Tipo richiesta: general');
        return 'general';
    }
    
    /**
     * Processa la richiesta basandosi sul tipo
     */
    async processRequest(query, params = {}) {
        if (this.disabled) {
            return { success: false, message: 'RequestMiddleware disabilitato' };
        }
        
        try {
            const type = this.classifyRequest(query);
            const lowercase = query.toLowerCase();
            
            console.log('🔧 MIDDLEWARE: Processando richiesta tipo:', type);
            
            // GESTIONE CLIENTI - PRIORITÀ ALTA
            if (type === 'clienti') {
                console.log('👥 MIDDLEWARE: Gestione richiesta clienti');
                
                // Rileva se è una richiesta di conteggio
                if (lowercase.includes('quant') || lowercase.includes('numero') || lowercase.includes('totale')) {
                    return await this.handleClientCount();
                }
                
                // Altri tipi di richieste clienti
                return await this.handleClientGeneral(query, params);
            }
            
            // GESTIONE ORDINI
            if (type === 'ordini') {
                console.log('📦 MIDDLEWARE: Gestione richiesta ordini');
                
                if (lowercase.includes('quant') || lowercase.includes('numero') || lowercase.includes('totale')) {
                    return await this.handleOrderCount();
                }
                
                return await this.handleOrderGeneral(query, params);
            }
            
            // GESTIONE PERCORSI
            if (type === 'percorsi') {
                return await this.handleRoute(query, params);
            }
            
            // GESTIONE DATE
            if (type === 'data') {
                return await this.handleDate(query, params);
            }
            
            // GESTIONE FATTURATO
            if (type === 'fatturato') {
                return await this.handleRevenue(query, params);
            }
            
            // FALLBACK
            console.log('❓ MIDDLEWARE: Richiesta non classificabile, passo all\'AI');
            return { success: false, reason: 'Non classificabile', passToAI: true };
            
        } catch (error) {
            console.error('❌ MIDDLEWARE: Errore processamento:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Gestisce il conteggio clienti
     */
    async handleClientCount() {
        try {
            console.log('🔢 MIDDLEWARE: Conteggio clienti richiesto');
            
            if (!this.supabaseAI) {
                throw new Error('SupabaseAI non disponibile');
            }
            
            // Prova diversi metodi per ottenere il conteggio
            let count = 0;
            
            if (typeof this.supabaseAI.getClientsCount === 'function') {
                count = await this.supabaseAI.getClientsCount();
                console.log('✅ MIDDLEWARE: Conteggio via getClientsCount():', count);
            } else if (this.supabaseAI.data && this.supabaseAI.data.clients) {
                count = this.supabaseAI.data.clients.length;
                console.log('✅ MIDDLEWARE: Conteggio via data.clients:', count);
            } else {
                // Fallback: ottieni i dati e conta
                const clientsData = await this.supabaseAI.getClientsData();
                count = clientsData.clients ? clientsData.clients.length : 0;
                console.log('✅ MIDDLEWARE: Conteggio via getClientsData():', count);
            }
            
            return {
                success: true,
                text: `Ci sono ${count} clienti nel database`,
                data: {
                    count: count,
                    type: 'clienti',
                    source: 'request-middleware'
                }
            };
            
        } catch (error) {
            console.error('❌ MIDDLEWARE: Errore conteggio clienti:', error);
            return {
                success: false,
                error: error.message,
                text: 'Errore nel recuperare il numero di clienti'
            };
        }
    }
    
    /**
     * Gestisce il conteggio ordini
     */
    async handleOrderCount() {
        try {
            console.log('🔢 MIDDLEWARE: Conteggio ordini richiesto');
            
            if (!this.supabaseAI) {
                throw new Error('SupabaseAI non disponibile');
            }
            
            let count = 0;
            
            if (typeof this.supabaseAI.getOrdersCount === 'function') {
                count = await this.supabaseAI.getOrdersCount();
            } else if (this.supabaseAI.data && this.supabaseAI.data.orders) {
                count = this.supabaseAI.data.orders.length;
            } else {
                // Fallback
                const ordersData = await this.supabaseAI.getOrdersData();
                count = ordersData.orders ? ordersData.orders.length : 0;
            }
            
            console.log('✅ MIDDLEWARE: Conteggio ordini:', count);
            
            return {
                success: true,
                text: `Ci sono ${count} ordini nel database`,
                data: {
                    count: count,
                    type: 'ordini',
                    source: 'request-middleware'
                }
            };
            
        } catch (error) {
            console.error('❌ MIDDLEWARE: Errore conteggio ordini:', error);
            return {
                success: false,
                error: error.message,
                text: 'Errore nel recuperare il numero di ordini'
            };
        }
    }
    
    /**
     * Gestisce richieste generiche sui clienti
     */
    async handleClientGeneral(query, params) {
        console.log('👥 MIDDLEWARE: Richiesta clienti generica');
        return { success: false, reason: 'Richiesta clienti generica non implementata', passToAI: true };
    }
    
    /**
     * Gestisce richieste generiche sugli ordini
     */
    async handleOrderGeneral(query, params) {
        console.log('📦 MIDDLEWARE: Richiesta ordini generica');
        return { success: false, reason: 'Richiesta ordini generica non implementata', passToAI: true };
    }
    
    /**
     * Gestisce richieste di percorso
     */
    async handleRoute(query, params) {
        console.log('🗺️ MIDDLEWARE: Richiesta percorso');
        return { success: false, reason: 'Richiesta percorso non implementata', passToAI: true };
    }
    
    /**
     * Gestisce richieste di data
     */
    async handleDate(query, params) {
        console.log('📅 MIDDLEWARE: Richiesta data');
        return { success: false, reason: 'Richiesta data non implementata', passToAI: true };
    }
    
    /**
     * Gestisce richieste di fatturato
     */
    async handleRevenue(query, params) {
        console.log('💰 MIDDLEWARE: Richiesta fatturato');
        return { success: false, reason: 'Richiesta fatturato non implementata', passToAI: true };
    }
    
    /**
     * Metodo di utilità per contare ordini (compatibilità)
     */
    async countOrdini() {
        return await this.handleOrderCount();
    }
}

// Esporta la classe
window.RequestMiddleware = RequestMiddleware;

console.log('✅ RequestMiddleware FIXED caricato e attivo');
console.log('🔧 Versione con fix prioritario clienti vs ordini');