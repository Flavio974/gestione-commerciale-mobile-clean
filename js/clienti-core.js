/**
 * Clienti Module - Core
 * Core functions, state management, and initialization
 */

const Clienti = {
  // Stato del modulo
  state: {
    clients: [],
    filteredClients: [],
    currentClient: null,
    filters: {
      search: '',
      priority: 'all',
      zone: 'all'
    },
    showForm: false,
    importData: null
  },
  
  /**
   * Inizializzazione
   */
  init: function() {
    this.loadClients();
  },
  
  /**
   * Setup quando si entra nel tab
   */
  onEnter: function() {
    this.setupElements();
    this.setupEventListeners();
    this.render();
  },
  
  /**
   * Cleanup quando si lascia il tab
   */
  onLeave: function() {
    this.saveClients();
  },
  
  /**
   * Setup elementi DOM
   */
  setupElements: function() {
    const content = document.getElementById('clients-content');
    if (!content) return;
    
    content.innerHTML = this.getTemplate();
  },
  
  /**
   * Template HTML
   */
  getTemplate: function() {
    return `
      <div class="clients-container" style="height: calc(100vh - 150px); display: flex; flex-direction: column;">
        <!-- Header fisso -->
        <div class="clients-fixed-header" style="flex-shrink: 0; background: white; padding: 1rem 1rem 0; position: sticky; top: 0; z-index: 100;">
          <h2>Clienti da Visitare</h2>
          
          <div class="client-actions">
            <button id="addClientBtn" class="action-button">Aggiungi Cliente</button>
            <button id="importClientsBtn" class="action-button">Importa Lista</button>
            <button id="exportClientsBtn" class="action-button">Esporta Lista</button>
            <button id="syncSupabaseBtn" class="action-button" style="background-color: #28a745;">☁️ Sync Supabase</button>
            <button id="downloadSupabaseBtn" class="action-button" style="background-color: #17a2b8;">📥 Da Supabase</button>
            <button id="clearClientsBtn" class="action-button action-button-danger">Cancella Lista</button>
          </div>
        </div>
        
        <!-- Contenitore con doppio scroll -->
        <div class="clients-double-scroll-container" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
          <!-- Contenuto scrollabile verticalmente -->
          <div class="clients-scrollable-content" style="flex: 1; overflow-y: auto; overflow-x: hidden; padding: 0 1rem;">
          
          <!-- Form aggiunta/modifica cliente (pannello sempre visibile) -->
          <div id="clientForm" class="client-form-panel" style="display:none; background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div class="form-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem;">
          <h3 id="formTitle" style="margin: 0; color: var(--primary-color);">Aggiungi Nuovo Cliente</h3>
          <button type="button" class="close-form" onclick="Clienti.hideForm()" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #666; padding: 0; width: 30px; height: 30px;">&times;</button>
        </div>
        
        <form id="newClientForm">
          <div class="form-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
            
            <!-- Sezione 1: Dati base -->
            <div class="form-section" style="background: white; padding: 1rem; border-radius: 6px;">
              <h4 style="color: var(--primary-color); margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem;">Dati Principali</h4>
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label for="clientCode" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Codice Cliente *</label>
                <input type="text" id="clientCode" class="form-control" required style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
              </div>
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label for="clientName" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Ragione Sociale *</label>
                <input type="text" id="clientName" class="form-control" required style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
              </div>
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label for="contactName" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Contatto</label>
                <input type="text" id="contactName" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
              </div>
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label for="clientPhone" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Telefono</label>
                <input type="tel" id="clientPhone" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
              </div>
              <div class="form-group">
                <label for="clientPriority" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Priorità *</label>
                <select id="clientPriority" class="form-control" required style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
                  <option value="alta">Alta</option>
                  <option value="media" selected>Media</option>
                  <option value="bassa">Bassa</option>
                </select>
              </div>
            </div>
            
            <!-- Sezione 2: Indirizzo -->
            <div class="form-section" style="background: white; padding: 1rem; border-radius: 6px;">
              <h4 style="color: var(--primary-color); margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem;">Indirizzo</h4>
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem;">
                <div class="form-group">
                  <label for="clientStreet" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Via</label>
                  <input type="text" id="clientStreet" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
                </div>
                <div class="form-group">
                  <label for="clientNumber" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">N°</label>
                  <input type="text" id="clientNumber" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem;">
                <div class="form-group">
                  <label for="clientZip" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">CAP</label>
                  <input type="text" id="clientZip" class="form-control" maxlength="5" style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
                </div>
                <div class="form-group">
                  <label for="clientCity" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Città *</label>
                  <input type="text" id="clientCity" class="form-control" required style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
                </div>
                <div class="form-group">
                  <label for="clientProvince" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Prov</label>
                  <input type="text" id="clientProvince" class="form-control" maxlength="2" style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px; text-transform: uppercase;">
                </div>
              </div>
              <div class="form-group">
                <label for="clientZone" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Zona</label>
                <input type="text" id="clientZone" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
              </div>
            </div>
            
            <!-- Sezione 3: Preferenze visita -->
            <div class="form-section" style="background: white; padding: 1rem; border-radius: 6px;">
              <h4 style="color: var(--primary-color); margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem;">Preferenze Visita</h4>
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label for="clientCloseDay" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Giorno di Chiusura</label>
                <select id="clientCloseDay" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
                  <option value="">Nessuno</option>
                  <option value="lunedi">Lunedì</option>
                  <option value="martedi">Martedì</option>
                  <option value="mercoledi">Mercoledì</option>
                  <option value="giovedi">Giovedì</option>
                  <option value="venerdi">Venerdì</option>
                  <option value="sabato">Sabato</option>
                  <option value="domenica">Domenica</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label for="clientAvoidDay" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Giorno da Evitare</label>
                <select id="clientAvoidDay" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
                  <option value="">Nessuno</option>
                  <option value="lunedi">Lunedì</option>
                  <option value="martedi">Martedì</option>
                  <option value="mercoledi">Mercoledì</option>
                  <option value="giovedi">Giovedì</option>
                  <option value="venerdi">Venerdì</option>
                  <option value="sabato">Sabato</option>
                  <option value="domenica">Domenica</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label for="clientPreferredTime" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Momento Preferito</label>
                <select id="clientPreferredTime" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
                  <option value="">Qualsiasi</option>
                  <option value="mattina">Mattina</option>
                  <option value="pomeriggio">Pomeriggio</option>
                  <option value="sera">Sera</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label for="clientLastVisit" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Ultima Visita</label>
                <input type="date" id="clientLastVisit" class="form-control" style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <div class="form-group">
                  <label for="clientVisitTime" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Tempo (min)</label>
                  <input type="number" id="clientVisitTime" class="form-control" min="1" value="30" style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
                </div>
                <div class="form-group">
                  <label for="clientVisitFrequency" style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Freq. (gg)</label>
                  <input type="number" id="clientVisitFrequency" class="form-control" min="1" value="30" style="width: 100%; padding: 0.5rem; border: 1px solid #ced4da; border-radius: 4px;">
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-buttons" style="margin-top: 1.5rem; display: flex; justify-content: center; gap: 1rem; padding-top: 1rem; border-top: 1px solid #dee2e6;">
            <button type="submit" class="btn btn-primary" style="padding: 0.75rem 2rem; background-color: #28a745; color: white; border: none; border-radius: 4px; font-weight: 500; cursor: pointer;">
              <i class="fas fa-save"></i> Salva Cliente
            </button>
            <button type="button" class="btn btn-secondary" onclick="Clienti.hideForm()" style="padding: 0.75rem 2rem; background-color: #6c757d; color: white; border: none; border-radius: 4px; font-weight: 500; cursor: pointer;">
              <i class="fas fa-times"></i> Annulla
            </button>
          </div>
        </form>
      </div>
      
            <!-- Filtri -->
            <div class="table-filters">
              <input type="text" id="clientSearchFilter" placeholder="Cerca cliente...">
              <select id="priorityFilter">
                <option value="all">Tutte le priorità</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="bassa">Bassa</option>
              </select>
              <select id="zoneFilter">
                <option value="all">Tutte le zone</option>
              </select>
            </div>
          </div>
          
          <!-- Tabella con scroll orizzontale e verticale -->
          <div class="clients-table-wrapper" style="flex: 1; overflow: auto; padding: 0 1rem 1rem; margin-top: 1rem; min-height: 300px;">
            <table id="clientsTable" class="clients-table" style="min-width: 1400px;">
          <thead>
            <tr>
              <th>Codice</th>
              <th>Nome</th>
              <th>Contatto</th>
              <th>Via</th>
              <th>Città</th>
              <th>CAP</th>
              <th>Provincia</th>
              <th>Zona</th>
              <th>Telefono</th>
              <th class="sortable" data-sort="priority">Priorità</th>
              <th>Chiusura</th>
              <th>Evitare</th>
              <th>Preferito</th>
              <th class="sortable" data-sort="lastVisit">Ultima Visita</th>
              <th>Tempo Visita</th>
              <th>Frequenza</th>
              <th class="sortable" data-sort="delay">Ritardo</th>
              <th style="position: sticky; right: 0; background-color: #f8f9fa;">Azioni</th>
            </tr>
          </thead>
          <tbody id="clientsTableBody">
            </tbody>
          </table>
          </div>
          
          <!-- Import dialog (fuori dal contenitore scrollabile) -->
          <div id="importDialog" class="modal" style="display:none;">
        <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
          <div class="modal-header">
            <h3>Importa Clienti da Excel</h3>
            <button class="close" onclick="Clienti.hideImportDialog()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
          </div>
          <div class="modal-body" style="padding: 1rem;">
            <div class="info-box" style="margin-bottom: 1rem;">
              <p><strong>Seleziona un file Excel con le seguenti colonne:</strong></p>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.9rem;">
                <div>• CODICE CLIENTE</div>
                <div>• NOME</div>
                <div>• CONTATTO</div>
                <div>• VIA</div>
                <div>• NUMERO</div>
                <div>• CAP</div>
                <div>• CITTA'</div>
                <div>• PROVINCIA</div>
                <div>• ZONA</div>
                <div>• TELEFONO</div>
                <div>• PRIORITA'</div>
                <div>• GIORNO DI CHIUSURA</div>
                <div>• GIORNO DA EVITARE</div>
                <div>• ULTIMA VISITA</div>
                <div>• MOMENTO PREFERITO</div>
                <div>• tempo di visita minuti</div>
                <div>• frequenza visite in giorni</div>
              </div>
            </div>
            <div class="form-group" style="margin: 1.5rem 0;">
              <label for="importFile" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                Seleziona file Excel:
              </label>
              <input type="file" id="importFile" accept=".xlsx,.xls" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
          </div>
          <div class="modal-footer" style="padding: 1rem; border-top: 1px solid #dee2e6; display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button type="button" id="confirmImport" class="btn btn-primary" style="display: inline-block !important; padding: 0.5rem 1rem; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="Clienti.importClients()">
              <i class="fas fa-upload"></i> Importa
            </button>
            <button type="button" id="cancelImport" class="btn btn-secondary" style="display: inline-block !important; padding: 0.5rem 1rem; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="Clienti.hideImportDialog()">
              <i class="fas fa-times"></i> Annulla
            </button>
            </div>
          </div>
        </div>
        
        </div>
      </div>
    `;
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners: function() {
    // Azioni principali
    this.addClickListener('addClientBtn', () => this.showAddForm());
    this.addClickListener('importClientsBtn', () => this.showImportDialog());
    this.addClickListener('exportClientsBtn', () => this.exportClients());
    this.addClickListener('syncSupabaseBtn', () => ClientiSupabaseSync.syncToSupabase());
    this.addClickListener('downloadSupabaseBtn', () => ClientiSupabaseSync.downloadFromSupabase());
    this.addClickListener('clearClientsBtn', () => this.clearClients());
    
    // Form
    const form = document.getElementById('newClientForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveClient();
      });
    }
    
    // Filtri
    this.addInputListener('clientSearchFilter', () => this.applyFilters());
    this.addChangeListener('priorityFilter', () => this.applyFilters());
    this.addChangeListener('zoneFilter', () => this.applyFilters());
    
    // Sort headers
    document.querySelectorAll('.sortable').forEach(header => {
      header.addEventListener('click', () => this.sortBy(header.dataset.sort));
    });
  },
  
  /**
   * Helper per event listeners
   */
  addClickListener: function(id, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('click', handler.bind(this));
    }
  },
  
  addInputListener: function(id, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', Utils.debounce(handler.bind(this), 300));
    }
  },
  
  addChangeListener: function(id, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', handler.bind(this));
    }
  },
  
  /**
   * Carica clienti
   */
  loadClients: function() {
    // Carica da storage locale
    const saved = Utils.storage.get('clients_data');
    if (saved) {
      this.state.clients = saved;
    } else {
      // Dati di esempio
      this.state.clients = [
        {
          id: '1',
          code: 'CL001',
          name: 'Pizzeria da Mario',
          contact: 'Mario Rossi',
          street: 'Via Roma',
          number: '123',
          zip: '20100',
          city: 'Milano',
          province: 'MI',
          zone: 'Centro',
          phone: '02 1234567',
          priority: 'alta',
          closeDay: 'lunedi',
          avoidDay: '',
          lastVisit: '2024-01-10',
          preferredTime: 'mattina',
          visitTime: 30,
          visitFrequency: 30
        },
        {
          id: '2',
          code: 'CL002',
          name: 'Ristorante Il Gusto',
          contact: 'Luigi Verdi',
          street: 'Corso Italia',
          number: '45',
          zip: '10100',
          city: 'Torino',
          province: 'TO',
          zone: 'Nord',
          phone: '011 7654321',
          priority: 'media',
          closeDay: 'domenica',
          avoidDay: 'martedi',
          lastVisit: '2024-01-15',
          preferredTime: 'pomeriggio',
          visitTime: 45,
          visitFrequency: 45
        }
      ];
    }
    
    this.state.filteredClients = [...this.state.clients];
    this.updateZoneFilter();
  },
  
  /**
   * Salva clienti
   */
  saveClients: function() {
    Utils.storage.set('clients_data', this.state.clients);
  },
  
  /**
   * Cancella tutti i clienti
   */
  clearClients: function() {
    if (!confirm('Cancellare TUTTI i clienti? Questa azione non può essere annullata.')) {
      return;
    }
    
    if (confirm('Sei SICURO di voler cancellare tutti i clienti?')) {
      this.state.clients = [];
      this.state.filteredClients = [];
      this.saveClients();
      this.render();
      Utils.notify('Tutti i clienti sono stati cancellati', 'success');
    }
  }
};

// Rendi disponibile globalmente
window.Clienti = Clienti;