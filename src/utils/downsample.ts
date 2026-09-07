import { HistoricalTelemetryPoint } from '../types';

/**
 * Largest-Triangle-Three-Buckets (LTTB) Downsampling Algorithm
 * Specially adapted for multi-variable IoT climate telemetry (RH%, Temperature, Battery, RSSI).
 *
 * Preserves true peaks, maintenance dips, thermal ramps, and significant climate events
 * while eliminating high-frequency sensor noise and line clutter.
 */
export function downsampleTelemetryLTTB(
  data: HistoricalTelemetryPoint[],
  targetThreshold: number
): HistoricalTelemetryPoint[] {
  if (!data || data.length <= targetThreshold || targetThreshold <= 2) {
    return data || [];
  }

  const dataLength = data.length;
  const sampled: HistoricalTelemetryPoint[] = [];

  // Bucket size. Leave room for start and end data points
  const every = (dataLength - 2) / (targetThreshold - 2);

  let a = 0; // Initially always select the first point
  sampled.push(data[a]);

  for (let i = 0; i < targetThreshold - 2; i++) {
    // Calculate point average for next bucket (bucket c)
    let avgX = 0;
    let avgYRh = 0;
    let avgYTemp = 0;

    let avgRangeStart = Math.floor((i + 1) * every) + 1;
    let avgRangeEnd = Math.floor((i + 2) * every) + 1;
    avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += data[j].timestamp;
      avgYRh += data[j].rh;
      avgYTemp += data[j].temp;
    }

    if (avgRangeLength > 0) {
      avgX /= avgRangeLength;
      avgYRh /= avgRangeLength;
      avgYTemp /= avgRangeLength;
    } else {
      avgX = data[Math.min(dataLength - 1, avgRangeStart)].timestamp;
      avgYRh = data[Math.min(dataLength - 1, avgRangeStart)].rh;
      avgYTemp = data[Math.min(dataLength - 1, avgRangeStart)].temp;
    }

    // Get the range for this bucket (bucket b)
    let rangeOffs = Math.floor(i * every) + 1;
    const rangeTo = Math.floor((i + 1) * every) + 1;

    // Point a
    const pointAX = data[a].timestamp;
    const pointAYRh = data[a].rh;
    const pointAYTemp = data[a].temp;

    let maxArea = -1;
    let maxAreaPoint = data[rangeOffs];
    let nextA = rangeOffs;

    for (let j = rangeOffs; j < rangeTo && j < dataLength; j++) {
      // Calculate triangle area over both RH (primary priority) and Temp
      // We normalize RH & Temp variance to give equal weight to swings in either
      const ptX = data[j].timestamp;
      const ptYRh = data[j].rh;
      const ptYTemp = data[j].temp;

      // Triangle area = 0.5 * |(Ax - Cx)(By - Ay) - (Ax - Bx)(Cy - Ay)|
      const areaRh =
        Math.abs((pointAX - avgX) * (ptYRh - pointAYRh) - (pointAX - ptX) * (avgYRh - pointAYRh)) *
        0.5;
      const areaTemp =
        Math.abs((pointAX - avgX) * (ptYTemp - pointAYTemp) - (pointAX - ptX) * (avgYTemp - pointAYTemp)) *
        0.5;

      const combinedArea = areaRh + areaTemp * 1.2;

      if (combinedArea > maxArea) {
        maxArea = combinedArea;
        maxAreaPoint = data[j];
        nextA = j;
      }
    }

    sampled.push(maxAreaPoint);
    a = nextA; // Next a is this bucket's chosen point
  }

  // Always include the last point (latest real measurement)
  sampled.push(data[dataLength - 1]);

  return sampled;
}
