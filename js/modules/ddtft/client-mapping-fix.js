/**
 * Fix per mappare i codici cliente ai nomi reali nelle fatture
 * Usa il codice cliente nel nome file per trovare il nome corretto
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix mappatura clienti...');
    
    // Mappatura codici cliente -> nomi (da aggiornare con i dati reali)
    const CLIENT_MAPPING = {
        // IMPORTANTE: Sostituire questi nomi con i nomi reali dei clienti!
        // Il codice cliente si trova nel nome file: FTV_705048_2025_[20001]_4915_9062025.PDF
        '20001': 'MOLE MARKET SRL',  // Cliente corretto trovato nel PDF
        '20322': 'DONAC S.R.L.',
        '20283': 'AZ. AGR. LA MANDRIA S.S. DI GOIA E. E CAPRA S. S.S.',
        '4226': 'ALTRO CLIENTE',  // Codice dal secondo numero nel nome file
        // Aggiungi qui altri codici cliente con i loro nomi reali
        // Formato: 'codice': 'Nome Cliente Reale',
    };
    
    // Override per FatturaExtractor
    function applyClientMapping(ExtractorClass, className) {
        if (!ExtractorClass || !ExtractorClass.prototype) return;
        
        const originalExtract = ExtractorClass.prototype.extract;
        
        ExtractorClass.prototype.extract = function() {
            console.log(`🎯 [CLIENT MAPPING FIX] Intercettato extract su ${className}`);
            
            // Chiama il metodo originale
            const result = originalExtract.call(this);
            
            // Se il cliente è "Luogo di consegna" o simile, prova a mapparlo
            // IMPORTANTE: Non sovrascrivere se abbiamo già un cliente valido!
            const currentClient = result?.clientName || result?.cliente || result?.nomeCliente;
            const hasValidClient = currentClient && 
                                 currentClient.trim().length > 0 && 
                                 !currentClient.includes('Luogo di consegna') &&
                                 !currentClient.includes('INSERIRE NOME REALE') &&
                                 !currentClient.includes('NOME CLIENTE DA INSERIRE');
            
            // Per NC, preserva sempre il cliente se già estratto correttamente
            const isNC = result?.type === 'nc' || result?.documentType === 'NC';
            if (isNC && result?._clienteReale) {
                console.log('[CLIENT MAPPING FIX] NC ha già cliente reale:', result._clienteReale);
                return result;
            }
            
            if (result && !hasValidClient) {
                console.log('[CLIENT MAPPING FIX] Cliente non valido, cerco mappatura...');
                console.log('[CLIENT MAPPING FIX] Cliente attuale:', currentClient);
                
                // Prima cerca il codice cliente nel testo del documento
                let clientCode = null;
                let codeFromText = null;
                
                // Cerca nel testo con pattern più specifici
                const textPatterns = [
                    /Cod\.\s*Cli\.\s+(\d{4,6})(?!\d)/i,
                    /Codice\s+Cliente\s*:?\s*(\d{4,6})/i
                ];
                
                for (const pattern of textPatterns) {
                    const match = this.text.match(pattern);
                    if (match && match[1] !== '20001') {
                        codeFromText = match[1];
                        console.log(`[CLIENT MAPPING FIX] Codice cliente trovato nel testo: ${codeFromText}`);
                        break;
                    }
                }
                
                // Se abbiamo trovato un codice nel testo, usalo
                if (codeFromText) {
                    clientCode = codeFromText;
                } else if (this.fileName) {
                    // Solo se non trovato nel testo, usa quello del nome file
                    const fileMatch = this.fileName.match(/FTV_\d+_\d+_(\d+)_/);
                    if (fileMatch) {
                        clientCode = fileMatch[1];
                        console.log(`[CLIENT MAPPING FIX] Codice cliente dal nome file (fallback): ${clientCode}`);
                    }
                }
                
                // Applica la mappatura
                if (clientCode && CLIENT_MAPPING[clientCode]) {
                    result.cliente = CLIENT_MAPPING[clientCode];
                    result.clientName = CLIENT_MAPPING[clientCode];
                    result.clientCode = clientCode;
                    console.log(`✅ [CLIENT MAPPING FIX] Cliente mappato: ${clientCode} -> ${result.cliente}`);
                } else if (clientCode) {
                    console.log(`❌ [CLIENT MAPPING FIX] Nessuna mappatura trovata per codice: ${clientCode}`);
                    // Usa il codice come nome temporaneo
                    result.cliente = `Cliente ${clientCode}`;
                    result.clientName = `Cliente ${clientCode}`;
                    result.clientCode = clientCode;
                }
            } else {
                // Il cliente è già valido, preservalo
                console.log(`✅ [CLIENT MAPPING FIX] Cliente già valido: ${currentClient}`);
            }
            
            // Fix anche per l'indirizzo di consegna se contiene dati dell'emittente
            if (result && result.indirizzoConsegna && result.indirizzoConsegna.includes('alfierialimentari.com')) {
                console.log('[CLIENT MAPPING FIX] Rimuovo indirizzo emittente...');
                result.indirizzoConsegna = '';
                result.deliveryAddress = '';
                
                // Se abbiamo il cliente mappato, possiamo cercare il suo indirizzo
                if (result.clientCode && window.DDTFT_MAPPINGS && window.DDTFT_MAPPINGS.clientAddresses) {
                    const mappedAddress = window.DDTFT_MAPPINGS.clientAddresses[result.cliente];
                    if (mappedAddress) {
                        result.indirizzoConsegna = mappedAddress;
                        result.deliveryAddress = mappedAddress;
                        console.log(`✅ [CLIENT MAPPING FIX] Indirizzo mappato: ${mappedAddress}`);
                    }
                }
            }
            
            return result;
        };
        
        console.log(`✅ [CLIENT MAPPING FIX] Override applicato a ${className}`);
    }
    
    // Applica il fix
    setTimeout(() => {
        applyClientMapping(window.FatturaExtractor, 'FatturaExtractor');
        applyClientMapping(window.FatturaExtractorModular, 'FatturaExtractorModular');
        
        console.log('✅ Fix mappatura clienti completato');
    }, 400);
    
})();