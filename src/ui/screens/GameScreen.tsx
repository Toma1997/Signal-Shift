import { CameraPanel } from "../components/CameraPanel";
import { EventToast } from "../components/EventToast";
import { GameCanvas } from "../components/GameCanvas";
import { HudPanel } from "../components/HudPanel";
import { TelemetryStrip } from "../components/TelemetryStrip";
import { GameFrame } from "../layout/layout";
import { useGameStore } from "../../store/gameStore";
import { useSensorStore } from "../../store/sensorStore";

function getModeTelemetryLabel(mode: ReturnType<typeof useSensorStore.getState>["sensors"]["mode"]) {
  switch (mode) {
    case "calm":
      return "Calm Drift";
    case "pressure":
      return "Pressure Surge";
    default:
      return "Balanced";
  }
}

export function GameScreen() {
  const webcam = useSensorStore((state) => state.webcam);
  const rppgStatus = useSensorStore((state) => state.rppgStatus);
  const bpmDeltaPct = useSensorStore((state) => state.bpmDeltaPct);
  const latestEegFocusScore = useSensorStore((state) => state.latestEegFocusScore);
  const mode = useSensorStore((state) => state.sensors.mode);
  const currentEventLabel = useGameStore((state) => state.currentEventLabel);

  return (
    <section
      className="screen screen--gameplay game-layout game-layout--fixed"
      tabIndex={-1}
      aria-label="Gameplay screen"
    >
      <GameFrame
        center={
          <div className="game-screen__center-stack">
            <EventToast label={currentEventLabel} />
            <GameCanvas />
          </div>
        }
        hud={
          <HudPanel modeIsPlaceholder={false} />
        }
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
              {
                id: "bpm-delta",
                label: "BPM Delta",
                value:
                  bpmDeltaPct != null
                    ? `${bpmDeltaPct >= 0 ? "+" : ""}${bpmDeltaPct.toFixed(1)}%`
                    : "--",
                isPlaceholder: bpmDeltaPct == null,
              },
              {
                id: "eeg",
                label: "EEG Focus",
                value: latestEegFocusScore != null ? `${Math.round(latestEegFocusScore)}%` : "--",
                isPlaceholder: latestEegFocusScore == null,
              },
              {
                id: "mode-live",
                label: "Current Mode",
                value: getModeTelemetryLabel(mode),
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
