/**
 * Modulo Supabase per Smart Assistant
 * Salva automaticamente le note vocali trascritte e analizzate in Supabase
 * 
 * IMPORTANTE: Questo modulo è completamente isolato e non modifica il codice esistente
 * Funziona in parallelo senza interferire con le funzionalità già presenti
 */

class SmartAssistantSupabase {
  constructor() {
    this.supabaseClient = null;
    this.isInitialized = false;
    this.retryAttempts = 0;
    this.maxRetries = 3;
    
    console.log('🔌 SmartAssistantSupabase: Inizializzazione modulo...');
    this.init();
  }
  
  /**
   * Inizializza la connessione Supabase
   */
  async init() {
    try {
      // Attendi che Supabase sia disponibile
      await this.waitForSupabase();
      
      // Usa il client già configurato globalmente
      if (window.supabaseClient) {
        this.supabaseClient = window.supabaseClient;
        this.isInitialized = true;
        console.log('✅ SmartAssistantSupabase: Client Supabase pronto');
        
        // Test connessione opzionale
        this.testConnection();
      } else {
        console.warn('⚠️ SmartAssistantSupabase: Client Supabase non disponibile');
      }
    } catch (error) {
      console.error('❌ SmartAssistantSupabase: Errore inizializzazione:', error);
    }
  }
  
  /**
   * Attende che Supabase sia disponibile (max 10 secondi)
   */
  async waitForSupabase() {
    const maxWaitTime = 10000; // 10 secondi
    const checkInterval = 100; // 100ms
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkSupabase = () => {
        if (window.supabaseClient) {
          resolve();
        } else if (Date.now() - startTime > maxWaitTime) {
          reject(new Error('Timeout attesa Supabase'));
        } else {
          setTimeout(checkSupabase, checkInterval);
        }
      };
      
      checkSupabase();
    });
  }
  
  /**
   * Test connessione Supabase (opzionale)
   */
  async testConnection() {
    if (!this.isInitialized || !this.supabaseClient) return;
    
    try {
      const { data, error } = await this.supabaseClient
        .from('note_ai')
        .select('count')
        .limit(1);
        
      if (error) {
        console.warn('⚠️ SmartAssistantSupabase: Test connessione fallito:', error.message);
      } else {
        console.log('✅ SmartAssistantSupabase: Connessione verificata');
      }
    } catch (error) {
      console.warn('⚠️ SmartAssistantSupabase: Errore test connessione:', error);
    }
  }
  
  /**
   * Salva una nota vocale analizzata in Supabase
   * @param {Object} voiceNote - Nota vocale da salvare
   * @param {Object} aiAnalysis - Risultato analisi AI
   * @returns {Promise<Object|null>} Risultato del salvataggio o null se fallisce
   */
  async saveNoteToSupabase(voiceNote, aiAnalysis) {
    // Se Supabase non è disponibile, continua senza bloccare
    if (!this.isInitialized || !this.supabaseClient) {
      console.warn('⚠️ SmartAssistantSupabase: Client non inizializzato, skip salvataggio');
      return null;
    }
    
    try {
      // Estrai dati dall'analisi AI
      const entitaRilevate = aiAnalysis['ENTITÀ RILEVATE'] || {};
      const persone = entitaRilevate.Persone || [];
      const aziende = entitaRilevate.Aziende || [];
      
      // Estrai azioni dalla trascrizione
      const azioni = this.extractActions(voiceNote.transcription, aiAnalysis);
      
      // Estrai date e riferimenti temporali
      const dateRilevate = this.extractDates(voiceNote.transcription);
      
      // Prepara oggetto per Supabase
      const notaAI = {
        testo_originale: voiceNote.transcription,
        persone: persone,
        aziende: aziende,
        categoria: aiAnalysis.categoria || 'pensieri',
        priorita: aiAnalysis.priorita || 'media',
        azioni: azioni,
        date_rilevate: dateRilevate,
        timestamp: voiceNote.timestamp || new Date().toISOString(),
        origine: 'smart_assistant_vocale',
        audio_base64: voiceNote.audioBase64 || null
      };
      
      console.log('📤 SmartAssistantSupabase: Salvando nota...', {
        persone,
        aziende,
        categoria: notaAI.categoria,
        priorita: notaAI.priorita
      });
      
      // Salva in Supabase
      const { data, error } = await this.supabaseClient
        .from('note_ai')
        .insert([notaAI])
        .select();
      
      if (error) {
        console.error('⚠️ SmartAssistantSupabase: Errore salvataggio:', error);
        return null;
      }
      
      console.log('✅ SmartAssistantSupabase: Nota salvata su Supabase:', data[0]?.id);
      return data[0];
      
    } catch (error) {
      console.error('⚠️ SmartAssistantSupabase: Errore salvataggio Supabase:', error);
      // Non bloccare l'app se il salvataggio fallisce
      return null;
    }
  }
  
  /**
   * Estrae le azioni dalla trascrizione e analisi
   */
  extractActions(transcription, aiAnalysis) {
    const azioni = [];
    const text = transcription.toLowerCase();
    
    // Pattern per rilevare azioni
    const actionPatterns = {
      chiamare: /\b(chiamare|telefonare|contattare)\b/gi,
      whatsapp: /\b(messaggio|whatsapp|scrivere)\b/gi,
      ordinare: /\b(ordinare|comprare|acquistare)\b/gi,
      email: /\b(mail|email|inviare)\b/gi,
      reminder: /\b(ricordare|promemoria|reminder)\b/gi
    };
    
    // Cerca pattern nel testo
    for (const [action, pattern] of Object.entries(actionPatterns)) {
      if (pattern.test(text)) {
        azioni.push(action);
      }
    }
    
    // Se l'AI ha rilevato azioni, aggiungile
    if (aiAnalysis.actionRequired || aiAnalysis.azioni) {
      // Aggiungi eventuali azioni non ancora presenti
      if (text.includes('whatsapp') && !azioni.includes('whatsapp')) {
        azioni.push('whatsapp');
      }
      if ((text.includes('chiamare') || text.includes('telefonare')) && !azioni.includes('chiamare')) {
        azioni.push('chiamare');
      }
    }
    
    return [...new Set(azioni)]; // Rimuovi duplicati
  }
  
  /**
   * Recupera le ultime N note salvate
   * @param {number} n - Numero di note da recuperare (default 10)
   * @returns {Promise<Array>} Array di note ordinate per timestamp decrescente
   */
  async getUltimeNote(n = 10) {
    if (!this.isInitialized || !this.supabaseClient) {
      console.warn('⚠️ SmartAssistantSupabase: Client non inizializzato');
      return [];
    }
    
    try {
      const { data, error } = await this.supabaseClient
        .from('note_ai')
        .select('*')
        .eq('origine', 'smart_assistant_vocale')
        .order('timestamp', { ascending: false })
        .limit(n);
      
      if (error) {
        console.error('⚠️ SmartAssistantSupabase: Errore recupero note:', error);
        return [];
      }
      
      console.log(`✅ SmartAssistantSupabase: Recuperate ${data.length} note`);
      return data;
      
    } catch (error) {
      console.error('⚠️ SmartAssistantSupabase: Errore recupero note:', error);
      return [];
    }
  }
  
  /**
   * Recupera note per categoria
   * @param {string} categoria - Categoria delle note (es. 'clienti', 'fornitori')
   * @param {number} limit - Numero massimo di note (default 20)
   * @returns {Promise<Array>} Array di note filtrate
   */
  async getNotePerCategoria(categoria, limit = 20) {
    if (!this.isInitialized || !this.supabaseClient) {
      return [];
    }
    
    try {
      const { data, error } = await this.supabaseClient
        .from('note_ai')
        .select('*')
        .eq('origine', 'smart_assistant_vocale')
        .eq('categoria', categoria)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('⚠️ SmartAssistantSupabase: Errore recupero note per categoria:', error);
        return [];
      }
      
      return data;
      
    } catch (error) {
      console.error('⚠️ SmartAssistantSupabase: Errore:', error);
      return [];
    }
  }
  
  /**
   * Recupera note per priorità
   * @param {string} priorita - Priorità delle note ('urgente', 'alta', 'media', 'bassa')
   * @param {number} limit - Numero massimo di note (default 20)
   * @returns {Promise<Array>} Array di note filtrate
   */
  async getNotePerPriorita(priorita, limit = 20) {
    if (!this.isInitialized || !this.supabaseClient) {
      return [];
    }
    
    try {
      const { data, error } = await this.supabaseClient
        .from('note_ai')
        .select('*')
        .eq('origine', 'smart_assistant_vocale')
        .eq('priorita', priorita)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('⚠️ SmartAssistantSupabase: Errore recupero note per priorità:', error);
        return [];
      }
      
      return data;
      
    } catch (error) {
      console.error('⚠️ SmartAssistantSupabase: Errore:', error);
      return [];
    }
  }
  
  /**
   * Estrae date e riferimenti temporali dalla trascrizione
   * @param {string} transcription - Testo da analizzare
   * @returns {Object} Oggetto con date e riferimenti temporali rilevati
   */
  extractDates(transcription) {
    const text = transcription.toLowerCase();
    const dateInfo = {
      riferimenti_temporali: [],
      date_specifiche: [],
      scadenze: []
    };
    
    // Pattern per riferimenti temporali
    const temporalPatterns = {
      oggi: [
        'oggi', 'stasera', 'stamattina', 'questa mattina', 'questo pomeriggio',
        'entro oggi', 'in giornata', 'entro le ore', 'entro le \\d+', 'prima di sera'
      ],
      domani: [
        'domani', 'domani mattina', 'domani pomeriggio', 'domani sera',
        'entro domani', 'nella giornata di domani'
      ],
      settimana: [
        'questa settimana', 'entro la settimana', 'settimana prossima',
        'prossima settimana', 'entro settimana', 'fra una settimana'
      ],
      mese: [
        'questo mese', 'mese prossimo', 'prossimo mese', 'entro il mese',
        'entro fine mese', 'a fine mese'
      ],
      specifici: [
        'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'
      ]
    };
    
    // Cerca riferimenti temporali
    for (const [tipo, patterns] of Object.entries(temporalPatterns)) {
      patterns.forEach(pattern => {
        const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          matches.forEach(match => {
            dateInfo.riferimenti_temporali.push({
              tipo: tipo,
              testo: match,
              posizione: text.indexOf(match.toLowerCase())
            });
          });
        }
      });
    }
    
    // Pattern per date specifiche (gg/mm/aaaa, gg-mm-aaaa, gg.mm.aaaa)
    const datePatterns = [
      /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g,
      /\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{2,4})?\b/gi,
      /\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{1,2})\b/gi
    ];
    
    datePatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        dateInfo.date_specifiche.push({
          testo: match[0],
          posizione: match.index
        });
      });
    });
    
    // Pattern per orari
    const timePatterns = [
      /\b(\d{1,2}):(\d{2})\b/g,
      /\b(\d{1,2})\s*(del mattino|di mattina|del pomeriggio|di sera|di notte)\b/gi,
      /\bentro le ore (\d{1,2})\b/gi
    ];
    
    timePatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        dateInfo.scadenze.push({
          tipo: 'orario',
          testo: match[0],
          posizione: match.index
        });
      });
    });
    
    // Calcola date reali basate sui riferimenti
    const now = new Date();
    dateInfo.date_calcolate = [];
    
    dateInfo.riferimenti_temporali.forEach(ref => {
      let dataCalcolata = new Date(now);
      
      switch(ref.tipo) {
        case 'oggi':
          // Già oggi
          break;
        case 'domani':
          dataCalcolata.setDate(dataCalcolata.getDate() + 1);
          break;
        case 'settimana':
          if (ref.testo.includes('prossima')) {
            dataCalcolata.setDate(dataCalcolata.getDate() + 7);
          }
          break;
        case 'mese':
          if (ref.testo.includes('prossimo')) {
            dataCalcolata.setMonth(dataCalcolata.getMonth() + 1);
          }
          break;
        case 'specifici':
          // Calcola il prossimo giorno della settimana
          const giorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
          const giornoTarget = giorni.indexOf(ref.testo.toLowerCase());
          if (giornoTarget !== -1) {
            const giornoAttuale = dataCalcolata.getDay();
            let giorniDaAggiungere = giornoTarget - giornoAttuale;
            if (giorniDaAggiungere <= 0) giorniDaAggiungere += 7;
            dataCalcolata.setDate(dataCalcolata.getDate() + giorniDaAggiungere);
          }
          break;
      }
      
      dateInfo.date_calcolate.push({
        riferimento: ref.testo,
        data: dataCalcolata.toISOString().split('T')[0]
      });
    });
    
    return dateInfo;
  }
}

// Esporta istanza singleton
window.smartAssistantSupabase = new SmartAssistantSupabase();

// Esporta anche la classe per test o uso alternativo
window.SmartAssistantSupabase = SmartAssistantSupabase;