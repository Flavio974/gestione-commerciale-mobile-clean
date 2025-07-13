/**
 * Configurazione Supabase
 * IMPORTANTE: Sostituisci con le tue credenziali reali
 */

const SUPABASE_CONFIG = {
  url: 'https://ibuwqihgdkinfmvxqfnq.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidXdxaWhnZGtpbmZtdnhxZm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMDk4NjEsImV4cCI6MjA2Njc4NTg2MX0.c-zsnXM-eqXnIZQXM9UwXlKhvDDcPsDSwqANZk0uDqY',
  
  // Configurazione sync
  enableSync: true, // Ora abilitato con le credenziali corrette
  fallbackToLocal: true, // Sempre usa localStorage come fallback
  syncInterval: 30000, // 30 secondi
  
  // Tabelle
  tables: {
    events: 'timeline_events',
    orders: 'ordini', 
    clients: 'clienti',
    products: 'prodotti',
    routes: 'percorsi',
    documents: 'documenti_ddtft'
  }
};

// Inizializza Supabase client
window.SUPABASE_CONFIG = SUPABASE_CONFIG;

// 🔧 SISTEMA ROBUSTO INIZIALIZZAZIONE SUPABASE
if (SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' && SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY') {
  
  // Funzione per inizializzare il client Supabase
  function initializeSupabaseClient() {
    // ✅ WORKER-SAFE GUARD: Evita inizializzazione Supabase in Worker
    if (typeof window === 'undefined') {
      console.warn('[supabase-config] Caricato in Worker/Isolated context: Supabase non inizializzato');
      return false;
    }
    
    try {
      // Verifica se la libreria Supabase è disponibile
      if (typeof window.supabase === 'undefined') {
        console.error('❌ Libreria Supabase non caricata');
        return false;
      }
      
      // Controlla se è già un client inizializzato o la libreria
      if (typeof window.supabase.createClient === 'function') {
        // È la libreria, crea il client
        console.log('📚 Inizializzazione client da libreria Supabase...');
        try {
          window.supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
          console.log('✅ Supabase client inizializzato con successo');
        } catch (error) {
          console.error('❌ Errore creazione client Supabase:', error);
          // ✅ FALLBACK: Usa import ESM se UMD fallisce (Worker context)
          if (typeof importScripts !== 'undefined') {
            console.log('🔧 Tentativo fallback ESM per Worker context...');
            // In Worker context, usa ESM import
            return false; // Segnala fallimento, gestito altrove
          }
        }
      } else if (window.supabase.from) {
        // È già un client inizializzato
        console.log('✅ Client Supabase già disponibile');
        window.supabaseClient = window.supabase;
      } else {
        console.error('❌ Oggetto Supabase non riconosciuto:', typeof window.supabase);
        return false;
      }
      
      // Test connessione
      if (window.supabaseClient) {
        window.supabaseClient.from('timeline_events').select('*').limit(5).then(result => {
          console.log('🔍 Test connessione Supabase - Eventi trovati:', result.data?.length || 0);
          if (result.data?.length > 0) {
            console.log('🔍 Primi eventi:', result.data.slice(0, 2));
          }
        }).catch(error => {
          console.warn('⚠️ Test connessione fallito (normale se tabella vuota):', error.message);
        });
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Errore inizializzazione Supabase:', error);
      return false;
    }
  }
  
  // Carica Supabase se non è già presente
  if (!window.supabase) {
    console.log('📦 Caricamento libreria Supabase...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    
    script.onload = () => {
      console.log('📚 Libreria Supabase caricata');
      setTimeout(initializeSupabaseClient, 100);
    };
    
    script.onerror = (error) => {
      console.error('❌ Errore caricamento libreria Supabase:', error);
    };
    
    document.head.appendChild(script);
  } else {
    // Supabase già presente, inizializza subito
    console.log('📚 Supabase già disponibile, inizializzazione...');
    setTimeout(initializeSupabaseClient, 100);
  }
  
  console.log('🔧 Configurazione Supabase caricata');
} else {
  console.log('🔧 Configurazione Supabase caricata (credenziali placeholder)');
}