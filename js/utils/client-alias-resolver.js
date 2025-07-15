/**
 * Client Alias Resolver
 * Gestisce la risoluzione dei nomi clienti attraverso alias multipli
 */

class ClientAliasResolver {
    constructor() {
        this.aliases = new Map(); // cache degli alias
        this.lastSync = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
        
        console.log('🔗 ClientAliasResolver inizializzato');
    }
    
    /**
     * Inizializza il resolver caricando gli alias
     */
    async init() {
        await this.loadAliases();
    }
    
    /**
     * Carica gli alias dal database o localStorage
     */
    async loadAliases() {
        try {
            console.log('🔄 Caricamento alias clienti...');
            
            // Prima prova da Supabase (usa supabaseClient)
            if (window.supabaseClient) {
                await this.loadFromSupabase();
            } else {
                console.log('📦 Supabase non disponibile, uso localStorage');
                this.loadFromLocalStorage();
            }
            
            this.lastSync = Date.now();
            console.log(`✅ Alias caricati: ${this.aliases.size} clienti`);
            
        } catch (error) {
            console.error('❌ Errore caricamento alias:', error);
            this.loadFromLocalStorage(); // Fallback
        }
    }
    
    /**
     * Carica alias da Supabase
     */
    async loadFromSupabase() {
        const { data, error } = await window.supabaseClient
            .from('clients')
            .select('id, nome');
            
        if (error) {
            throw error;
        }
        
        // Popola cache
        this.aliases.clear();
        
        if (data) {
            data.forEach(client => {
                const clientName = client.nome || client.name;
                
                if (clientName && clientName.trim()) {
                    // Aggiungi nome principale
                    this.aliases.set(
                        clientName.toLowerCase().trim(), 
                        {
                            id: client.id,
                            nome_principale: clientName,
                            tipo: 'principale'
                        }
                    );
                    
                    // Aggiungi varianti automatiche del nome
                    this.addNameVariants(clientName, client.id);
                }
            });
        }
        
        // Salva in localStorage per fallback
        this.saveToLocalStorage();
    }
    
    /**
     * Aggiunge varianti automatiche del nome cliente
     */
    addNameVariants(clientName, clientId) {
        const baseKey = {
            id: clientId,
            nome_principale: clientName,
            tipo: 'variante'
        };
        
        // Varianti comuni
        const variants = [
            // Rimuovi punti
            clientName.replace(/\./g, ''),
            // Rimuovi spazi extra
            clientName.replace(/\s+/g, ' '),
            // Solo le prime parole (per nomi molto lunghi)
            clientName.split(' ').slice(0, 3).join(' '),
            // Senza abbreviazioni comuni
            clientName.replace(/\bS\.S\.S\./gi, 'SSS')
                     .replace(/\bS\.R\.L\./gi, 'SRL')
                     .replace(/\bS\.P\.A\./gi, 'SPA')
        ];
        
        // Aggiungi alias specifici per clienti problematici
        this.addSpecificAliases(clientName, clientId, variants);
        
        variants.forEach(variant => {
            if (variant && variant.trim() && variant !== clientName) {
                const normalizedVariant = variant.toLowerCase().trim();
                if (!this.aliases.has(normalizedVariant)) {
                    this.aliases.set(normalizedVariant, baseKey);
                }
            }
        });
    }
    
    /**
     * Aggiunge alias specifici per clienti problematici
     */
    addSpecificAliases(clientName, clientId, variants) {
        const baseKey = {
            id: clientId,
            nome_principale: clientName,
            tipo: 'alias_vocale'
        };
        
        // Mapping specifici per problemi di riconoscimento vocale
        const specificMappings = {
            'ESSEMME SRL': ['SM', 'S.M.', 'ESSE EMME', 'ESSEMME', 'S M', 'ESSEEMME'],
            'ESSEMME': ['SM', 'S.M.', 'ESSE EMME', 'S M', 'ESSEEMME'],
            'DONAC SRL': ['DONAC', 'D.O.N.A.C.', 'DONACESSERL', 'DONAC SRL'],
            'AGRIMONTANA SPA': ['AGRIMONTANA', 'AGRI MONTANA', 'AGRIMONTANA SPA']
        };
        
        // Cerca match per il nome cliente
        const clientNameUpper = clientName.toUpperCase();
        let matchedAliases = [];
        
        // Match esatto
        if (specificMappings[clientNameUpper]) {
            matchedAliases = specificMappings[clientNameUpper];
        } else {
            // Match parziale
            for (const [key, aliases] of Object.entries(specificMappings)) {
                if (clientNameUpper.includes(key) || key.includes(clientNameUpper)) {
                    matchedAliases = aliases;
                    break;
                }
            }
        }
        
        // Aggiungi gli alias trovati
        matchedAliases.forEach(alias => {
            const normalizedAlias = alias.toLowerCase().trim();
            if (!this.aliases.has(normalizedAlias)) {
                this.aliases.set(normalizedAlias, baseKey);
                console.log(`🔗 Alias specifico aggiunto: "${alias}" → "${clientName}"`);
            }
        });
    }
    
    /**
     * Carica da localStorage
     */
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('client_aliases');
            if (stored) {
                const data = JSON.parse(stored);
                this.aliases = new Map(data.aliases);
                this.lastSync = data.timestamp;
                console.log('📦 Alias caricati da localStorage');
            } else {
                // Inizializza alias predefiniti se non esistono
                this.initializeDefaultAliases();
            }
        } catch (error) {
            console.error('❌ Errore caricamento da localStorage:', error);
            this.aliases.clear();
            this.initializeDefaultAliases();
        }
    }
    
    /**
     * Inizializza alias predefiniti hardcoded
     */
    initializeDefaultAliases() {
        console.log('🔧 Inizializzazione alias predefiniti...');
        
        // Alias predefiniti per problemi vocali comuni
        const defaultAliases = [
            { key: 'sm', client: 'ESSEMME SRL', type: 'alias_vocale' },
            { key: 's.m.', client: 'ESSEMME SRL', type: 'alias_vocale' },
            { key: 's m', client: 'ESSEMME SRL', type: 'alias_vocale' },
            { key: 'esse emme', client: 'ESSEMME SRL', type: 'alias_vocale' },
            { key: 'essemme', client: 'ESSEMME SRL', type: 'alias_vocale' },
            { key: 'esseemme', client: 'ESSEMME SRL', type: 'alias_vocale' },
            { key: 'donac', client: 'DONAC SRL', type: 'alias_vocale' },
            { key: 'd.o.n.a.c.', client: 'DONAC SRL', type: 'alias_vocale' },
            { key: 'agrimontana', client: 'AGRIMONTANA SPA', type: 'alias_vocale' },
            { key: 'agri montana', client: 'AGRIMONTANA SPA', type: 'alias_vocale' }
        ];
        
        defaultAliases.forEach(alias => {
            this.aliases.set(alias.key, {
                id: `default_${alias.key}`,
                nome_principale: alias.client,
                tipo: alias.type
            });
        });
        
        console.log(`✅ Alias predefiniti inizializzati: ${this.aliases.size} elementi`);
        this.saveToLocalStorage();
    }
    
    /**
     * Salva in localStorage
     */
    saveToLocalStorage() {
        try {
            const data = {
                aliases: Array.from(this.aliases.entries()),
                timestamp: this.lastSync
            };
            localStorage.setItem('client_aliases', JSON.stringify(data));
        } catch (error) {
            console.error('❌ Errore salvataggio localStorage:', error);
        }
    }
    
    /**
     * Verifica se la cache è scaduta
     */
    isCacheExpired() {
        if (!this.lastSync) return true;
        return (Date.now() - this.lastSync) > this.cacheTimeout;
    }
    
    /**
     * Risolve un nome cliente ai suoi alias
     * @param {string} inputName - Nome inserito dall'utente
     * @returns {Object} - Risultato della risoluzione
     */
    async resolveClientName(inputName) {
        if (!inputName || typeof inputName !== 'string') {
            return {
                found: false,
                input: inputName,
                message: 'Nome non valido'
            };
        }
        
        // Aggiorna cache se necessario
        if (this.isCacheExpired()) {
            await this.loadAliases();
        }
        
        const searchName = inputName.toLowerCase().trim();
        
        // 1. Cerca match esatto
        const exactMatch = this.aliases.get(searchName);
        if (exactMatch) {
            console.log(`✅ Match esatto: "${inputName}" → "${exactMatch.nome_principale}"`);
            return {
                found: true,
                input: inputName,
                resolved: exactMatch.nome_principale,
                clientId: exactMatch.id,
                matchType: 'exact',
                aliasType: exactMatch.tipo
            };
        }
        
        // 2. Cerca match parziale
        const partialMatches = [];
        
        for (const [alias, client] of this.aliases.entries()) {
            // Match parziale: il nome inserito è contenuto nell'alias
            if (alias.includes(searchName) || searchName.includes(alias)) {
                partialMatches.push({
                    alias: alias,
                    client: client,
                    score: this.calculateMatchScore(searchName, alias)
                });
            }
        }
        
        // Ordina per score decrescente
        partialMatches.sort((a, b) => b.score - a.score);
        
        if (partialMatches.length > 0) {
            const bestMatch = partialMatches[0];
            console.log(`🔍 Match parziale: "${inputName}" → "${bestMatch.client.nome_principale}" (score: ${bestMatch.score})`);
            
            return {
                found: true,
                input: inputName,
                resolved: bestMatch.client.nome_principale,
                clientId: bestMatch.client.id,
                matchType: 'partial',
                aliasType: bestMatch.client.tipo,
                score: bestMatch.score,
                alternatives: partialMatches.slice(1, 3).map(m => m.client.nome_principale) // Prime 2 alternative
            };
        }
        
        // 3. Nessun match trovato
        console.log(`❌ Nessun match per: "${inputName}"`);
        return {
            found: false,
            input: inputName,
            message: 'Cliente non trovato',
            suggestions: this.getSuggestions(searchName)
        };
    }
    
    /**
     * Calcola score di match tra due stringhe
     */
    calculateMatchScore(input, alias) {
        // Algoritmo semplice di scoring
        let score = 0;
        
        // Match esatto = 100
        if (input === alias) return 100;
        
        // Lunghezza relativa
        const lengthRatio = Math.min(input.length, alias.length) / Math.max(input.length, alias.length);
        score += lengthRatio * 50;
        
        // Conta caratteri comuni
        const commonChars = this.countCommonChars(input, alias);
        score += (commonChars / Math.max(input.length, alias.length)) * 30;
        
        // Bonus se uno contiene l'altro
        if (alias.includes(input) || input.includes(alias)) {
            score += 20;
        }
        
        return score;
    }
    
    /**
     * Conta caratteri comuni tra due stringhe
     */
    countCommonChars(str1, str2) {
        const chars1 = str1.split('');
        const chars2 = str2.split('');
        let common = 0;
        
        chars1.forEach(char => {
            const index = chars2.indexOf(char);
            if (index !== -1) {
                common++;
                chars2.splice(index, 1); // Rimuovi per evitare doppi conteggi
            }
        });
        
        return common;
    }
    
    /**
     * Ottieni suggerimenti per nomi simili
     */
    getSuggestions(searchName) {
        const suggestions = [];
        
        for (const [alias, client] of this.aliases.entries()) {
            if (alias.includes(searchName.substring(0, 3)) || 
                searchName.includes(alias.substring(0, 3))) {
                suggestions.push(client.nome_principale);
            }
        }
        
        // Rimuovi duplicati e prendi i primi 3
        return [...new Set(suggestions)].slice(0, 3);
    }
    
    /**
     * Aggiunge un nuovo alias per un cliente
     */
    async addAlias(clientId, newAlias) {
        try {
            if (window.supabaseClient) {
                // Aggiungi tramite Supabase
                const { data, error } = await window.supabaseClient.rpc('add_client_alias', {
                    client_id: clientId,
                    new_alias: newAlias
                });
                
                if (error) throw error;
                
                if (data) {
                    // Ricarica cache
                    await this.loadAliases();
                    return { success: true, message: 'Alias aggiunto con successo' };
                } else {
                    return { success: false, message: 'Alias già presente' };
                }
            } else {
                return { success: false, message: 'Supabase non disponibile' };
            }
        } catch (error) {
            console.error('❌ Errore aggiunta alias:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Rimuove un alias da un cliente
     */
    async removeAlias(clientId, oldAlias) {
        try {
            if (window.supabaseClient) {
                const { data, error } = await window.supabaseClient.rpc('remove_client_alias', {
                    client_id: clientId,
                    old_alias: oldAlias
                });
                
                if (error) throw error;
                
                if (data) {
                    await this.loadAliases();
                    return { success: true, message: 'Alias rimosso con successo' };
                } else {
                    return { success: false, message: 'Alias non trovato' };
                }
            } else {
                return { success: false, message: 'Supabase non disponibile' };
            }
        } catch (error) {
            console.error('❌ Errore rimozione alias:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Ottieni tutti gli alias di un cliente
     */
    getClientAliases(clientName) {
        const resolved = this.resolveClientName(clientName);
        if (!resolved.found) return [];
        
        const aliases = [];
        for (const [alias, client] of this.aliases.entries()) {
            if (client.nome_principale === resolved.resolved) {
                aliases.push({
                    alias: alias,
                    tipo: client.tipo
                });
            }
        }
        
        return aliases;
    }
    
    /**
     * Forza ricaricamento della cache
     */
    async forceReload() {
        this.lastSync = null;
        await this.loadAliases();
    }
}

// Export globale
window.ClientAliasResolver = ClientAliasResolver;

console.log('🔗 ClientAliasResolver module loaded');