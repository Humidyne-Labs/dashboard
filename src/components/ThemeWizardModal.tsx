import React, { useState, useRef } from 'react';
import {
  Palette,
  X,
  Sparkles,
  Upload,
  Download,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  Type,
  SlidersHorizontal,
  FolderOpen,
  Wand2,
  SunMedium,
  ShieldCheck,
  Flame,
  FileCode2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  parseThemeFileString,
  getContrastRatio,
  isLightColor,
} from '../themes/themeParser';
import { HumidorDevice, AlarmThresholds } from '../types';

interface ThemeWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDevice?: HumidorDevice | null;
  activeThresholds?: AlarmThresholds;
}

type TabType = 'presets' | 'colors' | 'typography' | 'styles' | 'import-toml';

const AVAILABLE_SANS_FONTS = [
  { label: 'Plus Jakarta Sans (Default)', value: "'Plus Jakarta Sans', sans-serif" },
  { label: 'Inter (Clean Tech)', value: "'Inter', sans-serif" },
  { label: 'Outfit (Modern Geometry)', value: "'Outfit', sans-serif" },
  { label: 'Space Grotesk (Neo-Grotesque)', value: "'Space Grotesk', sans-serif" },
  { label: 'Playfair Display (Vintage Serif)', value: "'Playfair Display', serif" },
  { label: 'System Native UI', value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
];

const AVAILABLE_MONO_FONTS = [
  { label: 'JetBrains Mono (Default)', value: "'JetBrains Mono', monospace" },
  { label: 'Fira Code (Ligatures)', value: "'Fira Code', monospace" },
  { label: 'System Monospace', value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
];

export const ThemeWizardModal: React.FC<ThemeWizardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentTheme,
    setTheme,
    presets,
    customPresets,
    updateThemeColor,
    updateThemeStyle,
    applyTheme,
    saveCustomPreset,
    deleteCustomPreset,
    resetToPreset,
    rotateThemeHue,
    setThemeVibrancy,
    optimizeThemeContrast,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [customPresetName, setCustomPresetName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [tomlEnforceWcag, setTomlEnforceWcag] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSaveCustomPreset = () => {
    const nameToUse = customPresetName.trim() || `Custom ${currentTheme.name}`;
    saveCustomPreset(nameToUse);
    setCustomPresetName('');
    setImportSuccess(`Saved "${nameToUse}" to your custom presets!`);
    setTimeout(() => setImportSuccess(null), 3000);
  };

  const processTomlString = (content: string, fileName: string) => {
    setImportError(null);
    setImportSuccess(null);

    const parsed = parseThemeFileString(content, fileName, {
      enforceWcag: tomlEnforceWcag,
    });

    if (parsed.success && parsed.theme) {
      applyTheme(parsed.theme);
      setImportSuccess(`Successfully applied imported theme: "${parsed.theme.name}"`);
      setTimeout(() => setImportSuccess(null), 4000);
    } else {
      setImportError(parsed.error || 'Failed to parse TOML theme file.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processTomlString(content, file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDevExportJson = () => {
    const safeName = currentTheme.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const jsonStr = JSON.stringify(currentTheme, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}-system-theme.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-app-surface border border-app-border-highlight rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-app-text-primary">
        
        {/* Header - Fixed shrink-0 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-app-border bg-app-surface-elevated/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-app-accent/15 text-app-accent border border-app-accent/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-wide flex items-center gap-2">
                Theme Studio &amp; Color Wizard
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-app-accent/20 text-app-accent border border-app-accent/30">
                  v2.0 Theme Engine
                </span>
              </h2>
              <p className="text-xs text-app-text-secondary">
                Customize UI colors, fonts, and styles, or import Linux TOML palettes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Bar - Fixed height, shrink-0, flex-nowrap to prevent text cutting or vertical scrolling */}
        <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-0 border-b border-app-border bg-app-surface-subtle overflow-x-auto no-scrollbar shrink-0 flex-nowrap min-h-[46px]">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 shrink-0 cursor-pointer whitespace-nowrap leading-none ${
              activeTab === 'presets'
                ? 'border-app-accent text-app-accent bg-app-surface'
                : 'border-transparent text-app-text-secondary hover:text-app-text-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Presets &amp; Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('colors')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 shrink-0 cursor-pointer whitespace-nowrap leading-none ${
              activeTab === 'colors'
                ? 'border-app-accent text-app-accent bg-app-surface'
                : 'border-transparent text-app-text-secondary hover:text-app-text-primary'
            }`}
          >
            <Palette className="w-3.5 h-3.5 shrink-0" />
            <span>Color Palette Picker</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('typography')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 shrink-0 cursor-pointer whitespace-nowrap leading-none ${
              activeTab === 'typography'
                ? 'border-app-accent text-app-accent bg-app-surface'
                : 'border-transparent text-app-text-secondary hover:text-app-text-primary'
            }`}
          >
            <Type className="w-3.5 h-3.5 shrink-0" />
            <span>Typography &amp; Fonts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('styles')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 shrink-0 cursor-pointer whitespace-nowrap leading-none ${
              activeTab === 'styles'
                ? 'border-app-accent text-app-accent bg-app-surface'
                : 'border-transparent text-app-text-secondary hover:text-app-text-primary'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span>Style Sliders</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import-toml')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 shrink-0 cursor-pointer whitespace-nowrap leading-none ${
              activeTab === 'import-toml'
                ? 'border-app-accent text-app-accent bg-app-surface'
                : 'border-transparent text-app-text-secondary hover:text-app-text-primary'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Import TOML</span>
          </button>
        </div>

        {/* Notifications / Alerts */}
        {importSuccess && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-app-status-nominal/15 border border-app-status-nominal/30 text-app-status-nominal text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              {importSuccess}
            </span>
          </div>
        )}

        {importError && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-app-status-critical/15 border border-app-status-critical/30 text-app-status-critical text-xs flex items-center justify-between">
            <span>{importError}</span>
            <button onClick={() => setImportError(null)} className="p-1 hover:bg-app-status-critical/20 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: PRESETS GALLERY */}
          {activeTab === 'presets' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-app-text-secondary mb-3 flex items-center justify-between">
                  <span>System Presets (Loaded from JSON)</span>
                  <span className="text-xs normal-case font-normal text-app-text-muted">
                    {presets.length} Built-in Themes
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {presets.map((preset) => {
                    const isActive = currentTheme.id === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => setTheme(preset.id)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                          isActive
                            ? 'bg-app-surface-elevated border-app-accent shadow-lg ring-1 ring-app-accent/50'
                            : 'bg-app-surface/60 border-app-border hover:border-app-border-highlight hover:bg-app-surface-elevated/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-sm text-app-text-primary">{preset.name}</span>
                            {isActive && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-app-accent/20 text-app-accent border border-app-accent/40">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-app-text-secondary line-clamp-2 mb-3">
                            {preset.description}
                          </p>
                        </div>

                        {/* Color Swatches */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-app-border/50">
                          <div
                            className="w-4 h-4 rounded border border-black/20 shadow-sm"
                            style={{ backgroundColor: preset.colors.background }}
                            title="Background"
                          />
                          <div
                            className="w-4 h-4 rounded border border-black/20 shadow-sm"
                            style={{ backgroundColor: preset.colors.surface }}
                            title="Surface"
                          />
                          <div
                            className="w-4 h-4 rounded border border-black/20 shadow-sm"
                            style={{ backgroundColor: preset.colors.border }}
                            title="Border"
                          />
                          <div
                            className="w-4 h-4 rounded border border-black/20 shadow-sm"
                            style={{ backgroundColor: preset.colors.accent }}
                            title="Accent"
                          />
                          <div
                            className="w-4 h-4 rounded border border-black/20 shadow-sm"
                            style={{ backgroundColor: preset.colors.statusNominal }}
                            title="Nominal"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Saved Presets */}
              {customPresets.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-app-text-secondary mb-3 flex items-center justify-between">
                    <span>User Custom Presets</span>
                    <span className="text-xs normal-case font-normal text-app-text-muted">
                      {customPresets.length} Saved
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {customPresets.map((preset) => {
                      const isActive = currentTheme.id === preset.id;
                      return (
                        <div
                          key={preset.id}
                          className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                            isActive
                              ? 'bg-app-surface-elevated border-app-accent shadow-lg ring-1 ring-app-accent/50'
                              : 'bg-app-surface/60 border-app-border hover:border-app-border-highlight'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span
                                onClick={() => applyTheme(preset)}
                                className="font-bold text-sm text-app-text-primary cursor-pointer hover:underline"
                              >
                                {preset.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => deleteCustomPreset(preset.id)}
                                  className="p-1 rounded text-app-text-muted hover:text-app-status-critical hover:bg-app-status-critical/10 transition cursor-pointer"
                                  title="Delete Preset"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-app-text-secondary line-clamp-2 mb-3">
                              {preset.description || 'User created custom theme profile'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-app-border/50">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: preset.colors.background }} />
                              <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: preset.colors.surface }} />
                              <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: preset.colors.accent }} />
                            </div>
                            <button
                              onClick={() => applyTheme(preset)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-app-accent/15 text-app-accent hover:bg-app-accent/25 transition cursor-pointer"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Save Current as Custom Preset Form */}
              <div className="p-4 rounded-xl bg-app-surface-elevated/40 border border-app-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-app-text-secondary mb-1">
                    Save Active Theme Palette
                  </h4>
                  <p className="text-xs text-app-text-muted">
                    Save your current edits as a reusable custom preset profile.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customPresetName}
                    onChange={(e) => setCustomPresetName(e.target.value)}
                    placeholder="Custom Theme Name..."
                    className="px-3 py-1.5 text-xs rounded-lg bg-app-surface border border-app-border focus:border-app-accent focus:outline-none text-app-text-primary"
                  />
                  <button
                    onClick={handleSaveCustomPreset}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-app-accent text-app-accent-text hover:opacity-90 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Save Preset
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COLOR PALETTE PICKER */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-app-text-primary">
                    Harmonic HSL &amp; Color Suite
                  </h3>
                  <p className="text-xs text-app-text-secondary">
                    Fine-tune saturation, rotate hues mathematically, and optimize WCAG contrast across all tokens.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={optimizeThemeContrast}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Auto-optimize all text, button, and border tokens to meet WCAG AA contrast standards"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Auto-Contrast (WCAG AA)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => resetToPreset('cedar-dark')}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-app-surface-elevated border border-app-border hover:border-app-border-highlight text-app-text-secondary hover:text-app-text-primary transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Condense Hue & Vibrancy Controls: 2 Simple Rows */}
              <div className="p-3.5 rounded-xl bg-app-surface-elevated/40 border border-app-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-app-border/60 pb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-app-accent flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Theme Tuning &amp; Harmonics</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={optimizeThemeContrast}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap"
                      title="Auto-optimize all text, button, and border tokens to meet WCAG AA contrast standards"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Auto-Contrast</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => resetToPreset('cedar-dark')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-app-surface border border-app-border hover:border-app-border-highlight text-app-text-secondary hover:text-app-text-primary transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <RotateCcw className="w-3 h-3 shrink-0" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Row 1: Vibrancy */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs font-semibold text-app-text-secondary sm:w-20 shrink-0">Vibrancy:</span>
                  <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 flex-1">
                    <button
                      type="button"
                      onClick={() => setThemeVibrancy('muted')}
                      className="px-2.5 py-1.5 text-center text-xs font-mono font-semibold rounded-lg bg-app-surface border border-app-border hover:border-app-accent text-app-text-secondary hover:text-app-accent transition cursor-pointer"
                    >
                      Muted (35%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeVibrancy('balanced')}
                      className="px-2.5 py-1.5 text-center text-xs font-mono font-semibold rounded-lg bg-app-surface border border-app-border hover:border-app-accent text-app-text-secondary hover:text-app-accent transition cursor-pointer"
                    >
                      Balanced (70%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeVibrancy('vibrant')}
                      className="px-2.5 py-1.5 text-center text-xs font-mono font-semibold rounded-lg bg-app-surface border border-app-border hover:border-app-accent text-app-text-secondary hover:text-app-accent transition cursor-pointer"
                    >
                      Vibrant (100%)
                    </button>
                  </div>
                </div>

                {/* Row 2: Hue Shift */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs font-semibold text-app-text-secondary sm:w-20 shrink-0">Hue Shift:</span>
                  <div className="grid grid-cols-4 sm:flex sm:items-center gap-2 flex-1">
                    <button
                      type="button"
                      onClick={() => rotateThemeHue(30)}
                      className="px-2 py-1.5 text-center text-xs font-mono font-semibold rounded-lg bg-app-surface border border-app-border hover:border-app-accent text-app-text-secondary hover:text-app-accent transition cursor-pointer"
                    >
                      +30°
                    </button>
                    <button
                      type="button"
                      onClick={() => rotateThemeHue(60)}
                      className="px-2 py-1.5 text-center text-xs font-mono font-semibold rounded-lg bg-app-surface border border-app-border hover:border-app-accent text-app-text-secondary hover:text-app-accent transition cursor-pointer"
                    >
                      +60°
                    </button>
                    <button
                      type="button"
                      onClick={() => rotateThemeHue(90)}
                      className="px-2 py-1.5 text-center text-xs font-mono font-semibold rounded-lg bg-app-surface border border-app-border hover:border-app-accent text-app-text-secondary hover:text-app-accent transition cursor-pointer"
                    >
                      +90°
                    </button>
                    <button
                      type="button"
                      onClick={() => rotateThemeHue(180)}
                      className="px-2 py-1.5 text-center text-xs font-mono font-semibold rounded-lg bg-app-surface border border-app-border hover:border-app-accent text-app-text-secondary hover:text-app-accent transition cursor-pointer"
                    >
                      180° Invert
                    </button>
                  </div>
                </div>
              </div>

              {/* Core Layout Colors */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-app-accent mb-3 pb-1 border-b border-app-border">
                  1. Surfaces &amp; Backgrounds
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <ColorField
                    label="Background"
                    value={currentTheme.colors.background}
                    onChange={(val) => updateThemeColor('background', val)}
                  />
                  <ColorField
                    label="Surface / Cards"
                    value={currentTheme.colors.surface}
                    onChange={(val) => updateThemeColor('surface', val)}
                  />
                  <ColorField
                    label="Elevated Surface"
                    value={currentTheme.colors.surfaceElevated}
                    onChange={(val) => updateThemeColor('surfaceElevated', val)}
                  />
                  <ColorField
                    label="Subtle Background"
                    value={currentTheme.colors.surfaceSubtle}
                    onChange={(val) => updateThemeColor('surfaceSubtle', val)}
                  />
                </div>
              </div>

              {/* Borders & Divider Colors */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-app-accent mb-3 pb-1 border-b border-app-border">
                  2. Borders &amp; Outlines
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <ColorField
                    label="Standard Border"
                    value={currentTheme.colors.border}
                    onChange={(val) => updateThemeColor('border', val)}
                  />
                  <ColorField
                    label="Border Highlight"
                    value={currentTheme.colors.borderHighlight}
                    onChange={(val) => updateThemeColor('borderHighlight', val)}
                  />
                </div>
              </div>

              {/* Typography Colors */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-app-accent mb-3 pb-1 border-b border-app-border">
                  3. Typography &amp; Text
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <ColorField
                    label="Primary Text"
                    value={currentTheme.colors.textPrimary}
                    onChange={(val) => updateThemeColor('textPrimary', val)}
                  />
                  <ColorField
                    label="Secondary Text"
                    value={currentTheme.colors.textSecondary}
                    onChange={(val) => updateThemeColor('textSecondary', val)}
                  />
                  <ColorField
                    label="Muted Text"
                    value={currentTheme.colors.textMuted}
                    onChange={(val) => updateThemeColor('textMuted', val)}
                  />
                </div>
              </div>

              {/* Accents & Status Colors */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-app-accent mb-3 pb-1 border-b border-app-border">
                  4. Accents &amp; Telemetry Threshold Statuses
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <ColorField
                    label="Accent Color"
                    value={currentTheme.colors.accent}
                    onChange={(val) => updateThemeColor('accent', val)}
                  />
                  <ColorField
                    label="Nominal (Green)"
                    value={currentTheme.colors.statusNominal}
                    onChange={(val) => updateThemeColor('statusNominal', val)}
                  />
                  <ColorField
                    label="Warning (Amber)"
                    value={currentTheme.colors.statusWarning}
                    onChange={(val) => updateThemeColor('statusWarning', val)}
                  />
                  <ColorField
                    label="Critical (Red)"
                    value={currentTheme.colors.statusCritical}
                    onChange={(val) => updateThemeColor('statusCritical', val)}
                  />
                  <ColorField
                    label="Info (Sky Blue)"
                    value={currentTheme.colors.statusInfo}
                    onChange={(val) => updateThemeColor('statusInfo', val)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TYPOGRAPHY & FONTS */}
          {activeTab === 'typography' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-app-text-primary mb-1">
                  Font Selection
                </h3>
                <p className="text-xs text-app-text-secondary">
                  Choose primary UI font face and monospaced code font.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sans-serif UI Font */}
                <div className="p-4 rounded-xl bg-app-surface-elevated/40 border border-app-border space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-app-accent">
                    Primary Display & Body Font
                  </label>
                  <select
                    value={currentTheme.styles.fontFamily}
                    onChange={(e) => updateThemeStyle('fontFamily', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-app-surface border border-app-border focus:border-app-accent focus:outline-none text-app-text-primary cursor-pointer"
                  >
                    {AVAILABLE_SANS_FONTS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                  <div
                    className="p-3 rounded-lg bg-app-surface border border-app-border text-xs text-app-text-primary"
                    style={{ fontFamily: currentTheme.styles.fontFamily }}
                  >
                    <p className="font-bold mb-1">HUMID1 Telemetry Stack 68.5% RH 70.2°F</p>
                    <p className="text-app-text-secondary text-[11px]">
                      The quick brown fox jumps over the lazy humidor sensor.
                    </p>
                  </div>
                </div>

                {/* Monospace Code Font */}
                <div className="p-4 rounded-xl bg-app-surface-elevated/40 border border-app-border space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-app-accent">
                    Monospace Code & Telemetry Font
                  </label>
                  <select
                    value={currentTheme.styles.monoFamily}
                    onChange={(e) => updateThemeStyle('monoFamily', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-app-surface border border-app-border focus:border-app-accent focus:outline-none text-app-text-primary cursor-pointer"
                  >
                    {AVAILABLE_MONO_FONTS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                  <div
                    className="p-3 rounded-lg bg-app-surface border border-app-border text-xs font-mono text-app-accent"
                    style={{ fontFamily: currentTheme.styles.monoFamily }}
                  >
                    <p className="font-bold">POST /api/v1/telemetry HTTP/1.1</p>
                    <p className="text-app-text-secondary text-[11px] mt-1">
                      {`{"rh": 68.5, "temp_k": 294.37, "batt": 98}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STYLE PARAMETER SLIDERS */}
          {activeTab === 'styles' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-app-text-primary mb-1">
                    Style Parameters &amp; Geometry
                  </h3>
                  <p className="text-xs text-app-text-secondary">
                    Adjust corner radii and glassmorphism backdrop blur across all cards, containers, and controls.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      updateThemeStyle('cardRadius', '0px');
                      updateThemeStyle('borderRadius', '0px');
                      updateThemeStyle('buttonRadius', '0px');
                    }}
                    className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition cursor-pointer whitespace-nowrap"
                    title="Set card, container, and button radii to 0px for sharp square borders"
                  >
                    Zero (0px)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateThemeStyle('cardRadius', '16px');
                      updateThemeStyle('borderRadius', '12px');
                      updateThemeStyle('buttonRadius', '8px');
                    }}
                    className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-app-accent/10 border border-app-accent/30 text-app-accent hover:bg-app-accent/20 transition cursor-pointer whitespace-nowrap"
                    title="Set balanced rounded corner radii"
                  >
                    Standard
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card Corner Radius */}
                <div className="p-4 rounded-xl bg-app-surface-elevated/40 border border-app-border space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-app-accent">
                      Card / Board Radius
                    </label>
                    <span className="text-xs font-mono font-bold text-app-text-primary">
                      {currentTheme.styles.cardRadius}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="28"
                    step="2"
                    value={parseInt(currentTheme.styles.cardRadius || '16', 10)}
                    onChange={(e) => updateThemeStyle('cardRadius', `${e.target.value}px`)}
                    className="w-full accent-app-accent cursor-pointer"
                  />
                  <div
                    className="h-10 border border-app-border bg-app-surface flex items-center justify-center text-[10px] font-bold"
                    style={{ borderRadius: currentTheme.styles.cardRadius }}
                  >
                    Board / Card Preview
                  </div>
                </div>

                {/* Border / Container Radius */}
                <div className="p-4 rounded-xl bg-app-surface-elevated/40 border border-app-border space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-app-accent">
                      Container / Border Radius
                    </label>
                    <span className="text-xs font-mono font-bold text-app-text-primary">
                      {currentTheme.styles.borderRadius}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="2"
                    value={parseInt(currentTheme.styles.borderRadius || '12', 10)}
                    onChange={(e) => updateThemeStyle('borderRadius', `${e.target.value}px`)}
                    className="w-full accent-app-accent cursor-pointer"
                  />
                  <div
                    className="h-10 border border-app-border bg-app-surface flex items-center justify-center text-[10px] font-bold"
                    style={{ borderRadius: currentTheme.styles.borderRadius }}
                  >
                    Container Preview
                  </div>
                </div>

                {/* Button Radius */}
                <div className="p-4 rounded-xl bg-app-surface-elevated/40 border border-app-border space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-app-accent">
                      Button &amp; Control Radius
                    </label>
                    <span className="text-xs font-mono font-bold text-app-text-primary">
                      {currentTheme.styles.buttonRadius}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="2"
                    value={parseInt(currentTheme.styles.buttonRadius || '10', 10)}
                    onChange={(e) => updateThemeStyle('buttonRadius', `${e.target.value}px`)}
                    className="w-full accent-app-accent cursor-pointer"
                  />
                  <button
                    className="w-full h-9 bg-app-accent text-app-accent-text text-xs font-bold flex items-center justify-center"
                    style={{ borderRadius: currentTheme.styles.buttonRadius }}
                  >
                    Button Preview
                  </button>
                </div>

                {/* Glassmorphism Blur */}
                <div className="p-4 rounded-xl bg-app-surface-elevated/40 border border-app-border space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-app-accent">
                      Glass Blur
                    </label>
                    <span className="text-xs font-mono font-bold text-app-text-primary">
                      {currentTheme.styles.backdropBlur}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="2"
                    value={parseInt(currentTheme.styles.backdropBlur || '12', 10)}
                    onChange={(e) => updateThemeStyle('backdropBlur', `${e.target.value}px`)}
                    className="w-full accent-app-accent cursor-pointer"
                  />
                  <div
                    className="relative h-14 border border-app-border-highlight/60 overflow-hidden flex items-center justify-center p-2 select-none"
                    style={{ borderRadius: currentTheme.styles.cardRadius }}
                  >
                    {/* Vibrant background pattern to reveal the glass refraction */}
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-rose-500 to-sky-500 opacity-90" />
                    <div className="absolute inset-0 flex items-center justify-around opacity-60 font-mono text-[10px] font-black text-white">
                      <span>HUMID1</span>
                      <span>68.5% RH</span>
                      <span>70.2°F</span>
                    </div>
                    {/* Frosted Glass Overlay Capsule */}
                    <div
                      className="relative z-10 px-3 py-1 bg-app-surface/60 border border-white/30 text-[10px] font-mono font-bold text-app-text-primary shadow-lg"
                      style={{
                        borderRadius: currentTheme.styles.buttonRadius,
                        backdropFilter: `blur(${currentTheme.styles.backdropBlur || '12px'})`,
                        WebkitBackdropFilter: `blur(${currentTheme.styles.backdropBlur || '12px'})`,
                      }}
                    >
                      Glass Blur ({currentTheme.styles.backdropBlur || '12px'})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: IMPORT TOML */}
          {activeTab === 'import-toml' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-app-text-primary mb-1">
                    Import Linux TOML Palette
                  </h3>
                  <p className="text-xs text-app-text-secondary">
                    Drop or select a Linux TOML color palette file (.toml) to convert and apply its palette directly.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-app-surface border border-app-border w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <label htmlFor="toml-wcag-toggle" className="text-xs font-semibold text-app-text-primary cursor-pointer select-none">
                      Auto-Enforce WCAG Contrast
                    </label>
                  </div>
                  <input
                    id="toml-wcag-toggle"
                    type="checkbox"
                    checked={tomlEnforceWcag}
                    onChange={(e) => setTomlEnforceWcag(e.target.checked)}
                    className="w-4 h-4 accent-app-accent rounded cursor-pointer shrink-0"
                  />
                </div>
              </div>

              {/* Drag & Drop File Import for TOML */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-2xl border-2 border-dashed border-app-border-highlight hover:border-app-accent bg-app-surface-elevated/30 hover:bg-app-surface-elevated/60 transition cursor-pointer flex flex-col items-center justify-center text-center group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".toml"
                  className="hidden"
                />
                <div className="p-3.5 rounded-xl bg-app-accent/15 text-app-accent mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-app-text-primary mb-1">
                  Click or Drop TOML Color Palette (.toml)
                </h4>
                <p className="text-xs text-app-text-muted">
                  Supports standard Linux TOML palette definitions (`mode`, `accent`, `selection`, `background`, `foreground`, `red`, `green`, etc.)
                </p>
              </div>

              {/* Developer Theme Export Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-app-border/40">
                <span className="text-[11px] text-app-text-muted">
                  Developer Utility: Export active system theme schema to JSON
                </span>
                <button
                  type="button"
                  onClick={handleDevExportJson}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-mono font-bold rounded-lg bg-app-surface-elevated border border-app-border-highlight hover:border-app-accent text-app-text-primary hover:text-app-accent transition flex items-center justify-center gap-2 cursor-pointer shadow-sm whitespace-nowrap"
                >
                  <Download className="w-4 h-4 text-app-accent shrink-0" />
                  <span>Export Theme JSON</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-app-border bg-app-surface-elevated/40 flex items-center justify-between text-xs text-app-text-muted">
          <span>Active Preset: <strong className="text-app-accent">{currentTheme.name}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-app-accent text-app-accent-text hover:opacity-90 transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

// Auxiliary Color Field Component with Live Color Swatch & Hex Input
const ColorField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
}> = ({ label, value, onChange }) => {
  return (
    <div className="p-2.5 rounded-xl bg-app-surface border border-app-border hover:border-app-border-highlight transition flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 overflow-hidden">
        <label className="relative cursor-pointer shrink-0">
          <input
            type="color"
            value={value.startsWith('#') && value.length === 7 ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
          <div
            className="w-7 h-7 rounded-lg border border-black/30 shadow-inner flex items-center justify-center transition transform hover:scale-105"
            style={{ backgroundColor: value }}
          />
        </label>
        <div className="truncate">
          <span className="block text-[11px] font-bold text-app-text-secondary truncate">{label}</span>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-20 bg-transparent text-xs font-mono font-bold text-app-text-primary focus:outline-none uppercase"
          />
        </div>
      </div>
    </div>
  );
};
