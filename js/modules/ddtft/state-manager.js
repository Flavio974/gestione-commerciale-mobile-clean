/**
 * DDTFT State Manager
 * Gestisce lo stato dei documenti DDT/FT
 */

window.DDTFTStateManager = (function() {
    'use strict';
    
    // Stato privato
    const state = {
        documents: [],
        tempDocuments: [],
        filters: {
            type: 'all',
            searchTerm: '',
            dateFrom: null,
            dateTo: null
        },
        sort: {
            field: 'date',
            direction: 'desc'
        }
    };
    
    /**
     * Carica documenti dal localStorage
     */
    function loadDocuments() {
        try {
            const stored = localStorage.getItem('ddtftDocuments');
            if (stored) {
                state.documents = JSON.parse(stored);
                console.log(`✅ Caricati ${state.documents.length} documenti dal localStorage`);
            }
        } catch (error) {
            console.error('Errore nel caricamento documenti:', error);
            state.documents = [];
        }
        return state.documents;
    }
    
    /**
     * Salva documenti nel localStorage
     */
    function saveDocuments() {
        try {
            localStorage.setItem('ddtftDocuments', JSON.stringify(state.documents));
            console.log(`✅ Salvati ${state.documents.length} documenti nel localStorage`);
            return true;
        } catch (error) {
            console.error('Errore nel salvataggio documenti:', error);
            return false;
        }
    }
    
    /**
     * Aggiungi documento
     */
    function addDocument(doc) {
        if (!doc || !doc.id) {
            console.error('Documento non valido');
            return false;
        }
        
        // Controlla duplicati
        const exists = state.documents.some(d => d.id === doc.id);
        if (exists) {
            console.warn('Documento già esistente:', doc.id);
            return false;
        }
        
        state.documents.push(doc);
        saveDocuments();
        return true;
    }
    
    /**
     * Aggiungi documenti multipli
     */
    function addDocuments(docs) {
        if (!Array.isArray(docs)) {
            return false;
        }
        
        let added = 0;
        docs.forEach(doc => {
            if (addDocument(doc)) {
                added++;
            }
        });
        
        console.log(`✅ Aggiunti ${added} documenti su ${docs.length}`);
        return added;
    }
    
    /**
     * Rimuovi documento
     */
    function removeDocument(docId) {
        const index = state.documents.findIndex(d => d.id === docId);
        if (index === -1) {
            return false;
        }
        
        state.documents.splice(index, 1);
        saveDocuments();
        return true;
    }
    
    /**
     * Ottieni documento per ID
     */
    function getDocument(docId) {
        return state.documents.find(d => d.id === docId);
    }
    
    /**
     * Ottieni tutti i documenti
     */
    function getAllDocuments() {
        return [...state.documents];
    }
    
    /**
     * Ottieni documenti filtrati
     */
    function getFilteredDocuments() {
        let filtered = [...state.documents];
        
        // Filtro tipo
        if (state.filters.type !== 'all') {
            filtered = filtered.filter(d => d.type === state.filters.type);
        }
        
        // Filtro ricerca
        if (state.filters.searchTerm) {
            const term = state.filters.searchTerm.toLowerCase();
            filtered = filtered.filter(d => 
                (d.clientName && d.clientName.toLowerCase().includes(term)) ||
                (d.number && d.number.toLowerCase().includes(term)) ||
                (d.vatNumber && d.vatNumber.toLowerCase().includes(term))
            );
        }
        
        // Filtro date
        if (state.filters.dateFrom) {
            filtered = filtered.filter(d => d.date >= state.filters.dateFrom);
        }
        if (state.filters.dateTo) {
            filtered = filtered.filter(d => d.date <= state.filters.dateTo);
        }
        
        // Ordinamento
        filtered.sort((a, b) => {
            const aVal = a[state.sort.field] || '';
            const bVal = b[state.sort.field] || '';
            
            if (state.sort.direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        return filtered;
    }
    
    /**
     * Imposta filtro
     */
    function setFilter(filterName, value) {
        if (filterName in state.filters) {
            state.filters[filterName] = value;
            return true;
        }
        return false;
    }
    
    /**
     * Reset filtri
     */
    function resetFilters() {
        state.filters = {
            type: 'all',
            searchTerm: '',
            dateFrom: null,
            dateTo: null
        };
    }
    
    /**
     * Imposta ordinamento
     */
    function setSort(field, direction = 'asc') {
        state.sort.field = field;
        state.sort.direction = direction;
    }
    
    /**
     * Cancella tutti i documenti
     */
    function clearAllDocuments() {
        state.documents = [];
        state.tempDocuments = [];
        saveDocuments();
        
        // Pulisci anche sessionStorage
        sessionStorage.removeItem('tempDocuments');
        
        return true;
    }
    
    /**
     * Gestione documenti temporanei
     */
    function getTempDocuments() {
        // Prima prova sessionStorage
        const sessionTemp = sessionStorage.getItem('tempDocuments');
        if (sessionTemp) {
            try {
                state.tempDocuments = JSON.parse(sessionTemp);
            } catch (e) {
                console.error('Errore parsing temp documents:', e);
            }
        }
        return [...state.tempDocuments];
    }
    
    function setTempDocuments(docs) {
        state.tempDocuments = docs;
        sessionStorage.setItem('tempDocuments', JSON.stringify(docs));
    }
    
    function clearTempDocuments() {
        state.tempDocuments = [];
        sessionStorage.removeItem('tempDocuments');
    }
    
    /**
     * Statistiche documenti
     */
    function getStatistics() {
        const stats = {
            total: state.documents.length,
            ddt: 0,
            ft: 0,
            totalAmount: 0,
            clients: new Set(),
            dateRange: { min: null, max: null }
        };
        
        state.documents.forEach(doc => {
            // Conta per tipo
            if (doc.type === 'ddt') stats.ddt++;
            else if (doc.type === 'ft') stats.ft++;
            
            // Somma totali
            stats.totalAmount += parseFloat(doc.total || 0);
            
            // Clienti unici
            if (doc.clientName) {
                stats.clients.add(doc.clientName);
            }
            
            // Range date
            if (doc.date) {
                if (!stats.dateRange.min || doc.date < stats.dateRange.min) {
                    stats.dateRange.min = doc.date;
                }
                if (!stats.dateRange.max || doc.date > stats.dateRange.max) {
                    stats.dateRange.max = doc.date;
                }
            }
        });
        
        stats.uniqueClients = stats.clients.size;
        delete stats.clients; // Non serve l'oggetto Set
        
        return stats;
    }
    
    /**
     * Verifica duplicati
     */
    function checkDuplicates(newDocs) {
        const duplicates = [];
        const unique = [];
        
        newDocs.forEach(newDoc => {
            // Crea chiave univoca basata su numero documento e tipo
            const key = `${newDoc.type}_${newDoc.number}`;
            
            const isDuplicate = state.documents.some(existing => 
                existing.type === newDoc.type && 
                existing.number === newDoc.number
            );
            
            if (isDuplicate) {
                duplicates.push(newDoc);
            } else {
                unique.push(newDoc);
            }
        });
        
        return { duplicates, unique };
    }
    
    // Esporta le funzioni pubbliche
    return {
        // Gestione documenti
        loadDocuments,
        saveDocuments,
        addDocument,
        addDocuments,
        removeDocument,
        getDocument,
        getAllDocuments,
        getFilteredDocuments,
        clearAllDocuments,
        
        // Filtri e ordinamento
        setFilter,
        resetFilters,
        setSort,
        
        // Documenti temporanei
        getTempDocuments,
        setTempDocuments,
        clearTempDocuments,
        
        // Utilità
        getStatistics,
        checkDuplicates,
        
        // Accesso diretto allo stato (solo per debug)
        _getState: () => state
    };
})();

console.log('✅ DDTFT State Manager caricato');