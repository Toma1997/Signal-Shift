import type { TelemetryMetric } from "../layout/types";
import { useGameStore } from "../../store/gameStore";
import { useSensorStore } from "../../store/sensorStore";

export interface TelemetryStripProps {
  metrics: TelemetryMetric[];
}

function buildSparklinePath(values: number[], width: number, height: number): string {
  if (values.length === 0) {
    return "";
  }

  const verticalPadding = 4;
  const innerHeight = Math.max(1, height - verticalPadding * 2);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = verticalPadding + (innerHeight - ((value - min) / range) * innerHeight);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildBandPath(
  values: number[],
  width: number,
  bandTop: number,
  bandHeight: number,
): string {
  if (values.length === 0) {
    return "";
  }

  const verticalPadding = 2;
  const innerHeight = Math.max(1, bandHeight - verticalPadding * 2);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y =
        bandTop + verticalPadding + (innerHeight - ((value - min) / range) * innerHeight);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildGraphTicks(min: number, max: number): number[] {
  if (Math.abs(max - min) < 0.5) {
    return [max + 2, max + 1, max, max - 1];
  }

  return [max, min + (max - min) * (2 / 3), min + (max - min) * (1 / 3), min];
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
  const eegFocusHistory = useSensorStore((state) => state.eegFocusHistory);
  const latestEegChannelLevels = useSensorStore((state) => state.latestEegChannelLevels);
  const eegChannelHistories = useSensorStore((state) => state.eegChannelHistories);
  const heartSignalQuality = useSensorStore((state) => state.heartSignalQuality);
  const calibration = useSensorStore((state) => state.calibration);
  const webcam = useSensorStore((state) => state.webcam);
  const eegStatus = useSensorStore((state) => state.eegStatus);
  const eegAlphaPower = useSensorStore((state) => state.eegAlphaPower);
  const eegBetaPower = useSensorStore((state) => state.eegBetaPower);
  const latestEegFocusScore = useSensorStore((state) => state.latestEegFocusScore);
  const clarityGainPerSecond = useSensorStore((state) => state.clarityGainPerSecond);
  const bpmDeltaPct = useSensorStore((state) => state.bpmDeltaPct);
  const clarityMeter = useGameStore((state) => state.clarityMeter);
  const clarityPulseEndsAtMs = useGameStore((state) => state.clarityPulseEndsAtMs);
  const displayBpm = heartReading?.bpm ?? lastLiveBpm ?? calibration.latestAcceptedBpm;
  const focusRatio =
    eegAlphaPower != null && eegBetaPower != null
      ? eegAlphaPower / Math.max(eegBetaPower, 0.0001)
      : null;
  const sampledHistory = sampleSeries(bpmHistory, 64);
  const bpmGraphWidth = 168;
  const eegGraphWidth = 238;
  const height = 48;
  const sparklineSeries = sampledHistory.length
    ? sampledHistory
    : displayBpm != null
      ? [displayBpm]
      : [];
  const bpmSparkline = sparklineSeries.length
    ? buildSparklinePath(sparklineSeries, bpmGraphWidth, height)
    : "";
  const paddedSeries =
    calibration.baselineBpm != null ? [...sparklineSeries, calibration.baselineBpm] : sparklineSeries;
  const baselineY =
    paddedSeries.length && calibration.baselineBpm != null
      ? (() => {
          const verticalPadding = 4;
          const innerHeight = Math.max(1, height - verticalPadding * 2);
          const min = Math.min(...paddedSeries);
          const max = Math.max(...paddedSeries);
          const range = Math.max(1, max - min);
          return verticalPadding + (innerHeight - ((calibration.baselineBpm - min) / range) * innerHeight);
        })()
      : null;
  const graphMin = paddedSeries.length ? Math.min(...paddedSeries) : null;
  const graphMax = paddedSeries.length ? Math.max(...paddedSeries) : null;
  const graphTicks =
    graphMin != null && graphMax != null ? buildGraphTicks(graphMin, graphMax) : [];
  const tickPositions =
    graphTicks.length && graphMin != null && graphMax != null
      ? (() => {
          const verticalPadding = 4;
          const innerHeight = Math.max(1, height - verticalPadding * 2);
          const range = Math.max(1, graphMax - graphMin);

          return graphTicks.map((tick) => ({
            value: tick,
            y:
              verticalPadding + (innerHeight - ((tick - graphMin) / range) * innerHeight),
          }));
        })()
      : [];
  const eegSeriesCollection = eegChannelHistories.map((history, index) => {
    const sampled = sampleSeries(history, 64);
    if (sampled.length) {
      return sampled;
    }
    const fallback = latestEegChannelLevels[index];
    return fallback != null ? [fallback] : [];
  });
  const eegBandHeight = height / 4;
  const eegSparklinePaths = eegSeriesCollection.map((series, index) =>
    series.length
      ? buildBandPath(series, eegGraphWidth, index * eegBandHeight, eegBandHeight)
      : "",
  );
  const eegStrokeColors = ["#4dd0a7", "#60a5fa", "#fb923c", "#e879f9"];

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

    if (metric.id === "eeg") {
      return {
        ...metric,
        label: "EEG Focus",
        value:
          latestEegFocusScore != null ? `${Math.round(latestEegFocusScore)}` : eegStatus,
        unit: latestEegFocusScore != null ? "%" : undefined,
        isPlaceholder: latestEegFocusScore == null,
      };
    }

    if (metric.id === "clarity") {
      return {
        ...metric,
        label: "Clarity",
        value: `${Math.round(clarityMeter)}%`,
        isPlaceholder: clarityGainPerSecond == null,
      };
    }

    if (metric.id === "status") {
      return {
        ...metric,
        label: "Signal Flow",
        value:
          webcam.isStreaming
            ? `rPPG ${heartSignalQuality > 0 ? `${Math.round(heartSignalQuality * 100)}%` : "low"}`
            : "rPPG offline",
        isPlaceholder: !webcam.isStreaming,
      };
    }

    if (metric.id === "activity") {
      return {
        ...metric,
        value:
          calibration.status === "collecting"
            ? `Baseline ${Math.round(calibration.progress * 100)}%`
            : "EEG drives clarity / recovery · rPPG drives pressure / pace",
        isPlaceholder: false,
      };
    }

    return metric;
  });

  return (
    <div className="panel telemetry-strip" role="status" aria-label="Telemetry strip">
      {resolvedMetrics.map((metric) => (
        <div
          key={metric.id}
          className={`telemetry-strip__metric${metric.emphasis ? " is-emphasis" : ""}${metric.isPlaceholder ? " is-placeholder" : ""}${metric.id === "bpm" || metric.id === "eeg" ? " is-trend" : ""}${metric.id === "eeg" ? " is-eeg" : ""}${metric.id === "bpm" ? " is-bpm" : ""}`}
        >
          {metric.id === "bpm" ? (
            <div className="telemetry-strip__trend-layout">
              <div className="telemetry-strip__trend-copy">
                <span className="telemetry-strip__label">{metric.label}</span>
                <span className="telemetry-strip__value telemetry-strip__value--trend">
                  {metric.value}
                  {metric.unit ? <span className="telemetry-strip__unit"> {metric.unit}</span> : null}
                </span>
                {calibration.baselineBpm != null ? (
                  <span className="telemetry-strip__subvalue">
                    Baseline {calibration.baselineBpm.toFixed(1)}
                  </span>
                ) : null}
                <span className="telemetry-strip__subvalue telemetry-strip__subvalue--neutral">
                  BPM Delta{" "}
                  {bpmDeltaPct != null
                    ? `${bpmDeltaPct >= 0 ? "+" : ""}${bpmDeltaPct.toFixed(1)}%`
                    : "--"}
                </span>
              </div>
              {bpmSparkline ? (
                <div className="telemetry-strip__sparkline-shell telemetry-strip__sparkline-shell--eeg">
                  <div className="telemetry-strip__sparkline-scale" aria-hidden="true">
                    {tickPositions.map((tick) => (
                      <span key={tick.value}>{Math.round(tick.value)}</span>
                    ))}
                  </div>
                  <svg
                    viewBox={`0 0 ${bpmGraphWidth} ${height}`}
                    className="telemetry-strip__sparkline"
                    role="img"
                    aria-label="Live BPM trend during gameplay"
                  >
                    {tickPositions.map((tick) => (
                      <line
                        key={tick.value}
                        x1="0"
                        x2={bpmGraphWidth}
                        y1={tick.y}
                        y2={tick.y}
                        className="telemetry-strip__sparkline-gridline"
                      />
                    ))}
                    {baselineY != null ? (
                      <line
                        x1="0"
                        x2={bpmGraphWidth}
                        y1={baselineY}
                        y2={baselineY}
                        className="telemetry-strip__sparkline-baseline"
                      />
                    ) : null}
                    <path d={bpmSparkline} className="telemetry-strip__sparkline-path" />
                  </svg>
                </div>
              ) : null}
            </div>
          ) : metric.id === "eeg" ? (
            <div className="telemetry-strip__trend-layout">
              <div className="telemetry-strip__trend-copy">
                <span className="telemetry-strip__label">{metric.label}</span>
                <span className="telemetry-strip__value telemetry-strip__value--trend">
                  {metric.value}
                  {metric.unit ? <span className="telemetry-strip__unit"> {metric.unit}</span> : null}
                </span>
                {calibration.baselineFocusScore != null ? (
                  <span className="telemetry-strip__subvalue">
                    Baseline {calibration.baselineFocusScore.toFixed(1)}
                  </span>
                ) : null}
                <span className="telemetry-strip__channel-row">
                  <span className="telemetry-strip__channel-value is-ch1">
                    Ch1 {latestEegChannelLevels[0]?.toFixed(1) ?? "--"}
                  </span>
                  <span className="telemetry-strip__channel-value is-ch2">
                    Ch2 {latestEegChannelLevels[1]?.toFixed(1) ?? "--"}
                  </span>
                </span>
                <span className="telemetry-strip__channel-row">
                  <span className="telemetry-strip__channel-value is-ch3">
                    Ch3 {latestEegChannelLevels[2]?.toFixed(1) ?? "--"}
                  </span>
                  <span className="telemetry-strip__channel-value is-ch4">
                    Ch4 {latestEegChannelLevels[3]?.toFixed(1) ?? "--"}
                  </span>
                </span>
                <span className="telemetry-strip__subvalue telemetry-strip__subvalue--neutral">
                  {focusRatio != null ? `Alpha/Beta ${focusRatio.toFixed(2)}` : `EEG ${eegStatus}`}
                </span>
              </div>
              {eegSparklinePaths.some(Boolean) ? (
                <div className="telemetry-strip__sparkline-shell">
                  <div className="telemetry-strip__sparkline-scale telemetry-strip__sparkline-scale--bands" aria-hidden="true">
                    <span className="telemetry-strip__band-label is-ch1">Ch1</span>
                    <span className="telemetry-strip__band-label is-ch2">Ch2</span>
                    <span className="telemetry-strip__band-label is-ch3">Ch3</span>
                    <span className="telemetry-strip__band-label is-ch4">Ch4</span>
                  </div>
                  <svg
                    viewBox={`0 0 ${eegGraphWidth} ${height}`}
                    className="telemetry-strip__sparkline"
                    role="img"
                    aria-label="Live EEG focus trend during gameplay"
                  >
                    {[1, 2, 3].map((divider) => (
                      <line
                        key={`divider-${divider}`}
                        x1="0"
                        x2={eegGraphWidth}
                        y1={divider * eegBandHeight}
                        y2={divider * eegBandHeight}
                        className="telemetry-strip__sparkline-gridline is-divider"
                      />
                    ))}
                    {eegSparklinePaths.map((path, index) =>
                      path ? (
                        <path
                          key={eegStrokeColors[index] ?? index}
                          d={path}
                          className="telemetry-strip__sparkline-path is-eeg"
                          style={{ stroke: eegStrokeColors[index] ?? "#4dd0a7" }}
                        />
                      ) : null,
                    )}
                  </svg>
                </div>
              ) : null}
            </div>
          ) : metric.id === "clarity" ? (
            <>
              <span className="telemetry-strip__label">{metric.label}</span>
              <span className="telemetry-strip__value">
                {metric.value}
              </span>
              <div className="telemetry-strip__mini-meter" aria-hidden="true">
                <div
                  className="telemetry-strip__mini-meter-fill"
                  style={{ width: `${Math.max(0, Math.min(100, clarityMeter))}%` }}
                />
              </div>
              <span className="telemetry-strip__subvalue telemetry-strip__subvalue--neutral">
                {clarityPulseEndsAtMs != null
                  ? "Pulse active"
                  : clarityGainPerSecond != null
                    ? `+${clarityGainPerSecond.toFixed(1)}/s`
                    : "EEG not charging yet"}
              </span>
            </>
          ) : metric.id === "activity" ? (
            <>
              <span className="telemetry-strip__label">{metric.label}</span>
              <span className="telemetry-strip__value telemetry-strip__value--wrap">
                {metric.value}
              </span>
            </>
          ) : (
            <>
              <span className="telemetry-strip__label">{metric.label}</span>
              <span className="telemetry-strip__value">
                {metric.value}
                {metric.unit ? <span className="telemetry-strip__unit"> {metric.unit}</span> : null}
              </span>
            </>
          )}
          {metric.isPlaceholder ? <span className="telemetry-strip__flag">Sim</span> : null}
        </div>
      ))}
    </div>
  );
}
