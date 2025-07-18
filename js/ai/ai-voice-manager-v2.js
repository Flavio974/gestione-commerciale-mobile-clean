/**
 * AI Voice Manager V2 - Sistema vocale ottimizzato per iPad
 * Gestisce input vocale, output TTS e modalità automobile
 */

class AIVoiceManagerV2 {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isAutoMode = false;
        this.wakePhrases = ['assistente', 'hey assistente', 'ok assistente', 'ehi assistente'];
        this.useWakeWord = true;
        this.transcriptionBuffer = [];
        this.lastSpeechTime = Date.now();
        this.ttsActivated = false; // Flag per tracciare attivazione TTS
        this.isSpeaking = false; // Flag per tracciare se il TTS sta parlando
        this.lastSpokenText = null; // Ultimo testo pronunciato per evitare duplicati
        this.lastSpokenTime = 0; // Timestamp ultimo TTS per evitare duplicati ravvicinati
        
        // Stato UI collapsible per iPhone
        this.isExpanded = false;
        this.expandTimer = null;
        
        // Configurazione TTS
        this.ttsConfig = {
            rate: 1.0,  // Velocità normale di default
            pitch: 1.0,
            volume: 1.0,
            voice: null
        };
        
        // Elementi UI
        this.elements = {
            micButton: null,
            autoModeOnBtn: null,
            autoModeOffBtn: null,
            statusIndicator: null,
            transcriptionDisplay: null,
            volumeControl: null,
            speedControl: null
        };
        
        this.init();
    }
    
    // Crea bottone di attivazione audio per iPad
    createAudioActivationButton() {
        // Verifica se esiste già
        if (document.getElementById('ipad-audio-activation')) return;
        
        console.log('🎵 Creazione bottone attivazione audio per iPad...');
        
        // Crea overlay di attivazione
        const overlay = document.createElement('div');
        overlay.id = 'ipad-audio-activation';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            backdrop-filter: blur(5px);
        `;
        
        // Crea contenuto
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;
        
        content.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #333;">🎤 Attivazione Audio</h2>
            <p style="margin: 0 0 30px 0; color: #666; line-height: 1.5;">
                Per funzionare correttamente su iPad, il sistema audio deve essere attivato manualmente.<br>
                <strong>Clicca il pulsante qui sotto per attivare l'audio:</strong>
            </p>
            <button id="activate-audio-btn" style="
                background: #007AFF;
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,122,255,0.3);
                transition: all 0.3s ease;
            ">
                🔊 Attiva Audio
            </button>
            <p style="margin: 20px 0 0 0; font-size: 12px; color: #999;">
                Questa operazione deve essere fatta solo una volta per sessione
            </p>
        `;
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Aggiungi evento click
        const activateBtn = document.getElementById('activate-audio-btn');
        activateBtn.addEventListener('click', () => {
            console.log('🎵 Tentativo attivazione audio iPad...');
            activateBtn.textContent = '⏳ Attivazione in corso...';
            activateBtn.disabled = true;
            
            this.activateAudioForIPad(() => {
                // Successo
                overlay.style.animation = 'fadeOut 0.5s ease';
                setTimeout(() => {
                    overlay.remove();
                    this.showNotification('✅ Audio attivato con successo!', 'success', 3000);
                }, 500);
            });
        });
        
        // Aggiungi CSS per animazione
        const voiceAnimationStyle = document.createElement('style');
        voiceAnimationStyle.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            #activate-audio-btn:hover:not(:disabled) {
                background: #0051D5 !important;
                transform: scale(1.05);
            }
            #activate-audio-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(voiceAnimationStyle);
    }
    
    // Attivazione audio specifica per iPad
    activateAudioForIPad(callback) {
        console.log('🎵 Esecuzione attivazione audio iPad...');
        
        // Metodo 1: Utterance silenzioso per pre-attivazione
        const silentUtterance = new SpeechSynthesisUtterance(' ');
        silentUtterance.volume = 0.01;
        silentUtterance.rate = 10;
        
        silentUtterance.onend = () => {
            console.log('✅ Pre-attivazione TTS completata');
            this.ttsActivated = true;
            
            // Metodo 2: Test con audio udibile per conferma
            setTimeout(() => {
                const testUtterance = new SpeechSynthesisUtterance('Sistema audio attivato correttamente');
                testUtterance.lang = 'it-IT';
                testUtterance.volume = 0.8;
                testUtterance.rate = 1.0;
                
                if (this.ttsConfig.voice) {
                    testUtterance.voice = this.ttsConfig.voice;
                }
                
                testUtterance.onstart = () => {
                    console.log('✅ TTS confermato funzionante su iPad');
                };
                
                testUtterance.onend = () => {
                    console.log('✅ Attivazione audio completata');
                    if (callback) callback();
                };
                
                testUtterance.onerror = (e) => {
                    console.error('❌ Errore test TTS:', e);
                    // Considera comunque attivato
                    this.ttsActivated = true;
                    if (callback) callback();
                };
                
                this.synthesis.speak(testUtterance);
            }, 200);
        };
        
        silentUtterance.onerror = (e) => {
            console.error('❌ Errore pre-attivazione:', e);
            // Prova comunque il test
            this.ttsActivated = true;
            if (callback) callback();
        };
        
        this.synthesis.cancel();
        this.synthesis.speak(silentUtterance);
    }
    
    // Aggiungi bottone di attivazione audio nel tab AI per iPad
    addAudioButtonToAITab() {
        // ❌ DISABILITATO - Questa funzione inietta nel tab e rompe il layout
        console.log('🎵 addAudioButtonToAITab() DISABILITATO per fix layout');
        return; // EARLY RETURN per evitare iniezione nel tab
        
        // Aspetta che il DOM del tab AI sia pronto
        const checkAITab = () => {
            const aiContent = document.getElementById('ai-content');
            if (!aiContent) {
                setTimeout(checkAITab, 500);
                return;
            }
            
            // Verifica se il bottone esiste già
            if (document.getElementById('ipad-audio-tab-btn')) return;
            
            console.log('🎵 Aggiungendo bottone audio nel tab AI...');
            
            // Crea contenitore per controlli iPad
            let ipadControls = document.getElementById('ipad-audio-controls');
            if (!ipadControls) {
                ipadControls = document.createElement('div');
                ipadControls.id = 'ipad-audio-controls';
                ipadControls.style.cssText = `
                    background: rgba(248, 249, 250, 0.95);
                    border: 2px solid #007AFF;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 15px rgba(0,122,255,0.2);
                    transition: all 0.3s ease;
                `;
                
                ipadControls.innerHTML = `
                    <h3 style="margin: 0 0 15px 0; color: #007AFF;">🎤 Controlli Audio iPad</h3>
                    <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
                        Su iPad, l'audio deve essere attivato manualmente per le risposte vocali.
                    </p>
                `;
                
                // ✅ FIX CHIRURGICO: NON modificare il DOM delle tab!
                // Invece di inserire dentro #ai-content, usa position fixed overlay
                Object.assign(ipadControls.style, {
                    position: 'fixed',
                    top: '70px',
                    right: '20px',
                    zIndex: '10000',
                    maxWidth: '300px',
                    pointerEvents: 'auto'
                });
                
                // Aggiungi a body per non interferire con il layout tab
                document.body.appendChild(ipadControls);
                console.log('🔧 [FIX] iPad controls moved to fixed overlay instead of tab content');
            }
            
            // Crea il bottone
            const audioBtn = document.createElement('button');
            audioBtn.id = 'ipad-audio-tab-btn';
            audioBtn.style.cssText = `
                background: #007AFF;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                margin: 5px;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0,122,255,0.3);
                -webkit-tap-highlight-color: rgba(0,122,255,0.3);
                touch-action: manipulation;
                user-select: none;
                -webkit-user-select: none;
            `;
            
            this.updateAudioButtonState(audioBtn);
            
            // Eventi per iPad - touch e click
            const handleAudioButton = () => {
                console.log('🎵 iPad Audio Button pressed, ttsActivated:', this.ttsActivated);
                if (this.ttsActivated) {
                    // Test audio
                    this.testAudioOnIPad(audioBtn);
                } else {
                    // Attiva audio
                    this.activateAudioFromTab(audioBtn);
                }
            };
            
            // Aggiungi eventi touch per iPad
            audioBtn.addEventListener('touchstart', (e) => {
                audioBtn.style.transform = 'scale(0.95)';
                audioBtn.style.opacity = '0.8';
            });
            
            audioBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                console.log('🎵 iPad Touch event triggered');
                
                // Reset visual feedback
                audioBtn.style.transform = 'scale(1)';
                audioBtn.style.opacity = '1';
                
                handleAudioButton();
            });
            
            audioBtn.addEventListener('touchcancel', (e) => {
                // Reset visual feedback if touch is cancelled
                audioBtn.style.transform = 'scale(1)';
                audioBtn.style.opacity = '1';
            });
            
            // Fallback per desktop
            audioBtn.addEventListener('click', (e) => {
                console.log('🎵 Click event triggered');
                handleAudioButton();
            });
            
            ipadControls.appendChild(audioBtn);
        };
        
        checkAITab();
    }
    
    // Aggiorna stato del bottone audio nel tab
    updateAudioButtonState(button) {
        if (this.ttsActivated) {
            button.textContent = '🔊 Test Audio';
            button.style.background = '#28a745';
            button.title = 'Clicca per testare l\'audio';
        } else {
            button.textContent = '🎵 Attiva Audio';
            button.style.background = '#007AFF';
            button.title = 'Clicca per attivare l\'audio su iPad';
        }
    }
    
    // Attiva audio dal tab AI
    activateAudioFromTab(button) {
        button.textContent = '⏳ Attivazione...';
        button.disabled = true;
        button.style.opacity = '0.7';
        
        this.activateAudioForIPad(() => {
            // Successo
            this.updateAudioButtonState(button);
            button.disabled = false;
            button.style.opacity = '1';
            
            // Mostra notifica
            this.showNotification('✅ Audio attivato con successo!', 'success', 3000);
        });
    }
    
    // Test audio dal tab AI
    testAudioOnIPad(button) {
        console.log('🔊 Avvio test audio iPad...');
        button.textContent = '🔊 Testing...';
        button.disabled = true;
        button.style.opacity = '0.6';
        
        // Cancella eventuali code TTS precedenti
        this.synthesis.cancel();
        
        // Attendi un momento prima di parlare
        setTimeout(() => {
            const testUtterance = new SpeechSynthesisUtterance('Test audio completato. Il sistema vocale funziona correttamente su iPad.');
            testUtterance.lang = 'it-IT';
            testUtterance.volume = 0.8;
            testUtterance.rate = 1.0;
            testUtterance.pitch = 1.0;
            
            if (this.ttsConfig.voice) {
                testUtterance.voice = this.ttsConfig.voice;
                console.log('🔊 Usando voce:', this.ttsConfig.voice.name);
            }
            
            testUtterance.onstart = () => {
                console.log('🔊 Test audio avviato');
            };
            
            testUtterance.onend = () => {
                console.log('✅ Test audio completato');
                this.updateAudioButtonState(button);
                button.disabled = false;
                button.style.opacity = '1';
                this.showNotification('✅ Test audio completato!', 'success', 2000);
            };
            
            testUtterance.onerror = (e) => {
                console.error('❌ Errore test audio:', e);
                this.updateAudioButtonState(button);
                button.disabled = false;
                button.style.opacity = '1';
                this.showNotification('⚠️ Problema con il test audio: ' + e.error, 'error', 3000);
            };
            
            try {
                this.synthesis.speak(testUtterance);
                console.log('🔊 Comando speak inviato');
            } catch (error) {
                console.error('❌ Errore nell\'eseguire speak:', error);
                this.updateAudioButtonState(button);
                button.disabled = false;
                button.style.opacity = '1';
                this.showNotification('❌ Errore speak: ' + error.message, 'error', 3000);
            }
        }, 200);
    }
    
    // Crea controlli semplificati per iPad
    createIPadControls() {
        // Verifica che non esistano già
        if (document.getElementById('ipad-voice-controls')) return;
        
        console.log('🎨 Creando controlli voice semplificati per iPad...');
        
        // Crea contenitore principale
        const container = document.createElement('div');
        container.id = 'ipad-voice-controls';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 9998;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: auto;
            backdrop-filter: blur(10px);
            min-width: 200px;
            border: 2px solid rgba(0,122,255,0.3);
            animation: slideInLeft 0.3s ease;
            cursor: move;
            user-select: none;
            touch-action: none;
            transition: all 0.3s ease;
        `;
        
        // Titolo
        const title = document.createElement('h4');
        title.textContent = '🎤 Voice Controls';
        title.style.cssText = `
            margin: 0 0 10px 0;
            color: #333;
            font-size: 16px;
            text-align: center;
        `;
        container.appendChild(title);
        
        // Controllo Wake Word
        const wakeWordContainer = document.createElement('div');
        wakeWordContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            background: #f0f0f0;
            padding: 10px;
            border-radius: 8px;
        `;
        
        const wakeWordToggle = document.createElement('input');
        wakeWordToggle.type = 'checkbox';
        wakeWordToggle.id = 'ipad-wake-word-toggle';
        wakeWordToggle.checked = this.useWakeWord;
        wakeWordToggle.style.cssText = `
            width: 20px;
            height: 20px;
            cursor: pointer;
        `;
        
        const wakeWordLabel = document.createElement('label');
        wakeWordLabel.htmlFor = 'ipad-wake-word-toggle';
        wakeWordLabel.textContent = 'Usa "Hey Assistente"';
        wakeWordLabel.style.cssText = `
            cursor: pointer;
            font-size: 14px;
            color: #333;
            user-select: none;
        `;
        
        wakeWordContainer.appendChild(wakeWordToggle);
        wakeWordContainer.appendChild(wakeWordLabel);
        container.appendChild(wakeWordContainer);
        
        // Status
        const status = document.createElement('div');
        status.id = 'ipad-voice-status';
        status.style.cssText = `
            padding: 8px;
            background: #e8f4ff;
            border-radius: 6px;
            font-size: 12px;
            text-align: center;
            color: #333;
        `;
        status.textContent = 'Ready';
        container.appendChild(status);
        
        // Bottone test audio rapido
        const testAudioBtn = document.createElement('button');
        testAudioBtn.textContent = '🔊 Test Audio';
        testAudioBtn.style.cssText = `
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            width: 100%;
            margin-top: 5px;
            -webkit-tap-highlight-color: rgba(40,167,69,0.3);
            touch-action: manipulation;
        `;
        
        // Eventi touch per il test audio
        testAudioBtn.addEventListener('touchstart', () => {
            testAudioBtn.style.transform = 'scale(0.95)';
        });
        
        testAudioBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            testAudioBtn.style.transform = 'scale(1)';
            this.quickTestAudio();
        });
        
        testAudioBtn.addEventListener('click', () => {
            this.quickTestAudio();
        });
        
        container.appendChild(testAudioBtn);
        
        // Aggiungi al DOM
        document.body.appendChild(container);
        
        // Aggiungi CSS per animazioni se non esiste
        if (!document.getElementById('ipad-voice-css')) {
            const ipadVoiceStyle = document.createElement('style');
            ipadVoiceStyle.id = 'ipad-voice-css';
            ipadVoiceStyle.textContent = `
                @keyframes slideInLeft {
                    from {
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                #ipad-voice-controls {
                    transition: all 0.3s ease;
                }
                
                #ipad-voice-controls:hover {
                    transform: scale(1.02);
                    box-shadow: 0 6px 25px rgba(0,0,0,0.4);
                }
                
                @keyframes slideInFromTop {
                    from {
                        transform: translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                /* Drag styles per iPad controls */
                #ipad-voice-controls.dragging {
                    opacity: 0.9;
                    transform: scale(1.05);
                    transition: none !important;
                    box-shadow: 0 8px 35px rgba(0, 122, 255, 0.4);
                    border-color: rgba(0, 122, 255, 0.6) !important;
                    cursor: grabbing !important;
                }
                
                #ipad-voice-controls:hover {
                    border-color: rgba(0, 122, 255, 0.4);
                    box-shadow: 0 6px 25px rgba(0, 122, 255, 0.3);
                }
                
                /* Indicatore drag per iPad controls */
                #ipad-voice-controls::before {
                    content: "⋮⋮";
                    position: absolute;
                    top: -5px;
                    left: 50%;
                    transform: translateX(-50%);
                    color: rgba(0, 122, 255, 0.5);
                    font-size: 16px;
                    font-weight: bold;
                    letter-spacing: 3px;
                    opacity: 0.7;
                    transition: all 0.3s ease;
                }
                
                #ipad-voice-controls:hover::before {
                    opacity: 1;
                    color: rgba(0, 122, 255, 0.8);
                    font-size: 18px;
                }
            `;
            document.head.appendChild(ipadVoiceStyle);
        }
        
        // Setup eventi
        wakeWordToggle.addEventListener('change', (e) => {
            this.useWakeWord = e.target.checked;
            console.log('🎵 iPad Wake word toggle cambiato:', this.useWakeWord);
            this.updateIPadStatus();
            this.showNotification(
                this.useWakeWord ? '[INFO] Wake word attivate' : '[INFO] Wake word disattivate', 
                'info'
            );
        });
        
        // Eventi touch per iPad
        wakeWordLabel.addEventListener('touchend', (e) => {
            e.preventDefault();
            wakeWordToggle.checked = !wakeWordToggle.checked;
            wakeWordToggle.dispatchEvent(new Event('change'));
        });
        
        // Rendi draggable per iPad e PC
        this.makeIPadControlsDraggable(container);
        
        console.log('✅ Controlli iPad creati con successo');
    }
    
    // Metodo deprecato - ora usa updateIPadStatus() con parametri
    
    // Rende i controlli iPad draggabili (touch + mouse)
    makeIPadControlsDraggable(element) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        // Touch events per tablet/mobile
        element.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            
            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            element.style.transition = 'none';
            element.style.opacity = '0.8';
            element.classList.add('dragging');
        });
        
        element.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const currentX = touch.clientX;
            const currentY = touch.clientY;
            
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            
            element.style.left = (initialX + deltaX) + 'px';
            element.style.top = (initialY + deltaY) + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        });
        
        element.addEventListener('touchend', () => {
            isDragging = false;
            element.style.transition = 'all 0.3s ease';
            element.style.opacity = '1';
            element.classList.remove('dragging');
            this.savePosition(element);
        });
        
        // Mouse events per desktop
        element.addEventListener('mousedown', (e) => {
            // Solo drag se non si clicca su un pulsante
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            element.style.transition = 'none';
            element.style.opacity = '0.8';
            element.classList.add('dragging');
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const currentX = e.clientX;
            const currentY = e.clientY;
            
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            
            element.style.left = (initialX + deltaX) + 'px';
            element.style.top = (initialY + deltaY) + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            
            isDragging = false;
            element.style.transition = 'all 0.3s ease';
            element.style.opacity = '1';
            element.classList.remove('dragging');
            this.savePosition(element);
        });
    }
    
    // Test audio rapido per iPad
    quickTestAudio() {
        console.log('🔊 Quick test audio avviato...');
        
        // Prima controlla se il TTS è attivato
        if (!this.ttsActivated) {
            console.log('⚠️ TTS non attivato, attivo prima...');
            this.activateAudioForIPad(() => {
                // Dopo attivazione, esegui il test
                this.performQuickTest();
            });
        } else {
            this.performQuickTest();
        }
    }
    
    // Esegue il test audio rapido
    performQuickTest() {
        this.synthesis.cancel();
        
        setTimeout(() => {
            const testText = 'Test rapido completato su iPad';
            const utterance = new SpeechSynthesisUtterance(testText);
            utterance.lang = 'it-IT';
            utterance.volume = 0.8;
            utterance.rate = 1.2; // Più veloce per test rapido
            
            if (this.ttsConfig.voice) {
                utterance.voice = this.ttsConfig.voice;
            }
            
            utterance.onstart = () => {
                console.log('🔊 Quick test in corso...');
                this.updateIPadStatus('🔊 Test in corso...');
            };
            
            utterance.onend = () => {
                console.log('✅ Quick test completato');
                this.updateIPadStatus();
                this.showNotification('✅ Test audio OK!', 'success', 1500);
            };
            
            utterance.onerror = (e) => {
                console.error('❌ Quick test fallito:', e);
                this.updateIPadStatus();
                this.showNotification('❌ Test fallito: ' + e.error, 'error', 2000);
            };
            
            try {
                this.synthesis.speak(utterance);
            } catch (error) {
                console.error('❌ Errore quick test:', error);
                this.showNotification('❌ Errore: ' + error.message, 'error', 2000);
            }
        }, 100);
    }
    
    // Aggiorna status con messaggio custom
    updateIPadStatus(customMessage = null) {
        const status = document.getElementById('ipad-voice-status');
        if (status) {
            if (customMessage) {
                status.textContent = customMessage;
                status.style.background = '#ffeaa7';
                status.style.color = '#2d3436';
            } else if (this.useWakeWord) {
                status.textContent = '🎤 Wake word ON - "Hey Assistente"';
                status.style.background = '#d4edda';
                status.style.color = '#155724';
            } else {
                status.textContent = '🔇 Wake word OFF';
                status.style.background = '#f8d7da'; 
                status.style.color = '#721c24';
            }
        }
    }

    async init() {
        // Verifica supporto browser
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('Speech recognition non supportato');
            this.showNotification('Il riconoscimento vocale non è supportato su questo browser', 'error');
            return;
        }

        // Inizializza riconoscimento vocale
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'it-IT';
        this.recognition.continuous = false; // Verrà impostato in base alla modalità
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        // Setup eventi riconoscimento
        this.setupRecognitionEvents();
        
        // Setup voce TTS italiana
        this.setupTTSVoice();
        
        // Crea interfaccia utente solo quando il DOM è pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createUI();
                this.setupUIEvents();
            });
        } else {
            // DOM già caricato
            this.createUI();
            this.setupUIEvents();
        }
    }

    setupRecognitionEvents() {
        this.recognition.onstart = () => {
            console.log('Riconoscimento vocale avviato');
            this.updateUIState('listening');
        };

        this.recognition.onresult = (event) => {
            const current = event.resultIndex;
            const transcript = event.results[current][0].transcript;
            const isFinal = event.results[current].isFinal;

            if (isFinal) {
                this.processTranscript(transcript);
                
                // Su iPad, ferma automaticamente il riconoscimento dopo il risultato finale
                // a meno che non sia in modalità auto
                const isIPad = /iPad/.test(navigator.userAgent) || localStorage.getItem('force_ipad_mode') === 'true';
                if (isIPad && !this.isAutoMode) {
                    console.log('📱 iPad: Fermo riconoscimento dopo risultato finale');
                    setTimeout(() => {
                        this.stopListening();
                    }, 100);
                }
            } else {
                // Mostra trascrizione in tempo reale
                if (this.elements.transcriptionDisplay) {
                    this.elements.transcriptionDisplay.textContent = transcript;
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Errore riconoscimento:', event.error);
            if (event.error !== 'no-speech') {
                this.showNotification(`Errore: ${event.error}`, 'error');
            }
            
            // In modalità auto, riavvia automaticamente
            if (this.isAutoMode && event.error !== 'not-allowed') {
                setTimeout(() => this.startListening(), 1000);
            }
        };

        this.recognition.onend = () => {
            console.log('📱 iPad RECOGNITION.ONEND DEBUG:', {
                isListening: this.isListening,
                isAutoMode: this.isAutoMode,
                isSpeaking: this.isSpeaking,
                timestamp: new Date().toISOString()
            });
            
            this.isListening = false;
            
            // In modalità auto, riavvia automaticamente SOLO se non stiamo parlando
            if (this.isAutoMode && !this.isSpeaking) {
                // Su iPad usiamo delay più lungo per evitare interferenze
                const isIPad = /iPad/.test(navigator.userAgent) || localStorage.getItem('force_ipad_mode') === 'true';
                const delay = isIPad ? 2000 : 500; // 2 secondi su iPad vs 0.5 su desktop
                
                setTimeout(() => {
                    // TRIPLO controllo per iPad: riavvia solo se non stiamo ancora parlando
                    if (!this.isSpeaking && this.isAutoMode && !this.synthesis.speaking) {
                        console.log('🔄 iPad: Riavvio automatico dopo', delay + 'ms');
                        this.startListening();
                    } else {
                        console.log('⏸️ iPad: Riavvio sospeso - TTS in corso o synthesis.speaking attivo');
                    }
                }, delay);
            } else {
                console.log('📱 iPad: Non riavvio - autoMode:', this.isAutoMode, 'isSpeaking:', this.isSpeaking);
                this.updateUIState('idle');
            }
        };
    }

    setupTTSVoice() {
        // Attendi che le voci siano caricate
        if (this.synthesis.getVoices().length === 0) {
            this.synthesis.addEventListener('voiceschanged', () => this.selectBestVoice());
        } else {
            this.selectBestVoice();
        }
    }

    selectBestVoice() {
        const voices = this.synthesis.getVoices();
        console.log('🎤 Voci disponibili:', voices.map(v => `${v.name} (${v.lang})`));
        
        // Priorità specifiche per dispositivo - DEBUG MIGLIORATO
        const userAgent = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isIPad = /iPad/.test(userAgent);
        const isIPhone = /iPhone/.test(userAgent);
        
        console.log('🔍 DEVICE DEBUG:', {
            userAgent: userAgent,
            isIOS: isIOS,
            isIPad: isIPad,
            isIPhone: isIPhone
        });
        
        let priorities;
        if (isIOS) {
            // Priorità per iPad/iPhone
            priorities = [
                { lang: 'it-IT', name: 'Alice' },
                { lang: 'it-IT', name: 'Federica' },
                { lang: 'it-IT', name: 'Luca' },
                { lang: 'it-IT', name: '' } // Qualsiasi voce italiana
            ];
            console.log('🔊 DEVICE: Priorità iOS selezionate');
        } else {
            // Priorità per desktop
            priorities = [
                { lang: 'it-IT', name: 'Google italiano' },
                { lang: 'it-IT', name: 'Microsoft Elsa' },
                { lang: 'it-IT', name: 'Alice' },
                { lang: 'it-IT', name: '' } // Qualsiasi voce italiana
            ];
            console.log('🔊 DEVICE: Priorità Desktop selezionate');
        }

        for (const priority of priorities) {
            const voice = voices.find(v => 
                v.lang.startsWith(priority.lang) && 
                (priority.name === '' || v.name.includes(priority.name))
            );
            
            if (voice) {
                this.ttsConfig.voice = voice;
                console.log('✅ Voce TTS selezionata:', voice.name, 'per', isIOS ? 'iOS' : 'Desktop');
                return;
            }
        }
        
        // Fallback: prima voce italiana disponibile
        const italianVoice = voices.find(v => v.lang.startsWith('it'));
        if (italianVoice) {
            this.ttsConfig.voice = italianVoice;
            console.log('⚠️ Fallback voce italiana:', italianVoice.name);
        } else {
            console.log('❌ Nessuna voce italiana trovata');
        }
    }

    createUI() {
        console.log('🎨 Creazione UI Voice Controls V2...');
        
        // Rilevamento dispositivo all'inizio - MIGLIORATO
        const userAgent = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isIPhone = /iPhone/.test(userAgent);
        let isIPad = /iPad/.test(userAgent);
        
        // FORCE iPad mode SOLO per veri iPad o test esplicito
        const forceIPadMode = localStorage.getItem('force_ipad_mode') === 'true';
        const isRealIPad = /iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document);
        
        if (forceIPadMode && isRealIPad) {
            isIPad = true;
            console.log('🔧 FORCE iPad MODE ATTIVATO (dispositivo iPad reale)');
        } else if (forceIPadMode && !isRealIPad) {
            console.log('🚫 FORCE iPad MODE IGNORATO (non è un iPad reale)');
        }
        
        // Rileva anche simulatori iPad nel browser dev tools
        const isIPadSimulator = (
            navigator.maxTouchPoints > 0 && 
            /Safari/.test(userAgent) && 
            window.screen.width >= 768
        );
        
        if (isIPadSimulator && !isIPad) {
            isIPad = true;
            console.log('🔧 iPad SIMULATOR rilevato');
        }
        
        console.log('🔍 DEVICE DETECTION IN createUI:', {
            userAgent: userAgent,
            isIOS: isIOS,
            isIPhone: isIPhone,
            isIPad: isIPad,
            forceIPadMode: forceIPadMode,
            isIPadSimulator: isIPadSimulator,
            ttsActivated: this.ttsActivated,
            maxTouchPoints: navigator.maxTouchPoints,
            screenWidth: window.screen.width
        });
        
        // Su iPad, mostra sempre il bottone di attivazione audio se TTS non è attivo
        if (isIPad && !this.ttsActivated) {
            console.log('🎵 iPad rilevato - Creando overlay di attivazione...');
            this.createAudioActivationButton();
        }
        
        // Aggiungi anche bottone nel tab AI se siamo su iPad
        if (isIPad) {
            console.log('🎵 iPad rilevato - Aggiungendo bottone nel tab AI...');
            this.addAudioButtonToAITab();
            // Crea anche controlli semplificati per iPad
            this.createIPadControls();
        } else {
            console.log('⚠️ NON iPad - isIPad:', isIPad, 'userAgent:', userAgent);
            // Mostra pannello di debug se non è iPad
            this.createDebugPanel();
        }
        
        console.log('🔍 Device Detection:', {
            userAgent: navigator.userAgent,
            isIOS: isIOS,
            isIPhone: isIPhone,
            isIPad: isIPad
        });
        
        // Container principale
        const container = document.createElement('div');
        container.id = 'voice-controls-v2';
        container.className = 'voice-controls-container';
        
        // ✅ FIX: Evita intercettazione click sui tab sottostanti
        container.style.pointerEvents = 'none';
        
        // Aggiungi classe specifica per iPhone
        if (isIPhone) {
            container.classList.add('iphone-layout');
        }
        
        // Pulsante microfono principale
        const micButton = document.createElement('button');
        micButton.id = 'mic-button-v2';
        micButton.className = 'voice-button mic-button';
        // ✅ FIX: Riattiva pointer-events sui bottoni interattivi
        micButton.style.pointerEvents = 'auto';
        
        let iconSize;
        if (isIPhone) {
            iconSize = '28'; // iPhone: più piccolo
        } else if (isIPad) {
            iconSize = '48'; // iPad: medio
        } else {
            iconSize = '72'; // Desktop: più grande
        }
        
        micButton.innerHTML = `
            <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
        `;
        
        // Container controlli modalità auto
        const autoModeContainer = document.createElement('div');
        autoModeContainer.className = 'auto-mode-controls';
        
        // Pulsante ON modalità auto
        const autoOnBtn = document.createElement('button');
        autoOnBtn.id = 'auto-mode-on';
        autoOnBtn.className = 'voice-button auto-button on-button';
        autoOnBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>AUTO ON</span>
        `;
        
        // Pulsante OFF modalità auto
        const autoOffBtn = document.createElement('button');
        autoOffBtn.id = 'auto-mode-off';
        autoOffBtn.className = 'voice-button auto-button off-button';
        autoOffBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
            <span>AUTO OFF</span>
        `;
        
        // Indicatore stato
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'voice-status-indicator';
        statusIndicator.className = 'status-indicator';
        statusIndicator.innerHTML = '<span class="status-text">Pronto</span>';
        
        // Indicatore permanente wake word
        const wakeWordStatus = document.createElement('div');
        wakeWordStatus.id = 'wake-word-status';
        wakeWordStatus.className = 'wake-word-status';
        wakeWordStatus.innerHTML = '<span class="wake-word-text">🎤 Wake Word: ON</span>';
        
        // CONTROLLI SEMPLIFICATI - Solo elementi essenziali
        
        // Display trascrizione (manteniamo)
        const transcriptionDisplay = document.createElement('div');
        transcriptionDisplay.id = 'voice-transcription';
        transcriptionDisplay.className = 'transcription-display';
        
        // NOTE: Controlli semplificati - Rimossi elementi duplicati
        
        // Assembla UI
        autoModeContainer.appendChild(autoOnBtn);
        autoModeContainer.appendChild(autoOffBtn);
        
        // Layout semplificato - Solo controlli essenziali
        if (isIPhone) {
            const expandableControls = document.createElement('div');
            expandableControls.id = 'expandable-controls';
            expandableControls.className = 'expandable-controls collapsed';
            
            // Solo controlli base per iPhone
            expandableControls.appendChild(autoModeContainer);
            expandableControls.appendChild(statusIndicator);
            expandableControls.appendChild(transcriptionDisplay);
            
            container.appendChild(micButton);
            container.appendChild(expandableControls);
        } else {
            // Layout normale per iPad/Desktop - SOLO controlli base
            container.appendChild(micButton);
            container.appendChild(autoModeContainer);
            container.appendChild(statusIndicator);
            container.appendChild(transcriptionDisplay);
        }
        
        // Aggiungi al DOM
        if (document.body) {
            document.body.appendChild(container);
            console.log('✅ Voice Controls V2 aggiunti al DOM');
        } else {
            console.error('❌ document.body non disponibile!');
            // Riprova dopo che il DOM è caricato
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(container);
                console.log('✅ Voice Controls V2 aggiunti al DOM (dopo DOMContentLoaded)');
            });
        }
        
        // Salva riferimenti elementi ESSENZIALI
        this.elements = {
            micButton: micButton,
            autoModeOnBtn: autoOnBtn,
            autoModeOffBtn: autoOffBtn,
            statusIndicator: statusIndicator,
            transcriptionDisplay: transcriptionDisplay
        };
        
        // Aggiorna stato iniziale UI
        try {
            this.updateAutoModeUI();
            this.updateWakeWordStatus();
            
            // Mostra istruzioni per iOS
            if (isIPhone) {
                setTimeout(() => {
                    this.showNotification('📱 iPhone: Tap=Voce, Long Press=Controlli', 'info', 6000);
                }, 2000);
            } else if (isIPad) {
                setTimeout(() => {
                    this.showNotification('📱 Su iPad: Clicca "🔊 Test Audio" per attivare le risposte vocali', 'info', 8000);
                    
                    // Pre-attiva automaticamente TTS su iPad dopo 3 secondi
                    setTimeout(() => {
                        if (!this.ttsActivated) {
                            console.log('🎵 Pre-attivazione automatica TTS per iPad...');
                            this.preActivateTTSForiPad();
                        }
                    }, 3000);
                }, 2000);
            }
        } catch (error) {
            console.error('❌ Errore in createUI:', error);
        }
    }

    setupUIEvents() {
        const isIPhone = /iPhone/.test(navigator.userAgent);
        
        // Pulsante microfono
        this.elements.micButton.addEventListener('click', (e) => {
            this.activateTTS(); // Attiva TTS su interazione utente
            
            if (isIPhone && !this.isAutoMode) {
                // Su iPhone: click normale per voice, long press per expand
                this.toggleListening();
            } else if (!this.isAutoMode) {
                this.toggleListening();
            }
        });
        
        // Eventi specifici per iPhone
        if (isIPhone) {
            this.setupiPhoneEvents();
        }
        
        // Pulsanti modalità auto
        this.elements.autoModeOnBtn.addEventListener('click', () => {
            this.activateTTS(); // Attiva TTS su interazione utente
            this.enableAutoMode();
        });
        
        this.elements.autoModeOffBtn.addEventListener('click', () => {
            this.disableAutoMode();
        });
        
        // Controlli volume e velocità (solo se esistono)
        if (this.elements.volumeControl) {
            this.elements.volumeControl.addEventListener('input', (e) => {
                this.ttsConfig.volume = parseFloat(e.target.value);
            });
        }
        
        if (this.elements.speedControl) {
            this.elements.speedControl.addEventListener('input', (e) => {
                this.ttsConfig.rate = parseFloat(e.target.value);
            });
        }
        
        // Toggle wake word (solo se esiste)
        if (this.elements.wakeWordToggle) {
            this.elements.wakeWordToggle.addEventListener('change', (e) => {
                this.useWakeWord = e.target.checked;
                console.log('Wake word toggle cambiato:', this.useWakeWord);
                this.updateWakeWordStatus();
                this.showNotification(
                    this.useWakeWord ? 'Wake word attivate' : 'Wake word disattivate', 
                    'info'
                );
            });
        }
        
        // Fix per iPad - aggiungi anche eventi touch
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS && this.elements.wakeWordToggle) {
            // Aggiungi listener per click diretto sul label
            const label = this.elements.wakeWordToggle.parentElement;
            if (label) {
                label.style.cursor = 'pointer';
                label.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.elements.wakeWordToggle.checked = !this.elements.wakeWordToggle.checked;
                    this.useWakeWord = this.elements.wakeWordToggle.checked;
                    console.log('Wake word toggle (touch):', this.useWakeWord);
                    this.updateWakeWordStatus();
                    this.showNotification(
                        this.useWakeWord ? 'Wake word attivate' : 'Wake word disattivate', 
                        'info'
                    );
                });
            }
        }
        
        // Pulsante wake word per iPad
        const wakeWordBtn = document.getElementById('wake-word-button');
        if (wakeWordBtn && isIOS) {
            wakeWordBtn.addEventListener('click', () => {
                this.useWakeWord = !this.useWakeWord;
                this.elements.wakeWordToggle.checked = this.useWakeWord;
                
                wakeWordBtn.textContent = this.useWakeWord ? '🎤 Wake Word: ON' : '🎤 Wake Word: OFF';
                wakeWordBtn.style.background = this.useWakeWord ? '#FF9500' : '#8E8E93';
                
                this.updateWakeWordStatus();
                console.log('Wake word button clicked:', this.useWakeWord);
                this.showNotification(
                    this.useWakeWord ? 'Wake word attivate - Dì "assistente" prima del comando' : 'Wake word disattivate - Ascolto diretto', 
                    'info',
                    3000
                );
            });
        }
        
        // Pulsante test TTS
        const testTtsBtn = document.getElementById('test-tts-btn');
        if (testTtsBtn) {
            testTtsBtn.addEventListener('click', () => {
                console.log('🧪 Test TTS richiesto');
                this.activateTTS(); // Attiva TTS prima del test
                
                // Su iOS, mostra conferma speciale
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                if (isIOS && !this.ttsActivated) {
                    this.showNotification('✅ Audio attivato! Ora le risposte saranno vocali', 'success', 4000);
                }
                
                this.speak('Audio attivato correttamente. Le risposte dell\'assistente saranno ora vocali.');
            });
        }
        
        // Setup drag & drop
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        console.log('🎯 Configurazione drag & drop per controlli vocali...');
        
        // Prova prima voice-controls-v2, poi ipad-voice-controls
        let container = document.getElementById('voice-controls-v2');
        if (!container) {
            container = document.getElementById('ipad-voice-controls');
        }
        
        if (!container) {
            console.error('❌ Nessun container controlli vocali trovato');
            return;
        }
        
        console.log('✅ Container trovato:', container.id);
        
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        
        // Carica posizione salvata
        this.loadSavedPosition(container);
        
        // Mouse events (Desktop)
        container.addEventListener('mousedown', (e) => {
            // Solo drag se si clicca sul container ma non sui pulsanti
            if (e.target.closest('.voice-button')) return;
            
            isDragging = true;
            container.classList.add('dragging');
            
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = container.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            e.preventDefault();
        });
        
        // Touch events (Mobile/Tablet)
        container.addEventListener('touchstart', (e) => {
            // Solo drag se si tocca il container ma non i pulsanti
            if (e.target.closest('.voice-button')) return;
            
            const touch = e.touches[0];
            isDragging = true;
            container.classList.add('dragging');
            
            startX = touch.clientX;
            startY = touch.clientY;
            
            const rect = container.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
            
            e.preventDefault();
        });
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            this.updatePosition(container, startLeft + deltaX, startTop + deltaY);
        };
        
        const onTouchMove = (e) => {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            
            this.updatePosition(container, startLeft + deltaX, startTop + deltaY);
            e.preventDefault();
        };
        
        const onMouseUp = () => {
            if (!isDragging) return;
            
            isDragging = false;
            container.classList.remove('dragging');
            this.savePosition(container);
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        const onTouchEnd = () => {
            if (!isDragging) return;
            
            isDragging = false;
            container.classList.remove('dragging');
            this.savePosition(container);
            
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };
        
        console.log('✅ Drag & drop configurato - ora puoi trascinare i controlli vocali!');
    }
    
    updatePosition(container, left, top) {
        // Vincoli ai bordi dello schermo
        const maxLeft = window.innerWidth - container.offsetWidth;
        const maxTop = window.innerHeight - container.offsetHeight;
        
        left = Math.max(0, Math.min(left, maxLeft));
        top = Math.max(0, Math.min(top, maxTop));
        
        container.style.left = left + 'px';
        container.style.top = top + 'px';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
    }
    
    savePosition(container) {
        const position = {
            left: container.style.left,
            top: container.style.top
        };
        
        localStorage.setItem('voice-controls-position', JSON.stringify(position));
        console.log('💾 Posizione controlli vocali salvata:', position);
        
        // Aggiungi classe per nascondere tooltip dopo primo drag
        container.classList.add('dragged');
    }
    
    loadSavedPosition(container) {
        try {
            const saved = localStorage.getItem('voice-controls-position');
            if (saved) {
                const position = JSON.parse(saved);
                if (position.left && position.top) {
                    container.style.left = position.left;
                    container.style.top = position.top;
                    container.style.right = 'auto';
                    container.style.bottom = 'auto';
                    container.classList.add('dragged'); // Se c'è una posizione salvata, è già stato trascinato
                    console.log('📍 Posizione controlli vocali caricata:', position);
                }
            }
        } catch (error) {
            console.log('⚠️ Errore caricamento posizione:', error);
        }
    }

    setupiPhoneEvents() {
        console.log('📱 Setup eventi specifici iPhone...');
        
        // Long press sul microfono per espandere controlli
        let pressTimer = null;
        
        this.elements.micButton.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                console.log('📱 Long press rilevato - toggle controlli');
                this.toggleExpandControls();
            }, 800); // 800ms per long press
        });
        
        this.elements.micButton.addEventListener('touchend', (e) => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });
        
        this.elements.micButton.addEventListener('touchcancel', (e) => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });
        
        // Click fuori per collassare (solo se espanso)
        document.addEventListener('touchstart', (e) => {
            if (this.isExpanded) {
                const voiceContainer = document.getElementById('voice-controls-v2');
                if (voiceContainer && !voiceContainer.contains(e.target)) {
                    this.collapseControls();
                }
            }
        });
        
        // Auto-collapse dopo 10 secondi
        this.setupAutoCollapse();
    }

    toggleExpandControls() {
        if (this.isExpanded) {
            this.collapseControls();
        } else {
            this.expandControls();
        }
    }

    expandControls() {
        console.log('📱 Espansione controlli iPhone...');
        this.isExpanded = true;
        
        const expandableControls = document.getElementById('expandable-controls');
        if (expandableControls) {
            expandableControls.classList.remove('collapsed');
            expandableControls.classList.add('expanded');
        }
        
        // Feedback visivo
        this.showNotification('⚙️ Controlli espansi - Long press per chiudere', 'info', 3000);
        
        // Auto-collapse dopo 10 secondi
        this.setupAutoCollapse();
    }

    collapseControls() {
        console.log('📱 Collasso controlli iPhone...');
        this.isExpanded = false;
        
        const expandableControls = document.getElementById('expandable-controls');
        if (expandableControls) {
            expandableControls.classList.remove('expanded');
            expandableControls.classList.add('collapsed');
        }
        
        // Cancella auto-collapse timer
        if (this.expandTimer) {
            clearTimeout(this.expandTimer);
            this.expandTimer = null;
        }
    }

    setupAutoCollapse() {
        // Cancella timer precedente
        if (this.expandTimer) {
            clearTimeout(this.expandTimer);
        }
        
        // Nuovo timer per auto-collapse
        this.expandTimer = setTimeout(() => {
            if (this.isExpanded) {
                this.collapseControls();
                this.showNotification('⏰ Controlli minimizzati automaticamente', 'info', 2000);
            }
        }, 10000); // 10 secondi
    }

    // Pre-attivazione specifica per iPad
    preActivateTTSForiPad() {
        if (this.ttsActivated) return;
        
        console.log('🎵 Pre-attivazione TTS automatica per iPad...');
        
        // Crea un pulsante invisibile temporaneo
        const tempButton = document.createElement('button');
        tempButton.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
        document.body.appendChild(tempButton);
        
        // Simula click per attivare TTS
        tempButton.addEventListener('click', () => {
            this.activateTTS();
            // Rimuovi il pulsante dopo l'uso
            setTimeout(() => tempButton.remove(), 100);
        });
        
        // Trigger click programmatico
        tempButton.click();
    }
    
    // Attiva TTS con interazione utente (richiesto da iOS)
    activateTTS() {
        if (!this.ttsActivated) {
            console.log('🎵 Attivazione TTS per iOS...');
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            
            if (isIOS) {
                // Metodo 1: Utterance silenzioso
                const silentUtterance = new SpeechSynthesisUtterance(' ');
                silentUtterance.volume = 0.01; // Volume bassissimo ma non zero
                silentUtterance.rate = 10; // Velocissimo per finire subito
                
                silentUtterance.onend = () => {
                    console.log('✅ TTS pre-attivato con successo');
                    this.ttsActivated = true;
                    
                    // Metodo 2: Test immediato con voce reale
                    setTimeout(() => {
                        const testUtterance = new SpeechSynthesisUtterance('Audio attivato');
                        testUtterance.lang = 'it-IT';
                        testUtterance.volume = 0.5;
                        testUtterance.rate = 1.0;
                        
                        if (this.ttsConfig.voice) {
                            testUtterance.voice = this.ttsConfig.voice;
                        }
                        
                        testUtterance.onstart = () => {
                            console.log('✅ TTS confermato funzionante');
                            this.showNotification('🔊 Audio attivato', 'success');
                        };
                        
                        this.synthesis.speak(testUtterance);
                    }, 100);
                };
                
                silentUtterance.onerror = (e) => {
                    console.error('❌ Errore pre-attivazione TTS:', e);
                    // Prova comunque ad attivare
                    this.ttsActivated = true;
                };
                
                // Cancella eventuali code e parla
                this.synthesis.cancel();
                this.synthesis.speak(silentUtterance);
                
            } else {
                this.ttsActivated = true;
            }
        }
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        if (this.isListening) return;
        
        try {
            this.isListening = true;
            // Su iPad, NON usare mai modalità continua quando si clicca il pulsante
            const isIPad = /iPad/.test(navigator.userAgent) || localStorage.getItem('force_ipad_mode') === 'true';
            this.recognition.continuous = isIPad ? false : this.isAutoMode;
            this.recognition.start();
        } catch (error) {
            console.error('Errore avvio riconoscimento:', error);
            this.isListening = false;
            this.showNotification('Errore avvio riconoscimento vocale', 'error');
        }
    }

    stopListening() {
        if (!this.isListening) return;
        
        try {
            this.isListening = false;
            this.recognition.stop();
        } catch (error) {
            console.error('Errore stop riconoscimento:', error);
        }
    }

    // Pausa temporanea del riconoscimento (per evitare loop durante TTS)
    pauseListening() {
        if (!this.isListening) return;
        
        try {
            console.log('⏸️ Pausa riconoscimento vocale per TTS');
            this.isListening = false;
            this.isSpeaking = true; // Imposta che stiamo "parlando" per bloccare riavvii
            this.recognition.stop();
        } catch (error) {
            console.error('Errore pausa riconoscimento:', error);
        }
    }

    // Riprende il riconoscimento dopo la pausa
    resumeListening() {
        if (this.isListening || !this.isAutoMode) return;
        
        try {
            console.log('▶️ Ripresa riconoscimento vocale');
            this.isSpeaking = false; // Reset flag speaking
            this.isListening = true;
            this.recognition.continuous = true;
            this.recognition.start();
        } catch (error) {
            console.error('Errore ripresa riconoscimento:', error);
            this.isSpeaking = false; // Reset anche in caso di errore
            // Se fallisce, riprova dopo un delay
            setTimeout(() => {
                if (this.isAutoMode && !this.isListening && !this.isSpeaking) {
                    console.log('🔄 Retry ripresa riconoscimento...');
                    try {
                        this.isListening = true;
                        this.recognition.start();
                    } catch (retryError) {
                        console.error('Errore retry ripresa:', retryError);
                    }
                }
            }, 2000);
        }
    }

    enableAutoMode() {
        this.isAutoMode = true;
        this.showNotification('Modalità AUTO attivata - Ascolto continuo', 'success');
        this.updateAutoModeUI();
        this.startListening();
    }

    disableAutoMode() {
        this.isAutoMode = false;
        this.showNotification('Modalità AUTO disattivata', 'info');
        this.updateAutoModeUI();
        this.stopListening();
    }

    updateAutoModeUI() {
        if (this.isAutoMode) {
            this.elements.autoModeOnBtn.classList.add('active');
            this.elements.autoModeOffBtn.classList.remove('active');
            this.elements.micButton.classList.add('disabled');
            this.elements.statusIndicator.classList.add('auto-mode');
            this.elements.statusIndicator.querySelector('.status-text').textContent = 'ASCOLTO ATTIVO';
        } else {
            this.elements.autoModeOnBtn.classList.remove('active');
            this.elements.autoModeOffBtn.classList.add('active');
            this.elements.micButton.classList.remove('disabled');
            this.elements.statusIndicator.classList.remove('auto-mode');
            this.elements.statusIndicator.querySelector('.status-text').textContent = 'Pronto';
        }
    }

    updateWakeWordStatus() {
        if (this.elements.wakeWordStatus) {
            const statusText = this.elements.wakeWordStatus.querySelector('.wake-word-text');
            if (statusText) {
                statusText.textContent = this.useWakeWord ? '🎤 Wake Word: ON' : '🎤 Wake Word: OFF';
                
                // Aggiorna stile visivo
                this.elements.wakeWordStatus.classList.toggle('active', this.useWakeWord);
                this.elements.wakeWordStatus.classList.toggle('inactive', !this.useWakeWord);
            }
        }
    }

    updateUIState(state) {
        const statusText = this.elements.statusIndicator.querySelector('.status-text');
        
        switch(state) {
            case 'listening':
                this.elements.micButton.classList.add('listening');
                if (!this.isAutoMode) {
                    statusText.textContent = 'In ascolto...';
                }
                this.elements.statusIndicator.classList.add('active');
                break;
            case 'processing':
                statusText.textContent = 'Elaborazione...';
                break;
            case 'speaking':
                statusText.textContent = 'Risposta vocale...';
                break;
            case 'idle':
            default:
                this.elements.micButton.classList.remove('listening');
                if (!this.isAutoMode) {
                    statusText.textContent = 'Pronto';
                    this.elements.statusIndicator.classList.remove('active');
                }
                break;
        }
    }

    async processTranscript(transcript) {
        console.log('Trascrizione:', transcript);
        console.log('Modalità AUTO:', this.isAutoMode, 'Wake word attive:', this.useWakeWord);
        
        // Mostra trascrizione
        if (this.elements.transcriptionDisplay) {
            this.elements.transcriptionDisplay.textContent = transcript;
        }
        
        // In modalità auto con wake word, verifica se contiene wake word
        if (this.isAutoMode && this.useWakeWord) {
            const containsWakeWord = this.wakePhrases.some(phrase => 
                transcript.toLowerCase().includes(phrase)
            );
            
            if (!containsWakeWord) {
                console.log('Nessuna wake word rilevata, ignoro');
                return;
            }
            
            // Rimuovi wake word dal testo
            let cleanTranscript = transcript;
            this.wakePhrases.forEach(phrase => {
                cleanTranscript = cleanTranscript.replace(new RegExp(phrase, 'gi'), '').trim();
            });
            transcript = cleanTranscript;
            console.log('Testo pulito dopo rimozione wake word:', transcript);
        }
        
        // 🧠 SISTEMA SEMANTICO INTELLIGENTE - Sostituisce pattern rigidi
        const lowerTranscript = transcript.toLowerCase();
        
        // Usa il sistema semantico per riconoscere intent temporali
        let temporalIntent = null;
        if (window.semanticEngine) {
            temporalIntent = window.semanticEngine.getBestTemporalMatch(transcript);
            console.log('🧠 SEMANTIC INTENT:', temporalIntent);
        }
        
        // Fallback ai pattern rigidi se semantico non disponibile
        const isWeekRequest = temporalIntent?.domain === 'settimana' || 
                             lowerTranscript.includes('settimana') || 
                             lowerTranscript.includes('week') ||
                             lowerTranscript.includes('che settimana') ||
                             lowerTranscript.includes('numero settimana') ||
                             lowerTranscript.includes('settimana dell\'anno') ||
                             lowerTranscript.includes('settimana siamo');
        
        // 🧠 SISTEMA SEMANTICO - Determina tutti i tipi di richiesta temporale
        const isMonthRequest = temporalIntent?.domain === 'mese' || 
                              lowerTranscript.includes('che mese') || 
                              lowerTranscript.includes('in che mese');
        
        const isYearRequest = temporalIntent?.domain === 'anno' ||
                             lowerTranscript.includes('che anno') ||
                             lowerTranscript.includes('in che anno');
        
        const isQuarterRequest = temporalIntent?.domain === 'trimestre' ||
                                lowerTranscript.includes('che trimestre') ||
                                lowerTranscript.includes('in che trimestre');
        
        const isQuadrimesterRequest = temporalIntent?.domain === 'quadrimestre' ||
                                     lowerTranscript.includes('che quadrimestre') ||
                                     lowerTranscript.includes('in che quadrimestre');
        
        const isSemesterRequest = temporalIntent?.domain === 'semestre' ||
                                 lowerTranscript.includes('che semestre') ||
                                 lowerTranscript.includes('in che semestre');
        
        const isSeasonRequest = temporalIntent?.domain === 'stagione' ||
                               lowerTranscript.includes('che stagione') ||
                               lowerTranscript.includes('in che stagione');
        
        const isDayOfWeekRequest = temporalIntent?.domain === 'giorno_settimana' ||
                                  lowerTranscript.includes('che giorno della settimana') ||
                                  lowerTranscript.includes('giorno della settimana è') ||
                                  lowerTranscript.includes('giorno della settimana sarà') ||
                                  lowerTranscript.includes('giorno della settimana era') ||
                                  lowerTranscript.includes('domani che giorno') ||
                                  lowerTranscript.includes('dopo domani che giorno') ||
                                  lowerTranscript.includes('dopodomani che giorno') ||
                                  lowerTranscript.includes('ieri che giorno') ||
                                  lowerTranscript.includes('altro ieri che giorno') ||
                                  lowerTranscript.includes('ieri l\'altro che giorno') ||
                                  lowerTranscript.includes('che giorno sarà') ||
                                  lowerTranscript.includes('che giorno era') ||
                                  lowerTranscript.includes('dopo domani') ||
                                  lowerTranscript.includes('dopodomani') ||
                                  lowerTranscript.includes('altro ieri') ||
                                  lowerTranscript.includes('ieri l\'altro');
        
        const isDateRequest = temporalIntent?.domain === 'data_corrente' ||
                             (lowerTranscript.includes('che data è') && 
                              !lowerTranscript.includes('domani') && 
                              !lowerTranscript.includes('ieri') && 
                              !lowerTranscript.includes('dopodomani') && 
                              !lowerTranscript.includes('dopo domani') && 
                              !lowerTranscript.includes('altro ieri') && 
                              !lowerTranscript.includes('ieri l\'altro') &&
                              !lowerTranscript.includes('sarà') &&
                              !lowerTranscript.includes('avremo') &&
                              !lowerTranscript.includes('era') &&
                              !lowerTranscript.includes('avevamo') &&
                              // ESCLUDI pattern "giorni fa"
                              !/\d+\s+giorni\s+fa/.test(lowerTranscript) &&
                              !/(un|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+giorni?\s+fa/.test(lowerTranscript) &&
                              !lowerTranscript.includes('giorni fa') &&
                              !lowerTranscript.includes('fa che data')) ||
                             (lowerTranscript.includes('data di oggi') && !lowerTranscript.includes('giorni fa')) ||
                             (lowerTranscript.includes('data corrente') && !lowerTranscript.includes('giorni fa'));
        
        const isDateTemporalRequest = temporalIntent?.domain === 'data_temporale' ||
                                     lowerTranscript.includes('che data sarà') ||
                                     lowerTranscript.includes('che data avremo') ||
                                     lowerTranscript.includes('che data era') ||
                                     lowerTranscript.includes('che data avevamo') ||
                                     lowerTranscript.includes('domani che data') ||
                                     lowerTranscript.includes('dopodomani che data') ||
                                     lowerTranscript.includes('ieri che data') ||
                                     lowerTranscript.includes('dopo domani che data') ||
                                     lowerTranscript.includes('altro ieri che data') ||
                                     lowerTranscript.includes('data di domani') ||
                                     lowerTranscript.includes('data di dopodomani') ||
                                     lowerTranscript.includes('data di dopo domani') ||
                                     lowerTranscript.includes('data di ieri') ||
                                     lowerTranscript.includes('dimmi la data di') ||
                                     // PATTERN "X giorni fa che data era"
                                     /\d+\s+giorni\s+fa/.test(lowerTranscript) ||
                                     /(un|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+giorni?\s+fa/.test(lowerTranscript) ||
                                     lowerTranscript.includes('giorni fa che data') ||
                                     lowerTranscript.includes('fa che data');
        
        // ROUTING RICHIESTE TEMPORALI - gestione locale con data corretta
        // IMPORTANTE: Controlla PRIMA richieste temporali, poi quelle correnti
        
        // DEBUG: Log dettagliato per capire la classificazione
        const hasGiorniFaNumeric = /\d+\s+giorni\s+fa/.test(lowerTranscript);
        const hasGiorniFaText = /(un|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+giorni?\s+fa/.test(lowerTranscript);
        const hasGiorniFaPattern = lowerTranscript.includes('giorni fa che data');
        
        console.log('🔍 ROUTING DEBUG:', {
            transcript: transcript,
            lowerTranscript: lowerTranscript,
            temporalIntent: temporalIntent,
            isDateTemporalRequest: isDateTemporalRequest,
            isDateRequest: isDateRequest,
            hasGiorniFaNumeric: hasGiorniFaNumeric,
            hasGiorniFaText: hasGiorniFaText, 
            hasGiorniFaPattern: hasGiorniFaPattern,
            combinedGiorniFa: hasGiorniFaNumeric || hasGiorniFaText
        });
        
        if (isDateTemporalRequest) {
            console.log('📅 Richiesta data temporale rilevata - gestisco localmente');
            this.provideDateTemporalInfo(transcript);
            return;
        } else if (isDateRequest) {
            console.log('📅 Richiesta data corrente rilevata - gestisco localmente');
            
            // FIX: Controlla se contiene modificatori temporali come "domani", "ieri", etc.
            const lowerTranscript = transcript.toLowerCase();
            const hasTemporalModifier = lowerTranscript.includes('domani') || 
                                      lowerTranscript.includes('ieri') || 
                                      lowerTranscript.includes('dopo domani') || 
                                      lowerTranscript.includes('l\'altro ieri') ||
                                      lowerTranscript.includes('altro ieri');
            
            if (hasTemporalModifier) {
                console.log('📅 CORREZIONE: Rilevato modificatore temporale, uso provideDateTemporalInfo');
                this.provideDateTemporalInfo(transcript);
            } else {
                this.provideDateInfo();
            }
            return;
        } else if (isDayOfWeekRequest) {
            console.log('📅 Richiesta giorno settimana rilevata - gestisco localmente');
            this.provideDayOfWeekInfo(transcript);
            return;
        } else if (isWeekRequest) {
            console.log('🗓️ Richiesta settimana rilevata - gestisco localmente');
            this.provideWeekInfo();
            return;
        } else if (isMonthRequest) {
            console.log('📅 Richiesta mese rilevata - gestisco localmente');
            this.provideMonthInfo();
            return;
        } else if (isYearRequest) {
            console.log('📆 Richiesta anno rilevata - gestisco localmente');
            this.provideYearInfo();
            return;
        } else if (isQuarterRequest) {
            console.log('📊 Richiesta trimestre rilevata - gestisco localmente');
            this.provideQuarterInfo();
            return;
        } else if (isQuadrimesterRequest) {
            console.log('📈 Richiesta quadrimestre rilevata - gestisco localmente');
            this.provideQuadrimesterInfo();
            return;
        } else if (isSemesterRequest) {
            console.log('📋 Richiesta semestre rilevata - gestisco localmente');
            this.provideSemesterInfo();
            return;
        } else if (isSeasonRequest) {
            console.log('🌸 Richiesta stagione rilevata - gestisco localmente');
            this.provideSeasonInfo();
            return;
        } else {
            // Solo per richieste data/ora semplici, gestisci localmente
            
            // IMPORTANTE: Gestisci "che data è" come richiesta temporale PRIMA del middleware business
            if (lowerTranscript.includes('che data è') || 
                lowerTranscript.includes('che data è oggi') ||
                lowerTranscript.includes('dimmi che data è') ||
                lowerTranscript.includes('voglio sapere che data è')) {
                console.log('📅 Richiesta data corrente rilevata - gestisco localmente');
                this.provideDateInfo();
                return;
            }
            
            // Prima controlla le domande combinate (data + ora)
            if (lowerTranscript.includes('che giorno è oggi e che ore sono') || 
                lowerTranscript.includes('che giorno è e che ore sono') ||
                lowerTranscript.includes('dimmi che giorno è e che ore sono') ||
                lowerTranscript.includes('che giorno è oggi e dimmi l\'ora') ||
                lowerTranscript.includes('voglio sapere che giorno è oggi e che ore sono') ||
                lowerTranscript.includes('data e ora')) {
                this.provideDateFirstThenTime();
                return;
            }
            
            // Controlla se chiede prima l'ora poi la data
            if (lowerTranscript.includes('che ore sono e che giorno è') ||
                lowerTranscript.includes('che ora è e che giorno è') ||
                lowerTranscript.includes('dimmi l\'ora e che giorno è') ||
                lowerTranscript.includes('ora e data')) {
                this.provideTimeFirstThenDate();
                return;
            }
            
            // Poi controlla le domande singole per l'ora
            if (lowerTranscript.includes('che ore sono') || lowerTranscript.includes('che ora è') || 
                lowerTranscript.includes('dimmi l\'ora') || lowerTranscript.includes('ora attuale')) {
                this.provideTimeInfo();
                return;
            }
            
            // Infine controlla le domande singole per la data (ma non settimane)
            if (lowerTranscript.includes('che giorno è') || lowerTranscript.includes('data di oggi') || 
                lowerTranscript.includes('oggi è') || lowerTranscript.includes('dimmi la data')) {
                this.provideDateInfo();
                return;
            }
        }
        
        // Invia all'assistente AI (prova entrambi i nomi)
        const assistant = window.FlavioAIAssistant || window.flavioAI;
        
        if (assistant) {
            console.log('Assistente AI trovato, invio comando:', transcript);
            this.updateUIState('processing');
            
            try {
                // Invia come input vocale per attivare TTS
                const response = await assistant.sendMessage(transcript, true);
                console.log('Risposta ricevuta:', response);
                
                // Il TTS è già gestito dal metodo speakResponse di FlavioAIAssistant 
                // quando isVoiceInput = true, quindi non serve chiamare speak qui
                console.log('🔊 TTS gestito automaticamente da FlavioAIAssistant per input vocale');
                
            } catch (error) {
                console.error('Errore elaborazione comando:', error);
                this.showNotification('Errore elaborazione comando', 'error');
            }
        } else {
            console.error('Assistente AI non trovato! (provati FlavioAIAssistant e flavioAI)');
            this.showNotification('Assistente AI non disponibile', 'error');
        }
    }
    
    /**
     * Fornisce informazioni sull'ora corrente
     */
    provideTimeInfo() {
        const now = new Date();
        const ore = now.getHours();
        const minuti = now.getMinutes();
        const secondi = now.getSeconds();
        const timeString = `Sono le ${ore} e ${minuti} minuti${secondi > 0 ? ` e ${secondi} secondi` : ''}`;
        
        console.log('🕐 DEBUG TIME INFO:');
        console.log('   - Raw Date object:', now);
        console.log('   - ISO String:', now.toISOString());
        console.log('   - Locale String:', now.toLocaleString('it-IT'));
        console.log('   - Timezone Offset:', now.getTimezoneOffset());
        console.log('   - Final timeString:', timeString);
        
        this.speak(timeString);
    }
    
    /**
     * Fornisce informazioni sulla data corrente
     */
    provideDateInfo() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const dateString = now.toLocaleDateString('it-IT', options);
        const response = `Oggi è ${dateString}`;
        
        console.log('📅 DEBUG DATE INFO:');
        console.log('   - Raw Date object:', now);
        console.log('   - ISO String:', now.toISOString());
        console.log('   - Locale String:', now.toLocaleString('it-IT'));
        console.log('   - Timezone Offset:', now.getTimezoneOffset());
        console.log('   - Final response:', response);
        
        this.speak(response);
    }
    
    /**
     * Fornisce informazioni sulla data con modificatori temporali (domani, ieri, ecc.)
     */
    /**
     * Funzione pubblica per gestire richieste temporali da altri sistemi
     */
    handleTemporalRequest(transcript) {
        console.log('🎯 AIVoiceManagerV2.handleTemporalRequest chiamato per:', transcript);
        
        // Usa il sistema semantico per riconoscere intent temporali
        let temporalIntent = null;
        if (window.semanticEngine) {
            temporalIntent = window.semanticEngine.getBestTemporalMatch(transcript);
            console.log('🧠 SEMANTIC INTENT:', temporalIntent);
        }
        
        const lowerTranscript = transcript.toLowerCase();
        
        // Verifica quale tipo di richiesta temporale è
        const isDateRequest = temporalIntent?.domain === 'data_corrente' ||
                             lowerTranscript.includes('che data è') ||
                             lowerTranscript.includes('data di oggi') ||
                             lowerTranscript.includes('data corrente') ||
                             lowerTranscript.includes('in che data siamo') ||
                             lowerTranscript.includes('che data abbiamo') ||
                             lowerTranscript.includes('che data è oggi') ||
                             lowerTranscript.includes('dimmi che data è') ||
                             lowerTranscript.includes('dimmi la data');
        
        const isDateTemporalRequest = temporalIntent?.domain === 'data_temporale' ||
                                     lowerTranscript.includes('che data sarà') ||
                                     lowerTranscript.includes('che data avremo') ||
                                     lowerTranscript.includes('che data era') ||
                                     lowerTranscript.includes('che data avevamo') ||
                                     lowerTranscript.includes('domani che data') ||
                                     lowerTranscript.includes('dopodomani che data') ||
                                     lowerTranscript.includes('ieri che data') ||
                                     lowerTranscript.includes('dopo domani che data') ||
                                     lowerTranscript.includes('altro ieri che data') ||
                                     lowerTranscript.includes('data di domani') ||
                                     lowerTranscript.includes('data di dopodomani') ||
                                     lowerTranscript.includes('data di dopo domani') ||
                                     lowerTranscript.includes('data di ieri') ||
                                     lowerTranscript.includes('dimmi la data di') ||
                                     /(tra|fra|dopo|di\s+qui\s+a|entro)\s+(\d+|un|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|undici|dodici|quindici|venti|trenta|quaranta|cinquanta|sessanta|settanta|ottanta|novanta|cento)\s+(giorni?|giorno|settimane?|settimana|mesi?|mese|anni?|anno|ore|ora|minuti?|minuto)/i.test(lowerTranscript);
        
        if (isDateRequest) {
            console.log('📅 Richiesta data corrente - gestisco localmente');
            this.provideDateInfo();
            return true;
        } else if (isDateTemporalRequest) {
            console.log('📅 Richiesta data temporale - gestisco localmente');
            this.provideDateTemporalInfo(transcript);
            return true;
        }
        
        console.log('❌ Richiesta non riconosciuta come temporale');
        return false;
    }

    provideDateTemporalInfo(transcript) {
        const lowerTranscript = transcript.toLowerCase();
        const now = new Date();
        let targetDate = new Date(now);
        let dayModifier = 'oggi';
        
        // NUOVO: Gestione COMPLETA pattern temporali relativi (futuro E passato)
        const relativeMatch = lowerTranscript.match(/(tra|fra|dopo|di\s+qui\s+a|entro|in)\s+(\d+|un|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|undici|dodici|quindici|venti|trenta|quaranta|cinquanta|sessanta|settanta|ottanta|novanta|cento)\s+(giorni?|giorno|settimane?|settimana|mesi?|mese|anni?|anno|ore|ora|minuti?|minuto)/i);
        
        // PATTERN PER IL PASSATO: "X giorni fa", "X settimane fa", etc.
        const pastMatch = lowerTranscript.match(/(\d+|un|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|undici|dodici|quindici|venti|trenta|quaranta|cinquanta|sessanta|settanta|ottanta|novanta|cento)\s+(giorni?|giorno|settimane?|settimana|mesi?|mese|anni?|anno)\s+fa/i);
        
        // Pattern AGGIUNTIVI per espressioni idiomatiche italiane
        let idiomaticMatch = null;
        
        // "la settimana prossima", "il mese prossimo", "l'anno prossimo"
        if (lowerTranscript.includes('settimana prossima') || lowerTranscript.includes('la prossima settimana')) {
            idiomaticMatch = {type: 'settimana', amount: 1, text: 'la settimana prossima'};
        } else if (lowerTranscript.includes('mese prossimo') || lowerTranscript.includes('il prossimo mese')) {
            idiomaticMatch = {type: 'mese', amount: 1, text: 'il mese prossimo'};
        } else if (lowerTranscript.includes('anno prossimo') || lowerTranscript.includes('il prossimo anno')) {
            idiomaticMatch = {type: 'anno', amount: 1, text: 'l\'anno prossimo'};
        }
        // "la settimana scorsa", "il mese scorso", "l'anno scorso"
        else if (lowerTranscript.includes('settimana scorsa') || lowerTranscript.includes('la scorsa settimana')) {
            idiomaticMatch = {type: 'settimana', amount: -1, text: 'la settimana scorsa'};
        } else if (lowerTranscript.includes('mese scorso') || lowerTranscript.includes('il mese scorso')) {
            idiomaticMatch = {type: 'mese', amount: -1, text: 'il mese scorso'};
        } else if (lowerTranscript.includes('anno scorso') || lowerTranscript.includes('l\'anno scorso')) {
            idiomaticMatch = {type: 'anno', amount: -1, text: 'l\'anno scorso'};
        }
        // "fra poco", "tra poco", "a breve"
        else if (lowerTranscript.includes('fra poco') || lowerTranscript.includes('tra poco') || lowerTranscript.includes('a breve')) {
            idiomaticMatch = {type: 'ore', amount: 1, text: 'tra poco'};
        }
        // "stamattina", "stasera", "stanotte", "stamani"
        else if (lowerTranscript.includes('stamattina') || lowerTranscript.includes('stamani')) {
            idiomaticMatch = {type: 'today_morning', text: 'stamattina'};
        } else if (lowerTranscript.includes('stasera')) {
            idiomaticMatch = {type: 'today_evening', text: 'stasera'};
        } else if (lowerTranscript.includes('stanotte')) {
            idiomaticMatch = {type: 'today_night', text: 'stanotte'};
        }
        
        // Gestione pattern numerici per il PASSATO
        if (pastMatch) {
            // Mappa COMPLETA numeri scritti
            const numberMap = {
                'un': 1, 'una': 1, 'due': 2, 'tre': 3, 'quattro': 4, 'cinque': 5,
                'sei': 6, 'sette': 7, 'otto': 8, 'nove': 9, 'dieci': 10,
                'undici': 11, 'dodici': 12, 'quindici': 15, 'venti': 20, 'trenta': 30,
                'quaranta': 40, 'cinquanta': 50, 'sessanta': 60, 'settanta': 70,
                'ottanta': 80, 'novanta': 90, 'cento': 100
            };
            
            const amountStr = pastMatch[1].toLowerCase();
            const amount = isNaN(amountStr) ? numberMap[amountStr] : parseInt(amountStr);
            const unit = pastMatch[2].toLowerCase();
            
            console.log('🔥 PAST MATCH TROVATO:', {amountStr, amount, unit});
            
            if (unit.startsWith('giorno') || unit === 'giorni') {
                targetDate.setDate(now.getDate() - amount);
                dayModifier = `${amount} ${amount === 1 ? 'giorno' : 'giorni'} fa`;
            } else if (unit.startsWith('settiman') || unit === 'settimane') {
                targetDate.setDate(now.getDate() - (amount * 7));
                dayModifier = `${amount} ${amount === 1 ? 'settimana' : 'settimane'} fa`;
            } else if (unit.startsWith('mes') || unit === 'mesi') {
                targetDate.setMonth(now.getMonth() - amount);
                dayModifier = `${amount} ${amount === 1 ? 'mese' : 'mesi'} fa`;
            } else if (unit.startsWith('ann') || unit === 'anni') {
                targetDate.setFullYear(now.getFullYear() - amount);
                dayModifier = `${amount} ${amount === 1 ? 'anno' : 'anni'} fa`;
            }
        }
        // Gestione pattern numerici relativi FUTURI
        else if (relativeMatch) {
            // Mappa COMPLETA numeri scritti
            const numberMap = {
                'un': 1, 'una': 1, 'due': 2, 'tre': 3, 'quattro': 4, 'cinque': 5,
                'sei': 6, 'sette': 7, 'otto': 8, 'nove': 9, 'dieci': 10,
                'undici': 11, 'dodici': 12, 'quindici': 15, 'venti': 20, 'trenta': 30,
                'quaranta': 40, 'cinquanta': 50, 'sessanta': 60, 'settanta': 70,
                'ottanta': 80, 'novanta': 90, 'cento': 100
            };
            
            const preposition = relativeMatch[1];
            const amountStr = relativeMatch[2].toLowerCase();
            const amount = isNaN(amountStr) ? numberMap[amountStr] : parseInt(amountStr);
            const unit = relativeMatch[3].toLowerCase();
            
            console.log('🔥 RELATIVE MATCH TROVATO:', {preposition, amountStr, amount, unit});
            
            if (unit.startsWith('giorno') || unit === 'giorni') {
                targetDate.setDate(now.getDate() + amount);
                dayModifier = `tra ${amount} ${amount === 1 ? 'giorno' : 'giorni'}`;
            } else if (unit.startsWith('settimana') || unit === 'settimane') {
                targetDate.setDate(now.getDate() + (amount * 7));
                dayModifier = `tra ${amountStr === 'una' ? 'una' : amount} ${amount === 1 ? 'settimana' : 'settimane'}`;
            } else if (unit.startsWith('mese') || unit === 'mesi') {
                targetDate.setMonth(now.getMonth() + amount);
                dayModifier = `tra ${amount} ${amount === 1 ? 'mese' : 'mesi'}`;
            } else if (unit.startsWith('anno') || unit === 'anni') {
                targetDate.setFullYear(now.getFullYear() + amount);
                dayModifier = `tra ${amount} ${amount === 1 ? 'anno' : 'anni'}`;
            } else if (unit.startsWith('ora') || unit === 'ore') {
                targetDate.setHours(now.getHours() + amount);
                dayModifier = `tra ${amount} ${amount === 1 ? 'ora' : 'ore'}`;
            } else if (unit.startsWith('minuto') || unit === 'minuti') {
                targetDate.setMinutes(now.getMinutes() + amount);
                dayModifier = `tra ${amount} ${amount === 1 ? 'minuto' : 'minuti'}`;
            }
        }
        // Gestione pattern idiomatici
        else if (idiomaticMatch) {
            console.log('🔥 IDIOMATIC MATCH TROVATO:', idiomaticMatch);
            
            if (idiomaticMatch.type === 'settimana') {
                targetDate.setDate(now.getDate() + (idiomaticMatch.amount * 7));
                dayModifier = idiomaticMatch.text;
            } else if (idiomaticMatch.type === 'mese') {
                targetDate.setMonth(now.getMonth() + idiomaticMatch.amount);
                dayModifier = idiomaticMatch.text;
            } else if (idiomaticMatch.type === 'anno') {
                targetDate.setFullYear(now.getFullYear() + idiomaticMatch.amount);
                dayModifier = idiomaticMatch.text;
            } else if (idiomaticMatch.type === 'ore') {
                targetDate.setHours(now.getHours() + idiomaticMatch.amount);
                dayModifier = idiomaticMatch.text;
            } else if (idiomaticMatch.type === 'today_morning') {
                targetDate.setHours(8, 0, 0, 0); // 8:00 AM
                dayModifier = 'stamattina';
            } else if (idiomaticMatch.type === 'today_evening') {
                targetDate.setHours(19, 0, 0, 0); // 7:00 PM
                dayModifier = 'stasera';
            } else if (idiomaticMatch.type === 'today_night') {
                targetDate.setHours(23, 0, 0, 0); // 11:00 PM
                dayModifier = 'stanotte';
            }
        }
        // Determina il giorno target - ORDINE IMPORTANTE: controlla prima le parole più lunghe!
        else if (lowerTranscript.includes('dopodomani') || lowerTranscript.includes('dopo domani')) {
            targetDate.setDate(now.getDate() + 2);
            dayModifier = 'dopodomani';
        } else if (lowerTranscript.includes('domani')) {
            targetDate.setDate(now.getDate() + 1);
            dayModifier = 'domani';
        } else if (lowerTranscript.includes('ieri')) {
            if (lowerTranscript.includes('altro ieri') || lowerTranscript.includes('ieri l\'altro')) {
                targetDate.setDate(now.getDate() - 2);
                dayModifier = 'l\'altro ieri';
            } else {
                targetDate.setDate(now.getDate() - 1);
                dayModifier = 'ieri';
            }
        }
        
        // Gestione pattern "dimmi la data di" - ORDINE IMPORTANTE!
        if (lowerTranscript.includes('dimmi la data di')) {
            if (lowerTranscript.includes('dimmi la data di dopodomani') || lowerTranscript.includes('dimmi la data di dopo domani')) {
                targetDate.setDate(now.getDate() + 2);
                dayModifier = 'dopodomani';
            } else if (lowerTranscript.includes('dimmi la data di domani')) {
                targetDate.setDate(now.getDate() + 1);
                dayModifier = 'domani';
            } else if (lowerTranscript.includes('dimmi la data di ieri')) {
                targetDate.setDate(now.getDate() - 1);
                dayModifier = 'ieri';
            }
        }
        
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const dateString = targetDate.toLocaleDateString('it-IT', options);
        
        // Determina il verbo da usare
        let verb = 'è';
        if (lowerTranscript.includes('sarà') || lowerTranscript.includes('avremo') || relativeMatch || idiomaticMatch) {
            verb = 'sarà';
        } else if (lowerTranscript.includes('era') || lowerTranscript.includes('avevamo')) {
            verb = 'era';
        }
        
        const response = `${dayModifier.charAt(0).toUpperCase() + dayModifier.slice(1)} ${verb} ${dateString}`;
        
        console.log('📅 DEBUG DATE TEMPORAL INFO:');
        console.log('   - Transcript:', transcript);
        console.log('   - Relative match:', relativeMatch);
        console.log('   - Idiomatic match:', idiomaticMatch);
        console.log('   - Day modifier:', dayModifier);
        console.log('   - Target date:', targetDate);
        console.log('   - Response:', response);
        
        this.speak(response);
    }
    
    /**
     * Fornisce data prima, poi ora (per "che giorno è e che ore sono")
     * Formato: Giorno settimana, data, ora (ore, minuti, secondi)
     */
    provideDateFirstThenTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const dateString = now.toLocaleDateString('it-IT', options);
        const ore = now.getHours();
        const minuti = now.getMinutes();
        const secondi = now.getSeconds();
        const response = `Oggi è ${dateString} e sono le ${ore}, ${minuti} minuti e ${secondi} secondi`;
        
        console.log('📅 Fornisco data prima, poi ora:', response);
        this.speak(response);
    }

    /**
     * Fornisce ora prima, poi data (per "che ore sono e che giorno è")
     * Formato: Ora (ore, minuti, secondi), giorno settimana, giorno, mese, anno
     */
    provideTimeFirstThenDate() {
        const now = new Date();
        const ore = now.getHours();
        const minuti = now.getMinutes();
        const secondi = now.getSeconds();
        
        const giornoSettimana = now.toLocaleDateString('it-IT', { weekday: 'long' });
        const giorno = now.getDate();
        const mese = now.toLocaleDateString('it-IT', { month: 'long' });
        const anno = now.getFullYear();
        
        const response = `Sono le ${ore}, ${minuti} minuti e ${secondi} secondi di ${giornoSettimana} ${giorno} ${mese} ${anno}`;
        
        console.log('🕐 Fornisco ora prima, poi data:', response);
        this.speak(response);
    }

    /**
     * Fornisce informazioni complete su data e ora (mantenuto per compatibilità)
     */
    provideDateTimeInfo() {
        // Fallback alla funzione data-prima-ora per compatibilità
        this.provideDateFirstThenTime();
    }
    
    /**
     * Fornisce informazioni sulla settimana dell'anno corrente
     */
    provideWeekInfo() {
        const now = new Date();
        
        // Calcolo settimana ISO 8601 (stesso algoritmo del sistema)
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        
        const response = `Siamo nella settimana ${weekNumber} dell'anno ${now.getFullYear()}`;
        
        console.log('🗓️ DEBUG WEEK INFO:');
        console.log('   - Data corrente:', now.toString());
        console.log('   - Anno:', now.getFullYear());
        console.log('   - Settimana calcolata:', weekNumber);
        console.log('   - Risposta finale:', response);
        
        this.speak(response);
    }
    
    /**
     * Fornisce informazioni sul mese corrente
     */
    provideMonthInfo() {
        const now = new Date();
        const monthNames = [
            'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
            'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
        ];
        
        const monthNumber = now.getMonth() + 1; // 0-indexed, quindi +1
        const monthName = monthNames[now.getMonth()];
        const year = now.getFullYear();
        
        const response = `Siamo nel mese di ${monthName}, il ${monthNumber}° mese dell'anno ${year}`;
        
        console.log('📅 DEBUG MONTH INFO:');
        console.log('   - Data corrente:', now.toString());
        console.log('   - Mese numero:', monthNumber);
        console.log('   - Nome mese:', monthName);
        console.log('   - Anno:', year);
        console.log('   - Risposta finale:', response);
        
        this.speak(response);
    }
    
    /**
     * Fornisce informazioni sull'anno corrente
     */
    provideYearInfo() {
        const now = new Date();
        const year = now.getFullYear();
        const response = `Siamo nell'anno ${year}`;
        
        console.log('📆 DEBUG YEAR INFO: Anno', year);
        this.speak(response);
    }
    
    /**
     * Fornisce informazioni sul trimestre corrente
     */
    provideQuarterInfo() {
        const now = new Date();
        const month = now.getMonth() + 1; // 0-indexed
        const quarter = Math.ceil(month / 3);
        const year = now.getFullYear();
        
        const quarterNames = ['primo', 'secondo', 'terzo', 'quarto'];
        const response = `Siamo nel ${quarterNames[quarter-1]} trimestre dell'anno ${year}`;
        
        console.log('📊 DEBUG QUARTER INFO: Trimestre', quarter, 'del', year);
        this.speak(response);
    }
    
    /**
     * Fornisce informazioni sul quadrimestre corrente
     */
    provideQuadrimesterInfo() {
        const now = new Date();
        const month = now.getMonth() + 1; // 0-indexed
        const quadrimester = Math.ceil(month / 4);
        const year = now.getFullYear();
        
        const quadrimesterNames = ['primo', 'secondo', 'terzo'];
        const response = `Siamo nel ${quadrimesterNames[quadrimester-1]} quadrimestre dell'anno ${year}`;
        
        console.log('📈 DEBUG QUADRIMESTER INFO: Quadrimestre', quadrimester, 'del', year);
        this.speak(response);
    }
    
    /**
     * Fornisce informazioni sul semestre corrente
     */
    provideSemesterInfo() {
        const now = new Date();
        const month = now.getMonth() + 1; // 0-indexed
        const semester = Math.ceil(month / 6);
        const year = now.getFullYear();
        
        const semesterNames = ['primo', 'secondo'];
        const response = `Siamo nel ${semesterNames[semester-1]} semestre dell'anno ${year}`;
        
        console.log('📋 DEBUG SEMESTER INFO: Semestre', semester, 'del', year);
        this.speak(response);
    }
    
    /**
     * Fornisce informazioni sulla stagione corrente
     */
    provideSeasonInfo() {
        const now = new Date();
        const month = now.getMonth() + 1; // 0-indexed
        const day = now.getDate();
        
        let season;
        if ((month === 12 && day >= 21) || month === 1 || month === 2 || (month === 3 && day < 20)) {
            season = 'inverno';
        } else if ((month === 3 && day >= 20) || month === 4 || month === 5 || (month === 6 && day < 21)) {
            season = 'primavera';
        } else if ((month === 6 && day >= 21) || month === 7 || month === 8 || (month === 9 && day < 22)) {
            season = 'estate';
        } else {
            season = 'autunno';
        }
        
        const response = `Siamo in ${season}`;
        
        console.log('🌸 DEBUG SEASON INFO: Stagione', season);
        this.speak(response);
    }
    
    /**
     * Fornisce informazioni sul giorno della settimana (ieri l'altro, ieri, oggi, domani, dopo domani)
     */
    provideDayOfWeekInfo(transcript = '') {
        const dayNames = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
        
        // Controlla il tipo di richiesta temporale - ORDINE IMPORTANTE!
        const lowerTranscript = transcript.toLowerCase();
        const isAboutDayAfterTomorrow = lowerTranscript.includes('dopodomani') || lowerTranscript.includes('dopo domani');
        const isAboutTomorrow = lowerTranscript.includes('domani') && !isAboutDayAfterTomorrow;
        const isAboutDayBeforeYesterday = lowerTranscript.includes('altro ieri') || lowerTranscript.includes('ieri l\'altro');
        const isAboutYesterday = (lowerTranscript.includes('ieri') || lowerTranscript.includes('era')) && !isAboutDayBeforeYesterday;
        
        let response;
        let debugInfo;
        
        if (isAboutDayAfterTomorrow) {
            const dayAfterTomorrow = new Date();
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
            const dayAfterTomorrowName = dayNames[dayAfterTomorrow.getDay()];
            response = `Dopo domani sarà ${dayAfterTomorrowName}`;
            debugInfo = `Dopo domani: ${dayAfterTomorrowName}`;
        } else if (isAboutTomorrow) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowDayName = dayNames[tomorrow.getDay()];
            response = `Domani sarà ${tomorrowDayName}`;
            debugInfo = `Domani: ${tomorrowDayName}`;
        } else if (isAboutDayBeforeYesterday) {
            const dayBeforeYesterday = new Date();
            dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
            const dayBeforeYesterdayName = dayNames[dayBeforeYesterday.getDay()];
            response = `L'altro ieri era ${dayBeforeYesterdayName}`;
            debugInfo = `L'altro ieri: ${dayBeforeYesterdayName}`;
        } else if (isAboutYesterday) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayDayName = dayNames[yesterday.getDay()];
            response = `Ieri era ${yesterdayDayName}`;
            debugInfo = `Ieri: ${yesterdayDayName}`;
        } else {
            const now = new Date();
            const todayDayName = dayNames[now.getDay()];
            response = `Oggi è ${todayDayName}`;
            debugInfo = `Oggi: ${todayDayName}`;
        }
        
        console.log('📅 DEBUG DAY OF WEEK INFO:', debugInfo);
        this.speak(response);
    }

    async speak(text) {
        return new Promise((resolve) => {
            console.log('🔊 AIVoiceManagerV2 - Parlando:', text);
            
            // PREVENZIONE DOPPIA CHIAMATA - Se già sta parlando, ignora
            if (this.isSpeaking) {
                console.log('⚠️ PREVENZIONE LOOP: TTS già in corso, ignoro nuova chiamata');
                resolve();
                return;
            }
            
            // PREVENZIONE DUPLICATI - Controlla se è lo stesso testo in poco tempo
            const now = Date.now();
            const timeDiff = now - (this.lastSpokenTime || 0);
            if (this.lastSpokenText === text && timeDiff < 3000) {
                console.log('⚠️ PREVENZIONE DUPLICATI: Stesso testo in', timeDiff, 'ms, ignoro');
                resolve();
                return;
            }
            
            // IMPORTANTE: Disattiva riconoscimento vocale mentre parla per evitare loop
            const wasListening = this.isListening;
            if (wasListening && this.isAutoMode) {
                console.log('🔇 Disattivo riconoscimento temporaneamente per evitare loop');
                this.pauseListening();
            }
            
            // Cancella code precedenti
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'it-IT';
                utterance.rate = this.ttsConfig.rate || 1.0;
                utterance.pitch = this.ttsConfig.pitch || 1.0;
                utterance.volume = this.ttsConfig.volume || 1.0;
                
                if (this.ttsConfig.voice) {
                    utterance.voice = this.ttsConfig.voice;
                }
                
                utterance.onstart = () => {
                    console.log('🔊 TTS avviato');
                    this.isSpeaking = true; // Imposta flag speaking
                    this.lastSpokenText = text; // Salva ultimo testo
                    this.lastSpokenTime = Date.now(); // Salva timestamp
                    this.updateUIState('speaking');
                };
                
                utterance.onend = () => {
                    console.log('🔊 TTS terminato');
                    this.isSpeaking = false; // Rimuovi flag speaking
                    
                    // Riattiva riconoscimento dopo un delay per evitare echi
                    if (wasListening && this.isAutoMode) {
                        setTimeout(() => {
                            console.log('🔊 Riattivo riconoscimento dopo TTS');
                            this.resumeListening();
                        }, 1500); // 1.5 secondi di pausa per evitare echi
                    }
                    
                    this.updateUIState(this.isAutoMode ? 'listening' : 'idle');
                    resolve();
                };
                
                utterance.onerror = (e) => {
                    console.error('❌ Errore TTS:', e);
                    this.isSpeaking = false; // Rimuovi flag speaking anche in caso di errore
                    
                    // Riattiva riconoscimento anche in caso di errore
                    if (wasListening && this.isAutoMode) {
                        setTimeout(() => {
                            console.log('🔊 Riattivo riconoscimento dopo errore TTS');
                            this.resumeListening();
                        }, 500);
                    }
                    
                    this.updateUIState(this.isAutoMode ? 'listening' : 'idle');
                    resolve();
                };
                
                window.speechSynthesis.speak(utterance);
            } else {
                // Fallback per browser senza speechSynthesis
                console.log('⚠️ speechSynthesis non disponibile');
                resolve();
            }
        });
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Implementa notifiche visive
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Crea notifica toast personalizzata
        const existingToast = document.querySelector('.voice-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'voice-toast';
        toast.innerHTML = message;
        
        // Stili in base al tipo
        const colors = {
            info: '#007AFF',
            success: '#34C759',
            warning: '#FF9500',
            error: '#FF3B30'
        };
        
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type] || colors.info};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 500;
            z-index: 10000;
            animation: slideUp 0.3s ease;
            max-width: 90%;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(toast);
        
        // Auto-rimuovi dopo la durata specificata
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// Inizializza al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 Inizializzazione AIVoiceManagerV2...');
    try {
        window.AIVoiceManagerV2 = new AIVoiceManagerV2();
        console.log('✅ AIVoiceManagerV2 inizializzato con successo');
    } catch (error) {
        console.error('❌ Errore inizializzazione AIVoiceManagerV2:', error);
    }
});

// Export per uso in altri moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIVoiceManagerV2;
}

// Funzioni di debug globali per iPad testing
window.enableIPadMode = function() {
    localStorage.setItem('force_ipad_mode', 'true');
    console.log('✅ Modalità iPad ATTIVATA - Ricarica la pagina per applicare');
    console.log('💡 Usa disableIPadMode() per disattivare');
};

window.disableIPadMode = function() {
    localStorage.removeItem('force_ipad_mode');
    console.log('✅ Modalità iPad DISATTIVATA - Ricarica la pagina per applicare');
};

window.checkIPadMode = function() {
    const isForced = localStorage.getItem('force_ipad_mode') === 'true';
    console.log('🔍 Modalità iPad forzata:', isForced);
    console.log('🔍 User Agent:', navigator.userAgent);
    console.log('🔍 Touch Points:', navigator.maxTouchPoints);
    console.log('🔍 Screen Width:', window.screen.width);
    return isForced;
};

// Metodo per creare pannello di debug
AIVoiceManagerV2.prototype.createDebugPanel = function() {
    // Non creare se esiste già
    if (document.getElementById('ipad-debug-panel')) return;
    
    console.log('🔧 Creando pannello debug per iPad testing...');
    
    const panel = document.createElement('div');
    panel.id = 'ipad-debug-panel';
    panel.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(255, 0, 0, 0.15);
        border: 2px solid #ff0000;
        border-radius: 8px;
        padding: 15px;
        z-index: 9999;
        font-family: monospace;
        font-size: 12px;
        color: #333;
        backdrop-filter: blur(5px);
        max-width: 250px;
        box-shadow: 0 4px 15px rgba(255, 0, 0, 0.3);
        animation: slideInFromTop 0.3s ease;
        transition: all 0.3s ease;
    `;
    
    panel.innerHTML = `
        <div style="margin-bottom: 10px;">
            <strong>🔧 iPad Debug Mode</strong>
        </div>
        <div style="margin-bottom: 10px; font-size: 10px;">
            iPad non rilevato. Usa i controlli qui sotto per testare.
        </div>
        <button id="enable-ipad-btn" style="
            background: #007AFF;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            margin-right: 5px;
        ">Attiva iPad Mode</button>
        <button id="hide-debug-btn" style="
            background: #666;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
        ">Nascondi</button>
        <div style="margin-top: 10px; font-size: 9px; color: #666;">
            Dopo aver cliccato "Attiva iPad Mode", ricarica la pagina.
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Eventi
    document.getElementById('enable-ipad-btn').addEventListener('click', () => {
        localStorage.setItem('force_ipad_mode', 'true');
        panel.innerHTML = `
            <div style="color: #28a745; font-weight: bold;">
                ✅ iPad Mode ATTIVATO!
            </div>
            <div style="margin: 10px 0; font-size: 10px;">
                Ricarica la pagina per vedere i controlli iPad.
            </div>
            <button onclick="location.reload()" style="
                background: #28a745;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
            ">Ricarica Pagina</button>
        `;
    });
    
    document.getElementById('hide-debug-btn').addEventListener('click', () => {
        panel.remove();
    });
    
    // Auto-nascondi dopo 10 secondi
    setTimeout(() => {
        if (panel.parentNode) {
            panel.style.opacity = '0.3';
        }
    }, 10000);
};