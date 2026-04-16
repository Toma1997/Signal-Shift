import { useSensorStore } from "../../store/sensorStore";

export function SensorPanel() {
  const sensors = useSensorStore((state) => state.sensors);

  return (
    <div className="panel sensor-panel">
      <div className="sensor-chip">BPM {sensors.bpm}</div>
      <div className="sensor-chip">Focus {sensors.focus}</div>
      <div className="sensor-chip">Quality {sensors.signalQuality}</div>
      <div className="sensor-chip">Mode {sensors.mode}</div>
    </div>
  );
}
