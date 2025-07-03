#!/bin/bash

echo "🔧 Fix deployment per Netlify..."

# 1. Assicurati che ci sia solo una directory functions
echo "✅ Pulizia directory duplicate..."
rm -rf netlify/functions

# 2. Verifica che le funzioni siano nella directory corretta
echo "📁 Controllo funzioni..."
ls -la functions/

# 3. Crea un file di test per verificare che le variabili funzionino
cat > functions/test-env.js << 'EOF'
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Test variabili ambiente',
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      timestamp: new Date().toISOString()
    })
  };
};
EOF

echo "✅ File di test creato"

# 4. Deploy
if command -v netlify &> /dev/null; then
    echo "🚀 Deploy con Netlify CLI..."
    netlify deploy --prod --site dreamy-kitsune-efae50
else
    echo "⚠️  Netlify CLI non installato."
    echo "   Trascina manualmente la cartella su Netlify.com"
fi

echo ""
echo "📋 Dopo il deploy, testa con:"
echo "   https://dreamy-kitsune-efae50.netlify.app/.netlify/functions/test-env"
echo ""
echo "✅ Dovresti vedere:"
echo "   hasAnthropicKey: true"
echo "   hasOpenAIKey: true"