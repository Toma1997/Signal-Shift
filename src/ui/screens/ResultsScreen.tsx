import { useMemo } from "react";
import { useGameStore } from "../../store/gameStore";

function buildSparklinePath(
  values: number[],
  width: number,
  height: number,
  options?: { leftPadding?: number; rightPadding?: number; verticalPadding?: number },
): string {
  if (values.length === 0) {
    return "";
  }

  const leftPadding = options?.leftPadding ?? 0;
  const rightPadding = options?.rightPadding ?? 0;
  const verticalPadding = options?.verticalPadding ?? 8;
  const innerWidth = Math.max(1, width - leftPadding - rightPadding);
  const innerHeight = Math.max(1, height - verticalPadding * 2);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? leftPadding + innerWidth / 2
          : leftPadding + (index / (values.length - 1)) * innerWidth;
      const y = verticalPadding + (innerHeight - ((value - min) / range) * innerHeight);
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

export function ResultsScreen() {
  const score = useGameStore((state) => state.score);
  const setScreen = useGameStore((state) => state.setScreen);
  const resetRun = useGameStore((state) => state.resetRun);
  const bpmHistory = useGameStore((state) => state.resultBpmHistory);
  const baselineBpm = useGameStore((state) => state.resultBaselineBpm);
  const chart = useMemo(() => {
    if (!bpmHistory.length) {
      return null;
    }

    const sampledHistory = sampleSeries(bpmHistory, 140);
    const width = 560;
    const height = 180;
    const plotLeft = 40;
    const plotRight = 8;
    const verticalPadding = 8;
    const innerHeight = Math.max(1, height - verticalPadding * 2);
    const padded = baselineBpm != null ? [...sampledHistory, baselineBpm] : sampledHistory;
    const min = Math.min(...padded);
    const max = Math.max(...padded);
    const range = Math.max(1, max - min);
    const livePath = buildSparklinePath(sampledHistory, width, height, {
      leftPadding: plotLeft,
      rightPadding: plotRight,
      verticalPadding,
    });
    const baselineY =
      baselineBpm == null
        ? null
        : verticalPadding + (innerHeight - ((baselineBpm - min) / range) * innerHeight);

    const startValue = sampledHistory[0] ?? null;
    const endValue = sampledHistory[sampledHistory.length - 1] ?? null;
    const toY = (value: number) =>
      verticalPadding + (innerHeight - ((value - min) / range) * innerHeight);
    const mid = min + range / 2;
    const ticks = buildGraphTicks(min, max);

    return {
      width,
      height,
      plotLeft,
      plotRight,
      livePath,
      baselineY,
      min,
      mid,
      max,
      startY: startValue != null ? toY(startValue) : null,
      endY: endValue != null ? toY(endValue) : null,
      startValue,
      endValue,
      minY: toY(min),
      midY: toY(mid),
      maxY: toY(max),
      ticks: ticks.map((tick) => ({
        value: tick,
        y: toY(tick),
      })),
    };
  }, [baselineBpm, bpmHistory]);

  return (
    <section className="screen center-screen">
      <div className="hero-card">
        <h2>Results</h2>
        <p>Score: {score.score}</p>
        <p>Correctly Sorted: {score.sorted}</p>
        <p>Wrongly Sorted: {score.wronglySorted}</p>
        <p>Missed: {score.missed}</p>
        <p>Time: {score.survivedSeconds}s</p>
        {chart ? (
          <div className="results-chart">
            <div className="results-chart__head">
              <span className="hud-panel__badge-label">Run Heart Trend</span>
              <span className="hud-bpm-chart__legend">
                <span className="hud-bpm-chart__legend-item is-live">Live BPM</span>
                <span className="hud-bpm-chart__legend-item is-baseline">Baseline BPM</span>
              </span>
            </div>
            <div className="results-chart__summary">
              <span>Min {chart.min.toFixed(1)}</span>
              <span>Max {chart.max.toFixed(1)}</span>
              {baselineBpm != null ? <span>Baseline {baselineBpm.toFixed(1)}</span> : null}
            </div>
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              className="results-chart__svg"
              role="img"
              aria-label="Live BPM during the run compared with baseline BPM"
            >
              {chart.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={chart.plotLeft}
                    x2={chart.width - chart.plotRight}
                    y1={tick.y}
                    y2={tick.y}
                    className="results-chart__gridline"
                  />
                  <text x={chart.plotLeft - 8} y={tick.y + 4} className="results-chart__tick">
                    {Math.round(tick.value)}
                  </text>
                </g>
              ))}
              <line
                x1={chart.plotLeft}
                x2={chart.width - chart.plotRight}
                y1={chart.minY}
                y2={chart.minY}
                className="results-chart__axis"
              />
              {chart.baselineY != null ? (
                <line
                  x1={chart.plotLeft}
                  x2={chart.width - chart.plotRight}
                  y1={chart.baselineY}
                  y2={chart.baselineY}
                  className="hud-bpm-chart__baseline"
                />
              ) : null}
              <path d={chart.livePath} className="hud-bpm-chart__live" />
              {chart.startY != null ? (
                <circle
                  cx={chart.plotLeft}
                  cy={chart.startY}
                  r="4"
                  className="results-chart__marker is-start"
                />
              ) : null}
              {chart.endY != null ? (
                <circle
                  cx={chart.width - chart.plotRight}
                  cy={chart.endY}
                  r="4"
                  className="results-chart__marker is-end"
                />
              ) : null}
            </svg>
            <div className="results-chart__timeline">
              <span>Game start {chart.startValue != null ? `${chart.startValue.toFixed(1)} BPM` : ""}</span>
              <span>Game end {chart.endValue != null ? `${chart.endValue.toFixed(1)} BPM` : ""}</span>
            </div>
          </div>
        ) : null}
        <div className="button-row">
          <button
            className="secondary-btn"
            onClick={() => {
              resetRun();
              setScreen("title");
            }}
          >
            Back to Title
          </button>
          <button
            className="primary-btn"
            onClick={() => {
              resetRun();
              setScreen("setup");
            }}
          >
            Restart
          </button>
        </div>
      </div>
    </section>
  );
}
