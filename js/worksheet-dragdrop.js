/**
 * Worksheet Module - Drag and Drop Functions
 * Gestione drag and drop per riordinamento clienti
 */

// Estende l'oggetto Worksheet con le funzioni di drag and drop
Object.assign(Worksheet, {
  /**
   * Inizializza drag and drop
   */
  initializeDragAndDrop: function() {
    const tbody = document.getElementById('worksheet-clients-list');
    if (!tbody) return;

    tbody.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = this.getDragAfterElement(tbody, e.clientY);
      const dragging = document.querySelector('.dragging');
      if (dragging) {
        if (afterElement == null) {
          tbody.appendChild(dragging);
        } else {
          tbody.insertBefore(dragging, afterElement);
        }
      }
    });

    tbody.addEventListener('drop', (e) => {
      e.preventDefault();
      
      // Aggiorna l'ordine nell'array
      const rows = tbody.querySelectorAll('tr');
      const newOrder = [];
      
      rows.forEach(row => {
        const code = row.querySelector('.client-checkbox')?.dataset.code;
        if (code) {
          const client = this.state.clientiDaVisitare.find(c => 
            String(c.code) === String(code) || String(c.id) === String(code)
          );
          if (client) {
            newOrder.push(client);
          }
        }
      });
      
      this.state.clientiDaVisitare = newOrder;
      this.saveWorksheetToStorage();
    });
  },

  /**
   * Get element after which to insert dragged element
   */
  getDragAfterElement: function(container, y) {
    const draggableElements = [...container.querySelectorAll('tr:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
});