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

// Carica Supabase client se le credenziali sono configurate
if (SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' && SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY') {
  // Carica Supabase client da CDN se non è già caricato
  if (!window.supabase) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => {
      window.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      console.log('✅ Supabase client inizializzato con successo');
      
      // Test connessione
      window.supabase.from('timeline_events').select('*').then(result => {
        console.log('🔍 Test connessione Supabase - Eventi trovati:', result.data?.length);
        console.log('🔍 Primi eventi:', result.data?.slice(0, 2));
      }).catch(error => {
        console.error('❌ Errore test connessione:', error);
      });
    };
    document.head.appendChild(script);
  }
  console.log('🔧 Configurazione Supabase caricata e client in inizializzazione...');
} else {
  console.log('🔧 Configurazione Supabase caricata (credenziali placeholder)');
}