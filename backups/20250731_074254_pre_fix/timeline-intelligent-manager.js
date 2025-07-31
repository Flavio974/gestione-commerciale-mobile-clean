/**
 * Timeline Intelligent Manager
 * Gestisce inserimento automatico appuntamenti con logica intelligente
 */

class TimelineIntelligentManager {
    constructor() {
        this.rules = null;
        this.supabase = window.supabase;
        this.rulesLoaded = false;
        
        // Carica regole all'inizializzazione
        this.loadRules();
        
        console.log('📅 TimelineIntelligentManager inizializzato');
    }
    
    /**
     * Carica regole da file JSON
     */
    async loadRules() {
        try {
            // Prima prova localStorage (se modificato dall'utente)
            const savedRules = localStorage.getItem('timeline_rules');
            if (savedRules) {
                this.rules = JSON.parse(savedRules);
                console.log('✅ Regole timeline caricate da localStorage');
                this.rulesLoaded = true;
                return;
            }
            
            // Altrimenti carica dal file
            const response = await fetch('/config/timeline-rules.json');
            if (response.ok) {
                this.rules = await response.json();
                console.log('✅ Regole timeline caricate da file');
                this.rulesLoaded = true;
            } else {
                throw new Error('File regole non trovato');
            }
        } catch (error) {
            console.error('❌ Errore caricamento regole timeline:', error);
            this.rules = this.getDefaultRules();
            this.rulesLoaded = true;
        }
    }
    
    /**
     * Regole di fallback se il file non si carica
     */
    getDefaultRules() {
        return {
            orari_lavoro: {
                default: { inizio: "08:00", fine: "19:00" },
                pausa_pranzo: { inizio: "12:30", fine: "14:00" }
            },
            durate_standard: {
                appuntamento_base: 60,
                buffer_minimo: 15
            },
            regole_spostamenti: {
                tempo_default_se_mancante: 30,
                avviso_percorso_mancante: true
            }
        };
    }
    
    /**
     * Salva regole modificate in localStorage
     */
    saveRules() {
        try {
            localStorage.setItem('timeline_rules', JSON.stringify(this.rules));
            console.log('✅ Regole timeline salvate');
            return true;
        } catch (error) {
            console.error('❌ Errore salvataggio regole:', error);
            return false;
        }
    }
    
    /**
     * Inserisce appuntamento da comando vocale/testo
     */
    async insertAppointmentFromCommand(params) {
        console.log('📅 Inserimento appuntamento:', params);
        
        // Assicurati che le regole siano caricate
        if (!this.rulesLoaded) {
            await this.loadRules();
        }
        
        try {
            // 1. Validazione parametri base
            const validation = this.validateAppointmentParams(params);
            if (!validation.valid) {
                return {
                    success: false,
                    message: validation.message,
                    needsInput: validation.needsInput
                };
            }
            
            // 2. Risoluzione data e ora
            const dateTime = await this.resolveDateTimeFromNatural(params.data, params.ora);
            if (!dateTime.valid) {
                return {
                    success: false,
                    message: dateTime.message
                };
            }
            
            // 3. Richiesta durata se non specificata
            if (!params.durata) {
                return {
                    success: false,
                    message: "Specifica la durata dell'appuntamento",
                    needsInput: {
                        type: 'duration',
                        prompt: `Durata appuntamento con ${params.cliente} (minuti):`,
                        default: this.rules.durate_standard.appuntamento_base,
                        originalParams: params
                    }
                };
            }
            
            // 4. Calcolo tempo di spostamento
            const travelTime = await this.calculateTravelTime(params.cliente, dateTime.datetime);
            if (travelTime.missing) {
                return {
                    success: false,
                    message: `Percorso mancante: ${travelTime.message}`,
                    needsInput: {
                        type: 'travel_time',
                        from: travelTime.from,
                        to: travelTime.to,
                        prompt: `Tempo di spostamento da ${travelTime.from} a ${travelTime.to} (minuti):`,
                        originalParams: params
                    }
                };
            }
            
            // 5. Verifica disponibilità slot
            const availability = await this.checkSlotAvailability(
                dateTime.datetime,
                parseInt(params.durata),
                travelTime.minutes
            );
            
            if (!availability.available) {
                // Genera alternative
                const alternatives = await this.generateAlternatives(
                    params.cliente,
                    dateTime.datetime,
                    parseInt(params.durata)
                );
                
                return {
                    success: false,
                    message: availability.message,
                    conflict: true,
                    alternatives: alternatives
                };
            }
            
            // 6. Inserimento appuntamento
            const appointment = await this.createAppointment({
                cliente: params.cliente,
                datetime: dateTime.datetime,
                durata: parseInt(params.durata),
                travelTime: travelTime.minutes,
                note: params.note || ''
            });
            
            if (appointment.success) {
                return {
                    success: true,
                    message: `✅ Appuntamento inserito: ${params.cliente} il ${dateTime.formatted} per ${params.durata} minuti`,
                    appointment: appointment.data
                };
            } else {
                return {
                    success: false,
                    message: `❌ Errore inserimento: ${appointment.error}`
                };
            }
            
        } catch (error) {
            console.error('❌ Errore inserimento appuntamento:', error);
            return {
                success: false,
                message: 'Errore durante l\'inserimento appuntamento'
            };
        }
    }
    
    /**
     * Valida parametri dell'appuntamento
     */
    validateAppointmentParams(params) {
        if (!params.cliente) {
            return {
                valid: false,
                message: 'Cliente non specificato',
                needsInput: {
                    type: 'client',
                    prompt: 'Nome cliente:'
                }
            };
        }
        
        if (!params.data || !params.ora) {
            return {
                valid: false,
                message: 'Data o ora non specificate',
                needsInput: {
                    type: 'datetime',
                    prompt: 'Data e ora appuntamento (es. "domani alle 10:30"):'
                }
            };
        }
        
        return { valid: true };
    }
    
    /**
     * Risolve data e ora da linguaggio naturale
     */
    async resolveDateTimeFromNatural(dataStr, oraStr) {
        try {
            const dateParser = new DateNaturalParser();
            const result = dateParser.parse(dataStr, oraStr);
            
            if (result.valid) {
                // Verifica che sia in orario lavorativo
                const workingHours = this.isWithinWorkingHours(result.datetime);
                if (!workingHours.valid) {
                    return {
                        valid: false,
                        message: workingHours.message
                    };
                }
                
                return {
                    valid: true,
                    datetime: result.datetime,
                    formatted: result.formatted
                };
            } else {
                return {
                    valid: false,
                    message: `Data/ora non riconosciuta: ${dataStr} ${oraStr}`
                };
            }
        } catch (error) {
            return {
                valid: false,
                message: 'Errore parsing data/ora'
            };
        }
    }
    
    /**
     * Verifica se datetime è in orario lavorativo
     */
    isWithinWorkingHours(datetime) {
        const dayName = datetime.toLocaleDateString('it-IT', { weekday: 'long' }).toLowerCase();
        const dayRules = this.rules.orari_lavoro.personalizzati[dayName];
        
        if (!dayRules || dayRules.attivo === false) {
            return {
                valid: false,
                message: `${dayName} non è un giorno lavorativo`
            };
        }
        
        const timeStr = datetime.toTimeString().slice(0, 5); // HH:MM
        const inizio = dayRules.inizio || this.rules.orari_lavoro.default.inizio;
        const fine = dayRules.fine || this.rules.orari_lavoro.default.fine;
        
        if (timeStr < inizio || timeStr > fine) {
            return {
                valid: false,
                message: `Orario ${timeStr} fuori dall'orario lavorativo (${inizio}-${fine})`
            };
        }
        
        // Verifica pausa pranzo
        const pausaInizio = this.rules.orari_lavoro.pausa_pranzo.inizio;
        const pausaFine = this.rules.orari_lavoro.pausa_pranzo.fine;
        
        if (timeStr >= pausaInizio && timeStr <= pausaFine) {
            return {
                valid: false,
                message: `Orario ${timeStr} è durante la pausa pranzo (${pausaInizio}-${pausaFine})`
            };
        }
        
        return { valid: true };
    }
    
    /**
     * Calcola tempo di spostamento usando tabella percorsi
     */
    async calculateTravelTime(clienteTo, datetime) {
        try {
            // Trova ultimo appuntamento prima di datetime
            const previousAppointment = await this.findPreviousAppointment(datetime);
            
            if (!previousAppointment) {
                // Primo appuntamento della giornata
                return {
                    missing: false,
                    minutes: 0,
                    from: 'Inizio giornata',
                    to: clienteTo
                };
            }
            
            const clienteFrom = previousAppointment.cliente;
            
            // Cerca nella tabella percorsi
            const { data, error } = await this.supabase
                .from('percorsi')
                .select('minuti, km')
                .or(`and(partenza.ilike.%${clienteFrom}%,arrivo.ilike.%${clienteTo}%),and(partenza.ilike.%${clienteTo}%,arrivo.ilike.%${clienteFrom}%)`)
                .limit(1);
                
            if (error) {
                console.error('❌ Errore query percorsi:', error);
            }
            
            if (data && data.length > 0) {
                return {
                    missing: false,
                    minutes: data[0].minuti || this.rules.regole_spostamenti.tempo_default_se_mancante,
                    from: clienteFrom,
                    to: clienteTo
                };
            } else {
                // Percorso mancante
                return {
                    missing: true,
                    minutes: this.rules.regole_spostamenti.tempo_default_se_mancante,
                    from: clienteFrom,
                    to: clienteTo,
                    message: `da ${clienteFrom} a ${clienteTo}`
                };
            }
            
        } catch (error) {
            console.error('❌ Errore calcolo tempo spostamento:', error);
            return {
                missing: false,
                minutes: this.rules.regole_spostamenti.tempo_default_se_mancante,
                from: 'Sconosciuto',
                to: clienteTo
            };
        }
    }
    
    /**
     * Trova l'appuntamento precedente più vicino
     */
    async findPreviousAppointment(datetime) {
        try {
            const startOfDay = new Date(datetime);
            startOfDay.setHours(0, 0, 0, 0);
            
            const { data, error } = await this.supabase
                .from('timeline_events')
                .select('*')
                .gte('inizio_programmato', startOfDay.toISOString())
                .lt('inizio_programmato', datetime.toISOString())
                .order('inizio_programmato', { ascending: false })
                .limit(1);
                
            if (error) {
                console.error('❌ Errore ricerca appuntamento precedente:', error);
                return null;
            }
            
            return data && data.length > 0 ? data[0] : null;
            
        } catch (error) {
            console.error('❌ Errore findPreviousAppointment:', error);
            return null;
        }
    }
    
    /**
     * Verifica disponibilità slot
     */
    async checkSlotAvailability(datetime, durata, travelTime) {
        try {
            // Calcola slot necessario includendo tempo di spostamento
            const slotStart = new Date(datetime.getTime() - (travelTime * 60000));
            const slotEnd = new Date(datetime.getTime() + (durata * 60000));
            
            // Cerca conflitti
            const { data, error } = await this.supabase
                .from('timeline_events')
                .select('*')
                .gte('inizio_programmato', slotStart.toISOString())
                .lte('inizio_programmato', slotEnd.toISOString());
                
            if (error) {
                console.error('❌ Errore verifica disponibilità:', error);
                return {
                    available: false,
                    message: 'Errore verifica disponibilità'
                };
            }
            
            if (data && data.length > 0) {
                return {
                    available: false,
                    message: `Conflitto con appuntamento esistente: ${data[0].cliente}`,
                    conflictingAppointments: data
                };
            }
            
            return {
                available: true,
                message: 'Slot disponibile'
            };
            
        } catch (error) {
            console.error('❌ Errore checkSlotAvailability:', error);
            return {
                available: false,
                message: 'Errore verifica disponibilità'
            };
        }
    }
    
    /**
     * Genera alternative quando c'è conflitto
     */
    async generateAlternatives(cliente, requestedDateTime, durata) {
        const alternatives = [];
        const baseDate = new Date(requestedDateTime);
        
        // Prova slot nelle prossime 4 ore
        for (let offset = 30; offset <= 240; offset += 30) {
            const altDateTime = new Date(baseDate.getTime() + (offset * 60000));
            
            // Verifica se è in orario lavorativo
            const workingHours = this.isWithinWorkingHours(altDateTime);
            if (!workingHours.valid) continue;
            
            // Verifica disponibilità
            const availability = await this.checkSlotAvailability(altDateTime, durata, 0);
            if (availability.available) {
                alternatives.push({
                    datetime: altDateTime,
                    formatted: altDateTime.toLocaleString('it-IT'),
                    score: this.calculateAlternativeScore(cliente, altDateTime)
                });
                
                if (alternatives.length >= this.rules.gestione_conflitti.numero_alternative) {
                    break;
                }
            }
        }
        
        // Ordina per score
        alternatives.sort((a, b) => b.score - a.score);
        
        return alternatives;
    }
    
    /**
     * Calcola score per alternative (considera preferenze cliente)
     */
    calculateAlternativeScore(cliente, datetime) {
        let score = 100;
        
        // TODO: Implementare logica basata su preferenze cliente
        // dalla tabella clients campo momento_preferito
        
        const hour = datetime.getHours();
        
        // Preferenza orari centrali
        if (hour >= 9 && hour <= 11) score += 20;  // Mattina
        if (hour >= 14 && hour <= 17) score += 15; // Pomeriggio
        if (hour >= 8 && hour <= 8.5) score -= 10; // Troppo presto
        if (hour >= 18) score -= 20; // Troppo tardi
        
        return score;
    }
    
    /**
     * Crea l'appuntamento nel database
     */
    async createAppointment(appointmentData) {
        try {
            const event = {
                tipo: 'appuntamento',
                cliente: appointmentData.cliente,
                inizio_programmato: appointmentData.datetime.toISOString(),
                fine_programmata: new Date(appointmentData.datetime.getTime() + (appointmentData.durata * 60000)).toISOString(),
                durata_minuti: appointmentData.durata,
                tempo_spostamento_minuti: appointmentData.travelTime,
                stato: 'programmato',
                note: appointmentData.note,
                created_by: 'ai_assistant',
                created_at: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('timeline_events')
                .insert([event])
                .select();
                
            if (error) {
                console.error('❌ Errore inserimento appuntamento:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
            
            // Aggiorna UI timeline se presente
            if (window.Timeline && typeof window.Timeline.refresh === 'function') {
                window.Timeline.refresh();
            }
            
            return {
                success: true,
                data: data[0]
            };
            
        } catch (error) {
            console.error('❌ Errore createAppointment:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Ottieni regole correnti (per UI)
     */
    getRules() {
        return this.rules;
    }
    
    /**
     * Aggiorna regole (per UI)
     */
    updateRules(newRules) {
        this.rules = { ...this.rules, ...newRules };
        return this.saveRules();
    }
}

// Export globale
window.TimelineIntelligentManager = TimelineIntelligentManager;

console.log('📅 TimelineIntelligentManager module loaded');