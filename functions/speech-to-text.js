exports.handler = async (event, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Gestisci OPTIONS per CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { audio } = JSON.parse(event.body);
    
    if (!audio) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No audio data provided' })
      };
    }

    // Per ora, restituisci una trascrizione simulata
    // In produzione, qui chiameresti OpenAI Whisper
    const simulatedTranscription = "Trascrizione simulata: L'AI è attiva e funzionante su Netlify!";

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        text: simulatedTranscription,
        transcription: simulatedTranscription
      })
    };

  } catch (error) {
    console.error('Speech-to-text error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};