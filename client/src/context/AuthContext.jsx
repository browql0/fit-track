import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { AuthContext } from './authContext';
import { prefetchMainTabs, queryClient } from '../services/queryClient';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const data = await authService.getMe();
        if (data.user) {
          setUser(data.user);
          prefetchMainTabs();
        }
      } catch (error) {
        const status = error.response?.status;
        if (status === 401) {
          setUser(null);
        } else {
          console.error('Failed to fetch user session', error);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    if (data.user) {
      setUser(data.user);
    }
    prefetchMainTabs();
    return data;
  };

  const register = async (email, password) => {
    const data = await authService.register(email, password);
    if (data.user && data.csrfToken) {
      setUser(data.user);
      prefetchMainTabs();
    }
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
