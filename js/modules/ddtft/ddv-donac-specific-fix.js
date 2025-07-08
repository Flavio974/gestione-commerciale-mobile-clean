/**
 * Fix specifico per DONAC e casi simili
 * Corregge direttamente l'output finale quando rileva pattern errati
 */

(function() {
    'use strict';
    
    console.log('🎯 Applicando fix specifico DONAC/DDV...');
    
    // Lista di correzioni specifiche
    const SPECIFIC_CORRECTIONS = {
        // Pattern errato -> Correzione
        // CONFERMATO dall'utente: DONAC usa VIA MARGARITA come indirizzo di consegna
        // Non servono correzioni per DONAC
        'VIA BERTOLE\', 13/15 10088 VOLPIANO TO': 'VIA MEANA, SNC 10088 VOLPIANO TO',
        'VIA BERTOLE\', 13/15 10139 TORINO TO': 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO'
    };
    
    // Override di tutti i metodi che possono restituire l'indirizzo
    
    // 1. Override DDTFTDocumentParser.parseDocumentFromText
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && result.deliveryAddress) {
                result.deliveryAddress = applyCorrection(result.deliveryAddress, text, result);
                result.indirizzoConsegna = result.deliveryAddress;
            }
            
            return result;
        };
    }
    
    // 2. Override DDTExtractor se presente
    if (window.DDTExtractor) {
        const originalExtract = window.DDTExtractor.prototype.extract;
        
        if (originalExtract) {
            window.DDTExtractor.prototype.extract = function() {
                const result = originalExtract.call(this);
                
                if (result && result.deliveryAddress) {
                    result.deliveryAddress = applyCorrection(result.deliveryAddress, this.text, result);
                }
                
                return result;
            };
        }
    }
    
    // 3. Override FatturaExtractor se presente
    if (window.FatturaExtractor) {
        const originalExtract = window.FatturaExtractor.prototype.extract;
        
        if (originalExtract) {
            window.FatturaExtractor.prototype.extract = function() {
                const result = originalExtract.call(this);
                
                if (result && result.deliveryAddress) {
                    result.deliveryAddress = applyCorrection(result.deliveryAddress, this.text, result);
                }
                
                return result;
            };
        }
    }
    
    /**
     * Applica le correzioni all'indirizzo
     */
    function applyCorrection(address, fullText, documentData) {
        if (!address) return address;
        
        console.log(`[DONAC FIX] Verifica indirizzo: "${address}"`);
        
        // Correzione diretta da tabella
        for (const [wrong, correct] of Object.entries(SPECIFIC_CORRECTIONS)) {
            if (address === wrong || address.includes(wrong)) {
                console.log(`[DONAC FIX] Correzione diretta: "${wrong}" -> "${correct}"`);
                return correct;
            }
        }
        
        // Correzioni basate su pattern
        
        // 1. DISABILITATO - DONAC ha più punti vendita con indirizzi diversi
        // Questa sezione è commentata per evitare errori di sintassi
        /*
        if (address.includes('VIA MARGARITA') && fullText && fullText.includes('VIA SALUZZO')) {
            console.log('[DONAC FIX] Correzione VIA MARGARITA -> VIA SALUZZO');
        }
        */
        
        // 2. DISABILITATO - Non cambiare automaticamente i CAP
        /*
        if (address.includes('12100') && fullText && fullText.includes('12038 SAVIGLIANO')) {
            console.log('[DONAC FIX] Correzione CAP 12100 -> 12038 SAVIGLIANO');
            const corrected = address.replace(/12100[^0-9]+CUNEO[^0-9]+CN/, '12038 SAVIGLIANO CN');
            return corrected;
        }
        */
        
        // 3. NON forzare più l'indirizzo per DONAC - hanno diversi punti vendita
        // Commentato perché DONAC ha più sedi con indirizzi diversi
        /*
        if (documentData && documentData.clientName && 
            documentData.clientName.includes('DONAC') && 
            !address.includes('VIA SALUZZO')) {
            console.log('[DONAC FIX] Cliente DONAC rilevato, forzo indirizzo corretto');
            return 'VIA SALUZZO, 65 12038 SAVIGLIANO CN';
        }
        */
        
        // 4. Se è cliente BOREALE con pattern errato
        if (documentData && documentData.clientName && 
            documentData.clientName.includes('BOREALE')) {
            
            // Se l'indirizzo contiene VIA BERTOLE' e CAP 10088, dovrebbe essere VIA MEANA
            if (address.includes('VIA BERTOLE') && address.includes('10088')) {
                console.log('[DONAC FIX] Cliente BOREALE con VIA BERTOLE\' -> VIA MEANA');
                return 'VIA MEANA, SNC 10088 VOLPIANO TO';
            }
            
            // Se l'indirizzo contiene VIA BERTOLE' e CAP 10139, dovrebbe essere VIA CESANA
            if (address.includes('VIA BERTOLE') && address.includes('10139')) {
                console.log('[DONAC FIX] Cliente BOREALE con VIA BERTOLE\' -> VIA CESANA');
                return 'VIA CESANA, 78 INGR. SCARICO: VIA PEROSA, 75 10139 TORINO TO';
            }
        }
        
        return address;
    }
    
    // Aggiungi metodo globale per test
    window.testDonacFix = function(address, fullText, clientName) {
        const mockData = { clientName: clientName || '' };
        return applyCorrection(address, fullText || '', mockData);
    };
    
    console.log('✅ [DONAC FIX] Fix specifico attivato');
    console.log('   Correzioni disponibili:', Object.keys(SPECIFIC_CORRECTIONS).length);
    
})();