import { Theme } from '../types';

export const enkiaTokyoNightTheme: Theme = {
  "id": "enkia-tokyo-night",
  "name": "Tokyo Night",
  "author": "enkia",
  "version": "1.1.2",
  "description": "Custom humidor monitoring palette (Tokyo Night).",
  "colors": {
    "background": "#1a1b26",
    "surface": "#16161e",
    "surfaceElevated": "#16161e",
    "surfaceSubtle": "#1a1b26",
    "border": "#101014",
    "borderHighlight": "#545c7e33",
    "textPrimary": "#a9b1d6",
    "textSecondary": "#787c99",
    "textMuted": "#787c998A",
    "accent": "#3d59a1",
    "accentHover": "#3d59a1AA",
    "accentText": "#fff",
    "statusNominal": "#51597d",
    "statusWarning": "#e0af68",
    "statusCritical": "#db4b4b",
    "statusInfo": "#0da0ba"
  },
  "charts": {
    "gridColor": "#101014",
    "rhLine": "#3d59a1",
    "rhGradientStart": "#3d59a1",
    "tempLine": "#5a638c",
    "tooltipBackground": "#16161e",
    "tooltipBorder": "#545c7e33"
  },
  "styles": {
    "borderRadius": "12px",
    "cardRadius": "12px",
    "buttonRadius": "8px",
    "fontFamily": "Inter, ui-sans-serif, system-ui",
    "monoFamily": "'JetBrains Mono', monospace",
    "backdropBlur": "8px",
    "borderWidth": "1px",
    "density": "comfortable"
  }
};
