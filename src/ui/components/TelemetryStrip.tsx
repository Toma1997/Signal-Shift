import type { TelemetryMetric } from "../layout/types";
import { useSensorStore } from "../../store/sensorStore";

export interface TelemetryStripProps {
  metrics: TelemetryMetric[];
}

export function TelemetryStrip({ metrics }: TelemetryStripProps) {
  const heartReading = useSensorStore((state) => state.heartReading);
  const heartSignalQuality = useSensorStore((state) => state.heartSignalQuality);
  const calibration = useSensorStore((state) => state.calibration);
  const webcam = useSensorStore((state) => state.webcam);

  const resolvedMetrics = metrics.map((metric) => {
    if (metric.id === "bpm") {
      return {
        ...metric,
        label: "Live BPM",
        value: heartReading
          ? heartReading.bpm.toFixed(1)
          : webcam.isStreaming
            ? "Waiting"
            : "Camera off",
        isPlaceholder: !heartReading,
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
          className={`telemetry-strip__metric${metric.emphasis ? " is-emphasis" : ""}${metric.isPlaceholder ? " is-placeholder" : ""}`}
        >
          <span className="telemetry-strip__label">{metric.label}</span>
          <span className="telemetry-strip__value">
            {metric.value}
            {metric.unit ? <span className="telemetry-strip__unit"> {metric.unit}</span> : null}
          </span>
          {metric.isPlaceholder ? <span className="telemetry-strip__flag">Sim</span> : null}
        </div>
      ))}
    </div>
  );
}
