// Optimized theme provider with smooth transitions
import React, { createContext, useContext, useEffect, memo } from 'react';
import { useTheme } from '../store/uiStore';

interface ThemeContextType {
  theme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider = memo<ThemeProviderProps>(({ children }) => {
  const theme = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    
    // Use CSS custom properties for instant theme switching
    root.style.setProperty('--theme-transition', 'all 0.15s ease-out');
    
    // Apply theme class efficiently
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Force a repaint to ensure smooth transition
    root.offsetHeight;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
});

ThemeProvider.displayName = 'ThemeProvider';