class GeminiProvider {
  constructor({ apiKey = process.env.GEMINI_API_KEY } = {}) {
    this.apiKey = apiKey;
  }

  ensureConfigured() {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is required for GEMINI provider');
    }
  }

  async completeJson({ model, system, prompt, webSearch = true }) {
    this.ensureConfigured();

    const body = {
      systemInstruction: {
        parts: [{ text: system }]
      },
      contents: [{
        role: 'user',
        parts: [{ text: `${prompt}\n\nRetourne uniquement du JSON valide, sans markdown.` }]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };

    if (webSearch) {
      body.tools = [{ googleSearch: {} }];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `Gemini request failed with ${response.status}`);
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!text) throw new Error('Gemini returned an empty response');
    return text;
  }
}

module.exports = GeminiProvider;
