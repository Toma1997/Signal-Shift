import { useState } from "react";
import { APP_NAME } from "../../game/constants";
import { useGameStore } from "../../store/gameStore";

export function TitleScreen() {
  const [showInstructions, setShowInstructions] = useState(false);
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <section className="screen center-screen">
      <div className="hero-card">
        <p className="eyebrow">Elata app concept</p>
        <h1>{APP_NAME}</h1>
        <p>A biometric arcade game where signal state changes the feel of play.</p>
        <div className="button-row">
          <button className="primary-btn" onClick={() => setScreen("setup")}>
            Start
          </button>
          <button className="secondary-btn" onClick={() => setShowInstructions(true)}>
            Instructions
          </button>
        </div>
      </div>

      {showInstructions ? (
        <div className="instructions-overlay" role="dialog" aria-modal="true" aria-label="How to play">
          <div className="instructions-modal panel">
            <h2>How To Play</h2>
            <p>Route incoming system traffic into the correct lane before it drops through the reactor floor.</p>
            <p>`Stable Signal` goes to `Stabilize`.</p>
            <p>`Charge Signal` goes to `Convert`.</p>
            <p>`Interference` and `Anomaly` go to `Discard`.</p>
            <p>Use `Left` and `Right` to move lanes. Press `Space` to catch in the active lane.</p>
            <p>Before the run, turn on the camera and BPM feed so gameplay can react to your live pressure signal.</p>
            <div className="button-row">
              <button className="primary-btn" onClick={() => setShowInstructions(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
