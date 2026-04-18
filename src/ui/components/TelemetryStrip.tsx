import type { TelemetryMetric } from "../layout/types";
import { useSensorStore } from "../../store/sensorStore";

export interface TelemetryStripProps {
  metrics: TelemetryMetric[];
}

function buildSparklinePath(values: number[], width: number, height: number): string {
  if (values.length === 0) {
    return "";
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function sampleSeries(values: number[], maxPoints: number): number[] {
  if (values.length <= maxPoints) {
    return values;
  }

  const step = (values.length - 1) / (maxPoints - 1);
  const sampled: number[] = [];

  for (let index = 0; index < maxPoints; index += 1) {
    sampled.push(values[Math.round(index * step)] ?? values[values.length - 1]);
  }

  return sampled;
}

export function TelemetryStrip({ metrics }: TelemetryStripProps) {
  const heartReading = useSensorStore((state) => state.heartReading);
  const lastLiveBpm = useSensorStore((state) => state.lastLiveBpm);
  const bpmHistory = useSensorStore((state) => state.bpmHistory);
  const heartSignalQuality = useSensorStore((state) => state.heartSignalQuality);
  const calibration = useSensorStore((state) => state.calibration);
  const webcam = useSensorStore((state) => state.webcam);
  const displayBpm = heartReading?.bpm ?? lastLiveBpm ?? calibration.latestAcceptedBpm;
  const sampledHistory = sampleSeries(bpmHistory, 64);
  const width = 220;
  const height = 32;
  const sparklineSeries = sampledHistory.length
    ? sampledHistory
    : displayBpm != null
      ? [displayBpm]
      : [];
  const bpmSparkline = sparklineSeries.length
    ? buildSparklinePath(sparklineSeries, width, height)
    : "";
  const paddedSeries =
    calibration.baselineBpm != null ? [...sparklineSeries, calibration.baselineBpm] : sparklineSeries;
  const baselineY =
    paddedSeries.length && calibration.baselineBpm != null
      ? (() => {
          const min = Math.min(...paddedSeries);
          const max = Math.max(...paddedSeries);
          const range = Math.max(1, max - min);
          return height - ((calibration.baselineBpm - min) / range) * height;
        })()
      : null;

  const resolvedMetrics = metrics.map((metric) => {
    if (metric.id === "bpm") {
      return {
        ...metric,
        label: "Live BPM",
        value: displayBpm != null
          ? displayBpm.toFixed(1)
          : webcam.isStreaming
            ? "Waiting"
            : "Camera off",
        isPlaceholder: displayBpm == null,
      };
    }

    if (metric.id === "focus") {
      return {
        ...metric,
        label: "Baseline BPM",
        value:
          calibration.baselineBpm != null
            ? calibration.baselineBpm.toFixed(1)
            : calibration.status === "collecting"
              ? "Calibrating"
              : "No baseline",
        isPlaceholder: calibration.baselineBpm == null,
      };
    }

    if (metric.id === "quality") {
      return {
        ...metric,
        label: "Signal Quality",
        value:
          heartSignalQuality > 0
            ? `${Math.round(heartSignalQuality * 100)}`
            : webcam.isStreaming
              ? "Low"
              : "Offline",
        unit: heartSignalQuality > 0 ? "%" : undefined,
        isPlaceholder: heartSignalQuality <= 0,
      };
    }

    if (metric.id === "activity") {
      return {
        ...metric,
        value:
          calibration.status === "collecting"
            ? `Baseline ${Math.round(calibration.progress * 100)}%`
            : calibration.status === "complete"
              ? `${calibration.acceptedSampleCount} accepted`
              : metric.value,
        isPlaceholder: calibration.status !== "complete",
      };
    }

    return metric;
  });

  return (
    <div className="panel telemetry-strip" role="status" aria-label="Telemetry strip">
      {resolvedMetrics.map((metric) => (
        <div
          key={metric.id}
          className={`telemetry-strip__metric${metric.emphasis ? " is-emphasis" : ""}${metric.isPlaceholder ? " is-placeholder" : ""}${metric.id === "bpm" ? " is-trend" : ""}`}
        >
          <span className="telemetry-strip__label">{metric.label}</span>
          <span className="telemetry-strip__value">
            {metric.value}
            {metric.unit ? <span className="telemetry-strip__unit"> {metric.unit}</span> : null}
          </span>
          {metric.id === "bpm" && bpmSparkline ? (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="telemetry-strip__sparkline"
              role="img"
              aria-label="Live BPM trend during gameplay"
            >
              {baselineY != null ? (
                <line
                  x1="0"
                  x2={width}
                  y1={baselineY}
                  y2={baselineY}
                  className="telemetry-strip__sparkline-baseline"
                />
              ) : null}
              <path d={bpmSparkline} className="telemetry-strip__sparkline-path" />
            </svg>
          ) : null}
          {metric.isPlaceholder ? <span className="telemetry-strip__flag">Sim</span> : null}
        </div>
      ))}
    </div>
  );
}
