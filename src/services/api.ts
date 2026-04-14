const API_BASE = import.meta.env.VITE_API_URL || 'https://server-sigma-eight-54.vercel.app/api';

interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private refreshing: Promise<{ accessToken: string; refreshToken: string }> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loadTokens();
  }

  private loadTokens() {
    try {
      const session = localStorage.getItem('orca_session');
      console.log('[API] loadTokens - session from localStorage:', session ? 'EXISTS' : 'NULL');
      if (session) {
        const data = JSON.parse(session);
        this.token = data.accessToken;
        this.refreshToken = data.refreshToken;
        console.log('[API] loadTokens - token loaded:', this.token ? 'YES' : 'NO');
      }
    } catch {
      this.token = null;
      this.refreshToken = null;
    }
  }

  private saveTokens(accessToken: string, refreshToken: string) {
    this.token = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('orca_session', JSON.stringify({ accessToken, refreshToken }));
  }

  private clearTokens() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('orca_session');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getAccessToken(): string | null {
    return this.token;
  }

  async refresh(): Promise<void> {
    if (!this.refreshToken) {
      this.clearTokens();
      throw new Error('No refresh token');
    }

    if (!this.refreshing) {
      this.refreshing = this.doRefresh();
    }

    try {
      const tokens = await this.refreshing;
      this.saveTokens(tokens.accessToken, tokens.refreshToken);
    } finally {
      this.refreshing = null;
    }
  }

  private async doRefresh(): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Refresh failed');
    }

    return response.json();
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { params, headers: customHeaders, ...restOptions } = options;

    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, value);
      });
    }
    console.log('[API] request:', endpoint, 'url:', url.toString());

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url.toString(), {
        ...restOptions,
        headers,
      });

      if (response.status === 401) {
        try {
          await this.refresh();
          headers['Authorization'] = `Bearer ${this.token}`;
          const retryResponse = await fetch(url.toString(), {
            ...restOptions,
            headers,
          });

          if (!retryResponse.ok) {
            const error = await retryResponse.json().catch(() => ({ error: 'Erro na requisição' }));
            throw new Error(error.error || 'Erro na requisição');
          }

          if (retryResponse.status === 204) return {} as T;
          return retryResponse.json();
        } catch (refreshError) {
          this.clearTokens();
          localStorage.removeItem('orca_user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          throw new Error('Sessão expirada');
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erro na requisição' }));
        throw new Error(error.error || 'Erro na requisição');
      }

      if (response.status === 204) return {} as T;
      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Sessão expirada') throw error;
        if (error.name === 'TypeError' || error.message.includes('fetch')) {
          throw new Error('Erro de conexão. Verifique sua internet.');
        }
        throw error;
      }
      throw new Error('Erro de rede');
    }
  }

  async get<T>(endpoint: string, options?: Omit<ApiOptions, 'body' | 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: Omit<ApiOptions, 'body' | 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: Omit<ApiOptions, 'body' | 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) });
  }

  async delete<T>(endpoint: string, body?: unknown, options?: Omit<ApiOptions, 'body' | 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE', body: body ? JSON.stringify(body) : undefined });
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.saveTokens(accessToken, refreshToken);
  }

  logout() {
    if (this.refreshToken) {
      this.post('/auth/logout', { refreshToken: this.refreshToken }).catch(() => {});
    }
    this.clearTokens();
  }
}

export const api = new ApiClient(API_BASE);
export default api;
