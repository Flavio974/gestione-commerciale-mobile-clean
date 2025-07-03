/**
 * Fix per estrarre il nome del cliente reale dalle fatture
 * Cerca il nome del cliente dopo "Spett.le" e prima dei dati dell'emittente
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix estrazione cliente fatture...');
    
    // Funzione per estrarre il cliente dal testo
    function extractRealClient(text) {
        console.log('[CLIENT EXTRACTOR] Analizzando testo per trovare il cliente...');
        
        // Trova la posizione di "Spett.le"
        const spettIndex = text.search(/Spett\.le/i);
        if (spettIndex === -1) {
            console.log('[CLIENT EXTRACTOR] "Spett.le" non trovato');
            return null;
        }
        
        // Estrai il testo dopo "Spett.le" (max 500 caratteri)
        const afterSpett = text.substring(spettIndex + 8, spettIndex + 500);
        console.log('[CLIENT EXTRACTOR] Testo dopo Spett.le:', afterSpett.substring(0, 200));
        
        // Dividi in righe e pulisci
        const lines = afterSpett.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // Analizza le righe per trovare il nome del cliente
        let clientName = null;
        let clientAddress = [];
        let foundEmittente = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Salta "Luogo di consegna" se è la prima riga
            if (i === 0 && line === 'Luogo di consegna') {
                console.log('[CLIENT EXTRACTOR] Saltando "Luogo di consegna"');
                continue;
            }
            
            // Se troviamo dati dell'emittente, fermiamo
            if (line.includes('Tel.') || line.includes('Fax') || 
                line.includes('www.') || line.includes('@') ||
                line.includes('alfieri') || line.includes('ALFIERI')) {
                foundEmittente = true;
                break;
            }
            
            // Se troviamo un CAP (5 cifre seguite da città), è probabilmente parte dell'indirizzo
            if (line.match(/^\d{5}\s+[A-Z]/)) {
                if (clientName) {
                    clientAddress.push(line);
                }
                continue;
            }
            
            // Se troviamo una via/corso/piazza, è parte dell'indirizzo
            if (line.match(/^(Via|V\.le|Corso|C\.so|Piazza|P\.zza)/i)) {
                if (clientName) {
                    clientAddress.push(line);
                }
                continue;
            }
            
            // Se non abbiamo ancora trovato il nome e la riga sembra valida
            if (!clientName && line.length > 3 && 
                !line.includes('consegna') && 
                !line.match(/^\d/) && // Non inizia con numeri
                line !== line.toLowerCase() && // Non è tutto minuscolo
                line !== line.toUpperCase()) { // Non è tutto maiuscolo (probabilmente codice)
                
                clientName = line;
                console.log(`[CLIENT EXTRACTOR] Potenziale nome cliente: "${clientName}"`);
            }
        }
        
        // Se abbiamo trovato un nome cliente valido
        if (clientName && clientName.length > 5) {
            console.log(`[CLIENT EXTRACTOR] Cliente estratto: "${clientName}"`);
            if (clientAddress.length > 0) {
                console.log(`[CLIENT EXTRACTOR] Indirizzo: ${clientAddress.join(', ')}`);
            }
            return {
                name: clientName,
                address: clientAddress.join('\n')
            };
        }
        
        console.log('[CLIENT EXTRACTOR] Nessun cliente valido trovato');
        return null;
    }
    
    // Override per FatturaExtractor
    function applyClientExtractorFix(ExtractorClass, className) {
        if (!ExtractorClass || !ExtractorClass.prototype) return;
        
        const originalExtract = ExtractorClass.prototype.extract;
        
        ExtractorClass.prototype.extract = function() {
            console.log(`🎯 [CLIENT EXTRACTOR] Intercettato extract su ${className}`);
            
            // Chiama il metodo originale
            const result = originalExtract.call(this);
            
            // Se il cliente è "Luogo di consegna" o non valido, prova a estrarlo
            if (result && (result.cliente === 'Luogo di consegna' || 
                         result.cliente === 'INSERIRE NOME REALE CLIENTE 20001' ||
                         !result.cliente || 
                         result.cliente.length < 5)) {
                
                console.log('[CLIENT EXTRACTOR] Cliente non valido, tento estrazione dal testo...');
                
                const extracted = extractRealClient(this.text);
                if (extracted && extracted.name) {
                    result.cliente = extracted.name;
                    result.clientName = extracted.name;
                    console.log(`✅ [CLIENT EXTRACTOR] Cliente estratto con successo: ${extracted.name}`);
                    
                    if (extracted.address && (!result.deliveryAddress || result.deliveryAddress.includes('alfieri'))) {
                        result.deliveryAddress = extracted.address;
                        result.indirizzoConsegna = extracted.address;
                        console.log(`✅ [CLIENT EXTRACTOR] Indirizzo estratto: ${extracted.address}`);
                    }
                }
            }
            
            return result;
        };
        
        console.log(`✅ [CLIENT EXTRACTOR] Override applicato a ${className}`);
    }
    
    // Applica il fix dopo gli altri
    setTimeout(() => {
        applyClientExtractorFix(window.FatturaExtractor, 'FatturaExtractor');
        applyClientExtractorFix(window.FatturaExtractorModular, 'FatturaExtractorModular');
        
        console.log('✅ Fix estrazione cliente completato');
    }, 300);
    
})();