/**
 * Fix per l'estrazione corretta del riferimento ordine
 * Evita di catturare parole come "TERMINI" che non sono riferimenti ordine validi
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix riferimento ordine...');
    
    // Parole da escludere che non sono riferimenti ordine
    const EXCLUDED_WORDS = [
        'TERMINI', 'CONDIZIONI', 'PAGAMENTO', 'CONSEGNA', 
        'NOTE', 'VEDI', 'SEGUONO', 'NOSTRO', 'VOSTRO',
        'DATA', 'TRASPORTO', 'SPEDIZIONE', 'RITIRO'
    ];
    
    // Pattern migliorati per catturare solo riferimenti ordine validi
    const ORDER_PATTERNS = [
        // Pattern specifici per ordini veri (NON per codice operatore "507 SAFFIRIO")
        // Pattern specifico per "Rif. Vs. Ordine n." con codice alfanumerico completo
        /RIF\.?\s*V[S.]?\s*\.?\s*ORDINE\s*N\.?\s*([A-Z0-9]+)\s*del/i,
        /V[S.]?\s*\.?\s*ORDINE\s*N\.?\s*([A-Z0-9]+)\s*del/i,
        // Pattern per catturare ordini che iniziano con 507 (es: 507A865AS02756)
        /Ordine\s*n\.\s*(507[A-Z0-9]+)/i,
        /RIF.*?ORDINE.*?N\.?\s*(507[A-Z0-9]+)/i,
        // Pattern per ODV (Ordine Di Vendita)
        /ODV\s+Nr\.?\s*([A-Z0-9]+)/i,
        /ODV\s+N\.?\s*([A-Z0-9]+)/i,
        // Pattern per codici alfanumerici completi (cattura fino a "del" o fine riga)
        /RIF(?:ERIMENTO)?\s*\.?\s*ORDINE[:\s]+([A-Z0-9]+)(?:\s+del|\s*$)/i,
        /ORDINE\s+N[°.]?\s*([A-Z0-9]+)(?:\s+del|\s*$)/i,
        // Pattern generali per codici alfanumerici
        /RIF(?:ERIMENTO)?\s*\.?\s*ORDINE[:\s]+([A-Z0-9\-\/]+)/i,
        /VS\s*\.?\s*ORDINE[:\s]+([A-Z0-9\-\/]+)/i,
        /NS\s*\.?\s*ORDINE[:\s]+([A-Z0-9\-\/]+)/i,
        // Pattern per numeri ordine semplici
        /RIF(?:ERIMENTO)?\s*\.?\s*ORDINE[:\s]+(\d+(?:[-\/]\d+)*)/i,
        /ORDINE\s+N[°.]?\s*(\d+(?:[-\/]\d+)*)/i
    ];
    
    // Funzione per validare il riferimento ordine
    function isValidOrderReference(ref) {
        if (!ref) return false;
        
        // Escludi le parole nella blacklist
        if (EXCLUDED_WORDS.includes(ref.toUpperCase())) {
            return false;
        }
        
        // Deve contenere almeno un numero
        if (!/\d/.test(ref)) {
            return false;
        }
        
        // Non deve essere solo una data (es. 15/06/2025)
        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(ref)) {
            return false;
        }
        
        return true;
    }
    
    // Override del metodo extractOrderReference
    function overrideExtractOrderReference(ExtractorClass, className) {
        if (!ExtractorClass || !ExtractorClass.prototype) return;
        
        if (!ExtractorClass.prototype.extractOrderReference) {
            console.warn(`[ORDER-REF FIX] Metodo extractOrderReference non trovato in ${className}`);
            return;
        }
        
        const originalMethod = ExtractorClass.prototype.extractOrderReference;
        
        ExtractorClass.prototype.extractOrderReference = function() {
            console.log(`🎯 [ORDER-REF FIX] extractOrderReference intercettato su ${className}`);
            
            // Prima prova con i pattern migliorati
            for (let i = 0; i < ORDER_PATTERNS.length; i++) {
                const pattern = ORDER_PATTERNS[i];
                const match = this.text.match(pattern);
                if (match && match[1]) {
                    const ref = match[1].trim();
                    
                    if (ref) {
                        console.log(`[ORDER-REF FIX] Pattern ${i} ha trovato: "${ref}" con regex: ${pattern}`);
                        if (isValidOrderReference(ref)) {
                            console.log(`✅ [ORDER-REF FIX] Trovato riferimento ordine valido: ${ref}`);
                            return ref;
                        } else {
                            console.log(`❌ [ORDER-REF FIX] Scartato riferimento non valido: ${ref}`);
                        }
                    }
                }
            }
            
            // Se non trova nulla con i pattern migliorati, prova il metodo originale
            const originalResult = originalMethod.call(this);
            
            if (originalResult && isValidOrderReference(originalResult)) {
                console.log(`✅ [ORDER-REF FIX] Metodo originale ha trovato: ${originalResult}`);
                return originalResult;
            } else if (originalResult) {
                console.log(`❌ [ORDER-REF FIX] Metodo originale ha trovato valore non valido: ${originalResult}`);
                return ''; // Ritorna stringa vuota invece di un valore non valido
            }
            
            console.log('[ORDER-REF FIX] Nessun riferimento ordine trovato');
            return '';
        };
        
        console.log(`✅ [ORDER-REF FIX] Override applicato a ${className}.extractOrderReference`);
    }
    
    // Applica il fix dopo che gli extractors sono stati caricati
    setTimeout(() => {
        if (window.DDTExtractor) {
            overrideExtractOrderReference(window.DDTExtractor, 'DDTExtractor');
        }
        
        if (window.DDTExtractorModular) {
            overrideExtractOrderReference(window.DDTExtractorModular, 'DDTExtractorModular');
        }
        
        if (window.FatturaExtractor) {
            overrideExtractOrderReference(window.FatturaExtractor, 'FatturaExtractor');
        }
        
        if (window.FatturaExtractorModular) {
            overrideExtractOrderReference(window.FatturaExtractorModular, 'FatturaExtractorModular');
        }
        
        console.log('✅ Fix riferimento ordine completato');
    }, 100);
    
})();