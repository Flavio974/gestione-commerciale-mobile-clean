/**
 * DDTFT Import Utils Module
 * Contiene funzioni di utilità e validazione
 */

export const DDTFTImportUtils = {
  /**
   * Standardizza nome cliente in forma breve
   */
  standardizeClientName: function(fullName) {
    if (!fullName) return null;
    
    // Mappa nomi completi → nomi brevi
    const NAME_MAPPING = {
      // IL GUSTO
      'IL GUSTO FRUTTA E VERDURA DI SQUILLACIOTI FRANCESCA': 'Il Gusto',
      'IL GUSTO FRUTTA E VERDURA': 'Il Gusto',
      'IL GUSTO FRUTTA & VERDURA': 'Il Gusto',
      
      // Aziende agricole
      'AZ. AGR. LA MANDRIA S.S.': 'La Mandria',
      'AZ. AGR. LA MANDRIA S.S. DI GOIA E BRUNO': 'La Mandria',
      
      // SRL/SPA
      'BARISONE E BALDON SRL': 'Barisone E Baldon',
      'BARISONE E BALDON S.R.L.': 'Barisone E Baldon',
      'BARISONE & BALDON S.R.L.': 'Barisone E Baldon',
      
      // Piemonte Carni
      'PIEMONTE CARNI': 'Piemonte Carni',
      'PIEMONTE CARNI DI CALDERA MASSIMO & C. S.A.S.': 'Piemonte Carni',
      
      // Altri
      'MAROTTA S.R.L.': 'Marotta',
      'BOREALE S.R.L.': 'Boreale'
    };
    
    const upperName = fullName.toUpperCase().trim();
    if (NAME_MAPPING[upperName]) {
      return NAME_MAPPING[upperName];
    }
    
    // Pattern automatici
    if (upperName.includes('IL GUSTO')) return 'Il Gusto';
    if (upperName.includes('PIEMONTE CARNI')) return 'Piemonte Carni';
    
    // "BRAND DI PROPRIETARIO" → "Brand"
    const brandMatch = upperName.match(/^([A-Z\s]+?)\s+DI\s+[A-Z\s]+/i);
    if (brandMatch) {
      const brand = brandMatch[1].trim();
      return brand.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    // Default: Title Case
    return fullName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  /**
   * Verifica se è un indirizzo Alfieri con controlli rigorosi
   */
  isAlfieriAddress: function(address) {
    if (!address) return false;
    
    const alfieriKeywords = [
      'MARCONI',
      'MAGLIANO ALFIERI',
      'MAGLIANO',
      'ALFIERI',
      'C.SO G. MARCONI',
      'CORSO MARCONI',
      'G. MARCONI',
      '12050',
      'CN)',
      '(CN)',
      '10/E'
    ];
    
    const upperAddress = address.toUpperCase();
    return alfieriKeywords.some(keyword => upperAddress.includes(keyword));
  },
  
  /**
   * Valida un indirizzo di consegna
   */
  validateDeliveryAddress: function(address) {
    if (!address) return false;
    
    // ESCLUSIONE RIGOROSA Alfieri
    if (this.isAlfieriAddress(address)) {
      console.log(`❌ RIFIUTATO indirizzo Alfieri: ${address}`);
      return false;
    }
    
    // Deve contenere almeno un tipo di strada
    const hasStreetType = /(?:VIA|V\.LE|VIALE|CORSO|C\.SO|P\.ZA|PIAZZA|STRADA|STR\.)/i.test(address);
    
    // Deve avere un numero civico (più flessibile)
    const hasNumber = /\d+[A-Z]?\s*(?:\/|$|\s|\d{5})/i.test(address);
    
    // Deve avere CAP o essere un indirizzo riconosciuto
    const hasCap = /\d{5}/.test(address);
    
    if (!hasStreetType) {
      console.log(`❌ RIFIUTATO tipo strada mancante: ${address}`);
      return false;
    }
    
    if (!hasNumber && !hasCap) {
      console.log(`❌ RIFIUTATO numero civico e CAP mancanti: ${address}`);
      return false;
    }
    
    console.log(`✅ VALIDATO indirizzo consegna: ${address}`);
    return hasStreetType && (hasNumber || hasCap);
  },

  /**
   * Genera ID univoco per documenti
   */
  generateId: function() {
    return 'ddtft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
};