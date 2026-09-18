const DEFAULT_TOKEN_URL = 'https://idp.cloud.vwgroup.com/auth/realms/kums-mfa/protocol/openid-connect/token';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
}

export class LLMAASTokenService {
  private token: string | null = null;
  private expiresAt = 0;

  constructor(
    private readonly clientId = process.env.LLMAAS_CLIENT_ID ?? '',
    private readonly clientSecret = process.env.LLMAAS_CLIENT_SECRET ?? '',
    private readonly tokenUrl = process.env.LLMAAS_TOKEN_URL ?? DEFAULT_TOKEN_URL,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.tokenUrl);
  }

  async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.token && Date.now() < this.expiresAt) return this.token;
    if (!this.isConfigured()) throw new Error('LLMaaS OAuth is not configured');

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) throw new Error(`LLMaaS OAuth failed with status ${response.status}`);
    const data = await response.json() as TokenResponse;
    if (!data.access_token) throw new Error('LLMaaS OAuth returned no access token');

    this.token = data.access_token;
    const lifetime = Math.max((data.expires_in ?? 300) - 60, 30);
    this.expiresAt = Date.now() + lifetime * 1000;
    return this.token;
  }
}
