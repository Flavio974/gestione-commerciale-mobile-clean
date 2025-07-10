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
            clienti: ['cliente', 'clienti', 'zona', 'nome'],
            valore_massimo: ['valore', 'elevato', 'maggiore', 'massimo', 'più alto', 'superiore'],
            valore_minimo: ['valore', 'minimo', 'più basso', 'inferiore', 'minore', 'più piccolo'],
            valore_medio: ['valore', 'medio', 'media', 'mediamente', 'in media', 'average']
        };
        
        // Pattern regex per estrazione parametri
        this.patterns = {
            // Pattern completo per "fatturato del cliente X"
            fatturato: /(?:fatturato|venduto|incasso).*?(?:con|di|del|da|cliente|per)\s+(?:cliente\s+)?([A-Za-z\s]+?)(?:\s+(?:in|con|da|per|base|ai|dati|caricati)|\?|$)/i,
            // Pattern semplice per "fatturato X"
            fatturatoSemplice: /^(?:fatturato|venduto|incasso)\s+([A-Za-z\s]+?)(?:\?|$)/i,
            ordiniCliente: /(?:quanti|numero|numeri).*ordini.*?(?:con|di|del|da|cliente|per|anche)\s+(?:cliente\s+)?([A-Za-z\s]+?)(?:\s+(?:in|con|da|per|base|ai|dati|caricati)|\?|$)/i,
            ordiniGenerici: /(?:mi\s+dici|dimmi|mostra|numero|numeri|identificativo).*(?:numero|numeri|identificativo|codici?).*(?:ordini?|dei\s+vari|vari)/i,
            // Pattern per conteggio ordini generici (senza cliente specifico)
            ordiniTotali: /(?:quanti|numero|numeri).*(?:ordini?).*(?:ci\s+sono|totali?|nel\s+database|complessivi?|in\s+tutto)(?:\?|$)/i,
      righeOrdine: /(?:quante|numero|numeri).*(?:righe?|prodotti?).*(?:contiene|ha|nell?['']?ordine|ordini?).*(?:database|totali?)?(?:\?|$)/i,
            // Pattern per richieste di data con cliente specifico
            dataCliente: /(?:data|quando).*(?:ultimo|ordine).*(?:di|del|da|cliente|per)\s+(?:cliente\s+)?([A-Za-z\s]+?)(?:\?|$)/i,
            // Pattern per tutte le date degli ordini
            dataTuttiOrdini: /(?:data|quando|date|dammi).*(?:tutti|tutte|altri|altre|dei|quattro|4).*(?:ordini).*(?:di|del|da|cliente|per)?\s*(?:cliente\s+)?([A-Za-z\s]+?)(?:\?|$)/i,
            // Pattern per "Date ordini [cliente]" o "Date degli ordini di [cliente]"
            dateOrdiniCliente: /(?:date\s+(?:degli\s+)?ordini)(?:\s+di)?\s+([A-Za-z\s]+?)(?:\?|$)/i,
            // Pattern per richieste di data di tutti gli ordini generiche (senza cliente specificato)
            dataTuttiGenerica: /(?:data|quando|date).*(?:di\s+)?(?:tutti|tutte|altri|altre).*(?:ordini)|(?:altre|altri)\s+date|(?:e\s+le\s+)?(?:altre|altri)\s+date.*(?:quali|sono)/i,
            // Pattern per "Date degli ordini?" senza cliente (generico)
            dateOrdiniGenerico: /^(?:date\s+(?:degli\s+)?ordini)\s*(?:\?|$)/i,
            // Pattern per richieste di data generiche
            dataGenerica: /(?:mi\s+dici|dimmi|mostra|quale).*(?:data|quando).*(?:ultimo|ordine)/i,
            // Pattern per prodotti negli ordini di un cliente
            prodottiOrdine: /(?:prodotti|composto).*(?:ordine.*cliente|cliente)[\s:]*([^?]+?)(?:\?|$)/i,
            tempoPercorso: /(?:tempo|minuti).*(?:da|dalla)\s+([^a]+?)\s+(?:a|alla)\s+([^?\n]+?)(?:\?|$)/i,
            clientiZona: /clienti.*(?:in|nella|di|della)\s+([^?\n]+?)(?:\?|$)/i,
            // Pattern per valore massimo degli ordini
            valoreMaxOrdine: /(?:chi|quale|cliente|attribuito).*(?:ordine|ordini).*(?:valore|importo).*(?:più\s+elevato|massimo|maggiore|superiore|più\s+alto)/i,
            clienteValoreMax: /(?:cliente|di\s+chi).*(?:ordine|ordini).*(?:valore|importo).*(?:più\s+elevato|massimo|maggiore|superiore|più\s+alto)/i,
            // Pattern per valore minimo degli ordini
            valoreMinOrdine: /(?:chi|quale|cliente|attribuito).*(?:ordine|ordini).*(?:valore|importo).*(?:più\s+basso|minimo|minore|inferiore|più\s+piccolo)/i,
            clienteValoreMin: /(?:cliente|di\s+chi).*(?:ordine|ordini).*(?:valore|importo).*(?:più\s+basso|minimo|minore|inferiore|più\s+piccolo)/i,
            // Pattern per valore medio degli ordini
            valoreMedioOrdine: /(?:quale|quanto|valore|importo).*(?:medio|media|mediamente|in\s+media).*(?:ordine|ordini|fatturato|vendite)/i,
            fatturatotMedio: /(?:fatturato|vendite|incasso).*(?:medio|media|mediamente|in\s+media)/i,
            // Pattern per periodi temporali nelle domande di valore
            periodoTemporale: /(?:nella|nel|durante|in)?\s*(?:settimana|mese|giorno|anno|trimestre|semestre)\s*(\d+|scorso|scorsa|corrente|attuale|ultimo|ultima|questo|questa)?\s*(?:del)?\s*(\d{4})?/i,
            settimanaSpecifica: /settimana\s*(\d+)(?:\s*del\s*(\d{4}))?/i,
            meseSpecifico: /mese\s*(\d+|gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s*del\s*(\d{4}))?/i,
            giornoSpecifico: /giorno\s*(\d+)(?:\s*del\s*mese)?(?:\s*(\d+))?(?:\s*del\s*(\d{4}))?/i
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
     * Normalizza nome cliente per matching più flessibile
     */
    normalizeClientName(clienteName) {
        if (!clienteName || typeof clienteName !== 'string') {
            return '';
        }
        
        return clienteName
            .toLowerCase()
            .trim()
            // Rimuovi punteggiatura finale (? ! .)
            .replace(/[?!.]+$/, '')
            // Normalizza abbreviazioni comuni
            .replace(/\bs\.s\.s\./gi, 'sss')
            .replace(/\bs\.s\./gi, 'ss')
            .replace(/\bs\.r\.l\./gi, 'srl')
            .replace(/\bs\.p\.a\./gi, 'spa')
            .replace(/\baz\./gi, 'az')
            .replace(/\bagr\./gi, 'agr')
            // Normalizza spazi multipli
            .replace(/\s+/g, ' ')
            .trim();
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
        
        // Debug per vedere quale campo data è stato scelto e il valore
        console.log('📅 DEBUG findLatestOrder:', {
            bestField: bestField,
            dateValue: dateValue,
            originalOrder: latest,
            allDateFields: {
                data: latest.data,
                data_ordine: latest.data_ordine,
                data_consegna: latest.data_consegna,
                data_documento: latest.data_documento,
                created_at: latest.created_at,
                timestamp: latest.timestamp,
                date: latest.date
            }
        });
        
        try {
            const date = new Date(dateValue);
            // Debug della data parsata
            console.log('📅 DEBUG Date parsing:', {
                originalValue: dateValue,
                parsedDate: date.toString(),
                formatted: date.toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric'
                })
            });
            
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
            
            // BLOCCO PRIORITARIO: Richieste temporali devono essere gestite dal sistema semantico
            if (requestType === 'temporal_blocked') {
                console.log('🚫 MIDDLEWARE: Richiesta temporale BLOCCATA - passa al sistema semantico');
                return { handled: false, reason: 'Richiesta temporale - sistema semantico' };
            }
            
            // 2. Se non è operativa, passa all'AI
            if (requestType === 'strategic' || requestType === 'unknown') {
                console.log('🧠 MIDDLEWARE: Richiesta strategica/sconosciuta -> AI');
                return { handled: false, reason: 'Richiesta strategica - elaborazione AI' };
            }
            
            // 3. Estrazione parametri dalla richiesta
            const params = this.extractParameters(userInput, requestType);
            params.originalInput = userInput; // Aggiungi l'input originale ai parametri
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
        console.log('🔍 CLASSIFY REQUEST:', input, 'lowercase:', inputLower);
        
        // BLOCCO ASSOLUTO: Richieste di data/giorno corrente - NON DEVONO MAI essere gestite qui!
        if (inputLower.includes('che data è') ||
            inputLower.includes('data di oggi') ||
            inputLower.includes('data corrente') ||
            inputLower.includes('in che data siamo') ||
            inputLower.includes('che giorno è') ||
            inputLower.includes('che data sarà') ||
            inputLower.includes('che data era') ||
            inputLower.includes('che data avevamo')) {
            console.log('🚫 BLOCCO ASSOLUTO: Richiesta temporale - deve essere gestita dal sistema semantico');
            return 'temporal_blocked';
        }
        
        // CONTROLLO ULTRA-PRIORITARIO: Richieste specifiche di SOLO numero settimana (deve essere PRIMO)
        if (/(?:dammi\s+solo|solo)\s+.*(?:numero|n\.?).*(?:prossima\s+settimana|settimana\s+prossima)/i.test(input) ||
            /(?:dammi\s+solo|solo)\s+.*(?:prossima\s+settimana|settimana\s+prossima)/i.test(input) ||
            /(?:dammi|dimmi|voglio)\s+(?:solo\s+)?(?:il\s+)?numero\s+(?:della\s+)?settimana(?:\s+corrente|\s+attuale|\s+odierna)?$/i.test(input) ||
            /^numero\s+(?:della\s+)?settimana$/i.test(input) ||
            /^settimana\s+numero$/i.test(input)) {
            console.log('🎯 MATCH ULTRA-PRIORITARIO: Solo numero settimana specifico');
            return 'solo_numero_settimana';
        }
        
        // CONTROLLO ULTRA-PRIORITARIO: Numero settimana futura (tra X settimane)
        if (/(?:dammi|dimmi)\s+.*(?:numero|n\.?).*settimana.*tra\s+\d+\s+settimane?/i.test(input) ||
            /(?:dammi|dimmi)\s+.*(?:numero|n\.?).*tra\s+\d+\s+settimane?/i.test(input)) {
            console.log('🎯 MATCH ULTRA-PRIORITARIO: Numero settimana futura');
            return 'settimane_future';
        }
        
        // CONTROLLO PRIORITARIO: Richieste sui prodotti degli ordini
        if ((inputLower.includes('prodotti') || inputLower.includes('composto')) && 
            (inputLower.includes('ordine') || inputLower.includes('cliente'))) {
            console.log('🎯 MATCH DIRETTO: Prodotti ordine cliente');
            return 'prodotti_ordine';
        }
        
        // CONTROLLO PRIORITARIO: Richieste di conteggio ordini 
        if (inputLower.includes('quanti') && inputLower.includes('ordini') && inputLower.includes('database')) {
            console.log('🎯 MATCH DIRETTO: Conteggio ordini database');
            return 'ordini';
        }
        
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
        
        // Controlla prima le richieste di conteggio ordini (prima delle richieste di data)
        const ordiniTotaliPattern = /(?:quanti|numero|numeri).*(?:ordini?).*(?:ci\s+sono|totali?|nel\s+database|complessivi?|in\s+tutto)(?:\?|$)/i;
        if (ordiniTotaliPattern.test(input)) {
            console.log('🎯 PATTERN ORDINI TOTALI MATCH:', input);
            return 'ordini';
        }
        
        // Controlla richieste di conteggio righe ordine
        if (/(?:quante|numero|numeri).*(?:righe?|prodotti?).*(?:contiene|ha|nell?['']?ordine|ordini?).*(?:database|totali?)?(?:\?|$)/i.test(input)) {
            return 'ordini';
        }
        
        // Controlla richieste di date generiche degli ordini
        if ((/quale.*data.*ordini|in.*quale.*data.*ordini|quando.*ordini|date.*ordini|settimana.*ordini|generati.*ordini/i.test(input) ||
            /ordini.*generati|ordini.*fatti|ordini.*creati|ordini.*data|ordini.*quando|ordini.*settimana/i.test(input) ||
            /quando.*sono.*stati.*fatti|quando.*stati.*fatti|fatti.*ordini|creati.*ordini|data.*fatti|settimana.*fatti/i.test(input) ||
            /^data\s+ordini?\??$/i.test(input) || /^date\s+ordini?\??$/i.test(input) || /^quando\s+ordini?\??$/i.test(input) ||
            /^data\s+degli\s+ordini?\??$/i.test(input) || /^date\s+degli\s+ordini?\??$/i.test(input) ||
            /data\s+di\s+ogni\s+ordine/i.test(input) || /date\s+di\s+ogni\s+ordine/i.test(input) || /data\s+ordine/i.test(input) ||
            /tutte\s+le\s+date/i.test(input) || /date\s+tutti/i.test(input) ||
            /che\s+data\s+hanno.*ordini/i.test(input) || /data\s+hanno.*ordini/i.test(input) || 
            /ordini.*presenti.*database.*data/i.test(input) || /data.*ordini.*database/i.test(input) ||
            /date\s+degli\s+ordini/i.test(input) || /quando.*stati.*generati/i.test(input)) &&
            !(/(?:quanti|numero|numeri).*(?:ordini?)/i.test(input))) {
            console.log('🎯 PATTERN DATE ORDINI GENERICHE MATCH:', input);
            return 'date_ordini_generiche';
        }
        
        // Controlla le richieste di data (più specifiche)
        // Se contiene parole chiave per date è probabilmente una richiesta di data
        // Escludi "database" e richieste di conteggio dalla parola "data"
        if (((/\bdata\b/.test(inputLower) && !inputLower.includes('database') && !(/(?:quanti|numero|numeri).*(?:ordini?)/i.test(input))) || 
            inputLower.includes('quando') || 
            inputLower.includes('date') || inputLower.includes('altre date') ||
            inputLower.includes('altri date') || /e\s+le\s+altre.*date/.test(inputLower) ||
            (inputLower.includes('dammi') && inputLower.includes('ordini') && 
             (inputLower.includes('quattro') || inputLower.includes('4')))) &&
            !(/(?:quanti|numero|numeri).*(?:ordini?|righe?)/i.test(input))) {
            return 'data';
        }
        
        if (this.operativeKeywords.ordini.some(kw => inputLower.includes(kw))) {
            return 'ordini';
        }
        
        if (this.operativeKeywords.percorsi.some(kw => inputLower.includes(kw))) {
            return 'percorsi';
        }
        
        // Controlla richieste di valore massimo prima delle richieste generiche su clienti
        if (this.patterns.valoreMaxOrdine.test(input) || this.patterns.clienteValoreMax.test(input)) {
            return 'valore_massimo';
        }
        
        // Controlla richieste di valore minimo
        if (this.patterns.valoreMinOrdine.test(input) || this.patterns.clienteValoreMin.test(input)) {
            return 'valore_minimo';
        }
        
        // Controlla richieste di valore medio
        if (this.patterns.valoreMedioOrdine.test(input) || this.patterns.fatturatotMedio.test(input)) {
            return 'valore_medio';
        }
        
        
        // Controlla richieste di settimane future/calcoli
        if (/la\s+prossima\s+settimana|settimana\s+prossima|che\s+settimana\s+sarà|settimana\s+successiva/i.test(input)) {
            console.log('🎯 MATCH DIRETTO: Prossima settimana');
            return 'prossima_settimana';
        }
        
        // Controlla richieste di settimane future con numero (tra X settimane)
        if (/tra\s+(\d+)\s+settimane?|in\s+(\d+)\s+settimane?|dopo\s+(\d+)\s+settimane?/i.test(input)) {
            console.log('🎯 MATCH DIRETTO: Settimane future');
            return 'settimane_future';
        }
        
        // Controlla richieste di ordini per settimana specifica
        if (/(?:nella|in)\s+settimana\s+(?:numero\s+)?(\d+).*(?:ordini|quanti|numero)/i.test(input) ||
            /(?:ordini|quanti).*(?:nella|in)\s+settimana\s+(?:numero\s+)?(\d+)/i.test(input) ||
            /settimana\s+(?:numero\s+)?(\d+).*(?:ordini|quanti)/i.test(input)) {
            console.log('🎯 MATCH DIRETTO: Ordini per settimana specifica');
            return 'ordini_per_settimana';
        }
        
        // Controlla richieste di fatturato per settimana specifica
        if (/(?:nella|in)\s+settimana\s+(?:numero\s+)?(\d+).*(?:fatturato|venduto|incasso)/i.test(input) ||
            /(?:fatturato|venduto|incasso).*(?:nella|in)\s+settimana\s+(?:numero\s+)?(\d+)/i.test(input) ||
            /settimana\s+(?:numero\s+)?(\d+).*(?:fatturato|venduto)/i.test(input)) {
            console.log('🎯 MATCH DIRETTO: Fatturato per settimana specifica');
            return 'fatturato_per_settimana';
        }
        
        // Controlla richieste di dettagli settimana specifica
        if (/settimana\s+(?:numero\s+)?(\d+).*(?:data|date|inizio|fine|inizia|finisce|quando|mese)/i.test(input) ||
            /(?:inizio|fine).*settimana\s+(?:numero\s+)?(\d+)/i.test(input) ||
            /dammi.*(?:inizio|fine).*settimana\s+(?:numero\s+)?(\d+)/i.test(input) ||
            /settimana\s+(?:numero\s+)?(\d+).*che\s+mese/i.test(input)) {
            console.log('🎯 MATCH DIRETTO: Dettagli settimana specifica');
            return 'dettagli_settimana';
        }
        
        // Controlla richieste di data/settimana corrente
        if (/in\s+che\s+settimana\s+siamo|quale\s+settimana\s+siamo|settimana\s+corrente|settimana\s+oggi|che\s+settimana\s+è|settimana\s+attuale/i.test(input) ||
            /in\s+che\s+settimana\s+siamo.*adesso|siamo.*adesso.*settimana|settimana.*siamo.*adesso/i.test(input) ||
            /che\s+settimana\s+è\s+oggi|oggi\s+che\s+settimana\s+è|settimana\s+di\s+oggi/i.test(input) ||
            /siamo\s+in\s+che\s+settimana|siamo\s+in\s+quale\s+settimana/i.test(input)) {
            console.log('🎯 MATCH DIRETTO: Settimana corrente');
            return 'settimana_corrente';
        }
        
        // Controlla richieste di ora/orario corrente
        if (/che\s+ore\s+sono|che\s+ora\s+è|orario\s+attuale|ora\s+corrente|dimmi\s+l['']?ora|ora\s+esatta|orario\s+esatto/i.test(input)) {
            console.log('🎯 MATCH DIRETTO: Orario corrente');
            return 'orario_corrente';
        }
        
        // Controlla richieste di data corrente  
        if (/che\s+giorno\s+è\s+oggi|data\s+di\s+oggi|data\s+corrente|oggi\s+che\s+giorno\s+è|data\s+odierna|giorno\s+corrente/i.test(input)) {
            console.log('🎯 MATCH DIRETTO: Data corrente');
            return 'data_corrente';
        }
        
        // Controlla richieste di solo numero settimana (deve essere DOPO i controlli specifici)
        if (/(?:voglio\s+solo|solo|dimmi\s+solo|dammi\s+solo)\s+.*(?:numero|n\.?)\s+.*settimana.*(?:degli\s+ordini|caricati)/i.test(input) ||
            /^settimana\s*\??$/i.test(input) ||
            /(?:voglio\s+solo|solo|dimmi\s+solo|dammi\s+solo)\s+.*settimana.*(?:degli\s+ordini|caricati)/i.test(input)) {
            console.log('🎯 PATTERN SOLO NUMERO SETTIMANA MATCH:', input);
            return 'solo_numero_settimana';
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
                
            case 'prodotti_ordine':
                const prodottiMatch = input.match(this.patterns.prodottiOrdine);
                if (prodottiMatch) {
                    params.cliente = prodottiMatch[1].trim();
                }
                break;
                
            case 'ordini':
                const ordiniMatch = input.match(this.patterns.ordiniCliente);
                if (ordiniMatch) {
                    params.cliente = ordiniMatch[1].trim();
                } else {
                    // Controlla se è una richiesta di conteggio totale ordini
                    const ordiniTotaliMatch = input.match(this.patterns.ordiniTotali);
                    if (ordiniTotaliMatch) {
                        // Richiesta di conteggio totale - non serve cliente
                        params.totali = true;
                    } else {
                        // Controlla se è una richiesta di conteggio righe ordine
                        const righeOrdineMatch = input.match(this.patterns.righeOrdine);
                        if (righeOrdineMatch) {
                            params.righeOrdine = true;
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
                    // Controlla "Date degli ordini?" generico
                    const dateOrdiniGenericoMatch = input.match(this.patterns.dateOrdiniGenerico);
                    if (dateOrdiniGenericoMatch) {
                        const validContext = this.getValidContext();
                        if (validContext) {
                            params.cliente = validContext;
                            params.fromContext = true;
                            params.tuttiOrdini = true;
                        }
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
                
            case 'settimane_future':
                const settimaneMatch = input.match(/tra\s+(\d+)\s+settimane?|in\s+(\d+)\s+settimane?|dopo\s+(\d+)\s+settimane?/i);
                if (settimaneMatch) {
                    params.numeroSettimane = parseInt(settimaneMatch[1] || settimaneMatch[2] || settimaneMatch[3], 10);
                }
                break;
                
            case 'ordini_per_settimana':
                const ordiniSettimanaMatch = input.match(/(?:nella|in)\s+settimana\s+(?:numero\s+)?(\d+)|settimana\s+(?:numero\s+)?(\d+).*(?:ordini|quanti)/i);
                if (ordiniSettimanaMatch) {
                    params.numeroSettimana = parseInt(ordiniSettimanaMatch[1] || ordiniSettimanaMatch[2], 10);
                }
                break;
                
            case 'fatturato_per_settimana':
                const fatturatoSettimanaMatch = input.match(/(?:nella|in)\s+settimana\s+(?:numero\s+)?(\d+)|settimana\s+(?:numero\s+)?(\d+).*(?:fatturato|venduto)/i);
                if (fatturatoSettimanaMatch) {
                    params.numeroSettimana = parseInt(fatturatoSettimanaMatch[1] || fatturatoSettimanaMatch[2], 10);
                }
                break;
                
            case 'dettagli_settimana':
                const dettagliMatch = input.match(/settimana\s+(?:numero\s+)?(\d+)|(\d+)/i);
                if (dettagliMatch) {
                    params.numeroSettimana = parseInt(dettagliMatch[1] || dettagliMatch[2], 10);
                }
                break;
                
            case 'valore_massimo':
            case 'valore_minimo':
            case 'valore_medio':
                // Estrai parametri temporali
                const periodoParams = this.extractTemporalParameters(input);
                if (periodoParams) {
                    params.periodo = periodoParams;
                }
                break;
        }
        
        return params;
    }
    
    /**
     * Estrae parametri temporali dalle richieste (versione precedente - rimuovere per evitare duplicati)
     */
    extractTemporalParametersOld(input) {
        const params = {};
        
        // Controlla settimana specifica
        const settimanaMatch = input.match(this.patterns.settimanaSpecifica);
        if (settimanaMatch) {
            params.tipoPeriodo = 'settimana';
            params.numeroSettimana = parseInt(settimanaMatch[1]);
            params.anno = settimanaMatch[2] ? parseInt(settimanaMatch[2]) : new Date().getFullYear();
            return params;
        }
        
        // Controlla mese specifico
        const meseMatch = input.match(this.patterns.meseSpecifico);
        if (meseMatch) {
            params.tipoPeriodo = 'mese';
            if (isNaN(parseInt(meseMatch[1]))) {
                // Nome del mese
                const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
                             'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
                params.numeroMese = mesi.indexOf(meseMatch[1].toLowerCase()) + 1;
            } else {
                params.numeroMese = parseInt(meseMatch[1]);
            }
            params.anno = meseMatch[2] ? parseInt(meseMatch[2]) : new Date().getFullYear();
            return params;
        }
        
        // Controlla giorno specifico
        const giornoMatch = input.match(this.patterns.giornoSpecifico);
        if (giornoMatch) {
            params.tipoPeriodo = 'giorno';
            params.numeroGiorno = parseInt(giornoMatch[1]);
            params.numeroMese = giornoMatch[2] ? parseInt(giornoMatch[2]) : new Date().getMonth() + 1;
            params.anno = giornoMatch[3] ? parseInt(giornoMatch[3]) : new Date().getFullYear();
            return params;
        }
        
        // Controlla periodo generico
        const periodoMatch = input.match(this.patterns.periodoTemporale);
        if (periodoMatch) {
            const tipoPeriodo = periodoMatch[0].match(/(settimana|mese|giorno|anno|trimestre|semestre)/i);
            if (tipoPeriodo) {
                params.tipoPeriodo = tipoPeriodo[1].toLowerCase();
                params.periodoDescrizione = periodoMatch[1] || 'corrente';
                params.anno = periodoMatch[2] ? parseInt(periodoMatch[2]) : new Date().getFullYear();
            }
        }
        
        return params;
    }
    
    /**
     * Filtra i dati storici per periodo temporale specifico (versione precedente - rimuovere per evitare duplicati)
     */
    filterDataByPeriodOld(data, params) {
        if (!params.tipoPeriodo) {
            return data; // Nessun filtro temporale
        }
        
        return data.filter(row => {
            const dataConsegna = new Date(row.data_consegna || row.data_ordine);
            if (isNaN(dataConsegna.getTime())) {
                return false; // Data non valida
            }
            
            const anno = dataConsegna.getFullYear();
            const mese = dataConsegna.getMonth() + 1;
            const giorno = dataConsegna.getDate();
            
            switch (params.tipoPeriodo) {
                case 'settimana':
                    if (params.numeroSettimana && params.anno) {
                        const settimanaAnno = this.getWeekNumber(dataConsegna);
                        return settimanaAnno.week === params.numeroSettimana && 
                               settimanaAnno.year === params.anno;
                    }
                    break;
                    
                case 'mese':
                    if (params.numeroMese && params.anno) {
                        return mese === params.numeroMese && anno === params.anno;
                    }
                    break;
                    
                case 'giorno':
                    if (params.numeroGiorno && params.numeroMese && params.anno) {
                        return giorno === params.numeroGiorno && 
                               mese === params.numeroMese && 
                               anno === params.anno;
                    }
                    break;
                    
                case 'anno':
                    if (params.anno) {
                        return anno === params.anno;
                    }
                    break;
            }
            
            return false;
        });
    }
    
    /**
     * Calcola il numero della settimana per una data
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return {
            week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7),
            year: d.getUTCFullYear()
        };
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
                
            case 'prodotti_ordine':
                return await this.getProdottiOrdine(params);
                
            case 'data':
                return await this.getUltimaData(params);
                
            case 'date_ordini_generiche':
                return await this.getDateOrdiniGeneriche(params);
                
            case 'solo_numero_settimana':
                return await this.getSoloNumeroSettimana(params);
                
            case 'percorsi':
                return await this.calculatePercorso(params);
                
            case 'clienti':
                return await this.searchClienti(params);
                
            case 'clienti_database':
                return await this.getClientiDatabase(params);
                
            case 'valore_massimo':
                return await this.getClienteValoreMassimo(params);
                
            case 'valore_minimo':
                return await this.getClienteValoreMinimo(params);
                
            case 'valore_medio':
                return await this.getValoreMedio(params);
                
            case 'settimana_corrente':
                return await this.getSettimanaCorrente(params);
                
            case 'prossima_settimana':
                return await this.getProssimaSettimana(params);
                
            case 'settimane_future':
                return await this.getSettimanoFuture(params);
                
            case 'dettagli_settimana':
                return await this.getDettagliSettimana(params);
                
            case 'ordini_per_settimana':
                return await this.getOrdiniPerSettimana(params);
                
            case 'fatturato_per_settimana':
                return await this.getFatturatoPerSettimana(params);
                
            case 'orario_corrente':
                return await this.getOrarioCorrente(params);
                
            case 'data_corrente':
                return await this.getDataCorrente(params);
                
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
                // Se è una richiesta di conteggio righe ordine
                if (params.righeOrdine) {
                    return {
                        success: true,
                        response: `📊 Righe totali negli ordini: ${ordini.length}`,
                        data: { righe: ordini.length }
                    };
                }
                
                // Conta ordini distinti usando numero_ordine
                const ordiniDistinti = new Set(
                    ordini.map(o => o.numero_ordine).filter(n => n && n !== null)
                ).size;
                
                return {
                    success: true,
                    response: `📊 Totale ordini distinti: ${ordiniDistinti} (${ordini.length} righe totali)`,
                    data: { 
                        ordini: ordiniDistinti, 
                        righe: ordini.length 
                    }
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
     * FUNZIONE 2.1: Prodotti negli Ordini Cliente
     */
    async getProdottiOrdine(params) {
        try {
            console.log('📦 MIDDLEWARE: Ricerca prodotti ordini per:', params.cliente);
            
            if (!params.cliente) {
                return { 
                    success: false, 
                    error: 'Nome cliente mancante per ricerca prodotti ordini' 
                };
            }
            
            // Verifica se i dati sono già caricati, altrimenti carica solo se necessario
            let ordini = this.supabaseAI.historicalOrders?.sampleData || [];
            if (ordini.length === 0) {
                console.log('📊 MIDDLEWARE: Dati non ancora caricati, caricamento necessario...');
                const supabaseData = await this.supabaseAI.getAllData();
                ordini = supabaseData.historicalOrders?.sampleData || [];
            }
            
            // Debug: stampa struttura del primo ordine
            if (ordini.length > 0) {
                console.log('📊 DEBUG: Struttura primo ordine:', ordini[0]);
                console.log('📊 DEBUG: Campi disponibili:', Object.keys(ordini[0]));
            }
            
            // Normalizza nome cliente per matching più flessibile
            const clienteNorm = this.normalizeClientName(params.cliente);
            console.log('📦 MIDDLEWARE: Nome cliente normalizzato:', clienteNorm);
            
            const ordiniCliente = ordini.filter(ordine => {
                if (!ordine.cliente) return false;
                
                const nomeOrdineNorm = this.normalizeClientName(ordine.cliente);
                const match = nomeOrdineNorm.includes(clienteNorm) || clienteNorm.includes(nomeOrdineNorm);
                
                if (match) {
                    console.log('📦 MIDDLEWARE: Match trovato:', ordine.cliente, '→', nomeOrdineNorm);
                    // Debug specifico per le date di questo ordine
                    console.log('📅 DEBUG DATE ORDINE:', {
                        data_ordine: ordine.data_ordine,
                        data_consegna: ordine.data_consegna,
                        data: ordine.data,
                        date: ordine.date,
                        created_at: ordine.created_at,
                        timestamp: ordine.timestamp,
                        numero_ordine: ordine.numero_ordine
                    });
                }
                
                return match;
            });
            
            if (ordiniCliente.length === 0) {
                return {
                    success: true,
                    response: `❌ Nessun ordine trovato per "${params.cliente}"`,
                    data: { ordini: 0, prodotti: [] }
                };
            }
            
            // Salva nel contesto per richieste successive
            this.saveContext(params.cliente);
            
            const nomeCliente = ordiniCliente[0].cliente;
            
            // Raggruppa prodotti per ordine
            const ordiniProdotti = {};
            ordiniCliente.forEach(riga => {
                const numeroOrdine = riga.numero_ordine;
                if (!ordiniProdotti[numeroOrdine]) {
                    // Cerca la data migliore disponibile
                    const dataOrdine = riga.data_ordine || riga.data_consegna || riga.data || riga.date || 'N/A';
                    
                    // Debug per vedere quale data viene usata
                    console.log('📅 DEBUG DATA USATA per ordine', numeroOrdine, ':', {
                        data_finale: dataOrdine,
                        data_ordine: riga.data_ordine,
                        data_consegna: riga.data_consegna,
                        data: riga.data,
                        date: riga.date
                    });
                    
                    ordiniProdotti[numeroOrdine] = {
                        numero: numeroOrdine,
                        data: dataOrdine,
                        prodotti: []
                    };
                }
                
                if (riga.codice_prodotto || riga.descrizione_prodotto) {
                    // Cerca la descrizione in vari campi possibili
                    const descrizione = riga.descrizione_prodotto || 
                                      riga.descrizione || 
                                      riga.prodotto || 
                                      riga.nome_prodotto || 
                                      riga.product_name ||
                                      riga.description ||
                                      'N/A';
                    
                    // Cerca la quantità in vari campi possibili
                    const quantita = riga.quantita || 
                                   riga.qta || 
                                   riga.qty || 
                                   riga.quantity ||
                                   'N/A';
                    
                    ordiniProdotti[numeroOrdine].prodotti.push({
                        codice: riga.codice_prodotto || 'N/A',
                        descrizione: descrizione,
                        quantita: quantita,
                        importo: riga.importo || 'N/A'
                    });
                }
            });
            
            // Conta ordini distinti e prodotti totali
            const numOrdiniDistinti = Object.keys(ordiniProdotti).length;
            const tuttiprodotti = Object.values(ordiniProdotti).flatMap(o => o.prodotti);
            
            // Prepara risposta dettagliata
            let response = `🛒 Cliente ${nomeCliente}: ${numOrdiniDistinti} ordini con ${tuttiprodotti.length} prodotti totali\n\n`;
            
            // Mostra dettaglio degli ordini (massimo 3 per evitare payload troppo grandi)
            const ordiniArray = Object.values(ordiniProdotti);
            const ordiniDaMostrare = ordiniArray.slice(0, 3);
            
            ordiniDaMostrare.forEach(ordine => {
                response += `📋 Ordine ${ordine.numero} (${ordine.data}):\n`;
                ordine.prodotti.slice(0, 5).forEach(prodotto => {
                    response += `  • ${prodotto.descrizione} (${prodotto.codice}) - Q.tà: ${prodotto.quantita}\n`;
                });
                if (ordine.prodotti.length > 5) {
                    response += `  ... e altri ${ordine.prodotti.length - 5} prodotti\n`;
                }
                response += '\n';
            });
            
            if (ordiniArray.length > 3) {
                response += `... e altri ${ordiniArray.length - 3} ordini\n`;
            }
            
            return {
                success: true,
                response: response.trim(),
                data: { 
                    cliente: nomeCliente,
                    ordiniDistinti: numOrdiniDistinti,
                    prodottiTotali: tuttiprodotti.length,
                    ordini: ordiniProdotti,
                    dettaglio: ordiniDaMostrare
                }
            };
            
        } catch (error) {
            console.error('❌ Errore ricerca prodotti ordini:', error);
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
            
            // Se non c'è una zona specificata, chiama getClientiDatabase per ottenere i clienti dagli ordini
            if (!params.zona) {
                console.log('👥 MIDDLEWARE: Nessuna zona specificata, chiamo getClientiDatabase()');
                return await this.getClientiDatabase(params);
            }
            
            // Usa dati già caricati senza ricaricare per ricerche per zona
            const clienti = this.supabaseAI.clients || [];
            
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

    /**
     * FUNZIONE 5: Cliente con ordine di valore massimo
     */
    async getClienteValoreMassimo(params) {
        try {
            console.log('💰 MIDDLEWARE: Ricerca cliente con valore massimo ordine', params);
            
            // Usa la stessa logica di getClientiDatabase per ottenere i dati
            const supabaseAI = this.supabaseAI;
            if (supabaseAI && supabaseAI.isConnected && supabaseAI.isConnected()) {
                const allData = await supabaseAI.getAllData();
                let historicalData = allData.historical || [];
                
                // Applica filtro temporale se presente
                if (params.periodo) {
                    historicalData = this.filterDataByPeriod(historicalData, params.periodo);
                }
                
                if (historicalData.length > 0) {
                    // Trova il cliente con il valore massimo
                    const clientiMap = new Map();
                    
                    historicalData.forEach(row => {
                        const cliente = row.cliente;
                        const importo = parseFloat(row.importo) || 0;
                        
                        if (cliente && cliente.trim() !== '') {
                            if (!clientiMap.has(cliente)) {
                                clientiMap.set(cliente, 0);
                            }
                            clientiMap.set(cliente, clientiMap.get(cliente) + importo);
                        }
                    });
                    
                    // Trova il cliente con il valore massimo
                    let maxCliente = null;
                    let maxValore = 0;
                    
                    for (const [cliente, valore] of clientiMap.entries()) {
                        if (valore > maxValore) {
                            maxValore = valore;
                            maxCliente = cliente;
                        }
                    }
                    
                    if (maxCliente) {
                        const periodoText = params.periodo ? ` nella ${params.periodo.descrizione}` : '';
                        return {
                            success: true,
                            response: `🏆 Il cliente con l'ordine di valore più elevato${periodoText} è:\n\n💰 **${maxCliente}** con un fatturato di **€${maxValore.toFixed(2)}**`,
                            data: { 
                                cliente: maxCliente,
                                valore: maxValore,
                                periodo: params.periodo
                            }
                        };
                    }
                }
            }
            
            return {
                success: true,
                response: '❌ Nessun ordine trovato nel database.',
                data: {}
            };
            
        } catch (error) {
            console.error('❌ Errore ricerca cliente valore massimo:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FUNZIONE 6: Cliente con ordine di valore minimo
     */
    async getClienteValoreMinimo(params) {
        try {
            console.log('💸 MIDDLEWARE: Ricerca cliente con valore minimo ordine', params);
            
            // Usa la stessa logica di getClientiDatabase per ottenere i dati
            const supabaseAI = this.supabaseAI;
            if (supabaseAI && supabaseAI.isConnected && supabaseAI.isConnected()) {
                const allData = await supabaseAI.getAllData();
                let historicalData = allData.historical || [];
                
                // Applica filtro temporale se presente
                if (params.periodo) {
                    historicalData = this.filterDataByPeriod(historicalData, params.periodo);
                }
                
                if (historicalData.length > 0) {
                    // Trova il cliente con il valore minimo
                    const clientiMap = new Map();
                    
                    historicalData.forEach(row => {
                        const cliente = row.cliente;
                        const importo = parseFloat(row.importo) || 0;
                        
                        if (cliente && cliente.trim() !== '') {
                            if (!clientiMap.has(cliente)) {
                                clientiMap.set(cliente, 0);
                            }
                            clientiMap.set(cliente, clientiMap.get(cliente) + importo);
                        }
                    });
                    
                    // Trova il cliente con il valore minimo
                    let minCliente = null;
                    let minValore = Infinity;
                    
                    for (const [cliente, valore] of clientiMap.entries()) {
                        if (valore < minValore) {
                            minValore = valore;
                            minCliente = cliente;
                        }
                    }
                    
                    if (minCliente && minValore !== Infinity) {
                        const periodoText = params.periodo ? ` nella ${params.periodo.descrizione}` : '';
                        return {
                            success: true,
                            response: `📉 Il cliente con l'ordine di valore più basso${periodoText} è:\n\n💸 **${minCliente}** con un fatturato di **€${minValore.toFixed(2)}**`,
                            data: { 
                                cliente: minCliente,
                                valore: minValore,
                                periodo: params.periodo
                            }
                        };
                    }
                }
            }
            
            return {
                success: true,
                response: '❌ Nessun ordine trovato nel database.',
                data: {}
            };
            
        } catch (error) {
            console.error('❌ Errore ricerca cliente valore minimo:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FUNZIONE 7: Valore medio degli ordini
     */
    async getValoreMedio(params) {
        try {
            console.log('📊 MIDDLEWARE: Calcolo valore medio ordini', params);
            
            // Usa la stessa logica di getClientiDatabase per ottenere i dati
            const supabaseAI = this.supabaseAI;
            if (supabaseAI && supabaseAI.isConnected && supabaseAI.isConnected()) {
                const allData = await supabaseAI.getAllData();
                let historicalData = allData.historical || [];
                
                // Applica filtro temporale se presente
                if (params.periodo) {
                    historicalData = this.filterDataByPeriod(historicalData, params.periodo);
                }
                
                if (historicalData.length > 0) {
                    // Calcola il valore medio per cliente
                    const clientiMap = new Map();
                    
                    historicalData.forEach(row => {
                        const cliente = row.cliente;
                        const importo = parseFloat(row.importo) || 0;
                        
                        if (cliente && cliente.trim() !== '') {
                            if (!clientiMap.has(cliente)) {
                                clientiMap.set(cliente, 0);
                            }
                            clientiMap.set(cliente, clientiMap.get(cliente) + importo);
                        }
                    });
                    
                    // Calcola statistiche
                    const valori = Array.from(clientiMap.values());
                    const totaleFatturato = valori.reduce((sum, val) => sum + val, 0);
                    const valoreMedio = totaleFatturato / valori.length;
                    
                    // Trova il cliente più vicino alla media
                    let clienteVicinoMedia = null;
                    let differenzaMinima = Infinity;
                    
                    for (const [cliente, valore] of clientiMap.entries()) {
                        const differenza = Math.abs(valore - valoreMedio);
                        if (differenza < differenzaMinima) {
                            differenzaMinima = differenza;
                            clienteVicinoMedia = cliente;
                        }
                    }
                    
                    const periodoText = params.periodo ? ` nella ${params.periodo.descrizione}` : '';
                    return {
                        success: true,
                        response: `📊 **Statistiche Valore Ordini${periodoText}:**\n\n📈 **Valore medio:** €${valoreMedio.toFixed(2)}\n💰 **Fatturato totale:** €${totaleFatturato.toFixed(2)}\n👥 **Numero clienti:** ${valori.length}\n\n🎯 **Cliente più vicino alla media:** ${clienteVicinoMedia} (€${clientiMap.get(clienteVicinoMedia).toFixed(2)})`,
                        data: { 
                            valoreMedio: valoreMedio,
                            totaleFatturato: totaleFatturato,
                            numeroClienti: valori.length,
                            clienteVicinoMedia: clienteVicinoMedia,
                            valoreClienteVicinoMedia: clientiMap.get(clienteVicinoMedia),
                            periodo: params.periodo
                        }
                    };
                }
            }
            
            return {
                success: true,
                response: '❌ Nessun ordine trovato nel database.',
                data: {}
            };
            
        } catch (error) {
            console.error('❌ Errore calcolo valore medio:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Estrae parametri temporali da domande di valore
     */
    extractTemporalParameters(text) {
        const lowerText = text.toLowerCase();
        
        // Settimana specifica
        const weekMatch = lowerText.match(this.patterns.settimanaSpecifica);
        if (weekMatch) {
            const weekNum = parseInt(weekMatch[1]);
            const year = weekMatch[2] ? parseInt(weekMatch[2]) : new Date().getFullYear();
            return {
                tipo: 'settimana',
                valore: weekNum,
                anno: year,
                descrizione: `settimana ${weekNum} del ${year}`
            };
        }
        
        // Mese specifico
        const monthMatch = lowerText.match(this.patterns.meseSpecifico);
        if (monthMatch) {
            const monthInput = monthMatch[1];
            const year = monthMatch[2] ? parseInt(monthMatch[2]) : new Date().getFullYear();
            
            let monthNum;
            if (isNaN(parseInt(monthInput))) {
                // Nome del mese
                const mesi = {
                    'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4,
                    'maggio': 5, 'giugno': 6, 'luglio': 7, 'agosto': 8,
                    'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12
                };
                monthNum = mesi[monthInput.toLowerCase()];
            } else {
                monthNum = parseInt(monthInput);
            }
            
            if (monthNum >= 1 && monthNum <= 12) {
                return {
                    tipo: 'mese',
                    valore: monthNum,
                    anno: year,
                    descrizione: `mese ${monthNum} del ${year}`
                };
            }
        }
        
        // Giorno specifico
        const dayMatch = lowerText.match(this.patterns.giornoSpecifico);
        if (dayMatch) {
            const dayNum = parseInt(dayMatch[1]);
            const monthNum = dayMatch[2] ? parseInt(dayMatch[2]) : new Date().getMonth() + 1;
            const year = dayMatch[3] ? parseInt(dayMatch[3]) : new Date().getFullYear();
            
            return {
                tipo: 'giorno',
                valore: dayNum,
                mese: monthNum,
                anno: year,
                descrizione: `giorno ${dayNum}/${monthNum}/${year}`
            };
        }
        
        // Periodi generici
        const periodoMatch = lowerText.match(this.patterns.periodoTemporale);
        if (periodoMatch) {
            const periodo = periodoMatch[0];
            if (periodo.includes('settimana')) {
                return {
                    tipo: 'settimana',
                    valore: 'corrente',
                    descrizione: 'settimana corrente'
                };
            }
            if (periodo.includes('mese')) {
                return {
                    tipo: 'mese',
                    valore: 'corrente',
                    descrizione: 'mese corrente'
                };
            }
            if (periodo.includes('giorno')) {
                return {
                    tipo: 'giorno',
                    valore: 'corrente',
                    descrizione: 'giorno corrente'
                };
            }
        }
        
        return null;
    }
    
    /**
     * Filtra i dati storici per periodo temporale
     */
    filterDataByPeriod(data, periodo) {
        if (!periodo) return data;
        
        const now = new Date();
        
        return data.filter(item => {
            const itemDate = this.parseItemDate(item);
            if (!itemDate) return false;
            
            switch (periodo.tipo) {
                case 'settimana':
                    if (periodo.valore === 'corrente') {
                        return this.getWeekNumberSimple(itemDate) === this.getWeekNumberSimple(now) &&
                               itemDate.getFullYear() === now.getFullYear();
                    } else {
                        return this.getWeekNumberSimple(itemDate) === periodo.valore &&
                               itemDate.getFullYear() === periodo.anno;
                    }
                    
                case 'mese':
                    if (periodo.valore === 'corrente') {
                        return itemDate.getMonth() === now.getMonth() &&
                               itemDate.getFullYear() === now.getFullYear();
                    } else {
                        return itemDate.getMonth() + 1 === periodo.valore &&
                               itemDate.getFullYear() === periodo.anno;
                    }
                    
                case 'giorno':
                    if (periodo.valore === 'corrente') {
                        return itemDate.toDateString() === now.toDateString();
                    } else {
                        return itemDate.getDate() === periodo.valore &&
                               itemDate.getMonth() + 1 === periodo.mese &&
                               itemDate.getFullYear() === periodo.anno;
                    }
                    
                default:
                    return true;
            }
        });
    }
    
    /**
     * Parsing date dai dati storici - FIXED per formato italiano
     */
    parseItemDate(item) {
        const dateFields = ['data', 'data_ordine', 'data_consegna', 'data_documento', 'created_at', 'timestamp'];
        
        for (const field of dateFields) {
            if (item[field]) {
                // Usa parser italiano robusto se disponibile
                if (window.ItalianDateParser) {
                    const date = window.ItalianDateParser.parseDate(item[field]);
                    if (date) {
                        return date;
                    }
                }
                
                // Fallback: parsing standard (meno affidabile per date ambigue)
                const date = new Date(item[field]);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Calcola il numero della settimana (versione semplice)
     */
    getWeekNumberSimple(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
    
    
    /**
     * FUNZIONE 8: Date ordini generiche - analizza tutte le date degli ordini
     */
    async getDateOrdiniGeneriche(params) {
        try {
            console.log('📅 MIDDLEWARE: Analisi date ordini generiche');
            
            // Usa la stessa logica delle altre funzioni per ottenere i dati
            let ordini = this.supabaseAI.historicalOrders?.sampleData || [];
            if (ordini.length === 0) {
                console.log('📊 MIDDLEWARE: Dati non ancora caricati, caricamento necessario...');
                const supabaseData = await this.supabaseAI.getAllData();
                ordini = supabaseData.historicalOrders?.sampleData || [];
            }
            
            if (ordini.length > 0) {
                const historicalData = ordini;
                
                if (historicalData.length > 0) {
                    // Raggruppa ordini per numero_ordine con le loro date
                    const ordiniMap = new Map();
                    const dateFields = ['data', 'data_ordine', 'data_consegna', 'data_documento', 'created_at', 'timestamp'];
                    
                    historicalData.forEach(row => {
                        const numeroOrdine = row.numero_ordine;
                        const cliente = row.cliente;
                        
                        if (numeroOrdine && cliente) {
                            if (!ordiniMap.has(numeroOrdine)) {
                                // Trova la data migliore per questo ordine
                                let dataOrdine = null;
                                let fieldUsed = null;
                                
                                for (const field of dateFields) {
                                    if (row[field] && row[field] !== null && row[field] !== '') {
                                        console.log(`🔍 Tentativo parsing data: ${field} = "${row[field]}"`);
                                        
                                        // I dati da Supabase sono in formato ISO YYYY-MM-DD ma rappresentano date americane
                                        // Usa il parser Supabase specializzato
                                        if (window.ItalianDateParser) {
                                            const parsedDate = window.ItalianDateParser.parseSupabaseDateToItalian(row[field]);
                                            if (parsedDate) {
                                                // Converti in formato italiano per la visualizzazione
                                                dataOrdine = window.ItalianDateParser.formatItalianDate(parsedDate);
                                                fieldUsed = field;
                                                console.log(`✅ Parser Supabase riuscito: ${row[field]} → ${dataOrdine}`);
                                                break;
                                            }
                                            
                                            // Fallback al parser generico
                                            const fallbackDate = window.ItalianDateParser.parseDate(row[field]);
                                            if (fallbackDate) {
                                                dataOrdine = window.ItalianDateParser.formatItalianDate(fallbackDate);
                                                fieldUsed = field;
                                                console.log(`✅ Parser generico riuscito: ${row[field]} → ${dataOrdine}`);
                                                break;
                                            }
                                        } else if (!isNaN(Date.parse(row[field]))) {
                                            dataOrdine = row[field];
                                            fieldUsed = field;
                                            console.log(`✅ Parser JavaScript riuscito: ${row[field]} → ${dataOrdine}`);
                                            break;
                                        }
                                        
                                        console.log(`❌ Tutti i parser falliti per: ${field} = "${row[field]}"`);
                                    }
                                }
                                
                                ordiniMap.set(numeroOrdine, {
                                    numero: numeroOrdine,
                                    cliente: cliente,
                                    data: dataOrdine,
                                    dataField: fieldUsed,
                                    displayDate: dataOrdine ? this.formatDate(dataOrdine) : 'Data non disponibile'
                                });
                            }
                        }
                    });
                    
                    // Converti in array e ordina per data
                    const ordiniArray = Array.from(ordiniMap.values());
                    const ordiniConData = ordiniArray.filter(o => o.data);
                    const ordiniSenzaData = ordiniArray.filter(o => !o.data);
                    
                    // Ordina per data decrescente
                    ordiniConData.sort((a, b) => {
                        const dateA = window.ItalianDateParser ? 
                            window.ItalianDateParser.parseItalianDateStrict(a.data) : new Date(a.data);
                        const dateB = window.ItalianDateParser ? 
                            window.ItalianDateParser.parseItalianDateStrict(b.data) : new Date(b.data);
                        return dateB - dateA;
                    });
                    
                    // Combina ordinati per data + quelli senza data
                    const tuttiOrdini = [...ordiniConData, ...ordiniSenzaData];
                    
                    // Calcola settimane
                    const ordiniConSettimana = tuttiOrdini.map(ordine => {
                        if (ordine.data) {
                            const date = window.ItalianDateParser ? 
                                window.ItalianDateParser.parseItalianDateStrict(ordine.data) : new Date(ordine.data);
                            
                            if (date && !isNaN(date.getTime())) {
                                const settimana = this.getWeekNumberSimple(date);
                                console.log(`🔍 DEBUG SETTIMANA: ${ordine.data} → ${date.toLocaleDateString('it-IT')} → Settimana ${settimana}`);
                                return {
                                    ...ordine,
                                    settimana: settimana,
                                    anno: date.getFullYear()
                                };
                            }
                        }
                        return ordine;
                    });
                    
                    // Crea risposta dettagliata
                    let response = `📅 **Analisi Date Ordini**\n\n`;
                    response += `🔢 **Ordini totali**: ${tuttiOrdini.length}\n`;
                    response += `📊 **Con data**: ${ordiniConData.length}\n`;
                    if (ordiniSenzaData.length > 0) {
                        response += `⚠️ **Senza data**: ${ordiniSenzaData.length}\n`;
                    }
                    response += `\n**📋 Dettaglio ordini:**\n`;
                    
                    ordiniConSettimana.forEach((ordine, index) => {
                        const settimanaInfo = ordine.settimana ? 
                            ` (Settimana ${ordine.settimana}/${ordine.anno})` : '';
                        response += `${index + 1}. **${ordine.numero}** - ${ordine.cliente}\n`;
                        response += `   📅 Data: ${ordine.displayDate}${settimanaInfo}\n\n`;
                    });
                    
                    return {
                        success: true,
                        response: response,
                        data: { 
                            ordini: ordiniConSettimana,
                            totale: tuttiOrdini.length,
                            conData: ordiniConData.length,
                            senzaData: ordiniSenzaData.length
                        }
                    };
                }
            } else {
                console.log('⚠️ MIDDLEWARE: Nessun dato storico disponibile');
                return {
                    success: true,
                    response: '⚠️ Nessun dato storico disponibile. Verifica la connessione a Supabase.',
                    data: { ordini: [] }
                };
            }
            
            return {
                success: true,
                response: '❌ Nessun ordine trovato nel database.',
                data: { ordini: [] }
            };
            
        } catch (error) {
            console.error('❌ Errore analisi date ordini generiche:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * FUNZIONE 8B: Solo numero settimana ordini - risposta concisa
     */
    async getSoloNumeroSettimana(params) {
        try {
            console.log('📅 MIDDLEWARE: Richiesta solo numero settimana ordini');
            
            // Controlla se è una richiesta per la prossima settimana
            if (params.originalInput && /(?:prossima\s+settimana|settimana\s+prossima)/i.test(params.originalInput)) {
                console.log('📅 MIDDLEWARE: Richiesta numero prossima settimana');
                const now = new Date();
                const prossimaSettimana = new Date(now);
                prossimaSettimana.setDate(now.getDate() + 7);
                const settimanaSuccessiva = this.getWeekNumberSimple(prossimaSettimana);
                
                return {
                    success: true,
                    response: `${settimanaSuccessiva}`,
                    data: { settimana: settimanaSuccessiva }
                };
            }
            
            // Riusa la logica di getDateOrdiniGeneriche ma restituisce solo il numero
            let ordini = this.supabaseAI.historicalOrders?.sampleData || [];
            if (ordini.length === 0) {
                console.log('📊 MIDDLEWARE: Dati non ancora caricati, caricamento necessario...');
                const supabaseData = await this.supabaseAI.getAllData();
                ordini = supabaseData.historicalOrders?.sampleData || [];
            }
            
            if (ordini.length > 0) {
                const historicalData = ordini;
                const ordiniMap = new Map();
                const dateFields = ['data', 'data_ordine', 'data_consegna', 'data_documento', 'created_at', 'timestamp'];
                
                historicalData.forEach(row => {
                    const numeroOrdine = row.numero_ordine;
                    const cliente = row.cliente;
                    
                    if (numeroOrdine && cliente) {
                        if (!ordiniMap.has(numeroOrdine)) {
                            let dataOrdine = null;
                            let fieldUsed = null;
                            
                            for (const field of dateFields) {
                                if (row[field] && row[field] !== null && row[field] !== '') {
                                    if (window.ItalianDateParser) {
                                        const parsedDate = window.ItalianDateParser.parseSupabaseDateToItalian(row[field]);
                                        if (parsedDate) {
                                            dataOrdine = window.ItalianDateParser.formatItalianDate(parsedDate);
                                            fieldUsed = field;
                                            break;
                                        }
                                    }
                                }
                            }
                            
                            if (dataOrdine) {
                                ordiniMap.set(numeroOrdine, {
                                    numero: numeroOrdine,
                                    data: dataOrdine
                                });
                            }
                        }
                    }
                });
                
                // Calcola settimane
                const ordiniArray = Array.from(ordiniMap.values());
                const settimane = new Set();
                
                ordiniArray.forEach(ordine => {
                    if (ordine.data) {
                        const date = window.ItalianDateParser ? 
                            window.ItalianDateParser.parseItalianDateStrict(ordine.data) : new Date(ordine.data);
                        
                        if (date && !isNaN(date.getTime())) {
                            const settimana = this.getWeekNumberSimple(date);
                            settimane.add(settimana);
                        }
                    }
                });
                
                const settimaneArray = Array.from(settimane).sort((a, b) => a - b);
                
                if (settimaneArray.length === 1) {
                    return {
                        success: true,
                        response: `Settimana ${settimaneArray[0]}`,
                        data: { settimana: settimaneArray[0] }
                    };
                } else if (settimaneArray.length > 1) {
                    const settimaneText = settimaneArray.join(', ');
                    return {
                        success: true,
                        response: `Settimane ${settimaneText}`,
                        data: { settimane: settimaneArray }
                    };
                } else {
                    return {
                        success: true,
                        response: `❌ Nessuna settimana trovata`,
                        data: { settimane: [] }
                    };
                }
            }
            
            return {
                success: true,
                response: '⚠️ Nessun dato disponibile per calcolare la settimana',
                data: { settimane: [] }
            };
            
        } catch (error) {
            console.error('❌ Errore calcolo solo numero settimana:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FUNZIONE 9: Settimana corrente
     */
    async getSettimanaCorrente(params) {
        try {
            console.log('📅 MIDDLEWARE: Richiesta settimana corrente');
            
            const now = new Date();
            const settimana = this.getWeekNumberSimple(now);
            const anno = now.getFullYear();
            const dataCorrente = now.toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const response = `📅 **Settimana Corrente**\n\n` +
                `🗓️ **Data**: ${dataCorrente}\n` +
                `📊 **Settimana**: ${settimana} dell'anno ${anno}\n\n` +
                `✅ Siamo nella settimana ${settimana} dell'anno ${anno}`;
            
            return {
                success: true,
                response: response,
                data: { 
                    settimana: settimana,
                    anno: anno,
                    dataCorrente: dataCorrente,
                    timestamp: now.toISOString()
                }
            };
            
        } catch (error) {
            console.error('❌ Errore calcolo settimana corrente:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * FUNZIONE 10: Orario corrente
     */
    async getOrarioCorrente(params) {
        try {
            console.log('🕐 MIDDLEWARE: Richiesta orario corrente');
            
            const now = new Date();
            const ore = now.getHours();
            const minuti = now.getMinutes();
            const secondi = now.getSeconds();
            
            // Formattazione orario
            const orarioFormattato = `${ore.toString().padStart(2, '0')}:${minuti.toString().padStart(2, '0')}:${secondi.toString().padStart(2, '0')}`;
            
            const response = `🕐 **Orario Corrente**\n\n` +
                `⏰ **Ora esatta**: ${orarioFormattato}\n` +
                `🕐 Sono le ${ore} e ${minuti} minuti${secondi > 0 ? ` e ${secondi} secondi` : ''}`;
            
            return {
                success: true,
                response: response,
                data: { 
                    ore: ore,
                    minuti: minuti,
                    secondi: secondi,
                    orarioFormattato: orarioFormattato,
                    timestamp: now.toISOString()
                }
            };
            
        } catch (error) {
            console.error('❌ Errore recupero orario corrente:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * FUNZIONE 11: Data corrente
     */
    async getDataCorrente(params) {
        try {
            console.log('📅 MIDDLEWARE: Richiesta data corrente');
            
            const now = new Date();
            const dataCompleta = now.toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const dataBreve = now.toLocaleDateString('it-IT');
            const settimana = this.getWeekNumberSimple(now);
            
            const response = `📅 **Data Corrente**\n\n` +
                `🗓️ **Oggi è**: ${dataCompleta}\n` +
                `📆 **Data**: ${dataBreve}\n` +
                `📊 **Settimana**: ${settimana} del ${now.getFullYear()}`;
            
            return {
                success: true,
                response: response,
                data: { 
                    dataCompleta: dataCompleta,
                    dataBreve: dataBreve,
                    settimana: settimana,
                    anno: now.getFullYear(),
                    timestamp: now.toISOString()
                }
            };
            
        } catch (error) {
            console.error('❌ Errore recupero data corrente:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * FUNZIONE 12: Interrogazione Clienti Database
     */
    async getClientiDatabase(params) {
        try {
            console.log('🗄️ MIDDLEWARE: Interrogazione clienti database');
            
            // Prova prima con i dati Supabase
            const supabaseAI = this.supabaseAI;
            console.log('🔍 DEBUG: this.supabaseAI disponibile?', !!supabaseAI);
            console.log('🔍 DEBUG: this.supabaseAI.isConnected?', supabaseAI && supabaseAI.isConnected && supabaseAI.isConnected());
            
            if (supabaseAI && supabaseAI.isConnected && supabaseAI.isConnected()) {
                const allData = await supabaseAI.getAllData();
                const historicalData = allData.historical || [];
                
                console.log('🔍 DEBUG: historicalData length:', historicalData.length);
                console.log('🔍 DEBUG: primi 2 record historical:', historicalData.slice(0, 2));
                
                if (historicalData.length > 0) {
                    // Estrai clienti dai dati storici Supabase
                    const clientiMap = new Map();
                    
                    historicalData.forEach((row, index) => {
                        const cliente = row.cliente;
                        const importo = parseFloat(row.importo) || 0;
                        const numeroOrdine = row.numero_ordine;
                        
                        if (index < 3) {
                            console.log(`🔍 DEBUG: Row ${index}:`, {
                                cliente,
                                importo,
                                numeroOrdine,
                                raw: row
                            });
                        }
                        
                        if (cliente && cliente.trim() !== '') {
                            if (!clientiMap.has(cliente)) {
                                clientiMap.set(cliente, {
                                    nome: cliente,
                                    partitaIva: row.partita_iva || '',
                                    indirizzo: row.indirizzo_consegna || '',
                                    ordini: new Set(),
                                    totalAmount: 0
                                });
                            }
                            
                            const clientInfo = clientiMap.get(cliente);
                            clientInfo.ordini.add(numeroOrdine);
                            clientInfo.totalAmount += importo;
                        }
                    });
                    
                    console.log('🔍 DEBUG: clientiMap size:', clientiMap.size);
                    console.log('🔍 DEBUG: clientiMap keys:', Array.from(clientiMap.keys()));
                    
                    // Ordina i clienti per totale importo
                    const clientiArray = Array.from(clientiMap.values());
                    clientiArray.sort((a, b) => b.totalAmount - a.totalAmount);
                    
                    // Prepara lista clienti per risposta
                    const top5Clienti = clientiArray.slice(0, 5).map(cliente => 
                        `• ${cliente.nome} (${cliente.ordini.size} ordini, €${cliente.totalAmount.toFixed(2)})`
                    );
                    
                    return {
                        success: true,
                        response: `👥 Totale clienti: ${clientiArray.length}\n\n📊 Top 5 clienti per fatturato:\n${top5Clienti.join('\n')}\n\n💰 Fatturato totale: €${clientiArray.reduce((sum, c) => sum + c.totalAmount, 0).toFixed(2)}`,
                        data: { clienti: clientiArray }
                    };
                }
            }
            
            return {
                success: true,
                response: '❌ Database ordini vuoto. Nessun cliente presente.',
                data: { clienti: [] }
            };
            
        } catch (error) {
            console.error('❌ Errore interrogazione clienti database:', error);
            return { 
                success: false, 
                error: `Errore nell'analisi del database: ${error.message}` 
            };
        }
    }

    /**
     * FUNZIONE NUOVA: Prossima settimana
     */
    async getProssimaSettimana(params) {
        try {
            console.log('📅 MIDDLEWARE: Calcolo prossima settimana');
            
            const now = new Date();
            const prossimaSettimana = new Date(now);
            prossimaSettimana.setDate(now.getDate() + 7);
            
            const settimanaCorrente = this.getWeekNumberSimple(now);
            const settimanaSuccessiva = this.getWeekNumberSimple(prossimaSettimana);
            const anno = prossimaSettimana.getFullYear();
            
            const response = `📅 **Settimana Successiva**\n\n` +
                `📊 **Settimana corrente**: ${settimanaCorrente}\n` +
                `➡️ **Prossima settimana**: ${settimanaSuccessiva} dell'anno ${anno}\n\n` +
                `✅ La prossima settimana sarà la numero ${settimanaSuccessiva}`;
            
            return {
                success: true,
                response: response,
                data: { 
                    settimanaCorrente: settimanaCorrente,
                    settimanaSuccessiva: settimanaSuccessiva,
                    anno: anno,
                    timestamp: now.toISOString()
                }
            };
            
        } catch (error) {
            console.error('❌ Errore calcolo prossima settimana:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FUNZIONE NUOVA: Settimane future
     */
    async getSettimanoFuture(params) {
        try {
            console.log('📅 MIDDLEWARE: Calcolo settimane future');
            
            const now = new Date();
            const settimaneAggiungere = params.numeroSettimane || 1;
            
            const dataFutura = new Date(now);
            dataFutura.setDate(now.getDate() + (settimaneAggiungere * 7));
            
            const settimanaCorrente = this.getWeekNumberSimple(now);
            const settimanaFutura = this.getWeekNumberSimple(dataFutura);
            const anno = dataFutura.getFullYear();
            
            // Controlla se è una richiesta di solo numero
            if (params.originalInput && /(?:dammi|dimmi)\s+.*(?:numero|n\.?)/i.test(params.originalInput)) {
                console.log('📅 MIDDLEWARE: Richiesta solo numero settimana futura');
                return {
                    success: true,
                    response: `${settimanaFutura}`,
                    data: { settimana: settimanaFutura }
                };
            }
            
            const response = `📅 **Settimana Futura**\n\n` +
                `📊 **Settimana corrente**: ${settimanaCorrente}\n` +
                `➡️ **Tra ${settimaneAggiungere} settimane**: ${settimanaFutura} dell'anno ${anno}\n\n` +
                `✅ Fra ${settimaneAggiungere} settimane saremo nella settimana ${settimanaFutura}`;
            
            return {
                success: true,
                response: response,
                data: { 
                    settimanaCorrente: settimanaCorrente,
                    settimanaFutura: settimanaFutura,
                    settimaneAggiungere: settimaneAggiungere,
                    anno: anno,
                    timestamp: now.toISOString()
                }
            };
            
        } catch (error) {
            console.error('❌ Errore calcolo settimane future:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FUNZIONE NUOVA: Dettagli settimana specifica
     */
    async getDettagliSettimana(params) {
        try {
            console.log('📅 MIDDLEWARE: Dettagli settimana specifica');
            
            const numeroSettimana = params.numeroSettimana || 1;
            const anno = new Date().getFullYear();
            
            const weekDates = this.getWeekDates(anno, numeroSettimana);
            const dataInizio = weekDates.start.toLocaleDateString('it-IT');
            const dataFine = weekDates.end.toLocaleDateString('it-IT');
            
            const meseInizio = weekDates.start.toLocaleDateString('it-IT', { month: 'long' });
            const meseFine = weekDates.end.toLocaleDateString('it-IT', { month: 'long' });
            
            let response = `📅 **Dettagli Settimana ${numeroSettimana}**\n\n` +
                `📆 **Inizio**: ${dataInizio}\n` +
                `📆 **Fine**: ${dataFine}\n\n`;
            
            if (meseInizio === meseFine) {
                response += `🗓️ **Mese**: ${meseInizio}\n`;
            } else {
                response += `🗓️ **Mesi**: ${meseInizio} - ${meseFine}\n`;
            }
            
            response += `\n✅ La settimana ${numeroSettimana} va dal ${dataInizio} al ${dataFine}`;
            
            return {
                success: true,
                response: response,
                data: { 
                    numeroSettimana: numeroSettimana,
                    anno: anno,
                    dataInizio: dataInizio,
                    dataFine: dataFine,
                    meseInizio: meseInizio,
                    meseFine: meseFine,
                    weekDates: weekDates
                }
            };
            
        } catch (error) {
            console.error('❌ Errore dettagli settimana specifica:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FUNZIONE NUOVA: Ordini per settimana specifica
     */
    async getOrdiniPerSettimana(params) {
        try {
            console.log('📊 MIDDLEWARE: Ricerca ordini per settimana', params.numeroSettimana);
            
            const numeroSettimana = params.numeroSettimana || 1;
            const anno = new Date().getFullYear();
            
            // Carica i dati degli ordini - usa la stessa logica delle altre funzioni
            let ordini = this.supabaseAI.historicalOrders?.sampleData || [];
            if (ordini.length === 0) {
                console.log('📊 MIDDLEWARE: Dati non ancora caricati, caricamento necessario...');
                const supabaseData = await this.supabaseAI.getAllData();
                ordini = supabaseData.historicalOrders?.sampleData || [];
            }
            
            // Se ancora non ci sono dati, prova con .historical
            if (ordini.length === 0) {
                const allData = await this.supabaseAI.getAllData();
                ordini = allData.historical || [];
            }
            
            console.log('📊 DEBUG: Ordini caricati:', ordini.length);
            if (ordini.length > 0) {
                console.log('📊 DEBUG: Primo ordine:', ordini[0]);
            }
            
            if (ordini.length === 0) {
                return {
                    success: true,
                    response: '❌ Nessun ordine presente nel database',
                    data: { ordini: 0, settimana: numeroSettimana }
                };
            }
            
            // Filtra ordini per settimana specifica
            const ordiniSettimana = this.filterOrdersByWeek(ordini, numeroSettimana, anno);
            
            console.log('📊 DEBUG: Ordini filtrati per settimana', numeroSettimana, ':', ordiniSettimana.length);
            
            // Conta ordini unici
            const ordiniUnici = new Set();
            ordiniSettimana.forEach(ordine => {
                if (ordine.numero_ordine) {
                    ordiniUnici.add(ordine.numero_ordine);
                }
            });
            
            console.log('📊 DEBUG: Ordini unici:', ordiniUnici.size);
            
            // Calcola date settimana per la risposta
            const weekDates = this.getWeekDates(anno, numeroSettimana);
            const dataInizio = weekDates.start.toLocaleDateString('it-IT');
            const dataFine = weekDates.end.toLocaleDateString('it-IT');
            
            const response = `📊 **Ordini Settimana ${numeroSettimana}**\n\n` +
                `📅 **Periodo**: ${dataInizio} - ${dataFine}\n` +
                `🛒 **Ordini totali**: ${ordiniUnici.size}\n` +
                `📋 **Righe ordine**: ${ordiniSettimana.length}\n\n` +
                `✅ Nella settimana ${numeroSettimana} sono stati fatti ${ordiniUnici.size} ordini`;
            
            return {
                success: true,
                response: response,
                data: { 
                    ordiniTotali: ordiniUnici.size,
                    righeOrdine: ordiniSettimana.length,
                    settimana: numeroSettimana,
                    anno: anno,
                    dataInizio: dataInizio,
                    dataFine: dataFine,
                    ordiniDettaglio: ordiniSettimana
                }
            };
            
        } catch (error) {
            console.error('❌ Errore ricerca ordini per settimana:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FUNZIONE NUOVA: Fatturato per settimana specifica
     */
    async getFatturatoPerSettimana(params) {
        try {
            console.log('💰 MIDDLEWARE: Calcolo fatturato per settimana', params.numeroSettimana);
            
            const numeroSettimana = params.numeroSettimana || 1;
            const anno = new Date().getFullYear();
            
            // Carica i dati degli ordini - usa la stessa logica delle altre funzioni
            let ordini = this.supabaseAI.historicalOrders?.sampleData || [];
            if (ordini.length === 0) {
                console.log('📊 MIDDLEWARE: Dati non ancora caricati, caricamento necessario...');
                const supabaseData = await this.supabaseAI.getAllData();
                ordini = supabaseData.historicalOrders?.sampleData || [];
            }
            
            // Se ancora non ci sono dati, prova con .historical
            if (ordini.length === 0) {
                const allData = await this.supabaseAI.getAllData();
                ordini = allData.historical || [];
            }
            
            console.log('💰 DEBUG: Ordini caricati:', ordini.length);
            if (ordini.length > 0) {
                console.log('💰 DEBUG: Primo ordine:', ordini[0]);
            }
            
            if (ordini.length === 0) {
                return {
                    success: true,
                    response: '❌ Nessun ordine presente nel database',
                    data: { fatturato: 0, settimana: numeroSettimana }
                };
            }
            
            // Filtra ordini per settimana specifica
            const ordiniSettimana = this.filterOrdersByWeek(ordini, numeroSettimana, anno);
            
            // Calcola fatturato totale
            let fatturatoTotale = 0;
            const ordiniUnici = new Set();
            
            ordiniSettimana.forEach(ordine => {
                const importo = parseFloat(ordine.importo) || 0;
                fatturatoTotale += importo;
                
                if (ordine.numero_ordine) {
                    ordiniUnici.add(ordine.numero_ordine);
                }
            });
            
            // Calcola date settimana per la risposta
            const weekDates = this.getWeekDates(anno, numeroSettimana);
            const dataInizio = weekDates.start.toLocaleDateString('it-IT');
            const dataFine = weekDates.end.toLocaleDateString('it-IT');
            
            const response = `💰 **Fatturato Settimana ${numeroSettimana}**\n\n` +
                `📅 **Periodo**: ${dataInizio} - ${dataFine}\n` +
                `💶 **Fatturato totale**: €${fatturatoTotale.toFixed(2)}\n` +
                `🛒 **Ordini**: ${ordiniUnici.size}\n` +
                `📋 **Righe ordine**: ${ordiniSettimana.length}\n\n` +
                `✅ Nella settimana ${numeroSettimana} è stato prodotto un fatturato di €${fatturatoTotale.toFixed(2)}`;
            
            return {
                success: true,
                response: response,
                data: { 
                    fatturatoTotale: fatturatoTotale,
                    ordiniTotali: ordiniUnici.size,
                    righeOrdine: ordiniSettimana.length,
                    settimana: numeroSettimana,
                    anno: anno,
                    dataInizio: dataInizio,
                    dataFine: dataFine,
                    ordiniDettaglio: ordiniSettimana
                }
            };
            
        } catch (error) {
            console.error('❌ Errore calcolo fatturato per settimana:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FUNZIONE HELPER: Filtra ordini per settimana specifica
     */
    filterOrdersByWeek(ordini, numeroSettimana, anno) {
        console.log('🔍 DEBUG: Filtro ordini per settimana', numeroSettimana, 'anno', anno);
        console.log('🔍 DEBUG: Ordini da filtrare:', ordini.length);
        
        return ordini.filter((ordine, index) => {
            // Cerca la data migliore disponibile
            const dateFields = ['data', 'data_ordine', 'data_consegna', 'data_documento', 'created_at', 'timestamp'];
            
            for (const field of dateFields) {
                if (ordine[field] && ordine[field] !== null && ordine[field] !== '') {
                    let dataOrdine = null;
                    
                    // Usa parser italiano per date corrette
                    if (window.ItalianDateParser) {
                        // Prima prova il parser Supabase per date ISO che rappresentano formato americano
                        dataOrdine = window.ItalianDateParser.parseSupabaseDateToItalian(ordine[field]);
                        
                        // Se non funziona, usa il parser generico
                        if (!dataOrdine) {
                            dataOrdine = window.ItalianDateParser.parseDate(ordine[field]);
                        }
                    } else {
                        // Fallback
                        dataOrdine = new Date(ordine[field]);
                    }
                    
                    if (dataOrdine && !isNaN(dataOrdine.getTime())) {
                        const settimanaOrdine = this.getWeekNumberSimple(dataOrdine);
                        const annoOrdine = dataOrdine.getFullYear();
                        
                        if (index < 3) { // Debug solo i primi 3 ordini
                            console.log(`🔍 DEBUG: Ordine ${index}, field ${field}: ${ordine[field]} -> settimana ${settimanaOrdine}, anno ${annoOrdine}`);
                        }
                        
                        // Controlla se l'ordine è nella settimana richiesta
                        if (settimanaOrdine === numeroSettimana && annoOrdine === anno) {
                            console.log(`✅ DEBUG: Match trovato per ordine ${ordine.numero_ordine}`);
                            return true;
                        }
                    }
                }
            }
            
            return false;
        });
    }

    /**
     * FUNZIONE HELPER: Calcola date inizio/fine settimana (versione corretta)
     */
    getWeekDates(year, weekNumber) {
        // Trova il primo giovedì dell'anno (settimana 1 ISO)
        const jan1 = new Date(year, 0, 1);
        const firstThursday = new Date(jan1);
        firstThursday.setDate(jan1.getDate() + (4 - jan1.getDay()) % 7);
        
        // Calcola la data del lunedì della settimana richiesta
        const monday = new Date(firstThursday);
        monday.setDate(firstThursday.getDate() - 3 + (weekNumber - 1) * 7);
        
        // Calcola la domenica (fine settimana)
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        return {
            start: monday,
            end: sunday
        };
    }
}

// Export per uso in altri moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RequestMiddleware;
}

console.log('✅ RequestMiddleware caricato');