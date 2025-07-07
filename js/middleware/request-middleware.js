/**
 * REQUEST MIDDLEWARE - Sistema Intelligente di Gestione Richieste
 * Intercetta richieste utente e decide se elaborarle direttamente o passarle all'AI
 */

class RequestMiddleware {
    constructor(supabaseAI) {
        this.supabaseAI = supabaseAI;
        
        // Keywords per classificazione richieste
        this.operativeKeywords = {
            fatturato: ['fatturato', 'venduto', 'incasso', 'guadagno', 'euro', '€'],
            ordini: ['ordini', 'ordine', 'acquisti', 'numero', 'quanti'],
            data: ['data', 'quando', 'ultimo'],
            percorsi: ['tempo', 'distanza', 'percorso', 'viaggio', 'minuti', 'km'],
            clienti: ['cliente', 'clienti', 'zona', 'nome']
        };
        
        // Pattern regex per estrazione parametri
        this.patterns = {
            // Pattern completo per "fatturato del cliente X"
            fatturato: /(?:fatturato|venduto|incasso).*?(?:con|di|del|da|cliente|per)\s+(?:cliente\s+)?([A-Za-z\s]+?)(?:\s+(?:in|con|da|per|base|ai|dati|caricati)|\?|$)/i,
            // Pattern semplice per "fatturato X"
            fatturatoSemplice: /^(?:fatturato|venduto|incasso)\s+([A-Za-z\s]+?)(?:\?|$)/i,
            ordiniCliente: /(?:quanti|numero|numeri).*ordini.*?(?:con|di|del|da|cliente|per|anche)\s+(?:cliente\s+)?([A-Za-z\s]+?)(?:\s+(?:in|con|da|per|base|ai|dati|caricati)|\?|$)/i,
            ordiniGenerici: /(?:mi\s+dici|dimmi|mostra|numero|numeri|identificativo).*(?:numero|numeri|identificativo|codici?).*(?:ordini?|dei\s+vari|vari)/i,
            // Pattern per richieste di data con cliente specifico
            dataCliente: /(?:data|quando).*(?:ultimo|ordine).*(?:di|del|da|cliente|per)\s+(?:cliente\s+)?([A-Za-z\s]+?)(?:\?|$)/i,
            // Pattern per tutte le date degli ordini
            dataTuttiOrdini: /(?:data|quando|date|dammi).*(?:tutti|tutte|altri|altre|dei|quattro|4).*(?:ordini).*(?:di|del|da|cliente|per)?\s*(?:cliente\s+)?([A-Za-z\s]+?)(?:\?|$)/i,
            // Pattern per "Date ordini [cliente]"
            dateOrdiniCliente: /^(?:date\s+ordini)\s+([A-Za-z\s]+?)(?:\?|$)/i,
            // Pattern per richieste di data di tutti gli ordini generiche (senza cliente specificato)
            dataTuttiGenerica: /(?:data|quando|date).*(?:di\s+)?(?:tutti|tutte|altri|altre).*(?:ordini)|(?:altre|altri)\s+date|(?:e\s+le\s+)?(?:altre|altri)\s+date.*(?:quali|sono)/i,
            // Pattern per richieste di data generiche
            dataGenerica: /(?:mi\s+dici|dimmi|mostra|quale).*(?:data|quando).*(?:ultimo|ordine)/i,
            tempoPercorso: /(?:tempo|minuti).*(?:da|dalla)\s+([^a]+?)\s+(?:a|alla)\s+([^?\n]+?)(?:\?|$)/i,
            clientiZona: /clienti.*(?:in|nella|di|della)\s+([^?\n]+?)(?:\?|$)/i
        };
        
        // Memoria dell'ultimo cliente consultato per contesto
        this.lastClientContext = null;
        this.lastClientTimestamp = null;
        this.contextTimeoutMinutes = 5; // Mantieni contesto per 5 minuti
        
        console.log('🤖 RequestMiddleware inizializzato');
    }
    
    /**
     * Verifica se il contesto è ancora valido
     */
    isContextValid() {
        if (!this.lastClientContext || !this.lastClientTimestamp) {
            return false;
        }
        
        const now = Date.now();
        const timeElapsed = (now - this.lastClientTimestamp) / (1000 * 60); // minuti
        
        return timeElapsed <= this.contextTimeoutMinutes;
    }
    
    /**
     * Salva il contesto cliente
     */
    saveContext(clientName) {
        this.lastClientContext = clientName;
        this.lastClientTimestamp = Date.now();
        console.log(`🧠 MIDDLEWARE: Contesto salvato per "${clientName}" (valido per ${this.contextTimeoutMinutes} minuti)`);
    }
    
    /**
     * Ottiene il contesto se valido
     */
    getValidContext() {
        if (this.isContextValid()) {
            return this.lastClientContext;
        }
        
        // Pulisci contesto scaduto
        if (this.lastClientContext) {
            console.log(`⏰ MIDDLEWARE: Contesto per "${this.lastClientContext}" scaduto`);
            this.lastClientContext = null;
            this.lastClientTimestamp = null;
        }
        
        return null;
    }
    
    /**
     * Trova l'ordine più recente usando il campo data migliore disponibile
     */
    findLatestOrder(ordini) {
        if (!ordini || ordini.length === 0) {
            return { displayDate: 'N/A', numero_ordine: 'N/A' };
        }
        
        // Campi data possibili in ordine di preferenza
        const dateFields = ['data', 'data_ordine', 'data_consegna', 'data_documento', 'created_at', 'timestamp', 'date'];
        
        let bestField = null;
        let maxValid = 0;
        
        // Trova il campo con più date valide
        for (const field of dateFields) {
            const validCount = ordini.filter(o => 
                o[field] && 
                o[field] !== null && 
                o[field] !== '' && 
                !isNaN(Date.parse(o[field]))
            ).length;
            
            if (validCount > maxValid) {
                maxValid = validCount;
                bestField = field;
            }
        }
        
        if (!bestField || maxValid === 0) {
            // Nessun campo data valido, restituisci primo ordine per numero_ordine
            const sorted = ordini.filter(o => o.numero_ordine).sort((a, b) => 
                (b.numero_ordine || '').localeCompare(a.numero_ordine || '')
            );
            
            return {
                displayDate: 'Data non disponibile',
                numero_ordine: sorted.length > 0 ? sorted[0].numero_ordine : 'N/A',
                sortField: 'numero_ordine'
            };
        }
        
        // Ordina per il campo data migliore
        const validOrders = ordini.filter(o => 
            o[bestField] && 
            o[bestField] !== null && 
            o[bestField] !== '' && 
            !isNaN(Date.parse(o[bestField]))
        );
        
        if (validOrders.length === 0) {
            return { displayDate: 'Data non disponibile', numero_ordine: 'N/A' };
        }
        
        const sorted = validOrders.sort((a, b) => new Date(b[bestField]) - new Date(a[bestField]));
        const latest = sorted[0];
        
        // Formatta la data per la visualizzazione
        const dateValue = latest[bestField];
        let displayDate;
        
        try {
            const date = new Date(dateValue);
            // Forza il formato GG/MM/AAAA italiano
            displayDate = date.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
            });
        } catch {
            displayDate = dateValue.toString();
        }
        
        return {
            displayDate,
            numero_ordine: latest.numero_ordine || 'N/A',
            sortField: bestField,
            originalDate: dateValue
        };
    }

    /**
     * Punto di ingresso principale - analizza e processa la richiesta
     */
    async processRequest(userInput) {
        try {
            console.log('🔍 MIDDLEWARE: Analizzando richiesta:', userInput);
            
            // 1. Classificazione tipo richiesta
            const requestType = this.classifyRequest(userInput);
            console.log('📊 MIDDLEWARE: Tipo richiesta:', requestType);
            
            // 2. Se non è operativa, passa all'AI
            if (requestType === 'strategic' || requestType === 'unknown') {
                console.log('🧠 MIDDLEWARE: Richiesta strategica/sconosciuta -> AI');
                return { handled: false, reason: 'Richiesta strategica - elaborazione AI' };
            }
            
            // 3. Estrazione parametri dalla richiesta
            const params = this.extractParameters(userInput, requestType);
            console.log('🔧 MIDDLEWARE: Parametri estratti:', params);
            
            // 4. Elaborazione diretta
            const result = await this.executeDirectOperation(requestType, params, userInput);
            
            if (result.success) {
                console.log('✅ MIDDLEWARE: Elaborazione completata');
                return {
                    handled: true,
                    response: result.response,
                    data: result.data,
                    type: requestType
                };
            } else {
                console.log('❌ MIDDLEWARE: Elaborazione fallita -> AI');
                return { handled: false, reason: result.error };
            }
            
        } catch (error) {
            console.error('❌ MIDDLEWARE Error:', error);
            return { handled: false, reason: 'Errore middleware: ' + error.message };
        }
    }

    /**
     * Classifica il tipo di richiesta
     */
    classifyRequest(input) {
        const inputLower = input.toLowerCase();
        
        // Parole strategiche che richiedono AI
        const strategicKeywords = [
            'consiglia', 'analizza', 'perché', 'strategia', 'ottimizza', 'meglio',
            'dovrei', 'suggerisci', 'pensa', 'valuta', 'interpreta'
        ];
        
        // Check se è richiesta strategica
        if (strategicKeywords.some(keyword => inputLower.includes(keyword))) {
            return 'strategic';
        }
        
        // Check richieste operative specifiche
        if (this.operativeKeywords.fatturato.some(kw => inputLower.includes(kw))) {
            return 'fatturato';
        }
        
        // Controlla prima le richieste di data (più specifiche)
        // Se contiene parole chiave per date è probabilmente una richiesta di data
        if (inputLower.includes('data') || inputLower.includes('quando') || 
            inputLower.includes('date') || inputLower.includes('altre date') ||
            inputLower.includes('altri date') || /e\s+le\s+altre.*date/.test(inputLower) ||
            (inputLower.includes('dammi') && inputLower.includes('ordini') && 
             (inputLower.includes('quattro') || inputLower.includes('4')))) {
            return 'data';
        }
        
        if (this.operativeKeywords.ordini.some(kw => inputLower.includes(kw))) {
            return 'ordini';
        }
        
        if (this.operativeKeywords.percorsi.some(kw => inputLower.includes(kw))) {
            return 'percorsi';
        }
        
        if (this.operativeKeywords.clienti.some(kw => inputLower.includes(kw))) {
            return 'clienti';
        }
        
        // Se è solo un nome di azienda (contiene s.r.l., srl, spa, etc) 
        // e c'è un contesto valido, presumo sia una richiesta di fatturato
        if (this.isContextValid() && /\b(s\.?r\.?l\.?|spa|s\.?n\.?c\.?|s\.?a\.?s\.?)\b/i.test(inputLower)) {
            return 'fatturato';
        }
        
        return 'unknown';
    }

    /**
     * Estrae parametri specifici dalla richiesta
     */
    extractParameters(input, requestType) {
        const params = {};
        
        switch (requestType) {
            case 'fatturato':
                let fatturatoMatch = input.match(this.patterns.fatturato);
                if (fatturatoMatch) {
                    params.cliente = fatturatoMatch[1].trim();
                } else {
                    // Prova pattern semplice "fatturato X"
                    fatturatoMatch = input.match(this.patterns.fatturatoSemplice);
                    if (fatturatoMatch) {
                        params.cliente = fatturatoMatch[1].trim();
                    }
                }
                break;
                
            case 'ordini':
                const ordiniMatch = input.match(this.patterns.ordiniCliente);
                if (ordiniMatch) {
                    params.cliente = ordiniMatch[1].trim();
                } else {
                    // Controlla se è una richiesta generica sui numeri ordine
                    const ordiniGenericiMatch = input.match(this.patterns.ordiniGenerici);
                    const validContext = this.getValidContext();
                    
                    if (ordiniGenericiMatch && validContext) {
                        params.cliente = validContext;
                        params.fromContext = true;
                    } else if (validContext) {
                        // Fallback: se c'è un contesto valido e la query contiene parole chiave ordini
                        const inputLower = input.toLowerCase();
                        if (inputLower.includes('ordini') || inputLower.includes('numero') || inputLower.includes('identificativo')) {
                            params.cliente = validContext;
                            params.fromContext = true;
                        }
                    }
                }
                break;
                
            case 'data':
                // Prima controlla "Date ordini [cliente]" - formato diretto
                let dateOrdiniMatch = input.match(this.patterns.dateOrdiniCliente);
                if (dateOrdiniMatch && dateOrdiniMatch[1] && dateOrdiniMatch[1].trim()) {
                    params.cliente = dateOrdiniMatch[1].trim();
                    params.tuttiOrdini = true;
                } else {
                    // Controlla se è una richiesta per TUTTI gli ordini con cliente specifico
                    let dataTuttiMatch = input.match(this.patterns.dataTuttiOrdini);
                    if (dataTuttiMatch && dataTuttiMatch[1] && dataTuttiMatch[1].trim()) {
                        params.cliente = dataTuttiMatch[1].trim();
                        params.tuttiOrdini = true;
                    } else {
                        // Controlla se è una richiesta per TUTTI gli ordini generica (senza cliente)
                        const dataTuttiGenericaMatch = input.match(this.patterns.dataTuttiGenerica);
                        if (dataTuttiGenericaMatch) {
                            const validContext = this.getValidContext();
                            if (validContext) {
                                params.cliente = validContext;
                                params.fromContext = true;
                                params.tuttiOrdini = true;
                            }
                        } else {
                            // Poi controlla se è per un singolo ordine
                            let dataMatch = input.match(this.patterns.dataCliente);
                            if (dataMatch) {
                                params.cliente = dataMatch[1].trim();
                            } else {
                                // Controlla se è una richiesta generica sulla data
                                const dataGenericaMatch = input.match(this.patterns.dataGenerica);
                                const validContext = this.getValidContext();
                                
                                if (dataGenericaMatch && validContext) {
                                    params.cliente = validContext;
                                    params.fromContext = true;
                                } else if (validContext) {
                                    // Fallback: se c'è un contesto valido e la query contiene parole chiave data
                                    const inputLower = input.toLowerCase();
                                    if (inputLower.includes('data') || inputLower.includes('ultimo') || inputLower.includes('quando')) {
                                        params.cliente = validContext;
                                        params.fromContext = true;
                                    }
                                }
                            }
                        }
                    }
                }
                break;
                
            case 'percorsi':
                const percorsoMatch = input.match(this.patterns.tempoPercorso);
                if (percorsoMatch) {
                    params.da = percorsoMatch[1].trim();
                    params.a = percorsoMatch[2].trim();
                }
                break;
                
            case 'clienti':
                const clientiMatch = input.match(this.patterns.clientiZona);
                if (clientiMatch) {
                    params.zona = clientiMatch[1].trim();
                }
                break;
        }
        
        return params;
    }

    /**
     * Esegue operazioni dirette senza AI
     */
    async executeDirectOperation(requestType, params, originalInput) {
        switch (requestType) {
            case 'fatturato':
                return await this.calculateFatturato(params);
                
            case 'ordini':
                return await this.countOrdini(params);
                
            case 'data':
                return await this.getUltimaData(params);
                
            case 'percorsi':
                return await this.calculatePercorso(params);
                
            case 'clienti':
                return await this.searchClienti(params);
                
            default:
                return { 
                    success: false, 
                    error: `Tipo operazione non supportato: ${requestType}` 
                };
        }
    }

    /**
     * FUNZIONE 1: Calcolo Fatturato Cliente
     */
    async calculateFatturato(params) {
        try {
            console.log('💰 MIDDLEWARE: Calcolo fatturato per:', params.cliente);
            
            // Verifica se i dati sono già caricati, altrimenti carica solo se necessario
            let ordini = this.supabaseAI.historicalOrders?.sampleData || [];
            if (ordini.length === 0) {
                console.log('📊 MIDDLEWARE: Dati non ancora caricati, caricamento necessario...');
                const supabaseData = await this.supabaseAI.getAllData();
                ordini = supabaseData.historicalOrders?.sampleData || [];
            }
            
            if (!params.cliente) {
                // Fatturato totale
                const totale = ordini.reduce((sum, ordine) => sum + (parseFloat(ordine.importo) || 0), 0);
                return {
                    success: true,
                    response: `💰 Fatturato totale: €${totale.toLocaleString('it-IT', {minimumFractionDigits: 2})} su ${ordini.length} ordini`,
                    data: { fatturato: totale, ordini: ordini.length }
                };
            }
            
            // Fatturato cliente specifico
            const clienteNorm = params.cliente.toLowerCase();
            const ordiniCliente = ordini.filter(ordine => 
                ordine.cliente && ordine.cliente.toLowerCase().includes(clienteNorm)
            );
            
            if (ordiniCliente.length === 0) {
                return {
                    success: true,
                    response: `❌ Nessun ordine trovato per "${params.cliente}"`,
                    data: { fatturato: 0, ordini: 0 }
                };
            }
            
            const fatturato = ordiniCliente.reduce((sum, ordine) => sum + (parseFloat(ordine.importo) || 0), 0);
            const nomeCliente = ordiniCliente[0].cliente;
            
            // Salva nel contesto per richieste successive
            this.saveContext(params.cliente);
            
            // Conta ordini distinti usando numero_ordine
            const ordiniDistinti = new Set(
                ordiniCliente.map(o => o.numero_ordine).filter(n => n && n !== null)
            ).size;
            
            return {
                success: true,
                response: `💰 Cliente ${nomeCliente}: €${fatturato.toLocaleString('it-IT', {minimumFractionDigits: 2})} su ${ordiniDistinti} ordini distinti (${ordiniCliente.length} righe totali)`,
                data: { 
                    cliente: nomeCliente,
                    fatturato: fatturato, 
                    ordini: ordiniDistinti,
                    righe: ordiniCliente.length,
                    dettaglio: ordiniCliente.slice(0, 5) // Prime 5 per dettaglio
                }
            };
            
        } catch (error) {
            console.error('❌ Errore calcolo fatturato:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FUNZIONE 2: Conteggio Ordini Cliente
     */
    async countOrdini(params) {
        try {
            console.log('📊 MIDDLEWARE: Conteggio ordini per:', params.cliente);
            if (params.fromContext) {
                console.log('🔄 MIDDLEWARE: Usando contesto cliente precedente:', params.cliente);
            }
            
            // Verifica se i dati sono già caricati, altrimenti carica solo se necessario
            let ordini = this.supabaseAI.historicalOrders?.sampleData || [];
            if (ordini.length === 0) {
                console.log('📊 MIDDLEWARE: Dati non ancora caricati, caricamento necessario...');
                const supabaseData = await this.supabaseAI.getAllData();
                ordini = supabaseData.historicalOrders?.sampleData || [];
            }
            
            if (!params.cliente) {
                return {
                    success: true,
                    response: `📊 Totale ordini: ${ordini.length}`,
                    data: { ordini: ordini.length }
                };
            }
            
            const clienteNorm = params.cliente.toLowerCase();
            const ordiniCliente = ordini.filter(ordine => 
                ordine.cliente && ordine.cliente.toLowerCase().includes(clienteNorm)
            );
            
            if (ordiniCliente.length === 0) {
                return {
                    success: true,
                    response: `❌ Nessun ordine trovato per "${params.cliente}"`,
                    data: { ordini: 0 }
                };
            }
            
            // Conta ordini distinti usando numero_ordine
            const ordiniDistinti = new Set(
                ordiniCliente.map(o => o.numero_ordine).filter(n => n && n !== null)
            ).size;
            
            // Salva nel contesto per richieste successive (se non già dal contesto)
            if (!params.fromContext) {
                this.saveContext(params.cliente);
            }
            
            // Analisi aggiuntiva - trova campo data migliore
            const nomeCliente = ordiniCliente[0].cliente;
            const ultimoOrdine = this.findLatestOrder(ordiniCliente);
            
            // Estrai numeri ordine unici
            const numeriOrdine = [...new Set(
                ordiniCliente.map(o => o.numero_ordine).filter(n => n && n !== null)
            )].sort();
            
            // Crea lista numeri ordine per la risposta
            const listaNumeri = numeriOrdine.length <= 10 
                ? numeriOrdine.join(', ')
                : `${numeriOrdine.slice(0, 10).join(', ')}, e altri ${numeriOrdine.length - 10}`;
            
            const contextNote = params.fromContext ? ' (dal contesto precedente)' : '';
            
            return {
                success: true,
                response: `📊 Cliente ${nomeCliente}${contextNote}: ${ordiniDistinti} ordini distinti (${ordiniCliente.length} righe totali)\n📋 Numeri ordine: ${listaNumeri}\n📅 Ultimo ordine: ${ultimoOrdine.displayDate}`,
                data: { 
                    cliente: nomeCliente,
                    ordini: ordiniDistinti,
                    righe: ordiniCliente.length,
                    numeriOrdine: numeriOrdine,
                    ultimoOrdine: ultimoOrdine.displayDate,
                    ultimoOrdineNumero: ultimoOrdine.numero_ordine,
                    dettaglio: ordiniCliente.slice(0, 3),
                    fromContext: params.fromContext || false
                }
            };
            
        } catch (error) {
            console.error('❌ Errore conteggio ordini:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FUNZIONE 3: Data Ultimo Ordine Cliente
     */
    async getUltimaData(params) {
        try {
            if (params.tuttiOrdini) {
                console.log('📅 MIDDLEWARE: Ricerca date di tutti gli ordini per:', params.cliente);
                return await this.getAllOrderDates(params);
            } else {
                console.log('📅 MIDDLEWARE: Ricerca ultima data per:', params.cliente);
                if (params.fromContext) {
                    console.log('🔄 MIDDLEWARE: Usando contesto cliente precedente:', params.cliente);
                }
            }
            
            // Verifica se i dati sono già caricati, altrimenti carica solo se necessario
            let ordini = this.supabaseAI.historicalOrders?.sampleData || [];
            if (ordini.length === 0) {
                console.log('📊 MIDDLEWARE: Dati non ancora caricati, caricamento necessario...');
                const supabaseData = await this.supabaseAI.getAllData();
                ordini = supabaseData.historicalOrders?.sampleData || [];
            }
            
            if (!params.cliente) {
                return {
                    success: true,
                    response: `📅 Richiedi la data specificando un cliente`,
                    data: { error: 'Cliente non specificato' }
                };
            }
            
            const clienteNorm = params.cliente.toLowerCase();
            const ordiniCliente = ordini.filter(ordine => 
                ordine.cliente && ordine.cliente.toLowerCase().includes(clienteNorm)
            );
            
            if (ordiniCliente.length === 0) {
                return {
                    success: true,
                    response: `❌ Nessun ordine trovato per "${params.cliente}"`,
                    data: { data: null }
                };
            }
            
            // Salva nel contesto per richieste successive (se non già dal contesto)
            if (!params.fromContext) {
                this.saveContext(params.cliente);
            }
            
            // Trova l'ordine più recente
            const nomeCliente = ordiniCliente[0].cliente;
            const ultimoOrdine = this.findLatestOrder(ordiniCliente);
            
            const contextNote = params.fromContext ? ' (dal contesto precedente)' : '';
            
            return {
                success: true,
                response: `📅 Cliente ${nomeCliente}${contextNote}: ultimo ordine ${ultimoOrdine.numero_ordine} del ${ultimoOrdine.displayDate}`,
                data: { 
                    cliente: nomeCliente,
                    ultimaData: ultimoOrdine.displayDate,
                    numeroOrdine: ultimoOrdine.numero_ordine,
                    sortField: ultimoOrdine.sortField,
                    fromContext: params.fromContext || false
                }
            };
            
        } catch (error) {
            console.error('❌ Errore ricerca ultima data:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FUNZIONE 3b: Date di Tutti gli Ordini Cliente
     */
    async getAllOrderDates(params) {
        try {
            console.log('📅 MIDDLEWARE: Recupero date di tutti gli ordini per:', params.cliente);
            
            // Verifica se i dati sono già caricati, altrimenti carica solo se necessario
            let ordini = this.supabaseAI.historicalOrders?.sampleData || [];
            if (ordini.length === 0) {
                console.log('📊 MIDDLEWARE: Dati non ancora caricati, caricamento necessario...');
                const supabaseData = await this.supabaseAI.getAllData();
                ordini = supabaseData.historicalOrders?.sampleData || [];
            }
            
            if (!params.cliente) {
                return {
                    success: true,
                    response: `📅 Specificare un cliente per vedere le date degli ordini`,
                    data: { error: 'Cliente non specificato' }
                };
            }
            
            const clienteNorm = params.cliente.toLowerCase();
            const ordiniCliente = ordini.filter(ordine => 
                ordine.cliente && ordine.cliente.toLowerCase().includes(clienteNorm)
            );
            
            if (ordiniCliente.length === 0) {
                return {
                    success: true,
                    response: `❌ Nessun ordine trovato per "${params.cliente}"`,
                    data: { ordini: [] }
                };
            }
            
            // Salva nel contesto per richieste successive
            this.saveContext(params.cliente);
            
            const nomeCliente = ordiniCliente[0].cliente;
            
            // Raggruppa ordini per numero_ordine con date
            const ordiniConDate = new Map();
            
            // Campi data possibili
            const dateFields = ['data', 'data_ordine', 'data_consegna', 'data_documento', 'created_at', 'timestamp', 'date'];
            
            ordiniCliente.forEach(ordine => {
                const numeroOrdine = ordine.numero_ordine;
                if (!numeroOrdine) return;
                
                if (!ordiniConDate.has(numeroOrdine)) {
                    // Trova la data migliore per questo ordine
                    let dataOrdine = null;
                    let fieldUsed = null;
                    
                    for (const field of dateFields) {
                        if (ordine[field] && ordine[field] !== null && ordine[field] !== '' && !isNaN(Date.parse(ordine[field]))) {
                            dataOrdine = ordine[field];
                            fieldUsed = field;
                            break;
                        }
                    }
                    
                    ordiniConDate.set(numeroOrdine, {
                        numero: numeroOrdine,
                        data: dataOrdine,
                        dataField: fieldUsed,
                        displayDate: dataOrdine ? this.formatDate(dataOrdine) : 'Data non disponibile'
                    });
                }
            });
            
            // Converti in array e ordina per data (più recenti prima)
            const ordiniArray = Array.from(ordiniConDate.values());
            const ordiniConDataValida = ordiniArray.filter(o => o.data);
            const ordiniSenzaData = ordiniArray.filter(o => !o.data);
            
            // Ordina quelli con data per data decrescente
            ordiniConDataValida.sort((a, b) => new Date(b.data) - new Date(a.data));
            
            // Combina ordini con data + ordini senza data
            const ordiniOrdinati = [...ordiniConDataValida, ...ordiniSenzaData];
            
            // Crea risposta
            const totalOrdini = ordiniOrdinati.length;
            const conData = ordiniConDataValida.length;
            const senzaData = ordiniSenzaData.length;
            
            let response = `📅 Cliente ${nomeCliente}: ${totalOrdini} ordini distinti`;
            if (senzaData > 0) {
                response += ` (${conData} con data, ${senzaData} senza data)`;
            }
            
            response += '\n\n📋 Date ordini:\n';
            
            // Mostra al massimo 10 ordini
            const ordiniToShow = ordiniOrdinati.slice(0, 10);
            ordiniToShow.forEach((ordine, index) => {
                response += `${index + 1}. ${ordine.numero} - ${ordine.displayDate}\n`;
            });
            
            if (ordiniOrdinati.length > 10) {
                response += `... e altri ${ordiniOrdinati.length - 10} ordini`;
            }
            
            return {
                success: true,
                response: response,
                data: { 
                    cliente: nomeCliente,
                    totalOrdini,
                    ordiniConData: conData,
                    ordiniSenzaData: senzaData,
                    ordini: ordiniOrdinati,
                    ordiniMostrati: ordiniToShow.length
                }
            };
            
        } catch (error) {
            console.error('❌ Errore recupero date ordini:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Utility per formattare le date
     */
    formatDate(dateValue) {
        try {
            const date = new Date(dateValue);
            // Forza il formato GG/MM/AAAA italiano
            return date.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
            });
        } catch {
            return dateValue.toString();
        }
    }

    /**
     * FUNZIONE 4: Calcolo Tempo Percorso
     */
    async calculatePercorso(params) {
        try {
            console.log('🚗 MIDDLEWARE: Calcolo percorso da:', params.da, 'a:', params.a);
            
            // Usa dati già caricati senza ricaricare
            const percorsi = this.supabaseAI.percorsi || [];
            
            if (!params.da || !params.a) {
                return { success: false, error: 'Parametri mancanti per calcolo percorso' };
            }
            
            // Normalizza nomi luoghi
            const daNorm = params.da.toLowerCase().trim();
            const aNorm = params.a.toLowerCase().trim();
            
            // Cerca percorso diretto
            let percorso = percorsi.find(p => {
                const partenza = (p.partenza || '').toLowerCase();
                const arrivo = (p.arrivo || '').toLowerCase();
                return (partenza.includes(daNorm) || daNorm.includes(partenza)) &&
                       (arrivo.includes(aNorm) || aNorm.includes(arrivo));
            });
            
            // Cerca percorso inverso
            if (!percorso) {
                percorso = percorsi.find(p => {
                    const partenza = (p.partenza || '').toLowerCase();
                    const arrivo = (p.arrivo || '').toLowerCase();
                    return (partenza.includes(aNorm) || aNorm.includes(partenza)) &&
                           (arrivo.includes(daNorm) || daNorm.includes(arrivo));
                });
            }
            
            if (!percorso) {
                return {
                    success: true,
                    response: `❌ Percorso non trovato da "${params.da}" a "${params.a}"`,
                    data: { trovato: false }
                };
            }
            
            const minuti = percorso.minuti || 0;
            const km = percorso.km || 0;
            
            return {
                success: true,
                response: `🚗 Da ${percorso.partenza} a ${percorso.arrivo}: ${minuti} minuti (${km} km)`,
                data: { 
                    partenza: percorso.partenza,
                    arrivo: percorso.arrivo,
                    minuti: minuti,
                    km: km,
                    trovato: true
                }
            };
            
        } catch (error) {
            console.error('❌ Errore calcolo percorso:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FUNZIONE 4: Ricerca Clienti (base)
     */
    async searchClienti(params) {
        try {
            console.log('👥 MIDDLEWARE: Ricerca clienti zona:', params.zona);
            
            // Usa dati già caricati senza ricaricare
            const clienti = this.supabaseAI.clients || [];
            
            if (!params.zona) {
                return {
                    success: true,
                    response: `👥 Totale clienti: ${clienti.length}`,
                    data: { clienti: clienti.length }
                };
            }
            
            const zonaNorm = params.zona.toLowerCase();
            const clientiZona = clienti.filter(cliente => {
                const zona = (cliente.zona || cliente.citta || cliente.indirizzo || '').toLowerCase();
                return zona.includes(zonaNorm);
            });
            
            if (clientiZona.length === 0) {
                return {
                    success: true,
                    response: `❌ Nessun cliente trovato nella zona "${params.zona}"`,
                    data: { clienti: 0 }
                };
            }
            
            const nomiClienti = clientiZona.slice(0, 5).map(c => c.nome || c.cliente || 'Nome sconosciuto');
            
            return {
                success: true,
                response: `👥 Zona ${params.zona}: ${clientiZona.length} clienti. Primi 5: ${nomiClienti.join(', ')}${clientiZona.length > 5 ? '...' : ''}`,
                data: { 
                    zona: params.zona,
                    clienti: clientiZona.length,
                    lista: clientiZona.slice(0, 10) // Prime 10 per dettaglio
                }
            };
            
        } catch (error) {
            console.error('❌ Errore ricerca clienti:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export per uso in altri moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RequestMiddleware;
}

console.log('✅ RequestMiddleware caricato');