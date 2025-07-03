/**
 * FatturaExtractor Modulare - Versione separata per testing graduale
 * Questo file conterrà gradualmente la versione modularizzata di FatturaExtractor
 */

// Estende la classe originale FatturaExtractor
class FatturaExtractorModular extends FatturaExtractor {
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
    
    // Override per gestire formato Alfieri Fatture
    extractClientName() {
        const lines = this.text.split('\n');
        
        // METODO 1: Cerca nella struttura ALFIERI (dopo riga FT)
        let ftLineIndex = -1;
        for (let i = 0; i < Math.min(lines.length, 30); i++) {
            if (lines[i].match(/^FT\s+\d+/)) {
                ftLineIndex = i;
                this.log(`[Enhanced] Trovata riga FT alla posizione ${i}: ${lines[i]}`);
                break;
            }
        }
        
        if (ftLineIndex !== -1) {
            // Il cliente di solito è nelle righe successive alla riga FT
            for (let i = ftLineIndex + 1; i < Math.min(ftLineIndex + 15, lines.length); i++) {
                const line = lines[i].trim();
                
                // Salta righe vuote o con solo numeri/date
                if (!line || line.match(/^\d+$/) || line.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                    continue;
                }
                
                // Salta parole chiave di sezioni
                if (line.match(/^(Porto|Colli|Peso|Aspetto|VETTORI|Firma|Trasporto|Causale)/i)) {
                    this.log(`[Enhanced] Raggiunta sezione trasporto, stop ricerca`);
                    break;
                }
                
                // Cerca pattern azienda
                if (line.match(/^[A-Z]/) && line.length > 3) {
                    // Verifica se è un nome azienda valido
                    const isCompany = line.match(/(?:S\.?R\.?L\.?|S\.?P\.?A\.?|S\.?N\.?C\.?|S\.?A\.?S\.?)\s*$/i) ||
                                     line.match(/^[A-Z][A-Z\s\&\.\-\']+$/);
                    
                    if (isCompany && !line.includes('ALFIERI') && !line.includes('REA')) {
                        // Controlla se c'è continuazione nella riga successiva
                        let fullName = line;
                        
                        if (i < lines.length - 1) {
                            const nextLine = lines[i + 1].trim();
                            if (nextLine.match(/^(S\.?R\.?L\.?|S\.?P\.?A\.?|DI\s+[A-Z])/i)) {
                                fullName += ' ' + nextLine;
                            }
                        }
                        
                        this.log(`✅ [Enhanced] Cliente trovato dopo FT: ${fullName}`);
                        return fullName;
                    }
                }
            }
        }
        
        // METODO 2: Cerca nella parte finale del documento (dopo VETTORI)
        let foundVettori = false;
        
        for (let i = 0; i < lines.length; i++) {
            // Cerca la sezione VETTORI
            if (lines[i].match(/^V\s*$/) && i < lines.length - 6) {
                // Verifica se è la parola VETTORI scritta verticalmente
                if (lines[i+1].match(/^E\s*$/) && 
                    lines[i+2].match(/^T\s*$/) && 
                    lines[i+3].match(/^T\s*$/) && 
                    lines[i+4].match(/^O\s*$/) && 
                    lines[i+5].match(/^R\s*$/) && 
                    lines[i+6].match(/^I\s*$/)) {
                    foundVettori = true;
                    i += 6; // Salta le lettere di VETTORI
                    continue;
                }
            }
            
            // Dopo VETTORI, cerca il nome del cliente
            if (foundVettori) {
                const line = lines[i].trim();
                
                // Salta righe vuote o con solo parole chiave
                if (!line || line.match(/^(Firma|Attenzione|contrario|danneggiata)/i)) continue;
                
                // Se troviamo un nome in maiuscolo che sembra una ragione sociale
                if (line.match(/^[A-Z][A-Z\s\.&]+/) && line.length > 5) {
                    // Verifica se è seguito da una forma societaria o da "di"
                    if (i < lines.length - 1) {
                        const nextLine = lines[i + 1].trim();
                        // Se la riga successiva contiene "di" o forme societarie, uniscile
                        if (nextLine.match(/^di[A-Z]/)) {
                            const fullName = line + ' ' + nextLine;
                            this.log(`✅ Cliente trovato (formato Alfieri FT - dopo VETTORI): ${fullName}`);
                            return fullName;
                        }
                    }
                    // Altrimenti usa solo questa riga
                    this.log(`✅ Cliente trovato (formato Alfieri FT - dopo VETTORI): ${line}`);
                    return line;
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
        // Prima prova a estrarre dal nome file se disponibile
        if (this.fileName) {
            const fileMatch = this.fileName.match(/FTV_\d+_\d+_(\d+)_/);
            if (fileMatch) {
                const docNumber = fileMatch[1];
                this.log(`📋 Numero fattura estratto dal nome file: ${docNumber}`);
                return docNumber;
            }
        }
        
        // Se abbiamo i pattern di tipo documento configurati
        if (this.patterns && this.patterns.DOCUMENT_TYPE && this.patterns.DOCUMENT_TYPE.FATTURA) {
            const patterns = [
                this.patterns.DOCUMENT_TYPE.FATTURA.primary,
                this.patterns.DOCUMENT_TYPE.FATTURA.secondary,
                this.patterns.DOCUMENT_TYPE.FATTURA.alternative
            ];
            
            for (const pattern of patterns) {
                if (pattern) {
                    const match = this.text.match(pattern);
                    if (match) {
                        const docNumber = match[1];
                        this.log(`📋 Numero fattura trovato: ${docNumber}`);
                        return docNumber;
                    }
                }
            }
        }
        
        // Fallback al metodo originale (che ha molti più pattern)
        return super.extractDocumentNumber();
    }
    
    // Override di extractDate per usare pattern esterni
    extractDate() {
        // Se abbiamo i pattern configurati esternamente
        if (this.patterns && this.patterns.DATE) {
            const patterns = [
                this.patterns.DATE.standard,
                this.patterns.DATE.withLabel,
                this.patterns.DATE.fullDate
            ];
            
            for (const pattern of patterns) {
                const match = this.text.match(pattern);
                if (match) {
                    let date = match[1];
                    
                    // Se è una data con nome mese (pattern fullDate)
                    if (pattern === this.patterns.DATE.fullDate) {
                        // Converti da formato italiano
                        const monthMap = {
                            'gennaio': '01', 'febbraio': '02', 'marzo': '03',
                            'aprile': '04', 'maggio': '05', 'giugno': '06',
                            'luglio': '07', 'agosto': '08', 'settembre': '09',
                            'ottobre': '10', 'novembre': '11', 'dicembre': '12'
                        };
                        const day = match[1];
                        const month = monthMap[match[2].toLowerCase()];
                        const year = match[3];
                        date = `${day}/${month}/${year}`;
                    } else {
                        // Normalizza separatori
                        date = date.replace(/-/g, '/');
                        // Gestisci anno a 2 cifre
                        const parts = date.split('/');
                        if (parts.length === 3 && parts[2].length === 2) {
                            parts[2] = '20' + parts[2];
                            date = parts.join('/');
                        }
                    }
                    
                    return date;
                }
            }
        }
        
        // Fallback
        return super.extractDate();
    }
    
    // Override di extractVatNumber per usare pattern esterni
    extractVatNumber() {
        // Se abbiamo i pattern configurati
        if (this.patterns && this.patterns.FISCAL && this.patterns.FISCAL.partitaIva) {
            const match = this.text.match(this.patterns.FISCAL.partitaIva);
            if (match) {
                return match[1];
            }
        }
        
        // Fallback
        return super.extractVatNumber();
    }
    
    // Override di extractTotals per usare pattern esterni
    extractTotals() {
        // Se abbiamo i pattern AMOUNT configurati
        if (this.patterns && this.patterns.AMOUNT) {
            const totals = {
                subtotal: 0,
                vat: 0,
                total: 0
            };
            
            // Estrai imponibile
            if (this.patterns.AMOUNT.imponibile) {
                const match = this.text.match(this.patterns.AMOUNT.imponibile);
                if (match) {
                    totals.subtotal = this.cleanNumber(match[1]);
                }
            }
            
            // Estrai IVA
            if (this.patterns.AMOUNT.iva) {
                const match = this.text.match(this.patterns.AMOUNT.iva);
                if (match) {
                    totals.vat = this.cleanNumber(match[2]);
                }
            }
            
            // Estrai totale
            if (this.patterns.AMOUNT.total) {
                const match = this.text.match(this.patterns.AMOUNT.total);
                if (match) {
                    totals.total = this.cleanNumber(match[1]);
                }
            }
            
            // Se abbiamo trovato almeno un valore, ritorna i totali
            if (totals.subtotal > 0 || totals.vat > 0 || totals.total > 0) {
                this.log(`💰 Totali estratti con pattern esterni:`);
                this.log(`   Imponibile: €${totals.subtotal.toFixed(2)}`);
                this.log(`   IVA: €${totals.vat.toFixed(2)}`);
                this.log(`   Totale: €${totals.total.toFixed(2)}`);
                return totals;
            }
        }
        
        // Fallback al metodo originale
        return super.extractTotals();
    }
}

// Salva la classe originale
window.FatturaExtractorOriginal = window.FatturaExtractor;

// NON sostituiamo ancora FatturaExtractor, solo prepariamo
window.FatturaExtractorModular = FatturaExtractorModular;

console.log('✅ FatturaExtractorModular caricato con successo');
console.log('   - Override metodi: cleanNumber, standardizeClientName');
console.log('   - Override metodi: extractDocumentNumber, extractDate, extractVatNumber');
console.log('   - Override metodi: extractTotals');
console.log('   - Usa configurazioni esterne: DDTFT_PATTERNS e DDTFT_MAPPINGS');

// Esporta la classe per renderla disponibile globalmente
if (typeof window !== 'undefined') {
    window.FatturaExtractorModular = FatturaExtractorModular;
}