/**
 * Fix definitivo per TTS su iOS/iPad
 * Questo modulo gestisce tutte le peculiarità di Safari
 */

class IOSTTSManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.initialized = false;
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.voiceReady = false;
        this.selectedVoice = null;
        
        // Inizializza immediatamente
        this.init();
    }
    
    init() {
        // Rileva dispositivi touch/mobile (inclusi emulati)
        const isMobileOrTouch = this.isIOS || 
                               (navigator.maxTouchPoints > 0) || 
                               /Mobile/.test(navigator.userAgent) ||
                               localStorage.getItem('force_ipad_mode') === 'true';
        
        if (!isMobileOrTouch) {
            console.log('📱 Non mobile/touch - TTS standard');
            this.initialized = true;
            this.voiceReady = true;
            return;
        }
        
        console.log('🍎 Mobile/Touch rilevato - Inizializzazione speciale TTS');
        
        // Carica le voci
        this.loadVoices();
        
        // Crea pulsante di attivazione audio
        this.createAudioActivationButton();
        
        // iOS richiede che speechSynthesis sia usato in risposta a un evento utente
        // Aggiungiamo listener a TUTTO il documento per la prima interazione
        const initHandler = () => {
            if (!this.initialized) {
                console.log('👆 Prima interazione utente rilevata');
                this.initializeTTS();
                // Rimuovi tutti i listener dopo la prima inizializzazione
                document.removeEventListener('click', initHandler);
                document.removeEventListener('touchstart', initHandler);
            }
        };
        
        // Ascolta QUALSIASI click o touch sulla pagina
        document.addEventListener('click', initHandler, true);
        document.addEventListener('touchstart', initHandler, true);
    }
    
    loadVoices() {
        const loadVoicesHandler = () => {
            const voices = this.synth.getVoices();
            console.log(`🎤 ${voices.length} voci caricate`);
            
            // Trova la migliore voce italiana
            const italianVoices = voices.filter(v => v.lang.startsWith('it'));
            console.log(`🇮🇹 ${italianVoices.length} voci italiane trovate`);
            
            if (italianVoices.length > 0) {
                this.selectedVoice = italianVoices[0];
                console.log(`✅ Voce selezionata: ${this.selectedVoice.name}`);
                this.voiceReady = true;
            }
        };
        
        // Carica voci iniziali
        loadVoicesHandler();
        
        // iOS potrebbe caricare le voci dopo
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = loadVoicesHandler;
        }
    }
    
    initializeTTS() {
        if (this.initialized) return;
        
        console.log('🔧 Inizializzazione TTS per iOS...');
        
        // TRUCCO: Usa speechSynthesis con testo vuoto per "sbloccare" il TTS
        const unlockUtterance = new SpeechSynthesisUtterance('');
        unlockUtterance.volume = 0.1;
        unlockUtterance.lang = 'it-IT';
        
        // Importante: su iOS dobbiamo usare la sintesi IMMEDIATAMENTE nell'event handler
        this.synth.cancel(); // Pulisci eventuali code
        this.synth.speak(unlockUtterance);
        
        // Marca come inizializzato
        this.initialized = true;
        console.log('✅ TTS inizializzato per iOS!');
        
        // Mostra notifica visiva
        this.showNotification('Audio attivato! 🔊');
    }
    
    speak(text) {
        return new Promise((resolve, reject) => {
            console.log(`🗣️ Richiesta TTS: "${text}"`);
            
            // Se non inizializzato su iOS, non possiamo parlare
            if (this.isIOS && !this.initialized) {
                console.warn('⚠️ TTS non inizializzato su iOS - richiede interazione utente');
                this.showNotification('Tocca lo schermo per attivare l\'audio', 'warning');
                reject('TTS non inizializzato');
                return;
            }
            
            // Crea utterance
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'it-IT';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            // Usa la voce selezionata se disponibile
            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }
            
            // Eventi
            utterance.onstart = () => {
                console.log('▶️ TTS avviato');
            };
            
            utterance.onend = () => {
                console.log('⏹️ TTS completato');
                resolve();
            };
            
            utterance.onerror = (event) => {
                console.error('❌ Errore TTS:', event);
                reject(event);
            };
            
            // IMPORTANTE per iOS: cancella sempre prima di parlare
            this.synth.cancel();
            
            // Parla
            try {
                this.synth.speak(utterance);
                console.log('📤 Comando speak inviato');
            } catch (error) {
                console.error('❌ Errore speak:', error);
                reject(error);
            }
        });
    }
    
    showNotification(message, type = 'info') {
        // Crea notifica toast
        const toast = document.createElement('div');
        toast.className = 'ios-tts-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'warning' ? '#FF9500' : '#34C759'};
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 500;
            z-index: 10000;
            animation: slideUp 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    createAudioActivationButton() {
        // Verifica se già esiste
        if (document.getElementById('audio-activation-btn')) return;
        
        const button = document.createElement('button');
        button.id = 'audio-activation-btn';
        button.innerHTML = '🔊 Attiva Audio per Risposte Vocali';
        button.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            z-index: 10001;
            box-shadow: 0 4px 15px rgba(0,123,255,0.3);
            transition: all 0.3s ease;
        `;
        
        button.addEventListener('click', () => {
            console.log('🔊 Pulsante attivazione audio cliccato');
            this.initializeTTS();
            button.remove();
        });
        
        // Aggiungi al body
        document.body.appendChild(button);
        
        // Animazione pulsante
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translate(-50%, -50%) scale(1.05)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translate(-50%, -50%) scale(1)';
        });
        
        console.log('🔊 Pulsante attivazione audio creato');
    }
}

// Inizializza globalmente
window.iosTTSManager = new IOSTTSManager();

// Esporta per altri moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IOSTTSManager;
}