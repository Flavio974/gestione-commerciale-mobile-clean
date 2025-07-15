/**
 * AI CONFIGURATION
 * Configurazione globale per i provider AI
 */

window.AI_CONFIG = {
    // OpenAI Configuration
    openai: {
        apiKey: 'backend', // Usa sempre il backend per sicurezza
        defaultModel: 'o1-preview' // Modello di ragionamento come default
    },
    
    // Anthropic Configuration  
    anthropic: {
        apiKey: 'backend', // Usa sempre il backend per sicurezza
        defaultModel: 'claude-opus-4-20250514' // Claude 4 come default
    },
    
    // Backend endpoint per API keys server-side
    apiEndpoint: '/.netlify/functions/claude-ai',
    
    // Usa backend per le API keys (più sicuro)
    useBackend: true,
    
    // Auto-inizializza i provider
    autoInit: true
};

// Inizializza automaticamente i provider quando disponibili
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.OpenAI && !window.OpenAI.isInitialized) {
            console.log('🔧 Auto-inizializzazione OpenAI...');
            window.OpenAI.init('backend');
        }
        if (window.AnthropicAI && !window.AnthropicAI.isInitialized) {
            console.log('🔧 Auto-inizializzazione Anthropic...');
            window.AnthropicAI.init('backend');
        }
    }, 1000);
});

console.log('✅ AI Config caricato con auto-init');