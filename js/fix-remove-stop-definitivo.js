/**
 * 🚨 FIX URGENTE: RIMOZIONE BLOCCO "STOP DEFINITIVO"
 * 
 * Il sistema robust-connection-manager sta bloccando TUTTO con "STOP DEFINITIVO"
 * anche quando il vocabolario non gestisce correttamente le query.
 * Questo fix rimuove il blocco e permette il fallback ad AI.
 */

console.log('🚨 [FIX STOP DEFINITIVO] Rimozione blocco forzato...');

setTimeout(() => {
    // Patch robustConnectionManager
    if (window.robustConnectionManager && window.robustConnectionManager.interceptAICall) {
        console.log('🔧 [FIX STOP] Patching interceptAICall...');
        
        const originalInterceptAICall = window.robustConnectionManager.interceptAICall;
        
        window.robustConnectionManager.interceptAICall = async function(customMessage = null, isVoiceInput = false) {
            console.log('🎯 [FIX STOP] interceptAICall con vocabolario intelligente');
            
            // Reset del flag di comando completato
            window._vocabularyCommandCompleted = false;
            
            // Chiama l'originale ma gestisci diversamente il risultato
            try {
                // Ottieni il messaggio
                const inputElement = document.getElementById('ai-input');
                const message = customMessage || (inputElement ? inputElement.value.trim() : '');
                
                if (!message) {
                    console.log('❌ Nessun messaggio da processare');
                    return;
                }
                
                // Aggiungi messaggio utente
                if (window.FlavioAIAssistant && window.FlavioAIAssistant.addMessage) {
                    window.FlavioAIAssistant.addMessage(message, 'user');
                }
                
                // Controlla vocabolario
                let vocabularyHandled = false;
                if (this.instances.vocabularyManager) {
                    const vocabularyMatch = await this.instances.vocabularyManager.findMatch(message);
                    
                    if (vocabularyMatch) {
                        console.log('📚 Match vocabolario trovato:', vocabularyMatch);
                        
                        // Prova ad eseguire con AIMiddleware
                        if (this.instances.aiMiddleware && this.instances.aiMiddleware.executeLocalAction) {
                            try {
                                const result = await this.instances.aiMiddleware.executeLocalAction(
                                    vocabularyMatch.command,
                                    message,
                                    { extractedParams: vocabularyMatch.params }
                                );
                                
                                if (result && result.success !== false) {
                                    // Comando eseguito con successo
                                    const responseText = result.message || result.data || result;
                                    window.FlavioAIAssistant.addMessage(responseText, 'assistant');
                                    
                                    if (isVoiceInput && window.FlavioAIAssistant.speakResponse) {
                                        window.FlavioAIAssistant.speakResponse(responseText);
                                    }
                                    
                                    vocabularyHandled = true;
                                    console.log('✅ [FIX STOP] Vocabolario gestito con successo');
                                }
                            } catch (error) {
                                console.error('❌ [FIX STOP] Errore esecuzione vocabolario:', error);
                            }
                        }
                    }
                }
                
                // Se il vocabolario non ha gestito O ha fallito, usa AI
                if (!vocabularyHandled) {
                    console.log('🤖 [FIX STOP] Fallback ad AI esterna...');
                    
                    // Svuota input se necessario
                    if (inputElement && !customMessage) {
                        inputElement.value = '';
                    }
                    
                    // Usa FlavioAIAssistant direttamente
                    if (window.FlavioAIAssistant && window.FlavioAIAssistant.originalProcessMessage) {
                        await window.FlavioAIAssistant.originalProcessMessage(message, isVoiceInput);
                    } else if (window.FlavioAIAssistant && window.FlavioAIAssistant.processMessage) {
                        await window.FlavioAIAssistant.processMessage(message, isVoiceInput);
                    } else {
                        console.error('❌ [FIX STOP] FlavioAIAssistant non disponibile');
                        window.FlavioAIAssistant.addMessage(
                            "Mi dispiace, non ho compreso la tua richiesta. Puoi riformularla?", 
                            'assistant'
                        );
                    }
                }
                
            } catch (error) {
                console.error('❌ [FIX STOP] Errore generale:', error);
                
                // In caso di errore, prova comunque con AI
                if (window.FlavioAIAssistant) {
                    window.FlavioAIAssistant.addMessage(
                        "Si è verificato un errore. Riprovo con l'assistente AI...", 
                        'assistant'
                    );
                    
                    if (window.FlavioAIAssistant.originalProcessMessage) {
                        await window.FlavioAIAssistant.originalProcessMessage(message, isVoiceInput);
                    }
                }
            }
        };
        
        console.log('✅ [FIX STOP] interceptAICall patchato con fallback intelligente');
    }
    
    // Fix anche per il vocabulary manager
    if (window.vocabularyManager || window.getVocabularyManager) {
        console.log('🔧 [FIX STOP] Patching VocabularyManager...');
        
        const manager = window.vocabularyManager || window.getVocabularyManager();
        
        // Assicura che i parametri vengano sempre estratti
        const originalFindMatch = manager.findMatch;
        if (originalFindMatch) {
            manager.findMatch = async function(userInput) {
                const result = await originalFindMatch.call(this, userInput);
                
                if (result && result.params) {
                    // Assicura che i parametri siano nel comando
                    if (!result.command.params) {
                        result.command.params = {};
                    }
                    
                    // Copia i parametri estratti
                    Object.assign(result.command.params, result.params);
                    
                    // Aggiungi anche in extracted per sicurezza
                    result.command.params.extracted = result.params;
                    
                    console.log('✅ [FIX STOP] Parametri estratti:', result.params);
                }
                
                return result;
            };
        }
    }
    
    console.log('✅ [FIX STOP DEFINITIVO] Fix applicato!');
    console.log('💡 Il sistema ora:');
    console.log('   - Prova prima con il vocabolario');
    console.log('   - Se fallisce, usa l\'AI esterna');
    console.log('   - Nessun blocco "STOP DEFINITIVO"');
    
}, 2000); // Attendi che robust-connection-manager sia caricato