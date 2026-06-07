import axios from 'axios';

const csrfStorageKey = 'fittrack-csrf-token';
const authStorageKey = 'fittrack-auth-token';
let csrfToken = sessionStorage.getItem(csrfStorageKey) || '';
let authToken = sessionStorage.getItem(authStorageKey) || localStorage.getItem(authStorageKey) || '';

const getCookie = (name) => {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : '';
};

const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);
const csrfExemptPaths = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/verify-email',
  '/auth/resend-code',
]);
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

export const setAuthToken = (token) => {
  authToken = token || '';

  if (authToken) {
    sessionStorage.setItem(authStorageKey, authToken);
    localStorage.setItem(authStorageKey, authToken);
  } else {
    sessionStorage.removeItem(authStorageKey);
    localStorage.removeItem(authStorageKey);
  }
};

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const csrfBootstrapApi = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let csrfRefreshPromise = null;

const refreshCsrfToken = async () => {
  if (!csrfRefreshPromise) {
    csrfRefreshPromise = csrfBootstrapApi
      .get('/auth/me', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      })
      .then((response) => {
        if (response.data?.csrfToken) {
          setCsrfToken(response.data.csrfToken);
        }
        return response.data?.csrfToken || getCookie('csrfToken') || '';
      })
      .finally(() => {
        csrfRefreshPromise = null;
      });
  }

  return csrfRefreshPromise;
};

api.interceptors.request.use(
  async (config) => {
    const requestPath = String(config.url || '').split('?')[0];

    if (authToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    if (unsafeMethods.has(String(config.method).toLowerCase()) && !csrfExemptPaths.has(requestPath)) {
      let requestCsrfToken = getCookie('csrfToken');
      if (!requestCsrfToken && !config.skipCsrfRefresh) {
        requestCsrfToken = await refreshCsrfToken();
      }
      requestCsrfToken = getCookie('csrfToken') || requestCsrfToken || csrfToken;
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
    if (response.data?.token) {
      setAuthToken(response.data.token);
    }

    if (response.data?.csrfToken) {
      setCsrfToken(response.data.csrfToken);
    }

    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config;
    const csrfInvalid = status === 403 && error.response?.data?.error === 'Protection CSRF invalide';
    const requestPath = String(originalRequest?.url || '').split('?')[0];

    if (csrfInvalid && originalRequest && !originalRequest._csrfRetry && !csrfExemptPaths.has(requestPath)) {
      originalRequest._csrfRetry = true;
      try {
        await refreshCsrfToken();
        return api(originalRequest);
      } catch {
        // Fall through to the normal auth/error handling below.
      }
    }

    const expectedAnonymousMe = status === 401 && requestPath === '/auth/me' && !authToken;
    if ((status === 401 || status === 403) && !expectedAnonymousMe) {
      console.warn(`[auth] ${status} ${error.config?.method?.toUpperCase() || 'GET'} ${error.config?.url}`, error.response?.data);
    }
    return Promise.reject(error);
  }
);

export default api;
