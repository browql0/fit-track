import api from './api';

export const recipeService = {
  getRecipes: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.category) searchParams.append('category', params.category);
    if (params.proteinMin) searchParams.append('proteinMin', params.proteinMin);
    if (params.caloriesMax) searchParams.append('caloriesMax', params.caloriesMax);
    if (params.prepTimeMax) searchParams.append('prepTimeMax', params.prepTimeMax);
    if (params.goal) searchParams.append('goal', params.goal);
    if (params.tags?.length) searchParams.append('tags', params.tags.join(','));
    const response = await api.get(`/recipes${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
    return response.data;
  },

  getRecipeById: async (id) => {
    const response = await api.get(`/recipes/${id}`);
    return response.data;
  },

  getHighProtein: async () => {
    const response = await api.get('/recipes/high-protein');
    return response.data;
  },

  matchIngredients: async (ingredients) => {
    const response = await api.post('/recipes/match-ingredients', { ingredients });
    return response.data.recipes;
  },

  generate: async (payload) => {
    const response = await api.post('/recipes/generate', payload);
    return response.data.recipes;
  },

  save: async (id) => {
    const response = await api.post(`/recipes/${id}/save`);
    return response.data;
  },

  unsave: async (id) => {
    const response = await api.delete(`/recipes/${id}/save`);
    return response.data;
  },

  addToFoodLog: async (id, payload = {}) => {
    const response = await api.post(`/recipes/${id}/add-to-food-log`, payload);
    return response.data;
  },

  getCoachSuggestion: async () => {
    const response = await api.get('/recipes/coach-suggestion');
    return response.data;
  },

  getRecommendedToday: async () => {
    const response = await api.get('/recipes/recommended-today');
    return response.data;
  },
};
