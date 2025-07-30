/**
 * 🚨 FIX CRITICO: ESTRAZIONE PARAMETRI CLIENTE
 * 
 * Il vocabolario trova il match ma i parametri (CLIENTE, PRODOTTO, etc)
 * non vengono estratti correttamente dal pattern con placeholder.
 */

console.log('🚨 [FIX PARAMETRI] Inizializzazione fix estrazione parametri...');

setTimeout(() => {
    console.log('🔧 [FIX PARAMETRI] Inizio patching sistema estrazione...');
    
    // Patch VocabularyManager per estrarre correttamente i parametri
    if (window.vocabularyManager || window.getVocabularyManager) {
        const manager = window.vocabularyManager || window.getVocabularyManager();
        
        console.log('🔧 [FIX PARAMETRI] Patching PlaceholderMatcher...');
        
        // Override del metodo match per PlaceholderMatcher
        if (manager.matchingStrategy && manager.matchingStrategy.matchers) {
            const placeholderMatcher = manager.matchingStrategy.matchers.find(
                m => m.constructor.name === 'PlaceholderMatcher'
            );
            
            if (placeholderMatcher) {
                const originalMatch = placeholderMatcher.match.bind(placeholderMatcher);
                
                placeholderMatcher.match = function(input, command) {
                    console.log('🔍 [MATCHER] Tentativo match:', {
                        input,
                        pattern: command.pattern
                    });
                    
                    // Se non ci sono placeholder, skip
                    if (!command.pattern.includes('[')) {
                        return null;
                    }
                    
                    // Estrai tutti i placeholder
                    const placeholders = [];
                    const placeholderRegex = /\[([^\]]+)\]/g;
                    let match;
                    
                    while ((match = placeholderRegex.exec(command.pattern)) !== null) {
                        placeholders.push({
                            full: match[0],
                            name: match[1].toUpperCase(),
                            position: match.index
                        });
                    }
                    
                    if (placeholders.length === 0) return null;
                    
                    // Costruisci regex pattern
                    let regexPattern = command.pattern;
                    
                    // Escape caratteri speciali
                    regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    
                    // Sostituisci placeholders con capture groups
                    placeholders.forEach(placeholder => {
                        // Pattern più flessibile per catturare nomi
                        const capturePattern = '([\\w\\s\\-\'\\.àèéìòùÀÈÉÌÒÙ]+?)';
                        regexPattern = regexPattern.replace(
                            '\\' + placeholder.full, 
                            capturePattern
                        );
                    });
                    
                    // Aggiungi flessibilità agli spazi e fine stringa
                    regexPattern = regexPattern.replace(/\s+/g, '\\s+');
                    regexPattern = '^' + regexPattern + '\\s*$';
                    
                    console.log('🔍 [MATCHER] Regex generata:', regexPattern);
                    
                    // Tenta il match
                    const regex = new RegExp(regexPattern, 'i');
                    const matchResult = input.match(regex);
                    
                    if (matchResult) {
                        console.log('✅ [MATCHER] Match trovato:', matchResult);
                        
                        const params = {};
                        placeholders.forEach((placeholder, index) => {
                            const value = matchResult[index + 1]?.trim();
                            if (value) {
                                params[placeholder.name] = value;
                                // Aggiungi anche versione lowercase
                                params[placeholder.name.toLowerCase()] = value;
                            }
                        });
                        
                        console.log('✅ [MATCHER] Parametri estratti:', params);
                        
                        return {
                            score: 0.95,
                            type: 'placeholder',
                            command: command,
                            params: params
                        };
                    }
                    
                    console.log('❌ [MATCHER] Nessun match con regex');
                    return null;
                };
                
                console.log('✅ [FIX PARAMETRI] PlaceholderMatcher patchato');
            }
        }
        
        // Patch findMatch per debug
        const originalFindMatch = manager.findMatch.bind(manager);
        manager.findMatch = async function(userInput) {
            console.log('🔍 [VOCAB] findMatch chiamato:', userInput);
            
            const result = await originalFindMatch(userInput);
            
            if (result) {
                console.log('📚 [VOCAB] Match risultato completo:', {
                    pattern: result.command.pattern,
                    action: result.command.action,
                    params: result.params,
                    score: result.score,
                    type: result.type
                });
                
                // CRITICO: Assicura che i parametri siano nel comando
                if (result.params && Object.keys(result.params).length > 0) {
                    if (!result.command.params) {
                        result.command.params = {};
                    }
                    
                    // Copia TUTTI i parametri
                    Object.assign(result.command.params, result.params);
                    
                    // Aggiungi anche come extracted
                    result.command.params.extracted = { ...result.params };
                    
                    console.log('✅ [VOCAB] Parametri copiati nel comando:', result.command.params);
                }
            } else {
                console.log('❌ [VOCAB] Nessun match trovato');
            }
            
            return result;
        };
    }
    
    // Fix per fix-ai-query-support.js
    console.log('🔧 [FIX PARAMETRI] Patching fix-ai-query-support...');
    
    if (window.aiMiddleware && window.aiMiddleware.executeLocalAction) {
        const originalExecute = window.aiMiddleware.executeLocalAction;
        
        window.aiMiddleware.executeLocalAction = async function(command, originalMessage, originalContext) {
            console.log('🎯 [FIX PARAMS] executeLocalAction:', {
                action: command.action,
                params: command.params,
                context: originalContext
            });
            
            // Se è ai_query, assicura che i parametri siano estratti
            if (command.action === 'ai_query' || command.action === 'universal_query') {
                // Cerca di estrarre i parametri se mancanti
                if (!command.params || !command.params.extracted) {
                    const clienteMatch = originalMessage.match(/cliente\s+([^\s]+)/i);
                    if (clienteMatch) {
                        if (!command.params) command.params = {};
                        if (!command.params.extracted) command.params.extracted = {};
                        
                        command.params.extracted.CLIENTE = clienteMatch[1];
                        command.params.CLIENTE = clienteMatch[1];
                        
                        console.log('✅ [FIX PARAMS] Cliente estratto dal messaggio:', clienteMatch[1]);
                    }
                }
            }
            
            return originalExecute.call(this, command, originalMessage, originalContext);
        };
    }
    
    // Test function
    window.testEstrazioneParametri = function(message = "dimmi il fatturato del cliente essemme") {
        console.log(`\n🧪 [TEST PARAMETRI] Test con: "${message}"`);
        
        if (window.vocabularyManager || window.getVocabularyManager) {
            const manager = window.vocabularyManager || window.getVocabularyManager();
            
            manager.findMatch(message).then(result => {
                if (result) {
                    console.log('✅ Match trovato:', result);
                    console.log('📊 Parametri estratti:', result.params);
                    console.log('📊 Parametri nel comando:', result.command.params);
                } else {
                    console.log('❌ Nessun match trovato');
                }
            });
        }
    };
    
    console.log('✅ [FIX ESTRAZIONE PARAMETRI] Completato!');
    console.log('💡 Test disponibile: window.testEstrazioneParametri()');
    
}, 3000); // Attendi caricamento vocabulary manager