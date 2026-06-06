import api from './api';

export const measurementService = {
  async getMeasurements(limit = 30) {
    const response = await api.get(`/measurements?limit=${limit}`);
    return response.data;
  },

  async getLatestMeasurement() {
    const response = await api.get('/measurements/latest');
    return response.data;
  },

  async getMeasurementProgress() {
    const response = await api.get('/measurements/progress');
    return response.data;
  },

  async addMeasurement(data) {
    const response = await api.post('/measurements', data);
    return response.data;
  },

  async updateMeasurement(id, data) {
    const response = await api.put(`/measurements/${id}`, data);
    return response.data;
  },

  async deleteMeasurement(id) {
    const response = await api.delete(`/measurements/${id}`);
    return response.data;
  }
};
