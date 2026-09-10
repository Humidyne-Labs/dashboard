import { Theme } from '../types';

export const enkiaTokyoNightLightTheme: Theme = {
  "id": "enkia-tokyo-night-light",
  "name": "Tokyo Night Light",
  "author": "enkia",
  "version": "1.1.2",
  "description": "Custom humidor monitoring palette (Tokyo Night Light).",
  "colors": {
    "background": "#e6e7ed",
    "surface": "#d6d8df",
    "surfaceElevated": "#d6d8df",
    "surfaceSubtle": "#e6e7ed",
    "border": "#c1c2c7",
    "borderHighlight": "#70728033",
    "textPrimary": "#343b59",
    "textSecondary": "#363c4d",
    "textMuted": "#4a5272",
    "accent": "#2959aa",
    "accentHover": "#2959aaAA",
    "accentText": "#fff",
    "statusNominal": "#888b94",
    "statusWarning": "#8f5e15",
    "statusCritical": "#bd4040",
    "statusInfo": "#0da0ba"
  },
  "charts": {
    "gridColor": "#c1c2c7",
    "rhLine": "#2959aa",
    "rhGradientStart": "#2959aa",
    "tempLine": "#6c6e75",
    "tooltipBackground": "#d6d8df",
    "tooltipBorder": "#70728033"
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
