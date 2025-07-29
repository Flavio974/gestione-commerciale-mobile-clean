/**
 * SISTEMA AUTO-SYNC VOCABOLARIO
 * Aggiungi questo codice in vocabulary-manager.js
 */

class VocabularyAutoSync {
    constructor() {
        this.version = '1.0.0';
        this.debug = localStorage.getItem('ai_debug') === 'true';
        console.log('🔄 VocabularyAutoSync inizializzato');
    }

    /**
     * 🔄 Sincronizza automaticamente vocabolario utente con vocabulary.json
     */
    async syncVocabularies() {
        try {
            console.log('🔄 Inizio sincronizzazione vocabolari...');
            
            // 1. Carica vocabolario utente
            const userVocab = this.loadUserVocabulary();
            
            // 2. Carica vocabulary.json
            const systemVocab = await this.loadSystemVocabulary();
            
            // 3. Confronta e allinea
            const aligned = this.alignVocabularies(userVocab, systemVocab);
            
            // 4. Salva modifiche
            if (aligned.hasChanges) {
                this.saveAlignedVocabularies(aligned.userVocab, aligned.systemVocab);
                console.log(`✅ Sincronizzazione completata: ${aligned.changes} modifiche applicate`);
            } else {
                console.log('✅ Vocabolari già allineati');
            }
            
            return aligned;
            
        } catch (error) {
            console.error('❌ Errore sincronizzazione:', error);
            throw error;
        }
    }

    /**
     * 📥 Carica vocabolario utente
     */
    loadUserVocabulary() {
        const userVocabStr = localStorage.getItem('user_vocabulary_v2');
        return userVocabStr ? JSON.parse(userVocabStr) : [];
    }

    /**
     * 📥 Carica vocabulary.json
     */
    async loadSystemVocabulary() {
        try {
            const response = await fetch('js/middleware/vocabulary.json');
            return await response.json();
        } catch (error) {
            console.error('Errore caricamento vocabulary.json:', error);
            return { categories: {} };
        }
    }

    /**
     * 🔧 Allinea i vocabolari
     */
    alignVocabularies(userVocab, systemVocab) {
        let changes = 0;
        const hasChanges = false;
        
        // Crea mappa pattern -> action dal system vocab
        const systemPatternMap = new Map();
        Object.values(systemVocab.categories || {}).forEach(category => {
            (category.commands || []).forEach(cmd => {
                systemPatternMap.set(cmd.pattern, cmd);
            });
        });
        
        // Aggiorna action nel vocabolario utente
        const alignedUserVocab = userVocab.map(userCmd => {
            const systemCmd = systemPatternMap.get(userCmd.pattern);
            if (systemCmd && userCmd.action !== systemCmd.action) {
                changes++;
                if (this.debug) {
                    console.log(`🔄 Allineo: "${userCmd.pattern}" → action: ${systemCmd.action}`);
                }
                return { ...userCmd, action: systemCmd.action };
            }
            return userCmd;
        });
        
        return {
            userVocab: alignedUserVocab,
            systemVocab: systemVocab,
            hasChanges: changes > 0,
            changes: changes
        };
    }

    /**
     * 💾 Salva vocabolari allineati
     */
    saveAlignedVocabularies(userVocab, systemVocab) {
        // Salva vocabolario utente aggiornato
        localStorage.setItem('user_vocabulary_v2', JSON.stringify(userVocab));
        
        // NOTA: Per salvare systemVocab servirebbe un endpoint backend
        // Per ora logghiamo solo le modifiche necessarie
        if (this.debug) {
            console.log('📝 Vocabolario utente aggiornato nel localStorage');
            console.log('⚠️ vocabulary.json richiede aggiornamento manuale');
        }
    }

    /**
     * ➕ Aggiungi nuovo comando con sync automatico
     */
    async addCommand(pattern, action, params = {}) {
        try {
            // 1. Aggiungi al vocabolario utente
            const userVocab = this.loadUserVocabulary();
            const newCommand = {
                id: `user_cmd_${Date.now()}`,
                pattern: pattern,
                action: action,
                params: params,
                createdAt: new Date().toISOString()
            };
            
            userVocab.push(newCommand);
            localStorage.setItem('user_vocabulary_v2', JSON.stringify(userVocab));
            
            // 2. Verifica se l'action esiste nel middleware
            const middlewareActions = this.getMiddlewareActions();
            if (!middlewareActions.includes(action)) {
                console.warn(`⚠️ Action "${action}" non trovata nel middleware!`);
                console.warn('Aggiungi questo case in ai-middleware.js:');
                console.warn(`case '${action}':\n    result = await this.handle${this.toPascalCase(action)}(params, originalMessage, originalContext);\n    break;`);
            }
            
            // 3. Log per aggiornamento manuale di vocabulary.json
            console.log('📝 Aggiungi questo comando a vocabulary.json:');
            console.log(JSON.stringify({
                id: newCommand.id,
                pattern: pattern,
                action: action,
                params: params
            }, null, 2));
            
            return newCommand;
            
        } catch (error) {
            console.error('❌ Errore aggiunta comando:', error);
            throw error;
        }
    }

    /**
     * 🔍 Ottieni lista action dal middleware
     */
    getMiddlewareActions() {
        // Lista delle action conosciute nel middleware
        return [
            'universal_query',
            'universal_action',
            'system_info',
            'generate_report',
            'help',
            'getOrderDate',
            'getOrderProducts',
            'getDeliveryDate',
            'extractDeliveryFromPDF',
            'processOrdersPDF',
            'calculateRoute',
            'optimizeRoute',
            'getTimeInfo',
            'getDateInfo',
            'getDateTimeInfo',
            'getHistoricalDate',
            'getFutureDate',
            'getDayOfWeek',
            'syncDatabase',
            'checkDatabaseConnection',
            'getSyncStatus',
            'clearCache',
            'clearTable',
            'createBackup',
            'restoreBackup',
            'testPDFParser',
            'validateDeliveryExtraction',
            'getOrdersGroupedByClient'
        ];
    }

    /**
     * 🔤 Converti a PascalCase
     */
    toPascalCase(str) {
        return str.replace(/(^|_)(\w)/g, (_, __, letter) => letter.toUpperCase());
    }

    /**
     * 🔍 Verifica allineamento
     */
    async checkAlignment() {
        const userVocab = this.loadUserVocabulary();
        const systemVocab = await this.loadSystemVocabulary();
        
        const issues = [];
        
        // Verifica ogni comando utente
        userVocab.forEach(userCmd => {
            // Cerca nel system vocab
            let found = false;
            Object.values(systemVocab.categories || {}).forEach(category => {
                const systemCmd = (category.commands || []).find(c => c.pattern === userCmd.pattern);
                if (systemCmd) {
                    found = true;
                    if (systemCmd.action !== userCmd.action) {
                        issues.push({
                            type: 'action_mismatch',
                            pattern: userCmd.pattern,
                            userAction: userCmd.action,
                            systemAction: systemCmd.action
                        });
                    }
                }
            });
            
            if (!found) {
                issues.push({
                    type: 'missing_in_system',
                    pattern: userCmd.pattern,
                    action: userCmd.action
                });
            }
        });
        
        return {
            aligned: issues.length === 0,
            issues: issues
        };
    }
}

// Inizializza e esporta
window.vocabularyAutoSync = new VocabularyAutoSync();

// Auto-sync all'avvio
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.vocabularyAutoSync.syncVocabularies();
        
        // Verifica allineamento
        const alignment = await window.vocabularyAutoSync.checkAlignment();
        if (!alignment.aligned) {
            console.warn('⚠️ Problemi di allineamento trovati:', alignment.issues.length);
            if (window.vocabularyAutoSync.debug) {
                console.table(alignment.issues);
            }
        }
    } catch (error) {
        console.error('Errore auto-sync vocabolario:', error);
    }
});

// Funzione helper globale per aggiungere comandi
window.addVocabularyCommand = async (pattern, action, params) => {
    return await window.vocabularyAutoSync.addCommand(pattern, action, params);
};

console.log('✅ Sistema Auto-Sync Vocabolario caricato');
console.log('📝 Per aggiungere un comando: addVocabularyCommand("pattern", "action", {params})');
console.log('🔄 Per sincronizzare: vocabularyAutoSync.syncVocabularies()');
console.log('🔍 Per verificare: vocabularyAutoSync.checkAlignment()');