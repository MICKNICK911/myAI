// netlify/functions/ask-openrouter.js
const OpenAI = require('openai');

exports.handler = async (event) => {
  // ========== CORS HEADERS ==========
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // ========== HANDLE PREFLIGHT (OPTIONS) REQUEST ==========
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // ========== ONLY ALLOW POST REQUESTS ==========
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
    };
  }

  // ========== CHECK API KEY ==========
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    console.error('OPENROUTER_API_KEY is not set.');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Server configuration error.' })
    };
  }

  // ========== PARSE USER PROMPT ==========
  let userPrompt;
  try {
    const requestBody = JSON.parse(event.body);
    userPrompt = requestBody.prompt;

    if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim() === '') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Prompt is required and must be a non-empty string.' })
      };
    }
  } catch (parseError) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid request body. Expected JSON with a "prompt" field.' })
    };
  }

  // ========== INITIALIZE OPENROUTER CLIENT ==========
  const openai = new OpenAI({
    apiKey: openRouterApiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.URL || 'https://your-site.netlify.app',
      'X-Title': 'My AI Assistant',
    },
  });

  // ========== CALL DEEPSEEK VIA OPENROUTER ==========
  try {
    const completion = await openai.chat.completions.create({
      model: 'deepseek/deepseek-chat:free',
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 1024,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('Received empty response from AI.');
    }

    // ========== SUCCESS RESPONSE ==========
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        reply: aiResponse,
        modelUsed: completion.model
      })
    };

  } catch (error) {
    // ========== ERROR HANDLING ==========
    console.error('OpenRouter/DeepSeek API Error:', error);

    let userMessage = 'Sorry, the AI service is currently unavailable.';
    if (error.response) {
      userMessage = `API Error: ${error.response.status}.`;
    } else if (error.request) {
      userMessage = 'Network error. Please check your connection.';
    }

    return {
      statusCode: 502,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: userMessage })
    };
  }
};