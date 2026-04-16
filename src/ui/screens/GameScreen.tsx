import { GameCanvas } from "../components/GameCanvas";
import { HudPanel } from "../components/HudPanel";

export function GameScreen() {
  return (
    <section className="screen game-layout">
      <div className="top-bar">
        <div className="panel camera-card">
          <p className="placeholder-title">Camera</p>
          <p className="placeholder-copy">
            Day 3 placeholder for camera-reactive overlays and live video input.
          </p>
        </div>
      </div>

      <div className="main-grid">
        <div className="play-stack">
          <GameCanvas />
          <div className="panel telemetry-strip">
            <div>
              <p className="placeholder-title">Telemetry</p>
              <p className="placeholder-copy">
                Reserved for future EEG, BPM, and quality signals. Day 2 keeps this as a clean
                placeholder.
              </p>
            </div>
          </div>
        </div>

        <HudPanel />
      </div>
    </section>
  );
}
