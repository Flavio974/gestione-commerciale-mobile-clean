/**
 * Utility semplici per DDT-FT - Fase 1 Refactoring Sicuro
 * Solo funzioni non critiche per testare il processo
 */

// Funzione per generare ID univoci
function generateUniqueId() {
    return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Funzione per validare codice fiscale/P.IVA (solo formato)
function isValidVatNumber(vat) {
    if (!vat) return false;
    // P.IVA italiana = 11 cifre
    return /^\d{11}$/.test(vat.toString().trim());
}

// Funzione per formattare CAP
function formatCAP(cap) {
    if (!cap) return '';
    // Estrai solo numeri
    const digits = cap.toString().replace(/\D/g, '');
    // CAP italiano = 5 cifre
    return digits.length === 5 ? digits : '';
}

// Funzione per verificare se stringa contiene solo spazi
function isEmptyOrWhitespace(str) {
    return !str || str.trim().length === 0;
}

// Funzione per capitalizzare prima lettera
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Esponi le funzioni
window.DDTFTSimpleUtils = {
    generateUniqueId,
    isValidVatNumber,
    formatCAP,
    isEmptyOrWhitespace,
    capitalizeFirst
};

console.log('DDTFTSimpleUtils caricato');