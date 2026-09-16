export interface LLMProvider {
  generateStructured<T>(prompt: string, schema?: unknown): Promise<T>;
  isAvailable(): boolean;
}

export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private model = 'gemini-1.5-flash';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  async generateStructured<T>(prompt: string): Promise<T> {
    if (!this.isAvailable()) throw new Error('Gemini API key not configured');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${err}`);
    }

    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');

    try {
      return JSON.parse(text) as T;
    } catch {
      // Try to extract JSON from markdown code block
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) return JSON.parse(match[1]) as T;
      throw new Error(`Failed to parse Gemini response as JSON: ${text.substring(0, 200)}`);
    }
  }
}

export class NullProvider implements LLMProvider {
  isAvailable(): boolean { return false; }
  async generateStructured<T>(): Promise<T> {
    throw new Error('No LLM provider configured. Set GEMINI_API_KEY in .env');
  }
}

export function createLLMProvider(): LLMProvider {
  const key = process.env.GEMINI_API_KEY ?? '';
  if (key) return new GeminiProvider(key);
  return new NullProvider();
}
