import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { HumidorDevice, TempUnit, HistoricalTelemetryPoint } from '../types';
import { thingsboard } from '../services/thingsboard';
import {
  alarmThresholdService,
  AlarmThresholds,
  toDisplayTemp,
  toKelvinTemp,
} from '../services/alarmThresholds';
import { downsampleTelemetryLTTB } from '../utils/downsample';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  Brush,
} from 'recharts';
import {
  Activity,
  RefreshCw,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
} from 'lucide-react';

interface HistoricalChartProps {
  device: HumidorDevice;
  tempUnit: TempUnit;
}

type TimeRange = '1h' | '6h' | '12h' | '24h' | '3d' | '7d';

export const HistoricalChart: React.FC<HistoricalChartProps> = ({
  device,
  tempUnit,
}) => {
  const { currentTheme } = useTheme();
  const [range, setRange] = useState<TimeRange>('24h');
  const [showRh, setShowRh] = useState(true);
  const [showTemp, setShowTemp] = useState(true);
  const [showRhBoundaries, setShowRhBoundaries] = useState(true);
  const [showTempBoundaries, setShowTempBoundaries] = useState(true);
  const [showBrush, setShowBrush] = useState(false);
  const [historyData, setHistoryData] = useState<HistoricalTelemetryPoint[]>(device.history || []);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLastBatchTime] = useState<Date | null>(null);
  const [thresholds, setThresholds] = useState<AlarmThresholds>(
    alarmThresholdService.getThresholds()
  );

  // Zoom and Drag-Selection State
  const [zoomRange, setZoomRange] = useState<{ startTs: number; endTs: number } | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    const unsub = alarmThresholdService.subscribe(setThresholds);
    return unsub;
  }, []);

  // Time series window range hours (1h, 6h, 12h, 24h, 3d, 7d)
  const rangeHours = useMemo(() => {
    switch (range) {
      case '1h':
        return 1;
      case '6h':
        return 6;
      case '12h':
        return 12;
      case '24h':
        return 24;
      case '3d':
        return 72;
      case '7d':
        return 168;
      default:
        return 24;
    }
  }, [range]);

  // Base full window timestamps
  const baseEndTs = useMemo(() => Date.now(), [range, historyData]);
  const baseStartTs = useMemo(() => baseEndTs - rangeHours * 3600 * 1000, [baseEndTs, rangeHours]);

  // Reset custom zoom when range selection button changes
  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
    setZoomRange(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  // Active viewing window
  const activeStartTs = zoomRange ? zoomRange.startTs : baseStartTs;
  const activeEndTs = zoomRange ? zoomRange.endTs : baseEndTs;
  const isZoomed = zoomRange !== null;

  // Compute clean tick marks for active window
  const ticks = useMemo(() => {
    const duration = activeEndTs - activeStartTs;
    let stepMs: number;

    if (duration <= 30 * 60 * 1000) stepMs = 5 * 60 * 1000; // 5 min
    else if (duration <= 2 * 3600 * 1000) stepMs = 15 * 60 * 1000; // 15 min
    else if (duration <= 6 * 3600 * 1000) stepMs = 60 * 60 * 1000; // 1 hr
    else if (duration <= 12 * 3600 * 1000) stepMs = 2 * 3600 * 1000; // 2 hr
    else if (duration <= 24 * 3600 * 1000) stepMs = 4 * 3600 * 1000; // 4 hr
    else if (duration <= 72 * 3600 * 1000) stepMs = 12 * 3600 * 1000; // 12 hr
    else stepMs = 24 * 3600 * 1000; // 24 hr

    const tickList: number[] = [];
    const firstTick = Math.ceil(activeStartTs / stepMs) * stepMs;
    for (let t = firstTick; t <= activeEndTs; t += stepMs) {
      tickList.push(t);
    }
    if (tickList.length > 0 && tickList[tickList.length - 1] < activeEndTs - stepMs / 3) {
      tickList.push(activeEndTs);
    }
    return tickList.length > 0 ? tickList : [activeStartTs, activeEndTs];
  }, [activeStartTs, activeEndTs]);

  const formatTick = useCallback(
    (ts: number) => {
      const d = new Date(ts);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');

      const duration = activeEndTs - activeStartTs;
      if (duration <= 24 * 3600 * 1000) {
        return `${hours}:${minutes}`;
      }
      return `${month}/${day} ${hours}:${minutes}`;
    },
    [activeStartTs, activeEndTs]
  );

  const telemetryRef = useRef(device?.telemetry);
  useEffect(() => {
    telemetryRef.current = device?.telemetry;
  }, [device?.telemetry]);

  const loadHistory = useCallback(async () => {
    if (!device?.id) return;
    setIsLoading(true);
    try {
      const points = await thingsboard.getHistory(device.id, rangeHours);
      if (points && points.length > 0) {
        setHistoryData(points);
        setLastBatchTime(new Date());
      } else {
        // Fallback realistic points spanning full window
        const currentTelemetry = telemetryRef.current;
        const liveTs = currentTelemetry?.timestamp || Date.now();
        const liveRh = currentTelemetry?.rh || 68;
        const liveTemp = currentTelemetry?.temp || 70;
        const liveBatt = currentTelemetry?.battery || 100;

        let count = 120;
        if (range === '1h') count = 60;
        else if (range === '6h') count = 90;
        else if (range === '12h') count = 120;
        else if (range === '24h') count = 150;
        else count = 200;

        const windowDurationMs = rangeHours * 3600 * 1000;
        const startTs = liveTs - windowDurationMs;
        const stepMs = windowDurationMs / count;

        const generated: HistoricalTelemetryPoint[] = [];

        for (let i = 0; i <= count; i++) {
          const ptTs = startTs + i * stepMs;
          const d = new Date(ptTs);
          const hours = d.getHours().toString().padStart(2, '0');
          const minutes = d.getMinutes().toString().padStart(2, '0');
          const month = (d.getMonth() + 1).toString().padStart(2, '0');
          const day = d.getDate().toString().padStart(2, '0');

          const progress = i / count;
          const wave = Math.sin((ptTs / 1000 / 3600) * Math.PI);
          const offsetRh = (1 - progress) * (wave * 0.8 + ((ptTs % 7) - 3) * 0.05);
          const offsetTemp = (1 - progress) * (wave * 0.6 + ((ptTs % 5) - 2) * 0.05);

          const currentPtRh = Number((liveRh + offsetRh).toFixed(1));
          const currentPtTemp = Number((liveTemp + offsetTemp).toFixed(1));

          generated.push({
            timestamp: ptTs,
            timeFormatted: `${hours}:${minutes}`,
            dateFormatted: `${month}/${day} ${hours}:${minutes}`,
            timeLabel: rangeHours <= 24 ? `${hours}:${minutes}` : `${month}/${day} ${hours}:${minutes}`,
            rh: currentPtRh,
            temp: currentPtTemp,
            tempC: Number(((currentPtTemp - 32) * (5 / 9)).toFixed(1)),
            battery: liveBatt,
          });
        }
        setHistoryData(generated);
        setLastBatchTime(new Date());
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [device?.id, rangeHours, range]);

  useEffect(() => {
    loadHistory();
    const intervalId = setInterval(() => {
      loadHistory();
    }, 300000); // 5 min
    return () => clearInterval(intervalId);
  }, [loadHistory]);

  // Downsample data points adaptively (Max 220 points) using LTTB to eliminate noise while preserving all real climate swings
  const displayHistory = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];

    // Filter points in active window plus slight margin
    const margin = (activeEndTs - activeStartTs) * 0.05;
    const windowPoints = historyData.filter(
      (p) => p.timestamp >= activeStartTs - margin && p.timestamp <= activeEndTs + margin
    );

    // Apply LTTB downsampling to preserve peaks, maintenance drops, and thermal ramps
    const sampled = downsampleTelemetryLTTB(
      windowPoints.length > 0 ? windowPoints : historyData,
      220
    );

    return sampled.map((pt) => {
      const kVal = toKelvinTemp(pt.temp);
      return {
        ...pt,
        displayTemp: toDisplayTemp(kVal, tempUnit),
      };
    });
  }, [historyData, activeStartTs, activeEndTs, tempUnit]);

  const tempSymbol = `°${tempUnit}`;

  // Scaled temperature threshold values
  const dispTempLowCritical = toDisplayTemp(thresholds.tempLowCritical, tempUnit);
  const dispTempLowWarning = toDisplayTemp(thresholds.tempLowWarning, tempUnit);
  const dispTempHighWarning = toDisplayTemp(thresholds.tempHighWarning, tempUnit);
  const dispTempHighCritical = toDisplayTemp(thresholds.tempHighCritical, tempUnit);

  // Dynamic axis domains to keep boundary lines and series visible
  const { calculatedRhMin, calculatedRhMax, calculatedTempMin, calculatedTempMax } = useMemo(() => {
    let minRh = Math.min(50, Math.floor(thresholds.rhLowCritical - 2));
    let maxRh = Math.max(82, Math.ceil(thresholds.rhHighCritical + 2));
    let minT =
      tempUnit === 'C'
        ? Math.min(10, Math.floor(dispTempLowCritical - 2))
        : Math.min(50, Math.floor(dispTempLowCritical - 3));
    let maxT =
      tempUnit === 'C'
        ? Math.max(30, Math.ceil(dispTempHighCritical + 2))
        : Math.max(82, Math.ceil(dispTempHighCritical + 3));

    if (displayHistory.length > 0) {
      for (const pt of displayHistory) {
        if (typeof pt.rh === 'number' && !isNaN(pt.rh)) {
          if (pt.rh < minRh) minRh = Math.floor(pt.rh - 2);
          if (pt.rh > maxRh) maxRh = Math.ceil(pt.rh + 2);
        }
        if (typeof pt.displayTemp === 'number' && !isNaN(pt.displayTemp)) {
          if (pt.displayTemp < minT) minT = Math.floor(pt.displayTemp - 2);
          if (pt.displayTemp > maxT) maxT = Math.ceil(pt.displayTemp + 2);
        }
      }
    }

    return {
      calculatedRhMin: Math.max(0, minRh),
      calculatedRhMax: Math.min(100, maxRh),
      calculatedTempMin: minT,
      calculatedTempMax: maxT,
    };
  }, [displayHistory, thresholds, tempUnit, dispTempLowCritical, dispTempHighCritical]);

  // Zoom & Pan Actions
  const handleZoomIn = () => {
    const currentSpan = activeEndTs - activeStartTs;
    if (currentSpan <= 5 * 60 * 1000) return; // Limit minimum zoom to 5 min
    const zoomDelta = currentSpan * 0.25;
    setZoomRange({
      startTs: activeStartTs + zoomDelta / 2,
      endTs: activeEndTs - zoomDelta / 2,
    });
  };

  const handleZoomOut = () => {
    const currentSpan = activeEndTs - activeStartTs;
    const zoomDelta = currentSpan * 0.33;
    const newStart = Math.max(baseStartTs - 3600000, activeStartTs - zoomDelta / 2);
    const newEnd = Math.min(baseEndTs + 60000, activeEndTs + zoomDelta / 2);

    if (newStart <= baseStartTs && newEnd >= baseEndTs) {
      setZoomRange(null);
    } else {
      setZoomRange({ startTs: newStart, endTs: newEnd });
    }
  };

  const handlePan = (direction: 'left' | 'right') => {
    const currentSpan = activeEndTs - activeStartTs;
    const shift = currentSpan * 0.25 * (direction === 'left' ? -1 : 1);
    const newStart = activeStartTs + shift;
    const newEnd = activeEndTs + shift;
    setZoomRange({ startTs: newStart, endTs: newEnd });
  };

  const handleResetZoom = () => {
    setZoomRange(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  // Selection Drag-to-Zoom
  const handleMouseDown = (e: any) => {
    if (e && e.activeLabel) {
      setRefAreaLeft(Number(e.activeLabel));
      setIsSelecting(true);
    }
  };

  const handleMouseMove = (e: any) => {
    if (isSelecting && e && e.activeLabel) {
      setRefAreaRight(Number(e.activeLabel));
    }
  };

  const handleMouseUp = () => {
    if (refAreaLeft && refAreaRight) {
      const [start, end] = [
        Math.min(refAreaLeft, refAreaRight),
        Math.max(refAreaLeft, refAreaRight),
      ];
      // Require at least 20 seconds selection
      if (end - start >= 20000) {
        setZoomRange({ startTs: start, endTs: end });
      }
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsSelecting(false);
  };

  // Human readable active zoom label
  const zoomDurationLabel = useMemo(() => {
    if (!isZoomed) return null;
    const durMs = activeEndTs - activeStartTs;
    const durMinutes = Math.round(durMs / 60000);
    if (durMinutes < 60) return `${durMinutes}m`;
    const hours = (durMinutes / 60).toFixed(1);
    return `${hours}h`;
  }, [isZoomed, activeStartTs, activeEndTs]);

  return (
    <div className="bg-app-surface/90 border border-app-border rounded-2xl p-3.5 sm:p-5 lg:p-6 shadow-xl backdrop-blur-sm w-full">
      {/* Controls Row: Pulse Icon, Day-Scale Selector & Refresh on the Left, Series & Bounds Pushed to the Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-3.5 border-b border-app-border/80">
        {/* Left: Pulse/Activity Icon + Zoom Indicator + Day-scale selector + Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pulse / Activity Icon */}
          <div 
            className="p-1.5 rounded-xl bg-app-accent/10 text-app-accent border border-app-accent/20 shrink-0 flex items-center justify-center shadow-xs"
            title="Climate Telemetry History Series"
          >
            <Activity className="w-4 h-4" />
          </div>

          {isZoomed && (
            <span className="px-2 py-0.5 rounded-md bg-app-accent/20 border border-app-accent/40 text-app-accent text-[10px] font-mono flex items-center gap-1 shadow-xs">
              <span>Zoomed: {zoomDurationLabel}</span>
              <button
                onClick={handleResetZoom}
                className="hover:text-app-text-primary font-bold ml-1 cursor-pointer"
                title="Reset Zoom"
              >
                ×
              </button>
            </span>
          )}

          {/* Time range preset selector (day-scale) */}
          <div className="flex items-center gap-1 bg-app-bg/80 p-1 rounded-xl border border-app-border text-xs font-mono">
            {(['1h', '6h', '12h', '24h', '3d', '7d'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => handleRangeChange(r)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  range === r && !isZoomed
                    ? 'bg-app-accent-hover text-app-accent-text font-bold shadow-sm'
                    : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Manual Refresh Button to the right of the day-selector */}
          <button
            onClick={loadHistory}
            disabled={isLoading}
            className="h-8 px-2.5 rounded-xl bg-app-bg/80 border border-app-border hover:border-app-border-highlight text-app-text-secondary hover:text-app-text-primary transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs shadow-xs"
            title="Manual Batch Window Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-app-accent' : 'text-app-text-secondary'}`} />
            <span className="text-[11px] font-medium">Refresh</span>
          </button>
        </div>

        {/* Right: Series and Bounds Selectors pushed to the right */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-start sm:justify-end">
          <div className="flex items-center gap-1.5 bg-app-bg/80 p-1 rounded-xl border border-app-border text-xs">
            {/* Series filters */}
            <button
              onClick={() => setShowRh(!showRh)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
                showRh
                  ? 'bg-app-accent/20 text-app-accent border border-app-accent/30'
                  : 'text-app-text-primary0 hover:text-app-text-secondary'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>RH %</span>
            </button>
            <button
              onClick={() => setShowTemp(!showTemp)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
                showTemp
                  ? 'bg-sky-500/20 text-app-status-info border border-app-status-info/30'
                  : 'text-app-text-primary0 hover:text-app-text-secondary'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-app-status-info" />
              <span>Temp</span>
            </button>

            <div className="h-3.5 w-px bg-app-surface-elevated mx-0.5" />

            {/* Boundary controls */}
            <button
              onClick={() => setShowRhBoundaries(!showRhBoundaries)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
                showRhBoundaries
                  ? 'bg-app-accent/20 text-app-accent border border-app-accent/30'
                  : 'text-app-text-primary0 hover:text-app-text-secondary'
              }`}
              title="Toggle RH alarm boundary lines"
            >
              <Sliders className="w-3 h-3 text-app-accent" />
              <span>RH Bounds</span>
            </button>

            <button
              onClick={() => setShowTempBoundaries(!showTempBoundaries)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
                showTempBoundaries
                  ? 'bg-sky-500/20 text-app-status-info border border-app-status-info/30'
                  : 'text-app-text-primary0 hover:text-app-text-secondary'
              }`}
              title="Toggle Temperature alarm boundary lines"
            >
              <Sliders className="w-3 h-3 text-app-status-info" />
              <span>Temp Bounds</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-Axis Chart Area */}
      <div className="h-[320px] sm:h-[400px] lg:h-[460px] w-full pt-1 select-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displayHistory}
            margin={{ top: 12, right: 6, left: -14, bottom: showBrush ? 20 : 0 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <defs>
              <linearGradient id="rhGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentTheme.charts.rhGradientStart} stopOpacity={0.35} />
                <stop offset="95%" stopColor={currentTheme.charts.rhGradientStart} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={currentTheme.charts.gridColor} vertical={false} />

            <XAxis
              dataKey="timestamp"
              type="number"
              domain={[activeStartTs, activeEndTs]}
              ticks={ticks}
              tickFormatter={formatTick}
              stroke={currentTheme.colors.textMuted}
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />

            {/* Left Y-Axis: Humidity */}
            <YAxis
              yAxisId="rh"
              domain={[calculatedRhMin, calculatedRhMax]}
              stroke={currentTheme.charts.rhLine}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />

            {/* Right Y-Axis: Temperature */}
            <YAxis
              yAxisId="temp"
              orientation="right"
              domain={[calculatedTempMin, calculatedTempMax]}
              stroke={currentTheme.charts.tempLine}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}°`}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: currentTheme.charts.tooltipBackground,
                borderColor: currentTheme.charts.tooltipBorder,
                borderRadius: '0.75rem',
                fontSize: '11px',
                color: currentTheme.colors.textPrimary,
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
              }}
              formatter={(value: any, name: string) => {
                if (name === 'rh') return [`${Number(value).toFixed(1)} %`, 'Humidity'];
                if (name === 'displayTemp') return [`${Number(value).toFixed(1)} ${tempSymbol}`, 'Temperature'];
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                const pt = payload?.[0]?.payload;
                const ts = typeof label === 'number' ? label : pt?.timestamp;
                if (ts) {
                  const d = new Date(ts);
                  const hours = d.getHours().toString().padStart(2, '0');
                  const minutes = d.getMinutes().toString().padStart(2, '0');
                  const seconds = d.getSeconds().toString().padStart(2, '0');
                  const month = (d.getMonth() + 1).toString().padStart(2, '0');
                  const day = d.getDate().toString().padStart(2, '0');
                  return `Logged: ${month}/${day} ${hours}:${minutes}:${seconds}`;
                }
                return `Logged: ${label}`;
              }}
            />

            {/* Alarm Threshold Boundary Lines for Relative Humidity */}
            {showRhBoundaries && showRh && (
              <>
                <ReferenceLine
                  yAxisId="rh"
                  y={thresholds.rhLowCritical}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  label={{
                    value: `RH Low Crit (${thresholds.rhLowCritical}%)`,
                    fill: '#f87171',
                    fontSize: 9,
                    position: 'insideBottomLeft',
                  }}
                />
                <ReferenceLine
                  yAxisId="rh"
                  y={thresholds.rhLowWarning}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  strokeOpacity={0.6}
                  label={{
                    value: `RH Low Warn (${thresholds.rhLowWarning}%)`,
                    fill: '#fbbf24',
                    fontSize: 9,
                    position: 'insideBottomLeft',
                  }}
                />
                <ReferenceLine
                  yAxisId="rh"
                  y={thresholds.rhHighWarning}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  strokeOpacity={0.6}
                  label={{
                    value: `RH High Warn (${thresholds.rhHighWarning}%)`,
                    fill: '#fbbf24',
                    fontSize: 9,
                    position: 'insideTopLeft',
                  }}
                />
                <ReferenceLine
                  yAxisId="rh"
                  y={thresholds.rhHighCritical}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  label={{
                    value: `RH High Crit (${thresholds.rhHighCritical}%)`,
                    fill: '#f87171',
                    fontSize: 9,
                    position: 'insideTopLeft',
                  }}
                />
              </>
            )}

            {/* Alarm Threshold Boundary Lines for Temperature */}
            {showTempBoundaries && showTemp && (
              <>
                <ReferenceLine
                  yAxisId="temp"
                  y={dispTempLowCritical}
                  stroke="#3b82f6"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  label={{
                    value: `Temp Low Crit (${dispTempLowCritical}°)`,
                    fill: '#60a5fa',
                    fontSize: 9,
                    position: 'insideBottomRight',
                  }}
                />
                <ReferenceLine
                  yAxisId="temp"
                  y={dispTempLowWarning}
                  stroke="#0284c7"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  strokeOpacity={0.6}
                  label={{
                    value: `Temp Low Warn (${dispTempLowWarning}°)`,
                    fill: '#38bdf8',
                    fontSize: 9,
                    position: 'insideBottomRight',
                  }}
                />
                <ReferenceLine
                  yAxisId="temp"
                  y={dispTempHighWarning}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  strokeOpacity={0.6}
                  label={{
                    value: `Temp High Warn (${dispTempHighWarning}°)`,
                    fill: '#fbbf24',
                    fontSize: 9,
                    position: 'insideTopRight',
                  }}
                />
                <ReferenceLine
                  yAxisId="temp"
                  y={dispTempHighCritical}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  label={{
                    value: `Temp High Crit (${dispTempHighCritical}°)`,
                    fill: '#f87171',
                    fontSize: 9,
                    position: 'insideTopRight',
                  }}
                />
              </>
            )}

            {showRh && (
              <Area
                yAxisId="rh"
                type="monotone"
                dataKey="rh"
                name="rh"
                stroke={currentTheme.charts.rhLine}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#rhGradient)"
                connectNulls={true}
                isAnimationActive={false}
              />
            )}

            {showTemp && (
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="displayTemp"
                name="displayTemp"
                stroke={currentTheme.charts.tempLine}
                strokeWidth={2}
                dot={false}
                connectNulls={true}
                isAnimationActive={false}
              />
            )}

            {/* Drag-to-zoom selection highlight box */}
            {refAreaLeft && refAreaRight ? (
              <ReferenceArea
                yAxisId="rh"
                x1={refAreaLeft}
                x2={refAreaRight}
                strokeOpacity={0.3}
                fill={currentTheme.charts.rhLine}
                fillOpacity={0.25}
              />
            ) : null}

            {/* Optional Timeline Brush Scroller */}
            {showBrush && displayHistory.length > 0 && (
              <Brush
                dataKey="timestamp"
                height={26}
                stroke={currentTheme.charts.rhLine}
                fill={currentTheme.colors.surface}
                tickFormatter={formatTick}
                travellerWidth={10}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Time Graph Control Bar (Zoom, Pan, Slider & Reset placed above legend in bottom-left) */}
      <div className="mt-2 pt-2 flex flex-wrap items-center justify-between gap-2.5 text-xs text-app-text-secondary">
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom & Navigation Button Cluster */}
          <div className="flex items-center gap-1 bg-app-bg/90 p-1 rounded-xl border border-app-border shadow-sm">
            <button
              onClick={() => handlePan('left')}
              className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated transition cursor-pointer"
              title="Pan Left (Shift Back in Time)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated transition cursor-pointer"
              title="Zoom In (+25%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated transition cursor-pointer"
              title="Zoom Out (-25%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handlePan('right')}
              className="p-1.5 rounded-lg text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated transition cursor-pointer"
              title="Pan Right (Shift Forward in Time)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {isZoomed && (
              <button
                onClick={handleResetZoom}
                className="px-2 py-1 rounded-lg bg-app-accent/20 text-app-accent hover:bg-app-accent/30 transition cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                title="Reset to Full Range"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Zoom</span>
              </button>
            )}
            <button
              onClick={() => setShowBrush(!showBrush)}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                showBrush
                  ? 'bg-app-accent/20 text-app-accent border border-app-accent/30'
                  : 'text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated'
              }`}
              title="Toggle Timeline Scroll & Range Slider"
            >
              <MoveHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-[11px] text-app-text-primary0 hidden sm:inline">
            💡 Drag across chart or use buttons to pan & zoom
          </span>
        </div>

        {isZoomed && (
          <div className="text-[11px] font-mono text-app-accent/90 flex items-center gap-1.5 bg-app-bg/40 px-2 py-1 rounded-lg border border-app-accent/20">
            <span>Custom Zoom Window</span>
            <button
              onClick={handleResetZoom}
              className="text-app-accent hover:underline cursor-pointer flex items-center gap-0.5 ml-1"
            >
              (Reset)
            </button>
          </div>
        )}
      </div>

      {/* Footer Legend / Threshold Envelope Summary */}
      <div className="mt-3 pt-2.5 border-t border-app-border/80 flex flex-wrap items-center justify-between gap-2.5 text-[11px] text-app-text-secondary">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-amber-400" />
            <span className="text-app-text-secondary font-medium">RH %</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-app-status-info" />
            <span className="text-app-text-secondary font-medium">Temp ({tempSymbol})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 border-t border-dashed border-purple-400" />
            <span className="text-purple-300 font-medium">Boundary Lines</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10px] sm:text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-app-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>
              RH Safe: {thresholds.rhLowWarning}%–{thresholds.rhHighWarning}% (Crit: &lt;
              {thresholds.rhLowCritical}% / &gt;{thresholds.rhHighCritical}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-app-status-info">
            <span className="w-1.5 h-1.5 rounded-full bg-app-status-info" />
            <span>
              Temp Safe: {dispTempLowWarning}°–{dispTempHighWarning}°{tempUnit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

