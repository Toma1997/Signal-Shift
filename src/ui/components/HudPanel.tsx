import { useMemo } from "react";
import { HudStatCard } from "./HudStatCard";
import { ModeBadge } from "./ModeBadge";
import { useGameStore } from "../../store/gameStore";
import { useSensorStore } from "../../store/sensorStore";

export interface HudPanelProps {
  panicPlaceholder?: number;
  clarityPlaceholder?: number;
  modeIsPlaceholder?: boolean;
}

export function HudPanel({
  panicPlaceholder = 28,
  clarityPlaceholder = 74,
  modeIsPlaceholder = true,
}: HudPanelProps) {
  const score = useGameStore((state) => state.score);
  const stability = useGameStore((state) => state.stability);
  const corruption = useGameStore((state) => state.corruption);
  const combo = useGameStore((state) => state.combo);
  const playerLane = useGameStore((state) => state.playerLane);
  const objects = useGameStore((state) => state.objects);
  const isRunning = useGameStore((state) => state.isRunning);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const startRun = useGameStore((state) => state.startRun);
  const resetRun = useGameStore((state) => state.resetRun);
  const mode = useSensorStore((state) => state.sensors.mode);

  const statusLabel = isGameOver ? "Game Over" : isRunning ? "Running" : "Idle";
  const statusClass = isGameOver
    ? "status-badge is-over"
    : isRunning
      ? "status-badge"
      : "status-badge is-idle";

  const currentEventLabel = useMemo(() => {
    if (!objects.length) {
      return isRunning ? "Lane scan clear" : "Awaiting run start";
    }

    const nearest = [...objects].sort((a, b) => b.y - a.y)[0];
    return `${nearest.kind} inbound`;
  }, [isRunning, objects]);

  return (
    <aside className="panel hud-panel">
      <div className="hud-panel__top">
        <div>
          <h3 className="hud-panel__title">Signal Control</h3>
          <p className="hud-copy">Run state, reactor health, and lane-ready feedback.</p>
        </div>
        <div className={statusClass}>{statusLabel}</div>
      </div>

      <div className="hud-panel__badges">
        <div className="hud-panel__badge-group">
          <span className="hud-panel__badge-label">Mode</span>
          <ModeBadge mode={mode} isPlaceholder={modeIsPlaceholder} />
        </div>
        <div className="hud-panel__badge-group">
          <span className="hud-panel__badge-label">Event</span>
          <span className="event-badge">{currentEventLabel}</span>
        </div>
      </div>

      <div className="hud-stat-grid">
        <HudStatCard
          label="Score"
          value={score.score}
          detail={`${score.sorted} sorted`}
          tone="good"
        />
        <HudStatCard
          label="Stability"
          value={stability}
          detail="Reactor integrity"
          tone={stability > 55 ? "good" : stability > 25 ? "warn" : "danger"}
          meterValue={stability}
        />
        <HudStatCard
          label="Panic"
          value={`${panicPlaceholder}%`}
          detail="Simulated until biometric stress input"
          tone="warn"
          meterValue={panicPlaceholder}
          placeholder
        />
        <HudStatCard
          label="Clarity"
          value={`${clarityPlaceholder}%`}
          detail="Simulated until EEG-derived clarity"
          tone="neutral"
          meterValue={clarityPlaceholder}
          placeholder
        />
      </div>

      <div className="hud-compact-list">
        <div className="stat-row">
          <span className="stat-label">Corruption</span>
          <strong>{corruption}</strong>
        </div>
        <div className="stat-row">
          <span className="stat-label">Combo</span>
          <strong>{combo}</strong>
        </div>
        <div className="stat-row">
          <span className="stat-label">Player Lane</span>
          <strong>{playerLane}</strong>
        </div>
        <div className="stat-row">
          <span className="stat-label">Object Count</span>
          <strong>{objects.length}</strong>
        </div>
      </div>

      <div className="hud-controls">
        <span className="hud-controls__title">Controls</span>
        <p className="hud-controls__copy">
          Left/Right to shift lanes. Space to catch in the active lane.
        </p>
      </div>

      <div className="hud-actions">
        {!isRunning && !isGameOver ? (
          <button className="primary-btn" onClick={() => startRun()}>
            Start Run
          </button>
        ) : null}

        {isGameOver ? (
          <button className="primary-btn" onClick={resetRun}>
            Reset Run
          </button>
        ) : null}
      </div>
    </aside>
  );
}
