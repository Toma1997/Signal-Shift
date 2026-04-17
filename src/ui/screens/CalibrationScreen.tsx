import { useEffect, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import { useSensorStore } from "../../store/sensorStore";

export function CalibrationScreen() {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const setScreen = useGameStore((state) => state.setScreen);
  const webcam = useSensorStore((state) => state.webcam);
  const webcamStream = useSensorStore((state) => state.webcamStream);
  const heartReading = useSensorStore((state) => state.heartReading);
  const heartConfidence = useSensorStore((state) => state.heartConfidence);
  const heartSignalQuality = useSensorStore((state) => state.heartSignalQuality);
  const rppgStatus = useSensorStore((state) => state.rppgStatus);
  const rppgError = useSensorStore((state) => state.rppgError);
  const calibration = useSensorStore((state) => state.calibration);
  const requestCameraPermission = useSensorStore((state) => state.requestCameraPermission);
  const startCameraStream = useSensorStore((state) => state.startCameraStream);
  const stopCameraStream = useSensorStore((state) => state.stopCameraStream);
  const startHeartRateStream = useSensorStore((state) => state.startHeartRateStream);
  const stopHeartRateStream = useSensorStore((state) => state.stopHeartRateStream);
  const startCalibration = useSensorStore((state) => state.startCalibration);
  const cancelCalibration = useSensorStore((state) => state.cancelCalibration);

  useEffect(() => {
    const video = previewRef.current;
    if (!video) {
      return;
    }

    video.srcObject = webcamStream;

    if (webcamStream) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, [webcamStream]);

  useEffect(() => {
    if (webcam.isStreaming && rppgStatus === "idle") {
      void startHeartRateStream();
    }
  }, [rppgStatus, startHeartRateStream, webcam.isStreaming]);

  const canStartCalibration =
    webcam.isStreaming && rppgStatus === "running" && calibration.status !== "collecting";
  const canBeginRun =
    webcam.isStreaming && rppgStatus !== "idle" && rppgStatus !== "error";
  const recentAcceptedReadings = calibration.acceptedReadings.slice(-8);
  const progressPercent = Math.round(calibration.progress * 100);

  return (
    <section className="screen center-screen">
      <div className="hero-card">
        <h2>Calibration</h2>
        <p>
          Start the camera and BPM first. Once both are live, you can begin the run immediately.
          Quick baseline is optional if you want more personalized pressure behavior.
        </p>

        <div
          style={{
            marginTop: 16,
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid rgba(126, 155, 194, 0.2)",
            background: "rgba(7, 16, 26, 0.92)",
            aspectRatio: "16 / 9",
            display: "grid",
            placeItems: "center",
          }}
        >
          {webcam.isStreaming ? (
            <video
              ref={previewRef}
              autoPlay
              muted
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ color: "#93a8bd", fontSize: 14 }}>Camera preview</div>
          )}
        </div>

        <p>
          Camera: {webcam.isStreaming ? "live" : "offline"} | BPM:{" "}
          {heartReading ? `${heartReading.bpm.toFixed(1)} bpm` : "waiting"} | Confidence:{" "}
          {(heartConfidence * 100).toFixed(0)}% | Signal: {(heartSignalQuality * 100).toFixed(0)}%
        </p>
        <p>
          Calibration: {calibration.status} | Accepted samples: {calibration.acceptedSampleCount}
          {calibration.baselineBpm != null
            ? ` | Baseline ${calibration.baselineBpm.toFixed(1)} bpm`
            : ""}
        </p>
        {!canBeginRun ? (
          <p>Begin Run unlocks after the camera is live and the BPM session has been started.</p>
        ) : calibration.status === "idle" && calibration.baselineBpm == null ? (
          <p>You are ready to play. Quick baseline is optional.</p>
        ) : null}
        {calibration.status === "collecting" ? <p>Progress: {progressPercent}%</p> : null}
        {recentAcceptedReadings.length > 0 ? (
          <p>Accepted BPM: {recentAcceptedReadings.map((value) => value.toFixed(1)).join(", ")}</p>
        ) : null}
        {rppgError ? <p>{rppgError}</p> : null}
        {calibration.error ? <p>{calibration.error}</p> : null}

        <div className="button-row">
          {!webcam.permissionGranted && !webcam.isStreaming ? (
            <button
              className="secondary-btn"
              onClick={() => {
                void requestCameraPermission();
              }}
            >
              Request Access
            </button>
          ) : null}
          <button
            className="secondary-btn"
            onClick={() => {
              void startCameraStream();
            }}
            disabled={webcam.status === "initializing"}
          >
            {webcam.isStreaming ? "Restart Camera" : "Start Camera"}
          </button>
          <button
            className="secondary-btn"
            onClick={() => {
              void startHeartRateStream();
            }}
            disabled={!webcam.isStreaming || rppgStatus === "initializing" || rppgStatus === "running"}
          >
            {rppgStatus === "running" ? "Restart BPM" : "Start BPM"}
          </button>
          <button
            className="secondary-btn"
            onClick={() => {
              void stopHeartRateStream();
            }}
            disabled={rppgStatus === "idle"}
          >
            Stop BPM
          </button>
        </div>

        <div className="button-row">
          <button className="secondary-btn" onClick={() => setScreen("setup")}>
            Back
          </button>
          {calibration.status === "collecting" ? (
            <button className="secondary-btn" onClick={cancelCalibration}>
              Cancel Calibration
            </button>
          ) : (
            <button
              className="secondary-btn"
              onClick={() => {
                startCalibration();
              }}
              disabled={!canStartCalibration}
            >
              Quick Baseline
            </button>
          )}
          <button
            className="primary-btn"
            onClick={() => setScreen("playing")}
            disabled={!canBeginRun}
          >
            Begin Run
          </button>
          <button className="secondary-btn" onClick={stopCameraStream}>
            Stop Camera
          </button>
        </div>
      </div>
    </section>
  );
}
