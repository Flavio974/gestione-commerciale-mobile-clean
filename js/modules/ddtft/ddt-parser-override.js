/**
 * Override completo del parser DDT per gestire correttamente la struttura Alfieri
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando override completo parser DDT...');
    
    // Override del DDTExtractor
    if (window.DDTExtractor) {
        const OriginalDDTExtractor = window.DDTExtractor;
        
        window.DDTExtractor = function(text, fileName) {
            console.log('[DDT PARSER OVERRIDE] Inizializzo parser DDT custom');
            
            // Chiama il costruttore originale
            OriginalDDTExtractor.call(this, text, fileName);
            
            // Override del metodo extract
            this.extract = function() {
                console.log('[DDT PARSER OVERRIDE] Estrazione DDT con logica custom');
                
                const result = {
                    type: 'ddt',
                    documentType: 'DDT',
                    items: []
                };
                
                const lines = this.text.split('\n');
                
                // 1. Cerca la riga con numero, data, pagina e codice cliente
                // Pattern: "4681 21/05/25 1 5712"
                let datiDocumento = null;
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    const match = line.match(/^(\d{4,5})\s+(\d{1,2}\/\d{2}\/\d{2})\s+(\d+)\s+(\d{4,5})$/);
                    if (match) {
                        datiDocumento = {
                            numero: match[1],
                            data: match[2],
                            pagina: match[3],
                            codiceCliente: match[4],
                            rigaIndex: i
                        };
                        console.log('[DDT PARSER OVERRIDE] Dati documento trovati:', datiDocumento);
                        break;
                    }
                }
                
                if (datiDocumento) {
                    result.documentNumber = datiDocumento.numero;
                    result.orderNumber = datiDocumento.numero;
                    result.date = this.convertDate(datiDocumento.data);
                    result.clientCode = datiDocumento.codiceCliente;
                    
                    // 2. Il nome del cliente è nella riga successiva
                    if (datiDocumento.rigaIndex + 1 < lines.length) {
                        const clienteLine = lines[datiDocumento.rigaIndex + 1].trim();
                        // Prendi solo la prima occorrenza se duplicato
                        const clienteParts = clienteLine.split(/\s{2,}/);
                        let nomeCliente = clienteParts[0] || clienteLine;
                        
                        // Se contiene lo stesso nome due volte, prendi solo il primo
                        if (clienteLine.includes(nomeCliente + ' ' + nomeCliente)) {
                            // Nome duplicato
                        } else if (clienteParts.length > 1 && clienteParts[0] === clienteParts[1]) {
                            // Nome duplicato con spazi multipli
                        } else {
                            // Controlla se il nome è ripetuto in altro modo
                            const words = nomeCliente.split(' ');
                            if (words.length >= 2) {
                                const halfLength = Math.floor(words.length / 2);
                                const firstHalf = words.slice(0, halfLength).join(' ');
                                const secondHalf = words.slice(halfLength).join(' ');
                                if (firstHalf === secondHalf) {
                                    nomeCliente = firstHalf;
                                }
                            }
                        }
                        
                        result.clientName = nomeCliente;
                        result.cliente = nomeCliente;
                        console.log('[DDT PARSER OVERRIDE] Cliente:', nomeCliente);
                    }
                    
                    // 3. P.IVA è alcune righe dopo (cerca 13224760010)
                    for (let i = datiDocumento.rigaIndex + 2; i < Math.min(datiDocumento.rigaIndex + 10, lines.length); i++) {
                        const line = lines[i].trim();
                        const pivaMatch = line.match(/\b(\d{11})\b/);
                        if (pivaMatch && pivaMatch[1] !== '03247720042') { // Escludi P.IVA emittente
                            result.vatNumber = pivaMatch[1];
                            console.log('[DDT PARSER OVERRIDE] P.IVA trovata:', pivaMatch[1]);
                            break;
                        }
                    }
                    
                    // 4. Indirizzo di consegna
                    if (datiDocumento.rigaIndex + 2 < lines.length) {
                        const addressLine = lines[datiDocumento.rigaIndex + 2].trim();
                        const addressParts = addressLine.split(/\s{2,}/);
                        let deliveryAddress = '';
                        
                        // Prendi la seconda parte per l'indirizzo di consegna
                        if (addressParts.length > 1) {
                            deliveryAddress = addressParts[1];
                        }
                        
                        // Aggiungi CAP e città dalla riga successiva
                        if (datiDocumento.rigaIndex + 3 < lines.length) {
                            const cityLine = lines[datiDocumento.rigaIndex + 3].trim();
                            const cityParts = cityLine.split(/\s{2,}/);
                            if (cityParts.length > 1) {
                                deliveryAddress += ' ' + cityParts[1];
                            }
                        }
                        
                        if (deliveryAddress) {
                            result.deliveryAddress = deliveryAddress.trim();
                            result.indirizzoConsegna = deliveryAddress.trim();
                            console.log('[DDT PARSER OVERRIDE] Indirizzo consegna:', deliveryAddress.trim());
                        }
                    }
                }
                
                // 5. Cerca riferimento ordine
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.includes('Rif. Ns. Ordine N.')) {
                        const orderMatch = line.match(/Ordine N\.\s*(\d+)/i);
                        if (orderMatch) {
                            result.orderReference = orderMatch[1];
                            console.log('[DDT PARSER OVERRIDE] Riferimento ordine:', orderMatch[1]);
                            break;
                        }
                    }
                }
                
                // 6. Estrai articoli
                const articoli = this.extractArticles(lines);
                result.items = articoli;
                console.log('[DDT PARSER OVERRIDE] Articoli trovati:', articoli.length);
                
                // 7. Calcola totali
                let subtotal = 0;
                let totalIVA = 0;
                
                articoli.forEach(item => {
                    const itemTotal = parseFloat(item.total) || 0;
                    subtotal += itemTotal;
                    const ivaRate = parseFloat(item.vat || '10') / 100;
                    totalIVA += itemTotal * ivaRate;
                });
                
                result.subtotal = subtotal;
                result.vat = totalIVA;
                result.iva = totalIVA;
                result.total = subtotal + totalIVA;
                
                // 8. Cerca il totale nel documento (ultima riga con importo)
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i];
                    const totalMatch = line.match(/(\d{1,3}(?:\.\d{3})*,\d{2})$/);
                    if (totalMatch) {
                        const totalValue = parseFloat(totalMatch[1].replace(/\./g, '').replace(',', '.'));
                        if (totalValue > subtotal) {
                            result.total = totalValue;
                            console.log('[DDT PARSER OVERRIDE] Totale documento trovato:', totalValue);
                            break;
                        }
                    }
                }
                
                return result;
            };
            
            // Helper per estrarre articoli
            this.extractArticles = function(lines) {
                const items = [];
                
                // Cerca articoli nel formato: codice descrizione UM quantità prezzo importo IVA
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Pattern articolo DDT
                    const match = line.match(/^(\w{6,})\s+(.+?)\s+(PZ|KG|LT|CF)\s+(\d+(?:,\d+)?)\s+([\d,]+)\s+([\d\.,]+)\s+(\d{2})/);
                    if (match) {
                        const item = {
                            code: match[1],
                            description: match[2].trim(),
                            unit: match[3],
                            quantity: match[4].replace(',', '.'),
                            price: match[5].replace(',', '.'),
                            total: match[6].replace(/\./g, '').replace(',', '.'),
                            vat: match[7],
                            iva: match[7]
                        };
                        
                        items.push(item);
                        console.log('[DDT PARSER OVERRIDE] Articolo trovato:', item.code, '-', item.description);
                    }
                }
                
                return items;
            };
            
            // Helper per convertire data
            this.convertDate = function(dateStr) {
                // Converte da gg/mm/aa a gg/mm/20aa
                const parts = dateStr.split('/');
                if (parts.length === 3 && parts[2].length === 2) {
                    return parts[0] + '/' + parts[1] + '/20' + parts[2];
                }
                return dateStr;
            };
        };
        
        // Copia il prototype
        window.DDTExtractor.prototype = Object.create(OriginalDDTExtractor.prototype);
        window.DDTExtractor.prototype.constructor = window.DDTExtractor;
        
        console.log('✅ [DDT PARSER OVERRIDE] Override DDTExtractor completato');
    }
    
})();