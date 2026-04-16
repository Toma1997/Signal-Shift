import { useGameStore } from "../../store/gameStore";
import { useSensorStore } from "../../store/sensorStore";

export function HudPanel() {
  const score = useGameStore((state) => state.score);
  const sensors = useSensorStore((state) => state.sensors);

  return (
    <aside className="panel hud-panel">
      <h3>Run Status</h3>
      <div className="stat-row"><span>Score</span><strong>{score.score}</strong></div>
      <div className="stat-row"><span>Sorted</span><strong>{score.sorted}</strong></div>
      <div className="stat-row"><span>Missed</span><strong>{score.missed}</strong></div>
      <div className="stat-row"><span>Mode</span><strong>{sensors.mode}</strong></div>
    </aside>
  );
}
