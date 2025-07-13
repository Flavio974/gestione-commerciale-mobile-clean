/**
 * FIX SEMPLIFICATO per estrazione prodotti
 * Usa un approccio più permissivo per catturare tutti i prodotti
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando FIX SEMPLIFICATO estrazione prodotti...');
    
    // Funzione semplificata per estrarre prodotti
    function extractProductsSimple(text, logger) {
        const log = logger || console.log;
        log('🎯 [SIMPLE FIX] Estrazione prodotti con approccio semplificato');
        
        const articles = [];
        const lines = text.split('\n');
        
        // Cerca prima l'intestazione della tabella per capire il formato
        let tableStartIndex = -1;
        let hasDiscountColumn = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('Codice') && line.includes('Descrizione') && line.includes('Importo')) {
                tableStartIndex = i;
                hasDiscountColumn = line.includes('Sconto');
                log(`📊 Trovata intestazione tabella alla riga ${i}, sconto: ${hasDiscountColumn}`);
                break;
            }
        }
        
        if (tableStartIndex === -1) {
            log('⚠️ Intestazione tabella non trovata, uso ricerca globale');
        }
        
        // Pattern più semplici e permissivi
        // Supporta codici con lettere iniziali (es: GF000113, VS000012)
        const codePattern = /^[A-Z]*[0-9]{6,9}$/;
        const unitPattern = /^(PZ|KG|CF|CT|LT|MT|GR|ML)$/;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Salta righe di intestazione o totali
            if (line.includes('IMPONIBILE') || line.includes('TOTALE') || 
                line.includes('Codice') || line.includes('Descrizione') ||
                line.includes('Totale merce') || line.includes('Totale Fattura')) {
                continue;
            }
            
            // Dividi la riga per spazi
            const parts = line.split(/\s+/);
            
            // Cerca un codice prodotto all'inizio
            if (parts.length >= 5 && codePattern.test(parts[0])) {
                log(`[SIMPLE FIX] Riga prodotto: "${line}"`);
                log(`[SIMPLE FIX] Parts: [${parts.map((p, i) => `${i}:${p}`).join(', ')}]`);
                
                // Trova l'unità di misura
                let unitIndex = -1;
                for (let j = 2; j < parts.length - 2; j++) {
                    if (unitPattern.test(parts[j])) {
                        unitIndex = j;
                        break;
                    }
                }
                
                if (unitIndex > 0) {
                    const code = parts[0];
                    const description = parts.slice(1, unitIndex).join(' ');
                    const unit = parts[unitIndex];
                    
                    // Estrai TUTTI i valori dopo l'unità (non solo numeri)
                    const remainingParts = parts.slice(unitIndex + 1);
                    log(`   Parti dopo ${unit}: [${remainingParts.join(', ')}]`);
                    
                    // Gestisci diversi formati (DDT vs Fattura)
                    if (remainingParts.length >= 3) {
                        let quantity, price, total, ivaCode;
                        
                        // Se abbiamo 4 o più parti: QUANTITÀ PREZZO TOTALE IVA [CODIVA]
                        if (remainingParts.length >= 4) {
                            quantity = remainingParts[0];
                            price = remainingParts[1];
                            total = remainingParts[2];
                            ivaCode = remainingParts[3];
                        } else if (remainingParts.length === 3) {
                            // Solo 3 parti: potrebbe essere QUANTITÀ TOTALE IVA
                            quantity = remainingParts[0];
                            price = '0';
                            total = remainingParts[1];
                            ivaCode = remainingParts[2];
                        } else {
                            continue;
                        }
                        
                        log(`   Valori estratti: Q=${quantity}, P=${price}, T=${total}, IVA=${ivaCode}`);
                        
                        let iva = '10%'; // default
                        
                        // Gestione IVA - il codice IVA è sempre l'ultimo valore
                        if (ivaCode === '04' || ivaCode === '4') {
                            iva = '4%';
                        } else if (ivaCode === '10') {
                            iva = '10%';
                        } else if (ivaCode === '22') {
                            iva = '22%';
                        } else {
                            log(`   ⚠️ IVA code non riconosciuto: "${ivaCode}", uso default 10%`);
                        }
                        
                        const article = {
                            code: code,
                            description: description,
                            quantity: quantity,
                            unit: unit,
                            price: price,
                            discount: '0',
                            total: total,
                            iva: iva,
                            vat_rate: iva
                        };
                        
                        articles.push(article);
                        log(`✅ [SIMPLE FIX] Prodotto: ${code} - ${description} - Unit: ${unit} - Tot: ${total} - IVA: ${ivaCode} → ${iva}`);
                    }
                }
            }
        }
        
        log(`📊 [SIMPLE] Totale prodotti estratti: ${articles.length}`);
        
        // Se non abbiamo trovato prodotti, proviamo con il metodo originale
        if (articles.length === 0) {
            log('⚠️ Nessun prodotto trovato, uso metodo fallback');
            
            // Chiama il metodo originale se esiste
            if (this._originalExtractArticles) {
                return this._originalExtractArticles.call(this);
            }
        }
        
        return articles;
    }
    
    // Applica il fix
    function applySimpleFix() {
        const extractors = [
            'DDTExtractor', 
            'DDTExtractorModular',
            'FatturaExtractor',
            'FatturaExtractorModular'
        ];
        
        extractors.forEach(className => {
            if (window[className] && window[className].prototype) {
                const proto = window[className].prototype;
                
                if (!proto._originalExtractArticles) {
                    proto._originalExtractArticles = proto.extractArticles;
                    
                    proto.extractArticles = function() {
                        console.log(`🎯 [SIMPLE] extractArticles intercettato su ${className}`);
                        console.log(`[SIMPLE] this.text length: ${this.text ? this.text.length : 'null'}`);
                        const result = extractProductsSimple.call(this, this.text, this.log ? this.log.bind(this) : console.log);
                        console.log(`[SIMPLE] Risultato extractProductsSimple: ${result ? result.length : 0} articoli`);
                        return result;
                    };
                    
                    console.log(`✅ [SIMPLE] Fix applicato a ${className}`);
                }
            }
        });
    }
    
    // Applica subito e poi periodicamente
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        applySimpleFix();
        
        if (attempts > 3) {
            console.warn('⚠️ Export button non trovato, fallback tab switch');
            // Fallback: forza switch a tab DDTFT
            if (window.switchToTab) {
                window.switchToTab('ddtft');
                setTimeout(() => applySimpleFix(), 500);
            }
            clearInterval(interval);
        }
    }, 200);
    
    console.log('✅ FIX SEMPLIFICATO installato');
    
})();