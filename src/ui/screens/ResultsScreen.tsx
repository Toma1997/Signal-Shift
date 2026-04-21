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

function buildHistoryChart(
  history: number[],
  baseline: number | null,
) {
  if (!history.length) {
    return null;
  }

  const sampledHistory = sampleSeries(history, 140);
  const width = 560;
  const height = 180;
  const plotLeft = 40;
  const plotRight = 8;
  const verticalPadding = 8;
  const innerHeight = Math.max(1, height - verticalPadding * 2);
  const padded = baseline != null ? [...sampledHistory, baseline] : sampledHistory;
  const min = Math.min(...padded);
  const max = Math.max(...padded);
  const range = Math.max(1, max - min);
  const livePath = buildSparklinePath(sampledHistory, width, height, {
    leftPadding: plotLeft,
    rightPadding: plotRight,
    verticalPadding,
  });
  const baselineY =
    baseline == null
      ? null
      : verticalPadding + (innerHeight - ((baseline - min) / range) * innerHeight);

  const startValue = sampledHistory[0] ?? null;
  const endValue = sampledHistory[sampledHistory.length - 1] ?? null;
  const toY = (value: number) =>
    verticalPadding + (innerHeight - ((value - min) / range) * innerHeight);
  const ticks = buildGraphTicks(min, max);

  return {
    width,
    height,
    plotLeft,
    plotRight,
    livePath,
    baselineY,
    min,
    max,
    startY: startValue != null ? toY(startValue) : null,
    endY: endValue != null ? toY(endValue) : null,
    startValue,
    endValue,
    minY: toY(min),
    ticks: ticks.map((tick) => ({
      value: tick,
      y: toY(tick),
    })),
  };
}

function buildMultiSeriesChart(histories: number[][]) {
  const sampledHistories = histories.map((history) => sampleSeries(history, 140));
  const allValues = sampledHistories.flat();

  if (!allValues.length) {
    return null;
  }

  const width = 560;
  const height = 180;
  const plotLeft = 40;
  const plotRight = 8;
  const verticalPadding = 8;
  const innerHeight = Math.max(1, height - verticalPadding * 2);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = Math.max(1, max - min);
  const toY = (value: number) =>
    verticalPadding + (innerHeight - ((value - min) / range) * innerHeight);

  return {
    width,
    height,
    plotLeft,
    plotRight,
    min,
    max,
    minY: toY(min),
    ticks: buildGraphTicks(min, max).map((tick) => ({
      value: tick,
      y: toY(tick),
    })),
    series: sampledHistories.map((history) => ({
      startValue: history[0] ?? null,
      endValue: history[history.length - 1] ?? null,
      path: history.length
        ? buildSparklinePath(history, width, height, {
            leftPadding: plotLeft,
            rightPadding: plotRight,
            verticalPadding,
          })
        : "",
      startY: history[0] != null ? toY(history[0]) : null,
      endY: history[history.length - 1] != null ? toY(history[history.length - 1]) : null,
    })),
  };
}

export function ResultsScreen() {
  const score = useGameStore((state) => state.score);
  const setScreen = useGameStore((state) => state.setScreen);
  const resetRun = useGameStore((state) => state.resetRun);
  const bpmHistory = useGameStore((state) => state.resultBpmHistory);
  const baselineBpm = useGameStore((state) => state.resultBaselineBpm);
  const eegFocusHistory = useGameStore((state) => state.resultEegFocusHistory);
  const baselineFocusScore = useGameStore((state) => state.resultBaselineFocusScore);
  const eegChannelHistories = useGameStore((state) => state.resultEegChannelHistories);
  const bpmChart = useMemo(() => buildHistoryChart(bpmHistory, baselineBpm), [baselineBpm, bpmHistory]);
  const eegChart = useMemo(
    () => buildHistoryChart(eegFocusHistory, baselineFocusScore),
    [baselineFocusScore, eegFocusHistory],
  );
  const eegChannelsChart = useMemo(
    () => buildMultiSeriesChart(eegChannelHistories),
    [eegChannelHistories],
  );
  const eegStrokeColors = ["#4dd0a7", "#60a5fa", "#fb923c", "#e879f9"];

  return (
    <section className="screen center-screen">
      <div className="hero-card">
        <h2>Results</h2>
        <p>Score: {score.score}</p>
        <p>Correctly Sorted: {score.sorted}</p>
        <p>Wrongly Sorted: {score.wronglySorted}</p>
        <p>Missed: {score.missed}</p>
        <p>Time: {score.survivedSeconds}s</p>
        {bpmChart ? (
          <div className="results-chart">
            <div className="results-chart__head">
              <span className="hud-panel__badge-label">Run Heart Trend</span>
              <span className="hud-bpm-chart__legend">
                <span className="hud-bpm-chart__legend-item is-live">Live BPM</span>
                <span className="hud-bpm-chart__legend-item is-baseline">Baseline BPM</span>
              </span>
            </div>
            <div className="results-chart__summary">
              <span>Min {bpmChart.min.toFixed(1)}</span>
              <span>Max {bpmChart.max.toFixed(1)}</span>
              {baselineBpm != null ? <span>Baseline {baselineBpm.toFixed(1)}</span> : null}
            </div>
            <svg
              viewBox={`0 0 ${bpmChart.width} ${bpmChart.height}`}
              className="results-chart__svg"
              role="img"
              aria-label="Live BPM during the run compared with baseline BPM"
            >
              {bpmChart.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={bpmChart.plotLeft}
                    x2={bpmChart.width - bpmChart.plotRight}
                    y1={tick.y}
                    y2={tick.y}
                    className="results-chart__gridline"
                  />
                  <text x={bpmChart.plotLeft - 8} y={tick.y + 4} className="results-chart__tick">
                    {Math.round(tick.value)}
                  </text>
                </g>
              ))}
              <line
                x1={bpmChart.plotLeft}
                x2={bpmChart.width - bpmChart.plotRight}
                y1={bpmChart.minY}
                y2={bpmChart.minY}
                className="results-chart__axis"
              />
              {bpmChart.baselineY != null ? (
                <line
                  x1={bpmChart.plotLeft}
                  x2={bpmChart.width - bpmChart.plotRight}
                  y1={bpmChart.baselineY}
                  y2={bpmChart.baselineY}
                  className="hud-bpm-chart__baseline"
                />
              ) : null}
              <path d={bpmChart.livePath} className="hud-bpm-chart__live" />
              {bpmChart.startY != null ? (
                <circle
                  cx={bpmChart.plotLeft}
                  cy={bpmChart.startY}
                  r="4"
                  className="results-chart__marker is-start"
                />
              ) : null}
              {bpmChart.endY != null ? (
                <circle
                  cx={bpmChart.width - bpmChart.plotRight}
                  cy={bpmChart.endY}
                  r="4"
                  className="results-chart__marker is-end"
                />
              ) : null}
            </svg>
            <div className="results-chart__timeline">
              <span>Game start {bpmChart.startValue != null ? `${bpmChart.startValue.toFixed(1)} BPM` : ""}</span>
              <span>Game end {bpmChart.endValue != null ? `${bpmChart.endValue.toFixed(1)} BPM` : ""}</span>
            </div>
          </div>
        ) : null}
        {eegChart ? (
          <div className="results-chart">
            <div className="results-chart__head">
              <span className="hud-panel__badge-label">Run Focus Trend</span>
              <span className="hud-bpm-chart__legend">
                <span className="hud-bpm-chart__legend-item is-live">Live Focus</span>
                <span className="hud-bpm-chart__legend-item is-baseline">Baseline Focus</span>
              </span>
            </div>
            <div className="results-chart__summary">
              <span>Min {eegChart.min.toFixed(1)}</span>
              <span>Max {eegChart.max.toFixed(1)}</span>
              {baselineFocusScore != null ? <span>Baseline {baselineFocusScore.toFixed(1)}</span> : null}
            </div>
            <svg
              viewBox={`0 0 ${eegChart.width} ${eegChart.height}`}
              className="results-chart__svg"
              role="img"
              aria-label="Live EEG focus during the run compared with baseline focus"
            >
              {eegChart.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={eegChart.plotLeft}
                    x2={eegChart.width - eegChart.plotRight}
                    y1={tick.y}
                    y2={tick.y}
                    className="results-chart__gridline"
                  />
                  <text x={eegChart.plotLeft - 8} y={tick.y + 4} className="results-chart__tick">
                    {Math.round(tick.value)}
                  </text>
                </g>
              ))}
              <line
                x1={eegChart.plotLeft}
                x2={eegChart.width - eegChart.plotRight}
                y1={eegChart.minY}
                y2={eegChart.minY}
                className="results-chart__axis"
              />
              {eegChart.baselineY != null ? (
                <line
                  x1={eegChart.plotLeft}
                  x2={eegChart.width - eegChart.plotRight}
                  y1={eegChart.baselineY}
                  y2={eegChart.baselineY}
                  className="hud-bpm-chart__baseline"
                />
              ) : null}
              <path d={eegChart.livePath} className="results-chart__eeg-live" />
              {eegChart.startY != null ? (
                <circle
                  cx={eegChart.plotLeft}
                  cy={eegChart.startY}
                  r="4"
                  className="results-chart__marker is-start"
                />
              ) : null}
              {eegChart.endY != null ? (
                <circle
                  cx={eegChart.width - eegChart.plotRight}
                  cy={eegChart.endY}
                  r="4"
                  className="results-chart__marker is-end"
                />
              ) : null}
            </svg>
            <div className="results-chart__timeline">
              <span>Game start {eegChart.startValue != null ? `${eegChart.startValue.toFixed(1)} focus` : ""}</span>
              <span>Game end {eegChart.endValue != null ? `${eegChart.endValue.toFixed(1)} focus` : ""}</span>
            </div>
          </div>
        ) : null}
        {eegChannelsChart ? (
          <div className="results-chart">
            <div className="results-chart__head">
              <span className="hud-panel__badge-label">Run EEG Channel Trend</span>
              <span className="hud-bpm-chart__legend">
                <span className="hud-bpm-chart__legend-item" style={{ color: eegStrokeColors[0] }}>Ch1</span>
                <span className="hud-bpm-chart__legend-item" style={{ color: eegStrokeColors[1] }}>Ch2</span>
                <span className="hud-bpm-chart__legend-item" style={{ color: eegStrokeColors[2] }}>Ch3</span>
                <span className="hud-bpm-chart__legend-item" style={{ color: eegStrokeColors[3] }}>Ch4</span>
              </span>
            </div>
            <div className="results-chart__summary">
              <span>Min {eegChannelsChart.min.toFixed(1)}</span>
              <span>Max {eegChannelsChart.max.toFixed(1)}</span>
              {eegChannelsChart.series.map((series, index) => (
                <span key={`ch-${index + 1}`}>
                  Ch{index + 1} {series.endValue != null ? series.endValue.toFixed(1) : "--"}
                </span>
              ))}
            </div>
            <svg
              viewBox={`0 0 ${eegChannelsChart.width} ${eegChannelsChart.height}`}
              className="results-chart__svg"
              role="img"
              aria-label="EEG channel values during the run"
            >
              {eegChannelsChart.ticks.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={eegChannelsChart.plotLeft}
                    x2={eegChannelsChart.width - eegChannelsChart.plotRight}
                    y1={tick.y}
                    y2={tick.y}
                    className="results-chart__gridline"
                  />
                  <text x={eegChannelsChart.plotLeft - 8} y={tick.y + 4} className="results-chart__tick">
                    {Math.round(tick.value)}
                  </text>
                </g>
              ))}
              <line
                x1={eegChannelsChart.plotLeft}
                x2={eegChannelsChart.width - eegChannelsChart.plotRight}
                y1={eegChannelsChart.minY}
                y2={eegChannelsChart.minY}
                className="results-chart__axis"
              />
              {eegChannelsChart.series.map((series, index) =>
                series.path ? (
                  <g key={eegStrokeColors[index] ?? index}>
                    <path
                      d={series.path}
                      className="results-chart__eeg-live"
                      style={{ stroke: eegStrokeColors[index] ?? "#4dd0a7" }}
                    />
                    {series.startY != null ? (
                      <circle
                        cx={eegChannelsChart.plotLeft}
                        cy={series.startY}
                        r="3"
                        className="results-chart__marker is-start"
                      />
                    ) : null}
                    {series.endY != null ? (
                      <circle
                        cx={eegChannelsChart.width - eegChannelsChart.plotRight}
                        cy={series.endY}
                        r="3"
                        className="results-chart__marker is-end"
                      />
                    ) : null}
                  </g>
                ) : null,
              )}
            </svg>
            <div className="results-chart__timeline">
              <span>
                Start
                {eegChannelsChart.series.map((series, index) =>
                  ` · Ch${index + 1} ${series.startValue != null ? series.startValue.toFixed(1) : "--"}`,
                )}
              </span>
              <span>
                End
                {eegChannelsChart.series.map((series, index) =>
                  ` · Ch${index + 1} ${series.endValue != null ? series.endValue.toFixed(1) : "--"}`,
                )}
              </span>
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
