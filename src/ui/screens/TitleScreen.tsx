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
          <button className="primary-btn" onClick={() => setScreen("calibration")}>
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
            <p>Use `Left` and `Right` to move lanes. Press `Space` once to catch one object in the active lane.</p>
            <p>Correct routing keeps the reactor stable. Missed correct objects and wrong-lane catches damage the run.</p>
            <p>`E` triggers Clarity Pulse when the clarity meter is full, briefly slowing the field.</p>
            <p>Live camera BPM shapes pressure and pace. Synthetic EEG shapes clarity and recovery.</p>
            <p>After pressing `Start`, go through `Setup Device`, allow camera access, and wait for the short baseline to finish.</p>
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
