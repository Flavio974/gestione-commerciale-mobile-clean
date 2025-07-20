-- 🔐 Setup tabella per Smart Assistant Secure Notes
-- Esegui questo script nel dashboard Supabase per creare la tabella necessaria

CREATE TABLE IF NOT EXISTS smart_assistant_secure_notes (
  id BIGSERIAL PRIMARY KEY,
  note_id TEXT UNIQUE NOT NULL, -- ID originale della nota
  timestamp TIMESTAMPTZ NOT NULL, -- Quando la nota è stata processata
  category TEXT NOT NULL, -- Categoria automatica (CLIENTI, FORNITORI, etc.)
  transcription TEXT NOT NULL, -- Testo trascritto
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.00, -- Confidenza categorizzazione (0.00-1.00)
  extracted_entities JSONB DEFAULT '{}', -- Entità estratte dal testo
  keywords TEXT[] DEFAULT '{}', -- Keywords identificate
  metadata JSONB DEFAULT '{}', -- Metadati aggiuntivi (durata, livello sicurezza, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_secure_notes_category ON smart_assistant_secure_notes(category);
CREATE INDEX IF NOT EXISTS idx_secure_notes_timestamp ON smart_assistant_secure_notes(timestamp);
CREATE INDEX IF NOT EXISTS idx_secure_notes_note_id ON smart_assistant_secure_notes(note_id);
CREATE INDEX IF NOT EXISTS idx_secure_notes_transcription_fts ON smart_assistant_secure_notes USING gin(to_tsvector('italian', transcription));

-- RLS (Row Level Security) per sicurezza
ALTER TABLE smart_assistant_secure_notes ENABLE ROW LEVEL SECURITY;

-- Policy per permettere operazioni solo agli utenti autenticati
CREATE POLICY "Allow all operations for authenticated users" ON smart_assistant_secure_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger per aggiornare automatically updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_smart_assistant_secure_notes_updated_at 
  BEFORE UPDATE ON smart_assistant_secure_notes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commenti per documentazione
COMMENT ON TABLE smart_assistant_secure_notes IS 'Tabella per archiviazione sicura delle note vocali categorizzate automaticamente';
COMMENT ON COLUMN smart_assistant_secure_notes.note_id IS 'ID originale della nota dal localStorage';
COMMENT ON COLUMN smart_assistant_secure_notes.category IS 'Categoria automatica: CLIENTI, FORNITORI, PRODOTTI, VIAGGI, RIUNIONI, PERSONALE, GENERALE';
COMMENT ON COLUMN smart_assistant_secure_notes.confidence IS 'Livello di confidenza della categorizzazione automatica (0.00-1.00)';
COMMENT ON COLUMN smart_assistant_secure_notes.extracted_entities IS 'Entità estratte dal testo tramite pattern matching';
COMMENT ON COLUMN smart_assistant_secure_notes.keywords IS 'Array di keywords identificate nel contenuto';
COMMENT ON COLUMN smart_assistant_secure_notes.metadata IS 'Metadati: {duration, security_level, has_audio_backup, etc.}';

-- View per statistiche rapide
CREATE OR REPLACE VIEW smart_assistant_stats AS
SELECT 
  category,
  COUNT(*) as note_count,
  AVG(confidence) as avg_confidence,
  MAX(timestamp) as last_note_date,
  array_agg(DISTINCT unnest(keywords)) FILTER (WHERE array_length(keywords, 1) > 0) as common_keywords
FROM smart_assistant_secure_notes 
GROUP BY category;

COMMENT ON VIEW smart_assistant_stats IS 'Vista per statistiche rapide delle note sicure per categoria';

-- Esempio di query utili:

-- 1. Note per categoria
-- SELECT category, COUNT(*) FROM smart_assistant_secure_notes GROUP BY category ORDER BY COUNT(*) DESC;

-- 2. Ricerca full-text in italiano
-- SELECT * FROM smart_assistant_secure_notes 
-- WHERE to_tsvector('italian', transcription) @@ to_tsquery('italian', 'cliente & ordine');

-- 3. Note con bassa confidenza da rivedere
-- SELECT * FROM smart_assistant_secure_notes WHERE confidence < 0.5 ORDER BY timestamp DESC;

-- 4. Statistiche per periodo
-- SELECT DATE(timestamp) as date, category, COUNT(*) 
-- FROM smart_assistant_secure_notes 
-- WHERE timestamp >= NOW() - INTERVAL '7 days'
-- GROUP BY DATE(timestamp), category;

-- ✅ Setup completato!
-- Questa tabella supporta:
-- - Categorizzazione automatica sicura
-- - Ricerca full-text in italiano  
-- - Tracking della confidenza
-- - Metadati estensibili
-- - Row Level Security
-- - Performance ottimizzata con indici