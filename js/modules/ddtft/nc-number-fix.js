/**
 * Fix per l'estrazione corretta dei numeri documento NC (Note di Credito)
 * Risolve il problema dove veniva estratto "1" invece del numero corretto
 */

(function() {
    'use strict';
    
    console.log('📋 [NC NUMBER FIX] Applicando fix per numeri NC...');
    
    // Override del metodo extractDocumentNumber per FatturaExtractor
    function overrideFatturaExtractor() {
        if (window.FatturaExtractor && window.FatturaExtractor.prototype) {
            // Salva il metodo originale solo se non è già stato salvato
            if (!window.FatturaExtractor.prototype._originalExtractDocumentNumber) {
                window.FatturaExtractor.prototype._originalExtractDocumentNumber = 
                    window.FatturaExtractor.prototype.extractDocumentNumber;
            }
            
            window.FatturaExtractor.prototype.extractDocumentNumber = function() {
                console.log('🔍 [NC NUMBER FIX] Estrazione numero documento...');
                
                // Per NC, cerchiamo pattern specifici
                const upperText = this.text.toUpperCase();
                const isNC = upperText.includes('NOTA') && upperText.includes('CREDITO');
                
                if (isNC || (this.fileName && this.fileName.toUpperCase().includes('NC'))) {
                    console.log('📋 [NC NUMBER FIX] Documento NC rilevato');
                    
                    // Pattern specifici per NC (numeri a 4 cifre)
                    const ncPatterns = [
                        /NC\s+N[°.\s]*(\d{4})/i,              // NC N° 3873
                        /NC\s+(\d{4})/i,                      // NC 3873
                        /NOTA\s+(?:DI\s+)?CREDITO\s+N[°.\s]*(\d{4})/i,  // NOTA DI CREDITO N° 3873
                        /NUMERO\s+(\d{4})(?:\s|$)/i,           // NUMERO 3873
                        /N[°.\s]+(\d{4})(?:\s|$)/i,          // N° 3873
                        /^(\d{4})\s+\d{1,2}\/\d{2}\/\d{2}/m  // 3873 04/06/25 (inizio riga)
                    ];
                    
                    for (const pattern of ncPatterns) {
                        const match = this.text.match(pattern);
                        if (match && match[1]) {
                            console.log(`✅ [NC NUMBER FIX] Numero NC trovato: ${match[1]}`);
                            return match[1];
                        }
                    }
                    
                    // Se non trova con pattern specifici, cerca nel nome file
                    if (this.fileName) {
                        // Prima prova con numeri a 6 cifre (dal nome file)
                        const fileMatch6 = this.fileName.match(/(\d{6})/);
                        if (fileMatch6 && fileMatch6[1]) {
                            // Potrebbe essere che il numero nel documento sia solo le ultime 4 cifre
                            const last4Digits = fileMatch6[1].substring(2); // Prendi le ultime 4 cifre
                            console.log(`✅ [NC NUMBER FIX] Numero NC estratto dal nome file: ${fileMatch6[1]} (o ${last4Digits})`);
                            
                            // Cerca se nel documento c'è riferimento a questo numero a 4 cifre
                            if (this.text.includes(last4Digits)) {
                                console.log(`✅ [NC NUMBER FIX] Trovato numero a 4 cifre nel documento: ${last4Digits}`);
                                return last4Digits;
                            }
                            
                            return fileMatch6[1];
                        }
                    }
                }
                
                // Altrimenti usa il metodo originale
                const result = this._originalExtractDocumentNumber ? 
                    this._originalExtractDocumentNumber.call(this) : '';
                console.log(`[NC NUMBER FIX] Risultato metodo originale: ${result}`);
                
                // Se il risultato è "1" e abbiamo un nome file con numeri, prova ad estrarre dal nome
                if (result === '1' && this.fileName) {
                    const fileMatch = this.fileName.match(/(\d{6,})/);
                    if (fileMatch && fileMatch[1]) {
                        console.log(`✅ [NC NUMBER FIX] Correzione numero da nome file: ${fileMatch[1]}`);
                        return fileMatch[1];
                    }
                }
                
                return result;
            };
        }
        
        // Stesso override per FatturaExtractorModular
        if (window.FatturaExtractorModular && window.FatturaExtractorModular.prototype) {
            // Salva il metodo originale solo se non è già stato salvato
            if (!window.FatturaExtractorModular.prototype._originalExtractDocumentNumber) {
                window.FatturaExtractorModular.prototype._originalExtractDocumentNumber = 
                    window.FatturaExtractorModular.prototype.extractDocumentNumber;
            }
            
            window.FatturaExtractorModular.prototype.extractDocumentNumber = function() {
                console.log('🔍 [NC NUMBER FIX] Estrazione numero documento (Modular)...');
                
                // Per NC, cerchiamo pattern specifici
                const upperText = this.text.toUpperCase();
                const isNC = upperText.includes('NOTA') && upperText.includes('CREDITO');
                
                if (isNC || (this.fileName && this.fileName.toUpperCase().includes('NC'))) {
                    console.log('📋 [NC NUMBER FIX] Documento NC rilevato (Modular)');
                    
                    // Pattern specifici per NC (numeri a 4 cifre)
                    const ncPatterns = [
                        /NC\s+N[°.\s]*(\d{4})/i,              
                        /NC\s+(\d{4})/i,                      
                        /NOTA\s+(?:DI\s+)?CREDITO\s+N[°.\s]*(\d{4})/i,  
                        /NUMERO\s+(\d{4})(?:\s|$)/i,                   
                        /N[°.\s]+(\d{4})(?:\s|$)/i,          
                        /^(\d{4})\s+\d{1,2}\/\d{2}\/\d{2}/m  
                    ];
                    
                    for (const pattern of ncPatterns) {
                        const match = this.text.match(pattern);
                        if (match && match[1]) {
                            console.log(`✅ [NC NUMBER FIX] Numero NC trovato (Modular): ${match[1]}`);
                            return match[1];
                        }
                    }
                    
                    // Se non trova con pattern specifici, cerca nel nome file
                    if (this.fileName) {
                        // Prima prova con numeri a 6 cifre (dal nome file)
                        const fileMatch6 = this.fileName.match(/(\d{6})/);
                        if (fileMatch6 && fileMatch6[1]) {
                            // Potrebbe essere che il numero nel documento sia solo le ultime 4 cifre
                            const last4Digits = fileMatch6[1].substring(2); // Prendi le ultime 4 cifre
                            console.log(`✅ [NC NUMBER FIX] Numero NC estratto dal nome file (Modular): ${fileMatch6[1]} (o ${last4Digits})`);
                            
                            // Cerca se nel documento c'è riferimento a questo numero a 4 cifre
                            if (this.text.includes(last4Digits)) {
                                console.log(`✅ [NC NUMBER FIX] Trovato numero a 4 cifre nel documento: ${last4Digits}`);
                                return last4Digits;
                            }
                            
                            return fileMatch6[1];
                        }
                    }
                }
                
                // Altrimenti usa il metodo originale se esiste
                let result = '';
                if (this._originalExtractDocumentNumber) {
                    result = this._originalExtractDocumentNumber.call(this);
                } else {
                    // Non usare super qui, potrebbe causare errori
                    result = '';
                }
                
                console.log(`[NC NUMBER FIX] Risultato metodo originale (Modular): ${result}`);
                
                // Se il risultato è "1" e abbiamo un nome file con numeri, prova ad estrarre dal nome
                if (result === '1' && this.fileName) {
                    const fileMatch = this.fileName.match(/(\d{6,})/);
                    if (fileMatch && fileMatch[1]) {
                        console.log(`✅ [NC NUMBER FIX] Correzione numero da nome file (Modular): ${fileMatch[1]}`);
                        return fileMatch[1];
                    }
                }
                
                return result;
            };
        }
    }
    
    // Applica immediatamente
    overrideFatturaExtractor();
    
    // Riapplica dopo un delay per essere sicuri
    setTimeout(overrideFatturaExtractor, 100);
    setTimeout(overrideFatturaExtractor, 500);
    setTimeout(overrideFatturaExtractor, 1000);
    
    console.log('✅ [NC NUMBER FIX] Fix installato con successo');
})();