import { useMemo } from "react";
import { SIGNAL_KIND_LABELS, SIGNAL_ROUTING_LANES } from "../../game/constants";
import { HudStatCard } from "./HudStatCard";
import { ModeBadge } from "./ModeBadge";
import { useGameStore } from "../../store/gameStore";
import { useSensorStore } from "../../store/sensorStore";

export interface HudPanelProps {
  modeIsPlaceholder?: boolean;
}

export function HudPanel({ modeIsPlaceholder = true }: HudPanelProps) {
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
  const heartReading = useSensorStore((state) => state.heartReading);
  const baselineBpm = useSensorStore((state) => state.baselineBpm);
  const heartSignalQuality = useSensorStore((state) => state.heartSignalQuality);
  const pressureLevel = useSensorStore((state) => state.pressureLevel);
  const bpmDeltaPct = useSensorStore((state) => state.bpmDeltaPct);

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
    const signalLabel = SIGNAL_KIND_LABELS[nearest.kind];
    const routeLabel = SIGNAL_ROUTING_LANES[nearest.kind];
    return `${signalLabel} -> ${routeLabel}`;
  }, [isRunning, objects]);

  return (
    <aside className="panel hud-panel">
      <div className="hud-panel__top">
        <div>
          <h3 className="hud-panel__title">Signal Control</h3>
          <p className="hud-copy">Track reactor health and route incoming traffic.</p>
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
          label="Pressure"
          value={`${Math.round(pressureLevel)}%`}
          detail={
            bpmDeltaPct != null
              ? `${bpmDeltaPct >= 0 ? "+" : ""}${bpmDeltaPct.toFixed(1)}% vs baseline`
              : "Holding safe fallback until baseline is ready"
          }
          tone="warn"
          meterValue={pressureLevel}
        />
        <HudStatCard
          label="Signal Quality"
          value={`${Math.round(heartSignalQuality * 100)}%`}
          detail="Camera-derived reading reliability"
          tone="neutral"
          meterValue={heartSignalQuality * 100}
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
          <span className="stat-label">Live BPM</span>
          <strong>{heartReading ? heartReading.bpm.toFixed(1) : "--"}</strong>
        </div>
        <div className="stat-row">
          <span className="stat-label">Baseline BPM</span>
          <strong>{baselineBpm != null ? baselineBpm.toFixed(1) : "--"}</strong>
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
        <span className="hud-controls__title">Routing Guide</span>
        <p className="hud-controls__copy">Stabilize: Stable Signal</p>
        <p className="hud-controls__copy">Convert: Charge Signal</p>
        <p className="hud-controls__copy">Discard: Interference and Anomaly</p>
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
