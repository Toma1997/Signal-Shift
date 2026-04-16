import { useGameStore } from "../../store/gameStore";

export function CalibrationScreen() {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <section className="screen center-screen">
      <div className="hero-card">
        <h2>Calibration</h2>
        <p>Day 1 placeholder for baseline BPM and focus calibration.</p>
        <div className="button-row">
          <button className="secondary-btn" onClick={() => setScreen("setup")}>
            Back
          </button>
          <button className="primary-btn" onClick={() => setScreen("playing")}>
            Begin Run
          </button>
        </div>
      </div>
    </section>
  );
}
