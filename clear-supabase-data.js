/**
 * Script per pulizia sicura del database Supabase
 * Cancella tutti i dati dalle tabelle principali con conferme multiple
 * 
 * UTILIZZO:
 * 1. Aprire la console del browser nella tua applicazione
 * 2. Copiare e incollare questo script
 * 3. Eseguire: clearSupabaseData()
 * 
 * ATTENZIONE: Questa operazione è IRREVERSIBILE!
 */

window.clearSupabaseData = async function() {
    console.log('🔥 CLEAR SUPABASE DATA - Script di pulizia database');
    console.log('⚠️  ATTENZIONE: Questa operazione cancellerà TUTTI i dati!');
    
    // Verifica che Supabase sia disponibile
    if (!window.supabase) {
        console.error('❌ Supabase client non disponibile');
        console.error('Assicurati che la pagina sia caricata correttamente e che Supabase sia inizializzato');
        return false;
    }
    
    // Lista delle tabelle da pulire (in ordine di priorità)
    const TABLES_TO_CLEAR = [
        {
            name: 'archivio_ordini_venduto',
            description: 'Archivio storico ordini venduto',
            priority: 'HIGH'
        },
        {
            name: 'clients',
            description: 'Database clienti',
            priority: 'HIGH'
        },
        {
            name: 'timeline_events',
            description: 'Eventi timeline',
            priority: 'MEDIUM'
        },
        {
            name: 'percorsi',
            description: 'Database percorsi',
            priority: 'MEDIUM'
        },
        {
            name: 'ordini',
            description: 'Ordini (se presente)',
            priority: 'LOW'
        },
        {
            name: 'documenti_ddtft',
            description: 'Documenti DDT/FT (se presente)',
            priority: 'LOW'
        },
        {
            name: 'prodotti',
            description: 'Database prodotti (se presente)',
            priority: 'LOW'
        }
    ];
    
    // Fase 1: Verifica connessione e mostra statistiche
    console.log('📊 FASE 1: Verifica connessione e conteggio record...');
    
    const tableStats = {};
    const existingTables = [];
    
    for (const table of TABLES_TO_CLEAR) {
        try {
            console.log(`🔍 Controllo tabella: ${table.name}`);
            
            const { count, error } = await window.supabase
                .from(table.name)
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                console.log(`⚠️  Tabella ${table.name} non accessibile o non esiste:`, error.message);
                tableStats[table.name] = { exists: false, error: error.message };
            } else {
                console.log(`✅ Tabella ${table.name}: ${count || 0} record trovati`);
                tableStats[table.name] = { exists: true, count: count || 0 };
                existingTables.push(table);
            }
        } catch (err) {
            console.log(`❌ Errore verifica tabella ${table.name}:`, err.message);
            tableStats[table.name] = { exists: false, error: err.message };
        }
    }
    
    console.log('\n📋 RIEPILOGO TABELLE:');
    console.table(tableStats);
    
    if (existingTables.length === 0) {
        console.log('✅ Nessuna tabella con dati trovata. Niente da cancellare.');
        return true;
    }
    
    // Fase 2: Conferma utente
    console.log('\n🚨 FASE 2: Conferma operazione');
    console.log('Tabelle che verranno svuotate:');
    existingTables.forEach(table => {
        const stats = tableStats[table.name];
        console.log(`  - ${table.name}: ${stats.count} record (${table.priority} priority)`);
    });
    
    const totalRecords = existingTables.reduce((sum, table) => {
        return sum + (tableStats[table.name].count || 0);
    }, 0);
    
    console.log(`\n📊 TOTALE RECORD DA CANCELLARE: ${totalRecords}`);
    
    // Prima conferma
    const confirm1 = confirm(`⚠️ ATTENZIONE!\n\nStai per cancellare ${totalRecords} record da ${existingTables.length} tabelle.\n\nQuesta operazione è IRREVERSIBILE!\n\nVuoi continuare?`);
    
    if (!confirm1) {
        console.log('❌ Operazione annullata dall\'utente');
        return false;
    }
    
    // Seconda conferma con password
    const confirmPassword = prompt('🔐 Per confermare, digita "DELETE ALL DATA" (maiuscolo):');
    if (confirmPassword !== 'DELETE ALL DATA') {
        console.log('❌ Password di conferma errata. Operazione annullata.');
        return false;
    }
    
    // Terza conferma finale
    const confirm3 = confirm('🔥 ULTIMA CONFERMA!\n\nSei ASSOLUTAMENTE SICURO di voler cancellare tutti i dati?\n\nNon potrai recuperarli!');
    
    if (!confirm3) {
        console.log('❌ Operazione annullata dall\'utente');
        return false;
    }
    
    // Fase 3: Cancellazione dati
    console.log('\n🔥 FASE 3: Inizio cancellazione dati...');
    
    const results = {
        success: [],
        failed: [],
        totalDeleted: 0
    };
    
    for (const table of existingTables) {
        const tableName = table.name;
        const originalCount = tableStats[tableName].count;
        
        try {
            console.log(`🗑️  Cancellazione tabella: ${tableName} (${originalCount} record)...`);
            
            // Cancella tutti i record
            const { error } = await window.supabase
                .from(tableName)
                .delete()
                .neq('id', 'impossible-id-that-does-not-exist'); // Trucco per cancellare tutti i record
            
            if (error) {
                console.error(`❌ Errore cancellazione ${tableName}:`, error);
                results.failed.push({ table: tableName, error: error.message, originalCount });
            } else {
                console.log(`✅ Tabella ${tableName} svuotata con successo`);
                results.success.push({ table: tableName, originalCount });
                results.totalDeleted += originalCount;
            }
            
        } catch (err) {
            console.error(`❌ Errore generale cancellazione ${tableName}:`, err);
            results.failed.push({ table: tableName, error: err.message, originalCount });
        }
    }
    
    // Fase 4: Verifica finale
    console.log('\n🔍 FASE 4: Verifica finale...');
    
    const finalStats = {};
    
    for (const table of existingTables) {
        try {
            const { count, error } = await window.supabase
                .from(table.name)
                .select('*', { count: 'exact', head: true });
            
            finalStats[table.name] = error ? 'ERROR' : (count || 0);
        } catch (err) {
            finalStats[table.name] = 'ERROR';
        }
    }
    
    console.log('\n📊 VERIFICA FINALE:');
    console.table(finalStats);
    
    // Fase 5: Riepilogo finale
    console.log('\n📋 RIEPILOGO OPERAZIONE:');
    console.log(`✅ Tabelle svuotate con successo: ${results.success.length}`);
    console.log(`❌ Tabelle con errori: ${results.failed.length}`);
    console.log(`🗑️  Totale record cancellati: ${results.totalDeleted}`);
    
    if (results.success.length > 0) {
        console.log('\n✅ TABELLE SVUOTATE:');
        results.success.forEach(item => {
            console.log(`  - ${item.table}: ${item.originalCount} record cancellati`);
        });
    }
    
    if (results.failed.length > 0) {
        console.log('\n❌ TABELLE CON ERRORI:');
        results.failed.forEach(item => {
            console.log(`  - ${item.table}: ${item.error}`);
        });
    }
    
    console.log('\n🎯 OPERAZIONE COMPLETATA!');
    console.log('📝 Per ricaricare i dati:');
    console.log('   1. Importa nuovamente i file Excel/CSV');
    console.log('   2. Usa le funzioni di sincronizzazione dell\'app');
    console.log('   3. Verifica che i dati siano stati ricaricati correttamente');
    
    return {
        success: results.success.length > 0,
        totalDeleted: results.totalDeleted,
        successfulTables: results.success.length,
        failedTables: results.failed.length,
        results: results
    };
};

// Funzione di utilità per verificare lo stato delle tabelle senza cancellare
window.checkSupabaseStatus = async function() {
    console.log('🔍 Verifica stato database Supabase...');
    
    if (!window.supabase) {
        console.error('❌ Supabase client non disponibile');
        return false;
    }
    
    const tables = [
        'archivio_ordini_venduto',
        'clients', 
        'timeline_events',
        'percorsi',
        'ordini',
        'documenti_ddtft',
        'prodotti'
    ];
    
    const status = {};
    
    for (const table of tables) {
        try {
            const { count, error } = await window.supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                status[table] = `❌ ${error.message}`;
            } else {
                status[table] = `✅ ${count || 0} record`;
            }
        } catch (err) {
            status[table] = `❌ ${err.message}`;
        }
    }
    
    console.log('\n📊 STATO ATTUALE DATABASE:');
    console.table(status);
    
    return status;
};

// Funzione per cancellare una singola tabella (più sicura)
window.clearSingleTable = async function(tableName) {
    console.log(`🗑️  Cancellazione tabella singola: ${tableName}`);
    
    if (!window.supabase) {
        console.error('❌ Supabase client non disponibile');
        return false;
    }
    
    try {
        // Conta i record attuali
        const { count, error: countError } = await window.supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
        
        if (countError) {
            console.error(`❌ Errore accesso tabella ${tableName}:`, countError.message);
            return false;
        }
        
        console.log(`📊 Trovati ${count || 0} record in ${tableName}`);
        
        if ((count || 0) === 0) {
            console.log(`✅ Tabella ${tableName} già vuota`);
            return true;
        }
        
        // Conferma
        const confirm = window.confirm(`⚠️ Vuoi cancellare ${count} record dalla tabella ${tableName}?`);
        if (!confirm) {
            console.log('❌ Operazione annullata');
            return false;
        }
        
        // Cancella
        const { error } = await window.supabase
            .from(tableName)
            .delete()
            .neq('id', 'impossible-id');
        
        if (error) {
            console.error(`❌ Errore cancellazione:`, error.message);
            return false;
        }
        
        console.log(`✅ Tabella ${tableName} svuotata con successo`);
        return true;
        
    } catch (err) {
        console.error(`❌ Errore generale:`, err.message);
        return false;
    }
};

console.log('🔥 Script di pulizia Supabase caricato!');
console.log('📋 Comandi disponibili:');
console.log('   - clearSupabaseData()     : Cancella tutti i dati (con conferme)');
console.log('   - checkSupabaseStatus()   : Verifica stato database');
console.log('   - clearSingleTable("nome"): Cancella una singola tabella');
console.log('');
console.log('⚠️  ATTENZIONE: Le operazioni di cancellazione sono IRREVERSIBILI!');