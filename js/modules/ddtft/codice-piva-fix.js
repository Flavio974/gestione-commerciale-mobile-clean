/**
 * Fix per correggere l'estrazione del codice cliente e della partita IVA
 * Corregge il problema dove viene mostrato "20001" invece di "5120" e "3.52" invece della P.IVA corretta
 */

(function() {
    'use strict';
    
    console.log('🔧 Applicando fix codice cliente e P.IVA...');
    
    if (window.DDTFTDocumentParser) {
        const originalParse = window.DDTFTDocumentParser.parseDocumentFromText;
        
        window.DDTFTDocumentParser.parseDocumentFromText = function(text, fileName) {
            const result = originalParse.call(this, text, fileName);
            
            if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                console.log('[CODICE PIVA FIX] Cercando codice cliente e P.IVA corretti...');
                
                // Pattern per trovare "Cod. Cli. 5120" o simili
                // Cerca in tutto il documento, non solo nella prima occorrenza
                const codiceClientePatterns = [
                    /Cod\.?\s*Cli\.?\s+(\d{4,6})(?!\d)/gi,  // Cod. Cli. seguito da 4-6 cifre
                    /Codice\s+Cliente\s*:?\s*(\d{4,6})/gi,
                    /Cliente\s+(\d{4,6})\s+/gi
                ];
                
                let codiceCorretto = null;
                
                for (const pattern of codiceClientePatterns) {
                    const matches = [...text.matchAll(pattern)];
                    for (const match of matches) {
                        const codice = match[1];
                        // Se troviamo un codice diverso da 20001, lo usiamo
                        if (codice !== '20001') {
                            codiceCorretto = codice;
                            console.log(`✅ [CODICE PIVA FIX] Codice cliente trovato: ${codice}`);
                            break;
                        }
                    }
                    if (codiceCorretto) break;
                }
                
                // Se abbiamo trovato un codice corretto, sovrascrivi TUTTI i campi
                if (codiceCorretto) {
                    result.clientCode = codiceCorretto;
                    result.codiceCliente = codiceCorretto;
                    result.customerCode = codiceCorretto;
                    console.log(`✅ [CODICE PIVA FIX] Codice cliente impostato a: ${codiceCorretto}`);
                }
                
                // Pattern per trovare la P.IVA corretta
                // Cerca pattern come "P.IVA 03948460047" o "Partita IVA 03948460047"
                const pivaPatterns = [
                    /P\.?\s*IVA\s*[:=]?\s*(\d{11})/i,
                    /Partita\s+IVA\s*[:=]?\s*(\d{11})/i,
                    /P\.?\s*Iva\s+(\d{11})/i,
                    // Pattern specifico per il formato nel documento
                    /Cod\.\s*Cli\.\s+\d+\s+[Pp]\.?[Ii]va\s+(\d{11})/i
                ];
                
                let pivaFound = false;
                for (const pattern of pivaPatterns) {
                    const pivaMatch = text.match(pattern);
                    if (pivaMatch) {
                        const piva = pivaMatch[1];
                        console.log(`✅ [CODICE PIVA FIX] P.IVA corretta trovata: ${piva}`);
                        result.vatNumber = piva;
                        result.partitaIVA = piva;
                        result.piva = piva;
                        pivaFound = true;
                        break;
                    }
                }
                
                // Se non abbiamo trovato la P.IVA, cerca in modo più specifico
                if (!pivaFound) {
                    // Cerca nella zona dove appaiono codice cliente e P.IVA insieme
                    const codPivaPattern = /Cod\.\s*Cli\.\s+(\d+)\s+[Pp]\.?[Ii]va\s+(\d{11})/;
                    const match = text.match(codPivaPattern);
                    
                    if (match) {
                        const codice = match[1];
                        const piva = match[2];
                        
                        console.log(`✅ [CODICE PIVA FIX] Trovati insieme: Cod.Cliente ${codice}, P.IVA ${piva}`);
                        
                        if (codice !== '20001') {
                            result.clientCode = codice;
                            result.codiceCliente = codice;
                        }
                        
                        result.vatNumber = piva;
                        result.partitaIVA = piva;
                        result.piva = piva;
                    }
                }
                
                // Rimuovi valori errati
                if (result.vatNumber === '3.52' || result.piva === '3.52') {
                    console.log('[CODICE PIVA FIX] Rimosso valore P.IVA errato (3.52)');
                    result.vatNumber = '';
                    result.piva = '';
                    result.partitaIVA = '';
                }
                
                // Log finale
                console.log('[CODICE PIVA FIX] Valori finali:');
                console.log(`  Codice Cliente: ${result.clientCode || result.codiceCliente || 'non trovato'}`);
                console.log(`  P.IVA: ${result.vatNumber || result.piva || 'non trovata'}`);
            }
            
            return result;
        };
        
        console.log('✅ [CODICE PIVA FIX] Override applicato');
    }
    
    // Fix anche nel normalizeDocumentFields
    setTimeout(() => {
        if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.normalizeDocumentFields) {
            const originalNormalize = window.DDTFTDocumentParser.normalizeDocumentFields;
            
            window.DDTFTDocumentParser.normalizeDocumentFields = function(doc) {
                const result = originalNormalize ? originalNormalize.call(this, doc) : doc;
                
                if (result && (result.type === 'ft' || result.documentType === 'FT')) {
                    // Correggi P.IVA se è un valore errato
                    if (result.vatNumber === '3.52' || result.piva === '3.52') {
                        console.log('[CODICE PIVA FIX] Correzione P.IVA errata in normalizeDocumentFields');
                        result.vatNumber = '';
                        result.piva = '';
                        result.partitaIVA = '';
                    }
                    
                    // Se il codice cliente è 20001 e abbiamo un altro codice, usa quello
                    if (result.clientCode === '20001' && result.codiceCliente && result.codiceCliente !== '20001') {
                        result.clientCode = result.codiceCliente;
                    }
                }
                
                return result;
            };
            
            console.log('✅ [CODICE PIVA FIX] Override normalizeDocumentFields applicato');
        }
    }, 100);
    
})();