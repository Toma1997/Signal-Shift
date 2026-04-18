import { useMemo } from "react";
import { useGameStore } from "../../store/gameStore";

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
    const padded = baselineBpm != null ? [...sampledHistory, baselineBpm] : sampledHistory;
    const min = Math.min(...padded);
    const max = Math.max(...padded);
    const range = Math.max(1, max - min);
    const livePath = buildSparklinePath(sampledHistory, width, height);
    const baselineY =
      baselineBpm == null ? null : height - ((baselineBpm - min) / range) * height;

    const startValue = sampledHistory[0] ?? null;
    const endValue = sampledHistory[sampledHistory.length - 1] ?? null;
    const toY = (value: number) => height - ((value - min) / range) * height;

    return {
      width,
      height,
      livePath,
      baselineY,
      min,
      max,
      startY: startValue != null ? toY(startValue) : null,
      endY: endValue != null ? toY(endValue) : null,
      startValue,
      endValue,
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
              <line
                x1="0"
                x2={chart.width}
                y1={chart.height}
                y2={chart.height}
                className="results-chart__axis"
              />
              {chart.baselineY != null ? (
                <line
                  x1="0"
                  x2={chart.width}
                  y1={chart.baselineY}
                  y2={chart.baselineY}
                  className="hud-bpm-chart__baseline"
                />
              ) : null}
              <path d={chart.livePath} className="hud-bpm-chart__live" />
              {chart.startY != null ? (
                <circle cx="0" cy={chart.startY} r="4" className="results-chart__marker is-start" />
              ) : null}
              {chart.endY != null ? (
                <circle
                  cx={chart.width}
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
