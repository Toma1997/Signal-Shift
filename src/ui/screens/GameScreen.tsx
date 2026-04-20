import { CameraPanel } from "../components/CameraPanel";
import { GameCanvas } from "../components/GameCanvas";
import { HudPanel } from "../components/HudPanel";
import { TelemetryStrip } from "../components/TelemetryStrip";
import { GameFrame } from "../layout/layout";
import { useSensorStore } from "../../store/sensorStore";

export function GameScreen() {
  const sensors = useSensorStore((state) => state.sensors);
  const webcam = useSensorStore((state) => state.webcam);
  const rppgStatus = useSensorStore((state) => state.rppgStatus);

  return (
    <section
      className="screen screen--gameplay game-layout game-layout--fixed"
      tabIndex={-1}
      aria-label="Gameplay screen"
    >
      <GameFrame
        center={<GameCanvas />}
        hud={<HudPanel modeIsPlaceholder />}
        camera={
          <CameraPanel
            title="Live Camera"
            emptyLabel="Camera feed unavailable"
            isPlaceholder={false}
            showControls={false}
            statusChips={[
              {
                label: webcam.isStreaming ? "Camera linked" : "Camera offline",
                tone: webcam.isStreaming ? "good" : "neutral",
              },
              {
                label: rppgStatus === "running" ? "BPM active" : "BPM idle",
                tone: rppgStatus === "running" ? "good" : "info",
              },
            ]}
            footerText={
              webcam.isStreaming
                ? "Live camera persists into gameplay and continues feeding BPM."
                : "Return to calibration if the camera feed stops."
            }
          />
        }
        telemetry={
          <TelemetryStrip
            metrics={[
              { id: "bpm", label: "BPM", value: sensors.bpm, isPlaceholder: true },
              { id: "spacer", label: "", value: "", isPlaceholder: false },
              { id: "quality", label: "Signal Quality", value: sensors.signalQuality, isPlaceholder: true },
              {
                id: "activity",
                label: "Activity",
                value: `Sim ${sensors.mode} pressure`,
                emphasis: true,
                isPlaceholder: true,
              },
            ]}
          />
        }
      />
    </section>
  );
}
