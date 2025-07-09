/**
 * Utilities di parsing avanzate per DDT-FT
 * Funzioni per parsing di date, numeri, indirizzi e validazioni
 */

window.DDTFTParsingUtils = (function() {
    'use strict';
    
    /**
     * Parsing e normalizzazione date - FIXED per formato italiano
     */
    function parseItalianDate(dateStr) {
        if (!dateStr) return null;
        
        // Usa parser robusto se disponibile
        if (window.ItalianDateParser) {
            const result = window.ItalianDateParser.toItalianString(dateStr);
            if (result) return result;
        }
        
        // Fallback: parsing manuale
        let normalized = dateStr.replace(/[\-\.]/g, '/');
        
        // Gestisci date con anno a 2 cifre
        const parts = normalized.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            let year = parseInt(parts[2], 10);
            
            // Validazione
            if (day < 1 || day > 31 || month < 1 || month > 12) {
                console.warn('⚠️ Data non valida:', dateStr);
                return null;
            }
            
            // Converti anno a 2 cifre
            if (year < 100) {
                const currentYear = new Date().getFullYear();
                const century = Math.floor(currentYear / 100) * 100;
                
                // Se l'anno è > 50, assumiamo secolo precedente
                if (year > 50) {
                    year = (century - 100) + year;
                } else {
                    year = century + year;
                }
            }
            
            // Formatta con zero padding
            const dayStr = String(day).padStart(2, '0');
            const monthStr = String(month).padStart(2, '0');
            
            return `${dayStr}/${monthStr}/${year}`;
        }
        
        return normalized;
    }
    
    /**
     * Converte data con nome mese italiano in formato DD/MM/YYYY
     */
    function parseItalianMonthDate(day, monthName, year) {
        const monthMap = {
            'gennaio': '01', 'febbraio': '02', 'marzo': '03',
            'aprile': '04', 'maggio': '05', 'giugno': '06',
            'luglio': '07', 'agosto': '08', 'settembre': '09',
            'ottobre': '10', 'novembre': '11', 'dicembre': '12'
        };
        
        const month = monthMap[monthName.toLowerCase()];
        if (!month) return null;
        
        return `${day.padStart(2, '0')}/${month}/${year}`;
    }
    
    /**
     * Valida che una data sia recente (ultimi 5 anni)
     */
    function isRecentDate(dateStr) {
        if (!dateStr) return false;
        
        const parts = dateStr.split('/');
        if (parts.length !== 3) return false;
        
        const year = parseInt(parts[2]);
        const currentYear = new Date().getFullYear();
        
        return year >= (currentYear - 5) && year <= (currentYear + 1);
    }
    
    /**
     * Parsing numeri con formato italiano (virgola come decimale)
     */
    function parseItalianNumber(value) {
        if (!value || value === '' || value === null || value === undefined) {
            return 0;
        }
        
        if (typeof value === 'number') {
            return value;
        }
        
        // Rimuovi spazi e punti (separatori migliaia)
        let cleanValue = value.toString()
            .replace(/\s/g, '')
            .replace(/\./g, '');
            
        // Sostituisci virgola con punto
        cleanValue = cleanValue.replace(',', '.');
        
        // Rimuovi caratteri non numerici (eccetto punto e meno)
        cleanValue = cleanValue.replace(/[^\d.-]/g, '');
        
        const num = parseFloat(cleanValue);
        return isNaN(num) ? 0 : num;
    }
    
    /**
     * Formatta numero in formato italiano
     */
    function formatItalianNumber(num, decimals = 2) {
        if (typeof num !== 'number') {
            num = parseItalianNumber(num);
        }
        
        return num.toFixed(decimals).replace('.', ',');
    }
    
    /**
     * Estrae CAP da una stringa
     */
    function extractCAP(text) {
        if (!text) return null;
        
        // Pattern per CAP italiano (5 cifre)
        const match = text.match(/\b(\d{5})\b/);
        return match ? match[1] : null;
    }
    
    /**
     * Valida CAP italiano
     */
    function isValidCAP(cap) {
        if (!cap) return false;
        
        // Deve essere esattamente 5 cifre
        if (!/^\d{5}$/.test(cap)) return false;
        
        // Primo digit non può essere 0
        if (cap[0] === '0') return false;
        
        // Range validi per CAP italiani
        const capNum = parseInt(cap);
        return capNum >= 10000 && capNum <= 98999;
    }
    
    /**
     * Estrae provincia da una stringa (2 lettere maiuscole)
     */
    function extractProvincia(text) {
        if (!text) return null;
        
        // Pattern per provincia (2 lettere maiuscole isolate)
        const match = text.match(/\b([A-Z]{2})\b/);
        return match ? match[1] : null;
    }
    
    /**
     * Valida codice provincia
     */
    function isValidProvincia(prov) {
        if (!prov) return false;
        
        // Lista province italiane valide
        const validProvince = [
            'AG', 'AL', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AT', 'AV',
            'BA', 'BG', 'BI', 'BL', 'BN', 'BO', 'BR', 'BS', 'BT', 'BZ',
            'CA', 'CB', 'CE', 'CH', 'CL', 'CN', 'CO', 'CR', 'CS', 'CT', 'CZ',
            'EN', 'FC', 'FE', 'FG', 'FI', 'FM', 'FR', 'GE', 'GO', 'GR',
            'IM', 'IS', 'KR', 'LC', 'LE', 'LI', 'LO', 'LT', 'LU',
            'MB', 'MC', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT',
            'NA', 'NO', 'NU', 'OG', 'OR', 'OT', 'PA', 'PC', 'PD', 'PE', 'PG', 'PI',
            'PN', 'PO', 'PR', 'PT', 'PU', 'PV', 'PZ',
            'RA', 'RC', 'RE', 'RG', 'RI', 'RM', 'RN', 'RO',
            'SA', 'SI', 'SO', 'SP', 'SR', 'SS', 'SU', 'SV',
            'TA', 'TE', 'TN', 'TO', 'TP', 'TR', 'TS', 'TV',
            'UD', 'VA', 'VB', 'VC', 'VE', 'VI', 'VR', 'VS', 'VT', 'VV'
        ];
        
        return validProvince.includes(prov.toUpperCase());
    }
    
    /**
     * Rimuove forme societarie dal nome
     */
    function removeCompanyForms(name) {
        if (!name) return '';
        
        const forms = [
            'S\\.?R\\.?L\\.?', 'S\\.?P\\.?A\\.?', 'S\\.?N\\.?C\\.?', 'S\\.?A\\.?S\\.?',
            'S\\.?S\\.?', 'S\\.?C\\.?', 'S\\.?C\\.?S\\.?',
            'SOCIETA\' COOPERATIVA', 'SOC\\.? COOP\\.?', 'COOP\\.?',
            '& C\\.?', '& FIGLI', 'F\\.LLI', '& F\\.LLI',
            'SARL', 'SA', 'LTD', 'GMBH', 'AG', 'BV', 'NV',
            'DI .+? & C\\.?'
        ];
        
        let cleanName = name;
        forms.forEach(form => {
            const regex = new RegExp(`\\s+${form}(?:\\s|$)`, 'gi');
            cleanName = cleanName.replace(regex, ' ');
        });
        
        return cleanName.trim();
    }
    
    /**
     * Normalizza spazi multipli e trim
     */
    function normalizeSpaces(text) {
        if (!text) return '';
        
        return text
            .replace(/\s+/g, ' ')
            .replace(/\s*,\s*/g, ', ')
            .replace(/\s*\.\s*/g, '. ')
            .trim();
    }
    
    /**
     * Separa prefisso strada dal nome (es: VIAMARCONI -> VIA MARCONI)
     */
    function separateStreetPrefix(streetName) {
        if (!streetName) return '';
        
        const prefixes = ['VIA', 'VIALE', 'CORSO', 'PIAZZA', 'STRADA', 'VICOLO', 'LARGO'];
        
        for (const prefix of prefixes) {
            if (streetName.toUpperCase().startsWith(prefix)) {
                const rest = streetName.substring(prefix.length);
                if (rest && rest[0] !== ' ') {
                    return prefix + ' ' + rest;
                }
            }
        }
        
        return streetName;
    }
    
    /**
     * Valida un indirizzo completo
     */
    function isValidAddress(address) {
        if (!address || address.length < 10) return false;
        
        // Deve contenere almeno una via/corso/piazza
        const hasStreet = /\b(VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA|LOC\.|LOCALITA)/i.test(address);
        
        // Deve contenere un CAP
        const hasCAP = /\b\d{5}\b/.test(address);
        
        // Deve contenere una provincia
        const hasProv = /\b[A-Z]{2}\b/.test(address);
        
        return hasStreet && hasCAP && hasProv;
    }
    
    /**
     * Formatta indirizzo in modo standard
     */
    function formatAddress(street, number, cap, city, province) {
        let parts = [];
        
        if (street) {
            parts.push(normalizeSpaces(street));
            if (number) {
                parts[0] += ', ' + number;
            }
        }
        
        if (cap) parts.push(cap);
        if (city) parts.push(normalizeSpaces(city));
        if (province) parts.push(province.toUpperCase());
        
        return parts.join(' ');
    }
    
    // Esporta tutte le funzioni
    return {
        // Date
        parseItalianDate,
        parseItalianMonthDate,
        isRecentDate,
        
        // Numeri
        parseItalianNumber,
        formatItalianNumber,
        
        // Indirizzi
        extractCAP,
        isValidCAP,
        extractProvincia,
        isValidProvincia,
        separateStreetPrefix,
        isValidAddress,
        formatAddress,
        
        // Testo
        removeCompanyForms,
        normalizeSpaces
    };
})();

console.log('✅ DDTFTParsingUtils caricato con successo');