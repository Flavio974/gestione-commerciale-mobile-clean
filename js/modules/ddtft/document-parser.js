/**
 * DDTFT Document Parser
 * Modulo per il parsing dei documenti DDT/FT da testo PDF
 */

window.DDTFTDocumentParser = (function() {
    'use strict';
    
    /**
     * Parse del documento dal testo estratto
     */
    function parseDocumentFromText(text, fileName = '') {
        console.log(`\n📄 Parsing documento da ${fileName}...`);
        
        if (!text || text.trim().length === 0) {
            console.error('Testo vuoto o non valido');
            return null;
        }
        
        // Determina il tipo di documento
        const documentType = detectDocumentType(text, fileName);
        if (!documentType) {
            console.error('Tipo documento non riconosciuto');
            return null;
        }
        
        console.log(`📋 Tipo documento rilevato: ${documentType.toUpperCase()}`);
        
        // Usa l'extractor appropriato
        let result = null;
        
        if (documentType === 'ddt') {
            result = parseDDT(text, fileName);
        } else if (documentType === 'ft' || documentType === 'nc') {
            result = parseFattura(text, fileName);
            // Se è NC, mantieni il tipo come NC
            if (documentType === 'nc' && result) {
                result.type = 'nc';
                result.documentType = 'NC';
            }
        }
        
        if (result) {
            // Aggiungi metadati
            result.id = generateDocumentId();
            result.fileName = fileName;
            result.importDate = new Date().toISOString();
            
            // NON mappare automaticamente orderNumber
            // Il numero ordine deve essere presente esplicitamente nel documento
            if (!result.orderNumber && result.orderReference) {
                result.orderNumber = result.orderReference;
                console.log(`📝 Mappato orderNumber da orderReference: ${result.orderNumber}`);
            }
            
            // IMPORTANTE: NON scambiare orderNumber con documentNumber
            // Questi sono due campi distinti:
            // - documentNumber: numero del DDT o della Fattura
            // - orderNumber: numero dell'ordine del cliente (se presente)
            // Se uno dei due manca, lasciarlo vuoto invece di copiare dall'altro
            
            console.log('✅ Documento parsato con successo:', result);
        } else {
            console.error('❌ Errore nel parsing del documento');
        }
        
        return result;
    }
    
    /**
     * Rileva il tipo di documento
     */
    function detectDocumentType(text, fileName = '') {
        const upperText = text.toUpperCase();
        const upperFileName = fileName ? fileName.toUpperCase() : '';
        
        console.log(`📋 detectDocumentType chiamato per file: ${fileName}`);
        console.log(`📋 Prime 200 caratteri del testo: ${text.substring(0, 200)}`);
        
        // IMPORTANTE: Prima controlla sempre il CONTENUTO per NC
        // Le note di credito devono avere priorità assoluta
        
        // Pattern per Note di Credito - CONTROLLA PRIMA LE NC
        const ncPatterns = [
            /NOTA\s+DI\s+CREDITO/i,  // Nota di credito
            /NOTA\s+CREDITO/i,       // Variante senza "di"
            /NC\s+N[°.\s]*\d+/,      // NC seguito da numero
            /NC\s+\d+/,              // NC seguito da cifre
            /^NC\s*$/m,              // NC su riga isolata
            /NOTA\s+ACCREDITO/i      // Nota accredito
        ];
        
        // Controlla prima le Note di Credito nel CONTENUTO (più importante del nome file)
        for (const pattern of ncPatterns) {
            if (pattern.test(text)) { // Usa text invece di upperText per i test case-insensitive
                console.log(`📋 Rilevato tipo NC dal contenuto (pattern: ${pattern})`);
                return 'nc';
            }
        }
        
        // Se contiene "NOTA" e "CREDITO", è sicuramente una NC
        if (upperText.includes('NOTA') && upperText.includes('CREDITO')) {
            console.log(`📋 Rilevato tipo NC dal contenuto (NOTA + CREDITO)`);
            return 'nc';
        }
        
        // Cerca specificamente "NC" seguito da spazi e 6 cifre (es: NC 703873)
        if (text.match(/NC\s+\d{6}/)) {
            console.log(`📋 Rilevato tipo NC dal contenuto (NC + numero 6 cifre)`);
            return 'nc';
        }
        
        // DOPO controlla il nome del file (meno prioritario del contenuto)
        if (upperFileName) {
            // NC = Nota di Credito (tipo specifico per gestione speciale)
            if (upperFileName.includes('NC_') || upperFileName.includes('NCV')) {
                console.log(`📋 Rilevato tipo NC dal nome file: ${fileName}`);
                return 'nc';
            }
            // FTV = Fattura Vendita (solo se NON è una NC)
            if (upperFileName.includes('FTV') || upperFileName.includes('FT_')) {
                console.log(`📋 Rilevato tipo FT dal nome file: ${fileName}`);
                return 'ft';
            }
            // DDV = Documento Di Vendita (DDT)
            if (upperFileName.includes('DDV') || upperFileName.includes('DDT')) {
                console.log(`📋 Rilevato tipo DDT dal nome file: ${fileName}`);
                return 'ddt';
            }
        }
        
        // Pattern per Fatture
        const fatturaPatterns = [
            /FATTURA\s+ACCOMPAGNATORIA/,
            /FATTURA\s+N[°.\s]*\d+/,
            /FATTURA\s+IMMEDIATA/,
            /FATTURA\s+DIFFERITA/,
            /DOCUMENTO\s+COMMERCIALE/,
            /FT\s+N[°.\s]*\d+/,
            /FT\s+\d+/,  // Pattern semplice per "FT 4226"
            /^FT\s*$/m,   // FT su riga isolata
            /FATTURA/i,   // Qualsiasi menzione di "FATTURA"
            /FT\s*\d{4}/  // FT seguito da 4 cifre
        ];
        
        // Pattern per DDT
        const ddtPatterns = [
            /DOCUMENTO\s+DI\s+TRASPORTO/,
            /D\.D\.T\./,
            /DDT\s*N[°.\s]*\d+/,
            /BOLLA\s+DI\s+CONSEGNA/,
            /DOCUMENTO\s+ACCOMPAGNATORIO/
        ];
        
        // Poi le fatture
        for (const pattern of fatturaPatterns) {
            if (pattern.test(upperText)) {
                return 'ft';
            }
        }
        
        // Infine i DDT
        for (const pattern of ddtPatterns) {
            if (pattern.test(upperText)) {
                return 'ddt';
            }
        }
        
        // Se contiene "FATTURA" ma non "DDT", è probabilmente una fattura
        if (upperText.includes('FATTURA') && !upperText.includes('DDT')) {
            return 'ft';
        }
        
        // Se contiene "DDT" o "TRASPORTO", è probabilmente un DDT
        if (upperText.includes('DDT') || upperText.includes('TRASPORTO')) {
            return 'ddt';
        }
        
        // Se contiene "NC" seguito da numeri, è una nota credito
        if (upperText.match(/NC\s+\d+/)) {
            return 'nc';
        }
        
        // Se contiene "FT" seguito da numeri, è probabilmente una fattura
        if (upperText.match(/FT\s+\d+/)) {
            return 'ft';
        }
        
        return null;
    }
    
    /**
     * Parse DDT
     */
    function parseDDT(text, fileName) {
        try {
            // Usa DDTExtractor (versione modulare o originale)
            const extractor = new (window.DDTExtractorModular || window.DDTExtractor)(text, null, fileName);
            const result = extractor.extract();
            
            if (result) {
                result.type = 'ddt';
                result.documentType = 'DDT';
                
                // Normalizza i campi
                normalizeDocumentFields(result);
            }
            
            return result;
        } catch (error) {
            console.error('Errore nel parsing DDT:', error);
            return null;
        }
    }
    
    /**
     * Parse Fattura
     */
    function parseFattura(text, fileName) {
        try {
            // Usa FatturaExtractor (versione modulare o originale)
            const extractor = new (window.FatturaExtractorModular || window.FatturaExtractor)(text, null, fileName);
            const result = extractor.extract();
            
            if (result) {
                result.type = 'ft';
                result.documentType = 'FT';
                
                // Normalizza i campi
                normalizeDocumentFields(result);
            }
            
            return result;
        } catch (error) {
            console.error('Errore nel parsing Fattura:', error);
            return null;
        }
    }
    
    /**
     * Normalizza i campi del documento
     */
    function normalizeDocumentFields(doc) {
        // Assicura che tutti i campi essenziali esistano
        doc.number = doc.number || doc.documentNumber || '';
        doc.documentNumber = doc.documentNumber || doc.number || '';
        // NON mappare automaticamente orderNumber da documentNumber
        // doc.orderNumber deve rimanere vuoto se non c'è un riferimento ordine nel documento
        doc.date = doc.date || doc.documentDate || '';
        doc.clientName = doc.clientName || doc.client || '';
        doc.vatNumber = doc.vatNumber || doc.vat || '';
        doc.deliveryAddress = doc.deliveryAddress || doc.address || '';
        doc.items = doc.items || doc.products || [];
        
        // Normalizza i totali
        if (doc.total) {
            doc.total = normalizeAmount(doc.total);
        }
        if (doc.subtotal) {
            doc.subtotal = normalizeAmount(doc.subtotal);
        }
        if (doc.vat) {
            doc.vat = normalizeAmount(doc.vat);
        }
        
        // Normalizza gli items
        if (doc.items && Array.isArray(doc.items)) {
            doc.items = doc.items.map(item => ({
                code: item.code || '',
                description: item.description || '',
                quantity: parseFloat(item.quantity) || 0,
                price: normalizeAmount(item.price || item.unitPrice || '0'),
                sm: parseFloat(item.sm) || 0,
                discount: parseFloat(item.discount) || 0,
                total: normalizeAmount(item.total || '0'),
                deliveryDate: item.deliveryDate || doc.date || '',
                // IMPORTANTE: Preserva i campi IVA
                iva: item.iva || item.vat_rate || '10%',
                vat_rate: item.vat_rate || item.iva || '10%',
                unit: item.unit || item.um || ''
            }));
        }
        
        return doc;
    }
    
    /**
     * Normalizza un importo
     */
    function normalizeAmount(value) {
        if (typeof value === 'number') {
            return value.toFixed(2);
        }
        
        if (typeof value === 'string') {
            // Rimuovi valuta e spazi
            let clean = value.replace(/[€$£\s]/g, '');
            // Sostituisci virgola con punto
            clean = clean.replace(',', '.');
            // Parse e formatta
            const num = parseFloat(clean);
            return isNaN(num) ? '0.00' : num.toFixed(2);
        }
        
        return '0.00';
    }
    
    /**
     * Genera un ID univoco per il documento
     */
    function generateDocumentId() {
        return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Estrae informazioni base dal testo (fallback)
     */
    function extractBasicInfo(text, documentType) {
        const info = {
            type: documentType,
            documentType: documentType.toUpperCase(),
            number: '',
            date: '',
            clientName: '',
            total: '0.00'
        };
        
        // Estrai numero documento
        const numberPatterns = [
            /(?:DDT|FT|FATTURA|DOCUMENTO)\s*N[°.\s]*(\d+(?:\/\d+)?)/i,
            /N[°.\s]*(\d+(?:\/\d+)?)\s*(?:DEL|del)/i
        ];
        
        for (const pattern of numberPatterns) {
            const match = text.match(pattern);
            if (match) {
                info.number = match[1];
                break;
            }
        }
        
        // Estrai data
        const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
        const dateMatch = text.match(datePattern);
        if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = dateMatch[2].padStart(2, '0');
            let year = dateMatch[3];
            if (year.length === 2) {
                year = '20' + year;
            }
            info.date = `${year}-${month}-${day}`;
        }
        
        // Estrai totale
        const totalPatterns = [
            /TOTALE\s*(?:DOCUMENTO|FATTURA)?\s*[€]\s*([\d.,]+)/i,
            /IMPORTO\s*TOTALE\s*[€]\s*([\d.,]+)/i,
            /TOTALE\s*[€]\s*([\d.,]+)/i
        ];
        
        for (const pattern of totalPatterns) {
            const match = text.match(pattern);
            if (match) {
                info.total = normalizeAmount(match[1]);
                break;
            }
        }
        
        return info;
    }
    
    // Esporta le funzioni pubbliche
    return {
        parseDocumentFromText,
        detectDocumentType,
        normalizeDocumentFields,
        normalizeAmount,
        generateDocumentId
    };
})();

console.log('✅ DDTFT Document Parser caricato');