// Fix per errori post-refactoring
console.log('🔧 FIX ERRORI REFACTORING - Avvio...');

// FIX 1: Pulisce vocabulary_user corrotto nel localStorage
function fixVocabularyUserStorage() {
  console.log('🔍 Controllo vocabulary_user nel localStorage...');
  
  const stored = localStorage.getItem('vocabulary_user');
  
  if (stored) {
    try {
      // Prova a parsare come JSON
      JSON.parse(stored);
      console.log('✅ vocabulary_user è già JSON valido');
    } catch (error) {
      console.log('❌ vocabulary_user contiene dati non-JSON, pulizia in corso...');
      
      // Se inizia con # è probabilmente markdown
      if (stored.startsWith('#') || stored.includes('CATEGORI')) {
        console.log('🗑️ Rilevato contenuto markdown, rimozione...');
        localStorage.removeItem('vocabulary_user');
        console.log('✅ vocabulary_user rimosso - verrà ricreato vuoto');
      } else {
        // Prova a salvare array vuoto
        localStorage.setItem('vocabulary_user', '[]');
        console.log('✅ vocabulary_user resettato ad array vuoto');
      }
    }
  } else {
    console.log('ℹ️ vocabulary_user non presente nel localStorage');
  }
}

// FIX 2: Corregge SmartAssistantSecureStorage aggiungendo categoria mancante
function fixSecureStorageCategories() {
  console.log('🔍 Controllo categorie SmartAssistantSecureStorage...');
  
  if (window.smartAssistantSecureStorage?.foldersIndex) {
    const foldersIndex = window.smartAssistantSecureStorage.foldersIndex;
    
    // Aggiunge categoria dinamica per clienti
    const addClientCategory = (clientName) => {
      const categoryKey = `CLIENTE_${clientName.toUpperCase().replace(/\s+/g, '_')}`;
      
      if (!foldersIndex[categoryKey]) {
        console.log(`📁 Creazione categoria mancante: ${categoryKey}`);
        
        foldersIndex[categoryKey] = {
          id: categoryKey.toLowerCase(),
          name: `Cliente: ${clientName}`,
          icon: '👤',
          noteCount: 0,
          notes: [],
          lastUpdated: new Date().toISOString(),
          isClientFolder: true
        };
        
        console.log(`✅ Categoria ${categoryKey} creata`);
      }
    };
    
    // Aggiungi la categoria per Cascina Sant se necessario
    addClientCategory('CASCINA SANT');
    
    // Hook per intercettare futuri errori
    const originalSaveToSecureFolder = window.smartAssistantSecureStorage.saveToSecureFolder;
    
    window.smartAssistantSecureStorage.saveToSecureFolder = function(secureNote) {
      // Se è una categoria cliente, creala al volo
      if (secureNote.category && secureNote.category.startsWith('CLIENTE_')) {
        const clientName = secureNote.category.replace('CLIENTE_', '').replace(/_/g, ' ');
        addClientCategory(clientName);
      }
      
      // Chiama metodo originale
      return originalSaveToSecureFolder.call(this, secureNote);
    };
    
    console.log('✅ Fix categorie dinamiche installato');
  } else {
    console.log('⚠️ SmartAssistantSecureStorage non ancora disponibile');
  }
}

// FIX 3: Disabilita temporaneamente provider Gemini
function fixGeminiProvider() {
  console.log('🔍 Controllo provider AI...');
  
  // Rimuove Gemini dalla configurazione
  if (window.AI_CONFIG?.PROVIDERS) {
    delete window.AI_CONFIG.PROVIDERS.gemini;
    console.log('✅ Provider Gemini rimosso dalla configurazione');
  }
  
  // Imposta Anthropic come default se disponibile
  if (window.flavioAI && window.AI_CONFIG?.PROVIDERS?.anthropic) {
    window.flavioAI.setProvider('anthropic');
    console.log('✅ Anthropic impostato come provider predefinito');
  }
}

// FIX 4: Aggiunge metodo getClientsCount mancante
function fixGetClientsCount() {
  console.log('🔍 Controllo getClientsCount...');
  
  if (window.supabaseAI && !window.supabaseAI.getClientsCount) {
    window.supabaseAI.getClientsCount = async function() {
      console.log('📊 getClientsCount chiamato');
      
      try {
        // Usa Supabase per contare i clienti
        if (window.supabase) {
          const { count, error } = await window.supabase
            .from('clienti')
            .select('*', { count: 'exact', head: true });
          
          if (error) throw error;
          
          console.log(`✅ Conteggio clienti: ${count}`);
          return count || 0;
        }
        
        // Fallback su dati locali
        const clientiData = localStorage.getItem('clienti_data');
        if (clientiData) {
          const clienti = JSON.parse(clientiData);
          return Array.isArray(clienti) ? clienti.length : 0;
        }
        
        return 0;
      } catch (error) {
        console.error('❌ Errore conteggio clienti:', error);
        return 0;
      }
    };
    
    console.log('✅ Metodo getClientsCount aggiunto');
  }
}

// Esegue tutti i fix
function applyAllFixes() {
  console.log('🚀 APPLICAZIONE FIX REFACTORING...\n');
  
  fixVocabularyUserStorage();
  console.log('');
  
  fixSecureStorageCategories();
  console.log('');
  
  fixGeminiProvider();
  console.log('');
  
  fixGetClientsCount();
  console.log('');
  
  console.log('✅ TUTTI I FIX APPLICATI!\n');
  console.log('🔄 Ricarica la pagina per verificare che gli errori siano risolti');
}

// Applica fix immediatamente
applyAllFixes();

// Espone funzioni per debug
window.refactoringFixes = {
  fixVocabularyUserStorage,
  fixSecureStorageCategories,
  fixGeminiProvider,
  fixGetClientsCount,
  applyAllFixes
};

console.log('💡 Usa window.refactoringFixes per riapplicare fix specifici');