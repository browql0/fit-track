import { useCallback, useMemo, useState } from 'react';
import { ScannerContext } from './scannerContext';

const today = () => new Date().toISOString().split('T')[0];

export const ScannerProvider = ({ children }) => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('lunch');
  const [selectedDate, setSelectedDate] = useState(today());
  const [onProductAdded, setOnProductAdded] = useState(null);

  const openScanner = useCallback((options = {}) => {
    setSelectedMealType(options.mealType || 'lunch');
    setSelectedDate(options.entryDate || options.date || today());
    setOnProductAdded(() => options.onProductAdded || null);
    setScannerOpen(true);
  }, []);

  const closeScanner = useCallback(() => {
    setScannerOpen(false);
    setOnProductAdded(null);
  }, []);

  const value = useMemo(() => ({
    scannerOpen,
    openScanner,
    closeScanner,
    selectedMealType,
    selectedDate,
    onProductAdded,
  }), [scannerOpen, openScanner, closeScanner, selectedMealType, selectedDate, onProductAdded]);

  return (
    <ScannerContext.Provider value={value}>
      {children}
    </ScannerContext.Provider>
  );
};
