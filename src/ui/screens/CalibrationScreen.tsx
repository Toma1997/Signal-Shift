import { useEffect, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import { useSensorStore } from "../../store/sensorStore";

export function CalibrationScreen() {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const bpmAutoStartBlockedRef = useRef(false);
  const previousStreamingRef = useRef(false);
  const setScreen = useGameStore((state) => state.setScreen);
  const webcam = useSensorStore((state) => state.webcam);
  const webcamStream = useSensorStore((state) => state.webcamStream);
  const heartReading = useSensorStore((state) => state.heartReading);
  const lastLiveBpm = useSensorStore((state) => state.lastLiveBpm);
  const heartConfidence = useSensorStore((state) => state.heartConfidence);
  const heartSignalQuality = useSensorStore((state) => state.heartSignalQuality);
  const rppgStatus = useSensorStore((state) => state.rppgStatus);
  const rppgError = useSensorStore((state) => state.rppgError);
  const calibration = useSensorStore((state) => state.calibration);
  const eegStatus = useSensorStore((state) => state.eegStatus);
  const latestEegFocusScore = useSensorStore((state) => state.latestEegFocusScore);
  const eegSignalQuality = useSensorStore((state) => state.eegSignalQuality);
  const eegError = useSensorStore((state) => state.eegError);
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
    if (webcam.isStreaming && !previousStreamingRef.current) {
      bpmAutoStartBlockedRef.current = false;
    }

    previousStreamingRef.current = webcam.isStreaming;
  }, [webcam.isStreaming]);

  useEffect(() => {
    if (webcam.isStreaming && rppgStatus === "idle") {
      if (bpmAutoStartBlockedRef.current) {
        return;
      }
      void startHeartRateStream();
    }
  }, [rppgStatus, startHeartRateStream, webcam.isStreaming]);

  useEffect(() => {
    if (
      webcam.isStreaming &&
      rppgStatus === "running" &&
      eegStatus === "ready" &&
      calibration.status === "idle" &&
      (!calibration.complete ||
        calibration.baselineBpm == null ||
        calibration.baselineFocusScore == null)
    ) {
      startCalibration();
    }
  }, [
    calibration.complete,
    calibration.baselineBpm,
    calibration.baselineFocusScore,
    calibration.status,
    eegStatus,
    rppgStatus,
    startCalibration,
    webcam.isStreaming,
  ]);

  const canStartCalibration =
    webcam.isStreaming &&
    rppgStatus === "running" &&
    eegStatus === "ready" &&
    calibration.status !== "collecting";
  const canBeginRun =
    webcam.isStreaming &&
    rppgStatus === "running" &&
    eegStatus === "ready" &&
    calibration.complete &&
    calibration.baselineBpm != null &&
    calibration.baselineFocusScore != null;
  const recentAcceptedReadings = calibration.acceptedReadings.slice(-8);
  const recentAcceptedFocusReadings = calibration.focusAcceptedReadings.slice(-8);
  const progressPercent = Math.round(calibration.progress * 100);
  const displayBpm = heartReading?.bpm ?? lastLiveBpm ?? calibration.latestAcceptedBpm;

  return (
    <section className="screen center-screen center-screen--fit">
      <div className="hero-card hero-card--calibration">
        <h2>Calibration</h2>
        <p className="calibration-copy">
          Start the camera and BPM first. As soon as the signal is live, Signal Shift captures a
          short baseline automatically so gameplay can begin with a personalized reference.
        </p>

        <div className="calibration-preview">
          {webcam.isStreaming ? (
            <video
              ref={previewRef}
              autoPlay
              muted
              playsInline
              className="calibration-preview__video"
            />
          ) : (
            <div className="calibration-preview__empty">Camera preview</div>
          )}
        </div>

        <div className="calibration-stats">
          <p>
          Camera: {webcam.isStreaming ? "live" : "offline"} | BPM:{" "}
          {displayBpm != null ? `${displayBpm.toFixed(1)} bpm` : "waiting"} | Confidence:{" "}
          {(heartConfidence * 100).toFixed(0)}% | Signal: {(heartSignalQuality * 100).toFixed(0)}% | EEG: {eegStatus}
          </p>
          <p>
            Calibration: {calibration.status} | BPM samples: {calibration.acceptedSampleCount}
            {calibration.baselineBpm != null
              ? ` | Baseline ${calibration.baselineBpm.toFixed(1)} bpm`
              : ""}
          </p>
          <p>
            Focus baseline:{" "}
            {calibration.baselineFocusScore != null
              ? `${calibration.baselineFocusScore.toFixed(1)}`
              : "waiting"}{" "}
            | Focus samples: {calibration.focusSampleCount} | EEG quality:{" "}
            {Math.round(eegSignalQuality)}%
          </p>
        </div>
        {!canBeginRun ? (
          <p className="calibration-copy">
            Begin Run unlocks after live BPM and synthetic EEG are ready and the short baseline capture completes.
          </p>
        ) : (
          <p className="calibration-copy">BPM and focus baselines captured. You are ready to play.</p>
        )}
        {calibration.status === "collecting" ? <p className="calibration-copy">Progress: {progressPercent}%</p> : null}
        {recentAcceptedReadings.length > 0 && calibration.status === "collecting" ? (
          <p className="calibration-copy">Accepted BPM: {recentAcceptedReadings.map((value) => value.toFixed(1)).join(", ")}</p>
        ) : null}
        {recentAcceptedFocusReadings.length > 0 && calibration.status === "collecting" ? (
          <p className="calibration-copy">Accepted Focus: {recentAcceptedFocusReadings.map((value) => value.toFixed(1)).join(", ")}</p>
        ) : null}
        {rppgError ? <p className="calibration-copy calibration-copy--error">{rppgError}</p> : null}
        {eegError ? <p className="calibration-copy calibration-copy--error">{eegError}</p> : null}
        {calibration.error ? <p className="calibration-copy calibration-copy--error">{calibration.error}</p> : null}

        <div className="calibration-actions">
        <div className="button-row calibration-button-row">
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
              bpmAutoStartBlockedRef.current = false;
              void startCameraStream();
            }}
            disabled={webcam.status === "initializing"}
          >
            {webcam.isStreaming ? "Restart Camera" : "Start Camera"}
          </button>
          <button
            className="secondary-btn"
            onClick={() => {
              bpmAutoStartBlockedRef.current = false;
              void startHeartRateStream();
            }}
            disabled={!webcam.isStreaming || rppgStatus === "initializing" || rppgStatus === "running"}
          >
            {rppgStatus === "running" ? "Restart BPM" : "Start BPM"}
          </button>
          <button
            className="secondary-btn"
            onClick={() => {
              bpmAutoStartBlockedRef.current = true;
              void stopHeartRateStream();
            }}
            disabled={rppgStatus === "idle"}
          >
            Stop BPM
          </button>
        </div>

        <div className="button-row calibration-button-row">
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
              disabled={!canStartCalibration || calibration.complete}
            >
              Retry Baseline
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
      </div>
    </section>
  );
}
