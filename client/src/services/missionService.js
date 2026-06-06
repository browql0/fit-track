import api from './api';

export const missionService = {
  async completeMission({ missionId, missionDate, xpEarned }) {
    const response = await api.post('/missions/complete', { missionId, missionDate, xpEarned });
    return response.data;
  },

  async getCompletions(days = 30) {
    const response = await api.get('/missions/completions', { params: { days } });
    return response.data;
  },
};
