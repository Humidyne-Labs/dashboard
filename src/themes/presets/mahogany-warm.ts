import { Theme } from '../types';

export const mahoganyWarmTheme: Theme = {
  id: "mahogany-warm",
  name: "Mahogany Warmth",
  author: "Humid1 Community",
  version: "1.0.0",
  description: "Rich mahogany wood grain undertones with copper and burnt orange accents",
  colors: {
    background: "#120804",
    surface: "#1a0d07",
    surfaceElevated: "#2d160c",
    surfaceSubtle: "#0a0402",
    border: "#331c11",
    borderHighlight: "#4c2a1a",
    textPrimary: "#fcf8f5",
    textSecondary: "#cbb4a6",
    textMuted: "#8e7263",
    accent: "#ea580c",
    accentHover: "#c2410c",
    accentText: "#fcf8f5",
    statusNominal: "#10b981",
    statusWarning: "#ea580c",
    statusCritical: "#dc2626",
    statusInfo: "#0284c7"
  },
  charts: {
    gridColor: "#2a150c",
    rhLine: "#ea580c",
    rhGradientStart: "#ea580c",
    tempLine: "#38bdf8",
    tooltipBackground: "#1a0d07",
    tooltipBorder: "#4c2a1a"
  },
  styles: {
    borderRadius: "14px",
    cardRadius: "14px",
    buttonRadius: "8px",
    fontFamily: "Georgia, serif",
    monoFamily: "'JetBrains Mono', monospace",
    backdropBlur: "10px",
    borderWidth: "1px",
    density: "comfortable"
  }
};
