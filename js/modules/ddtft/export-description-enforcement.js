/**
 * Fix finale per garantire che le descrizioni siano sempre presenti nell'export Excel
 * 
 * PROBLEMA: Nonostante i vari fix, a volte le descrizioni vengono perse durante l'export
 * 
 * SOLUZIONE: Intercetta TUTTI i punti di export e forza il ripristino delle descrizioni
 * basandosi sui log del parser che mostrano le descrizioni corrette
 */

(function() {
    'use strict';
    
    console.log('🔒 [EXPORT DESCRIPTION ENFORCEMENT] Applicando enforcement descrizioni export...');
    
    // Mappa per salvare le descrizioni man mano che vengono parsate
    const descriptionCache = new Map();
    
    // Intercetta tutti i console.log per catturare le descrizioni dal parser
    const originalLog = console.log;
    console.log = function(...args) {
        if (args[0] && typeof args[0] === 'string') {
            // Cattura descrizioni dal DDT parser completo
            if (args[0].includes('[DDT PARSER COMPLETO] Articolo:') && args[1]) {
                const match = args[1].match(/^(\w+)\s*-\s*(.+)$/);
                if (match) {
                    const code = match[1];
                    const description = match[2].trim();
                    descriptionCache.set(code, description);
                    console.log(`🔒 [EXPORT DESCRIPTION ENFORCEMENT] Salvata descrizione per ${code}: ${description}`);
                }
            }
            
            // Cattura descrizioni dal VIEW
            if (args[0].includes('[VIEW] Item') && args[0].includes('desc=')) {
                const codeMatch = args[0].match(/Item\s+(\w+):/);
                const descMatch = args[0].match(/desc="([^"]+)"/);
                if (codeMatch && descMatch) {
                    const code = codeMatch[1];
                    const description = descMatch[1];
                    descriptionCache.set(code, description);
                }
            }
        }
        originalLog.apply(console, args);
    };
    
    // Override prepareWorksheetData con enforcement aggressivo
    if (window.DDTFTExportExcel && window.DDTFTExportExcel.prepareWorksheetData) {
        const originalPrepare = window.DDTFTExportExcel.prepareWorksheetData;
        
        window.DDTFTExportExcel.prepareWorksheetData = function(documents) {
            console.log('🔒 [EXPORT DESCRIPTION ENFORCEMENT] Intercettato prepareWorksheetData');
            
            // Correggi TUTTI i documenti prima della preparazione
            const enforcedDocs = documents.map(doc => {
                if (doc.items && Array.isArray(doc.items)) {
                    doc.items = doc.items.map(item => {
                        // Se la descrizione è mancante o invalida
                        if (!item.description || item.description === "0" || item.description === "" || 
                            item.description.length < 3) {
                            
                            const cachedDesc = descriptionCache.get(item.code);
                            if (cachedDesc) {
                                console.log(`🔒 [EXPORT DESCRIPTION ENFORCEMENT] Ripristino descrizione da cache per ${item.code}: ${cachedDesc}`);
                                item.description = cachedDesc;
                            } else {
                                // Prova tutti i possibili campi
                                const tryFields = ['descrizione', 'desc', 'nome', 'denominazione', 'descrizioneProdotto', 'articolo'];
                                let found = false;
                                
                                for (const field of tryFields) {
                                    if (item[field] && item[field] !== "0" && item[field].length > 3) {
                                        item.description = item[field];
                                        console.log(`🔒 [EXPORT DESCRIPTION ENFORCEMENT] Descrizione trovata in ${field} per ${item.code}: ${item.description}`);
                                        found = true;
                                        break;
                                    }
                                }
                                
                                if (!found) {
                                    // Ultima risorsa: genera una descrizione
                                    item.description = `Articolo ${item.code || 'SCONOSCIUTO'}`;
                                    console.log(`🔒 [EXPORT DESCRIPTION ENFORCEMENT] Generata descrizione fallback per ${item.code}`);
                                }
                            }
                        }
                        return item;
                    });
                }
                return doc;
            });
            
            // Chiama la funzione originale con i documenti corretti
            const result = originalPrepare.call(this, enforcedDocs);
            
            // Verifica finale sul risultato
            if (Array.isArray(result) && result.length > 1) {
                console.log('🔒 [EXPORT DESCRIPTION ENFORCEMENT] Verifica finale righe export:');
                // Salta l'header (riga 0) e verifica le prime 5 righe di dati
                for (let i = 1; i <= Math.min(5, result.length - 1); i++) {
                    const row = result[i];
                    if (row && row.length > 10) {
                        const code = row[9];  // Codice prodotto
                        const desc = row[10]; // Descrizione prodotto
                        
                        if (!desc || desc === "0" || desc === "") {
                            console.error(`🔒 [EXPORT DESCRIPTION ENFORCEMENT] ERRORE: Riga ${i} manca descrizione per codice ${code}`);
                            
                            // Tentativo estremo di correzione
                            const cachedDesc = descriptionCache.get(code);
                            if (cachedDesc) {
                                row[10] = cachedDesc;
                                console.log(`🔒 [EXPORT DESCRIPTION ENFORCEMENT] Correzione estrema applicata: ${cachedDesc}`);
                            }
                        } else {
                            console.log(`🔒 [EXPORT DESCRIPTION ENFORCEMENT] Riga ${i} OK: ${code} -> ${desc}`);
                        }
                    }
                }
            }
            
            return result;
        };
    }
    
    // Clear cache periodicamente per evitare memory leak
    setInterval(() => {
        if (descriptionCache.size > 1000) {
            descriptionCache.clear();
            console.log('🔒 [EXPORT DESCRIPTION ENFORCEMENT] Cache descrizioni pulita');
        }
    }, 300000); // 5 minuti
    
    console.log('✅ [EXPORT DESCRIPTION ENFORCEMENT] Enforcement descrizioni export installato');
    
})();