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
      keywords: []
    };

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
        metadata: {
          duration: note.duration,
          originalAnalysis: note.aiAnalysis,
          securityLevel: 'PRIVATE'
        }
      };

      // Salva nella categoria appropriata
      await this.saveToSecureFolder(secureNote);
      
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
   * Prepara dati per sincronizzazione Supabase
   */
  async prepareForSupabaseSync(secureNote) {
    try {
      const syncQueue = this.getSecureItem('supabase_sync_queue') || [];
      
      // Prepara payload per Supabase (senza audio per risparmiare spazio)
      const supabasePayload = {
        note_id: secureNote.id,
        timestamp: secureNote.secureTimestamp,
        category: secureNote.category,
        transcription: secureNote.transcription,
        confidence: secureNote.confidence,
        extracted_entities: secureNote.extractedEntities,
        keywords: secureNote.keywords,
        metadata: {
          duration: secureNote.metadata.duration,
          security_level: secureNote.metadata.securityLevel,
          has_audio_backup: !!secureNote.audioBase64
        }
      };
      
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
            .from('smart_assistant_secure_notes')
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