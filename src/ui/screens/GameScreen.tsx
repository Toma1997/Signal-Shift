import { CameraPanel } from "../components/CameraPanel";
import { GameCanvas } from "../components/GameCanvas";
import { HudPanel } from "../components/HudPanel";
import { TelemetryStrip } from "../components/TelemetryStrip";
import { GameFrame } from "../layout/layout";
import { useSensorStore } from "../../store/sensorStore";

export function GameScreen() {
  const sensors = useSensorStore((state) => state.sensors);

  return (
    <section
      className="screen screen--gameplay game-layout"
      tabIndex={-1}
      aria-label="Gameplay screen"
    >
      <GameFrame
        center={<GameCanvas />}
        hud={<HudPanel modeIsPlaceholder />}
        camera={
          <CameraPanel
            title="Camera"
            isLive
            emptyLabel="Camera preview"
            isPlaceholder
            statusChips={[
              { label: "Camera ready", tone: "good" },
              { label: "Sim EEG", tone: "info" },
              { label: "Signal OK", tone: "neutral" },
            ]}
          />
        }
        telemetry={
          <TelemetryStrip
            metrics={[
              { id: "bpm", label: "BPM", value: sensors.bpm, isPlaceholder: true },
              { id: "focus", label: "Focus", value: sensors.focus, unit: "%", isPlaceholder: true },
              { id: "quality", label: "Signal Quality", value: sensors.signalQuality, isPlaceholder: true },
              {
                id: "activity",
                label: "Activity",
                value: `Sim ${sensors.mode}`,
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
