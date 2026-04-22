import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useSensorStore } from "../../store/sensorStore";
import { StatusChip, type StatusChipProps } from "./StatusChip";

export interface CameraPanelProps {
  title?: string;
  isLive?: boolean;
  emptyLabel?: string;
  footerText?: string;
  statusChips?: StatusChipProps[];
  previewContent?: ReactNode;
  isPlaceholder?: boolean;
  showControls?: boolean;
}

export function CameraPanel({
  title = "Camera",
  isLive = false,
  emptyLabel = "Camera preview",
  footerText,
  statusChips = [],
  previewContent,
  isPlaceholder = true,
  showControls = true,
}: CameraPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcam = useSensorStore((state) => state.webcam);
  const webcamStream = useSensorStore((state) => state.webcamStream);
  const heartReading = useSensorStore((state) => state.heartReading);
  const lastLiveBpm = useSensorStore((state) => state.lastLiveBpm);
  const heartConfidence = useSensorStore((state) => state.heartConfidence);
  const heartSignalQuality = useSensorStore((state) => state.heartSignalQuality);
  const calibration = useSensorStore((state) => state.calibration);
  const rppgStatus = useSensorStore((state) => state.rppgStatus);
  const rppgError = useSensorStore((state) => state.rppgError);
  const requestCameraPermission = useSensorStore((state) => state.requestCameraPermission);
  const startCameraStream = useSensorStore((state) => state.startCameraStream);
  const stopCameraStream = useSensorStore((state) => state.stopCameraStream);
  const startHeartRateStream = useSensorStore((state) => state.startHeartRateStream);
  const stopHeartRateStream = useSensorStore((state) => state.stopHeartRateStream);

  useEffect(() => {
    const video = videoRef.current;
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
    if (!showControls && webcam.isStreaming && rppgStatus === "idle") {
      void startHeartRateStream();
    }
  }, [rppgStatus, showControls, startHeartRateStream, webcam.isStreaming]);

  function getCameraChip(): StatusChipProps {
    switch (webcam.status) {
      case "requesting_permission":
        return { label: "Requesting access", tone: "info" };
      case "permission_denied":
        return { label: "Permission denied", tone: "warn" };
      case "unavailable":
        return { label: "No webcam found", tone: "warn" };
      case "ready":
        return webcam.isStreaming
          ? { label: "Camera live", tone: "good" }
          : { label: "Camera ready", tone: "good" };
      case "initializing":
        return { label: "Starting camera", tone: "info" };
      case "error":
        return { label: "Camera issue", tone: "warn" };
      default:
        return { label: "Camera waiting", tone: "neutral" };
    }
  }

  function getBpmChip(): StatusChipProps {
    switch (rppgStatus) {
      case "running":
        return { label: "BPM live", tone: "good" };
      case "initializing":
        return { label: "BPM warmup", tone: "info" };
      case "error":
        return { label: "Weak / unavailable", tone: "warn" };
      default:
        return { label: "BPM idle", tone: "neutral" };
    }
  }

  const mergedStatusChips = useMemo(() => {
    return [getCameraChip(), getBpmChip(), ...statusChips];
  }, [rppgStatus, statusChips, webcam.isStreaming, webcam.status]);

  const livePreview = previewContent ?? (
    <video
      ref={videoRef}
      className="camera-panel__video"
      autoPlay
      muted
      playsInline
      aria-label="Live camera preview"
    />
  );

  const showLivePreview = webcam.isStreaming && Boolean(webcamStream);
  const effectiveLive = isLive || showLivePreview;
  const footerLabel =
    rppgError ??
    webcam.streamError ??
    (webcam.status === "permission_denied"
      ? "Allow camera access in the browser to enable live BPM."
      : webcam.status === "unavailable"
        ? "No webcam is available on this device."
        : footerText);
  const displayBpm = heartReading?.bpm ?? lastLiveBpm ?? calibration.latestAcceptedBpm;

  return (
    <section
      className={`panel camera-panel${isPlaceholder && !showLivePreview ? " is-placeholder" : ""}`}
    >
      <div className="camera-panel__header">
        <p className="placeholder-title">{title}</p>
        {mergedStatusChips.length > 0 ? (
          <div className="camera-panel__chips">
            {mergedStatusChips.map((chip) => (
              <StatusChip key={`${chip.label}-${chip.tone ?? "neutral"}`} {...chip} />
            ))}
          </div>
        ) : null}
      </div>

      <div className={`camera-panel__viewport${effectiveLive ? " is-live" : ""}`}>
        {showLivePreview ? (
          livePreview
        ) : (
          <div className="camera-panel__empty">
            <span>{emptyLabel}</span>
          </div>
        )}
      </div>

      {showControls ? (
        <div className="camera-panel__actions">
          <button
            className="primary-btn"
            type="button"
            onClick={() => {
              void startCameraStream();
            }}
            disabled={webcam.status === "initializing"}
          >
            {webcam.isStreaming ? "Restart Camera" : "Start Camera"}
          </button>
          <button
            className="secondary-btn"
            type="button"
            onClick={() => {
              void startHeartRateStream();
            }}
            disabled={
              !webcam.isStreaming ||
              webcam.status === "initializing" ||
              rppgStatus === "initializing"
            }
          >
            {rppgStatus === "running" ? "Restart BPM" : "Start BPM"}
          </button>
          <button
            className="secondary-btn"
            type="button"
            onClick={() => {
              void stopHeartRateStream();
            }}
            disabled={rppgStatus === "idle"}
          >
            Stop BPM
          </button>
          <button
            className="secondary-btn"
            type="button"
            onClick={stopCameraStream}
            disabled={!webcam.isStreaming && webcam.status !== "error"}
          >
            Stop Camera
          </button>
          {!webcam.permissionGranted && !webcam.isStreaming ? (
            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                void requestCameraPermission();
              }}
              disabled={webcam.status === "initializing"}
            >
              Request Access
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="camera-panel__footer">
        BPM {displayBpm != null ? displayBpm.toFixed(1) : "--"} | Confidence{" "}
        {(heartConfidence * 100).toFixed(0)}% | Signal {(heartSignalQuality * 100).toFixed(0)}%
      </p>
      {footerLabel ? <p className="camera-panel__footer">{footerLabel}</p> : null}
      {isPlaceholder && !showLivePreview ? (
        <span className="camera-panel__flag">Camera inactive</span>
      ) : null}
    </section>
  );
}
