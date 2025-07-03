/**
 * Fix MASTER per il parsing degli articoli DDT
 * Gestisce tutti i formati DDT in modo intelligente
 */

(function() {
    'use strict';
    
    console.log('🎯 [DDT MASTER FIX] Caricamento fix master articoli DDT...');
    
    // Funzione per applicare l'override definitivo
    function applyMasterOverride() {
        if (window.DDTFTDocumentParser) {
            const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
            
            window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
                console.log('🎯 [DDT MASTER FIX] INTERCETTATO parseDocumentFromText');
                
                // Prima chiamiamo l'originale per avere la struttura base
                const result = originalParse.call(this, text, fileName);
                
                // Solo per DDT
                if (result && (result.type === 'ddt' || result.documentType === 'DDT')) {
                    console.log('🎯 [DDT MASTER FIX] Processing DDT articles...');
                    
                    const lines = text.split('\n');
                    const newItems = [];
                    
                    // Analizza tutto il documento per trovare gli articoli
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        
                        // Salta righe vuote o non pertinenti
                        if (!line || line.length < 20) continue;
                        
                        // Pattern per identificare una riga articolo
                        // Deve iniziare con un codice prodotto (lettere/numeri)
                        if (line.match(/^[A-Z0-9]{6,}\s/)) {
                            console.log(`🎯 [DDT MASTER FIX] Candidato articolo: ${line}`);
                            
                            // Estrattore universale che funziona per tutti i formati
                            const item = extractArticleFromLine(line);
                            
                            if (item && item.quantity > 0 && item.total > 0) {
                                newItems.push(item);
                                console.log(`🎯 [DDT MASTER FIX] ✅ Articolo estratto: ${item.code} - Q:${item.quantity} x P:€${item.price.toFixed(2)} ${item.discount > 0 ? `- ${item.discount}%` : ''} = €${item.total.toFixed(2)} (IVA ${item.vat})`);
                            }
                        }
                    }
                    
                    // Se abbiamo trovato articoli validi, sostituisci
                    if (newItems.length > 0) {
                        console.log(`🎯 [DDT MASTER FIX] Sostituendo ${result.items?.length || 0} articoli con ${newItems.length} articoli corretti`);
                        
                        result.items = newItems;
                        
                        // Ricalcola totali
                        let subtotal = 0;
                        let totalIVA = 0;
                        
                        newItems.forEach(item => {
                            subtotal += item.total;
                            const ivaRate = item.vatRate / 100;
                            totalIVA += item.total * ivaRate;
                        });
                        
                        result.subtotal = subtotal;
                        result.vat = totalIVA;
                        result.iva = totalIVA;
                        
                        console.log(`🎯 [DDT MASTER FIX] Totali: Subtotale €${subtotal.toFixed(2)}, IVA €${totalIVA.toFixed(2)}`);
                    }
                }
                
                return result;
            };
            
            console.log('✅ [DDT MASTER FIX] Override applicato con successo');
        }
    }
    
    // Funzione estrattore universale per articoli
    function extractArticleFromLine(line) {
        // Step 1: Trova l'unità di misura (punto di riferimento)
        const units = ['PZ', 'KG', 'CF', 'CT', 'LT', 'MT', 'GR', 'ML', 'BT', 'SC'];
        let unitMatch = null;
        let unitIndex = -1;
        
        for (const unit of units) {
            const regex = new RegExp(`\\b${unit}\\b`);
            const match = line.match(regex);
            if (match) {
                unitMatch = unit;
                unitIndex = line.indexOf(match[0]);
                break;
            }
        }
        
        if (!unitMatch || unitIndex < 0) {
            console.log(`🎯 [DDT MASTER FIX] ❌ Nessuna unità di misura trovata in: ${line}`);
            return null;
        }
        
        // Step 2: Estrai il codice prodotto (all'inizio della riga)
        const codeMatch = line.match(/^([A-Z0-9]{6,})\s+/);
        if (!codeMatch) {
            console.log(`🎯 [DDT MASTER FIX] ❌ Nessun codice prodotto trovato`);
            return null;
        }
        
        const code = codeMatch[1];
        
        // Step 3: Estrai la descrizione (tra codice e ultima unità di misura)
        const lastUnitIdx = line.lastIndexOf(unitMatch);
        const descEndIndex = lastUnitIdx > unitIndex ? lastUnitIdx : unitIndex;
        const beforeUnit = line.substring(0, descEndIndex).trim();
        const description = beforeUnit.substring(code.length).trim();
        
        // Step 4: Estrai i numeri dopo l'unità di misura
        // IMPORTANTE: Cerca l'ULTIMA occorrenza dell'unità di misura per evitare confusione con il nome
        const afterUnit = line.substring(unitIndex + unitMatch.length).trim();
        
        // Controlla se ci sono altre occorrenze dell'unità dopo la prima
        const lastUnitIndex = line.lastIndexOf(unitMatch);
        let numbersStartIndex = unitIndex + unitMatch.length;
        
        if (lastUnitIndex > unitIndex) {
            // Usa l'ultima occorrenza dell'unità di misura
            numbersStartIndex = lastUnitIndex + unitMatch.length;
            console.log(`🎯 [DDT MASTER FIX] Trovate multiple occorrenze di ${unitMatch}, uso l'ultima`);
        }
        
        const finalAfterUnit = line.substring(numbersStartIndex).trim();
        const numbers = finalAfterUnit.match(/[\d,\.]+/g) || [];
        
        console.log(`🎯 [DDT MASTER FIX] Numeri trovati dopo ${unitMatch}: ${numbers.join(' | ')}`);
        
        if (numbers.length < 3) {
            console.log(`🎯 [DDT MASTER FIX] ❌ Numeri insufficienti`);
            return null;
        }
        
        // Step 5: Interpreta i numeri in base al pattern
        let quantity = 0;
        let price = 0;
        let discount = 0;
        let total = 0;
        let vat = 10; // default
        
        // Trova il totale (numero con formato x.xxx,xx o xxx,xx)
        // IMPORTANTE: il totale è tipicamente il numero più grande dopo il prezzo
        let totalIndex = -1;
        let maxValue = 0;
        
        // Inizia dal terzo numero (dopo quantità e prezzo)
        for (let i = 2; i < numbers.length; i++) {
            if (numbers[i].match(/^\d{1,3}(?:\.\d{3})*,\d{2}$/)) {
                const value = parseFloat(numbers[i].replace(/\./g, '').replace(',', '.'));
                // Il totale dovrebbe essere maggiore del prezzo unitario
                if (value > maxValue && value > parseFloat(numbers[1].replace(',', '.'))) {
                    maxValue = value;
                    totalIndex = i;
                    total = value;
                }
            }
        }
        
        if (totalIndex < 0 || total <= 0) {
            console.log(`🎯 [DDT MASTER FIX] ❌ Totale non trovato o non valido`);
            return null;
        }
        
        // Il primo numero è sempre la quantità
        quantity = parseFloat(numbers[0].replace(',', '.'));
        
        // Il secondo numero è il prezzo (formato x,xxxx)
        if (numbers[1] && numbers[1].match(/^\d+,\d{4}$/)) {
            price = parseFloat(numbers[1].replace(',', '.'));
        }
        
        // Se c'è un numero tra prezzo e totale, potrebbe essere lo sconto
        // Lo sconto tipicamente è un numero piccolo (es: 5,00 o 15,00)
        if (totalIndex > 2) {
            for (let i = 2; i < totalIndex; i++) {
                if (numbers[i].match(/^\d{1,2},\d{2}$/)) {
                    const possibleDiscount = parseFloat(numbers[i].replace(',', '.'));
                    if (possibleDiscount <= 100) { // Gli sconti sono percentuali
                        discount = possibleDiscount;
                        break;
                    }
                }
            }
        }
        
        // L'IVA è dopo il totale
        if (numbers[totalIndex + 1] && numbers[totalIndex + 1].match(/^\d{2}$/)) {
            vat = parseInt(numbers[totalIndex + 1]);
        }
        
        // Se non abbiamo il prezzo, calcolalo dal totale
        if (price === 0 && quantity > 0) {
            price = total / quantity;
        }
        
        return {
            code: code,
            description: description,
            unit: unitMatch,
            quantity: quantity,
            price: price,
            discount: discount,
            total: total,
            vat: vat + '%',
            iva: vat + '',
            vatRate: vat
        };
    }
    
    // Applica immediatamente
    applyMasterOverride();
    
    // Riapplica dopo un delay per sovrascrivere altri fix
    setTimeout(applyMasterOverride, 100);
    setTimeout(applyMasterOverride, 500);
    setTimeout(applyMasterOverride, 1000);
    
    // Esponi la funzione per test
    window.testDDTMasterExtractor = extractArticleFromLine;
    
})();