import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, THEME_PRESETS, getThemeById } from '../themes';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (id: string) => void;
  presets: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('humid1-theme-id');
    return getThemeById(saved || 'cedar-dark');
  });

  const setTheme = (id: string) => {
    const theme = getThemeById(id);
    setCurrentThemeState(theme);
    localStorage.setItem('humid1-theme-id', id);
  };

  useEffect(() => {
    const root = document.documentElement;
    const colors = currentTheme.colors;
    const styles = currentTheme.styles;

    // Inject CSS Custom Properties (Variables)
    root.style.setProperty('--app-bg', colors.background);
    root.style.setProperty('--app-surface', colors.surface);
    root.style.setProperty('--app-surface-elevated', colors.surfaceElevated);
    root.style.setProperty('--app-surface-subtle', colors.surfaceSubtle);
    root.style.setProperty('--app-border', colors.border);
    root.style.setProperty('--app-border-highlight', colors.borderHighlight);
    root.style.setProperty('--app-text-primary', colors.textPrimary);
    root.style.setProperty('--app-text-secondary', colors.textSecondary);
    root.style.setProperty('--app-text-muted', colors.textMuted);
    root.style.setProperty('--app-accent', colors.accent);
    root.style.setProperty('--app-accent-hover', colors.accentHover);
    root.style.setProperty('--app-accent-text', colors.accentText);
    root.style.setProperty('--app-status-nominal', colors.statusNominal);
    root.style.setProperty('--app-status-warning', colors.statusWarning);
    root.style.setProperty('--app-status-critical', colors.statusCritical);
    root.style.setProperty('--app-status-info', colors.statusInfo);

    root.style.setProperty('--app-border-radius', styles.borderRadius);
    root.style.setProperty('--app-card-radius', styles.cardRadius);
    root.style.setProperty('--app-button-radius', styles.buttonRadius);
    root.style.setProperty('--app-backdrop-blur', styles.backdropBlur);
    root.style.setProperty('--app-font-sans', styles.fontFamily);
    root.style.setProperty('--app-font-mono', styles.monoFamily);
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, presets: THEME_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
