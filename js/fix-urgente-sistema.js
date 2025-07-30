/**
 * 🚨 FIX URGENTE SISTEMA - CARICAMENTO IMMEDIATO
 * 
 * Questo fix si applica SUBITO, non dopo 3-4 secondi
 */

console.log('🚨🚨🚨 [FIX URGENTE] CARICAMENTO IMMEDIATO!');

// FIX 1: TIMELINE
window.initializeTimelineWhenReady = function() {
    console.log('🔧 [FIX URGENTE] Controllo Timeline...');
    
    if (window.Timeline && window.Timeline.init) {
        try {
            window.Timeline.init();
            console.log('✅ [FIX URGENTE] Timeline inizializzata!');
        } catch (e) {
            console.error('❌ [FIX URGENTE] Errore Timeline:', e);
        }
    }
};

// FIX 2: INTERCETTA NAVIGAZIONE
const originalNavigateTo = window.navigateTo;
if (originalNavigateTo) {
    window.navigateTo = function(tabName) {
        console.log('🎯 [FIX URGENTE] Navigazione intercettata:', tabName);
        
        // Chiama l'originale
        const result = originalNavigateTo.call(this, tabName);
        
        // Se è timeline, forza inizializzazione
        if (tabName === 'timeline' || tabName === 'timeline-content') {
            console.log('📅 [FIX URGENTE] È Timeline! Forzo init...');
            setTimeout(window.initializeTimelineWhenReady, 100);
        }
        
        return result;
    };
}

// FIX 3: VOCABOLARIO CHE ORE SONO
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 [FIX URGENTE] DOM Ready, applico fix vocabolario...');
    
    // Ogni secondo controlla se vocabulary manager è pronto
    const fixVocabulary = setInterval(() => {
        let vocabularyManager = null;
        
        // Cerca in tutti i modi possibili
        if (window.vocabularyManager) {
            vocabularyManager = window.vocabularyManager;
        } else if (window.getVocabularyManager) {
            vocabularyManager = window.getVocabularyManager();
        } else if (window.robustConnectionManager?.instances?.vocabularyManager) {
            vocabularyManager = window.robustConnectionManager.instances.vocabularyManager;
        }
        
        if (vocabularyManager && vocabularyManager.addCommand) {
            console.log('✅ [FIX URGENTE] VocabularyManager trovato!');
            
            // Aggiungi comandi sistema
            const systemCommands = [
                {
                    id: 'sys_che_ore_sono',
                    pattern: 'che ore sono',
                    action: 'system_info',
                    params: { type: 'time' },
                    priority: 100
                },
                {
                    id: 'sys_che_ora_e',
                    pattern: 'che ora è',
                    action: 'system_info',
                    params: { type: 'time' },
                    priority: 100
                },
                {
                    id: 'sys_che_giorno_e',
                    pattern: 'che giorno è',
                    action: 'system_info',
                    params: { type: 'date' },
                    priority: 100
                }
            ];
            
            systemCommands.forEach(cmd => {
                try {
                    vocabularyManager.addCommand(cmd);
                    console.log(`✅ [FIX URGENTE] Comando aggiunto: "${cmd.pattern}"`);
                } catch (e) {
                    // Ignora se già esiste
                }
            });
            
            clearInterval(fixVocabulary);
        }
    }, 500);
    
    // Stop dopo 10 secondi
    setTimeout(() => clearInterval(fixVocabulary), 10000);
});

// FIX 4: MIDDLEWARE SYSTEM INFO
const fixMiddleware = setInterval(() => {
    if (window.aiMiddleware) {
        console.log('🔧 [FIX URGENTE] Patching AIMiddleware...');
        
        // Assicura handleSystemInfo
        if (!window.aiMiddleware.handleSystemInfo) {
            window.aiMiddleware.handleSystemInfo = function(params) {
                const { type = 'time' } = params;
                const now = new Date();
                
                if (type === 'time') {
                    const hours = now.getHours().toString().padStart(2, '0');
                    const minutes = now.getMinutes().toString().padStart(2, '0');
                    return `🕐 Sono le ${hours}:${minutes}`;
                } else {
                    const options = { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    };
                    return `📅 Oggi è ${now.toLocaleDateString('it-IT', options)}`;
                }
            };
        }
        
        // Patch executeLocalAction
        const original = window.aiMiddleware.executeLocalAction;
        window.aiMiddleware.executeLocalAction = async function(command, message, context) {
            console.log('🎯 [FIX URGENTE] Comando:', command.action);
            
            if (command.action === 'system_info') {
                return this.handleSystemInfo(command.params || {});
            }
            
            return original.call(this, command, message, context);
        };
        
        clearInterval(fixMiddleware);
        console.log('✅ [FIX URGENTE] AIMiddleware patchato!');
    }
}, 500);

// Stop dopo 10 secondi
setTimeout(() => clearInterval(fixMiddleware), 10000);

// FIX 5: RIMUOVI STOP DEFINITIVO
const fixRobust = setInterval(() => {
    if (window.robustConnectionManager?.interceptAICall) {
        console.log('🔧 [FIX URGENTE] Rimozione STOP DEFINITIVO...');
        
        const original = window.robustConnectionManager.interceptAICall;
        
        window.robustConnectionManager.interceptAICall = async function(customMessage, isVoiceInput) {
            console.log('🎯 [FIX URGENTE] Intercettazione NO STOP');
            
            // Chiama originale ma cattura errori
            try {
                await original.call(this, customMessage, isVoiceInput);
            } catch (error) {
                console.error('❌ Errore intercettazione:', error);
                
                // Se fallisce, usa direttamente FlavioAI
                const message = customMessage || document.getElementById('ai-input')?.value || '';
                if (message && window.FlavioAIAssistant) {
                    window.FlavioAIAssistant.addMessage(message, 'user');
                    if (window.FlavioAIAssistant.processMessage) {
                        await window.FlavioAIAssistant.processMessage(message, isVoiceInput);
                    }
                }
            }
        };
        
        clearInterval(fixRobust);
        console.log('✅ [FIX URGENTE] STOP DEFINITIVO rimosso!');
    }
}, 500);

// Stop dopo 10 secondi
setTimeout(() => clearInterval(fixRobust), 10000);

console.log('✅ [FIX URGENTE] Sistema di fix urgenti attivato!');
console.log('💡 I fix si applicano automaticamente appena i componenti sono pronti');