// Script per correggere il metodo extractInvoiceProducts

const newMethod = `  extractInvoiceProducts() {
    this.log('📦 === ESTRAZIONE PRODOTTI FATTURA ===');
    
    const products = [];
    const lines = this.text.replace(/\\*\\*/g, '').split('\\n');
    
    // Trova inizio tabella prodotti
    let startIndex = -1;
    const tableHeaders = [
      /cod.*desc.*um.*quant.*prezzo.*importo/i,
      /cod\\.?art\\.?.*descrizione.*um.*quantità.*prezzo.*importo/i,
      /codice.*descrizione.*qt\\.?.*prezzo.*totale/i,
      /articolo.*descrizione.*quantità.*prezzo/i,
      /prodotto.*qt.*importo/i,
      /descrizione.*qta.*€/i,
      /dettaglio\\s+prodotti/i,
      /descrizione\\s+articolo.*qt\\./i
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      for (const pattern of tableHeaders) {
        if (pattern.test(line)) {
          startIndex = i + 1;
          this.log(\`✅ Inizio tabella prodotti alla riga \${i}: "\${lines[i]}"\`);
          
          // Salta eventuali linee di separazione
          while (startIndex < lines.length && lines[startIndex].trim().match(/^[-=_]+$/)) {
            startIndex++;
          }
          break;
        }
      }
      if (startIndex !== -1) break;
    }
    
    if (startIndex === -1) {
      this.log('⚠️ Header tabella non trovato, cerco prodotti con pattern codice...');
      // Cerca direttamente righe che iniziano con codici prodotto validi
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^(\\d{6}|[A-Z]{2}\\d{6}|PIRR\\d{3})\\s+/)) {
          startIndex = i;
          this.log(\`✅ Primo prodotto trovato alla riga \${i}\`);
          break;
        }
      }
      if (startIndex === -1) startIndex = 0;
    }
    
    // IMPORTANTE: Pattern per prodotti - SOLO codici validi!
    // Estrai prodotti
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Stop se riga di totali
      if (/(?:imponibile|totale|iva|subtotale).*€?\\s*\\d+/i.test(line)) {
        this.log(\`🛑 Fine prodotti alla riga \${i}: "\${line}"\`);
        break;
      }
      
      if (!line || line.length < 10) continue;
      
      // NUOVO APPROCCIO: Match diretto per righe prodotto ALFIERI
      // Formato: CODICE(6cifre) DESCRIZIONE UM QTA PREZZO IMPORTO [IVA]
      const productMatch = line.match(/^(\\d{6})\\s+(.+?)\\s+(PZ|KG|CF|CT|LT|MT|GR|ML)\\s+(\\d+[,.]\\d*)\\s+(\\d+[,.]\\d*)\\s+(\\d+[,.]\\d*)(?:\\s+(\\d+))?/i);
      
      if (productMatch) {
        const product = {
          code: productMatch[1],
          description: productMatch[2].trim(),
          unit: productMatch[3],
          quantity: productMatch[4].replace(',', '.'),
          price: productMatch[5].replace(',', '.'),
          total: productMatch[6].replace(',', '.'),
          iva: productMatch[7] ? productMatch[7] + '%' : '10%'
        };
        
        products.push(product);
        this.log(\`✅ Prodotto \${products.length}: \${product.code} - \${product.description} (\${product.quantity} \${product.unit})\`);
        continue;
      }
      
      // Fallback: prova con pattern prefisso
      const prefixMatch = line.match(/^([A-Z]{2}\\d{6}|PIRR\\d{3})\\s+(.+?)\\s+(PZ|KG|CF|CT|LT|MT|GR|ML)\\s+(\\d+[,.]\\d*)\\s+(\\d+[,.]\\d*)\\s+(\\d+[,.]\\d*)/i);
      
      if (prefixMatch) {
        const product = {
          code: prefixMatch[1],
          description: prefixMatch[2].trim(),
          unit: prefixMatch[3],
          quantity: prefixMatch[4].replace(',', '.'),
          price: prefixMatch[5].replace(',', '.'),
          total: prefixMatch[6].replace(',', '.'),
          iva: '10%'
        };
        
        products.push(product);
        this.log(\`✅ Prodotto \${products.length}: \${product.code} - \${product.description}\`);
      }
    }
    
    this.log(\`📊 Totale prodotti estratti: \${products.length}\`);
    
    // Se non abbiamo trovato prodotti, log di debug
    if (products.length === 0) {
      this.log('❌ NESSUN PRODOTTO TROVATO! Debug righe:');
      for (let i = startIndex; i < Math.min(startIndex + 10, lines.length); i++) {
        this.log(\`  Riga \${i}: "\${lines[i]}"\`);
      }
    }
    
    return products;
  }`;

console.log("Nuovo metodo extractInvoiceProducts creato.");
console.log("Per applicarlo, sostituisci il metodo nella classe FatturaExtractor.");