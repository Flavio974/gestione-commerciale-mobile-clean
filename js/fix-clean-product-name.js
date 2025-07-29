// Fix per aggiungere il metodo cleanProductName mancante
console.log('🔧 FIX CLEAN PRODUCT NAME - Aggiunta metodo mancante...');

// Attendi che SupabaseAI sia pronto
setTimeout(() => {
    if (window.supabaseAI && !window.supabaseAI.cleanProductName) {
        console.log('🔧 Aggiunta cleanProductName a SupabaseAI...');
        
        // Aggiungi il metodo mancante
        window.supabaseAI.cleanProductName = function(name) {
            if (!name || typeof name !== 'string') return name;
            
            // Rimuove codici prodotto comuni
            let cleaned = name
                .replace(/^[A-Z0-9]+\s*-\s*/i, '') // Rimuove codici tipo "ABC123 - "
                .replace(/\s*\([^)]+\)$/g, '')      // Rimuove parentesi finali
                .replace(/\s+/g, ' ')               // Normalizza spazi
                .trim();
            
            return cleaned;
        };
        
        console.log('✅ cleanProductName aggiunto con successo!');
    } else if (window.supabaseAI?.cleanProductName) {
        console.log('✅ cleanProductName già presente');
    } else {
        console.error('❌ SupabaseAI non trovato!');
    }
}, 2000);

console.log('🔧 Fix cleanProductName schedulato');