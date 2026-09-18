import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { LLMAASTokenService } from '../ai/llmaas-token.js';
import { LLMAASClient } from '../ai/llmaas-client.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('VW LLMaaS transport', () => {
  it('caches OAuth tokens and sends the documented client header', async () => {
    let tokenRequests = 0;
    let chatRequests = 0;
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url.includes('/token')) {
        tokenRequests += 1;
        return new Response(JSON.stringify({ access_token: 'test-access-token', expires_in: 3600 }), { status: 200 });
      }
      chatRequests += 1;
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('Authorization'), 'Bearer test-access-token');
      assert.equal(headers.get('X-LLM-API-CLIENT-ID'), 'Bearer test-client-key');
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 });
    }) as typeof fetch;

    const tokenService = new LLMAASTokenService('test-client-id', 'test-client-secret', 'https://idp.test/token');
    process.env.LLMAAS_API_KEY = 'test-client-key';
    const client = new LLMAASClient(tokenService);

    await client.chat('first');
    await client.chat('second');

    assert.equal(tokenRequests, 1);
    assert.equal(chatRequests, 2);
    delete process.env.LLMAAS_API_KEY;
  });

  it('refreshes once after an expired access token response', async () => {
    let tokenRequests = 0;
    let chatRequests = 0;
    globalThis.fetch = (async (input) => {
      if (String(input).includes('/token')) {
        tokenRequests += 1;
        return new Response(JSON.stringify({ access_token: `token-${tokenRequests}`, expires_in: 3600 }), { status: 200 });
      }
      chatRequests += 1;
      if (chatRequests === 1) return new Response('expired', { status: 401 });
      return new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] }), { status: 200 });
    }) as typeof fetch;

    const tokenService = new LLMAASTokenService('test-client-id', 'test-client-secret', 'https://idp.test/token');
    process.env.LLMAAS_API_KEY = 'test-client-key';
    const client = new LLMAASClient(tokenService);
    await client.chat('retry');

    assert.equal(tokenRequests, 2);
    assert.equal(chatRequests, 2);
    delete process.env.LLMAAS_API_KEY;
  });
});
