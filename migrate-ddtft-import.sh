#!/bin/bash

# Script per migrare in modo sicuro da ddtft-import.js al nuovo sistema modulare

echo "========================================"
echo "MIGRAZIONE SICURA ddtft-import.js"
echo "========================================"
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directory base
BASE_DIR="/home/flavio2025/Desktop/GestioneCommerciale-Mobile"
cd "$BASE_DIR"

# Step 1: Verifica che tutti i file necessari esistano
echo -e "${YELLOW}Step 1: Verifica file necessari...${NC}"

required_files=(
  "js/ddtft-import.js"
  "js/ddtft-import-new.js"
  "js/parsers/base-extractor.js"
  "js/parsers/ddt-extractor-module.js"
  "js/parsers/fattura-extractor-module.js"
  "js/config/ddtft-patterns.js"
  "js/config/ddtft-mappings.js"
  "js/utils/ddtft-parsing-utils.js"
)

all_files_exist=true
for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ✓ $file"
  else
    echo -e "  ${RED}✗ $file MANCANTE${NC}"
    all_files_exist=false
  fi
done

if [ "$all_files_exist" = false ]; then
  echo -e "${RED}ERRORE: File mancanti. Interrompo la migrazione.${NC}"
  exit 1
fi

echo -e "${GREEN}Tutti i file necessari sono presenti.${NC}"
echo ""

# Step 2: Backup del file originale
echo -e "${YELLOW}Step 2: Backup del file originale...${NC}"

timestamp=$(date +%Y%m%d_%H%M%S)
backup_file="js/ddtft-import.backup.${timestamp}.js"

cp "js/ddtft-import.js" "$backup_file"
echo -e "${GREEN}Backup creato: $backup_file${NC}"
echo ""

# Step 3: Test del nuovo sistema (opzionale)
echo -e "${YELLOW}Step 3: Vuoi eseguire i test prima della migrazione? (s/n)${NC}"
read -r run_tests

if [ "$run_tests" = "s" ]; then
  echo "Esecuzione test..."
  # Nota: Questo richiede Node.js con supporto ES modules
  node --experimental-modules test/test-refactoring.js
  
  echo -e "${YELLOW}I test sono passati? Continuare con la migrazione? (s/n)${NC}"
  read -r continue_migration
  
  if [ "$continue_migration" != "s" ]; then
    echo -e "${RED}Migrazione annullata.${NC}"
    exit 0
  fi
fi

# Step 4: Migrazione
echo -e "${YELLOW}Step 4: Esecuzione migrazione...${NC}"

# Rinomina il file originale
mv "js/ddtft-import.js" "js/ddtft-import-legacy.js"
echo "  ✓ Rinominato ddtft-import.js → ddtft-import-legacy.js"

# Rinomina il nuovo file
mv "js/ddtft-import-new.js" "js/ddtft-import.js"
echo "  ✓ Rinominato ddtft-import-new.js → ddtft-import.js"

echo -e "${GREEN}Migrazione completata!${NC}"
echo ""

# Step 5: Istruzioni post-migrazione
echo -e "${YELLOW}Prossimi passi:${NC}"
echo "1. Testare l'applicazione per verificare che tutto funzioni"
echo "2. Se ci sono problemi, ripristinare con:"
echo "   mv js/ddtft-import-legacy.js js/ddtft-import.js"
echo "3. Una volta verificato che tutto funziona:"
echo "   - Rimuovere js/ddtft-import-legacy.js"
echo "   - Committare le modifiche"
echo ""

# Step 6: Mostra il riepilogo dei file
echo -e "${YELLOW}Struttura finale:${NC}"
echo "js/"
echo "├── ddtft-import.js (nuovo file facade)"
echo "├── ddtft-import-legacy.js (file originale)"
echo "├── parsers/"
echo "│   ├── base-extractor.js"
echo "│   ├── ddt-extractor-module.js"
echo "│   └── fattura-extractor-module.js"
echo "├── config/"
echo "│   ├── ddtft-patterns.js"
echo "│   └── ddtft-mappings.js"
echo "└── utils/"
echo "    └── ddtft-parsing-utils.js"
echo ""

echo -e "${GREEN}Migrazione completata con successo!${NC}"