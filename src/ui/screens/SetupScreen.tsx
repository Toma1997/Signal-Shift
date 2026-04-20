import { useGameStore } from "../../store/gameStore";
import { useSensorStore } from "../../store/sensorStore";

export function SetupScreen() {
  const setScreen = useGameStore((state) => state.setScreen);
  const eegStatus = useSensorStore((state) => state.eegStatus);
  const latestEegFocusScore = useSensorStore((state) => state.latestEegFocusScore);
  const eegError = useSensorStore((state) => state.eegError);
  const startSyntheticEeg = useSensorStore((state) => state.startSyntheticEeg);
  const stopSyntheticEeg = useSensorStore((state) => state.stopSyntheticEeg);

  return (
    <section className="screen center-screen">
      <div className="hero-card">
        <h2>Setup</h2>
        <p>Enable synthetic EEG here, then continue to calibration for your camera, BPM, and focus baseline.</p>

        <div className="setup-status-card panel">
          <div className="setup-status-card__head">
            <div>
              <p className="eyebrow">Synthetic EEG</p>
              <h3 className="setup-status-card__title">Focus Feed</h3>
            </div>
            <span className={`status-badge${eegStatus === "error" ? " is-over" : eegStatus === "idle" ? " is-idle" : ""}`}>
              {eegStatus}
            </span>
          </div>
          <p className="setup-status-card__copy">
            Synthetic EEG is used for Day 5 focus telemetry only. No BLE or device transport is active yet.
          </p>
          <p className="setup-status-card__copy">
            Focus score: {latestEegFocusScore != null ? latestEegFocusScore.toFixed(1) : "--"}
          </p>
          {eegError ? <p className="setup-status-card__error">{eegError}</p> : null}
          <div className="button-row">
            <button
              className="secondary-btn"
              onClick={() => {
                void startSyntheticEeg();
              }}
              disabled={eegStatus === "initializing" || eegStatus === "ready"}
            >
              {eegStatus === "ready" ? "Synthetic EEG Ready" : "Start Synthetic EEG"}
            </button>
            <button
              className="secondary-btn"
              onClick={() => {
                void stopSyntheticEeg();
              }}
              disabled={eegStatus === "idle"}
            >
              Stop EEG
            </button>
          </div>
        </div>

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
