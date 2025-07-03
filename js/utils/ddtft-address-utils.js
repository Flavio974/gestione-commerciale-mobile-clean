/**
 * Utilities specializzate per gestione indirizzi DDT-FT
 * Estrazione, validazione e normalizzazione indirizzi
 */

window.DDTFTAddressUtils = (function() {
    'use strict';
    
    /**
     * Pattern per identificare indirizzi di vettori/trasportatori
     */
    const VETTORE_PATTERNS = [
        // Pattern specifici per vettori noti
        'SUPEJA GALLINO',
        'SUPEJA',
        'GALLINO',
        'SAFFIRIO FLAVIO',
        'SAFFIRIO',
        'S.A.F.I.M.',
        'SAFIM',
        '10060 NONE',
        'NONE TO',
        
        // Pattern generici vettori
        'TRASPORTATORE',
        'VETTORE',
        'CORRIERE',
        'AUTOTRASPORTI',
        'SPEDIZIONI',
        'TRASPORTI',
        'LOGISTICA',
        
        // Corrieri conosciuti
        'DHL', 'TNT', 'BARTOLINI', 'GLS', 'SDA', 'BRT',
        'FEDEX', 'UPS', 'NEXIVE', 'POSTE ITALIANE',
        'SPEDIZIONIERE', 'CARGO', 'EXPRESS'
    ];
    
    /**
     * Mappatura indirizzi fissi per clienti speciali
     */
    const FIXED_CLIENT_ADDRESSES = {
        'CILIBERTO TERESA': 'STRADA SANTUARIO, 21/23 15020 SERRALUNGA DI CREA AL',
        'LONGO ILARIO': 'VIA NAZIONALE, 34 15020 CERRINA MONFERRATO AL',
        'OSTERIA GALLO D\'ORO': 'VIA CHENNA, 44 15121 ALESSANDRIA AL',
        // 'DONAC S.R.L.': 'VIA SALUZZO, 65 12038 SAVIGLIANO CN', // RIMOSSO - DONAC ha più punti vendita
        'LA MANDRIA': 'VIA REPERGO, 40 14057 ISOLA D\'ASTI AT',
        'PIEMONTE CARNI': 'VIA CAVOUR, 61 14100 ASTI AT',
        'IL GUSTO': 'VIA FONTANA, 4 14100 ASTI AT',
        'MOLINETTO SALUMI': 'VIA MOLINETTO, 24 15122 ALESSANDRIA AL',
        'ARUDI MIRELLA': 'P.ZA DEL POPOLO, 3 14046 MOMBARUZZO AT',
        'AZIENDA ISABELLA': 'VIA GIANOLI, 64 15020 MURISENGO AL',
        'CANTINA DEL MONFERRATO': 'VIA REGIONE ISOLA, 2/A 15030 ROSIGNANO MONFERRATO AL',
        'PANETTERIA PISTONE': 'VIALE RISORGIMENTO, 162 14053 CANELLI AT',
        'BOTTEGA DELLA CARNE': 'VIA CHIVASSO, 7 15020 MURISENGO AL'
    };
    
    /**
     * Verifica se un indirizzo appartiene a un vettore
     */
    function isVettoreAddress(address) {
        if (!address) return false;
        
        const upperAddress = address.toUpperCase();
        
        for (const pattern of VETTORE_PATTERNS) {
            if (upperAddress.includes(pattern)) {
                console.log(`[AddressUtils] ⚠️ Indirizzo vettore rilevato: ${pattern}`);
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Ottiene indirizzo fisso per cliente speciale
     */
    function getFixedAddressForClient(clientName) {
        if (!clientName) return null;
        
        // Prova corrispondenza esatta
        if (FIXED_CLIENT_ADDRESSES[clientName]) {
            console.log(`[AddressUtils] ✅ Indirizzo fisso per ${clientName}`);
            return FIXED_CLIENT_ADDRESSES[clientName];
        }
        
        // Prova corrispondenza parziale
        const upperClient = clientName.toUpperCase();
        for (const [name, address] of Object.entries(FIXED_CLIENT_ADDRESSES)) {
            if (upperClient.includes(name.toUpperCase()) || name.toUpperCase().includes(upperClient)) {
                console.log(`[AddressUtils] ✅ Indirizzo fisso (match parziale) per ${clientName}`);
                return address;
            }
        }
        
        return null;
    }
    
    /**
     * Gestione speciale indirizzo BOREALE VIA PEROSA
     */
    function checkAndReplaceBorealeAddress(address, clientName) {
        if (!clientName || !address) return address;
        
        if ((clientName.toUpperCase().includes('BOREALE') && 
             (clientName.includes('SRL') || clientName.includes('S.R.L.')))) {
            
            if (address.toUpperCase().includes('VIA PEROSA') || 
                address.toUpperCase().includes('PEROSA')) {
                
                const fixedAddress = 'VIA CESANA, 78 10139 TORINO TO';
                console.log(`[AddressUtils] 🏠 BOREALE con VIA PEROSA - Sostituito con: ${fixedAddress}`);
                return fixedAddress;
            }
        }
        
        return address;
    }
    
    /**
     * Pulisce indirizzo rimuovendo il nome cliente se presente all'inizio
     */
    function removeClientNameFromAddress(address, clientName) {
        if (!address || !clientName) return address;
        
        if (address.startsWith(clientName)) {
            const cleaned = address.substring(clientName.length).trim();
            console.log(`[AddressUtils] 🧹 Rimosso nome cliente dall'indirizzo`);
            return cleaned;
        }
        
        return address;
    }
    
    /**
     * Estrae componenti indirizzo da una stringa
     */
    function parseAddressComponents(addressStr) {
        if (!addressStr) return null;
        
        const components = {
            street: null,
            number: null,
            cap: null,
            city: null,
            province: null
        };
        
        // Pattern per indirizzo completo italiano
        const fullPattern = /((?:VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA|LOC\.|LOCALITA'?)\s+[^,\d]+?)(?:,\s*(\d+[A-Z]?))?\s+(\d{5})\s+([A-Z][A-Z\s\-]+?)\s+([A-Z]{2})/i;
        
        const match = addressStr.match(fullPattern);
        if (match) {
            components.street = match[1].trim();
            components.number = match[2] || '';
            components.cap = match[3];
            components.city = match[4].trim();
            components.province = match[5];
        }
        
        return components;
    }
    
    /**
     * Valida e pulisce un indirizzo
     */
    function cleanAndValidateAddress(address, clientName = null) {
        if (!address) return null;
        
        // Rimuovi nome cliente se presente
        let cleaned = removeClientNameFromAddress(address, clientName);
        
        // Normalizza spazi
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        // Verifica che non sia un vettore
        if (isVettoreAddress(cleaned)) {
            console.log(`[AddressUtils] ❌ Indirizzo vettore scartato`);
            return null;
        }
        
        // Verifica validità base
        if (!window.DDTFTParsingUtils || !window.DDTFTParsingUtils.isValidAddress(cleaned)) {
            console.log(`[AddressUtils] ❌ Indirizzo non valido: ${cleaned}`);
            return null;
        }
        
        // Gestione speciale BOREALE
        cleaned = checkAndReplaceBorealeAddress(cleaned, clientName);
        
        return cleaned;
    }
    
    /**
     * Cerca indirizzo con marcatori espliciti nel testo
     */
    function findAddressByMarkers(text) {
        if (!text) return null;
        
        const markers = [
            'LUOGO DI CONSEGNA',
            'LUOGO DI DESTINAZIONE',
            'INDIRIZZO DI CONSEGNA',
            'DESTINAZIONE MERCE',
            'CONSEGNARE A',
            'DELIVERY ADDRESS',
            'SHIP TO',
            'DESTINATARIO MERCE',
            'CONSEGNA PRESSO',
            'RECAPITO CONSEGNA',
            'PUNTO DI CONSEGNA'
        ];
        
        for (const marker of markers) {
            const markerRegex = new RegExp(`${marker}[:\\s]*([^\\n]+(?:\\n[^\\n]+)*?)(?=\\n\\s*(?:${markers.join('|')}|P\\.IVA|PARTITA IVA|$))`, 'i');
            const match = text.match(markerRegex);
            
            if (match) {
                const addressSection = match[1].trim();
                console.log(`[AddressUtils] 📍 Trovato marcatore "${marker}"`);
                
                // Estrai indirizzo dalla sezione
                const addressPattern = /((?:VIA|V\.LE|VIALE|CORSO|C\.SO|PIAZZA|P\.ZA|STRADA)[^]+?\d{5}\s+[A-Z\s\-]+\s+[A-Z]{2})/i;
                const addressMatch = addressSection.match(addressPattern);
                
                if (addressMatch) {
                    return addressMatch[1].trim();
                }
            }
        }
        
        return null;
    }
    
    /**
     * Estrae indirizzo da layout a due colonne (DDT tipico)
     */
    function extractFromTwoColumnLayout(text) {
        if (!text) return null;
        
        console.log('[AddressUtils] 🔍 Tentativo estrazione da layout a due colonne');
        
        // Pattern per DDT con cliente e luogo di consegna affiancati
        const patterns = [
            // Pattern base
            /Cliente\s+Luogo di consegna\s*\n([^\n]+)\s+([^\n]+)\s*\n([^\n]+)\s+([^\n]+)\s*\n([^\n]+)\s+([^\n]+)/i,
            
            // Pattern con più righe
            /Cliente\s+Luogo di consegna\s*\n((?:[^\n]+\n){1,5})/i
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                if (pattern === patterns[0]) {
                    // Pattern specifico - colonna destra è il luogo di consegna
                    const viaConsegna = match[4] ? match[4].trim() : '';
                    const capCittaConsegna = match[6] ? match[6].trim() : '';
                    
                    if (viaConsegna && capCittaConsegna) {
                        const address = `${viaConsegna} ${capCittaConsegna}`;
                        console.log(`[AddressUtils] ✅ Indirizzo da layout due colonne: ${address}`);
                        return address;
                    }
                } else {
                    // Pattern generico - analizza le righe
                    const lines = match[1].split('\n');
                    const rightColumnParts = [];
                    
                    for (const line of lines) {
                        // Dividi in base a spazi multipli o posizione
                        const parts = line.split(/\s{3,}/);
                        if (parts.length >= 2) {
                            rightColumnParts.push(parts[parts.length - 1].trim());
                        }
                    }
                    
                    if (rightColumnParts.length >= 2) {
                        const address = rightColumnParts.join(' ');
                        console.log(`[AddressUtils] ✅ Indirizzo da colonna destra: ${address}`);
                        return address;
                    }
                }
            }
        }
        
        return null;
    }
    
    // Esporta le funzioni
    return {
        // Validazione
        isVettoreAddress,
        
        // Indirizzi fissi
        getFixedAddressForClient,
        FIXED_CLIENT_ADDRESSES,
        
        // Pulizia e validazione
        cleanAndValidateAddress,
        checkAndReplaceBorealeAddress,
        removeClientNameFromAddress,
        
        // Estrazione
        parseAddressComponents,
        findAddressByMarkers,
        extractFromTwoColumnLayout
    };
})();

console.log('✅ DDTFTAddressUtils caricato con successo');