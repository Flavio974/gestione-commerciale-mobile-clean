/**
 * Sincronizzazione Clienti con Supabase
 * Gestisce upload e download dei dati clienti
 */

const ClientiSupabaseSync = {
    /**
     * Sincronizza clienti locali con Supabase
     */
    syncToSupabase: async function() {
        console.log('🔄 SYNC: Inizio sincronizzazione clienti...');
        
        // Attendi che Supabase sia inizializzato
        let retries = 0;
        while (!window.supabase && retries < 10) {
            console.log('⏳ SYNC: Attendo inizializzazione Supabase... tentativo', retries + 1);
            await new Promise(resolve => setTimeout(resolve, 500));
            retries++;
        }
        
        console.log('🔄 SYNC: window.supabase disponibile?', !!window.supabase);
        
        if (!window.supabase) {
            console.log('⚠️ Supabase non disponibile dopo 5 secondi di attesa');
            alert('Supabase non disponibile. Verificare la connessione internet e ricaricare la pagina.');
            return false;
        }

        try {
            const clientiLocali = Clienti.state.clients;
            if (!clientiLocali || clientiLocali.length === 0) {
                console.log('⚠️ Nessun cliente locale da sincronizzare');
                return true;
            }

            console.log('🔄 Sincronizzazione', clientiLocali.length, 'clienti con Supabase...');
            
            // Debug: mostra alcuni clienti
            console.log('📊 Esempio clienti locali:', clientiLocali.slice(0, 3));

            // Prima ottieni i clienti già presenti su Supabase
            const { data: existingClients } = await window.supabase
                .from('clients')
                .select('codice_cliente');

            const existingCodes = new Set(existingClients?.map(c => c.codice_cliente) || []);

            // Prepara i dati per Supabase
            const clientiFormatted = clientiLocali
                .filter(client => {
                    // Filtra clienti senza codice o nome
                    const codice = client.codiceCliente || client.code;
                    const nome = client.nome || client.name;
                    if (!codice || !nome) {
                        console.warn('⚠️ SYNC: Cliente ignorato - manca codice o nome:', client);
                        return false;
                    }
                    return true;
                })
                .map(client => ({
                    codice_cliente: client.codiceCliente || client.code,
                    nome: client.nome || client.name,
                    contatto: client.contatto || client.contact || null,
                    via: client.via || client.street || null,
                    numero: client.numero || client.number || null,
                    cap: client.cap || client.zip || null,
                    citta: client.citta || client.city || null,
                    provincia: client.provincia || client.province || null,
                    zona: client.zona || client.zone || null,
                    telefono: client.telefono || client.phone || null,
                    priorita: client.priorita || client.priority || 'media',
                    giorno_chiusura: client.giornoChiusura || client.closeDay || null,
                    giorno_da_evitare: client.giornoDaEvitare || client.avoidDay || null,
                    ultima_visita: (client.ultimaVisita || client.lastVisit) ? new Date(client.ultimaVisita || client.lastVisit).toISOString().split('T')[0] : null,
                    momento_preferito: client.momentoPreferito || client.preferredTime || null,
                    tempo_visita_minuti: parseInt(client.tempoVisitaMinuti || client.visitTime) || 30,
                    frequenza_visite_giorni: parseInt(client.frequenzaVisiteGiorni || client.visitFrequency) || 30,
                    stato: client.stato || client.status || 'attivo',
                    note: client.note || client.notes || null,
                    imported_at: new Date().toISOString()
                }));

            console.log('📊 SYNC: Clienti validi dopo filtro:', clientiFormatted.length);
            console.log('📊 SYNC: Esempio cliente formattato:', clientiFormatted[0]);

            // Separa clienti da inserire e da aggiornare
            const clientiDaInserire = clientiFormatted.filter(c => !existingCodes.has(c.codice_cliente));
            const clientiDaAggiornare = clientiFormatted.filter(c => existingCodes.has(c.codice_cliente));

            let inserted = 0;
            let updated = 0;

            // Inserisci nuovi clienti
            if (clientiDaInserire.length > 0) {
                console.log('📤 Inserimento', clientiDaInserire.length, 'nuovi clienti...');
                const { error: insertError } = await window.supabase
                    .from('clients')
                    .insert(clientiDaInserire);

                if (insertError) {
                    console.error('❌ Errore inserimento clienti:', insertError);
                } else {
                    inserted = clientiDaInserire.length;
                }
            }

            // Aggiorna clienti esistenti
            for (const cliente of clientiDaAggiornare) {
                const { error: updateError } = await window.supabase
                    .from('clients')
                    .update(cliente)
                    .eq('codice_cliente', cliente.codice_cliente);

                if (updateError) {
                    console.error('❌ Errore aggiornamento cliente', cliente.codice_cliente, ':', updateError);
                } else {
                    updated++;
                }
            }

            console.log(`✅ Sincronizzazione completata: ${inserted} inseriti, ${updated} aggiornati`);
            
            // Mostra notifica
            if (Utils.showToast) {
                Utils.showToast(`Sincronizzazione completata: ${inserted} clienti inseriti, ${updated} aggiornati`, 'success');
            } else {
                alert(`Sincronizzazione completata: ${inserted} clienti inseriti, ${updated} aggiornati`);
            }
            
            return true;

        } catch (error) {
            console.error('❌ Errore generale sincronizzazione clienti:', error);
            if (Utils.showToast) {
                Utils.showToast('Errore durante la sincronizzazione dei clienti', 'error');
            } else {
                alert('Errore durante la sincronizzazione dei clienti');
            }
            return false;
        }
    },

    /**
     * Scarica clienti da Supabase
     */
    downloadFromSupabase: async function() {
        console.log('📥 DOWNLOAD: Inizio download clienti...');
        
        // Attendi che Supabase sia inizializzato
        let retries = 0;
        while (!window.supabase && retries < 10) {
            console.log('⏳ DOWNLOAD: Attendo inizializzazione Supabase... tentativo', retries + 1);
            await new Promise(resolve => setTimeout(resolve, 500));
            retries++;
        }
        
        console.log('📥 DOWNLOAD: window.supabase disponibile?', !!window.supabase);
        
        if (!window.supabase) {
            console.log('⚠️ Supabase non disponibile dopo 5 secondi di attesa');
            alert('Supabase non disponibile. Verificare la connessione internet e ricaricare la pagina.');
            return false;
        }

        try {
            console.log('📥 Download clienti da Supabase...');
            
            const { data, error } = await window.supabase
                .from('clients')
                .select('*')
                .order('nome', { ascending: true });

            if (error) {
                console.error('❌ Errore download clienti:', error);
                return false;
            }

            if (!data || data.length === 0) {
                console.log('⚠️ Nessun cliente trovato su Supabase');
                return true;
            }

            console.log('✅ Scaricati', data.length, 'clienti da Supabase');

            // Converti formato Supabase a formato locale
            const clientiLocali = data.map(client => ({
                id: client.codice_cliente, // Usa codice cliente come ID
                codiceCliente: client.codice_cliente,
                nome: client.nome,
                contatto: client.contatto,
                via: client.via,
                numero: client.numero,
                cap: client.cap,
                citta: client.citta,
                provincia: client.provincia,
                zona: client.zona,
                telefono: client.telefono,
                priorita: client.priorita || 'media',
                giornoChiusura: client.giorno_chiusura,
                giornoDaEvitare: client.giorno_da_evitare,
                ultimaVisita: client.ultima_visita,
                momentoPreferito: client.momento_preferito,
                tempoVisitaMinuti: client.tempo_visita_minuti || 30,
                frequenzaVisiteGiorni: client.frequenza_visite_giorni || 30,
                stato: client.stato || 'attivo',
                note: client.note
            }));

            // Salva nel localStorage
            Clienti.state.clients = clientiLocali;
            Clienti.saveToStorage();
            
            // Aggiorna la vista se siamo nella tab clienti
            if (document.getElementById('clients-tab')?.classList.contains('active')) {
                Clienti.updateTable();
                Clienti.updateStats();
            }

            if (Utils.showToast) {
                Utils.showToast(`Scaricati ${data.length} clienti da Supabase`, 'success');
            } else {
                alert(`Scaricati ${data.length} clienti da Supabase`);
            }
            return true;

        } catch (error) {
            console.error('❌ Errore generale download clienti:', error);
            if (Utils.showToast) {
                Utils.showToast('Errore durante il download dei clienti', 'error');
            } else {
                alert('Errore durante il download dei clienti');
            }
            return false;
        }
    },

    /**
     * Verifica stato sincronizzazione
     */
    checkSyncStatus: async function() {
        if (!window.supabase) {
            return { available: false, message: 'Supabase non disponibile' };
        }

        try {
            const { count: localCount } = { count: Clienti.state.clients.length };
            const { count: remoteCount } = await window.supabase
                .from('clients')
                .select('*', { count: 'exact', head: true });

            return {
                available: true,
                localCount,
                remoteCount: remoteCount || 0,
                synced: localCount === (remoteCount || 0)
            };
        } catch (error) {
            return { available: false, message: error.message };
        }
    }
};

// Export globale
window.ClientiSupabaseSync = ClientiSupabaseSync;