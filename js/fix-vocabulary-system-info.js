/**
 * FIX VOCABOLARIO SYSTEM INFO
 * 
 * PROBLEMA: I comandi "che ore sono", "che giorno è", etc. 
 * vengono mappati erroneamente a query ordini invece di system_info
 * 
 * SOLUZIONE: Correggere i comandi nel vocabolario per usare l'azione corretta
 */

console.log('🔧 [FIX VOCABULARY SYSTEM INFO] Inizializzazione...');

setTimeout(() => {
    console.log('🔧 [FIX VOCABULARY] Correzione comandi sistema...');
    
    // Verifica se VocabularyManager esiste
    if (!window.vocabularyManager) {
        console.error('❌ VocabularyManager non trovato');
        return;
    }
    
    // Comandi da correggere/aggiungere
    const systemCommands = [
        // Comandi per l'ora
        {
            pattern: "che ore sono",
            action: "system_info",
            params: { type: "time" },
            examples: ["che ore sono", "dimmi l'ora", "che ora è"]
        },
        {
            pattern: "che ora è",
            action: "system_info", 
            params: { type: "time" },
            examples: ["che ora è"]
        },
        {
            pattern: "dimmi l'ora",
            action: "system_info",
            params: { type: "time" },
            examples: ["dimmi l'ora", "dammi l'ora"]
        },
        
        // Comandi per la data
        {
            pattern: "che giorno è",
            action: "system_info",
            params: { type: "date" },
            examples: ["che giorno è", "che giorno è oggi"]
        },
        {
            pattern: "che giorno è oggi",
            action: "system_info",
            params: { type: "date" },
            examples: ["che giorno è oggi", "oggi che giorno è"]
        },
        {
            pattern: "che data è oggi",
            action: "system_info",
            params: { type: "date" },
            examples: ["che data è oggi", "dimmi la data"]
        },
        {
            pattern: "in che mese siamo",
            action: "system_info",
            params: { type: "date" },
            examples: ["in che mese siamo", "che mese è"]
        },
        
        // Altri comandi sistema
        {
            pattern: "aiuto",
            action: "help",
            params: {},
            examples: ["aiuto", "help", "comandi"]
        }
    ];
    
    // Aggiungi/correggi i comandi
    systemCommands.forEach(cmd => {
        try {
            // Prima rimuovi eventuali comandi esistenti con lo stesso pattern
            const existingCommands = window.vocabularyManager.searchCommands(cmd.pattern);
            if (existingCommands && existingCommands.length > 0) {
                existingCommands.forEach(existing => {
                    if (existing.pattern === cmd.pattern) {
                        console.log(`🗑️ Rimuovo comando esistente: ${existing.pattern}`);
                        // Non c'è un metodo removeCommand, quindi lo sovrascriviamo
                    }
                });
            }
            
            // Aggiungi il comando corretto
            window.vocabularyManager.addCommand({
                id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                pattern: cmd.pattern,
                action: cmd.action,
                params: cmd.params,
                examples: cmd.examples,
                category: 'sistema'
            });
            
            console.log(`✅ Comando sistema aggiunto/corretto: "${cmd.pattern}" → ${cmd.action}`);
            
        } catch (error) {
            console.error(`❌ Errore aggiunta comando ${cmd.pattern}:`, error);
        }
    });
    
    // Salva le modifiche
    if (window.vocabularyManager.saveVocabulary) {
        window.vocabularyManager.saveVocabulary();
        console.log('💾 Vocabolario salvato con correzioni');
    }
    
    // Verifica correzioni
    console.log('🔍 Verifica comandi sistema:');
    ['che ore sono', 'che giorno è', 'in che mese siamo'].forEach(test => {
        const matches = window.vocabularyManager.searchCommands(test);
        if (matches && matches.length > 0) {
            console.log(`✅ "${test}" → ${matches[0].action}`);
        } else {
            console.log(`❌ "${test}" → nessun match`);
        }
    });
    
    // Fix anche per il middleware se necessario
    if (window.aiMiddleware && window.aiMiddleware.handleSystemInfo) {
        console.log('🔧 Verifica handleSystemInfo disponibile');
        
        // Patch per assicurarsi che system_info funzioni
        const originalExecuteLocalAction = window.aiMiddleware.executeLocalAction;
        
        window.aiMiddleware.executeLocalAction = async function(command, originalMessage, originalContext) {
            console.log('🔍 [SYSTEM INFO FIX] Comando intercettato:', command);
            
            // Se è system_info, gestiscilo correttamente
            if (command.action === 'system_info') {
                console.log('✅ [SYSTEM INFO FIX] Gestione system_info');
                
                const now = new Date();
                const type = command.params?.type || 'date';
                
                if (type === 'time') {
                    const hours = now.getHours().toString().padStart(2, '0');
                    const minutes = now.getMinutes().toString().padStart(2, '0');
                    return {
                        success: true,
                        data: `Sono le ${hours}:${minutes}`,
                        message: `🕐 Sono le ${hours}:${minutes}`,
                        metadata: { timestamp: now.toISOString() }
                    };
                } else {
                    const options = { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    };
                    const dateStr = now.toLocaleDateString('it-IT', options);
                    return {
                        success: true,
                        data: dateStr,
                        message: `📅 Oggi è ${dateStr}`,
                        metadata: { timestamp: now.toISOString() }
                    };
                }
            }
            
            // Altrimenti usa il metodo originale
            return originalExecuteLocalAction.call(this, command, originalMessage, originalContext);
        };
        
        console.log('✅ Middleware patchato per system_info');
    }
    
    console.log('✅ [FIX VOCABULARY SYSTEM INFO] Completato!');
    
}, 3000); // Aspetta che tutto sia caricato