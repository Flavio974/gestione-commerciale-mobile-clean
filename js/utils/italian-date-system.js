/**
 * Sistema completo per la gestione delle date in formato italiano
 * Progettato per applicazioni professionali italiane con gestione robusta delle date
 * 
 * Caratteristiche principali:
 * - Input/output sempre in formato italiano dd/mm/yyyy
 * - Storage interno in formato ISO 8601
 * - Validazione completa con gestione errori
 * - Supporto festività italiane
 * - Calcoli avanzati su date lavorative
 * - Formattazione intelligente e localizzata
 */

// ✅ TEMPORAL POLYFILL GUARD
if (typeof Temporal === 'undefined') {
    console.warn('[italian-date-system] Polyfill Temporal mancante – script uscita sicura');
    throw new Error('Temporal polyfill required');
}

// ==========================================
// COSTANTI E CONFIGURAZIONI
// ==========================================

// Nomi dei mesi in italiano
const MESI_ITALIANI = [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
];

// Nomi dei giorni della settimana in italiano
const GIORNI_ITALIANI = [
    'domenica', 'lunedì', 'martedì', 'mercoledì', 
    'giovedì', 'venerdì', 'sabato'
];

// Festività italiane fisse (giorno, mese)
const FESTIVITA_FISSE = [
    { giorno: 1, mese: 1, nome: 'Capodanno' },
    { giorno: 6, mese: 1, nome: 'Epifania' },
    { giorno: 25, mese: 4, nome: 'Festa della Liberazione' },
    { giorno: 1, mese: 5, nome: 'Festa del Lavoro' },
    { giorno: 2, mese: 6, nome: 'Festa della Repubblica' },
    { giorno: 15, mese: 8, nome: 'Ferragosto' },
    { giorno: 1, mese: 11, nome: 'Ognissanti' },
    { giorno: 8, mese: 12, nome: 'Immacolata Concezione' },
    { giorno: 25, mese: 12, nome: 'Natale' },
    { giorno: 26, mese: 12, nome: 'Santo Stefano' }
];

// ==========================================
// FUNZIONI DI VALIDAZIONE
// ==========================================

/**
 * Valida una stringa di data in formato italiano dd/mm/yyyy
 * @param {string} dateString - La stringa da validare
 * @returns {boolean} - true se la data è valida
 */
function isValidItalianDate(dateString) {
    // Controlla il formato base
    if (!dateString || typeof dateString !== 'string') {
        return false;
    }

    // Verifica il pattern dd/mm/yyyy
    const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dateString.match(regex);
    
    if (!match) {
        return false;
    }

    const giorno = parseInt(match[1], 10);
    const mese = parseInt(match[2], 10);
    const anno = parseInt(match[3], 10);

    // Verifica i range base
    if (mese < 1 || mese > 12) {
        return false;
    }

    if (giorno < 1 || giorno > 31) {
        return false;
    }

    // Verifica giorni per mese specifico
    const giorniPerMese = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Controllo anno bisestile
    if (isAnnoBisestile(anno)) {
        giorniPerMese[1] = 29;
    }

    if (giorno > giorniPerMese[mese - 1]) {
        return false;
    }

    // Verifica che la data sia parsabile
    const data = new Date(anno, mese - 1, giorno);
    return data.getFullYear() === anno && 
           data.getMonth() === mese - 1 && 
           data.getDate() === giorno;
}

/**
 * Controlla se un anno è bisestile
 * @param {number} anno - L'anno da verificare
 * @returns {boolean} - true se l'anno è bisestile
 */
function isAnnoBisestile(anno) {
    return (anno % 4 === 0 && anno % 100 !== 0) || (anno % 400 === 0);
}

// ==========================================
// FUNZIONI DI CONVERSIONE
// ==========================================

/**
 * Converte una data dal formato italiano dd/mm/yyyy al formato ISO yyyy-mm-dd
 * @param {string} dateString - Data in formato italiano
 * @returns {string|null} - Data in formato ISO o null se invalida
 */
function italianToISO(dateString) {
    if (!isValidItalianDate(dateString)) {
        console.error(`Data italiana non valida: ${dateString}`);
        return null;
    }

    const [giorno, mese, anno] = dateString.split('/');
    return `${anno}-${mese.padStart(2, '0')}-${giorno.padStart(2, '0')}`;
}

/**
 * Converte una data dal formato ISO al formato italiano dd/mm/yyyy
 * @param {string} isoDate - Data in formato ISO
 * @returns {string|null} - Data in formato italiano o null se invalida
 */
function ISOToItalian(isoDate) {
    if (!isoDate || typeof isoDate !== 'string') {
        return null;
    }

    // Supporta sia formato completo che solo data
    const dateOnly = isoDate.split('T')[0];
    const regex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateOnly.match(regex);

    if (!match) {
        console.error(`Data ISO non valida: ${isoDate}`);
        return null;
    }

    const [_, anno, mese, giorno] = match;
    return `${giorno}/${mese}/${anno}`;
}

/**
 * Crea un oggetto Date sicuro da una stringa italiana
 * @param {string} dateString - Data in formato italiano dd/mm/yyyy
 * @returns {Date|null} - Oggetto Date o null se invalida
 */
function parseItalianDate(dateString) {
    if (!isValidItalianDate(dateString)) {
        return null;
    }

    const [giorno, mese, anno] = dateString.split('/').map(n => parseInt(n, 10));
    // Crea la data alle 12:00 per evitare problemi di timezone
    return new Date(anno, mese - 1, giorno, 12, 0, 0);
}

// ==========================================
// FUNZIONI DI FORMATTAZIONE
// ==========================================

/**
 * Formatta una data usando Intl.DateTimeFormat con opzioni italiane
 * @param {Date|string} date - Data da formattare
 * @param {Object} options - Opzioni di formattazione
 * @returns {string} - Data formattata
 */
function formatDateItalian(date, options = {}) {
    let dateObj;
    
    if (typeof date === 'string') {
        // Se è una stringa italiana, parsala
        if (date.includes('/')) {
            dateObj = parseItalianDate(date);
        } else {
            // Assume formato ISO
            dateObj = new Date(date);
        }
    } else if (date instanceof Date) {
        dateObj = date;
    } else {
        return '';
    }

    if (!dateObj || isNaN(dateObj)) {
        return '';
    }

    const defaultOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...options
    };

    return new Intl.DateTimeFormat('it-IT', defaultOptions).format(dateObj);
}

/**
 * Formatta una data in modo relativo (oggi, ieri, domani, etc.)
 * @param {Date|string} date - Data da formattare
 * @returns {string} - Descrizione relativa della data
 */
function formatRelativeDate(date) {
    const dateObj = date instanceof Date ? date : parseItalianDate(date);
    if (!dateObj) return '';

    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);

    const diffTime = dateObj - oggi;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Domani';
    if (diffDays === -1) return 'Ieri';
    if (diffDays > 1 && diffDays <= 7) return `Tra ${diffDays} giorni`;
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} giorni fa`;
    if (diffDays > 7 && diffDays <= 14) return 'La prossima settimana';
    if (diffDays < -7 && diffDays >= -14) return 'La settimana scorsa';
    if (diffDays > 14 && diffDays <= 30) return 'Questo mese';
    if (diffDays < -14 && diffDays >= -30) return 'Il mese scorso';

    // Per date più lontane, usa il formato esteso
    return formatDateItalian(dateObj, {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Formatta una data per documenti ufficiali
 * @param {Date|string} date - Data da formattare
 * @returns {string} - Data in formato esteso (es. "12 luglio 2025")
 */
function formatDateForDocument(date) {
    return formatDateItalian(date, {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// ==========================================
// FUNZIONI DI CALCOLO
// ==========================================

/**
 * Calcola la differenza in giorni tra due date
 * @param {Date|string} date1 - Prima data
 * @param {Date|string} date2 - Seconda data
 * @returns {number} - Numero di giorni di differenza
 */
function daysBetweenDates(date1, date2) {
    const d1 = date1 instanceof Date ? date1 : parseItalianDate(date1);
    const d2 = date2 instanceof Date ? date2 : parseItalianDate(date2);
    
    if (!d1 || !d2) return NaN;

    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Aggiunge o sottrae giorni a una data
 * @param {Date|string} date - Data di partenza
 * @param {number} days - Giorni da aggiungere (negativi per sottrarre)
 * @returns {Date} - Nuova data
 */
function addDays(date, days) {
    const result = date instanceof Date ? new Date(date) : parseItalianDate(date);
    if (!result) return null;
    
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Calcola l'età da una data di nascita
 * @param {Date|string} birthDate - Data di nascita
 * @returns {number} - Età in anni
 */
function calculateAge(birthDate) {
    const birth = birthDate instanceof Date ? birthDate : parseItalianDate(birthDate);
    if (!birth) return NaN;

    const oggi = new Date();
    let eta = oggi.getFullYear() - birth.getFullYear();
    const meseDiff = oggi.getMonth() - birth.getMonth();
    
    if (meseDiff < 0 || (meseDiff === 0 && oggi.getDate() < birth.getDate())) {
        eta--;
    }
    
    return eta;
}

/**
 * Verifica se una data cade nel weekend
 * @param {Date|string} date - Data da verificare
 * @returns {boolean} - true se è sabato o domenica
 */
function isWeekend(date) {
    const d = date instanceof Date ? date : parseItalianDate(date);
    if (!d) return false;
    
    const giorno = d.getDay();
    return giorno === 0 || giorno === 6;
}

/**
 * Ottiene il primo giorno del mese di una data
 * @param {Date|string} date - Data di riferimento
 * @returns {Date} - Primo giorno del mese
 */
function getFirstDayOfMonth(date) {
    const d = date instanceof Date ? new Date(date) : parseItalianDate(date);
    if (!d) return null;
    
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Ottiene l'ultimo giorno del mese di una data
 * @param {Date|string} date - Data di riferimento
 * @returns {Date} - Ultimo giorno del mese
 */
function getLastDayOfMonth(date) {
    const d = date instanceof Date ? new Date(date) : parseItalianDate(date);
    if (!d) return null;
    
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

// ==========================================
// FUNZIONI PER FESTIVITÀ E GIORNI LAVORATIVI
// ==========================================

/**
 * Calcola la data della Pasqua per un anno specifico
 * @param {number} year - Anno
 * @returns {Date} - Data della Pasqua
 */
function getEasterDate(year) {
    // Algoritmo di Gauss per il calcolo della Pasqua
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    return new Date(year, month - 1, day);
}

/**
 * Verifica se una data è una festività italiana
 * @param {Date|string} date - Data da verificare
 * @returns {boolean} - true se è festività
 */
function isFestivita(date) {
    const d = date instanceof Date ? date : parseItalianDate(date);
    if (!d) return false;

    const giorno = d.getDate();
    const mese = d.getMonth() + 1;
    const anno = d.getFullYear();

    // Controlla festività fisse
    for (const festa of FESTIVITA_FISSE) {
        if (festa.giorno === giorno && festa.mese === mese) {
            return true;
        }
    }

    // Controlla Pasqua e Pasquetta
    const pasqua = getEasterDate(anno);
    const pasquetta = new Date(pasqua);
    pasquetta.setDate(pasquetta.getDate() + 1);

    if (d.toDateString() === pasqua.toDateString() || 
        d.toDateString() === pasquetta.toDateString()) {
        return true;
    }

    return false;
}

/**
 * Ottiene il nome della festività per una data
 * @param {Date|string} date - Data da verificare
 * @returns {string|null} - Nome della festività o null
 */
function getNomeFestivita(date) {
    const d = date instanceof Date ? date : parseItalianDate(date);
    if (!d) return null;

    const giorno = d.getDate();
    const mese = d.getMonth() + 1;
    const anno = d.getFullYear();

    // Controlla festività fisse
    for (const festa of FESTIVITA_FISSE) {
        if (festa.giorno === giorno && festa.mese === mese) {
            return festa.nome;
        }
    }

    // Controlla Pasqua e Pasquetta
    const pasqua = getEasterDate(anno);
    const pasquetta = new Date(pasqua);
    pasquetta.setDate(pasquetta.getDate() + 1);

    if (d.toDateString() === pasqua.toDateString()) {
        return 'Pasqua';
    }
    if (d.toDateString() === pasquetta.toDateString()) {
        return 'Lunedì dell\'Angelo';
    }

    return null;
}

/**
 * Verifica se una data è un giorno lavorativo
 * @param {Date|string} date - Data da verificare
 * @returns {boolean} - true se è giorno lavorativo
 */
function isGiornoLavorativo(date) {
    return !isWeekend(date) && !isFestivita(date);
}

/**
 * Calcola i giorni lavorativi tra due date
 * @param {Date|string} startDate - Data iniziale
 * @param {Date|string} endDate - Data finale
 * @returns {number} - Numero di giorni lavorativi
 */
function calcolaGiorniLavorativi(startDate, endDate) {
    const start = startDate instanceof Date ? new Date(startDate) : parseItalianDate(startDate);
    const end = endDate instanceof Date ? new Date(endDate) : parseItalianDate(endDate);
    
    if (!start || !end) return 0;

    let count = 0;
    const current = new Date(start);
    
    while (current <= end) {
        if (isGiornoLavorativo(current)) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    
    return count;
}

/**
 * Trova il prossimo giorno lavorativo da una data
 * @param {Date|string} date - Data di partenza
 * @returns {Date} - Prossimo giorno lavorativo
 */
function getProssimoGiornoLavorativo(date) {
    const d = date instanceof Date ? new Date(date) : parseItalianDate(date);
    if (!d) return null;

    const result = new Date(d);
    result.setDate(result.getDate() + 1);
    
    while (!isGiornoLavorativo(result)) {
        result.setDate(result.getDate() + 1);
    }
    
    return result;
}

/**
 * Calcola una scadenza aggiungendo giorni lavorativi
 * @param {Date|string} startDate - Data di partenza
 * @param {number} workDays - Giorni lavorativi da aggiungere
 * @returns {Date} - Data di scadenza
 */
function calcolaScadenza(startDate, workDays) {
    const start = startDate instanceof Date ? new Date(startDate) : parseItalianDate(startDate);
    if (!start || workDays <= 0) return null;

    const result = new Date(start);
    let daysAdded = 0;
    
    while (daysAdded < workDays) {
        result.setDate(result.getDate() + 1);
        if (isGiornoLavorativo(result)) {
            daysAdded++;
        }
    }
    
    return result;
}

// ==========================================
// FUNZIONI DI VALIDAZIONE SPECIFICHE
// ==========================================

/**
 * Valida una data di nascita
 * @param {string} birthDateString - Data di nascita in formato italiano
 * @returns {Object} - { valid: boolean, error: string }
 */
function validateDataNascita(birthDateString) {
    if (!isValidItalianDate(birthDateString)) {
        return { valid: false, error: 'Formato data non valido. Usa dd/mm/yyyy' };
    }

    const birthDate = parseItalianDate(birthDateString);
    const oggi = new Date();
    const eta = calculateAge(birthDate);

    if (birthDate > oggi) {
        return { valid: false, error: 'La data di nascita non può essere nel futuro' };
    }

    if (eta > 120) {
        return { valid: false, error: 'La data di nascita non può essere più di 120 anni fa' };
    }

    if (eta < 0) {
        return { valid: false, error: 'Data di nascita non valida' };
    }

    return { valid: true, error: null };
}

/**
 * Valida una data di scadenza
 * @param {string} expiryDateString - Data di scadenza in formato italiano
 * @returns {Object} - { valid: boolean, error: string }
 */
function validateDataScadenza(expiryDateString) {
    if (!isValidItalianDate(expiryDateString)) {
        return { valid: false, error: 'Formato data non valido. Usa dd/mm/yyyy' };
    }

    const expiryDate = parseItalianDate(expiryDateString);
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    if (expiryDate < oggi) {
        return { valid: false, error: 'La data di scadenza deve essere futura' };
    }

    return { valid: true, error: null };
}

/**
 * Valida un range di date
 * @param {string} startDateString - Data iniziale in formato italiano
 * @param {string} endDateString - Data finale in formato italiano
 * @returns {Object} - { valid: boolean, error: string }
 */
function validateDateRange(startDateString, endDateString) {
    if (!isValidItalianDate(startDateString)) {
        return { valid: false, error: 'Data iniziale non valida. Usa dd/mm/yyyy' };
    }

    if (!isValidItalianDate(endDateString)) {
        return { valid: false, error: 'Data finale non valida. Usa dd/mm/yyyy' };
    }

    const startDate = parseItalianDate(startDateString);
    const endDate = parseItalianDate(endDateString);

    if (startDate > endDate) {
        return { valid: false, error: 'La data finale deve essere successiva alla data iniziale' };
    }

    return { valid: true, error: null };
}

// ==========================================
// FUNZIONI PER STORAGE E PERSISTENZA
// ==========================================

/**
 * Salva una data nel localStorage in formato ISO
 * @param {string} key - Chiave di storage
 * @param {Date|string} date - Data da salvare
 */
function saveDateToStorage(key, date) {
    let dateToSave;
    
    if (typeof date === 'string' && date.includes('/')) {
        dateToSave = italianToISO(date);
    } else if (date instanceof Date) {
        dateToSave = date.toISOString().split('T')[0];
    } else {
        dateToSave = date;
    }

    if (dateToSave) {
        localStorage.setItem(key, dateToSave);
    }
}

/**
 * Carica una data dal localStorage e la converte in formato italiano
 * @param {string} key - Chiave di storage
 * @returns {string|null} - Data in formato italiano o null
 */
function loadDateFromStorage(key) {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    // Se è già in formato italiano, restituiscila
    if (stored.includes('/')) {
        return stored;
    }

    // Altrimenti converti da ISO
    return ISOToItalian(stored);
}

/**
 * Migra date salvate in formati non standard
 * @param {string} key - Chiave di storage
 * @returns {boolean} - true se la migrazione è riuscita
 */
function migrateDateInStorage(key) {
    const stored = localStorage.getItem(key);
    if (!stored) return false;

    try {
        let isoDate;
        
        // Prova diversi formati
        if (stored.includes('/')) {
            // Formato italiano
            isoDate = italianToISO(stored);
        } else if (stored.includes('-')) {
            // Probabilmente già ISO
            isoDate = stored.split('T')[0];
        } else {
            // Prova a parsare come timestamp
            const timestamp = parseInt(stored, 10);
            if (!isNaN(timestamp)) {
                const date = new Date(timestamp);
                isoDate = date.toISOString().split('T')[0];
            }
        }

        if (isoDate) {
            localStorage.setItem(key, isoDate);
            return true;
        }
    } catch (error) {
        console.error(`Errore nella migrazione della data ${key}:`, error);
    }

    return false;
}

// ==========================================
// ESPORTAZIONE DEL MODULO
// ==========================================

// Se siamo in ambiente module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Validazione
        isValidItalianDate,
        isAnnoBisestile,
        
        // Conversione
        italianToISO,
        ISOToItalian,
        parseItalianDate,
        
        // Formattazione
        formatDateItalian,
        formatRelativeDate,
        formatDateForDocument,
        
        // Calcoli
        daysBetweenDates,
        addDays,
        calculateAge,
        isWeekend,
        getFirstDayOfMonth,
        getLastDayOfMonth,
        
        // Festività e giorni lavorativi
        getEasterDate,
        isFestivita,
        getNomeFestivita,
        isGiornoLavorativo,
        calcolaGiorniLavorativi,
        getProssimoGiornoLavorativo,
        calcolaScadenza,
        
        // Validazioni specifiche
        validateDataNascita,
        validateDataScadenza,
        validateDateRange,
        
        // Storage
        saveDateToStorage,
        loadDateFromStorage,
        migrateDateInStorage,
        
        // Costanti
        MESI_ITALIANI,
        GIORNI_ITALIANI,
        FESTIVITA_FISSE
    };
}

// Esportazione globale per uso in browser
if (typeof window !== 'undefined') {
    window.ItalianDateSystem = {
        // Validazione
        isValidItalianDate,
        isAnnoBisestile,
        
        // Conversione
        italianToISO,
        ISOToItalian,
        parseItalianDate,
        
        // Formattazione
        formatDateItalian,
        formatRelativeDate,
        formatDateForDocument,
        
        // Calcoli
        daysBetweenDates,
        addDays,
        calculateAge,
        isWeekend,
        getFirstDayOfMonth,
        getLastDayOfMonth,
        
        // Festività e giorni lavorativi
        getEasterDate,
        isFestivita,
        getNomeFestivita,
        isGiornoLavorativo,
        calcolaGiorniLavorativi,
        getProssimoGiornoLavorativo,
        calcolaScadenza,
        
        // Validazioni specifiche
        validateDataNascita,
        validateDataScadenza,
        validateDateRange,
        
        // Storage
        saveDateToStorage,
        loadDateFromStorage,
        migrateDateInStorage,
        
        // Costanti
        MESI_ITALIANI,
        GIORNI_ITALIANI,
        FESTIVITA_FISSE
    };
}