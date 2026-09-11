import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme, ThemeColors, ThemeStyles, THEME_PRESETS, getThemeById } from '../themes';
import {
  scaleSaturation,
  setSaturation,
  rotateHue,
  ensureMinContrast,
  getOptimalContrastingTextColor,
  isLightColor,
} from '../themes/themeParser';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (id: string) => void;
  presets: Theme[];
  customPresets: Theme[];
  updateThemeColor: (key: keyof ThemeColors, value: string) => void;
  updateThemeStyle: (key: keyof ThemeStyles, value: string) => void;
  applyTheme: (theme: Theme) => void;
  saveCustomPreset: (name?: string) => Theme;
  deleteCustomPreset: (id: string) => void;
  resetToPreset: (id: string) => void;
  rotateThemeHue: (degrees: number) => void;
  setThemeVibrancy: (level: 'muted' | 'balanced' | 'vibrant') => void;
  scaleThemeSaturation: (factor: number, targets?: ('status' | 'all')) => void;
  optimizeThemeContrast: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customPresets, setCustomPresets] = useState<Theme[]>(() => {
    try {
      const saved = localStorage.getItem('humid1-custom-presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentTheme, setCurrentThemeState] = useState<Theme>(() => {
    try {
      const savedThemeJson = localStorage.getItem('humid1-active-theme');
      if (savedThemeJson) {
        return JSON.parse(savedThemeJson);
      }
      const savedId = localStorage.getItem('humid1-theme-id');
      return getThemeById(savedId || 'cedar-dark', customPresets);
    } catch {
      return getThemeById('cedar-dark');
    }
  });

  const setTheme = (id: string) => {
    const theme = getThemeById(id, customPresets);
    setCurrentThemeState(theme);
    localStorage.setItem('humid1-theme-id', id);
    localStorage.setItem('humid1-active-theme', JSON.stringify(theme));
  };

  const applyTheme = (theme: Theme) => {
    setCurrentThemeState(theme);
    localStorage.setItem('humid1-theme-id', theme.id);
    localStorage.setItem('humid1-active-theme', JSON.stringify(theme));
  };

  const updateThemeColor = (key: keyof ThemeColors, value: string) => {
    setCurrentThemeState((prev) => {
      const updatedColors = { ...prev.colors, [key]: value };
      
      // Auto-sync accent text or hover if relevant
      if (key === 'accent') {
        updatedColors.accentHover = value;
      }

      const updated: Theme = {
        ...prev,
        id: prev.id.startsWith('custom-') ? prev.id : `custom-${Date.now()}`,
        name: prev.name.includes('(Custom)') ? prev.name : `${prev.name} (Custom)`,
        colors: updatedColors,
        charts: {
          ...prev.charts,
          rhLine: key === 'accent' ? value : prev.charts.rhLine,
          rhGradientStart: key === 'accent' ? value : prev.charts.rhGradientStart,
          gridColor: key === 'border' ? value : prev.charts.gridColor,
          tooltipBackground: key === 'surfaceSubtle' || key === 'background' ? value : prev.charts.tooltipBackground,
        },
      };

      localStorage.setItem('humid1-active-theme', JSON.stringify(updated));
      return updated;
    });
  };

  const updateThemeStyle = (key: keyof ThemeStyles, value: string) => {
    setCurrentThemeState((prev) => {
      const updatedStyles = { ...prev.styles, [key]: value };
      const updated: Theme = {
        ...prev,
        styles: updatedStyles,
      };
      localStorage.setItem('humid1-active-theme', JSON.stringify(updated));
      return updated;
    });
  };

  const saveCustomPreset = (name?: string): Theme => {
    const newId = `custom-${Date.now()}`;
    const newName = name || `Custom Theme ${customPresets.length + 1}`;
    const savedTheme: Theme = {
      ...currentTheme,
      id: newId,
      name: newName,
      author: 'User Custom',
    };

    const updatedPresets = [...customPresets, savedTheme];
    setCustomPresets(updatedPresets);
    localStorage.setItem('humid1-custom-presets', JSON.stringify(updatedPresets));
    applyTheme(savedTheme);
    return savedTheme;
  };

  const deleteCustomPreset = (id: string) => {
    const updated = customPresets.filter((p) => p.id !== id);
    setCustomPresets(updated);
    localStorage.setItem('humid1-custom-presets', JSON.stringify(updated));
    if (currentTheme.id === id) {
      setTheme('cedar-dark');
    }
  };

  const resetToPreset = (id: string) => {
    setTheme(id);
  };

  const rotateThemeHue = (degrees: number) => {
    setCurrentThemeState((prev) => {
      const c = prev.colors;
      const updatedColors: ThemeColors = {
        ...c,
        accent: rotateHue(c.accent, degrees),
        accentHover: rotateHue(c.accentHover, degrees),
        statusNominal: rotateHue(c.statusNominal, degrees),
        statusWarning: rotateHue(c.statusWarning, degrees),
        statusCritical: rotateHue(c.statusCritical, degrees),
        statusInfo: rotateHue(c.statusInfo, degrees),
      };

      // Re-calculate accent text for contrast
      updatedColors.accentText = getOptimalContrastingTextColor(updatedColors.accent);

      const updated: Theme = {
        ...prev,
        colors: updatedColors,
        charts: {
          ...prev.charts,
          rhLine: updatedColors.accent,
          rhGradientStart: updatedColors.accent,
          tempLine: updatedColors.statusInfo,
        },
      };

      localStorage.setItem('humid1-active-theme', JSON.stringify(updated));
      return updated;
    });
  };

  const setThemeVibrancy = (level: 'muted' | 'balanced' | 'vibrant') => {
    const targetSat = level === 'muted' ? 0.35 : level === 'balanced' ? 0.70 : 1.0;
    setCurrentThemeState((prev) => {
      const c = prev.colors;
      const updatedColors: ThemeColors = {
        ...c,
        statusNominal: setSaturation(c.statusNominal, targetSat),
        statusWarning: setSaturation(c.statusWarning, targetSat),
        statusCritical: setSaturation(c.statusCritical, targetSat),
        statusInfo: setSaturation(c.statusInfo, targetSat),
        accent: setSaturation(c.accent, targetSat),
        accentHover: setSaturation(c.accentHover, targetSat),
      };

      updatedColors.accentText = getOptimalContrastingTextColor(updatedColors.accent);

      const updated: Theme = {
        ...prev,
        colors: updatedColors,
        charts: {
          ...prev.charts,
          rhLine: updatedColors.accent,
          rhGradientStart: updatedColors.accent,
          tempLine: updatedColors.statusInfo,
        },
      };

      localStorage.setItem('humid1-active-theme', JSON.stringify(updated));
      return updated;
    });
  };

  const scaleThemeSaturation = (factor: number, targets: 'status' | 'all' = 'status') => {
    // If factor is close to standard presets, route to direct vibrancy
    if (factor <= 0.65) {
      setThemeVibrancy('muted');
      return;
    }
    if (factor <= 0.88) {
      setThemeVibrancy('balanced');
      return;
    }
    if (factor >= 0.95) {
      setThemeVibrancy('vibrant');
      return;
    }

    setCurrentThemeState((prev) => {
      const c = prev.colors;
      const updatedColors: ThemeColors = {
        ...c,
        statusNominal: scaleSaturation(c.statusNominal, factor),
        statusWarning: scaleSaturation(c.statusWarning, factor),
        statusCritical: scaleSaturation(c.statusCritical, factor),
        statusInfo: scaleSaturation(c.statusInfo, factor),
      };

      if (targets === 'all') {
        updatedColors.accent = scaleSaturation(c.accent, factor);
        updatedColors.accentHover = scaleSaturation(c.accentHover, factor);
        updatedColors.accentText = getOptimalContrastingTextColor(updatedColors.accent);
      }

      const updated: Theme = {
        ...prev,
        colors: updatedColors,
      };

      localStorage.setItem('humid1-active-theme', JSON.stringify(updated));
      return updated;
    });
  };

  const optimizeThemeContrast = () => {
    setCurrentThemeState((prev) => {
      const c = prev.colors;
      const surface = c.surface;
      const isLight = isLightColor(c.background);

      const optimizedColors: ThemeColors = {
        ...c,
        textPrimary: ensureMinContrast(c.textPrimary, surface, 5.5),
        textSecondary: ensureMinContrast(c.textSecondary, surface, 4.5),
        textMuted: ensureMinContrast(c.textMuted, surface, 3.2),
        accentText: getOptimalContrastingTextColor(c.accent),
        border: ensureMinContrast(c.border, surface, isLight ? 1.25 : 1.3),
        borderHighlight: ensureMinContrast(c.borderHighlight, surface, isLight ? 1.6 : 1.7),
      };

      const updated: Theme = {
        ...prev,
        colors: optimizedColors,
      };

      localStorage.setItem('humid1-active-theme', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    const colors = currentTheme.colors;
    const styles = currentTheme.styles;

    // Inject CSS Custom Properties
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

    root.style.setProperty('--app-border-radius', styles.borderRadius || '16px');
    root.style.setProperty('--app-card-radius', styles.cardRadius || '16px');
    root.style.setProperty('--app-button-radius', styles.buttonRadius || '10px');
    root.style.setProperty('--app-backdrop-blur', styles.backdropBlur || '12px');
    root.style.setProperty('--app-font-sans', styles.fontFamily || "'Plus Jakarta Sans', sans-serif");
    root.style.setProperty('--app-font-mono', styles.monoFamily || "'JetBrains Mono', monospace");
  }, [currentTheme]);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        presets: THEME_PRESETS,
        customPresets,
        updateThemeColor,
        updateThemeStyle,
        applyTheme,
        saveCustomPreset,
        deleteCustomPreset,
        resetToPreset,
        rotateThemeHue,
        setThemeVibrancy,
        scaleThemeSaturation,
        optimizeThemeContrast,
      }}
    >
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
