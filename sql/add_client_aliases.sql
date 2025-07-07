-- Aggiunta supporto alias clienti alla tabella esistente
-- Questo script aggiunge il campo alias alla tabella clients

-- Aggiungi colonna alias come array di testo
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS alias TEXT[] DEFAULT '{}';

-- Indice per ricerca efficiente negli alias
CREATE INDEX IF NOT EXISTS idx_clients_alias ON clients USING GIN (alias);

-- Commento per documentazione
COMMENT ON COLUMN clients.alias IS 'Array di nomi alternativi/alias per il cliente (es. ["ESSEMME", "ESSEMME Montegrosso", "ESSEMME Conal"])';

-- Funzione per cercare cliente per nome o alias
CREATE OR REPLACE FUNCTION find_client_by_name_or_alias(search_name TEXT)
RETURNS TABLE (
    id BIGINT,
    codice_cliente TEXT,
    nome TEXT,
    alias_match TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.codice_cliente,
        c.nome,
        CASE 
            WHEN LOWER(c.nome) LIKE LOWER('%' || search_name || '%') THEN c.nome
            ELSE unnest(c.alias)
        END as alias_match
    FROM clients c
    WHERE 
        LOWER(c.nome) LIKE LOWER('%' || search_name || '%')
        OR EXISTS (
            SELECT 1 FROM unnest(c.alias) AS alias_item 
            WHERE LOWER(alias_item) LIKE LOWER('%' || search_name || '%')
        )
    ORDER BY 
        -- Priorità: match esatto nome, match esatto alias, match parziale nome, match parziale alias
        CASE 
            WHEN LOWER(c.nome) = LOWER(search_name) THEN 1
            WHEN EXISTS (SELECT 1 FROM unnest(c.alias) AS ai WHERE LOWER(ai) = LOWER(search_name)) THEN 2
            WHEN LOWER(c.nome) LIKE LOWER('%' || search_name || '%') THEN 3
            ELSE 4
        END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_client_by_name_or_alias IS 'Cerca un cliente per nome principale o alias con ranking di priorità';

-- Funzione per aggiungere alias a un cliente
CREATE OR REPLACE FUNCTION add_client_alias(client_id BIGINT, new_alias TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_aliases TEXT[];
BEGIN
    -- Ottieni alias attuali
    SELECT alias INTO current_aliases FROM clients WHERE id = client_id;
    
    -- Verifica se l'alias esiste già
    IF new_alias = ANY(current_aliases) THEN
        RETURN FALSE; -- Alias già presente
    END IF;
    
    -- Aggiungi nuovo alias
    UPDATE clients 
    SET alias = array_append(current_aliases, new_alias)
    WHERE id = client_id;
    
    RETURN TRUE; -- Alias aggiunto con successo
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_client_alias IS 'Aggiunge un nuovo alias a un cliente esistente';

-- Funzione per rimuovere alias da un cliente
CREATE OR REPLACE FUNCTION remove_client_alias(client_id BIGINT, old_alias TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_aliases TEXT[];
BEGIN
    -- Ottieni alias attuali
    SELECT alias INTO current_aliases FROM clients WHERE id = client_id;
    
    -- Verifica se l'alias esiste
    IF NOT (old_alias = ANY(current_aliases)) THEN
        RETURN FALSE; -- Alias non presente
    END IF;
    
    -- Rimuovi alias
    UPDATE clients 
    SET alias = array_remove(current_aliases, old_alias)
    WHERE id = client_id;
    
    RETURN TRUE; -- Alias rimosso con successo
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION remove_client_alias IS 'Rimuove un alias da un cliente esistente';

-- Vista per gestione alias (utile per amministrazione)
CREATE OR REPLACE VIEW clients_with_aliases AS
SELECT 
    id,
    codice_cliente,
    nome,
    alias,
    array_length(alias, 1) as numero_alias,
    citta,
    zona,
    priorita,
    stato,
    created_at,
    updated_at
FROM clients
WHERE array_length(alias, 1) > 0 OR alias IS NOT NULL
ORDER BY nome;

COMMENT ON VIEW clients_with_aliases IS 'Vista dei clienti che hanno alias configurati';

-- Esempi di utilizzo (da eseguire dopo aver popolato la tabella)
/*
-- Esempio 1: Aggiungere alias a un cliente esistente
SELECT add_client_alias(
    (SELECT id FROM clients WHERE nome ILIKE '%essemme%' LIMIT 1),
    'ESSEMME Montegrosso'
);

-- Esempio 2: Cercare cliente per alias
SELECT * FROM find_client_by_name_or_alias('ESSEMME');

-- Esempio 3: Aggiornare direttamente la colonna alias
UPDATE clients 
SET alias = ARRAY['ESSEMME', 'ESSEMME Montegrosso', 'ESSEMME Conal Montegrosso']
WHERE nome ILIKE '%essemme%';

-- Esempio 4: Visualizzare tutti i clienti con i loro alias
SELECT nome, alias FROM clients WHERE alias IS NOT NULL AND array_length(alias, 1) > 0;
*/