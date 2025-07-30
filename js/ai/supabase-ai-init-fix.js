/**
 * Fix per inizializzazione corretta di SupabaseAIIntegration
 * Questo script garantisce che Supabase sia completamente inizializzato
 * prima di creare l'istanza di SupabaseAIIntegration
 */

(function() {
    console.log('🔧 [Supabase AI Init Fix] Avvio...');
    
    // Funzione per verificare se Supabase è pronto
    function isSupabaseReady() {
        // Controlla prima window.supabaseClient (prioritario)
        if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
            console.log('✅ window.supabaseClient è pronto');
            return true;
        }
        
        // Poi controlla window.supabase
        if (window.supabase && typeof window.supabase.from === 'function') {
            console.log('✅ window.supabase è un client valido');
            return true;
        }
        
        return false;
    }
    
    // Funzione per inizializzare SupabaseAIIntegration in modo sicuro
    function initializeSupabaseAI() {
        console.log('🚀 Tentativo inizializzazione SupabaseAIIntegration...');
        
        if (!isSupabaseReady()) {
            console.log('⏳ Supabase non ancora pronto, riprovo tra 500ms...');
            setTimeout(initializeSupabaseAI, 500);
            return;
        }
        
        // Se SupabaseAIIntegration non esiste, aspetta
        if (typeof window.SupabaseAIIntegration === 'undefined') {
            console.log('⏳ SupabaseAIIntegration class non ancora disponibile, riprovo tra 500ms...');
            setTimeout(initializeSupabaseAI, 500);
            return;
        }
        
       // Crea l'istanza SOLO se non esiste già
if (!window.supabaseAI) {
    console.log('🔄 Creazione nuova istanza SupabaseAIIntegration...');
    window.supabaseAI = new window.SupabaseAIIntegration();
} else {
    console.log('✅ SupabaseAI già esistente, verifico il client...');
    
    // Assicurati che usi il client corretto
    if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
        window.supabaseAI.supabase = window.supabaseClient;
        console.log('✅ Client Supabase aggiornato a window.supabaseClient');
    } else if (window.supabase && typeof window.supabase.from === 'function') {
        // Fallback solo se supabase è un client valido
        window.supabaseAI.supabase = window.supabase;
        console.log('⚠️ Usando window.supabase come fallback');
    } else {
        console.error('❌ Nessun client Supabase valido trovato!');
    }
}
        
        // Invalida la cache per forzare il refresh dei dati
        if (window.supabaseAI.invalidateCache) {
            window.supabaseAI.invalidateCache();
            console.log('🔄 Cache invalidata');
        }
        
        // Carica i dati iniziali
        if (window.supabaseAI.getAllData) {
            console.log('📊 Caricamento dati iniziali...');
            window.supabaseAI.getAllData(true).then(() => {
                console.log('✅ Dati caricati con successo');
            }).catch(error => {
                console.error('❌ Errore caricamento dati:', error);
            });
        }
        
        console.log('✅ [Supabase AI Init Fix] Inizializzazione completata');
    }
    
    // Avvia il processo di inizializzazione
    // Aspetta che il DOM sia pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initializeSupabaseAI, 1000); // Aspetta 1 secondo dopo DOMContentLoaded
        });
    } else {
        // DOM già pronto, inizia dopo un breve delay
        setTimeout(initializeSupabaseAI, 1000);
    }
    
})();