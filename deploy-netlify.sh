#!/bin/bash

# Script di deployment per Netlify
echo "🚀 Preparazione deployment su Netlify..."

# 1. Installa Netlify CLI se non presente
if ! command -v netlify &> /dev/null; then
    echo "📦 Installazione Netlify CLI..."
    npm install -g netlify-cli
fi

# 2. Verifica che le funzioni siano pronte
echo "✅ Controllo funzioni serverless..."
ls -la functions/

# 3. Login a Netlify (solo la prima volta)
echo "🔐 Login a Netlify (segui le istruzioni)..."
netlify login

# 4. Inizializza il sito (solo la prima volta)
echo "🌐 Inizializzazione sito..."
netlify init

# 5. Deploy
echo "🚀 Deploy in corso..."
netlify deploy --prod

echo "✅ Deploy completato!"
echo "📱 La tua app è ora accessibile da PC, iPhone e iPad!"