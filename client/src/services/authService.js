import api from './api';

export const authService = {
  async register(email, password) {
    const response = await api.post('/auth/register', { email, password });
    return response.data;
  },

  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Keep local cleanup even when the server is unavailable.
    }
    localStorage.removeItem('token');
  },

  async verifyEmail(token) {
    const response = await api.get('/auth/verify-email', {
      params: { token },
    });
    return response.data;
  },

  async resendVerification(email) {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  }
};
