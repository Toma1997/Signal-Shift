import { create } from "zustand";
import { derivePressureSnapshot } from "../biometrics/fusion/derivedState";
import {
  summarizeCalibration,
} from "../biometrics/fusion/calibration";
import type { WebcamState } from "../biometrics/types";
import type { HeartReading } from "../biometrics/rppg/heartMetrics";
import { toStableHeartReading } from "../biometrics/rppg/heartMetrics";
import {
  startRppgService,
  type RppgDiagnosticsSnapshot,
  type RppgServiceController,
} from "../biometrics/rppg/rppgService";
import {
  requestWebcamPermission,
  startWebcamStream,
  stopWebcamStream,
} from "../biometrics/rppg/webcamService";
import { MOCK_SENSORS } from "../game/constants";
import type { SensorSnapshot } from "../game/types";

interface CalibrationState {
  status: "idle" | "collecting" | "complete" | "error";
  durationMs: number;
  startedAtMs: number | null;
  progress: number;
  acceptedSampleCount: number;
  baselineBpm: number | null;
  latestAcceptedBpm: number | null;
  acceptedReadings: number[];
  error?: string;
}

interface SensorState {
  sensors: SensorSnapshot;
  webcam: WebcamState;
  webcamStream: MediaStream | null;
  heartReading: HeartReading | null;
  lastLiveBpm: number | null;
  bpmHistory: number[];
  heartConfidence: number;
  heartSignalQuality: number;
  baselineBpm: number | null;
  bpmDeltaPct: number | null;
  pressureLevel: number;
  signalReliable: boolean;
  rppgStatus: "idle" | "initializing" | "running" | "error";
  rppgError?: string;
  calibration: CalibrationState;
  setMode: (mode: SensorSnapshot["mode"]) => void;
  requestCameraPermission: () => Promise<boolean>;
  startCameraStream: () => Promise<void>;
  stopCameraStream: () => void;
  startHeartRateStream: (video?: HTMLVideoElement | null) => Promise<void>;
  stopHeartRateStream: () => Promise<void>;
  startCalibration: () => boolean;
  cancelCalibration: () => void;
}

const initialWebcamState: WebcamState = {
  permissionGranted: false,
  status: "idle",
  isStreaming: false,
};

let activeRppgController: RppgServiceController | null = null;
let calibrationTimer: number | null = null;
const CALIBRATION_DURATION_MS = 8_000;
const MIN_CALIBRATION_CONFIDENCE = 0.45;
const MAX_BPM_HISTORY = 48;

function createInitialCalibrationState(): CalibrationState {
  return {
    status: "idle",
    durationMs: CALIBRATION_DURATION_MS,
    startedAtMs: null,
    progress: 0,
    acceptedSampleCount: 0,
    baselineBpm: null,
    latestAcceptedBpm: null,
    acceptedReadings: [],
  };
}

function clearCalibrationTimer(): void {
  if (calibrationTimer != null) {
    window.clearInterval(calibrationTimer);
    calibrationTimer = null;
  }
}

function getDerivedPressureState(
  bpm: number | null | undefined,
  baselineBpm: number | null | undefined,
  signalQuality: number,
) {
  const snapshot = derivePressureSnapshot(bpm, baselineBpm, signalQuality);

  return {
    baselineBpm: baselineBpm ?? null,
    bpmDeltaPct: snapshot.bpmDeltaPct,
    pressureLevel: snapshot.pressure,
    signalReliable: snapshot.signalReliable,
  };
}

function finalizeCalibration(): void {
  clearCalibrationTimer();

  const { calibration } = useSensorStore.getState();
  const summary = summarizeCalibration(calibration.acceptedReadings);

  if (!summary) {
    useSensorStore.setState((state) => ({
      calibration: {
        ...state.calibration,
        status: "error",
        progress: 1,
        error: "Not enough stable BPM samples yet. Keep the camera steady and try again.",
      },
    }));
    return;
  }

  useSensorStore.setState((state) => ({
    calibration: {
      ...state.calibration,
      status: "complete",
      progress: 1,
      baselineBpm: summary.baselineBpm,
      acceptedSampleCount: summary.acceptedSampleCount,
      error: undefined,
    },
    ...getDerivedPressureState(
      state.heartReading?.bpm ?? null,
      summary.baselineBpm,
      state.heartSignalQuality,
    ),
  }));
}

function getCameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Camera permission was denied.";
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No camera device was found.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to start the camera.";
}

export const useSensorStore = create<SensorState>((set) => ({
  sensors: MOCK_SENSORS,
  webcam: initialWebcamState,
  webcamStream: null,
  heartReading: null,
  lastLiveBpm: null,
  bpmHistory: [],
  heartConfidence: 0,
  heartSignalQuality: 0,
  baselineBpm: null,
  bpmDeltaPct: null,
  pressureLevel: 18,
  signalReliable: false,
  rppgStatus: "idle",
  calibration: createInitialCalibrationState(),
  setMode: (mode) =>
    set((state) => ({
      sensors: {
        ...state.sensors,
        mode,
      },
    })),
  requestCameraPermission: async () => {
    set((state) => ({
      webcam: {
        ...state.webcam,
        status: "initializing",
        streamError: undefined,
      },
    }));

    try {
      const stream = await requestWebcamPermission();
      stopWebcamStream(stream);

      set((state) => ({
        webcam: {
          ...state.webcam,
          permissionGranted: true,
          status: state.webcam.isStreaming ? "ready" : "idle",
          streamError: undefined,
        },
      }));

      return true;
    } catch (error) {
      set({
        webcam: {
          permissionGranted: false,
          status: "error",
          isStreaming: false,
          streamError: getCameraErrorMessage(error),
        },
        webcamStream: null,
      });

      return false;
    }
  },
  startCameraStream: async () => {
    set((state) => ({
      webcam: {
        ...state.webcam,
        status: "initializing",
        streamError: undefined,
      },
    }));

    try {
      const stream = await startWebcamStream();
      const existingStream = useSensorStore.getState().webcamStream;
      stopWebcamStream(existingStream);

      set({
        webcam: {
          permissionGranted: true,
          status: "ready",
          isStreaming: true,
          streamError: undefined,
        },
        webcamStream: stream,
      });
    } catch (error) {
      const existingStream = useSensorStore.getState().webcamStream;
      stopWebcamStream(existingStream);

      set({
        webcam: {
          permissionGranted: false,
          status: "error",
          isStreaming: false,
          streamError: getCameraErrorMessage(error),
        },
        webcamStream: null,
      });
    }
  },
  stopCameraStream: () => {
    void useSensorStore.getState().stopHeartRateStream();
    clearCalibrationTimer();

    const existingStream = useSensorStore.getState().webcamStream;
    stopWebcamStream(existingStream);

    set((state) => ({
      webcam: {
        ...state.webcam,
        status: "idle",
        isStreaming: false,
        streamError: undefined,
      },
      webcamStream: null,
      baselineBpm: null,
      bpmDeltaPct: null,
      pressureLevel: 18,
      signalReliable: false,
      calibration: createInitialCalibrationState(),
    }));
  },
  startHeartRateStream: async () => {
    const webcamStream = useSensorStore.getState().webcamStream;

    if (!webcamStream) {
      set({
        rppgStatus: "error",
        rppgError: "Start the camera before enabling BPM.",
      });
      return;
    }

    set({
      rppgStatus: "initializing",
      rppgError: undefined,
    });

    await useSensorStore.getState().stopHeartRateStream();

    try {
      activeRppgController = await startRppgService(webcamStream, {
        onReading: (reading) => {
          set((state) => {
            const nextReading = toStableHeartReading(state.heartReading, reading);
            const validCalibrationBpm =
              reading.bpm != null && reading.confidence >= MIN_CALIBRATION_CONFIDENCE
                ? reading.bpm
                : null;
            const isCalibrationSampleValid =
              state.calibration.status === "collecting" &&
              validCalibrationBpm != null;
            const acceptedReadings = isCalibrationSampleValid
              ? [...state.calibration.acceptedReadings, validCalibrationBpm]
              : state.calibration.acceptedReadings;
            const derivedPressure = getDerivedPressureState(
              nextReading?.bpm ?? null,
              state.calibration.baselineBpm,
              reading.signalQuality ?? 0,
            );

            return {
              heartReading: nextReading,
              lastLiveBpm: nextReading?.bpm ?? state.lastLiveBpm,
              bpmHistory:
                nextReading != null
                  ? [...state.bpmHistory, nextReading.bpm].slice(-MAX_BPM_HISTORY)
                  : state.bpmHistory,
              heartConfidence: reading.confidence,
              heartSignalQuality: reading.signalQuality ?? 0,
              ...derivedPressure,
              rppgStatus:
                nextReading || state.rppgStatus === "running"
                  ? "running"
                  : state.rppgStatus,
              rppgError: undefined,
              calibration:
                state.calibration.status === "collecting"
                  ? {
                      ...state.calibration,
                      acceptedSampleCount: isCalibrationSampleValid
                        ? state.calibration.acceptedSampleCount + 1
                        : state.calibration.acceptedSampleCount,
                      latestAcceptedBpm: isCalibrationSampleValid
                        ? validCalibrationBpm
                        : state.calibration.latestAcceptedBpm,
                      acceptedReadings,
                    }
                  : state.calibration,
            };
          });
        },
        onDiagnostics: (diagnostics: RppgDiagnosticsSnapshot) => {
          set((state) => ({
            heartConfidence: diagnostics.confidence,
            heartSignalQuality: diagnostics.signalQuality,
            ...getDerivedPressureState(
              state.heartReading?.bpm ?? null,
              state.calibration.baselineBpm,
              diagnostics.signalQuality,
            ),
            rppgStatus:
              !state.webcam.isStreaming
                ? "idle"
                : !diagnostics.backendAvailable
                  ? "error"
                  : diagnostics.ready || state.rppgStatus === "running"
                    ? "running"
                    : "initializing",
            rppgError:
              !diagnostics.backendAvailable
                ? "Elata rPPG backend is unavailable."
                : diagnostics.ready || state.rppgStatus === "running"
                  ? undefined
                  : diagnostics.message,
          }));
        },
        onError: (message) => {
          set({
            rppgStatus: "error",
            rppgError: message,
          });
        },
      });

      set((state) => ({
        rppgStatus: state.heartReading ? "running" : "initializing",
        rppgError: undefined,
      }));
    } catch (error) {
      set({
        rppgStatus: "error",
        rppgError:
          error instanceof Error ? error.message : "Unable to start Elata rPPG.",
      });
    }
  },
  stopHeartRateStream: async () => {
    if (activeRppgController) {
      await activeRppgController.stop();
      activeRppgController = null;
    }

    clearCalibrationTimer();

    set({
      heartConfidence: 0,
      heartSignalQuality: 0,
      bpmHistory: [],
      bpmDeltaPct: null,
      pressureLevel: 18,
      signalReliable: false,
      rppgStatus: "idle",
      rppgError: undefined,
      calibration: createInitialCalibrationState(),
    });
  },
  startCalibration: () => {
    const state = useSensorStore.getState();

    if (
      !state.webcam.isStreaming ||
      state.rppgStatus !== "running" ||
      (state.heartReading == null && state.lastLiveBpm == null)
    ) {
      set({
        calibration: {
          ...createInitialCalibrationState(),
          status: "error",
          error: "Start the camera and live BPM stream before calibrating.",
        },
      });
      return false;
    }

    clearCalibrationTimer();
    const startedAtMs = Date.now();

    set({
      calibration: {
        ...createInitialCalibrationState(),
        status: "collecting",
        startedAtMs,
      },
    });

    calibrationTimer = window.setInterval(() => {
      const currentState = useSensorStore.getState();
      if (currentState.calibration.status !== "collecting") {
        clearCalibrationTimer();
        return;
      }

      const elapsedMs = Date.now() - (currentState.calibration.startedAtMs ?? Date.now());
      const progress = Math.min(1, elapsedMs / currentState.calibration.durationMs);

      useSensorStore.setState((snapshot) => ({
        calibration: {
          ...snapshot.calibration,
          progress,
        },
      }));

      if (elapsedMs >= currentState.calibration.durationMs) {
        finalizeCalibration();
      }
    }, 200);

    return true;
  },
  cancelCalibration: () => {
    clearCalibrationTimer();
    set({
      calibration: createInitialCalibrationState(),
    });
  },
}));
