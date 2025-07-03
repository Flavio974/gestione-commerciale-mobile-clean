/**
 * Modulo DDT e Fatture - View Functions
 * Gestisce la visualizzazione dei dettagli documenti
 */

const DDTFTView = {
  /**
   * Mostra dettagli documento
   */
  showDocumentDetails: function(doc) {
    const modal = document.getElementById('documentDetailsModal');
    const content = document.getElementById('documentDetailsContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h4>Informazioni Documento</h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div>
            <p><strong>Tipo:</strong> <span class="doc-type-badge ${doc.type}">${doc.type.toUpperCase()}</span></p>
            <p><strong>Numero:</strong> ${doc.number || 'N/A'}</p>
            <p><strong>Data:</strong> ${doc.date || 'N/A'}</p>
            <p><strong>Rif. Ordine:</strong> ${doc.orderReference || 'N/A'}</p>
            <p><strong>Data Ordine:</strong> ${this.formatOrderDate(doc.orderDate) || 'N/A'}</p>
          </div>
          <div>
            <p><strong>File:</strong> ${doc.fileName || 'N/A'}</p>
            <p><strong>Importato il:</strong> ${this.formatDate(doc.importDate)}</p>
            <p><strong>ID:</strong> <code style="font-size: 0.8em;">${doc.id}</code></p>
          </div>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4>Informazioni Cliente</h4>
        <p><strong>Ragione Sociale:</strong> ${doc.clientName || 'N/A'}</p>
        ${doc.clientCode ? `<p><strong>Codice Cliente:</strong> ${doc.clientCode}</p>` : ''}
        <p><strong>P.IVA:</strong> ${doc.vatNumber || 'N/A'}</p>
        <p><strong>Indirizzo Consegna:</strong> ${doc.deliveryAddress || 'N/A'}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4>Dettaglio Prodotti</h4>
        ${this.renderProductsTable(doc.items)}
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4>Riepilogo Economico</h4>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Imponibile:</span>
            <span>€ ${(parseFloat(doc.subtotal) || 0).toFixed(2)}</span>
          </div>
          ${doc.vat || (doc.type === 'ft' && parseFloat(doc.total) > parseFloat(doc.subtotal)) ? `
          ${doc.vat4 && parseFloat(doc.vat4) > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>IVA 4%:</span>
            <span>€ ${parseFloat(doc.vat4).toFixed(2)}</span>
          </div>
          ` : ''}
          ${doc.vat10 && parseFloat(doc.vat10) > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>IVA 10%:</span>
            <span>€ ${parseFloat(doc.vat10).toFixed(2)}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: 600;">
            <span>IVA Totale:</span>
            <span>€ ${(parseFloat(doc.vat) || (parseFloat(doc.total) - parseFloat(doc.subtotal)) || 0).toFixed(2)}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.2em; padding-top: 10px; border-top: 2px solid #dee2e6;">
            <span>TOTALE:</span>
            <span style="color: #28a745;">€ ${(parseFloat(doc.total) || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <button onclick="DDTFTView.printDocument('${doc.id}')" class="btn btn-primary">
          <i class="fas fa-print"></i> Stampa
        </button>
        <button onclick="DDTFTView.exportDocumentPDF('${doc.id}')" class="btn btn-secondary">
          <i class="fas fa-file-pdf"></i> Esporta PDF
        </button>
        <button onclick="DDTFTView.editDocument('${doc.id}')" class="btn btn-warning">
          <i class="fas fa-edit"></i> Modifica
        </button>
        <button onclick="document.getElementById('documentDetailsModal').style.display='none'" class="btn btn-secondary">
          Chiudi
        </button>
      </div>
    `;
    
    modal.style.display = 'block';
  },

  /**
   * Render tabella prodotti
   */
  renderProductsTable: function(items) {
    if (!items || items.length === 0) {
      return '<p style="text-align: center; color: #6c757d;">Nessun prodotto presente</p>';
    }
    
    // Assicura che tutti gli items abbiano il campo IVA
    if (window.ensureIVAField) {
      items = window.ensureIVAField(items);
    }
    
    let html = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Codice</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Descrizione</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">Q.tà</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">UdM</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">Prezzo Unit.</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">Sconto %</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">IVA</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">Totale</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    items.forEach(item => {
      // DEBUG
      console.log(`[VIEW] Item ${item.code}:`, 
        `desc="${item.description}", unit="${item.unit}", qty="${item.quantity}", iva="${item.iva}"`
      );
      
      html += `
        <tr>
          <td style="padding: 8px; border: 1px solid #dee2e6;">${item.code || ''}</td>
          <td style="padding: 8px; border: 1px solid #dee2e6;">${item.description || ''}</td>
          <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${item.quantity || 0}</td>
          <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${item.unit || ''}</td>
          <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">${item.price || item.unitPrice || '0,00'}</td>
          <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${item.discount || item.sconto || '0,00'}</td>
          <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${item.iva || '10%'}</td>
          <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right; font-weight: bold;">${item.total || '0,00'}</td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
    `;
    
    return html;
  },

  /**
   * Formatta data
   */
  formatDate: function(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  },

  /**
   * Formatta data ordine (solo data, senza orario)
   */
  formatOrderDate: function(dateString) {
    if (!dateString || dateString === '') return 'N/A';
    
    try {
      // Se la data è già nel formato GG/MM/YY o GG/MM/YYYY, la gestiamo
      if (dateString.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/)) {
        const parts = dateString.split(/[\/\-]/);
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        
        // Se l'anno ha solo 2 cifre, aggiungi 20 davanti (es: 24 -> 2024)
        if (year.length === 2) {
          year = '20' + year;
        }
        
        return `${day}/${month}/${year}`;
      }
      
      // Altrimenti prova a parsare come data standard
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      
      // Se non riusciamo a parsare, ritorna il valore originale
      return dateString;
    } catch (e) {
      return 'N/A';
    }
  },

  /**
   * Stampa documento
   */
  printDocument: function(docId) {
    const doc = DDTFTModule.state.documents.find(d => d.id === docId);
    if (!doc) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.type.toUpperCase()} ${doc.number}</title>
        <style>
          body { font-family: Arial, sans-serif; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          .header { text-align: center; margin-bottom: 30px; }
          .info-section { margin: 20px 0; }
          .total-section { text-align: right; margin-top: 20px; font-weight: bold; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${doc.type === 'ddt' ? 'DOCUMENTO DI TRASPORTO' : 'FATTURA'}</h1>
          <p>N° ${doc.number} del ${doc.date}</p>
        </div>
        
        <div class="info-section">
          <h3>Destinatario</h3>
          <p>${doc.clientName}<br>
          P.IVA: ${doc.vatNumber}<br>
          ${doc.deliveryAddress || ''}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Codice</th>
              <th>Descrizione</th>
              <th>Q.tà</th>
              <th>UdM</th>
              <th>Prezzo</th>
              <th>IVA</th>
              <th>Totale</th>
            </tr>
          </thead>
          <tbody>
            ${(doc.items || []).map(item => `
              <tr>
                <td>${item.code}</td>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${item.unit || ''}</td>
                <td>${item.price || item.unitPrice || '0,00'}</td>
                <td>${item.iva || '10%'}</td>
                <td>${item.total || '0,00'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total-section">
          <p>TOTALE: € ${(doc.total || 0).toFixed(2)}</p>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  },

  /**
   * Esporta documento in PDF (placeholder)
   */
  exportDocumentPDF: function(docId) {
    alert('Funzione esportazione PDF in sviluppo');
  },

  /**
   * Modifica documento (placeholder)
   */
  editDocument: function(docId) {
    alert('Funzione modifica in sviluppo');
  }
};

// Export del modulo
window.DDTFTView = DDTFTView;