import api from './api';

export const workoutService = {
  getWorkouts: async (date) => {
    const url = date ? `/workouts?date=${date}` : '/workouts';
    const response = await api.get(url);
    return response.data;
  },
  
  getWeeklySummary: async () => {
    const response = await api.get('/workouts/week');
    return response.data;
  },
  
  addWorkout: async (data) => {
    const response = await api.post('/workouts', data);
    return response.data;
  },
  
  updateWorkout: async (id, data) => {
    const response = await api.put(`/workouts/${id}`, data);
    return response.data;
  },
  
  deleteWorkout: async (id) => {
    const response = await api.delete(`/workouts/${id}`);
    return response.data;
  }
};
