import api from './api';

export const exerciseService = {
  getAllExercises: async () => {
    const response = await api.get('/exercises');
    return response.data;
  }
};
