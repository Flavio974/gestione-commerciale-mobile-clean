// 🚨 SISTEMA EMERGENZA DEMO TAB
console.log('🚨 SISTEMA EMERGENZA DEMO TAB CARICATO!');
console.log('💡 Usa: emergencyOpenDemo() per aprire il tab demo');

// Funzione di emergenza per aprire il demo tab
window.emergencyOpenDemo = function() {
    console.log('🚨 APERTURA EMERGENZA TAB DEMO...');
    
    // NON nascondere tutti i contenuti - solo attivare il demo tab
    // Rimuovi active solo dai tab (non dai contenuti)
    document.querySelectorAll('.tab-link').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Trova o crea il contenuto demo
    let demoContent = document.getElementById('demo-content');
    if (!demoContent) {
        console.log('❌ Demo content non trovato - creazione...');
        demoContent = document.createElement('div');
        demoContent.id = 'demo-content';
        demoContent.className = 'tab-content active';
        demoContent.style.cssText = 'display: block !important; position: fixed !important; top: 60px !important; left: 0 !important; right: 0 !important; bottom: 0 !important; background: white !important; z-index: 9999 !important; overflow-y: auto !important; padding: 20px !important;';
        demoContent.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <div style="text-align: right; margin-bottom: 20px;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #ff4757; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 14px;">✕ Chiudi</button>
                </div>
                
                <h2 style="color: #00b894; margin-bottom: 20px; text-align: center;">🇮🇹 Sistema Date Italiane</h2>
                <p style="font-size: 16px; color: #666; margin-bottom: 30px; text-align: center;">Sistema completo per la gestione delle date in formato italiano.</p>
                
                <div id="demo-functions-container">
                    <!-- Contenuto demo verrà inserito qui -->
                </div>
            </div>
        `;
        document.body.appendChild(demoContent);
    }
    
    // Assicura che sia visibile
    demoContent.style.display = 'block';
    demoContent.classList.add('active');
    
    console.log('✅ Demo tab creato e visualizzato');
    
    // Avvia demo se disponibile
    if (window.initDateDemo) {
        setTimeout(() => window.initDateDemo(), 100);
    }
};

// Log di sicurezza
console.log('📱 Demo tab sistema rimosso - niente più interferenze');