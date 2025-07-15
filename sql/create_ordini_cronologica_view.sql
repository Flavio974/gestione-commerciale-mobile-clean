-- Vista per visualizzare ordini in ordine cronologico
-- Da eseguire nel dashboard Supabase (sezione SQL Editor)

-- Crea vista ordinata cronologicamente
CREATE OR REPLACE VIEW ordini_cronologici AS
SELECT 
  id,
  numero_ordine,
  data_ordine,
  cliente,
  indirizzo_consegna,
  partita_iva,
  data_consegna,
  codice_prodotto,
  prodotto,
  quantita,
  prezzo_unitario,
  sconto_merce,
  sconto_percentuale,
  importo,
  created_at,
  updated_at
FROM archivio_ordini_venduto
ORDER BY 
  data_ordine ASC,           -- Prima per data ordine
  numero_ordine ASC,         -- Poi per numero ordine
  codice_prodotto ASC;       -- Infine per codice prodotto

-- Commento per la vista
COMMENT ON VIEW ordini_cronologici IS 'Vista degli ordini ordinata cronologicamente per data_ordine';

-- Vista per statistiche cronologiche rapide
CREATE OR REPLACE VIEW ordini_stats_mensili AS
SELECT 
  TO_CHAR(data_ordine, 'YYYY-MM') as mese_anno,
  COUNT(DISTINCT numero_ordine) as totale_ordini,
  COUNT(*) as totale_righe,
  SUM(quantita) as quantita_totale,
  SUM(importo) as importo_totale,
  COUNT(DISTINCT cliente) as clienti_unici,
  MIN(data_ordine) as prima_data,
  MAX(data_ordine) as ultima_data
FROM archivio_ordini_venduto
WHERE data_ordine IS NOT NULL
GROUP BY TO_CHAR(data_ordine, 'YYYY-MM')
ORDER BY mese_anno ASC;

COMMENT ON VIEW ordini_stats_mensili IS 'Statistiche mensili ordini ordinate cronologicamente';