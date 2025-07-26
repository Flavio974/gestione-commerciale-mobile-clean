/**
 * Voice Recorder Module
 * Gestisce registrazione, trascrizione e salvataggio note vocali
 */

export class VoiceRecorder {
    constructor(core) {
        this.core = core;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recognition = null;
        this.currentAudio = null;
        this.recordingInterval = null;
        this.recordingStartTime = null;
    }

    /**
     * Inizializza il sistema di registrazione
     */
    async init() {
        await this.checkAudioSupportWithRetry();
        this.setupEventListeners();
        this.renderVoiceNotes();
        console.log('✅ Voice Recorder inizializzato');
    }

    /**
     * Setup event listeners per i controlli voce
     */
    setupEventListeners() {
        const startBtn = document.getElementById('start-recording-btn');
        const stopBtn = document.getElementById('stop-recording-btn');
        const clearBtn = document.getElementById('clear-notes-btn');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startRecording());
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopRecording());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllNotes());
        }
    }

    /**
     * Verifica supporto audio con retry
     */
    async checkAudioSupportWithRetry() {
        const maxRetries = 3;
        let lastError = null;

        for (let i = 0; i < maxRetries; i++) {
            try {
                await this.checkAudioSupport();
                console.log(`✅ Supporto audio verificato al tentativo ${i + 1}`);
                return true;
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Tentativo ${i + 1} fallito:`, error.message);
                
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
        }

        console.error('❌ Supporto audio non disponibile dopo', maxRetries, 'tentativi');
        console.error('Ultimo errore:', lastError?.message);
        
        this.core.updateStatus('Microfono non disponibile', 'error');
        return false;
    }

    /**
     * Verifica supporto audio del browser
     */
    async checkAudioSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('MediaDevices API non supportata');
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            // Test MediaRecorder
            if (!window.MediaRecorder || !MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                stream.getTracks().forEach(track => track.stop());
                throw new Error('MediaRecorder non supportato');
            }

            // Chiudi stream test
            stream.getTracks().forEach(track => track.stop());
            console.log('✅ Supporto audio verificato');
            
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('Permesso microfono negato');
            } else if (error.name === 'NotFoundError') {
                throw new Error('Microfono non trovato');
            } else {
                throw new Error(`Errore audio: ${error.message}`);
            }
        }
    }

    /**
     * Inizia registrazione
     */
    async startRecording() {
        if (this.isRecording) {
            console.warn('⚠️ Registrazione già in corso');
            return;
        }

        try {
            console.log('🎤 Inizio registrazione...');
            this.core.updateStatus('Richiesta permessi microfono...', 'recording');

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                } 
            });

            // Setup MediaRecorder
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];
            this.isRecording = true;
            this.recordingStartTime = Date.now();

            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            });

            this.mediaRecorder.addEventListener('stop', () => {
                this.processRecording();
            });

            this.mediaRecorder.start(100);

            // UI Updates
            this.showRecordingUI();
            this.startRecordingTimer();
            
            console.log('✅ Registrazione iniziata');

        } catch (error) {
            console.error('❌ Errore avvio registrazione:', error);
            this.core.updateStatus(`Errore: ${error.message}`, 'error');
            this.isRecording = false;
        }
    }

    /**
     * Ferma registrazione
     */
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            console.warn('⚠️ Nessuna registrazione in corso');
            return;
        }

        console.log('🛑 Fermo registrazione...');
        
        try {
            this.mediaRecorder.stop();
            
            // Ferma tutti i track del microfono
            if (this.mediaRecorder.stream) {
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }

            this.isRecording = false;
            this.stopRecordingTimer();
            this.hideRecordingUI();
            
            this.core.updateStatus('Elaborazione audio...', 'processing');
            
        } catch (error) {
            console.error('❌ Errore stop registrazione:', error);
            this.core.updateStatus('Errore durante stop', 'error');
        }
    }

    /**
     * Elabora registrazione completata
     */
    processRecording() {
        if (this.audioChunks.length === 0) {
            console.warn('⚠️ Nessun dato audio registrato');
            this.core.updateStatus('Nessun audio registrato', 'warning');
            return;
        }

        console.log('🔄 Elaborazione registrazione...');
        
        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            console.log(`✅ Audio blob creato: ${(audioBlob.size / 1024).toFixed(2)} KB`);
            
            // Salva nota vocale
            this.saveVoiceNote(audioBlob, audioUrl);
            
        } catch (error) {
            console.error('❌ Errore elaborazione audio:', error);
            this.core.updateStatus('Errore elaborazione audio', 'error');
        }
    }

    /**
     * Salva nota vocale
     */
    async saveVoiceNote(audioBlob, audioUrl) {
        try {
            const noteId = 'note_' + Date.now();
            const timestamp = new Date().toLocaleString('it-IT');
            const duration = this.recordingStartTime ? 
                Math.round((Date.now() - this.recordingStartTime) / 1000) : 0;

            const note = {
                id: noteId,
                timestamp: timestamp,
                audioUrl: audioUrl,
                audioBlob: audioBlob,
                size: audioBlob.size,
                duration: duration,
                transcription: null,
                isTranscribing: false
            };

            // Salva in localStorage
            const savedNotes = this.getSavedNotes();
            savedNotes.unshift(note);
            
            // Mantieni solo le ultime 50 note
            if (savedNotes.length > 50) {
                savedNotes.splice(50);
            }
            
            localStorage.setItem('voice_notes', JSON.stringify(savedNotes.map(n => ({
                ...n,
                audioBlob: null, // Non serializzare il blob
                audioUrl: null   // Sarà ricreato al caricamento
            }))));

            console.log(`✅ Nota vocale salvata: ${noteId}`);
            this.core.updateStatus('Nota vocale salvata!', 'success');
            
            // Aggiorna UI
            this.renderVoiceNotes();
            
            // Auto-trascrizione
            setTimeout(() => {
                this.transcribeNote(noteId);
            }, 500);
            
        } catch (error) {
            console.error('❌ Errore salvataggio nota:', error);
            this.core.updateStatus('Errore salvataggio', 'error');
        }
    }

    /**
     * Ottieni note salvate
     */
    getSavedNotes() {
        try {
            const notes = localStorage.getItem('voice_notes');
            return notes ? JSON.parse(notes) : [];
        } catch (error) {
            console.error('❌ Errore lettura note:', error);
            return [];
        }
    }

    /**
     * Renderizza lista note vocali
     */
    renderVoiceNotes() {
        const container = document.getElementById('voice-notes-list');
        if (!container) return;

        const notes = this.getSavedNotes();
        
        if (notes.length === 0) {
            container.innerHTML = `
                <div class="no-notes">
                    <i class="fas fa-microphone-slash"></i>
                    <p>Nessuna nota vocale registrata</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notes.map(note => `
            <div class="voice-note-item" data-note-id="${note.id}">
                <div class="note-header">
                    <div class="note-info">
                        <span class="note-timestamp">${note.timestamp}</span>
                        <span class="note-duration">${note.duration}s</span>
                        <span class="note-size">${(note.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div class="note-actions">
                        ${note.audioUrl ? `
                            <button onclick="window.SmartAssistant?.voiceRecorder?.playNote('${note.id}')" class="play-btn">
                                <i class="fas fa-play"></i>
                            </button>
                        ` : ''}
                        <button onclick="window.SmartAssistant?.voiceRecorder?.transcribeNote('${note.id}')" class="transcribe-btn">
                            <i class="fas fa-text-width"></i>
                        </button>
                        <button onclick="window.SmartAssistant?.voiceRecorder?.deleteNote('${note.id}')" class="delete-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="note-transcription">
                    ${note.isTranscribing ? 
                        '<div class="transcribing">🔄 Trascrizione in corso...</div>' :
                        note.transcription ? 
                        `<div class="transcription-text">${note.transcription}</div>` :
                        '<div class="no-transcription">Clicca per trascrivere</div>'
                    }
                </div>
            </div>
        `).join('');
    }

    /**
     * Trascrivi nota specifica
     */
    async transcribeNote(noteId) {
        const notes = this.getSavedNotes();
        const note = notes.find(n => n.id === noteId);
        
        if (!note) {
            console.error('❌ Nota non trovata:', noteId);
            return;
        }

        if (note.isTranscribing) {
            console.warn('⚠️ Trascrizione già in corso per:', noteId);
            return;
        }

        try {
            // Marca come in trascrizione
            note.isTranscribing = true;
            this.renderVoiceNotes();

            console.log('🔄 Inizio trascrizione per:', noteId);
            
            // Ricostruisci audioBlob se necessario
            if (!note.audioBlob && note.audioUrl) {
                const response = await fetch(note.audioUrl);
                note.audioBlob = await response.blob();
            }

            // Chiama API di trascrizione
            const transcription = await this.transcribeAudio(note.audioBlob);
            
            // Salva trascrizione
            note.transcription = transcription;
            note.isTranscribing = false;
            
            // Aggiorna localStorage
            const updatedNotes = this.getSavedNotes().map(n => 
                n.id === noteId ? note : n
            );
            localStorage.setItem('voice_notes', JSON.stringify(updatedNotes));
            
            this.renderVoiceNotes();
            console.log('✅ Trascrizione completata per:', noteId);
            
        } catch (error) {
            console.error('❌ Errore trascrizione:', error);
            note.isTranscribing = false;
            note.transcription = `Errore trascrizione: ${error.message}`;
            this.renderVoiceNotes();
        }
    }

    /**
     * Trascrivi audio usando API
     */
    async transcribeAudio(audioBlob) {
        // Implementazione semplificata - da estendere
        if (this.core.isIPad) {
            return await this.fallbackLocalSpeechRecognition(audioBlob);
        } else {
            return await this.callSpeechToTextAPI(audioBlob);
        }
    }

    /**
     * API di trascrizione
     */
    async callSpeechToTextAPI(audioBlob) {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.webm');
            formData.append('language', 'it-IT');

            const response = await fetch(`${this.core.apiEndpoint}/speech-to-text`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const result = await response.json();
            return result.transcription || 'Trascrizione non disponibile';
            
        } catch (error) {
            console.error('❌ Errore API trascrizione:', error);
            return await this.fallbackLocalSpeechRecognition(audioBlob);
        }
    }

    /**
     * Fallback trascrizione locale
     */
    async fallbackLocalSpeechRecognition(audioBlob) {
        return new Promise((resolve) => {
            try {
                if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    resolve('Trascrizione non supportata su questo browser');
                    return;
                }

                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                
                recognition.lang = 'it-IT';
                recognition.continuous = false;
                recognition.interimResults = false;

                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    resolve(transcript);
                };

                recognition.onerror = (event) => {
                    console.error('❌ Errore trascrizione locale:', event.error);
                    resolve(`Errore trascrizione: ${event.error}`);
                };

                recognition.onend = () => {
                    console.log('🔄 Trascrizione locale completata');
                };

                // Simula riproduzione per Web Speech API
                const audio = new Audio(URL.createObjectURL(audioBlob));
                audio.play();
                recognition.start();
                
                setTimeout(() => {
                    recognition.stop();
                    resolve('Timeout trascrizione');
                }, 10000);

            } catch (error) {
                resolve(`Errore trascrizione locale: ${error.message}`);
            }
        });
    }

    /**
     * Elimina nota specifica
     */
    deleteNote(noteId) {
        if (!confirm('Eliminare questa nota vocale?')) return;

        const notes = this.getSavedNotes();
        const updatedNotes = notes.filter(n => n.id !== noteId);
        
        localStorage.setItem('voice_notes', JSON.stringify(updatedNotes));
        this.renderVoiceNotes();
        
        console.log('🗑️ Nota eliminata:', noteId);
    }

    /**
     * Elimina tutte le note
     */
    clearAllNotes() {
        if (!confirm('Eliminare tutte le note vocali?')) return;

        localStorage.removeItem('voice_notes');
        this.renderVoiceNotes();
        
        console.log('🗑️ Tutte le note eliminate');
        this.core.updateStatus('Note vocali eliminate', 'info');
    }

    /**
     * UI States
     */
    showRecordingUI() {
        const startBtn = document.getElementById('start-recording-btn');
        const stopBtn = document.getElementById('stop-recording-btn');
        
        if (startBtn) {
            startBtn.style.display = 'none';
            startBtn.disabled = true;
        }
        
        if (stopBtn) {
            stopBtn.style.display = 'inline-flex';
            stopBtn.disabled = false;
        }

        this.addRecordingIndicator();
    }

    hideRecordingUI() {
        const startBtn = document.getElementById('start-recording-btn');
        const stopBtn = document.getElementById('stop-recording-btn');
        
        if (startBtn) {
            startBtn.style.display = 'inline-flex';
            startBtn.disabled = false;
        }
        
        if (stopBtn) {
            stopBtn.style.display = 'none';
            stopBtn.disabled = true;
        }

        this.removeRecordingIndicator();
    }

    addRecordingIndicator() {
        if (document.querySelector('.recording-indicator')) return;

        const indicator = document.createElement('div');
        indicator.className = 'recording-indicator';
        indicator.innerHTML = `
            <div class="recording-pulse"></div>
            <span>🔴 REC</span>
            <span id="recording-timer">00:00</span>
        `;
        
        const header = document.querySelector('.smart-header');
        if (header) {
            header.appendChild(indicator);
        }
    }

    removeRecordingIndicator() {
        const indicator = document.querySelector('.recording-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    startRecordingTimer() {
        this.recordingInterval = setInterval(() => {
            if (this.recordingStartTime) {
                const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                
                const timer = document.getElementById('recording-timer');
                if (timer) {
                    timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }
        this.recordingStartTime = null;
    }
}