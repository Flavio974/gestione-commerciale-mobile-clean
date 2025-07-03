/**
 * Prodotti Module
 * Gestione catalogo prodotti
 */

const Prodotti = {
  state: {
    products: [],
    categories: [],
    filters: {
      search: '',
      category: 'all',
      priceRange: { min: 0, max: 999999 }
    },
    editingProductId: null
  },
  
  init: function() {
    this.loadProductsFromStorage();
    this.loadCategoriesFromStorage();
  },
  
  onEnter: function() {
    const content = document.getElementById('products-content');
    if (!content) return;
    
    content.innerHTML = `
      <div class="products-container">
        <div class="products-header">
          <h2>Gestione Prodotti</h2>
          <div class="products-stats">
            <span id="productsCount">Totale prodotti: ${this.state.products.length}</span>
          </div>
        </div>
        
        <div class="products-toolbar">
          <button class="btn btn-primary" id="addProductBtn">
            <i class="fas fa-plus"></i> Aggiungi Prodotto
          </button>
          <button class="btn btn-success" id="importProductsBtn">
            <i class="fas fa-file-excel"></i> Importa da Excel
          </button>
          <button class="btn btn-info" id="exportProductsBtn">
            <i class="fas fa-download"></i> Esporta Catalogo
          </button>
          <button class="btn btn-warning" id="manageCategoriesBtn">
            <i class="fas fa-tags"></i> Gestisci Categorie
          </button>
        </div>
        
        <div class="products-filters">
          <div class="filter-group">
            <input type="text" id="productSearch" placeholder="Cerca prodotto..." class="form-control">
          </div>
          <div class="filter-group">
            <select id="categoryFilter" class="form-control">
              <option value="all">Tutte le categorie</option>
              ${this.state.categories.map(cat => 
                `<option value="${cat.id}">${cat.name}</option>`
              ).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label>Prezzo:</label>
            <input type="number" id="priceMin" placeholder="Min" class="form-control" style="width: 80px;">
            <span>-</span>
            <input type="number" id="priceMax" placeholder="Max" class="form-control" style="width: 80px;">
          </div>
          <button class="btn btn-secondary" id="applyFiltersBtn">
            <i class="fas fa-filter"></i> Applica Filtri
          </button>
        </div>
        
        <div class="products-grid" id="productsGrid">
          <!-- I prodotti verranno inseriti qui -->
        </div>
      </div>
      
      <!-- Modal per aggiunta/modifica prodotto -->
      <div id="productModal" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close" onclick="Utils.closeModal('productModal')">&times;</span>
          <h3 id="productModalTitle">Aggiungi Prodotto</h3>
          <form id="productForm">
            <div class="form-group">
              <label>Codice Prodotto*</label>
              <input type="text" id="productCode" required class="form-control">
            </div>
            <div class="form-group">
              <label>Descrizione*</label>
              <input type="text" id="productDescription" required class="form-control">
            </div>
            <div class="form-group">
              <label>Categoria</label>
              <select id="productCategory" class="form-control">
                <option value="">Seleziona categoria</option>
                ${this.state.categories.map(cat => 
                  `<option value="${cat.id}">${cat.name}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Prezzo</label>
              <input type="number" id="productPrice" step="0.01" class="form-control">
            </div>
            <div class="form-group">
              <label>Unità di Misura</label>
              <select id="productUnit" class="form-control">
                <option value="PZ">Pezzi (PZ)</option>
                <option value="KG">Chilogrammi (KG)</option>
                <option value="LT">Litri (LT)</option>
                <option value="MT">Metri (MT)</option>
                <option value="MQ">Metri Quadri (MQ)</option>
                <option value="MC">Metri Cubi (MC)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Giacenza</label>
              <input type="number" id="productStock" class="form-control">
            </div>
            <div class="form-group">
              <label>Note</label>
              <textarea id="productNotes" class="form-control" rows="3"></textarea>
            </div>
            <div class="modal-buttons">
              <button type="submit" class="btn btn-primary">Salva</button>
              <button type="button" class="btn btn-secondary" onclick="Utils.closeModal('productModal')">Annulla</button>
            </div>
          </form>
        </div>
      </div>
      
      <!-- Modal per gestione categorie -->
      <div id="categoriesModal" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close" onclick="Utils.closeModal('categoriesModal')">&times;</span>
          <h3>Gestione Categorie</h3>
          <div class="category-form">
            <input type="text" id="newCategoryName" placeholder="Nome categoria" class="form-control">
            <button class="btn btn-primary" onclick="Prodotti.addCategory()">
              <i class="fas fa-plus"></i> Aggiungi
            </button>
          </div>
          <div class="categories-list" id="categoriesList">
            <!-- Le categorie verranno inserite qui -->
          </div>
        </div>
      </div>
    `;
    
    this.initializeEventListeners();
    this.renderProducts();
  },
  
  onLeave: function() {
    // Cleanup se necessario
  },
  
  initializeEventListeners: function() {
    // Aggiungi prodotto
    const addBtn = document.getElementById('addProductBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showProductModal());
    }
    
    // Form prodotto
    const form = document.getElementById('productForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProduct();
      });
    }
    
    // Filtri
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.filters.search = e.target.value;
        this.renderProducts();
      });
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.state.filters.category = e.target.value;
        this.renderProducts();
      });
    }
    
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', () => this.applyFilters());
    }
    
    // Import/Export
    const importBtn = document.getElementById('importProductsBtn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importProducts());
    }
    
    const exportBtn = document.getElementById('exportProductsBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportProducts());
    }
    
    // Gestione categorie
    const categoriesBtn = document.getElementById('manageCategoriesBtn');
    if (categoriesBtn) {
      categoriesBtn.addEventListener('click', () => this.showCategoriesModal());
    }
  },
  
  loadProductsFromStorage: function() {
    const stored = localStorage.getItem('products');
    if (stored) {
      this.state.products = JSON.parse(stored);
    } else {
      // Prodotti di esempio
      this.state.products = [
        {
          id: 'PRD_001',
          code: 'PROD001',
          description: 'Prodotto di esempio 1',
          category: 'cat1',
          price: 25.00,
          unit: 'PZ',
          stock: 100,
          notes: ''
        }
      ];
    }
  },
  
  saveProductsToStorage: function() {
    localStorage.setItem('products', JSON.stringify(this.state.products));
  },
  
  loadCategoriesFromStorage: function() {
    const stored = localStorage.getItem('productCategories');
    if (stored) {
      this.state.categories = JSON.parse(stored);
    } else {
      // Categorie predefinite
      this.state.categories = [
        { id: 'cat1', name: 'Elettronica' },
        { id: 'cat2', name: 'Abbigliamento' },
        { id: 'cat3', name: 'Alimentari' },
        { id: 'cat4', name: 'Casa e Giardino' }
      ];
      this.saveCategoriesToStorage();
    }
  },
  
  saveCategoriesToStorage: function() {
    localStorage.setItem('productCategories', JSON.stringify(this.state.categories));
  },
  
  renderProducts: function() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    // Filtra i prodotti
    let filteredProducts = this.state.products.filter(product => {
      // Filtro ricerca
      if (this.state.filters.search) {
        const search = this.state.filters.search.toLowerCase();
        const matchCode = product.code.toLowerCase().includes(search);
        const matchDesc = product.description.toLowerCase().includes(search);
        if (!matchCode && !matchDesc) return false;
      }
      
      // Filtro categoria
      if (this.state.filters.category !== 'all' && product.category !== this.state.filters.category) {
        return false;
      }
      
      // Filtro prezzo
      const price = product.price || 0;
      if (price < this.state.filters.priceRange.min || price > this.state.filters.priceRange.max) {
        return false;
      }
      
      return true;
    });
    
    if (filteredProducts.length === 0) {
      grid.innerHTML = `
        <div class="no-products">
          <p>Nessun prodotto trovato</p>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = filteredProducts.map(product => {
      const category = this.state.categories.find(c => c.id === product.category);
      const categoryName = category ? category.name : 'Non categorizzato';
      
      return `
        <div class="product-card">
          <div class="product-header">
            <h4>${product.code}</h4>
            <span class="product-category">${categoryName}</span>
          </div>
          <div class="product-body">
            <p class="product-description">${product.description}</p>
            <div class="product-details">
              <div class="detail-row">
                <span>Prezzo:</span>
                <span class="product-price">€${(product.price || 0).toFixed(2)}</span>
              </div>
              <div class="detail-row">
                <span>Giacenza:</span>
                <span class="product-stock ${product.stock <= 10 ? 'low-stock' : ''}">${product.stock || 0} ${product.unit}</span>
              </div>
            </div>
            ${product.notes ? `<p class="product-notes">${product.notes}</p>` : ''}
          </div>
          <div class="product-actions">
            <button class="btn-icon btn-edit" onclick="Prodotti.editProduct('${product.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon btn-delete" onclick="Prodotti.deleteProduct('${product.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    this.updateProductsCount();
  },
  
  updateProductsCount: function() {
    const countElement = document.getElementById('productsCount');
    if (countElement) {
      countElement.textContent = `Totale prodotti: ${this.state.products.length}`;
    }
  },
  
  showProductModal: function(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    if (!modal || !title || !form) return;
    
    if (productId) {
      const product = this.state.products.find(p => p.id === productId);
      if (!product) return;
      
      title.textContent = 'Modifica Prodotto';
      document.getElementById('productCode').value = product.code;
      document.getElementById('productDescription').value = product.description;
      document.getElementById('productCategory').value = product.category || '';
      document.getElementById('productPrice').value = product.price || '';
      document.getElementById('productUnit').value = product.unit || 'PZ';
      document.getElementById('productStock').value = product.stock || 0;
      document.getElementById('productNotes').value = product.notes || '';
      
      this.state.editingProductId = productId;
    } else {
      title.textContent = 'Aggiungi Prodotto';
      form.reset();
      this.state.editingProductId = null;
    }
    
    modal.style.display = 'block';
  },
  
  saveProduct: function() {
    const code = document.getElementById('productCode').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const category = document.getElementById('productCategory').value;
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const unit = document.getElementById('productUnit').value;
    const stock = parseInt(document.getElementById('productStock').value) || 0;
    const notes = document.getElementById('productNotes').value.trim();
    
    if (!code || !description) {
      alert('Codice e descrizione sono obbligatori');
      return;
    }
    
    if (this.state.editingProductId) {
      // Modifica prodotto esistente
      const index = this.state.products.findIndex(p => p.id === this.state.editingProductId);
      if (index !== -1) {
        this.state.products[index] = {
          ...this.state.products[index],
          code,
          description,
          category,
          price,
          unit,
          stock,
          notes
        };
      }
    } else {
      // Controlla duplicati
      if (this.state.products.some(p => p.code === code)) {
        alert('Esiste già un prodotto con questo codice');
        return;
      }
      
      // Nuovo prodotto
      const newProduct = {
        id: Utils.generateId('PRD'),
        code,
        description,
        category,
        price,
        unit,
        stock,
        notes
      };
      
      this.state.products.push(newProduct);
    }
    
    this.saveProductsToStorage();
    this.renderProducts();
    Utils.closeModal('productModal');
  },
  
  editProduct: function(productId) {
    this.showProductModal(productId);
  },
  
  deleteProduct: function(productId) {
    if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) return;
    
    this.state.products = this.state.products.filter(p => p.id !== productId);
    this.saveProductsToStorage();
    this.renderProducts();
  },
  
  applyFilters: function() {
    const minPrice = parseFloat(document.getElementById('priceMin').value) || 0;
    const maxPrice = parseFloat(document.getElementById('priceMax').value) || 999999;
    
    this.state.filters.priceRange = { min: minPrice, max: maxPrice };
    this.renderProducts();
  },
  
  importProducts: function() {
    // Simulazione import da Excel
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        alert(`Importazione del file ${file.name} in sviluppo`);
        // TODO: Implementare import reale con libreria Excel
      }
    };
    input.click();
  },
  
  exportProducts: function() {
    if (this.state.products.length === 0) {
      alert('Nessun prodotto da esportare');
      return;
    }
    
    // Prepara i dati per l'export
    const headers = ['Codice', 'Descrizione', 'Categoria', 'Prezzo', 'Unità', 'Giacenza', 'Note'];
    const rows = this.state.products.map(product => {
      const category = this.state.categories.find(c => c.id === product.category);
      return [
        product.code,
        product.description,
        category ? category.name : '',
        product.price || 0,
        product.unit || 'PZ',
        product.stock || 0,
        product.notes || ''
      ];
    });
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalogo_prodotti_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
  
  showCategoriesModal: function() {
    const modal = document.getElementById('categoriesModal');
    if (!modal) return;
    
    this.renderCategoriesList();
    modal.style.display = 'block';
  },
  
  renderCategoriesList: function() {
    const list = document.getElementById('categoriesList');
    if (!list) return;
    
    list.innerHTML = this.state.categories.map(category => `
      <div class="category-item">
        <span>${category.name}</span>
        <button class="btn-icon btn-delete" onclick="Prodotti.deleteCategory('${category.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('');
  },
  
  addCategory: function() {
    const input = document.getElementById('newCategoryName');
    if (!input) return;
    
    const name = input.value.trim();
    if (!name) {
      alert('Inserisci il nome della categoria');
      return;
    }
    
    // Controlla duplicati
    if (this.state.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert('Questa categoria esiste già');
      return;
    }
    
    const newCategory = {
      id: 'cat_' + Date.now(),
      name: name
    };
    
    this.state.categories.push(newCategory);
    this.saveCategoriesToStorage();
    
    // Aggiorna la lista e i select
    this.renderCategoriesList();
    this.updateCategorySelects();
    
    input.value = '';
  },
  
  deleteCategory: function(categoryId) {
    if (!confirm('Sei sicuro di voler eliminare questa categoria?')) return;
    
    // Rimuovi categoria dai prodotti
    this.state.products.forEach(product => {
      if (product.category === categoryId) {
        product.category = '';
      }
    });
    
    this.state.categories = this.state.categories.filter(c => c.id !== categoryId);
    
    this.saveCategoriesToStorage();
    this.saveProductsToStorage();
    
    this.renderCategoriesList();
    this.updateCategorySelects();
    this.renderProducts();
  },
  
  updateCategorySelects: function() {
    // Aggiorna i select delle categorie nei form
    const selects = ['productCategory', 'categoryFilter'];
    
    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (select) {
        const currentValue = select.value;
        
        if (selectId === 'categoryFilter') {
          select.innerHTML = '<option value="all">Tutte le categorie</option>';
        } else {
          select.innerHTML = '<option value="">Seleziona categoria</option>';
        }
        
        select.innerHTML += this.state.categories.map(cat => 
          `<option value="${cat.id}">${cat.name}</option>`
        ).join('');
        
        select.value = currentValue;
      }
    });
  },
  
};

window.Prodotti = Prodotti;