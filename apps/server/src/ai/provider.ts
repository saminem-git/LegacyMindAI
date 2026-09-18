import { LLMAASClient } from './llmaas-client.js';

export interface AIProvider {
  generateStructured<T>(prompt: string, schema?: unknown): Promise<T>;
  isAvailable(): boolean;
  name(): string;
}

export type LLMProvider = AIProvider;

export class NullProvider implements AIProvider {
  isAvailable(): boolean { return false; }
  name(): string { return 'unavailable'; }
  async generateStructured<T>(): Promise<T> {
    throw new Error('No AI provider configured. Set the LLMaaS environment variables in apps/server/.env');
  }
}

export function createLLMProvider(): LLMProvider {
  return createAIProvider();
}

export function createAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER ?? 'llmaas').toLowerCase();
  if (provider === 'llmaas' && process.env.LLMAAS_CLIENT_ID && process.env.LLMAAS_CLIENT_SECRET && process.env.LLMAAS_API_KEY) {
    return new LLMAASProvider(new LLMAASClient());
  }
  return new NullProvider();
}

export class LLMAASProvider implements AIProvider {
  constructor(private readonly client: LLMAASClient) {}

  isAvailable(): boolean { return this.client.isConfigured(); }
  name(): string { return 'llmaas'; }

  async generateStructured<T>(prompt: string): Promise<T> {
    if (!this.isAvailable()) throw new Error('LLMaaS is not configured');
    const text = await this.client.chat(prompt);
    try {
      return JSON.parse(text) as T;
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) return JSON.parse(match[1]) as T;
      throw new Error(`Failed to parse LLMaaS response as JSON: ${text.substring(0, 200)}`);
    }
  }
}
