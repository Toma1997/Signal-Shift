import { useSensorStore } from "../../store/sensorStore";
import { useGameStore } from "../../store/gameStore";

function getModeLabel(mode: ReturnType<typeof useSensorStore.getState>["sensors"]["mode"]) {
  switch (mode) {
    case "calm":
      return "Calm Drift";
    case "pressure":
      return "Pressure Surge";
    default:
      return "Balanced";
  }
}

export function SensorPanel() {
  const sensors = useSensorStore((state) => state.sensors);
  const bpmDeltaPct = useSensorStore((state) => state.bpmDeltaPct);
  const latestEegFocusScore = useSensorStore((state) => state.latestEegFocusScore);
  const currentEventLabel = useGameStore((state) => state.currentEventLabel);

  return (
    <div className="panel sensor-panel">
      <div className="sensor-chip">
        BPM delta {bpmDeltaPct != null ? `${bpmDeltaPct >= 0 ? "+" : ""}${bpmDeltaPct.toFixed(1)}%` : "--"}
      </div>
      <div className="sensor-chip">
        Focus {latestEegFocusScore != null ? `${Math.round(latestEegFocusScore)}%` : `${sensors.focus}%`}
      </div>
      <div className="sensor-chip">Mode {getModeLabel(sensors.mode)}</div>
      <div className="sensor-chip">
        {currentEventLabel ? `Event ${currentEventLabel}` : "Field stable"}
      </div>
    </div>
  );
}
