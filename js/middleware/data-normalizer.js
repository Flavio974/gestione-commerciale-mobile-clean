/**
 * DATA NORMALIZER SYSTEM
 * Sistema robusto per normalizzare dati di input
 * con focus su nomi clienti e correzione fonetica
 */

class DataNormalizationSystem {
    constructor() {
        // Mappature per abbreviazioni comuni
        this.abbreviations = {
            // Sigle aziendali
            'sm': 'ESSE EMME',
            's.m.': 'ESSE EMME',
            's m': 'ESSE EMME',
            'sss': 'ESSE ESSE ESSE',
            's.s.s.': 'ESSE ESSE ESSE',
            's s s': 'ESSE ESSE ESSE',
            'ss': 'ESSE ESSE',
            's.s.': 'ESSE ESSE',
            's s': 'ESSE ESSE',
            'srl': 'S.R.L.',
            's.r.l': 'S.R.L.',
            'spa': 'S.P.A.',
            's.p.a': 'S.P.A.',
            'snc': 'S.N.C.',
            's.n.c': 'S.N.C.',
            'sas': 'S.A.S.',
            's.a.s': 'S.A.S.',
            'az': 'AZIENDA',
            'az.': 'AZIENDA',
            'agr': 'AGRICOLA',
            'agr.': 'AGRICOLA',
            'coop': 'COOPERATIVA',
            'coop.': 'COOPERATIVA'
        };
        
        // Correzioni fonetiche comuni
        this.phoneticCorrections = {
            // Lettere dell'alfabeto fonetico italiano
            'a di ancona': 'A',
            'b di bologna': 'B', 
            'c di como': 'C',
            'd di domodossola': 'D',
            'e di empoli': 'E',
            'f di firenze': 'F',
            'g di genova': 'G',
            'h di hotel': 'H',
            'i di imola': 'I',
            'l di livorno': 'L',
            'm di milano': 'M',
            'n di napoli': 'N',
            'o di otranto': 'O',
            'p di palermo': 'P',
            'q di quadro': 'Q',
            'r di roma': 'R',
            's di savona': 'S',
            't di torino': 'T',
            'u di udine': 'U',
            'v di venezia': 'V',
            'z di zara': 'Z',
            // Varianti comuni
            'd come domodossola': 'D',
            't come torino': 'T',
            'ti di torino': 'T'
        };
        
        // Nomi clienti comuni con varianti
        this.clientAliases = new Map([
            ['donac', ['DONAC', 'TONAC', 'D.O.N.A.C.', 'T.O.N.A.C.']],
            ['esse emme', ['SM', 'S.M.', 'S M', 'ESSE EMME', 'ESSEMME']],
            ['alimentari rossi', ['ROSSI', 'ALIMENTARI ROSSI', 'ROSSI ALIMENTARI']],
            ['bar centrale', ['CENTRALE', 'BAR CENTRALE', 'BAR CENTR.']],
            ['supermercati coop', ['COOP', 'SUPERMERCATI COOP', 'COOP SUPERMERCATI']]
        ]);
        
        // Pattern per identificare elementi da normalizzare
        this.patterns = {
            phoneticAlphabet: /([a-z])\s+(?:di|come)\s+([a-z]+)/gi,
            abbreviation: /\b([a-z]{1,4}\.?(?:\s*[a-z]\.?)*)\b/gi,
            multipleSpaces: /\s{2,}/g,
            punctuationEnd: /[.,;:!?]+$/g,
            apostrophe: /['\']/g,
            dash: /[\-–—]/g
        };
        
        // Cache per performance
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 minuti
    }
    
    /**
     * Normalizza un input generico
     */
    normalize(input, type = 'generic') {
        if (!input || typeof input !== 'string') {
            return input;
        }
        
        // Check cache
        const cacheKey = `${type}:${input}`;
        const cached = this.getFromCache(cacheKey);
        if (cached !== null) {
            return cached;
        }
        
        let normalized = input;
        
        switch (type) {
            case 'client':
                normalized = this.normalizeClientName(input);
                break;
            case 'product':
                normalized = this.normalizeProductName(input);
                break;
            case 'location':
                normalized = this.normalizeLocation(input);
                break;
            case 'date':
                normalized = this.normalizeDate(input);
                break;
            default:
                normalized = this.normalizeGeneric(input);
        }
        
        // Save to cache
        this.saveToCache(cacheKey, normalized);
        
        return normalized;
    }
    
    /**
     * Normalizza nome cliente con gestione avanzata
     */
    normalizeClientName(name) {
        if (!name) return '';
        
        let normalized = name.trim();
        
        // Step 1: Correggi elementi fonetici
        normalized = this.correctPhonetic(normalized);
        
        // Step 2: Espandi abbreviazioni
        normalized = this.expandAbbreviations(normalized);
        
        // Step 3: Normalizza formato
        normalized = this.normalizeFormat(normalized);
        
        // Step 4: Cerca alias conosciuti
        const alias = this.findBestAlias(normalized);
        if (alias) {
            normalized = alias;
        }
        
        // Step 5: Capitalizzazione intelligente
        normalized = this.smartCapitalize(normalized);
        
        console.log(`📝 Normalizzazione cliente: "${name}" → "${normalized}"`);
        
        return normalized;
    }
    
    /**
     * Corregge elementi fonetici nel testo
     */
    correctPhonetic(text) {
        let corrected = text.toLowerCase();
        
        // Correggi pattern fonetici completi
        for (const [pattern, replacement] of Object.entries(this.phoneticCorrections)) {
            const regex = new RegExp(pattern, 'gi');
            corrected = corrected.replace(regex, replacement);
        }
        
        // Correggi pattern fonetici con regex
        corrected = corrected.replace(this.patterns.phoneticAlphabet, (match, letter, word) => {
            const key = `${letter} di ${word}`.toLowerCase();
            return this.phoneticCorrections[key] || match;
        });
        
        return corrected;
    }
    
    /**
     * Espande abbreviazioni comuni
     */
    expandAbbreviations(text) {
        let expanded = text.toLowerCase();
        
        // Prima passa: abbreviazioni esatte
        for (const [abbr, expansion] of Object.entries(this.abbreviations)) {
            const regex = new RegExp(`\\b${abbr.replace(/\./g, '\\.?')}\\b`, 'gi');
            expanded = expanded.replace(regex, expansion);
        }
        
        return expanded;
    }
    
    /**
     * Normalizza formato generale
     */
    normalizeFormat(text) {
        return text
            // Rimuovi spazi multipli
            .replace(this.patterns.multipleSpaces, ' ')
            // Rimuovi punteggiatura finale
            .replace(this.patterns.punctuationEnd, '')
            // Normalizza apostrofi
            .replace(this.patterns.apostrophe, "'")
            // Normalizza trattini
            .replace(this.patterns.dash, '-')
            // Trim
            .trim();
    }
    
    /**
     * Trova il miglior alias per un nome cliente
     */
    findBestAlias(name) {
        const normalizedInput = name.toLowerCase();
        
        for (const [canonical, aliases] of this.clientAliases) {
            // Check nome canonico
            if (normalizedInput === canonical.toLowerCase()) {
                return canonical.toUpperCase();
            }
            
            // Check aliases
            for (const alias of aliases) {
                if (normalizedInput === alias.toLowerCase() ||
                    normalizedInput.includes(alias.toLowerCase()) ||
                    alias.toLowerCase().includes(normalizedInput)) {
                    return canonical.toUpperCase();
                }
            }
        }
        
        return null;
    }
    
    /**
     * Capitalizzazione intelligente
     */
    smartCapitalize(text) {
        // Parole che rimangono minuscole
        const lowercaseWords = ['di', 'dei', 'del', 'della', 'delle', 'da', 'e', 'il', 'la', 'lo', 'gli', 'le'];
        
        // Parole che devono essere maiuscole
        const uppercaseWords = ['srl', 'spa', 'snc', 'sas', 'dop', 'igp', 'doc', 'iva'];
        
        return text.split(' ').map((word, index) => {
            const lowerWord = word.toLowerCase();
            
            // Prima parola sempre maiuscola
            if (index === 0) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            
            // Parole da mantenere minuscole
            if (lowercaseWords.includes(lowerWord)) {
                return lowerWord;
            }
            
            // Parole da rendere maiuscole
            if (uppercaseWords.includes(lowerWord)) {
                return word.toUpperCase();
            }
            
            // Sigle (tutte maiuscole se <= 3 caratteri)
            if (word.length <= 3 && /^[A-Za-z]+$/.test(word)) {
                return word.toUpperCase();
            }
            
            // Default: prima lettera maiuscola
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    }
    
    /**
     * Normalizza nome prodotto
     */
    normalizeProductName(name) {
        if (!name) return '';
        
        let normalized = name.trim();
        
        // Rimuovi codici prodotto se presenti
        normalized = normalized.replace(/^\d+\s*-\s*/, '');
        normalized = normalized.replace(/\s*\[\d+\]$/, '');
        
        // Normalizza unità di misura
        normalized = normalized.replace(/\bkg\b/gi, 'Kg');
        normalized = normalized.replace(/\blt\b/gi, 'Lt');
        normalized = normalized.replace(/\bpz\b/gi, 'Pz');
        normalized = normalized.replace(/\bgr\b/gi, 'Gr');
        
        // Capitalizzazione
        normalized = this.smartCapitalize(normalized);
        
        return normalized;
    }
    
    /**
     * Normalizza località
     */
    normalizeLocation(location) {
        if (!location) return '';
        
        let normalized = location.trim();
        
        // Espandi abbreviazioni comuni
        normalized = normalized.replace(/\bv\.le\b/gi, 'Viale');
        normalized = normalized.replace(/\bv\.\b/gi, 'Via');
        normalized = normalized.replace(/\bp\.zza\b/gi, 'Piazza');
        normalized = normalized.replace(/\bp\.za\b/gi, 'Piazza');
        normalized = normalized.replace(/\bp\.le\b/gi, 'Piazzale');
        normalized = normalized.replace(/\bc\.so\b/gi, 'Corso');
        
        // Capitalizzazione intelligente
        normalized = this.smartCapitalize(normalized);
        
        return normalized;
    }
    
    /**
     * Normalizza date
     */
    normalizeDate(date) {
        if (!date) return '';
        
        // Vari formati di data italiana
        const patterns = [
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
            /(\d{1,2})-(\d{1,2})-(\d{4})/,     // DD-MM-YYYY
            /(\d{4})\/(\d{1,2})\/(\d{1,2})/,   // YYYY/MM/DD
            /(\d{4})-(\d{1,2})-(\d{1,2})/      // YYYY-MM-DD
        ];
        
        for (const pattern of patterns) {
            const match = date.match(pattern);
            if (match) {
                // Converti sempre in formato DD/MM/YYYY
                if (match[1].length === 4) {
                    // Anno all'inizio
                    return `${match[3].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[1]}`;
                } else {
                    // Giorno all'inizio
                    return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`;
                }
            }
        }
        
        return date;
    }
    
    /**
     * Normalizzazione generica
     */
    normalizeGeneric(text) {
        return this.normalizeFormat(text);
    }
    
    /**
     * Suggerisce correzioni per input non riconosciuti
     */
    suggestCorrections(input, candidates) {
        const normalized = this.normalize(input, 'client');
        const suggestions = [];
        
        // Calcola distanza di Levenshtein per ogni candidato
        for (const candidate of candidates) {
            const distance = this.levenshteinDistance(normalized.toLowerCase(), candidate.toLowerCase());
            const similarity = 1 - (distance / Math.max(normalized.length, candidate.length));
            
            if (similarity > 0.6) {
                suggestions.push({
                    value: candidate,
                    similarity: similarity,
                    distance: distance
                });
            }
        }
        
        // Ordina per similarità
        suggestions.sort((a, b) => b.similarity - a.similarity);
        
        return suggestions.slice(0, 3);
    }
    
    /**
     * Calcola distanza di Levenshtein
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Cache management
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }
    
    saveToCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Pulizia cache se troppo grande
        if (this.cache.size > 1000) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }
    
    /**
     * Aggiorna alias clienti da database
     */
    updateClientAliases(aliases) {
        for (const [client, aliasList] of Object.entries(aliases)) {
            this.clientAliases.set(client.toLowerCase(), aliasList);
        }
        console.log(`✅ Aggiornati ${Object.keys(aliases).length} alias clienti`);
    }
}

// Esporta la classe
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataNormalizationSystem;
}