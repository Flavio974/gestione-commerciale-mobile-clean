/**
 * Date Natural Parser
 * Converte espressioni naturali in date (domani, lunedì prossimo, etc.)
 */

class DateNaturalParser {
    constructor() {
        this.today = new Date();
        this.dayNames = {
            'domenica': 0, 'lunedì': 1, 'lunedi': 1, 'martedì': 2, 'martedi': 2,
            'mercoledì': 3, 'mercoledi': 3, 'giovedì': 4, 'giovedi': 4,
            'venerdì': 5, 'venerdi': 5, 'sabato': 6
        };
        
        this.monthNames = {
            'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3,
            'maggio': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7,
            'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11
        };
        
        console.log('📅 DateNaturalParser inizializzato');
    }
    
    /**
     * Parse principale
     */
    parse(dateStr, timeStr) {
        try {
            const date = this.parseDate(dateStr);
            const time = this.parseTime(timeStr);
            
            if (!date.valid || !time.valid) {
                return {
                    valid: false,
                    message: `Errore parsing: ${date.valid ? '' : date.error} ${time.valid ? '' : time.error}`
                };
            }
            
            // Combina data e ora
            const datetime = new Date(date.date);
            datetime.setHours(time.hours, time.minutes, 0, 0);
            
            // Verifica che non sia nel passato
            if (datetime < new Date()) {
                return {
                    valid: false,
                    message: 'Data/ora nel passato'
                };
            }
            
            return {
                valid: true,
                datetime: datetime,
                formatted: datetime.toLocaleString('it-IT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
            
        } catch (error) {
            console.error('❌ Errore parsing data:', error);
            return {
                valid: false,
                message: 'Errore parsing data/ora'
            };
        }
    }
    
    /**
     * Parse della data
     */
    parseDate(dateStr) {
        if (!dateStr) return { valid: false, error: 'Data mancante' };
        
        const str = dateStr.toLowerCase().trim();
        
        // Oggi
        if (str === 'oggi') {
            return { valid: true, date: new Date() };
        }
        
        // Domani
        if (str === 'domani') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return { valid: true, date: tomorrow };
        }
        
        // Dopodomani
        if (str === 'dopodomani') {
            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 2);
            return { valid: true, date: dayAfter };
        }
        
        // Giorni della settimana
        for (const [dayName, dayNum] of Object.entries(this.dayNames)) {
            if (str.includes(dayName)) {
                const targetDate = this.getNextWeekday(dayNum);
                
                // Se contiene "prossimo" va alla settimana successiva
                if (str.includes('prossimo') || str.includes('prossima')) {
                    targetDate.setDate(targetDate.getDate() + 7);
                }
                
                return { valid: true, date: targetDate };
            }
        }
        
        // Formato numerico: 15/01, 15/01/2025, 15 gennaio
        const numericMatch = str.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
        if (numericMatch) {
            const day = parseInt(numericMatch[1]);
            const month = parseInt(numericMatch[2]) - 1; // JS months are 0-based
            const year = numericMatch[3] ? parseInt(numericMatch[3]) : new Date().getFullYear();
            
            // Aggiusta anno se a 2 cifre
            const fullYear = year < 100 ? 2000 + year : year;
            
            const date = new Date(fullYear, month, day);
            if (date.getDate() === day && date.getMonth() === month) {
                return { valid: true, date: date };
            }
        }
        
        // Formato testo: "15 gennaio", "3 marzo"
        const textMatch = str.match(/(\d{1,2})\s+(\w+)/);
        if (textMatch) {
            const day = parseInt(textMatch[1]);
            const monthName = textMatch[2].toLowerCase();
            
            if (this.monthNames[monthName] !== undefined) {
                const month = this.monthNames[monthName];
                const year = new Date().getFullYear();
                
                const date = new Date(year, month, day);
                if (date.getDate() === day && date.getMonth() === month) {
                    return { valid: true, date: date };
                }
            }
        }
        
        // Settimana prossima
        if (str.includes('settimana prossima') || str.includes('prossima settimana')) {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            return { valid: true, date: nextWeek };
        }
        
        // Questa settimana
        if (str.includes('questa settimana')) {
            return { valid: true, date: new Date() };
        }
        
        // Tra X giorni
        const daysMatch = str.match(/tra\s+(\d+)\s+giorni?/);
        if (daysMatch) {
            const days = parseInt(daysMatch[1]);
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);
            return { valid: true, date: futureDate };
        }
        
        return { valid: false, error: `Data non riconosciuta: ${dateStr}` };
    }
    
    /**
     * Parse dell'ora
     */
    parseTime(timeStr) {
        if (!timeStr) return { valid: false, error: 'Ora mancante' };
        
        const str = timeStr.toLowerCase().trim();
        
        // Formato HH:MM o HH.MM
        const timeMatch = str.match(/(\d{1,2})[:\.]\s*(\d{2})/);
        if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                return { valid: true, hours: hours, minutes: minutes };
            }
        }
        
        // Formato solo ore: "10", "alle 15"
        const hourMatch = str.match(/(?:alle\s+)?(\d{1,2})(?:\s*(?:in\s+punto)?)?$/);
        if (hourMatch) {
            const hours = parseInt(hourMatch[1]);
            
            if (hours >= 0 && hours <= 23) {
                return { valid: true, hours: hours, minutes: 0 };
            }
        }
        
        // Formato con mezza: "10 e mezza", "10:30"
        const halfMatch = str.match(/(\d{1,2})\s+e\s+mezza/);
        if (halfMatch) {
            const hours = parseInt(halfMatch[1]);
            
            if (hours >= 0 && hours <= 23) {
                return { valid: true, hours: hours, minutes: 30 };
            }
        }
        
        // Formato con quarto: "10 e un quarto", "10 meno un quarto"
        const quarterMatch = str.match(/(\d{1,2})\s+(e\s+un\s+quarto|meno\s+un\s+quarto)/);
        if (quarterMatch) {
            const hours = parseInt(quarterMatch[1]);
            const isPlus = quarterMatch[2].includes('e');
            
            if (hours >= 0 && hours <= 23) {
                return {
                    valid: true,
                    hours: isPlus ? hours : hours - 1,
                    minutes: isPlus ? 15 : 45
                };
            }
        }
        
        // Orari descrittivi
        const descriptiveMap = {
            'mattina': { hours: 9, minutes: 0 },
            'mattino': { hours: 9, minutes: 0 },
            'pomeriggio': { hours: 15, minutes: 0 },
            'sera': { hours: 19, minutes: 0 },
            'serata': { hours: 19, minutes: 0 },
            'mezzogiorno': { hours: 12, minutes: 0 },
            'pranzo': { hours: 12, minutes: 30 }
        };
        
        for (const [desc, time] of Object.entries(descriptiveMap)) {
            if (str.includes(desc)) {
                return { valid: true, hours: time.hours, minutes: time.minutes };
            }
        }
        
        return { valid: false, error: `Ora non riconosciuta: ${timeStr}` };
    }
    
    /**
     * Ottieni prossimo giorno della settimana
     */
    getNextWeekday(targetDay) {
        const today = new Date();
        const currentDay = today.getDay();
        
        let daysToAdd = targetDay - currentDay;
        
        // Se è oggi o è già passato, vai alla settimana prossima
        if (daysToAdd <= 0) {
            daysToAdd += 7;
        }
        
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysToAdd);
        
        return nextDate;
    }
    
    /**
     * Test della parsing - per debug
     */
    test() {
        const testCases = [
            ['oggi', '10:30'],
            ['domani', '15:00'],
            ['lunedì', 'mattina'],
            ['15/01', '9 e mezza'],
            ['prossimo venerdì', 'sera'],
            ['3 marzo', 'mezzogiorno'],
            ['tra 5 giorni', '14:15']
        ];
        
        console.log('🧪 Test DateNaturalParser:');
        testCases.forEach(([date, time]) => {
            const result = this.parse(date, time);
            console.log(`"${date} ${time}" → ${result.valid ? result.formatted : result.message}`);
        });
    }
}

// Export globale
window.DateNaturalParser = DateNaturalParser;

console.log('📅 DateNaturalParser module loaded');