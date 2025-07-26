/**
 * Secure Storage Module
 * Gestisce cartelle sicure e promemoria
 */

export class SecureStorage {
    constructor(core) {
        this.core = core;
        this.reminders = [];
        this.reminderInterval = null;
    }

    /**
     * Inizializza il sistema di storage sicuro
     */
    async init() {
        this.initializeReminders();
        console.log('✅ Secure Storage inizializzato');
    }

    /**
     * Mostra cartelle sicure
     */
    showSecureFolders() {
        console.log('🔒 Apertura cartelle sicure...');

        // Controlla se esiste già il modal
        if (document.getElementById('secure-folders-modal')) {
            document.getElementById('secure-folders-modal').style.display = 'block';
            return;
        }

        // Crea modal
        const modal = document.createElement('div');
        modal.id = 'secure-folders-modal';
        modal.className = 'secure-modal';
        modal.innerHTML = this.renderSecureFoldersModal();

        document.body.appendChild(modal);

        // Setup event listeners
        this.setupSecureFoldersListeners();
    }

    /**
     * Renderizza il modal delle cartelle sicure
     */
    renderSecureFoldersModal() {
        return `
            <div class="modal-overlay" onclick="this.closest('.secure-modal').style.display='none'">
                <div class="modal-content secure-folders-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>🔒 Cartelle Sicure</h3>
                        <button class="close-btn" onclick="this.closest('.secure-modal').style.display='none'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <div class="secure-tabs">
                            <button class="tab-btn active" onclick="window.SmartAssistant?.secureStorage?.showTab('folders')">
                                <i class="fas fa-folder-lock"></i> Cartelle
                            </button>
                            <button class="tab-btn" onclick="window.SmartAssistant?.secureStorage?.showTab('reminders')">
                                <i class="fas fa-bell"></i> Promemoria
                            </button>
                            <button class="tab-btn" onclick="window.SmartAssistant?.secureStorage?.showTab('settings')">
                                <i class="fas fa-cog"></i> Impostazioni
                            </button>
                        </div>

                        <div class="tab-content">
                            <!-- Folders Tab -->
                            <div id="folders-tab" class="tab-panel active">
                                <div class="folders-section">
                                    <h4>📁 Le Tue Cartelle Sicure</h4>
                                    <div class="folders-grid">
                                        <div class="folder-item" onclick="window.SmartAssistant?.secureStorage?.openFolder('documenti')">
                                            <div class="folder-icon">📄</div>
                                            <div class="folder-name">Documenti Privati</div>
                                            <div class="folder-count">12 file</div>
                                        </div>
                                        
                                        <div class="folder-item" onclick="window.SmartAssistant?.secureStorage?.openFolder('foto')">
                                            <div class="folder-icon">📸</div>
                                            <div class="folder-name">Foto Personali</div>
                                            <div class="folder-count">45 foto</div>
                                        </div>
                                        
                                        <div class="folder-item" onclick="window.SmartAssistant?.secureStorage?.openFolder('backup')">
                                            <div class="folder-icon">💾</div>
                                            <div class="folder-name">Backup Dati</div>
                                            <div class="folder-count">8 backup</div>
                                        </div>
                                        
                                        <div class="folder-item add-folder" onclick="window.SmartAssistant?.secureStorage?.createFolder()">
                                            <div class="folder-icon">➕</div>
                                            <div class="folder-name">Nuova Cartella</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="recent-files">
                                    <h4>📋 File Recenti</h4>
                                    <div class="file-list">
                                        <div class="file-item">
                                            <i class="fas fa-file-pdf"></i>
                                            <span>Contratto_Cliente_X.pdf</span>
                                            <span class="file-date">Ieri, 14:30</span>
                                        </div>
                                        <div class="file-item">
                                            <i class="fas fa-file-excel"></i>
                                            <span>Budget_2024.xlsx</span>
                                            <span class="file-date">2 giorni fa</span>
                                        </div>
                                        <div class="file-item">
                                            <i class="fas fa-file-image"></i>
                                            <span>Foto_Magazzino.jpg</span>
                                            <span class="file-date">1 settimana fa</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Reminders Tab -->
                            <div id="reminders-tab" class="tab-panel">
                                <div class="reminders-section">
                                    <div class="reminders-header">
                                        <h4>⏰ Promemoria Attivi</h4>
                                        <button class="add-reminder-btn" onclick="window.SmartAssistant?.secureStorage?.addReminder()">
                                            <i class="fas fa-plus"></i> Nuovo
                                        </button>
                                    </div>
                                    
                                    <div id="reminders-list" class="reminders-list">
                                        <!-- I promemoria verranno inseriti qui -->
                                    </div>
                                </div>
                            </div>

                            <!-- Settings Tab -->
                            <div id="settings-tab" class="tab-panel">
                                <div class="settings-section">
                                    <h4>⚙️ Impostazioni Sicurezza</h4>
                                    
                                    <div class="setting-group">
                                        <label class="setting-label">
                                            <input type="checkbox" id="auto-lock" checked>
                                            <span>Blocco automatico dopo 30 minuti</span>
                                        </label>
                                    </div>
                                    
                                    <div class="setting-group">
                                        <label class="setting-label">
                                            <input type="checkbox" id="encrypt-storage" checked>
                                            <span>Crittografia locale dei dati</span>
                                        </label>
                                    </div>
                                    
                                    <div class="setting-group">
                                        <label class="setting-label">
                                            <input type="checkbox" id="backup-reminders">
                                            <span>Backup automatico promemoria</span>
                                        </label>
                                    </div>
                                    
                                    <div class="actions-group">
                                        <button class="action-btn export" onclick="window.SmartAssistant?.secureStorage?.exportData()">
                                            <i class="fas fa-download"></i> Esporta Dati
                                        </button>
                                        <button class="action-btn import" onclick="window.SmartAssistant?.secureStorage?.importData()">
                                            <i class="fas fa-upload"></i> Importa Dati
                                        </button>
                                        <button class="action-btn danger" onclick="window.SmartAssistant?.secureStorage?.clearAllData()">
                                            <i class="fas fa-trash"></i> Cancella Tutto
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup listeners per cartelle sicure
     */
    setupSecureFoldersListeners() {
        // I listener sono già configurati negli onclick degli elementi
        this.renderRemindersList();
    }

    /**
     * Mostra tab specifica
     */
    showTab(tabName) {
        // Nascondi tutti i pannelli
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Rimuovi active da tutti i bottoni
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostra pannello selezionato
        const targetPanel = document.getElementById(`${tabName}-tab`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
        
        // Attiva bottone selezionato
        event.target.classList.add('active');
        
        // Aggiorna contenuto se necessario
        if (tabName === 'reminders') {
            this.renderRemindersList();
        }
    }

    /**
     * Apri cartella specifica
     */
    openFolder(folderName) {
        console.log(`📁 Apertura cartella: ${folderName}`);
        alert(`Apertura cartella "${folderName}"\n(Simulazione - implementare storage sicuro)`);
    }

    /**
     * Crea nuova cartella
     */
    createFolder() {
        const folderName = prompt('Nome della nuova cartella:');
        if (folderName) {
            console.log(`📁 Creazione cartella: ${folderName}`);
            alert(`Cartella "${folderName}" creata!\n(Simulazione)`);
        }
    }

    /**
     * Sistema Promemoria
     */
    initializeReminders() {
        // Carica promemoria salvati
        this.loadReminders();
        
        // Avvia controllo periodico
        this.startReminderCheck();
        
        console.log('⏰ Sistema promemoria inizializzato');
    }

    loadReminders() {
        try {
            const saved = localStorage.getItem('secure_reminders');
            this.reminders = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('❌ Errore caricamento promemoria:', error);
            this.reminders = [];
        }
    }

    saveReminders() {
        try {
            localStorage.setItem('secure_reminders', JSON.stringify(this.reminders));
        } catch (error) {
            console.error('❌ Errore salvataggio promemoria:', error);
        }
    }

    startReminderCheck() {
        // Controlla promemoria ogni minuto
        this.reminderInterval = setInterval(() => {
            this.checkReminders();
        }, 60000);
    }

    checkReminders() {
        const now = new Date();
        const activeReminders = this.reminders.filter(r => !r.completed && new Date(r.datetime) <= now);
        
        activeReminders.forEach(reminder => {
            this.showReminderNotification(reminder);
            reminder.completed = true;
        });
        
        if (activeReminders.length > 0) {
            this.saveReminders();
            this.renderRemindersList();
        }
    }

    showReminderNotification(reminder) {
        // Notifica browser se supportata
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔔 Promemoria', {
                body: reminder.text,
                icon: '/favicon.ico'
            });
        }
        
        // Notifica visiva sempre
        this.core.updateStatus(`🔔 Promemoria: ${reminder.text}`, 'reminder');
        
        // Alert di backup
        setTimeout(() => {
            alert(`🔔 Promemoria:\n${reminder.text}`);
        }, 1000);
    }

    addReminder() {
        const text = prompt('Testo del promemoria:');
        if (!text) return;
        
        const datetime = prompt('Data e ora (YYYY-MM-DD HH:MM):');
        if (!datetime) return;
        
        try {
            const reminderDate = new Date(datetime);
            if (isNaN(reminderDate)) {
                alert('Formato data non valido!');
                return;
            }
            
            const reminder = {
                id: 'reminder_' + Date.now(),
                text: text,
                datetime: reminderDate.toISOString(),
                created: new Date().toISOString(),
                completed: false
            };
            
            this.reminders.push(reminder);
            this.saveReminders();
            this.renderRemindersList();
            
            console.log('⏰ Promemoria aggiunto:', reminder);
            
        } catch (error) {
            alert('Errore creazione promemoria: ' + error.message);
        }
    }

    renderRemindersList() {
        const container = document.getElementById('reminders-list');
        if (!container) return;
        
        const sortedReminders = [...this.reminders].sort((a, b) => 
            new Date(a.datetime) - new Date(b.datetime)
        );
        
        if (sortedReminders.length === 0) {
            container.innerHTML = `
                <div class="no-reminders">
                    <i class="fas fa-bell-slash"></i>
                    <p>Nessun promemoria attivo</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = sortedReminders.map(reminder => {
            const reminderDate = new Date(reminder.datetime);
            const now = new Date();
            const isPast = reminderDate < now;
            const isToday = reminderDate.toDateString() === now.toDateString();
            
            return `
                <div class="reminder-item ${reminder.completed ? 'completed' : ''} ${isPast && !reminder.completed ? 'overdue' : ''}">
                    <div class="reminder-info">
                        <div class="reminder-text">${reminder.text}</div>
                        <div class="reminder-datetime">
                            ${reminderDate.toLocaleString('it-IT')}
                            ${isToday ? '(Oggi)' : ''}
                            ${isPast && !reminder.completed ? '(Scaduto)' : ''}
                        </div>
                    </div>
                    <div class="reminder-actions">
                        ${!reminder.completed ? `
                            <button onclick="window.SmartAssistant?.secureStorage?.completeReminder('${reminder.id}')" class="complete-btn">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        <button onclick="window.SmartAssistant?.secureStorage?.deleteReminder('${reminder.id}')" class="delete-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    completeReminder(reminderId) {
        const reminder = this.reminders.find(r => r.id === reminderId);
        if (reminder) {
            reminder.completed = true;
            this.saveReminders();
            this.renderRemindersList();
            console.log('✅ Promemoria completato:', reminderId);
        }
    }

    deleteReminder(reminderId) {
        if (!confirm('Eliminare questo promemoria?')) return;
        
        this.reminders = this.reminders.filter(r => r.id !== reminderId);
        this.saveReminders();
        this.renderRemindersList();
        console.log('🗑️ Promemoria eliminato:', reminderId);
    }

    /**
     * Data Management
     */
    exportData() {
        try {
            const data = {
                reminders: this.reminders,
                settings: {
                    autoLock: document.getElementById('auto-lock')?.checked,
                    encryptStorage: document.getElementById('encrypt-storage')?.checked,
                    backupReminders: document.getElementById('backup-reminders')?.checked
                },
                exported: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `smart-assistant-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            console.log('📤 Dati esportati');
            
        } catch (error) {
            alert('Errore esportazione: ' + error.message);
        }
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.reminders) {
                        this.reminders = data.reminders;
                        this.saveReminders();
                        this.renderRemindersList();
                    }
                    
                    if (data.settings) {
                        const autoLock = document.getElementById('auto-lock');
                        const encryptStorage = document.getElementById('encrypt-storage');
                        const backupReminders = document.getElementById('backup-reminders');
                        
                        if (autoLock) autoLock.checked = data.settings.autoLock;
                        if (encryptStorage) encryptStorage.checked = data.settings.encryptStorage;
                        if (backupReminders) backupReminders.checked = data.settings.backupReminders;
                    }
                    
                    alert('Dati importati con successo!');
                    console.log('📥 Dati importati');
                    
                } catch (error) {
                    alert('Errore importazione: ' + error.message);
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    clearAllData() {
        if (!confirm('ATTENZIONE: Eliminare tutti i dati delle cartelle sicure?\nQuesta azione non può essere annullata.')) {
            return;
        }
        
        if (!confirm('Sei sicuro? Tutti i promemoria e le impostazioni verranno perse.')) {
            return;
        }
        
        // Cancella dati
        this.reminders = [];
        localStorage.removeItem('secure_reminders');
        
        // Reset UI
        this.renderRemindersList();
        
        alert('Tutti i dati sono stati cancellati.');
        console.log('🗑️ Tutti i dati cancellati');
    }
}