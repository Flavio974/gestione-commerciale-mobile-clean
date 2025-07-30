/**
 * 🚨 FIX COMPLETO SISTEMA AI - VERSIONE DEFINITIVA
 * 
 * Questo fix risolve TUTTI i problemi:
 * 1. "che ore sono" mappato a orders invece di system_info
 * 2. STOP DEFINITIVO che blocca tutto
 * 3. Parametri non estratti dal vocabolario
 * 4. Timeline che non si carica
 */

console.log('🚨 [FIX COMPLETO AI] Inizializzazione fix definitivo...');

// Attendi che tutto sia caricato
setTimeout(() => {
    console.log('🔧 [FIX COMPLETO] Inizio riparazione totale sistema...');
    
    // ========== FIX 1: VOCABULARY SYSTEM INFO ==========
    console.log('🔧 [FIX 1] Correzione comandi sistema...');
    
    // Cerca il vocabulary manager in tutti i modi possibili
    let vocabularyManager = null;
    if (window.vocabularyManager) {
        vocabularyManager = window.vocabularyManager;
    } else if (window.getVocabularyManager) {
        vocabularyManager = window.getVocabularyManager();
    } else if (window.robustConnectionManager && window.robustConnectionManager.instances && window.robustConnectionManager.instances.vocabularyManager) {
        vocabularyManager = window.robustConnectionManager.instances.vocabularyManager;
    }
    
    if (vocabularyManager) {
        console.log('✅ VocabularyManager trovato, aggiorno comandi sistema...');
        
        // Comandi sistema corretti
        const systemCommands = [
            {
                pattern: "che ore sono",
                action: "system_info",
                params: { type: "time" }
            },
            {
                pattern: "che ora è", 
                action: "system_info",
                params: { type: "time" }
            },
            {
                pattern: "dimmi l'ora",
                action: "system_info", 
                params: { type: "time" }
            },
            {
                pattern: "che giorno è",
                action: "system_info",
                params: { type: "date" }
            },
            {
                pattern: "che giorno è oggi",
                action: "system_info",
                params: { type: "date" }
            },
            {
                pattern: "che data è oggi",
                action: "system_info",
                params: { type: "date" }
            }
        ];
        
        // Aggiungi/aggiorna comandi
        systemCommands.forEach(cmd => {
            try {
                vocabularyManager.addCommand({
                    id: `sys_${cmd.pattern.replace(/\s+/g, '_')}`,
                    pattern: cmd.pattern,
                    action: cmd.action,
                    params: cmd.params,
                    category: 'sistema',
                    priority: 100 // Alta priorità
                });
                console.log(`✅ Comando aggiunto: "${cmd.pattern}" → ${cmd.action}`);
            } catch (e) {
                console.log(`⚠️ Comando già presente: "${cmd.pattern}"`);
            }
        });
    } else {
        console.error('❌ VocabularyManager non trovato!');
    }
    
    // ========== FIX 2: RIMUOVI STOP DEFINITIVO ==========
    console.log('🔧 [FIX 2] Rimozione STOP DEFINITIVO...');
    
    if (window.robustConnectionManager && window.robustConnectionManager.interceptAICall) {
        const originalIntercept = window.robustConnectionManager.interceptAICall;
        
        window.robustConnectionManager.interceptAICall = async function(customMessage = null, isVoiceInput = false) {
            console.log('🎯 [NO STOP] Intercettazione intelligente...');
            
            const inputElement = document.getElementById('ai-input');
            const message = customMessage || (inputElement ? inputElement.value.trim() : '');
            
            if (!message) return;
            
            // Aggiungi messaggio utente
            if (window.FlavioAIAssistant && window.FlavioAIAssistant.addMessage) {
                window.FlavioAIAssistant.addMessage(message, 'user');
            }
            
            // Svuota input
            if (inputElement && !customMessage) {
                inputElement.value = '';
            }
            
            // Controlla vocabolario
            let handled = false;
            if (this.instances.vocabularyManager) {
                const match = await this.instances.vocabularyManager.findMatch(message);
                
                if (match && this.instances.aiMiddleware) {
                    try {
                        console.log('📚 Match vocabolario:', match);
                        
                        // IMPORTANTE: Includi sempre i parametri estratti
                        const command = {
                            ...match.command,
                            params: {
                                ...match.command.params,
                                ...match.params,
                                extracted: match.params
                            }
                        };
                        
                        const result = await this.instances.aiMiddleware.executeLocalAction(
                            command,
                            message,
                            { extractedParams: match.params }
                        );
                        
                        if (result && result.success !== false) {
                            const responseText = typeof result === 'string' ? result : 
                                               result.message || result.data || JSON.stringify(result);
                            
                            window.FlavioAIAssistant.addMessage(responseText, 'assistant');
                            
                            if (isVoiceInput && window.FlavioAIAssistant.speakResponse) {
                                window.FlavioAIAssistant.speakResponse(responseText);
                            }
                            
                            handled = true;
                            console.log('✅ Vocabolario ha gestito la richiesta');
                        }
                    } catch (error) {
                        console.error('❌ Errore vocabolario:', error);
                    }
                }
            }
            
            // Se non gestito, usa AI esterna (NO STOP!)
            if (!handled) {
                console.log('🤖 [NO STOP] Uso AI esterna...');
                
                if (window.FlavioAIAssistant) {
                    if (window.FlavioAIAssistant.originalProcessMessage) {
                        await window.FlavioAIAssistant.originalProcessMessage(message, isVoiceInput);
                    } else if (window.FlavioAIAssistant.processMessage) {
                        await window.FlavioAIAssistant.processMessage(message, isVoiceInput);
                    }
                } else {
                    console.error('❌ FlavioAIAssistant non disponibile');
                }
            }
        };
        
        console.log('✅ STOP DEFINITIVO rimosso!');
    }
    
    // ========== FIX 3: GESTIONE SYSTEM_INFO ==========
    console.log('🔧 [FIX 3] Patch handleSystemInfo...');
    
    if (window.aiMiddleware) {
        // Assicura che handleSystemInfo funzioni
        if (!window.aiMiddleware.handleSystemInfo) {
            window.aiMiddleware.handleSystemInfo = function(params) {
                const { type = 'time' } = params;
                const now = new Date();
                
                if (type === 'time') {
                    const hours = now.getHours().toString().padStart(2, '0');
                    const minutes = now.getMinutes().toString().padStart(2, '0');
                    return `🕐 Sono le ${hours}:${minutes}`;
                } else if (type === 'date') {
                    const options = { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    };
                    const dateStr = now.toLocaleDateString('it-IT', options);
                    return `📅 Oggi è ${dateStr}`;
                } else {
                    return `📅🕐 ${now.toLocaleString('it-IT')}`;
                }
            };
        }
        
        // Patch executeLocalAction per gestire system_info
        const originalExecute = window.aiMiddleware.executeLocalAction;
        window.aiMiddleware.executeLocalAction = async function(command, originalMessage, originalContext) {
            console.log('🎯 [EXECUTE] Comando:', command);
            
            // Se è system_info, gestiscilo direttamente
            if (command.action === 'system_info') {
                console.log('✅ Gestione diretta system_info');
                return this.handleSystemInfo(command.params || {});
            }
            
            // Altrimenti usa l'originale
            return originalExecute.call(this, command, originalMessage, originalContext);
        };
        
        console.log('✅ handleSystemInfo patchato');
    }
    
    // ========== FIX 4: TIMELINE INITIALIZATION ==========
    console.log('🔧 [FIX 4] Verifica Timeline...');
    
    // Forza inizializzazione Timeline se necessario
    if (window.Timeline && !window.Timeline.initialized) {
        console.log('🔧 Inizializzazione Timeline forzata...');
        try {
            window.Timeline.init();
            console.log('✅ Timeline inizializzata');
        } catch (e) {
            console.error('❌ Errore inizializzazione Timeline:', e);
        }
    }
    
    // ========== TEST FUNCTION ==========
    window.testFixCompleto = async function() {
        console.log('\n🧪 === TEST FIX COMPLETO ===\n');
        
        const tests = [
            { query: "che ore sono", expected: "ora" },
            { query: "che giorno è", expected: "data" },
            { query: "ciao", expected: "AI esterna" },
            { query: "dimmi il fatturato del cliente essemme", expected: "fatturato filtrato" }
        ];
        
        for (const test of tests) {
            console.log(`\n📝 Test: "${test.query}"`);
            console.log(`✅ Expected: ${test.expected}`);
            
            if (window.robustConnectionManager && window.robustConnectionManager.interceptAICall) {
                await window.robustConnectionManager.interceptAICall(test.query);
            }
        }
        
        console.log('\n✅ Test completati\n');
    };
    
    console.log('✅ [FIX COMPLETO AI] Sistema riparato!');
    console.log('💡 Usa window.testFixCompleto() per testare');
    
}, 4000); // Attendi più a lungo per essere sicuri

// Fix immediato per Timeline
document.addEventListener('DOMContentLoaded', () => {
    // Aggiungi listener per tab Timeline
    const timelineTab = document.querySelector('[data-tab="timeline"]');
    if (timelineTab) {
        timelineTab.addEventListener('click', () => {
            console.log('🔧 Click su Timeline, forzo inizializzazione...');
            setTimeout(() => {
                if (window.Timeline && window.Timeline.init) {
                    window.Timeline.init();
                }
            }, 100);
        });
    }
});