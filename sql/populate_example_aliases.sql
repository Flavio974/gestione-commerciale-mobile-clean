-- Script per popolare alcuni alias di esempio
-- Eseguire dopo aver creato la tabella clients e aggiunto la colonna alias

-- Esempi di alias per clienti comuni
-- Questi sono solo esempi, sostituire con i dati reali

-- Esempio 1: ESSEMME con varie denominazioni
UPDATE clients 
SET alias = ARRAY['ESSEMME', 'ESSEMME Montegrosso', 'ESSEMME Conad', 'ESSEMME Conad Montegrosso', 'Essemme SRL', 'Essemme Conad Montegrosso']
WHERE nome ILIKE '%essemme%' 
  AND (alias IS NULL OR array_length(alias, 1) IS NULL);

-- Esempio 2: DONAC con variazioni
UPDATE clients 
SET alias = ARRAY['DONAC', 'DONAC SRL', 'Donac Distribuzione', 'DONAC DISTRIBUZIONE SRL']
WHERE nome ILIKE '%donac%' 
  AND (alias IS NULL OR array_length(alias, 1) IS NULL);

-- Esempio 3: Bar con nomi comuni
UPDATE clients 
SET alias = ARRAY['Bar Mario', 'Bar da Mario', 'Mario Bar']
WHERE nome ILIKE '%bar%mario%' 
  AND (alias IS NULL OR array_length(alias, 1) IS NULL);

-- Esempio 4: Ristoranti con denominazioni multiple
UPDATE clients 
SET alias = ARRAY['Ristorante Il Gusto', 'Il Gusto', 'Trattoria Il Gusto']
WHERE nome ILIKE '%il gusto%' 
  AND (alias IS NULL OR array_length(alias, 1) IS NULL);

-- Esempio 5: Pizzerie
UPDATE clients 
SET alias = ARRAY['Pizzeria La Margherita', 'La Margherita', 'Pizza Margherita']
WHERE nome ILIKE '%margherita%' 
  AND (alias IS NULL OR array_length(alias, 1) IS NULL);

-- Query per verificare gli alias inseriti
SELECT 
    nome,
    alias,
    array_length(alias, 1) as numero_alias
FROM clients 
WHERE alias IS NOT NULL 
  AND array_length(alias, 1) > 0
ORDER BY nome;

-- Test delle funzioni di ricerca
SELECT 'Test ricerca ESSEMME:' as test;
SELECT * FROM find_client_by_name_or_alias('ESSEMME');

SELECT 'Test ricerca Donac:' as test;
SELECT * FROM find_client_by_name_or_alias('Donac');

SELECT 'Test ricerca parziale "mario":' as test;
SELECT * FROM find_client_by_name_or_alias('mario');

-- Statistiche alias
SELECT 
    COUNT(*) as clienti_totali,
    COUNT(*) FILTER (WHERE alias IS NOT NULL AND array_length(alias, 1) > 0) as clienti_con_alias,
    ROUND(
        COUNT(*) FILTER (WHERE alias IS NOT NULL AND array_length(alias, 1) > 0) * 100.0 / COUNT(*), 
        2
    ) as percentuale_con_alias,
    AVG(array_length(alias, 1)) FILTER (WHERE alias IS NOT NULL) as media_alias_per_cliente
FROM clients;

COMMENT ON TABLE clients IS 'Tabella clienti con supporto alias per risoluzione nomi multipli';