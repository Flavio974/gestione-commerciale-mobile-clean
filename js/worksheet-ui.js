/**
 * Worksheet UI Management
 * Gestione interfaccia utente e rendering
 */

const WorksheetUI = {
  /**
   * Render del contenuto principale
   */
  renderContent: function() {
    return `
      <div class="worksheet-module">
        <div class="worksheet-header">
          <h3>Foglio di Lavoro</h3>
          <div class="worksheet-actions">
            <button id="importFromClients" class="btn btn-primary" style="display: inline-flex !important; background-color: #007bff !important; color: white !important; border: none; padding: 8px 16px; border-radius: 4px; align-items: center; gap: 8px;">
              <i class="fas fa-users"></i> Importa da Clienti
            </button>
            <button id="generateVisitList" class="btn btn-primary" style="display: inline-flex !important; background-color: #007bff !important; color: white !important; border: none; padding: 8px 16px; border-radius: 4px; align-items: center; gap: 8px;">
              <i class="fas fa-list-check"></i> Genera Elenco Visite da Fare
            </button>
            <button id="createItinerary" class="btn btn-success" style="display: inline-flex !important; background-color: #28a745 !important; color: white !important; border: none; padding: 8px 16px; border-radius: 4px; align-items: center; gap: 8px;">
              <i class="fas fa-route"></i> Crea Itinerario
            </button>
            <button id="viewItinerary" class="btn btn-info" style="display: inline-flex !important; background-color: #17a2b8 !important; color: white !important; border: none; padding: 8px 16px; border-radius: 4px; align-items: center; gap: 8px;">
              <i class="fas fa-eye"></i> Visualizza Itinerari
            </button>
            <button id="optimizeItinerary" class="btn btn-warning" style="display: inline-flex !important; background-color: #ffc107 !important; color: #212529 !important; border: none; padding: 8px 16px; border-radius: 4px; align-items: center; gap: 8px;">
              <i class="fas fa-magic"></i> Ottimizza Itinerario
            </button>
            <button id="exportExcel" class="btn btn-info" style="display: inline-flex !important; background-color: #17a2b8 !important; color: white !important; border: none; padding: 8px 16px; border-radius: 4px; align-items: center; gap: 8px;">
              <i class="fas fa-file-excel"></i> Esporta Excel
            </button>
            <button id="clearWorksheetClients" class="btn btn-danger" style="display: inline-flex !important; background-color: #dc3545 !important; color: white !important; border: none; padding: 8px 16px; border-radius: 4px; align-items: center; gap: 8px;">
              <i class="fas fa-trash"></i> Cancella Clienti
            </button>
          </div>
        </div>
        
        <!-- Sezione Itinerario -->
        <div id="itinerarySection" style="display: none; margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 2px solid #007bff;">
          <h4 style="margin-top: 0; color: #007bff;">
            <i class="fas fa-route"></i> Itinerario del <span id="itineraryDateDisplay"></span>
          </h4>
          <div id="itineraryTimeline">
            <!-- Timeline dell'itinerario verrà inserita qui -->
          </div>
          <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <button id="optimizeByTime" class="btn btn-warning btn-sm" onclick="Worksheet.optimizeItineraryDirect('time')">
                <i class="fas fa-clock"></i> Ottimizza per Tempo
              </button>
              <button id="optimizeByDistance" class="btn btn-warning btn-sm" onclick="Worksheet.optimizeItineraryDirect('distance')">
                <i class="fas fa-route"></i> Ottimizza per Distanza
              </button>
              <button id="optimizeByPriority" class="btn btn-warning btn-sm" onclick="Worksheet.optimizeItineraryDirect('priority')">
                <i class="fas fa-star"></i> Ottimizza per Priorità
              </button>
            </div>
            <div>
              <button id="editItinerary" class="btn btn-primary btn-sm">
                <i class="fas fa-edit"></i> Modifica Orari
              </button>
              <button id="printItinerary" class="btn btn-info btn-sm">
                <i class="fas fa-print"></i> Stampa
              </button>
              <button id="closeItinerary" class="btn btn-secondary btn-sm">
                <i class="fas fa-times"></i> Chiudi
              </button>
            </div>
          </div>
        </div>
        
        <div class="worksheet-filters">
          <div class="filter-group">
            <label for="priorityFilter">Priorità:</label>
            <select id="priorityFilter" class="form-control">
              <option value="">Tutte</option>
              <option value="1">Alta</option>
              <option value="2">Media</option>
              <option value="3">Bassa</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="delayFilter">Ritardo:</label>
            <select id="delayFilter" class="form-control">
              <option value="">Tutti</option>
              <option value="yes">In Ritardo</option>
              <option value="no">In Tempo</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="searchFilter">Cerca:</label>
            <input type="text" id="searchFilter" class="form-control" placeholder="Nome cliente...">
          </div>
        </div>
        
        <div class="worksheet-table-container">
          <table id="worksheetTable" class="worksheet-table">
            <thead>
              <tr>
                <th width="30">Sel</th>
                <th width="50">Ordine</th>
                <th>Codice</th>
                <th>Rag. Sociale</th>
                <th>Indirizzo</th>
                <th>CAP</th>
                <th>Città</th>
                <th>Latitudine</th>
                <th>Longitudine</th>
                <th>Zona</th>
                <th>Cat Sconto</th>
                <th>Ritardo</th>
                <th>Priorità</th>
                <th>Data Ult. Visita</th>
                <th>Frequenza</th>
                <th>Da Visitare</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody id="worksheetTableBody">
              <!-- Rows will be populated dynamically -->
            </tbody>
          </table>
        </div>
        
        <!-- Modal for import clients -->
        <div id="importClientsModal" class="modal" style="display: none;">
          <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
              <h4>Importa Clienti</h4>
              <span class="close">&times;</span>
            </div>
            <div class="modal-body">
              <div class="filter-buttons" style="margin: 15px 0; text-align: center; padding: 10px; background: #f0f0f0; border-radius: 5px;">
                <button type="button" id="applyImportFilters" class="btn btn-primary" style="display: inline-block !important; visibility: visible !important; margin-right: 10px; padding: 8px 16px; background-color: #007bff !important; color: white !important; border: none; border-radius: 4px; cursor: pointer;">
                  <i class="fas fa-filter"></i> Applica Filtri
                </button>
                <button type="button" id="selectAllFiltered" class="btn btn-secondary" style="display: inline-block !important; visibility: visible !important; margin-right: 10px; padding: 8px 16px; background-color: #6c757d !important; color: white !important; border: none; border-radius: 4px; cursor: pointer;">
                  <i class="fas fa-check-square"></i> Seleziona Tutti i Filtrati
                </button>
                <button type="button" id="clearImportedClients" class="btn btn-danger" style="display: inline-block !important; visibility: visible !important; padding: 8px 16px; background-color: #dc3545 !important; color: white !important; border: none; border-radius: 4px; cursor: pointer;">
                  <i class="fas fa-trash"></i> Cancella Clienti Importati
                </button>
              </div>
              
              <div class="import-stats" style="text-align: center; margin-bottom: 15px; font-weight: bold;">
                <span style="margin-right: 20px;">Clienti disponibili: <strong id="availableClientsCount" style="color: #007bff;">0</strong></span>
                <span>Clienti selezionati: <strong id="selectedClientsCount" style="color: #28a745;">0</strong></span>
              </div>
              
              <div class="import-filters">
                <h5>Filtra clienti per:</h5>
                <div class="filter-row">
                  <div class="filter-group">
                    <label>Zona:</label>
                    <select id="importZoneFilter" class="form-control">
                      <option value="">Tutte le zone</option>
                    </select>
                  </div>
                  <div class="filter-group">
                    <label>Priorità:</label>
                    <select id="importPriorityFilter" class="form-control">
                      <option value="">Tutte</option>
                      <option value="1">Alta</option>
                      <option value="2">Media</option>
                      <option value="3">Bassa</option>
                    </select>
                  </div>
                  <div class="filter-group">
                    <label>Giorni dall'ultima visita:</label>
                    <select id="importLastVisitFilter" class="form-control">
                      <option value="">Tutti</option>
                      <option value="30">Più di 30 giorni</option>
                      <option value="60">Più di 60 giorni</option>
                      <option value="90">Più di 90 giorni</option>
                      <option value="never">Mai visitati</option>
                    </select>
                  </div>
                  <div class="filter-group">
                    <label>Frequenza visita:</label>
                    <select id="importFrequencyFilter" class="form-control">
                      <option value="">Tutte le frequenze</option>
                      <option value="7">Settimanale (ogni 7 giorni)</option>
                      <option value="14">Bisettimanale (ogni 2 settimane)</option>
                      <option value="21">Ogni 3 settimane</option>
                      <option value="28">Mensile (ogni 4 settimane)</option>
                      <option value="35">Ogni 5 settimane</option>
                      <option value="42">Ogni 6 settimane</option>
                      <option value="49">Ogni 7 settimane</option>
                      <option value="56">Ogni 8 settimane</option>
                    </select>
                  </div>
                  <div class="filter-group">
                    <label>Data specifica ultima visita:</label>
                    <input type="date" id="importLastVisitDate" class="form-control">
                  </div>
                </div>
                <div class="filter-row">
                  <div class="filter-group">
                    <label>Categoria sconto:</label>
                    <select id="importDiscountFilter" class="form-control">
                      <option value="">Tutte</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                  <div class="filter-group">
                    <label>Cerca:</label>
                    <input type="text" id="importSearchFilter" class="form-control" placeholder="Nome o codice...">
                  </div>
                </div>
              </div>
              
              <div class="import-table-container">
                <table class="import-table">
                  <thead>
                    <tr>
                      <th width="40">
                        <input type="checkbox" id="selectAllImport">
                      </th>
                      <th>Codice</th>
                      <th>Ragione Sociale</th>
                      <th>Zona</th>
                      <th>Priorità</th>
                      <th>Ultima Visita</th>
                      <th>Frequenza</th>
                      <th>Cat. Sconto</th>
                    </tr>
                  </thead>
                  <tbody id="importClientsTableBody">
                    <!-- Rows will be populated dynamically -->
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" id="confirmImport" class="btn btn-primary">
                <i class="fas fa-check"></i> Importa Selezionati
              </button>
              <button type="button" id="cancelImport" class="btn btn-secondary">
                <i class="fas fa-times"></i> Annulla
              </button>
            </div>
          </div>
        </div>
        
        <!-- Modal for itinerary settings -->
        <div id="itineraryModal" class="modal" style="display: none;">
          <div class="modal-content">
            <div class="modal-header">
              <h4>Impostazioni Itinerario</h4>
              <span class="close">&times;</span>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Data Itinerario:</label>
                <input type="date" id="itineraryDate" class="form-control">
              </div>
              <div class="form-group">
                <label>Ora Inizio:</label>
                <input type="time" id="itineraryStartTime" class="form-control" value="08:00">
              </div>
              <div class="form-group">
                <label>Punto di Partenza (Mattino):</label>
                <select id="startingPoint" class="form-control">
                  <option value="ALFIERI MATTINO">ALFIERI MATTINO</option>
                  <option value="DONAC CONAD CUNEO">DONAC CONAD CUNEO</option>
                  <option value="ESSEMME CONAD MONTEGROSSO">ESSEMME CONAD MONTEGROSSO</option>
                </select>
              </div>
              <div class="form-group">
                <label>Punto di Arrivo (Sera):</label>
                <select id="endingPoint" class="form-control">
                  <option value="ALFIERI SERA">ALFIERI SERA</option>
                  <option value="DONAC CONAD CUNEO">DONAC CONAD CUNEO</option>
                  <option value="ESSEMME CONAD MONTEGROSSO">ESSEMME CONAD MONTEGROSSO</option>
                </select>
              </div>
              
              <div class="client-durations" style="margin-top: 20px;">
                <h5>Durata visita per cliente:</h5>
                <div id="clientDurationsList" style="max-height: 300px; overflow-y: auto;">
                  <!-- Verrà popolato dinamicamente con i clienti selezionati -->
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" id="confirmItinerary" class="btn btn-primary">
                <i class="fas fa-check"></i> Conferma
              </button>
              <button type="button" id="cancelItinerary" class="btn btn-secondary">
                <i class="fas fa-times"></i> Annulla
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render tabella
   */
  renderTable: function(clients, getPriorityLabel) {
    const tbody = document.getElementById('worksheetTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    clients.forEach((client, index) => {
      const row = document.createElement('tr');
      row.draggable = true;
      row.dataset.index = index;
      row.dataset.code = client.code || client.id;
      row.innerHTML = `
        <td><input type="checkbox" class="client-checkbox" data-code="${client.code || client.id}"></td>
        <td class="order-number">${index + 1}</td>
        <td>${client.code || '-'}</td>
        <td>${client.name || '-'}</td>
        <td>${client.address || client.street || '-'}</td>
        <td>${client.cap || client.zip || '-'}</td>
        <td>${client.city || '-'}</td>
        <td>${client.lat ? client.lat.toFixed(4) : '-'}</td>
        <td>${client.lng ? client.lng.toFixed(4) : '-'}</td>
        <td>${client.zone || '-'}</td>
        <td>${client.discount || '-'}</td>
        <td class="${client.delay > 0 ? 'text-danger' : 'text-success'}">
          ${client.delay ? client.delay + ' gg' : '-'}
        </td>
        <td>
          <span class="priority-badge priority-${client.priority}">
            ${getPriorityLabel(client.priority)}
          </span>
        </td>
        <td>${client.lastVisit ? Utils.formatDate(new Date(client.lastVisit), 'DD/MM/YYYY') : '-'}</td>
        <td>${client.visitFrequency ? client.visitFrequency + ' gg' : '-'}</td>
        <td>
          <input type="checkbox" class="to-visit-checkbox" 
                 ${client.toVisit ? 'checked' : ''}
                 data-code="${client.code}">
        </td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="Worksheet.viewClient('${client.code}')">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-info" onclick="Worksheet.showOnMap('${client.code}')">
            <i class="fas fa-map-marker-alt"></i>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  },

  /**
   * Mostra alert personalizzato
   */
  showAlert: function(message, type = 'info') {
    // Se è un errore di percorso mancante, mostra dialog speciale
    if (type === 'error' && message.includes('Impossibile completare')) {
      this.showRouteErrorDialog(message);
      return;
    }
    
    // Crea un alert personalizzato
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert alert-${type}`;
    alertDiv.innerHTML = `
      <div class="alert-content">
        ${message}
        <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Rimuovi automaticamente dopo 5 secondi
    setTimeout(() => {
      if (alertDiv.parentElement) {
        alertDiv.remove();
      }
    }, 5000);
  },
  
  /**
   * Mostra dialog errore percorso
   */
  showRouteErrorDialog: function(message) {
    // Rimuovi eventuali dialog esistenti
    const existingDialog = document.getElementById('routeErrorDialog');
    if (existingDialog) {
      existingDialog.remove();
    }
    
    // Crea dialog
    const dialog = document.createElement('div');
    dialog.id = 'routeErrorDialog';
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    // Estrai i dettagli del messaggio
    const lines = message.split('\n');
    const title = lines[0];
    let body = '';
    
    for (let i = 2; i < lines.length - 2; i++) {
      if (lines[i].includes('→')) {
        body += `<div style="margin: 10px 0; font-weight: bold; color: #d32f2f;">
                   ${lines[i]}
                 </div>`;
      }
    }
    
    const instruction = lines[lines.length - 1];
    
    dialog.innerHTML = `
      <div style="
        background: white;
        border-radius: 8px;
        padding: 0;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      ">
        <div style="
          background: #f5f5f5;
          padding: 20px;
          border-bottom: 1px solid #ddd;
          border-radius: 8px 8px 0 0;
        ">
          <h3 style="margin: 0; color: #333; font-size: 18px;">
            ${title}
          </h3>
        </div>
        
        <div style="padding: 20px;">
          <p style="margin: 0 0 15px 0; color: #666;">
            Percorso mancante:
          </p>
          ${body}
          <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">
            ${instruction}
          </p>
        </div>
        
        <div style="
          background: #f5f5f5;
          padding: 15px 20px;
          border-top: 1px solid #ddd;
          text-align: right;
          border-radius: 0 0 8px 8px;
        ">
          <button onclick="document.getElementById('routeErrorDialog').remove()" style="
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 30px;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
            font-weight: 500;
          ">
            OK
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  },

  /**
   * Aggiorna numeri ordine
   */
  updateOrderNumbers: function() {
    const rows = document.querySelectorAll('#worksheetTableBody tr');
    rows.forEach((row, index) => {
      const orderCell = row.querySelector('.order-number');
      if (orderCell) {
        orderCell.textContent = index + 1;
      }
    });
  },

  /**
   * Visualizza dettagli cliente
   */
  showClientDetails: function(client) {
    const details = `
      <div class="client-details">
        <h4>${client.name}</h4>
        <p><strong>Codice:</strong> ${client.code}</p>
        <p><strong>Indirizzo:</strong> ${client.address}, ${client.cap} ${client.city}</p>
        <p><strong>Zona:</strong> ${client.zone}</p>
        <p><strong>Coordinate:</strong> ${client.lat.toFixed(4)}, ${client.lng.toFixed(4)}</p>
        <p><strong>Ultima visita:</strong> ${client.lastVisit || 'Mai visitato'}</p>
      </div>
    `;
    return details;
  },

  /**
   * Mostra riepilogo visite
   */
  showVisitListSummary: function(toVisit) {
    return `
      <div class="visit-list-summary">
        <h4>Elenco Visite Generate</h4>
        <p><strong>${toVisit.length}</strong> clienti da visitare</p>
        <p><strong>${toVisit.filter(c => c.delay > 0).length}</strong> clienti in ritardo</p>
        <p><strong>${toVisit.filter(c => c.priority === 1).length}</strong> clienti alta priorità</p>
      </div>
    `;
  },

  /**
   * Mostra riepilogo itinerario
   */
  showItinerarySummary: function(date, startTime, endTime, startingPoint, endingPoint, clientsCount) {
    return `
      <div>
        <h4>Itinerario Creato</h4>
        <p><strong>Data:</strong> ${new Date(date).toLocaleDateString('it-IT')}</p>
        <p><strong>Orario:</strong> ${startTime} - ${endTime}</p>
        <p><strong>Partenza:</strong> ${startingPoint}</p>
        <p><strong>Arrivo:</strong> ${endingPoint}</p>
        <p><strong>Clienti:</strong> ${clientsCount}</p>
      </div>
    `;
  }
};

// Export globale
window.WorksheetUI = WorksheetUI;