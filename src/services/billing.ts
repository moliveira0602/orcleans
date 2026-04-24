import api from './api';

export const billingApi = {
  /**
   * Create a checkout session and return the redirect URL
   * @param plan 'starter' | 'pro' | 'enterprise'
   */
  createCheckoutSession: async (plan: string): Promise<{ url: string }> => {
    try {
      const response = await api.post<any>('/billing/create-checkout-session', { plan });
      if (!response || !response.data) {
        throw new Error('Servidor não devolveu uma resposta válida');
      }
      return response.data;
    } catch (error: any) {
      console.error('Failed to create checkout session:', error);
      throw new Error(error.response?.data?.error || 'Erro ao iniciar pagamento');
    }
  }
};
