-- Ottimizzazioni per ordinamento cronologico
-- Da eseguire nel dashboard Supabase (sezione SQL Editor)

-- Index composito per ordinamento veloce
CREATE INDEX IF NOT EXISTS idx_ordini_cronologico 
ON archivio_ordini_venduto(data_ordine ASC, numero_ordine ASC);

-- Index per ricerche per mese
CREATE INDEX IF NOT EXISTS idx_ordini_mese 
ON archivio_ordini_venduto(EXTRACT(YEAR FROM data_ordine), EXTRACT(MONTH FROM data_ordine));

-- Index per ricerche per cliente e data
CREATE INDEX IF NOT EXISTS idx_ordini_cliente_data 
ON archivio_ordini_venduto(cliente, data_ordine ASC);

-- Function per ordinamento automatico (opzionale)
CREATE OR REPLACE FUNCTION get_ordini_cronologici(
    limit_rows INTEGER DEFAULT 100,
    offset_rows INTEGER DEFAULT 0
)
RETURNS TABLE(
    id TEXT,
    numero_ordine TEXT,
    data_ordine DATE,
    cliente TEXT,
    indirizzo_consegna TEXT,
    partita_iva TEXT,
    data_consegna DATE,
    codice_prodotto TEXT,
    prodotto TEXT,
    quantita DECIMAL(10,3),
    prezzo_unitario DECIMAL(10,2),
    sconto_merce DECIMAL(10,3),
    sconto_percentuale DECIMAL(5,2),
    importo DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        id, numero_ordine, data_ordine, cliente, indirizzo_consegna,
        partita_iva, data_consegna, codice_prodotto, prodotto,
        quantita, prezzo_unitario, sconto_merce, sconto_percentuale,
        importo, created_at, updated_at
    FROM archivio_ordini_venduto
    ORDER BY data_ordine ASC, numero_ordine ASC, codice_prodotto ASC
    LIMIT limit_rows OFFSET offset_rows;
$$;

COMMENT ON FUNCTION get_ordini_cronologici IS 'Funzione per recuperare ordini in ordine cronologico con paginazione';