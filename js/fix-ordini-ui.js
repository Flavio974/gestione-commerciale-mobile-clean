/**
 * 🚨 FIX ORDINI UI
 * 
 * PROBLEMA: OrdiniUI non viene caricato correttamente
 * SOLUZIONE: Creare fallback per rendering ordini se OrdiniUI manca
 */

console.log('🚨 [FIX ORDINI UI] Inizializzazione fix Ordini UI...');

// Patch Ordini.onEnter per gestire OrdiniUI mancante
if (window.Ordini) {
    const originalOnEnter = window.Ordini.onEnter.bind(window.Ordini);
    
    window.Ordini.onEnter = function() {
        console.log('🔧 [FIX ORDINI UI] Intercepting Ordini.onEnter...');
        
        // Se OrdiniUI è disponibile, usa quello
        if (window.OrdiniUI) {
            console.log('✅ [FIX ORDINI UI] OrdiniUI disponibile, uso normale');
            originalOnEnter();
        } else {
            console.warn('⚠️ [FIX ORDINI UI] OrdiniUI non disponibile, uso fallback');
            
            // Usa il vecchio metodo onEnterOld se disponibile
            if (this.onEnterOld) {
                console.log('🔧 [FIX ORDINI UI] Uso onEnterOld come fallback');
                this.onEnterOld();
                
                // Setup event listeners manualmente
                this.setupEventListenersManual();
            } else {
                console.error('❌ [FIX ORDINI UI] Nessun fallback disponibile');
                this.renderBasicUI();
            }
        }
    };
    
    // Aggiungi metodo per setup listeners manuale
    window.Ordini.setupEventListenersManual = function() {
        console.log('🔧 [FIX ORDINI UI] Setup event listeners manuale...');
        
        // Import PDF button
        const importBtn = document.getElementById('importPdfBtn');
        const fileInput = document.getElementById('pdfFileInput');
        
        if (importBtn && fileInput) {
            importBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        }
        
        // Export Excel button
        const exportBtn = document.getElementById('exportExcelBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToExcel());
        }
        
        // Clear orders button
        const clearBtn = document.getElementById('clearOrdersBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Sei sicuro di voler eliminare tutti gli ordini?')) {
                    this.clearAllOrders();
                }
            });
        }
        
        // Render orders list
        this.renderOrdersList();
    };
    
    // Aggiungi metodo per rendering basico
    window.Ordini.renderBasicUI = function() {
        console.log('🔧 [FIX ORDINI UI] Rendering UI basico...');
        
        const content = document.getElementById('orders-content');
        if (!content) return;
        
        content.innerHTML = `
            <div class="orders-container">
                <div class="orders-header">
                    <h2>Gestione Ordini</h2>
                    <div class="orders-stats">
                        <span id="ordersCount">Totale ordini: ${this.state.orders.length}</span>
                    </div>
                </div>
                
                <div class="orders-toolbar">
                    <button class="btn btn-primary" id="importPdfBtn">
                        <i class="fas fa-file-pdf"></i> Importa PDF
                    </button>
                    <button class="btn btn-success" id="exportExcelBtn">
                        <i class="fas fa-file-excel"></i> Esporta Excel
                    </button>
                    <button class="btn btn-danger" id="clearOrdersBtn">
                        <i class="fas fa-trash"></i> Elimina Tutti
                    </button>
                    <input type="file" id="pdfFileInput" accept=".pdf" multiple style="display: none;">
                </div>
                
                <div class="orders-message" style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff9800;"></i>
                    <p style="margin-top: 20px;">
                        Sistema Ordini in modalità ridotta.<br>
                        Alcune funzionalità potrebbero non essere disponibili.
                    </p>
                </div>
            </div>
        `;
        
        this.setupEventListenersManual();
    };
    
    // Aggiungi metodo per rendering lista ordini
    window.Ordini.renderOrdersList = function() {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;
        
        if (this.state.orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 20px;">
                        Nessun ordine presente. Importa un PDF per iniziare.
                    </td>
                </tr>
            `;
            return;
        }
        
        // Render orders
        tbody.innerHTML = this.state.orders.map(order => `
            <tr>
                <td><input type="checkbox" class="order-checkbox" data-order-id="${order.orderNumber}"></td>
                <td>${order.orderNumber}</td>
                <td>${order.clientName}</td>
                <td>${order.orderDate}</td>
                <td>${order.channel || '-'}</td>
                <td>${order.status || 'Nuovo'}</td>
                <td>${order.deliveryPreference || '-'}</td>
                <td>${order.notes || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="Ordini.showOrderDetails('${order.orderNumber}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="Ordini.deleteOrder('${order.orderNumber}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    };
}

// Test function
window.testOrdiniUI = function() {
    console.log('\n🧪 === TEST ORDINI UI ===\n');
    
    console.log('📊 Stato Ordini:');
    console.log('- window.Ordini:', window.Ordini ? '✅' : '❌');
    console.log('- window.OrdiniUI:', window.OrdiniUI ? '✅' : '❌');
    console.log('- window.OrdiniParser:', window.OrdiniParser ? '✅' : '❌');
    console.log('- window.OrdiniExportCore:', window.OrdiniExportCore ? '✅' : '❌');
    
    if (window.Ordini) {
        console.log('\n📋 Ordini state:');
        console.log('- orders count:', window.Ordini.state.orders.length);
        console.log('- has onEnter:', typeof window.Ordini.onEnter === 'function' ? '✅' : '❌');
        console.log('- has onEnterOld:', typeof window.Ordini.onEnterOld === 'function' ? '✅' : '❌');
    }
    
    console.log('\n📋 DOM elements:');
    const elements = ['orders-content', 'ordersTableBody', 'importPdfBtn', 'pdfFileInput'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`- ${id}: ${el ? '✅' : '❌'}`);
    });
    
    console.log('\n✅ Test completato\n');
};

console.log('✅ [FIX ORDINI UI] Fix caricato!');
console.log('💡 Usa window.testOrdiniUI() per verificare stato');