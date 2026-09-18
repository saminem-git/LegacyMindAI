import { LLMAASTokenService } from './llmaas-token.js';

const DEFAULT_BASE_URL = 'https://llmapi.ai.vwgroup.com';

interface ChatResponse {
  choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
}

export class LLMAASClient {
  private readonly tokenService: LLMAASTokenService;
  private readonly baseUrl = (process.env.LLMAAS_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  private readonly model = process.env.LLMAAS_MODEL ?? 'gpt-4o';
  private readonly clientKey = process.env.LLMAAS_API_KEY ?? '';

  constructor(tokenService = new LLMAASTokenService()) {
    this.tokenService = tokenService;
  }

  isConfigured(): boolean {
    return Boolean(this.clientKey && this.tokenService.isConfigured() && this.baseUrl && this.model);
  }

  async chat(prompt: string): Promise<string> {
    if (!this.isConfigured()) throw new Error('LLMaaS is not configured');
    return this.request(prompt, false);
  }

  private async request(prompt: string, retried: boolean): Promise<string> {
    const accessToken = await this.tokenService.getAccessToken(retried);
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-LLM-API-CLIENT-ID': `Bearer ${this.clientKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }),
    });

    if (response.status === 401 && !retried) return this.request(prompt, true);
    if (!response.ok) throw new Error(`LLMaaS chat failed with status ${response.status}`);

    const data = await response.json() as ChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content) return content;
    if (Array.isArray(content)) {
      const text = content.map(part => part.text ?? '').join('');
      if (text) return text;
    }
    throw new Error('LLMaaS chat returned no content');
  }
}
