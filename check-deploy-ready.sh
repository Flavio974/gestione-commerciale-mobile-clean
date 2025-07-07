#!/bin/bash

echo "🔍 VERIFICA PRE-DEPLOY SMART ASSISTANT PWA"
echo "=========================================="

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contatori
ERRORS=0
WARNINGS=0
SUCCESS=0

# Funzione di check
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $1${NC}"
        ((SUCCESS++))
    else
        echo -e "${RED}❌ $1 - MANCANTE${NC}"
        ((ERRORS++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅ $1/${NC}"
        ((SUCCESS++))
    else
        echo -e "${RED}❌ $1/ - CARTELLA MANCANTE${NC}"
        ((ERRORS++))
    fi
}

echo ""
echo "📋 VERIFICA FILE ESSENZIALI"
echo "----------------------------"

# File core PWA
check_file "manifest.json"
check_file "sw.js"
check_file "index.html"
check_file "netlify.toml"

echo ""
echo "📁 VERIFICA CARTELLE"
echo "--------------------"

check_dir "icons"
check_dir "js"
check_dir "css"
check_dir "functions"

echo ""
echo "🎤 VERIFICA SMART ASSISTANT"
echo "---------------------------"

check_file "js/smart-assistant.js"
check_file "css/smart-assistant.css"

echo ""
echo "📋 VERIFICA SISTEMA COMANDI INTELLIGENTE"
echo "----------------------------------------"

check_file "js/comandi-core.js"
check_file "js/comandi-ui.js"
check_file "css/comandi-module.css"
check_file "comandi/vocabolario_comandi.txt"

echo ""
echo "🧠 VERIFICA MIDDLEWARE INTELLIGENTE"
echo "-----------------------------------"

check_file "js/middleware/request-middleware.js"
check_file "js/middleware/vocabolario-middleware.js"
check_file "js/middleware/enhanced-ai-assistant.js"

echo ""
echo "🔗 VERIFICA SISTEMA ALIAS CLIENTI"
echo "---------------------------------"

check_file "js/utils/client-alias-resolver.js"
check_file "sql/add_client_aliases.sql"

echo ""
echo "📅 VERIFICA TIMELINE INTELLIGENTE"
echo "---------------------------------"

check_file "js/timeline/timeline-intelligent-manager.js"
check_file "js/timeline/date-natural-parser.js"
check_file "config/timeline-rules.json"

echo ""
echo "🌐 VERIFICA API (Netlify Functions)"
echo "-----------------------------------"

check_file "functions/speech-to-text.js"
check_file "functions/claude-ai.js"

echo ""
echo "🎨 VERIFICA ICONE"
echo "-----------------"

# Icone essenziali
REQUIRED_ICONS=("152x152" "192x192" "512x512")
for size in "${REQUIRED_ICONS[@]}"; do
    iconpath="icons/icons/icon-${size}.png"
    if [ -f "$iconpath" ]; then
        # Verifica dimensione file (dovrebbe essere > 1KB)
        filesize=$(stat -f%z "$iconpath" 2>/dev/null || stat -c%s "$iconpath" 2>/dev/null)
        if [ "$filesize" -gt 1000 ]; then
            echo -e "${GREEN}✅ icon-${size}.png (${filesize} bytes)${NC}"
            ((SUCCESS++))
        else
            echo -e "${YELLOW}⚠️  icon-${size}.png - TROPPO PICCOLA (${filesize} bytes)${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "${RED}❌ icon-${size}.png - MANCANTE${NC}"
        ((ERRORS++))
    fi
done

echo ""
echo "🔧 VERIFICA CONFIGURAZIONE"
echo "--------------------------"

# Verifica manifest.json
if [ -f "manifest.json" ]; then
    if grep -q "Smart Commercial Assistant" "manifest.json"; then
        echo -e "${GREEN}✅ Manifest - Nome corretto${NC}"
        ((SUCCESS++))
    else
        echo -e "${YELLOW}⚠️  Manifest - Nome non aggiornato${NC}"
        ((WARNINGS++))
    fi
    
    if grep -q "SmartComm" "manifest.json"; then
        echo -e "${GREEN}✅ Manifest - Short name corretto${NC}"
        ((SUCCESS++))
    else
        echo -e "${YELLOW}⚠️  Manifest - Short name non aggiornato${NC}"
        ((WARNINGS++))
    fi
fi

# Verifica Service Worker
if [ -f "sw.js" ]; then
    if grep -q "smart-commercial-assistant" "sw.js"; then
        echo -e "${GREEN}✅ Service Worker - Cache name aggiornato${NC}"
        ((SUCCESS++))
    else
        echo -e "${YELLOW}⚠️  Service Worker - Cache name non aggiornato${NC}"
        ((WARNINGS++))
    fi
fi

echo ""
echo "📊 RIEPILOGO"
echo "============"
echo -e "${GREEN}✅ Successi: $SUCCESS${NC}"
echo -e "${YELLOW}⚠️  Warning: $WARNINGS${NC}"
echo -e "${RED}❌ Errori: $ERRORS${NC}"

echo ""
if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 PRONTO PER IL DEPLOY!${NC}"
        echo "Tutti i file necessari sono presenti e configurati correttamente."
        echo ""
        echo "📋 PROSSIMI PASSI:"
        echo "1. Genera le icone: apri generate-icons-simple.html"
        echo "2. Testa tutto: apri test-pwa.html"
        echo "3. Configura database: esegui sql/add_client_aliases.sql su Supabase"
        echo "4. Popola alias esempio: esegui sql/populate_example_aliases.sql"
        echo "5. Deploy su Netlify: segui DEPLOY-NETLIFY.md"
        echo ""
        echo "🎯 NUOVE FUNZIONALITÀ IMPLEMENTATE:"
        echo "- ✅ Sistema Comandi Intelligente con vocabolario editabile"
        echo "- ✅ Middleware Coordinatore con pattern matching avanzato"  
        echo "- ✅ Gestione Alias Clienti multipli"
        echo "- ✅ Timeline Intelligente con inserimento automatico appuntamenti"
        echo "- ✅ Parser Date Naturali (domani, lunedì prossimo, etc.)"
    else
        echo -e "${YELLOW}⚠️  QUASI PRONTO - Risolvi i warning per risultato ottimale${NC}"
    fi
else
    echo -e "${RED}❌ NON PRONTO - Risolvi gli errori prima del deploy${NC}"
fi

echo ""
echo "📖 GUIDE DISPONIBILI:"
echo "- 📚 DEPLOY-NETLIFY.md - Guida completa deploy"
echo "- 🧪 test-pwa.html - Test funzionalità PWA"
echo "- 🎨 generate-icons-simple.html - Generatore icone"

exit $ERRORS