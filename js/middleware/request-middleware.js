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
            percorsi: ['tempo', 'distanza', 'percorso', 'viaggio', 'minuti', 'km'],
            clienti: ['cliente', 'clienti', 'zona', 'nome']
        };
        
        // Pattern regex per estrazione parametri
        this.patterns = {
            fatturato: /(?:fatturato|venduto|incasso).*?(?:con|di|del|da|cliente|per)\s+(?:cliente\s+)?([A-Za-z\s]+?)(?:\s+(?:in|con|da|per|base|ai|dati|caricati)|\?|$)/i,
            ordiniCliente: /(?:quanti|numero).*ordini.*?(?:con|di|del|da|cliente|per)\s+(?:cliente\s+)?([A-Za-z\s]+?)(?:\s+(?:in|con|da|per|base|ai|dati|caricati)|\?|$)/i,
            tempoPercorso: /(?:tempo|minuti).*(?:da|dalla)\s+([^a]+?)\s+(?:a|alla)\s+([^?\n]+?)(?:\?|$)/i,
            clientiZona: /clienti.*(?:in|nella|di|della)\s+([^?\n]+?)(?:\?|$)/i
        };
        
        console.log('🤖 RequestMiddleware inizializzato');
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
        
        if (this.operativeKeywords.ordini.some(kw => inputLower.includes(kw))) {
            return 'ordini';
        }
        
        if (this.operativeKeywords.percorsi.some(kw => inputLower.includes(kw))) {
            return 'percorsi';
        }
        
        if (this.operativeKeywords.clienti.some(kw => inputLower.includes(kw))) {
            return 'clienti';
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
                const fatturatoMatch = input.match(this.patterns.fatturato);
                if (fatturatoMatch) {
                    params.cliente = fatturatoMatch[1].trim();
                }
                break;
                
            case 'ordini':
                const ordiniMatch = input.match(this.patterns.ordiniCliente);
                if (ordiniMatch) {
                    params.cliente = ordiniMatch[1].trim();
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
            
            // Recupera dati da Supabase
            const supabaseData = await this.supabaseAI.getAllData();
            const ordini = supabaseData.historicalOrders?.sampleData || [];
            
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
            
            const supabaseData = await this.supabaseAI.getAllData();
            const ordini = supabaseData.historicalOrders?.sampleData || [];
            
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
            
            // Analisi aggiuntiva
            const ultimoOrdine = ordiniCliente.sort((a, b) => new Date(b.data) - new Date(a.data))[0];
            const nomeCliente = ordiniCliente[0].cliente;
            
            return {
                success: true,
                response: `📊 Cliente ${nomeCliente}: ${ordiniDistinti} ordini distinti (${ordiniCliente.length} righe totali). Ultimo: ${ultimoOrdine.data}`,
                data: { 
                    cliente: nomeCliente,
                    ordini: ordiniDistinti,
                    righe: ordiniCliente.length,
                    ultimoOrdine: ultimoOrdine.data,
                    dettaglio: ordiniCliente.slice(0, 3)
                }
            };
            
        } catch (error) {
            console.error('❌ Errore conteggio ordini:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * FUNZIONE 3: Calcolo Tempo Percorso
     */
    async calculatePercorso(params) {
        try {
            console.log('🚗 MIDDLEWARE: Calcolo percorso da:', params.da, 'a:', params.a);
            
            const supabaseData = await this.supabaseAI.getAllData();
            const percorsi = supabaseData.percorsi || [];
            
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
            
            const supabaseData = await this.supabaseAI.getAllData();
            const clienti = supabaseData.clients || [];
            
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