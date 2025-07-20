/**
 * Inserisce clienti di esempio nel database Supabase
 * Include specificamente "La Mandria" e "Bottega della carne"
 */

async function inserisciClientiEsempio() {
  console.log('📝 Inserimento clienti di esempio...');
  
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
  
  // Clienti di esempio basati sui pattern trovati nel codice
  const clientiEsempio = [
    {
      codice_cliente: '701168',
      nome: 'AZ. AGR. LA MANDRIA S.S.',
      contatto: 'Goia E. e Capra S.',
      via: 'VIA REPERGO',
      numero: '40',
      cap: '14057',
      citta: 'ISOLA D\'ASTI',
      provincia: 'AT',
      zona: 'NORD',
      telefono: '0141-958123',
      priorita: 'alta',
      giorno_chiusura: 'domenica',
      giorno_da_evitare: 'lunedi',
      ultima_visita: '2025-07-01',
      momento_preferito: 'mattina',
      tempo_visita_minuti: 45,
      frequenza_visite_giorni: 21,
      stato: 'attivo',
      note: 'Azienda agricola specializzata in prodotti locali. Contatto preferenziale al mattino.'
    },
    {
      codice_cliente: '701213',
      nome: 'BOTTEGA DELLA CARNE SAS',
      contatto: 'Bonanate Danilo',
      via: 'VIA CHIVASSO',
      numero: '7',
      cap: '15020',
      citta: 'MURISENGO',
      provincia: 'AL',
      zona: 'EST',
      telefono: '0142-643789',
      priorita: 'media',
      giorno_chiusura: 'lunedi',
      giorno_da_evitare: 'mercoledi',
      ultima_visita: '2025-06-25',
      momento_preferito: 'pomeriggio',
      tempo_visita_minuti: 30,
      frequenza_visite_giorni: 14,
      stato: 'attivo',
      note: 'Macelleria specializzata in carni fresche. Preferisce visite pomeridiane.'
    },
    {
      codice_cliente: '507A865AS02493',
      nome: 'CANTINA DEL MONFERRATO SARL',
      contatto: 'Amministratore',
      via: 'VIA DELLE VIGNE',
      numero: '15',
      cap: '14100',
      citta: 'ASTI',
      provincia: 'AT',
      zona: 'CENTRO',
      telefono: '0141-321456',
      priorita: 'alta',
      giorno_chiusura: 'domenica',
      giorno_da_evitare: 'sabato',
      ultima_visita: '2025-07-10',
      momento_preferito: 'mattina',
      tempo_visita_minuti: 60,
      frequenza_visite_giorni: 30,
      stato: 'attivo',
      note: 'Cantina vinicola del Monferrato. Importante cliente per settore vini.'
    },
    {
      codice_cliente: '507A865AS02496',
      nome: 'ESSEMME SRL',
      contatto: 'Responsabile Acquisti',
      via: 'VIA INDUSTRIALE',
      numero: '25',
      cap: '10100',
      citta: 'TORINO',
      provincia: 'TO',
      zona: 'METROPOLITANA',
      telefono: '011-567890',
      priorita: 'alta',
      giorno_chiusura: 'domenica',
      giorno_da_evitare: null,
      ultima_visita: '2025-07-15',
      momento_preferito: 'mattina',
      tempo_visita_minuti: 90,
      frequenza_visite_giorni: 7,
      stato: 'attivo',
      note: 'Cliente strategico area metropolitana. Visite settimanali.'
    },
    {
      codice_cliente: '700001',
      nome: 'ARUDI MIRELLA',
      contatto: 'Mirella Arudi',
      via: 'VIA ROMA',
      numero: '12',
      cap: '12050',
      citta: 'MAGLIANO ALFIERI',
      provincia: 'CN',
      zona: 'SUD',
      telefono: '0173-456789',
      priorita: 'media',
      giorno_chiusura: 'lunedi',
      giorno_da_evitare: 'venerdi',
      ultima_visita: '2025-06-30',
      momento_preferito: 'pomeriggio',
      tempo_visita_minuti: 25,
      frequenza_visite_giorni: 45,
      stato: 'attivo',
      note: 'Cliente di lunga data. Preferisce appuntamenti pomeridiani.'
    }
  ];
  
  try {
    console.log(`📝 Inserimento di ${clientiEsempio.length} clienti di esempio...`);
    
    // Verifica se i clienti esistono già
    const codiciEsistenti = new Set();
    for (const cliente of clientiEsempio) {
      const { data, error } = await window.supabaseClient
        .from('clients')
        .select('codice_cliente')
        .eq('codice_cliente', cliente.codice_cliente);
      
      if (error) {
        console.error(`❌ Errore verifica cliente ${cliente.codice_cliente}:`, error);
        continue;
      }
      
      if (data && data.length > 0) {
        codiciEsistenti.add(cliente.codice_cliente);
        console.log(`⚠️ Cliente ${cliente.nome} (${cliente.codice_cliente}) già presente`);
      }
    }
    
    // Filtra clienti da inserire
    const clientiDaInserire = clientiEsempio.filter(c => !codiciEsistenti.has(c.codice_cliente));
    
    if (clientiDaInserire.length === 0) {
      console.log('✅ Tutti i clienti di esempio sono già presenti nel database');
      return {
        success: true,
        message: 'Tutti i clienti di esempio sono già presenti',
        inserted: 0,
        existing: clientiEsempio.length
      };
    }
    
    console.log(`📝 Inserimento di ${clientiDaInserire.length} nuovi clienti...`);
    
    // Inserisci clienti
    const { data, error } = await window.supabaseClient
      .from('clients')
      .insert(clientiDaInserire)
      .select();
    
    if (error) {
      console.error('❌ Errore nell\'inserimento clienti:', error);
      return {
        success: false,
        error: error.message,
        inserted: 0
      };
    }
    
    console.log(`✅ Inseriti con successo ${data.length} clienti`);
    
    // Mostra dettagli clienti inseriti
    data.forEach((cliente, index) => {
      console.log(`${index + 1}. ${cliente.nome} (${cliente.codice_cliente})`);
      console.log(`   Città: ${cliente.citta} (${cliente.provincia})`);
      console.log(`   Zona: ${cliente.zona}, Priorità: ${cliente.priorita}`);
    });
    
    return {
      success: true,
      message: `Inseriti ${data.length} clienti di esempio`,
      inserted: data.length,
      existing: codiciEsistenti.size,
      clients: data
    };
    
  } catch (error) {
    console.error('❌ Errore generale durante l\'inserimento:', error);
    return {
      success: false,
      error: error.message,
      inserted: 0
    };
  }
}

/**
 * Verifica e inserisce clienti mancanti
 */
async function verificaEInserisciClientiMancanti() {
  console.log('🔍 Verifica clienti mancanti...');
  
  if (!window.supabaseClient) {
    console.error('❌ Supabase client non disponibile');
    return null;
  }
  
  try {
    // Verifica La Mandria
    const { data: laMandria } = await window.supabaseClient
      .from('clients')
      .select('*')
      .or('nome.ilike.%la mandria%,nome.ilike.%mandria%');
    
    // Verifica Bottega della carne
    const { data: bottegaCarne } = await window.supabaseClient
      .from('clients')
      .select('*')
      .or('nome.ilike.%bottega%,nome.ilike.%carne%');
    
    const laMandriaTrovata = laMandria && laMandria.length > 0;
    const bottegaTrovata = bottegaCarne && bottegaCarne.length > 0;
    
    console.log('📊 Stato clienti:');
    console.log(`   La Mandria: ${laMandriaTrovata ? '✅ Presente' : '❌ Mancante'}`);
    console.log(`   Bottega della carne: ${bottegaTrovata ? '✅ Presente' : '❌ Mancante'}`);
    
    if (laMandriaTrovata && bottegaTrovata) {
      console.log('✅ Entrambi i clienti sono già presenti');
      return {
        needed: false,
        laMandria: laMandria[0],
        bottegaDellaCarne: bottegaCarne[0]
      };
    } else {
      console.log('📝 Alcuni clienti mancanti, procedo con l\'inserimento...');
      const result = await inserisciClientiEsempio();
      return {
        needed: true,
        insertResult: result
      };
    }
    
  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
    return null;
  }
}

/**
 * Pulisce tutti i clienti di esempio (utile per test)
 */
async function rimuoviClientiEsempio() {
  console.log('🧹 Rimozione clienti di esempio...');
  
  if (!window.supabaseClient) {
    console.error('❌ Supabase client non disponibile');
    return null;
  }
  
  const codiciEsempio = ['701168', '701213', '507A865AS02493', '507A865AS02496', '700001'];
  
  try {
    const { data, error } = await window.supabaseClient
      .from('clients')
      .delete()
      .in('codice_cliente', codiciEsempio);
    
    if (error) {
      console.error('❌ Errore nella rimozione:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Clienti di esempio rimossi con successo');
    return { success: true, message: 'Clienti di esempio rimossi' };
    
  } catch (error) {
    console.error('❌ Errore generale nella rimozione:', error);
    return { success: false, error: error.message };
  }
}

// Esporta le funzioni
window.inserisciClientiEsempio = inserisciClientiEsempio;
window.verificaEInserisciClientiMancanti = verificaEInserisciClientiMancanti;
window.rimuoviClientiEsempio = rimuoviClientiEsempio;

console.log('🔧 Funzioni inserimento clienti caricate:');
console.log('- inserisciClientiEsempio() - Inserisce clienti di esempio');
console.log('- verificaEInserisciClientiMancanti() - Verifica e inserisce se mancanti');
console.log('- rimuoviClientiEsempio() - Rimuove clienti di esempio (per test)');