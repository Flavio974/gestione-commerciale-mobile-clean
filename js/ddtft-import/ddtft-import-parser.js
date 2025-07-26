/**
 * DDTFT Import Parser Module
 * Gestisce il parsing e riconoscimento dei documenti
 */

// Import le dipendenze necessarie per il parser
import { DDTExtractor } from './ddtft-import-ddt-extractor.js';
import { FatturaExtractor } from './ddtft-import-fattura-extractor.js';
import { DDTFTImportExtractors } from './ddtft-import-extractors.js';
import { DDTFTImportUtils } from './ddtft-import-utils.js';

export const DDTFTImportParser = {
  /**
   * Parse documento da testo
   */
  parseDocumentFromText: function(text, fileName) {
    // Usa il nuovo document parser se disponibile
    if (window.DDTFTDocumentParser && window.DDTFTDocumentParser.parseDocumentFromText) {
      return window.DDTFTDocumentParser.parseDocumentFromText(text, fileName);
    }
    
    // Fallback al codice originale
    const debugContent = document.getElementById('documentDebugContent');
    if (debugContent) {
      debugContent.textContent += `\n=== ANALISI FILE: ${fileName} ===\n`;
      debugContent.textContent += `Lunghezza testo: ${text.length} caratteri\n`;
      debugContent.textContent += `Primi 500 caratteri:\n${text.substring(0, 500)}\n`;
    }

    // Pulisci il testo preservando le interruzioni di riga
    const cleanText = text
      .replace(/\r\n/g, '\n')  // Normalizza i fine riga
      .replace(/\r/g, '\n')    // Converti tutti i CR in LF
      .replace(/[ \t]+/g, ' ') // Riduci spazi multipli a singoli (ma non i newline)
      .replace(/\n{3,}/g, '\n\n') // Riduci newline multipli a massimo 2
      .trim();
    
    // Determina tipo documento
    let detectedType = 'Documento';
    
    // Check nome file
    if (fileName) {
      const upperFileName = fileName.toUpperCase();
      if (upperFileName.includes('DDV') || upperFileName.includes('DDT')) {
        detectedType = 'DDT';
        if (debugContent) {
          debugContent.textContent += `Riconosciuto come DDT dal nome file\n`;
        }
      } else if (upperFileName.includes('FTV') || upperFileName.includes('FT') || upperFileName.includes('FATT')) {
        detectedType = 'Fattura';
        if (debugContent) {
          debugContent.textContent += `Riconosciuto come Fattura dal nome file\n`;
        }
      }
    }
    
    // Se non riconosciuto dal nome, controlla il contenuto
    if (detectedType === 'Documento') {
      if (cleanText.toUpperCase().includes('DOCUMENTO DI TRASPORTO') || 
          cleanText.toUpperCase().includes('D.D.T.') ||
          cleanText.toUpperCase().includes('DDT')) {
        detectedType = 'DDT';
      } else if (cleanText.toUpperCase().includes('FATTURA') || 
                 cleanText.toUpperCase().includes('INVOICE')) {
        detectedType = 'Fattura';
      }
    }

    if (debugContent) {
      debugContent.textContent += `TIPO DOC: ${detectedType}\n`;
    }

    // Per DDT usa DDTExtractor
    if (detectedType === 'DDT') {
      if (debugContent) {
        debugContent.textContent += '🎯 Documento DDT rilevato - usando DDTExtractor specializzato\n';
        debugContent.textContent += `📁 Nome file: ${fileName}\n`;
        debugContent.textContent += `⚠️ VERSIONE AGGIORNATA - Estrazione da nome file prioritaria\n`;
      }
      
      try {
        // Usa DDTExtractorModular se disponibile, altrimenti fallback a DDTExtractor
        const ExtractorClass = window.DDTExtractorModular || DDTExtractor;
        
        // DEBUG: Verifica che il testo contenga i metadati
        console.log('[DEBUG] Verifica presenza metadati nel testo:');
        console.log('[DEBUG] Contiene [METADATA_START]?', text.includes('[METADATA_START]'));
        console.log('[DEBUG] Contiene NUMERO_DOC:5023?', text.includes('NUMERO_DOC:5023'));
        if (text.includes('[METADATA_START]')) {
          const metadataEnd = text.indexOf('[METADATA_END]');
          if (metadataEnd > -1) {
            console.log('[DEBUG] Metadati trovati:', text.substring(0, metadataEnd + 14));
          }
        }
        
        const ddtExtractor = new ExtractorClass(text, debugContent, fileName);
        console.log('[DEBUG] DDTExtractor creato con nome file:', fileName, 'Classe:', ExtractorClass.name);
        const result = ddtExtractor.extract();
        console.log('[DEBUG] Risultato extract:', result);
        console.log('[DEBUG] Numero documento estratto:', result.documentNumber);
        
        // Mappa i campi del DDTExtractor al formato atteso
        const mappedResult = {
          id: result.id || DDTFTImportUtils.generateId(),
          type: 'ddt',
          fileName: result.fileName || fileName,
          importDate: result.importDate || new Date().toISOString(),
          documentNumber: result.documentNumber || 'N/A',  // Numero documento DDT
          number: result.documentNumber || 'N/A',  // Mantieni per compatibilità
          orderNumber: result.orderNumber || result.orderReference || '',  // Numero ordine cliente
          orderDate: result.orderDate || '',  // Data dell'ordine (quando presente)
          date: result.date || '',  // Data del documento DDT
          clientName: result.clientName || result.client || '',
          vatNumber: result.vatNumber || '',
          deliveryAddress: result.deliveryAddress || '',
          orderReference: result.orderReference || result.orderNumber || '',
          items: result.items || [],
          subtotal: parseFloat(result.subtotal || 0),
          vat: parseFloat(result.vat || 0),
          total: parseFloat(result.total || 0)
        };
        
        // FIX: Rimuovi duplicati dal nome cliente
        if (mappedResult.clientName) {
          let clientName = mappedResult.clientName;
          
          // Prima verifica se il nome completo è duplicato (es: "PIEMONTE CARNI PIEMONTE CARNI")
          const halfLength = Math.floor(clientName.length / 2);
          const firstHalf = clientName.substring(0, halfLength);
          const secondHalf = clientName.substring(halfLength);
          
          if (firstHalf.trim() === secondHalf.trim()) {
            // Il nome è esattamente duplicato
            mappedResult.clientName = firstHalf.trim();
            console.log('[DEBUG] Nome completamente duplicato, uso solo prima metà:', mappedResult.clientName);
          } else {
            // Altrimenti rimuovi duplicati di parole consecutive
            const parts = clientName.split(/\s+/);
            const uniqueParts = [];
            let lastPart = '';
            
            for (const part of parts) {
              // Evita duplicati consecutivi
              if (part !== lastPart || (!part.match(/S\.R\.L\.|S\.P\.A\.|SRL|SPA/i) && lastPart === part)) {
                uniqueParts.push(part);
              }
              lastPart = part;
            }
            
            mappedResult.clientName = uniqueParts.join(' ').trim();
          }
          
          console.log('[DEBUG] Nome cliente dopo rimozione duplicati:', mappedResult.clientName);
        }
        
        console.log('[DEBUG] Risultato mappato finale:', mappedResult);
        console.log('[DEBUG] deliveryAddress finale:', mappedResult.deliveryAddress);
        
        return mappedResult;
      } catch (error) {
        console.error('Errore DDTExtractor:', error);
        if (debugContent) {
          debugContent.textContent += `❌ ERRORE DDTExtractor: ${error.message}\n`;
        }
        // Fallback al parser generico
      }
    }
    
    // Per Fatture usa FatturaExtractor
    if (detectedType === 'Fattura') {
      if (debugContent) {
        debugContent.textContent += '🎯 Documento Fattura rilevato - usando FatturaExtractor specializzato\n';
      }
      
      try {
        // Usa FatturaExtractorModular se disponibile, altrimenti fallback a FatturaExtractor
        const ExtractorClass = window.FatturaExtractorModular || FatturaExtractor;
        const fatturaExtractor = new ExtractorClass(text, debugContent, fileName);
        console.log('[DEBUG] FatturaExtractor creato con nome file:', fileName, 'Classe:', ExtractorClass.name);
        const result = fatturaExtractor.extract();
        
        // Mappa i campi del FatturaExtractor al formato atteso
        return {
          id: result.id || DDTFTImportUtils.generateId(),
          type: 'ft',
          fileName: result.fileName || fileName,
          importDate: result.importDate || new Date().toISOString(),
          documentNumber: result.documentNumber || 'N/A',  // Numero fattura
          number: result.documentNumber || 'N/A',  // Mantieni per compatibilità
          orderNumber: result.orderNumber || result.orderReference || '',  // Numero ordine cliente
          orderDate: result.orderDate || '',  // Data dell'ordine (quando presente)
          date: result.date || '',  // Data della fattura
          clientName: result.clientName || result.client || '',
          vatNumber: result.vatNumber || '',
          deliveryAddress: result.deliveryAddress || '',
          orderReference: result.orderReference || result.orderNumber || '',
          items: result.items || [],
          subtotal: parseFloat(result.subtotal || 0),
          vat: parseFloat(result.vat || 0),
          total: parseFloat(result.total || 0)
        };
      } catch (error) {
        console.error('Errore FatturaExtractor:', error);
        if (debugContent) {
          debugContent.textContent += `❌ ERRORE FatturaExtractor: ${error.message}\n`;
        }
        // Fallback al parser generico
      }
    }

    // Parser generico per Fatture o fallback
    // Usa il testo originale (non cleanText) per preservare la struttura
    const parsedDoc = {
      id: DDTFTImportUtils.generateId(),
      type: detectedType === 'DDT' ? 'ddt' : 'ft',
      fileName: fileName,
      importDate: new Date().toISOString(),
      number: DDTFTImportExtractors.extractDocumentNumber(text, detectedType),
      documentNumber: DDTFTImportExtractors.extractDocumentNumber(text, detectedType),  // Aggiungi anche questo
      orderNumber: DDTFTImportExtractors.extractOrderReference(text),  // Numero ordine
      orderDate: '',  // Sarà estratta dopo se presente
      date: DDTFTImportExtractors.extractDate(text),  // Data del documento
      clientName: DDTFTImportExtractors.extractClientName(text),
      vatNumber: DDTFTImportExtractors.extractVatNumber(text),
      deliveryAddress: null, // Temporaneamente null
      orderReference: DDTFTImportExtractors.extractOrderReference(text),
      items: DDTFTImportExtractors.extractItems(text, detectedType),
      subtotal: 0,
      total: 0
    };
    
    // Se abbiamo un numero ordine, cerca la data sulla stessa riga
    if (parsedDoc.orderNumber) {
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.includes(parsedDoc.orderNumber)) {
          // Cerca pattern di data sulla stessa riga (include date senza anno)
          const dateMatch = line.match(/(?:del|DEL)\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)/i) ||
                          line.match(/\s(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{1,4})?)(?:\s|$)/);
          if (dateMatch) {
            let orderDate = dateMatch[1];
            
            // Normalizza la data con anno mancante o troncato
            const dateParts = orderDate.split(/[\/\-]/);
            
            if (dateParts.length === 2) {
              // Caso "15/05" - manca l'anno
              const day = dateParts[0];
              const month = dateParts[1];
              const year = new Date().getFullYear().toString();
              console.log(`⚠️ Anno mancante in "${orderDate}" → uso anno corrente: ${year}`);
              orderDate = `${day}/${month}/${year}`;
            }
            else if (dateParts.length === 3) {
              const day = dateParts[0];
              const month = dateParts[1];
              let year = dateParts[2];
              
              // Se l'anno ha solo 1 cifra (es: "2"), usa l'anno corrente
              if (year.length === 1) {
                year = new Date().getFullYear().toString();
                console.log(`⚠️ Anno troncato "${dateParts[2]}" → uso anno corrente: ${year}`);
              }
              // Se l'anno ha 2 cifre, aggiungi 20 davanti
              else if (year.length === 2) {
                year = '20' + year;
              }
              
              orderDate = `${day}/${month}/${year}`;
            }
            
            parsedDoc.orderDate = orderDate;
            console.log(`📅 Data ordine estratta: ${parsedDoc.orderDate} per ordine ${parsedDoc.orderNumber}`);
            break;
          }
        }
      }
    }
    
    // Estrai indirizzo di consegna passando il nome cliente per debug
    parsedDoc.deliveryAddress = DDTFTImportExtractors.extractDeliveryAddress(text, fileName, parsedDoc.clientName);

    // Calcola totali
    if (parsedDoc.items && parsedDoc.items.length > 0) {
      parsedDoc.subtotal = parsedDoc.items.reduce((sum, item) => {
        return sum + (parseFloat(item.total) || 0);
      }, 0);
      parsedDoc.total = parsedDoc.subtotal;
    }

    if (debugContent) {
      debugContent.textContent += `\n=== DOCUMENTO FINALE ===\n`;
      debugContent.textContent += `Tipo: ${parsedDoc.type}\n`;
      debugContent.textContent += `Numero: ${parsedDoc.number || 'N/A'}\n`;
      debugContent.textContent += `Data: ${parsedDoc.date || 'N/A'}\n`;
      debugContent.textContent += `Cliente: ${parsedDoc.clientName || 'N/A'}\n`;
      debugContent.textContent += `Prodotti: ${parsedDoc.items.length}\n`;
    }

    return parsedDoc;
  }
};