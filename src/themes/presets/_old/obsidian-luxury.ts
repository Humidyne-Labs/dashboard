import { Theme } from '../types';

export const obsidianLuxuryTheme: Theme = {
  id: "obsidian-luxury",
  name: "Obsidian Luxury",
  author: "Humid1 Premium",
  version: "1.0.0",
  description: "Pitch black obsidian surfaces paired with brilliant luxury gold highlights",
  colors: {
    background: "#050505",
    surface: "#0d0d0d",
    surfaceElevated: "#181818",
    surfaceSubtle: "#020202",
    border: "#1f1f1f",
    borderHighlight: "#e5c15840", // Subtle gold border glow
    textPrimary: "#fcfaf2",
    textSecondary: "#a1a1aa",
    textMuted: "#52525b",
    accent: "#e5c158",
    accentHover: "#ca9f1d",
    accentText: "#050505",
    statusNominal: "#10b981",
    statusWarning: "#e5c158",
    statusCritical: "#ef4444",
    statusInfo: "#38bdf8"
  },
  charts: {
    gridColor: "#1a1a1a",
    rhLine: "#e5c158",
    rhGradientStart: "#e5c158",
    tempLine: "#a1a1aa",
    tooltipBackground: "#0d0d0d",
    tooltipBorder: "#e5c15840"
  },
  styles: {
    borderRadius: "12px",
    cardRadius: "12px",
    buttonRadius: "8px",
    fontFamily: "'Cinzel', Georgia, serif",
    monoFamily: "'JetBrains Mono', monospace",
    backdropBlur: "8px",
    borderWidth: "1px",
    density: "comfortable"
  }
};
