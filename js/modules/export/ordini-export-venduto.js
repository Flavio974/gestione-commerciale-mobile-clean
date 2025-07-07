/**
 * Ordini Export Module  
 * Gestisce l'export e l'aggiornamento del file ORDINI.xlsx
 */

(function() {
  'use strict';

  class VendutoExporter {
    constructor() {
      this.vendutoData = [];
      this.tempData = null;
    }

    /**
     * Esporta gli ordini nel file ORDINI
     */
    exportToVendutoFile(orders) {
      try {
        if (!window.XLSX) {
          throw new Error('Libreria XLSX non caricata. Ricaricare la pagina.');
        }

        console.log('📋 Inizio export ORDINI');
        console.log('⚠️ NOTA: Usando solo la memoria del browser per il confronto');
        
        // Reset flag per indicare che NON stiamo usando dati del file
        this.isUsingFileData = false;
        
        // Prepara i dati dei nuovi ordini
        const newData = this.prepareVendutoData(orders);
        
        // Carica dati esistenti dal localStorage
        this.loadExistingData();
        
        // Verifica duplicati SOLO con localStorage
        const { duplicates, uniqueData } = this.checkDuplicates(newData);
        
        if (duplicates.length > 0) {
          console.log('⚠️ Duplicati trovati nella memoria del browser');
          // Salva dati temporanei per uso successivo
          this.tempData = {
            newData,
            uniqueData,
            duplicates
          };
          
          // Mostra dialog duplicati
          window.ExportDialogManager.showDuplicatesDialog(duplicates, uniqueData);
          return { hasDuplicates: true, duplicates };
        }
        
        // Procedi con l'export se non ci sono duplicati
        return this.completeExport(newData);
        
      } catch (error) {
        console.error('Errore durante l\'export ORDINI:', error);
        throw error;
      }
    }

    /**
     * Confronta con file caricato
     */
    compareWithFile(file) {
      console.log('🔍 compareWithFile chiamato con file:', file?.name);
      if (!file) {
        console.error('Nessun file fornito');
        return;
      }
      
      // Chiudi il dialog di confronto
      window.ExportDialogManager.closeDialog('comparison');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          console.log('📖 Lettura file completata');
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {type: 'array'});
          
          console.log('📊 Fogli disponibili:', workbook.SheetNames);
          
          // Cerca il foglio ORDINI
          const sheetName = workbook.SheetNames.find(name => 
            name.toUpperCase() === 'ORDINI'
          ) || workbook.SheetNames[0];
          
          console.log('📋 Usando foglio:', sheetName);
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ''});
          
          console.log('📊 Righe nel file:', jsonData.length);
          
          if (jsonData.length > 1) {
            // Controlla se il file ha solo header o righe vuote
            const fileData = jsonData.slice(1); // Rimuovi header
            const nonEmptyRows = fileData.filter(row => 
              row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
            );
            
            console.log('🔄 Righe totali (senza header):', fileData.length);
            console.log('📊 Righe non vuote:', nonEmptyRows.length);
            
            if (nonEmptyRows.length === 0) {
              console.log('📄 File ORDINI vuoto (solo header), procedo con export diretto');
              // Resetta la memoria locale per sincronizzare con il file vuoto
              localStorage.removeItem('ordiniFileData');
              this.vendutoData = [];
              
              // Mostra dialog con pulsante OK che procede con l'export
              this.showEmptyFileDialog();
            } else {
              console.log('🔄 Procedo con confronto, righe dati valide:', nonEmptyRows.length);
              this.compareAndProceed(nonEmptyRows);
            }
          } else {
            console.log('⚠️ File senza dati, procedo con export normale');
            // Resetta la memoria locale
            localStorage.removeItem('ordiniFileData');
            this.vendutoData = [];
            
            // Mostra dialog con pulsante OK
            this.showEmptyFileDialog();
          }
        } catch (error) {
          console.error('❌ Errore durante la lettura del file:', error);
          window.ExportDialogManager.showMessage('Errore durante la lettura del file: ' + error.message, 'error');
        }
      };
      
      reader.onerror = (error) => {
        console.error('❌ Errore FileReader:', error);
        window.ExportDialogManager.showMessage('Errore durante la lettura del file', 'error');
      };
      
      console.log('📖 Avvio lettura file...');
      reader.readAsArrayBuffer(file);
    }

    /**
     * Export senza confronto
     */
    exportWithoutComparison() {
      const orders = window.ExportCoordinator.getCurrentOrders();
      this.exportToVendutoFile(orders);
    }

    /**
     * Procedi solo con dati univoci
     */
    proceedWithUnique() {
      if (!this.tempData) return;
      this.completeExport(this.tempData.uniqueData);
    }

    /**
     * Procedi con tutti i dati
     */
    proceedWithAll() {
      if (!this.tempData) return;
      this.completeExport(this.tempData.newData);
    }

    /**
     * Prepara i dati nel formato ORDINI
     */
    prepareVendutoData(orders) {
      const rows = [];
      
      orders.forEach(order => {
        if (order.products && order.products.length > 0) {
          order.products.forEach(product => {
            const quantity = this.parseNumber(product.quantity);
            const unitPrice = this.parseNumber(product.unitPrice || product.price);
            const sm = this.parseNumber(product.sm);
            const discount = this.parseNumber(product.discount);
            
            // Calcola importo
            const importo = this.calculateAmount(quantity, unitPrice, sm, discount);
            
            // Pulisci l'indirizzo
            const cleanAddress = this.cleanAddress(
              order.deliveryAddress || order.address, 
              order.clientName
            );
            
            rows.push([
              order.orderNumber || '',                    // N° Ordine
              this.formatDate(order.orderDate),          // Data Ordine
              order.clientName || '',                    // Cliente
              cleanAddress,                              // Indirizzo Consegna
              order.vatNumber || '',                     // P.IVA
              this.formatDate(order.deliveryDate),       // Data Consegna
              this.cleanProductCode(product.code || ''), // Codice Prodotto
              product.description || '',                 // Prodotto
              quantity,                                  // Quantità
              unitPrice,                                 // Prezzo Unitario
              sm || 0,                                   // S.M.
              discount || 0,                             // Sconto %
              importo                                    // Importo
            ]);
          });
        }
      });
      
      return rows;
    }

    /**
     * Carica dati esistenti dal localStorage
     */
    loadExistingData() {
      const savedData = localStorage.getItem('ordiniFileData');
      if (savedData) {
        try {
          this.vendutoData = JSON.parse(savedData);
        } catch (e) {
          console.error('Errore nel caricamento dati ORDINI:', e);
          this.vendutoData = [];
        }
      } else {
        this.vendutoData = [];
      }
    }

    /**
     * Controlla duplicati
     */
    checkDuplicates(newData) {
      const existingKeys = new Set();
      
      // Crea set di chiavi esistenti
      this.vendutoData.forEach(row => {
        if (row && row.length > 6) {
          existingKeys.add(`${row[0]}_${row[6]}`); // NumeroOrdine_CodiceProdotto
        }
      });
      
      const duplicates = [];
      const uniqueData = [];
      
      newData.forEach(row => {
        const key = `${row[0]}_${row[6]}`;
        if (existingKeys.has(key)) {
          duplicates.push({
            orderNumber: row[0],
            productCode: row[6],
            client: row[2],
            description: row[7],
            amount: row[12]
          });
        } else {
          uniqueData.push(row);
        }
      });
      
      return { duplicates, uniqueData };
    }

    /**
     * Completa l'export
     */
    completeExport(dataToAdd) {
      try {
        // Combina dati esistenti con nuovi
        const allData = [...this.vendutoData, ...dataToAdd];
        
        // Salva nel localStorage
        localStorage.setItem('ordiniFileData', JSON.stringify(allData));
        
        // Crea file Excel
        const wb = XLSX.utils.book_new();
        const wsData = [
          // Header
          ['N° Ordine', 'Data Ordine', 'Cliente', 'Indirizzo Consegna', 'P.IVA', 
           'Data Consegna', 'Codice Prodotto', 'Prodotto', 'Quantità', 
           'Prezzo Unitario', 'S.M.', 'Sconto %', 'Importo'],
          ...allData
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Applica formattazione
        this.applyVendutoFormatting(ws);
        
        XLSX.utils.book_append_sheet(wb, ws, 'ORDINI');
        
        // Salva file
        XLSX.writeFile(wb, 'ORDINI.xlsx');
        
        // Calcola statistiche
        const stats = {
          totalRows: allData.length,
          newRows: dataToAdd.length,
          totalAmount: this.calculateTotalAmount(allData)
        };
        
        // Sincronizza con Supabase se disponibile
        this.syncToSupabase(allData);
        
        // Mostra messaggio di successo
        this.showSuccessMessage(stats);
        
        // Pulisci dati temporanei
        this.tempData = null;
        
        return { success: true, stats };
        
      } catch (error) {
        console.error('Errore durante il completamento export:', error);
        throw error;
      }
    }

    /**
     * Applica formattazione al foglio ORDINI
     */
    applyVendutoFormatting(worksheet) {
      worksheet['!cols'] = [
        {wch: 15}, // N° Ordine
        {wch: 12}, // Data Ordine
        {wch: 30}, // Cliente
        {wch: 40}, // Indirizzo Consegna
        {wch: 15}, // P.IVA
        {wch: 12}, // Data Consegna
        {wch: 12}, // Codice Prodotto
        {wch: 40}, // Prodotto
        {wch: 8},  // Quantità
        {wch: 12}, // Prezzo Unitario
        {wch: 8},  // S.M.
        {wch: 8},  // Sconto %
        {wch: 12}  // Importo
      ];
    }

    /**
     * Mostra messaggio di successo
     */
    showSuccessMessage(stats) {
      const message = `
        <strong>File ORDINI aggiornato!</strong><br><br>
        Righe totali nel file: ${stats.totalRows}<br>
        Nuove righe aggiunte: ${stats.newRows}<br>
        Totale complessivo: €${stats.totalAmount.toFixed(2)}
      `;
      
      window.ExportDialogManager.showMessage(message, 'success');
      
      // NON chiudere automaticamente - l'utente dovrà cliccare OK
      // Il dialog export è già stato chiuso quando si mostra il messaggio
    }

    /**
     * Confronta con dati del file reale
     */
    compareAndProceed(fileData) {
      console.log('🔄 compareAndProceed - Inizio confronto');
      console.log('📊 Righe nel file caricato:', fileData.length);
      
      const orders = window.ExportCoordinator.getCurrentOrders();
      console.log('📦 Ordini da esportare:', orders.length);
      
      const newData = this.prepareVendutoData(orders);
      console.log('📝 Righe preparate per export:', newData.length);
      
      // Controlla duplicati con il file reale
      const realFileKeys = new Set();
      fileData.forEach(row => {
        if (row && row.length > 6) {
          const key = `${row[0]}_${row[6]}`;
          realFileKeys.add(key);
        }
      });
      console.log('🔑 Chiavi univoche nel file:', realFileKeys.size);
      
      const duplicates = [];
      const uniqueData = [];
      
      newData.forEach(row => {
        const key = `${row[0]}_${row[6]}`;
        if (realFileKeys.has(key)) {
          duplicates.push({
            orderNumber: row[0],
            productCode: row[6],
            client: row[2],
            description: row[7],
            amount: row[12]
          });
        } else {
          uniqueData.push(row);
        }
      });
      
      console.log('⚠️ Duplicati trovati:', duplicates.length);
      console.log('✅ Dati univoci:', uniqueData.length);
      
      // Aggiorna dati esistenti con quelli del file
      this.vendutoData = fileData;
      
      if (duplicates.length > 0) {
        console.log('📋 Mostro dialog duplicati DAL FILE EXCEL');
        this.tempData = { newData, uniqueData, duplicates };
        
        // Imposta flag per indicare che stiamo usando dati del file
        this.isUsingFileData = true;
        
        window.ExportDialogManager.showDuplicatesDialog(duplicates, uniqueData);
      } else {
        console.log('✅ Nessun duplicato nel FILE EXCEL, procedo con export');
        this.completeExport(newData);
      }
    }

    /**
     * Sincronizza i dati con Supabase
     */
    async syncToSupabase(vendutoData) {
      if (!window.SupabaseSyncVenduto) {
        console.log('⚠️ SupabaseSyncVenduto non disponibile');
        return;
      }

      try {
        const syncer = new window.SupabaseSyncVenduto();
        
        // Converte i dati dal formato array al formato oggetto
        const formattedData = this.convertToSupabaseFormat(vendutoData);
        
        console.log('🔄 Avvio sincronizzazione Supabase...');
        const result = await syncer.syncToSupabase(formattedData, {
          mode: 'upsert',
          onProgress: (progress, stats) => {
            console.log(`📊 Sync progress: ${progress}% - ${stats.current}/${stats.total}`);
          }
        });
        
        if (result.success) {
          console.log(`✅ Sync Supabase completata: ${result.inserted} inseriti, ${result.updated} aggiornati`);
        } else {
          console.warn('⚠️ Sync Supabase fallita:', result.reason || result.error);
        }
        
      } catch (error) {
        console.error('❌ Errore sync Supabase:', error);
      }
    }

    /**
     * Converte dati da formato array a formato oggetto per Supabase
     */
    convertToSupabaseFormat(vendutoData) {
      return vendutoData.map(row => ({
        'N° Ordine': row[0],
        'Data Ordine': row[1],
        'Cliente': row[2],
        'Indirizzo Consegna': row[3],
        'P.IVA': row[4],
        'Data Consegna': row[5],
        'Codice Prodotto': row[6],
        'Prodotto': row[7],
        'Quantità': row[8],
        'Prezzo Unitario': row[9],
        'S.M.': row[10],
        'Sconto %': row[11],
        'Importo': row[12]
      }));
    }

    /**
     * Utilities
     */
    parseNumber(value) {
      if (!value) return 0;
      return parseFloat(value.toString().replace(',', '.').replace('%', '')) || 0;
    }

    formatDate(date) {
      if (!date) return '';
      
      try {
        // Se è già nel formato DD/MM/YYYY, restituiscilo così com'è
        if (typeof date === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
          return date;
        }
        
        // Se è un numero Excel (giorni dal 1900)
        if (typeof date === 'number') {
          const excelEpoch = new Date(1900, 0, 1);
          const jsDate = new Date(excelEpoch.getTime() + (date - 2) * 24 * 60 * 60 * 1000);
          return jsDate.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
        
        // Se è un oggetto Date
        if (date instanceof Date) {
          return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
        
        // Se è una stringa, prova a parsarla
        if (typeof date === 'string') {
          const parsedDate = new Date(date);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toLocaleDateString('it-IT', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
          }
        }
        
        // Se tutto fallisce, restituisci la data originale
        return date;
      } catch (error) {
        console.warn('Errore formatting data:', date, error);
        return date;
      }
    }

    cleanAddress(address, clientName) {
      if (!address) return '';
      if (!clientName) return address;
      
      const clientNamePattern = new RegExp('^' + clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i');
      return address.replace(clientNamePattern, '').trim();
    }

    calculateAmount(quantity, unitPrice, sm, discount) {
      let effectiveQuantity = quantity - sm;
      if (effectiveQuantity < 0) effectiveQuantity = 0;
      
      let amount = effectiveQuantity * unitPrice;
      if (discount > 0) {
        amount = amount * (1 - discount / 100);
      }
      
      return amount;
    }

    calculateTotalAmount(data) {
      let total = 0;
      data.forEach(row => {
        total += parseFloat(row[12]) || 0;
      });
      return total;
    }

    /**
     * Pulisce il codice prodotto rimuovendo prefissi indesiderati
     */
    cleanProductCode(code) {
      if (!code) return '';
      
      // Rimuove "Codice articolo:" se presente
      let cleaned = code.replace(/^Codice\s+articolo:\s*/i, '');
      
      // Rimuove altri prefissi comuni
      cleaned = cleaned.replace(/^Art\.\s*/i, '');
      cleaned = cleaned.replace(/^Articolo:\s*/i, '');
      cleaned = cleaned.replace(/^Cod\.\s*/i, '');
      cleaned = cleaned.replace(/^Codice:\s*/i, '');
      
      return cleaned.trim();
    }

    /**
     * Mostra dialog per file vuoto con pulsante OK
     */
    showEmptyFileDialog() {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.cssText = 'display: block; position: fixed; z-index: 1003; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);';
      
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.style.cssText = 'background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 500px; border-radius: 8px;';
      
      modalContent.innerHTML = `
        <h3 style="color: #28a745;">📄 File ORDINI Vuoto</h3>
        <div style="margin: 20px 0;">
          <p>Il file ORDINI caricato è vuoto (contiene solo l'intestazione).</p>
          <p><strong>I dati verranno aggiunti a partire dalla riga 2.</strong></p>
          <p style="margin-top: 15px; color: #666; font-size: 14px;">
            La memoria locale del browser è stata sincronizzata con il file vuoto.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <button class="btn btn-primary" id="emptyFileOkBtn" style="padding: 10px 30px;">
            OK - Procedi con l'export
          </button>
        </div>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      // Event listener per il pulsante OK
      const okBtn = document.getElementById('emptyFileOkBtn');
      if (okBtn) {
        okBtn.addEventListener('click', () => {
          modal.remove();
          // Procedi con l'export
          this.exportWithoutComparison();
        });
      }
    }
  }

  // Espone la classe globalmente
  window.VendutoExporter = new VendutoExporter();
})();