import api from './api';

export const goalSnapshotService = {
  getGoalSnapshots: async () => {
    const response = await api.get('/goal-snapshots');
    return response.data;
  },
  
  getCurrentGoalSnapshot: async () => {
    const response = await api.get('/goal-snapshots/current');
    return response.data;
  }
};
