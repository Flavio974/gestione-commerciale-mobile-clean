-- Script per aggiornare la tabella percorsi con il nuovo formato
-- PARTENZA, ARRIVO, MINUTI, CHILOMETRI, ChiaveUnivoca, Cordinate_Gps_Partenza, Cordinate_Gps_Arrivo

-- La struttura attuale è già compatibile, ma aggiungiamo alcuni miglioramenti

-- 1. Assicuriamoci che la chiave_univoca sia davvero unica
ALTER TABLE percorsi DROP CONSTRAINT IF EXISTS percorsi_chiave_univoca_key;
ALTER TABLE percorsi ADD CONSTRAINT percorsi_chiave_univoca_unique UNIQUE (chiave_univoca);

-- 2. Aggiungiamo indici per le coordinate GPS per ricerche geografiche
CREATE INDEX IF NOT EXISTS idx_percorsi_coord_partenza ON percorsi(coord_partenza);
CREATE INDEX IF NOT EXISTS idx_percorsi_coord_arrivo ON percorsi(coord_arrivo);

-- 3. Aggiungiamo indice composito per ricerche partenza-arrivo
CREATE INDEX IF NOT EXISTS idx_percorsi_partenza_arrivo ON percorsi(partenza, arrivo);

-- 4. Aggiungiamo commenti aggiornati per il nuovo formato
COMMENT ON COLUMN percorsi.partenza IS 'Luogo di partenza dal file (colonna PARTENZA)';
COMMENT ON COLUMN percorsi.arrivo IS 'Luogo di arrivo dal file (colonna ARRIVO)';
COMMENT ON COLUMN percorsi.km IS 'Distanza in chilometri dal file (colonna CHILOMETRI)';
COMMENT ON COLUMN percorsi.minuti IS 'Tempo di percorrenza in minuti dal file (colonna MINUTI)';
COMMENT ON COLUMN percorsi.chiave_univoca IS 'Chiave univoca dal file (colonna ChiaveUnivoca)';
COMMENT ON COLUMN percorsi.coord_partenza IS 'Coordinate GPS di partenza dal file (colonna Cordinate_Gps_Partenza)';
COMMENT ON COLUMN percorsi.coord_arrivo IS 'Coordinate GPS di arrivo dal file (colonna Cordinate_Gps_Arrivo)';

-- 5. Funzione per calcolare la distanza tra due punti GPS (haversine)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 FLOAT, lon1 FLOAT, 
    lat2 FLOAT, lon2 FLOAT
) RETURNS FLOAT AS $$
DECLARE
    r FLOAT := 6371; -- Raggio della Terra in km
    dlat FLOAT;
    dlon FLOAT;
    a FLOAT;
    c FLOAT;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN r * c;
END;
$$ LANGUAGE plpgsql;

-- 6. View per percorsi con distanze calcolate (se coordinate disponibili)
CREATE OR REPLACE VIEW percorsi_with_calculated_distance AS
SELECT 
    *,
    CASE 
        WHEN coord_partenza IS NOT NULL AND coord_arrivo IS NOT NULL 
        AND coord_partenza ~ '^\d+\.?\d*,\d+\.?\d*$'
        AND coord_arrivo ~ '^\d+\.?\d*,\d+\.?\d*$' THEN
            calculate_distance(
                split_part(coord_partenza, ',', 2)::FLOAT,
                split_part(coord_partenza, ',', 1)::FLOAT,
                split_part(coord_arrivo, ',', 2)::FLOAT,
                split_part(coord_arrivo, ',', 1)::FLOAT
            )
        ELSE NULL
    END as calculated_distance_km
FROM percorsi;

COMMENT ON VIEW percorsi_with_calculated_distance IS 'View che include la distanza calcolata dalle coordinate GPS quando disponibili';

-- 7. Statistiche sui percorsi
CREATE OR REPLACE VIEW percorsi_stats AS
SELECT 
    COUNT(*) as total_percorsi,
    AVG(km) as avg_km,
    AVG(minuti) as avg_minuti,
    MIN(data) as first_date,
    MAX(data) as last_date,
    COUNT(DISTINCT partenza) as unique_partenze,
    COUNT(DISTINCT arrivo) as unique_arrivi,
    COUNT(*) FILTER (WHERE coord_partenza IS NOT NULL AND coord_arrivo IS NOT NULL) as percorsi_with_coordinates
FROM percorsi;

COMMENT ON VIEW percorsi_stats IS 'Statistiche generali sui percorsi importati';