export const getErrorMessage = (error, fallback = 'Une erreur est survenue.') => {
  const apiError = error?.response?.data?.error || error?.response?.data?.message;
  const message = apiError || error?.message || error;

  if (typeof message === 'string') return message;
  if (message == null) return fallback;

  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
};
