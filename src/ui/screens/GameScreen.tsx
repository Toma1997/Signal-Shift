import { CameraPanel } from "../components/CameraPanel";
import { GameCanvas } from "../components/GameCanvas";
import { HudPanel } from "../components/HudPanel";
import { TelemetryStrip } from "../components/TelemetryStrip";
import { GameFrame } from "../layout/layout";
import { useSensorStore } from "../../store/sensorStore";

export function GameScreen() {
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
              { id: "bpm", label: "BPM", value: "", isPlaceholder: true },
              { id: "eeg", label: "EEG Focus", value: "", isPlaceholder: true },
              { id: "clarity", label: "Clarity", value: "", isPlaceholder: true },
              {
                id: "activity",
                label: "Input Mapping",
                value: "",
                emphasis: true,
                isPlaceholder: false,
              },
            ]}
          />
        }
      />
    </section>
  );
}
