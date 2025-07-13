/**
 * Componente Calendario Interattivo Italiano
 * Fornisce un calendario navigabile con selezione date e range
 * 
 * Caratteristiche:
 * - Navigazione mese per mese
 * - Selezione singola data o range
 * - Evidenziazione weekend e festività
 * - Nomi in italiano
 * - Integrazione con italian-date-system.js
 */

class ItalianCalendar {
    constructor(options = {}) {
        this.options = {
            container: null,
            mode: 'single', // 'single' o 'range'
            minDate: null,
            maxDate: null,
            disableWeekends: false,
            disableHolidays: false,
            disablePastDates: false,
            onDateSelect: null,
            onRangeSelect: null,
            theme: 'default',
            ...options
        };

        this.currentMonth = new Date();
        this.selectedDate = null;
        this.selectedStartDate = null;
        this.selectedEndDate = null;
        this.hoveredDate = null;

        if (this.options.container) {
            this.init();
        }
    }

    init() {
        this.container = typeof this.options.container === 'string' 
            ? document.querySelector(this.options.container)
            : this.options.container;

        if (!this.container) {
            console.error('Container non trovato per ItalianCalendar');
            return;
        }

        this.render();
        this.attachEvents();
    }

    render() {
        this.container.innerHTML = '';
        this.container.className = `italian-calendar ${this.options.theme}`;

        // Header con navigazione
        const header = this.createHeader();
        this.container.appendChild(header);

        // Griglia del calendario
        const grid = this.createCalendarGrid();
        this.container.appendChild(grid);

        // Footer con info
        if (this.options.mode === 'range') {
            const footer = this.createFooter();
            this.container.appendChild(footer);
        }
    }

    createHeader() {
        const header = document.createElement('div');
        header.className = 'calendar-header';

        // Pulsante mese precedente
        const prevBtn = document.createElement('button');
        prevBtn.className = 'nav-btn prev-month';
        prevBtn.innerHTML = '◀';
        prevBtn.setAttribute('aria-label', 'Mese precedente');

        // Display mese/anno corrente
        const monthYear = document.createElement('div');
        monthYear.className = 'current-month';
        const monthName = window.ItalianDateSystem.MESI_ITALIANI[this.currentMonth.getMonth()];
        const year = this.currentMonth.getFullYear();
        monthYear.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

        // Pulsante mese successivo
        const nextBtn = document.createElement('button');
        nextBtn.className = 'nav-btn next-month';
        nextBtn.innerHTML = '▶';
        nextBtn.setAttribute('aria-label', 'Mese successivo');

        header.appendChild(prevBtn);
        header.appendChild(monthYear);
        header.appendChild(nextBtn);

        return header;
    }

    createCalendarGrid() {
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        // Header giorni della settimana
        const daysHeader = document.createElement('div');
        daysHeader.className = 'days-header';

        const giorniBrevi = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
        giorniBrevi.forEach(giorno => {
            const dayLabel = document.createElement('div');
            dayLabel.className = 'day-label';
            dayLabel.textContent = giorno;
            daysHeader.appendChild(dayLabel);
        });

        grid.appendChild(daysHeader);

        // Corpo del calendario
        const daysGrid = document.createElement('div');
        daysGrid.className = 'days-grid';

        const firstDay = window.ItalianDateSystem.getFirstDayOfMonth(this.currentMonth);
        const lastDay = window.ItalianDateSystem.getLastDayOfMonth(this.currentMonth);
        
        // Calcola il giorno della settimana del primo giorno (0 = domenica)
        let startWeekday = firstDay.getDay();
        // Converti a lunedì = 0
        startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;

        // Aggiungi celle vuote per i giorni prima del mese
        for (let i = 0; i < startWeekday; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty';
            daysGrid.appendChild(emptyCell);
        }

        // Aggiungi i giorni del mese
        const currentDate = new Date(firstDay);
        while (currentDate <= lastDay) {
            const dayCell = this.createDayCell(new Date(currentDate));
            daysGrid.appendChild(dayCell);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        grid.appendChild(daysGrid);
        return grid;
    }

    createDayCell(date) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.setAttribute('data-date', window.ItalianDateSystem.formatDateItalian(date));
        
        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        cell.appendChild(dayNumber);

        // Aggiungi classi per stati speciali
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

        if (date.getTime() === oggi.getTime()) {
            cell.classList.add('today');
        }

        if (window.ItalianDateSystem.isWeekend(date)) {
            cell.classList.add('weekend');
            if (this.options.disableWeekends) {
                cell.classList.add('disabled');
            }
        }

        if (window.ItalianDateSystem.isFestivita(date)) {
            cell.classList.add('holiday');
            const holidayName = window.ItalianDateSystem.getNomeFestivita(date);
            if (holidayName) {
                cell.setAttribute('title', holidayName);
                const holidayIndicator = document.createElement('span');
                holidayIndicator.className = 'holiday-indicator';
                holidayIndicator.textContent = '●';
                cell.appendChild(holidayIndicator);
            }
            if (this.options.disableHolidays) {
                cell.classList.add('disabled');
            }
        }

        // Controllo date disabilitate
        if (this.options.disablePastDates && date < oggi) {
            cell.classList.add('disabled');
        }

        if (this.options.minDate && date < this.options.minDate) {
            cell.classList.add('disabled');
        }

        if (this.options.maxDate && date > this.options.maxDate) {
            cell.classList.add('disabled');
        }

        // Gestione selezione
        if (this.options.mode === 'single' && this.selectedDate) {
            if (date.getTime() === this.selectedDate.getTime()) {
                cell.classList.add('selected');
            }
        } else if (this.options.mode === 'range') {
            if (this.selectedStartDate && date.getTime() === this.selectedStartDate.getTime()) {
                cell.classList.add('range-start');
            }
            if (this.selectedEndDate && date.getTime() === this.selectedEndDate.getTime()) {
                cell.classList.add('range-end');
            }
            if (this.selectedStartDate && this.selectedEndDate) {
                if (date > this.selectedStartDate && date < this.selectedEndDate) {
                    cell.classList.add('in-range');
                }
            }
            // Evidenzia range durante hover
            if (this.selectedStartDate && !this.selectedEndDate && this.hoveredDate) {
                if (date > this.selectedStartDate && date <= this.hoveredDate) {
                    cell.classList.add('in-range-preview');
                }
            }
        }

        return cell;
    }

    createFooter() {
        const footer = document.createElement('div');
        footer.className = 'calendar-footer';

        const rangeInfo = document.createElement('div');
        rangeInfo.className = 'range-info';

        if (this.selectedStartDate && this.selectedEndDate) {
            const start = window.ItalianDateSystem.formatDateItalian(this.selectedStartDate);
            const end = window.ItalianDateSystem.formatDateItalian(this.selectedEndDate);
            const days = window.ItalianDateSystem.daysBetweenDates(this.selectedStartDate, this.selectedEndDate) + 1;
            const workDays = window.ItalianDateSystem.calcolaGiorniLavorativi(this.selectedStartDate, this.selectedEndDate);
            
            rangeInfo.innerHTML = `
                <span class="range-dates">${start} - ${end}</span>
                <span class="range-days">${days} giorni (${workDays} lavorativi)</span>
            `;
        } else {
            rangeInfo.innerHTML = '<span class="range-placeholder">Seleziona un periodo</span>';
        }

        footer.appendChild(rangeInfo);

        // Pulsante reset
        const resetBtn = document.createElement('button');
        resetBtn.className = 'reset-btn';
        resetBtn.textContent = 'Cancella selezione';
        footer.appendChild(resetBtn);

        return footer;
    }

    attachEvents() {
        // Navigazione mesi
        this.container.querySelector('.prev-month').addEventListener('click', () => {
            this.navigateMonth(-1);
        });

        this.container.querySelector('.next-month').addEventListener('click', () => {
            this.navigateMonth(1);
        });

        // Selezione giorni
        this.container.addEventListener('click', (e) => {
            const dayCell = e.target.closest('.day-cell:not(.empty):not(.disabled)');
            if (dayCell) {
                this.selectDate(dayCell);
            }

            if (e.target.classList.contains('reset-btn')) {
                this.reset();
            }
        });

        // Hover per preview range
        if (this.options.mode === 'range') {
            this.container.addEventListener('mouseover', (e) => {
                const dayCell = e.target.closest('.day-cell:not(.empty):not(.disabled)');
                if (dayCell && this.selectedStartDate && !this.selectedEndDate) {
                    const dateStr = dayCell.getAttribute('data-date');
                    this.hoveredDate = window.ItalianDateSystem.parseItalianDate(dateStr);
                    this.updateRangePreview();
                }
            });

            this.container.addEventListener('mouseleave', () => {
                this.hoveredDate = null;
                this.updateRangePreview();
            });
        }

        // Navigazione da tastiera
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.navigateMonth(-1);
            } else if (e.key === 'ArrowRight') {
                this.navigateMonth(1);
            }
        });
    }

    navigateMonth(direction) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
        this.render();
    }

    selectDate(dayCell) {
        const dateStr = dayCell.getAttribute('data-date');
        const date = window.ItalianDateSystem.parseItalianDate(dateStr);

        if (this.options.mode === 'single') {
            this.selectedDate = date;
            
            // Callback
            if (this.options.onDateSelect) {
                this.options.onDateSelect(date, dateStr);
            }
        } else if (this.options.mode === 'range') {
            if (!this.selectedStartDate || (this.selectedStartDate && this.selectedEndDate)) {
                // Inizia nuova selezione
                this.selectedStartDate = date;
                this.selectedEndDate = null;
            } else {
                // Completa il range
                if (date >= this.selectedStartDate) {
                    this.selectedEndDate = date;
                } else {
                    // Se la data è prima della start, inverti
                    this.selectedEndDate = this.selectedStartDate;
                    this.selectedStartDate = date;
                }
                
                // Callback
                if (this.options.onRangeSelect) {
                    this.options.onRangeSelect(
                        this.selectedStartDate,
                        this.selectedEndDate,
                        window.ItalianDateSystem.formatDateItalian(this.selectedStartDate),
                        window.ItalianDateSystem.formatDateItalian(this.selectedEndDate)
                    );
                }
            }
        }

        this.render();
    }

    updateRangePreview() {
        this.render();
    }

    reset() {
        this.selectedDate = null;
        this.selectedStartDate = null;
        this.selectedEndDate = null;
        this.hoveredDate = null;
        this.render();
    }

    setDate(date) {
        if (this.options.mode === 'single') {
            this.selectedDate = date instanceof Date ? date : window.ItalianDateSystem.parseItalianDate(date);
            this.currentMonth = new Date(this.selectedDate);
            this.render();
        }
    }

    setDateRange(startDate, endDate) {
        if (this.options.mode === 'range') {
            this.selectedStartDate = startDate instanceof Date ? startDate : window.ItalianDateSystem.parseItalianDate(startDate);
            this.selectedEndDate = endDate instanceof Date ? endDate : window.ItalianDateSystem.parseItalianDate(endDate);
            this.currentMonth = new Date(this.selectedStartDate);
            this.render();
        }
    }

    getSelectedDate() {
        if (this.options.mode === 'single') {
            return this.selectedDate;
        }
        return null;
    }

    getSelectedRange() {
        if (this.options.mode === 'range') {
            return {
                start: this.selectedStartDate,
                end: this.selectedEndDate
            };
        }
        return null;
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.className = '';
        }
    }
}

// Classe per il Date Range Picker
class ItalianDateRangePicker {
    constructor(options = {}) {
        this.options = {
            startInput: null,
            endInput: null,
            container: null,
            minDate: null,
            maxDate: null,
            disableWeekends: false,
            disableHolidays: false,
            presets: true,
            onChange: null,
            ...options
        };

        this.startInput = null;
        this.endInput = null;
        this.calendar = null;
        this.isOpen = false;

        if (this.options.startInput && this.options.endInput) {
            this.init();
        }
    }

    init() {
        // Trova gli input
        this.startInput = typeof this.options.startInput === 'string' 
            ? document.querySelector(this.options.startInput)
            : this.options.startInput;
            
        this.endInput = typeof this.options.endInput === 'string' 
            ? document.querySelector(this.options.endInput)
            : this.options.endInput;

        if (!this.startInput || !this.endInput) {
            console.error('Input non trovati per DateRangePicker');
            return;
        }

        // Crea container per il calendario
        this.createContainer();

        // Crea il calendario
        this.calendar = new ItalianCalendar({
            container: this.calendarContainer,
            mode: 'range',
            minDate: this.options.minDate,
            maxDate: this.options.maxDate,
            disableWeekends: this.options.disableWeekends,
            disableHolidays: this.options.disableHolidays,
            onRangeSelect: (start, end, startStr, endStr) => {
                this.handleRangeSelect(start, end, startStr, endStr);
            }
        });

        // Aggiungi eventi
        this.attachEvents();

        // Aggiungi preset se abilitati
        if (this.options.presets) {
            this.addPresets();
        }
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'date-range-picker-container';
        this.container.style.display = 'none';

        this.calendarContainer = document.createElement('div');
        this.calendarContainer.className = 'date-range-calendar';

        this.container.appendChild(this.calendarContainer);

        // Posiziona dopo il secondo input
        this.endInput.parentNode.insertBefore(this.container, this.endInput.nextSibling);
    }

    addPresets() {
        const presetsContainer = document.createElement('div');
        presetsContainer.className = 'date-range-presets';

        const presets = [
            { label: 'Oggi', getValue: () => {
                const oggi = new Date();
                return { start: oggi, end: oggi };
            }},
            { label: 'Ieri', getValue: () => {
                const ieri = window.ItalianDateSystem.addDays(new Date(), -1);
                return { start: ieri, end: ieri };
            }},
            { label: 'Ultimi 7 giorni', getValue: () => {
                const end = new Date();
                const start = window.ItalianDateSystem.addDays(end, -6);
                return { start, end };
            }},
            { label: 'Ultimi 30 giorni', getValue: () => {
                const end = new Date();
                const start = window.ItalianDateSystem.addDays(end, -29);
                return { start, end };
            }},
            { label: 'Questo mese', getValue: () => {
                const oggi = new Date();
                const start = window.ItalianDateSystem.getFirstDayOfMonth(oggi);
                const end = window.ItalianDateSystem.getLastDayOfMonth(oggi);
                return { start, end };
            }},
            { label: 'Mese scorso', getValue: () => {
                const meseScorso = new Date();
                meseScorso.setMonth(meseScorso.getMonth() - 1);
                const start = window.ItalianDateSystem.getFirstDayOfMonth(meseScorso);
                const end = window.ItalianDateSystem.getLastDayOfMonth(meseScorso);
                return { start, end };
            }},
            { label: 'Prossimi 7 giorni', getValue: () => {
                const start = new Date();
                const end = window.ItalianDateSystem.addDays(start, 6);
                return { start, end };
            }},
            { label: 'Prossimi 30 giorni', getValue: () => {
                const start = new Date();
                const end = window.ItalianDateSystem.addDays(start, 29);
                return { start, end };
            }}
        ];

        presets.forEach(preset => {
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.textContent = preset.label;
            btn.addEventListener('click', () => {
                const range = preset.getValue();
                this.setRange(range.start, range.end);
            });
            presetsContainer.appendChild(btn);
        });

        this.container.insertBefore(presetsContainer, this.calendarContainer);
    }

    attachEvents() {
        // Focus sugli input apre il picker
        [this.startInput, this.endInput].forEach(input => {
            input.addEventListener('focus', () => this.open());
            
            // Validazione manuale dell'input
            input.addEventListener('blur', () => {
                const value = input.value;
                if (value && !window.ItalianDateSystem.isValidItalianDate(value)) {
                    input.classList.add('error');
                    input.setAttribute('aria-invalid', 'true');
                } else {
                    input.classList.remove('error');
                    input.removeAttribute('aria-invalid');
                }
            });

            // Previeni input non validi
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                // Permetti solo numeri e slash
                if (!/^[\d\/]*$/.test(value)) {
                    e.target.value = value.replace(/[^\d\/]/g, '');
                }

                // Auto-inserimento slash
                if (value.length === 2 || value.length === 5) {
                    if (!value.endsWith('/')) {
                        e.target.value = value + '/';
                    }
                }
            });
        });

        // Click fuori chiude il picker
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target) && 
                !this.startInput.contains(e.target) && 
                !this.endInput.contains(e.target)) {
                this.close();
            }
        });

        // ESC chiude il picker
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    handleRangeSelect(start, end, startStr, endStr) {
        this.startInput.value = startStr;
        this.endInput.value = endStr;
        
        // Rimuovi errori
        this.startInput.classList.remove('error');
        this.endInput.classList.remove('error');

        // Callback
        if (this.options.onChange) {
            this.options.onChange(start, end, startStr, endStr);
        }

        // Chiudi dopo selezione completa
        setTimeout(() => this.close(), 300);
    }

    setRange(startDate, endDate) {
        this.calendar.setDateRange(startDate, endDate);
        const startStr = window.ItalianDateSystem.formatDateItalian(startDate);
        const endStr = window.ItalianDateSystem.formatDateItalian(endDate);
        this.handleRangeSelect(startDate, endDate, startStr, endStr);
    }

    open() {
        this.container.style.display = 'block';
        this.isOpen = true;

        // Se ci sono già valori negli input, imposta il range
        const startValue = this.startInput.value;
        const endValue = this.endInput.value;

        if (startValue && endValue && 
            window.ItalianDateSystem.isValidItalianDate(startValue) && 
            window.ItalianDateSystem.isValidItalianDate(endValue)) {
            const startDate = window.ItalianDateSystem.parseItalianDate(startValue);
            const endDate = window.ItalianDateSystem.parseItalianDate(endValue);
            this.calendar.setDateRange(startDate, endDate);
        }
    }

    close() {
        this.container.style.display = 'none';
        this.isOpen = false;
    }

    destroy() {
        if (this.calendar) {
            this.calendar.destroy();
        }
        if (this.container) {
            this.container.remove();
        }
    }
}

// Esportazione
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ItalianCalendar, ItalianDateRangePicker };
}

if (typeof window !== 'undefined') {
    window.ItalianCalendar = ItalianCalendar;
    window.ItalianDateRangePicker = ItalianDateRangePicker;
}