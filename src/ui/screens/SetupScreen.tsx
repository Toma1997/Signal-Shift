import { useGameStore } from "../../store/gameStore";
export function SetupScreen() {
  const setScreen = useGameStore((state) => state.setScreen);

  return (
    <section className="screen center-screen">
      <div className="hero-card">
        <h2>Setup</h2>
        <p>Continue to calibration to connect the camera, BPM, and EEG before the run.</p>

        <div className="button-row">
          <button className="secondary-btn" onClick={() => setScreen("title")}>
            Back
          </button>
          <button className="primary-btn" onClick={() => setScreen("calibration")}>
            Continue
          </button>
        </div>
      </div>
    </section>
  );
}
