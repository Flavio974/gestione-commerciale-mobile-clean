-- Tabella per i percorsi
CREATE TABLE percorsi (
  id BIGSERIAL PRIMARY KEY,
  data DATE NOT NULL,
  partenza TEXT NOT NULL,
  arrivo TEXT NOT NULL,
  km DECIMAL(10,2),
  minuti INTEGER,
  durata TEXT,
  chiave_univoca TEXT UNIQUE,
  coord_partenza TEXT,
  coord_arrivo TEXT,
  imported_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indici per migliorare le performance
CREATE INDEX idx_percorsi_data ON percorsi(data);
CREATE INDEX idx_percorsi_partenza ON percorsi(partenza);
CREATE INDEX idx_percorsi_arrivo ON percorsi(arrivo);
CREATE INDEX idx_percorsi_chiave_univoca ON percorsi(chiave_univoca);

-- Commenti per documentare la tabella
COMMENT ON TABLE percorsi IS 'Tabella contenente i percorsi di viaggio con tempi e distanze';
COMMENT ON COLUMN percorsi.data IS 'Data del percorso';
COMMENT ON COLUMN percorsi.partenza IS 'Luogo di partenza (idOrigine)';
COMMENT ON COLUMN percorsi.arrivo IS 'Luogo di arrivo (idDestinazione)';
COMMENT ON COLUMN percorsi.km IS 'Distanza in chilometri';
COMMENT ON COLUMN percorsi.minuti IS 'Tempo di percorrenza in minuti';
COMMENT ON COLUMN percorsi.durata IS 'Durata formattata (HH:MM)';
COMMENT ON COLUMN percorsi.chiave_univoca IS 'Chiave univoca per identificare il percorso';
COMMENT ON COLUMN percorsi.coord_partenza IS 'Coordinate GPS di partenza (Longitudine-Latitudine)';
COMMENT ON COLUMN percorsi.coord_arrivo IS 'Coordinate GPS di arrivo (Longitudine-Latitudine)';