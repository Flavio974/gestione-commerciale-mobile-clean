/**
 * DDTFT UI Dialogs Module - Implementazione essenziale
 */
window.DDTFTUIDialogs = {
  // Dialog per visualizzare il contenuto del documento
  viewDDTFTContent: function(document) {
    console.log('Visualizzazione documento:', document);
    // Implementazione base - apre un alert con i dettagli
    const details = `
Documento: ${document.documentNumber}
Cliente: ${document.clientName}
Data: ${document.date}
Totale: €${document.total}
    `;
    alert(details);
  },

  // Dialog per sincronizzare i documenti
  showSyncDialog: function(documents) {
    // Se documents non è passato, usa un array vuoto o recupera i documenti temporanei
    if (!documents) {
      documents = JSON.parse(sessionStorage.getItem('tempDocuments') || '[]');
    }
    
    console.log('Sincronizzazione documenti:', documents.length);
    
    if (documents.length === 0) {
      alert('Nessun documento da sincronizzare. Importa prima alcuni DDT o Fatture.');
      return;
    }
    
    if (confirm(`Vuoi sincronizzare ${documents.length} documenti?`)) {
      this.performSync(documents);
    }
  },

  // Esegue la sincronizzazione
  performSync: function(documents) {
    console.log('Eseguendo sincronizzazione...');
    // Salva in localStorage per ora
    const existingData = JSON.parse(localStorage.getItem('ddtftDocuments') || '[]');
    const updatedData = [...existingData, ...documents];
    localStorage.setItem('ddtftDocuments', JSON.stringify(updatedData));
    
    this.showSyncResults({
      imported: documents.length,
      updated: 0,
      total: updatedData.length
    }, true);
  },

  // Mostra i risultati della sincronizzazione
  showSyncResults: function(result, isNew) {
    const message = isNew 
      ? `Importati: ${result.imported} nuovi documenti\nTotale documenti: ${result.total}`
      : `Aggiornati: ${result.updated} documenti\nTotale documenti: ${result.total}`;
    
    alert(message);
    
    // Ricarica la tabella se disponibile
    if (window.DDTFT && window.DDTFT.updateTable) {
      window.DDTFT.updateTable();
    }
  }
};

console.log('Modulo ui-dialogs.js caricato');