/**
 * Script per riabilitare RequestMiddleware con fix clienti/ordini
 * Sostituisce il middleware disabilitato con la versione funzionante
 */

(async function enableRequestMiddlewareFix() {
    console.log('🔧 Riabilitazione RequestMiddleware con fix clienti/ordini...');
    
    try {
        // 1. Carica il nuovo RequestMiddleware
        if (typeof RequestMiddleware === 'undefined' || !window.RequestMiddleware) {
            console.log('📥 Caricamento request-middleware-fixed.js...');
            
            // Carica il file se non è già caricato
            const script = document.createElement('script');
            script.src = 'js/middleware/request-middleware-fixed.js';
            script.onload = () => {
                console.log('✅ request-middleware-fixed.js caricato');
                initializeFixedMiddleware();
            };
            script.onerror = () => {
                console.error('❌ Errore caricamento request-middleware-fixed.js');
            };
            document.head.appendChild(script);
        } else {
            initializeFixedMiddleware();
        }
        
    } catch (error) {
        console.error('❌ Errore riabilitazione RequestMiddleware:', error);
    }
})();

function initializeFixedMiddleware() {
    console.log('🔧 Inizializzazione RequestMiddleware fixed...');
    
    // 2. Verifica che SupabaseAI sia disponibile
    if (!window.supabaseAI) {
        console.log('⚠️ SupabaseAI non ancora disponibile, attendo...');
        setTimeout(initializeFixedMiddleware, 1000);
        return;
    }
    
    // 3. Crea istanza del nuovo middleware
    const fixedMiddleware = new RequestMiddleware(window.supabaseAI);
    
    // 4. Sostituisci il middleware esistente ovunque sia usato
    window.requestMiddleware = fixedMiddleware;
    
    // 5. Integra con EnhancedAIAssistant se disponibile
    if (window.enhancedAIAssistant && window.enhancedAIAssistant.middleware) {
        console.log('🔌 Integrazione con EnhancedAIAssistant...');
        window.enhancedAIAssistant.middleware = fixedMiddleware;
    }
    
    // 6. Integra con VocabolarioMiddleware se disponibile
    if (window.vocabolarioMiddleware && window.vocabolarioMiddleware.requestMiddleware) {
        console.log('🔌 Integrazione con VocabolarioMiddleware...');
        window.vocabolarioMiddleware.requestMiddleware = fixedMiddleware;
    }
    
    // 7. Patch del sistema AI per usare il nuovo middleware
    patchAISystem(fixedMiddleware);
    
    console.log('✅ RequestMiddleware fixed integrato con successo');
    console.log('🧪 Test: usa testRequestMiddlewareFix() per verificare');
    
    // 8. Crea funzione di test globale
    window.testRequestMiddlewareFix = async function() {
        console.log('🧪 Test RequestMiddleware Fix...');
        
        const testQueries = [
            "Quanti clienti ci sono nel database?",
            "Quanti ordini ci sono nel database?",
            "numero clienti",
            "numero ordini"
        ];
        
        for (const query of testQueries) {
            console.log(`\n--- Test: "${query}" ---`);
            
            try {
                const result = await fixedMiddleware.processRequest(query);
                console.log('Risultato:', result);
            } catch (error) {
                console.error('Errore:', error);
            }
        }
    };
}

function patchAISystem(fixedMiddleware) {
    console.log('🔧 Patch sistema AI per usare RequestMiddleware fixed...');
    
    // Cerca e patcha tutte le funzioni che potrebbero usare middleware
    const aiComponents = [
        'enhancedAIAssistant',
        'flavioAIAssistant', 
        'aiMiddleware',
        'vocabolarioMiddleware'
    ];
    
    aiComponents.forEach(componentName => {
        if (window[componentName]) {
            console.log(`🔌 Patch ${componentName}...`);
            
            // Sostituisci middleware se esiste
            if (window[componentName].middleware) {
                window[componentName].middleware = fixedMiddleware;
            }
            if (window[componentName].requestMiddleware) {
                window[componentName].requestMiddleware = fixedMiddleware;
            }
        }
    });
    
    // Patch speciale per EnhancedAIAssistant sendMessage
    if (window.EnhancedAIAssistant) {
        console.log('🔧 Patch speciale EnhancedAIAssistant...');
        
        // Intercetta sendMessage per usare il middleware fisso
        const originalSendMessage = window.EnhancedAIAssistant.sendMessage;
        
        window.EnhancedAIAssistant.sendMessage = async function(customMessage, isVoiceInput) {
            const message = customMessage || document.getElementById('aiInput')?.value?.trim();
            
            if (message) {
                console.log('🔍 Patch: Tentativo middleware prima dell\'AI...');
                
                try {
                    const middlewareResult = await fixedMiddleware.processRequest(message);
                    
                    if (middlewareResult.success) {
                        console.log('✅ Patch: Middleware ha gestito la richiesta');
                        
                        // Aggiungi alla chat
                        if (window.enhancedAIAssistant && window.enhancedAIAssistant.originalAssistant) {
                            window.enhancedAIAssistant.originalAssistant.messages.push({ 
                                role: 'user', 
                                content: message 
                            });
                            window.enhancedAIAssistant.originalAssistant.messages.push({ 
                                role: 'assistant', 
                                content: middlewareResult.text 
                            });
                            window.enhancedAIAssistant.originalAssistant.updateChat();
                            
                            // Pulisci input
                            const input = document.getElementById('aiInput');
                            if (input) input.value = '';
                        }
                        
                        return;
                    }
                } catch (error) {
                    console.error('❌ Patch: Errore middleware:', error);
                }
            }
            
            // Fallback all'AI originale
            return originalSendMessage.call(this, customMessage, isVoiceInput);
        };
    }
}

console.log('🚀 Script fix RequestMiddleware caricato');