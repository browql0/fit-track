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

  async verifyEmail(email, code) {
    const response = await api.post('/auth/verify-email', { email, code });
    return response.data;
  },

  async resendCode(email) {
    const response = await api.post('/auth/resend-code', { email });
    return response.data;
  }
};
