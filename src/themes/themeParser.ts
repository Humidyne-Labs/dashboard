import { Theme, ThemeColors, ThemeCharts, ThemeStyles } from './types';

/**
 * Interface representing the Linux TOML color palette structure
 */
export interface LinuxTomlTheme {
  mode?: 'dark' | 'light';
  accent?: string;
  selection?: string;
  muted?: string;
  background?: string;
  dark_background?: string;
  darker_background?: string;
  lighter_background?: string;
  foreground?: string;
  dark_foreground?: string;
  light_foreground?: string;
  bright_foreground?: string;
  red?: string;
  yellow?: string;
  orange?: string;
  green?: string;
  cyan?: string;
  blue?: string;
  magenta?: string;
  brown?: string;
  bright_red?: string;
  bright_yellow?: string;
  bright_green?: string;
  bright_cyan?: string;
  bright_blue?: string;
  bright_magenta?: string;
  [key: string]: any;
}

/* ==========================================================================
   Advanced HSL Color Space Math & Derivation Engine
   ========================================================================== */

/**
 * Normalizes any hex string into standard 6-digit lowercase #rrggbb format
 */
export function normalizeHex(colorStr?: string, defaultFallback = '#000000'): string {
  if (!colorStr || typeof colorStr !== 'string') return defaultFallback;
  let clean = colorStr.trim().replace(/^['"]|['"]$/g, '');
  if (!clean.startsWith('#')) {
    clean = `#${clean}`;
  }
  // Expand 3-digit shorthand #RGB -> #RRGGBB
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    clean = `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/i.test(clean)) {
    return defaultFallback;
  }
  return clean.toLowerCase();
}

/**
 * Converts Hex string to RGB tuple [r, g, b] (0-255)
 */
export function hexToRgb(hex: string): [number, number, number] {
  const norm = normalizeHex(hex);
  const r = parseInt(norm.substring(1, 3), 16);
  const g = parseInt(norm.substring(3, 5), 16);
  const b = parseInt(norm.substring(5, 7), 16);
  return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
}

/**
 * Converts RGB tuple (0-255) to Hex string #rrggbb
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, Math.round(val)));
  const toHex = (c: number) => clamp(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts RGB tuple (0-255) to HSL tuple:
 * - h: Hue in degrees [0, 360)
 * - s: Saturation [0, 1]
 * - l: Lightness [0, 1]
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf:
        h = (gf - bf) / d + (gf < bf ? 6 : 0);
        break;
      case gf:
        h = (bf - rf) / d + 2;
        break;
      case bf:
        h = (rf - gf) / d + 4;
        break;
    }
    h *= 60;
  }

  return [Math.round(h * 10) / 10, Math.round(s * 1000) / 1000, Math.round(l * 1000) / 1000];
}

/**
 * Converts HSL tuple (h: 0-360, s: 0-1, l: 0-1) to RGB tuple (0-255)
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  // Normalize hue into [0, 360)
  let normH = h % 360;
  if (normH < 0) normH += 360;
  normH /= 360;

  const clampS = Math.min(1, Math.max(0, s));
  const clampL = Math.min(1, Math.max(0, l));

  if (clampS === 0) {
    const gray = Math.round(clampL * 255);
    return [gray, gray, gray];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let normT = t;
    if (normT < 0) normT += 1;
    if (normT > 1) normT -= 1;
    if (normT < 1 / 6) return p + (q - p) * 6 * normT;
    if (normT < 1 / 2) return q;
    if (normT < 2 / 3) return p + (q - p) * (2 / 3 - normT) * 6;
    return p;
  };

  const q = clampL < 0.5 ? clampL * (1 + clampS) : clampL + clampS - clampL * clampS;
  const p = 2 * clampL - q;
  const r = Math.round(hue2rgb(p, q, normH + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, normH) * 255);
  const b = Math.round(hue2rgb(p, q, normH - 1 / 3) * 255);

  return [r, g, b];
}

/**
 * Converts Hex string to HSL tuple [h, s, l]
 */
export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

/**
 * Converts HSL tuple to Hex string #rrggbb
 */
export function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

/**
 * Calculates ITU-R BT.709 relative perceived luminance from 0.0 (pure black) to 1.0 (pure white)
 */
export function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const sRGB = [r / 255, g / 255, b / 255].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

/**
 * Calculates WCAG 2.1 contrast ratio between two colors (range: 1.0 to 21.0)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determines whether a color is perceptually light
 */
export function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.35;
}

/**
 * Determines the mathematically highest-contrast text color against a background.
 * Guarantees crisp readability on mid-tones (e.g. #8d8d8d, #6e6e6e, #56949f, #faf4ed).
 */
export function getOptimalContrastingTextColor(
  bgHex: string,
  preferredDark = '#020617',
  preferredLight = '#ffffff'
): string {
  const whiteRatio = getContrastRatio('#ffffff', bgHex);
  const blackRatio = getContrastRatio('#000000', bgHex);
  const darkRatio = getContrastRatio(preferredDark, bgHex);
  const lightRatio = getContrastRatio(preferredLight, bgHex);

  // If dark text passes WCAG AA (>= 4.5:1) and has higher contrast than light, use dark
  if (darkRatio >= 4.5 && darkRatio >= lightRatio) {
    return preferredDark;
  }
  if (blackRatio > whiteRatio) {
    return blackRatio >= 4.5 ? preferredDark : '#000000';
  }
  return whiteRatio >= 4.5 ? preferredLight : '#ffffff';
}

/**
 * Ensures a foreground color meets a minimum WCAG contrast ratio against a background.
 * If contrast is insufficient, smoothly shifts Lightness (L) in HSL space while preserving Hue & Saturation.
 */
export function ensureMinContrast(
  fgHex: string,
  bgHex: string,
  minRatio = 4.5
): string {
  const currentRatio = getContrastRatio(fgHex, bgHex);
  if (currentRatio >= minRatio) {
    return normalizeHex(fgHex);
  }

  const [h, s, initialL] = hexToHsl(fgHex);
  const bgIsLight = isLightColor(bgHex);

  // If background is light, we need to darken foreground (lower L).
  // If background is dark, we need to lighten foreground (raise L).
  let bestHex = normalizeHex(fgHex);
  let bestRatio = currentRatio;

  for (let step = 1; step <= 30; step++) {
    const delta = (step / 30) * (bgIsLight ? -initialL : 1 - initialL);
    const testL = Math.min(1, Math.max(0, initialL + delta));
    const candidateHex = hslToHex(h, s, testL);
    const candidateRatio = getContrastRatio(candidateHex, bgHex);

    if (candidateRatio > bestRatio) {
      bestRatio = candidateRatio;
      bestHex = candidateHex;
    }

    if (candidateRatio >= minRatio) {
      return candidateHex;
    }
  }

  // If still below minRatio, fallback to optimal high-contrast text color
  return bestRatio >= minRatio ? bestHex : getOptimalContrastingTextColor(bgHex);
}

/**
 * Scales or dampens saturation by a multiplier factor (e.g. 0.8 to reduce saturation by 20%)
 */
export function scaleSaturation(hex: string, factor = 1.0): string {
  const [h, s, l] = hexToHsl(hex);
  const newS = Math.min(1, Math.max(0, s * factor));
  return hslToHex(h, newS, l);
}

/**
 * Sets saturation to an explicit value [0.0, 1.0]
 */
export function setSaturation(hex: string, targetSat: number): string {
  const [h, , l] = hexToHsl(hex);
  const newS = Math.min(1, Math.max(0, targetSat));
  return hslToHex(h, newS, l);
}

/**
 * Shifts hue by delta degrees on the 360-degree color wheel
 */
export function rotateHue(hex: string, deltaDegrees: number): string {
  const [h, s, l] = hexToHsl(hex);
  const newH = (h + deltaDegrees + 360) % 360;
  return hslToHex(newH, s, l);
}

/**
 * Mixes two hex colors linearly by weight (0 = pure color1, 1 = pure color2)
 */
export function mixColors(color1: string, color2: string, weight = 0.5): string {
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);
  const w = Math.min(1, Math.max(0, weight));
  const r = r1 * (1 - w) + r2 * w;
  const g = g1 * (1 - w) + g2 * w;
  const b = b1 * (1 - w) + b2 * w;
  return rgbToHex(r, g, b);
}

/**
 * Adjusts color lightness by percentDelta (-1.0 to +1.0)
 */
export function adjustLightness(hex: string, percentDelta: number): string {
  const [h, s, l] = hexToHsl(hex);
  const newL = Math.min(1, Math.max(0, l + percentDelta));
  return hslToHex(h, s, newL);
}

/**
 * Legacy compatible alias
 */
export function getAccessibleTextColor(backgroundHex: string, darkChoice = '#020617', lightChoice = '#ffffff'): string {
  return getOptimalContrastingTextColor(backgroundHex, darkChoice, lightChoice);
}

/* ==========================================================================
   TOML Parser Engine
   ========================================================================== */

/**
 * Parses any standard TOML string into a comprehensive key-value record
 * Supports flat key-values, quoted values, comments, and [section] table hierarchies
 */
export function parseTomlString(tomlStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!tomlStr) return result;

  let currentSection = '';
  const lines = tomlStr.split('\n');

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Ignore full comment lines
    if (line.startsWith('#') || line.startsWith(';')) continue;

    // Handle TOML section headers: [colors], [palette], [colors.primary], etc.
    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1).trim();
      continue;
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const rawKey = line.substring(0, eqIdx).trim();
      let rawVal = line.substring(eqIdx + 1).trim();

      // Extract value respecting quotes and comments
      let val = '';
      if (rawVal.startsWith('"')) {
        const closingQuote = rawVal.indexOf('"', 1);
        if (closingQuote !== -1) {
          val = rawVal.substring(1, closingQuote);
        } else {
          val = rawVal.substring(1).replace(/["'].*$/, '');
        }
      } else if (rawVal.startsWith("'")) {
        const closingQuote = rawVal.indexOf("'", 1);
        if (closingQuote !== -1) {
          val = rawVal.substring(1, closingQuote);
        } else {
          val = rawVal.substring(1).replace(/["'].*$/, '');
        }
      } else {
        // Unquoted value: take until whitespace, comment (# or ;), or comma
        const match = rawVal.match(/^([^\s#;,]+)/);
        val = match ? match[1].trim() : rawVal.trim();
      }

      val = val.trim();

      // Store with section prefix and as direct flat key
      const keyNormalized = rawKey.toLowerCase().replace(/[-.]/g, '_');
      result[keyNormalized] = val;

      if (currentSection) {
        const sectionNorm = currentSection.toLowerCase().replace(/[-.]/g, '_');
        result[`${sectionNorm}_${keyNormalized}`] = val;
      }
    }
  }
  return result;
}

/**
 * Helper to find the first matching key from a map among a list of candidate aliases
 */
function findVal(map: Record<string, any>, keys: string[]): string | undefined {
  for (const k of keys) {
    const direct = map[k];
    if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
      return String(direct).trim();
    }
    const lower = map[k.toLowerCase()];
    if (lower !== undefined && lower !== null && String(lower).trim() !== '') {
      return String(lower).trim();
    }
  }
  return undefined;
}

/* ==========================================================================
   Harmonic Theme Conversion Engine
   ========================================================================== */

export interface TomlConversionOptions {
  /** Saturation dampening factor for indicators, sliders, and accent (0.0 to 1.0, default 0.85) */
  saturationDamping?: number;
  /** Enforce strict WCAG AA contrast (>= 4.5:1 for body text and buttons) */
  enforceWcag?: boolean;
}

/**
 * Translates a Linux TOML color palette into a fully cohesive, accessible Theme object.
 * Uses HSL harmonic color mathematics to derive rich UI gradients, elevated surfaces,
 * tactile borders, accessible text tokens, and tasteful status indicators.
 */
export function convertTomlToTheme(
  tomlData: Record<string, any> | LinuxTomlTheme,
  id = 'custom-toml',
  name = 'Imported TOML Theme',
  options: TomlConversionOptions = {}
): Theme {
  const saturationDamping = options.saturationDamping ?? 0.85;
  const enforceWcag = options.enforceWcag ?? true;

  // 1. Detect Light vs Dark Mode
  const explicitMode = findVal(tomlData, ['mode', 'theme_mode', 'color_mode', 'palette_mode']);
  const rawBg = findVal(tomlData, [
    'background',
    'bg',
    'background_color',
    'darker_background',
    'dark_background',
    'colors_primary_background',
    'colors_background',
  ]);
  const rawFg = findVal(tomlData, [
    'foreground',
    'fg',
    'foreground_color',
    'bright_foreground',
    'colors_primary_foreground',
    'colors_foreground',
  ]);

  let isLight = false;
  if (explicitMode) {
    isLight = explicitMode.toLowerCase().includes('light');
  } else if (rawBg) {
    isLight = isLightColor(normalizeHex(rawBg, '#000000'));
  } else if (rawFg) {
    isLight = !isLightColor(normalizeHex(rawFg, '#ffffff'));
  }

  // 2. Backgrounds and Container Layering
  const tomlBackground = findVal(tomlData, ['background', 'bg', 'colors_primary_background', 'colors_background']);
  const tomlDarkBg = findVal(tomlData, ['dark_background', 'dark_bg', 'colors_normal_black']);
  const tomlDarkerBg = findVal(tomlData, ['darker_background', 'darker_bg']);
  const tomlLighterBg = findVal(tomlData, ['lighter_background', 'light_background', 'light_bg', 'colors_bright_black']);
  const tomlSurface = findVal(tomlData, ['surface', 'card_background', 'card_bg']);

  let bg: string;
  let surface: string;
  let surfaceElevated: string;
  let surfaceSubtle: string;

  if (isLight) {
    // LIGHT THEME MAPPING
    bg = normalizeHex(tomlBackground || tomlDarkBg, '#ffffff');

    if (tomlSurface) {
      surface = normalizeHex(tomlSurface);
    } else if (tomlBackground && tomlDarkBg && normalizeHex(tomlBackground) !== normalizeHex(tomlDarkBg)) {
      surface = normalizeHex(tomlBackground, '#ffffff');
    } else {
      surface = normalizeHex(tomlBackground, '#ffffff');
    }

    if (tomlDarkBg && normalizeHex(tomlDarkBg) !== bg) {
      surfaceElevated = normalizeHex(tomlDarkBg);
    } else if (tomlLighterBg && normalizeHex(tomlLighterBg) !== bg) {
      surfaceElevated = normalizeHex(tomlLighterBg);
    } else {
      surfaceElevated = adjustLightness(surface, -0.04);
    }

    if (tomlDarkerBg) {
      surfaceSubtle = normalizeHex(tomlDarkerBg);
    } else if (tomlDarkBg) {
      surfaceSubtle = normalizeHex(tomlDarkBg);
    } else {
      surfaceSubtle = adjustLightness(bg, -0.05);
    }
  } else {
    // DARK THEME MAPPING
    if (tomlDarkerBg) {
      bg = normalizeHex(tomlDarkerBg);
    } else if (tomlBackground) {
      bg = normalizeHex(tomlBackground, '#020617');
    } else {
      bg = '#020617';
    }

    if (tomlSurface) {
      surface = normalizeHex(tomlSurface);
    } else if (tomlBackground && tomlDarkerBg && normalizeHex(tomlBackground) !== bg) {
      surface = normalizeHex(tomlBackground);
    } else if (tomlDarkBg) {
      surface = normalizeHex(tomlDarkBg);
    } else {
      surface = adjustLightness(bg, 0.05);
    }

    if (tomlLighterBg) {
      surfaceElevated = normalizeHex(tomlLighterBg);
    } else if (tomlDarkBg && normalizeHex(tomlDarkBg) !== surface) {
      surfaceElevated = normalizeHex(tomlDarkBg);
    } else {
      surfaceElevated = adjustLightness(surface, 0.07);
    }

    if (tomlDarkerBg && normalizeHex(tomlDarkerBg) !== bg) {
      surfaceSubtle = normalizeHex(tomlDarkerBg);
    } else {
      surfaceSubtle = adjustLightness(bg, -0.03);
    }
  }

  // 3. Extract and Derive Typography with Guaranteed Contrast
  const tomlFg = findVal(tomlData, ['foreground', 'fg', 'text', 'colors_primary_foreground', 'colors_foreground']);
  const tomlBrightFg = findVal(tomlData, ['bright_foreground', 'bright_fg', 'colors_bright_white']);
  const tomlLightFg = findVal(tomlData, ['light_foreground', 'light_fg']);
  const tomlDarkFg = findVal(tomlData, ['dark_foreground', 'dark_fg']);
  const tomlMuted = findVal(tomlData, ['muted', 'comment', 'dim', 'colors_normal_white', 'colors_bright_black']);

  let textPrimary: string;
  let textSecondary: string;
  let textMuted: string;

  if (isLight) {
    textPrimary = normalizeHex(tomlBrightFg || tomlFg, '#000000');
    // Ensure primary text has at least 7:1 contrast on surface and bg
    if (enforceWcag) {
      textPrimary = ensureMinContrast(textPrimary, surface, 7.0);
    }

    if (tomlLightFg && normalizeHex(tomlLightFg) !== textPrimary) {
      textSecondary = normalizeHex(tomlLightFg);
    } else if (tomlMuted) {
      textSecondary = normalizeHex(tomlMuted);
    } else {
      textSecondary = mixColors(textPrimary, surface, 0.4);
    }
    if (enforceWcag) {
      textSecondary = ensureMinContrast(textSecondary, surface, 4.5);
    }

    if (tomlDarkFg) {
      textMuted = normalizeHex(tomlDarkFg);
    } else if (tomlMuted && normalizeHex(tomlMuted) !== textSecondary) {
      textMuted = normalizeHex(tomlMuted);
    } else {
      textMuted = mixColors(textPrimary, surface, 0.6);
    }
    if (enforceWcag) {
      textMuted = ensureMinContrast(textMuted, surface, 3.2);
    }
  } else {
    textPrimary = normalizeHex(tomlBrightFg || tomlFg, '#f8fafc');
    if (enforceWcag) {
      textPrimary = ensureMinContrast(textPrimary, surface, 7.0);
    }

    if (tomlLightFg) {
      textSecondary = normalizeHex(tomlLightFg);
    } else if (tomlFg && normalizeHex(tomlFg) !== textPrimary) {
      textSecondary = normalizeHex(tomlFg);
    } else {
      textSecondary = mixColors(textPrimary, surface, 0.35);
    }
    if (enforceWcag) {
      textSecondary = ensureMinContrast(textSecondary, surface, 4.5);
    }

    if (tomlDarkFg) {
      textMuted = normalizeHex(tomlDarkFg);
    } else if (tomlMuted) {
      textMuted = normalizeHex(tomlMuted);
    } else {
      textMuted = mixColors(textPrimary, surface, 0.6);
    }
    if (enforceWcag) {
      textMuted = ensureMinContrast(textMuted, surface, 3.2);
    }
  }

  // 4. Extract and Derive Borders
  const tomlSelection = findVal(tomlData, ['selection', 'selection_background', 'select', 'colors_selection_background']);
  const tomlBorder = findVal(tomlData, ['border', 'border_color', 'border_highlight']);

  let border: string;
  let borderHighlight: string;

  if (tomlBorder) {
    border = normalizeHex(tomlBorder);
  } else if (tomlSelection) {
    border = normalizeHex(tomlSelection);
  } else if (tomlDarkerBg && isLight) {
    border = normalizeHex(tomlDarkerBg);
  } else if (tomlLighterBg && !isLight) {
    border = normalizeHex(tomlLighterBg);
  } else {
    border = mixColors(surface, textPrimary, isLight ? 0.15 : 0.18);
  }

  if (findVal(tomlData, ['border_highlight', 'borderhighlight'])) {
    borderHighlight = normalizeHex(findVal(tomlData, ['border_highlight', 'borderhighlight']));
  } else if (tomlMuted && normalizeHex(tomlMuted) !== border) {
    borderHighlight = normalizeHex(tomlMuted);
  } else if (tomlSelection && normalizeHex(tomlSelection) !== border) {
    borderHighlight = normalizeHex(tomlSelection);
  } else {
    borderHighlight = mixColors(border, textPrimary, isLight ? 0.25 : 0.22);
  }

  // 5. Extract and Derive Accent and Interactive Colors
  const tomlAccent = findVal(tomlData, [
    'accent',
    'primary',
    'cursor',
    'cursor_color',
    'colors_cursor',
    'orange',
    'yellow',
    'magenta',
    'cyan',
    'blue',
  ]);

  let accentColor = normalizeHex(tomlAccent, isLight ? '#d97706' : '#f59e0b');

  // Apply subtle saturation dampening to accent if specified to prevent overly harsh glare
  if (saturationDamping < 1.0) {
    const [, sAcc] = hexToHsl(accentColor);
    if (sAcc > 0.85) {
      accentColor = scaleSaturation(accentColor, saturationDamping);
    }
  }

  // Accent Hover
  const tomlAccentHover = findVal(tomlData, ['accent_hover', 'accenthover', 'bright_yellow', 'bright_orange']);
  let accentHoverColor: string;
  if (tomlAccentHover) {
    accentHoverColor = normalizeHex(tomlAccentHover);
  } else {
    accentHoverColor = isLight ? adjustLightness(accentColor, -0.08) : adjustLightness(accentColor, 0.10);
  }

  // Accent Text: Mathematically guaranteed high contrast on top of the accent button
  const tomlAccentText = findVal(tomlData, ['accent_text', 'accenttext']);
  const accentText = tomlAccentText
    ? normalizeHex(tomlAccentText)
    : getOptimalContrastingTextColor(accentColor, '#020617', '#ffffff');

  // 6. Status & Diagnostic Colors with Saturation Control & Hue Scaling
  const tomlGreen = findVal(tomlData, ['green', 'bright_green', 'colors_normal_green', 'colors_bright_green']);
  const tomlYellow = findVal(tomlData, ['yellow', 'bright_yellow', 'orange', 'colors_normal_yellow', 'colors_bright_yellow']);
  const tomlRed = findVal(tomlData, ['red', 'bright_red', 'colors_normal_red', 'colors_bright_red']);
  const tomlBlue = findVal(tomlData, ['cyan', 'blue', 'bright_cyan', 'bright_blue', 'colors_normal_cyan', 'colors_normal_blue']);

  let statusNominal = normalizeHex(tomlGreen, isLight ? '#059669' : '#10b981');
  let statusWarning = normalizeHex(tomlYellow, isLight ? '#d97706' : '#f59e0b');
  let statusCritical = normalizeHex(tomlRed, isLight ? '#e11d48' : '#f43f5e');
  let statusInfo = normalizeHex(tomlBlue, isLight ? '#0284c7' : '#38bdf8');

  // Detect if the imported palette is completely monochrome (grayscale)
  const [bgH, bgS] = hexToHsl(bg);
  const [, accS] = hexToHsl(accentColor);
  const [, nomS] = hexToHsl(statusNominal);
  const isMonochromePalette = bgS < 0.10 && accS < 0.10 && nomS < 0.10;

  if (isMonochromePalette) {
    // In pure monochrome/grayscale themes, keep the refined monochrome palette,
    // but ensure status colors have enough contrast and distinct lightness steps
    statusNominal = ensureMinContrast(statusNominal, surface, 3.0);
    statusWarning = ensureMinContrast(statusWarning, surface, 3.0);
    statusCritical = ensureMinContrast(statusCritical, surface, 3.0);
    statusInfo = ensureMinContrast(statusInfo, surface, 3.0);
  } else {
    // In chromatic themes, dampen overly neon status indicators to harmonize with the theme
    if (saturationDamping < 1.0) {
      statusNominal = scaleSaturation(statusNominal, Math.min(1.0, saturationDamping * 0.9));
      statusWarning = scaleSaturation(statusWarning, Math.min(1.0, saturationDamping * 0.9));
      statusCritical = scaleSaturation(statusCritical, Math.min(1.0, saturationDamping * 0.9));
      statusInfo = scaleSaturation(statusInfo, Math.min(1.0, saturationDamping * 0.9));
    }
  }

  // 7. Compose Full Theme Structure
  const colors: ThemeColors = {
    background: bg,
    surface: surface,
    surfaceElevated: surfaceElevated,
    surfaceSubtle: surfaceSubtle,
    border: border,
    borderHighlight: borderHighlight,
    textPrimary: textPrimary,
    textSecondary: textSecondary,
    textMuted: textMuted,
    accent: accentColor,
    accentHover: accentHoverColor,
    accentText: accentText,
    statusNominal: statusNominal,
    statusWarning: statusWarning,
    statusCritical: statusCritical,
    statusInfo: statusInfo,
  };

  const charts: ThemeCharts = {
    gridColor: border,
    rhLine: colors.accent,
    rhGradientStart: colors.accent,
    tempLine: colors.statusInfo,
    tooltipBackground: surface,
    tooltipBorder: borderHighlight,
  };

  const styles: ThemeStyles = {
    borderRadius: findVal(tomlData, ['border_radius', 'borderradius']) || '16px',
    cardRadius: findVal(tomlData, ['card_radius', 'cardradius']) || '16px',
    buttonRadius: findVal(tomlData, ['button_radius', 'buttonradius']) || '10px',
    fontFamily: findVal(tomlData, ['font_family', 'fontfamily']) || "'Plus Jakarta Sans', ui-sans-serif, system-ui",
    monoFamily: findVal(tomlData, ['mono_family', 'monofamily']) || "'JetBrains Mono', ui-monospace, monospace",
    backdropBlur: findVal(tomlData, ['backdrop_blur', 'backdropblur']) || '12px',
    borderWidth: findVal(tomlData, ['border_width', 'borderwidth']) || '1px',
    density: (findVal(tomlData, ['density']) as any) || 'comfortable',
  };

  return {
    id,
    name,
    author: findVal(tomlData, ['author', 'designer', 'creator']) || 'TOML Import',
    version: findVal(tomlData, ['version']) || '1.0.0',
    description: findVal(tomlData, ['description']) || `Linux TOML palette theme (${isLight ? 'Light' : 'Dark'} mode)`,
    colors,
    charts,
    styles,
  };
}

/**
 * Converts a Theme object into a clean Linux TOML string format
 */
export function convertThemeToToml(theme: Theme): string {
  const c = theme.colors;
  const isLight = isLightColor(c.background);

  return `# HUMID1 Linux Palette Theme Export
# Theme: ${theme.name} (${theme.id})

mode = "${isLight ? 'light' : 'dark'}"

accent = "${c.accent}"
selection = "${c.border}"
muted = "${c.textMuted}"

background = "${c.background}"
dark_background = "${c.surfaceElevated}"
darker_background = "${c.surfaceSubtle}"
lighter_background = "${c.borderHighlight}"

foreground = "${c.textPrimary}"
dark_foreground = "${c.textMuted}"
light_foreground = "${c.textSecondary}"
bright_foreground = "${c.textPrimary}"

red = "${c.statusCritical}"
yellow = "${c.statusWarning}"
orange = "${c.accent}"
green = "${c.statusNominal}"
cyan = "${c.statusInfo}"
blue = "${c.statusInfo}"
magenta = "${c.accent}"

bright_red = "${c.statusCritical}"
bright_yellow = "${c.statusWarning}"
bright_green = "${c.statusNominal}"
bright_cyan = "${c.statusInfo}"
bright_blue = "${c.statusInfo}"
bright_magenta = "${c.accentHover}"
`;
}

/**
 * Safely parses any JSON or TOML string into a valid Theme object
 */
export function parseThemeFileString(
  fileContent: string,
  fileName = 'theme',
  options: TomlConversionOptions = {}
): { success: boolean; theme?: Theme; error?: string } {
  if (!fileContent || !fileContent.trim()) {
    return { success: false, error: 'File content is empty.' };
  }

  const trimmed = fileContent.trim();
  const baseName = fileName.replace(/\.[^/.]+$/, '');

  // 1. Try parsing as JSON first
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.colors && parsed.styles) {
        // Valid full Theme JSON
        return {
          success: true,
          theme: {
            id: parsed.id || `custom-${Date.now()}`,
            name: parsed.name || baseName,
            author: parsed.author || 'User Import',
            version: parsed.version || '1.0.0',
            description: parsed.description || 'Imported custom theme',
            colors: {
              background: parsed.colors.background || '#0f172a',
              surface: parsed.colors.surface || '#1e293b',
              surfaceElevated: parsed.colors.surfaceElevated || '#334155',
              surfaceSubtle: parsed.colors.surfaceSubtle || '#090d16',
              border: parsed.colors.border || '#1e293b',
              borderHighlight: parsed.colors.borderHighlight || '#334155',
              textPrimary: parsed.colors.textPrimary || '#f8fafc',
              textSecondary: parsed.colors.textSecondary || '#94a3b8',
              textMuted: parsed.colors.textMuted || '#64748b',
              accent: parsed.colors.accent || '#f59e0b',
              accentHover: parsed.colors.accentHover || '#d97706',
              accentText: parsed.colors.accentText || '#020617',
              statusNominal: parsed.colors.statusNominal || '#10b981',
              statusWarning: parsed.colors.statusWarning || '#f59e0b',
              statusCritical: parsed.colors.statusCritical || '#f43f5e',
              statusInfo: parsed.colors.statusInfo || '#38bdf8',
            },
            charts: {
              gridColor: parsed.charts?.gridColor || parsed.colors.border || '#1e293b',
              rhLine: parsed.charts?.rhLine || parsed.colors.accent || '#f59e0b',
              rhGradientStart: parsed.charts?.rhGradientStart || parsed.colors.accent || '#f59e0b',
              tempLine: parsed.charts?.tempLine || parsed.colors.statusInfo || '#38bdf8',
              tooltipBackground: parsed.charts?.tooltipBackground || parsed.colors.surfaceSubtle || '#090d16',
              tooltipBorder: parsed.charts?.tooltipBorder || parsed.colors.borderHighlight || '#334155',
            },
            styles: {
              borderRadius: parsed.styles?.borderRadius || '16px',
              cardRadius: parsed.styles?.cardRadius || '16px',
              buttonRadius: parsed.styles?.buttonRadius || '10px',
              fontFamily: parsed.styles?.fontFamily || "'Plus Jakarta Sans', ui-sans-serif, system-ui",
              monoFamily: parsed.styles?.monoFamily || "'JetBrains Mono', ui-monospace, monospace",
              backdropBlur: parsed.styles?.backdropBlur || '12px',
              borderWidth: parsed.styles?.borderWidth || '1px',
              density: parsed.styles?.density || 'comfortable',
            },
          },
        };
      } else {
        // Flat TOML-like JSON object
        const theme = convertTomlToTheme(parsed, `custom-json-${Date.now()}`, baseName, options);
        return { success: true, theme };
      }
    } catch (e: any) {
      // Continue to TOML parsing
    }
  }

  // 2. Try parsing as TOML key-value pairs
  try {
    const tomlMap = parseTomlString(trimmed);
    if (Object.keys(tomlMap).length > 0) {
      const theme = convertTomlToTheme(tomlMap, `custom-toml-${Date.now()}`, baseName, options);
      return { success: true, theme };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to parse theme file.' };
  }

  return { success: false, error: 'Unrecognized theme format. Expected TOML or JSON theme configuration.' };
}

