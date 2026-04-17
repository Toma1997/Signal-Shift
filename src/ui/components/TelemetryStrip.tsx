import type { TelemetryMetric } from "../layout/types";

export interface TelemetryStripProps {
  metrics: TelemetryMetric[];
}

export function TelemetryStrip({ metrics }: TelemetryStripProps) {
  return (
    <div className="panel telemetry-strip" role="status" aria-label="Telemetry strip">
      {metrics.map((metric) => (
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
