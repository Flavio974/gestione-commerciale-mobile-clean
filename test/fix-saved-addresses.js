/**
 * Script per correggere gli indirizzi già salvati nel localStorage
 * Da eseguire nella console del browser
 */

console.log('🔧 Correzione indirizzi salvati...\n');

// Recupera i documenti salvati
const savedDocs = localStorage.getItem('ddtftDocuments');
if (!savedDocs) {
    console.log('❌ Nessun documento trovato nel localStorage');
} else {
    const documents = JSON.parse(savedDocs);
    console.log(`📄 Trovati ${documents.length} documenti\n`);
    
    let corrected = 0;
    
    documents.forEach((doc, index) => {
        let changed = false;
        const oldAddress = doc.indirizzoConsegna;
        
        // Correzione DONAC
        if (doc.cliente && doc.cliente.includes('DONAC')) {
            if (doc.indirizzoConsegna && 
                (doc.indirizzoConsegna.includes('VIA MARGARITA') || 
                 !doc.indirizzoConsegna.includes('VIA SALUZZO'))) {
                
                doc.indirizzoConsegna = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
                doc.deliveryAddress = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
                changed = true;
            }
        }
        
        // Correzione BOREALE
        if (doc.cliente && doc.cliente.includes('BOREALE')) {
            if (doc.indirizzoConsegna && doc.indirizzoConsegna.includes('VIA BERTOLE')) {
                if (doc.indirizzoConsegna.includes('10088')) {
                    doc.indirizzoConsegna = 'VIA MEANA, SNC 10088 VOLPIANO TO';
                    doc.deliveryAddress = 'VIA MEANA, SNC 10088 VOLPIANO TO';
                    changed = true;
                } else if (doc.indirizzoConsegna.includes('10139')) {
                    doc.indirizzoConsegna = 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO';
                    doc.deliveryAddress = 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO';
                    changed = true;
                }
            }
        }
        
        if (changed) {
            corrected++;
            console.log(`✅ Documento ${doc.numeroDocumento || index}:`);
            console.log(`   Cliente: ${doc.cliente}`);
            console.log(`   Prima: ${oldAddress}`);
            console.log(`   Dopo: ${doc.indirizzoConsegna}\n`);
        }
    });
    
    if (corrected > 0) {
        // Salva i documenti corretti
        localStorage.setItem('ddtftDocuments', JSON.stringify(documents));
        console.log(`\n✅ Corretti ${corrected} documenti`);
        console.log('💾 Modifiche salvate nel localStorage');
        console.log('\n⚠️ RICARICA LA PAGINA per vedere le modifiche');
        
        // Prova anche ad aggiornare la tabella se esiste
        if (typeof updateDocumentsTable === 'function') {
            updateDocumentsTable();
            console.log('📊 Tabella aggiornata');
        }
        
        // Correggi anche la tabella visibile
        if (typeof fixAllTables === 'function') {
            fixAllTables();
        }
    } else {
        console.log('✅ Nessun documento necessita correzione');
    }
}

// Funzione helper per correggere un singolo documento
window.fixSingleDocument = function(docId) {
    const savedDocs = localStorage.getItem('ddtftDocuments');
    if (!savedDocs) return;
    
    const documents = JSON.parse(savedDocs);
    const doc = documents.find(d => d.id === docId);
    
    if (doc) {
        if (doc.cliente && doc.cliente.includes('DONAC')) {
            doc.indirizzoConsegna = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
            doc.deliveryAddress = 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
            
            localStorage.setItem('ddtftDocuments', JSON.stringify(documents));
            console.log('✅ Documento corretto e salvato');
            
            // Aggiorna la tabella
            if (typeof updateDocumentsTable === 'function') {
                updateDocumentsTable();
            }
        }
    }
};

console.log('\n💡 Usa fixSingleDocument(docId) per correggere un singolo documento');