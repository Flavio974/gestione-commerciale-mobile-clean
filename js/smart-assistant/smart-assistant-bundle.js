/**
 * Smart Assistant Bundle - Sistema Modulare Compatible
 * Versione non-ES6 che funziona ovunque
 * Coordinatore per SmartAssistant modulare
 */

(function() {
    'use strict';
    
    console.log('🚀 Caricamento Smart Assistant Bundle...');

    // ===== SMART ASSISTANT CORE =====
    function SmartAssistantCore() {
        this.container = null;
        this.isIPad = this.detectIPad();
        this.apiEndpoint = this.selectAPIEndpoint();
        this.supabaseAI = null;
        
        console.log('🎤 SmartAssistant Core: Inizializzazione...');
        if (this.isIPad) {
            console.log('📱 iPad rilevato - Modalità fallback attivata');
        }
    }

    SmartAssistantCore.prototype.detectIPad = function() {
        return /iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
    };

    SmartAssistantCore.prototype.selectAPIEndpoint = function() {
        const API_ENDPOINTS = {
            primary: '/.netlify/functions',
            fallback: null,
            local: 'http://localhost:3000'
        };

        const IPAD_CONFIG = {
            useLocalSpeechRecognition: false,
            disableServerTranscription: false,
            enableMockResponses: false,
            reducedTimeout: 30000
        };

        if (this.isIPad && IPAD_CONFIG.disableServerTranscription) {
            return API_ENDPOINTS.fallback || API_ENDPOINTS.local;
        }
        
        return API_ENDPOINTS.primary;
    };

    SmartAssistantCore.prototype.updateStatus = function(message, type) {
        const statusElement = document.getElementById('recording-status');
        if (statusElement) {
            const statusText = statusElement.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = message;
                statusElement.className = 'recording-status ' + (type || 'info');
            }
        }
    };

    SmartAssistantCore.prototype.waitForElement = function(elementId, timeout) {
        timeout = timeout || 5000;
        return new Promise(function(resolve, reject) {
            const element = document.getElementById(elementId);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(function(mutations, obs) {
                const element = document.getElementById(elementId);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(function() {
                observer.disconnect();
                reject(new Error('Elemento ' + elementId + ' non trovato entro ' + timeout + 'ms'));
            }, timeout);
        });
    };

    // ===== VOICE RECORDER =====
    function VoiceRecorder(core) {
        this.core = core;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recognition = null;
        this.currentAudio = null;
        this.recordingInterval = null;
        this.recordingStartTime = null;
    }

    VoiceRecorder.prototype.init = function() {
        var self = this;
        return this.checkAudioSupportWithRetry().then(function() {
            self.setupEventListeners();
            self.renderVoiceNotes();
            console.log('✅ Voice Recorder inizializzato');
        });
    };

    VoiceRecorder.prototype.setupEventListeners = function() {
        var self = this;
        const startBtn = document.getElementById('start-recording-btn');
        const stopBtn = document.getElementById('stop-recording-btn');
        const clearBtn = document.getElementById('clear-notes-btn');

        if (startBtn) {
            startBtn.addEventListener('click', function() { self.startRecording(); });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', function() { self.stopRecording(); });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', function() { self.clearAllNotes(); });
        }
    };

    VoiceRecorder.prototype.checkAudioSupportWithRetry = function() {
        var self = this;
        var maxRetries = 3;
        var lastError = null;

        function attempt(retryCount) {
            return self.checkAudioSupport().then(function() {
                console.log('✅ Supporto audio verificato al tentativo ' + (retryCount + 1));
                return true;
            }).catch(function(error) {
                lastError = error;
                console.warn('⚠️ Tentativo ' + (retryCount + 1) + ' fallito:', error.message);
                
                if (retryCount < maxRetries - 1) {
                    return new Promise(function(resolve) {
                        setTimeout(function() {
                            resolve(attempt(retryCount + 1));
                        }, 1000 * (retryCount + 1));
                    });
                } else {
                    throw error;
                }
            });
        }

        return attempt(0).catch(function() {
            console.error('❌ Supporto audio non disponibile dopo ' + maxRetries + ' tentativi');
            console.error('Ultimo errore:', lastError?.message);
            self.core.updateStatus('Microfono non disponibile', 'error');
            return false;
        });
    };

    VoiceRecorder.prototype.checkAudioSupport = function() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return Promise.reject(new Error('MediaDevices API non supportata'));
        }

        return navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        }).then(function(stream) {
            if (!window.MediaRecorder || !MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                stream.getTracks().forEach(function(track) { track.stop(); });
                throw new Error('MediaRecorder non supportato');
            }

            stream.getTracks().forEach(function(track) { track.stop(); });
            console.log('✅ Supporto audio verificato');
        }).catch(function(error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('Permesso microfono negato');
            } else if (error.name === 'NotFoundError') {
                throw new Error('Microfono non trovato');
            } else {
                throw new Error('Errore audio: ' + error.message);
            }
        });
    };

    VoiceRecorder.prototype.startRecording = function() {
        var self = this;
        if (this.isRecording) {
            console.warn('⚠️ Registrazione già in corso');
            return Promise.resolve();
        }

        try {
            console.log('🎤 Inizio registrazione...');
            this.core.updateStatus('Richiesta permessi microfono...', 'recording');

            return navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                } 
            }).then(function(stream) {
                self.mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'audio/webm;codecs=opus'
                });

                self.audioChunks = [];
                self.isRecording = true;
                self.recordingStartTime = Date.now();

                self.mediaRecorder.addEventListener('dataavailable', function(event) {
                    if (event.data.size > 0) {
                        self.audioChunks.push(event.data);
                    }
                });

                self.mediaRecorder.addEventListener('stop', function() {
                    self.processRecording();
                });

                self.mediaRecorder.start(100);
                self.showRecordingUI();
                self.startRecordingTimer();
                
                console.log('✅ Registrazione iniziata');
            });

        } catch (error) {
            console.error('❌ Errore avvio registrazione:', error);
            this.core.updateStatus('Errore: ' + error.message, 'error');
            this.isRecording = false;
            return Promise.reject(error);
        }
    };

    VoiceRecorder.prototype.stopRecording = function() {
        if (!this.isRecording || !this.mediaRecorder) {
            console.warn('⚠️ Nessuna registrazione in corso');
            return;
        }

        console.log('🛑 Fermo registrazione...');
        
        try {
            this.mediaRecorder.stop();
            
            if (this.mediaRecorder.stream) {
                this.mediaRecorder.stream.getTracks().forEach(function(track) {
                    track.stop();
                });
            }

            this.isRecording = false;
            this.stopRecordingTimer();
            this.hideRecordingUI();
            
            this.core.updateStatus('Elaborazione audio...', 'processing');
            
        } catch (error) {
            console.error('❌ Errore stop registrazione:', error);
            this.core.updateStatus('Errore durante stop', 'error');
        }
    };

    VoiceRecorder.prototype.processRecording = function() {
        if (this.audioChunks.length === 0) {
            console.warn('⚠️ Nessun dato audio registrato');
            this.core.updateStatus('Nessun audio registrato', 'warning');
            return;
        }

        console.log('🔄 Elaborazione registrazione...');
        
        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            console.log('✅ Audio blob creato: ' + (audioBlob.size / 1024).toFixed(2) + ' KB');
            
            this.saveVoiceNote(audioBlob, audioUrl);
            
        } catch (error) {
            console.error('❌ Errore elaborazione audio:', error);
            this.core.updateStatus('Errore elaborazione audio', 'error');
        }
    };

    VoiceRecorder.prototype.saveVoiceNote = function(audioBlob, audioUrl) {
        var self = this;
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

            const savedNotes = this.getSavedNotes();
            savedNotes.unshift(note);
            
            if (savedNotes.length > 50) {
                savedNotes.splice(50);
            }
            
            localStorage.setItem('voice_notes', JSON.stringify(savedNotes.map(function(n) {
                return {
                    id: n.id,
                    timestamp: n.timestamp,
                    size: n.size,
                    duration: n.duration,
                    transcription: n.transcription,
                    isTranscribing: n.isTranscribing
                };
            })));

            console.log('✅ Nota vocale salvata: ' + noteId);
            this.core.updateStatus('Nota vocale salvata!', 'success');
            
            this.renderVoiceNotes();
            
            setTimeout(function() {
                self.transcribeNote(noteId);
            }, 500);
            
        } catch (error) {
            console.error('❌ Errore salvataggio nota:', error);
            this.core.updateStatus('Errore salvataggio', 'error');
        }
    };

    VoiceRecorder.prototype.getSavedNotes = function() {
        try {
            const notes = localStorage.getItem('voice_notes');
            return notes ? JSON.parse(notes) : [];
        } catch (error) {
            console.error('❌ Errore lettura note:', error);
            return [];
        }
    };

    VoiceRecorder.prototype.renderVoiceNotes = function() {
        const container = document.getElementById('voice-notes-list');
        if (!container) return;

        const notes = this.getSavedNotes();
        
        if (notes.length === 0) {
            container.innerHTML = 
                '<div class="no-notes">' +
                    '<i class="fas fa-microphone-slash"></i>' +
                    '<p>Nessuna nota vocale registrata</p>' +
                '</div>';
            return;
        }

        container.innerHTML = notes.map(function(note) {
            return '<div class="voice-note-item" data-note-id="' + note.id + '">' +
                '<div class="note-header">' +
                    '<div class="note-info">' +
                        '<span class="note-timestamp">' + note.timestamp + '</span>' +
                        '<span class="note-duration">' + note.duration + 's</span>' +
                        '<span class="note-size">' + (note.size / 1024).toFixed(1) + ' KB</span>' +
                    '</div>' +
                    '<div class="note-actions">' +
                        '<button onclick="window.SmartAssistant?.voiceRecorder?.transcribeNote(\'' + note.id + '\')" class="transcribe-btn">' +
                            '<i class="fas fa-text-width"></i>' +
                        '</button>' +
                        '<button onclick="window.SmartAssistant?.voiceRecorder?.deleteNote(\'' + note.id + '\')" class="delete-btn">' +
                            '<i class="fas fa-trash"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="note-transcription">' +
                    (note.isTranscribing ? 
                        '<div class="transcribing">🔄 Trascrizione in corso...</div>' :
                        note.transcription ? 
                        '<div class="transcription-text">' + note.transcription + '</div>' :
                        '<div class="no-transcription">Clicca per trascrivere</div>'
                    ) +
                '</div>' +
            '</div>';
        }).join('');
    };

    VoiceRecorder.prototype.transcribeNote = function(noteId) {
        console.log('🔄 Trascrizione nota:', noteId);
        // Implementazione semplificata
        const notes = this.getSavedNotes();
        const noteIndex = notes.findIndex(function(n) { return n.id === noteId; });
        
        if (noteIndex !== -1) {
            notes[noteIndex].transcription = 'Trascrizione simulata per: ' + noteId;
            localStorage.setItem('voice_notes', JSON.stringify(notes));
            this.renderVoiceNotes();
        }
    };

    VoiceRecorder.prototype.deleteNote = function(noteId) {
        if (!confirm('Eliminare questa nota vocale?')) return;

        const notes = this.getSavedNotes();
        const updatedNotes = notes.filter(function(n) { return n.id !== noteId; });
        
        localStorage.setItem('voice_notes', JSON.stringify(updatedNotes));
        this.renderVoiceNotes();
        
        console.log('🗑️ Nota eliminata:', noteId);
    };

    VoiceRecorder.prototype.clearAllNotes = function() {
        if (!confirm('Eliminare tutte le note vocali?')) return;

        localStorage.removeItem('voice_notes');
        this.renderVoiceNotes();
        
        console.log('🗑️ Tutte le note eliminate');
        this.core.updateStatus('Note vocali eliminate', 'info');
    };

    VoiceRecorder.prototype.showRecordingUI = function() {
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
    };

    VoiceRecorder.prototype.hideRecordingUI = function() {
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
    };

    VoiceRecorder.prototype.addRecordingIndicator = function() {
        if (document.querySelector('.recording-indicator')) return;

        const indicator = document.createElement('div');
        indicator.className = 'recording-indicator';
        indicator.innerHTML = 
            '<div class="recording-pulse"></div>' +
            '<span>🔴 REC</span>' +
            '<span id="recording-timer">00:00</span>';
        
        const header = document.querySelector('.smart-header');
        if (header) {
            header.appendChild(indicator);
        }
    };

    VoiceRecorder.prototype.removeRecordingIndicator = function() {
        const indicator = document.querySelector('.recording-indicator');
        if (indicator) {
            indicator.remove();
        }
    };

    VoiceRecorder.prototype.startRecordingTimer = function() {
        var self = this;
        this.recordingInterval = setInterval(function() {
            if (self.recordingStartTime) {
                const elapsed = Math.floor((Date.now() - self.recordingStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                
                const timer = document.getElementById('recording-timer');
                if (timer) {
                    timer.textContent = 
                        minutes.toString().padStart(2, '0') + ':' + 
                        seconds.toString().padStart(2, '0');
                }
            }
        }, 1000);
    };

    VoiceRecorder.prototype.stopRecordingTimer = function() {
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }
        this.recordingStartTime = null;
    };

    // ===== DASHBOARD MANAGER SEMPLIFICATO =====
    function DashboardManager(core) {
        this.core = core;
        this.kpiCache = null;
        this.kpiCacheTime = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
    }

    DashboardManager.prototype.init = function() {
        var self = this;
        this.setupEventListeners();
        
        setTimeout(function() {
            self.renderCallList();
            self.renderWhatsappList();
            self.renderTaskList();
            self.refreshKPI();
        }, 100);
        
        console.log('✅ Dashboard Manager inizializzato');
    };

    DashboardManager.prototype.setupEventListeners = function() {
        var self = this;
        const refreshKpiBtn = document.getElementById('refresh-kpi-btn');
        const refreshCallsBtn = document.getElementById('refresh-calls-btn');
        const refreshWhatsappBtn = document.getElementById('refresh-whatsapp-btn');
        const refreshTasksBtn = document.getElementById('refresh-tasks-btn');

        if (refreshKpiBtn) refreshKpiBtn.addEventListener('click', function() { self.refreshKPI(); });
        if (refreshCallsBtn) refreshCallsBtn.addEventListener('click', function() { self.renderCallList(); });
        if (refreshWhatsappBtn) refreshWhatsappBtn.addEventListener('click', function() { self.renderWhatsappList(); });
        if (refreshTasksBtn) refreshTasksBtn.addEventListener('click', function() { self.renderTaskList(); });
    };

    DashboardManager.prototype.refreshKPI = function() {
        const kpiContainer = document.getElementById('kpi-dashboard');
        if (!kpiContainer) return;

        kpiContainer.innerHTML = '<div class="loading-kpi">🔄 Aggiornamento KPI...</div>';

        // Simula caricamento
        setTimeout(function() {
            kpiContainer.innerHTML = 
                '<div class="kpi-grid">' +
                    '<div class="kpi-card">' +
                        '<h4>📦 Ordini</h4>' +
                        '<div class="kpi-value">15</div>' +
                        '<div class="kpi-label">Oggi</div>' +
                    '</div>' +
                    '<div class="kpi-card">' +
                        '<h4>💰 Fatturato</h4>' +
                        '<div class="kpi-value">€3.250</div>' +
                        '<div class="kpi-label">Oggi</div>' +
                    '</div>' +
                    '<div class="kpi-card">' +
                        '<h4>👥 Clienti</h4>' +
                        '<div class="kpi-value">42</div>' +
                        '<div class="kpi-label">Attivi</div>' +
                    '</div>' +
                '</div>';
        }, 800);
    };

    DashboardManager.prototype.renderCallList = function() {
        const callContainer = document.getElementById('call-list');
        if (!callContainer) return;

        callContainer.innerHTML = '<div class="loading-calls">🔄 Caricamento chiamate...</div>';

        setTimeout(function() {
            callContainer.innerHTML = 
                '<div class="call-summary">5 chiamate, 2 da fare</div>' +
                '<div class="call-item">' +
                    '<div class="call-info">' +
                        '<div class="call-name">Mario Rossi</div>' +
                        '<div class="call-phone">+39 333 1234567</div>' +
                        '<div class="call-reason">Nuovo ordine</div>' +
                    '</div>' +
                '</div>' +
                '<div class="call-item">' +
                    '<div class="call-info">' +
                        '<div class="call-name">Giulia Bianchi</div>' +
                        '<div class="call-phone">+39 333 7654321</div>' +
                        '<div class="call-reason">Conferma consegna</div>' +
                    '</div>' +
                '</div>';
        }, 500);
    };

    DashboardManager.prototype.renderWhatsappList = function() {
        const whatsappContainer = document.getElementById('whatsapp-list');
        if (!whatsappContainer) return;

        whatsappContainer.innerHTML = '<div class="loading-whatsapp">🔄 Caricamento WhatsApp...</div>';

        setTimeout(function() {
            whatsappContainer.innerHTML = 
                '<div class="whatsapp-summary">3 messaggi, 1 non letto</div>' +
                '<div class="whatsapp-item unread">' +
                    '<div class="message-info">' +
                        '<div class="message-sender">Il Gusto</div>' +
                        '<div class="message-preview">Quando arriva l\'ordine?</div>' +
                    '</div>' +
                '</div>' +
                '<div class="whatsapp-item read">' +
                    '<div class="message-info">' +
                        '<div class="message-sender">Piemonte Carni</div>' +
                        '<div class="message-preview">Grazie per la consegna!</div>' +
                    '</div>' +
                '</div>';
        }, 300);
    };

    DashboardManager.prototype.renderTaskList = function() {
        const taskContainer = document.getElementById('task-list');
        if (!taskContainer) return;

        taskContainer.innerHTML = '<div class="loading-tasks">🔄 Caricamento task...</div>';

        setTimeout(function() {
            taskContainer.innerHTML = 
                '<div class="task-summary">4 task, 2 da completare</div>' +
                '<div class="task-item pending">' +
                    '<div class="task-info">' +
                        '<div class="task-title">Controllare giacenze</div>' +
                        '<div class="task-description">Verificare stock prodotti freschi</div>' +
                    '</div>' +
                '</div>' +
                '<div class="task-item completed">' +
                    '<div class="task-info">' +
                        '<div class="task-title completed">Preparare fatture</div>' +
                        '<div class="task-description">Fatturazione clienti mensili</div>' +
                    '</div>' +
                '</div>';
        }, 400);
    };

    // ===== SECURE STORAGE SEMPLIFICATO =====
    function SecureStorage(core) {
        this.core = core;
        this.reminders = [];
    }

    SecureStorage.prototype.init = function() {
        console.log('✅ Secure Storage inizializzato');
    };

    SecureStorage.prototype.showSecureFolders = function() {
        console.log('🔒 Apertura cartelle sicure...');
        alert('Cartelle Sicure\n(Simulazione - implementare storage sicuro)');
    };

    // ===== SMART ASSISTANT PRINCIPALE =====
    function SmartAssistant() {
        this.core = new SmartAssistantCore();
        this.voiceRecorder = new VoiceRecorder(this.core);
        this.dashboardManager = new DashboardManager(this.core);
        this.secureStorage = new SecureStorage(this.core);
    }

    SmartAssistant.prototype.init = function() {
        var self = this;
        
        console.log('🔄 Inizializzazione Smart Assistant Bundle...');
        
        // Trova container
        this.core.container = document.getElementById('smart-assistant-container');
        if (!this.core.container) {
            console.error('❌ Container smart-assistant-container non trovato');
            return Promise.reject(new Error('Container non trovato'));
        }

        // Setup globale refresh cache
        window.refreshAICache = function() {
            if (window.SupabaseAI && window.SupabaseAI.refreshCache) {
                return window.SupabaseAI.refreshCache().then(function() {
                    console.log('✅ Cache AI aggiornata');
                });
            } else {
                console.warn('⚠️ SupabaseAI non disponibile per refresh cache');
                return Promise.resolve();
            }
        };

        // Inizializza AI Integration
        if (window.SupabaseAI) {
            this.core.supabaseAI = window.SupabaseAI;
        }

        // Render UI
        this.render();

        // Inizializza moduli
        return Promise.all([
            this.voiceRecorder.init(),
            this.dashboardManager.init(),
            this.secureStorage.init()
        ]).then(function() {
            console.log('✅ Smart Assistant Bundle inizializzato con successo');
        }).catch(function(error) {
            console.error('❌ Errore inizializzazione Smart Assistant Bundle:', error);
            throw error;
        });
    };

    SmartAssistant.prototype.render = function() {
        if (!this.core.container) return;

        this.core.container.innerHTML = 
            '<div class="smart-assistant-container">' +
                '<div class="smart-header">' +
                    '<h2>🎤 Smart Commercial Assistant</h2>' +
                    '<p>Note vocali, KPI e insights intelligenti</p>' +
                '</div>' +
                
                '<div class="voice-recorder-section">' +
                    '<div class="voice-recorder-card">' +
                        '<div class="voice-recorder-header">' +
                            '<h3>📝 Note Vocali</h3>' +
                            '<div class="recording-status" id="recording-status">' +
                                '<span class="status-text">Pronto per registrare</span>' +
                            '</div>' +
                        '</div>' +
                        
                        '<div class="voice-controls">' +
                            '<button id="start-recording-btn" class="voice-btn record-btn">' +
                                '<i class="fas fa-microphone"></i>' +
                                '<span>Inizia Registrazione</span>' +
                            '</button>' +
                            '<button id="stop-recording-btn" class="voice-btn stop-btn" disabled style="display: none;">' +
                                '<i class="fas fa-stop"></i>' +
                                '<span>Stop</span>' +
                            '</button>' +
                            '<button id="clear-notes-btn" class="voice-btn clear-btn">' +
                                '<i class="fas fa-trash"></i>' +
                                '<span>Pulisci Note</span>' +
                            '</button>' +
                        '</div>' +
                        
                        '<div class="voice-notes-list" id="voice-notes-list">' +
                            '<!-- Le note vocali verranno inserite qui -->' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="quick-actions-panel">' +
                    '<div class="action-grid">' +
                        '<button onclick="if(window.SmartAssistant) { window.SmartAssistant.refreshKPI(); }" class="action-btn">' +
                            '<i class="fas fa-chart-line"></i>' +
                            '<span>Aggiorna KPI</span>' +
                        '</button>' +
                        '<button onclick="if(window.SmartAssistant) { window.SmartAssistant.dashboardManager.renderCallList(); }" class="action-btn">' +
                            '<i class="fas fa-phone"></i>' +
                            '<span>Lista Chiamate</span>' +
                        '</button>' +
                        '<button onclick="if(window.SmartAssistant) { window.SmartAssistant.dashboardManager.renderWhatsappList(); }" class="action-btn">' +
                            '<i class="fab fa-whatsapp"></i>' +
                            '<span>WhatsApp</span>' +
                        '</button>' +
                        '<button onclick="if(window.SmartAssistant) { window.SmartAssistant.dashboardManager.renderTaskList(); }" class="action-btn">' +
                            '<i class="fas fa-tasks"></i>' +
                            '<span>ToDo List</span>' +
                        '</button>' +
                        '<button onclick="if(window.SmartAssistant) { window.SmartAssistant.secureStorage.showSecureFolders(); }" class="action-btn">' +
                            '<i class="fas fa-folder-lock"></i>' +
                            '<span>Cartelle Sicure</span>' +
                        '</button>' +
                    '</div>' +
                '</div>' +

                '<div class="dashboard-sections">' +
                    '<div class="dashboard-card">' +
                        '<div class="card-header">' +
                            '<h3>📊 Dashboard KPI</h3>' +
                            '<button id="refresh-kpi-btn" class="refresh-btn">' +
                                '<i class="fas fa-sync"></i>' +
                            '</button>' +
                        '</div>' +
                        '<div id="kpi-dashboard" class="kpi-content">' +
                            '<div class="loading-kpi">🔄 Caricamento KPI...</div>' +
                        '</div>' +
                    '</div>' +

                    '<div class="dashboard-card">' +
                        '<div class="card-header">' +
                            '<h3>📞 Lista Chiamate</h3>' +
                            '<button id="refresh-calls-btn" class="refresh-btn">' +
                                '<i class="fas fa-sync"></i>' +
                            '</button>' +
                        '</div>' +
                        '<div id="call-list" class="call-content">' +
                            '<div class="loading-calls">🔄 Caricamento chiamate...</div>' +
                        '</div>' +
                    '</div>' +

                    '<div class="dashboard-card">' +
                        '<div class="card-header">' +
                            '<h3>💬 Lista WhatsApp</h3>' +
                            '<button id="refresh-whatsapp-btn" class="refresh-btn">' +
                                '<i class="fas fa-sync"></i>' +
                            '</button>' +
                        '</div>' +
                        '<div id="whatsapp-list" class="whatsapp-content">' +
                            '<div class="loading-whatsapp">🔄 Caricamento WhatsApp...</div>' +
                        '</div>' +
                    '</div>' +

                    '<div class="dashboard-card">' +
                        '<div class="card-header">' +
                            '<h3>✅ Lista ToDo</h3>' +
                            '<button id="refresh-tasks-btn" class="refresh-btn">' +
                                '<i class="fas fa-sync"></i>' +
                            '</button>' +
                        '</div>' +
                        '<div id="task-list" class="task-content">' +
                            '<div class="loading-tasks">🔄 Caricamento task...</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
    };

    // Metodi di compatibilità
    SmartAssistant.prototype.refreshKPI = function() {
        return this.dashboardManager.refreshKPI();
    };

    SmartAssistant.prototype.renderCallList = function() {
        return this.dashboardManager.renderCallList();
    };

    SmartAssistant.prototype.renderWhatsappList = function() {
        return this.dashboardManager.renderWhatsappList();
    };

    SmartAssistant.prototype.renderTaskList = function() {
        return this.dashboardManager.renderTaskList();
    };

    SmartAssistant.prototype.showSecureFolders = function() {
        return this.secureStorage.showSecureFolders();
    };

    // Esporta il sistema Smart Assistant
    window.SmartAssistantModular = SmartAssistant;
    console.log('✅ Smart Assistant Bundle caricato - Sistema modulare disponibile!');
    console.log('📦 Componenti:', ['Core', 'VoiceRecorder', 'DashboardManager', 'SecureStorage']);
    
})();