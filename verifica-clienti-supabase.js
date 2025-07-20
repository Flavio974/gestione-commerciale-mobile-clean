/**
 * Verifica la presenza di clienti nel database Supabase
 * Cerca specificamente "La Mandria" e "Bottega della carne"
 */

async function verificaClientiSupabase() {
  console.log('🔍 Verifica clienti nel database Supabase...');
  
  // Attendi inizializzazione Supabase
  let retries = 0;
  while (!window.supabaseClient && retries < 20) {
    console.log('⏳ Attendo inizializzazione Supabase client... tentativo', retries + 1);
    await new Promise(resolve => setTimeout(resolve, 500));
    retries++;
  }
  
  if (!window.supabaseClient) {
    console.error('❌ Supabase client non disponibile dopo 10 secondi');
    return null;
  }
  
  try {
    console.log('📊 Interrogazione tabella clienti...');
    
    // Query per ottenere tutti i clienti
    const { data: allClients, error: allError } = await window.supabaseClient
      .from('clients')
      .select('*');
    
    if (allError) {
      console.error('❌ Errore nella query generale:', allError);
      return null;
    }
    
    console.log(`📋 Totale clienti trovati: ${allClients?.length || 0}`);
    
    if (!allClients || allClients.length === 0) {
      console.log('⚠️ Nessun cliente trovato nel database Supabase');
      return { totalClients: 0, laMandria: null, bottegaDellaCarne: null };
    }
    
    // Cerca specificamente "La Mandria"
    const laMandria = allClients.find(client => 
      client.nome?.toLowerCase().includes('la mandria') ||
      client.nome?.toLowerCase().includes('mandria')
    );
    
    // Cerca specificamente "Bottega della carne"
    const bottegaDellaCarne = allClients.find(client => 
      client.nome?.toLowerCase().includes('bottega della carne') ||
      client.nome?.toLowerCase().includes('bottega') && client.nome?.toLowerCase().includes('carne')
    );
    
    console.log('\n🔍 RISULTATI RICERCA CLIENTI SPECIFICI:');
    console.log('=' .repeat(60));
    
    if (laMandria) {
      console.log('✅ LA MANDRIA TROVATA:');
      console.log(`   ID: ${laMandria.id}`);
      console.log(`   Codice: ${laMandria.codice_cliente}`);
      console.log(`   Nome: ${laMandria.nome}`);
      console.log(`   Contatto: ${laMandria.contatto || 'N/A'}`);
      console.log(`   Indirizzo: ${laMandria.via || 'N/A'} ${laMandria.numero || ''}`);
      console.log(`   CAP: ${laMandria.cap || 'N/A'}`);
      console.log(`   Città: ${laMandria.citta || 'N/A'}`);
      console.log(`   Provincia: ${laMandria.provincia || 'N/A'}`);
      console.log(`   Zona: ${laMandria.zona || 'N/A'}`);
      console.log(`   Telefono: ${laMandria.telefono || 'N/A'}`);
      console.log(`   Priorità: ${laMandria.priorita || 'N/A'}`);
      console.log(`   Ultima visita: ${laMandria.ultima_visita || 'Mai visitato'}`);
      console.log(`   Stato: ${laMandria.stato || 'N/A'}`);
      console.log(`   Note: ${laMandria.note || 'Nessuna nota'}`);
    } else {
      console.log('❌ LA MANDRIA NON TROVATA');
    }
    
    console.log('\n' + '-' .repeat(60));
    
    if (bottegaDellaCarne) {
      console.log('✅ BOTTEGA DELLA CARNE TROVATA:');
      console.log(`   ID: ${bottegaDellaCarne.id}`);
      console.log(`   Codice: ${bottegaDellaCarne.codice_cliente}`);
      console.log(`   Nome: ${bottegaDellaCarne.nome}`);
      console.log(`   Contatto: ${bottegaDellaCarne.contatto || 'N/A'}`);
      console.log(`   Indirizzo: ${bottegaDellaCarne.via || 'N/A'} ${bottegaDellaCarne.numero || ''}`);
      console.log(`   CAP: ${bottegaDellaCarne.cap || 'N/A'}`);
      console.log(`   Città: ${bottegaDellaCarne.citta || 'N/A'}`);
      console.log(`   Provincia: ${bottegaDellaCarne.provincia || 'N/A'}`);
      console.log(`   Zona: ${bottegaDellaCarne.zona || 'N/A'}`);
      console.log(`   Telefono: ${bottegaDellaCarne.telefono || 'N/A'}`);
      console.log(`   Priorità: ${bottegaDellaCarne.priorita || 'N/A'}`);
      console.log(`   Ultima visita: ${bottegaDellaCarne.ultima_visita || 'Mai visitato'}`);
      console.log(`   Stato: ${bottegaDellaCarne.stato || 'N/A'}`);
      console.log(`   Note: ${bottegaDellaCarne.note || 'Nessuna nota'}`);
    } else {
      console.log('❌ BOTTEGA DELLA CARNE NON TROVATA');
    }
    
    console.log('\n' + '=' .repeat(60));
    
    // Mostra esempi di altri clienti presenti
    console.log('\n📋 PRIMI 5 CLIENTI NEL DATABASE:');
    allClients.slice(0, 5).forEach((client, index) => {
      console.log(`${index + 1}. ${client.nome} (${client.codice_cliente})`);
      console.log(`   Città: ${client.citta || 'N/A'}, Zona: ${client.zona || 'N/A'}`);
    });
    
    // Cerca clienti con pattern simili
    console.log('\n🔍 RICERCA PATTERN SIMILI:');
    const clientiConMandria = allClients.filter(c => 
      c.nome?.toLowerCase().includes('mandria') ||
      c.nome?.toLowerCase().includes('azienda') ||
      c.nome?.toLowerCase().includes('agr')
    );
    
    const clientiConBottega = allClients.filter(c => 
      c.nome?.toLowerCase().includes('bottega') ||
      c.nome?.toLowerCase().includes('carne') ||
      c.nome?.toLowerCase().includes('macelleria')
    );
    
    if (clientiConMandria.length > 0) {
      console.log('🔍 Clienti con pattern "mandria/azienda/agr":');
      clientiConMandria.forEach(c => console.log(`   - ${c.nome} (${c.codice_cliente})`));
    }
    
    if (clientiConBottega.length > 0) {
      console.log('🔍 Clienti con pattern "bottega/carne/macelleria":');
      clientiConBottega.forEach(c => console.log(`   - ${c.nome} (${c.codice_cliente})`));
    }
    
    return {
      totalClients: allClients.length,
      laMandria: laMandria,
      bottegaDellaCarne: bottegaDellaCarne,
      allClients: allClients,
      clientiConMandria: clientiConMandria,
      clientiConBottega: clientiConBottega
    };
    
  } catch (error) {
    console.error('❌ Errore durante la verifica clienti:', error);
    return null;
  }
}

/**
 * Funzione per creare query personalizzate sui clienti
 */
async function queryClientiPersonalizzata(searchTerm, field = 'nome') {
  console.log(`🔍 Ricerca personalizzata: "${searchTerm}" nel campo "${field}"`);
  
  if (!window.supabaseClient) {
    console.error('❌ Supabase client non disponibile');
    return null;
  }
  
  try {
    const { data, error } = await window.supabaseClient
      .from('clients')
      .select('*')
      .ilike(field, `%${searchTerm}%`);
    
    if (error) {
      console.error('❌ Errore nella query personalizzata:', error);
      return null;
    }
    
    console.log(`📋 Trovati ${data?.length || 0} clienti per "${searchTerm}"`);
    
    if (data && data.length > 0) {
      data.forEach((client, index) => {
        console.log(`${index + 1}. ${client.nome} (${client.codice_cliente})`);
        console.log(`   ${field}: ${client[field]}`);
        console.log(`   Città: ${client.citta || 'N/A'}, Zona: ${client.zona || 'N/A'}`);
      });
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Errore durante la query personalizzata:', error);
    return null;
  }
}

/**
 * Funzione per ottenere statistiche sui clienti
 */
async function getClientiStatistiche() {
  console.log('📊 Ottenimento statistiche clienti...');
  
  if (!window.supabaseClient) {
    console.error('❌ Supabase client non disponibile');
    return null;
  }
  
  try {
    const { data, error } = await window.supabaseClient
      .from('clients_stats')
      .select('*');
    
    if (error) {
      console.error('❌ Errore nell\'ottenimento statistiche:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      const stats = data[0];
      console.log('\n📊 STATISTICHE CLIENTI:');
      console.log('=' .repeat(40));
      console.log(`Totale clienti: ${stats.total_clienti}`);
      console.log(`Clienti attivi: ${stats.clienti_attivi}`);
      console.log(`Clienti inattivi: ${stats.clienti_inattivi}`);
      console.log(`Città servite: ${stats.citta_servite}`);
      console.log(`Zone commerciali: ${stats.zone_commerciali}`);
      console.log(`Priorità alta: ${stats.clienti_priorita_alta}`);
      console.log(`Priorità media: ${stats.clienti_priorita_media}`);
      console.log(`Priorità bassa: ${stats.clienti_priorita_bassa}`);
      console.log(`Clienti visitati: ${stats.clienti_visitati}`);
      console.log(`Visite ultimo mese: ${stats.visite_ultimo_mese}`);
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Errore durante l\'ottenimento statistiche:', error);
    return null;
  }
}

// Esporta le funzioni
window.verificaClientiSupabase = verificaClientiSupabase;
window.queryClientiPersonalizzata = queryClientiPersonalizzata;
window.getClientiStatistiche = getClientiStatistiche;

// Esegui automaticamente la verifica
console.log('🚀 Funzioni di verifica clienti caricate. Uso:');
console.log('- verificaClientiSupabase() - Verifica La Mandria e Bottega della carne');
console.log('- queryClientiPersonalizzata("termine", "campo") - Ricerca personalizzata');
console.log('- getClientiStatistiche() - Statistiche generali');