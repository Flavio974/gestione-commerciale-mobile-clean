/**
 * 📄 ORDINI PARSER - CLEAN ARCHITECTURE
 * Ridotto da 1104 → ~400 righe (64% riduzione)
 * Design Patterns: Strategy, Factory, Parser, Facade
 */

console.log('[LOAD] ✅ ordini-parser-clean.js caricato');

// ==================== CONFIGURATION ====================

const PARSER_CONFIG = {
  DEBUG: localStorage.getItem('parser_debug') === 'true',
  VERSION: '2.0.0',
  
  PATTERNS: {
    // Product codes
    PRODUCT_CODES: [
      /^[A-Z]{2}\d{6}$/,          // GF000011
      /^[A-Z]{1,3}\d{3,6}$/,      // PS000007, DL000028
      /^\d{5,6}[A-Z]{0,2}$/,      // 060027, 060237BA
      /^[A-Z]{2}\d{6}[A-Z]{0,4}$/, // DL200277
      /^PIRR\d{3}$/,              // PIRR002
      /^[A-Z0-9]{6,10}$/          // Generic
    ],
    
    // Order info
    ORDER_NUMBER: /Num\.\s*([\w]+)\s*del/i,
    ORDER_DATE: /del\s*(\d{2}\/\d{2}\/\d{4})/i,
    
    // VAT patterns
    VAT: [
      /P\.\s*IVA:\s*(\d{11})/i,
      /P\.\s*IVA\s*:\s*(\d{11})/i,
      /PARTITA\s+IVA:\s*(\d{11})/i,
      /P\.IVA\s+(\d{11})/i,
      /P\.\s*IVA\s+(\d{11})/i,
      /PIVA\s+(\d{11})/i,
      /\bIT\s*(\d{11})\b/i
    ],
    
    // Delivery date
    DELIVERY_DATE: [
      /(?:Data\s+(?:di\s+)?consegna|Consegna)[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
      /Consegna\s+S\.M\.*?\n.*?(\d{2}\/\d{2}\/\d{4})/s,
      /Delivery\s+date[:\s]+(\d{2}\/\d{2}\/\d{4})/i
    ],
    
    // Totals
    TOTAL_QTY: /Totale\s+quantit[àa]\s+(\d+(?:[,\.]\d+)?)/i,
    TOTAL_AMOUNT: /Totale\s+merce\s+(\d+(?:,\d+)?)\s*€/i,
    GRAND_TOTAL: /TOTALE\s+DOCUMENTO\s+(\d+(?:,\d+)?)\s*€/i,
    IVA_AMOUNT: /Totale\s+IVA\s+(\d+(?:,\d+)?)\s*€/i,
    IVA_RATE: /IVA\s+(\d+)%/i,
    
    // Address
    ADDRESS_KEYWORDS: /^(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|P\.ZZA|PZA|LARGO|LOCALITA'|LOC\.|STRADA|STR\.)/i,
    STOP_KEYWORDS: /^(P\.?\s*IVA|PARTITA\s+IVA|C\.?F\.?|TEL\.?|FAX|CELL\.?|E-?MAIL)/i
  },
  
  DEFAULTS: {
    UNIT: 'PZ',
    IVA_RATE: 22,
    MAX_LOG_ENTRIES: 100
  }
};

// ==================== STRATEGY PATTERN - PARSERS ====================

class BaseParser {
  parse(text) {
    throw new Error('Abstract method');
  }
}

class OrderInfoParser extends BaseParser {
  parse(text) {
    const info = {
      orderNumber: '',
      orderDate: '',
      vatNumber: ''
    };
    
    // Order number
    const orderMatch = text.match(PARSER_CONFIG.PATTERNS.ORDER_NUMBER);
    if (orderMatch) info.orderNumber = orderMatch[1];
    
    // Order date
    const dateMatch = text.match(PARSER_CONFIG.PATTERNS.ORDER_DATE);
    if (dateMatch) info.orderDate = dateMatch[1];
    
    // VAT number
    for (const pattern of PARSER_CONFIG.PATTERNS.VAT) {
      const vatMatch = text.match(pattern);
      if (vatMatch) {
        const vat = vatMatch[1].replace(/\s+/g, '');
        if (vat.length === 11 && /^\d{11}$/.test(vat)) {
          info.vatNumber = vat;
          break;
        }
      }
    }
    
    return info;
  }
}

class ClientParser extends BaseParser {
  parse(text) {
    const spettMatch = text.match(/Spett(?:\.le|abile)\s*/i);
    if (!spettMatch) return '';
    
    const startIndex = spettMatch.index + spettMatch[0].length;
    const contextText = text.substring(startIndex);
    const lines = contextText.split('\n');
    const clientLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line && clientLines.length === 0) continue;
      if (this.isStopLine(line)) break;
      
      const processedLine = this.processLine(line);
      if (processedLine && !processedLine.match(/^Luogo$/i)) {
        clientLines.push(processedLine);
        if (!this.shouldContinue(processedLine, lines, i)) break;
      }
    }
    
    const fullName = clientLines.join(' ').replace(/\s+/g, ' ').trim();
    return this.cleanClientName(fullName);
  }
  
  isStopLine(line) {
    return PARSER_CONFIG.PATTERNS.ADDRESS_KEYWORDS.test(line) || 
           PARSER_CONFIG.PATTERNS.STOP_KEYWORDS.test(line) ||
           /^\d{5}\s+/i.test(line);
  }
  
  processLine(line) {
    return line
      .replace(/^Luogo\s*di\s*consegna:\s*/i, '')
      .replace(/^Luogo\s*:\s*/i, '')
      .replace(/^Luogo\s+/i, '')
      .trim();
  }
  
  shouldContinue(line, lines, index) {
    if (line.endsWith('&')) return true;
    
    const continuationWords = ['SOCIETA\'', 'COOPERATIVA', 'PRODUTTORI', 'ALIMENTARI'];
    const lastWord = line.split(' ').pop().toUpperCase();
    if (continuationWords.includes(lastWord)) return true;
    
    if (index + 1 < lines.length) {
      const nextLine = lines[index + 1].trim();
      if (!nextLine || this.isStopLine(nextLine)) return false;
      if (!line.match(/(S\.R\.L\.|SRL|S\.P\.A\.|SPA|SNC|SAS)\s*$/i)) return true;
    }
    
    return false;
  }
  
  cleanClientName(name) {
    if (!name) return '';
    
    let cleaned = name
      .replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}\s+/, '')
      .replace(/^\d{6,}\s+/, '')
      .replace(/^\d+\s+\d+\s+/, '');
    
    if (/^\d{5,}\s/.test(cleaned)) {
      cleaned = cleaned.replace(/^\d+\s+/, '');
    }
    
    return cleaned.trim();
  }
}

class AddressParser extends BaseParser {
  parse(text) {
    const regex = /Luogo\s*di\s*consegna\s*([\s\S]*?)(?=Riferimento|Num\.|$)/i;
    const match = text.match(regex);
    
    if (!match || !match[1]) return '';
    
    const lines = match[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && this.isValidAddressLine(line));
    
    return this.buildAddress(lines);
  }
  
  isValidAddressLine(line) {
    return line.length > 1 &&
           !line.includes('Spett.le') &&
           !line.match(/P\.IVA\s+\d+/i) &&
           !line.match(/^[A-Z]\.$/) &&
           !line.match(/^[A-Z]{1,3}\s*$/);
  }
  
  buildAddress(lines) {
    let startIndex = 0;
    
    // Skip client name if it's first line
    if (lines.length > 0 && !PARSER_CONFIG.PATTERNS.ADDRESS_KEYWORDS.test(lines[0])) {
      startIndex = 1;
    }
    
    let address = '';
    let foundStreet = false;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      if (PARSER_CONFIG.PATTERNS.ADDRESS_KEYWORDS.test(line)) {
        address = line;
        foundStreet = true;
      } else if (foundStreet && (line.match(/\d{5}/) || line.match(/\([A-Z]{2}\)/))) {
        address += ' - ' + line;
        break;
      }
    }
    
    return address || lines.slice(startIndex).join(' - ');
  }
}

class DeliveryDateParser extends BaseParser {
  parse(text, orderDate) {
    // Try header patterns first
    for (const pattern of PARSER_CONFIG.PATTERNS.DELIVERY_DATE) {
      const match = text.match(pattern);
      if (match && this.isValidDate(match[1], orderDate)) {
        return match[1];
      }
    }
    
    // Try product table patterns
    const productDatePattern = /PZ\s+[\d,]+\s+(\d{2}\/\d{2}\/\d{4})/g;
    const dates = [];
    let match;
    
    while ((match = productDatePattern.exec(text)) !== null) {
      if (this.isValidDate(match[1], orderDate)) {
        dates.push(match[1]);
      }
    }
    
    // Return most common date
    if (dates.length > 0) {
      const frequency = {};
      dates.forEach(date => frequency[date] = (frequency[date] || 0) + 1);
      return Object.keys(frequency).sort((a, b) => frequency[b] - frequency[a])[0];
    }
    
    return '';
  }
  
  isValidDate(deliveryDate, orderDate) {
    if (!orderDate || !deliveryDate) return true;
    if (deliveryDate === orderDate) return false;
    
    try {
      const [d1, m1, y1] = orderDate.split('/').map(Number);
      const [d2, m2, y2] = deliveryDate.split('/').map(Number);
      const date1 = new Date(y1, m1 - 1, d1);
      const date2 = new Date(y2, m2 - 1, d2);
      const diffDays = (date2 - date1) / (1000 * 60 * 60 * 24);
      
      return diffDays >= 0 && diffDays <= 90;
    } catch {
      return true;
    }
  }
}

class ProductParser extends BaseParser {
  parse(text) {
    const products = [];
    const lines = text.split('\n');
    
    // Find start of products section
    let startIndex = lines.findIndex(line => 
      line.includes('Articolo') && line.includes('Descrizione') && line.includes('Q.tà')
    );
    
    if (startIndex === -1) {
      startIndex = lines.findIndex(line => 
        PARSER_CONFIG.PATTERNS.PRODUCT_CODES.some(pattern => pattern.test(line.trim()))
      );
    }
    
    if (startIndex === -1) return products;
    startIndex++;
    
    // Process lines
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Stop conditions
      if (line.includes('IBAN') || 
          (line.includes('TOTALE DOCUMENTO') && i > lines.length - 30)) {
        break;
      }
      
      if (!line || line.length < 3) continue;
      
      // Try single line pattern
      const singleLinePattern = /^([A-Z0-9]+)\s+(.+?)\s+(PZ|KG|CT|L|GR)\s+(\d+[,\.]\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(\d+)\s+([\d,\.]+)\s*\*?\s*€.*?([\d,\.]+)\s*\*?\s*€/i;
      const singleMatch = line.match(singleLinePattern);
      
      if (singleMatch) {
        products.push({
          code: singleMatch[1],
          description: singleMatch[2].trim(),
          unit: singleMatch[3].toUpperCase(),
          quantity: singleMatch[4],
          deliveryDate: singleMatch[5],
          sm: singleMatch[6],
          discount: this.extractDiscount(line),
          price: singleMatch[8],
          total: singleMatch[9]
        });
        continue;
      }
      
      // Try pattern without unit
      const noUnitPattern = /^([A-Z0-9]+)\s+(.+?)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+%?)\s+(\d+[,\.]\d+)$/;
      const noUnitMatch = line.match(noUnitPattern);
      
      if (noUnitMatch) {
        products.push({
          code: noUnitMatch[1],
          description: noUnitMatch[2].trim(),
          unit: PARSER_CONFIG.DEFAULTS.UNIT,
          quantity: noUnitMatch[3],
          deliveryDate: '',
          sm: noUnitMatch[5],
          discount: noUnitMatch[6].replace('%', ''),
          price: noUnitMatch[4],
          total: noUnitMatch[7]
        });
        continue;
      }
      
      // Multi-line product parsing would go here if needed
    }
    
    return products;
  }
  
  extractDiscount(line) {
    const match = line.match(/(\d+)\s*%/);
    return match ? match[1] : '0';
  }
}

class TotalsParser extends BaseParser {
  parse(text, products) {
    const totals = {
      totalQuantity: '0',
      totalAmount: '0',
      grandTotal: '0',
      ivaAmount: '0',
      ivaRate: PARSER_CONFIG.DEFAULTS.IVA_RATE.toString()
    };
    
    // Extract from PDF
    const qtyMatch = text.match(PARSER_CONFIG.PATTERNS.TOTAL_QTY);
    if (qtyMatch) totals.totalQuantity = qtyMatch[1];
    
    const amountMatch = text.match(PARSER_CONFIG.PATTERNS.TOTAL_AMOUNT);
    if (amountMatch) totals.totalAmount = amountMatch[1];
    
    const grandMatch = text.match(PARSER_CONFIG.PATTERNS.GRAND_TOTAL);
    if (grandMatch) totals.grandTotal = grandMatch[1];
    
    const ivaMatch = text.match(PARSER_CONFIG.PATTERNS.IVA_AMOUNT);
    if (ivaMatch) totals.ivaAmount = ivaMatch[1];
    
    const rateMatch = text.match(PARSER_CONFIG.PATTERNS.IVA_RATE);
    if (rateMatch) totals.ivaRate = rateMatch[1];
    
    // Calculate from products if needed
    if (products.length > 0 && totals.totalAmount === '0') {
      const calculated = this.calculateFromProducts(products);
      Object.assign(totals, calculated);
    }
    
    return totals;
  }
  
  calculateFromProducts(products) {
    let totalAmount = 0;
    let totalQuantity = 0;
    
    products.forEach(product => {
      const total = parseFloat((product.total || '0').replace(',', '.'));
      const quantity = parseFloat((product.quantity || '0').replace(',', '.'));
      totalAmount += total;
      totalQuantity += quantity;
    });
    
    const ivaAmount = totalAmount * 0.22;
    const grandTotal = totalAmount + ivaAmount;
    
    return {
      totalAmount: totalAmount.toFixed(2).replace('.', ','),
      totalQuantity: totalQuantity.toFixed(2).replace('.', ','),
      ivaAmount: ivaAmount.toFixed(2).replace('.', ','),
      grandTotal: grandTotal.toFixed(2).replace('.', ',')
    };
  }
}

// ==================== MAIN PARSER FACADE ====================

class OrdiniParserClean {
  constructor() {
    this.orderParser = new OrderInfoParser();
    this.clientParser = new ClientParser();
    this.addressParser = new AddressParser();
    this.dateParser = new DeliveryDateParser();
    this.productParser = new ProductParser();
    this.totalsParser = new TotalsParser();
  }
  
  parseOrderFromText(text, fileName) {
    try {
      if (PARSER_CONFIG.DEBUG) {
        console.log('📄 Parsing:', fileName);
      }
      
      // Initialize order object
      const order = {
        id: this.generateUniqueId(),
        fileName: fileName,
        orderNumber: '',
        clientName: '',
        orderDate: '',
        deliveryDate: '',
        deliveryAddress: '',
        vatNumber: '',
        products: [],
        totalAmount: '0',
        totalQuantity: '0',
        grandTotal: '0'
      };
      
      // Parse order info
      const orderInfo = this.orderParser.parse(text);
      Object.assign(order, orderInfo);
      
      // Parse client
      order.clientName = this.clientParser.parse(text);
      
      // Parse address
      order.deliveryAddress = this.addressParser.parse(text);
      
      // Parse delivery date
      order.deliveryDate = this.dateParser.parse(text, order.orderDate);
      
      // Parse products
      order.products = this.productParser.parse(text);
      
      // Parse totals
      const totals = this.totalsParser.parse(text, order.products);
      Object.assign(order, totals);
      
      if (PARSER_CONFIG.DEBUG) {
        console.log('✅ Parsed order:', {
          number: order.orderNumber,
          client: order.clientName,
          products: order.products.length,
          total: order.grandTotal
        });
      }
      
      return order;
      
    } catch (error) {
      console.error('❌ Parse error:', error);
      return null;
    }
  }
  
  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  parsePrice(price) {
    if (!price) return 0;
    return parseFloat(price.toString().replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
  }
}

// ==================== SINGLETON EXPORT ====================

const OrdiniParser = new OrdiniParserClean();

// Export with compatibility
window.OrdiniParserClean = OrdiniParserClean;
window.OrdiniParser = OrdiniParser;

console.log('📄 OrdiniParser Clean ready!');