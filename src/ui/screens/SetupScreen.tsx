import { useGameStore } from "../../store/gameStore";
import { useSensorStore } from "../../store/sensorStore";

function getCameraSetupHint(
  status: ReturnType<typeof useSensorStore.getState>["webcam"]["status"],
  error?: string,
) {
  switch (status) {
    case "requesting_permission":
      return "Allow camera access to continue.";
    case "permission_denied":
      return "Camera access was denied. Re-enable it in the browser and continue.";
    case "unavailable":
      return error ?? "No webcam was found on this device.";
    default:
      return "Continue to calibration to connect camera, BPM, and EEG.";
  }
}

export function SetupScreen() {
  const setScreen = useGameStore((state) => state.setScreen);
  const webcam = useSensorStore((state) => state.webcam);
  const eegStatus = useSensorStore((state) => state.eegStatus);

  const nextStepMessage =
    eegStatus === "unavailable"
      ? "Synthetic EEG fallback will still let you play."
      : getCameraSetupHint(webcam.status, webcam.streamError);

  return (
    <section className="screen center-screen center-screen--fit">
      <div className="hero-card">
        <h2>Setup</h2>
        <p>{nextStepMessage}</p>

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
