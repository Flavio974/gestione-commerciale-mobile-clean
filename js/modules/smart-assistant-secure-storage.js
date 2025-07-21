/**
 * 🔐 Smart Assistant Secure Storage Manager
 * 
 * Gestisce l'archiviazione sicura delle note in cartelle organizzate
 * basate sull'analisi automatica del contenuto.
 * 
 * Funzionalità:
 * - Ambiente riservato per le note
 * - Categorizzazione automatica basata sul contenuto
 * - Sincronizzazione con Supabase
 * - Crittografia locale opzionale
 */

class SmartAssistantSecureStorage {
  constructor() {
    this.storagePrefix = 'smart_secure_';
    this.encryptionKey = null;
    this.isInitialized = false;
    
    // Definisce le categorie principali
    this.categories = {
      CLIENTI: {
        name: 'Clienti',
        icon: '👥',
        keywords: ['cliente', 'ordine', 'fattura', 'pagamento', 'contratto'],
        patterns: [
          /cliente\s+(\w+)/i,
          /ordine\s+(\w+)/i,
          /fattura\s+(\w+)/i
        ]
      },
      FORNITORI: {
        name: 'Fornitori', 
        icon: '🏭',
        keywords: ['fornitore', 'acquisto', 'preventivo', 'fornitura'],
        patterns: [
          /fornitore\s+(\w+)/i,
          /acquisto\s+da\s+(\w+)/i
        ]
      },
      ORDINI: {
        name: 'Ordini',
        icon: '📋',
        keywords: ['ordine', 'ordinare', 'chiamare', 'chiamata', 'ordini', 'fare gli ordini'],
        patterns: [
          /fare\s+(gli\s+)?ordini/i,
          /chiamare\s+i?\s?clienti/i,
          /ordine\s+(\w+)/i,
          /chiamata\s+a\s+(\w+)/i,
          /ordinare\s+(.+)/i
        ]
      },
      PRODOTTI: {
        name: 'Prodotti',
        icon: '📦',
        keywords: ['prodotto', 'stock', 'inventario', 'magazzino', 'articolo'],
        patterns: [
          /prodotto\s+(\w+)/i,
          /articolo\s+(\w+)/i,
          /stock\s+(\w+)/i
        ]
      },
      VIAGGI: {
        name: 'Viaggi e Logistica',
        icon: '🚗',
        keywords: ['viaggio', 'percorso', 'consegna', 'logistica', 'trasporto'],
        patterns: [
          /da\s+(\w+)\s+a\s+(\w+)/i,
          /consegna\s+a\s+(\w+)/i,
          /viaggio\s+(\w+)/i
        ]
      },
      RIUNIONI: {
        name: 'Riunioni e Appuntamenti',
        icon: '📅',
        keywords: ['riunione', 'appuntamento', 'meeting', 'incontro'],
        patterns: [
          /riunione\s+con\s+(\w+)/i,
          /appuntamento\s+(\w+)/i,
          /meeting\s+(\w+)/i
        ]
      },
      PERSONALE: {
        name: 'Note Personali',
        icon: '📝',
        keywords: ['nota', 'promemoria', 'ricorda', 'importante'],
        patterns: [
          /ricorda\s+(.+)/i,
          /importante\s+(.+)/i
        ]
      },
      GENERALE: {
        name: 'Generale',
        icon: '📄',
        keywords: [],
        patterns: []
      }
    };

    console.log('🔐 SmartAssistantSecureStorage: Inizializzazione...');
    this.init();
  }

  /**
   * Inizializza il sistema di storage sicuro
   */
  async init() {
    try {
      // Verifica e crea le strutture di base
      await this.ensureStorageStructure();
      
      // Migra eventuali note esistenti
      await this.migrateExistingNotes();
      
      this.isInitialized = true;
      console.log('✅ SmartAssistantSecureStorage: Inizializzato con successo');
      
      // Connette ai listeners per nuove note
      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ SmartAssistantSecureStorage: Errore inizializzazione:', error);
    }
  }

  /**
   * Crea la struttura di storage riservata
   */
  async ensureStorageStructure() {
    // Crea indice delle cartelle
    const foldersIndex = this.getSecureItem('folders_index') || {};
    
    // Assicura che tutte le categorie esistano
    for (const [key, category] of Object.entries(this.categories)) {
      if (!foldersIndex[key]) {
        foldersIndex[key] = {
          id: key,
          name: category.name,
          icon: category.icon,
          noteCount: 0,
          lastUpdated: new Date().toISOString(),
          notes: []
        };
      }
    }
    
    this.setSecureItem('folders_index', foldersIndex);
    console.log('📁 Struttura cartelle verificata:', Object.keys(foldersIndex).length, 'categorie');
  }

  /**
   * Migra le note esistenti dal localStorage normale
   */
  async migrateExistingNotes() {
    try {
      const existingNotes = JSON.parse(localStorage.getItem('smart_voice_notes') || '[]');
      let migratedCount = 0;
      
      for (const note of existingNotes) {
        if (note.transcription && !this.isAlreadySecured(note.id)) {
          await this.organizeAndStoreNote(note);
          migratedCount++;
        }
      }
      
      if (migratedCount > 0) {
        console.log(`🔄 Migrate ${migratedCount} note esistenti nell'ambiente sicuro`);
      }
    } catch (error) {
      console.error('❌ Errore migrazione note:', error);
    }
  }

  /**
   * Verifica se una nota è già nell'ambiente sicuro
   */
  isAlreadySecured(noteId) {
    const securedNotes = this.getSecureItem('secured_notes_ids') || [];
    return securedNotes.includes(noteId);
  }

  /**
   * Analizza il contenuto e determina la categoria
   */
  analyzeContent(transcription) {
    const text = transcription.toLowerCase();
    const analysis = {
      category: 'GENERALE',
      confidence: 0,
      extractedEntities: {},
      keywords: [],
      isGenericTask: false,
      genericType: null,
      actions: [],
      timeReferences: []
    };

    // Rileva riferimenti generici e azioni
    analysis.isGenericTask = this.detectGenericReferences(text);
    analysis.actions = this.extractActions(text);
    analysis.timeReferences = this.extractTimeReferences(text);

    let maxScore = 0;
    
    // Testa ogni categoria
    for (const [categoryKey, category] of Object.entries(this.categories)) {
      if (categoryKey === 'GENERALE') continue;
      
      let score = 0;
      const foundKeywords = [];
      const foundEntities = {};
      
      // Punteggio per keywords
      for (const keyword of category.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score += 10;
          foundKeywords.push(keyword);
        }
      }
      
      // Punteggio per pattern regex
      for (const pattern of category.patterns) {
        const matches = transcription.match(pattern);
        if (matches) {
          score += 15;
          foundEntities[pattern.source] = matches[1] || matches[0];
        }
      }
      
      // Se questa categoria ha il punteggio più alto
      if (score > maxScore) {
        maxScore = score;
        analysis.category = categoryKey;
        analysis.confidence = Math.min(score / 20, 1.0); // Normalizza 0-1
        analysis.extractedEntities = foundEntities;
        analysis.keywords = foundKeywords;
      }
    }
    
    console.log('🔍 Analisi contenuto:', {
      category: analysis.category,
      confidence: Math.round(analysis.confidence * 100) + '%',
      keywords: analysis.keywords
    });
    
    return analysis;
  }

  /**
   * Rileva riferimenti generici come "i miei clienti", "tutti i fornitori"
   */
  detectGenericReferences(text) {
    const genericPatterns = [
      { pattern: /(i\s+)?miei\s+clienti?/i, type: 'clienti_generici' },
      { pattern: /(tutti\s+i\s+)?clienti?/i, type: 'clienti_generici' },
      { pattern: /(i\s+)?miei\s+fornitori?/i, type: 'fornitori_generici' },
      { pattern: /(tutti\s+i\s+)?fornitori?/i, type: 'fornitori_generici' },
      { pattern: /fare\s+(gli\s+)?ordini?/i, type: 'ordini_generici' },
      { pattern: /chiamare\s+(i\s+)?clienti?/i, type: 'clienti_generici' }
    ];

    for (const {pattern, type} of genericPatterns) {
      if (pattern.test(text)) {
        return { isGeneric: true, type };
      }
    }

    return { isGeneric: false, type: null };
  }

  /**
   * Estrae azioni dal testo
   */
  extractActions(text) {
    const actionPatterns = [
      /chiamare/i,
      /telefonare/i, 
      /contattare/i,
      /ordinare/i,
      /fare\s+(gli\s+)?ordini?/i,
      /inviare/i,
      /mandare/i,
      /controllare/i,
      /verificare/i,
      /preparare/i
    ];

    const actions = [];
    for (const pattern of actionPatterns) {
      const match = text.match(pattern);
      if (match) {
        actions.push(match[0]);
      }
    }

    return actions;
  }

  /**
   * Estrae riferimenti temporali
   */
  extractTimeReferences(text) {
    const timePatterns = [
      /entro\s+(le\s+)?(\d{1,2}):?(\d{2})?/i,
      /alle\s+(\d{1,2}):?(\d{2})?/i,
      /oggi/i,
      /domani/i,
      /questa\s+settimana/i,
      /lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica/i
    ];

    const timeRefs = [];
    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        timeRefs.push(match[0]);
      }
    }

    return timeRefs;
  }

  /**
   * Crea task generica nella cartella appropriata
   */
  async createGenericTask(secureNote) {
    let targetCategory = 'GENERALE';
    
    // Mappa tipi generici alle categorie
    const typeMapping = {
      'clienti_generici': 'CLIENTI',
      'fornitori_generici': 'FORNITORI', 
      'ordini_generici': 'ORDINI'
    };

    if (secureNote.genericType && typeMapping[secureNote.genericType]) {
      targetCategory = typeMapping[secureNote.genericType];
    }

    // Crea task formattata
    const taskNote = {
      ...secureNote,
      id: `${secureNote.id}_task`,
      category: targetCategory,
      taskType: 'GENERIC',
      taskDescription: this.formatGenericTaskDescription(secureNote),
      originalNoteId: secureNote.id
    };

    console.log(`📋 Creando task generica in categoria: ${targetCategory}`);
    console.log(`📝 Descrizione task: ${taskNote.taskDescription}`);

    // Salva nella cartella target
    await this.saveToSecureFolder(taskNote);
    
    return taskNote;
  }

  /**
   * Formatta descrizione per task generica
   */
  formatGenericTaskDescription(secureNote) {
    let description = '';
    
    if (secureNote.actions.length > 0) {
      description += `Azione: ${secureNote.actions.join(', ')} `;
    }
    
    if (secureNote.genericType) {
      const typeDesc = {
        'clienti_generici': 'tutti i clienti',
        'fornitori_generici': 'tutti i fornitori',
        'ordini_generici': 'gli ordini'
      };
      description += typeDesc[secureNote.genericType] || '';
    }
    
    if (secureNote.timeReferences.length > 0) {
      description += ` - Scadenza: ${secureNote.timeReferences.join(', ')}`;
    }

    return description || secureNote.transcription;
  }

  /**
   * Crea cartelle dinamiche per clienti specifici
   */
  async createClientFolder(clientName) {
    const folderKey = `CLIENTE_${clientName.toUpperCase().replace(/\s+/g, '_')}`;
    
    const clientFolder = {
      name: `Cliente: ${clientName}`,
      icon: '👤',
      keywords: [clientName.toLowerCase()],
      patterns: [new RegExp(clientName.replace(/\s+/g, '\\s+'), 'i')],
      isClientFolder: true,
      clientName: clientName,
      createdAt: new Date().toISOString()
    };

    // Aggiunge alla struttura categorie
    this.categories[folderKey] = clientFolder;
    
    console.log(`👤 Creata cartella per cliente: ${clientName}`);
    return folderKey;
  }

  /**
   * Rileva nomi specifici di clienti/aziende dal testo
   */
  detectSpecificClients(text, entities) {
    const detectedClients = [];
    
    // Cerca persone specifiche dalle entità AI
    if (entities.persone && entities.persone.length > 0) {
      detectedClients.push(...entities.persone);
    }
    
    // Cerca aziende specifiche
    if (entities.aziende && entities.aziende.length > 0) {
      detectedClients.push(...entities.aziende);
    }

    // Pattern per nomi propri (maiuscole)
    const namePatterns = [
      /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g, // Mario Rossi
      /\b([A-Z][a-z]+\s+[A-Z]{2,})\b/g,   // Azienda SRL
      /\b([A-Z]{2,}(?:\s+[A-Z][a-z]+)*)\b/g // ABC Company
    ];

    for (const pattern of namePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim();
        if (name.length > 2 && !detectedClients.includes(name)) {
          detectedClients.push(name);
        }
      }
    }

    return detectedClients;
  }

  /**
   * Crea note specifiche per ogni cliente rilevato
   */
  async createClientSpecificNotes(originalNote, clientNames) {
    const clientNotes = [];
    
    for (const clientName of clientNames) {
      // Crea cartella cliente se non esiste
      const clientFolderKey = await this.createClientFolder(clientName);
      
      // Crea nota specifica per questo cliente
      const clientNote = {
        ...originalNote,
        id: `${originalNote.id}_client_${clientName.replace(/\s+/g, '_')}`,
        category: clientFolderKey,
        clientName: clientName,
        noteType: 'CLIENT_SPECIFIC',
        originalNoteId: originalNote.id,
        clientHistory: {
          timestamp: new Date().toISOString(),
          interaction: this.categorizeInteraction(originalNote),
          content: originalNote.transcription
        }
      };

      console.log(`👤 Creando nota per cliente: ${clientName}`);
      
      // Salva nella cartella del cliente
      await this.saveToSecureFolder(clientNote);
      clientNotes.push(clientNote);
    }

    return clientNotes;
  }

  /**
   * Categorizza il tipo di interazione con il cliente
   */
  categorizeInteraction(note) {
    const text = note.transcription.toLowerCase();
    
    if (text.includes('chiamare') || text.includes('telefonare')) {
      return 'CHIAMATA';
    } else if (text.includes('ordinare') || text.includes('ordine')) {
      return 'ORDINE';
    } else if (text.includes('incontro') || text.includes('appuntamento')) {
      return 'INCONTRO';
    } else if (text.includes('problema') || text.includes('reclamo')) {
      return 'PROBLEMA';
    } else {
      return 'GENERICO';
    }
  }

  /**
   * Organizza e salva una nota nell'ambiente sicuro
   */
  async organizeAndStoreNote(note) {
    try {
      if (!note.transcription) {
        console.warn('⚠️ Nota senza trascrizione, skip organizzazione');
        return;
      }

      // Analizza il contenuto
      const contentAnalysis = this.analyzeContent(note.transcription);
      
      // Rileva clienti specifici per il payload Supabase
      const specificClients = this.detectSpecificClients(
        note.transcription, 
        note.aiAnalysis?.entities || {}
      );
      
      // Crea nota sicura
      const secureNote = {
        id: note.id,
        originalTimestamp: note.timestamp,
        secureTimestamp: new Date().toISOString(),
        transcription: note.transcription,
        category: contentAnalysis.category,
        confidence: contentAnalysis.confidence,
        extractedEntities: contentAnalysis.extractedEntities,
        keywords: contentAnalysis.keywords,
        audioBase64: note.audioBase64, // Mantiene audio per backup
        isGenericTask: contentAnalysis.isGenericTask?.isGeneric || false,
        genericType: contentAnalysis.isGenericTask?.type || null,
        actions: contentAnalysis.actions || [],
        timeReferences: contentAnalysis.timeReferences || [],
        // Aggiunge clienti rilevati per Supabase
        detectedClients: specificClients.filter(client => 
          // Filtra solo persone (non aziende)
          !client.includes('SRL') && !client.includes('SpA') && !client.includes('Ltd')
        ),
        detectedCompanies: specificClients.filter(client => 
          // Filtra solo aziende
          client.includes('SRL') || client.includes('SpA') || client.includes('Ltd') || 
          client.match(/^[A-Z]{2,}/)
        ),
        metadata: {
          duration: note.duration,
          originalAnalysis: note.aiAnalysis,
          securityLevel: 'PRIVATE'
        }
      };

      // Salva nella categoria appropriata
      await this.saveToSecureFolder(secureNote);
      
      // Se è un task generico, crea anche una task nella cartella correlata
      if (secureNote.isGenericTask) {
        await this.createGenericTask(secureNote);
      }
      
      // Crea cartelle individuali per i clienti rilevati
      const allDetectedClients = [...secureNote.detectedClients, ...secureNote.detectedCompanies];
      
      if (allDetectedClients.length > 0) {
        await this.createClientSpecificNotes(secureNote, allDetectedClients);
      }
      
      // Marca come sicura
      this.markNoteAsSecured(note.id);
      
      console.log(`🔐 Nota organizzata in categoria: ${contentAnalysis.category}`);
      
      // Prepara per Supabase sync
      await this.prepareForSupabaseSync(secureNote);
      
      return secureNote;
      
    } catch (error) {
      console.error('❌ Errore organizzazione nota:', error);
      throw error;
    }
  }

  /**
   * Salva la nota nella cartella sicura appropriata
   */
  async saveToSecureFolder(secureNote) {
    const foldersIndex = this.getSecureItem('folders_index');
    const categoryFolder = foldersIndex[secureNote.category];
    
    if (!categoryFolder) {
      throw new Error(`Categoria ${secureNote.category} non trovata`);
    }
    
    // Aggiunge nota alla cartella
    categoryFolder.notes.push({
      id: secureNote.id,
      timestamp: secureNote.secureTimestamp,
      preview: secureNote.transcription.substring(0, 100) + '...',
      confidence: secureNote.confidence,
      keywords: secureNote.keywords.slice(0, 3) // Prime 3 keywords
    });
    
    // Aggiorna contatori
    categoryFolder.noteCount = categoryFolder.notes.length;
    categoryFolder.lastUpdated = secureNote.secureTimestamp;
    
    // Mantiene solo ultime 50 note per categoria
    if (categoryFolder.notes.length > 50) {
      categoryFolder.notes = categoryFolder.notes.slice(-50);
    }
    
    // Salva indice aggiornato
    this.setSecureItem('folders_index', foldersIndex);
    
    // Salva nota completa separatamente
    this.setSecureItem(`note_${secureNote.id}`, secureNote);
  }

  /**
   * Marca una nota come già processata
   */
  markNoteAsSecured(noteId) {
    const securedNotes = this.getSecureItem('secured_notes_ids') || [];
    if (!securedNotes.includes(noteId)) {
      securedNotes.push(noteId);
      this.setSecureItem('secured_notes_ids', securedNotes);
    }
  }

  /**
   * Determina la priorità della nota basata sul contenuto
   */
  determinePriority(secureNote) {
    const text = secureNote.transcription.toLowerCase();
    
    // Priorità ALTA per urgenze
    if (text.includes('urgente') || text.includes('subito') || text.includes('entro oggi') || 
        text.includes('importante') || text.includes('problema') || text.includes('emergenza')) {
      return 'alta';
    }
    
    // Priorità ALTA per scadenze temporali precise
    if (secureNote.timeReferences && secureNote.timeReferences.length > 0) {
      const hasTimeDeadline = secureNote.timeReferences.some(ref => 
        ref.includes('entro') || ref.includes('alle') || ref.includes('oggi') || ref.includes('domani')
      );
      if (hasTimeDeadline) return 'alta';
    }
    
    // Priorità MEDIA per clienti specifici
    if (secureNote.clientName || (secureNote.detectedClients && secureNote.detectedClients.length > 0)) {
      return 'media';
    }
    
    // Priorità BASSA per task generiche
    if (secureNote.isGenericTask) {
      return 'bassa';
    }
    
    // Default MEDIA
    return 'media';
  }

  /**
   * Prepara dati per sincronizzazione Supabase
   */
  async prepareForSupabaseSync(secureNote) {
    try {
      const syncQueue = this.getSecureItem('supabase_sync_queue') || [];
      
      // Estrae entità dall'analisi AI originale se disponibile
      const originalEntities = secureNote.metadata?.originalAnalysis?.entities || {};
      
      // Combina entità AI originali con clienti rilevati localmente
      const personeDetected = [
        ...(originalEntities.persone || []),
        ...(secureNote.detectedClients || [])
      ];
      
      const aziendeDetected = [
        ...(originalEntities.aziende || []),
        ...(secureNote.detectedCompanies || [])
      ];
      
      // Prepara payload per Supabase (adattato al formato note_ai)
      const supabasePayload = {
        testo_originale: secureNote.transcription,
        persone: [...new Set(personeDetected)], // Rimuove duplicati
        aziende: [...new Set(aziendeDetected)], // Rimuove duplicati
        categoria: secureNote.category.toLowerCase(),
        priorita: this.determinePriority(secureNote), // Priorità dinamica
        azioni: secureNote.actions || secureNote.keywords || [],
        date_rilevate: originalEntities.date || secureNote.timeReferences || [],
        timestamp: secureNote.secureTimestamp,
        origine: 'smart_assistant_secure_storage',
        audio_base64: secureNote.audioBase64,
        metadata: {
          source_note_id: secureNote.id,
          confidence: secureNote.confidence,
          duration: secureNote.metadata?.duration,
          security_level: secureNote.metadata?.securityLevel || 'PRIVATE',
          has_audio_backup: !!secureNote.audioBase64,
          original_category: secureNote.category,
          keywords: secureNote.keywords,
          is_generic_task: secureNote.isGenericTask,
          generic_type: secureNote.genericType,
          client_specific: !!secureNote.clientName,
          client_name: secureNote.clientName,
          extracted_patterns: secureNote.extractedEntities
        }
      };
      
      // Debug del payload per verificare i dati
      console.log('🔄 Payload Supabase preparato:', {
        persone: supabasePayload.persone,
        aziende: supabasePayload.aziende,
        categoria: supabasePayload.categoria,
        priorita: supabasePayload.priorita,
        azioni: supabasePayload.azioni,
        date_rilevate: supabasePayload.date_rilevate,
        metadata_keys: Object.keys(supabasePayload.metadata)
      });
      
      syncQueue.push(supabasePayload);
      
      // Mantiene coda di max 100 elementi
      if (syncQueue.length > 100) {
        syncQueue.splice(0, syncQueue.length - 100);
      }
      
      this.setSecureItem('supabase_sync_queue', syncQueue);
      
      // Tenta sync immediato se possibile
      this.attemptSupabaseSync();
      
    } catch (error) {
      console.error('❌ Errore preparazione sync Supabase:', error);
    }
  }

  /**
   * Tenta sincronizzazione con Supabase
   */
  async attemptSupabaseSync() {
    try {
      if (!window.SmartAssistantSupabase || !window.supabaseClient) {
        console.log('⏳ Supabase non disponibile per sync');
        return;
      }

      const syncQueue = this.getSecureItem('supabase_sync_queue') || [];
      if (syncQueue.length === 0) return;

      console.log(`🔄 Tentativo sync ${syncQueue.length} note con Supabase...`);

      const results = [];
      for (const noteData of syncQueue) {
        try {
          const { data, error } = await window.supabaseClient
            .from('note_ai')
            .upsert(noteData);
          
          if (error) {
            console.error('❌ Errore sync nota:', error);
            results.push({ success: false, error });
          } else {
            results.push({ success: true, data });
          }
        } catch (syncError) {
          console.error('❌ Errore sync individuale:', syncError);
          results.push({ success: false, error: syncError });
        }
      }

      // Rimuove note sincronizzate con successo
      const successfulSyncs = results.filter(r => r.success).length;
      if (successfulSyncs > 0) {
        const remainingQueue = syncQueue.slice(successfulSyncs);
        this.setSecureItem('supabase_sync_queue', remainingQueue);
        console.log(`✅ ${successfulSyncs} note sincronizzate con Supabase`);
      }

    } catch (error) {
      console.error('❌ Errore sync Supabase:', error);
    }
  }

  /**
   * Setup event listeners per processare nuove note
   */
  setupEventListeners() {
    // Ascolta eventi di nuove note dal SmartAssistant principale
    document.addEventListener('smartAssistantNoteCreated', (event) => {
      if (event.detail && event.detail.note) {
        console.log('🎤 Nuova nota rilevata per organizzazione sicura');
        setTimeout(() => {
          this.organizeAndStoreNote(event.detail.note);
        }, 1000); // Delay per permettere completamento trascrizione
      }
    });

    // Sync periodico con Supabase
    setInterval(() => {
      this.attemptSupabaseSync();
    }, 30000); // Ogni 30 secondi
  }

  /**
   * Ottiene tutte le cartelle con statistiche
   */
  getFoldersOverview() {
    const foldersIndex = this.getSecureItem('folders_index') || {};
    
    return Object.values(foldersIndex).map(folder => ({
      id: folder.id,
      name: folder.name,
      icon: folder.icon,
      noteCount: folder.noteCount,
      lastUpdated: folder.lastUpdated,
      recentNotes: folder.notes.slice(-3) // Ultime 3 note
    }));
  }

  /**
   * Ottiene note di una specifica categoria
   */
  getFolderNotes(categoryId) {
    const foldersIndex = this.getSecureItem('folders_index') || {};
    const folder = foldersIndex[categoryId];
    
    if (!folder) return [];
    
    // Carica note complete
    return folder.notes.map(noteRef => {
      const fullNote = this.getSecureItem(`note_${noteRef.id}`);
      return fullNote || noteRef;
    });
  }

  /**
   * Cerca nelle note sicure
   */
  searchSecureNotes(query) {
    const foldersIndex = this.getSecureItem('folders_index') || {};
    const results = [];
    
    for (const folder of Object.values(foldersIndex)) {
      for (const noteRef of folder.notes) {
        const fullNote = this.getSecureItem(`note_${noteRef.id}`);
        if (fullNote && fullNote.transcription.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            ...fullNote,
            categoryName: folder.name,
            categoryIcon: folder.icon
          });
        }
      }
    }
    
    return results.sort((a, b) => new Date(b.secureTimestamp) - new Date(a.secureTimestamp));
  }

  /**
   * Cancella una singola nota dalla cartella
   */
  deleteSingleNote(noteId, categoryId) {
    try {
      console.log(`🗑️ Cancellazione nota singola: ${noteId} dalla categoria ${categoryId}`);
      
      // Ottieni l'indice delle cartelle
      const foldersIndex = this.getSecureItem('folders_index') || {};
      
      if (!foldersIndex[categoryId]) {
        console.log(`⚠️ Categoria ${categoryId} non trovata`);
        return false;
      }
      
      const folder = foldersIndex[categoryId];
      
      // Rimuovi la nota dall'array delle note della cartella
      const initialCount = folder.notes.length;
      folder.notes = folder.notes.filter(note => note.id !== noteId);
      
      if (folder.notes.length === initialCount) {
        console.log(`⚠️ Nota ${noteId} non trovata nella cartella`);
        return false;
      }
      
      // Aggiorna contatori
      folder.noteCount = folder.notes.length;
      folder.lastUpdated = new Date().toISOString();
      
      // Salva l'indice aggiornato
      this.setSecureItem('folders_index', foldersIndex);
      
      // Rimuovi la nota completa dallo storage
      const noteKey = `note_${noteId}`;
      localStorage.removeItem(`${this.storagePrefix}${noteKey}`);
      
      console.log(`✅ Nota ${noteId} cancellata dalla categoria ${categoryId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Errore cancellazione nota singola:`, error);
      return false;
    }
  }

  /**
   * Cancella tutte le note di una cartella specifica
   */
  clearFolder(categoryId) {
    try {
      console.log(`🗑️ Inizio cancellazione cartella: ${categoryId}`);
      
      // Ottieni l'indice delle cartelle
      const foldersIndex = this.getSecureItem('folders_index') || {};
      
      if (!foldersIndex[categoryId]) {
        console.log(`⚠️ Cartella ${categoryId} non trovata`);
        return false;
      }
      
      const folder = foldersIndex[categoryId];
      const noteIds = folder.notes || [];
      let deletedCount = 0;
      
      // Cancella ogni singola nota
      for (const noteId of noteIds) {
        try {
          const noteKey = `note_${noteId}`;
          localStorage.removeItem(`${this.storagePrefix}${noteKey}`);
          deletedCount++;
          console.log(`🗑️ Nota cancellata: ${noteId}`);
        } catch (error) {
          console.error(`❌ Errore cancellazione nota ${noteId}:`, error);
        }
      }
      
      // Reset della cartella nell'indice
      foldersIndex[categoryId] = {
        ...folder,
        notes: [],
        noteCount: 0,
        lastUpdated: new Date().toISOString()
      };
      
      // Salva l'indice aggiornato
      this.setSecureItem('folders_index', foldersIndex);
      
      console.log(`✅ Cartella ${categoryId} svuotata: ${deletedCount} note cancellate`);
      return true;
      
    } catch (error) {
      console.error(`❌ Errore durante cancellazione cartella ${categoryId}:`, error);
      return false;
    }
  }

  /**
   * Metodi sicuri per localStorage con prefisso
   */
  getSecureItem(key) {
    try {
      const data = localStorage.getItem(`${this.storagePrefix}${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`❌ Errore lettura ${key}:`, error);
      return null;
    }
  }

  setSecureItem(key, data) {
    try {
      localStorage.setItem(`${this.storagePrefix}${key}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`❌ Errore scrittura ${key}:`, error);
      return false;
    }
  }

  /**
   * Esporta statistiche di utilizzo
   */
  getUsageStatistics() {
    const foldersIndex = this.getSecureItem('folders_index') || {};
    const syncQueue = this.getSecureItem('supabase_sync_queue') || [];
    
    return {
      totalCategories: Object.keys(foldersIndex).length,
      totalNotes: Object.values(foldersIndex).reduce((sum, folder) => sum + folder.noteCount, 0),
      pendingSync: syncQueue.length,
      categoriesStats: Object.values(foldersIndex).map(folder => ({
        name: folder.name,
        count: folder.noteCount,
        lastActivity: folder.lastUpdated
      }))
    };
  }

  /**
   * Pulizia dati vecchi (mantiene ultime 1000 note totali)
   */
  cleanupOldData() {
    try {
      const foldersIndex = this.getSecureItem('folders_index') || {};
      let totalNotes = 0;
      const allNotes = [];
      
      // Raccoglie tutte le note con timestamp
      for (const folder of Object.values(foldersIndex)) {
        for (const noteRef of folder.notes) {
          allNotes.push({
            ...noteRef,
            categoryId: folder.id
          });
          totalNotes++;
        }
      }
      
      if (totalNotes > 1000) {
        // Ordina per timestamp e mantiene le più recenti
        allNotes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const notesToKeep = allNotes.slice(0, 1000);
        const notesToDelete = allNotes.slice(1000);
        
        // Riorganizza cartelle
        for (const folder of Object.values(foldersIndex)) {
          folder.notes = notesToKeep.filter(note => note.categoryId === folder.id);
          folder.noteCount = folder.notes.length;
        }
        
        // Elimina note vecchie dal storage
        for (const noteToDelete of notesToDelete) {
          localStorage.removeItem(`${this.storagePrefix}note_${noteToDelete.id}`);
        }
        
        this.setSecureItem('folders_index', foldersIndex);
        console.log(`🧹 Cleanup: eliminate ${notesToDelete.length} note vecchie`);
      }
      
    } catch (error) {
      console.error('❌ Errore cleanup:', error);
    }
  }
}

// Inizializza automaticamente quando il modulo viene caricato
window.SmartAssistantSecureStorage = null;

// Attende che il DOM sia pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.SmartAssistantSecureStorage = new SmartAssistantSecureStorage();
  });
} else {
  window.SmartAssistantSecureStorage = new SmartAssistantSecureStorage();
}

console.log('🔐 Modulo SmartAssistantSecureStorage caricato');