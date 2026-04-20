import { useMemo } from "react";
import { HudStatCard } from "./HudStatCard";
import { ModeBadge } from "./ModeBadge";
import { useGameStore } from "../../store/gameStore";
import { useSensorStore } from "../../store/sensorStore";
import {
  CLARITY_METER_MAX,
  CLARITY_PULSE_COST,
} from "../../game/constants";

export interface HudPanelProps {
  modeIsPlaceholder?: boolean;
}

export function HudPanel({ modeIsPlaceholder = true }: HudPanelProps) {
  const score = useGameStore((state) => state.score);
  const stability = useGameStore((state) => state.stability);
  const corruption = useGameStore((state) => state.corruption);
  const combo = useGameStore((state) => state.combo);
  const playerLane = useGameStore((state) => state.playerLane);
  const objectCount = useGameStore((state) => state.objects.length);
  const isRunning = useGameStore((state) => state.isRunning);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const clarityMeter = useGameStore((state) => state.clarityMeter);
  const clarityPulseEndsAtMs = useGameStore((state) => state.clarityPulseEndsAtMs);
  const activateClarityPulse = useGameStore((state) => state.activateClarityPulse);
  const startRun = useGameStore((state) => state.startRun);
  const resetRun = useGameStore((state) => state.resetRun);
  const mode = useSensorStore((state) => state.sensors.mode);
  const heartReading = useSensorStore((state) => state.heartReading);
  const lastLiveBpm = useSensorStore((state) => state.lastLiveBpm);
  const baselineBpm = useSensorStore((state) => state.baselineBpm);
  const heartSignalQuality = useSensorStore((state) => state.heartSignalQuality);
  const pressureLevel = useSensorStore((state) => state.pressureLevel);
  const bpmDeltaPct = useSensorStore((state) => state.bpmDeltaPct);
  const calibration = useSensorStore((state) => state.calibration);
  const clarityGainPerSecond = useSensorStore((state) => state.clarityGainPerSecond);

  const statusLabel = isGameOver ? "Game Over" : isRunning ? "Running" : "Idle";
  const statusClass = isGameOver
    ? "status-badge is-over"
    : isRunning
      ? "status-badge"
      : "status-badge is-idle";

  const currentEventLabel = useMemo(() => {
    if (!objectCount) {
      return isRunning ? "Lane scan clear" : "Awaiting run start";
    }
    return "Inbound traffic active";
  }, [isRunning, objectCount]);
  const displayBpm = heartReading?.bpm ?? lastLiveBpm ?? calibration.latestAcceptedBpm;
  const clarityPulseActive = clarityPulseEndsAtMs != null;
  const clarityReady = clarityMeter >= CLARITY_PULSE_COST;

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
          detail={`${score.sorted} correctly sorted`}
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
          label="Clarity"
          value={`${Math.round(clarityMeter)}%`}
          detail={
            clarityPulseActive
              ? "Clarity Pulse slowing incoming traffic"
              : clarityGainPerSecond != null
                ? `Charging at ${clarityGainPerSecond.toFixed(1)}/s`
                : "Waiting for EEG-derived clarity gain"
          }
          tone={clarityReady ? "good" : "neutral"}
          meterValue={(clarityMeter / CLARITY_METER_MAX) * 100}
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
          <span className="stat-label">Correctly Sorted</span>
          <strong>{score.sorted}</strong>
        </div>
        <div className="stat-row">
          <span className="stat-label">Wrongly Sorted</span>
          <strong>{score.wronglySorted}</strong>
        </div>
        <div className="stat-row">
          <span className="stat-label">Combo</span>
          <strong>{combo}</strong>
        </div>
        <div className="stat-row">
          <span className="stat-label">Live BPM</span>
          <strong>{displayBpm != null ? displayBpm.toFixed(1) : "--"}</strong>
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
          <strong>{objectCount}</strong>
        </div>
      </div>

      <div className="hud-controls">
        <span className="hud-controls__title">Controls</span>
        <p className="hud-controls__copy">
          Left/Right to shift lanes. Space to catch in the active lane.
        </p>
        <p className="hud-controls__copy">
          Press E for Clarity Pulse when the meter is full.
        </p>
        <span className="hud-controls__title">Routing Guide</span>
        <p className="hud-controls__copy">Stabilize: Stable Signal</p>
        <p className="hud-controls__copy">Convert: Charge Signal</p>
        <p className="hud-controls__copy">Discard: Interference and Anomaly</p>
      </div>

      <div className="hud-actions">
        {isRunning && !isGameOver ? (
          <button
            className="secondary-btn"
            onClick={activateClarityPulse}
            disabled={!clarityReady || clarityPulseActive}
          >
            {clarityPulseActive ? "Clarity Pulse Active" : "Trigger Clarity Pulse"}
          </button>
        ) : null}
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
