#!/bin/bash

# Script per avviare server locale per l'app AI

echo "🚀 Avvio server locale per AI Assistant..."

# Verifica quale server è disponibile
if command -v php &> /dev/null; then
    echo "✅ PHP trovato - Avvio server PHP"
    php -S localhost:8000
elif command -v python3 &> /dev/null; then
    echo "✅ Python3 trovato - Avvio server Python"
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "✅ Python trovato - Avvio server Python"
    python -m http.server 8000
elif command -v node &> /dev/null; then
    echo "✅ Node.js trovato - Avvio server Node"
    npx http-server -p 8000
else
    echo "❌ Nessun server disponibile"
    echo "Installa PHP, Python o Node.js per continuare"
    exit 1
fi