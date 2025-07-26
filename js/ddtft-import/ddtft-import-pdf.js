/**
 * DDTFT Import PDF Module
 * Gestisce l'estrazione del testo dai file PDF
 */

export const DDTFTImportPDF = {
  /**
   * Estrae testo da PDF usando PDF.js
   * @param {File} file - Il file PDF da processare
   * @returns {Promise<string>} - Il testo estratto
   */
  extractTextFromPdf: async function(file) {
    // Usa il modulo esterno se disponibile
    if (window.DDTFTPdfParser && window.DDTFTPdfParser.extractTextFromPdf) {
      return window.DDTFTPdfParser.extractTextFromPdf(file);
    }
    
    // Fallback al codice originale (per retrocompatibilità)
    console.warn('DDTFTPdfParser non disponibile, uso metodo legacy');
    if (!window.pdfjsLib) {
      throw new Error('PDF.js non caricato');
    }

    const debugContent = document.getElementById('documentDebugContent');
    if (debugContent) {
      debugContent.textContent += `\n=== ESTRAZIONE PDF: ${file.name} ===\n`;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      if (debugContent) {
        debugContent.textContent += `Numero pagine: ${pdf.numPages}\n`;
      }

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Ricostruisci il testo mantenendo la struttura
        let pageText = '';
        
        // Raggruppa gli item per riga (stessa Y)
        const lines = [];
        let currentLine = [];
        let currentY = null;
        
        textContent.items.forEach(item => {
          if (currentY === null || Math.abs(item.transform[5] - currentY) <= 5) {
            // Stesso Y, stessa riga
            currentLine.push(item);
            currentY = item.transform[5];
          } else {
            // Nuova riga
            if (currentLine.length > 0) {
              lines.push(currentLine);
            }
            currentLine = [item];
            currentY = item.transform[5];
          }
        });
        
        // Aggiungi l'ultima riga
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        
        // IMPORTANTE: Log per debug layout a colonne
        if (debugContent && pageNum === 1) {
          debugContent.textContent += '\n=== DEBUG LAYOUT COLONNE ===\n';
          // Mostra le prime 40 righe con le loro coordinate per vedere più dati
          lines.slice(0, 40).forEach((line, idx) => {
            debugContent.textContent += `Riga ${idx + 1}: `;
            line.forEach(item => {
              debugContent.textContent += `[X:${Math.round(item.transform[4])}, "${item.str}"] `;
            });
            debugContent.textContent += '\n';
          });
        }
        
        // Ricostruisci il testo
        lines.forEach(line => {
          // Ordina gli item della riga per posizione X
          line.sort((a, b) => a.transform[4] - b.transform[4]);
          
          // Costruisci il testo della riga considerando le colonne
          let rowText = '';
          let lastX = 0;
          
          line.forEach((item, index) => {
            const x = item.transform[4];
            
            // Se c'è un grande salto orizzontale, potrebbe essere una nuova colonna
            if (x - lastX > 100 && rowText.length > 0) {
              // Aggiungi tabulazione per separare le colonne
              rowText += '\t\t';
            } else if (index > 0 && x - lastX > 10) {
              // Aggiungi spazio normale
              rowText += ' ';
            }
            
            rowText += item.str;
            lastX = x + (item.width || 0);
          });
          
          pageText += rowText + '\n';
        });
        
        fullText += pageText + '\n\n';
        
        if (debugContent && pageNum === 1) {
          debugContent.textContent += `\n=== TESTO COMPLETO PRIMA PAGINA ===\n`;
          debugContent.textContent += `Primi 4000 caratteri:\n${pageText.substring(0, 4000)}\n`;
          debugContent.textContent += `\n=== FINE TESTO ===\n`;
          
          // Cerca specificamente il numero del documento
          const numeroMatch = pageText.match(/Numero\s+(\d{6})/i);
          if (numeroMatch) {
            debugContent.textContent += `\n🎯 NUMERO TROVATO NEL TESTO: ${numeroMatch[1]}\n`;
          }
          
          // Cerca il cliente
          const clienteMatch = pageText.match(/Cliente\s+Luogo di consegna\s*\n([^\n]+)/i);
          if (clienteMatch) {
            debugContent.textContent += `\n🎯 CLIENTE TROVATO: ${clienteMatch[1]}\n`;
          }
        }
      }

      return fullText;
    } catch (error) {
      console.error('Errore estrazione testo PDF:', error);
      if (debugContent) {
        debugContent.textContent += `ERRORE: ${error.message}\n`;
      }
      throw error;
    }
  }
};