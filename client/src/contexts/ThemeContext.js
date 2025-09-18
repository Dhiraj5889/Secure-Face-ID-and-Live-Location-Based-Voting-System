import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('highContrast') === '1');
  const [largeText, setLargeText] = useState(() => localStorage.getItem('largeText') === '1');

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) root.classList.add('theme-high-contrast'); else root.classList.remove('theme-high-contrast');
    if (largeText) root.classList.add('theme-large-text'); else root.classList.remove('theme-large-text');
  }, [highContrast, largeText]);

  const value = useMemo(() => ({
    highContrast,
    largeText,
    toggleHighContrast: () => {
      setHighContrast((v) => {
        const nv = !v; localStorage.setItem('highContrast', nv ? '1' : '0'); return nv;
      });
    },
    toggleLargeText: () => {
      setLargeText((v) => {
        const nv = !v; localStorage.setItem('largeText', nv ? '1' : '0'); return nv;
      });
    }
  }), [highContrast, largeText]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export default ThemeContext;


