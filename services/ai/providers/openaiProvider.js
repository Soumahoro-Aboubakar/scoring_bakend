class OpenAIProvider {
  constructor({ apiKey = process.env.OPENAI_API_KEY } = {}) {
    this.apiKey = apiKey;
  }

  ensureConfigured() {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required for OPENAI provider');
    }
  }

  async completeJson({ model, system, prompt, schema, webSearch = true }) {
    this.ensureConfigured();

    const body = {
      model,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: schema?.name || 'structured_output',
          schema: schema?.schema || { type: 'object' },
          strict: true
        }
      }
    };

    if (webSearch) {
      body.tools = [{ type: 'web_search' }];
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `OpenAI request failed with ${response.status}`);
    }

    const text = data.output_text
      || data.output?.flatMap((item) => item.content || [])
        .map((content) => content.text || content.output_text || '')
        .join('')
      || '';

    if (!text) throw new Error('OpenAI returned an empty response');
    return text;
  }
}

module.exports = OpenAIProvider;
