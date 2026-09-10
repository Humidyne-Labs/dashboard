import { Theme } from '../types';

export const emeraldBotanicalTheme: Theme = {
  id: "emerald-botanical",
  name: "Emerald Botanical",
  author: "Humid1 Community",
  version: "1.0.0",
  description: "Deep jungle greens and rain forest teals accented with vibrant emerald",
  colors: {
    background: "#020f0b",
    surface: "#041a14",
    surfaceElevated: "#092920",
    surfaceSubtle: "#010806",
    border: "#0a362a",
    borderHighlight: "#10b98140",
    textPrimary: "#f0fdf4",
    textSecondary: "#86efac",
    textMuted: "#4ade8050",
    accent: "#10b981",
    accentHover: "#059669",
    accentText: "#020f0b",
    statusNominal: "#34d399",
    statusWarning: "#fbbf24",
    statusCritical: "#f87171",
    statusInfo: "#60a5fa"
  },
  charts: {
    gridColor: "#0a362a",
    rhLine: "#10b981",
    rhGradientStart: "#10b981",
    tempLine: "#60a5fa",
    tooltipBackground: "#041a14",
    tooltipBorder: "#10b98140"
  },
  styles: {
    borderRadius: "18px",
    cardRadius: "18px",
    buttonRadius: "12px",
    fontFamily: "'Plus Jakarta Sans', system-ui",
    monoFamily: "'JetBrains Mono', monospace",
    backdropBlur: "16px",
    borderWidth: "1px",
    density: "comfortable"
  }
};
