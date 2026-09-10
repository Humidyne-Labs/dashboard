import { Theme } from './types';
import { cedarDarkTheme } from './presets/cedar-dark';
import { obsidianLuxuryTheme } from './presets/obsidian-luxury';
import { mahoganyWarmTheme } from './presets/mahogany-warm';
import { emeraldBotanicalTheme } from './presets/emerald-botanical';
import { studioLightTheme } from './presets/studio-light';

export * from './types';

export const THEME_PRESETS: Theme[] = [
  cedarDarkTheme,
  obsidianLuxuryTheme,
  mahoganyWarmTheme,
  emeraldBotanicalTheme,
  studioLightTheme
];

export const getThemeById = (id: string): Theme => {
  return THEME_PRESETS.find(t => t.id === id) || cedarDarkTheme;
};
