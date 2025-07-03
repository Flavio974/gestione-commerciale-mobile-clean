/**
 * DDTExtractor Modulare - Versione separata per testing graduale
 * Questo file conterrà gradualmente la versione modularizzata di DDTExtractor
 */

// Per ora creiamo solo una classe vuota che estende quella originale
class DDTExtractorModular extends DDTExtractor {
    constructor(text, debugElement, fileName) {
        super(text, debugElement, fileName);
        this.isModularVersion = true;
        
        // Usa configurazioni esterne se disponibili
        if (window.DDTFT_PATTERNS) {
            this.patterns = window.DDTFT_PATTERNS;
        }
        if (window.DDTFT_MAPPINGS) {
            this.mappings = window.DDTFT_MAPPINGS;
        }
    }
    
    // Override per gestire formato Alfieri
    extractClientName() {
        // Prima prova il pattern specifico Alfieri
        const lines = this.text.split('\n');
        let foundNumber = false;
        
        for (let i = 0; i < lines.length; i++) {
            // Cerca il numero documento nel formato Alfieri
            if (lines[i].match(/^(\d{4,6})\/\d{2}\/\d{2}$/)) {
                foundNumber = true;
                // Il cliente di solito è 2-3 righe dopo il numero
                for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                    const line = lines[j].trim();
                    
                    // Salta righe con solo numeri (codici)
                    if (line.match(/^\d{5,6}$/)) continue;
                    
                    // Salta righe vuote
                    if (!line) continue;
                    
                    // Se troviamo un indirizzo, il cliente è prima
                    if (line.match(/^(VIA|V\.LE|VIALE|CORSO|C\.SO|STRADA|STR\.|P\.ZZA|PIAZZA)/i)) {
                        break;
                    }
                    
                    // Se troviamo un CAP, il cliente è prima
                    if (line.match(/^\d{5}\s+-/)) {
                        break;
                    }
                    
                    // Probabilmente è il nome del cliente
                    if (line.match(/[A-Z]/) && line.length > 3) {
                        // Verifica se la riga successiva è identica (nome ripetuto)
                        if (j < lines.length - 1 && lines[j + 1].trim() === line) {
                            this.log(`✅ Cliente trovato (formato Alfieri): ${line}`);
                            return line;
                        }
                        // Altrimenti usa questa riga se sembra un nome valido
                        if (!line.match(/^(Pagamento|Operatore|Rif\.|PROPRIO)/i)) {
                            this.log(`✅ Cliente trovato (formato Alfieri): ${line}`);
                            return line;
                        }
                    }
                }
            }
        }
        
        // Se non troviamo con pattern Alfieri, usa il metodo originale
        return super.extractClientName();
    }
    
    // Override di cleanNumber per usare utilities
    cleanNumber(value) {
        // Usa le parsing utilities se disponibili
        if (window.DDTFTParsingUtils && window.DDTFTParsingUtils.parseItalianNumber) {
            return window.DDTFTParsingUtils.parseItalianNumber(value);
        }
        
        // Altrimenti usa il metodo originale
        return super.cleanNumber(value);
    }
    
    // Override di extractDate per usare pattern esterni
    extractDate() {
        // Se abbiamo i pattern configurati esternamente
        if (this.patterns && this.patterns.DATE) {
            const patterns = [
                this.patterns.DATE.standard,
                this.patterns.DATE.withLabel
            ];
            
            for (const pattern of patterns) {
                const match = this.text.match(pattern);
                if (match) {
                    let date = match[1];
                    date = date.replace(/-/g, '/');
                    const parts = date.split('/');
                    if (parts.length === 3 && parts[2].length === 2) {
                        parts[2] = '20' + parts[2];
                        date = parts.join('/');
                    }
                    return date;
                }
            }
            return '';
        }
        
        // Fallback al metodo originale
        return super.extractDate();
    }
    
    // Override di extractVatNumber per usare pattern esterni
    extractVatNumber() {
        // Se abbiamo i pattern configurati
        if (this.patterns && this.patterns.FISCAL && this.patterns.FISCAL.partitaIva) {
            const match = this.text.match(this.patterns.FISCAL.partitaIva);
            if (match) {
                this._cache.vatNumber = match[1];
                return match[1];
            }
            this._cache.vatNumber = '';
            return '';
        }
        
        // Fallback
        return super.extractVatNumber();
    }
    
    // Override di standardizeClientName per usare mappature esterne
    standardizeClientName(clientName) {
        if (!clientName) return '';
        
        // Se abbiamo le mappature configurate
        if (this.mappings && this.mappings.CLIENT_NAME) {
            // Prima prova una corrispondenza esatta
            if (this.mappings.CLIENT_NAME[clientName]) {
                return this.mappings.CLIENT_NAME[clientName];
            }
            
            // Poi prova con uppercase
            const upperClient = clientName.toUpperCase();
            for (const [fullName, standardName] of Object.entries(this.mappings.CLIENT_NAME)) {
                if (fullName === upperClient) {
                    return standardName;
                }
            }
            
            // Infine prova una corrispondenza parziale
            for (const [fullName, standardName] of Object.entries(this.mappings.CLIENT_NAME)) {
                if (clientName.includes(fullName) || fullName.includes(clientName)) {
                    return standardName;
                }
            }
        }
        
        // Fallback al metodo originale
        return super.standardizeClientName(clientName);
    }
    
    // Override di extractDocumentNumber per usare pattern esterni
    extractDocumentNumber() {
        // Se abbiamo i pattern di tipo documento configurati
        if (this.patterns && this.patterns.DOCUMENT_TYPE && this.patterns.DOCUMENT_TYPE.DDT) {
            const patterns = [
                this.patterns.DOCUMENT_TYPE.DDT.primary,
                this.patterns.DOCUMENT_TYPE.DDT.secondary,
                this.patterns.DOCUMENT_TYPE.DDT.alternative,
                this.patterns.DOCUMENT_TYPE.DDT.alfieriFormat
            ];
            
            for (const pattern of patterns) {
                if (pattern) {
                    const match = this.text.match(pattern);
                    if (match) {
                        const docNumber = match[1];
                        this._cache.documentNumber = docNumber;
                        this.log(`📋 Numero documento DDT trovato: ${docNumber}`);
                        return docNumber;
                    }
                }
            }
            
            // Prova pattern specifico per Alfieri
            const lines = this.text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('ALFIERI SPECIALITA') || lines[i].includes('ALFIERI SPEC')) {
                    // Cerca nelle prossime 5 righe
                    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
                        // Pattern: 4 cifre + data (es: 467321/05/25 dove 4673 è il numero)
                        const match = lines[j].match(/^(\d{4})(\d{2})\/(\d{2})\/(\d{2})$/);
                        if (match) {
                            const docNumber = match[1]; // Prime 4 cifre
                            this._cache.documentNumber = docNumber;
                            this.log(`📋 Numero documento DDT trovato (Alfieri): ${docNumber}`);
                            this.log(`   Data: ${match[2]}/${match[3]}/${match[4]}`);
                            return docNumber;
                        }
                    }
                }
            }
            
            this.log('❌ Numero documento DDT non trovato');
            this._cache.documentNumber = '';
            return '';
        }
        
        // Fallback
        return super.extractDocumentNumber();
    }
    
    // Override di extractClientCode per usare pattern esterni
    extractClientCode() {
        // Se abbiamo i pattern fiscali configurati
        if (this.patterns && this.patterns.FISCAL && this.patterns.FISCAL.codiceCliente) {
            const match = this.text.match(this.patterns.FISCAL.codiceCliente);
            if (match) {
                const code = match[1];
                this._cache.clientCode = code;
                this.log(`🔢 Codice cliente trovato: ${code}`);
                return code;
            }
        }
        
        // Fallback
        return super.extractClientCode();
    }
    
    // Override di extractOrderNumber per usare pattern esterni
    extractOrderNumber() {
        // Se abbiamo i pattern ORDER configurati
        if (this.patterns && this.patterns.ORDER) {
            const patterns = [
                this.patterns.ORDER.standard,
                this.patterns.ORDER.ordineNum,
                this.patterns.ORDER.odv,
                this.patterns.ORDER.riferimento
            ];
            
            for (const pattern of patterns) {
                const match = this.text.match(pattern);
                if (match) {
                    const orderNumber = match[1];
                    // Filtra valori non validi come in originale
                    if (!['TERMINI', 'CONSEGNA', 'PAGAMENTO'].includes(orderNumber.toUpperCase())) {
                        this.log(`🎯 Numero ordine trovato: ${orderNumber}`);
                        return orderNumber;
                    }
                }
            }
        }
        
        // Fallback al metodo originale (che include pattern aggiuntivi)
        return super.extractOrderNumber();
    }
    
    // Override di extractArticles per usare codici articolo esterni
    extractArticles() {
        this.log('📦 Estrazione articoli con versione modulare...');
        
        // Se abbiamo i codici articolo configurati esternamente
        if (this.mappings && this.mappings.ARTICLE_CODES) {
            // Usa i codici dall'array esterno invece di quelli hardcoded
            const originalCodes = this.articleCodes;
            this.articleCodes = this.mappings.ARTICLE_CODES;
            
            // Chiama il metodo originale con i nuovi codici
            const result = super.extractArticles();
            
            // Ripristina i codici originali
            this.articleCodes = originalCodes;
            
            return result;
        }
        
        // Fallback al metodo originale
        return super.extractArticles();
    }
    
    // Override di extractDocumentTotal per usare pattern esterni
    extractDocumentTotal() {
        // Se abbiamo i pattern AMOUNT configurati
        if (this.patterns && this.patterns.AMOUNT && this.patterns.AMOUNT.total) {
            const match = this.text.match(this.patterns.AMOUNT.total);
            if (match) {
                const total = this.cleanNumber(match[1]);
                this.log(`💰 Totale documento trovato: €${total.toFixed(2)}`);
                return total;
            }
        }
        
        // Fallback al metodo originale
        return super.extractDocumentTotal();
    }
    
    // Override di isValidUnit per usare unità esterne
    isValidUnit(unit) {
        // Se abbiamo le unità configurate esternamente
        if (this.mappings && this.mappings.UNITS) {
            return this.mappings.UNITS.includes(unit.toUpperCase());
        }
        
        // Fallback al metodo originale se esiste
        if (super.isValidUnit) {
            return super.isValidUnit(unit);
        }
        
        // Default check
        const validUnits = ['PZ', 'KG', 'LT', 'MT', 'CF', 'CT', 'GR', 'ML'];
        return validUnits.includes(unit.toUpperCase());
    }
    
    // Override di getFixedAddressForClient per usare address utils
    getFixedAddressForClient(clientName) {
        // Usa address utilities se disponibili
        if (window.DDTFTAddressUtils && window.DDTFTAddressUtils.getFixedAddressForClient) {
            return window.DDTFTAddressUtils.getFixedAddressForClient(clientName);
        }
        
        // Fallback al metodo originale
        return super.getFixedAddressForClient(clientName);
    }
    
    // Override di isVettoreAddress per usare address utils
    isVettoreAddress(address) {
        // Usa address utilities se disponibili
        if (window.DDTFTAddressUtils && window.DDTFTAddressUtils.isVettoreAddress) {
            return window.DDTFTAddressUtils.isVettoreAddress(address);
        }
        
        // Fallback al metodo originale
        return super.isVettoreAddress(address);
    }
    
    // Override di cleanAndValidateAddress per usare address utils
    cleanAndValidateAddress(address, clientName) {
        // Usa address utilities se disponibili
        if (window.DDTFTAddressUtils && window.DDTFTAddressUtils.cleanAndValidateAddress) {
            return window.DDTFTAddressUtils.cleanAndValidateAddress(address, clientName);
        }
        
        // Fallback al metodo originale
        return super.cleanAndValidateAddress(address, clientName);
    }
    
    // Override di calculateTotals per usare product utils
    calculateTotals(items) {
        // Usa product utilities se disponibili
        if (window.DDTFTProductUtils && window.DDTFTProductUtils.calculateTotals) {
            const result = window.DDTFTProductUtils.calculateTotals(items);
            
            // Log per debug come nell'originale
            this.log(`💰 Calcolo totali con ProductUtils:`);
            this.log(`   Imponibile: €${result.subtotal.toFixed(2)}`);
            if (result.vat4 > 0) this.log(`   IVA 4%: €${result.vat4.toFixed(2)}`);
            if (result.vat10 > 0) this.log(`   IVA 10%: €${result.vat10.toFixed(2)}`);
            if (result.vat22 > 0) this.log(`   IVA 22%: €${result.vat22.toFixed(2)}`);
            this.log(`   IVA Totale: €${result.vat.toFixed(2)}`);
            this.log(`   Totale: €${result.total.toFixed(2)}`);
            
            // Log dettaglio prodotti
            if (result.details && result.details.length > 0) {
                this.log(`📊 Dettaglio calcolo per prodotto:`);
                result.details.forEach(detail => {
                    this.log(`   [${detail.index}] ${detail.code}: imponibile €${detail.imponibile.toFixed(2)} + IVA ${detail.aliquota} €${detail.iva.toFixed(2)} = €${detail.totale.toFixed(2)}`);
                });
            }
            
            return result;
        }
        
        // Fallback al metodo originale
        return super.calculateTotals(items);
    }
}

// Salva la classe originale
window.DDTExtractorOriginal = window.DDTExtractor;

// NON sostituiamo ancora DDTExtractor, solo prepariamo
window.DDTExtractorModular = DDTExtractorModular;

console.log('✅ DDTExtractorModular caricato con successo');
console.log('   - Override metodi utilities: cleanNumber, isValidUnit');
console.log('   - Override metodi estrazione: extractDate, extractVatNumber, extractDocumentNumber');
console.log('   - Override metodi cliente: standardizeClientName, extractClientCode');  
console.log('   - Override metodi ordine: extractOrderNumber');
console.log('   - Override metodi articoli: extractArticles, extractDocumentTotal, calculateTotals');
console.log('   - Override metodi indirizzi: getFixedAddressForClient, isVettoreAddress, cleanAndValidateAddress');
console.log('   - Usa configurazioni esterne: DDTFT_PATTERNS e DDTFT_MAPPINGS');
console.log('   - Usa utilities esterne: DDTFTParsingUtils, DDTFTAddressUtils, DDTFTProductUtils');
console.log('   - Per attivare: switchDDTExtractor(true)');

// Esporta la classe per renderla disponibile globalmente
if (typeof window !== 'undefined') {
    window.DDTExtractorModular = DDTExtractorModular;
}