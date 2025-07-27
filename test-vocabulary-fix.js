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
        
        // 5. Test specifici comandi dal nuovo formato E comandi utente problematici
        const testCommands = [
            "quanti clienti",
            "fatturato del mese", 
            "mostrami ordini di ieri",
            "lista clienti",
            // Comandi specifici che prima fallivano
            "quali clienti abbiamo",
            "numero clienti nel database",
            "quanti clienti ci sono nel database"
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
        
        // 6. Test esecuzione completa per comandi critici
        console.log("🧪 TEST ESECUZIONE COMPLETA:");
        const criticalCommands = ["quali clienti abbiamo", "numero clienti nel database"];
        
        for (const cmd of criticalCommands) {
            try {
                const match = await vm.findMatch(cmd);
                if (match && match.command && match.command.action) {
                    console.log(`📝 Testando esecuzione: "${cmd}"`);
                    
                    // Controlla se aiMiddleware è disponibile
                    if (window.aiMiddleware && window.aiMiddleware.executeLocalAction) {
                        try {
                            const result = await window.aiMiddleware.executeLocalAction(match.command, cmd, null);
                            console.log(`✅ ESECUZIONE OK: "${cmd}" → ${result?.slice(0, 50)}...`);
                        } catch (execError) {
                            console.error(`❌ ERRORE ESECUZIONE: "${cmd}" →`, execError.message);
                        }
                    } else {
                        console.warn(`⚠️ aiMiddleware non disponibile per: "${cmd}"`);
                    }
                } else {
                    console.log(`❌ Match non valido per: "${cmd}"`);
                }
            } catch (error) {
                console.error(`❌ Errore test esecuzione: "${cmd}" →`, error.message);
            }
        }
        
        // 7. Verifica formato comandi estratti
        if (vm.systemVocabulary?.length > 0) {
            console.log("🔍 ESEMPIO COMANDO ESTRATTO:");
            const sample = vm.systemVocabulary[0];
            console.log("   - ID:", sample.id);
            console.log("   - Pattern:", sample.pattern);
            console.log("   - Action:", sample.action);
            console.log("   - Params:", JSON.stringify(sample.params));
        }
        
        // 8. Verifica auto-fix sui comandi utente
        if (vm.userVocabulary?.length > 0) {
            console.log("🔧 COMANDI UTENTE AUTO-FIXED:");
            const autoFixed = vm.userVocabulary.filter(cmd => cmd.autoFixed);
            console.log(`   - Totale comandi utente: ${vm.userVocabulary.length}`);
            console.log(`   - Comandi auto-riparati: ${autoFixed.length}`);
            if (autoFixed.length > 0) {
                autoFixed.forEach(cmd => {
                    console.log(`     ✅ "${cmd.pattern}" → ${cmd.action}`);
                });
            }
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