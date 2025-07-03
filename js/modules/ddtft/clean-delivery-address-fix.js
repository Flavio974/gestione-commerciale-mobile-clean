/**
 * Fix finale per pulire l'indirizzo di consegna
 * Rimuove LOC. TETTO GARETTO e simili dall'indirizzo finale
 */

(function() {
    'use strict';
    
    console.log('🧹 Applicando pulizia finale indirizzo consegna...');
    
    // Override del normalizeDocumentFields finale
    if (window.normalizeDocumentFields) {
        const originalNormalize = window.normalizeDocumentFields;
        
        window.normalizeDocumentFields = function(doc) {
            // Prima chiama la funzione originale
            const result = originalNormalize.call(this, doc);
            
            if (result && (result.deliveryAddress || result.indirizzoConsegna)) {
                const currentAddress = result.deliveryAddress || result.indirizzoConsegna;
                
                // Pulisci l'indirizzo da pattern non desiderati
                let cleanedAddress = currentAddress;
                
                // Rimuovi LOC. TETTO GARETTO e pattern simili
                cleanedAddress = cleanedAddress.replace(/\b(LOC\.|LOCALITÀ|FRAZ\.|FRAZIONE)\s+[^,]+\s+(?=VIA|V\.LE|VIALE|CORSO)/gi, '');
                
                // Rimuovi separatore | se presente
                cleanedAddress = cleanedAddress.replace(/\s*\|\s*/g, ' ');
                
                // Se l'indirizzo contiene LOC. TETTO GARETTO seguito da VIA
                if (cleanedAddress.includes('LOC. TETTO GARETTO') && cleanedAddress.includes('VIA')) {
                    // Estrai solo dalla VIA in poi
                    const viaIndex = cleanedAddress.lastIndexOf('VIA');
                    if (viaIndex >= 0) {
                        cleanedAddress = cleanedAddress.substring(viaIndex);
                    }
                }
                
                // Rimuovi spazi multipli
                cleanedAddress = cleanedAddress.replace(/\s+/g, ' ').trim();
                
                // Se è cambiato, aggiorna
                if (cleanedAddress !== currentAddress) {
                    console.log(`[CLEAN ADDRESS] Indirizzo pulito da: "${currentAddress}"`);
                    console.log(`[CLEAN ADDRESS] Indirizzo pulito a: "${cleanedAddress}"`);
                    
                    result.deliveryAddress = cleanedAddress;
                    result.indirizzoConsegna = cleanedAddress;
                }
            }
            
            return result;
        };
        
        console.log('✅ [CLEAN ADDRESS] Pulizia indirizzo attivata');
    }
    
    // Funzione helper per test
    window.cleanDeliveryAddress = function(address) {
        if (!address) return '';
        
        let cleaned = address;
        
        // Rimuovi LOC/LOCALITÀ/FRAZ pattern
        cleaned = cleaned.replace(/\b(LOC\.|LOCALITÀ|FRAZ\.|FRAZIONE)\s+[^,]+\s+(?=VIA|V\.LE|VIALE|CORSO)/gi, '');
        
        // Rimuovi separatore |
        cleaned = cleaned.replace(/\s*\|\s*/g, ' ');
        
        // Se contiene ancora LOC. TETTO GARETTO
        if (cleaned.includes('LOC. TETTO GARETTO') && cleaned.includes('VIA')) {
            const viaIndex = cleaned.lastIndexOf('VIA');
            if (viaIndex >= 0) {
                cleaned = cleaned.substring(viaIndex);
            }
        }
        
        // Normalizza spazi
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        return cleaned;
    };
    
})();