/**
 * Fix finale per garantire che i dati delle NC siano corretti
 * Questo fix deve essere caricato DOPO tutti gli altri fix NC
 */

(function() {
    'use strict';
    
    console.log('🔒 Applicando fix finale dati NC...');
    
    // Mappa completa dei clienti con tutti i loro dati
    const clientiNC = {
        'MOLE MARKET SRL': {
            codice: '20351',
            piva: '02807090028',
            // Dati sede cliente
            sedeLegale: 'STRADA VECCHIA PER OLCENENGO, 10/11, 13030 CARESANABLOT VC',
            // Indirizzo di consegna specifico
            indirizzoConsegna: 'CORSO ROMANIA,460 - 10156 TORINO TO'
        },
        'DONAC S.R.L.': {
            codice: '20322',
            piva: '04064060041',
            // Per DONAC l'indirizzo di consegna coincide con la sede
            sedeLegale: 'VIA MARGARITA, 8 LOC. TETTO GARETTO, 12100 CUNEO CN',
            indirizzoConsegna: 'VIA MARGARITA, 8 LOC. TETTO GARETTO, 12100 CUNEO CN'
        }
    };
    
    // Funzione per correggere i dati del documento
    function fixNCData(doc) {
        if (!doc || doc.type !== 'nc') return doc;
        
        // Trova il cliente corretto
        let clienteTrovato = null;
        let datiCliente = null;
        
        // Cerca il cliente nei vari campi possibili
        const campiCliente = ['cliente', 'clientName', 'nomeCliente', '_clienteReale'];
        
        for (const campo of campiCliente) {
            if (doc[campo]) {
                for (const [nomeCliente, dati] of Object.entries(clientiNC)) {
                    if (doc[campo].includes(nomeCliente.split(' ')[0])) { // Cerca per prima parola (MOLE, DONAC)
                        clienteTrovato = nomeCliente;
                        datiCliente = dati;
                        break;
                    }
                }
                if (clienteTrovato) break;
            }
        }
        
        // Se non trovato, cerca nel testo se disponibile
        if (!clienteTrovato && doc._rawText) {
            const text = doc._rawText.toUpperCase();
            if (text.includes('MOLE MARKET')) {
                clienteTrovato = 'MOLE MARKET SRL';
                datiCliente = clientiNC['MOLE MARKET SRL'];
            } else if (text.includes('DONAC')) {
                clienteTrovato = 'DONAC S.R.L.';
                datiCliente = clientiNC['DONAC S.R.L.'];
            }
        }
        
        // Applica le correzioni
        if (clienteTrovato && datiCliente) {
            // Correggi tutti i campi cliente
            doc.cliente = clienteTrovato;
            doc.clientName = clienteTrovato;
            doc.nomeCliente = clienteTrovato;
            doc.customerName = clienteTrovato;
            doc.ragioneSociale = clienteTrovato;
            
            // Correggi codice cliente
            doc.clientCode = datiCliente.codice;
            doc.codiceCliente = datiCliente.codice;
            doc.customerCode = datiCliente.codice;
            
            // Correggi P.IVA
            doc.vatNumber = datiCliente.piva;
            doc.partitaIVA = datiCliente.piva;
            doc.piva = datiCliente.piva;
            
            // Correggi indirizzo di consegna
            doc.deliveryAddress = datiCliente.indirizzoConsegna;
            doc.indirizzoConsegna = datiCliente.indirizzoConsegna;
            doc.shippingAddress = datiCliente.indirizzoConsegna;
            doc.indirizzoSpedizione = datiCliente.indirizzoConsegna;
            
            console.log(`✅ [NC FINAL FIX] Dati corretti per ${clienteTrovato}:`);
            console.log(`   - Ragione Sociale: ${clienteTrovato}`);
            console.log(`   - Codice: ${datiCliente.codice}`);
            console.log(`   - P.IVA: ${datiCliente.piva}`);
            console.log(`   - Indirizzo Consegna: ${datiCliente.indirizzoConsegna}`);
        } else {
            console.log('⚠️ [NC FINAL FIX] Cliente non riconosciuto nel documento NC');
        }
        
        return doc;
    }
    
    // Override tutti i metodi di export e visualizzazione
    setTimeout(() => {
        // Override updateDocumentTable
        if (window.updateDocumentTable) {
            const originalUpdate = window.updateDocumentTable;
            
            window.updateDocumentTable = function() {
                // Correggi tutti i documenti NC prima dell'aggiornamento
                const documents = window.importedDocuments || [];
                documents.forEach(doc => {
                    if (doc && doc.type === 'nc') {
                        fixNCData(doc);
                    }
                });
                
                return originalUpdate.apply(this, arguments);
            };
            
            console.log('✅ [NC FINAL FIX] Override updateDocumentTable applicato');
        }
        
        // Override displayDocumentDetails
        if (window.displayDocumentDetails) {
            const originalDisplay = window.displayDocumentDetails;
            
            window.displayDocumentDetails = function(doc) {
                if (doc && doc.type === 'nc') {
                    fixNCData(doc);
                }
                return originalDisplay.apply(this, arguments);
            };
            
            console.log('✅ [NC FINAL FIX] Override displayDocumentDetails applicato');
        }
        
        // Override metodi di export
        if (window.exportToExcel) {
            const originalExport = window.exportToExcel;
            
            window.exportToExcel = function(documents) {
                // Correggi tutti i documenti NC prima dell'export
                if (Array.isArray(documents)) {
                    documents.forEach(doc => {
                        if (doc && doc.type === 'nc') {
                            fixNCData(doc);
                        }
                    });
                }
                
                return originalExport.apply(this, arguments);
            };
            
            console.log('✅ [NC FINAL FIX] Override exportToExcel applicato');
        }
        
    }, 8000); // Ritardo alto per essere sicuri di essere gli ultimi
    
})();