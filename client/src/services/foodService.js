import api from './api';

export const foodService = {
  searchFoods: async (search, category) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    
    const url = `/foods${params.toString() ? '?' + params.toString() : ''}`;
    const response = await api.get(url);
    return response.data;
  },
  
  getFoodById: async (id) => {
    const response = await api.get(`/foods/${id}`);
    return response.data;
  },
  
  createCustomFood: async (data) => {
    const response = await api.post('/foods', data);
    return response.data;
  },

  externalSearch: async (query) => {
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    const response = await api.get(`/foods/external-search?${params.toString()}`);
    return response.data;
  },

  estimateFood: async (description) => {
    const response = await api.post('/foods/estimate', { description });
    return response.data;
  },
  
  getFoodEntries: async (date) => {
    const url = date ? `/food-entries?date=${date}` : '/food-entries';
    const response = await api.get(url);
    return response.data;
  },
  
  getDailySummary: async (date) => {
    const url = date ? `/food-entries/summary?date=${date}` : '/food-entries/summary';
    const response = await api.get(url);
    return response.data;
  },
  
  addFoodEntry: async (data) => {
    const response = await api.post('/food-entries', data);
    return response.data;
  },
  
  updateFoodEntry: async (id, data) => {
    const response = await api.put(`/food-entries/${id}`, data);
    return response.data;
  },
  
  deleteFoodEntry: async (id) => {
    const response = await api.delete(`/food-entries/${id}`);
    return response.data;
  }
};
