import { useGameStore } from "../../store/gameStore";

export function HudPanel() {
  const score = useGameStore((state) => state.score);
  const stability = useGameStore((state) => state.stability);
  const corruption = useGameStore((state) => state.corruption);
  const combo = useGameStore((state) => state.combo);
  const playerLane = useGameStore((state) => state.playerLane);
  const objectCount = useGameStore((state) => state.objects.length);
  const isRunning = useGameStore((state) => state.isRunning);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const startRun = useGameStore((state) => state.startRun);
  const resetRun = useGameStore((state) => state.resetRun);

  const statusLabel = isGameOver ? "Game Over" : isRunning ? "Running" : "Idle";
  const statusClass = isGameOver
    ? "status-badge is-over"
    : isRunning
      ? "status-badge"
      : "status-badge is-idle";

  return (
    <aside className="panel hud-panel">
      <h3>Run Status</h3>
      <p className="hud-copy">Core Day 2 state for the falling-signal prototype.</p>

      <div className={statusClass}>{statusLabel}</div>

      <div className="stat-row">
        <span className="stat-label">Score</span>
        <strong>{score.score}</strong>
      </div>
      <div className="stat-row">
        <span className="stat-label">Stability</span>
        <strong>{stability}</strong>
      </div>
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
        <strong>{objectCount}</strong>
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
