import { Theme } from '../types';

export const studioLightTheme: Theme = {
  id: "studio-light",
  name: "Studio Light",
  author: "Humid1 Clean",
  version: "1.0.0",
  description: "High-contrast clinical light mode designed for bright room visibility",
  colors: {
    background: "#f8fafc",
    surface: "#ffffff",
    surfaceElevated: "#f1f5f9",
    surfaceSubtle: "#e2e8f0",
    border: "#e2e8f0",
    borderHighlight: "#cbd5e1",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#64748b",
    accent: "#b45309", // High contrast amber for light backgrounds
    accentHover: "#92400e",
    accentText: "#ffffff",
    statusNominal: "#059669",
    statusWarning: "#d97706",
    statusCritical: "#dc2626",
    statusInfo: "#0284c7"
  },
  charts: {
    gridColor: "#cbd5e1",
    rhLine: "#d97706",
    rhGradientStart: "#d97706",
    tempLine: "#0284c7",
    tooltipBackground: "#ffffff",
    tooltipBorder: "#cbd5e1"
  },
  styles: {
    borderRadius: "16px",
    cardRadius: "16px",
    buttonRadius: "10px",
    fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui",
    monoFamily: "'JetBrains Mono', monospace",
    backdropBlur: "12px",
    borderWidth: "1px",
    density: "comfortable"
  }
};
