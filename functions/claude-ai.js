exports.handler = async (event, context) => {
    // Headers CORS
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Gestisci OPTIONS per CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    // Test endpoint
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'ok',
          message: 'Netlify AI Function attiva',
          timestamp: new Date().toISOString()
        })
      };
    }

    // Solo POST per le richieste reali
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Usa le chiavi API dalle variabili d'ambiente
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    try {
      console.log('📨 Request body:', event.body);
      const { message, supabaseData, model, history, isVoiceInput, provider } = JSON.parse(event.body);
      console.log('🔍 Parsed data:', { message, model, provider, hasSupabaseData: !!supabaseData });

      if (!message) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No message provided' })
        };
      }

      // Controllo debug API keys
      console.log('🔑 API Keys status:', {
        hasAnthropicKey: !!ANTHROPIC_API_KEY,
        hasOpenAIKey: !!OPENAI_API_KEY,
        anthropicKeyLength: ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.length : 0,
        openAIKeyLength: OPENAI_API_KEY ? OPENAI_API_KEY.length : 0
      });

      // ✅ DETERMINA IL PROVIDER BASATO SUL PARAMETRO PROVIDER (prioritario)
      const isOpenAI = provider === 'openai' || (model && (model.includes('gpt') || model.includes('o1')));
      const isClaudeModel = provider === 'anthropic' || (model && model.includes('claude'));
      const isO1Model = model && model.includes('o1');
      
      console.log('🤖 Provider selection:', { model, provider, isOpenAI, isClaudeModel, isO1Model });

      if (isOpenAI) {
        // Chiama OpenAI API
        if (!OPENAI_API_KEY) {
          console.error('❌ OpenAI API key mancante');
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'OpenAI API key non configurata nelle environment variables di Netlify',
              code: 'MISSING_OPENAI_KEY'
            })
          };
        }

        // Configurazione diversa per modelli o1 (reasoning)
        let requestBody;
        if (isO1Model) {
          console.log('🧠 Configurazione modello o1 (reasoning)');
          requestBody = {
            model: model,
            messages: [
              {
                role: 'user',
                content: `DATA CORRENTE: ${new Date().toLocaleDateString('it-IT', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}\n\n${supabaseData ? JSON.stringify(supabaseData) : ''}\n\n${message}`
              }
            ],
            max_completion_tokens: 1000
            // I modelli o1 non supportano temperature o system messages
          };
        } else {
          console.log('🤖 Configurazione modello GPT standard');
          requestBody = {
            model: model || 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `DATA CORRENTE: ${new Date().toLocaleDateString('it-IT', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}\n\n${supabaseData ? JSON.stringify(supabaseData) : 'You are a helpful assistant.'}`
              },
              {
                role: 'user',
                content: message
              }
            ],
            max_tokens: 1000,
            temperature: 0.7
          };
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error: ${error}`);
        }

        const data = await response.json();

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            response: data.choices[0].message.content,
            usage: data.usage, // ✅ Aggiungi informazioni sui token
            model: model
          })
        };

      } else {
        // Chiama Claude API
        if (!ANTHROPIC_API_KEY) {
          console.error('❌ Anthropic API key mancante');
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Anthropic API key non configurata nelle environment variables di Netlify',
              code: 'MISSING_ANTHROPIC_KEY'
            })
          };
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model || 'claude-3-haiku-20240307',
            max_tokens: 1000,
            temperature: 0.7,
            messages: [
              {
                role: 'user',
                content: `DATA CORRENTE: ${new Date().toLocaleDateString('it-IT', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}\n\n${supabaseData ? JSON.stringify(supabaseData) : ''}\n\n${message}`
              }
            ]
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Claude API error: ${error}`);
        }

        const data = await response.json();

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            response: data.content[0].text,
            usage: data.usage, // ✅ Aggiungi informazioni sui token
            model: model
          })
        };
      }

    } catch (error) {
      console.error('AI API error:', error);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: error.message
        })
      };
    }
  };
