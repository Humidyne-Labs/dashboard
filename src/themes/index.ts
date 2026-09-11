import { Theme } from './types';

// Dynamically import all JSON theme presets from ./presets/*.json at runtime
const presetModules = import.meta.glob('./presets/*.json', { eager: true });

export * from './types';
export * from './themeParser';

export const THEME_PRESETS: Theme[] = Object.values(presetModules).map((mod: any) => {
  return (mod.default || mod) as Theme;
});

export const getThemeById = (id: string, customPresets: Theme[] = []): Theme => {
  const all = [...THEME_PRESETS, ...customPresets];
  return all.find(t => t.id === id) || THEME_PRESETS[0];
};
