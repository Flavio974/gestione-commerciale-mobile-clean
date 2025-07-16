/**
 * ITALIAN DATE MANAGER - GESTIONE CENTRALIZZATA DATE IN FORMATO ITALIANO
 * Risolve definitivamente il problema MM/DD vs DD/MM
 * 
 * FORZA il formato italiano DD/MM/YYYY in tutto il sistema
 * Timezone: Europe/Rome
 * Locale: it-IT
 */

class ItalianDateManager {
    constructor() {
        // CONFIGURAZIONE FORZATA ITALIANA
        this.locale = 'it-IT';
        this.timezone = 'Europe/Rome';
        this.dateFormat = 'DD/MM/YYYY';
        this.timeFormat = 'HH:mm';
        this.firstDayOfWeek = 1; // Lunedì
        
        console.log('🇮🇹 ItalianDateManager inizializzato - Locale forzato:', this.locale);
        this.debugDateFormats();
    }
    
    /**
     * PARSING SICURO di date in formato italiano DD/MM/YYYY
     * Assicura che "11/07/2025" = 11 luglio 2025 (NON 7 novembre)
     */
    parseItalianDate(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            console.error('❌ parseItalianDate: Input non valido:', dateString);
            return null;
        }
        
        // Pattern per DD/MM/YYYY
        const pattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const match = dateString.trim().match(pattern);
        
        if (!match) {
            console.error('❌ parseItalianDate: Formato non riconosciuto:', dateString);
            return null;
        }
        
        const [, giornoStr, meseStr, annoStr] = match;
        const giorno = parseInt(giornoStr, 10);
        const mese = parseInt(meseStr, 10);
        const anno = parseInt(annoStr, 10);
        
        // Validazione range
        if (giorno < 1 || giorno > 31 || mese < 1 || mese > 12 || anno < 1900 || anno > 2100) {
            console.error('❌ parseItalianDate: Valori fuori range:', {giorno, mese, anno});
            return null;
        }
        
        // CREA DATA CON FORMATO ITALIANO ESPLICITO
        // JavaScript conta i mesi da 0, quindi mese - 1
        const data = new Date(anno, mese - 1, giorno, 0, 0, 0, 0);
        
        console.log(`✅ parseItalianDate: "${dateString}" → ${giorno} ${this.getMonthName(mese)} ${anno}`, data);
        return data;
    }
    
    /**
     * OTTIENI la data corrente nel timezone italiano
     */
    getCurrentDate() {
        // Usa il timezone italiano
        const now = new Date();
        
        // Forza il timezone italiano se supportato
        try {
            // Metodo più accurato per ottenere l'orario italiano
            const italianTimeString = now.toLocaleString("it-IT", {timeZone: this.timezone});
            console.log('🇮🇹 getCurrentDate: String italiano:', italianTimeString);
            
            // Parsing più robusto della stringa italiana
            const italianTime = this.parseItalianDateTime(italianTimeString);
            
            if (italianTime && !isNaN(italianTime.getTime())) {
                console.log('🇮🇹 getCurrentDate: Data corrente (timezone italiano):', this.formatDate(italianTime));
                console.log('🇮🇹 getCurrentDate: Orario italiano:', italianTime.toLocaleTimeString('it-IT'));
                return italianTime;
            } else {
                throw new Error('Parsing failed');
            }
        } catch (error) {
            console.warn('⚠️ Timezone non supportato, uso data locale:', error);
            return now;
        }
    }
    
    /**
     * PARSING robusto di data/ora italiana da stringa locale
     */
    parseItalianDateTime(dateTimeString) {
        try {
            // Formato tipico: "16/7/2025, 12:34:56"
            const [datePart, timePart] = dateTimeString.split(', ');
            
            if (datePart) {
                // Parsing della data
                const [day, month, year] = datePart.split('/').map(num => parseInt(num, 10));
                
                // Parsing del tempo (se presente)
                let hour = 0, minute = 0, second = 0;
                if (timePart) {
                    const [h, m, s] = timePart.split(':').map(num => parseInt(num, 10));
                    hour = h || 0;
                    minute = m || 0;
                    second = s || 0;
                }
                
                // Crea la data
                const date = new Date(year, month - 1, day, hour, minute, second);
                
                console.log('🇮🇹 parseItalianDateTime:', {
                    input: dateTimeString,
                    parsed: { day, month, year, hour, minute, second },
                    result: date
                });
                
                return date;
            }
            
            return null;
        } catch (error) {
            console.error('❌ parseItalianDateTime error:', error);
            return null;
        }
    }
    
    /**
     * OTTIENI l'orario corrente nel timezone italiano
     */
    getCurrentTime() {
        const now = new Date();
        
        try {
            // Crea un oggetto Date con l'orario del timezone italiano
            const italianTime = new Date(now.toLocaleString("it-IT", {timeZone: this.timezone}));
            
            // Formatta l'orario in formato italiano
            const orario = italianTime.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            
            console.log('🕐 getCurrentTime: Orario italiano:', orario);
            return orario;
        } catch (error) {
            console.warn('⚠️ Timezone non supportato per orario, uso orario locale:', error);
            return now.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        }
    }

    /**
     * FORMATTA una data nel formato italiano DD/MM/YYYY
     */
    formatDate(date, format = 'DD/MM/YYYY') {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            console.error('❌ formatDate: Data non valida:', date);
            return 'Data non valida';
        }
        
        const giorno = date.getDate().toString().padStart(2, '0');
        const mese = (date.getMonth() + 1).toString().padStart(2, '0');
        const anno = date.getFullYear();
        const ore = date.getHours().toString().padStart(2, '0');
        const minuti = date.getMinutes().toString().padStart(2, '0');
        
        switch (format.toUpperCase()) {
            case 'DD/MM/YYYY':
                return `${giorno}/${mese}/${anno}`;
            case 'DD/MM/YY':
                return `${giorno}/${mese}/${anno.toString().slice(-2)}`;
            case 'DD-MM-YYYY':
                return `${giorno}-${mese}-${anno}`;
            case 'YYYY-MM-DD': // Formato ISO per database
                return `${anno}-${mese}-${giorno}`;
            case 'DD/MM/YYYY HH:mm':
                return `${giorno}/${mese}/${anno} ${ore}:${minuti}`;
            case 'DD MMMM YYYY':
                return `${giorno} ${this.getMonthName(parseInt(mese))} ${anno}`;
            case 'DDDD, DD MMMM YYYY':
                const nomeGiorno = this.getDayName(date.getDay());
                return `${nomeGiorno}, ${giorno} ${this.getMonthName(parseInt(mese))} ${anno}`;
            default:
                return `${giorno}/${mese}/${anno}`;
        }
    }
    
    /**
     * OTTIENI il nome del mese in italiano
     */
    getMonthName(numeroMese) {
        const mesi = [
            'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
            'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
        ];
        return mesi[numeroMese - 1] || 'mese_non_valido';
    }
    
    /**
     * OTTIENI il nome del giorno in italiano
     */
    getDayName(numeroGiorno) {
        const giorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
        return giorni[numeroGiorno] || 'giorno_non_valido';
    }
    
    /**
     * METODI helper per date relative
     */
    getYesterday() {
        const date = this.getCurrentDate();
        date.setDate(date.getDate() - 1);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    
    getTomorrow() {
        const date = this.getCurrentDate();
        date.setDate(date.getDate() + 1);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    
    /**
     * CALCOLA una data relativa
     */
    getRelativeDate(giorni) {
        const date = this.getCurrentDate();
        date.setDate(date.getDate() + giorni);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    
    /**
     * OTTIENI il primo giorno della settimana corrente (lunedì)
     */
    getStartOfWeek(date = null) {
        const d = date || this.getCurrentDate();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Se domenica, vai al lunedì precedente
        const lunedi = new Date(d);
        lunedi.setDate(diff);
        lunedi.setHours(0, 0, 0, 0);
        return lunedi;
    }
    
    /**
     * OTTIENI l'ultimo giorno della settimana corrente (domenica)
     */
    getEndOfWeek(date = null) {
        const lunedi = this.getStartOfWeek(date);
        const domenica = new Date(lunedi);
        domenica.setDate(lunedi.getDate() + 6);
        domenica.setHours(23, 59, 59, 999);
        return domenica;
    }
    
    /**
     * OTTIENI il primo giorno del mese
     */
    getStartOfMonth(date = null) {
        const d = date || this.getCurrentDate();
        return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    }
    
    /**
     * OTTIENI l'ultimo giorno del mese
     */
    getEndOfMonth(date = null) {
        const d = date || this.getCurrentDate();
        return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    
    /**
     * VERIFICA se una data è oggi
     */
    isToday(date) {
        const oggi = this.getCurrentDate();
        return date.getDate() === oggi.getDate() &&
               date.getMonth() === oggi.getMonth() &&
               date.getFullYear() === oggi.getFullYear();
    }
    
    /**
     * VERIFICA se una data è ieri
     */
    isYesterday(date) {
        const ieri = this.getYesterday();
        return date.getDate() === ieri.getDate() &&
               date.getMonth() === ieri.getMonth() &&
               date.getFullYear() === ieri.getFullYear();
    }
    
    /**
     * VERIFICA se una data è domani
     */
    isTomorrow(date) {
        const domani = this.getTomorrow();
        return date.getDate() === domani.getDate() &&
               date.getMonth() === domani.getMonth() &&
               date.getFullYear() === domani.getFullYear();
    }
    
    /**
     * DEBUG per verificare l'interpretazione delle date
     */
    debugDateFormats() {
        console.log('\n🔍 ===== DEBUG FORMATI DATA =====');
        
        const now = this.getCurrentDate();
        console.log('📅 Data corrente (oggetto JS):', now);
        console.log('🇮🇹 Formato italiano DD/MM/YYYY:', this.formatDate(now, 'DD/MM/YYYY'));
        console.log('🇺🇸 Formato americano MM/DD/YYYY (SBAGLIATO):', 
                   `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}`);
        console.log('📊 Componenti:');
        console.log('   - Giorno:', now.getDate());
        console.log('   - Mese:', now.getMonth() + 1, `(${this.getMonthName(now.getMonth() + 1)})`);
        console.log('   - Anno:', now.getFullYear());
        console.log('   - Giorno settimana:', this.getDayName(now.getDay()));
        
        // Test parsing
        console.log('\n🧪 TEST PARSING:');
        const testDate = '11/07/2025';
        const parsed = this.parseItalianDate(testDate);
        if (parsed) {
            console.log(`✅ "${testDate}" interpretato come:`, this.formatDate(parsed, 'DDDD, DD MMMM YYYY'));
            console.log('   - Giorno:', parsed.getDate());
            console.log('   - Mese:', parsed.getMonth() + 1, `(${this.getMonthName(parsed.getMonth() + 1)})`);
            console.log('   - Anno:', parsed.getFullYear());
        }
        
        console.log('\n📋 VERIFICA CRITICA:');
        console.log('🎯 La data "11/07/2025" DEVE essere interpretata come:');
        console.log('   ✅ 11 luglio 2025 (formato italiano)');
        console.log('   ❌ NON 7 novembre 2025 (formato americano)');
        
        console.log('='.repeat(50));
    }
    
    /**
     * TEST specifico per verificare il problema MM/DD vs DD/MM
     */
    testDateInterpretation() {
        console.log('\n🚨 TEST CRITICO: FORMATO DATE MM/DD vs DD/MM');
        console.log('='.repeat(60));
        
        const testCases = [
            { input: '11/07/2025', expected: 'luglio', description: '11 luglio 2025' },
            { input: '01/12/2025', expected: 'dicembre', description: '1 dicembre 2025' },
            { input: '25/03/2024', expected: 'marzo', description: '25 marzo 2024' },
            { input: '15/01/2026', expected: 'gennaio', description: '15 gennaio 2026' }
        ];
        
        testCases.forEach(test => {
            const parsed = this.parseItalianDate(test.input);
            if (parsed) {
                const mese = this.getMonthName(parsed.getMonth() + 1);
                const isCorrect = mese === test.expected;
                
                console.log(`${isCorrect ? '✅' : '❌'} "${test.input}"`);
                console.log(`   Atteso: ${test.description}`);
                console.log(`   Interpretato: ${this.formatDate(parsed, 'DD MMMM YYYY')}`);
                console.log(`   Mese: ${mese} ${isCorrect ? '(CORRETTO)' : '(SBAGLIATO!)'}`);
                console.log('');
            }
        });
        
        console.log('='.repeat(60));
    }
}

// Export per uso globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = new ItalianDateManager();
}

// Disponibile globalmente nel browser
if (typeof window !== 'undefined') {
    window.ItalianDateManager = ItalianDateManager;
    window.italianDateManager = new ItalianDateManager();
    
    // Funzioni di test rapide
    window.debugDates = () => {
        window.italianDateManager.debugDateFormats();
    };
    
    window.testDateFormats = () => {
        window.italianDateManager.testDateInterpretation();
    };
}

console.log('🇮🇹 ItalianDateManager caricato - Formato italiano DD/MM/YYYY attivo');
console.log('🧪 Usa window.debugDates() e window.testDateFormats() per testare');