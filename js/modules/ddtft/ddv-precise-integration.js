/**
 * Integrazione specifica del Precise Address Extractor per DDV
 * Migliora l'estrazione per il formato specifico dei DDV Alfieri
 */

(function() {
    'use strict';
    
    console.log('🎯 Caricamento integrazione DDV Precise...');
    
    // Override del metodo extractFromDDVFormat nel PreciseDeliveryAddressExtractor
    if (window.PreciseDeliveryAddressExtractor) {
        const originalExtractFromDDVFormat = window.PreciseDeliveryAddressExtractor.prototype.extractFromDDVFormat;
        
        window.PreciseDeliveryAddressExtractor.prototype.extractFromDDVFormat = function(rows, metadata) {
            if (this.debug) console.log('\n📋 [DDV Format Enhanced] Checking DDV format...');
            
            // Prima prova il metodo originale
            const originalResult = originalExtractFromDDVFormat.call(this, rows, metadata);
            if (originalResult && this.validateAddress(originalResult)) {
                return originalResult;
            }
            
            // Se non funziona, usa il metodo migliorato
            if (this.debug) console.log('[DDV Format Enhanced] Trying enhanced extraction...');
            
            // Cerca il pattern DDV con maggiore flessibilità
            let ddvRowIndex = -1;
            const ddvPatterns = [
                /^(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(2\d{4})$/, // Pattern standard
                /(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(2\d{4})/, // Pattern più flessibile
                /^.*?(\d{4})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(2\d{4}).*$/ // Pattern con testo extra
            ];
            
            // Cerca la riga DDV con pattern multipli
            for (let i = 0; i < rows.length; i++) {
                const rowText = this.getRowText(rows[i]);
                
                for (const pattern of ddvPatterns) {
                    if (pattern.test(rowText)) {
                        ddvRowIndex = i;
                        if (this.debug) console.log(`✓ [DDV Format Enhanced] Found DDV row at index ${i}: "${rowText}"`);
                        break;
                    }
                }
                
                if (ddvRowIndex !== -1) break;
            }
            
            if (ddvRowIndex === -1) {
                if (this.debug) console.log('✗ [DDV Format Enhanced] No DDV pattern found');
                return null;
            }
            
            // Estrai i dati con logica migliorata
            const addressParts = {
                street: '',
                city: '',
                cap: '',
                province: '',
                additionalInfo: ''
            };
            
            // Analizza le righe successive con maggiore intelligenza
            // Riga +1: Nome cliente (spesso duplicato)
            if (ddvRowIndex + 1 < rows.length) {
                const clientRow = rows[ddvRowIndex + 1];
                const clientText = this.getRowText(clientRow);
                
                if (this.debug) console.log(`[DDV Format Enhanced] Client row: "${clientText}"`);
                
                // Verifica se il nome è duplicato e usa la seconda occorrenza
                const clientColumns = this.extractColumnsEnhanced(clientRow, clientText);
                if (this.debug && clientColumns) {
                    console.log(`[DDV Format Enhanced] Client columns:`, clientColumns);
                }
            }
            
            // Riga +2: Indirizzo
            if (ddvRowIndex + 2 < rows.length) {
                const addressRow = rows[ddvRowIndex + 2];
                const addressText = this.getRowText(addressRow);
                
                if (this.debug) console.log(`[DDV Format Enhanced] Address row: "${addressText}"`);
                
                // Estrai usando metodo migliorato
                const addressColumns = this.extractColumnsEnhanced(addressRow, addressText);
                
                if (addressColumns && addressColumns.right) {
                    addressParts.street = addressColumns.right;
                    
                    // Verifica se c'è info aggiuntiva nella riga successiva
                    if (ddvRowIndex + 3 < rows.length) {
                        const nextRowText = this.getRowText(rows[ddvRowIndex + 3]);
                        
                        // Se la riga contiene INGR. SCARICO o simili
                        if (nextRowText.includes('INGR.') || nextRowText.includes('SCARICO')) {
                            const ingrColumns = this.extractColumnsEnhanced(rows[ddvRowIndex + 3], nextRowText);
                            if (ingrColumns && ingrColumns.right) {
                                addressParts.additionalInfo = ingrColumns.right;
                                if (this.debug) console.log(`✓ [DDV Format Enhanced] Additional info: "${addressParts.additionalInfo}"`);
                            }
                        }
                    }
                    
                    if (this.debug) console.log(`✓ [DDV Format Enhanced] Delivery address: "${addressParts.street}"`);
                }
            }
            
            // Riga CAP + città (può essere +3 o +4 a seconda del layout)
            for (let offset = 3; offset <= 4 && ddvRowIndex + offset < rows.length; offset++) {
                const cityRow = rows[ddvRowIndex + offset];
                const cityText = this.getRowText(cityRow);
                
                // Verifica se contiene un CAP
                if (/\d{5}/.test(cityText)) {
                    if (this.debug) console.log(`[DDV Format Enhanced] City row: "${cityText}"`);
                    
                    const cityColumns = this.extractColumnsEnhanced(cityRow, cityText);
                    if (cityColumns && cityColumns.right) {
                        const cityParts = this.parseCity(cityColumns.right);
                        Object.assign(addressParts, cityParts);
                        if (this.debug) console.log(`✓ [DDV Format Enhanced] City parts:`, cityParts);
                        break;
                    }
                }
            }
            
            return this.combineAddressParts(addressParts);
        };
        
        // Aggiungi metodo helper per estrazione colonne migliorata
        window.PreciseDeliveryAddressExtractor.prototype.extractColumnsEnhanced = function(row, rowText) {
            // Se abbiamo elementi con coordinate X
            const elements = this.getRowElements(row);
            if (elements.length >= 2) {
                // Trova il gap più significativo
                const sorted = elements.sort((a, b) => a.x - b.x);
                let maxGap = 0;
                let splitIndex = -1;
                
                for (let i = 0; i < sorted.length - 1; i++) {
                    const gap = sorted[i + 1].x - sorted[i].x;
                    if (gap > maxGap && gap > 50) { // Soglia minima di 50 pixel
                        maxGap = gap;
                        splitIndex = i;
                    }
                }
                
                if (splitIndex >= 0) {
                    const leftElements = sorted.slice(0, splitIndex + 1);
                    const rightElements = sorted.slice(splitIndex + 1);
                    
                    return {
                        left: leftElements.map(e => e.text).join(' ').trim(),
                        right: rightElements.map(e => e.text).join(' ').trim()
                    };
                }
            }
            
            // Fallback ai metodi esistenti
            // Pattern 1: Due VIA sulla stessa riga
            const viaMatch = rowText.match(/^(.+?VIA[^,]+(?:,\s*\d+[^V]*)?)\s+(VIA.+)$/i);
            if (viaMatch) {
                return {
                    left: viaMatch[1].trim(),
                    right: viaMatch[2].trim()
                };
            }
            
            // Pattern 2: Due CAP sulla stessa riga
            const capMatch = rowText.match(/^(.+?\d{5}[^0-9]+[A-Z]{2})\s+(\d{5}.+)$/i);
            if (capMatch) {
                return {
                    left: capMatch[1].trim(),
                    right: capMatch[2].trim()
                };
            }
            
            // Pattern 3: Nome duplicato
            const parts = rowText.split(/\s{2,}/);
            if (parts.length === 2 && parts[0].trim() === parts[1].trim()) {
                return {
                    left: parts[0].trim(),
                    right: parts[1].trim()
                };
            }
            
            // Pattern 4: Split generico su spazi multipli
            if (parts.length >= 2) {
                return {
                    left: parts[0].trim(),
                    right: parts[parts.length - 1].trim()
                };
            }
            
            return null;
        };
        
        console.log('✅ [DDV Precise Integration] Enhanced DDV extraction methods added');
    }
    
})();