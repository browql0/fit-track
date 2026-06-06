import api from './api';

export const coachService = {
  async getCoach() {
    const response = await api.get('/coach');
    return response.data;
  },

  async getHistory(days = 30) {
    const response = await api.get('/coach/history', { params: { days } });
    return response.data;
  },
};
