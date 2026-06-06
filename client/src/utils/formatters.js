export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatNumber = (num, decimals = 1) => {
  if (num === null || num === undefined) return '';
  return Number(num).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

export const formatWeight = (kg) => {
  if (kg === null || kg === undefined) return '';
  return `${formatNumber(kg, 1)} kg`;
};

export const formatCalories = (cal) => {
  if (cal === null || cal === undefined) return '';
  return `${formatNumber(cal, 0)} kcal`;
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bonjour'; 
  return 'Bonsoir';
};

export const getRelativeDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Hier';
  }
  
  return formatDate(dateString);
};
