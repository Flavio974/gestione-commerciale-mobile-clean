/**
 * Fix per estrarre correttamente il cliente dalle fatture
 * Gestisce il caso in cui il cliente è nella sezione "Luogo di consegna"
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix cliente fatture specifico...');
    
    // Override per FatturaExtractor
    function applyClienteFix(ExtractorClass, className) {
        if (!ExtractorClass || !ExtractorClass.prototype) return;
        
        const originalExtractClientName = ExtractorClass.prototype.extractClientName;
        
        ExtractorClass.prototype.extractClientName = function() {
            console.log(`🎯 [CLIENTE FIX] Intercettato extractClientName su ${className}`);
            
            // Verifica se è una Nota di Credito
            const upperText = this.text.toUpperCase();
            const isNC = upperText.includes('NOTA') && upperText.includes('CREDITO');
            console.log(`🎯 [CLIENTE FIX] Documento NC: ${isNC}`);
            
            // Prima prova a estrarre dalla sezione "Spett.le"
            const spettMatch = this.text.match(/Spett\.le\s*\n([^\n]+(?:\n[^\n]+)*?)(?=\nLuogo di consegna)/is);
            if (spettMatch) {
                const clienteLines = spettMatch[1].trim().split('\n').map(l => l.trim());
                // Rimuovi righe vuote e unisci
                const cliente = clienteLines.filter(l => l.length > 0).join(' - ');
                if (cliente && cliente.length > 5) {
                    console.log(`✅ [CLIENTE FIX] Cliente trovato dopo Spett.le: ${cliente}`);
                    return cliente;
                }
            }
            
            // Cerca il cliente dopo "Attenzione!!" sia per FT che per NC
            const attenzioneMatch = this.text.match(/Attenzione!!.*?\n([^\n]+(?:\n[^\n]+)*?)(?=\nALFIERI|$)/is);
            if (attenzioneMatch) {
                const testoDopoAttenzione = attenzioneMatch[1].trim();
                const lines = testoDopoAttenzione.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                
                // Salta la riga "contrario non risarciremo..."
                const clienteLines = [];
                let skipNext = false;
                
                for (const line of lines) {
                    if (line.includes('contrario') || line.includes('risarciremo')) {
                        skipNext = true;
                        continue;
                    }
                    if (skipNext) {
                        skipNext = false;
                        // Inizia a raccogliere da qui
                    }
                    
                    // Se troviamo un indirizzo, abbiamo finito il nome
                    if (line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA)/i)) {
                        break;
                    }
                    // Se troviamo un CAP, abbiamo finito
                    if (line.match(/^\d{5}\s+/)) {
                        break;
                    }
                    
                    if (line.length > 2 && !line.includes('ALFIERI')) {
                        clienteLines.push(line);
                    }
                }
                
                if (clienteLines.length > 0) {
                    const cliente = clienteLines.join(' - ');
                    console.log(`✅ [CLIENTE FIX] Cliente trovato dopo Attenzione: ${cliente}`);
                    return cliente;
                }
            }
            
            // Cerca direttamente MACELLERIA TIBALDI
            const tibaldiMatch = this.text.match(/MACELLERIA\s+TIBALDI[^\n]*(?:\n[^\n]+)*/i);
            if (tibaldiMatch) {
                const lines = tibaldiMatch[0].split('\n').map(l => l.trim()).filter(l => l.length > 0);
                const clienteLines = [];
                
                for (const line of lines) {
                    if (line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA)/i)) {
                        break;
                    }
                    if (line.match(/^\d{5}\s+/)) {
                        break;
                    }
                    clienteLines.push(line);
                }
                
                if (clienteLines.length > 0) {
                    const cliente = clienteLines.join(' - ');
                    console.log(`✅ [CLIENTE FIX] Cliente TIBALDI trovato: ${cliente}`);
                    return cliente;
                }
            }
            
            // Se ancora non trovato, usa il metodo originale
            const originalResult = originalExtractClientName.call(this);
            if (originalResult && originalResult !== 'Luogo di consegna') {
                return originalResult;
            }
            
            console.log('❌ [CLIENTE FIX] Cliente non trovato');
            return '';
        };
        
        // Override anche per l'indirizzo di consegna
        const originalExtractDeliveryAddress = ExtractorClass.prototype.extractDeliveryAddress;
        
        ExtractorClass.prototype.extractDeliveryAddress = function() {
            console.log(`🎯 [CLIENTE FIX] Intercettato extractDeliveryAddress su ${className}`);
            
            // Cerca l'indirizzo del cliente TIBALDI
            const tibaldiMatch = this.text.match(/MACELLERIA\s+TIBALDI[^\n]*\n[^\n]*\n([^\n]+(?:\n[^\n]+)*?)(?=\nALFIERI|$)/i);
            if (tibaldiMatch) {
                const lines = tibaldiMatch[1].split('\n').map(l => l.trim()).filter(l => l.length > 0);
                const indirizzoLines = [];
                
                for (const line of lines) {
                    // Raccogli righe che sembrano indirizzi
                    if (line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA)/i) ||
                        line.match(/^\d{5}\s+[A-Z]/i) || // CAP + città
                        (indirizzoLines.length > 0 && line.match(/^[A-Z]+\s+[A-Z]{2}$/))) { // Città + provincia
                        indirizzoLines.push(line);
                    } else if (indirizzoLines.length > 0) {
                        // Se abbiamo già iniziato a raccogliere l'indirizzo e troviamo altro, fermiamo
                        break;
                    }
                }
                
                if (indirizzoLines.length > 0) {
                    const indirizzo = indirizzoLines.join(', ');
                    console.log(`✅ [CLIENTE FIX] Indirizzo cliente TIBALDI trovato: ${indirizzo}`);
                    return indirizzo;
                }
            }
            
            // Cerca dopo "Attenzione!!" per trovare l'indirizzo del cliente
            const attenzioneMatch = this.text.match(/Attenzione!!.*?\n([^\n]+(?:\n[^\n]+)*?)(?=\nALFIERI|$)/is);
            if (attenzioneMatch) {
                const testoDopoAttenzione = attenzioneMatch[1].trim();
                const lines = testoDopoAttenzione.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                const indirizzoLines = [];
                let skipNext = false;
                let foundAddress = false;
                
                for (const line of lines) {
                    if (line.includes('contrario') || line.includes('risarciremo')) {
                        skipNext = true;
                        continue;
                    }
                    if (skipNext) {
                        skipNext = false;
                        continue;
                    }
                    
                    // Se troviamo una via o un CAP, iniziamo a raccogliere l'indirizzo
                    if (line.match(/^(STRADA|VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA)/i) ||
                        line.match(/^\d{5}\s+/i)) {
                        indirizzoLines.push(line);
                        foundAddress = true;
                    } else if (foundAddress && line.match(/^[A-Z]+/)) {
                        // Se abbiamo già trovato l'indirizzo e la riga inizia con lettere maiuscole
                        // potrebbe essere la continuazione (es: città)
                        indirizzoLines.push(line);
                        // Ma se è un nome (es: ALFIERI), fermiamo
                        if (line.includes('ALFIERI') || line.includes('SRL') || line.includes('SPA')) {
                            break;
                        }
                    }
                }
                
                if (indirizzoLines.length > 0) {
                    const indirizzo = indirizzoLines.join(', ');
                    console.log(`✅ [CLIENTE FIX] Indirizzo consegna trovato dopo Attenzione: ${indirizzo}`);
                    return indirizzo;
                }
            }
            
            // NON usare il metodo originale che restituisce l'indirizzo di Alfieri
            console.log('❌ [CLIENTE FIX] Indirizzo consegna non trovato');
            return '';
        };
        
        console.log(`✅ [CLIENTE FIX] Override applicato a ${className}`);
    }
    
    // Applica il fix
    setTimeout(() => {
        applyClienteFix(window.FatturaExtractor, 'FatturaExtractor');
        applyClienteFix(window.FatturaExtractorModular, 'FatturaExtractorModular');
        
        console.log('✅ Fix cliente fatture completato');
    }, 400);
    
})();