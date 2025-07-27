// FIX DIRETTO PER IL CONTEGGIO CLIENTI
// Copia e incolla questo nella console del browser

(async function() {
    console.log('🔧 APPLICAZIONE FIX CONTEGGIO CLIENTI...');
    
    // 1. Test diretto del conteggio
    if (window.supabaseAI && window.supabaseAI.getClientsCount) {
        console.log('✅ getClientsCount disponibile');
        try {
            const count = await window.supabaseAI.getClientsCount();
            console.log('📊 CONTEGGIO CLIENTI CORRETTO:', count);
        } catch (e) {
            console.error('❌ Errore:', e);
        }
    }
    
    // 2. Intercetta il VocabularyManager per correggere il comportamento
    if (window.vocabularyManager) {
        const originalProcess = window.vocabularyManager.processCommand;
        
        window.vocabularyManager.processCommand = function(input) {
            console.log('🎯 VocabularyManager.processCommand:', input);
            
            // Se è una richiesta clienti, assicurati che ritorni il comando giusto
            if (input && input.toLowerCase().includes('clienti') && input.toLowerCase().includes('quanti')) {
                console.log('✅ OVERRIDE: Forzando comando countClients');
                return {
                    id: 'count_clients',
                    action: 'countClients',
                    params: {},
                    confidence: 1.0
                };
            }
            
            // Altrimenti usa il comportamento originale
            return originalProcess.call(this, input);
        };
        
        console.log('✅ VocabularyManager patchato');
    }
    
    // 3. Intercetta AIMiddleware per assicurarsi che usi il conteggio corretto
    if (window.aiMiddleware && window.aiMiddleware.handleCountClients) {
        const original = window.aiMiddleware.handleCountClients;
        
        window.aiMiddleware.handleCountClients = async function(params, userInput, context) {
            console.log('🎯 AIMiddleware.handleCountClients chiamato');
            
            // Usa direttamente getClientsCount invece del metodo che conta dai dati storici
            if (window.supabaseAI && window.supabaseAI.getClientsCount) {
                const count = await window.supabaseAI.getClientsCount();
                const response = `Nel database ci sono ${count} clienti.`;
                console.log('✅ RISPOSTA CORRETTA:', response);
                return response;
            }
            
            // Fallback al comportamento originale
            return original.call(this, params, userInput, context);
        };
        
        console.log('✅ AIMiddleware.handleCountClients patchato');
    }
    
    console.log('✅ FIX APPLICATO! Ora prova a chiedere "Quanti clienti ci sono nel database?"');
    
})();