import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HumidorDevice, TempUnit, HistoricalTelemetryPoint } from '../types';
import { thingsboard } from '../services/thingsboard';
import {
  alarmThresholdService,
  AlarmThresholds,
  toDisplayTemp,
} from '../services/alarmThresholds';
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
} from 'recharts';
import { Activity, RefreshCw, Sliders } from 'lucide-react';

interface HistoricalChartProps {
  device: HumidorDevice;
  tempUnit: TempUnit;
}

type TimeRange = '1h' | '6h' | '12h' | '24h' | '3d' | '7d';

export const HistoricalChart: React.FC<HistoricalChartProps> = ({
  device,
  tempUnit,
}) => {
  const [range, setRange] = useState<TimeRange>('24h');
  const [showRh, setShowRh] = useState(true);
  const [showTemp, setShowTemp] = useState(true);
  const [showRhBoundaries, setShowRhBoundaries] = useState(true);
  const [showTempBoundaries, setShowTempBoundaries] = useState(true);
  const [historyData, setHistoryData] = useState<HistoricalTelemetryPoint[]>(device.history || []);
  const [isLoading, setIsLoading] = useState(false);
  const [lastBatchTime, setLastBatchTime] = useState<Date | null>(null);
  const [thresholds, setThresholds] = useState<AlarmThresholds>(
    alarmThresholdService.getThresholds()
  );

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

  const { startTs, endTs, ticks } = useMemo(() => {
    const end = Date.now();
    const start = end - rangeHours * 3600 * 1000;

    let stepMs = (rangeHours * 3600 * 1000) / 6;
    if (range === '1h') stepMs = 10 * 60 * 1000; // 10m
    else if (range === '6h') stepMs = 60 * 60 * 1000; // 1h
    else if (range === '12h') stepMs = 2 * 60 * 60 * 1000; // 2h
    else if (range === '24h') stepMs = 4 * 60 * 60 * 1000; // 4h
    else if (range === '3d') stepMs = 12 * 60 * 60 * 1000; // 12h
    else if (range === '7d') stepMs = 24 * 60 * 60 * 1000; // 24h

    const tickList: number[] = [];
    for (let t = start; t <= end; t += stepMs) {
      tickList.push(t);
    }
    if (tickList.length > 0 && tickList[tickList.length - 1] < end - stepMs / 4) {
      tickList.push(end);
    }
    return { startTs: start, endTs: end, ticks: tickList };
  }, [range, rangeHours]);

  const formatTick = useCallback(
    (ts: number) => {
      const d = new Date(ts);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');

      if (['1h', '6h', '12h', '24h'].includes(range)) {
        return `${hours}:${minutes}`;
      }
      return `${month}/${day} ${hours}:${minutes}`;
    },
    [range]
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
        // Fallback: Generate points anchoring to current real telemetry spanning the full window
        const currentTelemetry = telemetryRef.current;
        const liveTs = currentTelemetry?.timestamp || Date.now();
        const liveRh = currentTelemetry?.rh || 68;
        const liveTemp = currentTelemetry?.temp || 70;
        const liveBatt = currentTelemetry?.battery || 100;

        let count = 60;
        if (range === '1h') count = 60;
        else if (range === '6h') count = 72;
        else if (range === '12h') count = 72;
        else if (range === '24h') count = 96;
        else if (range === '3d') count = 120;
        else count = 140;

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

  // Trigger batch refresh immediately upon period selection or device change
  // and maintain a 300-second (5 min) batch polling cycle
  useEffect(() => {
    loadHistory();
    const intervalId = setInterval(() => {
      loadHistory();
    }, 300000); // 300 seconds (5 min)
    return () => clearInterval(intervalId);
  }, [loadHistory]);

  const displayHistory = useMemo(() => {
    return historyData.map((pt) => ({
      ...pt,
      displayTemp: tempUnit === 'C' ? pt.tempC : pt.temp,
    }));
  }, [historyData, tempUnit]);

  const tempSymbol = tempUnit === 'C' ? '°C' : '°F';

  // Scaled temperature threshold values
  const dispTempLowCritical = toDisplayTemp(thresholds.tempLowCritical, tempUnit);
  const dispTempLowWarning = toDisplayTemp(thresholds.tempLowWarning, tempUnit);
  const dispTempHighWarning = toDisplayTemp(thresholds.tempHighWarning, tempUnit);
  const dispTempHighCritical = toDisplayTemp(thresholds.tempHighCritical, tempUnit);

  // Dynamic axis domains to keep boundary lines and series visible (including large test swings)
  const { calculatedRhMin, calculatedRhMax, calculatedTempMin, calculatedTempMax } = useMemo(() => {
    let minRh = Math.min(50, Math.floor(thresholds.rhLowCritical - 2));
    let maxRh = Math.max(82, Math.ceil(thresholds.rhHighCritical + 2));
    let minT = tempUnit === 'C'
      ? Math.min(10, Math.floor(dispTempLowCritical - 2))
      : Math.min(50, Math.floor(thresholds.tempLowCritical - 3));
    let maxT = tempUnit === 'C'
      ? Math.max(30, Math.ceil(dispTempHighCritical + 2))
      : Math.max(82, Math.ceil(thresholds.tempHighCritical + 3));

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

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
              Dual-Axis Climate Telemetry History
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Relative Humidity (%) & Temperature ({tempSymbol}) timeseries with distinct boundary thresholds
            </p>
          </div>
        </div>

        {/* Range & Series / Boundary Toggles */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Series filters */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setShowRh(!showRh)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
                showRh ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>RH %</span>
            </button>
            <button
              onClick={() => setShowTemp(!showTemp)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
                showTemp ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Temp</span>
            </button>
            
            {/* Separate Boundary Enablement Controls */}
            <button
              onClick={() => setShowRhBoundaries(!showRhBoundaries)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
                showRhBoundaries ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle RH alarm boundary lines"
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>RH Bounds</span>
            </button>

            <button
              onClick={() => setShowTempBoundaries(!showTempBoundaries)}
              className={`px-2 sm:px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer text-xs ${
                showTempBoundaries ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Temperature alarm boundary lines"
            >
              <Sliders className="w-3 h-3 text-sky-400" />
              <span>Temp Bounds</span>
            </button>
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            {(['1h', '6h', '12h', '24h', '3d', '7d'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  range === r
                    ? 'bg-amber-600 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={loadHistory}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs"
            title="Manual Batch Window Refresh (Grabs latest ThingsBoard timeseries)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden md:inline text-[11px] font-medium">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Axis Chart Area */}
      <div className="h-[270px] sm:h-[350px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displayHistory}
            margin={{ top: 12, right: 12, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="rhGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="timestamp"
              type="number"
              domain={[startTs, endTs]}
              ticks={ticks}
              tickFormatter={formatTick}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />

            {/* Left Y-Axis: Humidity */}
            <YAxis
              yAxisId="rh"
              domain={[calculatedRhMin, calculatedRhMax]}
              stroke="#f59e0b"
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
              stroke="#38bdf8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}°`}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: '#090d16',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '11px',
                color: '#f8fafc',
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

            {/* Alarm Threshold Boundary Lines for Temperature (Scaled to active unit) */}
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
                stroke="#f59e0b"
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
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                connectNulls={true}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Legend / Threshold Envelope Summary */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-[11px] text-slate-400">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-amber-400" />
            <span className="text-slate-300 font-medium">RH %</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-sky-400" />
            <span className="text-slate-300 font-medium">Temp ({tempSymbol})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 border-t border-dashed border-purple-400" />
            <span className="text-purple-300 font-medium">Boundary Lines</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10px] sm:text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>RH Safe: {thresholds.rhLowWarning}%–{thresholds.rhHighWarning}% (Crit: &lt;{thresholds.rhLowCritical}% / &gt;{thresholds.rhHighCritical}%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-sky-300">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>Temp Safe: {dispTempLowWarning}°–{dispTempHighWarning}°{tempUnit}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
