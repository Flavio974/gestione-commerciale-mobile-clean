-- Tabella per salvare le note vocali analizzate dall'AI
-- Smart Assistant - GestioneCommerciale

-- Drop table se esiste (opzionale, rimuovi in produzione)
-- DROP TABLE IF EXISTS note_ai;

-- Crea tabella note_ai
CREATE TABLE IF NOT EXISTS note_ai (
  -- ID univoco autogenerato
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Testo trascritto dalla nota vocale
  testo_originale TEXT NOT NULL,
  
  -- Array di persone menzionate nella nota
  persone TEXT[] DEFAULT '{}',
  
  -- Array di aziende menzionate nella nota
  aziende TEXT[] DEFAULT '{}',
  
  -- Categoria della nota (es: clienti, fornitori, pensieri, libri, video)
  categoria VARCHAR(50) DEFAULT 'pensieri',
  
  -- Priorità della nota
  priorita VARCHAR(10) CHECK (priorita IN ('urgente', 'alta', 'media', 'bassa')) DEFAULT 'media',
  
  -- Array di azioni rilevate (es: chiamare, whatsapp, ordinare, email, reminder)
  azioni TEXT[] DEFAULT '{}',
  
  -- Date e riferimenti temporali rilevati nella nota
  date_rilevate JSONB DEFAULT '{}',
  
  -- Timestamp creazione nota
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Origine della nota (per distinguere da altre fonti future)
  origine VARCHAR(50) DEFAULT 'smart_assistant_vocale',
  
  -- Audio base64 (opzionale, per salvare l'audio originale)
  audio_base64 TEXT,
  
  -- Metadata aggiuntivi (JSON per estensibilità futura)
  metadata JSONB DEFAULT '{}',
  
  -- Tracking timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_note_ai_timestamp ON note_ai(timestamp DESC);
CREATE INDEX idx_note_ai_categoria ON note_ai(categoria);
CREATE INDEX idx_note_ai_priorita ON note_ai(priorita);
CREATE INDEX idx_note_ai_origine ON note_ai(origine);
CREATE INDEX idx_note_ai_persone ON note_ai USING GIN(persone);
CREATE INDEX idx_note_ai_aziende ON note_ai USING GIN(aziende);
CREATE INDEX idx_note_ai_azioni ON note_ai USING GIN(azioni);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_note_ai_updated_at BEFORE UPDATE ON note_ai
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commenti sulla tabella e colonne
COMMENT ON TABLE note_ai IS 'Note vocali trascritte e analizzate dal Smart Assistant';
COMMENT ON COLUMN note_ai.testo_originale IS 'Trascrizione completa della nota vocale';
COMMENT ON COLUMN note_ai.persone IS 'Array di nomi di persone menzionate nella nota';
COMMENT ON COLUMN note_ai.aziende IS 'Array di nomi di aziende menzionate nella nota';
COMMENT ON COLUMN note_ai.categoria IS 'Categoria della nota: clienti, fornitori, contatti_business, pensieri, libri, video';
COMMENT ON COLUMN note_ai.priorita IS 'Priorità assegnata: urgente, alta, media, bassa';
COMMENT ON COLUMN note_ai.azioni IS 'Azioni rilevate: chiamare, whatsapp, ordinare, email, reminder';
COMMENT ON COLUMN note_ai.date_rilevate IS 'JSON con riferimenti temporali, date specifiche e scadenze estratte dalla nota';
COMMENT ON COLUMN note_ai.audio_base64 IS 'Audio originale codificato in base64 (opzionale)';

-- Politiche RLS (Row Level Security) - opzionali
-- ALTER TABLE note_ai ENABLE ROW LEVEL SECURITY;

-- Esempio di policy per accesso pubblico (modifica secondo necessità)
-- CREATE POLICY "Enable read access for all users" ON note_ai
--     FOR SELECT USING (true);

-- CREATE POLICY "Enable insert for authenticated users only" ON note_ai
--     FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Grant permissions (modifica secondo necessità)
-- GRANT ALL ON note_ai TO authenticated;
-- GRANT SELECT ON note_ai TO anon;