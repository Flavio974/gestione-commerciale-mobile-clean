/**
 * Utilities per gestione prodotti/articoli DDT-FT
 * Parsing, validazione e calcolo totali
 */

window.DDTFTProductUtils = (function() {
    'use strict';
    
    /**
     * Valida un codice articolo
     */
    function isValidArticleCode(code, validCodes) {
        if (!code) return false;
        
        // Se abbiamo una lista di codici validi, controlla
        if (validCodes && Array.isArray(validCodes)) {
            return validCodes.includes(code);
        }
        
        // Pattern di default per codici articolo
        // 6 cifre, oppure 2 lettere + 6 cifre, oppure PIRR + 3 cifre
        return /^(\d{6}|[A-Z]{2}\d{6}|PIRR\d{3})$/.test(code);
    }
    
    /**
     * Estrae informazioni prodotto da una riga di testo
     */
    function parseProductLine(line, validCodes, validUnits) {
        if (!line) return null;
        
        const defaultUnits = ['PZ', 'KG', 'LT', 'MT', 'CF', 'CT', 'GR', 'ML'];
        const units = validUnits || defaultUnits;
        
        // Pattern per riga prodotto: codice descrizione quantità unità [prezzo] [totale] [iva]
        const pattern = new RegExp(
            `(\\b(?:\\d{6}|[A-Z]{2}\\d{6}|PIRR\\d{3})\\b)\\s+` + // Codice
            `(.+?)\\s+` + // Descrizione
            `(\\d+(?:[,\\.]\\d+)?)\\s+` + // Quantità
            `(${units.join('|')})\\b`, // Unità
            'i'
        );
        
        const match = line.match(pattern);
        if (!match) return null;
        
        const product = {
            code: match[1],
            description: match[2].trim(),
            quantity: parseFloat(match[3].replace(',', '.')),
            unit: match[4].toUpperCase()
        };
        
        // Valida il codice se abbiamo una lista
        if (validCodes && !isValidArticleCode(product.code, validCodes)) {
            return null;
        }
        
        // Cerca prezzo e totale dopo l'unità
        const afterUnit = line.substring(match.index + match[0].length);
        const numbers = afterUnit.match(/(\d+[,\.]\d{2})/g);
        
        if (numbers && numbers.length >= 1) {
            product.price = parseFloat(numbers[0].replace(',', '.'));
            
            if (numbers.length >= 2) {
                product.total = parseFloat(numbers[1].replace(',', '.'));
            } else {
                // Calcola totale se manca
                product.total = product.price * product.quantity;
            }
        }
        
        // Cerca aliquota IVA
        const ivaMatch = afterUnit.match(/\b(04|4|10|22)\b/);
        if (ivaMatch) {
            product.vat_rate = ivaMatch[1] + '%';
        } else {
            product.vat_rate = '10%'; // Default
        }
        
        return product;
    }
    
    /**
     * Calcola totali da lista prodotti
     */
    function calculateTotals(products) {
        const result = {
            subtotal: 0,
            vat: 0,
            vat4: 0,
            vat10: 0,
            vat22: 0,
            total: 0,
            details: []
        };
        
        if (!products || !Array.isArray(products) || products.length === 0) {
            return result;
        }
        
        products.forEach((product, index) => {
            const itemTotal = parseFloat(product.total || 0);
            result.subtotal += itemTotal;
            
            // Determina aliquota IVA
            let vatRate = 10; // Default
            let vatAmount = 0;
            
            // Supporta sia vat_rate che iva
            const productVat = product.vat_rate || product.iva;
            
            console.log(`[ProductUtils] Prodotto ${product.code}: vat_rate="${product.vat_rate}", iva="${product.iva}", usando="${productVat}"`);
            
            if (productVat) {
                const rate = productVat.toString().replace('%', '');
                if (rate === '4' || rate === '04') {
                    vatRate = 4;
                    vatAmount = itemTotal * 0.04;
                    result.vat4 += vatAmount;
                } else if (rate === '10') {
                    vatRate = 10;
                    vatAmount = itemTotal * 0.10;
                    result.vat10 += vatAmount;
                } else if (rate === '22') {
                    vatRate = 22;
                    vatAmount = itemTotal * 0.22;
                    result.vat22 += vatAmount;
                } else {
                    // Default 10%
                    vatAmount = itemTotal * 0.10;
                    result.vat10 += vatAmount;
                }
            } else {
                // Default 10%
                vatAmount = itemTotal * 0.10;
                result.vat10 += vatAmount;
            }
            
            result.vat += vatAmount;
            
            // Aggiungi dettaglio per debug
            result.details.push({
                index: index + 1,
                code: product.code,
                imponibile: itemTotal,
                aliquota: vatRate + '%',
                iva: vatAmount,
                totale: itemTotal + vatAmount
            });
        });
        
        result.total = result.subtotal + result.vat;
        
        // Arrotonda tutti i valori a 2 decimali
        Object.keys(result).forEach(key => {
            if (typeof result[key] === 'number') {
                result[key] = Math.round(result[key] * 100) / 100;
            }
        });
        
        return result;
    }
    
    /**
     * Estrae lista prodotti da testo
     */
    function extractProductsFromText(text, validCodes, validUnits) {
        if (!text) return [];
        
        const products = [];
        const lines = text.split('\n');
        
        // Cerca la sezione prodotti
        let inProductSection = false;
        let productEndMarkers = [
            'TOTALE', 'IMPONIBILE', 'IVA', 'PESO', 'TRASPORTO',
            'NOTE', 'ANNOTAZIONI', 'VETTORE', 'FIRMA'
        ];
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Controlla se siamo arrivati alla fine della sezione prodotti
            if (inProductSection) {
                const upperLine = trimmedLine.toUpperCase();
                if (productEndMarkers.some(marker => upperLine.includes(marker))) {
                    break;
                }
            }
            
            // Cerca prodotti
            const product = parseProductLine(trimmedLine, validCodes, validUnits);
            if (product) {
                products.push(product);
                inProductSection = true;
            }
        }
        
        return products;
    }
    
    /**
     * Formatta prodotto per visualizzazione
     */
    function formatProduct(product) {
        if (!product) return '';
        
        const parts = [
            product.code,
            product.description,
            `${product.quantity} ${product.unit}`
        ];
        
        if (product.price !== undefined) {
            parts.push(`€ ${product.price.toFixed(2).replace('.', ',')}`);
        }
        
        if (product.total !== undefined) {
            parts.push(`€ ${product.total.toFixed(2).replace('.', ',')}`);
        }
        
        if (product.vat_rate) {
            parts.push(`IVA ${product.vat_rate}`);
        }
        
        return parts.join(' - ');
    }
    
    /**
     * Raggruppa prodotti per aliquota IVA
     */
    function groupProductsByVAT(products) {
        const groups = {
            '4%': [],
            '10%': [],
            '22%': [],
            'other': []
        };
        
        products.forEach(product => {
            const rate = product.vat_rate || '10%';
            if (groups[rate]) {
                groups[rate].push(product);
            } else {
                groups.other.push(product);
            }
        });
        
        // Rimuovi gruppi vuoti
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) {
                delete groups[key];
            }
        });
        
        return groups;
    }
    
    /**
     * Valida totali calcolati rispetto a totale documento
     */
    function validateTotals(calculated, documentTotal, tolerance = 0.10) {
        if (!calculated || !documentTotal) return false;
        
        const diff = Math.abs(calculated.total - documentTotal);
        const isValid = diff <= tolerance;
        
        console.log(`[ProductUtils] Validazione totali:`);
        console.log(`  Calcolato: €${calculated.total.toFixed(2)}`);
        console.log(`  Documento: €${documentTotal.toFixed(2)}`);
        console.log(`  Differenza: €${diff.toFixed(2)}`);
        console.log(`  Valido: ${isValid ? '✅' : '❌'}`);
        
        return isValid;
    }
    
    // Esporta le funzioni
    return {
        // Validazione
        isValidArticleCode,
        
        // Parsing
        parseProductLine,
        extractProductsFromText,
        
        // Calcoli
        calculateTotals,
        groupProductsByVAT,
        validateTotals,
        
        // Formattazione
        formatProduct
    };
})();

console.log('✅ DDTFTProductUtils caricato con successo');