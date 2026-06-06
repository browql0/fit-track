import api from './api';

export const weightService = {
  async getWeightEntries(limit = 30) {
    const response = await api.get(`/weight?limit=${limit}`);
    return response.data;
  },

  async getLatestWeight() {
    const response = await api.get('/weight/latest');
    return response.data;
  },

  async getWeightStats() {
    const response = await api.get('/weight/stats');
    return response.data;
  },

  async addOrUpdateWeight(data) {
    const response = await api.post('/weight', data);
    return response.data;
  },

  async deleteWeight(id) {
    const response = await api.delete(`/weight/${id}`);
    return response.data;
  }
};
