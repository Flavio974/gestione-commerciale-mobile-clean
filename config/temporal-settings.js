/**
 * CONFIGURAZIONE SISTEMA TEMPORALE
 * Impostazioni per il parsing e gestione delle date
 */
console.log('[LOAD] ✅ temporal-settings.js caricato correttamente');
console.log('[DEBUG] temporal-settings execution context:', typeof self, typeof window);
console.log('[DEBUG] document available?', typeof document);

// ✅ TEMPORAL POLYFILL GUARD: Verifica disponibilità Temporal
if (typeof Temporal === 'undefined') {
    console.warn('[temporal-settings] Polyfill Temporal mancante – script uscita sicura');
    throw new Error('[temporal-settings] Temporal non disponibile');
}

// ✅ WORKER-SAFE GUARD: Evita esecuzione in contesti senza DOM
if (typeof window === 'undefined') {
    console.warn('[temporal-settings] Caricato in Worker/Isolated context: modulo disabilitato');
    throw new Error('[temporal-settings] Contesto Worker non supportato');
}

console.log('[temporal-settings] Contesto DOM valido e Temporal disponibile, inizializzazione completa');

const TEMPORAL_CONFIG = {
    // Localizzazione
    locale: 'it-IT',
    timezone: 'Europe/Rome',
    
    // Impostazioni settimana
    primoGiornoSettimana: 1, // 1 = Lunedì (standard europeo)
    
    // Formati di output
    formatoOutput: 'dd/mm/yyyy',
    formatoISO: 'yyyy-mm-dd',
    
    // Comportamenti
    fallbackSeNonCapisce: 'oggi',
    logDebug: true,
    
    // Configurazioni avanzate
    tolleranzaFuzzyMatching: 0.8,
    maxGiorniRange: 365,
    
    // Alias comuni per i mesi
    aliasMesi: {
        'gen': 'gennaio',
        'feb': 'febbraio', 
        'mar': 'marzo',
        'apr': 'aprile',
        'mag': 'maggio',
        'giu': 'giugno',
        'lug': 'luglio',
        'ago': 'agosto',
        'set': 'settembre',
        'ott': 'ottobre',
        'nov': 'novembre',
        'dic': 'dicembre'
    },
    
    // Alias per giorni della settimana
    aliasGiorni: {
        'lun': 'lunedì',
        'mar': 'martedì',
        'mer': 'mercoledì',
        'gio': 'giovedì',
        'ven': 'venerdì',
        'sab': 'sabato',
        'dom': 'domenica'
    },
    
    // Parole chiave per identificare espressioni temporali
    parolaChiaveTemporali: [
        'oggi', 'ieri', 'domani', 'settimana', 'mese', 'anno',
        'giorni', 'prossimo', 'scorso', 'corrente', 'passato',
        'fa', 'tra', 'fra', 'dopo', 'prima', 'weekend', 'fine'
    ],
    
    // Pattern di escape per evitare falsi positivi
    patternsEscape: [
        'email', 'telefono', 'codice', 'numero', 'id',
        'prezzo', 'euro', 'dollaro', 'costo'
    ]
};

// Export per Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TEMPORAL_CONFIG;
}

// Disponibile globalmente nel browser
if (typeof window !== 'undefined') {
    window.TEMPORAL_CONFIG = TEMPORAL_CONFIG;
}

console.log('⚙️ Configurazione temporale caricata');