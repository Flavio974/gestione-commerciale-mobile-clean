/**
 * SCRIPT DIAGNOSTICO - Test Fix Vocabolario
 * Verifica che il VocabularyManager carichi correttamente il nuovo formato categorizzato
 */

console.log("=== 🔍 DIAGNOSTICA VOCABOLARIO POST-FIX ===");

async function testVocabularyFix() {
    try {
        // 1. Test caricamento VocabularyManager
        if (!window.VocabularyManager) {
            console.error("❌ VocabularyManager non disponibile");
            return;
        }
        
        console.log("✅ VocabularyManager disponibile");
        
        // 2. Crea istanza e carica vocabolario
        const vm = new VocabularyManager();
        console.log("✅ Istanza VocabularyManager creata");
        
        // 3. Forza ricaricamento vocabolario
        await vm.loadVocabulary(true);
        console.log("✅ Vocabolario ricaricato");
        
        // 4. Verifica struttura caricata
        console.log("📊 STATISTICHE VOCABOLARIO:");
        console.log("   - Sistema commands:", vm.systemVocabulary?.length || 0);
        console.log("   - User commands:", vm.userVocabulary?.length || 0);
        console.log("   - Total commands:", vm.vocabulary?.commands?.length || 0);
        
        // 5. Test specifici comandi dal nuovo formato
        const testCommands = [
            "quanti clienti",
            "fatturato del mese", 
            "mostrami ordini di ieri",
            "lista clienti"
        ];
        
        console.log("🧪 TEST MATCHING COMANDI:");
        for (const cmd of testCommands) {
            try {
                const match = await vm.findMatch(cmd);
                if (match) {
                    console.log(`✅ "${cmd}" → ${match.command.id} (${match.command.action})`);
                } else {
                    console.log(`❌ "${cmd}" → NO MATCH`);
                }
            } catch (error) {
                console.error(`❌ "${cmd}" → ERROR:`, error.message);
            }
        }
        
        // 6. Verifica formato comandi estratti
        if (vm.systemVocabulary?.length > 0) {
            console.log("🔍 ESEMPIO COMANDO ESTRATTO:");
            const sample = vm.systemVocabulary[0];
            console.log("   - ID:", sample.id);
            console.log("   - Pattern:", sample.pattern);
            console.log("   - Action:", sample.action);
            console.log("   - Params:", JSON.stringify(sample.params));
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ ERRORE TEST:", error);
        return false;
    }
}

// Esegui test automaticamente se in browser
if (typeof window !== 'undefined') {
    // Attendi che il DOM sia pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', testVocabularyFix);
    } else {
        // Test con delay per assicurarsi che i moduli siano caricati
        setTimeout(testVocabularyFix, 2000);
    }
}

// Export per uso manuale
window.testVocabularyFix = testVocabularyFix;

console.log("📝 Script diagnostico pronto. Eseguire testVocabularyFix() per test manuale.");