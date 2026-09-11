import { HumidorDevice, SharedAttributes, AlarmThresholds, TempUnit } from '../types';
import { Theme } from '../themes/types';

export interface ParsedXmlConfig {
  version: string;
  exportedAt?: string;
  metadata?: {
    deviceName?: string;
    deviceId?: string;
    description?: string;
  };
  sharedAttributes: {
    sleep_interval_min?: number;
    sleep_interval_sec?: number;
    device_theme?: 'light' | 'dark';
    sound_enabled?: boolean;
    auto_update_enabled?: boolean;
    manual_ota_trigger?: boolean;
    email_alerts_enabled?: boolean;
    temp_unit?: TempUnit;
  };
  thresholds?: Partial<AlarmThresholds>;
  theme?: Theme;
}

/**
 * Generates clean, well-formatted XML representation of a device's configuration and thresholds.
 */
export function exportDeviceConfigToXml(
  device: HumidorDevice,
  thresholds?: AlarmThresholds,
  activeTheme?: Theme
): string {
  const currentThresholds = thresholds || device.sharedAttributes?.alarm_thresholds;
  const shared = device.sharedAttributes || ({} as SharedAttributes);
  const nowIso = new Date().toISOString();
  const sleepMin = shared.sleep_interval_min || (shared.sleep_interval_sec ? Math.round(shared.sleep_interval_sec / 60) : 15);
  const theme = String(shared.device_theme || 'dark').toLowerCase() === 'light' ? 'light' : 'dark';
  const soundEnabled = shared.sound_enabled !== false;
  const autoUpdate = shared.auto_update_enabled ?? true;
  const manualOta = shared.manual_ota_trigger ?? false;
  const emailAlerts = shared.email_alerts_enabled ?? true;
  const tempUnit = (shared.temp_unit || 'F') as TempUnit;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<humid1-device-config version="1.0" exported-at="${nowIso}">\n`;
  xml += `  <metadata>\n`;
  xml += `    <device-id>${escapeXml(device.id || '')}</device-id>\n`;
  xml += `    <device-name>${escapeXml(device.name || 'HUMID1-DEVICE')}</device-name>\n`;
  xml += `    <generator>HUMID1 Telemetry Stack v1.0</generator>\n`;
  xml += `  </metadata>\n\n`;

  xml += `  <!-- Hardware Operating Parameters -->\n`;
  xml += `  <parameters>\n`;
  xml += `    <sleep-interval-min>${sleepMin}</sleep-interval-min>\n`;
  xml += `    <sleep-interval-sec>${sleepMin * 60}</sleep-interval-sec>\n`;
  xml += `    <device-theme>${theme}</device-theme>\n`;
  xml += `    <sound-enabled>${soundEnabled}</sound-enabled>\n`;
  xml += `    <auto-update-enabled>${autoUpdate}</auto-update-enabled>\n`;
  xml += `    <manual-ota-trigger>${manualOta}</manual-ota-trigger>\n`;
  xml += `    <email-alerts-enabled>${emailAlerts}</email-alerts-enabled>\n`;
  xml += `    <temp-unit>${tempUnit}</temp-unit>\n`;
  xml += `  </parameters>\n\n`;

  if (currentThresholds) {
    xml += `  <!-- Environmental & Battery Alarm Threshold Limits -->\n`;
    xml += `  <alarm-thresholds>\n`;
    xml += `    <rh-low-critical>${Number(currentThresholds.rhLowCritical).toFixed(1)}</rh-low-critical>\n`;
    xml += `    <rh-low-warning>${Number(currentThresholds.rhLowWarning).toFixed(1)}</rh-low-warning>\n`;
    xml += `    <rh-high-warning>${Number(currentThresholds.rhHighWarning).toFixed(1)}</rh-high-warning>\n`;
    xml += `    <rh-high-critical>${Number(currentThresholds.rhHighCritical).toFixed(1)}</rh-high-critical>\n\n`;

    xml += `    <!-- Temperature limits in canonical Kelvin -->\n`;
    xml += `    <temp-low-critical>${Number(currentThresholds.tempLowCritical).toFixed(2)}</temp-low-critical>\n`;
    xml += `    <temp-low-warning>${Number(currentThresholds.tempLowWarning).toFixed(2)}</temp-low-warning>\n`;
    xml += `    <temp-high-warning>${Number(currentThresholds.tempHighWarning).toFixed(2)}</temp-high-warning>\n`;
    xml += `    <temp-high-critical>${Number(currentThresholds.tempHighCritical).toFixed(2)}</temp-high-critical>\n\n`;

    xml += `    <battery-low-critical>${Number(currentThresholds.batteryLowCritical).toFixed(0)}</battery-low-critical>\n`;
    xml += `    <battery-low-warning>${Number(currentThresholds.batteryLowWarning).toFixed(0)}</battery-low-warning>\n\n`;

    xml += `    <rh-hist>${Number(currentThresholds.rhHist).toFixed(1)}</rh-hist>\n`;
    xml += `    <temp-hist>${Number(currentThresholds.tempHist).toFixed(2)}</temp-hist>\n`;
    xml += `    <batt-hist>${Number(currentThresholds.battHist).toFixed(1)}</batt-hist>\n`;
    xml += `  </alarm-thresholds>\n`;
  }

  if (activeTheme) {
    xml += `\n  <!-- UI Theme & Color Palette Tokens -->\n`;
    xml += `  <theme-config id="${escapeXml(activeTheme.id)}" name="${escapeXml(activeTheme.name)}">\n`;
    xml += `    <author>${escapeXml(activeTheme.author || 'HUMID1 XML Import')}</author>\n`;
    xml += `    <version>${escapeXml(activeTheme.version || '1.0.0')}</version>\n`;
    xml += `    <description>${escapeXml(activeTheme.description || 'Imported from XML device configuration')}</description>\n`;
    xml += `    <colors>\n`;
    xml += `      <background>${activeTheme.colors.background}</background>\n`;
    xml += `      <surface>${activeTheme.colors.surface}</surface>\n`;
    xml += `      <surface-elevated>${activeTheme.colors.surfaceElevated}</surface-elevated>\n`;
    xml += `      <surface-subtle>${activeTheme.colors.surfaceSubtle}</surface-subtle>\n`;
    xml += `      <border>${activeTheme.colors.border}</border>\n`;
    xml += `      <border-highlight>${activeTheme.colors.borderHighlight}</border-highlight>\n`;
    xml += `      <text-primary>${activeTheme.colors.textPrimary}</text-primary>\n`;
    xml += `      <text-secondary>${activeTheme.colors.textSecondary}</text-secondary>\n`;
    xml += `      <text-muted>${activeTheme.colors.textMuted}</text-muted>\n`;
    xml += `      <accent>${activeTheme.colors.accent}</accent>\n`;
    xml += `      <accent-hover>${activeTheme.colors.accentHover}</accent-hover>\n`;
    xml += `      <accent-text>${activeTheme.colors.accentText}</accent-text>\n`;
    xml += `      <status-nominal>${activeTheme.colors.statusNominal}</status-nominal>\n`;
    xml += `      <status-warning>${activeTheme.colors.statusWarning}</status-warning>\n`;
    xml += `      <status-critical>${activeTheme.colors.statusCritical}</status-critical>\n`;
    xml += `      <status-info>${activeTheme.colors.statusInfo}</status-info>\n`;
    xml += `    </colors>\n`;
    xml += `    <charts>\n`;
    xml += `      <grid-color>${activeTheme.charts.gridColor}</grid-color>\n`;
    xml += `      <rh-line>${activeTheme.charts.rhLine}</rh-line>\n`;
    xml += `      <rh-gradient-start>${activeTheme.charts.rhGradientStart}</rh-gradient-start>\n`;
    xml += `      <temp-line>${activeTheme.charts.tempLine}</temp-line>\n`;
    xml += `      <tooltip-background>${activeTheme.charts.tooltipBackground}</tooltip-background>\n`;
    xml += `      <tooltip-border>${activeTheme.charts.tooltipBorder}</tooltip-border>\n`;
    xml += `    </charts>\n`;
    xml += `    <styles>\n`;
    xml += `      <border-radius>${activeTheme.styles.borderRadius}</border-radius>\n`;
    xml += `      <card-radius>${activeTheme.styles.cardRadius}</card-radius>\n`;
    xml += `      <button-radius>${activeTheme.styles.buttonRadius}</button-radius>\n`;
    xml += `      <font-family>${escapeXml(activeTheme.styles.fontFamily)}</font-family>\n`;
    xml += `      <mono-family>${escapeXml(activeTheme.styles.monoFamily)}</mono-family>\n`;
    xml += `      <backdrop-blur>${activeTheme.styles.backdropBlur}</backdrop-blur>\n`;
    xml += `      <border-width>${activeTheme.styles.borderWidth}</border-width>\n`;
    xml += `      <density>${activeTheme.styles.density}</density>\n`;
    xml += `    </styles>\n`;
    xml += `  </theme-config>\n`;
  }

  xml += `</humid1-device-config>\n`;
  return xml;
}

/**
 * Triggers a direct browser file download of the exported XML configuration.
 */
export function downloadDeviceConfigXml(
  device: HumidorDevice,
  thresholds?: AlarmThresholds,
  activeTheme?: Theme,
  customFileName?: string
): void {
  const xmlContent = exportDeviceConfigToXml(device, thresholds, activeTheme);
  const safeName = (device.name || 'device')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-');
  const filename = customFileName || `humid1-${safeName}-config.xml`;

  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Safely parses an XML configuration file string into a typed device configuration object.
 */
export function parseDeviceConfigFromXml(xmlString: string): {
  success: boolean;
  data?: ParsedXmlConfig;
  error?: string;
} {
  if (!xmlString || !xmlString.trim()) {
    return { success: false, error: 'XML file is empty.' };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    // Check for parse error
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return { success: false, error: `Invalid XML syntax: ${parserError.textContent?.slice(0, 150)}` };
    }

    const root = doc.querySelector('humid1-device-config') || doc.documentElement;
    if (!root) {
      return { success: false, error: 'Missing root <humid1-device-config> element.' };
    }

    const version = root.getAttribute('version') || '1.0';
    const exportedAt = root.getAttribute('exported-at') || undefined;

    // Helper to get text content from multiple possible tag aliases
    const getText = (parent: Element | null, tags: string[]): string | null => {
      if (!parent) return null;
      for (const t of tags) {
        const el = parent.querySelector(t);
        if (el && el.textContent) {
          return el.textContent.trim();
        }
      }
      return null;
    };

    const metadataEl = root.querySelector('metadata');
    const metadata = {
      deviceName: getText(metadataEl, ['device-name', 'deviceName', 'name']) || undefined,
      deviceId: getText(metadataEl, ['device-id', 'deviceId', 'id']) || undefined,
      description: getText(metadataEl, ['description', 'generator']) || undefined,
    };

    // Parse parameters
    const paramsEl = root.querySelector('parameters') || root;
    const sharedAttributes: ParsedXmlConfig['sharedAttributes'] = {};

    const sleepMinRaw = getText(paramsEl, ['sleep-interval-min', 'sleep_interval_min', 'sleepIntervalMin']);
    const sleepSecRaw = getText(paramsEl, ['sleep-interval-sec', 'sleep_interval_sec', 'sleepIntervalSec']);
    if (sleepMinRaw) {
      const min = parseInt(sleepMinRaw, 10);
      if (!isNaN(min) && min >= 1 && min <= 1440) {
        sharedAttributes.sleep_interval_min = min;
        sharedAttributes.sleep_interval_sec = min * 60;
      }
    } else if (sleepSecRaw) {
      const sec = parseInt(sleepSecRaw, 10);
      if (!isNaN(sec) && sec >= 60) {
        sharedAttributes.sleep_interval_sec = sec;
        sharedAttributes.sleep_interval_min = Math.round(sec / 60);
      }
    }

    const themeRaw = getText(paramsEl, ['device-theme', 'device_theme', 'theme']);
    if (themeRaw) {
      sharedAttributes.device_theme = themeRaw.toLowerCase() === 'light' ? 'light' : 'dark';
    }

    const soundRaw = getText(paramsEl, ['sound-enabled', 'sound_enabled', 'soundEnabled']);
    if (soundRaw !== null) {
      sharedAttributes.sound_enabled = soundRaw === 'true' || soundRaw === '1';
    }

    const autoUpdateRaw = getText(paramsEl, ['auto-update-enabled', 'auto_update_enabled', 'autoUpdateEnabled']);
    if (autoUpdateRaw !== null) {
      sharedAttributes.auto_update_enabled = autoUpdateRaw === 'true' || autoUpdateRaw === '1';
    }

    const manualOtaRaw = getText(paramsEl, ['manual-ota-trigger', 'manual_ota_trigger', 'manualOtaTrigger']);
    if (manualOtaRaw !== null) {
      sharedAttributes.manual_ota_trigger = manualOtaRaw === 'true' || manualOtaRaw === '1';
    }

    const emailAlertsRaw = getText(paramsEl, ['email-alerts-enabled', 'email_alerts_enabled', 'emailAlertsEnabled']);
    if (emailAlertsRaw !== null) {
      sharedAttributes.email_alerts_enabled = emailAlertsRaw === 'true' || emailAlertsRaw === '1';
    }

    const tempUnitRaw = getText(paramsEl, ['temp-unit', 'temp_unit', 'tempUnit']);
    if (tempUnitRaw) {
      const u = tempUnitRaw.toUpperCase();
      if (u === 'C' || u === 'F') {
        sharedAttributes.temp_unit = u as TempUnit;
      }
    }

    // Parse thresholds
    const threshEl = root.querySelector('alarm-thresholds') || root.querySelector('thresholds') || root;
    const thresholds: Partial<AlarmThresholds> = {};

    const parseNum = (tags: string[], min = -Infinity, max = Infinity): number | undefined => {
      const str = getText(threshEl, tags);
      if (str !== null) {
        const num = parseFloat(str);
        if (!isNaN(num) && num >= min && num <= max) {
          return num;
        }
      }
      return undefined;
    };

    const rhLowCrit = parseNum(['rh-low-critical', 'rhLowCritical', 'rh_low_critical'], 0, 100);
    if (rhLowCrit !== undefined) thresholds.rhLowCritical = rhLowCrit;

    const rhLowWarn = parseNum(['rh-low-warning', 'rhLowWarning', 'rh_low_warning'], 0, 100);
    if (rhLowWarn !== undefined) thresholds.rhLowWarning = rhLowWarn;

    const rhHighWarn = parseNum(['rh-high-warning', 'rhHighWarning', 'rh_high_warning'], 0, 100);
    if (rhHighWarn !== undefined) thresholds.rhHighWarning = rhHighWarn;

    const rhHighCrit = parseNum(['rh-high-critical', 'rhHighCritical', 'rh_high_critical'], 0, 100);
    if (rhHighCrit !== undefined) thresholds.rhHighCritical = rhHighCrit;

    const tempLowCrit = parseNum(['temp-low-critical', 'tempLowCritical', 'temp_low_critical'], 0, 400);
    if (tempLowCrit !== undefined) thresholds.tempLowCritical = tempLowCrit;

    const tempLowWarn = parseNum(['temp-low-warning', 'tempLowWarning', 'temp_low_warning'], 0, 400);
    if (tempLowWarn !== undefined) thresholds.tempLowWarning = tempLowWarn;

    const tempHighWarn = parseNum(['temp-high-warning', 'tempHighWarning', 'temp_high_warning'], 0, 400);
    if (tempHighWarn !== undefined) thresholds.tempHighWarning = tempHighWarn;

    const tempHighCrit = parseNum(['temp-high-critical', 'tempHighCritical', 'temp_high_critical'], 0, 400);
    if (tempHighCrit !== undefined) thresholds.tempHighCritical = tempHighCrit;

    const battLowCrit = parseNum(['battery-low-critical', 'batteryLowCritical', 'battery_low_critical'], 0, 100);
    if (battLowCrit !== undefined) thresholds.batteryLowCritical = battLowCrit;

    const battLowWarn = parseNum(['battery-low-warning', 'batteryLowWarning', 'battery_low_warning'], 0, 100);
    if (battLowWarn !== undefined) thresholds.batteryLowWarning = battLowWarn;

    const rhHist = parseNum(['rh-hist', 'rhHist', 'rh_hist'], 0, 10);
    if (rhHist !== undefined) thresholds.rhHist = rhHist;

    const tempHist = parseNum(['temp-hist', 'tempHist', 'temp_hist'], 0, 10);
    if (tempHist !== undefined) thresholds.tempHist = tempHist;

    const battHist = parseNum(['batt-hist', 'battHist', 'batt_hist'], 0, 20);
    if (battHist !== undefined) thresholds.battHist = battHist;

    // Parse theme-config
    const themeEl = root.querySelector('theme-config');
    let themeConfig: Theme | undefined = undefined;
    if (themeEl) {
      const themeId = themeEl.getAttribute('id') || `xml-imported-${Date.now()}`;
      const themeName = themeEl.getAttribute('name') || 'XML Config Theme';
      const colorsEl = themeEl.querySelector('colors');
      const chartsEl = themeEl.querySelector('charts');
      const stylesEl = themeEl.querySelector('styles');

      if (colorsEl) {
        const bg = getText(colorsEl, ['background']) || '#0b0f19';
        const surf = getText(colorsEl, ['surface']) || '#111827';
        const acc = getText(colorsEl, ['accent']) || '#d97706';

        themeConfig = {
          id: themeId,
          name: themeName,
          author: getText(themeEl, ['author']) || 'HUMID1 XML Import',
          version: getText(themeEl, ['version']) || '1.0.0',
          description: getText(themeEl, ['description']) || 'Imported from XML device configuration',
          colors: {
            background: bg,
            surface: surf,
            surfaceElevated: getText(colorsEl, ['surface-elevated', 'surfaceElevated']) || '#1f2937',
            surfaceSubtle: getText(colorsEl, ['surface-subtle', 'surfaceSubtle']) || '#0e1422',
            border: getText(colorsEl, ['border']) || '#1f2937',
            borderHighlight: getText(colorsEl, ['border-highlight', 'borderHighlight']) || '#374151',
            textPrimary: getText(colorsEl, ['text-primary', 'textPrimary']) || '#f9fafb',
            textSecondary: getText(colorsEl, ['text-secondary', 'textSecondary']) || '#9ca3af',
            textMuted: getText(colorsEl, ['text-muted', 'textMuted']) || '#6b7280',
            accent: acc,
            accentHover: getText(colorsEl, ['accent-hover', 'accentHover']) || acc,
            accentText: getText(colorsEl, ['accent-text', 'accentText']) || '#ffffff',
            statusNominal: getText(colorsEl, ['status-nominal', 'statusNominal']) || '#10b981',
            statusWarning: getText(colorsEl, ['status-warning', 'statusWarning']) || '#f59e0b',
            statusCritical: getText(colorsEl, ['status-critical', 'statusCritical']) || '#ef4444',
            statusInfo: getText(colorsEl, ['status-info', 'statusInfo']) || '#06b6d4',
          },
          charts: {
            gridColor: getText(chartsEl, ['grid-color', 'gridColor']) || '#1f2937',
            rhLine: getText(chartsEl, ['rh-line', 'rhLine']) || '#10b981',
            rhGradientStart: getText(chartsEl, ['rh-gradient-start', 'rhGradientStart']) || '#10b981',
            tempLine: getText(chartsEl, ['temp-line', 'tempLine']) || acc,
            tooltipBackground: getText(chartsEl, ['tooltip-background', 'tooltipBackground']) || surf,
            tooltipBorder: getText(chartsEl, ['tooltip-border', 'tooltipBorder']) || '#374151',
          },
          styles: {
            borderRadius: getText(stylesEl, ['border-radius', 'borderRadius']) || "12px",
            cardRadius: getText(stylesEl, ['card-radius', 'cardRadius']) || "16px",
            buttonRadius: getText(stylesEl, ['button-radius', 'buttonRadius']) || "10px",
            fontFamily: getText(stylesEl, ['font-family', 'fontFamily']) || "'Plus Jakarta Sans', sans-serif",
            monoFamily: getText(stylesEl, ['mono-family', 'monoFamily']) || "'JetBrains Mono', monospace",
            backdropBlur: getText(stylesEl, ['backdrop-blur', 'backdropBlur']) || "12px",
            borderWidth: getText(stylesEl, ['border-width', 'borderWidth']) || "1px",
            density: getText(stylesEl, ['density']) || "comfortable",
          },
        };
      }
    }

    return {
      success: true,
      data: {
        version,
        exportedAt,
        metadata,
        sharedAttributes,
        thresholds: Object.keys(thresholds).length > 0 ? thresholds : undefined,
        theme: themeConfig,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to parse XML configuration file.',
    };
  }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
