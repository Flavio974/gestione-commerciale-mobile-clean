-- Tabella per archivio storico ordini venduto
-- Da eseguire nel dashboard Supabase (sezione SQL Editor)

CREATE TABLE IF NOT EXISTS archivio_ordini_venduto (
  id TEXT PRIMARY KEY,                    -- ID univoco: numero_ordine_codice_prodotto
  numero_ordine TEXT NOT NULL,           -- Numero ordine
  data_ordine DATE,                      -- Data ordine
  cliente TEXT NOT NULL,                 -- Nome cliente
  indirizzo_consegna TEXT,               -- Indirizzo di consegna
  partita_iva TEXT,                      -- Partita IVA cliente
  data_consegna DATE,                    -- Data consegna prevista
  codice_prodotto TEXT NOT NULL,         -- Codice prodotto
  prodotto TEXT,                         -- Descrizione prodotto
  quantita DECIMAL(10,3) DEFAULT 0,      -- Quantità ordinata
  prezzo_unitario DECIMAL(10,2) DEFAULT 0, -- Prezzo unitario
  sconto_merce DECIMAL(10,3) DEFAULT 0,  -- Sconto merce (S.M.)
  sconto_percentuale DECIMAL(5,2) DEFAULT 0, -- Sconto percentuale
  importo DECIMAL(10,2) DEFAULT 0,       -- Importo totale riga
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Data inserimento
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- Data ultimo aggiornamento
);

-- Indici per ottimizzare le query
CREATE INDEX IF NOT EXISTS idx_archivio_ordini_numero_ordine ON archivio_ordini_venduto(numero_ordine);
CREATE INDEX IF NOT EXISTS idx_archivio_ordini_cliente ON archivio_ordini_venduto(cliente);
CREATE INDEX IF NOT EXISTS idx_archivio_ordini_data_ordine ON archivio_ordini_venduto(data_ordine);
CREATE INDEX IF NOT EXISTS idx_archivio_ordini_codice_prodotto ON archivio_ordini_venduto(codice_prodotto);
CREATE INDEX IF NOT EXISTS idx_archivio_ordini_created_at ON archivio_ordini_venduto(created_at);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_archivio_ordini_venduto_updated_at
    BEFORE UPDATE ON archivio_ordini_venduto
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Commenti per documentazione
COMMENT ON TABLE archivio_ordini_venduto IS 'Archivio storico degli ordini venduto per analisi AI';
COMMENT ON COLUMN archivio_ordini_venduto.id IS 'ID univoco formato da numero_ordine_codice_prodotto';
COMMENT ON COLUMN archivio_ordini_venduto.numero_ordine IS 'Numero identificativo ordine';
COMMENT ON COLUMN archivio_ordini_venduto.cliente IS 'Nome del cliente';
COMMENT ON COLUMN archivio_ordini_venduto.codice_prodotto IS 'Codice identificativo prodotto';
COMMENT ON COLUMN archivio_ordini_venduto.quantita IS 'Quantità ordinata (supporta decimali per KG, LT, etc.)';
COMMENT ON COLUMN archivio_ordini_venduto.importo IS 'Importo totale riga (quantità * prezzo - sconti)';

-- Vista per statistiche rapide
CREATE OR REPLACE VIEW archivio_ordini_stats AS
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT numero_ordine) as total_orders,
  COUNT(DISTINCT cliente) as total_clients,
  COUNT(DISTINCT codice_prodotto) as total_products,
  SUM(importo) as total_amount,
  MIN(data_ordine) as first_order_date,
  MAX(data_ordine) as last_order_date,
  MAX(created_at) as last_sync_date
FROM archivio_ordini_venduto;

COMMENT ON VIEW archivio_ordini_stats IS 'Vista per statistiche rapide dell''archivio ordini';