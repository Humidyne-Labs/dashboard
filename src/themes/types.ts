export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  border: string;
  borderHighlight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentText: string;
  statusNominal: string;
  statusWarning: string;
  statusCritical: string;
  statusInfo: string;
}

export interface ThemeCharts {
  gridColor: string;
  rhLine: string;
  rhGradientStart: string;
  tempLine: string;
  tooltipBackground: string;
  tooltipBorder: string;
}

export interface ThemeStyles {
  borderRadius: string;
  cardRadius: string;
  buttonRadius: string;
  fontFamily: string;
  monoFamily: string;
  backdropBlur: string;
  borderWidth: string;
  density: string;
}

export interface Theme {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  colors: ThemeColors;
  charts: ThemeCharts;
  styles: ThemeStyles;
}
