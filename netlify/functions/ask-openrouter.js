// netlify/functions/ask-deepseek.js
const OpenAI = require('openai');

exports.handler = async (event) => {
  // 1. Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
    };
  }

  // 2. Securely get API key from Netlify environment variable
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    console.error('OPENROUTER_API_KEY environment variable is not set.');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server configuration error.' })
    };
  }

  // 3. Parse the user's prompt from the frontend request
  let userPrompt;
  try {
    const requestBody = JSON.parse(event.body);
    userPrompt = requestBody.prompt;

    if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim() === '') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Prompt is required and must be a non-empty string.' })
      };
    }
  } catch (parseError) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid request body. Expected JSON with a "prompt" field.' })
    };
  }

  // 4. Initialize the OpenAI client configured for OpenRouter
  const openai = new OpenAI({
    apiKey: openRouterApiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.URL || 'https://your-netlify-site.netlify.app', // Your site URL
      'X-Title': 'My AI Assistant', // Your app name (optional but good practice)
    },
  });

  // 5. Make the request to OpenRouter (DeepSeek)
  try {
    const completion = await openai.chat.completions.create({
      model: 'deepseek/deepseek-chat:free', // Correct model ID for DeepSeek via OpenRouter[citation:5][citation:8]
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: 1024, // Adjust as needed
      temperature: 0.7,
      // stream: false // Set to true for streaming; requires frontend changes
    });

    // 6. Extract and return the AI's response
    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('Received empty response from AI.');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        reply: aiResponse,
        modelUsed: completion.model // Optional: send back which model was used
      })
    };

  } catch (error) {
    // 7. Handle errors from the API call
    console.error('OpenRouter/DeepSeek API Error:', error);

    // Provide a user-friendly error message
    let userMessage = 'Sorry, the AI service is currently unavailable.';
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Response Error Data:', error.response.data);
      userMessage = `API Error: ${error.response.status}. Please try again.`;
    } else if (error.request) {
      // The request was made but no response was received
      userMessage = 'Network error. Please check your connection.';
    }

    return {
      statusCode: 502, // Bad Gateway
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: userMessage })
    };
  }
};