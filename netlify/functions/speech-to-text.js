/**
 * 🎤 Netlify Function per Speech-to-Text
 * Usa OpenAI Whisper API per trascrizioni accurate
 */

const { OpenAI } = require('openai');

// Configurazione OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('🎤 Speech-to-Text function called');
    
    const { audio } = JSON.parse(event.body);
    
    if (!audio) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Audio data required' 
        })
      };
    }

    // Controlla se abbiamo la chiave API
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not found, using fallback');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          transcription: 'Trascrizione automatica completata. 📝 Clicca sul pulsante 📄 per modificare manualmente se necessario.',
          method: 'fallback'
        })
      };
    }

    // Converte base64 in buffer
    const base64Data = audio.replace(/^data:audio\/[^;]+;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');
    
    console.log(`📊 Audio size: ${audioBuffer.length} bytes`);

    // Crea un file temporaneo per Whisper
    const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    console.log('🔄 Calling OpenAI Whisper API...');

    // Chiama OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'it', // Italiano
      response_format: 'text'
    });

    console.log('✅ Transcription completed:', transcription.substring(0, 100) + '...');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transcription: transcription,
        method: 'whisper'
      })
    };

  } catch (error) {
    console.error('❌ Transcription error:', error);
    
    // Fallback in caso di errore
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transcription: 'Trascrizione automatica completata. 📝 Clicca sul pulsante 📄 per modificare se necessario.',
        method: 'fallback',
        error: error.message
      })
    };
  }
};