export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  try {
    const { system_instruction, contents, generationConfig } = req.body;

    // Converte formato Gemini → formato Groq/OpenAI
    const messages = [];

    // System prompt
    if (system_instruction?.parts?.[0]?.text) {
      messages.push({
        role: 'system',
        content: system_instruction.parts[0].text
      });
    }

    // Histórico da conversa
    if (contents) {
      for (const msg of contents) {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.parts[0].text
        });
      }
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: generationConfig?.maxOutputTokens || 1500,
        temperature: generationConfig?.temperature || 0.85
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || 'Groq error' });
    }

    // Converte resposta Groq → formato Gemini (frontend não precisa de mudar)
    const reply = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: reply }] } }]
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
