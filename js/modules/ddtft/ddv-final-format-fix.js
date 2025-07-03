/**
 * Fix finale per formattazione output DDV
 * Garantisce che l'output sia nel formato richiesto: NOME CLIENTE INDIRIZZO CAP CITTÀ PROVINCIA
 */

(function() {
    'use strict';
    
    console.log('🎨 Applicando fix formattazione finale DDV...');
    
    // Override del metodo che formatta il risultato finale
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            // Chiama il parser originale
            const result = originalParse.call(this, text, fileName);
            
            if (!result) return result;
            
            // Se è un DDT/DDV, formatta l'output correttamente
            if (result.documentType === 'DDT' || fileName.includes('DDV')) {
                console.log('[DDV FORMAT FIX] Formattazione risultato DDV');
                
                // Assicurati che l'indirizzo di consegna sia formattato correttamente
                if (result.deliveryAddress) {
                    // Rimuovi spazi multipli e normalizza
                    result.deliveryAddress = result.deliveryAddress
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    // NON aggiungere il nome cliente all'indirizzo
                    // L'indirizzo deve contenere solo via, CAP, città e provincia
                    result.deliveryAddressComplete = result.deliveryAddress;
                    
                    console.log('[DDV FORMAT FIX] Indirizzo consegna formattato:', result.deliveryAddressComplete);
                }
                
                // Formatta il risultato finale senza il nome cliente
                if (result.deliveryAddress) {
                    // L'indirizzo dovrebbe già essere completo con via, CAP, città
                    result.formattedDelivery = result.deliveryAddress;
                    
                    console.log('[DDV FORMAT FIX] Formato finale:', result.formattedDelivery);
                }
            }
            
            return result;
        };
        
        console.log('✅ [DDV FORMAT FIX] Override formattazione applicato');
    }
    
    /**
     * Parse componenti indirizzo
     */
    function parseAddressComponents(address) {
        const components = {
            street: '',
            cap: '',
            city: '',
            province: ''
        };
        
        if (!address) return components;
        
        // Pattern per estrarre CAP, città e provincia
        const capCityMatch = address.match(/(\d{5})\s+([A-Z\s]+?)(?:\s+([A-Z]{2}))?$/i);
        
        if (capCityMatch) {
            components.cap = capCityMatch[1];
            components.city = capCityMatch[2].trim();
            components.province = capCityMatch[3] || '';
            
            // Estrai la via (tutto prima del CAP)
            const capIndex = address.indexOf(capCityMatch[0]);
            if (capIndex > 0) {
                components.street = address.substring(0, capIndex).trim();
            }
        } else {
            // Se non troviamo il pattern, usa l'intero indirizzo
            components.street = address;
        }
        
        // Gestisci info aggiuntive come INGR. SCARICO
        if (components.street.includes('INGR.') || components.street.includes('SCARICO')) {
            // Mantieni tutto insieme nella via
        }
        
        return components;
    }
    
    // Aggiungi funzione helper globale per formattare indirizzi
    window.formatDeliveryAddress = function(clientName, address) {
        if (!clientName || !address) return '';
        
        const components = parseAddressComponents(address);
        const parts = [clientName];
        
        if (components.street) parts.push(components.street);
        if (components.cap) parts.push(components.cap);
        if (components.city) parts.push(components.city);
        if (components.province) parts.push(components.province);
        
        return parts.join('  ');
    };
    
})();