import axios from 'axios';

const csrfStorageKey = 'fittrack-csrf-token';
let csrfToken = sessionStorage.getItem(csrfStorageKey) || '';

const getCookie = (name) => {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : '';
};

const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);
const envBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
const baseURL = envBaseUrl || (import.meta.env.DEV ? '/api' : undefined);

if (import.meta.env.PROD && !envBaseUrl) {
  console.error('VITE_API_URL is required in production. Expected the Railway API URL ending with /api.');
}

export const setCsrfToken = (token) => {
  csrfToken = token || '';

  if (csrfToken) {
    sessionStorage.setItem(csrfStorageKey, csrfToken);
  } else {
    sessionStorage.removeItem(csrfStorageKey);
  }
};

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (unsafeMethods.has(String(config.method).toLowerCase())) {
      const requestCsrfToken = csrfToken || getCookie('csrfToken');
      if (requestCsrfToken) {
        config.headers['x-csrf-token'] = requestCsrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response.data?.csrfToken) {
      setCsrfToken(response.data.csrfToken);
    }

    return response;
  },
  (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      console.warn(`[auth] ${status} ${error.config?.method?.toUpperCase() || 'GET'} ${error.config?.url}`, error.response?.data);
    }
    return Promise.reject(error);
  }
);

export default api;
