/**
 * Modulo Gestione DDT e Fatture - Create Functions
 * Gestione creazione DDT e fatture
 */

// Estende l'oggetto DDTFTModule con le funzioni di creazione
Object.assign(DDTFTModule, {
  /**
   * Mostra modal creazione DDT
   */
  showCreateDDTModal: function() {
    const modal = document.getElementById('createDDTModal');
    if (modal) {
      modal.style.display = 'block';
      
      // Generate DDT number
      document.getElementById('ddtNumber').value = this.generateDDTNumber();
      
      // Set today's date
      document.getElementById('ddtDate').value = new Date().toISOString().split('T')[0];
      
      // Reset form
      document.getElementById('ddtClient').value = '';
      document.getElementById('clientDetails').style.display = 'none';
      document.getElementById('productsTableBody').innerHTML = '';
      document.getElementById('ddtNotes').value = '';
      
      // Add first product row
      this.addProductRow();
      
      this.setupCreateDDTModalListeners();
      this.loadClientsForDDT();
    }
  },

  /**
   * Carica clienti per DDT
   */
  loadClientsForDDT: function() {
    const select = document.getElementById('ddtClient');
    if (!select) return;

    // Get clients from Clienti module
    const clients = JSON.parse(localStorage.getItem('clienti') || '[]');
    
    select.innerHTML = '<option value="">-- Seleziona cliente --</option>';
    clients.forEach(client => {
      select.innerHTML += `<option value="${client.id}">${client.name}</option>`;
    });
  },

  /**
   * Setup listeners modal creazione DDT
   */
  setupCreateDDTModalListeners: function() {
    const modal = document.getElementById('createDDTModal');
    
    // Close
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
      closeBtn.onclick = () => this.hideCreateDDTModal();
    }

    // Save
    const saveBtn = document.getElementById('saveDDTBtn');
    if (saveBtn) {
      saveBtn.onclick = () => this.saveDDT();
    }

    // Cancel
    const cancelBtn = document.getElementById('cancelDDTBtn');
    if (cancelBtn) {
      cancelBtn.onclick = () => this.hideCreateDDTModal();
    }

    // Add product
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
      addProductBtn.onclick = () => this.addProductRow();
    }

    // Client change
    const clientSelect = document.getElementById('ddtClient');
    if (clientSelect) {
      clientSelect.onchange = (e) => this.onClientChange(e.target.value);
    }
  },

  /**
   * Nascondi modal creazione DDT
   */
  hideCreateDDTModal: function() {
    const modal = document.getElementById('createDDTModal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  /**
   * Cambia cliente
   */
  onClientChange: function(clientId) {
    const detailsDiv = document.getElementById('clientDetails');
    if (!detailsDiv) return;

    if (!clientId) {
      detailsDiv.style.display = 'none';
      return;
    }

    const clients = JSON.parse(localStorage.getItem('clienti') || '[]');
    const client = clients.find(c => c.id === clientId);
    
    if (client) {
      detailsDiv.innerHTML = `
        <div class="client-info">
          <p><strong>${client.name}</strong></p>
          <p>${client.address || ''}</p>
          <p>${client.cap || ''} ${client.city || ''} ${client.province || ''}</p>
          <p>P.IVA: ${client.vatNumber || '-'} | C.F.: ${client.fiscalCode || '-'}</p>
        </div>
      `;
      detailsDiv.style.display = 'block';
    }
  },

  /**
   * Aggiungi riga prodotto
   */
  addProductRow: function() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" class="product-code" placeholder="Codice"></td>
      <td><input type="text" class="product-description" placeholder="Descrizione prodotto" required></td>
      <td><input type="number" class="product-quantity" value="1" min="1" required></td>
      <td><input type="number" class="product-price" value="0.00" min="0" step="0.01" required></td>
      <td><input type="number" class="product-discount" value="0" min="0" max="100"></td>
      <td class="product-total">€ 0,00</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="DDTFTModule.removeProductRow(this)">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    tbody.appendChild(row);

    // Add listeners
    row.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => this.calculateTotals());
    });

    // Focus on description
    row.querySelector('.product-description').focus();
  },

  /**
   * Rimuovi riga prodotto
   */
  removeProductRow: function(button) {
    const row = button.closest('tr');
    row.remove();
    this.calculateTotals();
  },

  /**
   * Calcola totali
   */
  calculateTotals: function() {
    let subtotal = 0;
    
    const rows = document.querySelectorAll('#productsTableBody tr');
    rows.forEach(row => {
      const quantity = parseFloat(row.querySelector('.product-quantity')?.value || 0);
      const price = parseFloat(row.querySelector('.product-price')?.value || 0);
      const discount = parseFloat(row.querySelector('.product-discount')?.value || 0);
      
      const lineTotal = quantity * price * (1 - discount / 100);
      subtotal += lineTotal;
      
      const totalCell = row.querySelector('.product-total');
      if (totalCell) {
        totalCell.textContent = this.formatCurrency(lineTotal);
      }
    });

    const vat = subtotal * 0.22; // 22% IVA
    const total = subtotal + vat;

    document.getElementById('subtotal').textContent = this.formatCurrency(subtotal);
    document.getElementById('vat').textContent = this.formatCurrency(vat);
    document.getElementById('total').textContent = this.formatCurrency(total);
  },

  /**
   * Salva DDT
   */
  saveDDT: function() {
    const number = document.getElementById('ddtNumber').value;
    const date = document.getElementById('ddtDate').value;
    const clientId = document.getElementById('ddtClient').value;
    const notes = document.getElementById('ddtNotes').value;

    if (!date) {
      alert('Inserisci la data del DDT');
      return;
    }

    if (!clientId) {
      alert('Seleziona un cliente');
      return;
    }

    // Get client data
    const clients = JSON.parse(localStorage.getItem('clienti') || '[]');
    const client = clients.find(c => c.id === clientId);

    if (!client) {
      alert('Cliente non trovato');
      return;
    }

    // Get products
    const products = [];
    const rows = document.querySelectorAll('#productsTableBody tr');
    
    let hasValidProducts = false;
    rows.forEach(row => {
      const code = row.querySelector('.product-code')?.value || '';
      const description = row.querySelector('.product-description')?.value;
      const quantity = parseFloat(row.querySelector('.product-quantity')?.value || 0);
      const price = parseFloat(row.querySelector('.product-price')?.value || 0);
      const discount = parseFloat(row.querySelector('.product-discount')?.value || 0);

      if (description && quantity > 0) {
        hasValidProducts = true;
        products.push({
          code,
          description,
          quantity,
          unit: 'PZ',
          price,
          discount,
          total: quantity * price * (1 - discount / 100)
        });
      }
    });

    if (!hasValidProducts) {
      alert('Aggiungi almeno un prodotto con descrizione e quantità');
      return;
    }

    // Calculate totals
    const subtotal = products.reduce((sum, p) => sum + p.total, 0);
    const vat = subtotal * 0.22;
    const total = subtotal + vat;

    // Create DDT
    const ddt = {
      id: this.generateId(),
      type: 'ddt',
      number,
      date,
      client: client.name,
      clientId: client.id,
      vatNumber: client.vatNumber || '',
      fiscalCode: client.fiscalCode || '',
      address: client.address || '',
      city: client.city || '',
      province: client.province || '',
      cap: client.cap || '',
      products,
      notes,
      subtotal,
      vat,
      amount: total,
      total,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Save
    this.state.documents.push(ddt);
    this.saveDocumentsToStorage();
    this.hideCreateDDTModal();
    this.loadDocuments();

    Utils.notify(`DDT ${number} creato con successo!`, 'success');
  }
});