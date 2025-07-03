/**
 * Debug per analizzare dove si trova il nome del cliente nel PDF
 */

(function() {
    'use strict';
    
    console.log('🔍 Debug estrazione cliente abilitato...');
    
    // Override per analizzare il testo completo
    if (window.FatturaExtractor && window.FatturaExtractor.prototype) {
        const originalExtract = window.FatturaExtractor.prototype.extract;
        
        window.FatturaExtractor.prototype.extract = function() {
            console.log('🔍 [DEBUG CLIENT] Analizzando struttura fattura...');
            
            // Dividi il testo in sezioni per analisi
            const lines = this.text.split('\n');
            console.log(`[DEBUG CLIENT] Totale righe: ${lines.length}`);
            
            // Mostra le prime 30 righe
            console.log('[DEBUG CLIENT] Prime 30 righe del documento:');
            for (let i = 0; i < Math.min(30, lines.length); i++) {
                if (lines[i].trim()) {
                    console.log(`  Riga ${i}: "${lines[i].trim()}"`);
                }
            }
            
            // Cerca pattern comuni per il cliente
            console.log('[DEBUG CLIENT] Ricerca pattern cliente...');
            
            // Pattern 1: Dopo "Destinatario"
            const destIndex = this.text.search(/Destinatario/i);
            if (destIndex > -1) {
                const afterDest = this.text.substring(destIndex, destIndex + 300);
                console.log('[DEBUG CLIENT] Testo dopo "Destinatario":', afterDest);
            }
            
            // Pattern 2: Dopo "Cliente"
            const clienteIndex = this.text.search(/Cliente[:\s]/i);
            if (clienteIndex > -1) {
                const afterCliente = this.text.substring(clienteIndex, clienteIndex + 300);
                console.log('[DEBUG CLIENT] Testo dopo "Cliente":', afterCliente);
            }
            
            // Pattern 3: Cerca Partita IVA del cliente
            const pivaMatches = this.text.matchAll(/P\.?\s*IVA[:\s]*(\d{11})/gi);
            let pivaCount = 0;
            for (const match of pivaMatches) {
                pivaCount++;
                const contextStart = Math.max(0, match.index - 200);
                const contextEnd = Math.min(this.text.length, match.index + 100);
                const context = this.text.substring(contextStart, contextEnd);
                console.log(`[DEBUG CLIENT] P.IVA #${pivaCount} (${match[1]}) nel contesto:`, context);
            }
            
            // Pattern 4: Cerca codici fiscali
            const cfMatches = this.text.matchAll(/[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/g);
            let cfCount = 0;
            for (const match of cfMatches) {
                cfCount++;
                const contextStart = Math.max(0, match.index - 200);
                const contextEnd = Math.min(this.text.length, match.index + 100);
                const context = this.text.substring(contextStart, contextEnd);
                console.log(`[DEBUG CLIENT] C.F. #${cfCount} (${match[0]}) nel contesto:`, context);
            }
            
            // Chiama il metodo originale
            const result = originalExtract.call(this);
            
            console.log('[DEBUG CLIENT] Risultato estrazione:', {
                cliente: result.cliente,
                clientName: result.clientName,
                partitaIva: result.partitaIva,
                codiceFiscale: result.codiceFiscale
            });
            
            return result;
        };
    }
    
})();