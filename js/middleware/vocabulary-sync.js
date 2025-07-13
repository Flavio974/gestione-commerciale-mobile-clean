/**
 * Vocabulary Sync - Sincronizzatore automatico tra vecchio sistema .txt e nuovo sistema .json
 * Permette di aggiungere comandi nel file .txt e li converte automaticamente nel nuovo sistema
 */

class VocabularySync {
    constructor() {
        this.txtPath = '/comandi/vocabolario_comandi.txt';
        this.jsonPath = 'js/middleware/vocabulary.json';
        this.lastTxtModified = null;
        this.syncInterval = null;
        this.isInitialized = false;
        this.debug = true;
        
        console.log('🔄 VocabularySync: Inizializzazione sincronizzatore...');
        this.startSync();
    }

    /**
     * Avvia il monitoraggio e sincronizzazione automatica
     */
    async startSync() {
        try {
            // Carica stato iniziale
            await this.loadInitialState();
            
            // Avvia monitoraggio ogni 3 secondi
            this.syncInterval = setInterval(() => {
                this.checkForUpdates();
            }, 3000);
            
            this.isInitialized = true;
            console.log('✅ VocabularySync: Sincronizzazione attiva');
            
        } catch (error) {
            console.error('❌ VocabularySync: Errore inizializzazione:', error);
        }
    }

    /**
     * Carica lo stato iniziale dei file
     */
    async loadInitialState() {
        try {
            const response = await fetch(this.txtPath, {
                method: 'HEAD',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            this.lastTxtModified = response.headers.get('Last-Modified') || new Date().toISOString();
            
            if (this.debug) {
                console.log('🔄 SYNC: Stato iniziale caricato:', this.lastTxtModified);
            }
            
        } catch (error) {
            console.warn('⚠️ SYNC: Impossibile caricare stato iniziale:', error.message);
        }
    }

    /**
     * Controlla se il file .txt è stato modificato
     */
    async checkForUpdates() {
        try {
            const response = await fetch(this.txtPath, {
                method: 'HEAD',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            const currentModified = response.headers.get('Last-Modified');
            
            if (currentModified && currentModified !== this.lastTxtModified) {
                if (this.debug) {
                    console.log('🔄 SYNC: Rilevata modifica al file .txt - Sincronizzazione in corso...');
                }
                
                await this.syncFromTxtToJson();
                this.lastTxtModified = currentModified;
            }
            
        } catch (error) {
            if (this.debug) {
                console.log('🔄 SYNC: Errore controllo aggiornamenti:', error.message);
            }
        }
    }

    /**
     * Sincronizza dal file .txt al file .json
     */
    async syncFromTxtToJson() {
        try {
            // 1. Leggi il file .txt
            const txtContent = await this.loadTxtFile();
            
            // 2. Parsifica i comandi dal .txt
            const parsedCommands = this.parseTxtCommands(txtContent);
            
            // 3. Carica il JSON esistente
            const currentJson = await this.loadJsonFile();
            
            // 4. Merge i comandi mantenendo quelli esistenti
            const mergedCommands = this.mergeCommands(currentJson.commands, parsedCommands);
            
            // 5. Aggiorna il JSON
            const updatedJson = {
                ...currentJson,
                commands: mergedCommands,
                lastSyncFromTxt: new Date().toISOString(),
                syncVersion: (currentJson.syncVersion || 0) + 1
            };
            
            // 6. Salva (per ora solo log, in futuro API di salvataggio)
            this.logJsonUpdate(updatedJson);
            
            // 7. Notifica al VocabularyManager di ricaricare
            if (window.vocabularyManager) {
                await window.vocabularyManager.loadVocabulary(true);
            }
            
            console.log('✅ SYNC: Sincronizzazione completata:', {
                nuoviComandi: parsedCommands.length,
                comandiTotali: mergedCommands.length,
                versione: updatedJson.syncVersion
            });
            
        } catch (error) {
            console.error('❌ SYNC: Errore sincronizzazione:', error);
        }
    }

    /**
     * Carica il contenuto del file .txt
     */
    async loadTxtFile() {
        const response = await fetch(this.txtPath + '?t=' + Date.now(), {
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) {
            throw new Error(`Errore lettura .txt: ${response.status}`);
        }
        
        return await response.text();
    }

    /**
     * Carica il file JSON esistente
     */
    async loadJsonFile() {
        try {
            const response = await fetch(this.jsonPath + '?t=' + Date.now(), {
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`Errore lettura JSON: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            // Fallback: struttura base se il file non esiste
            return this.getBaseJsonStructure();
        }
    }

    /**
     * Parsifica i comandi dal formato .txt
     */
    parseTxtCommands(txtContent) {
        const lines = txtContent.split('\n').map(line => line.trim()).filter(line => line);
        const commands = [];
        let currentCategory = 'generale';
        
        for (const line of lines) {
            // Categoria
            if (line.startsWith('# CATEGORIA:')) {
                currentCategory = line.replace('# CATEGORIA:', '').trim().toLowerCase();
                continue;
            }
            
            // Salta commenti e linee vuote
            if (line.startsWith('#') || !line) {
                continue;
            }
            
            // Comando
            const command = this.convertTxtLineToJsonCommand(line, currentCategory);
            if (command) {
                commands.push(command);
            }
        }
        
        return commands;
    }

    /**
     * Converte una linea .txt in comando JSON
     */
    convertTxtLineToJsonCommand(line, category) {
        // Genera ID univoco dal pattern
        const baseId = this.generateCommandId(line, category);
        
        // Converti [PARAMETRO] in {parametro}
        const jsonPattern = line.replace(/\[([^\]]+)\]/g, '{$1}');
        
        // Determina l'azione basata sulla categoria e contenuto
        const action = this.determineAction(line, category);
        
        // Estrai parametri
        const params = this.extractParameters(line, action);
        
        return {
            id: baseId,
            patterns: [jsonPattern],
            action: action,
            params: params,
            description: `Comando da categoria ${category}`,
            source: 'txt_sync',
            category: category
        };
    }

    /**
     * Genera ID comando dal pattern
     */
    generateCommandId(line, category) {
        const cleanLine = line.toLowerCase()
            .replace(/\[([^\]]+)\]/g, '$1')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 30);
        
        return `${category}_${cleanLine}`;
    }

    /**
     * Determina l'azione basata sul contenuto
     */
    determineAction(line, category) {
        const lowerLine = line.toLowerCase();
        
        // Mapping categorie -> azioni
        const categoryActions = {
            'data e ora': 'getDateInfo',
            'fatturato e ordini': 'getOrdersByClient',
            'percorsi e spostamenti': 'getRouteInfo',
            'timeline e appuntamenti': 'createAppointment',
            'analisi e report': 'getReport',
            'sistema e database': 'systemAction',
            'gestione clienti': 'getClientInfo'
        };
        
        // Azione basata su categoria
        if (categoryActions[category]) {
            return categoryActions[category];
        }
        
        // Azione basata su parole chiave
        if (lowerLine.includes('data') || lowerLine.includes('giorno') || lowerLine.includes('ora')) {
            return 'getDateInfo';
        }
        if (lowerLine.includes('ordini') || lowerLine.includes('fatturato')) {
            return 'getOrdersByClient';
        }
        if (lowerLine.includes('tempo') || lowerLine.includes('percorso')) {
            return 'getRouteInfo';
        }
        if (lowerLine.includes('appuntamento')) {
            return 'createAppointment';
        }
        if (lowerLine.includes('cliente')) {
            return 'getClientInfo';
        }
        
        return 'genericAction';
    }

    /**
     * Estrai parametri dalla linea
     */
    extractParameters(line, action) {
        const params = {};
        
        // Trova tutti i parametri [NOME]
        const paramMatches = line.match(/\[([^\]]+)\]/g);
        if (paramMatches) {
            paramMatches.forEach(match => {
                const paramName = match.replace(/[\[\]]/g, '').toLowerCase();
                params[paramName] = `{${paramName}}`;
            });
        }
        
        // Parametri specifici per azione
        switch (action) {
            case 'getDateInfo':
                if (!params.date && line.includes('oggi')) params.date = 'today';
                if (!params.date && line.includes('ieri')) params.date = 'yesterday';
                if (!params.date && line.includes('domani')) params.date = 'tomorrow';
                break;
                
            case 'getOrdersByClient':
                if (!params.client) params.client = '{cliente}';
                break;
                
            case 'createAppointment':
                params.durata = '60';
                break;
        }
        
        return params;
    }

    /**
     * Merge comandi esistenti con nuovi
     */
    mergeCommands(existingCommands, newCommands) {
        const merged = [...existingCommands];
        const existingIds = new Set(existingCommands.map(cmd => cmd.id));
        
        for (const newCmd of newCommands) {
            if (!existingIds.has(newCmd.id)) {
                merged.push(newCmd);
                if (this.debug) {
                    console.log('📝 SYNC: Nuovo comando aggiunto:', newCmd.id);
                }
            } else {
                // Aggiorna pattern se necessario
                const existingCmd = merged.find(cmd => cmd.id === newCmd.id);
                if (existingCmd && existingCmd.source === 'txt_sync') {
                    // Merge patterns
                    const newPatterns = newCmd.patterns.filter(p => !existingCmd.patterns.includes(p));
                    if (newPatterns.length > 0) {
                        existingCmd.patterns.push(...newPatterns);
                        if (this.debug) {
                            console.log('🔄 SYNC: Pattern aggiornati per:', newCmd.id);
                        }
                    }
                }
            }
        }
        
        return merged;
    }

    /**
     * Struttura JSON base
     */
    getBaseJsonStructure() {
        return {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
            commands: [],
            settings: {
                enableDebug: true,
                cacheTimeout: 300000,
                similarityThreshold: 0.8,
                autoReload: true,
                fallbackToAI: true
            }
        };
    }

    /**
     * Log dell'aggiornamento JSON (in futuro: salvataggio reale)
     */
    logJsonUpdate(updatedJson) {
        if (this.debug) {
            console.log('📄 SYNC: JSON aggiornato:', {
                version: updatedJson.version,
                commands: updatedJson.commands.length,
                lastSync: updatedJson.lastSyncFromTxt,
                syncVersion: updatedJson.syncVersion
            });
            
            // In futuro: salvare il file realmente
            // await this.saveJsonFile(updatedJson);
        }
    }

    /**
     * Ferma la sincronizzazione
     */
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('🔄 SYNC: Sincronizzazione fermata');
        }
    }

    /**
     * Stato della sincronizzazione
     */
    getStatus() {
        return {
            isActive: !!this.syncInterval,
            isInitialized: this.isInitialized,
            lastCheck: this.lastTxtModified,
            txtPath: this.txtPath,
            jsonPath: this.jsonPath
        };
    }

    /**
     * Forza sincronizzazione manuale
     */
    async forcSync() {
        console.log('🔄 SYNC: Sincronizzazione forzata...');
        await this.syncFromTxtToJson();
    }
}

// Esporta classe per uso globale
window.VocabularySync = VocabularySync;

// Auto-inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (!window.vocabularySync) {
            window.vocabularySync = new VocabularySync();
            console.log('✅ VocabularySync disponibile globalmente come window.vocabularySync');
            console.log('🔄 Per sincronizzazione manuale: window.vocabularySync.forceSync()');
        }
    } catch (error) {
        console.error('❌ Errore inizializzazione VocabularySync:', error);
    }
});