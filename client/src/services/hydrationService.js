import api from './api';

export const hydrationService = {
  async getEntries(date) {
    const response = await api.get('/hydration', { params: { date } });
    return response.data;
  },

  async getSummary(date) {
    const response = await api.get('/hydration/summary', { params: { date } });
    return response.data;
  },

  async addEntry(entry) {
    const response = await api.post('/hydration', entry);
    return response.data;
  },

  async deleteEntry(id) {
    const response = await api.delete(`/hydration/${id}`);
    return response.data;
  },
};
