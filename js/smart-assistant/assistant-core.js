/**
 * Smart Assistant Core Module
 * Coordinatore principale e setup base
 */

export class SmartAssistantCore {
    constructor() {
        this.container = null;
        this.isIPad = this.detectIPad();
        this.apiEndpoint = this.selectAPIEndpoint();
        this.supabaseAI = null;
        
        console.log('🎤 SmartAssistant Core: Inizializzazione...');
        if (this.isIPad) {
            console.log('📱 iPad rilevato - Modalità fallback attivata');
        }
    }

    /**
     * Rileva se è un iPad
     */
    detectIPad() {
        return /iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
    }

    /**
     * Seleziona endpoint API appropriato
     */
    selectAPIEndpoint() {
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
    }

    /**
     * Inizializzazione principale
     */
    async init() {
        try {
            console.log('🔄 Inizializzazione Smart Assistant...');
            
            // Trova container
            this.container = document.getElementById('smart-assistant-container');
            if (!this.container) {
                console.error('❌ Container smart-assistant-container non trovato');
                return;
            }

            // Imposta funzione di refresh cache globale
            window.refreshAICache = async function() {
                if (window.SupabaseAI && window.SupabaseAI.refreshCache) {
                    await window.SupabaseAI.refreshCache();
                    console.log('✅ Cache AI aggiornata');
                } else {
                    console.warn('⚠️ SupabaseAI non disponibile per refresh cache');
                }
            };

            // Inizializza AI Integration
            if (window.SupabaseAI) {
                this.supabaseAI = window.SupabaseAI;
            }

            return true;
        } catch (error) {
            console.error('❌ Errore inizializzazione Smart Assistant:', error);
            return false;
        }
    }

    /**
     * Rendering dell'interfaccia principale
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="smart-assistant-container">
                <!-- Header -->
                <div class="smart-header">
                    <h2>🎤 Smart Commercial Assistant</h2>
                    <p>Note vocali, KPI e insights intelligenti</p>
                </div>

                <!-- Voice Recorder Section -->
                <div class="voice-recorder-section">
                    <div class="voice-recorder-card">
                        <div class="voice-recorder-header">
                            <h3>📝 Note Vocali</h3>
                            <div class="recording-status" id="recording-status">
                                <span class="status-text">Pronto per registrare</span>
                            </div>
                        </div>
                        
                        <div class="voice-controls">
                            <button id="start-recording-btn" class="voice-btn record-btn">
                                <i class="fas fa-microphone"></i>
                                <span>Inizia Registrazione</span>
                            </button>
                            
                            <button id="stop-recording-btn" class="voice-btn stop-btn" disabled style="display: none;">
                                <i class="fas fa-stop"></i>
                                <span>Stop</span>
                            </button>
                            
                            <button id="clear-notes-btn" class="voice-btn clear-btn">
                                <i class="fas fa-trash"></i>
                                <span>Pulisci Note</span>
                            </button>
                        </div>
                        
                        <div class="voice-notes-list" id="voice-notes-list">
                            <!-- Le note vocali verranno inserite qui -->
                        </div>
                    </div>
                </div>

                <!-- Quick Actions Panel -->
                <div class="quick-actions-panel">
                    <div class="action-grid">
                        <button onclick="if(window.SmartAssistant) { window.SmartAssistant.refreshKPI(); }" class="action-btn">
                            <i class="fas fa-chart-line"></i>
                            <span>Aggiorna KPI</span>
                        </button>
                        
                        <button onclick="if(window.SmartAssistant) { window.SmartAssistant.renderCallList(); }" class="action-btn">
                            <i class="fas fa-phone"></i>
                            <span>Lista Chiamate</span>
                        </button>
                        
                        <button onclick="if(window.SmartAssistant) { window.SmartAssistant.renderWhatsappList(); }" class="action-btn">
                            <i class="fab fa-whatsapp"></i>
                            <span>WhatsApp</span>
                        </button>
                        
                        <button onclick="if(window.SmartAssistant) { window.SmartAssistant.renderTaskList(); }" class="action-btn">
                            <i class="fas fa-tasks"></i>
                            <span>ToDo List</span>
                        </button>
                        
                        <button onclick="if(window.SmartAssistant) { window.SmartAssistant.showSecureFolders(); }" class="action-btn">
                            <i class="fas fa-folder-lock"></i>
                            <span>Cartelle Sicure</span>
                        </button>
                    </div>
                </div>

                <!-- Dashboard Sections -->
                <div class="dashboard-sections">
                    <!-- KPI Dashboard -->
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>📊 Dashboard KPI</h3>
                            <button id="refresh-kpi-btn" class="refresh-btn">
                                <i class="fas fa-sync"></i>
                            </button>
                        </div>
                        <div id="kpi-dashboard" class="kpi-content">
                            <div class="loading-kpi">🔄 Caricamento KPI...</div>
                        </div>
                    </div>

                    <!-- Call List -->
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>📞 Lista Chiamate</h3>
                            <button id="refresh-calls-btn" class="refresh-btn">
                                <i class="fas fa-sync"></i>
                            </button>
                        </div>
                        <div id="call-list" class="call-content">
                            <div class="loading-calls">🔄 Caricamento chiamate...</div>
                        </div>
                    </div>

                    <!-- WhatsApp List -->
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>💬 Lista WhatsApp</h3>
                            <button id="refresh-whatsapp-btn" class="refresh-btn">
                                <i class="fas fa-sync"></i>
                            </button>
                        </div>
                        <div id="whatsapp-list" class="whatsapp-content">
                            <div class="loading-whatsapp">🔄 Caricamento WhatsApp...</div>
                        </div>
                    </div>

                    <!-- Task List -->
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>✅ Lista ToDo</h3>
                            <button id="refresh-tasks-btn" class="refresh-btn">
                                <i class="fas fa-sync"></i>
                            </button>
                        </div>
                        <div id="task-list" class="task-content">
                            <div class="loading-tasks">🔄 Caricamento task...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Aggiorna lo status dell'assistente
     */
    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('recording-status');
        if (statusElement) {
            const statusText = statusElement.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = message;
                statusElement.className = `recording-status ${type}`;
            }
        }
    }

    /**
     * Helper per attendere elementi DOM
     */
    async waitForElement(elementId, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.getElementById(elementId);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
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

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Elemento ${elementId} non trovato entro ${timeout}ms`));
            }, timeout);
        });
    }
}