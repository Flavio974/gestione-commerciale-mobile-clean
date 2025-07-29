// Fix temporaneo per resettare il vocabolario
console.log('🔧 FIX RESET VOCABOLARIO - Forzo caricamento dal file TXT...');

(async function() {
    // Rimuove il vocabolario corrotto dal localStorage
    localStorage.removeItem('vocabulary_user');
    console.log('🗑️ Rimosso vocabulary_user dal localStorage');
    
    // Se la tab comandi è aperta, forza il reload
    if (window.comandiModule) {
        console.log('🔄 Ricaricamento vocabolario...');
        try {
            await window.comandiModule.loadVocabolario();
            console.log('✅ Vocabolario ricaricato dal file!');
        } catch (error) {
            console.error('❌ Errore ricaricamento:', error);
        }
    } else {
        console.log('ℹ️ Tab comandi non ancora aperta - il vocabolario verrà caricato all\'apertura');
    }
    
    // Funzione helper globale per debug
    window.resetVocabolario = async function() {
        localStorage.removeItem('vocabulary_user');
        if (window.comandiModule) {
            await window.comandiModule.loadVocabolario();
        }
        console.log('✅ Vocabolario resettato!');
    };
    
    console.log('💡 Usa window.resetVocabolario() per resettare manualmente');
})();