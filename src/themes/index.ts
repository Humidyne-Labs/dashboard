import { Theme } from './types';
import { picayuneMetroTheme } from './presets/picayune-metro';
import { abnormalBurnOutTheme } from './presets/abnormal-burn-out';
import { strongToothpasteTheme } from './presets/strong-toothpaste';
import { jollySnowboardingTheme } from './presets/jolly-snowboarding';
import { excellentAutomatonTheme } from './presets/excellent-automaton';
import { gustyPuggleTheme } from './presets/gusty-puggle';
import { thinkableTechnicianTheme } from './presets/thinkable-technician';
import { juicyStrawTheme } from './presets/juicy-straw';
import { thunderingEarthquakeTheme } from './presets/thundering-earthquake';
import { threateningEstablishmentTheme } from './presets/threatening-establishment';
import { mammothNightgownTheme } from './presets/mammoth-nightgown';
import { satisfyingKeyTheme } from './presets/satisfying-key';
import { floweryCentreTheme } from './presets/flowery-centre';
import { vivaciousInterfaceTheme } from './presets/vivacious-interface';
import { measlyNatureTheme } from './presets/measly-nature';
import { economicDedicationTheme } from './presets/economic-dedication';
import { hesitantOverclockingTheme } from './presets/hesitant-overclocking';
import { uptightPropertyTheme } from './presets/uptight-property';
import { upsetHeartacheTheme } from './presets/upset-heartache';
import { triteStandardisationTheme } from './presets/trite-standardisation';

export * from './types';

export const THEME_PRESETS: Theme[] = [
  picayuneMetroTheme,
  abnormalBurnOutTheme,
  strongToothpasteTheme,
  jollySnowboardingTheme,
  excellentAutomatonTheme,
  gustyPuggleTheme,
  thinkableTechnicianTheme,
  juicyStrawTheme,
  thunderingEarthquakeTheme,
  threateningEstablishmentTheme,
  mammothNightgownTheme,
  satisfyingKeyTheme,
  floweryCentreTheme,
  vivaciousInterfaceTheme,
  measlyNatureTheme,
  economicDedicationTheme,
  hesitantOverclockingTheme,
  uptightPropertyTheme,
  upsetHeartacheTheme,
  triteStandardisationTheme
];

export const getThemeById = (id: string): Theme => {
  return THEME_PRESETS.find(t => t.id === id) || picayuneMetroTheme;
};
