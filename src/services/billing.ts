import api from './api';

export const billingApi = {
  /**
   * Create a checkout session and return the redirect URL
   * @param plan 'starter' | 'pro' | 'enterprise'
   */
  createCheckoutSession: async (plan: string): Promise<{ url: string }> => {
    try {
      const response = await api.post<{ url: string }>('/billing/create-checkout-session', { plan });
      if (!response || !response.url) {
        throw new Error('Servidor não devolveu uma resposta válida');
      }
      return response;
    } catch (error: any) {
      console.error('Failed to create checkout session:', error);
      throw new Error(error.message || 'Erro ao iniciar pagamento');
    }
  },

  /**
   * Verify checkout session status after user returns from Stripe
   */
  verifyCheckoutSession: async (sessionId: string): Promise<{ status: string; payment_status: string; plan: string | null }> => {
    return api.get(`/billing/checkout-status?session_id=${sessionId}`);
  },

  /**
   * Get Stripe config (enabled status, available plans)
   */
  getConfig: async (): Promise<{ enabled: boolean; plans: string[] }> => {
    return api.get('/billing/config');
  },
};
