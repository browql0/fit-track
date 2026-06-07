import { createContext, useContext } from 'react';

export const ScannerContext = createContext(null);

export const useScanner = () => {
  const value = useContext(ScannerContext);
  if (!value) {
    throw new Error('useScanner must be used within ScannerProvider');
  }
  return value;
};
