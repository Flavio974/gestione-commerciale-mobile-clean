// 🎤 SISTEMA PULSANTI FLOTTANTI VOCALI
let voiceControlsActive = false;
let autoModeActive = false;
let isCurrentlyListening = false;

// Inizializza controlli vocali flottanti
function initFloatingVoiceControls() {
    const container = document.getElementById('floating-voice-container');
    console.log('🔍 DEBUG: Container trovato:', container ? 'SÌ' : 'NO');
    
    if (container) {
        container.style.display = 'flex';
        console.log('🔍 DEBUG: Display impostato a flex');
        
        try {
            setupFloatingVoiceDragAndDrop(container);
            console.log('🔍 DEBUG: Drag&Drop configurato');
        } catch (error) {
            console.error('❌ Errore setupFloatingVoiceDragAndDrop:', error);
        }
        
        try {
            loadSavedFloatingPosition(container);
            console.log('🔍 DEBUG: Posizione caricata');
        } catch (error) {
            console.error('❌ Errore loadSavedFloatingPosition:', error);
        }
        
        console.log('🎤 Pulsanti vocali flottanti trascinabili attivati');
    } else {
        console.error('❌ Container pulsanti vocali non trovato!');
    }
    
    // Setup monitoraggio iPad
    if (isIpad()) {
        console.log('📱 iPad: Avvio monitoraggio stato vocale');
        monitorVoiceStateForIPad();
        console.log('🔍 DEBUG: Monitoraggio iPad avviato');
    }
}

// Esporta funzioni necessarie globalmente
window.initFloatingVoiceControls = initFloatingVoiceControls;

// Auto-inizializza dopo caricamento DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initFloatingVoiceControls, 2000);
    });
} else {
    setTimeout(initFloatingVoiceControls, 2000);
}