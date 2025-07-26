/**
 * Dashboard Manager Module
 * Gestisce KPI, chiamate, WhatsApp e task lists
 */

export class DashboardManager {
    constructor(core) {
        this.core = core;
        this.kpiCache = null;
        this.kpiCacheTime = null;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minuti
    }

    /**
     * Inizializza il dashboard manager
     */
    async init() {
        this.setupEventListeners();
        
        // Carica tutti i componenti del dashboard
        setTimeout(() => {
            this.renderCallList();
            this.renderWhatsappList();
            this.renderTaskList();
            this.refreshKPI();
        }, 100);
        
        console.log('✅ Dashboard Manager inizializzato');
    }

    /**
     * Setup event listeners per refresh buttons
     */
    setupEventListeners() {
        const refreshKpiBtn = document.getElementById('refresh-kpi-btn');
        const refreshCallsBtn = document.getElementById('refresh-calls-btn');
        const refreshWhatsappBtn = document.getElementById('refresh-whatsapp-btn');
        const refreshTasksBtn = document.getElementById('refresh-tasks-btn');

        if (refreshKpiBtn) refreshKpiBtn.addEventListener('click', () => this.refreshKPI());
        if (refreshCallsBtn) refreshCallsBtn.addEventListener('click', () => this.renderCallList());
        if (refreshWhatsappBtn) refreshWhatsappBtn.addEventListener('click', () => this.renderWhatsappList());
        if (refreshTasksBtn) refreshTasksBtn.addEventListener('click', () => this.renderTaskList());
    }

    /**
     * Aggiorna KPI Dashboard
     */
    async refreshKPI() {
        const kpiContainer = document.getElementById('kpi-dashboard');
        if (!kpiContainer) return;

        try {
            // Mostra loading
            kpiContainer.innerHTML = '<div class="loading-kpi">🔄 Aggiornamento KPI...</div>';

            // Verifica cache
            if (this.kpiCache && this.kpiCacheTime && 
                (Date.now() - this.kpiCacheTime) < this.cacheTimeout) {
                console.log('📊 Uso cache KPI');
                this.renderKPI(this.kpiCache);
                return;
            }

            // Carica dati freschi
            console.log('📊 Caricamento KPI freschi...');
            const kpiData = await this.loadKPIData();
            
            // Aggiorna cache
            this.kpiCache = kpiData;
            this.kpiCacheTime = Date.now();

            this.renderKPI(kpiData);
            
        } catch (error) {
            console.error('❌ Errore caricamento KPI:', error);
            kpiContainer.innerHTML = `
                <div class="error-kpi">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Errore caricamento KPI</p>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    /**
     * Carica dati KPI
     */
    async loadKPIData() {
        // Simula caricamento dati da varie fonti
        const today = new Date().toISOString().split('T')[0];
        
        const mockData = {
            ordini: {
                oggi: Math.floor(Math.random() * 20) + 5,
                settimana: Math.floor(Math.random() * 100) + 50,
                mese: Math.floor(Math.random() * 400) + 200
            },
            fatturato: {
                oggi: Math.floor(Math.random() * 5000) + 2000,
                settimana: Math.floor(Math.random() * 25000) + 15000,
                mese: Math.floor(Math.random() * 100000) + 50000
            },
            clienti: {
                attivi: Math.floor(Math.random() * 50) + 30,
                nuovi: Math.floor(Math.random() * 10) + 2,
                totali: Math.floor(Math.random() * 200) + 150
            },
            prodotti: {
                venduti: Math.floor(Math.random() * 500) + 200,
                top_categoria: 'Frutta e Verdura',
                giacenza_bassa: Math.floor(Math.random() * 15) + 3
            },
            performance: {
                tempo_medio_consegna: '2.5 ore',
                soddisfazione_cliente: '94%',
                ordini_puntuali: '89%'
            }
        };

        // Simula delay di rete
        await new Promise(resolve => setTimeout(resolve, 800));
        
        return mockData;
    }

    /**
     * Renderizza KPI
     */
    renderKPI(data) {
        const kpiContainer = document.getElementById('kpi-dashboard');
        if (!kpiContainer) return;

        kpiContainer.innerHTML = `
            <div class="kpi-grid">
                <!-- Ordini -->
                <div class="kpi-card ordini">
                    <div class="kpi-header">
                        <h4>📦 Ordini</h4>
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="kpi-values">
                        <div class="kpi-main">${data.ordini.oggi}</div>
                        <div class="kpi-label">Oggi</div>
                        <div class="kpi-sub">
                            <span>Settimana: ${data.ordini.settimana}</span>
                            <span>Mese: ${data.ordini.mese}</span>
                        </div>
                    </div>
                </div>

                <!-- Fatturato -->
                <div class="kpi-card fatturato">
                    <div class="kpi-header">
                        <h4>💰 Fatturato</h4>
                        <i class="fas fa-euro-sign"></i>
                    </div>
                    <div class="kpi-values">
                        <div class="kpi-main">€${data.fatturato.oggi.toLocaleString()}</div>
                        <div class="kpi-label">Oggi</div>
                        <div class="kpi-sub">
                            <span>Settimana: €${data.fatturato.settimana.toLocaleString()}</span>
                            <span>Mese: €${data.fatturato.mese.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <!-- Clienti -->
                <div class="kpi-card clienti">
                    <div class="kpi-header">
                        <h4>👥 Clienti</h4>
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="kpi-values">
                        <div class="kpi-main">${data.clienti.attivi}</div>
                        <div class="kpi-label">Attivi</div>
                        <div class="kpi-sub">
                            <span>Nuovi: ${data.clienti.nuovi}</span>
                            <span>Totali: ${data.clienti.totali}</span>
                        </div>
                    </div>
                </div>

                <!-- Performance -->
                <div class="kpi-card performance">
                    <div class="kpi-header">
                        <h4>⚡ Performance</h4>
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="kpi-values">
                        <div class="kpi-main">${data.performance.soddisfazione_cliente}</div>
                        <div class="kpi-label">Soddisfazione</div>
                        <div class="kpi-sub">
                            <span>Puntualità: ${data.performance.ordini_puntuali}</span>
                            <span>T. Consegna: ${data.performance.tempo_medio_consegna}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="kpi-insights">
                <div class="insight-card">
                    <h5>💡 Insights del Giorno</h5>
                    <ul>
                        <li>📈 Vendite ${data.prodotti.top_categoria} in crescita del 12%</li>
                        <li>⚠️ ${data.prodotti.giacenza_bassa} prodotti con giacenza bassa</li>
                        <li>🎯 Obiettivo mensile completato al ${Math.floor((data.fatturato.mese / 80000) * 100)}%</li>
                        <li>📞 ${data.clienti.nuovi} nuovi clienti acquisiti questa settimana</li>
                    </ul>
                </div>
            </div>
        `;

        console.log('✅ KPI renderizzati');
    }

    /**
     * Renderizza lista chiamate
     */
    renderCallList() {
        const callContainer = document.getElementById('call-list');
        if (!callContainer) return;

        try {
            callContainer.innerHTML = '<div class="loading-calls">🔄 Caricamento chiamate...</div>';

            // Simula dati chiamate
            const mockCalls = this.generateMockCalls();

            setTimeout(() => {
                callContainer.innerHTML = `
                    <div class="call-list-container">
                        <div class="call-summary">
                            <span class="call-total">${mockCalls.length} chiamate</span>
                            <span class="call-pending">${mockCalls.filter(c => c.status === 'pending').length} da fare</span>
                        </div>
                        
                        <div class="call-items">
                            ${mockCalls.map(call => `
                                <div class="call-item ${call.status}">
                                    <div class="call-info">
                                        <div class="call-name">${call.name}</div>
                                        <div class="call-phone">${call.phone}</div>
                                        <div class="call-reason">${call.reason}</div>
                                    </div>
                                    <div class="call-actions">
                                        <button onclick="window.SmartAssistant?.dashboardManager?.makeCall('${call.phone}')" class="call-btn">
                                            <i class="fas fa-phone"></i>
                                        </button>
                                        <button onclick="window.SmartAssistant?.dashboardManager?.markCallDone('${call.id}')" class="done-btn">
                                            <i class="fas fa-check"></i>
                                        </button>
                                    </div>
                                    <div class="call-time">${call.time}</div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="call-actions-bar">
                            <button onclick="window.SmartAssistant?.dashboardManager?.addCall()" class="add-call-btn">
                                <i class="fas fa-plus"></i> Aggiungi Chiamata
                            </button>
                        </div>
                    </div>
                `;
            }, 500);

        } catch (error) {
            console.error('❌ Errore rendering chiamate:', error);
            callContainer.innerHTML = `<div class="error-calls">Errore caricamento chiamate</div>`;
        }
    }

    /**
     * Renderizza lista WhatsApp
     */
    renderWhatsappList() {
        const whatsappContainer = document.getElementById('whatsapp-list');
        if (!whatsappContainer) return;

        try {
            whatsappContainer.innerHTML = '<div class="loading-whatsapp">🔄 Caricamento WhatsApp...</div>';

            const mockMessages = this.generateMockWhatsapp();

            setTimeout(() => {
                whatsappContainer.innerHTML = `
                    <div class="whatsapp-list-container">
                        <div class="whatsapp-summary">
                            <span class="message-total">${mockMessages.length} messaggi</span>
                            <span class="message-unread">${mockMessages.filter(m => !m.read).length} non letti</span>
                        </div>
                        
                        <div class="whatsapp-items">
                            ${mockMessages.map(msg => `
                                <div class="whatsapp-item ${msg.read ? 'read' : 'unread'}">
                                    <div class="message-info">
                                        <div class="message-sender">${msg.sender}</div>
                                        <div class="message-preview">${msg.preview}</div>
                                        <div class="message-time">${msg.time}</div>
                                    </div>
                                    <div class="message-actions">
                                        <button onclick="window.SmartAssistant?.dashboardManager?.openWhatsapp('${msg.phone}')" class="whatsapp-btn">
                                            <i class="fab fa-whatsapp"></i>
                                        </button>
                                        <button onclick="window.SmartAssistant?.dashboardManager?.markMessageRead('${msg.id}')" class="read-btn">
                                            <i class="fas fa-check"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }, 300);

        } catch (error) {
            console.error('❌ Errore rendering WhatsApp:', error);
            whatsappContainer.innerHTML = `<div class="error-whatsapp">Errore caricamento WhatsApp</div>`;
        }
    }

    /**
     * Renderizza lista task
     */
    renderTaskList() {
        const taskContainer = document.getElementById('task-list');
        if (!taskContainer) return;

        try {
            taskContainer.innerHTML = '<div class="loading-tasks">🔄 Caricamento task...</div>';

            const mockTasks = this.generateMockTasks();

            setTimeout(() => {
                taskContainer.innerHTML = `
                    <div class="task-list-container">
                        <div class="task-summary">
                            <span class="task-total">${mockTasks.length} task</span>
                            <span class="task-pending">${mockTasks.filter(t => !t.completed).length} da completare</span>
                        </div>
                        
                        <div class="task-items">
                            ${mockTasks.map(task => `
                                <div class="task-item ${task.completed ? 'completed' : 'pending'} priority-${task.priority}">
                                    <div class="task-checkbox">
                                        <input type="checkbox" ${task.completed ? 'checked' : ''} 
                                               onchange="window.SmartAssistant?.dashboardManager?.toggleTask('${task.id}', this.checked)">
                                    </div>
                                    <div class="task-info">
                                        <div class="task-title ${task.completed ? 'completed' : ''}">${task.title}</div>
                                        <div class="task-description">${task.description}</div>
                                        <div class="task-meta">
                                            <span class="task-priority">${task.priority}</span>
                                            <span class="task-due">${task.dueDate}</span>
                                        </div>
                                    </div>
                                    <div class="task-actions">
                                        <button onclick="window.SmartAssistant?.dashboardManager?.editTask('${task.id}')" class="edit-btn">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="window.SmartAssistant?.dashboardManager?.deleteTask('${task.id}')" class="delete-btn">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="task-actions-bar">
                            <button onclick="window.SmartAssistant?.dashboardManager?.addTask()" class="add-task-btn">
                                <i class="fas fa-plus"></i> Aggiungi Task
                            </button>
                        </div>
                    </div>
                `;
            }, 400);

        } catch (error) {
            console.error('❌ Errore rendering task:', error);
            taskContainer.innerHTML = `<div class="error-tasks">Errore caricamento task</div>`;
        }
    }

    /**
     * Mock Data Generators
     */
    generateMockCalls() {
        const names = ['Mario Rossi', 'Giulia Bianchi', 'Luca Verdi', 'Anna Neri', 'Paolo Gialli'];
        const reasons = ['Nuovo ordine', 'Conferma consegna', 'Reclamo qualità', 'Info prodotti', 'Pagamento'];
        
        return Array.from({ length: 5 }, (_, i) => ({
            id: `call_${i}`,
            name: names[Math.floor(Math.random() * names.length)],
            phone: `+39 3${Math.floor(Math.random() * 900000000) + 100000000}`,
            reason: reasons[Math.floor(Math.random() * reasons.length)],
            time: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            status: Math.random() > 0.6 ? 'pending' : 'completed'
        }));
    }

    generateMockWhatsapp() {
        const senders = ['Il Gusto', 'Piemonte Carni', 'Barisone', 'Cliente Nuovo', 'Fornitore X'];
        const previews = ['Quando arriva l\'ordine?', 'Grazie per la consegna!', 'Disponibilità prodotti', 'Nuovo ordine urgente', 'Conferma appuntamento'];
        
        return Array.from({ length: 4 }, (_, i) => ({
            id: `msg_${i}`,
            sender: senders[Math.floor(Math.random() * senders.length)],
            preview: previews[Math.floor(Math.random() * previews.length)],
            phone: `+39 3${Math.floor(Math.random() * 900000000) + 100000000}`,
            time: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            read: Math.random() > 0.4
        }));
    }

    generateMockTasks() {
        const tasks = [
            { title: 'Controllare giacenze', description: 'Verificare stock prodotti freschi', priority: 'high' },
            { title: 'Chiamare fornitore', description: 'Confermare ordine per domani', priority: 'medium' },
            { title: 'Aggiornare prezzi', description: 'Listino frutta e verdura', priority: 'low' },
            { title: 'Preparare fatture', description: 'Fatturazione clienti mensili', priority: 'high' },
            { title: 'Controllo qualità', description: 'Ispezione prodotti in arrivo', priority: 'medium' }
        ];
        
        return tasks.map((task, i) => ({
            id: `task_${i}`,
            title: task.title,
            description: task.description,
            priority: task.priority,
            dueDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT'),
            completed: Math.random() > 0.7
        }));
    }

    /**
     * Action Handlers
     */
    makeCall(phone) {
        console.log('📞 Chiamata a:', phone);
        alert(`Chiamata a ${phone}\n(Simulazione - implementare integrazione telefonica)`);
    }

    markCallDone(callId) {
        console.log('✅ Chiamata completata:', callId);
        this.renderCallList();
    }

    addCall() {
        const name = prompt('Nome contatto:');
        const phone = prompt('Numero telefono:');
        const reason = prompt('Motivo chiamata:');
        
        if (name && phone && reason) {
            console.log('➕ Nuova chiamata aggiunta:', { name, phone, reason });
            this.renderCallList();
        }
    }

    openWhatsapp(phone) {
        console.log('💬 Apri WhatsApp:', phone);
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
    }

    markMessageRead(msgId) {
        console.log('✅ Messaggio letto:', msgId);
        this.renderWhatsappList();
    }

    toggleTask(taskId, completed) {
        console.log('📝 Task aggiornato:', taskId, completed);
        this.renderTaskList();
    }

    editTask(taskId) {
        console.log('✏️ Modifica task:', taskId);
        alert('Modifica task (da implementare)');
    }

    deleteTask(taskId) {
        if (confirm('Eliminare questo task?')) {
            console.log('🗑️ Task eliminato:', taskId);
            this.renderTaskList();
        }
    }

    addTask() {
        const title = prompt('Titolo task:');
        const description = prompt('Descrizione:');
        
        if (title && description) {
            console.log('➕ Nuovo task aggiunto:', { title, description });
            this.renderTaskList();
        }
    }
}