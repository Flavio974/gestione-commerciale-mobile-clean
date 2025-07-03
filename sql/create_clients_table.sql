-- Creazione tabella clienti in Supabase
-- Basata sul formato di importazione Excel

CREATE TABLE IF NOT EXISTS clients (
    id BIGSERIAL PRIMARY KEY,
    codice_cliente TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    contatto TEXT,
    via TEXT,
    numero TEXT,
    cap TEXT,
    citta TEXT,
    provincia TEXT,
    zona TEXT,
    telefono TEXT,
    priorita TEXT CHECK (priorita IN ('alta', 'media', 'bassa')),
    giorno_chiusura TEXT,
    giorno_da_evitare TEXT,
    ultima_visita DATE,
    momento_preferito TEXT CHECK (momento_preferito IN ('mattina', 'pomeriggio', 'sera', NULL)),
    tempo_visita_minuti INTEGER DEFAULT 30,
    frequenza_visite_giorni INTEGER DEFAULT 30,
    stato TEXT DEFAULT 'attivo' CHECK (stato IN ('attivo', 'inattivo')),
    note TEXT,
    -- Coordinate GPS per future integrazioni con mappe
    latitudine DECIMAL(10, 8),
    longitudine DECIMAL(11, 8),
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    imported_at TIMESTAMP WITH TIME ZONE
);

-- Indici per performance
CREATE INDEX idx_clients_codice ON clients(codice_cliente);
CREATE INDEX idx_clients_nome ON clients(nome);
CREATE INDEX idx_clients_citta ON clients(citta);
CREATE INDEX idx_clients_zona ON clients(zona);
CREATE INDEX idx_clients_priorita ON clients(priorita);
CREATE INDEX idx_clients_stato ON clients(stato);
CREATE INDEX idx_clients_ultima_visita ON clients(ultima_visita);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE
    ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commenti per documentazione
COMMENT ON TABLE clients IS 'Tabella clienti con tutti i dati importati da Excel';
COMMENT ON COLUMN clients.codice_cliente IS 'Codice univoco del cliente (da colonna CODICE CLIENTE)';
COMMENT ON COLUMN clients.nome IS 'Nome o ragione sociale del cliente (da colonna NOME)';
COMMENT ON COLUMN clients.contatto IS 'Persona di contatto (da colonna CONTATTO)';
COMMENT ON COLUMN clients.via IS 'Via dell''indirizzo (da colonna VIA)';
COMMENT ON COLUMN clients.numero IS 'Numero civico (da colonna NUMERO)';
COMMENT ON COLUMN clients.cap IS 'Codice di avviamento postale (da colonna CAP)';
COMMENT ON COLUMN clients.citta IS 'Città (da colonna CITTA'')';
COMMENT ON COLUMN clients.provincia IS 'Provincia (da colonna PROVINCIA)';
COMMENT ON COLUMN clients.zona IS 'Zona commerciale (da colonna ZONA)';
COMMENT ON COLUMN clients.telefono IS 'Numero di telefono (da colonna TELEFONO)';
COMMENT ON COLUMN clients.priorita IS 'Priorità cliente: alta, media, bassa (da colonna PRIORITA'')';
COMMENT ON COLUMN clients.giorno_chiusura IS 'Giorno di chiusura settimanale (da colonna GIORNO DI CHIUSURA)';
COMMENT ON COLUMN clients.giorno_da_evitare IS 'Giorno da evitare per visite (da colonna GIORNO DA EVITARE)';
COMMENT ON COLUMN clients.ultima_visita IS 'Data ultima visita (da colonna ULTIMA VISITA)';
COMMENT ON COLUMN clients.momento_preferito IS 'Momento preferito per visite: mattina, pomeriggio, sera (da colonna MOMENTO PREFERITO)';
COMMENT ON COLUMN clients.tempo_visita_minuti IS 'Durata media visita in minuti (da colonna tempo di visita minuti)';
COMMENT ON COLUMN clients.frequenza_visite_giorni IS 'Frequenza visite in giorni (da colonna frequenza visite in giorni)';
COMMENT ON COLUMN clients.stato IS 'Stato del cliente: attivo o inattivo';
COMMENT ON COLUMN clients.note IS 'Note aggiuntive sul cliente';

-- Vista per statistiche clienti
CREATE OR REPLACE VIEW clients_stats AS
SELECT 
    COUNT(*) as total_clienti,
    COUNT(*) FILTER (WHERE stato = 'attivo') as clienti_attivi,
    COUNT(*) FILTER (WHERE stato = 'inattivo') as clienti_inattivi,
    COUNT(DISTINCT citta) as citta_servite,
    COUNT(DISTINCT zona) as zone_commerciali,
    COUNT(*) FILTER (WHERE priorita = 'alta') as clienti_priorita_alta,
    COUNT(*) FILTER (WHERE priorita = 'media') as clienti_priorita_media,
    COUNT(*) FILTER (WHERE priorita = 'bassa') as clienti_priorita_bassa,
    COUNT(*) FILTER (WHERE ultima_visita IS NOT NULL) as clienti_visitati,
    COUNT(*) FILTER (WHERE ultima_visita >= CURRENT_DATE - INTERVAL '30 days') as visite_ultimo_mese
FROM clients;

COMMENT ON VIEW clients_stats IS 'Statistiche aggregate sui clienti';

-- Vista per clienti da visitare
CREATE OR REPLACE VIEW clients_da_visitare AS
SELECT 
    *,
    CASE 
        WHEN ultima_visita IS NULL THEN 'Mai visitato'
        WHEN ultima_visita + (frequenza_visite_giorni || ' days')::INTERVAL < CURRENT_DATE THEN 'Visita scaduta'
        WHEN ultima_visita + (frequenza_visite_giorni || ' days')::INTERVAL < CURRENT_DATE + INTERVAL '7 days' THEN 'Visita in scadenza'
        ELSE 'Visitato recentemente'
    END as stato_visita,
    CASE 
        WHEN ultima_visita IS NULL THEN NULL
        ELSE (CURRENT_DATE - ultima_visita)
    END as giorni_da_ultima_visita,
    CASE 
        WHEN ultima_visita IS NULL THEN NULL
        ELSE ultima_visita + (frequenza_visite_giorni || ' days')::INTERVAL
    END as prossima_visita_prevista
FROM clients
WHERE stato = 'attivo'
ORDER BY 
    CASE priorita 
        WHEN 'alta' THEN 1 
        WHEN 'media' THEN 2 
        WHEN 'bassa' THEN 3 
    END,
    ultima_visita ASC NULLS FIRST;

COMMENT ON VIEW clients_da_visitare IS 'Vista dei clienti con informazioni sullo stato delle visite';