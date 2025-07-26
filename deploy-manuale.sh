#!/bin/bash

echo "🚀 Deploy manuale rapido su Netlify..."

# Installa Netlify CLI se necessario
if ! command -v netlify &> /dev/null; then
    echo "📦 Installazione Netlify CLI..."
    npm install -g netlify-cli
fi

echo "📤 Deploy diretto dei file..."
# Deploy senza build (tutti i file statici)
netlify deploy --prod --dir . --site dancing-kashata-353af9

echo "✅ Deploy completato!"
echo ""
echo "⚠️  IMPORTANTE: Configura le variabili d'ambiente su Netlify:"
echo "   1. Vai su https://app.netlify.com"
echo "   2. Clicca sul tuo sito"
echo "   3. Site configuration → Environment variables"
echo "   4. Aggiungi ANTHROPIC_API_KEY e OPENAI_API_KEY"