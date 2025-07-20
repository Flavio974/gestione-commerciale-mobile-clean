/**
 * 🔧 FIX Smart Assistant Voice Recording Button
 * 
 * Questo script risolve il problema del pulsante di registrazione disabilitato
 * Applica il fix direttamente nel browser
 */

console.log('🔧 Applying Smart Assistant Voice Fix...');

// Fix 1: Forza l'abilitazione del pulsante se i permessi sono OK
async function forceEnableRecordingButton() {
    try {
        // Test rapido permessi microfono
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        
        // Trova e abilita il pulsante
        const startBtn = document.getElementById('start-recording-btn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.classList.add('ready');
            startBtn.style.opacity = '1';
            startBtn.style.cursor = 'pointer';
            
            console.log('✅ Recording button force-enabled');
            
            // Aggiorna status se presente
            const statusElement = document.querySelector('.recording-status .status-text');
            if (statusElement) {
                statusElement.textContent = 'Pronto per registrare';
                statusElement.parentElement.className = 'recording-status success';
            }
            
            return true;
        } else {
            console.warn('⚠️ Recording button not found');
            return false;
        }
    } catch (error) {
        console.error('❌ Microphone permission denied:', error);
        return false;
    }
}

// Fix 2: Controlla periodicamente e applica il fix se necessario
function setupPeriodicCheck() {
    const checkInterval = setInterval(() => {
        const startBtn = document.getElementById('start-recording-btn');
        const isSmartTabActive = document.getElementById('smart-content')?.style.display !== 'none';
        
        if (startBtn && startBtn.disabled && isSmartTabActive) {
            console.log('🔍 Found disabled recording button, attempting fix...');
            forceEnableRecordingButton().then(success => {
                if (success) {
                    console.log('✅ Fix applied successfully');
                    // Ferma il controllo una volta applicato il fix
                    clearInterval(checkInterval);
                }
            });
        }
    }, 2000); // Controlla ogni 2 secondi
    
    // Auto-stop dopo 30 secondi
    setTimeout(() => {
        clearInterval(checkInterval);
        console.log('🛑 Periodic check stopped');
    }, 30000);
}

// Fix 3: Override del metodo checkAudioSupport se esiste
function enhanceSmartAssistant() {
    if (window.SmartAssistant) {
        const originalCheckAudioSupport = window.SmartAssistant.checkAudioSupport;
        
        window.SmartAssistant.checkAudioSupport = async function() {
            console.log('🔧 Enhanced checkAudioSupport called');
            
            try {
                // Chiamata originale
                if (originalCheckAudioSupport) {
                    await originalCheckAudioSupport.call(this);
                }
                
                // Fix aggiuntivo
                await forceEnableRecordingButton();
                
            } catch (error) {
                console.error('❌ Enhanced checkAudioSupport error:', error);
                // Fallback: prova comunque il fix
                await forceEnableRecordingButton();
            }
        };
        
        console.log('✅ SmartAssistant enhanced');
    }
}

// Fix 4: Listener per tab changes
function setupTabListener() {
    // Ascolta clicks sui tab
    document.addEventListener('click', (e) => {
        if (e.target.id === 'tab-smart' || e.target.getAttribute('data-target') === 'smart-content') {
            console.log('🎤 Smart Assistant tab clicked');
            // Applica fix dopo un breve delay
            setTimeout(async () => {
                await forceEnableRecordingButton();
            }, 500);
        }
    });
}

// Fix 5: CSS override per assicurarsi che il pulsante sia visibile
function applyCSSFix() {
    const style = document.createElement('style');
    style.textContent = `
        #start-recording-btn.ready {
            opacity: 1 !important;
            cursor: pointer !important;
            background-color: #28a745 !important;
            border-color: #28a745 !important;
        }
        
        #start-recording-btn.ready:hover {
            background-color: #218838 !important;
            border-color: #1e7e34 !important;
        }
        
        /* Fix per eventuali problemi di z-index */
        .voice-controls {
            position: relative;
            z-index: 10;
        }
    `;
    document.head.appendChild(style);
    console.log('🎨 CSS fix applied');
}

// Esecuzione del fix
(function initializeFix() {
    console.log('🚀 Starting Smart Assistant Voice Fix...');
    
    // Applica CSS fix immediatamente
    applyCSSFix();
    
    // Configura listener tab
    setupTabListener();
    
    // Prova fix immediato se già nel tab Smart Assistant
    setTimeout(async () => {
        const isSmartTabActive = document.getElementById('smart-content')?.style.display !== 'none';
        if (isSmartTabActive) {
            await forceEnableRecordingButton();
        }
    }, 1000);
    
    // Migliora SmartAssistant se disponibile
    if (window.SmartAssistant) {
        enhanceSmartAssistant();
    } else {
        // Aspetta che SmartAssistant sia disponibile
        const waitForSmartAssistant = setInterval(() => {
            if (window.SmartAssistant) {
                enhanceSmartAssistant();
                clearInterval(waitForSmartAssistant);
            }
        }, 1000);
        
        // Stop after 10 seconds
        setTimeout(() => clearInterval(waitForSmartAssistant), 10000);
    }
    
    // Avvia controllo periodico
    setupPeriodicCheck();
    
    console.log('✅ Smart Assistant Voice Fix initialized');
})();

// Esponi funzioni globalmente per debug
window.smartAssistantVoiceFix = {
    forceEnable: forceEnableRecordingButton,
    checkStatus: () => {
        const btn = document.getElementById('start-recording-btn');
        return {
            found: !!btn,
            disabled: btn?.disabled,
            classes: btn?.className,
            style: btn?.style.cssText
        };
    }
};

console.log('🎤 Smart Assistant Voice Fix loaded! Use window.smartAssistantVoiceFix for debugging');